import type { Day, Time, Weekday } from './types'

/** Local date of `date` as `YYYY-MM-DD`. */
export function formatDay(date: Date): Day {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

/**
 * Logical day: `date(instant − dayCutoff)`, in local time.
 * With the cutoff at 04:00, 01:00 still belongs to the previous day.
 */
export function logicalDay(instant: Date, dayCutoff: Time): Day {
  const [h, min] = dayCutoff.split(':').map(Number)
  // Subtracting on the local fields avoids odd jumps around DST changes.
  const shifted = new Date(
    instant.getFullYear(),
    instant.getMonth(),
    instant.getDate(),
    instant.getHours() - h,
    instant.getMinutes() - min,
  )
  return formatDay(shifted)
}

/**
 * The next instant the logical day changes: today's periods close then (and failures and
 * diagnoses may appear with them). Used to re-evaluate while the app is open.
 */
export function nextCutoff(now: Date, dayCutoff: Time): Date {
  const [h, min] = dayCutoff.split(':').map(Number)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min)
  return today > now ? today : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, min)
}

// Day arithmetic on `YYYY-MM-DD` in UTC: no time zones or DST changes. Hot path (every evaluation walks
// each day of a habit's life), so no split or toISOString: Date.UTC rolls `plus` over months and years.
const toDate = (day: Day, plus = 0) => new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10) + plus))
const pad = (n: number) => String(n).padStart(2, '0')
const fromDate = (date: Date): Day => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

export const addDays = (day: Day, days: number): Day => fromDate(toDate(day, days))

/** 1 = Monday … 7 = Sunday. */
export const weekday = (day: Day) => (((toDate(day).getUTCDay() + 6) % 7) + 1) as Weekday

/** The day, week (Monday to Sunday) or calendar month containing `day`. */
export function periodOf(day: Day, period: 'day' | 'week' | 'month'): { start: Day; end: Day } {
  if (period === 'day') return { start: day, end: day }
  if (period === 'week') {
    const start = addDays(day, 1 - weekday(day))
    return { start, end: addDays(start, 6) }
  }
  const [y, m] = day.split('-').map(Number)
  return { start: `${day.slice(0, 7)}-01`, end: fromDate(new Date(Date.UTC(y, m, 0))) }
}
