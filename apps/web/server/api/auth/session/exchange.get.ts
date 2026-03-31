import { getRequestURL, sendRedirect } from 'h3'
import { z } from 'zod'
import { exchangeSupabaseCode } from '#server/utils/app-auth'

const querySchema = z.object({
  code: z.string().min(1),
  next: z.string().optional(),
  returnPath: z.string().optional(),
})

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

  const config = useRuntimeConfig(event)
  const returnPath = sanitizeReturnPath(query.data.returnPath, config.public.authCallbackPath)

  try {
    const result = await exchangeSupabaseCode(event, {
      code: query.data.code,
      next: query.data.next,
    })

    return sendRedirect(event, result.redirectTo || config.public.authRedirectPath, 302)
  } catch (error) {
    const callbackUrl = new URL(returnPath, getRequestURL(event).origin)
    if (query.data.next) {
      callbackUrl.searchParams.set('next', query.data.next)
    }
    callbackUrl.searchParams.set('error', 'callback_exchange_failed')
    callbackUrl.searchParams.set('error_description', toErrorMessage(error))

    return sendRedirect(event, callbackUrl.toString(), 302)
  }
})
