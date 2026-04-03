import { getCookie, getRequestHeader, getRequestURL, sendRedirect } from 'h3'
import { z } from 'zod'
import { exchangeSupabaseCode } from '#server/utils/app-auth'

const emailVerificationTypeSchema = z.enum([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

const querySchema = z.union([
  z.object({
    code: z.string().min(1),
    next: z.string().optional(),
    returnPath: z.string().optional(),
  }),
  z.object({
    token_hash: z.string().min(1),
    type: emailVerificationTypeSchema,
    next: z.string().optional(),
    returnPath: z.string().optional(),
  }),
])

function toErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'The auth callback could not be exchanged for a session.'
  }

  const maybeError = error as {
    statusMessage?: string
    message?: string
    data?: { statusMessage?: string; message?: string }
  }

  return (
    maybeError.statusMessage ||
    maybeError.message ||
    maybeError.data?.statusMessage ||
    maybeError.data?.message ||
    'The auth callback could not be exchanged for a session.'
  )
}

function sanitizeReturnPath(value: string | undefined, fallback: string) {
  if (!value) return fallback

  try {
    const url = new URL(value, 'https://app.local')
    if (url.origin !== 'https://app.local' || !url.pathname.startsWith('/')) {
      return fallback
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, (value) => querySchema.safeParse(value))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid auth callback parameters.' })
  }

  const log = useLogger(event).child('AuthCallback')
  const config = useRuntimeConfig(event)
  const returnPath = sanitizeReturnPath(query.data.returnPath, config.public.authCallbackPath)

  try {
    const result =
      'code' in query.data
        ? await exchangeSupabaseCode(event, {
            code: query.data.code,
            next: query.data.next,
          })
        : await exchangeSupabaseCode(event, {
            tokenHash: query.data.token_hash,
            verificationType: query.data.type,
            next: query.data.next,
          })

    return sendRedirect(event, result.redirectTo || config.public.authRedirectPath, 302)
  } catch (error) {
    const requestHost = getRequestHeader(event, 'host') ?? null
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : null
    const statusMessage =
      typeof error === 'object' &&
      error !== null &&
      'statusMessage' in error &&
      typeof error.statusMessage === 'string'
        ? error.statusMessage
        : error instanceof Error
          ? error.message
          : String(error)

    log.error('Auth callback exchange failed', {
      requestHost,
      next: query.data.next ?? null,
      returnPath,
      hasPkceCookie: Boolean(getCookie(event, 'app_auth_pkce')),
      statusCode,
      statusMessage,
    })

    const callbackUrl = new URL(returnPath, getRequestURL(event).origin)
    if (query.data.next) {
      callbackUrl.searchParams.set('next', query.data.next)
    }
    callbackUrl.searchParams.set('error', 'callback_exchange_failed')
    callbackUrl.searchParams.set('error_description', toErrorMessage(error))

    return sendRedirect(event, callbackUrl.toString(), 302)
  }
})
