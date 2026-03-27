/** Calendar day length; used only after anchoring both instants to local midnight. */
const MS_PER_DAY = 86_400_000

/**
 * Local midnight for the given instant (start of that calendar day in the local zone).
 */
export function atLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
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

/** Rough years / months / remainder days for display (not for legal or medical precision). */
export function approximateYmdBreakdown(totalDays: number): {
  years: number
  months: number
  days: number
} {
  const years = Math.floor(totalDays / 365)
  let remainder = totalDays - years * 365
  const months = Math.floor(remainder / 30)
  remainder -= months * 30
  return { years, months, days: remainder }
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
