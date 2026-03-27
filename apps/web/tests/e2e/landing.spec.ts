import { expect, test, waitForBaseUrlReady, waitForHydration, warmUpApp } from './fixtures'

test.describe('landing page', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('renders hero section with title and CTAs', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 1, name: /track how long you have been sober/i }),
    ).toBeVisible()
    await expect(page.getByText(/set your date.*track your time.*share your progress/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /start my counter/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /view example profile/i })).toBeVisible()
  })

  test('hero CTA links to register page', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const cta = page.getByRole('link', { name: /start my counter/i }).first()
    await expect(cta).toHaveAttribute('href', '/register')
  })

  test('example profile CTA links to example page', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const exampleLink = page.getByRole('link', { name: /view example profile/i })
    await expect(exampleLink).toHaveAttribute('href', '/example')
  })

  test('renders "How it works" section', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByText(/how it works/i).first()).toBeVisible()
    await expect(page.getByText(/pick your date/i)).toBeVisible()
    await expect(page.getByText(/create your page/i)).toBeVisible()
    await expect(page.getByText(/share or print/i)).toBeVisible()
  })

  test('renders privacy options section', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByText(/private/i).first()).toBeVisible()
    await expect(page.getByText(/unlisted/i).first()).toBeVisible()
    await expect(page.getByText(/public/i).first()).toBeVisible()
  })

  test('renders SAMHSA helpline support notice', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByText(/1-800-662-4357/)).toBeVisible()
  })

  test('milestone guide links are present', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByRole('link', { name: /sobriety calculator/i })).toBeVisible()
  })

  test('page has correct title', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page).toHaveTitle(/BeenSoberFor/)
  })

  test('site header contains navigation links', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByRole('link', { name: /calculator/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /about/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /faq/i }).first()).toBeVisible()
  })
})
