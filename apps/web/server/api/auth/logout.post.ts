import { definePublicMutation } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { starterLogoutUser as logoutUser } from '#server/utils/starter-app-auth'

export default definePublicMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authLogout,
  },
  async ({ event }) => logoutUser(event),
)
