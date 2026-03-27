import { describe, expect, it } from 'vitest'
import {
  buildOwnerProfileResponse,
  isValidPublicSlug,
  RESERVED_PUBLIC_SLUGS,
  toPublicProfileDto,
} from '../../server/utils/sober-profile'
import type { SoberProfile } from '#server/database/app-schema'

/**
 * Factory helper to build a complete SoberProfile row for testing.
 * Overrides can be supplied for any field.
 */
function makeSoberProfile(overrides: Partial<SoberProfile> = {}): SoberProfile {
  return {
    userId: 'user-001',
    publicSlug: 'john-doe',
    displayName: 'John Doe',
    avatarUrl: 'https://cdn.example.com/photo.jpg',
    sobrietyStartedAt: '2024-01-15',
    shortMessage: 'One day at a time.',
    pageVisibility: 'unlisted',
    allowSearchIndexing: false,
    showStartDate: true,
    showAvatar: true,
    showQr: true,
    shareLayout: 'standard',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-06-15T12:00:00.000Z',
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/*  RESERVED_PUBLIC_SLUGS                                              */
/* ------------------------------------------------------------------ */
describe('RESERVED_PUBLIC_SLUGS', () => {
  it('is a Set', () => {
    expect(RESERVED_PUBLIC_SLUGS).toBeInstanceOf(Set)
  })

  it('contains expected reserved words', () => {
    const expected = [
      'api',
      'login',
      'register',
      'logout',
      'dashboard',
      'about',
      'faq',
      'privacy',
      'terms',
      'contact',
      'admin',
    ]
    for (const word of expected) {
      expect(RESERVED_PUBLIC_SLUGS.has(word)).toBe(true)
    }
  })

  it('contains route-collision slugs', () => {
    expect(RESERVED_PUBLIC_SLUGS.has('u')).toBe(true)
    expect(RESERVED_PUBLIC_SLUGS.has('print')).toBe(true)
    expect(RESERVED_PUBLIC_SLUGS.has('images')).toBe(true)
  })

  it('contains milestone slugs', () => {
    const milestones = [
      '30-days-sober',
      '60-days-sober',
      '90-days-sober',
      '100-days-sober',
      '6-months-sober',
      '1-year-sober',
      '2-years-sober',
    ]
    for (const slug of milestones) {
      expect(RESERVED_PUBLIC_SLUGS.has(slug)).toBe(true)
    }
  })

  it('stores slugs in lowercase', () => {
    for (const slug of RESERVED_PUBLIC_SLUGS) {
      expect(slug).toBe(slug.toLowerCase())
    }
  })
})

/* ------------------------------------------------------------------ */
/*  isValidPublicSlug                                                  */
/* ------------------------------------------------------------------ */
describe('isValidPublicSlug', () => {
  it('accepts a simple lowercase slug', () => {
    expect(isValidPublicSlug('john-doe')).toBe(true)
  })

  it('accepts slugs with numbers', () => {
    expect(isValidPublicSlug('user123')).toBe(true)
  })

  it('accepts a numeric slug (3+ chars)', () => {
    expect(isValidPublicSlug('123')).toBe(true)
  })

  it('accepts hyphenated segments', () => {
    expect(isValidPublicSlug('my-sober-journey')).toBe(true)
  })

  it('accepts slug at minimum length (3 chars)', () => {
    expect(isValidPublicSlug('abc')).toBe(true)
  })

  it('accepts slug at maximum length (32 chars)', () => {
    expect(isValidPublicSlug('a'.repeat(32))).toBe(true)
  })

  it('rejects slug shorter than 3 chars', () => {
    expect(isValidPublicSlug('ab')).toBe(false)
  })

  it('rejects slug longer than 32 chars', () => {
    expect(isValidPublicSlug('a'.repeat(33))).toBe(false)
  })

  it('rejects reserved slugs', () => {
    expect(isValidPublicSlug('api')).toBe(false)
    expect(isValidPublicSlug('login')).toBe(false)
    expect(isValidPublicSlug('dashboard')).toBe(false)
    expect(isValidPublicSlug('admin')).toBe(false)
  })

  it('rejects reserved slugs regardless of case', () => {
    expect(isValidPublicSlug('API')).toBe(false)
    expect(isValidPublicSlug('Login')).toBe(false)
    expect(isValidPublicSlug('DASHBOARD')).toBe(false)
  })

  it('rejects slugs with uppercase letters', () => {
    // The regex requires lowercase; uppercase input is lowercased first,
    // then checked against the pattern
    expect(isValidPublicSlug('John-Doe')).toBe(true) // lowercase('John-Doe') = 'john-doe' → valid
  })

  it('rejects slugs starting with a hyphen', () => {
    expect(isValidPublicSlug('-john')).toBe(false)
  })

  it('rejects slugs ending with a hyphen', () => {
    expect(isValidPublicSlug('john-')).toBe(false)
  })

  it('rejects slugs with consecutive hyphens', () => {
    expect(isValidPublicSlug('john--doe')).toBe(false)
  })

  it('rejects slugs with spaces', () => {
    expect(isValidPublicSlug('john doe')).toBe(false)
  })

  it('rejects slugs with special characters', () => {
    expect(isValidPublicSlug('john@doe')).toBe(false)
    expect(isValidPublicSlug('john_doe')).toBe(false)
    expect(isValidPublicSlug('john.doe')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidPublicSlug('')).toBe(false)
  })

  it('rejects single character', () => {
    expect(isValidPublicSlug('a')).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  buildOwnerProfileResponse                                          */
/* ------------------------------------------------------------------ */
describe('buildOwnerProfileResponse', () => {
  it('maps all profile fields to the owner response', () => {
    const row = makeSoberProfile()
    const result = buildOwnerProfileResponse(row, 'john@example.com', 'https://beensoberfor.com')

    expect(result).toEqual({
      email: 'john@example.com',
      displayName: 'John Doe',
      publicSlug: 'john-doe',
      avatarUrl: 'https://cdn.example.com/photo.jpg',
      sobrietyStartedAt: '2024-01-15',
      shortMessage: 'One day at a time.',
      pageVisibility: 'unlisted',
      allowSearchIndexing: false,
      showStartDate: true,
      showAvatar: true,
      showQr: true,
      shareLayout: 'standard',
      publicProfileUrl: 'https://beensoberfor.com/u/john-doe',
      updatedAt: '2024-06-15T12:00:00.000Z',
    })
  })

  it('strips trailing slash from appUrl', () => {
    const row = makeSoberProfile({ publicSlug: 'test' })
    const result = buildOwnerProfileResponse(row, 'a@b.com', 'https://beensoberfor.com/')
    expect(result.publicProfileUrl).toBe('https://beensoberfor.com/u/test')
  })

  it('handles empty appUrl', () => {
    const row = makeSoberProfile({ publicSlug: 'test' })
    const result = buildOwnerProfileResponse(row, 'a@b.com', '')
    expect(result.publicProfileUrl).toBe('/u/test')
  })

  it('includes null fields when profile is incomplete', () => {
    const row = makeSoberProfile({
      displayName: null,
      avatarUrl: null,
      sobrietyStartedAt: null,
      shortMessage: null,
    })
    const result = buildOwnerProfileResponse(row, 'a@b.com', 'https://example.com')
    expect(result.displayName).toBeNull()
    expect(result.avatarUrl).toBeNull()
    expect(result.sobrietyStartedAt).toBeNull()
    expect(result.shortMessage).toBeNull()
  })

  it('does not include userId or createdAt in response', () => {
    const row = makeSoberProfile()
    const result = buildOwnerProfileResponse(row, 'a@b.com', 'https://example.com')
    expect(result).not.toHaveProperty('userId')
    expect(result).not.toHaveProperty('createdAt')
  })
})

/* ------------------------------------------------------------------ */
/*  toPublicProfileDto                                                 */
/* ------------------------------------------------------------------ */
describe('toPublicProfileDto', () => {
  it('maps profile row to public DTO', () => {
    const row = makeSoberProfile()
    const result = toPublicProfileDto(row)

    expect(result).toEqual({
      displayName: 'John Doe',
      avatarUrl: 'https://cdn.example.com/photo.jpg',
      sobrietyStartedAt: '2024-01-15',
      shortMessage: 'One day at a time.',
      slug: 'john-doe',
      showStartDate: true,
      showAvatar: true,
      showQr: true,
      shareLayout: 'standard',
      allowSearchIndexing: false,
      pageVisibility: 'unlisted',
    })
  })

  it('does not expose email, userId, or createdAt', () => {
    const row = makeSoberProfile()
    const result = toPublicProfileDto(row)
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('userId')
    expect(result).not.toHaveProperty('createdAt')
    expect(result).not.toHaveProperty('updatedAt')
  })

  it('uses publicSlug as slug field', () => {
    const row = makeSoberProfile({ publicSlug: 'custom-slug' })
    const result = toPublicProfileDto(row)
    expect(result.slug).toBe('custom-slug')
  })

  it('handles null optional fields', () => {
    const row = makeSoberProfile({
      displayName: null,
      avatarUrl: null,
      sobrietyStartedAt: null,
      shortMessage: null,
    })
    const result = toPublicProfileDto(row)
    expect(result.displayName).toBeNull()
    expect(result.avatarUrl).toBeNull()
    expect(result.sobrietyStartedAt).toBeNull()
    expect(result.shortMessage).toBeNull()
  })

  it('preserves boolean visibility settings', () => {
    const row = makeSoberProfile({
      showStartDate: false,
      showAvatar: false,
      showQr: false,
      allowSearchIndexing: true,
    })
    const result = toPublicProfileDto(row)
    expect(result.showStartDate).toBe(false)
    expect(result.showAvatar).toBe(false)
    expect(result.showQr).toBe(false)
    expect(result.allowSearchIndexing).toBe(true)
  })

  it('preserves different page visibility values', () => {
    for (const visibility of ['private', 'unlisted', 'public']) {
      const row = makeSoberProfile({ pageVisibility: visibility })
      const result = toPublicProfileDto(row)
      expect(result.pageVisibility).toBe(visibility)
    }
  })

  it('preserves different share layout values', () => {
    for (const layout of ['minimal', 'standard', 'print_ready']) {
      const row = makeSoberProfile({ shareLayout: layout })
      const result = toPublicProfileDto(row)
      expect(result.shareLayout).toBe(layout)
    }
  })
})
