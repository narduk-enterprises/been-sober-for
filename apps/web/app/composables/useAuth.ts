import type { AuthMutationResult, AuthUser } from './useAuthApi'

export function useAuth() {
  const { loggedIn, user, fetch: fetchSession, clear } = useUserSession()
  const api = useAuthApi()

  const isAuthenticated = computed(() => loggedIn.value)

  async function login(payload: { email: string; password: string; captchaToken?: string }) {
    const result = (await api.login(payload)) as AuthMutationResult
    if (result.user) {
      await fetchSession()
    }
    return result
  }

  async function register(payload: {
    name: string
    email: string
    password: string
    captchaToken?: string
    next?: string
  }) {
    const result = (await api.register(payload)) as AuthMutationResult
    if (result.nextStep === 'signed_in' && result.user) {
      await fetchSession()
    }
    return result
  }

  async function logout() {
    await api.logout()
    await clear()
    await fetchSession()
  }

  async function startOAuth(payload: { provider: 'apple'; next?: string }) {
    return api.startOAuth(payload)
  }

  async function exchangeSession(payload: { code: string; next?: string }) {
    const result = await api.exchangeSession(payload)
    if (result.user) {
      await fetchSession()
    }
    return result
  }

  async function updateProfile(payload: { name?: string }) {
    const result = await api.updateProfile(payload)
    await fetchSession()
    return result
  }

  async function changePassword(payload: { currentPassword?: string; newPassword: string }) {
    const result = await api.changePassword(payload)
    await fetchSession()
    return result
  }

  async function requestPasswordReset(payload: { email: string; captchaToken?: string }) {
    return api.requestPasswordReset(payload)
  }

  async function enrollMfa(payload: { friendlyName?: string }) {
    return api.enrollMfa(payload)
  }

  async function verifyMfa(payload: { factorId: string; code: string }) {
    const result = await api.verifyMfa(payload)
    await fetchSession()
    return result
  }

  return {
    user: user as Ref<AuthUser | null>,
    isAuthenticated,
    loggedIn: isAuthenticated,
    fetchUser: fetchSession,
    login,
    register,
    signup: register,
    logout,
    startOAuth,
    exchangeSession,
    updateProfile,
    changePassword,
    requestPasswordReset,
    enrollMfa,
    verifyMfa,
  }
}
