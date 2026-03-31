import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAppDatabase } from '../../server/utils/database'

/**
 * Unit tests for the createAppDatabase factory.
 *
 * Tests:
 * - Returns a function that creates Drizzle instances
 * - Throws when D1 binding is missing
 * - Memoizes on event.context._appDb (separate from _db)
 * - Uses the provided schema
 */

// Mock Nitro auto-imports
vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

// Mock drizzle-orm — capture calls to verify schema is passed
const mockD1Drizzle = vi.fn(() => ({ __mock: true, __factory: true, __backend: 'd1' }))
const mockPgDrizzle = vi.fn(() => ({ __mock: true, __factory: true, __backend: 'postgres' }))
const mockUseRuntimeConfig = vi.fn(() => ({
  databaseBackend: 'd1',
  hyperdriveBinding: 'HYPERDRIVE',
}))
vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig)

vi.mock('drizzle-orm/d1', () => ({
  drizzle: (...args: unknown[]) => mockD1Drizzle(...args),
}))

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: (...args: unknown[]) => mockPgDrizzle(...args),
}))

vi.mock('postgres', () => ({
  default: vi.fn(() => ({ __pgClient: true })),
}))

vi.mock('../../server/database/schema', () => ({}))
vi.mock('../../server/database/pg-schema', () => ({}))

describe('createAppDatabase', () => {
  beforeEach(() => {
    mockUseRuntimeConfig.mockReturnValue({
      databaseBackend: 'd1',
      hyperdriveBinding: 'HYPERDRIVE',
    })
    mockD1Drizzle.mockClear()
    mockPgDrizzle.mockClear()
  })

  it('returns a function', () => {
    const useAppDb = createAppDatabase({ posts: {} })
    expect(typeof useAppDb).toBe('function')
  })

  it('throws 500 when D1 binding is not available', () => {
    const useAppDb = createAppDatabase({ posts: {} })
    const event = { context: { cloudflare: { env: {} } } }
    expect(() => useAppDb(event as never)).toThrow('D1 database binding not available')
  })

  it('throws 500 when cloudflare context is missing', () => {
    const useAppDb = createAppDatabase({ posts: {} })
    const event = { context: {} }
    expect(() => useAppDb(event as never)).toThrow('D1 database binding not available')
  })

  it('returns a Drizzle instance when D1 binding exists', () => {
    const schema = { posts: { id: 'text' } }
    const useAppDb = createAppDatabase(schema)
    const event = {
      context: { cloudflare: { env: { DB: { __d1: true } } } },
    }
    const db = useAppDb(event as never)
    expect(db).toBeDefined()
    expect(db).toEqual({ __mock: true, __factory: true, __backend: 'd1' })
    // Verify schema was passed to drizzle
    expect(mockD1Drizzle).toHaveBeenCalledWith({ __d1: true }, { schema })
  })

  it('memoizes on event.context._appDb', () => {
    const schema = { posts: {} }
    const useAppDb = createAppDatabase(schema)
    const existingDb = { __cached: true }
    const event = { context: { _appDb: existingDb } }
    const db = useAppDb(event as never)
    expect(db).toBe(existingDb)
    expect(mockD1Drizzle).not.toHaveBeenCalled()
  })

  it('uses _appDb key, not _db (no collision with useDatabase)', () => {
    const schema = { posts: {} }
    const useAppDb = createAppDatabase(schema)
    const event = {
      context: {
        _db: { __layerDb: true },
        cloudflare: { env: { DB: { __d1: true } } },
      },
    }
    const db = useAppDb(event as never)
    // Should create a new instance, not return _db
    expect(db).toEqual({ __mock: true, __factory: true, __backend: 'd1' })
    // Should store on _appDb
    expect(event.context).toHaveProperty('_appDb')
  })

  it('uses the postgres schema when the backend is postgres', () => {
    mockUseRuntimeConfig.mockReturnValue({
      databaseBackend: 'postgres',
      hyperdriveBinding: 'HYPERDRIVE',
    })

    const d1Schema = { authSessions: { id: 'text' } }
    const pgSchema = { authSessions: { id: 'pg-text' } }
    const useAppDb = createAppDatabase({ d1: d1Schema, pg: pgSchema })
    const event = {
      context: {
        cloudflare: { env: { HYPERDRIVE: { connectionString: 'postgres://localhost/app' } } },
      },
    }

    const db = useAppDb(event as never)

    expect(db).toEqual({ __mock: true, __factory: true, __backend: 'postgres' })
    expect(mockPgDrizzle).toHaveBeenCalledWith(
      { __pgClient: true },
      expect.objectContaining({ schema: pgSchema }),
    )
  })
})
