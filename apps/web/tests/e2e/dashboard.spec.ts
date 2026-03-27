import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'

import type { Page } from '@playwright/test'

async function patchProfile(page: Page, body: Record<string, unknown>) {
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

test.describe('dashboard pages', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  // ─── Edit profile page ────────────────────────────────────

  test('edit profile page renders form fields', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('edit-profile')
    await registerAndLogin(page, { name: 'Edit User', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 1, name: /edit profile/i }),
    ).toBeVisible({ timeout: 15_000 })

    // Check all form fields exist
    await expect(page.getByLabel(/display name/i)).toBeVisible()
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible()
  })

  test('edit profile page has layout selector', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('layout-select')
    await registerAndLogin(page, { name: 'Layout User', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)

    // Wait for form to load
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 15_000 })

    // Check layout selector is available (select element)
    await expect(page.getByText(/public page layout/i)).toBeVisible()
  })

  test('edit profile page has visibility toggle checkboxes', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('checkboxes')
    await registerAndLogin(page, { name: 'Checkbox User', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)

    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 15_000 })

    await expect(page.getByText(/show start date/i)).toBeVisible()
    await expect(page.getByText(/show profile photo/i)).toBeVisible()
    await expect(page.getByText(/show qr code/i)).toBeVisible()
  })

  // ─── Start again page ─────────────────────────────────────

  test('start again page renders with date input and confirmation checkbox', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('start-again-page')
    await registerAndLogin(page, { name: 'Reset User', email, password: 'password123' })

    await page.goto('/dashboard/start-again')
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 1, name: /start again/i }),
    ).toBeVisible({ timeout: 15_000 })

    // Check form elements
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(
      page.getByText(/i understand this will replace my current sober date/i),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /confirm new date/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /cancel/i })).toBeVisible()
  })

  test('start again page has supportive, non-punitive copy', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('supportive-copy')
    await registerAndLogin(page, { name: 'Copy User', email, password: 'password123' })

    await page.goto('/dashboard/start-again')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { name: /start again/i })).toBeVisible({
      timeout: 15_000,
    })

    // Verify supportive messaging
    await expect(page.getByText(/does not erase your effort/i)).toBeVisible()
  })

  // ─── Preview page ─────────────────────────────────────────

  test('preview page shows profile data for authenticated user', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('preview-page')
    await registerAndLogin(page, { name: 'Preview User', email, password: 'password123' })

    const slug = `preview-${Date.now()}`
    await patchProfile(page, {
      displayName: 'Preview User',
      publicSlug: slug,
      sobrietyStartedAt: '2024-06-01',
      shortMessage: 'Preview test message',
      pageVisibility: 'private',
    })

    await page.goto('/dashboard/preview')
    await waitForHydration(page)

    await expect(page.getByText('Preview User', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  // ─── Share settings page ──────────────────────────────────

  test('share settings page is accessible', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('share-settings')
    await registerAndLogin(page, { name: 'Share User', email, password: 'password123' })

    await page.goto('/dashboard/share-settings')
    await waitForHydration(page)

    // Should render without error - check for a heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
  })

  // ─── Account page ─────────────────────────────────────────

  test('account page is accessible', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('account-page')
    await registerAndLogin(page, { name: 'Account User', email, password: 'password123' })

    await page.goto('/dashboard/account')
    await waitForHydration(page)

    // Should render without error
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
  })
})
