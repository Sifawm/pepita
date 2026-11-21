import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, evaluateHabit, addDays, type Habit, type Log } from '.'

const settings = DEFAULT_SETTINGS
const START = '2026-03-02' // Monday

const daily: Habit = {
  id: 'h',
  createdAt: '2026-03-02T08:00:00.000Z',
  identityId: 'general',
  name: 'Read',
  type: 'yes_no',
  frequency: { type: 'times_per_period', times: 1, period: 'day' },
  startDate: START,
  archived: false,
  order: 0,
}

let n = 0
/** A log on day `d` of the habit (1 = the start day). */
const log = (d: number, type: Log['type'] = 'minimum', value?: number): Log => ({
  id: `l${n++}`,
  createdAt: `${addDays(START, d - 1)}T10:00:00.000Z`,
  habitId: 'h',
  day: addDays(START, d - 1),
  type,
  ...(value !== undefined && { value }),
})
/** One log every `step` days during the first `days` days. */
const every = (days: number, step = 1, type: Log['type'] = 'minimum', value?: number) =>
  Array.from({ length: Math.ceil(days / step) }, (_, i) => log(1 + i * step, type, value))
/** Evaluation at 23:00 on day `d` of the habit. */
const evaluateOn = (habit: Habit, logs: Log[], d: number) => {
  const [y, m, dd] = addDays(START, d - 1).split('-').map(Number)
  return evaluateHabit({ habit, logs, now: new Date(y, m - 1, dd, 23), settings })
}
/** Strength at the end of day `d`, with everything logged up to then. */
const strengthOn = (habit: Habit, logs: Log[], d: number) => evaluateOn(habit, logs, d).strength.at(-1)!.value

describe("strength (Loop's formula)", () => {
  it('a perfect daily habit is around 0.8 at 30 days and 0.96 at 60', () => {
    const logs = every(60)
    expect(strengthOn(daily, logs, 30)).toBeCloseTo(0.8, 2)
    expect(strengthOn(daily, logs, 60)).toBeCloseTo(0.96, 2)
  })

  it('forgives an isolated failure: drops a bit and rises again', () => {
    const withFailure = [...every(10), ...every(20).slice(11)] // day 11 not done
    const { strength } = evaluateOn(daily, withFailure, 20)
    const [before, failure] = [strength[9].value, strength[10].value]
    expect(failure).toBeLessThan(before)
    expect(failure).toBeGreaterThan(before * 0.9)
    expect(strength[11].value).toBeGreaterThan(before)
  })

  it('a skipped or paused day leaves strength unchanged', () => {
    const before = strengthOn(daily, every(10), 10)
    expect(strengthOn(daily, [...every(10), log(11, 'skip')], 11)).toBe(before)
    const paused = { ...daily, pauses: [{ start: addDays(START, 10), end: addDays(START, 12) }] }
    expect(strengthOn(paused, every(10), 13)).toBe(before)
    // The global pause too.
    const [y, m, d] = addDays(START, 10).split('-').map(Number)
    const vacation = { ...settings, globalPause: { start: addDays(START, 10), end: addDays(START, 10) } }
    expect(evaluateHabit({ habit: daily, logs: every(10), now: new Date(y, m - 1, d, 23), settings: vacation }).strength.at(-1)!.value).toBe(before)
  })

  it("today, not yet done, doesn't lower strength; once it closes undone, it does", () => {
    const before = strengthOn(daily, every(10), 10)
    expect(strengthOn(daily, every(10), 11)).toBe(before)
    expect(strengthOn(daily, every(10), 12)).toBeLessThan(before)
  })

  describe('non-daily frequencies: f = times / period days, or number of days / 7', () => {
    const threePerWeek: Habit = { ...daily, frequency: { type: 'times_per_period', times: 3, period: 'week' } }
    const monWedFri: Habit = { ...daily, frequency: { type: 'weekdays', days: [1, 3, 5] } }
    const mondayWednesdayFriday = Array.from({ length: 8 }, (_, w) => [1, 3, 5].map((d) => log(w * 7 + d))).flat()

    it('3 per week met (Monday, Wednesday and Friday) settles even with days without logs', () => {
      expect(strengthOn(threePerWeek, mondayWednesdayFriday, 56)).toBeGreaterThan(0.8)
      // With fewer repetitions per week, strength rises more slowly than a perfect daily habit's.
      expect(strengthOn(threePerWeek, mondayWednesdayFriday, 28)).toBeLessThan(strengthOn(daily, every(28), 28))
      expect(strengthOn(threePerWeek, mondayWednesdayFriday, 28)).toBeGreaterThan(0.5)
    })

    it('Monday, Wednesday and Friday is worth the same as 3 per week', () => {
      expect(strengthOn(monWedFri, mondayWednesdayFriday, 56)).toBeCloseTo(strengthOn(threePerWeek, mondayWednesdayFriday, 56), 10)
    })

    it('only once a week out of the 3 required counts as a third', () => {
      const oncePerWeek = Array.from({ length: 8 }, (_, w) => log(w * 7 + 1))
      const s = strengthOn(threePerWeek, oncePerWeek, 56)
      expect(s).toBeGreaterThan(0.25)
      expect(s).toBeLessThan(0.4)
    })

    it('once a month met also settles', () => {
      const monthly: Habit = { ...daily, frequency: { type: 'times_per_period', times: 1, period: 'month' } }
      // March, April and May, each on the 2nd.
      const logs = [log(1), log(32), log(62)]
      expect(strengthOn(monthly, logs, 92)).toBeGreaterThan(0.5)
    })
  })

  describe('quantitative: v is the part of the target done in the window', () => {
    const quantitative = (mode: 'at_least' | 'at_most', target: number): Habit => ({
      ...daily,
      type: 'quantitative',
      quantitative: { unit: 'u', target, mode },
    })
    const m = 0.5 ** (1 / 13)

    it('"at least" 20 pages: 10 pages count as half a day', () => {
      expect(evaluateOn(quantitative('at_least', 20), [log(1, 'value', 10)], 2).strength[0].value).toBeCloseTo(0.5 * (1 - m), 10)
      expect(evaluateOn(quantitative('at_least', 20), [log(1, 'value', 30)], 2).strength[0].value).toBeCloseTo(1 - m, 10)
    })

    it('"at most" 2 coffees: v = 1 − (sum − target)/target, between 0 and 1', () => {
      const coffees = quantitative('at_most', 2)
      const firstDay = (values: number[]) => evaluateOn(coffees, values.map((v) => log(1, 'value', v)), 2).strength[0].value
      expect(firstDay([])).toBeCloseTo(1 - m, 10)
      expect(firstDay([2])).toBeCloseTo(1 - m, 10)
      expect(firstDay([1, 2])).toBeCloseTo(0.5 * (1 - m), 10)
      expect(firstDay([5])).toBe(0)
    })
  })

  describe('to avoid: a clean day adds, a relapse subtracts', () => {
    const socialMedia: Habit = { ...daily, type: 'avoid' }

    it('30 clean days give the same strength as a perfect daily habit', () => {
      expect(strengthOn(socialMedia, [], 31)).toBeCloseTo(strengthOn(daily, every(30), 31), 10)
    })

    it('a relapse today lowers strength right away (the day fails on the spot)', () => {
      // Clean today doesn't add yet: it's earned when the day closes.
      const clean = evaluateOn(socialMedia, [], 11).strength
      expect(clean[10].value).toBe(clean[9].value)
      const relapsed = evaluateOn(socialMedia, [log(11, 'relapse')], 11).strength
      expect(relapsed[10].value).toBeLessThan(relapsed[9].value)
    })
  })

  it('one point per day from the start to today', () => {
    const { strength } = evaluateOn(daily, every(3), 3)
    expect(strength.map((p) => p.day)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04'])
  })
})

describe('ratio between minimum and full version', () => {
  it('counts the periods met with each version', () => {
    const logs = [...every(3), log(4, 'full'), log(5, 'skip')]
    expect(evaluateOn(daily, logs, 6).ratio).toEqual({ minimum: 3, full: 1 })
  })

  it('for a quantitative habit, the minimum is reaching the minimum target', () => {
    const pages: Habit = {
      ...daily,
      type: 'quantitative',
      quantitative: { unit: 'pages', target: 20, minTarget: 5, mode: 'at_least' },
    }
    const logs = [log(1, 'value', 5), log(2, 'value', 25), log(3, 'value', 2)]
    expect(evaluateOn(pages, logs, 4).ratio).toEqual({ minimum: 1, full: 1 })
  })
})
