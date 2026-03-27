import { describe, expect, it } from 'vitest'
import {
  isoDate,
  profilePatchSchema,
  startAgainSchema,
} from '../../server/utils/sober-profile-schemas'

/* ------------------------------------------------------------------ */
/*  isoDate field                                                      */
/* ------------------------------------------------------------------ */
describe('isoDate field', () => {
  it('accepts a valid YYYY-MM-DD string', () => {
    expect(isoDate.parse('2024-06-15')).toBe('2024-06-15')
  })

  it('accepts null', () => {
    expect(isoDate.parse(null)).toBeNull()
  })

  it('rejects a date with slashes', () => {
    expect(() => isoDate.parse('2024/06/15')).toThrow()
  })

  it('rejects a date with time component', () => {
    expect(() => isoDate.parse('2024-06-15T00:00:00')).toThrow()
  })

  it('rejects a bare number', () => {
    expect(() => isoDate.parse('12345')).toThrow()
  })

  it('rejects a non-string value', () => {
    expect(() => isoDate.parse(12345)).toThrow()
  })
})

/* ------------------------------------------------------------------ */
/*  profilePatchSchema                                                 */
/* ------------------------------------------------------------------ */
describe('profilePatchSchema', () => {
  it('accepts a minimal update with just displayName', () => {
    const result = profilePatchSchema.parse({ displayName: 'Jane' })
    expect(result.displayName).toBe('Jane')
  })

  it('accepts a minimal update with just publicSlug', () => {
    const result = profilePatchSchema.parse({ publicSlug: 'my-slug' })
    expect(result.publicSlug).toBe('my-slug')
  })

  it('accepts all fields together', () => {
    const body = {
      displayName: 'John Doe',
      publicSlug: 'john-doe',
      avatarUrl: 'https://example.com/photo.jpg',
      sobrietyStartedAt: '2024-01-15',
      shortMessage: 'Staying strong 💪',
      pageVisibility: 'public' as const,
      allowSearchIndexing: true,
      showStartDate: true,
      showAvatar: true,
      showQr: false,
      shareLayout: 'minimal' as const,
    }
    const result = profilePatchSchema.parse(body)
    expect(result.displayName).toBe('John Doe')
    expect(result.avatarUrl).toBe('https://example.com/photo.jpg')
    expect(result.shareLayout).toBe('minimal')
  })

  it('rejects an empty object (no fields)', () => {
    expect(() => profilePatchSchema.parse({})).toThrow('Provide at least one field to update.')
  })

  it('rejects unknown fields (strict mode)', () => {
    expect(() => profilePatchSchema.parse({ displayName: 'Jane', hackedField: true })).toThrow()
  })

  it('rejects displayName shorter than 1 char', () => {
    expect(() => profilePatchSchema.parse({ displayName: '' })).toThrow()
  })

  it('rejects displayName longer than 80 chars', () => {
    expect(() => profilePatchSchema.parse({ displayName: 'x'.repeat(81) })).toThrow()
  })

  it('accepts displayName at max length (80 chars)', () => {
    const result = profilePatchSchema.parse({ displayName: 'x'.repeat(80) })
    expect(result.displayName).toHaveLength(80)
  })

  it('rejects publicSlug shorter than 3 chars', () => {
    expect(() => profilePatchSchema.parse({ publicSlug: 'ab' })).toThrow()
  })

  it('rejects publicSlug longer than 32 chars', () => {
    expect(() => profilePatchSchema.parse({ publicSlug: 'a'.repeat(33) })).toThrow()
  })

  it('rejects sobrietyStartedAt with wrong format', () => {
    expect(() => profilePatchSchema.parse({ sobrietyStartedAt: '15/06/2024' })).toThrow()
  })

  it('accepts sobrietyStartedAt as null', () => {
    const result = profilePatchSchema.parse({ sobrietyStartedAt: null })
    expect(result.sobrietyStartedAt).toBeNull()
  })

  it('transforms empty avatarUrl to null', () => {
    const result = profilePatchSchema.parse({ avatarUrl: '' })
    expect(result.avatarUrl).toBeNull()
  })

  it('accepts avatarUrl as a valid URL', () => {
    const result = profilePatchSchema.parse({ avatarUrl: 'https://cdn.example.com/photo.jpg' })
    expect(result.avatarUrl).toBe('https://cdn.example.com/photo.jpg')
  })

  it('accepts avatarUrl starting with /images/', () => {
    const result = profilePatchSchema.parse({ avatarUrl: '/images/avatar.png' })
    expect(result.avatarUrl).toBe('/images/avatar.png')
  })

  it('rejects avatarUrl with invalid path', () => {
    expect(() => profilePatchSchema.parse({ avatarUrl: '/random/path.jpg' })).toThrow()
  })

  it('accepts avatarUrl as null', () => {
    const result = profilePatchSchema.parse({ avatarUrl: null })
    expect(result.avatarUrl).toBeNull()
  })

  it('rejects invalid pageVisibility value', () => {
    expect(() => profilePatchSchema.parse({ pageVisibility: 'visible' })).toThrow()
  })

  it('accepts all valid pageVisibility values', () => {
    for (const v of ['private', 'unlisted', 'public'] as const) {
      const result = profilePatchSchema.parse({ pageVisibility: v })
      expect(result.pageVisibility).toBe(v)
    }
  })

  it('rejects invalid shareLayout value', () => {
    expect(() => profilePatchSchema.parse({ shareLayout: 'fancy' })).toThrow()
  })

  it('accepts all valid shareLayout values', () => {
    for (const v of ['minimal', 'standard', 'print_ready'] as const) {
      const result = profilePatchSchema.parse({ shareLayout: v })
      expect(result.shareLayout).toBe(v)
    }
  })

  it('rejects shortMessage longer than 280 chars', () => {
    expect(() => profilePatchSchema.parse({ shortMessage: 'x'.repeat(281) })).toThrow()
  })

  it('accepts shortMessage at max length (280 chars)', () => {
    const result = profilePatchSchema.parse({ shortMessage: 'x'.repeat(280) })
    expect(result.shortMessage).toHaveLength(280)
  })

  it('accepts shortMessage as null', () => {
    const result = profilePatchSchema.parse({ shortMessage: null })
    expect(result.shortMessage).toBeNull()
  })

  it('accepts boolean fields', () => {
    const result = profilePatchSchema.parse({
      allowSearchIndexing: false,
      showStartDate: true,
      showAvatar: false,
      showQr: true,
    })
    expect(result.allowSearchIndexing).toBe(false)
    expect(result.showStartDate).toBe(true)
    expect(result.showAvatar).toBe(false)
    expect(result.showQr).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/*  startAgainSchema                                                   */
/* ------------------------------------------------------------------ */
describe('startAgainSchema', () => {
  it('accepts a valid start-again payload', () => {
    const result = startAgainSchema.parse({ startedAt: '2024-06-15', confirmed: true })
    expect(result.startedAt).toBe('2024-06-15')
    expect(result.confirmed).toBe(true)
  })

  it('rejects when confirmed is false', () => {
    expect(() => startAgainSchema.parse({ startedAt: '2024-06-15', confirmed: false })).toThrow()
  })

  it('rejects when confirmed is missing', () => {
    expect(() => startAgainSchema.parse({ startedAt: '2024-06-15' })).toThrow()
  })

  it('rejects when startedAt is missing', () => {
    expect(() => startAgainSchema.parse({ confirmed: true })).toThrow()
  })

  it('rejects invalid date format in startedAt', () => {
    expect(() => startAgainSchema.parse({ startedAt: '15-06-2024', confirmed: true })).toThrow()
  })

  it('rejects date with time component', () => {
    expect(() =>
      startAgainSchema.parse({ startedAt: '2024-06-15T00:00:00', confirmed: true }),
    ).toThrow()
  })

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      startAgainSchema.parse({ startedAt: '2024-06-15', confirmed: true, extra: 'nope' }),
    ).toThrow()
  })
})
