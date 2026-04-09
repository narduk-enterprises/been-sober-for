export type AppBackendPreset = 'default' | 'managed-supabase'
export type AppAuthBackend = 'local' | 'supabase'

export interface ResolvedAuthEnvironment {
  appBackendPreset: AppBackendPreset
  authAuthorityUrl: string
  authBackend: AppAuthBackend
  authProviders: string[]
  supabasePublishableKey: string
  supabaseServiceRoleKey: string
  supabaseUrl: string
}

function normalizeSupabaseBaseUrl(value: string | undefined) {
  const raw = (value || '').trim()
  if (!raw) return ''

  const normalizePath = (path: string) =>
    (path || '')
      .replace(/\/auth\/v1\/callback\/?$/, '')
      .replace(/\/auth\/v1\/?$/, '')
      .replace(/\/+$/, '')

  try {
    const url = new URL(raw)
    const normalizedPath = normalizePath(url.pathname)
    url.pathname = normalizedPath || '/'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return normalizePath(raw)
  }
}

function parseAuthProviders(value: string | undefined) {
  return (value || 'apple,email')
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider, index, providers) => provider && providers.indexOf(provider) === index)
}

export function resolveAuthEnvironment(
  env: Record<string, string | undefined>,
): ResolvedAuthEnvironment {
  const supabaseUrl = normalizeSupabaseBaseUrl(env.AUTH_AUTHORITY_URL || env.SUPABASE_URL)
  const supabasePublishableKey =
    env.AUTH_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_AUTH_ANON_KEY ||
    ''
  const supabaseServiceRoleKey =
    env.AUTH_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_AUTH_SERVICE_ROLE_KEY ||
    ''
  const hasSupabaseAuth = Boolean(supabaseUrl && supabasePublishableKey)
  const configuredAuthBackend = env.AUTH_BACKEND
  const authBackend =
    configuredAuthBackend === 'supabase' || configuredAuthBackend === 'local'
      ? configuredAuthBackend
      : hasSupabaseAuth
        ? 'supabase'
        : 'local'
  const configuredPreset = env.APP_BACKEND_PRESET
  const appBackendPreset =
    configuredPreset === 'default'
      ? 'default'
      : configuredPreset === 'managed-supabase' || hasSupabaseAuth
        ? 'managed-supabase'
        : 'default'

  return {
    appBackendPreset,
    authAuthorityUrl: supabaseUrl,
    authBackend,
    authProviders: authBackend === 'supabase' ? parseAuthProviders(env.AUTH_PROVIDERS) : ['email'],
    supabaseUrl,
    supabasePublishableKey,
    supabaseServiceRoleKey,
  }
}
