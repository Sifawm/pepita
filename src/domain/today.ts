import { logicalDay } from './calendar'
import { isVote, evaluateHabit, type Period, type Streak } from './evaluation'
import { intentionPhrase, sortByTime, type IntentionPhrase } from './intention'
import { pauseOn, globalPauseOn } from './pause'
import type { Settings, Day, Habit, Identity, New, Pause, Log } from './types'

export interface TodayCard {
  habit: Habit
  identity: Identity
  /** The habit's logs (minimum, full or value) on the current logical day, oldest to newest. */
  logs: Log[]
  /** Already done today: one more tap undoes the day's last log. For a quantitative habit, the period is already met. */
  done: boolean
  /** Votes this habit has added today. */
  votesToday: number
  /** The current period, with its progress ("2 of 3"). */
  period: Period
  /** The skip that makes the current period neutral (to undo it). */
  skip?: Log
  /** The pause (the habit's or the global one) it's in today. */
  pause?: Pause
  /** Habit to avoid: the relapses of the current logical day (the last one, to undo it). */
  relapses: Log[]
  /** The previous period was a failure: goes to the very top and suggests the minimum version. */
  recovering: boolean
  streak: Streak
  /** "After…, at…: …", if it has a when or a where. */
  phrase?: IntentionPhrase
}

export interface Today {
  day: Day
  /** Votes added today: +1 for each minimum or full version log and for each quantitative period met today. */
  votes: number
  habits: TodayCard[]
  /** The global pause, if it covers today. */
  globalPause?: Pause
}

interface Context {
  now: Date
  settings: Settings
}

const logsOfDay = (logs: Log[], habitId: string, day: Day) =>
  logs
    .filter((l) => l.habitId === habitId && l.day === day && (isVote(l) || l.type === 'value'))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

/** Logs a day accepts through taps: `times` if the period is the day; otherwise, one. */
const doneToday = ({ frequency: f }: Habit, dayLogs: Log[]) =>
  dayLogs.length >= (f.type === 'times_per_period' && f.period === 'day' ? f.times : 1)

export function buildToday({
  habits,
  identities,
  logs,
  now,
  settings,
  identityId,
}: Context & {
  habits: Habit[]
  identities: Identity[]
  logs: Log[]
  /** Filter: only this identity's habits (and their votes). */
  identityId?: string
}): Today {
  const day = logicalDay(now, settings.dayCutoff)
  // Every habit's logs, split once: not a pass over every log per habit.
  const byHabit = Map.groupBy(logs, (l) => l.habitId)
  const all = habits
    .filter((h) => !h.archived && (!identityId || h.identityId === identityId))
    .flatMap((habit) => {
      const identity = identities.find((i) => i.id === habit.identityId)
      // Archiving an identity removes its habits from Today without touching them.
      if (!identity || identity.archived) return []
      const { current: period, recovering, streak, voteDays } = evaluateHabit({ habit, logs, now, settings })
      // No period: it hasn't started yet; not scheduled: not due today.
      if (!period || period.status === 'not_scheduled') return []
      const mine = byHabit.get(habit.id) ?? []
      const own = logsOfDay(mine, habit.id, day)
      const skip = period.status === 'skipped' ? mine.findLast((l) => l.type === 'skip' && l.day >= period.start && l.day <= period.end) : undefined
      return [
        {
          habit,
          identity,
          logs: own,
          done: habit.type === 'quantitative' ? period.status.startsWith('done') : doneToday(habit, own),
          votesToday: voteDays.filter((d) => d === day).length,
          period,
          skip,
          pause: pauseOn(habit, settings, day),
          relapses: mine.filter((l) => l.day === day && l.type === 'relapse'),
          recovering,
          streak,
          phrase: intentionPhrase(habit, habits),
        },
      ]
    })
  // Recovering ones first; within each group, by time with their chains.
  const cards = [true, false].flatMap((r) => sortByTime(all.filter((c) => c.recovering === r), habits))
  return {
    day,
    votes: cards.reduce((n, c) => n + c.votesToday, 0),
    habits: cards,
    globalPause: globalPauseOn(settings, day),
  }
}

export type TapAction = { type: 'log'; log: New<Log> } | { type: 'undo'; logId: string }

/**
 * A tap logs the minimum version; a long press, the full one (`version`).
 * On a habit already done today, it undoes the day's last log.
 */
export function tap({
  habit,
  logs,
  now,
  settings,
  version = 'minimum',
}: Context & { habit: Habit; logs: Log[]; version?: 'minimum' | 'full' }): TapAction {
  const day = logicalDay(now, settings.dayCutoff)
  const own = logsOfDay(logs, habit.id, day)
  if (doneToday(habit, own)) return { type: 'undo', logId: own[own.length - 1].id }
  return { type: 'log', log: { habitId: habit.id, day, type: version } }
}

/**
 * Adds an amount to a quantitative habit on the logical day. `vote`: it meets the period
 * (to celebrate it); never with "at most", because that's met at close.
 */
export function addValue({
  habit,
  logs,
  value,
  now,
  settings,
}: Context & { habit: Habit; logs: Log[]; value: number }): { log: New<Log>; vote: boolean } {
  const log: New<Log> = { habitId: habit.id, day: logicalDay(now, settings.dayCutoff), type: 'value', value }
  const before = evaluateHabit({ habit, logs, now, settings }).votes
  const withLog = [...logs, { ...log, id: '', createdAt: now.toISOString() }]
  return { log, vote: evaluateHabit({ habit, logs: withLog, now, settings }).votes > before }
}

/** Sets (or removes, if empty) the optional note of any log. */
export function annotate(log: Log, text: string): Log {
  const annotated: Log = { ...log, note: text.trim() }
  if (!annotated.note) delete annotated.note
  return annotated
}

/**
 * Skip a period: a neutral log, with a reason if given. On the logical day (the current
 * period) or on `day` (fixing the past from the calendar).
 */
export function skip({ habit, reason, day, now, settings }: Context & { habit: Habit; reason?: string; day?: Day }): New<Log> {
  const text = reason?.trim()
  return {
    habitId: habit.id,
    day: day ?? logicalDay(now, settings.dayCutoff),
    type: 'skip',
    ...(text ? { reason: text } : {}),
  }
}

/** "I relapsed" (habit to avoid): a log on the logical day (or on `day`, from the calendar), with its trigger if given. */
export function relapse({ habit, trigger, day, now, settings }: Context & { habit: Habit; trigger?: string; day?: Day }): New<Log> {
  const text = trigger?.trim()
  return {
    habitId: habit.id,
    day: day ?? logicalDay(now, settings.dayCutoff),
    type: 'relapse',
    ...(text ? { trigger: text } : {}),
  }
}
