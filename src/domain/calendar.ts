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

// Day arithmetic on `YYYY-MM-DD` in UTC: no time zones or DST changes.
const toDate = (day: Day) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const fromDate = (date: Date): Day => date.toISOString().slice(0, 10)

export function addDays(day: Day, days: number): Day {
  const date = toDate(day)
  date.setUTCDate(date.getUTCDate() + days)
  return fromDate(date)
}

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
