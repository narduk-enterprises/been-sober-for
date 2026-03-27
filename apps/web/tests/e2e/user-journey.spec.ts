import type { Page } from '@playwright/test'
import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'

async function patchProfileViaApi(page: Page, body: Record<string, unknown>) {
  return page.evaluate(
    async ({ body }) => {
      const resp = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
      })
      if (!resp.ok) throw new Error(await resp.text())
      return resp.json()
    },
    { body },
  )
}

test.describe('full user journey', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('register → set profile → view dashboard → view public profile → start again', async ({
    page,
  }) => {
    // Step 1: Visit landing page
    await page.goto('/')
    await waitForHydration(page)
    await expect(
      page.getByRole('heading', { level: 1, name: /track how long you have been sober/i }),
    ).toBeVisible()

    // Step 2: Register a new user
    const email = createUniqueEmail('journey')
    await registerAndLogin(page, { name: 'Journey User', email, password: 'password123' })

    // Step 3: Navigate to dashboard
    await page.goto('/dashboard')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1, name: /welcome back/i })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()

    // Step 4: Dashboard should show "Set your start date"
    await expect(page.getByText(/set your start date/i)).toBeVisible()

    // Step 5: Set up profile via API (display name, slug, sobriety date, message)
    const uniqueSlug = `journey-${Date.now().toString(36)}`
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 60)
    const sobrietyDate = pastDate.toISOString().split('T')[0]!

    await patchProfileViaApi(page, {
      displayName: 'Journey User',
      publicSlug: uniqueSlug,
      sobrietyStartedAt: sobrietyDate,
      shortMessage: 'One step at a time',
      pageVisibility: 'public',
    })

    // Step 6: Refresh dashboard and verify counter
    await page.goto('/dashboard')
    await waitForHydration(page)

    const dashCard = page.locator('[data-testid="auth-dashboard"]')
    await expect(dashCard).toBeVisible()
    await expect(dashCard.getByText(/days/i).first()).toBeVisible()
    await expect(dashCard.getByText(/years.*months/i)).toBeVisible()

    // Step 7: Visit public profile as the same user (it should be publicly accessible)
    await page.goto(`/u/${uniqueSlug}`)
    await waitForHydration(page)
    await expect(page.getByText('Journey User')).toBeVisible()
    await expect(page.getByText(/days/i).first()).toBeVisible()

    // Step 8: Go to start again page
    await page.goto('/dashboard/start-again')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1, name: /start again/i })).toBeVisible()

    // Step 9: Start again via API
    const newDate = new Date()
    newDate.setDate(newDate.getDate() - 2)
    const newDateStr = newDate.toISOString().split('T')[0]!

    await page.evaluate(
      async ({ startedAt }) => {
        const resp = await fetch('/api/profile/start-again', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ startedAt, confirmed: true }),
        })
        if (!resp.ok) throw new Error(await resp.text())
        return resp.json()
      },
      { startedAt: newDateStr },
    )

    // Step 10: Verify dashboard shows updated counter
    await page.goto('/dashboard')
    await waitForHydration(page)
    await expect(dashCard).toBeVisible()
  })

  test('visitor explores marketing pages then registers', async ({ page }) => {
    // Step 1: Visit landing page
    await page.goto('/')
    await waitForHydration(page)
    await expect(
      page.getByRole('heading', { level: 1, name: /track how long you have been sober/i }),
    ).toBeVisible()

    // Step 2: Visit calculator
    await page.goto('/sobriety-calculator')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1, name: /sobriety calculator/i })).toBeVisible()

    // Enter a date 90 days ago
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 90)
    const iso = pastDate.toISOString().split('T')[0]!
    await page.locator('input[type="date"]').fill(iso)
    await expect(page.getByText(/you have been sober for/i)).toBeVisible()

    // Step 3: Visit about page
    await page.goto('/about')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1, name: /about this site/i })).toBeVisible()

    // Step 4: Visit FAQ
    await page.goto('/faq')
    await waitForHydration(page)
    await expect(
      page.getByRole('heading', { level: 1, name: /frequently asked questions/i }),
    ).toBeVisible()

    // Step 5: Visit example page
    await page.goto('/example')
    await waitForHydration(page)
    await expect(page.getByText('Jamie')).toBeVisible()
    await expect(page.getByText('1,248')).toBeVisible()

    // Step 6: Register
    const email = createUniqueEmail('visitor')
    await registerAndLogin(page, { name: 'Visitor User', email, password: 'password123' })

    // Step 7: Navigate to dashboard
    await page.goto('/dashboard')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1, name: /welcome back/i })).toBeVisible()
  })

  test('private profile is not accessible, then becomes accessible after making public', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('visibility-switch')
    await registerAndLogin(page, {
      name: 'Visibility Switch',
      email,
      password: 'password123',
    })

    const uniqueSlug = `vis-${Date.now().toString(36)}`
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 20)
    const dateStr = pastDate.toISOString().split('T')[0]!

    // Create profile as private
    await patchProfileViaApi(page, {
      displayName: 'Vis Switch User',
      publicSlug: uniqueSlug,
      sobrietyStartedAt: dateStr,
      pageVisibility: 'private',
    })

    // Try to visit public URL - should show error
    await page.goto(`/u/${uniqueSlug}`)
    await waitForHydration(page)
    await expect(page.getByText(/this page is not available/i)).toBeVisible()

    // Go back and make it public
    await page.goto('/')
    await waitForHydration(page)
    await patchProfileViaApi(page, { pageVisibility: 'public' })

    // Now public URL should work
    await page.goto(`/u/${uniqueSlug}`)
    await waitForHydration(page)
    await expect(page.getByText('Vis Switch User')).toBeVisible()
  })
})
