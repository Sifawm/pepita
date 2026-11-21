import { logicalDay, periodOf, addDays } from './calendar'
import { evaluateHabit, type PeriodStatus } from './evaluation'
import type { Settings, Day, Habit, Log } from './types'

export interface CalendarDay {
  day: Day
  /** The habit's logs on that day, oldest to newest. */
  logs: Log[]
  /** Status of the period containing the day; missing before the start and after today. */
  status?: PeriodStatus
  /** `start` of the period containing the day (what a FailureNote stores); missing like `status`. */
  period?: Day
  /** Can be logged, fixed or undone: any day from the start up to today. */
  editable: boolean
}

export interface CalendarRange {
  start: Day
  end: Day
  days: CalendarDay[]
}

/** The calendar month containing `month`, day by day. Edit a log and call it again to recompute everything. */
export function habitCalendar({ month, ...input }: Input & { month: Day }): CalendarRange {
  return daysBetween(input, periodOf(month, 'month'))
}

/**
 * At most `weeks` whole weeks (Monday to Sunday) ending on today's week, day by day: the heat
 * map. Doesn't start before the start week (empty if the habit hasn't started yet).
 */
export function heatmap({ weeks, ...input }: Input & { weeks: number }): CalendarRange {
  const { end } = periodOf(logicalDay(input.now, input.settings.dayCutoff), 'week')
  const start = addDays(end, 1 - 7 * weeks)
  const habitStart = periodOf(input.habit.startDate, 'week').start
  return daysBetween(input, { start: start > habitStart ? start : habitStart, end })
}

interface Input {
  habit: Habit
  logs: Log[]
  now: Date
  settings: Settings
}

function daysBetween({ habit, logs, now, settings }: Input, { start, end }: { start: Day; end: Day }): CalendarRange {
  const today = logicalDay(now, settings.dayCutoff)
  const { periods } = evaluateHabit({ habit, logs, now, settings })
  const own = logs.filter((l) => l.habitId === habit.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const days: CalendarDay[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const editable = day >= habit.startDate && day <= today
    // The first period may start before the start date (calendar week): there's no status before the start.
    const period = editable ? periods.find((p) => p.start <= day && day <= p.end) : undefined
    days.push({ day, logs: own.filter((l) => l.day === day), status: period?.status, period: period?.start, editable })
  }
  return { start, end, days }
}
