import { expect, test, waitForBaseUrlReady, waitForHydration, warmUpApp } from './fixtures'

test.describe('marketing pages', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test.describe('about page', () => {
    test('renders about page heading and content sections', async ({ page }) => {
      await page.goto('/about')
      await waitForHydration(page)

      await expect(
        page.getByRole('heading', { level: 1, name: /about this site/i }),
      ).toBeVisible()
      await expect(page.getByRole('heading', { name: /who it is for/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /what it is not/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /tone and design/i })).toBeVisible()
    })

    test('has correct page title', async ({ page }) => {
      await page.goto('/about')
      await waitForHydration(page)

      await expect(page).toHaveTitle(/about/i)
    })

    test('contains link to FAQ and contact', async ({ page }) => {
      await page.goto('/about')
      await waitForHydration(page)

      await expect(page.getByRole('link', { name: /faq/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /contact/i })).toBeVisible()
    })
  })

  test.describe('FAQ page', () => {
    test('renders FAQ heading and all questions', async ({ page }) => {
      await page.goto('/faq')
      await waitForHydration(page)

      await expect(
        page.getByRole('heading', { level: 1, name: /frequently asked questions/i }),
      ).toBeVisible()

      await expect(page.getByText(/can i keep my page private/i)).toBeVisible()
      await expect(page.getByText(/how does.*start again.*reset work/i)).toBeVisible()
      await expect(page.getByText(/can i print my qr code/i)).toBeVisible()
      await expect(page.getByText(/what do people see on my public page/i)).toBeVisible()
      await expect(page.getByText(/how do accounts work/i)).toBeVisible()
      await expect(page.getByText(/is this medical advice/i)).toBeVisible()
    })

    test('has correct page title', async ({ page }) => {
      await page.goto('/faq')
      await waitForHydration(page)

      await expect(page).toHaveTitle(/faq/i)
    })

    test('FAQ anchor links scroll to sections', async ({ page }) => {
      await page.goto('/faq#private')
      await waitForHydration(page)

      const privateSection = page.locator('#private')
      await expect(privateSection).toBeVisible()
    })
  })

  test.describe('sobriety calculator', () => {
    test('renders calculator heading and date inputs', async ({ page }) => {
      await page.goto('/sobriety-calculator')
      await waitForHydration(page)

      await expect(
        page.getByRole('heading', { level: 1, name: /sobriety calculator/i }),
      ).toBeVisible()
      await expect(page.locator('input[type="date"]')).toBeVisible()
      await expect(page.getByLabel(/sober start date as text/i)).toBeVisible()
    })

    test('calculates days sober from a past date', async ({ page }) => {
      await page.goto('/sobriety-calculator')
      await waitForHydration(page)

      // Set a date 30 days ago
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30)
      const iso = pastDate.toISOString().split('T')[0]

      await page.locator('input[type="date"]').fill(iso!)
      await expect(page.getByText(/you have been sober for/i)).toBeVisible()
      await expect(page.getByText('30')).toBeVisible()
      await expect(page.getByText(/days/i).first()).toBeVisible()
    })

    test('shows validation message for future date', async ({ page }) => {
      await page.goto('/sobriety-calculator')
      await waitForHydration(page)

      // Set a date 30 days in the future
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const iso = futureDate.toISOString().split('T')[0]

      await page.locator('input[type="date"]').fill(iso!)
      await expect(page.getByText(/choose a date on or before today/i)).toBeVisible()
    })

    test('text input accepts MM/DD/YYYY format', async ({ page }) => {
      await page.goto('/sobriety-calculator')
      await waitForHydration(page)

      // Enter a date 60 days ago in MM/DD/YYYY format
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 60)
      const mm = String(pastDate.getMonth() + 1).padStart(2, '0')
      const dd = String(pastDate.getDate()).padStart(2, '0')
      const yyyy = pastDate.getFullYear()

      const textInput = page.getByLabel(/sober start date as text/i)
      await textInput.fill(`${mm}/${dd}/${yyyy}`)
      await textInput.blur()

      await expect(page.getByText(/you have been sober for/i)).toBeVisible()
    })

    test('CTA buttons are present', async ({ page }) => {
      await page.goto('/sobriety-calculator')
      await waitForHydration(page)

      await expect(page.getByRole('link', { name: /start my counter/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /view example profile/i })).toBeVisible()
    })

    test('has correct page title', async ({ page }) => {
      await page.goto('/sobriety-calculator')
      await waitForHydration(page)

      await expect(page).toHaveTitle(/sobriety calculator/i)
    })
  })

  test.describe('example page', () => {
    test('renders example profile with mock data', async ({ page }) => {
      await page.goto('/example')
      await waitForHydration(page)

      await expect(page.getByText(/example only/i)).toBeVisible()
      await expect(page.getByText('Jamie')).toBeVisible()
      await expect(page.getByText('1,248')).toBeVisible()
      await expect(page.getByText(/one day at a time/i)).toBeVisible()
    })

    test('print layout link works', async ({ page }) => {
      await page.goto('/example')
      await waitForHydration(page)

      const printLink = page.getByRole('link', { name: /print layout/i })
      await expect(printLink).toBeVisible()
      await expect(printLink).toHaveAttribute('href', '/print/example')
    })

    test('copy link button is disabled', async ({ page }) => {
      await page.goto('/example')
      await waitForHydration(page)

      const copyButton = page.getByRole('button', { name: /copy link/i })
      await expect(copyButton).toBeDisabled()
    })

    test('register CTA is present', async ({ page }) => {
      await page.goto('/example')
      await waitForHydration(page)

      await expect(page.getByRole('link', { name: /start my counter/i })).toBeVisible()
    })
  })
})
