import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
  logoutViaApi,
} from './fixtures'

import type { Page } from '@playwright/test'

/**
 * Helper to update the sober profile via the API.
 */
async function patchProfileViaApi(
  page: Page,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
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
 * Helper to start again via the API.
 */
async function startAgainViaApi(
  page: Page,
  body: { startedAt: string; confirmed: boolean },
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
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
 * Helper to get profile via the API.
 */
async function getProfileViaApi(
  page: Page,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  return page.evaluate(async () => {
    const response = await fetch('/api/profile')
    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  })
}

test.describe('profile flow (full user journey)', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('register → set profile → see counter → edit → public page works', async ({ page }) => {
    // 1. Go to origin (need cookies for API)
    await page.goto('/')
    await waitForHydration(page)

    // 2. Register a new user
    const email = createUniqueEmail('profile-flow')
    await registerAndLogin(page, { name: 'QA Tester', email, password: 'password123' })

    // 3. Navigate to dashboard → should show "Welcome back"
    await page.goto('/dashboard/')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    })

    // 4. Dashboard should show "Set your start date" since no sobriety date set
    await expect(page.getByText(/set your start date/i)).toBeVisible()

    // 5. Set up profile via API
    const slug = `qa-test-${Date.now()}`
    const sobrietyDate = new Date()
    sobrietyDate.setDate(sobrietyDate.getDate() - 42)
    const sobrietyIso = sobrietyDate.toISOString().split('T')[0]!

    const patchResult = await patchProfileViaApi(page, {
      displayName: 'QA Tester',
      publicSlug: slug,
      sobrietyStartedAt: sobrietyIso,
      shortMessage: 'Testing sobriety counter',
      showStartDate: true,
      showAvatar: true,
      showQr: true,
      shareLayout: 'standard',
      pageVisibility: 'unlisted',
    })
    expect(patchResult.ok).toBe(true)

    // 6. Reload dashboard → should show day count
    await page.reload()
    await waitForHydration(page)
    await expect(page.getByText('42')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('days', { exact: true })).toBeVisible()

    // 7. Verify the public profile URL appears on dashboard
    await expect(page.locator('code').filter({ hasText: slug })).toBeVisible()

    // 8. Visit the public profile page
    await page.goto(`/u/${slug}`)
    await waitForHydration(page)

    // Should show the public profile
    await expect(page.getByText('QA Tester', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('42')).toBeVisible()

    // 9. Test "Start again" flow
    await page.goto('/')
    await waitForHydration(page)

    const newDate = new Date()
    newDate.setDate(newDate.getDate() - 7)
    const newDateIso = newDate.toISOString().split('T')[0]!

    const startAgainResult = await startAgainViaApi(page, {
      startedAt: newDateIso,
      confirmed: true,
    })
    expect(startAgainResult.ok).toBe(true)

    // 10. Verify the counter is updated
    const profileResult = await getProfileViaApi(page)
    expect(profileResult.ok).toBe(true)
    expect(profileResult.data).toMatchObject({
      sobrietyStartedAt: newDateIso,
    })

    // 11. Visit public page again and verify update
    await page.goto(`/u/${slug}`)
    await waitForHydration(page)
    await expect(page.getByText('7')).toBeVisible({ timeout: 10_000 })
  })

  test('dashboard shows correct visibility label for private profile', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('visibility-test')
    await registerAndLogin(page, { name: 'Visibility Tester', email, password: 'password123' })

    // Set profile to private
    const slug = `private-${Date.now()}`
    await patchProfileViaApi(page, {
      displayName: 'Visibility Tester',
      publicSlug: slug,
      pageVisibility: 'private',
    })

    await page.goto('/dashboard/')
    await waitForHydration(page)

    await expect(page.getByText(/private/i).first()).toBeVisible({ timeout: 10_000 })

    // Private profile should have preview link that goes to /dashboard/preview instead of /u/slug
    const previewLink = page.getByRole('link', { name: /preview/i }).first()
    await expect(previewLink).toBeVisible()
    await expect(previewLink).toHaveAttribute('href', '/dashboard/preview')
  })

  test('dashboard shows edit profile, share settings, start again, and account links', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('nav-test')
    await registerAndLogin(page, { name: 'Nav Tester', email, password: 'password123' })

    await page.goto('/dashboard/')
    await waitForHydration(page)

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    })

    // Check navigation links
    await expect(page.getByRole('link', { name: /edit profile/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /share settings|qr.*share/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /start again/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /account settings/i })).toBeVisible()
  })

  test('unauthenticated user cannot access dashboard', async ({ page }) => {
    await page.goto('/dashboard/')

    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})
