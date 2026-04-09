import type { AppSessionUser } from '#server/utils/app-auth'

export const DEFAULT_AUTH_SESSION_REVALIDATE_WINDOW_MS = 5 * 60 * 1000

export function stampAuthSessionValidated<T extends AppSessionUser>(
  user: T,
  validatedAt = new Date().toISOString(),
): T {
  return {
    ...user,
    authSessionValidatedAt: validatedAt,
  }
}

export function wasAuthSessionRecentlyValidated(
  user: Pick<AppSessionUser, 'authSessionId' | 'authSessionValidatedAt'> | null | undefined,
  nowMs = Date.now(),
  revalidateWindowMs = DEFAULT_AUTH_SESSION_REVALIDATE_WINDOW_MS,
): boolean {
  if (!user?.authSessionId || !user.authSessionValidatedAt) {
    return false
  }

  const validatedAtMs = Date.parse(user.authSessionValidatedAt)
  if (!Number.isFinite(validatedAtMs)) {
    return false
  }

  return nowMs - validatedAtMs < revalidateWindowMs
}

function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error)
  const candidate = error as {
    message?: string
    statusMessage?: string
    statusCode?: number
    status?: number
    data?: { statusMessage?: string; message?: string }
  }
  return [
    candidate.message,
    candidate.statusMessage,
    candidate.data?.statusMessage,
    candidate.data?.message,
    typeof candidate.statusCode === 'number' ? String(candidate.statusCode) : '',
    typeof candidate.status === 'number' ? String(candidate.status) : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status
  }

  return null
}

function isLikelyAuthUpstreamFailure(message: string): boolean {
  if (!message) return false
  return (
    /is not valid JSON/i.test(message) ||
    /Unexpected token/i.test(message) ||
    /error code:\s*521/i.test(message) ||
    (/\b521\b/.test(message) && /invalid json|parse|fetch|auth/i.test(message))
  )
}

export function isRecoverableSupabaseSessionFailure(error: unknown): boolean {
  const message = extractErrorMessage(error)
  const status = getErrorStatus(error)

  if (isLikelyAuthUpstreamFailure(message)) {
    return true
  }

  if (status !== null && status >= 500) {
    return true
  }

  return (
    /\b(?:fetch failed|network error|econnreset|etimedout|timed out|timeout|temporarily unavailable)\b/i.test(
      message,
    ) || /cloudflare\s+5\d{2}/i.test(message)
  )
}
