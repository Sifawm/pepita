// Implementation intention: the phrase ("After…, at…: …"), the anchors and Today's time ordering.
import type { Habit, Time } from './types'

/** A habit's anchor, only while it exists and isn't archived: if missing, the habit becomes "no time". */
export function anchorOf(habit: Pick<Habit, 'intention'>, habits: Habit[]) {
  const w = habit.intention?.when
  return w && 'afterHabitId' in w ? habits.find((h) => h.id === w.afterHabitId && !h.archived) : undefined
}

/** The chain of anchors upwards, without repeats (a cycle in imported data doesn't hang anything). */
function chain(habit: Habit, habits: Habit[]) {
  const seen = [habit]
  for (let a = anchorOf(habit, habits); a && !seen.includes(a); a = anchorOf(a, habits)) seen.push(a)
  return seen
}

/** The habit's time, or its anchor's (at any level). No time: free action, no when, or lost anchor. */
const timeOf = (habit: Habit, habits: Habit[]): Time | undefined =>
  chain(habit, habits)
    .map((h) => h.intention?.when)
    .find((w): w is { time: Time } => !!w && 'time' in w)?.time

const NO_TIME = '99:99'

/**
 * Time ordering: each anchored habit right below its anchor (if it's in the list; otherwise it takes its
 * own time) and the ones with no time at the end. Ties: by `order`. Sorts any group
 * (Today applies it within "recovering" and within the rest).
 */
export function sortByTime<T extends { habit: Habit }>(cards: T[], habits: Habit[]): T[] {
  // No time goes after any time (`HH:MM` never reaches 99).
  const key = (c: T) => timeOf(c.habit, habits) ?? NO_TIME
  const byTime = [...cards].sort((a, b) => key(a).localeCompare(key(b)) || a.habit.order - b.habit.order)
  const children = new Map<string, T[]>()
  const roots: T[] = []
  for (const c of byTime) {
    const anchor = anchorOf(c.habit, habits)
    const inList = anchor && byTime.some((x) => x.habit.id === anchor.id)
    if (inList) children.set(anchor.id, [...(children.get(anchor.id) ?? []), c])
    else roots.push(c)
  }
  const placed = new Set<T>()
  const place = (c: T): T[] => {
    if (placed.has(c)) return []
    placed.add(c)
    return [c, ...(children.get(c.habit.id) ?? []).flatMap(place)]
  }
  // After the roots, whatever is left (a cycle) goes in its place by time.
  return [...roots, ...byTime].flatMap(place)
}

/** Habits that can anchor `habitId` (or a new one): active and not closing a cycle. */
export const possibleAnchors = (habitId: string | undefined, habits: Habit[]) =>
  habits.filter((h) => !h.archived && !chain(h, habits).some((x) => x.id === habitId))

/** The phrase as a structure; the UI translates it. `what` = the minimum version or, if none, the name. */
export interface IntentionPhrase {
  when?: { time: Time } | { after: string } | { afterAction: string }
  where?: string
  what: string
}

/**
 * No when and no where means no phrase. A lost anchor is left out of the phrase. Blank values
 * are ignored, so it also works as a preview with the wizard's draft.
 */
export function intentionPhrase(
  habit: Pick<Habit, 'name' | 'minimumVersion' | 'intention'>,
  habits: Habit[],
): IntentionPhrase | undefined {
  const w = habit.intention?.when
  const anchor = anchorOf(habit, habits)
  const when: IntentionPhrase['when'] =
    w && 'afterHabitId' in w ? anchor && { after: anchor.name } : w && Object.values(w)[0].trim() ? w : undefined
  const where = habit.intention?.where?.trim()
  if (!when && !where) return undefined
  return { ...(when && { when }), ...(where && { where }), what: habit.minimumVersion?.trim() || habit.name.trim() }
}
