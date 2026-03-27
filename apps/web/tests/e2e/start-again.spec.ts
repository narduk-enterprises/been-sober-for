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

async function getProfileViaApi(page: Page) {
  return page.evaluate(async () => {
    const resp = await fetch('/api/profile', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (!resp.ok) throw new Error(await resp.text())
    return resp.json()
  })
}

async function startAgainViaApi(
  page: Page,
  body: { startedAt: string; confirmed: boolean },
): Promise<{ status: number; payload: unknown }> {
  return page.evaluate(async (body) => {
    const resp = await fetch('/api/profile/start-again', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(body),
    })
    const text = await resp.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }
    return { status: resp.status, payload }
  }, body)
}

test.describe('start again flow', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('renders start again page with form elements', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('startform')
    await registerAndLogin(page, { name: 'Start Form User', email, password: 'password123' })

    await page.goto('/dashboard/start-again')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: /start again/i })).toBeVisible()
    await expect(page.getByText(/you can reset your date at any time/i)).toBeVisible()
    await expect(
      page.getByText(/this does not erase your effort/i),
    ).toBeVisible()
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(
      page.getByLabel(/i understand this will replace my current sober date/i),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /confirm new date/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /cancel/i })).toBeVisible()
  })

  test('cancel button returns to dashboard', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('startcancel')
    await registerAndLogin(page, { name: 'Cancel User', email, password: 'password123' })

    await page.goto('/dashboard/start-again')
    await waitForHydration(page)

    await page.getByRole('link', { name: /cancel/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })
  })

  test('submitting without date shows warning', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('startnodate')
    await registerAndLogin(page, { name: 'No Date Start', email, password: 'password123' })

    await page.goto('/dashboard/start-again')
    await waitForHydration(page)

    // Clear date if pre-filled
    await page.locator('input[type="date"]').fill('')

    // Check the confirmation checkbox
    await page.getByLabel(/i understand this will replace/i).check()

    // Submit
    await page.getByRole('button', { name: /confirm new date/i }).click()

    await expect(page.getByText(/choose a new start date/i)).toBeVisible({ timeout: 10_000 })
  })

  test('submitting without confirmation checkbox shows warning', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('startnocheck')
    await registerAndLogin(page, { name: 'No Check Start', email, password: 'password123' })

    await page.goto('/dashboard/start-again')
    await waitForHydration(page)

    // Fill date
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const dateStr = pastDate.toISOString().split('T')[0]!
    await page.locator('input[type="date"]').fill(dateStr)

    // Do NOT check the confirmation checkbox
    // Submit
    await page.getByRole('button', { name: /confirm new date/i }).click()

    await expect(
      page.getByText(/please confirm you understand/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('start again API resets sobriety date', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('startapi')
    await registerAndLogin(page, { name: 'API Start', email, password: 'password123' })

    // Set initial date
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 100)
    const oldDateStr = oldDate.toISOString().split('T')[0]!

    await patchProfileViaApi(page, {
      displayName: 'API Start',
      sobrietyStartedAt: oldDateStr,
    })

    let profile = await getProfileViaApi(page)
    expect(profile.sobrietyStartedAt).toBe(oldDateStr)

    // Start again with new date
    const newDate = new Date()
    newDate.setDate(newDate.getDate() - 5)
    const newDateStr = newDate.toISOString().split('T')[0]!

    const result = await startAgainViaApi(page, {
      startedAt: newDateStr,
      confirmed: true,
    })
    expect(result.status).toBe(200)

    // Verify the date changed
    profile = await getProfileViaApi(page)
    expect(profile.sobrietyStartedAt).toBe(newDateStr)
  })

  test('start again API rejects future dates', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('startfuture')
    await registerAndLogin(page, { name: 'Future Start', email, password: 'password123' })

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const futureDateStr = futureDate.toISOString().split('T')[0]!

    const result = await startAgainViaApi(page, {
      startedAt: futureDateStr,
      confirmed: true,
    })
    expect(result.status).toBe(400)
  })

  test('start again API requires confirmed flag', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('startunconfirmed')
    await registerAndLogin(page, { name: 'Unconfirmed Start', email, password: 'password123' })

    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    const dateStr = pastDate.toISOString().split('T')[0]!

    const result = await startAgainViaApi(page, {
      startedAt: dateStr,
      confirmed: false,
    })
    expect(result.status).toBe(400)
  })

  test('start again API requires authentication', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    const dateStr = pastDate.toISOString().split('T')[0]!

    const result = await startAgainViaApi(page, {
      startedAt: dateStr,
      confirmed: true,
    })
    expect(result.status).toBe(401)
  })
})
