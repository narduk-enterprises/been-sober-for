export {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
  loginAsAdmin,
  loginViaApi,
  logoutViaApi,
  createNotificationViaApi,
  fetchNotificationsViaApi,
  fetchUnreadCountViaApi,
  markAllNotificationsReadViaApi,
  updateProfileViaApi,
} from '../../../../layers/narduk-nuxt-layer/testing/e2e/fixtures.ts'

import type { Page } from '@playwright/test'

// ─── Date helpers ──────────────────────────────────────────

/**
 * Return a YYYY-MM-DD string for `daysAgo` days before today using
 * **local** date parts so the value matches the app's calendar-day semantics
 * regardless of runner timezone / UTC offset.
 */
export function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Return a YYYY-MM-DD string for `daysAhead` days **after** today using
 * local date parts.
 */
export function isoDateDaysAhead(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── App-specific test helpers ─────────────────────────────

type ApiResponse = {
  ok: boolean
  status: number
  data: Record<string, unknown> | null
}

/**
 * Generic helper to fetch JSON from an API endpoint within the browser's
 * cookie jar (authenticated context).
 */
export async function fetchJson(page: Page, url: string): Promise<ApiResponse> {
  return page.evaluate(async (u) => {
    const response = await fetch(u)
    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  }, url)
}

/**
 * PATCH the authenticated user's sober profile via /api/profile.
 */
export async function patchSoberProfile(
  page: Page,
  body: Record<string, unknown>,
): Promise<ApiResponse> {
  return page.evaluate(async (payload) => {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    })
    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  }, body)
}

/**
 * POST to /api/profile/start-again to reset the sober start date.
 */
export async function startAgainViaApi(
  page: Page,
  body: { startedAt: string; confirmed: boolean },
): Promise<ApiResponse> {
  return page.evaluate(async (payload) => {
    const response = await fetch('/api/profile/start-again', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    })
    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  }, body)
}

/**
 * GET the authenticated user's sober profile.
 */
export async function getSoberProfile(page: Page): Promise<ApiResponse> {
  return fetchJson(page, '/api/profile')
}
