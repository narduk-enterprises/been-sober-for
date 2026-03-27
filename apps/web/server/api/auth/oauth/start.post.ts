import { z } from 'zod'
import { definePublicMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { startOAuthFlow } from '#server/utils/app-auth'

const bodySchema = z.object({
  provider: z.enum(['apple']),
  next: z.string().optional(),
})

export default definePublicMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authLogin,
    parseBody: withValidatedBody(bodySchema.parse),
  },
  async ({ event, body }) => startOAuthFlow(event, body),
)
