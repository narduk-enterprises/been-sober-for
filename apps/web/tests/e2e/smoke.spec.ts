import { expect, test, waitForBaseUrlReady, waitForHydration, warmUpApp } from './fixtures'

test.describe('web smoke', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('web smoke tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('home page renders marketing hero', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
    await expect(
      page.getByRole('heading', { level: 1, name: /track how long you have been sober/i }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /start my counter/i })).toBeVisible()
    await expect(page).toHaveTitle(/BeenSoberFor/)
  })
})
