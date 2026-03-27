declare module 'nuxt/schema' {
  interface RuntimeConfig {
    authBackend: 'local' | 'supabase'
    authAuthorityUrl: string
    authAnonKey: string
    authServiceRoleKey: string
    authStorageKey: string
    turnstileSecretKey: string
  }

  interface PublicRuntimeConfig {
    authBackend: 'local' | 'supabase'
    authAuthorityUrl: string
    authLoginPath: string
    authRegisterPath: string
    authCallbackPath: string
    authConfirmPath: string
    authResetPath: string
    authLogoutPath: string
    authRedirectPath: string
    authProviders: string[]
    authPublicSignup: boolean
    authRequireMfa: boolean
    authTurnstileSiteKey: string
  }
}

export {}
