import { z } from 'zod'
import { defineUserMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { updateProfile } from '#server/utils/app-auth'

const bodySchema = z.object({
  name: z.string().optional(),
})

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authProfile,
    parseBody: withValidatedBody(bodySchema.parse),
  },
  async ({ event, body }) => updateProfile(event, body),
)
