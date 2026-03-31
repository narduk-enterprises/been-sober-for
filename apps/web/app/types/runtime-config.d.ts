declare module 'nuxt/schema' {
  interface RuntimeConfig {
    appBackendPreset: 'default' | 'managed-supabase'
    authBackend: 'local' | 'supabase'
    authAuthorityUrl: string
    authAnonKey: string
    authServiceRoleKey: string
    authStorageKey: string
    supabaseUrl: string
    supabasePublishableKey: string
    supabaseServiceRoleKey: string
    turnstileSecretKey: string
  }

  interface PublicRuntimeConfig {
    appBackendPreset: 'default' | 'managed-supabase'
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
    supabaseUrl: string
    supabasePublishableKey: string
  }
}

export {}
