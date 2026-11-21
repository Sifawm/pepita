import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, weeklyNote, review, addDays, type FailureNote, type Diagnosis, type Habit, type Identity, type Log } from '.'

const settings = DEFAULT_SETTINGS
// Monday the 16th to Sunday the 22nd of November 2026; "now" is Thursday the 19th.
const now = new Date(2026, 10, 19, 12)

const identity = (id: string, order: number, extra: Partial<Identity> = {}): Identity => ({
  id,
  createdAt: '2026-11-01T10:00:00.000Z',
  name: id,
  isGeneral: false,
  archived: false,
  order,
  ...extra,
})
const general = identity('general', 0, { name: '', isGeneral: true })

const habit = (id: string, identityId: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  createdAt: '2026-11-01T08:00:00.000Z',
  identityId,
  name: id,
  type: 'yes_no',
  frequency: { type: 'times_per_period', times: 1, period: 'day' },
  minimumVersion: 'A little',
  intention: { when: { time: '08:00' } },
  environment: ['All set'],
  pairedReward: 'A tea',
  startDate: '2026-11-01',
  archived: false,
  order: 0,
  ...extra,
})
const log = (habitId: string, day: string, extra: Partial<Log> = {}): Log => ({
  id: `${habitId}-${day}`,
  createdAt: `${day}T10:00:00.000Z`,
  habitId,
  day,
  type: 'minimum',
  ...extra,
})

const nothingElse = { diagnoses: [], dismissedSuggestions: [], weeklyReviews: [], failureNotes: [], now, settings }

describe("the week's votes", () => {
  it("adds up per identity only the votes from Monday to Sunday of the requested week", () => {
    const reader = identity('reader', 1)
    const r = review({
      ...nothingElse,
      start: '2026-11-19',
      identities: [reader, general],
      habits: [habit('read', 'reader'), habit('run', 'general')],
      logs: [
        log('read', '2026-11-15'), // previous Sunday: outside
        log('read', '2026-11-16'),
        log('read', '2026-11-18'),
        log('run', '2026-11-22'), // Sunday: inside
        log('run', '2026-11-23'), // next Monday: outside
      ],
    })
    expect(r.start).toBe('2026-11-16')
    expect(r.end).toBe('2026-11-22')
    expect(r.votes.map((v) => [v.identity.id, v.votes])).toEqual([
      ['general', 1],
      ['reader', 2],
    ])
  })

  it('for printing it covers whole weeks, and an archived identity only shows up if it added votes', () => {
    const r = review({
      ...nothingElse,
      start: '2026-11-04',
      end: '2026-11-17',
      identities: [general, identity('before', 1, { archived: true }), identity('nothing', 2, { archived: true })],
      habits: [habit('read', 'general'), habit('old', 'before', { archived: true })],
      logs: [log('read', '2026-11-01'), log('read', '2026-11-02'), log('old', '2026-11-10'), log('read', '2026-11-22'), log('read', '2026-11-23')],
    })
    expect([r.start, r.end]).toEqual(['2026-11-02', '2026-11-22'])
    expect(r.votes.map((v) => [v.identity.id, v.votes])).toEqual([
      ['general', 2],
      ['before', 1],
    ])
  })
})

describe('free-form note', () => {
  it("brings the notes of the period's weeks, oldest to newest", () => {
    const note = (week: string) => ({ id: week, createdAt: `${week}T20:00:00.000Z`, week, note: `Week ${week}` })
    const r = review({
      ...nothingElse,
      start: '2026-11-10',
      end: '2026-11-17',
      identities: [general],
      habits: [],
      logs: [],
      weeklyReviews: [note('2026-11-23'), note('2026-11-16'), note('2026-11-02'), note('2026-11-09')],
    })
    expect(r.notes.map((n) => n.week)).toEqual(['2026-11-09', '2026-11-16'])
  })
})

describe('what needs attention', () => {
  /** One log every day from `start` to `end`, except those in `except`. */
  const everyDay = (habitId: string, start: string, end: string, except: string[] = []) => {
    const ls: Log[] = []
    for (let day = start; day <= end; day = addDays(day, 1)) if (!except.includes(day)) ls.push(log(habitId, day))
    return ls
  }
  const diagnosis = (id: string, habitId: string, extra: Partial<Diagnosis>): Diagnosis => ({
    id,
    createdAt: '2026-11-10T10:00:00.000Z',
    habitId,
    triggerPeriod: '2026-11-09',
    status: 'pending',
    ...extra,
  })

  it('gathers the recovering habits, the unanswered diagnoses and the progression suggestions', () => {
    const habits = [habit('read', 'general'), habit('run', 'general', { order: 1 }), habit('meditate', 'general', { order: 2 }), habit('old', 'general', { archived: true })]
    const r = review({
      ...nothingElse,
      start: '2026-11-19',
      identities: [general],
      habits,
      // "read" failed yesterday; "old" too, but it's archived.
      logs: [
        ...everyDay('read', '2026-11-01', '2026-11-17'),
        ...everyDay('run', '2026-11-01', '2026-11-18'),
        ...everyDay('meditate', '2026-11-01', '2026-11-18'),
        ...everyDay('old', '2026-11-01', '2026-11-17'),
      ],
      diagnoses: [
        diagnosis('d1', 'run', { status: 'snoozed' }),
        diagnosis('d2', 'meditate', { status: 'answered', law: 3 }),
        diagnosis('d3', 'read', { triggerPeriod: '2026-11-05', status: 'dismissed' }),
        diagnosis('d4', 'read', { triggerPeriod: '2026-11-06' }),
        diagnosis('d5', 'old', {}),
      ],
    })
    expect(r.recovering.map((h) => h.id)).toEqual(['read'])
    expect(r.diagnoses.map((d) => [d.habit.id, d.diagnosis.id])).toEqual([
      ['read', 'd4'],
      ['run', 'd1'],
    ])
    expect(r.suggestions.map((s) => [s.habit.id, s.suggestion.type])).toEqual([['meditate', 'lower']])
  })
})

describe('empty method fields', () => {
  it('reminds on each active habit only the fields that make sense for its type', () => {
    const reader = identity('reader', 1)
    const empty = { minimumVersion: undefined, intention: undefined, environment: undefined, pairedReward: undefined }
    const target = { unit: 'pages', target: 10 }
    const r = review({
      ...nothingElse,
      start: '2026-11-19',
      identities: [general, reader],
      logs: [],
      habits: [
        habit('complete', 'reader'),
        habit('loose', 'general', { ...empty, order: 1 }),
        habit('pages', 'reader', { type: 'quantitative', quantitative: { ...target, mode: 'at_least' }, minimumVersion: undefined, order: 2 }),
        habit('coffees', 'reader', { type: 'quantitative', quantitative: { ...target, mode: 'at_most' }, minimumVersion: undefined, order: 3 }),
        habit('social', 'reader', { type: 'avoid', ...empty, order: 4 }),
        habit('tv', 'general', { type: 'avoid', ...empty, order: 5 }),
        habit('old', 'general', { ...empty, archived: true }),
      ],
    })
    expect(r.emptyFields.map((e) => [e.habit.id, e.fields])).toEqual([
      ['loose', ['identity', 'minimumVersion', 'intention', 'environment', 'reward']],
      ['pages', ['minimumVersion']],
      ['tv', ['identity']],
    ])
  })
})

describe('reasons for noted failures', () => {
  const note = (id: string, habitId: string, period: string, extra: Partial<FailureNote> = {}): FailureNote => ({
    id,
    createdAt: `${period}T22:00:00.000Z`,
    habitId,
    period,
    ...extra,
  })

  it("gathers those of the week's periods, in order, with their habit (archived too)", () => {
    const read = habit('read', 'general')
    const old = habit('old', 'general', { archived: true, order: 1 })
    const r = review({
      ...nothingElse,
      start: '2026-11-19',
      identities: [general],
      habits: [read, old],
      logs: [],
      failureNotes: [
        note('a', 'read', '2026-11-18', { note: 'Very tired' }),
        note('b', 'old', '2026-11-16', { law: 3 }),
        note('c', 'read', '2026-11-15', { law: 1 }), // previous Sunday: outside
      ],
    })
    expect(r.failures.map((f) => [f.habit.id, f.note.id])).toEqual([
      ['old', 'b'],
      ['read', 'a'],
    ])
  })
})

describe("the week's free-form note", () => {
  it("is saved trimmed and on its week's Monday", () => {
    expect(weeklyNote('2026-11-19', '  Good week \n')).toEqual({ week: '2026-11-16', note: 'Good week' })
  })

  it("without text there's no note (persistence deletes it)", () => {
    expect(weeklyNote('2026-11-16', '   ')).toBeUndefined()
  })
})
