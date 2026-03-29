/**
 * useAuth — Client-side auth composable backed by nuxt-auth-utils (sealed session).
 *
 * Wraps useUserSession() for reactive user state and provides login, register,
 * logout that call the layer's /api/auth/* routes and refresh session state.
 *
 * All mutations use $csrfFetch for CSRF protection if available.
 */

export interface AuthUser {
  id: string
  email: string
  name: string | null
  isAdmin: boolean | null
  [key: string]: unknown
}

export function useAuth() {
  const { loggedIn, user, fetch: fetchSession, clear } = useUserSession()
  const nuxtApp = useNuxtApp()
  const csrfFetch = (nuxtApp.$csrfFetch ?? $fetch) as typeof $fetch

  const isAuthenticated = computed(() => loggedIn.value)

  async function login(email: string, password: string) {
    const data = await csrfFetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    await fetchSession()
    return data.user
  }

  async function register(params: {
    email: string
    name: string
    password: string
    [key: string]: unknown
  }) {
    const data = await csrfFetch<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: params,
    })
    await fetchSession()
    return data.user
  }

  async function logout() {
    await csrfFetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await fetchSession()
  }

  async function deleteAccount(payload: { currentPassword?: string } = {}) {
    const result = await csrfFetch<{ success: boolean }>('/api/auth/account/delete', {
      method: 'POST',
      body: payload,
    })
    await clear()
    await fetchSession()
    return result
  }

  return {
    user,
    isAuthenticated,
    loggedIn: isAuthenticated,
    fetchUser: fetchSession,
    login,
    register,
    logout,
    deleteAccount,
    signup: register,
  }
}
