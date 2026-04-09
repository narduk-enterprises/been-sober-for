import { expect, test, waitForBaseUrlReady, waitForHydration, warmUpApp } from './fixtures'

test.describe('static pages', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  // ─── Landing page ──────────────────────────────────────────

  test('landing page renders hero with heading and CTA', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 1, name: /track how long you have been sober/i }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /start my counter/i }).first()).toBeVisible()
    await expect(page).toHaveTitle(/BeenSoberFor/)
  })

  test('landing page has "How it works" section', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByText(/how it works/i).first()).toBeVisible()
  })

  test('landing page CTA links to register', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const cta = page.getByRole('link', { name: /start my counter/i }).first()
    await expect(cta).toHaveAttribute('href', /register/)
  })

  // ─── About page ────────────────────────────────────────────

  test('about page renders heading and content', async ({ page }) => {
    await page.goto('/about')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: /about this site/i })).toBeVisible()
    await expect(page.getByText(/who it is for/i)).toBeVisible()
    await expect(page.getByText(/what it is not/i)).toBeVisible()
    await expect(page.getByText(/tone and design/i)).toBeVisible()
    await expect(page).toHaveTitle(/About/)
  })

  test('about page has links to FAQ and contact', async ({ page }) => {
    await page.goto('/about')
    await waitForHydration(page)

    await expect(page.getByRole('article').getByRole('link', { name: /FAQ/i })).toBeVisible()
    await expect(page.getByRole('article').getByRole('link', { name: /contact/i })).toBeVisible()
  })

  // ─── FAQ page ──────────────────────────────────────────────

  test('FAQ page renders all questions', async ({ page }) => {
    await page.goto('/faq')
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 1, name: /frequently asked questions/i }),
    ).toBeVisible()
    await expect(page).toHaveTitle(/FAQ/)

    // Verify all 6 FAQ questions are visible
    const expectedQuestions = [
      /can i keep my page private/i,
      /how does.*start again.*reset work/i,
      /can i print my qr code/i,
      /what do people see on my public page/i,
      /how do accounts work/i,
      /is this medical advice/i,
    ]

    for (const question of expectedQuestions) {
      await expect(page.getByRole('heading', { name: question })).toBeVisible()
    }
  })

  test('FAQ page includes SAMHSA helpline number', async ({ page }) => {
    await page.goto('/faq')
    await waitForHydration(page)

    await expect(page.getByText(/1-800-662-4357/)).toBeVisible()
  })

  // ─── Contact page ─────────────────────────────────────────

  test('contact page renders with email link', async ({ page }) => {
    await page.goto('/contact')
    await waitForHydration(page)

    await expect(page.getByText(/support@beensoberfor.com/)).toBeVisible()
    await expect(page).toHaveTitle(/Contact/)
  })

  // ─── Example profile page ─────────────────────────────────

  test('example page renders sample profile', async ({ page }) => {
    await page.goto('/example')
    await waitForHydration(page)

    await expect(page.getByText('Jamie', { exact: true })).toBeVisible()
    await expect(page.getByText('1,248')).toBeVisible()
    await expect(page.getByText(/days/).first()).toBeVisible()
    await expect(page.getByText(/example only/i)).toBeVisible()
    await expect(page.getByText('beensoberfor.com/u/jamie')).toBeVisible()
  })

  test('example page has print layout link', async ({ page }) => {
    await page.goto('/example')
    await waitForHydration(page)

    const printLink = page.getByRole('link', { name: /print layout/i })
    await expect(printLink).toBeVisible()
    await expect(printLink).toHaveAttribute('href', /\/print\/example/)
  })

  test('example page has disabled copy link button', async ({ page }) => {
    await page.goto('/example')
    await waitForHydration(page)

    const copyBtn = page.getByRole('button', { name: /copy link/i })
    await expect(copyBtn).toBeVisible()
    await expect(copyBtn).toBeDisabled()
  })

  // ─── Terms and Privacy pages ───────────────────────────────

  test('terms page renders', async ({ page }) => {
    await page.goto('/terms')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page).toHaveTitle(/Terms/i)
  })

  test('privacy page renders', async ({ page }) => {
    await page.goto('/privacy')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page).toHaveTitle(/Privacy/i)
  })
})
