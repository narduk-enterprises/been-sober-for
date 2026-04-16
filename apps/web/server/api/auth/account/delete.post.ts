import { z } from 'zod'
import {
  defineUserMutation,
  requireMutationBody,
  withOptionalValidatedBody,
} from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { starterDeleteCurrentUserAccountBridge as deleteCurrentUserAccountBridge } from '#server/utils/starter-account-deletion-bridge'
import {
  starterDeleteSupabaseAuthUser as deleteSupabaseAuthUser,
  type StarterAppSessionUser as AppSessionUser,
} from '#server/utils/starter-app-auth'

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1).optional(),
})

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authDeleteAccount,
    parseBody: withOptionalValidatedBody(deleteAccountSchema.parse, {}),
  },
  async ({ event, user, body }) => {
    await deleteCurrentUserAccountBridge(event, user, requireMutationBody(body), {
      beforeDelete: async (evt, userId) => {
        if ((user as AppSessionUser).authBackend === 'supabase') {
          await deleteSupabaseAuthUser(evt, userId)
        }
      },
    })

    return { success: true }
  },
)
