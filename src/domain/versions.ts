import { addDays } from './calendar'
import { evaluateHabit } from './evaluation'
import type { Settings, Day, Habit, Rule } from './types'

/** The rule that applies on `day` and the range of days it applies to (`start`/`end` unbounded if missing). */
export function ruleOn(habit: Habit, day: Day): Rule & { start?: Day; end?: Day } {
  const versions = habit.versions ?? []
  const i = versions.findIndex((v) => day <= v.until)
  const previous = versions[i === -1 ? versions.length - 1 : i - 1]
  const start = previous && addDays(previous.until, 1)
  if (i === -1) return { frequency: habit.frequency, quantitative: habit.quantitative, start }
  const { until, ...rule } = versions[i]
  return { ...rule, start, end: until }
}

/**
 * Changes the rule from the current period on: already-closed periods keep being evaluated
 * with the rule that applied then. If no period has closed yet under the current rule, it replaces it.
 */
export function changeRule({ habit, rule, now, settings }: { habit: Habit; rule: Rule; now: Date; settings: Settings }): Habit {
  const current = evaluateHabit({ habit, logs: [], now, settings }).current
  const last = habit.versions?.at(-1)
  const start = last ? addDays(last.until, 1) : habit.startDate
  const changed = { ...habit, ...rule }
  if (!current || current.start <= start) return changed
  const previous = { frequency: habit.frequency, ...(habit.quantitative && { quantitative: habit.quantitative }) }
  return { ...changed, versions: [...(habit.versions ?? []), { ...previous, until: addDays(current.start, -1) }] }
}
