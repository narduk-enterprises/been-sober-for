import { afterEach, describe, expect, it } from 'vitest'
// eslint-disable-next-line nuxt-redundant-auto-import/no-redundant-auto-import -- Vitest has no Nuxt auto-imports for `~/utils/*`.
import {
  formatSobrietyBreakdown,
  parseSobrietyStartDate,
  soberWholeDays,
  soberYmdBreakdown,
} from '../app/utils/sobrietyTime'

describe('soberWholeDays', () => {
  const previousTz = process.env.TZ

  afterEach(() => {
    if (previousTz === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = previousTz
    }
  })

  it('counts one local calendar day across US spring-forward (23h between adjacent midnights)', () => {
    process.env.TZ = 'America/New_York'
    // Second Sunday March 2025 — spring forward night of Mar 9.
    const end = new Date(2025, 2, 10, 12, 0, 0)
    expect(soberWholeDays('2025-03-09', end)).toBe(1)
  })

  it('counts one local calendar day across fall-back (25h between adjacent midnights)', () => {
    process.env.TZ = 'America/New_York'
    const end = new Date(2025, 10, 3, 12, 0, 0)
    expect(soberWholeDays('2025-11-02', end)).toBe(1)
  })

  it('returns 0 on the same local calendar day as the start date', () => {
    process.env.TZ = 'America/Chicago'
    const end = new Date(2024, 5, 15, 23, 30, 0)
    expect(soberWholeDays('2024-06-15', end)).toBe(0)
  })

  it('rejects impossible calendar dates instead of rolling them into another month', () => {
    expect(parseSobrietyStartDate('2025-02-31')).toBeNull()
    expect(parseSobrietyStartDate('2025-13-01')).toBeNull()
  })

  it('uses exact calendar borrowing for the years / months / days breakdown', () => {
    process.env.TZ = 'America/Chicago'
    const end = new Date(2026, 2, 29, 12, 0, 0)
    expect(soberWholeDays('2024-09-09', end)).toBe(566)
    expect(soberYmdBreakdown('2024-09-09', end)).toEqual({
      years: 1,
      months: 6,
      days: 20,
    })
  })

  it('pluralizes singular and plural breakdown units correctly', () => {
    expect(formatSobrietyBreakdown({ years: 1, months: 1, days: 1 })).toBe(
      '1 year, 1 month, 1 day',
    )
    expect(formatSobrietyBreakdown({ years: 2, months: 0, days: 3 })).toBe(
      '2 years, 0 months, 3 days',
    )
  })
})
