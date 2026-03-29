import type { H3Event } from 'h3'

/**
 * Cloudflare Workers Rate Limiting binding (see `ratelimits` in wrangler.json).
 * Counters are coordinated per PoP (not per-isolate memory). Complements the
 * in-memory limiter below for defense in depth.
 *
 * @see https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 */
export interface CloudflareRateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

/** Wrangler binding names — must match `ratelimits[].name` in each app. */
export type LayerRateLimitBindingName =
  | 'RL_10'
  | 'RL_20'
  | 'RL_30'
  | 'RL_60'
  | 'RL_120'
  | 'RL_240'
  | 'RL_300'

export type LayerRateLimitEnv = Partial<
  Record<LayerRateLimitBindingName, CloudflareRateLimitBinding>
>

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Designed for Cloudflare Workers where each isolate has its own memory —
 * this provides per-isolate protection against brute-force/credential-stuffing.
 * When `ratelimits` bindings are configured, `enforceRateLimitPolicy` also
 * calls the platform limiter (per-PoP, shared across isolates in that location).
 *
 * NOTE: The module-scope `buckets` Map is INTENTIONAL. It provides within-isolate
 * rate limiting across requests handled by the same Worker instance. This state
 * is NOT shared across isolates and is lost when the isolate is evicted.
 *
 * Usage:
 *   await enforceRateLimitPolicy(event, RATE_LIMIT_POLICIES.authLogin)
 */

interface RateLimitEntry {
  timestamps: number[]
}

export interface RateLimitPolicy {
  key?: string
  namespace: string
  maxRequests: number
  windowMs: number
}

export interface RateLimitPolicyOverride {
  namespace?: string
  maxRequests?: number
  windowMs?: number
}

const MINUTE = 60_000

export function defineRateLimitPolicy(
  key: string,
  namespace: string,
  maxRequests: number,
  windowMs: number,
): RateLimitPolicy {
  return {
    key,
    namespace,
    maxRequests,
    windowMs,
  }
}

export const RATE_LIMIT_POLICIES = {
  adminAiModel: defineRateLimitPolicy('adminAiModel', 'admin-ai-model', 20, MINUTE),
  adminSystemPrompts: defineRateLimitPolicy(
    'adminSystemPrompts',
    'admin-system-prompts',
    20,
    MINUTE,
  ),
  adminUsers: defineRateLimitPolicy('adminUsers', 'admin-users', 20, MINUTE),
  authLogin: defineRateLimitPolicy('authLogin', 'auth-login', 60, MINUTE),
  authRegister: defineRateLimitPolicy('authRegister', 'auth-register', 30, MINUTE),
  authChangePassword: defineRateLimitPolicy(
    'authChangePassword',
    'auth-change-password',
    30,
    MINUTE,
  ),
  authDeleteAccount: defineRateLimitPolicy('authDeleteAccount', 'auth-delete-account', 10, MINUTE),
  authApiKeys: defineRateLimitPolicy('authApiKeys', 'auth-api-keys', 60, MINUTE),
  authLogout: defineRateLimitPolicy('authLogout', 'auth-logout', 30, MINUTE),
  authProfile: defineRateLimitPolicy('authProfile', 'auth-profile', 30, MINUTE),
  notifications: defineRateLimitPolicy('notifications', 'notifications', 60, MINUTE),
  ownerTag: defineRateLimitPolicy('ownerTag', 'owner-tag', 10, MINUTE),
  upload: defineRateLimitPolicy('upload', 'upload', 60, MINUTE),
  indexNowSubmit: defineRateLimitPolicy('indexNowSubmit', 'indexnow', 60, MINUTE),
  googleIndexingBatch: defineRateLimitPolicy(
    'googleIndexingBatch',
    'google-indexing-batch',
    60,
    MINUTE,
  ),
  googleIndexingPublish: defineRateLimitPolicy(
    'googleIndexingPublish',
    'google-indexing-publish',
    120,
    MINUTE,
  ),
  googleIndexingStatus: defineRateLimitPolicy(
    'googleIndexingStatus',
    'google-indexing-status',
    240,
    MINUTE,
  ),
  showcaseAuthLogin: defineRateLimitPolicy('showcaseAuthLogin', 'auth-login', 60, MINUTE),
  showcaseAuthLoginTest: defineRateLimitPolicy(
    'showcaseAuthLoginTest',
    'auth-login-test',
    300,
    MINUTE,
  ),
} as const satisfies Record<string, RateLimitPolicy>

const buckets = new Map<string, Map<string, RateLimitEntry>>()
let cleanupCounter = 0

/** Maps policy maxRequests (per minute) to a wrangler `ratelimits` binding. */
const RATE_LIMIT_BINDING_BY_MAX: Partial<Record<number, LayerRateLimitBindingName>> = {
  10: 'RL_10',
  20: 'RL_20',
  30: 'RL_30',
  60: 'RL_60',
  120: 'RL_120',
  240: 'RL_240',
  300: 'RL_300',
}

function getCloudflareRateLimiter(
  event: H3Event,
  policy: RateLimitPolicy,
): CloudflareRateLimitBinding | null {
  const bindingName = RATE_LIMIT_BINDING_BY_MAX[policy.maxRequests]
  if (!bindingName) return null

  const env = event.context.cloudflare?.env as LayerRateLimitEnv | undefined
  const limiter = env?.[bindingName]
  return limiter ?? null
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function resolveRateLimitPolicy(event: H3Event, policy: RateLimitPolicy): RateLimitPolicy {
  if (!policy.key) return policy

  const config = useRuntimeConfig(event) as {
    rateLimitPolicies?: Record<string, RateLimitPolicyOverride | undefined>
  }
  const override = config.rateLimitPolicies?.[policy.key]
  if (!override) return policy

  return {
    key: policy.key,
    namespace:
      typeof override.namespace === 'string' && override.namespace.trim().length > 0
        ? override.namespace.trim()
        : policy.namespace,
    maxRequests: isPositiveInteger(override.maxRequests)
      ? override.maxRequests
      : policy.maxRequests,
    windowMs: isPositiveInteger(override.windowMs) ? override.windowMs : policy.windowMs,
  }
}

function getClientIp(event: H3Event): string {
  return (
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  )
}

/**
 * Enforce a rate limit for the given namespace.
 *
 * @param event - H3 event
 * @param namespace - e.g. 'auth', 'api'
 * @param maxRequests - max requests allowed in the window
 * @param windowMs - sliding window duration in milliseconds
 * @throws 429 Too Many Requests if the limit is exceeded
 */
export async function enforceRateLimit(
  event: H3Event,
  namespace: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  const ip = getClientIp(event)
  const key = `${namespace}:${ip}`

  if (!buckets.has(namespace)) {
    buckets.set(namespace, new Map())
  }

  const bucket = buckets.get(namespace)!
  const now = Date.now()
  const cutoff = now - windowMs

  let entry = bucket.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    bucket.set(key, entry)
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= maxRequests) {
    const retryAfter = Math.ceil((entry.timestamps[0]! + windowMs - now) / 1000)
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    })
  }

  entry.timestamps.push(now)

  // Deterministic cleanup: remove stale entries every 100 requests
  cleanupCounter++
  if (cleanupCounter % 100 === 0) {
    for (const [k, v] of bucket) {
      if (v.timestamps.every((t) => t <= cutoff)) {
        bucket.delete(k)
      }
    }
  }
}

async function enforceCloudflareRateLimit(event: H3Event, policy: RateLimitPolicy): Promise<void> {
  const limiter = getCloudflareRateLimiter(event, policy)
  if (!limiter) return

  const ip = getClientIp(event)
  const key = `${policy.namespace}:${ip}`
  const { success } = await limiter.limit({ key })

  if (!success) {
    const retryAfterSec = Math.max(1, Math.ceil(policy.windowMs / 1000))
    setResponseHeader(event, 'Retry-After', retryAfterSec)
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    })
  }
}

export async function enforceRateLimitPolicy(
  event: H3Event,
  policy: RateLimitPolicy,
): Promise<void> {
  const resolvedPolicy = resolveRateLimitPolicy(event, policy)
  await enforceCloudflareRateLimit(event, resolvedPolicy)
  await enforceRateLimit(
    event,
    resolvedPolicy.namespace,
    resolvedPolicy.maxRequests,
    resolvedPolicy.windowMs,
  )
}
