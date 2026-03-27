import { afterEach, describe, expect, it } from 'vitest'
// eslint-disable-next-line nuxt-redundant-auto-import/no-redundant-auto-import -- Vitest has no Nuxt auto-imports for `~/utils/*`.
import {
  approximateYmdBreakdown,
  atLocalMidnight,
  parseSobrietyStartDate,
  soberLiveDetail,
  soberWholeDays,
} from '../app/utils/sobrietyTime'

/* ------------------------------------------------------------------ */
/*  atLocalMidnight                                                    */
/* ------------------------------------------------------------------ */
describe('atLocalMidnight', () => {
  it('zeros out hours, minutes, seconds and ms', () => {
    const d = new Date(2025, 5, 15, 14, 30, 45, 123)
    const m = atLocalMidnight(d)
    expect(m.getHours()).toBe(0)
    expect(m.getMinutes()).toBe(0)
    expect(m.getSeconds()).toBe(0)
    expect(m.getMilliseconds()).toBe(0)
  })

  it('preserves the date components', () => {
    const d = new Date(2025, 0, 1, 23, 59, 59, 999)
    const m = atLocalMidnight(d)
    expect(m.getFullYear()).toBe(2025)
    expect(m.getMonth()).toBe(0)
    expect(m.getDate()).toBe(1)
  })

  it('works for an already-midnight date', () => {
    const d = new Date(2024, 11, 25, 0, 0, 0, 0)
    const m = atLocalMidnight(d)
    expect(m.getTime()).toBe(d.getTime())
  })
})

/* ------------------------------------------------------------------ */
/*  parseSobrietyStartDate                                             */
/* ------------------------------------------------------------------ */
describe('parseSobrietyStartDate', () => {
  it('parses a valid YYYY-MM-DD date as local midnight', () => {
    const d = parseSobrietyStartDate('2024-06-15')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2024)
    expect(d!.getMonth()).toBe(5) // June = 5
    expect(d!.getDate()).toBe(15)
    expect(d!.getHours()).toBe(0)
  })

  it('trims whitespace from the input', () => {
    const d = parseSobrietyStartDate('  2024-01-01  ')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2024)
  })

  it('returns null for an invalid calendar date (Feb 30)', () => {
    expect(parseSobrietyStartDate('2024-02-30')).toBeNull()
  })

  it('accepts Feb 29 on a leap year', () => {
    const d = parseSobrietyStartDate('2024-02-29')
    expect(d).not.toBeNull()
    expect(d!.getDate()).toBe(29)
  })

  it('rejects Feb 29 on a non-leap year', () => {
    expect(parseSobrietyStartDate('2023-02-29')).toBeNull()
  })

  it('rejects month 13', () => {
    expect(parseSobrietyStartDate('2024-13-01')).toBeNull()
  })

  it('rejects month 00', () => {
    expect(parseSobrietyStartDate('2024-00-15')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(parseSobrietyStartDate('not-a-date')).toBeNull()
  })

  it('handles ISO datetime strings via fallback (anchored to local midnight)', () => {
    const d = parseSobrietyStartDate('2024-06-15T14:30:00Z')
    expect(d).not.toBeNull()
    // The fallback parses and then anchors to local midnight
    expect(d!.getHours()).toBe(0)
    expect(d!.getMinutes()).toBe(0)
  })

  it('handles day 31 in a 30-day month', () => {
    // April only has 30 days
    expect(parseSobrietyStartDate('2024-04-31')).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/*  soberWholeDays                                                     */
/* ------------------------------------------------------------------ */
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

  it('returns null for null startedAt', () => {
    expect(soberWholeDays(null)).toBeNull()
  })

  it('returns null for undefined startedAt', () => {
    expect(soberWholeDays(undefined)).toBeNull()
  })

  it('returns null for empty string startedAt', () => {
    expect(soberWholeDays('')).toBeNull()
  })

  it('returns null for invalid date string', () => {
    expect(soberWholeDays('not-a-date')).toBeNull()
  })

  it('counts multiple days correctly', () => {
    const end = new Date(2024, 0, 10, 12, 0, 0) // Jan 10
    expect(soberWholeDays('2024-01-01', end)).toBe(9)
  })

  it('counts 365 days for a full year (non-leap)', () => {
    const end = new Date(2026, 0, 1, 12, 0, 0)
    expect(soberWholeDays('2025-01-01', end)).toBe(365)
  })

  it('counts 366 days for a full leap year', () => {
    const end = new Date(2025, 0, 1, 12, 0, 0)
    expect(soberWholeDays('2024-01-01', end)).toBe(366)
  })

  it('returns 0 when end date is before start date', () => {
    const end = new Date(2024, 0, 1, 12, 0, 0)
    expect(soberWholeDays('2024-06-01', end)).toBe(0)
  })

  it('returns null for invalid calendar date', () => {
    const end = new Date(2024, 5, 15, 12, 0, 0)
    expect(soberWholeDays('2024-02-30', end)).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/*  approximateYmdBreakdown                                            */
/* ------------------------------------------------------------------ */
describe('approximateYmdBreakdown', () => {
  it('returns all zeros for 0 days', () => {
    expect(approximateYmdBreakdown(0)).toEqual({ years: 0, months: 0, days: 0 })
  })

  it('returns 1 day for 1 total day', () => {
    expect(approximateYmdBreakdown(1)).toEqual({ years: 0, months: 0, days: 1 })
  })

  it('returns 1 month for 30 days', () => {
    expect(approximateYmdBreakdown(30)).toEqual({ years: 0, months: 1, days: 0 })
  })

  it('returns 1 year for 365 days', () => {
    expect(approximateYmdBreakdown(365)).toEqual({ years: 1, months: 0, days: 0 })
  })

  it('handles 100 days', () => {
    // 100 days = 0 years, 3 months (90 days), 10 days
    expect(approximateYmdBreakdown(100)).toEqual({ years: 0, months: 3, days: 10 })
  })

  it('handles 400 days', () => {
    // 400 days = 1 year (365) + 35 remaining = 1 month (30) + 5 days
    expect(approximateYmdBreakdown(400)).toEqual({ years: 1, months: 1, days: 5 })
  })

  it('handles 730 days (2 years)', () => {
    expect(approximateYmdBreakdown(730)).toEqual({ years: 2, months: 0, days: 0 })
  })

  it('handles 90 days (3 months)', () => {
    expect(approximateYmdBreakdown(90)).toEqual({ years: 0, months: 3, days: 0 })
  })

  it('handles 60 days (2 months)', () => {
    expect(approximateYmdBreakdown(60)).toEqual({ years: 0, months: 2, days: 0 })
  })

  it('handles 45 days', () => {
    // 45 = 1 month (30) + 15 days
    expect(approximateYmdBreakdown(45)).toEqual({ years: 0, months: 1, days: 15 })
  })
})

/* ------------------------------------------------------------------ */
/*  soberLiveDetail                                                    */
/* ------------------------------------------------------------------ */
describe('soberLiveDetail', () => {
  it('returns null for null startedAt', () => {
    expect(soberLiveDetail(null)).toBeNull()
  })

  it('returns null for undefined startedAt', () => {
    expect(soberLiveDetail(undefined)).toBeNull()
  })

  it('returns null for empty string startedAt', () => {
    expect(soberLiveDetail('')).toBeNull()
  })

  it('returns null for invalid date', () => {
    expect(soberLiveDetail('not-a-date')).toBeNull()
  })

  it('returns hours and minutes elapsed since start', () => {
    const start = '2024-01-01'
    const end = new Date(2024, 0, 1, 2, 30, 0)
    const result = soberLiveDetail(start, end)
    expect(result).toEqual({ hours: 2, minutes: 30 })
  })

  it('returns 0 hours and 0 minutes when end equals start midnight', () => {
    const start = '2024-06-15'
    const end = new Date(2024, 5, 15, 0, 0, 0)
    expect(soberLiveDetail(start, end)).toEqual({ hours: 0, minutes: 0 })
  })

  it('returns 0 hours and 0 minutes when end is before start', () => {
    const start = '2024-06-15'
    const end = new Date(2024, 0, 1, 0, 0, 0)
    expect(soberLiveDetail(start, end)).toEqual({ hours: 0, minutes: 0 })
  })

  it('computes 24 hours for exactly one day', () => {
    const start = '2024-01-01'
    const end = new Date(2024, 0, 2, 0, 0, 0)
    expect(soberLiveDetail(start, end)).toEqual({ hours: 24, minutes: 0 })
  })

  it('computes large hour counts for multi-day spans', () => {
    // 2 days + 3 hours + 45 minutes = 51 hours 45 minutes
    const start = '2024-01-01'
    const end = new Date(2024, 0, 3, 3, 45, 0)
    expect(soberLiveDetail(start, end)).toEqual({ hours: 51, minutes: 45 })
  })
})
