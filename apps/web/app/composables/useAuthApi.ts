export interface AuthUser {
  id: string
  email: string
  name: string | null
  isAdmin: boolean | null
  authSessionId?: string | null
  authProvider?: string | null
  authProviders?: string[]
  authBackend?: 'local' | 'supabase'
  emailConfirmedAt?: string | null
  aal?: 'aal1' | 'aal2' | null
  needsPasswordSetup?: boolean
  [key: string]: unknown
}

export interface AuthMutationResult {
  user: AuthUser | null
  nextStep?: 'signed_in' | 'email_confirmation' | 'password_recovery_sent'
  message?: string
  redirectTo?: string
}

type LegacyAuthMutationResult = Omit<AuthMutationResult, 'user'> & {
  user: AuthUser & { name: string }
}

export interface MfaEnrollmentResult {
  factorId: string
  qrCodeSvg: string
  qrCodeDataUrl: string
  secret: string
  uri: string
}

export function useAuthApi() {
  const nuxtApp = useNuxtApp()
  const csrfFetch = (nuxtApp.$csrfFetch ?? $fetch) as typeof $fetch
  const csrfHeaders = { 'X-Requested-With': 'XMLHttpRequest' } as const

  function login(payload: { email: string; password: string; captchaToken?: string }) {
    return csrfFetch<LegacyAuthMutationResult>('/api/auth/login', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function register(payload: {
    name: string
    email: string
    password: string
    captchaToken?: string
    next?: string
  }) {
    return csrfFetch<LegacyAuthMutationResult>('/api/auth/register', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function logout() {
    return csrfFetch<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
      headers: csrfHeaders,
    })
  }

  function loginAsTestUser() {
    return csrfFetch<LegacyAuthMutationResult>('/api/auth/login-test', {
      method: 'POST',
      headers: csrfHeaders,
    })
  }

  function startOAuth(payload: { provider: 'apple'; next?: string }) {
    return csrfFetch<{ url: string }>('/api/auth/oauth/start', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function exchangeSession(payload: { code: string; next?: string }) {
    return csrfFetch<AuthMutationResult>('/api/auth/session/exchange', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function updateProfile(payload: { name?: string }) {
    return csrfFetch<{ ok: boolean; user: AuthUser }>('/api/auth/me', {
      method: 'PATCH',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function changePassword(payload: { currentPassword?: string; newPassword: string }) {
    return csrfFetch<{ success: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function requestPasswordReset(payload: { email: string; captchaToken?: string }) {
    return csrfFetch<AuthMutationResult>('/api/auth/password/reset', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function enrollMfa(payload: { friendlyName?: string }) {
    return csrfFetch<MfaEnrollmentResult>('/api/auth/mfa/enroll', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  function verifyMfa(payload: { factorId: string; code: string }) {
    return csrfFetch<{ success: boolean; aal: 'aal1' | 'aal2' }>('/api/auth/mfa/verify', {
      method: 'POST',
      body: payload,
      headers: csrfHeaders,
    })
  }

  return {
    login,
    register,
    logout,
    loginAsTestUser,
    startOAuth,
    exchangeSession,
    updateProfile,
    changePassword,
    requestPasswordReset,
    enrollMfa,
    verifyMfa,
  }
}
