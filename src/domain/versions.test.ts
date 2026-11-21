import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, changeRule, evaluateHabit, type Frequency, type Habit, type Log } from '.'

const local = (y: number, month: number, d: number, h: number) => new Date(y, month - 1, d, h)
const settings = DEFAULT_SETTINGS

// March 2026: Mondays are the 2nd, 9th and 16th.
const daily: Frequency = { type: 'times_per_period', times: 1, period: 'day' }
const threePerWeek: Frequency = { type: 'times_per_period', times: 3, period: 'week' }
const habit = (frequency: Frequency): Habit => ({
  id: 'h',
  createdAt: '2026-03-02T08:00:00.000Z',
  identityId: 'general',
  name: 'Run',
  type: 'yes_no',
  frequency,
  startDate: '2026-03-02',
  archived: false,
  order: 0,
})

let n = 0
const logs = (...days: string[]): Log[] => days.map((day) => ({ id: `l${n++}`, createdAt: `${day}T10:00:00.000Z`, habitId: 'h', day, type: 'minimum' }))

const statuses = (h: Habit, ls: Log[], now: Date) =>
  evaluateHabit({ habit: h, logs: ls, now, settings }).periods.map((p) => [p.start, p.end, p.required, p.status])

describe("changing the frequency doesn't rewrite the past", () => {
  it('from daily to 3 per week: closed days keep being evaluated as daily', () => {
    const ls = logs('2026-03-02', '2026-03-04')
    // Wednesday the 4th in the afternoon: Monday met, Tuesday failed, Wednesday in progress.
    const changed = changeRule({ habit: habit(daily), rule: { frequency: threePerWeek }, now: local(2026, 3, 4, 18), settings })

    expect(changed.frequency).toEqual(threePerWeek)
    expect(changed.versions).toEqual([{ until: '2026-03-03', frequency: daily }])
    // The following Monday: the new week starts on Wednesday (with 1 of 3) and has closed.
    expect(statuses(changed, ls, local(2026, 3, 9, 12))).toEqual([
      ['2026-03-02', '2026-03-02', 1, 'done_minimum'],
      ['2026-03-03', '2026-03-03', 1, 'failed'],
      ['2026-03-04', '2026-03-08', 3, 'failed'],
      ['2026-03-09', '2026-03-15', 3, 'in_progress'],
    ])
  })

  it('from 3 per week to daily: closed weeks still require 3; the current one switches to days', () => {
    const ls = logs('2026-03-02', '2026-03-03', '2026-03-05', '2026-03-10')
    // Wednesday the 11th: the week of the 2nd is closed and met; the week of the 9th is still in progress.
    const changed = changeRule({ habit: habit(threePerWeek), rule: { frequency: daily }, now: local(2026, 3, 11, 9), settings })

    expect(changed.versions).toEqual([{ until: '2026-03-08', frequency: threePerWeek }])
    expect(statuses(changed, ls, local(2026, 3, 11, 9))).toEqual([
      ['2026-03-02', '2026-03-08', 3, 'done_minimum'],
      ['2026-03-09', '2026-03-09', 1, 'failed'],
      ['2026-03-10', '2026-03-10', 1, 'done_minimum'],
      ['2026-03-11', '2026-03-11', 1, 'in_progress'],
    ])
  })

  it("several changes within the same current period don't leave empty versions", () => {
    const h0 = habit(daily)
    const now = local(2026, 3, 4, 18)
    const first = changeRule({ habit: h0, rule: { frequency: threePerWeek }, now, settings })
    const second = changeRule({ habit: first, rule: { frequency: { type: 'weekdays', days: [3, 5] } }, now, settings })

    expect(second.versions).toEqual([{ until: '2026-03-03', frequency: daily }])
    expect(second.frequency).toEqual({ type: 'weekdays', days: [3, 5] })
  })

  it('if no period has closed yet, the rule is replaced without history', () => {
    const changed = changeRule({ habit: habit(daily), rule: { frequency: threePerWeek }, now: local(2026, 3, 2, 20), settings })
    expect(changed.versions ?? []).toEqual([])
    expect(changed.frequency).toEqual(threePerWeek)
  })

  it('three rules in a row: each range is evaluated with its own', () => {
    const ls = logs('2026-03-02', '2026-03-05', '2026-03-12')
    const a = changeRule({ habit: habit(daily), rule: { frequency: threePerWeek }, now: local(2026, 3, 4, 12), settings })
    const b = changeRule({ habit: a, rule: { frequency: { type: 'weekdays', days: [4] } }, now: local(2026, 3, 10, 12), settings })

    expect(b.versions).toEqual([
      { until: '2026-03-03', frequency: daily },
      { until: '2026-03-08', frequency: threePerWeek },
    ])
    expect(statuses(b, ls, local(2026, 3, 13, 12))).toEqual([
      ['2026-03-02', '2026-03-02', 1, 'done_minimum'],
      ['2026-03-03', '2026-03-03', 1, 'failed'],
      ['2026-03-04', '2026-03-08', 3, 'failed'],
      ['2026-03-09', '2026-03-09', 0, 'not_scheduled'],
      ['2026-03-10', '2026-03-10', 0, 'not_scheduled'],
      ['2026-03-11', '2026-03-11', 0, 'not_scheduled'],
      ['2026-03-12', '2026-03-12', 1, 'done_minimum'],
      ['2026-03-13', '2026-03-13', 0, 'not_scheduled'],
    ])
  })
})
