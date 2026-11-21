import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, evaluateHabit, type Frequency, type Habit, type Log } from '.'

const local = (y: number, month: number, d: number, h: number, min = 0) => new Date(y, month - 1, d, h, min)
const settings = DEFAULT_SETTINGS

// March 2026: Monday the 2nd starts a week; Sunday the 8th closes it.
const habit = (frequency: Frequency, startDate = '2026-03-02'): Habit => ({
  id: 'h',
  createdAt: '2026-03-02T08:00:00.000Z',
  identityId: 'general',
  name: 'Read',
  type: 'yes_no',
  frequency,
  startDate,
  archived: false,
  order: 0,
})
const daily = habit({ type: 'times_per_period', times: 1, period: 'day' })

let n = 0
const log = (day: string, type: Log['type'] = 'minimum'): Log => ({
  id: `l${n++}`,
  createdAt: `${day}T10:00:00.000Z`,
  habitId: 'h',
  day,
  type,
})

const statuses = (e: ReturnType<typeof evaluateHabit>) => e.periods.map((p) => [p.start, p.status])

describe('evaluation: daily habit', () => {
  it("each day is a period; today's stays in progress until the cutoff time", () => {
    const e = evaluateHabit({
      habit: daily,
      logs: [log('2026-03-02')],
      now: local(2026, 3, 4, 3, 59),
      settings,
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_minimum'],
      ['2026-03-03', 'in_progress'],
    ])
  })

  it('a day without a log becomes failed when it closes', () => {
    const e = evaluateHabit({
      habit: daily,
      logs: [log('2026-03-02')],
      now: local(2026, 3, 4, 4),
      settings,
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_minimum'],
      ['2026-03-03', 'failed'],
      ['2026-03-04', 'in_progress'],
    ])
  })

  it("it's full only if every log in the period is the full version", () => {
    const twiceADay = habit({ type: 'times_per_period', times: 2, period: 'day' })
    const e = evaluateHabit({
      habit: twiceADay,
      logs: [log('2026-03-02', 'full'), log('2026-03-02', 'full'), log('2026-03-03', 'full'), log('2026-03-03', 'minimum')],
      now: local(2026, 3, 3, 12),
      settings,
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_full'],
      ['2026-03-03', 'done_minimum'],
    ])
  })

  it('closing follows the configured time', () => {
    const e = evaluateHabit({
      habit: daily,
      logs: [],
      now: local(2026, 3, 3, 0, 30),
      settings: { dayCutoff: '00:00' },
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'failed'],
      ['2026-03-03', 'in_progress'],
    ])
  })

  it('has no periods yet if it starts in the future', () => {
    const e = evaluateHabit({
      habit: habit(daily.frequency, '2026-03-10'),
      logs: [],
      now: local(2026, 3, 9, 12),
      settings,
    })
    expect(e.periods).toEqual([])
    expect(e.current).toBeUndefined()
  })
})

describe('evaluation: times per week', () => {
  const threePerWeek = habit({ type: 'times_per_period', times: 3, period: 'week' })
  const two = [log('2026-03-03'), log('2026-03-05')]

  it('with 2 of 3 the week stays in progress until Sunday at the cutoff time', () => {
    const e = evaluateHabit({ habit: threePerWeek, logs: two, now: local(2026, 3, 9, 3, 59), settings })
    expect(e.periods).toEqual([{ start: '2026-03-02', end: '2026-03-08', required: 3, progress: 2, status: 'in_progress' }])
  })

  it('with 2 of 3 the week fails when Sunday closes and another one starts', () => {
    const e = evaluateHabit({ habit: threePerWeek, logs: two, now: local(2026, 3, 9, 4), settings })
    expect(e.periods.map((p) => [p.start, p.end, p.progress, p.status])).toEqual([
      ['2026-03-02', '2026-03-08', 2, 'failed'],
      ['2026-03-09', '2026-03-15', 0, 'in_progress'],
    ])
    expect(e.current).toMatchObject({ start: '2026-03-09', required: 3, progress: 0 })
  })

  it("it's met as soon as it reaches the third, even if the week hasn't ended", () => {
    const e = evaluateHabit({
      habit: threePerWeek,
      logs: [...two, log('2026-03-06')],
      now: local(2026, 3, 6, 20),
      settings,
    })
    expect(e.current).toMatchObject({ progress: 3, status: 'done_minimum' })
  })

  it('if it starts mid-week, the first period is the whole calendar week', () => {
    const e = evaluateHabit({
      habit: habit(threePerWeek.frequency, '2026-03-04'),
      logs: [],
      now: local(2026, 3, 4, 12),
      settings,
    })
    expect(statuses(e)).toEqual([['2026-03-02', 'in_progress']])
  })
})

describe('evaluation: times per month', () => {
  it('periods are calendar months, February included', () => {
    const e = evaluateHabit({
      habit: habit({ type: 'times_per_period', times: 2, period: 'month' }, '2026-01-20'),
      logs: [log('2026-01-21'), log('2026-01-31'), log('2026-02-10')],
      now: local(2026, 3, 1, 3),
      settings,
    })
    expect(e.periods.map((p) => [p.start, p.end, p.status])).toEqual([
      ['2026-01-01', '2026-01-31', 'done_minimum'],
      ['2026-02-01', '2026-02-28', 'in_progress'],
    ])
  })
})

describe('evaluation: specific weekdays', () => {
  // Monday, Wednesday and Friday.
  const monWedFri = habit({ type: 'weekdays', days: [1, 3, 5] })

  it('each marked day requires 1; the others are not scheduled', () => {
    const e = evaluateHabit({
      habit: monWedFri,
      logs: [log('2026-03-02')],
      now: local(2026, 3, 6, 12),
      settings,
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_minimum'],
      ['2026-03-03', 'not_scheduled'],
      ['2026-03-04', 'failed'],
      ['2026-03-05', 'not_scheduled'],
      ['2026-03-06', 'in_progress'],
    ])
  })

  it("a log on an unscheduled day adds a vote but doesn't meet another day", () => {
    const e = evaluateHabit({
      habit: monWedFri,
      logs: [log('2026-03-02'), log('2026-03-03'), log('2026-03-03')],
      now: local(2026, 3, 4, 12),
      settings,
    })
    expect(e.votes).toBe(3)
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_minimum'],
      ['2026-03-03', 'not_scheduled'],
      ['2026-03-04', 'in_progress'],
    ])
  })
})

describe('evaluation: votes', () => {
  it("counts all of the habit's logs, even if the period is already met", () => {
    const e = evaluateHabit({
      habit: daily,
      logs: [log('2026-03-02'), log('2026-03-02', 'full'), { ...log('2026-03-02'), habitId: 'other' }],
      now: local(2026, 3, 3, 12),
      settings,
    })
    expect(e.votes).toBe(2)
  })
})

describe('evaluation: skips', () => {
  it("a skipped period isn't a failure, and the skip neither adds votes nor counts as done", () => {
    const e = evaluateHabit({
      habit: daily,
      logs: [{ ...log('2026-03-03', 'skip'), reason: 'Fever' }],
      now: local(2026, 3, 5, 12),
      settings,
    })
    expect(e.periods.map((p) => [p.start, p.progress, p.status])).toEqual([
      ['2026-03-02', 0, 'failed'],
      ['2026-03-03', 0, 'skipped'],
      ['2026-03-04', 0, 'failed'],
      ['2026-03-05', 0, 'in_progress'],
    ])
    expect(e.votes).toBe(0)
  })

  it("skipping a day skips the whole week; if it's met anyway, it counts as met", () => {
    const threePerWeek = habit({ type: 'times_per_period', times: 3, period: 'week' })
    const skipped = evaluateHabit({
      habit: threePerWeek,
      logs: [log('2026-03-03'), log('2026-03-04', 'skip')],
      now: local(2026, 3, 9, 12),
      settings,
    })
    expect(statuses(skipped)).toEqual([
      ['2026-03-02', 'skipped'],
      ['2026-03-09', 'in_progress'],
    ])
    const met = evaluateHabit({
      habit: threePerWeek,
      logs: [log('2026-03-04', 'skip'), ...['03', '05', '06'].map((d) => log(`2026-03-${d}`))],
      now: local(2026, 3, 9, 12),
      settings,
    })
    expect(met.periods[0]).toMatchObject({ progress: 3, status: 'done_minimum' })
  })
})

describe('evaluation: global pause ("vacation")', () => {
  const vacation = { ...settings, globalPause: { start: '2026-03-03', end: '2026-03-05' } }

  it('during the global pause, today is paused', () => {
    const e = evaluateHabit({ habit: daily, logs: [], now: local(2026, 3, 4, 12), settings: vacation })
    expect(e.current?.status).toBe('paused')
  })

  it('ends on its own: after `end`, days count again without touching anything', () => {
    const e = evaluateHabit({ habit: daily, logs: [], now: local(2026, 3, 7, 12), settings: vacation })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'failed'],
      ['2026-03-03', 'paused'],
      ['2026-03-04', 'paused'],
      ['2026-03-05', 'paused'],
      ['2026-03-06', 'failed'],
      ['2026-03-07', 'in_progress'],
    ])
  })

  it('the last paused day ends at the cutoff time, not at midnight', () => {
    const e = evaluateHabit({ habit: daily, logs: [], now: local(2026, 3, 6, 3, 59), settings: vacation })
    expect(e.current).toMatchObject({ start: '2026-03-05', status: 'paused' })
  })
})

describe("evaluation: a habit's pause", () => {
  const paused = { ...daily, pauses: [{ start: '2026-03-03', end: '2026-03-04' }] }

  it("paused days don't fail; once the pause ends it's evaluated again", () => {
    const e = evaluateHabit({ habit: paused, logs: [], now: local(2026, 3, 6, 12), settings })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'failed'],
      ['2026-03-03', 'paused'],
      ['2026-03-04', 'paused'],
      ['2026-03-05', 'failed'],
      ['2026-03-06', 'in_progress'],
    ])
  })

  it('paused today: the current period is paused; whatever you do still counts', () => {
    const e = evaluateHabit({ habit: paused, logs: [log('2026-03-03')], now: local(2026, 3, 4, 12), settings })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'failed'],
      ['2026-03-03', 'done_minimum'],
      ['2026-03-04', 'paused'],
    ])
    expect(e.votes).toBe(1)
  })

  it("a week with some paused day doesn't fail; a pause that hasn't arrived yet doesn't count", () => {
    const weekly = {
      ...habit({ type: 'times_per_period', times: 3, period: 'week' }),
      pauses: [{ start: '2026-03-06', end: '2026-03-10' }],
    }
    expect(statuses(evaluateHabit({ habit: weekly, logs: [], now: local(2026, 3, 5, 12), settings }))).toEqual([['2026-03-02', 'in_progress']])
    expect(statuses(evaluateHabit({ habit: weekly, logs: [], now: local(2026, 3, 18, 12), settings }))).toEqual([
      ['2026-03-02', 'paused'],
      ['2026-03-09', 'paused'],
      ['2026-03-16', 'in_progress'],
    ])
  })
})
