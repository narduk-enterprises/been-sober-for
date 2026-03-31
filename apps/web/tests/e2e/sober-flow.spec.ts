import {
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

test.describe('sober profile flow', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('sober profile flow tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('user can publish a sober profile and start again', async ({ page }) => {
    const startDate = daysAgoYmd(30)
    const slug = `steady-${Date.now()}`
    const email = `steady-${Date.now()}@example.com`

    await page.goto('/')
    await waitForHydration(page)
    await registerAndLogin(page, { name: 'Steady Jordan', email, password: 'password123' })

    await page.evaluate(
      async ({ publicSlug, sobrietyStartedAt }) => {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            displayName: 'Steady Jordan',
            publicSlug,
            sobrietyStartedAt,
            shortMessage: 'One day at a time.',
            pageVisibility: 'unlisted',
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

    await page.goto('/dashboard')
    await expect(page.getByTestId('auth-dashboard')).toBeVisible()
    await expect(page.getByTestId('dashboard-day-count')).toHaveText('30')
    await expect(page.getByText(`/u/${slug}`)).toBeVisible()

    await page.goto(`/u/${slug}`)
    await expect(page.getByTestId('public-profile-card')).toBeVisible()
    await expect(page.getByTestId('public-display-name')).toHaveText('Steady Jordan')
    await expect(page.getByTestId('public-day-count')).toHaveText('30')
    await expect(page.getByText('One day at a time.')).toBeVisible()

    await page.goto('/dashboard/start-again')
    await page.getByRole('button', { name: 'Start today' }).click()
    await page.getByLabel(/I understand this will replace my current sober date/i).click()
    await page.getByRole('button', { name: 'Confirm new date' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByTestId('dashboard-day-count')).toHaveText('0')

    await page.goto(`/u/${slug}`)
    await expect(page.getByTestId('public-day-count')).toHaveText('0')
  })
})
