import { logicalDay, addDays } from './calendar'
import { evaluateHabit, type PeriodStatus } from './evaluation'
import type { Settings, Diagnosis, Habit, Law, New, Log, Rule, DismissedSuggestion, SuggestionType } from './types'

// Calibration (Goldilocks): tunable.
/** Strength from which the habit is settled (a perfect daily habit reaches it around day 30). */
export const HIGH_STRENGTH_THRESHOLD = 0.8
/** Consecutive days of high strength before suggesting to raise the bar (about 3 weeks). */
export const HIGH_STRENGTH_DAYS = 21

/** Days a dismissed (or applied) suggestion doesn't show up again. */
export const SUGGESTION_SNOOZE_DAYS = 21
/** How much a quantitative target moves when proposing a change (20%, rounded to an integer). */
export const TARGET_STEP = 0.2

/** The 3rd law ("make it easy"): its diagnosis, "it was hard", suggests lowering the bar. */
const EASY_LAW: Law = 3

/**
 * `dominant`: which version was met most in the last `HIGH_STRENGTH_DAYS` days (tie = full). With the minimum, the copy encourages doing
 * the full one more often; with the full one, raising the target or the frequency.
 * `proposal`: the new rule offered for confirmation (quantitative only; without it, it's adjusted in the wizard).
 */
export type Suggestion = { type: 'raise'; dominant: 'minimum' | 'full'; proposal?: Rule } | { type: 'lower'; proposal?: Rule }

/** The target one step harder (`+1`) or easier (`-1`); with "at most", harder means allowing less. */
function moveTarget({ frequency, quantitative: q }: Habit, direction: 1 | -1): Rule | undefined {
  if (!q) return undefined
  const more = q.mode === 'at_least' ? direction : -direction
  const target = more > 0 ? Math.ceil(q.target * (1 + TARGET_STEP)) : Math.floor(q.target * (1 - TARGET_STEP))
  return target > 0 ? { frequency, quantitative: { ...q, target } } : undefined
}

/**
 * Settle for the minimum: with "at least" and a minimum target, that becomes the target; otherwise, a slightly
 * easier target. Yes/no and avoid have no rule to lower (versions or friction are adjusted in the wizard).
 */
function lower(habit: Habit): Rule | undefined {
  const q = habit.quantitative
  if (q?.minTarget === undefined) return moveTarget(habit, -1)
  const { minTarget, ...rest } = q
  return { frequency: habit.frequency, quantitative: { ...rest, target: minTarget } }
}

/** A habit's active progression suggestion, if any. Never changes anything: it only proposes. */
export function progressionSuggestion({
  habit,
  logs,
  diagnoses,
  dismissedSuggestions,
  now,
  settings,
}: {
  habit: Habit
  logs: Log[]
  diagnoses: Diagnosis[]
  dismissedSuggestions: DismissedSuggestion[]
  now: Date
  settings: Settings
}): Suggestion | undefined {
  const today = logicalDay(now, settings.dayCutoff)
  const snoozes = dismissedSuggestions.filter((s) => s.habitId === habit.id)
  const snoozed = (type: SuggestionType) => snoozes.some((s) => s.type === type && s.until >= today)
  const { strength, periods } = evaluateHabit({ habit, logs, now, settings })
  const recent = strength.slice(-HIGH_STRENGTH_DAYS)
  // When avoiding there's no bar to raise: the clean day is everything.
  if (habit.type !== 'avoid' && recent.length === HIGH_STRENGTH_DAYS && recent.every((p) => p.value >= HIGH_STRENGTH_THRESHOLD)) {
    // With high strength it makes no sense to lower, even if raising was dismissed.
    if (snoozed('raise')) return undefined
    // The recent past, not the whole history: the same window in which strength was high.
    const recentPeriods = periods.filter((p) => p.end >= recent[0].day)
    const count = (status: PeriodStatus) => recentPeriods.filter((p) => p.status === status).length
    if (count('done_minimum') > count('done_full')) return { type: 'raise', dominant: 'minimum' }
    const proposal = moveTarget(habit, 1)
    return { type: 'raise', dominant: 'full', ...(proposal && { proposal }) }
  }
  const last = diagnoses
    .filter((d) => d.habitId === habit.id)
    .reduce<Diagnosis | undefined>((a, d) => (!a || d.triggerPeriod > a.triggerPeriod ? d : a), undefined)
  if (last?.status !== 'answered' || last.law !== EASY_LAW || snoozed('lower')) return undefined
  // If the rule already changed after the break, the habit was already adjusted: no further cut is proposed.
  // Otherwise, a dismissed one comes back after 21 days, as long as that diagnosis is still the last one.
  if (habit.versions?.some((v) => v.until >= last.triggerPeriod)) return undefined
  const proposal = lower(habit)
  return { type: 'lower', ...(proposal && { proposal }) }
}

/** What's saved when dismissing or applying a suggestion: silences it for `SUGGESTION_SNOOZE_DAYS` days. */
export function dismissSuggestion({ habit, type, now, settings }: { habit: Habit; type: SuggestionType; now: Date; settings: Settings }): New<DismissedSuggestion> {
  return { habitId: habit.id, type, until: addDays(logicalDay(now, settings.dayCutoff), SUGGESTION_SNOOZE_DAYS - 1) }
}

/** The active suggestions of active habits, in their order: for Today and the weekly review. */
export function progressionSuggestions({ habits, ...rest }: Omit<Parameters<typeof progressionSuggestion>[0], 'habit'> & { habits: Habit[] }) {
  return habits.flatMap((habit) => {
    const suggestion = habit.archived ? undefined : progressionSuggestion({ ...rest, habit })
    return suggestion ? [{ habit, suggestion }] : []
  })
}
