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

test.describe('milestone and print pages', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('baseURL required')
    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  // ─── Milestone pages ──────────────────────────────────────

  const milestonePages = [
    { path: '/30-days-sober', label: '30 days' },
    { path: '/60-days-sober', label: '60 days' },
    { path: '/90-days-sober', label: '90 days' },
    { path: '/100-days-sober', label: '100 days' },
    { path: '/6-months-sober', label: '6 months' },
    { path: '/1-year-sober', label: '1 year' },
    { path: '/2-years-sober', label: '2 years' },
  ]

  for (const { path, label } of milestonePages) {
    test(`milestone page ${path} renders with heading`, async ({ page }) => {
      await page.goto(path)
      await waitForHydration(page)

      // Each milestone page should have a heading
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // Should have relevant content about the milestone
      await expect(page).toHaveTitle(new RegExp(label.replace(/\s/g, '.*'), 'i'))
    })
  }

  test('milestone pages have CTA to register', async ({ page }) => {
    await page.goto('/30-days-sober')
    await waitForHydration(page)

    // Should have a call-to-action link
    const registerLink = page.getByRole('link', { name: /start.*counter|register|sign up/i })
    await expect(registerLink.first()).toBeVisible()
  })

  // ─── Print page ────────────────────────────────────────────

  test('print example page renders', async ({ page }) => {
    await page.goto('/print/example')
    await waitForHydration(page)

    // Should show some content (example print layout)
    await expect(page.getByText('Jamie', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  test('print page for public profile renders', async ({ page }) => {
    // Create a user with an unlisted profile
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('print-page')
    await registerAndLogin(page, { name: 'Print User', email, password: 'password123' })

    const slug = `print-test-${Date.now()}`
    const patchResult = await patchSoberProfile(page, {
      displayName: 'Print User',
      publicSlug: slug,
      sobrietyStartedAt: '2024-01-15',
      shortMessage: 'Print test',
      pageVisibility: 'unlisted',
    })
    expect(patchResult.ok).toBe(true)

    await page.goto(`/print/${slug}`)
    await waitForHydration(page)

    await expect(page.getByText('Print User', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  test('print page for private profile shows error', async ({ page, browser }) => {
    await page.goto('/')
    await waitForHydration(page)

    const email = createUniqueEmail('print-private')
    await registerAndLogin(page, { name: 'Private Print User', email, password: 'password123' })

    const slug = `print-private-${Date.now()}`
    await patchSoberProfile(page, {
      displayName: 'Private Print User',
      publicSlug: slug,
      pageVisibility: 'private',
    })

    // Visit print page as anonymous user
    const anonContext = await browser.newContext()
    try {
      const anonPage = await anonContext.newPage()
      await anonPage.goto(`/print/${slug}`)
      await waitForHydration(anonPage)

      // Should show error or not available message
      // Since the API returns 404 for private profiles, the page should handle that
      await expect(
        anonPage.getByText(/not available|not found|private/i).first(),
      ).toBeVisible({ timeout: 10_000 })
    } finally {
      await anonContext.close()
    }
  })
})
