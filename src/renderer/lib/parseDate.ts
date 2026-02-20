import { format, addDays, addWeeks, isValid } from 'date-fns'

/**
 * Parses a human-readable date string into a yyyy-MM-dd string.
 * Returns null if the input is not recognised.
 *
 * @param input  The raw text to parse (case-insensitive)
 * @param now    Reference date (defaults to new Date()). Pass a fixed date in tests.
 */
export function parseRelativeDate(input: string, now: Date = new Date()): string | null {
  const raw = input.trim().toLowerCase()
  if (!raw) return null

  // ── today / tomorrow ────────────────────────────────────────────────────────
  if (raw === 'today') return format(now, 'yyyy-MM-dd')
  if (raw === 'tomorrow' || raw === 'tom') return format(addDays(now, 1), 'yyyy-MM-dd')

  // ── weekday names ────────────────────────────────────────────────────────────
  // "next occurrence" always means strictly future (never today)
  const WEEKDAYS: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  }
  if (raw in WEEKDAYS) {
    const target = WEEKDAYS[raw]
    const todayDow = now.getDay() // 0=Sun … 6=Sat
    // Days until target: at least 1 (never 0 = today)
    let daysAhead = target - todayDow
    if (daysAhead <= 0) daysAhead += 7
    return format(addDays(now, daysAhead), 'yyyy-MM-dd')
  }

  // ── relative offsets: Nd / Nday / Ndays / Nw / Nweek / Nweeks ───────────────
  const relMatch = raw.match(/^(\d+)(d|day|days|w|week|weeks)$/)
  if (relMatch) {
    const n = parseInt(relMatch[1], 10)
    const unit = relMatch[2]
    if (unit === 'w' || unit === 'week' || unit === 'weeks') {
      return format(addWeeks(now, n), 'yyyy-MM-dd')
    }
    return format(addDays(now, n), 'yyyy-MM-dd')
  }

  // ── exact ISO / slash dates: yyyy-MM-dd or yyyy/MM/dd ───────────────────────
  const isoMatch = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00.000Z`)
    if (!isValid(d)) return null
    // Verify that month/day round-trips (catches month 13, day 32, etc.)
    if (
      d.getUTCMonth() + 1 !== parseInt(isoMatch[2], 10) ||
      d.getUTCDate() !== parseInt(isoMatch[3], 10)
    ) return null
    return format(d, 'yyyy-MM-dd')
  }

  // ── month+day: mar15 / mar 15 / march15 / march 15 ──────────────────────────
  const MONTHS: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  }

  const monthDayMatch = raw.match(/^([a-z]+)\s*(\d{1,2})$/)
  if (monthDayMatch) {
    const monthName = monthDayMatch[1]
    const day = parseInt(monthDayMatch[2], 10)
    const month = MONTHS[monthName]
    if (!month) return null

    const year = now.getFullYear()
    // Build candidate date in local time (use UTC noon to avoid DST shifts)
    const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    if (!isValid(candidate) || candidate.getUTCDate() !== day) return null

    // Build "today at noon UTC" for comparison
    const todayNoon = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0))

    if (candidate <= todayNoon) {
      // Date has already passed (or is today) → use next year
      return format(new Date(Date.UTC(year + 1, month - 1, day, 12, 0, 0)), 'yyyy-MM-dd')
    }
    return format(candidate, 'yyyy-MM-dd')
  }

  return null
}
