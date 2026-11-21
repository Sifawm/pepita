import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, dismissSuggestion, progressionSuggestion, progressionSuggestions, addDays, type Diagnosis, type Habit, type Log, type DismissedSuggestion, type LogType } from '.'

const local = (y: number, month: number, d: number, h = 12) => new Date(y, month - 1, d, h)
const settings = DEFAULT_SETTINGS

// Daily habit from Thursday, January 1st 2026.
const read: Habit = {
  id: 'h',
  createdAt: '2026-01-01T08:00:00.000Z',
  identityId: 'general',
  name: 'Read',
  type: 'yes_no',
  frequency: { type: 'times_per_period', times: 1, period: 'day' },
  startDate: '2026-01-01',
  archived: false,
  order: 0,
}

/** One log per day, from `start` to `end` (inclusive). */
function everyDay(start: string, end: string, type: LogType = 'minimum', extra: Partial<Log> = {}): Log[] {
  const ls: Log[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) ls.push({ id: `${day}-${type}`, createdAt: `${day}T10:00:00.000Z`, habitId: 'h', day, type, ...extra })
  return ls
}

const suggestion = (
  logs: Log[],
  now: Date,
  { habit = read, diagnoses = [] as Diagnosis[], dismissedSuggestions = [] as DismissedSuggestion[] } = {},
) => progressionSuggestion({ habit, logs, diagnoses, dismissedSuggestions, now, settings })

describe('progression: raise the bar after 21 days of high strength', () => {
  it('with about 3 weeks of strength ≥ 0.8 it suggests raising', () => {
    // A perfect daily habit is around 0.8 at 30 days: on March 1st it's been above for more than 3 weeks.
    expect(suggestion(everyDay('2026-01-01', '2026-03-01', 'full'), local(2026, 3, 1))).toMatchObject({ type: 'raise' })
  })

  it('with high strength for only a few days, not yet', () => {
    expect(suggestion(everyDay('2026-01-01', '2026-02-10', 'full'), local(2026, 2, 10))).toBeUndefined()
  })

  it('a just-started habit never suggests anything', () => {
    expect(suggestion([], local(2026, 1, 1))).toBeUndefined()
  })
})

describe('progression: what raising proposes', () => {
  const now = local(2026, 3, 1)

  it('if the minimum dominates, it proposes doing the full one more often (without changing the rule)', () => {
    expect(suggestion(everyDay('2026-01-01', '2026-03-01', 'minimum'), now)).toEqual({ type: 'raise', dominant: 'minimum' })
  })

  it('what dominates is looked at over the last 3 weeks, not the whole history', () => {
    // 37 days of minimum and then 23 of full: overall the minimum wins, but the recent past is full.
    const logs = [...everyDay('2026-01-01', '2026-02-06', 'minimum'), ...everyDay('2026-02-07', '2026-03-01', 'full')]
    expect(suggestion(logs, now)).toEqual({ type: 'raise', dominant: 'full' })
  })

  it('if the full one dominates on a yes/no, it proposes raising the target or the frequency (chosen in the wizard)', () => {
    expect(suggestion(everyDay('2026-01-01', '2026-03-01', 'full'), now)).toEqual({ type: 'raise', dominant: 'full' })
  })

  it('on an "at least" quantitative habit, it proposes a slightly higher target', () => {
    const pages: Habit = { ...read, type: 'quantitative', quantitative: { unit: 'pages', target: 10, minTarget: 2, mode: 'at_least' } }
    expect(suggestion(everyDay('2026-01-01', '2026-03-01', 'value', { value: 10 }), now, { habit: pages })).toEqual({
      type: 'raise',
      dominant: 'full',
      proposal: { frequency: read.frequency, quantitative: { unit: 'pages', target: 12, minTarget: 2, mode: 'at_least' } },
    })
  })

  it('on an "at most" quantitative habit, raising the bar means allowing less', () => {
    const coffees: Habit = { ...read, type: 'quantitative', quantitative: { unit: 'coffees', target: 3, mode: 'at_most' } }
    expect(suggestion([], now, { habit: coffees })).toEqual({
      type: 'raise',
      dominant: 'full',
      proposal: { frequency: read.frequency, quantitative: { unit: 'coffees', target: 2, mode: 'at_most' } },
    })
    // With "at most 1" there's no lower number to propose: it's adjusted in the wizard.
    const one: Habit = { ...coffees, quantitative: { unit: 'coffees', target: 1, mode: 'at_most' } }
    expect(suggestion([], now, { habit: one })).toEqual({ type: 'raise', dominant: 'full' })
  })

  it('a habit to avoid has no bar to raise', () => {
    expect(suggestion([], now, { habit: { ...read, type: 'avoid' } })).toBeUndefined()
  })
})

describe('progression: lower the bar after a 3rd-law diagnosis', () => {
  // Done until March 1st, fails on the 2nd and 3rd (break on the 3rd); today is the 4th.
  const logs = everyDay('2026-02-20', '2026-03-01')
  const now = local(2026, 3, 4)
  const diagnosis = (law: 1 | 2 | 3 | 4, extra: Partial<Diagnosis> = {}): Diagnosis => ({
    id: 'd',
    createdAt: '2026-03-04T09:00:00.000Z',
    habitId: 'h',
    triggerPeriod: '2026-03-03',
    status: 'answered',
    law,
    ...extra,
  })

  it('"it was hard" suggests settling for the minimum; on a yes/no it\'s adjusted in the wizard', () => {
    expect(suggestion(logs, now, { diagnoses: [diagnosis(3)] })).toEqual({ type: 'lower' })
  })

  it("another cause, or an unanswered diagnosis, doesn't suggest lowering", () => {
    expect(suggestion(logs, now, { diagnoses: [diagnosis(1)] })).toBeUndefined()
    expect(suggestion(logs, now, { diagnoses: [diagnosis(3, { status: 'snoozed', law: undefined })] })).toBeUndefined()
  })

  it("only the habit's last diagnosis counts", () => {
    const previous = diagnosis(3, { id: 'before', triggerPeriod: '2026-02-10' })
    expect(suggestion(logs, now, { diagnoses: [diagnosis(4), previous] })).toBeUndefined()
  })

  it('on an "at least" quantitative habit, it proposes that the minimum target becomes the target', () => {
    const pages: Habit = { ...read, type: 'quantitative', quantitative: { unit: 'pages', target: 20, minTarget: 5, mode: 'at_least' } }
    expect(suggestion([], now, { habit: pages, diagnoses: [diagnosis(3)] })).toEqual({
      type: 'lower',
      proposal: { frequency: read.frequency, quantitative: { unit: 'pages', target: 5, mode: 'at_least' } },
    })
    // Without a minimum target, it proposes a slightly lower one.
    const noMinimum: Habit = { ...pages, quantitative: { unit: 'pages', target: 20, mode: 'at_least' } }
    expect(suggestion([], now, { habit: noMinimum, diagnoses: [diagnosis(3)] })).toMatchObject({
      proposal: { quantitative: { target: 16 } },
    })
  })

  it('on an "at most" quantitative habit, lowering the bar means allowing a bit more', () => {
    // Recently started: an "at most" without logs doesn't have high strength yet.
    const coffees: Habit = { ...read, startDate: '2026-03-01', type: 'quantitative', quantitative: { unit: 'coffees', target: 3, mode: 'at_most' } }
    expect(suggestion([], now, { habit: coffees, diagnoses: [diagnosis(3)] })).toEqual({
      type: 'lower',
      proposal: { frequency: read.frequency, quantitative: { unit: 'coffees', target: 4, mode: 'at_most' } },
    })
  })

  it("when avoiding it's suggested too (no rule to change: friction is reviewed in the wizard)", () => {
    expect(suggestion([], now, { habit: { ...read, type: 'avoid' }, diagnoses: [diagnosis(3)] })).toEqual({ type: 'lower' })
  })
})

/** What persistence would save when dismissing (or applying) the suggestion at that instant. */
const dismissed = (type: 'raise' | 'lower', now: Date): DismissedSuggestion => ({
  ...dismissSuggestion({ habit: read, type, now, settings }),
  id: `s-${type}`,
  createdAt: now.toISOString(),
})

describe("progression: a dismissed suggestion doesn't come back until 21 days have passed", () => {
  it("raise, dismissed on March 1st, doesn't show up until the 22nd", () => {
    const logs = everyDay('2026-01-01', '2026-03-31', 'full')
    const dismissedSuggestions = [dismissed('raise', local(2026, 3, 1))]
    expect(suggestions(logs, local(2026, 3, 1), dismissedSuggestions)).toBeUndefined()
    expect(suggestions(logs, local(2026, 3, 21), dismissedSuggestions)).toBeUndefined()
    expect(suggestions(logs, local(2026, 3, 22), dismissedSuggestions)).toMatchObject({ type: 'raise' })
  })

  it("lower, dismissed on March 4th, doesn't show up until the 25th (the same diagnosis still applies)", () => {
    const d: Diagnosis = { id: 'a', createdAt: '2026-03-04T09:00:00.000Z', habitId: 'h', triggerPeriod: '2026-03-03', status: 'answered', law: 3 }
    const dismissedSuggestions = [dismissed('lower', local(2026, 3, 4))]
    const on = (now: Date) => suggestion([], now, { diagnoses: [d], dismissedSuggestions })
    expect(on(local(2026, 3, 4))).toBeUndefined()
    expect(on(local(2026, 3, 24))).toBeUndefined()
    expect(on(local(2026, 3, 25))).toEqual({ type: 'lower' })
  })

  it("lower applied (the rule changed after the diagnosis) doesn't propose another cut", () => {
    const d: Diagnosis = { id: 'a', createdAt: '2026-03-04T09:00:00.000Z', habitId: 'h', triggerPeriod: '2026-03-03', status: 'answered', law: 3 }
    const pages: Habit = {
      ...read,
      type: 'quantitative',
      quantitative: { unit: 'pages', target: 5, mode: 'at_least' },
      // Target 20 (minimum 5) until March 3rd; from the 4th, the minimum became the target.
      versions: [{ until: '2026-03-03', frequency: read.frequency, quantitative: { unit: 'pages', target: 20, minTarget: 5, mode: 'at_least' } }],
    }
    const dismissedSuggestions = [dismissed('lower', local(2026, 3, 4))]
    expect(suggestion([], local(2026, 4, 30), { habit: pages, diagnoses: [d], dismissedSuggestions })).toBeUndefined()
  })

  function suggestions(logs: Log[], now: Date, dismissedSuggestions: DismissedSuggestion[]) {
    return suggestion(logs, now, { dismissedSuggestions })
  }
})

describe('progression: the list for Today and the review', () => {
  it('gathers the active suggestion of each active habit', () => {
    const run: Habit = { ...read, id: 'r', name: 'Run' }
    const archived: Habit = { ...read, id: 'a', archived: true }
    const logs = ['h', 'r', 'a'].flatMap((habitId) => everyDay('2026-01-01', '2026-03-01', 'full').map((l) => ({ ...l, id: `${habitId}${l.id}`, habitId })))
    const list = progressionSuggestions({ habits: [read, run, archived], logs, diagnoses: [], dismissedSuggestions: [dismissed('raise', local(2026, 2, 25))], now: local(2026, 3, 1), settings })
    expect(list).toEqual([{ habit: run, suggestion: { type: 'raise', dominant: 'full' } }])
  })
})
