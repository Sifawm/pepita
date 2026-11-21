import { logicalDay } from './calendar'
import { changeRule } from './versions'
import type { Settings, When, Quantitative, Frequency, Habit, Intention, InverseLaws, New, HabitType } from './types'

/** What the wizard asks for. Only the name is required; a skipped step leaves its field empty. */
export interface HabitFields {
  name: string
  identityId: string
  frequency: Frequency
  /** Yes/no by default. Only counts on creation: editing doesn't change the type. */
  type?: HabitType
  /** Only on `quantitative`. */
  quantitative?: Quantitative
  minimumVersion?: string
  fullVersion?: string
  intention?: Intention
  environment?: string[]
  pairedReward?: string
  /** Only counts on habits to avoid. */
  inverseLaws?: InverseLaws
}

export interface HabitInput extends Omit<HabitFields, 'frequency'> {
  order: number
  /** Once a day by default. */
  frequency?: Frequency
  /** Yes/no by default. The type doesn't change after the habit is created. */
  type?: HabitType
}

/** The fields a skipped step leaves unwritten. */
const OPTIONAL_FIELDS = ['minimumVersion', 'fullVersion', 'intention', 'environment', 'pairedReward', 'inverseLaws'] as const
type OptionalFields = Pick<HabitFields, (typeof OPTIONAL_FIELDS)[number]>

/** Trims the strings and drops the empty ones: an unwritten string isn't saved. */
const trimmed = <T extends object>(fields: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(fields)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      .filter(([, v]) => v),
  ) as Partial<T>

/**
 * Trims the strings and drops the empty ones (also inside the intention, the environment and the
 * inverse laws): an unwritten field isn't saved. Inverse laws only on `avoid`.
 */
function optionalFields(type: HabitType, { minimumVersion, fullVersion, intention, environment, pairedReward, inverseLaws }: OptionalFields): OptionalFields {
  // A "when" whose only value is empty (time, anchor or action not chosen) doesn't count.
  const [entry] = Object.entries(intention?.when ?? {})
  const when = entry?.[1].trim() ? ({ [entry[0]]: entry[1].trim() } as When) : undefined
  const where = intention?.where?.trim()
  const items = environment?.map((x) => x.trim()).filter(Boolean)
  const laws = trimmed(inverseLaws ?? {})
  const fields: OptionalFields = {
    minimumVersion: minimumVersion?.trim(),
    fullVersion: fullVersion?.trim(),
    intention: when || where ? { ...(when && { when }), ...(where && { where }) } : undefined,
    environment: items?.length ? items : undefined,
    pairedReward: pairedReward?.trim(),
    inverseLaws: type === 'avoid' && Object.keys(laws).length ? laws : undefined,
  }
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v)) as OptionalFields
}

/** The quantitative part, only if the type is quantitative: trimmed unit and a minimum target only when it makes sense. */
function quantitativeOf(type: HabitType, q?: Quantitative) {
  if (type !== 'quantitative' || !q) return {}
  const { minTarget, ...rest } = q
  const withMinimum = q.mode === 'at_least' && minTarget !== undefined && minTarget > 0 && minTarget < q.target
  return { quantitative: { ...rest, unit: q.unit.trim(), ...(withMinimum && { minTarget }) } }
}

/** A habit that starts on the logical day it's created. */
export function newHabit(
  { frequency = { type: 'times_per_period', times: 1, period: 'day' }, type = 'yes_no', quantitative, name, identityId, order, ...rest }: HabitInput,
  now: Date,
  settings: Settings,
): New<Habit> {
  return {
    name: name.trim(),
    identityId,
    order,
    ...optionalFields(type, rest),
    type,
    ...quantitativeOf(type, quantitative),
    frequency,
    startDate: logicalDay(now, settings.dayCutoff),
    archived: false,
  }
}

/**
 * Applies what the wizard returns when editing. Start, order, type and archived state don't change; a
 * new rule (frequency or target) goes through `changeRule` so closed periods keep theirs.
 */
export function editHabit(
  habit: Habit,
  { name, identityId, frequency, quantitative, ...rest }: HabitFields,
  now: Date,
  settings: Settings,
): Habit {
  const rule = { frequency, ...quantitativeOf(habit.type, quantitative) }
  // Both sides normalized the same way: key order doesn't count as a change.
  const ruleChanged = JSON.stringify(rule) !== JSON.stringify({ frequency: habit.frequency, ...quantitativeOf(habit.type, habit.quantitative) })
  const withRule = ruleChanged ? changeRule({ habit, rule, now, settings }) : habit
  const edited = { ...withRule, name: name.trim(), identityId }
  for (const k of OPTIONAL_FIELDS) delete edited[k] // replaced by the wizard's
  return { ...edited, ...optionalFields(habit.type, rest) }
}
