import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, evaluateHabit, type Habit, type Log } from '.'

const local = (y: number, month: number, d: number, h: number) => new Date(y, month - 1, d, h)
const settings = DEFAULT_SETTINGS

// March 2026: Monday the 2nd starts a week.
const daily: Habit = {
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

const log = (day: string, type: Log['type'] = 'minimum'): Log => ({
  id: `${day}-${type}`,
  createdAt: `${day}T10:00:00.000Z`,
  habitId: 'h',
  day,
  type,
})
const done = (...days: number[]) => days.map((d) => log(`2026-03-${String(d).padStart(2, '0')}`))

describe('recovery ("never miss twice")', () => {
  it('after a failure, the current period is in recovery; once the next is met, it no longer is', () => {
    // Day 2 done, day 3 not done.
    const after = evaluateHabit({ habit: daily, logs: done(2), now: local(2026, 3, 4, 12), settings })
    expect(after.recovering).toBe(true)
    const later = evaluateHabit({ habit: daily, logs: done(2, 4), now: local(2026, 3, 5, 12), settings })
    expect(later.recovering).toBe(false)
  })

  it("stays in recovery even if you've already done it today (Today doesn't reorder on tap)", () => {
    const e = evaluateHabit({ habit: daily, logs: done(2, 4), now: local(2026, 3, 4, 12), settings })
    expect(e.recovering).toBe(true)
  })

  it("skips and pauses don't count when looking for the previous period", () => {
    const withSkip = evaluateHabit({
      habit: daily,
      logs: [...done(2), log('2026-03-04', 'skip')],
      now: local(2026, 3, 5, 12),
      settings,
    })
    expect(withSkip.recovering).toBe(true)
    const withPause = evaluateHabit({
      habit: { ...daily, pauses: [{ start: '2026-03-04', end: '2026-03-05' }] },
      logs: done(2),
      now: local(2026, 3, 6, 12),
      settings,
    })
    expect(withPause.recovering).toBe(true)
  })

  it('neither do unscheduled days: a missed Monday puts Wednesday in recovery', () => {
    const monWed: Habit = { ...daily, frequency: { type: 'weekdays', days: [1, 3] } }
    const e = evaluateHabit({ habit: monWed, logs: [], now: local(2026, 3, 4, 12), settings })
    expect(e.recovering).toBe(true)
  })

  it("today skipped or paused isn't in recovery (there's nothing to suggest)", () => {
    const e = evaluateHabit({
      habit: daily,
      logs: [log('2026-03-04', 'skip')],
      now: local(2026, 3, 4, 12),
      settings,
    })
    expect(e.recovering).toBe(false)
  })

  it('weekly: 2 of 3 when Sunday closes is a failure; Monday is in recovery', () => {
    const three: Habit = { ...daily, frequency: { type: 'times_per_period', times: 3, period: 'week' } }
    expect(evaluateHabit({ habit: three, logs: done(3, 5), now: local(2026, 3, 9, 3), settings }).recovering).toBe(false)
    expect(evaluateHabit({ habit: three, logs: done(3, 5), now: local(2026, 3, 9, 4), settings }).recovering).toBe(true)
  })

  it('retroactive editing recomputes recovery: logging the forgotten day clears it', () => {
    const forgot = evaluateHabit({ habit: daily, logs: done(2), now: local(2026, 3, 4, 12), settings })
    expect(forgot.recovering).toBe(true)
    const fixed = evaluateHabit({ habit: daily, logs: done(2, 3), now: local(2026, 3, 4, 12), settings })
    expect(fixed.recovering).toBe(false)
  })
})

describe('streak', () => {
  it("counts consecutive met periods, including today's if already done", () => {
    const e = evaluateHabit({ habit: daily, logs: done(2, 3, 4), now: local(2026, 3, 4, 12), settings })
    expect(e.streak).toEqual({ current: 3, best: 3 })
  })

  it("the current period not yet done doesn't break it", () => {
    const e = evaluateHabit({ habit: daily, logs: done(2, 3), now: local(2026, 3, 4, 12), settings })
    expect(e.streak).toEqual({ current: 2, best: 2 })
  })

  it("an isolated failure doesn't add but doesn't break it either", () => {
    const e = evaluateHabit({ habit: daily, logs: done(2, 3, 5, 6), now: local(2026, 3, 7, 12), settings })
    expect(e.streak).toEqual({ current: 4, best: 4 })
    expect(e.consecutiveFailures).toBe(0)
  })

  it('the second failure in a row resets it to 0; the best is kept', () => {
    const e = evaluateHabit({ habit: daily, logs: done(2, 3, 4, 7), now: local(2026, 3, 7, 12), settings })
    expect(e.streak).toEqual({ current: 1, best: 3 })
  })

  it('a failure, a skip and another failure count as two consecutive failures', () => {
    const e = evaluateHabit({
      habit: daily,
      logs: [...done(2, 3), log('2026-03-05', 'skip')],
      now: local(2026, 3, 7, 12),
      settings,
    })
    expect(e.streak).toEqual({ current: 0, best: 2 })
    expect(e.consecutiveFailures).toBe(2)
  })

  it("pauses don't affect it either", () => {
    const e = evaluateHabit({
      habit: { ...daily, pauses: [{ start: '2026-03-04', end: '2026-03-05' }] },
      logs: done(2, 3, 6),
      now: local(2026, 3, 6, 12),
      settings,
    })
    expect(e.streak).toEqual({ current: 3, best: 3 })
  })
})

describe('consecutive failures (for the diagnosis)', () => {
  it('counts trailing failures and marks each streak break only once', () => {
    // 3, 4 and 5 fail (one break, on the 4th); the 6th is met; 7 and 8 fail (another break, on the 8th).
    const e = evaluateHabit({ habit: daily, logs: done(2, 6), now: local(2026, 3, 9, 12), settings })
    expect(e.consecutiveFailures).toBe(2)
    expect(e.streakBreaks.map((p) => p.start)).toEqual(['2026-03-04', '2026-03-08'])
  })

  it('retroactive editing recomputes the breaks', () => {
    const e = evaluateHabit({ habit: daily, logs: done(2, 4, 6), now: local(2026, 3, 9, 12), settings })
    expect(e.streakBreaks.map((p) => p.start)).toEqual(['2026-03-08'])
  })
})
