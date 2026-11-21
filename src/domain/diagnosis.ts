import { evaluateHabit } from './evaluation'
import type { DiagnosisAction, Settings, FailureNote, Diagnosis, Habit, Law, New, Log } from './types'

/** What each cause offers. The order is the buttons' order. */
export const DIAGNOSIS_ACTIONS: Record<Law, DiagnosisAction[]> = {
  1: ['edit_intention', 'export_ics'],
  2: ['edit_reward', 'edit_identity'],
  3: ['minimum_only', 'edit_environment'],
  4: ['view_votes', 'pause', 'archive'],
}

/**
 * Which diagnoses to create and delete so they match the current streak breaks.
 * Idempotent: applying it twice changes nothing.
 *
 * The last break of each active habit always has its diagnosis, whenever it's recomputed
 * (even if the person has already met it again, or the break appears when fixing the past).
 * Earlier breaks aren't asked about: an unanswered one for a break that's no longer the last
 * is withdrawn (it holds nothing from the person and the new one asks the same with fresher data), so
 * there's at most one open per habit. Answered and dismissed ones remain as history.
 */
export function reconcileDiagnoses({
  habits,
  logs,
  diagnoses,
  now,
  settings,
}: {
  habits: Habit[]
  logs: Log[]
  diagnoses: Diagnosis[]
  now: Date
  settings: Settings
}): { create: New<Diagnosis>[]; remove: string[] } {
  const create: New<Diagnosis>[] = []
  const remove: string[] = []
  for (const habit of habits.filter((h) => !h.archived)) {
    const { streakBreaks } = evaluateHabit({ habit, logs, now, settings })
    const last = streakBreaks.at(-1)?.start
    const own = diagnoses.filter((d) => d.habitId === habit.id)
    // An unanswered one only stays open if it belongs to the last break: if another replaced it
    // or a fix to the past undid it, it's withdrawn. Answered ones remain as history.
    for (const d of own) if (isOpenDiagnosis(d) && d.triggerPeriod !== last) remove.push(d.id)
    if (last && !own.some((d) => d.triggerPeriod === last)) create.push({ habitId: habit.id, triggerPeriod: last, status: 'pending' })
  }
  return { create, remove }
}

/** Unanswered: pending or snoozed. */
export const isOpenDiagnosis = (d: Diagnosis) => d.status === 'pending' || d.status === 'snoozed'

export type DiagnosisAnswer = { status: 'snoozed' | 'dismissed' } | { status: 'answered'; law: Law; action?: DiagnosisAction }

/** Answer (with the cause and, if applied, its action), snooze or dismiss. */
export function answerDiagnosis(d: Diagnosis, a: DiagnosisAnswer): Diagnosis {
  // The new answer replaces the previous one.
  const rest = { ...d }
  delete rest.law
  delete rest.appliedAction
  if (a.status !== 'answered') return { ...rest, status: a.status }
  return { ...rest, status: a.status, law: a.law, ...(a.action ? { appliedAction: a.action } : {}) }
}

/** What Today flags: the pending ones of active habits (snoozed ones wait in their detail). */
export function pendingDiagnoses({ habits, diagnoses }: { habits: Habit[]; diagnoses: Diagnosis[] }) {
  return diagnoses.flatMap((diagnosis) => {
    const habit = habits.find((h) => h.id === diagnosis.habitId)
    return diagnosis.status === 'pending' && habit && !habit.archived ? [{ diagnosis, habit }] : []
  })
}

/** The optional reason for a failure, with the note trimmed. Without a law or a note there's nothing to save. */
export function failureNote({ habitId, period, law, note = '' }: { habitId: string; period: string; law?: Law; note?: string }): New<FailureNote> | undefined {
  const text = note.trim()
  if (!law && !text) return undefined
  return { habitId, period, ...(law && { law }), ...(text && { note: text }) }
}
