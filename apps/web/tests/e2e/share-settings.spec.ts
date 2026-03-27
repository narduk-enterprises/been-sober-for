import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'
import { patchProfileViaApi, getProfileViaApi } from './helpers'

test.describe('share settings page', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('renders share settings page with visibility controls', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('shareform')
    await registerAndLogin(page, { name: 'Share Form User', email, password: 'password123' })

    await page.goto('/dashboard/share-settings')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: /share settings/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /page visibility/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your link/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /qr code/i })).toBeVisible()
  })

  test('visibility can be changed to public and saved', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('sharepub')
    await registerAndLogin(page, { name: 'Share Pub User', email, password: 'password123' })

    // Change via API
    await patchProfileViaApi(page, {
      displayName: 'Share Pub User',
      pageVisibility: 'public',
    })

    const profile = await getProfileViaApi(page)
    expect(profile.pageVisibility).toBe('public')
  })

  test('search indexing is disabled when not public', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('shareindex')
    await registerAndLogin(page, { name: 'Index Test', email, password: 'password123' })

    // Set to private with indexing - API should force indexing off
    await patchProfileViaApi(page, {
      displayName: 'Index Test',
      pageVisibility: 'private',
      allowSearchIndexing: true,
    })

    const profile = await getProfileViaApi(page)
    expect(profile.pageVisibility).toBe('private')
    expect(profile.allowSearchIndexing).toBe(false)
  })

  test('search indexing checkbox is disabled on share settings UI when not public', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('shareui')
    await registerAndLogin(page, { name: 'Share UI Test', email, password: 'password123' })

    // Ensure visibility is unlisted (default)
    await page.goto('/dashboard/share-settings')
    await waitForHydration(page)

    // The search indexing checkbox should be disabled
    const checkbox = page.getByLabel(/allow search engines to index/i)
    await expect(checkbox).toBeDisabled()
  })

  test('public profile URL is displayed', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('shareurl')
    await registerAndLogin(page, { name: 'URL Test', email, password: 'password123' })

    await page.goto('/dashboard/share-settings')
    await waitForHydration(page)

    // Should show the public URL somewhere on the page
    await expect(page.locator('code').first()).toBeVisible()
  })

  test('copy link button is present', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('sharecopy')
    await registerAndLogin(page, { name: 'Copy Test', email, password: 'password123' })

    await page.goto('/dashboard/share-settings')
    await waitForHydration(page)

    await expect(page.getByRole('button', { name: /copy link/i })).toBeVisible()
  })

  test('save visibility button shows success toast', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('sharetoast')
    await registerAndLogin(page, { name: 'Toast Test', email, password: 'password123' })

    await page.goto('/dashboard/share-settings')
    await waitForHydration(page)

    await page.getByRole('button', { name: /save visibility/i }).click()
    await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 10_000 })
  })

  test('back button navigates to edit profile', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('shareback')
    await registerAndLogin(page, { name: 'Back Test', email, password: 'password123' })

    await page.goto('/dashboard/share-settings')
    await waitForHydration(page)

    await page.getByRole('link', { name: /back to profile fields/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/edit-profile/, { timeout: 10_000 })
  })
})
