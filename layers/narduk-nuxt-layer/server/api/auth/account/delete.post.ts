import { z } from 'zod'
import { defineUserMutation, withOptionalValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { deleteCurrentUserAccount } from '#layer/server/utils/accountDeletion'

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1).optional(),
})

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authDeleteAccount,
    parseBody: withOptionalValidatedBody(deleteAccountSchema.parse, {}),
  },
  async ({ event, user, body }) => {
    await deleteCurrentUserAccount(event, user, body)
    return { success: true }
  },
)
