import {
  createUniqueEmail,
  expect,
  registerAndLogin,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
} from './fixtures'

function formatYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function daysAgoYmd(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return formatYmd(date)
}

test.describe('account deletion', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('account deletion tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('user can delete their account and remove the public profile', async ({ page }) => {
    const email = createUniqueEmail('delete-account')
    const password = 'password123'
    const slug = `delete-${Date.now()}`
    const startDate = daysAgoYmd(14)

    await page.goto('/')
    await waitForHydration(page)
    await registerAndLogin(page, { name: 'Delete Me', email, password })

    await page.evaluate(
      async ({ publicSlug, sobrietyStartedAt }) => {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            displayName: 'Delete Me',
            publicSlug,
            sobrietyStartedAt,
            shortMessage: 'This page should disappear after account deletion.',
            pageVisibility: 'public',
            allowSearchIndexing: false,
            showStartDate: true,
            showAvatar: false,
            showQr: true,
            shareLayout: 'standard',
          }),
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        return response.json()
      },
      { publicSlug: slug, sobrietyStartedAt: startDate },
    )

    await page.goto(`/u/${slug}`)
    await waitForHydration(page)
    await expect(page.getByTestId('public-profile-card')).toBeVisible()

    await page.goto('/dashboard/account')
    await waitForHydration(page)

    const deletePasswordInput = page.locator('input[autocomplete="current-password"]').nth(1)
    await expect(deletePasswordInput).toBeVisible()
    await deletePasswordInput.fill(password)
    await expect(deletePasswordInput).toHaveValue(password)

    await page
      .getByLabel('I understand this permanently deletes my account, public page, and current session.')
      .click()
    await page.getByRole('button', { name: 'Delete account' }).click()

    const confirmDeleteButton = page.getByRole('button', { name: 'Delete account forever' })
    await expect(confirmDeleteButton).toBeVisible()
    await confirmDeleteButton.click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Start my counter' })).toBeVisible()

    await page.goto(`/u/${slug}`)
    await waitForHydration(page)
    await expect(page.getByRole('heading', { name: 'This page is not available' })).toBeVisible()

    const loginStatus = await page.evaluate(
      async (credentials) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(credentials),
        })

        return response.status
      },
      { email, password },
    )

    expect(loginStatus).toBe(401)
  })
})
