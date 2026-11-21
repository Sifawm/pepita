// Persistence: Dexie tables and writes. No business logic (it lives in @/domain).
import Dexie, { type EntityTable, type Transaction } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, weeklyNote, reconcileDiagnoses, type Settings, type FailureNote, type Diagnosis, type Entity, type Habit, type CelebratedMilestone, type Identity, type New, type Log, type WeeklyReview, type DismissedSuggestion } from '@/domain'
import type { AppData } from '@/domain'

export const db = new Dexie('pepita') as Dexie & {
  identities: EntityTable<Identity, 'id'>
  habits: EntityTable<Habit, 'id'>
  logs: EntityTable<Log, 'id'>
  failureNotes: EntityTable<FailureNote, 'id'>
  celebratedMilestones: EntityTable<CelebratedMilestone, 'id'>
  diagnoses: EntityTable<Diagnosis, 'id'>
  dismissedSuggestions: EntityTable<DismissedSuggestion, 'id'>
  weeklyReviews: EntityTable<WeeklyReview, 'id'>
  /** A single row, with `id: 'settings'`. */
  settings: EntityTable<Partial<Settings> & { id: string }, 'id'>
}

// `randomUUID` only exists in a secure context (HTTPS/localhost); over http on the local network, `getRandomValues` does.
const newId = () =>
  crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Adds `id` and `createdAt` to what the core creates. */
export const withId = <T extends Entity>(data: New<T>): T => ({ ...data, id: newId(), createdAt: new Date().toISOString() }) as T

const addGeneralIdentity = (tx: Transaction) =>
  tx.table('identities').add(withId<Identity>({ name: '', isGeneral: true, archived: false, order: 0 }))

// Schema changes: add a new `db.version(n + 1)`; never edit an existing one.
// Versions 1–7 (pre-v1 installs) used Spanish table names: v8 drops them and starts with empty data.
// ponytail: drop the `null` tables and the upgrade once no pre-v1 install remains.
db.version(8)
  .stores({
    identities: 'id, order',
    habits: 'id, identityId, order',
    logs: 'id, habitId, day, [habitId+day]',
    settings: 'id',
    failureNotes: 'id, habitId, [habitId+period]',
    celebratedMilestones: 'id, identityId',
    diagnoses: 'id, habitId',
    dismissedSuggestions: 'id, habitId',
    weeklyReviews: 'id, &week',
    identidades: null,
    habitos: null,
    registros: null,
    ajustes: null,
    anotacionesDeFallo: null,
    hitosCelebrados: null,
    diagnosticos: null,
    sugerenciasDescartadas: null,
    revisionesSemanales: null,
  })
  .upgrade(addGeneralIdentity)

db.on('populate', addGeneralIdentity)

/** Saved settings over the defaults (without the row's `id`). */
export async function readSettings(): Promise<Settings> {
  const { id, ...saved } = (await db.settings.get('settings')) ?? { id: 'settings' }
  void id // the row has an `id`; the settings don't.
  return { ...DEFAULT_SETTINGS, ...saved }
}

/** Saved settings over the defaults; `undefined` while loading. */
export const useSettings = (): Settings | undefined => useLiveQuery(readSettings)

export const saveSettings = (changes: Partial<Settings>) =>
  db.transaction('rw', db.settings, async () => {
    await db.settings.put({ ...(await db.settings.get('settings')), ...changes, id: 'settings' })
  })

/** Deletes a habit and everything hanging from it. If you add a table with `habitId`, delete from it here too. */
export const deleteHabit = (id: string) =>
  db.transaction('rw', [db.habits, db.logs, db.failureNotes, db.diagnoses, db.dismissedSuggestions], async () => {
    await db.logs.where('habitId').equals(id).delete()
    await db.failureNotes.where('habitId').equals(id).delete()
    await db.diagnoses.where('habitId').equals(id).delete()
    await db.dismissedSuggestions.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })

/** Stores milestones as celebrated. Idempotent: an already stored milestone isn't duplicated. */
export const celebrateMilestones = (identityId: string, thresholds: number[]) =>
  db.transaction('rw', db.celebratedMilestones, async () => {
    const already = new Set((await db.celebratedMilestones.where('identityId').equals(identityId).toArray()).map((m) => m.threshold))
    const fresh = thresholds.filter((threshold) => !already.has(threshold))
    await db.celebratedMilestones.bulkAdd(fresh.map((threshold) => withId<CelebratedMilestone>({ identityId, threshold })))
  })

/** Saves the week's note (`weeklyNote` decides; without text, it's deleted). */
export const saveWeeklyNote = (week: string, note: string) =>
  db.transaction('rw', db.weeklyReviews, async () => {
    const next = weeklyNote(week, note)
    const current = await db.weeklyReviews.where('week').equals(next?.week ?? week).first()
    if (!next) return void (current && (await db.weeklyReviews.delete(current.id)))
    await db.weeklyReviews.put(current ? { ...current, ...next } : withId<WeeklyReview>(next))
  })

/**
 * Creates and withdraws diagnoses so they match the streak breaks. In one transaction
 * (it reads and writes `diagnoses` inside), so two concurrent calls don't duplicate anything.
 */
export const reconcileStoredDiagnoses = (now: Date) =>
  db.transaction('rw', [db.habits, db.logs, db.diagnoses, db.settings], async () => {
    const { create, remove } = reconcileDiagnoses({
      habits: await db.habits.toArray(),
      logs: await db.logs.toArray(),
      diagnoses: await db.diagnoses.toArray(),
      settings: await readSettings(),
      now,
    })
    await db.diagnoses.bulkDelete(remove)
    await db.diagnoses.bulkAdd(create.map((d) => withId<Diagnosis>(d)))
  })

/** All the data, at once and consistent with each other: what goes into a backup. */
export const readAllData = (): Promise<AppData> =>
  db.transaction('r', db.tables, async () => ({
    settings: await readSettings(),
    identities: await db.identities.toArray(),
    habits: await db.habits.toArray(),
    logs: await db.logs.toArray(),
    failureNotes: await db.failureNotes.toArray(),
    celebratedMilestones: await db.celebratedMilestones.toArray(),
    diagnoses: await db.diagnoses.toArray(),
    dismissedSuggestions: await db.dismissedSuggestions.toArray(),
    weeklyReviews: await db.weeklyReviews.toArray(),
  }))

/**
 * Replaces EVERYTHING with `data` (already validated by `importBackup`). In one transaction: if anything
 * fails, nothing changes. Every key of `AppData` except `settings` is written to the table of the same name.
 */
export const replaceAllData = ({ settings, ...tables }: AppData) =>
  db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.settings.put({ ...settings, id: 'settings' })
    for (const [table, rows] of Object.entries(tables)) await db.table(table).bulkAdd(rows)
  })
