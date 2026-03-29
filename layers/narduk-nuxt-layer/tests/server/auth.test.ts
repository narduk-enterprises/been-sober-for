import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSessionUser, requireAuth, requireAdmin } from '../../server/utils/auth'

// Mock Nitro auto-imports
vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

vi.stubGlobal('useRuntimeConfig', () => ({
  sessionCookieName: 'test_session',
}))

const mockGetUserSession = vi.fn().mockResolvedValue(null)
vi.stubGlobal('getUserSession', mockGetUserSession)

const noopLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => noopLogger,
}
vi.stubGlobal('useLogger', () => noopLogger)

// Mock useDatabase
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}

vi.stubGlobal('useDatabase', () => mockDb)

// Mock h3 functions
vi.mock('h3', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  getRequestHeader: vi.fn((event: { _headers?: Record<string, string> }, name: string) => {
    return event._headers?.[name.toLowerCase()] ?? (name === 'host' ? 'localhost:3000' : null)
  }),
}))

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col, val) => ({ column: 'eq', value: val })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  gt: vi.fn((_col, val) => ({ column: 'gt', value: val })),
}))

vi.mock('#layer/orm-tables', () => ({
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    passwordHash: 'password_hash',
    appleId: 'apple_id',
    isAdmin: 'is_admin',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  apiKeys: {
    id: 'id',
    userId: 'user_id',
    keyHash: 'key_hash',
    expiresAt: 'expires_at',
    lastUsedAt: 'last_used_at',
  },
  sessions: { id: 'id', userId: 'user_id', expiresAt: 'expires_at', createdAt: 'created_at' },
}))

function mockSelectRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows)
  const where = vi.fn(() => ({ limit }))
  const innerJoin = vi.fn(() => ({ where, limit }))
  const from = vi.fn(() => ({ innerJoin, where, limit }))
  mockDb.select.mockReturnValue({ from })
}

function mockUpdateRun() {
  const run = vi.fn().mockResolvedValue({})
  const where = vi.fn(() => ({ run }))
  const set = vi.fn(() => ({ where }))
  mockDb.update.mockReturnValue({ set })
  return { run, where, set }
}

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserSession.mockResolvedValue(null)
  })

  describe('getSessionUser', () => {
    it('returns null when no session cookie is present', async () => {
      const { getCookie } = await import('h3')
      vi.mocked(getCookie).mockReturnValue()

      const event = { context: {} } as never
      const result = await getSessionUser(event)
      expect(result).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('throws 401 when no session exists', async () => {
      const { getCookie } = await import('h3')
      vi.mocked(getCookie).mockReturnValue()

      const event = { context: {} } as never
      await expect(requireAuth(event)).rejects.toThrow('Unauthorized')
    })

    it('prefers an explicit API key over an ambient session', async () => {
      mockGetUserSession.mockResolvedValue({
        user: { id: 'session-user', email: 'session@example.com', isAdmin: false, name: null },
      })
      mockSelectRows([
        {
          keyId: 'key_123',
          keyExpiresAt: null,
          id: 'api-user',
          email: 'api@example.com',
          name: 'API User',
          passwordHash: null,
          appleId: null,
          isAdmin: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ])
      mockUpdateRun()

      const event = {
        context: {},
        _headers: { authorization: 'Bearer nk_1234567890abcdef' },
      } as never
      const user = await requireAuth(event)

      expect(user).toMatchObject({
        id: 'api-user',
        email: 'api@example.com',
        isAdmin: true,
      })
    })

    it('does not fall back to a session when an explicit API key is invalid', async () => {
      mockGetUserSession.mockResolvedValue({
        user: { id: 'session-user', email: 'session@example.com', isAdmin: true, name: null },
      })
      mockSelectRows([])

      const event = {
        context: {},
        _headers: { authorization: 'Bearer nk_invalid' },
      } as never

      await expect(requireAuth(event)).rejects.toThrow('Unauthorized')
    })
  })

  describe('requireAdmin', () => {
    it('throws 401 when no session exists (via requireAuth)', async () => {
      const { getCookie } = await import('h3')
      vi.mocked(getCookie).mockReturnValue()

      const event = { context: {} } as never
      await expect(requireAdmin(event)).rejects.toThrow('Unauthorized')
    })
  })
})
