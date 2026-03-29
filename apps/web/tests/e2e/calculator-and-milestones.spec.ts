import { expect, test, waitForBaseUrlReady, waitForHydration, warmUpApp } from './fixtures'

test.describe('calculator and milestone routes', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('calculator and milestone tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('home page 7 day milestone links to the dedicated guide', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await page.getByRole('link', { name: '7 days' }).click()
    await expect(page).toHaveURL(/\/7-days-sober$/)
    await expect(page.getByRole('heading', { name: '7 days sober' })).toBeVisible()
  })

  test('calculator presents a single clear date input', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    await expect(page.locator('input[type="date"]')).toHaveCount(1)
    await expect(
      page.getByText('Use the calendar or type directly into the date field.'),
    ).toBeVisible()
  })
})
