import {
  expect,
  isoDateDaysAgo,
  isoDateDaysAhead,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
} from './fixtures'

/**
 * Helper to set the sobriety calculator date via the date input (type="date").
 * Playwright's fill on date inputs triggers Vue v-model properly.
 */
async function setCalculatorDate(
  page: import('@playwright/test').Page,
  isoDate: string,
) {
  const dateInput = page.getByRole('textbox', { name: /sober start date$/i })
  await dateInput.fill(isoDate)
  // Wait for Vue computed to process and render the result
  await page.waitForFunction(
    (iso) => {
      const input = document.querySelector<HTMLInputElement>('#sober-start')
      return input?.value === iso
    },
    isoDate,
    { timeout: 3_000 },
  )
}

test.describe('sobriety calculator', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('calculator page renders with heading and date input', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 1, name: /sobriety calculator/i }),
    ).toBeVisible()
    await expect(page).toHaveTitle(/Sobriety Calculator/)
    await expect(page.getByRole('textbox', { name: /sober start date$/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /sober start date as text/i })).toBeVisible()
  })

  test('entering a past date shows day count and breakdown', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    await setCalculatorDate(page, isoDateDaysAgo(100))

    // Should show "You have been sober for" text
    await expect(page.getByText(/you have been sober for/i)).toBeVisible({ timeout: 5_000 })

    // Should show day count
    await expect(page.getByText('100')).toBeVisible()
    await expect(page.getByText(/days/).first()).toBeVisible()

    // Should show breakdown (e.g., "0 years, 3 months, 10 days")
    await expect(page.getByText(/\d+ years, \d+ months, \d+ day/)).toBeVisible()
  })

  test('entering today shows 0 days', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    await setCalculatorDate(page, isoDateDaysAgo(0))

    // Should show the sober count (0 days) — scope to the result panel
    // to avoid matching incidental "0" text (e.g. "0 years" breakdown)
    const soberCountHeading = page.getByText(/you have been sober for/i)
    await expect(soberCountHeading).toBeVisible({ timeout: 5_000 })

    const soberCountPanel = soberCountHeading.locator('..')
    await expect(soberCountPanel.getByText(/^0$/)).toBeVisible()
    await expect(soberCountPanel.getByText(/^days$/i)).toBeVisible()
  })

  test('entering a future date does not show count', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    await setCalculatorDate(page, isoDateDaysAhead(30))

    // Should NOT show the "You have been sober for" text
    await expect(page.getByText(/you have been sober for/i)).not.toBeVisible({ timeout: 3_000 })

    // Should show guidance text
    await expect(page.getByText(/choose a date on or before today/i)).toBeVisible()
  })

  test('text input syncs with date calendar input on blur', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    // First set via the date input
    const iso = isoDateDaysAgo(365)
    await setCalculatorDate(page, iso)

    // The text input should also be synced (MM/DD/YYYY format)
    const textInput = page.getByRole('textbox', { name: /sober start date as text/i })
    const textValue = await textInput.inputValue()
    const parts = iso.split('-')
    expect(textValue).toBe(`${parts[1]}/${parts[2]}/${parts[0]}`)

    // Should show the sober count
    await expect(page.getByText(/you have been sober for/i)).toBeVisible({ timeout: 5_000 })
  })

  test('calculator has CTA buttons to register and example', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    await expect(page.getByRole('link', { name: /start my counter/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /view example profile/i })).toBeVisible()
  })

  test('calculator has explanation section', async ({ page }) => {
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { name: /how this calculator works/i }),
    ).toBeVisible()
  })
})
