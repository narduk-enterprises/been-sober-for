import type { H3Event } from 'h3'
import { deleteCookie, getCookie, getRequestHeader, setCookie } from 'h3'
import {
  type AuthError,
  type AuthenticatorAssuranceLevels,
  type Session as SupabaseSession,
  type User as SupabaseUser,
  GoTrueClient,
} from '@supabase/auth-js'
import { eq } from 'drizzle-orm'
import { users, type User as LocalUser } from '#layer/orm-tables'
import { authSessions, authUserLinks } from '#server/app-orm-tables'
import { useDatabase } from '#layer/server/utils/database'
import { hashUserPassword, verifyUserPassword } from '#layer/server/utils/password'
import { useAppDatabase } from '#server/utils/database'

const PKCE_COOKIE_NAME = 'app_auth_pkce'

export type AppAuthBackend = 'local' | 'supabase'
export type AppAuthProvider = 'apple' | 'email'
type OAuthProvider = 'apple'

export interface AppSessionUser {
  id: string
  email: string
  name: string | null
  isAdmin: boolean | null
  authSessionId?: string | null
  authProvider?: string | null
  authProviders?: string[]
  authBackend?: AppAuthBackend
  emailConfirmedAt?: string | null
  aal?: AuthenticatorAssuranceLevels | null
  needsPasswordSetup?: boolean
}

export interface AuthMutationResult {
  user: AppSessionUser | null
  nextStep?: 'signed_in' | 'email_confirmation' | 'password_recovery_sent'
  message?: string
  redirectTo?: string
}

export interface MfaEnrollmentResult {
  factorId: string
  qrCodeSvg: string
  qrCodeDataUrl: string
  secret: string
  uri: string
}

type AuthConfig = {
  backend: AppAuthBackend
  authorityUrl: string
  authUrl: string
  anonKey: string
  serviceRoleKey: string
  storageKey: string
  appUrl: string
  loginPath: string
  registerPath: string
  callbackPath: string
  confirmPath: string
  resetPath: string
  logoutPath: string
  redirectPath: string
  publicSignup: boolean
  requireMfa: boolean
  providers: AppAuthProvider[]
}

type CookieLikeStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  isServer: true
}

type ExchangeCodeOptions = {
  code: string
  next?: string | null
}

type RegisterInput = {
  email: string
  name: string
  password: string
  captchaToken?: string
  next?: string | null
}

type LoginInput = {
  email: string
  password: string
  captchaToken?: string
}

type PasswordResetRequest = {
  email: string
  captchaToken?: string
}

type UpdateProfileInput = {
  name?: string
}

type ChangePasswordInput = {
  currentPassword?: string
  newPassword: string
}

type OAuthStartInput = {
  provider: OAuthProvider
  next?: string | null
}

type VerifyMfaInput = {
  factorId: string
  code: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function deriveDisplayName(email: string) {
  const localPart = email.split('@')[0] || 'User'
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

function getAuthConfig(event: H3Event): AuthConfig {
  const config = useRuntimeConfig(event)
  const authorityUrl = config.authAuthorityUrl.trim()

  return {
    backend: config.authBackend === 'supabase' ? 'supabase' : 'local',
    authorityUrl,
    authUrl: normalizeAuthUrl(authorityUrl),
    anonKey: config.authAnonKey,
    serviceRoleKey: config.authServiceRoleKey,
    storageKey: config.authStorageKey || 'web-auth',
    appUrl: config.public.appUrl,
    loginPath: config.public.authLoginPath,
    registerPath: config.public.authRegisterPath,
    callbackPath: config.public.authCallbackPath,
    confirmPath: config.public.authConfirmPath,
    resetPath: config.public.authResetPath,
    logoutPath: config.public.authLogoutPath,
    redirectPath: config.public.authRedirectPath,
    publicSignup: config.public.authPublicSignup,
    requireMfa: config.public.authRequireMfa,
    providers: config.public.authProviders.filter(isAuthProvider),
  }
}

function normalizeAuthUrl(value: string) {
  if (!value) return ''
  return value.endsWith('/auth/v1') ? value : `${value.replace(/\/$/, '')}/auth/v1`
}

function isAuthProvider(value: string): value is AppAuthProvider {
  return value === 'apple' || value === 'email'
}

function isSupabaseConfigured(config: AuthConfig) {
  return Boolean(config.authorityUrl && config.authUrl && config.anonKey)
}

function getSessionCookieSecure(event: H3Event) {
  const host = getRequestHeader(event, 'host') ?? ''
  return !(host.startsWith('localhost') || host.startsWith('127.0.0.1'))
}

function encodeQrCodeDataUrl(svg: string) {
  return `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`
}

function decodeAccessTokenPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  if (!payload) return {}

  try {
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/')
    const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
    const json = atob(`${normalized}${padding}`)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

function sanitizeNextPath(value: string | null | undefined, fallback: string) {
  if (!value) return fallback

  try {
    const url = new URL(value, 'https://app.local')
    if (url.origin !== 'https://app.local' || !url.pathname.startsWith('/')) {
      return fallback
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

function buildAppUrl(
  baseUrl: string,
  path: string,
  search?: Record<string, string | null | undefined>,
) {
  const url = new URL(path, baseUrl)
  for (const [key, value] of Object.entries(search ?? {})) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

function toSessionUser(user: LocalUser, extras: Partial<AppSessionUser> = {}): AppSessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    ...extras,
  }
}

function extractProviderMetadata(user: SupabaseUser) {
  const appMetadata =
    user.app_metadata && typeof user.app_metadata === 'object'
      ? (user.app_metadata as Record<string, unknown>)
      : {}
  const userMetadata =
    user.user_metadata && typeof user.user_metadata === 'object'
      ? (user.user_metadata as Record<string, unknown>)
      : {}
  const providers = Array.isArray(appMetadata.providers)
    ? appMetadata.providers.filter((provider): provider is string => typeof provider === 'string')
    : typeof appMetadata.provider === 'string'
      ? [appMetadata.provider]
      : []
  const primaryProvider =
    typeof appMetadata.provider === 'string' ? appMetadata.provider : (providers[0] ?? null)
  const displayName =
    (typeof userMetadata.name === 'string' && userMetadata.name.trim()) ||
    (typeof userMetadata.full_name === 'string' && userMetadata.full_name.trim()) ||
    (typeof userMetadata.display_name === 'string' && userMetadata.display_name.trim()) ||
    null

  const appleIdentity = Array.isArray(user.identities)
    ? user.identities.find((identity) => identity.provider === 'apple')
    : null
  const appleId =
    appleIdentity &&
    appleIdentity.identity_data &&
    typeof appleIdentity.identity_data === 'object' &&
    typeof (appleIdentity.identity_data as Record<string, unknown>).sub === 'string'
      ? ((appleIdentity.identity_data as Record<string, unknown>).sub as string)
      : null

  return {
    providers,
    primaryProvider,
    displayName,
    appleId,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    needsPasswordSetup: !providers.includes('email'),
  }
}

function getPkceStorage(event: H3Event): CookieLikeStorage {
  const memory = new Map<string, string>()

  return {
    isServer: true,
    getItem(key) {
      if (key.endsWith('-code-verifier')) {
        return getCookie(event, PKCE_COOKIE_NAME) ?? null
      }
      return memory.get(key) ?? null
    },
    setItem(key, value) {
      if (key.endsWith('-code-verifier')) {
        setCookie(event, PKCE_COOKIE_NAME, value, {
          httpOnly: true,
          sameSite: 'lax',
          secure: getSessionCookieSecure(event),
          maxAge: 60 * 15,
          path: '/',
        })
        return
      }

      memory.set(key, value)
    },
    removeItem(key) {
      if (key.endsWith('-code-verifier')) {
        deleteCookie(event, PKCE_COOKIE_NAME, { path: '/' })
        return
      }

      memory.delete(key)
    },
  }
}

function createSupabaseClient(event: H3Event, apiKey: string) {
  const config = getAuthConfig(event)
  if (!config.authUrl || !apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase auth is not configured for this app.',
    })
  }

  return new GoTrueClient({
    url: config.authUrl,
    headers: {
      apikey: apiKey,
      ...(apiKey === config.serviceRoleKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    storageKey: config.storageKey,
    flowType: 'pkce',
    detectSessionInUrl: false,
    autoRefreshToken: false,
    persistSession: true,
    storage: getPkceStorage(event),
  })
}

function createSupabaseUserClient(event: H3Event) {
  const config = getAuthConfig(event)
  return createSupabaseClient(event, config.anonKey)
}

function toSupabaseHttpError(error: AuthError, fallbackStatusCode = 400): never {
  throw createError({
    statusCode:
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : fallbackStatusCode,
    statusMessage: error.message || 'Auth request failed.',
  })
}

async function ensureLinkedLocalUser(event: H3Event, authUser: SupabaseUser): Promise<LocalUser> {
  const log = useLogger(event).child('AppAuth')
  const db = useDatabase(event)
  const appDb = useAppDatabase(event)
  const normalizedEmail = normalizeEmail(authUser.email || '')
  if (!normalizedEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Supabase user is missing a usable email address.',
    })
  }

  const metadata = extractProviderMetadata(authUser)
  const now = new Date().toISOString()
  const linked = await appDb
    .select()
    .from(authUserLinks)
    .where(eq(authUserLinks.authUserId, authUser.id))
    .get()

  let localUser: LocalUser | undefined

  if (linked) {
    localUser = await db.select().from(users).where(eq(users.id, linked.localUserId)).get()
  }

  if (!localUser) {
    localUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).get()
  }

  if (!localUser) {
    const newUserId = crypto.randomUUID()
    const fallbackName = metadata.displayName || deriveDisplayName(normalizedEmail)

    await db.insert(users).values({
      id: newUserId,
      email: normalizedEmail,
      name: fallbackName,
      appleId: metadata.appleId,
      passwordHash: null,
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    })

    localUser = await db.select().from(users).where(eq(users.id, newUserId)).get()
  }

  if (!localUser) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to provision a local user for the shared auth identity.',
    })
  }

  const conflictingEmailUser =
    localUser.email !== normalizedEmail
      ? await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).get()
      : null

  if (conflictingEmailUser && conflictingEmailUser.id !== localUser.id) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Another local user already owns the confirmed auth email.',
    })
  }

  const nextName = metadata.displayName || localUser.name || deriveDisplayName(normalizedEmail)
  const localUpdates: Partial<typeof users.$inferInsert> = {
    email: normalizedEmail,
    name: nextName,
    updatedAt: now,
  }

  if (metadata.appleId && !localUser.appleId) {
    localUpdates.appleId = metadata.appleId
  }

  await db.update(users).set(localUpdates).where(eq(users.id, localUser.id)).run()

  const existingLink = await appDb
    .select()
    .from(authUserLinks)
    .where(eq(authUserLinks.localUserId, localUser.id))
    .get()

  const linkValues = {
    localUserId: localUser.id,
    authUserId: authUser.id,
    primaryEmail: normalizedEmail,
    lastProvider: metadata.primaryProvider,
    providersJson: JSON.stringify(metadata.providers),
    emailConfirmedAt: metadata.emailConfirmedAt,
    updatedAt: now,
  }

  if (existingLink) {
    await appDb
      .update(authUserLinks)
      .set(linkValues)
      .where(eq(authUserLinks.localUserId, localUser.id))
      .run()
  } else {
    await appDb.insert(authUserLinks).values({
      ...linkValues,
      createdAt: now,
    })
  }

  log.info('Linked shared auth user to local user', {
    authUserId: authUser.id,
    localUserId: localUser.id,
    provider: metadata.primaryProvider,
  })

  return {
    ...localUser,
    email: normalizedEmail,
    name: nextName,
    appleId: metadata.appleId || localUser.appleId,
    updatedAt: now,
  }
}

async function persistSupabaseSession(
  event: H3Event,
  params: {
    authUser: SupabaseUser
    localUser: LocalUser
    session: SupabaseSession
    sessionId?: string | null
    recoveryMode?: boolean
  },
) {
  const appDb = useAppDatabase(event)
  const now = new Date().toISOString()
  const payload = decodeAccessTokenPayload(params.session.access_token)
  const metadata = extractProviderMetadata(params.authUser)
  const authSessionId = params.sessionId || crypto.randomUUID()

  const values = {
    localUserId: params.localUser.id,
    authUserId: params.authUser.id,
    sessionIdentifier:
      typeof payload.session_id === 'string' ? payload.session_id : params.session.user.id,
    accessToken: params.session.access_token,
    refreshToken: params.session.refresh_token,
    expiresAt:
      params.session.expires_at ??
      Math.floor(Date.now() / 1000) + Math.max(0, params.session.expires_in || 0),
    aal: typeof payload.aal === 'string' ? (payload.aal as AuthenticatorAssuranceLevels) : null,
    currentProvider: metadata.primaryProvider,
    providersJson: JSON.stringify(metadata.providers),
    recoveryMode: params.recoveryMode ?? false,
    updatedAt: now,
  }

  if (params.sessionId) {
    await appDb.update(authSessions).set(values).where(eq(authSessions.id, params.sessionId)).run()
  } else {
    await appDb.insert(authSessions).values({
      id: authSessionId,
      createdAt: now,
      ...values,
    })
  }

  return {
    authSessionId,
    aal: values.aal,
    providers: metadata.providers,
    authProvider: metadata.primaryProvider,
    emailConfirmedAt: metadata.emailConfirmedAt,
    needsPasswordSetup: metadata.needsPasswordSetup,
  }
}

export async function getCurrentSessionUser(event: H3Event): Promise<AppSessionUser | null> {
  const session = await getUserSession(event)
  return session?.user ? (session.user as AppSessionUser) : null
}

async function setCurrentSessionUser(event: H3Event, user: AppSessionUser) {
  await setUserSession(event, { user })
}

async function clearCurrentSession(event: H3Event) {
  const sessionUser = await getCurrentSessionUser(event)
  const authSessionId = sessionUser?.authSessionId
  if (authSessionId) {
    const appDb = useAppDatabase(event)
    await appDb.delete(authSessions).where(eq(authSessions.id, authSessionId)).run()
  }

  deleteCookie(event, PKCE_COOKIE_NAME, { path: '/' })
  await clearUserSession(event)
}

export async function getCurrentSupabaseContext(event: H3Event) {
  const sessionUser = await getCurrentSessionUser(event)
  if (!sessionUser?.authSessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'This account does not have an active shared auth session.',
    })
  }

  const appDb = useAppDatabase(event)
  const authSession = await appDb
    .select()
    .from(authSessions)
    .where(eq(authSessions.id, sessionUser.authSessionId))
    .get()

  if (!authSession) {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Your auth session is no longer available. Please sign in again.',
    })
  }

  const client = createSupabaseUserClient(event)
  const { data, error } = await client.setSession({
    access_token: authSession.accessToken,
    refresh_token: authSession.refreshToken,
  })

  if (error || !data.session || !data.user) {
    await appDb.delete(authSessions).where(eq(authSessions.id, authSession.id)).run()
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Your auth session expired. Please sign in again.',
    })
  }

  const localUser = await ensureLinkedLocalUser(event, data.user)
  const persisted = await persistSupabaseSession(event, {
    authUser: data.user,
    localUser,
    session: data.session,
    sessionId: authSession.id,
    recoveryMode: authSession.recoveryMode,
  })

  const refreshedUser = toSessionUser(localUser, {
    authBackend: 'supabase',
    authSessionId: persisted.authSessionId,
    authProvider: persisted.authProvider,
    authProviders: persisted.providers,
    emailConfirmedAt: persisted.emailConfirmedAt,
    aal: persisted.aal,
    needsPasswordSetup: persisted.needsPasswordSetup,
  })
  await replaceUserSession(event, { user: refreshedUser })

  return {
    client,
    localUser,
    authUser: data.user,
    session: data.session,
    sessionUser: refreshedUser,
    authSessionId: persisted.authSessionId,
  }
}

async function commitSupabaseSessionFromClient(
  event: H3Event,
  params: {
    client: GoTrueClient
    localUser: LocalUser
    authUser: SupabaseUser
    authSessionId: string
    recoveryMode?: boolean
  },
) {
  const { data } = await params.client.getSession()
  if (!data.session) {
    return null
  }

  return persistSupabaseSession(event, {
    authUser: params.authUser,
    localUser: params.localUser,
    session: data.session,
    sessionId: params.authSessionId,
    recoveryMode: params.recoveryMode,
  })
}

export async function getSessionUserResponse(event: H3Event) {
  const user = await getCurrentSessionUser(event)
  if (!user?.authSessionId) {
    return { user }
  }

  try {
    const context = await getCurrentSupabaseContext(event)
    return { user: context.sessionUser }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 401
    ) {
      return { user: null }
    }
    throw error
  }
}

export async function loginUser(event: H3Event, body: LoginInput): Promise<AuthMutationResult> {
  const config = getAuthConfig(event)
  if (config.backend === 'supabase' && isSupabaseConfigured(config)) {
    return loginWithSupabase(event, body)
  }
  return loginWithLocalAuth(event, body)
}

async function loginWithLocalAuth(event: H3Event, body: LoginInput): Promise<AuthMutationResult> {
  const log = useLogger(event).child('AppAuth')
  const db = useDatabase(event)
  const normalizedEmail = normalizeEmail(body.email)
  const user = await db.select().from(users).where(eq(users.email, normalizedEmail)).get()

  if (!user || !user.passwordHash) {
    log.warn('Local login failed', { email: normalizedEmail })
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  const isValid = await verifyUserPassword(body.password, user.passwordHash)
  if (!isValid) {
    log.warn('Local login failed', { email: normalizedEmail })
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  const sessionUser = toSessionUser(user, {
    authBackend: 'local',
    authProvider: user.appleId ? 'apple' : 'email',
    authProviders: user.appleId ? ['apple', 'email'] : ['email'],
    needsPasswordSetup: false,
  })
  await setCurrentSessionUser(event, sessionUser)

  return {
    user: sessionUser,
    nextStep: 'signed_in',
  }
}

async function loginWithSupabase(event: H3Event, body: LoginInput): Promise<AuthMutationResult> {
  const client = createSupabaseUserClient(event)
  const { data, error } = await client.signInWithPassword({
    email: normalizeEmail(body.email),
    password: body.password,
    options: body.captchaToken ? { captchaToken: body.captchaToken } : undefined,
  })

  if (error || !data.user || !data.session) {
    if (error) toSupabaseHttpError(error, 401)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unable to sign in with those credentials.',
    })
  }

  const localUser = await ensureLinkedLocalUser(event, data.user)
  const persisted = await persistSupabaseSession(event, {
    authUser: data.user,
    localUser,
    session: data.session,
  })
  const sessionUser = toSessionUser(localUser, {
    authBackend: 'supabase',
    authSessionId: persisted.authSessionId,
    authProvider: persisted.authProvider,
    authProviders: persisted.providers,
    emailConfirmedAt: persisted.emailConfirmedAt,
    aal: persisted.aal,
    needsPasswordSetup: persisted.needsPasswordSetup,
  })
  await setCurrentSessionUser(event, sessionUser)

  return {
    user: sessionUser,
    nextStep: 'signed_in',
  }
}

export async function registerUser(
  event: H3Event,
  body: RegisterInput,
): Promise<AuthMutationResult> {
  const config = getAuthConfig(event)
  if (config.backend === 'supabase' && isSupabaseConfigured(config)) {
    return registerWithSupabase(event, body)
  }
  return registerWithLocalAuth(event, body)
}

async function registerWithLocalAuth(
  event: H3Event,
  body: RegisterInput,
): Promise<AuthMutationResult> {
  const log = useLogger(event).child('AppAuth')
  const db = useDatabase(event)
  const normalizedEmail = normalizeEmail(body.email)
  const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).get()

  if (existingUser) {
    log.warn('Local registration rejected', { email: normalizedEmail })
    throw createError({
      statusCode: 409,
      statusMessage: 'Email already in use',
    })
  }

  const userId = crypto.randomUUID()
  const passwordHash = await hashUserPassword(body.password)
  await db.insert(users).values({
    id: userId,
    email: normalizedEmail,
    name: body.name.trim(),
    passwordHash,
  })

  const user = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create the local account.',
    })
  }

  const sessionUser = toSessionUser(user, {
    authBackend: 'local',
    authProvider: 'email',
    authProviders: ['email'],
    needsPasswordSetup: false,
  })
  await setCurrentSessionUser(event, sessionUser)

  return {
    user: sessionUser,
    nextStep: 'signed_in',
  }
}

async function registerWithSupabase(
  event: H3Event,
  body: RegisterInput,
): Promise<AuthMutationResult> {
  const config = getAuthConfig(event)
  if (!config.publicSignup) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Public signup is disabled for this app.',
    })
  }

  const client = createSupabaseUserClient(event)
  const next = sanitizeNextPath(body.next, config.redirectPath)
  const confirmUrl = buildAppUrl(config.appUrl, config.confirmPath, {
    next,
  })
  const { data, error } = await client.signUp({
    email: normalizeEmail(body.email),
    password: body.password,
    options: {
      data: {
        name: body.name.trim(),
        full_name: body.name.trim(),
      },
      emailRedirectTo: confirmUrl,
      ...(body.captchaToken ? { captchaToken: body.captchaToken } : {}),
    },
  })

  if (error) {
    toSupabaseHttpError(error)
  }

  if (data.session && data.user) {
    const localUser = await ensureLinkedLocalUser(event, data.user)
    const persisted = await persistSupabaseSession(event, {
      authUser: data.user,
      localUser,
      session: data.session,
    })
    const sessionUser = toSessionUser(localUser, {
      authBackend: 'supabase',
      authSessionId: persisted.authSessionId,
      authProvider: persisted.authProvider,
      authProviders: persisted.providers,
      emailConfirmedAt: persisted.emailConfirmedAt,
      aal: persisted.aal,
      needsPasswordSetup: persisted.needsPasswordSetup,
    })
    await setCurrentSessionUser(event, sessionUser)

    return {
      user: sessionUser,
      nextStep: 'signed_in',
      redirectTo: next,
    }
  }

  return {
    user: null,
    nextStep: 'email_confirmation',
    message: 'Check your email to confirm the account before signing in.',
  }
}

export async function startOAuthFlow(event: H3Event, body: OAuthStartInput) {
  const config = getAuthConfig(event)
  if (config.backend !== 'supabase' || !isSupabaseConfigured(config)) {
    throw createError({
      statusCode: 501,
      statusMessage: 'OAuth sign-in is not enabled for local auth mode.',
    })
  }

  if (!config.providers.includes(body.provider)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Provider "${body.provider}" is not enabled for this app.`,
    })
  }

  const client = createSupabaseUserClient(event)
  const next = sanitizeNextPath(body.next, config.redirectPath)
  const redirectTo = buildAppUrl(config.appUrl, config.callbackPath, { next })
  const { data, error } = await client.signInWithOAuth({
    provider: body.provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: body.provider === 'apple' ? { prompt: 'login' } : undefined,
    },
  })

  if (error || !data.url) {
    if (error) toSupabaseHttpError(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start the OAuth flow.',
    })
  }

  return {
    url: data.url,
  }
}

export async function exchangeSupabaseCode(
  event: H3Event,
  body: ExchangeCodeOptions,
): Promise<AuthMutationResult> {
  const config = getAuthConfig(event)
  if (config.backend !== 'supabase' || !isSupabaseConfigured(config)) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Code exchange is only available when Supabase auth is enabled.',
    })
  }

  const client = createSupabaseUserClient(event)
  const { data, error } = await client.exchangeCodeForSession(body.code)

  if (error || !data.user || !data.session) {
    if (error) toSupabaseHttpError(error, 401)
    throw createError({
      statusCode: 401,
      statusMessage: 'The auth callback could not be exchanged for a session.',
    })
  }

  const localUser = await ensureLinkedLocalUser(event, data.user)
  const next = sanitizeNextPath(body.next, config.redirectPath)
  const redirectType =
    typeof (data as { redirectType?: string | null }).redirectType === 'string'
      ? (data as { redirectType?: string | null }).redirectType
      : null
  const redirectTo =
    redirectType === 'recovery'
      ? buildAppUrl(config.appUrl, config.resetPath, { recovery: '1', next })
      : next
  const persisted = await persistSupabaseSession(event, {
    authUser: data.user,
    localUser,
    session: data.session,
    recoveryMode: redirectType === 'recovery',
  })
  const sessionUser = toSessionUser(localUser, {
    authBackend: 'supabase',
    authSessionId: persisted.authSessionId,
    authProvider: persisted.authProvider,
    authProviders: persisted.providers,
    emailConfirmedAt: persisted.emailConfirmedAt,
    aal: persisted.aal,
    needsPasswordSetup: persisted.needsPasswordSetup,
  })
  await setCurrentSessionUser(event, sessionUser)

  return {
    user: sessionUser,
    nextStep: 'signed_in',
    redirectTo,
  }
}

export async function requestPasswordReset(
  event: H3Event,
  body: PasswordResetRequest,
): Promise<AuthMutationResult> {
  const config = getAuthConfig(event)
  if (config.backend !== 'supabase' || !isSupabaseConfigured(config)) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Password reset email is only available when Supabase auth is enabled.',
    })
  }

  const client = createSupabaseUserClient(event)
  const redirectTo = buildAppUrl(config.appUrl, config.callbackPath, {
    next: config.resetPath,
  })
  const { error } = await client.resetPasswordForEmail(normalizeEmail(body.email), {
    redirectTo,
    ...(body.captchaToken ? { captchaToken: body.captchaToken } : {}),
  })

  if (error) {
    toSupabaseHttpError(error)
  }

  return {
    user: null,
    nextStep: 'password_recovery_sent',
    message: 'Check your email for the password reset link.',
  }
}

export async function updateProfile(event: H3Event, body: UpdateProfileInput) {
  const config = getAuthConfig(event)
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const sessionUser = await getCurrentSessionUser(event)
  if (!sessionUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  if (config.backend === 'supabase' && sessionUser.authSessionId) {
    const context = await getCurrentSupabaseContext(event)
    const { data, error } = await context.client.updateUser({
      data: {
        ...(name !== undefined ? { name, full_name: name, display_name: name } : {}),
      },
    })

    if (error) {
      toSupabaseHttpError(error)
    }

    const db = useDatabase(event)
    await db
      .update(users)
      .set({
        ...(name !== undefined ? { name } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, context.localUser.id))
      .run()

    if (data.user) {
      await ensureLinkedLocalUser(event, data.user)
      await commitSupabaseSessionFromClient(event, {
        client: context.client,
        localUser: context.localUser,
        authUser: data.user,
        authSessionId: context.authSessionId,
      })
    }

    const refreshedUser = {
      ...context.sessionUser,
      ...(name !== undefined ? { name } : {}),
    }
    await replaceUserSession(event, { user: refreshedUser })

    return { ok: true, user: refreshedUser }
  }

  const db = useDatabase(event)
  await db
    .update(users)
    .set({
      ...(name !== undefined ? { name } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, sessionUser.id))
    .run()

  const refreshedUser = {
    ...sessionUser,
    ...(name !== undefined ? { name } : {}),
  }
  await replaceUserSession(event, { user: refreshedUser })

  return { ok: true, user: refreshedUser }
}

export async function changePassword(event: H3Event, body: ChangePasswordInput) {
  const config = getAuthConfig(event)
  const sessionUser = await getCurrentSessionUser(event)
  if (!sessionUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  if (config.backend === 'supabase' && sessionUser.authSessionId) {
    if (sessionUser.authProviders?.includes('email') && !sessionUser.needsPasswordSetup) {
      if (!body.currentPassword) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Current password is required for email-auth accounts.',
        })
      }

      const verifier = createSupabaseUserClient(event)
      const verification = await verifier.signInWithPassword({
        email: sessionUser.email,
        password: body.currentPassword,
      })
      if (verification.error) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid current password.',
        })
      }
    }

    const context = await getCurrentSupabaseContext(event)
    const { data, error } = await context.client.updateUser({
      password: body.newPassword,
    })

    if (error) {
      toSupabaseHttpError(error)
    }

    await commitSupabaseSessionFromClient(event, {
      client: context.client,
      localUser: context.localUser,
      authUser: data.user ?? context.authUser,
      authSessionId: context.authSessionId,
    })

    await replaceUserSession(event, {
      user: {
        ...context.sessionUser,
        needsPasswordSetup: false,
      },
    })

    return { success: true }
  }

  const db = useDatabase(event)
  const dbUser = await db.select().from(users).where(eq(users.id, sessionUser.id)).get()

  if (!dbUser || !dbUser.passwordHash) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized — invalid user state',
    })
  }

  const isValid = await verifyUserPassword(body.currentPassword || '', dbUser.passwordHash)
  if (!isValid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid current password',
    })
  }

  const hashedPassword = await hashUserPassword(body.newPassword)
  await db
    .update(users)
    .set({
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, sessionUser.id))
    .run()

  return { success: true }
}

export async function enrollMfa(
  event: H3Event,
  friendlyName?: string,
): Promise<MfaEnrollmentResult> {
  const context = await getCurrentSupabaseContext(event)
  const { data, error } = await context.client.mfa.enroll({
    factorType: 'totp',
    issuer: useRuntimeConfig(event).public.appName,
    ...(friendlyName ? { friendlyName } : {}),
  })

  if (error || !data) {
    if (error) toSupabaseHttpError(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to enroll a new MFA factor.',
    })
  }

  return {
    factorId: data.id,
    qrCodeSvg: data.totp.qr_code,
    qrCodeDataUrl: encodeQrCodeDataUrl(data.totp.qr_code),
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

export async function verifyMfa(event: H3Event, body: VerifyMfaInput) {
  const context = await getCurrentSupabaseContext(event)
  const { data, error } = await context.client.mfa.challengeAndVerify({
    factorId: body.factorId,
    code: body.code,
  })

  if (error || !data) {
    if (error) toSupabaseHttpError(error)
    throw createError({
      statusCode: 400,
      statusMessage: 'Unable to verify the MFA code.',
    })
  }

  const persisted = await commitSupabaseSessionFromClient(event, {
    client: context.client,
    localUser: context.localUser,
    authUser: data.user ?? context.authUser,
    authSessionId: context.authSessionId,
  })

  await replaceUserSession(event, {
    user: {
      ...context.sessionUser,
      ...(persisted ? { aal: persisted.aal } : {}),
    },
  })

  return {
    success: true,
    aal: persisted?.aal ?? 'aal2',
  }
}

export async function logoutUser(event: H3Event) {
  const config = getAuthConfig(event)
  const sessionUser = await getCurrentSessionUser(event)

  if (config.backend === 'supabase' && sessionUser?.authSessionId) {
    try {
      const context = await getCurrentSupabaseContext(event)
      await context.client.signOut()
    } catch {
      // Clearing the app-local session is the important part; auth service logout
      // failure should not trap the user in a broken state.
    }
  }

  await clearCurrentSession(event)
  return { success: true }
}

/**
 * Deletes the Supabase Auth identity that is linked to the given local user.
 *
 * Looks up the upstream `auth_user_id` from the `auth_user_links` bridge
 * table, then calls the Supabase Admin API with the service-role key to
 * permanently remove the identity.  If no link exists (e.g. the account was
 * created before Supabase was enabled), the function is a no-op.
 *
 * Call this inside a `beforeDelete` hook passed to `deleteCurrentUserAccount`
 * so that the upstream identity is removed before the local DB row is deleted.
 */
export async function deleteSupabaseAuthUser(event: H3Event, localUserId: string): Promise<void> {
  const config = getAuthConfig(event)
  const appDb = useAppDatabase(event)

  const link = await appDb
    .select({ authUserId: authUserLinks.authUserId })
    .from(authUserLinks)
    .where(eq(authUserLinks.localUserId, localUserId))
    .get()

  if (!link) {
    return
  }

  const client = createSupabaseClient(event, config.serviceRoleKey)
  const { error } = await client.admin.deleteUser(link.authUserId)
  if (error) {
    toSupabaseHttpError(error, 500)
  }
}

export function getAuthUiState(event?: H3Event) {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()

  return {
    backend: config.public.authBackend,
    authorityUrl: config.public.authAuthorityUrl,
    providers: config.public.authProviders.filter(isAuthProvider),
    publicSignup: config.public.authPublicSignup,
    requireMfa: config.public.authRequireMfa,
    loginPath: config.public.authLoginPath,
    registerPath: config.public.authRegisterPath,
    callbackPath: config.public.authCallbackPath,
    confirmPath: config.public.authConfirmPath,
    resetPath: config.public.authResetPath,
    logoutPath: config.public.authLogoutPath,
    redirectPath: config.public.authRedirectPath,
    turnstileSiteKey: config.public.authTurnstileSiteKey,
  }
}
