import { describe, expect, it } from 'vitest'
import {
  DIAGNOSIS_ACTIONS,
  DEFAULT_SETTINGS,
  failureNote,
  DIAGNOSIS_PAUSE_DAYS,
  diagnosisPause,
  pendingDiagnoses,
  reconcileDiagnoses,
  answerDiagnosis,
  type Diagnosis,
  type Habit,
  type New,
  type Log,
} from '.'

const local = (y: number, month: number, d: number, h: number) => new Date(y, month - 1, d, h)
const settings = DEFAULT_SETTINGS

// March 2026, daily habit from Monday the 2nd.
const read: Habit = {
  id: 'h',
  createdAt: '2026-03-02T08:00:00.000Z',
  identityId: 'general',
  name: 'Read',
  type: 'yes_no',
  frequency: { type: 'times_per_period', times: 1, period: 'day' },
  startDate: '2026-03-02',
  archived: false,
  order: 0,
}

const done = (...days: number[]): Log[] =>
  days.map((d) => {
    const day = `2026-03-${String(d).padStart(2, '0')}`
    return { id: day, createdAt: `${day}T10:00:00.000Z`, habitId: 'h', day, type: 'minimum' }
  })

let n = 0
/** What persistence would do with what the core creates. */
const save = (d: New<Diagnosis>): Diagnosis => ({ ...d, id: `d${++n}`, createdAt: '2026-03-10T10:00:00.000Z' })

/** Applies the reconciliation the way persistence does. */
function reconcile(diagnoses: Diagnosis[], logs: Log[], now: Date, habits = [read]) {
  const { create, remove } = reconcileDiagnoses({ habits, logs, diagnoses, now, settings })
  return [...diagnoses.filter((d) => !remove.includes(d.id)), ...create.map(save)]
}

describe('diagnosis: opens after two failures in a row', () => {
  it("an isolated failure doesn't open any", () => {
    // Day 2 done, day 3 not done; today is the 4th.
    expect(reconcile([], done(2), local(2026, 3, 4, 12))).toEqual([])
  })

  it('the second failure in a row opens a pending one, triggered by that period', () => {
    // Days 3 and 4 not done; today is the 5th.
    const ds = reconcile([], done(2), local(2026, 3, 5, 12))
    expect(ds).toMatchObject([{ habitId: 'h', triggerPeriod: '2026-03-04', status: 'pending' }])
    expect(ds[0].law).toBeUndefined()
  })

  it("recomputing doesn't duplicate it, and a third or fourth failure doesn't open another", () => {
    const ds = reconcile([], done(2), local(2026, 3, 5, 12))
    expect(reconcile(ds, done(2), local(2026, 3, 5, 12))).toEqual(ds)
    expect(reconcile(ds, done(2), local(2026, 3, 7, 12))).toEqual(ds)
  })

  it("exists even if they log before recomputing: opening the app and doing the habit doesn't dodge it", () => {
    // Days 3 and 4 not done; on the 5th they open the app and do it before anything recomputes.
    expect(reconcile([], done(2, 5), local(2026, 3, 5, 12))).toMatchObject([{ triggerPeriod: '2026-03-04', status: 'pending' }])
  })

  it('a break that appears when fixing the past also opens one, even if already overcome', () => {
    // Everything done from the 2nd to the 9th; then it turns out they didn't do the 3rd and the 4th.
    const ds = reconcile([], done(2, 3, 4, 5, 6, 7, 8, 9), local(2026, 3, 10, 12))
    expect(ds).toEqual([])
    expect(reconcile(ds, done(2, 5, 6, 7, 8, 9), local(2026, 3, 10, 12))).toMatchObject([{ triggerPeriod: '2026-03-04', status: 'pending' }])
  })

  it("a break older than the last one isn't asked about: only the last has an open diagnosis", () => {
    // Breaks on the 4th and the 7th (the 7th already answered); fixing the past doesn't reopen the 4th.
    const answered = reconcile([], done(2, 5), local(2026, 3, 8, 12)).map((d) => answerDiagnosis(d, { status: 'answered', law: 1 }))
    expect(answered).toMatchObject([{ triggerPeriod: '2026-03-07' }])
    expect(reconcile(answered, done(2, 5), local(2026, 3, 8, 12))).toEqual(answered)
  })

  it('a new break, after recovering, opens another', () => {
    // Break on the 4th, recovers on the 5th, breaks again on the 7th.
    const first = reconcile([], done(2), local(2026, 3, 5, 12))
    const ds = reconcile(first.map((d) => answerDiagnosis(d, { status: 'dismissed' })), done(2, 5), local(2026, 3, 8, 12))
    expect(ds.map((d) => [d.triggerPeriod, d.status])).toEqual([
      ['2026-03-04', 'dismissed'],
      ['2026-03-07', 'pending'],
    ])
  })

  it('if the new break arrives with the previous one unanswered, that one is withdrawn: one open per habit', () => {
    const first = reconcile([], done(2), local(2026, 3, 5, 12))
    const snoozed = first.map((d) => answerDiagnosis(d, { status: 'snoozed' }))
    expect(reconcile(snoozed, done(2, 5), local(2026, 3, 8, 12))).toMatchObject([{ triggerPeriod: '2026-03-07', status: 'pending' }])
  })

  it('when fixing the past, an unanswered one whose break no longer exists disappears; an answered one stays', () => {
    const ds = reconcile([], done(2), local(2026, 3, 5, 12))
    // It turns out they did do day 3: there were no longer two failures in a row.
    expect(reconcile(ds, done(2, 3), local(2026, 3, 5, 12))).toEqual([])
    const answered = ds.map((d) => answerDiagnosis(d, { status: 'answered', law: 4 }))
    expect(reconcile(answered, done(2, 3), local(2026, 3, 5, 12))).toEqual(answered)
  })

  it("archived habits don't open a diagnosis", () => {
    expect(reconcile([], done(2), local(2026, 3, 5, 12), [{ ...read, archived: true }])).toEqual([])
  })
})

describe('diagnosis: statuses', () => {
  const now = local(2026, 3, 5, 12)
  const [pending] = reconcile([], done(2), now)

  it('answering saves the cause and the applied action', () => {
    expect(answerDiagnosis(pending, { status: 'answered', law: 3, action: 'edit_environment' })).toEqual({
      ...pending,
      status: 'answered',
      law: 3,
      appliedAction: 'edit_environment',
    })
    const withoutAction = answerDiagnosis(pending, { status: 'answered', law: 1 })
    expect(withoutAction).toMatchObject({ status: 'answered', law: 1 })
    expect('appliedAction' in withoutAction).toBe(false)
  })

  it.each(['answered', 'snoozed', 'dismissed'] as const)("one %s isn't reopened when recomputing", (status) => {
    const d = status === 'answered' ? answerDiagnosis(pending, { status, law: 2 }) : answerDiagnosis(pending, { status })
    expect(reconcile([d], done(2), now)).toEqual([d])
  })

  it('Today flags only the pending ones of active habits', () => {
    const other: Habit = { ...read, id: 'other', name: 'Run', archived: true }
    const ds: Diagnosis[] = [pending, { ...pending, id: 'x', habitId: 'other' }, answerDiagnosis({ ...pending, id: 'y' }, { status: 'snoozed' })]
    expect(pendingDiagnoses({ habits: [read, other], diagnoses: ds })).toEqual([{ diagnosis: pending, habit: read }])
  })

  it('"pause" (4th law) pauses the habit for a week from today, without touching its other pauses', () => {
    expect(DIAGNOSIS_PAUSE_DAYS).toBe(7)
    const withPause: Habit = { ...read, pauses: [{ start: '2026-03-02', end: '2026-03-02' }] }
    // 02:00 on the 6th is still logical day 5.
    expect(diagnosisPause({ habit: withPause, now: local(2026, 3, 6, 2), settings }).pauses).toEqual([
      { start: '2026-03-02', end: '2026-03-02' },
      { start: '2026-03-05', end: '2026-03-11' },
    ])
  })

  it('each cause offers its actions', () => {
    expect(DIAGNOSIS_ACTIONS[1]).toEqual(['edit_intention', 'export_ics'])
    expect(DIAGNOSIS_ACTIONS[2]).toEqual(['edit_reward', 'edit_identity'])
    expect(DIAGNOSIS_ACTIONS[3]).toEqual(['minimum_only', 'edit_environment'])
    expect(DIAGNOSIS_ACTIONS[4]).toEqual(['view_votes', 'pause', 'archive'])
  })
})

describe('reason for a failure', () => {
  it('saves the law and the trimmed note', () => {
    expect(failureNote({ habitId: 'h', period: '2026-03-03', law: 3, note: '  Exhausted ' })).toEqual({
      habitId: 'h',
      period: '2026-03-03',
      law: 3,
      note: 'Exhausted',
    })
    expect(failureNote({ habitId: 'h', period: '2026-03-03', note: 'No idea' })).toEqual({ habitId: 'h', period: '2026-03-03', note: 'No idea' })
  })

  it("without a law or a note there's nothing to save (persistence deletes any existing one)", () => {
    expect(failureNote({ habitId: 'h', period: '2026-03-03', note: '   ' })).toBeUndefined()
  })
})
