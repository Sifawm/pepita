import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, buildToday, editHabit, evaluateHabit, newHabit, relapse, summarizeIdentities, type Habit, type Identity, type Log } from '.'

const local = (y: number, month: number, d: number, h: number) => new Date(y, month - 1, d, h)
const settings = DEFAULT_SETTINGS

// From Monday, March 2nd 2026, no social media.
const socialMedia: Habit = {
  id: 'h',
  createdAt: '2026-03-02T08:00:00.000Z',
  identityId: 'general',
  name: 'Social media',
  type: 'avoid',
  frequency: { type: 'times_per_period', times: 1, period: 'day' },
  startDate: '2026-03-02',
  archived: false,
  order: 0,
}

const relapseLog = (day: string, trigger?: string): Log => ({
  id: `${day}-relapse`,
  createdAt: `${day}T22:00:00.000Z`,
  habitId: 'h',
  day,
  type: 'relapse',
  ...(trigger && { trigger }),
})

describe("habit to avoid: the period is the day and it's met if it closes without a relapse", () => {
  it('a clean day adds 1 vote only when it closes (04:00)', () => {
    const before = evaluateHabit({ habit: socialMedia, logs: [], now: local(2026, 3, 3, 3), settings })
    expect(before.votes).toBe(0)
    expect(before.current?.status).toBe('in_progress')
    const after = evaluateHabit({ habit: socialMedia, logs: [], now: local(2026, 3, 3, 4), settings })
    expect(after.votes).toBe(1)
    // The vote belongs to the clean day, not the day it closed.
    expect(after.voteDays).toEqual(['2026-03-02'])
    expect(after.periods.map((p) => p.status)).toEqual(['done_full', 'in_progress'])
  })

  it("a relapse turns that day into a failure on the spot and doesn't add a vote", () => {
    const e = evaluateHabit({ habit: socialMedia, logs: [relapseLog('2026-03-03', 'Boredom')], now: local(2026, 3, 3, 23), settings })
    expect(e.periods.map((p) => p.status)).toEqual(['done_full', 'failed'])
    expect(e.votes).toBe(1)
  })

  it('after a relapse, the next day is in recovery and the streak goes on', () => {
    // 2nd and 3rd clean, relapse on the 4th; today is the 5th.
    const e = evaluateHabit({ habit: socialMedia, logs: [relapseLog('2026-03-04')], now: local(2026, 3, 5, 12), settings })
    expect(e.recovering).toBe(true)
    expect(e.streak).toEqual({ current: 2, best: 2 })
    expect(e.votes).toBe(2)
  })

  it('two relapses in a row break the streak (one break)', () => {
    const e = evaluateHabit({
      habit: socialMedia,
      logs: [relapseLog('2026-03-04'), relapseLog('2026-03-05')],
      now: local(2026, 3, 6, 12),
      settings,
    })
    expect(e.streak).toEqual({ current: 0, best: 2 })
    expect(e.streakBreaks.map((p) => p.start)).toEqual(['2026-03-05'])
    expect(e.consecutiveFailures).toBe(2)
  })

  it('the period is the day even if the stored frequency says otherwise', () => {
    const weekly: Habit = { ...socialMedia, frequency: { type: 'times_per_period', times: 3, period: 'week' } }
    const e = evaluateHabit({ habit: weekly, logs: [], now: local(2026, 3, 5, 12), settings })
    expect(e.periods.map((p) => p.start)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'])
    expect(e.votes).toBe(3)
  })

  it("a skipped or paused day neither adds nor fails, even with a relapse", () => {
    const e = evaluateHabit({
      habit: { ...socialMedia, pauses: [{ start: '2026-03-03', end: '2026-03-03' }] },
      logs: [relapseLog('2026-03-03'), { ...relapseLog('2026-03-04'), id: 's', type: 'skip' }],
      now: local(2026, 3, 5, 12),
      settings,
    })
    expect(e.periods.map((p) => p.status)).toEqual(['done_full', 'paused', 'skipped', 'in_progress'])
    expect(e.votes).toBe(1)
  })
})

describe("identity's votes", () => {
  const general: Identity = { id: 'general', createdAt: '2026-03-01T08:00:00.000Z', name: '', isGeneral: true, archived: false, order: 0 }

  it('each clean, already closed day adds 1 vote to its identity; today not yet', () => {
    // 2, 3 and 5 clean and closed; relapse on the 4th; today (6th) in progress.
    const [s] = summarizeIdentities({
      identities: [general],
      habits: [socialMedia],
      logs: [relapseLog('2026-03-04')],
      now: local(2026, 3, 6, 12),
      settings,
    })
    expect([s.votes, s.votesToday]).toEqual([3, 0])
  })
})

describe('create and edit a habit to avoid (inverse laws)', () => {
  it("saves the filled-in steps, trimmed; a skipped step isn't saved", () => {
    const h = newHabit(
      { name: ' Social ', identityId: 'general', order: 0, type: 'avoid', inverseLaws: { cue: ' Phone out of the bedroom ', friction: '', substitute: 'Read' } },
      local(2026, 3, 2, 9),
      settings,
    )
    expect(h).toMatchObject({ name: 'Social', type: 'avoid', inverseLaws: { cue: 'Phone out of the bedroom', substitute: 'Read' } })
    expect(h.inverseLaws).not.toHaveProperty('friction')
  })

  it('with no step filled in there are no inverse laws; a yes/no habit never has them', () => {
    const empty = { cue: ' ', friction: '', substitute: undefined }
    expect(newHabit({ name: 'Social', identityId: 'general', order: 0, type: 'avoid', inverseLaws: empty }, local(2026, 3, 2, 9), settings)).not.toHaveProperty('inverseLaws')
    expect(newHabit({ name: 'Read', identityId: 'general', order: 0, inverseLaws: { cue: 'x' } }, local(2026, 3, 2, 9), settings)).toMatchObject({ type: 'yes_no' })
    expect(newHabit({ name: 'Read', identityId: 'general', order: 0, inverseLaws: { cue: 'x' } }, local(2026, 3, 2, 9), settings)).not.toHaveProperty('inverseLaws')
  })

  it('editing replaces the inverse laws and keeps the type', () => {
    const withLaws = { ...socialMedia, inverseLaws: { cue: 'Phone', friction: 'Log out' } }
    const edited = editHabit(
      withLaws,
      { name: 'Social', identityId: 'general', frequency: socialMedia.frequency, inverseLaws: { substitute: 'Take a walk' } },
      local(2026, 3, 5, 9),
      settings,
    )
    expect(edited).toMatchObject({ type: 'avoid', inverseLaws: { substitute: 'Take a walk' } })
    expect(edited.inverseLaws).toEqual({ substitute: 'Take a walk' })
  })
})

describe('log a relapse', () => {
  it('goes to the logical day, with the trigger if given', () => {
    expect(relapse({ habit: socialMedia, trigger: ' Boredom ', now: local(2026, 3, 4, 1), settings })).toEqual({
      habitId: 'h',
      day: '2026-03-03',
      type: 'relapse',
      trigger: 'Boredom',
    })
    expect(relapse({ habit: socialMedia, trigger: '  ', now: local(2026, 3, 4, 12), settings })).toEqual({ habitId: 'h', day: '2026-03-04', type: 'relapse' })
  })
})

describe('on Today', () => {
  const general: Identity = { id: 'general', createdAt: '2026-03-01T08:00:00.000Z', name: '', isGeneral: true, archived: false, order: 0 }

  it("the card carries today's relapses and the day is a failure; it adds no votes today", () => {
    const today = buildToday({
      habits: [socialMedia],
      identities: [general],
      logs: [relapseLog('2026-03-03'), relapseLog('2026-03-04', 'Stress')],
      now: local(2026, 3, 4, 20),
      settings,
    })
    const [c] = today.habits
    expect(c.relapses.map((l) => l.trigger)).toEqual(['Stress'])
    expect(c.period.status).toBe('failed')
    expect(c.done).toBe(false)
    expect(today.votes).toBe(0)
  })
})
