import { addDays } from './calendar'
import { isVote, type Period } from './evaluation'
import type { Day, Habit, Log, Rule } from './types'
import { ruleOn } from './versions'

export interface StrengthPoint {
  day: Day
  /** From 0 to 1. */
  value: number
}

const PERIOD_DAYS = { day: 1, week: 7, month: 30 }
/** The widest window any rule can ask for. */
const MAX_WINDOW = Math.max(...Object.values(PERIOD_DAYS))

/** Calibration (Loop Habit Tracker's): the higher it is, the slower strength rises and falls. */
const STRENGTH_SMOOTHING = 13

/** The window each day looks at (its days) and how many times it requires within it; `f = times / days`. */
function window(habit: Habit, { frequency: f, quantitative: q }: Rule) {
  if (habit.type === 'avoid') return { days: 1, times: 1 }
  if (f.type === 'weekdays') return { days: 7, times: f.days.length }
  // A quantitative habit requires its target once per period (`times` don't count).
  return { days: PERIOD_DAYS[f.period], times: q ? 1 : f.times }
}

/** Completion (0 to 1) of the logs in the window ending on the day. */
function completion(habit: Habit, { quantitative: q }: Rule, times: number, logs: Log[]) {
  if (habit.type === 'avoid') return logs.some((l) => l.type === 'relapse') ? 0 : 1
  if (!q) return Math.min(1, logs.filter(isVote).length / times)
  const target = q.target * times
  const total = logs.reduce((n, l) => n + (l.type === 'value' ? (l.value ?? 0) : 0), 0)
  const v = q.mode === 'at_most' ? 1 - (total - target) / target : total / target
  return Math.min(1, Math.max(0, v))
}

/**
 * Day-by-day strength from `startDate` to today (Loop's formula): `m = 0.5^(√f/STRENGTH_SMOOTHING)` and each day
 * `strength = strength·m + v·(1 − m)`, with `v` the completion in the window of the period ending that day.
 * Forgives isolated failures.
 */
export function strengthSeries(habit: Habit, logs: Log[], periods: Period[], today: Day): StrengthPoint[] {
  const byDay = Map.groupBy(logs, (l) => l.day)
  // The last MAX_WINDOW days' logs, newest first: it slides one day per step instead of rebuilding every window from dates.
  const recent = Array.from({ length: MAX_WINDOW - 1 }, (_, d) => byDay.get(addDays(habit.startDate, d - MAX_WINDOW + 1)) ?? []).reverse()
  const series: StrengthPoint[] = []
  let value = 0
  let i = 0
  for (let day = habit.startDate; day <= today; day = addDays(day, 1)) {
    recent.unshift(byDay.get(day) ?? [])
    recent.length = MAX_WINDOW
    while (periods[i].end < day) i++
    const { status } = periods[i]
    const rule = ruleOn(habit, day)
    // When avoiding and with "at most", success is only known at close: an open period doesn't count yet.
    const atClose = habit.type === 'avoid' || rule.quantitative?.mode === 'at_most'
    // Skipping or pausing is neutral: strength doesn't change.
    if (status !== 'skipped' && status !== 'paused' && !(atClose && status === 'in_progress')) {
      const { days, times } = window(habit, rule)
      const inside = recent.slice(0, days).flat()
      const m = 0.5 ** (Math.sqrt(times / days) / STRENGTH_SMOOTHING)
      const next = value * m + completion(habit, rule, times, inside) * (1 - m)
      // A still-open period can raise it, but not lower it: there's still time to meet it.
      if (status !== 'in_progress' || next > value) value = next
    }
    series.push({ day, value })
  }
  return series
}
