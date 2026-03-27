import type { Page } from '@playwright/test'
import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'

/** Helper to patch the authenticated user's sober profile via API. */
async function patchProfileViaApi(page: Page, body: Record<string, unknown>) {
  return page.evaluate(
    async ({ body }) => {
      const resp = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
      })
      if (!resp.ok) throw new Error(await resp.text())
      return resp.json()
    },
    { body },
  )
}

/** Helper to get the authenticated user's sober profile. */
async function getProfileViaApi(page: Page) {
  return page.evaluate(async () => {
    const resp = await fetch('/api/profile', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (!resp.ok) throw new Error(await resp.text())
    return resp.json()
  })
}

test.describe('edit profile page', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('renders edit profile form with all fields', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editform')
    await registerAndLogin(page, { name: 'Edit Form User', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: /edit profile/i })).toBeVisible()

    // Form fields
    await expect(page.getByLabel(/display name/i)).toBeVisible()
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.getByText(/short message/i)).toBeVisible()
    await expect(page.getByText(/public page layout/i)).toBeVisible()
    await expect(page.getByText(/show on public page/i)).toBeVisible()
    await expect(page.getByLabel(/show start date/i)).toBeVisible()
    await expect(page.getByLabel(/show profile photo/i)).toBeVisible()
    await expect(page.getByLabel(/show qr code/i)).toBeVisible()
  })

  test('save button works and shows success toast', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editsave')
    await registerAndLogin(page, { name: 'Save Test', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)

    // Fill in display name
    const nameInput = page.getByLabel(/display name/i)
    await nameInput.clear()
    await nameInput.fill('My New Name')

    // Submit
    await page.getByRole('button', { name: /save changes/i }).click()

    // Should show success toast
    await expect(page.getByText(/profile saved/i)).toBeVisible({ timeout: 10_000 })
  })

  test('empty display name shows warning toast', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editwarn')
    await registerAndLogin(page, { name: 'Warn Test', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)

    // Clear display name
    const nameInput = page.getByLabel(/display name/i)
    await nameInput.clear()

    // Submit
    await page.getByRole('button', { name: /save changes/i }).click()

    // Should show warning
    await expect(page.getByText(/display name is required/i)).toBeVisible({ timeout: 10_000 })
  })

  test('back button navigates to dashboard', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editback')
    await registerAndLogin(page, { name: 'Back Test', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)

    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })
  })

  test('saving profile updates display name in API', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editapi')
    await registerAndLogin(page, { name: 'API Test', email, password: 'password123' })

    // Update via API
    await patchProfileViaApi(page, { displayName: 'Updated Name' })

    // Verify
    const profile = await getProfileViaApi(page)
    expect(profile.displayName).toBe('Updated Name')
  })

  test('saving sobriety start date works', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editdate')
    await registerAndLogin(page, { name: 'Date Test', email, password: 'password123' })

    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 45)
    const dateStr = pastDate.toISOString().split('T')[0]!

    await patchProfileViaApi(page, {
      displayName: 'Date Test',
      sobrietyStartedAt: dateStr,
    })

    const profile = await getProfileViaApi(page)
    expect(profile.sobrietyStartedAt).toBe(dateStr)
  })

  test('public slug can be updated', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editslug')
    await registerAndLogin(page, { name: 'Slug Test', email, password: 'password123' })

    const uniqueSlug = `test-${Date.now().toString(36)}`
    await patchProfileViaApi(page, {
      displayName: 'Slug Test',
      publicSlug: uniqueSlug,
    })

    const profile = await getProfileViaApi(page)
    expect(profile.publicSlug).toBe(uniqueSlug)
  })

  test('short message can be set and retrieved', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editmsg')
    await registerAndLogin(page, { name: 'Message Test', email, password: 'password123' })

    await patchProfileViaApi(page, {
      displayName: 'Message Test',
      shortMessage: 'One day at a time',
    })

    const profile = await getProfileViaApi(page)
    expect(profile.shortMessage).toBe('One day at a time')
  })

  test('public page toggles can be changed', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('edittoggles')
    await registerAndLogin(page, { name: 'Toggle Test', email, password: 'password123' })

    await patchProfileViaApi(page, {
      displayName: 'Toggle Test',
      showStartDate: false,
      showAvatar: false,
      showQr: false,
    })

    const profile = await getProfileViaApi(page)
    expect(profile.showStartDate).toBe(false)
    expect(profile.showAvatar).toBe(false)
    expect(profile.showQr).toBe(false)
  })

  test('share layout can be changed', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editlayout')
    await registerAndLogin(page, { name: 'Layout Test', email, password: 'password123' })

    await patchProfileViaApi(page, {
      displayName: 'Layout Test',
      shareLayout: 'minimal',
    })

    const profile = await getProfileViaApi(page)
    expect(profile.shareLayout).toBe('minimal')

    await patchProfileViaApi(page, { shareLayout: 'print_ready' })
    const profile2 = await getProfileViaApi(page)
    expect(profile2.shareLayout).toBe('print_ready')
  })
})
