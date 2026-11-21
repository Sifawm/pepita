import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, changeRule, buildToday, editHabit, evaluateHabit, newHabit, summarizeIdentities, addValue, type Quantitative, type Frequency, type Habit, type Identity, type Log } from '.'

const local = (y: number, month: number, d: number, h: number, min = 0) => new Date(y, month - 1, d, h, min)
const settings = DEFAULT_SETTINGS
const DAILY: Frequency = { type: 'times_per_period', times: 1, period: 'day' }

// March 2026: Monday the 2nd starts a week; Sunday the 8th closes it.
const habit = (quantitative: Quantitative, frequency = DAILY): Habit => ({
  id: 'h',
  createdAt: '2026-03-02T08:00:00.000Z',
  identityId: 'general',
  name: 'Read',
  type: 'quantitative',
  quantitative,
  frequency,
  startDate: '2026-03-02',
  archived: false,
  order: 0,
})
const pages = habit({ unit: 'pages', target: 20, minTarget: 5, mode: 'at_least' })
const coffees = habit({ unit: 'coffees', target: 2, mode: 'at_most' })

let n = 0
const value = (day: string, v: number): Log => ({
  id: `l${n++}`,
  createdAt: `${day}T10:00:00.000Z`,
  habitId: 'h',
  day,
  type: 'value',
  value: v,
})

const statuses = (e: ReturnType<typeof evaluateHabit>) => e.periods.map((p) => [p.start, p.status])

describe('quantitative "at least"', () => {
  it("adds up the period's values: target = full, minimum target = minimum, otherwise a failure at close", () => {
    const e = evaluateHabit({
      habit: pages,
      logs: [value('2026-03-02', 12), value('2026-03-02', 8), value('2026-03-03', 5), value('2026-03-04', 4)],
      now: local(2026, 3, 5, 12),
      settings,
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_full'],
      ['2026-03-03', 'done_minimum'],
      ['2026-03-04', 'failed'],
      ['2026-03-05', 'in_progress'],
    ])
    expect(e.periods.map((p) => [p.progress, p.required])).toEqual([
      [20, 20],
      [5, 20],
      [4, 20],
      [0, 20],
    ])
  })

  it('earns 1 vote per period met, not per log; reaching the target today already counts', () => {
    const e = evaluateHabit({
      habit: pages,
      logs: [value('2026-03-02', 10), value('2026-03-02', 15), value('2026-03-03', 5), value('2026-03-04', 2), value('2026-03-05', 30)],
      now: local(2026, 3, 5, 12),
      settings,
    })
    expect(e.votes).toBe(3)
  })

  it('without a minimum target, falling short is a failure', () => {
    const noMinimum = habit({ unit: 'km', target: 5, mode: 'at_least' })
    const e = evaluateHabit({ habit: noMinimum, logs: [value('2026-03-02', 4.5)], now: local(2026, 3, 3, 12), settings })
    expect(statuses(e)[0]).toEqual(['2026-03-02', 'failed'])
  })

  it('with a weekly frequency, the target is for the whole week', () => {
    const weekly = habit({ unit: 'km', target: 10, mode: 'at_least' }, { type: 'times_per_period', times: 1, period: 'week' })
    const e = evaluateHabit({
      habit: weekly,
      logs: [value('2026-03-03', 4), value('2026-03-07', 6), value('2026-03-10', 3)],
      now: local(2026, 3, 11, 12),
      settings,
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_full'],
      ['2026-03-09', 'in_progress'],
    ])
    expect(e.current?.progress).toBe(3)
  })
})

describe('quantitative "at most"', () => {
  it("is met at close if the sum doesn't exceed the target; a period without logs counts too", () => {
    const e = evaluateHabit({
      habit: coffees,
      logs: [value('2026-03-02', 2), value('2026-03-03', 1), value('2026-03-03', 2)],
      now: local(2026, 3, 5, 12),
      settings,
    })
    expect(statuses(e)).toEqual([
      ['2026-03-02', 'done_full'],
      ['2026-03-03', 'failed'],
      ['2026-03-04', 'done_full'],
      ['2026-03-05', 'in_progress'],
    ])
    expect(e.votes).toBe(2)
  })

  it('the current period is neither met nor failed until the cutoff time', () => {
    const logs = [value('2026-03-02', 3)]
    expect(evaluateHabit({ habit: coffees, logs, now: local(2026, 3, 3, 3, 59), settings }).current?.status).toBe('in_progress')
    expect(evaluateHabit({ habit: coffees, logs: [], now: local(2026, 3, 3, 3, 59), settings }).votes).toBe(0)
    expect(evaluateHabit({ habit: coffees, logs: [], now: local(2026, 3, 3, 4), settings }).votes).toBe(1)
  })

  it("a skipped or paused day on which you went over doesn't count as a failure", () => {
    const skip: Log = { id: 's', createdAt: '2026-03-02T11:00:00.000Z', habitId: 'h', day: '2026-03-02', type: 'skip' }
    const e = evaluateHabit({ habit: coffees, logs: [value('2026-03-02', 5), skip], now: local(2026, 3, 3, 12), settings })
    expect(statuses(e)[0]).toEqual(['2026-03-02', 'skipped'])
  })
})

describe("each vote's day (the identity's curve and milestones)", () => {
  it('"at least": the day the sum reached the threshold; "at most": the last day of the period', () => {
    const weekly = habit({ unit: 'km', target: 10, minTarget: 4, mode: 'at_least' }, { type: 'times_per_period', times: 1, period: 'week' })
    const logs = [value('2026-03-03', 2), value('2026-03-05', 3), value('2026-03-07', 9)]
    expect(evaluateHabit({ habit: weekly, logs, now: local(2026, 3, 10, 12), settings }).voteDays).toEqual(['2026-03-05'])
    expect(evaluateHabit({ habit: coffees, logs: [value('2026-03-03', 9)], now: local(2026, 3, 4, 12), settings }).voteDays).toEqual(['2026-03-02'])
  })
})

describe('change the target', () => {
  it('counts from the current period: closed days keep being evaluated with the target they had', () => {
    const logs = [value('2026-03-02', 10), value('2026-03-03', 10), value('2026-03-04', 10)]
    const now = local(2026, 3, 4, 12)
    const changed = changeRule({
      habit: pages,
      rule: { frequency: DAILY, quantitative: { unit: 'pages', target: 10, mode: 'at_least' } },
      now,
      settings,
    })
    expect(statuses(evaluateHabit({ habit: changed, logs, now, settings }))).toEqual([
      ['2026-03-02', 'done_minimum'],
      ['2026-03-03', 'done_minimum'],
      ['2026-03-04', 'done_full'],
    ])
  })
})

describe('wizard: quantitative habit', () => {
  const now = local(2026, 3, 2, 9)
  const input = { name: 'Read', identityId: 'general', order: 0 }

  it('is created with its unit (without extra whitespace), target, minimum target and mode', () => {
    const h = newHabit({ ...input, type: 'quantitative', quantitative: { unit: ' pages ', target: 20, minTarget: 5, mode: 'at_least' } }, now, settings)
    expect(h).toMatchObject({ type: 'quantitative', quantitative: { unit: 'pages', target: 20, minTarget: 5, mode: 'at_least' } })
  })

  it('"at most" has no minimum target, and "at least" doesn\'t keep one that isn\'t below the target', () => {
    const limit = newHabit({ ...input, type: 'quantitative', quantitative: { unit: 'coffees', target: 2, minTarget: 1, mode: 'at_most' } }, now, settings)
    expect(limit.quantitative).toEqual({ unit: 'coffees', target: 2, mode: 'at_most' })
    const equal = newHabit({ ...input, type: 'quantitative', quantitative: { unit: 'km', target: 5, minTarget: 5, mode: 'at_least' } }, now, settings)
    expect(equal.quantitative).toEqual({ unit: 'km', target: 5, mode: 'at_least' })
  })

  it("a yes/no habit doesn't store quantitative data", () => {
    const h = newHabit({ ...input, type: 'yes_no', quantitative: { unit: 'km', target: 5, mode: 'at_least' } }, now, settings)
    expect(h.type).toBe('yes_no')
    expect(h).not.toHaveProperty('quantitative')
  })

  it("when editing, changing the target days later stores the previous one in the history; the type doesn't change", () => {
    const thursday = local(2026, 3, 5, 9)
    const edited = editHabit(pages, { ...pages, type: 'yes_no', quantitative: { ...pages.quantitative!, target: 30 } }, thursday, settings)
    expect(edited.type).toBe('quantitative')
    expect(edited.quantitative?.target).toBe(30)
    expect(edited.versions).toEqual([{ frequency: DAILY, quantitative: pages.quantitative, until: '2026-03-04' }])
  })

  it("editing only the name doesn't create a rule version", () => {
    expect(editHabit(pages, { ...pages, name: 'Read more' }, local(2026, 3, 5, 9), settings)).not.toHaveProperty('versions')
  })
})

describe('Today with a quantitative habit', () => {
  const general: Identity = { id: 'general', createdAt: '2026-03-01T10:00:00.000Z', name: '', isGeneral: true, archived: false, order: 0 }
  const today = (logs: Log[], now: Date, h = pages) => buildToday({ habits: [h], identities: [general], logs, now, settings })

  it('adding a value logs it on the logical day (at 01:00 too)', () => {
    const { log } = addValue({ habit: pages, logs: [], value: 7, now: local(2026, 3, 4, 1), settings })
    expect(log).toEqual({ habitId: 'h', day: '2026-03-03', type: 'value', value: 7 })
  })

  it("the value that reaches the minimum target brings the vote; the following ones in the same period don't", () => {
    const now = local(2026, 3, 4, 12)
    const vote = (logs: Log[], v: number) => addValue({ habit: pages, logs, value: v, now, settings }).vote
    expect(vote([], 3)).toBe(false)
    expect(vote([value('2026-03-04', 3)], 2)).toBe(true)
    expect(vote([value('2026-03-04', 5)], 15)).toBe(false)
    // "At most" is only met when the day closes.
    expect(addValue({ habit: coffees, logs: [], value: 1, now, settings }).vote).toBe(false)
  })

  it("the card shows the period's progress and today's values (to undo the last one)", () => {
    const logs = [value('2026-03-04', 1.5), value('2026-03-04', 2)]
    const [card] = today(logs, local(2026, 3, 4, 12)).habits
    expect(card.period).toMatchObject({ progress: 3.5, required: 20, status: 'in_progress' })
    expect(card.logs).toEqual(logs)
    expect(card.done).toBe(false)
    expect(today([value('2026-03-04', 20)], local(2026, 3, 4, 12)).habits[0].done).toBe(true)
  })

  it("today's votes count the period met today, not each value nor the week met earlier", () => {
    expect(today([value('2026-03-04', 3), value('2026-03-04', 20)], local(2026, 3, 4, 12)).votes).toBe(1)
    const weekly = habit({ unit: 'km', target: 10, mode: 'at_least' }, { type: 'times_per_period', times: 1, period: 'week' })
    const logs = [value('2026-03-03', 10), value('2026-03-04', 2)]
    expect(today(logs, local(2026, 3, 3, 12), weekly).votes).toBe(1)
    expect(today(logs, local(2026, 3, 4, 12), weekly).votes).toBe(0)
  })

  it('adds 1 vote per period met to its identity', () => {
    const logs = [value('2026-03-02', 25), value('2026-03-03', 5), value('2026-03-04', 1), value('2026-03-04', 5)]
    const [summary] = summarizeIdentities({ identities: [general], habits: [pages], logs, now: local(2026, 3, 4, 12), settings })
    expect(summary).toMatchObject({ votes: 3, votesToday: 1 })
  })
})
