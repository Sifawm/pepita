// Export and import of JSON backups. Import is a trust boundary:
// it's validated in full before returning anything, and persistence only writes on `ok`.
import { weekday } from './calendar'
import { DIAGNOSIS_ACTIONS } from './diagnosis'
import { MILESTONES } from './identity'
import { LANGUAGES, type DiagnosisAction, type Settings, type FailureNote, type When, type Quantitative, type AppData, type Weekday, type Diagnosis, type Frequency, type Habit, type CelebratedMilestone, type Identity, type Instant, type Intention, type InverseLaws, type Pause, type Log, type WeeklyReview, type DismissedSuggestion, type HabitType, type LogType, type RuleVersion } from './types'
import { bool, matching, int, InvalidValue, arrayOf, literal, object, optional, positive, byType, str, type Validator } from './validation'

/**
 * Backup format version. Until v1 ships it stays at 1 and tickets only widen the
 * validators. After that, an incompatible change bumps this number and adds a step in
 * `importBackup` that converts the previous version into the new one.
 */
export const SCHEMA_VERSION = 1

export interface Backup {
  app: 'pepita'
  schemaVersion: number
  exportedAt: Instant
  data: AppData
}

export type ImportError = { reason: 'not_json' | 'not_pepita' | 'newer_version' } | { reason: 'invalid'; path: string }

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: ImportError }

// --- Schema: one validator per type in `types.ts` ---

const id = matching(/\S/)
const day: Validator<string> = (v, p) => {
  const d = matching(/^\d{4}-\d{2}-\d{2}$/)(v, p)
  // Rejects impossible dates like 2026-02-30.
  if (Number.isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) throw new InvalidValue(p)
  return d
}
const time = matching(/^([01]\d|2[0-3]):[0-5]\d$/)
const instant: Validator<string> = (v, p) => {
  const s = str(v, p)
  // Persistence always writes `toISOString()`: we require exactly that format.
  if (Number.isNaN(Date.parse(s)) || new Date(s).toISOString() !== s) throw new InvalidValue(p)
  return s
}
const entity = { id, createdAt: instant }

const pause: Validator<Pause> = (v, p) => {
  const x = object<Pause>({ start: day, end: day })(v, p)
  if (x.end < x.start) throw new InvalidValue(p)
  return x
}

const settings = object<Settings>({ language: optional(literal(...LANGUAGES)), dayCutoff: time, lastBackup: optional(instant), globalPause: optional(pause), notifications: optional(bool) })

const identity = object<Identity>({
  ...entity,
  name: str,
  isGeneral: bool,
  archived: bool,
  order: int(0),
})

/** At least one day, without repeats (a repeated day would ask for the same thing twice). */
const weekdays: Validator<Weekday[]> = (v, p) => {
  const days = arrayOf(literal(1, 2, 3, 4, 5, 6, 7))(v, p)
  if (!days.length || new Set(days).size !== days.length) throw new InvalidValue(p)
  return days
}

const frequency = byType<Frequency>({
  times_per_period: object({ type: literal('times_per_period'), times: int(1), period: literal('day', 'week', 'month') }),
  weekdays: object({ type: literal('weekdays'), days: weekdays }),
})

/** The minimum target only exists with "at least" and stays below the target. */
const quantitative: Validator<Quantitative> = (v, p) => {
  const q = object<Quantitative>({ unit: str, target: positive, minTarget: optional(positive), mode: literal('at_least', 'at_most') })(v, p)
  if (q.minTarget !== undefined && (q.mode !== 'at_least' || q.minTarget >= q.target)) throw new InvalidValue(`${p}.minTarget`)
  return q
}

/** Rule history: each version ends after the previous one (otherwise a range would be empty). */
const versions: Validator<RuleVersion[]> = (v, p) => {
  const vs = arrayOf(object<RuleVersion>({ until: day, frequency, quantitative: optional(quantitative) }))(v, p)
  vs.forEach((x, i) => {
    if (i > 0 && x.until <= vs[i - 1].until) throw new InvalidValue(`${p}[${i}].until`)
  })
  return vs
}

/** Exactly one of the three triggers. An anchor that no longer exists is fine: the habit becomes "no time". */
const when: Validator<When> = (v, p) => {
  const w = typeof v === 'object' && v !== null ? v : {}
  if ('time' in w) return object<{ time: string }>({ time })(v, p)
  if ('afterHabitId' in w) return object<{ afterHabitId: string }>({ afterHabitId: id })(v, p)
  return object<{ afterAction: string }>({ afterAction: matching(/\S/) })(v, p)
}

const intention = object<Intention>({ when: optional(when), where: optional(matching(/\S/)) })

const habit: Validator<Habit> = (v, p) => {
  const h = object<Habit>({
    ...entity,
    identityId: id,
    name: matching(/\S/),
    type: literal('yes_no', 'quantitative', 'avoid'),
    quantitative: optional(quantitative),
    frequency,
    minimumVersion: optional(str),
    fullVersion: optional(str),
    startDate: day,
    archived: bool,
    order: int(0),
    pauses: optional(arrayOf(pause)),
    versions: optional(versions),
    intention: optional(intention),
    environment: optional(arrayOf(str)),
    pairedReward: optional(str),
    inverseLaws: optional(object<InverseLaws>({ cue: optional(str), friction: optional(str), substitute: optional(str) })),
  })(v, p)
  // A quantitative habit always has its target (also in every previous rule); other types, never.
  const isQuantitative = h.type === 'quantitative'
  if (isQuantitative !== (h.quantitative !== undefined)) throw new InvalidValue(`${p}.quantitative`)
  h.versions?.forEach((x, i) => {
    if (isQuantitative !== (x.quantitative !== undefined)) throw new InvalidValue(`${p}.versions[${i}].quantitative`)
  })
  if (h.inverseLaws !== undefined && h.type !== 'avoid') throw new InvalidValue(`${p}.inverseLaws`)
  return h
}

const log: Validator<Log> = (v, p) => {
  const l = object<Log>({
    ...entity,
    habitId: id,
    day,
    type: literal('minimum', 'full', 'skip', 'relapse', 'value'),
    value: optional(positive),
    note: optional(str),
    reason: optional(str),
    trigger: optional(str),
  })(v, p)
  if (l.reason !== undefined && l.type !== 'skip') throw new InvalidValue(`${p}.reason`)
  if (l.trigger !== undefined && l.type !== 'relapse') throw new InvalidValue(`${p}.trigger`)
  if ((l.value !== undefined) !== (l.type === 'value')) throw new InvalidValue(`${p}.value`)
  return l
}

const failureNote = object<FailureNote>({
  ...entity,
  habitId: id,
  period: day,
  law: optional(literal(1, 2, 3, 4)),
  note: optional(str),
})

const celebratedMilestone = object<CelebratedMilestone>({ ...entity, identityId: id, threshold: literal(...MILESTONES) })

/** The cause is present if and only if it's answered; the action, only if it belongs to that cause. */
const diagnosis: Validator<Diagnosis> = (v, p) => {
  const d = object<Diagnosis>({
    ...entity,
    habitId: id,
    triggerPeriod: day,
    law: optional(literal(1, 2, 3, 4)),
    status: literal('pending', 'answered', 'snoozed', 'dismissed'),
    appliedAction: optional(literal(...(Object.values(DIAGNOSIS_ACTIONS).flat() as DiagnosisAction[]))),
  })(v, p)
  if ((d.law === undefined) === (d.status === 'answered')) throw new InvalidValue(`${p}.law`)
  if (d.appliedAction && !(d.law && DIAGNOSIS_ACTIONS[d.law].includes(d.appliedAction))) throw new InvalidValue(`${p}.appliedAction`)
  return d
}

const dismissedSuggestion = object<DismissedSuggestion>({ ...entity, habitId: id, type: literal('raise', 'lower'), until: day })

const monday: Validator<string> = (v, p) => {
  const d = day(v, p)
  if (weekday(d) !== 1) throw new InvalidValue(p)
  return d
}
const weeklyReview = object<WeeklyReview>({ ...entity, week: monday, note: matching(/\S/) })

/** When adding a table to `AppData`, add it here (TypeScript requires it) and in `checkReferences`. */
const appData = object<AppData>({
  settings,
  identities: arrayOf(identity),
  habits: arrayOf(habit),
  logs: arrayOf(log),
  failureNotes: arrayOf(failureNote),
  celebratedMilestones: arrayOf(celebratedMilestone),
  diagnoses: arrayOf(diagnosis),
  dismissedSuggestions: arrayOf(dismissedSuggestion),
  weeklyReviews: arrayOf(weeklyReview),
})

const backup = object<Backup>({
  app: literal('pepita'),
  schemaVersion: int(1, SCHEMA_VERSION),
  exportedAt: instant,
  data: appData,
})

// --- Cross-table integrity: unique ids, references that exist and a single "General" ---

/** Which logs each habit type accepts (skip works on all of them). */
const LOG_TYPES_FOR: Record<HabitType, LogType[]> = {
  yes_no: ['minimum', 'full', 'skip'],
  quantitative: ['value', 'skip'],
  avoid: ['relapse', 'skip'],
}

/** Rejects the first row whose `key` already appeared (`field` is what the path points at). Returns the keys. */
function unique<T>(table: string, rows: T[], field: string, key: (r: T) => string) {
  const seen = new Set<string>()
  rows.forEach((r, i) => {
    if (seen.has(key(r))) throw new InvalidValue(`data.${table}[${i}].${field}`)
    seen.add(key(r))
  })
  return seen
}

function checkReferences(d: AppData) {
  const ids = (table: string, rows: { id: string }[]) => unique(table, rows, 'id', (r) => r.id)
  const identities = ids('identities', d.identities)
  ids('habits', d.habits)
  ids('logs', d.logs)
  ids('failureNotes', d.failureNotes)
  ids('celebratedMilestones', d.celebratedMilestones)
  ids('diagnoses', d.diagnoses)
  ids('dismissedSuggestions', d.dismissedSuggestions)
  ids('weeklyReviews', d.weeklyReviews)
  const habits = new Map(d.habits.map((h) => [h.id, h]))
  const exists = (table: string, rows: { habitId: string }[]) =>
    rows.forEach((r, i) => {
      if (!habits.has(r.habitId)) throw new InvalidValue(`data.${table}[${i}].habitId`)
    })

  if (d.identities.filter((i) => i.isGeneral).length !== 1) throw new InvalidValue('data.identities')
  d.habits.forEach((h, i) => {
    if (!identities.has(h.identityId)) throw new InvalidValue(`data.habits[${i}].identityId`)
  })
  exists('logs', d.logs)
  d.logs.forEach((l, i) => {
    if (!LOG_TYPES_FOR[habits.get(l.habitId)!.type].includes(l.type)) throw new InvalidValue(`data.logs[${i}].type`)
  })
  exists('failureNotes', d.failureNotes)
  unique('failureNotes', d.failureNotes, 'period', (n) => `${n.habitId} ${n.period}`)
  d.celebratedMilestones.forEach((m, i) => {
    if (!identities.has(m.identityId)) throw new InvalidValue(`data.celebratedMilestones[${i}].identityId`)
  })
  unique('celebratedMilestones', d.celebratedMilestones, 'threshold', (m) => `${m.identityId} ${m.threshold}`)
  exists('diagnoses', d.diagnoses)
  unique('diagnoses', d.diagnoses, 'triggerPeriod', (x) => `${x.habitId} ${x.triggerPeriod}`)
  exists('dismissedSuggestions', d.dismissedSuggestions)
  unique('weeklyReviews', d.weeklyReviews, 'week', (x) => x.week)
}

/** What's left in the settings when a backup is exported at `now` (and what the backup carries inside). */
export const backupStamp = (now: Date): Pick<Settings, 'lastBackup'> => ({ lastBackup: now.toISOString() })

/** Serializes all the data. The backup records itself as `lastBackup` (`backupStamp`). */
export function exportBackup(d: AppData, now: Date): string {
  const result: Backup = {
    app: 'pepita',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: { ...d, settings: { ...d.settings, ...backupStamp(now) } },
  }
  return JSON.stringify(result, null, 2)
}

/** Calibration: days without a backup before reminding (kindly). Tune it with real use. */
export const BACKUP_REMINDER_DAYS = 7

/**
 * Time to remind them to back up? Without logs there's nothing to lose; without any backup,
 * it counts from the first log.
 */
export function needsBackup({ settings, logs, now }: { settings: Settings; logs: Log[]; now: Date }) {
  if (logs.length === 0) return false
  const since = settings.lastBackup ?? logs.reduce((min, l) => (l.createdAt < min ? l.createdAt : min), logs[0].createdAt)
  return now.getTime() - Date.parse(since) > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Logs as flat CSV (RFC 4180), by day and creation time. Columns use the schema's
 * names; if you widen `Log` (value, reason…), add its column here.
 */
export function logsCsv({ habits, logs }: Pick<AppData, 'habits' | 'logs'>): string {
  const names = new Map(habits.map((h) => [h.id, h.name]))
  const field = (v = '') => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)
  const rows = [...logs]
    .sort((a, b) => a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt))
    .map((l) => [l.day, l.habitId, names.get(l.habitId), l.type, l.value?.toString(), l.note, l.reason, l.trigger, l.createdAt])
  return [['day', 'habitId', 'habit', 'type', 'value', 'note', 'reason', 'trigger', 'createdAt'], ...rows]
    .map((row) => row.map(field).join(',') + '\r\n')
    .join('')
}

/** Strictly validates a backup file. If anything doesn't add up, it returns no data. */
export function importBackup(content: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    return { ok: false, error: { reason: 'not_json' } }
  }
  const header = (json ?? {}) as Partial<Backup>
  if (header.app !== 'pepita') return { ok: false, error: { reason: 'not_pepita' } }
  if (typeof header.schemaVersion === 'number' && header.schemaVersion > SCHEMA_VERSION) return { ok: false, error: { reason: 'newer_version' } }
  try {
    const { data } = backup(json, '')
    checkReferences(data)
    return { ok: true, data }
  } catch (e) {
    if (e instanceof InvalidValue) return { ok: false, error: { reason: 'invalid', path: e.path } }
    throw e
  }
}
