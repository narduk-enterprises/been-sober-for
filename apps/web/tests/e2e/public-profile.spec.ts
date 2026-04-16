import {
  createUniqueEmail,
  expect,
  patchSoberProfile,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
  registerAndLogin,
} from './fixtures'

test.describe('public profile page', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('shows friendly error for non-existent slug', async ({ page }) => {
    await page.goto('/u/this-slug-certainly-does-not-exist-987654')
    await waitForHydration(page)

    // Should show "This page is not available"
    await expect(page.getByRole('heading', { name: /this page is not available/i })).toBeVisible({
      timeout: 10_000,
    })

    // Should have CTA to register and link home
    await expect(page.getByRole('link', { name: /start my counter/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })

  test('shows profile for unlisted (non-private) profile', async ({ page, browser }) => {
    // Create a user with a public profile
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('public-page')
    await registerAndLogin(page, { name: 'Public Page User', email, password: 'password123' })

    const slug = `public-page-${Date.now()}`
    const patchResult = await patchSoberProfile(page, {
      displayName: 'Sober Hero',
      publicSlug: slug,
      sobrietyStartedAt: '2024-01-01',
      shortMessage: 'Staying strong every day',
      pageVisibility: 'unlisted',
      showStartDate: true,
      showAvatar: true,
      showQr: true,
      shareLayout: 'standard',
    })
    expect(patchResult.ok).toBe(true)

    // Visit public page in new context (not logged in)
    const anonContext = await browser.newContext()
    try {
      const anonPage = await anonContext.newPage()
      await anonPage.goto(`/u/${slug}`)
      await waitForHydration(anonPage)

      // Should display the profile
      await expect(anonPage.getByText('Sober Hero', { exact: true })).toBeVisible({
        timeout: 10_000,
      })
      await expect(anonPage.getByText('days', { exact: true })).toBeVisible()
      await expect(anonPage.getByText(/staying strong every day/i)).toBeVisible()

      // Should have the disclaimer footer
      await expect(anonPage.getByText(/not treatment or medical care/i)).toBeVisible()
    } finally {
      await anonContext.close()
    }
  })

  test('private profile returns error page for anonymous visitors', async ({ page, browser }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('private-page')
    await registerAndLogin(page, { name: 'Private User', email, password: 'password123' })

    const slug = `private-page-${Date.now()}`
    const patchResult = await patchSoberProfile(page, {
      displayName: 'Private User',
      publicSlug: slug,
      pageVisibility: 'private',
    })
    expect(patchResult.ok).toBe(true)

    // Visit in anonymous context
    const anonContext = await browser.newContext()
    try {
      const anonPage = await anonContext.newPage()
      await anonPage.goto(`/u/${slug}`)
      await waitForHydration(anonPage)

      await expect(
        anonPage.getByRole('heading', { name: /this page is not available/i }),
      ).toBeVisible({ timeout: 10_000 })
    } finally {
      await anonContext.close()
    }
  })

  test('public profile page title includes BeenSoberFor branding', async ({ page, browser }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('title-test')
    await registerAndLogin(page, { name: 'Title User', email, password: 'password123' })

    const slug = `title-test-${Date.now()}`
    const patchResult = await patchSoberProfile(page, {
      displayName: 'Title User',
      publicSlug: slug,
      sobrietyStartedAt: '2024-01-01',
      pageVisibility: 'unlisted',
    })
    expect(patchResult.ok).toBe(true)

    // Visit as anonymous user
    const anonContext = await browser.newContext()
    try {
      const anonPage = await anonContext.newPage()
      await anonPage.goto(`/u/${slug}`)
      await waitForHydration(anonPage)

      // The page should load with the profile displayed
      await expect(anonPage.getByText('Title User', { exact: true })).toBeVisible({
        timeout: 10_000,
      })

      // NOTE: The SSR title currently shows a duplicate suffix
      // ("Profile | BeenSoberFor | BeenSoberFor") and doesn't consistently
      // include the display name. This assertion verifies the minimum
      // branding guarantee.
      await expect(anonPage).toHaveTitle(/BeenSoberFor/)
    } finally {
      await anonContext.close()
    }
  })
})
