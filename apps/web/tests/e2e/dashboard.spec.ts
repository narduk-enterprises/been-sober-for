import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'
import { registerAndSetupProfile } from './helpers'

test.describe('dashboard', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('unauthenticated user is redirected away from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page)

    // Should redirect to login
    await expect(page).toHaveURL(/\/(login|register)/, { timeout: 10_000 })
  })

  test('authenticated user sees welcome heading and email', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('dash')
    await registerAndLogin(page, { name: 'Dash User', email, password: 'password123' })

    await page.goto('/dashboard')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: /welcome back/i })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })

  test('dashboard shows "Set your start date" when no sobriety date set', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('nodate')
    await registerAndLogin(page, { name: 'No Date User', email, password: 'password123' })

    await page.goto('/dashboard')
    await waitForHydration(page)

    await expect(page.getByText(/set your start date/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /edit profile/i }).first()).toBeVisible()
  })

  test('dashboard shows sober day counter when date is set', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 100)
    const sobrietyDate = pastDate.toISOString().split('T')[0]!

    await registerAndSetupProfile(page, {
      displayName: 'Counter User',
      sobrietyStartedAt: sobrietyDate,
    })

    await page.goto('/dashboard')
    await waitForHydration(page)

    // Should show 100 days (or close to it)
    const dashCard = page.locator('[data-testid="auth-dashboard"]')
    await expect(dashCard).toBeVisible()
    await expect(dashCard.getByText(/days/i).first()).toBeVisible()
    await expect(dashCard.getByText(/years.*months/i)).toBeVisible()
  })

  test('dashboard shows public link and visibility status', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const sobrietyDate = pastDate.toISOString().split('T')[0]!

    await registerAndSetupProfile(page, {
      displayName: 'Visibility User',
      sobrietyStartedAt: sobrietyDate,
    })

    await page.goto('/dashboard')
    await waitForHydration(page)

    // Public link section
    await expect(page.getByText(/public link/i)).toBeVisible()
    await expect(page.getByText(/visibility/i).first()).toBeVisible()
  })

  test('dashboard navigation cards are visible', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('navcard')
    await registerAndLogin(page, { name: 'Nav User', email, password: 'password123' })

    await page.goto('/dashboard')
    await waitForHydration(page)

    // Action cards
    await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /start again/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /account/i })).toBeVisible()

    // Navigation links
    await expect(page.getByRole('link', { name: /share settings/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /start again/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /account settings/i })).toBeVisible()
  })

  test('edit profile link navigates correctly', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('editnav')
    await registerAndLogin(page, { name: 'Edit Nav User', email, password: 'password123' })

    await page.goto('/dashboard')
    await waitForHydration(page)

    await page.getByRole('link', { name: /edit profile/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/edit-profile/, { timeout: 10_000 })
  })

  test('QR & share link navigates to share settings', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('qrnav')
    await registerAndLogin(page, { name: 'QR Nav User', email, password: 'password123' })

    await page.goto('/dashboard')
    await waitForHydration(page)

    await page.getByRole('link', { name: /qr.*share/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/share-settings/, { timeout: 10_000 })
  })
})
