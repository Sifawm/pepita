import { logicalDay, addDays } from './calendar'
import { pausesOf } from './evaluation'
import type { Settings, Day, Habit, Pause } from './types'

interface Context {
  now: Date
  settings: Settings
}

const contains = (p: Pause, day: Day) => p.start <= day && day <= p.end

/** The pause (the habit's or the global one) covering `day`, if any. */
export const pauseOn = (habit: Habit, settings: Settings, day: Day) => pausesOf(habit, settings).find((p) => contains(p, day))

/** The global one, only while it lasts: after `end` it stops applying on its own. */
export const globalPauseOn = (settings: Settings, day: Day) =>
  settings.globalPause && contains(settings.globalPause, day) ? settings.globalPause : undefined

/** If the pause covers today, it ends yesterday (or disappears if it started today); otherwise it stays as is. */
function endYesterday(p: Pause, today: Day): Pause | undefined {
  if (!contains(p, today)) return p
  const yesterday = addDays(today, -1)
  return p.start > yesterday ? undefined : { ...p, end: yesterday }
}

export const pauseHabit = (habit: Habit, pause: Pause): Habit => ({
  ...habit,
  pauses: [...(habit.pauses ?? []), pause],
})

/**
 * Calibration: how long the one-tap pause offered by the 4th-law diagnosis lasts. The
 * spec doesn't set the duration; a week gives room without the habit being forgotten. Tune it with use.
 */
export const DIAGNOSIS_PAUSE_DAYS = 7

/** "Pause" from the diagnosis: `DIAGNOSIS_PAUSE_DAYS` days starting today (inclusive). */
export function diagnosisPause({ habit, now, settings }: Context & { habit: Habit }): Habit {
  const today = logicalDay(now, settings.dayCutoff)
  return pauseHabit(habit, { start: today, end: addDays(today, DIAGNOSIS_PAUSE_DAYS - 1) })
}

/** Resume today: the ongoing pause ends yesterday; past and future ones stay. */
export function resumeHabit(habit: Habit, now: Date, settings: Settings): Habit {
  const today = logicalDay(now, settings.dayCutoff)
  return { ...habit, pauses: (habit.pauses ?? []).flatMap((p) => endYesterday(p, today) ?? []) }
}

/**
 * Global pause from today until `end`. Only one fits: the previous one is copied into the pauses of
 * each habit (`habits` = the ones that change) so their days still don't count as failures.
 */
export function startGlobalPause({ habits, end, now, settings }: Context & { habits: Habit[]; end: Day }) {
  const today = logicalDay(now, settings.dayCutoff)
  const previous = settings.globalPause && endYesterday(settings.globalPause, today)
  return {
    globalPause: { start: today, end },
    habits: previous ? habits.map((h) => pauseHabit(h, previous)) : [],
  }
}

/** End the vacation today: the new value of `globalPause` (what's already paused is kept). */
export function endGlobalPause({ now, settings }: Context): Pause | undefined {
  return settings.globalPause && endYesterday(settings.globalPause, logicalDay(now, settings.dayCutoff))
}
