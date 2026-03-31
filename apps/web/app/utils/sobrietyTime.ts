/** Calendar day length; used only after anchoring both instants to local midnight. */
const MS_PER_DAY = 86_400_000

export interface SobrietyBreakdown {
  years: number
  months: number
  days: number
}

/**
 * Local midnight for the given instant (start of that calendar day in the local zone).
 */
export function atLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function formatLocalDateInputValue(d: Date): string {
  const localMidnight = atLocalMidnight(d)
  return `${localMidnight.getFullYear()}-${String(localMidnight.getMonth() + 1).padStart(2, '0')}-${String(localMidnight.getDate()).padStart(2, '0')}`
}

/**
 * Parse sobriety start date. API stores `YYYY-MM-DD`; interpret as that calendar day in the
 * user's local timezone (not UTC midnight from `Date.parse`).
 */
export function parseSobrietyStartDate(iso: string): Date | null {
  const trimmed = iso.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (m) {
    const y = Number(m[1])
    const monthIndex = Number(m[2]) - 1
    const day = Number(m[3])
    const d = new Date(y, monthIndex, day)
    if (d.getFullYear() !== y || d.getMonth() !== monthIndex || d.getDate() !== day) {
      return null
    }
    return d
  }
  const fallback = new Date(trimmed)
  if (Number.isNaN(fallback.getTime())) return null
  return atLocalMidnight(fallback)
}

/**
 * Whole calendar days from the sobriety start date through the end date (local dates).
 * Uses `Math.round(ms / MS_PER_DAY)` so a 23h or 25h wall-time gap between local midnights
 * (DST) still counts as one day; `Math.floor` would undercount across spring-forward.
 */
export function soberWholeDays(
  startedAt: string | null | undefined,
  end: Date = new Date(),
): number | null {
  if (startedAt == null || startedAt === '') return null
  const startDay = parseSobrietyStartDate(startedAt)
  if (!startDay) return null
  const endDay = atLocalMidnight(end)
  const ms = endDay.getTime() - startDay.getTime()
  return Math.max(0, Math.round(ms / MS_PER_DAY))
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Exact calendar years / months / days between the start date and the local end date. */
export function soberYmdBreakdown(
  startedAt: string | null | undefined,
  end: Date = new Date(),
): SobrietyBreakdown | null {
  if (startedAt == null || startedAt === '') return null
  const startDay = parseSobrietyStartDate(startedAt)
  if (!startDay) return null

  const endDay = atLocalMidnight(end)
  if (startDay.getTime() > endDay.getTime()) return null

  let years = endDay.getFullYear() - startDay.getFullYear()
  let months = endDay.getMonth() - startDay.getMonth()
  let days = endDay.getDate() - startDay.getDate()

  if (days < 0) {
    const previousMonthIndex = (endDay.getMonth() + 11) % 12
    const previousMonthYear =
      previousMonthIndex === 11 ? endDay.getFullYear() - 1 : endDay.getFullYear()
    days += daysInMonth(previousMonthYear, previousMonthIndex)
    months -= 1
  }

  if (months < 0) {
    months += 12
    years -= 1
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  }
}

function formatUnit(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

export function formatSobrietyBreakdown(breakdown: SobrietyBreakdown): string {
  return [
    formatUnit(breakdown.years, 'year'),
    formatUnit(breakdown.months, 'month'),
    formatUnit(breakdown.days, 'day'),
  ].join(', ')
}

/**
 * Elapsed hours and minutes since local midnight on the sobriety start date (private dashboard).
 */
export function soberLiveDetail(
  startedAt: string | null | undefined,
  end: Date = new Date(),
): { hours: number; minutes: number } | null {
  if (startedAt == null || startedAt === '') return null
  const startMidnight = parseSobrietyStartDate(startedAt)
  if (!startMidnight) return null
  let ms = end.getTime() - startMidnight.getTime()
  if (ms < 0) ms = 0
  const totalMinutes = Math.floor(ms / 60_000)
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}
