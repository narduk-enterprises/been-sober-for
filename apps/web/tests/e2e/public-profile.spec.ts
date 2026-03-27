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

async function fetchPublicProfile(
  page: Page,
  slug: string,
): Promise<{ status: number; payload: unknown }> {
  return page.evaluate(async (slug) => {
    const resp = await fetch(`/api/public/profile/${slug}`)
    const text = await resp.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }
    return { status: resp.status, payload }
  }, slug)
}

test.describe('public profile', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('public profile page shows profile when visibility is public', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('pubview')
    await registerAndLogin(page, { name: 'Public View', email, password: 'password123' })

    const uniqueSlug = `pub-${Date.now().toString(36)}`
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 30)
    const dateStr = pastDate.toISOString().split('T')[0]!

    await patchProfileViaApi(page, {
      displayName: 'Public View User',
      publicSlug: uniqueSlug,
      sobrietyStartedAt: dateStr,
      pageVisibility: 'public',
    })

    // Visit public profile page
    await page.goto(`/u/${uniqueSlug}`)
    await waitForHydration(page)

    await expect(page.getByText('Public View User')).toBeVisible()
    await expect(page.getByText(/days/i).first()).toBeVisible()
  })

  test('public profile page shows profile when visibility is unlisted', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('unlistedview')
    await registerAndLogin(page, { name: 'Unlisted View', email, password: 'password123' })

    const uniqueSlug = `unl-${Date.now().toString(36)}`
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 15)
    const dateStr = pastDate.toISOString().split('T')[0]!

    await patchProfileViaApi(page, {
      displayName: 'Unlisted View User',
      publicSlug: uniqueSlug,
      sobrietyStartedAt: dateStr,
      pageVisibility: 'unlisted',
    })

    await page.goto(`/u/${uniqueSlug}`)
    await waitForHydration(page)

    await expect(page.getByText('Unlisted View User')).toBeVisible()
  })

  test('private profile returns error page', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('privview')
    await registerAndLogin(page, { name: 'Private View', email, password: 'password123' })

    const uniqueSlug = `priv-${Date.now().toString(36)}`
    await patchProfileViaApi(page, {
      displayName: 'Private View User',
      publicSlug: uniqueSlug,
      pageVisibility: 'private',
    })

    await page.goto(`/u/${uniqueSlug}`)
    await waitForHydration(page)

    await expect(page.getByText(/this page is not available/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /start my counter/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })

  test('non-existent slug shows error page', async ({ page }) => {
    await page.goto('/u/this-slug-does-not-exist-xyz')
    await waitForHydration(page)

    await expect(page.getByText(/this page is not available/i)).toBeVisible()
  })

  test('public profile API returns correct data for public profile', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('pubapi')
    await registerAndLogin(page, { name: 'API Public', email, password: 'password123' })

    const uniqueSlug = `api-pub-${Date.now().toString(36)}`
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 50)
    const dateStr = pastDate.toISOString().split('T')[0]!

    await patchProfileViaApi(page, {
      displayName: 'API Public User',
      publicSlug: uniqueSlug,
      sobrietyStartedAt: dateStr,
      pageVisibility: 'public',
      shortMessage: 'Test message',
    })

    const result = await fetchPublicProfile(page, uniqueSlug)
    expect(result.status).toBe(200)

    const payload = result.payload as Record<string, unknown>
    expect(payload.displayName).toBe('API Public User')
    expect(payload.sobrietyStartedAt).toBe(dateStr)
    expect(payload.slug).toBe(uniqueSlug)
    expect(payload.shortMessage).toBe('Test message')
    expect(payload.pageVisibility).toBe('public')

    // Should NOT include email
    expect(payload).not.toHaveProperty('email')
  })

  test('public profile API returns 404 for private profile', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('privapi')
    await registerAndLogin(page, { name: 'API Private', email, password: 'password123' })

    const uniqueSlug = `api-priv-${Date.now().toString(36)}`
    await patchProfileViaApi(page, {
      displayName: 'API Private User',
      publicSlug: uniqueSlug,
      pageVisibility: 'private',
    })

    const result = await fetchPublicProfile(page, uniqueSlug)
    expect(result.status).toBe(404)
  })

  test('public profile API returns 404 for non-existent slug', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const result = await fetchPublicProfile(page, 'non-existent-slug-xyz-123')
    expect(result.status).toBe(404)
  })

  test('public profile page shows disclaimer footer', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('pubfooter')
    await registerAndLogin(page, { name: 'Footer View', email, password: 'password123' })

    const uniqueSlug = `foot-${Date.now().toString(36)}`
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const dateStr = pastDate.toISOString().split('T')[0]!

    await patchProfileViaApi(page, {
      displayName: 'Footer View User',
      publicSlug: uniqueSlug,
      sobrietyStartedAt: dateStr,
      pageVisibility: 'public',
    })

    await page.goto(`/u/${uniqueSlug}`)
    await waitForHydration(page)

    await expect(
      page.getByText(/beensoberfor.*simple counter.*not treatment/i),
    ).toBeVisible()
  })

  test('public profile respects showStartDate toggle', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('pubtoggle')
    await registerAndLogin(page, { name: 'Toggle View', email, password: 'password123' })

    const uniqueSlug = `tog-${Date.now().toString(36)}`
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 20)
    const dateStr = pastDate.toISOString().split('T')[0]!

    // Set showStartDate to false
    await patchProfileViaApi(page, {
      displayName: 'Toggle View User',
      publicSlug: uniqueSlug,
      sobrietyStartedAt: dateStr,
      pageVisibility: 'public',
      showStartDate: false,
    })

    const result = await fetchPublicProfile(page, uniqueSlug)
    const payload = result.payload as Record<string, unknown>
    expect(payload.showStartDate).toBe(false)
  })
})
