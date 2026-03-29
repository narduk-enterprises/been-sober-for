import { z } from 'zod'
import { defineUserMutation, withOptionalValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { deleteAccount } from '#server/utils/app-auth'

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1).optional(),
})

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authDeleteAccount,
    parseBody: withOptionalValidatedBody(deleteAccountSchema.parse, {}),
  },
  async ({ event, body }) => deleteAccount(event, body),
)
