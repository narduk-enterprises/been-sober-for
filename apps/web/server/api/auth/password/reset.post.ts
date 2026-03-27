import { z } from 'zod'
import { definePublicMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { requestPasswordReset } from '#server/utils/app-auth'

const bodySchema = z.object({
  email: z.string().email(),
  captchaToken: z.string().min(1).optional(),
})

export default definePublicMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authRegister,
    parseBody: withValidatedBody(bodySchema.parse),
  },
  async ({ event, body }) => requestPasswordReset(event, body),
)
