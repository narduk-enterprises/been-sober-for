import {
  createUniqueEmail,
  expect,
  fetchJson,
  isoDateDaysAhead,
  patchSoberProfile,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'

test.describe('profile API', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  // ─── Auth guards ──────────────────────────────────────────

  test('GET /api/profile rejects unauthenticated requests', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const result = await fetchJson(page, '/api/profile')
    expect(result.status).toBe(401)
    expect(result.ok).toBe(false)
  })

  test('PATCH /api/profile rejects unauthenticated requests', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ displayName: 'Hacker' }),
      })
      return { ok: response.ok, status: response.status }
    })
    expect(result.status).toBe(401)
  })

  test('POST /api/profile/start-again rejects unauthenticated requests', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/profile/start-again', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ startedAt: '2025-01-01', confirmed: true }),
      })
      return { ok: response.ok, status: response.status }
    })
    expect(result.status).toBe(401)
  })

  // ─── Profile CRUD ─────────────────────────────────────────

  test('GET /api/profile returns profile for authenticated user', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('api-get-profile')
    await registerAndLogin(page, { name: 'API User', email, password: 'password123' })

    const result = await fetchJson(page, '/api/profile')
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toHaveProperty('publicSlug')
    expect(result.data).toHaveProperty('displayName')
    expect(result.data).toHaveProperty('email', email)
  })

  test('PATCH /api/profile updates profile fields', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('api-patch-profile')
    await registerAndLogin(page, { name: 'Patch User', email, password: 'password123' })

    const slug = `api-patch-${Date.now()}`
    const result = await patchSoberProfile(page, {
      displayName: 'Updated Name',
      publicSlug: slug,
      sobrietyStartedAt: '2024-06-15',
      shortMessage: 'API test message',
      showStartDate: false,
      showAvatar: false,
      showQr: false,
      shareLayout: 'minimal',
    })

    expect(result.ok).toBe(true)
    expect(result.data).toMatchObject({
      displayName: 'Updated Name',
      publicSlug: slug,
      sobrietyStartedAt: '2024-06-15',
      shortMessage: 'API test message',
      showStartDate: false,
      showAvatar: false,
      showQr: false,
      shareLayout: 'minimal',
    })
  })

  test('PATCH /api/profile rejects duplicate slug', async ({ page, browser }) => {
    await page.goto('/')
    await waitForHydration(page)

    // Register first user and set slug
    const email1 = createUniqueEmail('slug-dup-1')
    await registerAndLogin(page, { name: 'User1', email: email1, password: 'password123' })
    const slug = `dup-slug-${Date.now()}`
    await patchSoberProfile(page, { displayName: 'User1', publicSlug: slug })

    // Register second user in new context
    const context2 = await browser.newContext()
    try {
      const page2 = await context2.newPage()
      await page2.goto('/')
      await waitForHydration(page2)
      const email2 = createUniqueEmail('slug-dup-2')
      await registerAndLogin(page2, { name: 'User2', email: email2, password: 'password123' })

      // Try to use the same slug
      const result = await patchSoberProfile(page2, { displayName: 'User2', publicSlug: slug })
      expect(result.ok).toBe(false)
      expect(result.status).toBeGreaterThanOrEqual(400)
    } finally {
      await context2.close()
    }
  })

  // ─── Start again API ──────────────────────────────────────

  test('POST /api/profile/start-again updates sobriety date', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('api-start-again')
    await registerAndLogin(page, { name: 'Start Again User', email, password: 'password123' })

    // Set initial sobriety date
    await patchSoberProfile(page, {
      displayName: 'Start Again User',
      publicSlug: `start-again-${Date.now()}`,
      sobrietyStartedAt: '2024-01-01',
    })

    // Reset via start-again
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/profile/start-again', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ startedAt: '2025-06-01', confirmed: true }),
      })
      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }
      return { ok: response.ok, status: response.status, data }
    })

    expect(result.ok).toBe(true)
    expect((result.data as Record<string, unknown>)?.sobrietyStartedAt).toBe('2025-06-01')
  })

  test('POST /api/profile/start-again rejects future dates', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('api-future-date')
    await registerAndLogin(page, { name: 'Future Date User', email, password: 'password123' })

    const futureDateIso = isoDateDaysAhead(365)

    const result = await page.evaluate(
      async (body) => {
        const response = await fetch('/api/profile/start-again', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(body),
        })
        return { ok: response.ok, status: response.status }
      },
      { startedAt: futureDateIso, confirmed: true },
    )

    expect(result.ok).toBe(false)
    expect(result.status).toBe(400)
  })

  // ─── Public profile API ───────────────────────────────────

  test('GET /api/public/profile/[slug] returns public profile data', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('api-public-profile')
    await registerAndLogin(page, { name: 'Public API User', email, password: 'password123' })

    const slug = `public-api-${Date.now()}`
    await patchSoberProfile(page, {
      displayName: 'Public API User',
      publicSlug: slug,
      sobrietyStartedAt: '2024-03-15',
      shortMessage: 'Public API test',
      pageVisibility: 'unlisted',
    })

    const result = await fetchJson(page, `/api/public/profile/${slug}`)
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({
      displayName: 'Public API User',
      slug: slug,
      sobrietyStartedAt: '2024-03-15',
    })

    // Should NOT contain sensitive fields
    expect(result.data).not.toHaveProperty('userId')
    expect(result.data).not.toHaveProperty('email')
  })

  test('GET /api/public/profile/[slug] returns 404 for non-existent slug', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const result = await fetchJson(page, '/api/public/profile/this-slug-does-not-exist-ever')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  test('GET /api/public/profile/[slug] returns 404 for private profiles', async ({ page, browser }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('api-private-profile')
    await registerAndLogin(page, { name: 'Private User', email, password: 'password123' })

    const slug = `private-api-${Date.now()}`
    const patchResult = await patchSoberProfile(page, {
      displayName: 'Private User',
      publicSlug: slug,
      pageVisibility: 'private',
    })
    expect(patchResult.ok).toBe(true)

    // Access from a separate anonymous context (no auth cookies)
    const anonContext = await browser.newContext()
    try {
      const anonPage = await anonContext.newPage()
      await anonPage.goto('/')
      await waitForHydration(anonPage)

      const result = await fetchJson(anonPage, `/api/public/profile/${slug}`)
      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    } finally {
      await anonContext.close()
    }
  })
})
