import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockD1Database {
  prepare: ReturnType<typeof vi.fn>
}

interface MockEvent {
  context: {
    cloudflare?: {
      env?: {
        DB?: MockD1Database
      }
    }
  }
}

const log = {
  error: vi.fn(),
}

vi.stubGlobal(
  'defineEventHandler',
  (handler: (event: MockEvent) => Promise<unknown> | unknown) => handler,
)
vi.stubGlobal('useLogger', () => ({
  child: () => log,
}))

const { default: handler } = await import('../../server/api/health.get')

function createEvent(db?: MockD1Database): MockEvent {
  return {
    context: {
      cloudflare: {
        env: db ? { DB: db } : {},
      },
    },
  }
}

describe('health route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok when required auth tables exist', async () => {
    const all = vi.fn().mockResolvedValue({
      results: [{ name: 'api_keys' }, { name: 'sessions' }, { name: 'users' }],
    })
    const event = createEvent({
      prepare: vi.fn(() => ({ all })),
    })

    const result = (await handler(event as never)) as {
      data: { status: string; database: string; missingAuthTables: string[] }
    }

    expect(result.data.status).toBe('ok')
    expect(result.data.database).toBe('ok')
    expect(result.data.missingAuthTables).toEqual([])
  })

  it('reports degraded readiness when auth tables are missing', async () => {
    const all = vi.fn().mockResolvedValue({
      results: [{ name: 'users' }],
    })
    const event = createEvent({
      prepare: vi.fn(() => ({ all })),
    })

    const result = (await handler(event as never)) as {
      data: { status: string; database: string; missingAuthTables: string[] }
    }

    expect(result.data.status).toBe('degraded')
    expect(result.data.database).toBe('schema_error')
    expect(result.data.missingAuthTables).toEqual(['api_keys', 'sessions'])
    expect(log.error).toHaveBeenCalledWith('Health check DB schema probe failed', {
      missingAuthTables: ['api_keys', 'sessions'],
    })
  })

  it('reports errors when the DB probe throws', async () => {
    const event = createEvent({
      prepare: vi.fn(() => ({
        all: vi.fn().mockRejectedValue(new Error('boom')),
      })),
    })

    const result = (await handler(event as never)) as {
      data: { status: string; database: string; missingAuthTables: string[] }
    }

    expect(result.data.status).toBe('error')
    expect(result.data.database).toBe('error')
    expect(result.data.missingAuthTables).toEqual([])
    expect(log.error).toHaveBeenCalledWith('Health check DB probe failed')
  })
})
