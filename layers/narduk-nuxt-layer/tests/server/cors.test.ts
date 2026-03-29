import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockEvent {
  method: string
  path: string
  _headers: Record<string, string>
}

let mockConfig: { corsAllowedOrigins?: string }
let capturedHeaders: Record<string, string> | undefined
let capturedStatus: number | undefined

vi.stubGlobal('defineEventHandler', (fn: (event: MockEvent) => unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => mockConfig)
vi.stubGlobal('getHeader', (event: MockEvent, name: string) => event._headers[name.toLowerCase()])
vi.stubGlobal('setResponseHeaders', (_event: MockEvent, headers: Record<string, string>) => {
  capturedHeaders = headers
})
vi.stubGlobal('setResponseStatus', (_event: MockEvent, status: number) => {
  capturedStatus = status
})

const { default: handler } = await import('../../server/middleware/cors')

function createMockEvent(
  method: string,
  path: string,
  headers: Record<string, string> = {},
): MockEvent {
  return {
    method,
    path,
    _headers: Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    ),
  }
}

beforeEach(() => {
  mockConfig = {}
  capturedHeaders = undefined
  capturedStatus = undefined
})

describe('cors middleware', () => {
  it('allows configured origins on API routes', () => {
    mockConfig.corsAllowedOrigins = 'https://app.example.com'

    const event = createMockEvent('GET', '/api/users', { origin: 'https://app.example.com' })
    handler(event as never)

    expect(capturedHeaders?.['Access-Control-Allow-Origin']).toBe('https://app.example.com')
    expect(capturedStatus).toBeUndefined()
  })

  it('answers scraper-extension preflights for browser extension origins without runtime config', () => {
    const event = createMockEvent('OPTIONS', '/api/admin/scraper-extension/auth', {
      origin: 'chrome-extension://abcdefghijklmnop',
    })

    const response = handler(event as never)

    expect(response).toBe('')
    expect(capturedHeaders?.['Access-Control-Allow-Origin']).toBe(
      'chrome-extension://abcdefghijklmnop',
    )
    expect(capturedStatus).toBe(204)
  })

  it('does not allow extension origins on unrelated API routes', () => {
    const event = createMockEvent('GET', '/api/admin/users', {
      origin: 'moz-extension://abcdefghijklmnop',
    })

    handler(event as never)

    expect(capturedHeaders).toBeUndefined()
    expect(capturedStatus).toBeUndefined()
  })
})
