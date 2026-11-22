import { weekday, logicalDay, periodOf, addDays } from './calendar'
import type { Settings, Day, Frequency, Habit, Pause, Log, Rule } from './types'
import { strengthSeries, type StrengthPoint } from './strength'
import { ruleOn } from './versions'

export type PeriodStatus =
  | 'done_minimum'
  | 'done_full'
  | 'failed'
  | 'skipped'
  | 'paused'
  | 'in_progress'
  | 'not_scheduled'

export interface Period {
  start: Day
  end: Day
  /** Logs it needs to be met (0 if not scheduled); for a quantitative habit, its target. */
  required: number
  /** Logs made within the period; for a quantitative habit, the sum of its values. */
  progress: number
  status: PeriodStatus
}

export interface HabitEvaluation {
  /** From the one containing `startDate` to the one containing today, in order. */
  periods: Period[]
  /** The period containing today; missing if the habit hasn't started yet. */
  current?: Period
  /** `yes_no`: one vote per log, also on unscheduled days; `quantitative`: one per period met; `avoid`: one per clean day already closed. Equals `voteDays.length`. */
  votes: number
  /**
   * The day each vote was earned, in order: the core's single source of votes (identity
   * summary, curve, milestones). A new type (quantitative, avoid) changes here how votes are earned.
   */
  voteDays: Day[]
  /** In periods. A single failure neither adds nor breaks it; the second in a row resets it to 0. */
  streak: Streak
  /** The last closed, evaluable period was a failure, and the current one can still be met. */
  recovering: boolean
  /** Trailing consecutive failures (skips, pauses and unscheduled days don't break the run). */
  consecutiveFailures: number
  /** Every period that broke the streak: the second failure of each run, one per break. */
  streakBreaks: Period[]
  /** One point per day from `startDate` to today (empty if it hasn't started yet). */
  strength: StrengthPoint[]
  /** Periods met with the minimum and with the full version (for a quantitative habit, the minimum target or the full one). */
  ratio: { minimum: number; full: number }
}

export interface Streak {
  current: number
  best: number
}

/** The period containing `day` and what it requires according to the frequency. When avoiding, always the day. */
function periodContaining(day: Day, frequency: Frequency, habit: Habit) {
  if (habit.type === 'avoid') return { start: day, end: day, required: 1 }
  if (frequency.type === 'weekdays')
    return { start: day, end: day, required: frequency.days.includes(weekday(day)) ? 1 : 0 }
  return { ...periodOf(day, frequency.period), required: frequency.times }
}

/** "Never miss twice": the consecutive failure that breaks the streak (and opens the diagnosis). */
const FAILURES_TO_BREAK = 2

/** A frequency's period unit: specific weekdays are one-day periods. */
export const periodUnit = (f: Frequency) => (f.type === 'times_per_period' ? f.period : 'day')

/** Logs that count as done (and as a vote): a skip doesn't. */
export const isVote = (l: Log) => l.type === 'minimum' || l.type === 'full'

/** The pauses that apply to the habit: its own and the global one. */
export const pausesOf = (habit: Habit, settings: Settings): Pause[] => [
  ...(habit.pauses ?? []),
  ...(settings.globalPause ? [settings.globalPause] : []),
]

/** Sum of the values (quantitative habits). */
const sum = (logs: Log[]) => logs.reduce((n, l) => n + (l.type === 'value' ? (l.value ?? 0) : 0), 0)

/** Whether the period is already met and with which version, according to the habit type and its rule. */
function met(required: number, logs: Log[], { quantitative: q }: Rule, closed: boolean): PeriodStatus | undefined {
  if (q) {
    const total = sum(logs)
    // "At most": the excess is logged, not the success; that's why it's only known at close.
    if (q.mode === 'at_most') return closed && total <= q.target ? 'done_full' : undefined
    if (total >= q.target) return 'done_full'
    return q.minTarget !== undefined && total >= q.minTarget ? 'done_minimum' : undefined
  }
  const done = logs.filter(isVote)
  if (done.length < required) return undefined
  return done.every((l) => l.type === 'full') ? 'done_full' : 'done_minimum'
}

function status(habit: Habit, required: number, logs: Log[], rule: Rule, { start, end }: Pause, pauses: Pause[], today: Day): PeriodStatus {
  if (required === 0) return 'not_scheduled'
  if (habit.type === 'avoid') {
    // A skipped or paused day isn't evaluated: it neither counts as clean nor fails on a relapse.
    if (logs.some((l) => l.type === 'skip')) return 'skipped'
    if (pauses.some((p) => p.start <= start && p.end >= start)) return 'paused'
    // A relapse fails on the spot; clean is only met when the day closes.
    if (logs.some((l) => l.type === 'relapse')) return 'failed'
    return end < today ? 'done_full' : 'in_progress'
  }
  // Meeting it beats skipping or pausing: what's done is done.
  const done = met(required, logs, rule, end < today)
  if (done) return done
  if (logs.some((l) => l.type === 'skip')) return 'skipped'
  // One paused day (already reached) is enough for the period not to fail: Pepita never blames.
  const reached = end < today ? end : today
  if (pauses.some((p) => p.start <= reached && p.end >= start)) return 'paused'
  // Unmet is only a failure once the period has closed.
  return end < today ? 'failed' : 'in_progress'
}

/**
 * Today, the identity summary, the suggestions and the diagnoses each evaluate every habit, on every render and data change.
 * Each habit's last evaluation is reused while everything it reads stays the same, so a tap recomputes only the habit tapped.
 */
const lastEvaluation = new Map<string, { key: string; evaluation: HabitEvaluation }>()

/**
 * Each logs array (one per query result, never changed in place) split by habit once, with what the evaluation
 * reads of each habit's logs: the callers sharing a render don't filter every log again per habit.
 */
const splitLogs = new WeakMap<Log[], Map<string, { own: Log[]; read: string }>>()
function ownLogs(logs: Log[], habitId: string) {
  let split = splitLogs.get(logs)
  if (!split) {
    split = new Map([...Map.groupBy(logs, (l) => l.habitId)].map(([id, own]) => [id, { own, read: JSON.stringify(own.map((l) => [l.day, l.type, l.value])) }]))
    splitLogs.set(logs, split)
  }
  return split.get(habitId) ?? { own: [], read: '[]' }
}

export function evaluateHabit({
  habit,
  logs,
  now,
  settings,
}: {
  habit: Habit
  logs: Log[]
  now: Date
  settings: Settings
}): HabitEvaluation {
  const today = logicalDay(now, settings.dayCutoff)
  const { own, read } = ownLogs(logs, habit.id)
  // What the evaluation reads: the logical day, the global pause, the habit (rules, pauses) and the fields of its own logs.
  const key = JSON.stringify([today, settings.globalPause, habit]) + read
  const last = lastEvaluation.get(habit.id)
  if (last?.key === key) return last.evaluation
  // Periods come in day order and never overlap: one cursor over the logs sorted once fills them all
  // (a filter per period would cost days × logs: seconds per tap after a few years).
  const byDay = own.toSorted((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  let cursor = 0
  const pauses = pausesOf(habit, settings)
  const periods: Period[] = []
  for (let day = habit.startDate; day <= today; ) {
    // Each period is evaluated with the rule that applied then, clipped to its validity range.
    const rule = ruleOn(habit, day)
    const period = periodContaining(day, rule.frequency, habit)
    const start = rule.start && period.start < rule.start ? rule.start : period.start
    const end = rule.end && rule.end < period.end ? rule.end : period.end
    const q = rule.quantitative
    // A quantitative habit requires its target (`times` don't count: the frequency only sets the period).
    const required = q && period.required > 0 ? q.target : period.required
    while (cursor < byDay.length && byDay[cursor].day < start) cursor++
    const first = cursor
    while (cursor < byDay.length && byDay[cursor].day <= end) cursor++
    const inside = byDay.slice(first, cursor)
    const progress = q ? sum(inside) : inside.filter(isVote).length
    periods.push({ start, end, required, progress, status: status(habit, required, inside, rule, { start, end }, pauses, today) })
    day = addDays(end, 1)
  }
  // `yes_no`: 1 vote per log; `quantitative`: 1 per period met, on the day it was earned;
  // `avoid`: the clean (already closed) day, not a log.
  const voteDays = (
    habit.type === 'quantitative'
      ? quantitativeVoteDays(periods, own, habit)
      : habit.type === 'avoid'
        ? periods.filter(isMet).map((p) => p.start)
        : own.filter(isVote).map((l) => l.day)
  ).sort()
  const evaluation: HabitEvaluation = {
    periods,
    current: periods.at(-1),
    votes: voteDays.length,
    voteDays,
    ...streak(periods),
    strength: strengthSeries(habit, own, periods, today),
    ratio: {
      minimum: periods.filter((p) => p.status === 'done_minimum').length,
      full: periods.filter((p) => p.status === 'done_full').length,
    },
  }
  lastEvaluation.set(habit.id, { key, evaluation })
  return evaluation
}

/**
 * The day each met quantitative period earned its vote: with "at least", the day of the log with
 * which the sum reached the first threshold (minimum or target); with "at most", its last day (earned at close).
 */
function quantitativeVoteDays(periods: Period[], logs: Log[], habit: Habit): Day[] {
  return periods.filter(isMet).map(({ start, end }) => {
    const q = ruleOn(habit, start).quantitative
    if (!q || q.mode === 'at_most') return end
    const threshold = q.minTarget ?? q.target
    let total = 0
    const values = logs.filter((l) => l.type === 'value' && l.day >= start && l.day <= end).sort((a, b) => a.day.localeCompare(b.day))
    return values.find((l) => (total += l.value ?? 0) >= threshold)?.day ?? end
  })
}

const isMet = (p: Period) => p.status === 'done_minimum' || p.status === 'done_full'

/** Streak, recovery and consecutive failures. Only met or failed periods count. */
function streak(periods: Period[]) {
  let current = 0
  let best = 0
  let consecutiveFailures = 0
  let failuresBeforeToday = 0
  const streakBreaks: Period[] = []
  periods.forEach((p, i) => {
    if (i === periods.length - 1) failuresBeforeToday = consecutiveFailures
    if (isMet(p)) {
      consecutiveFailures = 0
      best = Math.max(best, ++current)
    } else if (p.status === 'failed' && ++consecutiveFailures === FAILURES_TO_BREAK) {
      current = 0
      streakBreaks.push(p)
    }
  })
  const today = periods.at(-1)?.status
  const evaluable = today === 'in_progress' || today === 'done_minimum' || today === 'done_full'
  return { streak: { current, best }, recovering: evaluable && failuresBeforeToday > 0, consecutiveFailures, streakBreaks }
}
