import { logicalDay } from './calendar'
import { evaluateHabit } from './evaluation'
import type { Settings, Day, Habit, CelebratedMilestone, Identity, New, Log } from './types'

/** The `order` of something new (identity or habit): after the last one, archived ones included. */
export const nextOrder = (rows: { order: number }[]) => Math.max(-1, ...rows.map((r) => r.order)) + 1

/** A new identity ("I'm the kind of person who…"), at the end of the list. */
export function newIdentity(name: string, identities: Identity[]): New<Identity> {
  return { name: name.trim(), isGeneral: false, archived: false, order: nextOrder(identities) }
}

/**
 * Moves an identity up (`-1`) or down (`+1`) one place among the active ones.
 * Returns the identities whose `order` changes (none if it's already at the edge).
 */
export function moveIdentity(identities: Identity[], id: string, step: -1 | 1): Identity[] {
  const active = identities.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
  const i = active.findIndex((x) => x.id === id)
  const other = active[i + step]
  if (i < 0 || !other) return []
  const self = active[i]
  return [
    { ...self, order: other.order },
    { ...other, order: self.order },
  ]
}

export interface IdentitySummary {
  identity: Identity
  /** Accumulated votes: including those of archived habits and archived identities. */
  votes: number
  /** Votes of the current logical day. */
  votesToday: number
  /** Accumulated votes curve: one point per day with votes, in order. */
  series: { day: Day; votes: number }[]
  /** Milestones reached and the day each was reached. */
  milestones: { threshold: number; day: Day }[]
  /** Thresholds reached that aren't in `CelebratedMilestone` yet, smallest first. */
  toCelebrate: number[]
}

/**
 * Calibration: an identity's vote counts that Pepita celebrates specially, once each.
 * Tune them with real use; a new threshold is celebrated when reached (or right away, if already passed).
 */
export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000]

/** Votes of each identity ("General" included), in list order. */
export function summarizeIdentities({
  identities,
  habits,
  logs,
  celebratedMilestones = [],
  now,
  settings,
}: {
  identities: Identity[]
  habits: Habit[]
  logs: Log[]
  celebratedMilestones?: CelebratedMilestone[]
  now: Date
  settings: Settings
}): IdentitySummary[] {
  const today = logicalDay(now, settings.dayCutoff)
  return [...identities]
    .sort((a, b) => a.order - b.order)
    .map((identity) => {
      // Votes come from each habit's evaluation: a new type changes them there, not here.
      const days = habits
        .filter((h) => h.identityId === identity.id)
        .flatMap((habit) => evaluateHabit({ habit, logs, now, settings }).voteDays)
        .sort()
      const series: IdentitySummary['series'] = []
      days.forEach((day, i) => {
        if (series.at(-1)?.day === day) series.at(-1)!.votes++
        else series.push({ day, votes: i + 1 })
      })
      // Once celebrated, always celebrated: dropping below the threshold by editing and rising again doesn't relaunch it.
      const milestones = MILESTONES.filter((threshold) => threshold <= days.length).map((threshold) => ({ threshold, day: days[threshold - 1] }))
      const celebrated = new Set(celebratedMilestones.filter((m) => m.identityId === identity.id).map((m) => m.threshold))
      const toCelebrate = milestones.map((m) => m.threshold).filter((t) => !celebrated.has(t))
      return { identity, votes: days.length, votesToday: days.filter((d) => d === today).length, series, milestones, toCelebrate }
    })
}
