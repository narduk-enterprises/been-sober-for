import { getCookie, getRequestHeader } from 'h3'
import { z } from 'zod'
import { definePublicMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { exchangeSupabaseCode } from '#server/utils/app-auth'

const bodySchema = z.object({
  code: z.string().min(1),
  next: z.string().optional(),
})

export default definePublicMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authLogin,
    parseBody: withValidatedBody(bodySchema.parse),
  },
  async ({ event, body }) => {
    try {
      return await exchangeSupabaseCode(event, body)
    } catch (error) {
      const log = useLogger(event).child('AuthCallback')
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
        next: body.next ?? null,
        hasPkceCookie: Boolean(getCookie(event, 'app_auth_pkce')),
        statusCode,
        statusMessage,
      })

      throw error
    }
  },
)
