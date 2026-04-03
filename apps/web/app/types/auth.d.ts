declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string | null
    isAdmin: boolean | null
    authSessionId?: string | null
    authSessionValidatedAt?: string | null
    authProvider?: string | null
    authProviders?: string[]
    authBackend?: 'local' | 'supabase'
    emailConfirmedAt?: string | null
    aal?: 'aal1' | 'aal2' | null
    needsPasswordSetup?: boolean
  }
}

export {}
