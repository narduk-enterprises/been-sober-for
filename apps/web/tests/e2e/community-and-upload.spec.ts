import { fileURLToPath } from 'node:url'
import {
  expect,
  registerAndLogin,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
} from './fixtures'

const demoAvatarPath = fileURLToPath(
  new URL('../../public/images/demo-avatars/person-01.jpg', import.meta.url),
)

test.describe('community listing and profile upload', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('community and upload tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('community page shows seeded public profiles', async ({ page }) => {
    await page.goto('/community')
    await waitForHydration(page)

    await expect(page.getByRole('heading', { name: 'Public sobriety counters' })).toBeVisible()
    await expect(page.getByText('/u/maya-flores')).toBeVisible()
    await expect(page.getByRole('link', { name: 'View page' }).first()).toBeVisible()
    await expect(page.locator('img[alt="Profile photo of Maya Flores"]').first()).toBeVisible()
  })

  test('user can upload a profile photo and keep it on their profile', async ({ page }) => {
    const email = `avatar-${Date.now()}@example.com`

    await page.goto('/')
    await waitForHydration(page)
    await registerAndLogin(page, { name: 'Avery Upload', email, password: 'password123' })

    await page.goto('/dashboard/edit-profile')
    await waitForHydration(page)
    await expect(page.getByRole('button', { name: 'Start today' })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles(demoAvatarPath)

    const uploadedPreview = page.locator('img[src^="/images/uploads/"]').first()
    await expect(uploadedPreview).toBeVisible()

    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: 'Profile saved' })).toBeVisible()

    await page.goto('/dashboard/preview')
    await waitForHydration(page)

    await expect(page.locator('img[src^="/images/uploads/"]').first()).toBeVisible()
  })
})
