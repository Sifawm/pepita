import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MILESTONES, moveIdentity, newIdentity, newHabit, summarizeIdentities, type Habit, type CelebratedMilestone, type Identity, type Log } from '.'

const local = (y: number, month: number, d: number, h: number, min = 0) => new Date(y, month - 1, d, h, min)

const settings = DEFAULT_SETTINGS
const identity = (id: string, order: number, extra: Partial<Identity> = {}): Identity => ({
  id,
  createdAt: '2026-03-01T10:00:00.000Z',
  name: id,
  isGeneral: false,
  archived: false,
  order,
  ...extra,
})
const general = identity('general', 0, { name: '', isGeneral: true })

const habit = (id: string, identityId: string, extra: Partial<Habit> = {}): Habit => ({
  ...newHabit({ name: id, identityId, order: 0 }, local(2026, 3, 1, 9), settings),
  id,
  createdAt: '2026-03-01T08:00:00.000Z',
  ...extra,
})
const log = (habitId: string, day: string, n = 0): Log => ({
  id: `${habitId}-${day}-${n}`,
  createdAt: `${day}T10:0${n}:00.000Z`,
  habitId,
  day,
  type: n % 2 ? 'full' : 'minimum',
})

describe('votes per identity', () => {
  const reader = identity('reader', 1)
  const runner = identity('runner', 2, { archived: true })
  const habits = [habit('read', 'reader'), habit('poetry', 'reader', { archived: true }), habit('run', 'runner'), habit('water', 'general')]
  const logs = [
    log('read', '2026-03-14'),
    log('read', '2026-03-15'),
    log('read', '2026-03-15', 1),
    log('poetry', '2026-03-10'),
    log('run', '2026-03-02'),
    log('water', '2026-03-15'),
  ]

  it('adds each completed action to its identity, in total and on the logical day, in list order', () => {
    const summary = summarizeIdentities({
      identities: [runner, reader, general],
      habits,
      logs,
      now: local(2026, 3, 16, 1),
      settings,
    })
    expect(summary.map((s) => [s.identity.id, s.votes, s.votesToday])).toEqual([
      ['general', 1, 1],
      ['reader', 4, 2],
      ['runner', 1, 0],
    ])
  })

  it("the curve accumulates the identity's votes day by day, archived habits included", () => {
    const [, reader] = summarizeIdentities({ identities: [general, identity('reader', 1)], habits, logs, now: local(2026, 3, 16, 9), settings })
    expect(reader.series).toEqual([
      { day: '2026-03-10', votes: 1 },
      { day: '2026-03-14', votes: 2 },
      { day: '2026-03-15', votes: 4 },
    ])
  })

  it('an identity without habits starts with zero votes', () => {
    const [s] = summarizeIdentities({
      identities: [identity('new', 3)],
      habits,
      logs,
      now: local(2026, 3, 15, 9),
      settings,
    })
    expect([s.votes, s.votesToday]).toEqual([0, 0])
  })
})

describe('reorder identities', () => {
  const reader = identity('reader', 1)
  const old = identity('old', 2, { archived: true })
  const runner = identity('runner', 3)
  const list = [runner, old, general, reader]

  it('moving up swaps places with the active identity above, skipping archived ones', () => {
    expect(moveIdentity(list, 'runner', -1)).toEqual([
      { ...runner, order: 1 },
      { ...reader, order: 3 },
    ])
  })

  it('moving "General" down puts it after the next one', () => {
    expect(moveIdentity(list, 'general', 1)).toEqual([
      { ...general, order: 1 },
      { ...reader, order: 0 },
    ])
  })

  it('nothing changes at the edges', () => {
    expect(moveIdentity(list, 'general', -1)).toEqual([])
    expect(moveIdentity(list, 'runner', 1)).toEqual([])
  })
})

describe('new identity', () => {
  it('saves the phrase without extra whitespace and goes at the end of the list', () => {
    const reader = identity('reader', 1)
    const old = identity('old', 7, { archived: true })
    expect(newIdentity("  I'm a person who reads  ", [general, reader, old])).toEqual({
      name: "I'm a person who reads",
      isGeneral: false,
      archived: false,
      order: 8,
    })
  })
})

describe('milestones', () => {
  const reader = identity('reader', 1)
  const read = habit('read', 'reader')
  /** One vote a day from March 1st, `n` days. */
  const days = (n: number) => Array.from({ length: n }, (_, i) => log('read', `2026-03-${String(i + 1).padStart(2, '0')}`))
  const summarize = (logs: Log[], celebratedMilestones: CelebratedMilestone[] = []) =>
    summarizeIdentities({ identities: [reader], habits: [read], logs, celebratedMilestones, now: local(2026, 3, 31, 9), settings })[0]
  const celebrated = (threshold: number): CelebratedMilestone => ({
    id: `m${threshold}`,
    createdAt: '2026-03-10T20:00:00.000Z',
    identityId: 'reader',
    threshold,
  })

  it('are 10, 25, 50, 100, 250, 500 and 1000 votes', () => {
    expect(MILESTONES).toEqual([10, 25, 50, 100, 250, 500, 1000])
  })

  it('each milestone reached stores the day it was reached', () => {
    expect(summarize(days(26)).milestones).toEqual([
      { threshold: 10, day: '2026-03-10' },
      { threshold: 25, day: '2026-03-25' },
    ])
  })

  it('reaching a milestone leaves it pending celebration', () => {
    expect(summarize(days(9)).toCelebrate).toEqual([])
    expect(summarize(days(10)).toCelebrate).toEqual([10])
  })

  it("a celebrated milestone isn't celebrated again; the next one is", () => {
    expect(summarize(days(12), [celebrated(10)]).toCelebrate).toEqual([])
    expect(summarize(days(25), [celebrated(10)]).toCelebrate).toEqual([25])
  })

  it("editing logs (dropping below the milestone and rising again) doesn't relaunch it", () => {
    const celebratedOnes = [celebrated(10), celebrated(25)]
    const edited = days(25).filter((l) => l.day !== '2026-03-03')
    expect(summarize(edited, celebratedOnes).toCelebrate).toEqual([])
    expect(summarize([...edited, log('read', '2026-03-03', 1)], celebratedOnes).toCelebrate).toEqual([])
  })

  it("another identity's celebrated milestones don't count", () => {
    expect(summarize(days(10), [{ ...celebrated(10), identityId: 'other' }]).toCelebrate).toEqual([10])
  })
})
