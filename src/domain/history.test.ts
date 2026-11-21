import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, habitCalendar, evaluateHabit, heatmap, type Habit, type Log } from '.'

const settings = DEFAULT_SETTINGS
// Starts on Wednesday, March 4th 2026; "today" is Monday, April 6th at noon.
const now = new Date(2026, 3, 6, 12)
const habit: Habit = {
  id: 'h',
  createdAt: '2026-03-04T08:00:00.000Z',
  identityId: 'general',
  name: 'Meditate',
  type: 'yes_no',
  frequency: { type: 'times_per_period', times: 1, period: 'day' },
  startDate: '2026-03-04',
  archived: false,
  order: 0,
}
const log = (id: string, day: string, type: Log['type'] = 'minimum', habitId = 'h'): Log => ({
  id,
  createdAt: `${day}T10:00:00.000Z`,
  habitId,
  day,
  type,
})

describe('habit calendar', () => {
  it("gives the whole month, with the logs and the status of each day's period", () => {
    const logs = [log('a', '2026-03-05'), log('b', '2026-03-05', 'full'), log('other', '2026-03-06', 'minimum', 'other')]
    const month = habitCalendar({ habit, logs, month: '2026-03-17', now, settings })

    expect([month.start, month.end, month.days.length]).toEqual(['2026-03-01', '2026-03-31', 31])
    expect(month.days.slice(2, 6).map((d) => [d.day, d.logs.map((l) => l.id), d.status])).toEqual([
      ['2026-03-03', [], undefined],
      ['2026-03-04', [], 'failed'],
      ['2026-03-05', ['a', 'b'], 'done_minimum'],
      ['2026-03-06', [], 'failed'],
    ])
  })

  it('any day from the start up to today can be edited, with no limit backwards', () => {
    const march = habitCalendar({ habit, logs: [], month: '2026-03-01', now, settings })
    const april = habitCalendar({ habit, logs: [], month: '2026-04-30', now, settings })
    const editable = (m: typeof march) => m.days.filter((d) => d.editable).map((d) => d.day)

    expect(editable(march)).toEqual(march.days.slice(3).map((d) => d.day))
    expect(editable(april)).toEqual(['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'])
    expect(april.days.at(-1)?.status).toBeUndefined()
  })

  it('logging a forgotten day in the past turns the failure into met and adds its vote', () => {
    const before = [log('a', '2026-03-10')]
    const after = [...before, log('forgot', '2026-03-09', 'full')]
    const day9 = (ls: Log[]) => habitCalendar({ habit, logs: ls, month: '2026-03-09', now, settings }).days[8]

    expect(day9(before).status).toBe('failed')
    expect(day9(after).status).toBe('done_full')
    expect(evaluateHabit({ habit, logs: after, now, settings }).votes).toBe(2)
  })

  it('undoing a past log leaves the day failed again and removes its vote', () => {
    const logs = [log('a', '2026-03-10'), log('b', '2026-03-11')]
    const withoutB = logs.filter((l) => l.id !== 'b')
    const day11 = habitCalendar({ habit, logs: withoutB, month: '2026-03-01', now, settings }).days[10]

    expect(day11.status).toBe('failed')
    expect(evaluateHabit({ habit, logs: withoutB, now, settings }).votes).toBe(1)
  })

  it("on a weekly habit, each day shows its week's status", () => {
    const weekly: Habit = { ...habit, frequency: { type: 'times_per_period', times: 2, period: 'week' } }
    const logs = [log('a', '2026-03-10'), log('b', '2026-03-12')]
    const month = habitCalendar({ habit: weekly, logs, month: '2026-03-01', now, settings })

    // Week of the 9th to the 15th: met even though each day on its own has 0 or 1 logs.
    expect(month.days.slice(8, 15).map((d) => d.status)).toEqual(Array(7).fill('done_minimum'))
    expect(month.days[8].logs).toEqual([])
    // Each day knows which period contains it (to note the whole week's failure).
    expect(month.days[11].period).toBe('2026-03-09')
  })
})

describe('habit heatmap', () => {
  it("gives whole weeks (Monday to Sunday) ending on today's, with each day's status", () => {
    const map = heatmap({ habit, logs: [log('a', '2026-03-05', 'full')], weeks: 5, now, settings })

    expect([map.start, map.end, map.days.length]).toEqual(['2026-03-09', '2026-04-12', 35])
    const longMap = heatmap({ habit, logs: [log('a', '2026-03-05', 'full')], weeks: 6, now, settings })
    expect(longMap.days.slice(1, 4).map((d) => [d.day, d.status])).toEqual([
      ['2026-03-03', undefined],
      ['2026-03-04', 'failed'],
      ['2026-03-05', 'done_full'],
    ])
    // After today, no status.
    expect(map.days.at(-1)?.status).toBeUndefined()
  })

  it("doesn't start before the week the habit started", () => {
    const map = heatmap({ habit, logs: [], weeks: 26, now, settings })
    expect([map.start, map.days.length]).toEqual(['2026-03-02', 6 * 7])
  })
})
