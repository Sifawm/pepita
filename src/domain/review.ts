import { periodOf } from './calendar'
import { isOpenDiagnosis } from './diagnosis'
import { evaluateHabit } from './evaluation'
import { progressionSuggestions, type Suggestion } from './progression'
import type { Settings, FailureNote, Diagnosis, Day, Habit, Identity, New, Log, WeeklyReview, DismissedSuggestion } from './types'

/** The method's steps that Pepita gently reminds about if they were left blank. */
export type MethodField = 'identity' | 'minimumVersion' | 'intention' | 'environment' | 'reward'

/** A habit's empty fields, only among those that make sense for its type. */
function emptyFields(habit: Habit, general: string | undefined): MethodField[] {
  const building = habit.type !== 'avoid'
  // For an "at least" quantitative habit, the minimum version is its minimum target; "at most" has none.
  const minimum = habit.type === 'yes_no' ? !habit.minimumVersion : habit.quantitative?.mode === 'at_least' && habit.quantitative.minTarget === undefined
  const empty: [MethodField, boolean][] = [
    ['identity', habit.identityId === general],
    ['minimumVersion', minimum],
    ['intention', building && !habit.intention],
    ['environment', building && !habit.environment?.length],
    ['reward', building && !habit.pairedReward],
  ]
  return empty.filter(([, isEmpty]) => isEmpty).map(([field]) => field)
}

export interface Review {
  /** Monday of the first week and Sunday of the last. */
  start: Day
  end: Day
  /** Votes earned in the period, per identity (active ones and those that added up), in their order. */
  votes: { identity: Identity; votes: number }[]
  /** The free-form notes of the period's weeks, in order. */
  notes: WeeklyReview[]
  /** The noted reasons for failures whose period starts inside, in order (archived habits included). */
  failures: { habit: Habit; note: FailureNote }[]
  // What follows is today's state (not the period's): what needs attention now.
  /** Active habits in recovery, in their order. */
  recovering: Habit[]
  /** Unanswered diagnoses (pending and snoozed) of active habits. */
  diagnoses: { diagnosis: Diagnosis; habit: Habit }[]
  suggestions: { habit: Habit; suggestion: Suggestion }[]
  /** Active habits with some method step left blank (hanging from "General" counts as no identity). */
  emptyFields: { habit: Habit; fields: MethodField[] }[]
}

/**
 * The review of the weeks (Monday to Sunday) from `start`'s week to `end`'s
 * (by default, only `start`'s).
 */
export function review({
  start,
  end = start,
  identities,
  habits,
  logs,
  diagnoses,
  dismissedSuggestions,
  weeklyReviews,
  failureNotes,
  now,
  settings,
}: {
  start: Day
  end?: Day
  identities: Identity[]
  habits: Habit[]
  logs: Log[]
  diagnoses: Diagnosis[]
  dismissedSuggestions: DismissedSuggestion[]
  weeklyReviews: WeeklyReview[]
  failureNotes: FailureNote[]
  now: Date
  settings: Settings
}): Review {
  const period = { start: periodOf(start, 'week').start, end: periodOf(end, 'week').end }
  const inside = (day: Day) => day >= period.start && day <= period.end
  // Votes come from each habit's evaluation (`voteDays`), like in the identity summary.
  const votes = [...identities]
    .sort((a, b) => a.order - b.order)
    .map((identity) => ({
      identity,
      votes: habits
        .filter((h) => h.identityId === identity.id)
        .flatMap((habit) => evaluateHabit({ habit, logs, now, settings }).voteDays)
        .filter(inside).length,
    }))
    .filter((v) => !v.identity.archived || v.votes > 0)
  const active = habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order)
  return {
    ...period,
    votes,
    notes: weeklyReviews.filter((r) => inside(r.week)).sort((a, b) => a.week.localeCompare(b.week)),
    failures: failureNotes
      .filter((n) => inside(n.period))
      .sort((a, b) => a.period.localeCompare(b.period))
      .flatMap((note) => {
        const habit = habits.find((h) => h.id === note.habitId)
        return habit ? [{ habit, note }] : []
      }),
    recovering: active.filter((habit) => evaluateHabit({ habit, logs, now, settings }).recovering),
    diagnoses: active.flatMap((habit) =>
      diagnoses.filter((d) => d.habitId === habit.id && isOpenDiagnosis(d)).map((diagnosis) => ({ diagnosis, habit })),
    ),
    suggestions: progressionSuggestions({ habits: active, logs, diagnoses, dismissedSuggestions, now, settings }),
    emptyFields: active.flatMap((habit) => {
      const fields = emptyFields(habit, identities.find((i) => i.isGeneral)?.id)
      return fields.length ? [{ habit, fields }] : []
    }),
  }
}

/** A week's free-form note, trimmed and on its Monday; without text there's no note (it gets deleted). */
export function weeklyNote(week: Day, note: string): New<WeeklyReview> | undefined {
  const text = note.trim()
  return text ? { week: periodOf(week, 'week').start, note: text } : undefined
}
