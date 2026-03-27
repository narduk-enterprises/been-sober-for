import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'

test.describe('account page', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('renders account page with password and delete sections', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('account')
    await registerAndLogin(page, { name: 'Account User', email, password: 'password123' })

    await page.goto('/dashboard/account')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: /account/i })).toBeVisible()
    await expect(page.getByText(/change password/i)).toBeVisible()
    await expect(page.getByText(/delete account/i)).toBeVisible()
  })

  test('password change requires both fields', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('accpass')
    await registerAndLogin(page, { name: 'Pass User', email, password: 'password123' })

    await page.goto('/dashboard/account')
    await waitForHydration(page)

    // Try to submit without filling in fields
    await page.getByRole('button', { name: /update password/i }).click()
    await expect(page.getByText(/fill in both password fields/i)).toBeVisible({ timeout: 10_000 })
  })

  test('password change requires minimum 8 characters', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('accshort')
    await registerAndLogin(page, { name: 'Short Pass', email, password: 'password123' })

    await page.goto('/dashboard/account')
    await waitForHydration(page)

    // Fill in current password
    await page.getByLabel(/current password/i).fill('password123')
    // Fill in short new password
    await page.getByLabel(/new password/i).fill('short')

    await page.getByRole('button', { name: /update password/i }).click()
    await expect(
      page.getByText(/new password should be at least 8 characters/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('back button navigates to dashboard', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('accback')
    await registerAndLogin(page, { name: 'Back User', email, password: 'password123' })

    await page.goto('/dashboard/account')
    await waitForHydration(page)

    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })
  })

  test('delete account section mentions email support', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('accdel')
    await registerAndLogin(page, { name: 'Delete User', email, password: 'password123' })

    await page.goto('/dashboard/account')
    await waitForHydration(page)

    await expect(page.getByText(/support@beensoberfor.com/i)).toBeVisible()
  })
})
