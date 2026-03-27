import {
  expect,
  test,
  waitForBaseUrlReady,
  warmUpApp,
  loginAsAdmin,
  registerAndLogin,
} from './fixtures'
import type { Page } from '@playwright/test'

type UsersApiResponse = {
  users: Array<{
    id: string
    email: string
    name: string | null
    isAdmin: boolean
    createdAt: string
  }>
  total: number
  page: number
  limit: number
}

type UserPayload = {
  status: number
  ok: boolean
  payload: UsersApiResponse | null
}

async function requestUsers(page: Page, query = '') {
  return page.evaluate(async (path: string) => {
    const response = await fetch(path)
    const text = await response.text()

    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }

    return {
      status: response.status,
      ok: response.ok,
      payload,
    } as UserPayload
  }, `/api/users${query}`)
}

function assertUsersApiPayload(payload: UsersApiResponse | null): UsersApiResponse {
  if (!payload) {
    throw new Error('Expected users API payload but got non-JSON response.')
  }

  return payload
}

test.describe('users API', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('web users API tests require baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('rejects unauthenticated callers', async ({ page }) => {
    const response = await requestUsers(page)

    expect(response.status).toBe(401)
    expect(response.ok).toBe(false)
  })

  test('rejects authenticated non-admin callers', async ({ page }) => {
    const email = `user-${Date.now()}@example.com`
    await registerAndLogin(page, { name: 'Non-admin User', email, password: 'password123' })

    const response = await requestUsers(page)

    expect(response.status).toBe(403)
    expect(response.ok).toBe(false)
  })

  test('returns paged rows to admins and omits sensitive fields', async ({ page }) => {
    await loginAsAdmin(page)
    const response = await requestUsers(page, '?page=1&limit=2')
    const payload = assertUsersApiPayload(response.payload)

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(payload).not.toBeNull()

    expect(payload).toMatchObject({
      users: expect.any(Array),
      page: 1,
      limit: 2,
      total: expect.any(Number),
    })

    for (const user of payload.users) {
      expect(user).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        isAdmin: expect.any(Boolean),
        createdAt: expect.any(String),
      })
      expect(user).toHaveProperty('name')
      expect(user).not.toHaveProperty('passwordHash')
    }
  })

  test('validates pagination inputs (page and limit caps)', async ({ page }) => {
    await loginAsAdmin(page)

    const invalidPage = await requestUsers(page, '?page=0&limit=2')
    expect(invalidPage.status).toBe(400)

    const invalidLimit = await requestUsers(page, '?page=1&limit=9999')
    expect(invalidLimit.status).toBe(400)

    const defaults = await requestUsers(page)
    const payload = assertUsersApiPayload(defaults.payload)

    expect(defaults.status).toBe(200)
    expect(payload.page).toBe(1)
    expect(payload.limit).toBe(20)
  })
})
