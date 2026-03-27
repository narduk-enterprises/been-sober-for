import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'
import { patchProfileRaw, patchProfileViaApi, getProfileViaApi } from './helpers'

test.describe('profile API validation', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('GET /api/profile requires authentication', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const result = await page.evaluate(async () => {
      const resp = await fetch('/api/profile', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      return { status: resp.status }
    })
    expect(result.status).toBe(401)
  })

  test('PATCH /api/profile requires authentication', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const result = await patchProfileRaw(page, { displayName: 'Test' })
    expect(result.status).toBe(401)
  })

  test('PATCH /api/profile requires at least one field', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchmin')
    await registerAndLogin(page, { name: 'Patch Min', email, password: 'password123' })

    const result = await patchProfileRaw(page, {})
    expect(result.status).toBe(400)
  })

  test('PATCH /api/profile rejects display name over 80 chars', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchlong')
    await registerAndLogin(page, { name: 'Patch Long', email, password: 'password123' })

    const longName = 'A'.repeat(81)
    const result = await patchProfileRaw(page, { displayName: longName })
    expect(result.status).toBe(400)
  })

  test('PATCH /api/profile rejects slug shorter than 3 chars', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchshort')
    await registerAndLogin(page, { name: 'Patch Short', email, password: 'password123' })

    const result = await patchProfileRaw(page, { displayName: 'Test', publicSlug: 'ab' })
    expect(result.status).toBe(400)
  })

  test('PATCH /api/profile rejects slug longer than 32 chars', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchlongslug')
    await registerAndLogin(page, { name: 'Patch Long Slug', email, password: 'password123' })

    const longSlug = 'a'.repeat(33)
    const result = await patchProfileRaw(page, { displayName: 'Test', publicSlug: longSlug })
    expect(result.status).toBe(400)
  })

  test('PATCH /api/profile rejects reserved slug', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchreserved')
    await registerAndLogin(page, { name: 'Patch Reserved', email, password: 'password123' })

    const result = await patchProfileRaw(page, { displayName: 'Test', publicSlug: 'dashboard' })
    // Should be 400 (invalid slug) or 409 (conflict)
    expect([400, 409]).toContain(result.status)
  })

  test('PATCH /api/profile rejects duplicate slug', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    // Create first user with a slug
    const email1 = createUniqueEmail('patchdup1')
    await registerAndLogin(page, { name: 'Dup User 1', email: email1, password: 'password123' })

    const uniqueSlug = `dup-${Date.now().toString(36)}`
    await patchProfileViaApi(page, { displayName: 'Dup User 1', publicSlug: uniqueSlug })

    // Verify the slug was set
    const profile1 = await getProfileViaApi(page)
    expect(profile1.publicSlug).toBe(uniqueSlug)

    // Create second user and try to use same slug
    const email2 = createUniqueEmail('patchdup2')
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
    })
    await registerAndLogin(page, { name: 'Dup User 2', email: email2, password: 'password123' })

    const result = await patchProfileRaw(page, {
      displayName: 'Dup User 2',
      publicSlug: uniqueSlug,
    })
    expect(result.status).toBe(409)
  })

  test('PATCH /api/profile rejects short message over 280 chars', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchmsg')
    await registerAndLogin(page, { name: 'Patch Msg', email, password: 'password123' })

    const longMessage = 'A'.repeat(281)
    const result = await patchProfileRaw(page, {
      displayName: 'Patch Msg',
      shortMessage: longMessage,
    })
    expect(result.status).toBe(400)
  })

  test('PATCH /api/profile accepts valid visibility values', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchvis')
    await registerAndLogin(page, { name: 'Patch Vis', email, password: 'password123' })

    for (const vis of ['private', 'unlisted', 'public']) {
      const result = await patchProfileRaw(page, {
        displayName: 'Patch Vis',
        pageVisibility: vis,
      })
      expect(result.status).toBe(200)
    }
  })

  test('PATCH /api/profile rejects invalid visibility value', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchbadvis')
    await registerAndLogin(page, { name: 'Bad Vis', email, password: 'password123' })

    const result = await patchProfileRaw(page, {
      displayName: 'Bad Vis',
      pageVisibility: 'invalid_value',
    })
    expect(result.status).toBe(400)
  })

  test('PATCH /api/profile rejects invalid share layout', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchbadlayout')
    await registerAndLogin(page, { name: 'Bad Layout', email, password: 'password123' })

    const result = await patchProfileRaw(page, {
      displayName: 'Bad Layout',
      shareLayout: 'totally_invalid',
    })
    expect(result.status).toBe(400)
  })

  test('PATCH /api/profile forces search indexing off when not public', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('patchindex')
    await registerAndLogin(page, { name: 'Index Force', email, password: 'password123' })

    // First set to public with indexing
    await patchProfileViaApi(page, {
      displayName: 'Index Force',
      pageVisibility: 'public',
      allowSearchIndexing: true,
    })

    let profile = await getProfileViaApi(page)
    expect(profile.allowSearchIndexing).toBe(true)

    // Now set to unlisted - indexing should be forced off
    await patchProfileViaApi(page, {
      pageVisibility: 'unlisted',
      allowSearchIndexing: true,
    })

    profile = await getProfileViaApi(page)
    expect(profile.allowSearchIndexing).toBe(false)
  })

  test('newly created profile has default values', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('defaults')
    await registerAndLogin(page, { name: 'Defaults User', email, password: 'password123' })

    const profile = await getProfileViaApi(page)
    expect(profile.pageVisibility).toBe('unlisted')
    expect(profile.allowSearchIndexing).toBe(false)
    expect(profile.showStartDate).toBe(true)
    expect(profile.showAvatar).toBe(true)
    expect(profile.showQr).toBe(true)
    expect(profile.shareLayout).toBe('standard')
    expect(profile.sobrietyStartedAt).toBeNull()
    expect(profile.shortMessage).toBeNull()
  })

  test('profile publicProfileUrl is computed correctly', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('puburl')
    await registerAndLogin(page, { name: 'Pub URL', email, password: 'password123' })

    const profile = await getProfileViaApi(page)
    expect(profile.publicProfileUrl).toMatch(/\/u\//)
    expect(profile.publicProfileUrl).toContain(profile.publicSlug)
  })
})
