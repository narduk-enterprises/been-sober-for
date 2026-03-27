declare module '#auth-utils' {
  interface User {
    authSessionId?: string | null
    authProvider?: string | null
    authProviders?: string[]
    authBackend?: 'local' | 'supabase'
    emailConfirmedAt?: string | null
    aal?: 'aal1' | 'aal2' | null
    needsPasswordSetup?: boolean
  }
}

export {}
