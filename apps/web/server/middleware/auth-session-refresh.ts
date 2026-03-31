import { useRefreshedSessionUser } from '#server/utils/session-user'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/admin/') && path !== '/api/auth/me') {
    return
  }

  await useRefreshedSessionUser(event)
})
