import type { Page } from '@playwright/test'
import { registerAndLogin, createUniqueEmail } from './fixtures'

/**
 * CSRF + JSON headers used by all mutation API helpers.
 */
const MUTATION_HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
} as const

/**
 * Patch the authenticated user's sober profile via the API.
 * Returns the parsed response body on success, throws on HTTP error.
 */
export async function patchProfileViaApi(page: Page, body: Record<string, unknown>) {
  return page.evaluate(
    async ({ body, headers }) => {
      const resp = await fetch('/api/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
      if (!resp.ok) throw new Error(await resp.text())
      return resp.json()
    },
    { body, headers: MUTATION_HEADERS },
  )
}

/**
 * Patch the authenticated user's sober profile and return raw status + payload.
 * Does **not** throw on HTTP errors — useful for validation tests.
 */
export async function patchProfileRaw(
  page: Page,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: unknown }> {
  return page.evaluate(
    async ({ body, headers }) => {
      const resp = await fetch('/api/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
      const text = await resp.text()
      let payload = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = null
      }
      return { status: resp.status, payload }
    },
    { body, headers: MUTATION_HEADERS },
  )
}

/**
 * Get the authenticated user's sober profile via the API.
 */
export async function getProfileViaApi(page: Page) {
  return page.evaluate(async () => {
    const resp = await fetch('/api/profile', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (!resp.ok) throw new Error(await resp.text())
    return resp.json()
  })
}

/**
 * Call POST /api/profile/start-again and return raw status + payload.
 * Does **not** throw on HTTP errors — useful for validation tests.
 */
export async function startAgainRaw(
  page: Page,
  body: { startedAt: string; confirmed: boolean },
): Promise<{ status: number; payload: unknown }> {
  return page.evaluate(
    async ({ body, headers }) => {
      const resp = await fetch('/api/profile/start-again', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const text = await resp.text()
      let payload = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = null
      }
      return { status: resp.status, payload }
    },
    { body, headers: MUTATION_HEADERS },
  )
}

/**
 * Fetch a public profile by slug. Returns raw status + payload.
 */
export async function fetchPublicProfile(
  page: Page,
  slug: string,
): Promise<{ status: number; payload: unknown }> {
  return page.evaluate(async (slug) => {
    const resp = await fetch(`/api/public/profile/${slug}`)
    const text = await resp.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }
    return { status: resp.status, payload }
  }, slug)
}

/**
 * Register a new user and set up their sober profile via the API.
 * Returns the email used.
 */
export async function registerAndSetupProfile(
  page: Page,
  options: {
    displayName: string
    sobrietyStartedAt: string
    slug?: string
    shortMessage?: string
    pageVisibility?: 'private' | 'unlisted' | 'public'
  },
) {
  const email = createUniqueEmail('setup')
  await registerAndLogin(page, {
    name: options.displayName,
    email,
    password: 'password123',
  })

  const body: Record<string, unknown> = {
    displayName: options.displayName,
    sobrietyStartedAt: options.sobrietyStartedAt,
  }
  if (options.slug) body.publicSlug = options.slug
  if (options.shortMessage) body.shortMessage = options.shortMessage
  if (options.pageVisibility) body.pageVisibility = options.pageVisibility

  await patchProfileViaApi(page, body)

  return { email }
}
