export default defineNuxtRouteMiddleware(async () => {
  const config = useRuntimeConfig()
  const { loggedIn, fetch: refreshSession, clear } = useUserSession()

  try {
    await refreshSession()
  } catch {
    await clear()
  }

  if (loggedIn.value) {
    return navigateTo(config.public.authRedirectPath, { replace: true })
  }
})
