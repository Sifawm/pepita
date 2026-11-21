import { describe, expect, it } from 'vitest'
import { startGlobalPause, DEFAULT_SETTINGS, buildToday, evaluateHabit, newHabit, annotate, pauseHabit, resumeHabit, skip, endGlobalPause, tap, type Habit, type Identity, type Log } from '.'

const local = (y: number, month: number, d: number, h: number, min = 0) => new Date(y, month - 1, d, h, min)

const settings = DEFAULT_SETTINGS
const general: Identity = {
  id: 'general',
  createdAt: '2026-03-01T10:00:00.000Z',
  name: '',
  isGeneral: true,
  archived: false,
  order: 0,
}

const habit = (id: string, name: string, order: number): Habit => ({
  ...newHabit({ name, identityId: 'general', order }, local(2026, 3, 10, 9), settings),
  id,
  createdAt: '2026-03-10T08:00:00.000Z',
})
const read = habit('read', 'Read', 0)
const meditate = habit('meditate', 'Meditate', 1)

const log = (habitId: string, day: string, n = 0): Log => ({
  id: `${habitId}-${day}-${n}`,
  createdAt: `${day}T10:0${n}:00.000Z`,
  habitId,
  day,
  type: 'minimum',
})

describe('new habit', () => {
  it('is a daily yes/no and starts on the logical day it was created', () => {
    const h = newHabit({ name: 'Read', identityId: 'general', order: 3 }, local(2026, 3, 15, 1), settings)
    expect(h).toMatchObject({
      name: 'Read',
      identityId: 'general',
      type: 'yes_no',
      frequency: { type: 'times_per_period', times: 1, period: 'day' },
      startDate: '2026-03-14',
      archived: false,
      order: 3,
    })
  })

  it('accepts another frequency', () => {
    const h = newHabit({ name: 'Swim', identityId: 'general', order: 0, frequency: { type: 'weekdays', days: [2, 4] } }, local(2026, 3, 15, 9), settings)
    expect(h.frequency).toEqual({ type: 'weekdays', days: [2, 4] })
  })
})

describe('Today', () => {
  it('shows the habits with their identity and no votes at the start of the day', () => {
    const today = buildToday({
      habits: [meditate, read],
      identities: [general],
      logs: [],
      now: local(2026, 3, 15, 9),
      settings,
    })
    expect(today.day).toBe('2026-03-15')
    expect(today.votes).toBe(0)
    expect(today.habits.map((c) => [c.habit.id, c.identity.id, c.done])).toEqual([
      ['read', 'general', false],
      ['meditate', 'general', false],
    ])
  })

  it("counts a vote for each log of the logical day, including the one at 01:00", () => {
    const today = buildToday({
      habits: [read, meditate],
      identities: [general],
      logs: [log('read', '2026-03-14'), log('read', '2026-03-15')],
      now: local(2026, 3, 16, 1),
      settings,
    })
    expect(today.day).toBe('2026-03-15')
    expect(today.votes).toBe(1)
    expect(today.habits.find((c) => c.habit.id === 'read')?.done).toBe(true)
    expect(today.habits.find((c) => c.habit.id === 'meditate')?.done).toBe(false)
  })

  it('the minimum and the full version are worth one vote each', () => {
    const today = buildToday({
      habits: [read, meditate],
      identities: [general],
      logs: [log('read', '2026-03-15'), { ...log('meditate', '2026-03-15'), type: 'full' }],
      now: local(2026, 3, 15, 9),
      settings,
    })
    expect(today.votes).toBe(2)
    expect(today.habits.map((c) => c.period.status)).toEqual(['done_minimum', 'done_full'])
  })

  it("doesn't show archived habits or the ones that haven't started yet", () => {
    const today = buildToday({
      habits: [{ ...read, archived: true }, { ...meditate, startDate: '2026-03-20' }],
      identities: [general],
      logs: [],
      now: local(2026, 3, 15, 9),
      settings,
    })
    expect(today.habits).toEqual([])
  })

  it("shows only the habits due today, with the period's progress", () => {
    // Sunday, March 15th: running is due Monday and Wednesday; swimming, 3 times a week.
    const run: Habit = { ...habit('run', 'Run', 2), frequency: { type: 'weekdays', days: [1, 3] } }
    const swim: Habit = { ...habit('swim', 'Swim', 3), frequency: { type: 'times_per_period', times: 3, period: 'week' } }
    const today = buildToday({
      habits: [run, swim],
      identities: [general],
      logs: [log('swim', '2026-03-10'), log('swim', '2026-03-12')],
      now: local(2026, 3, 15, 9),
      settings,
    })
    expect(today.habits).toHaveLength(1)
    expect(today.habits[0]).toMatchObject({
      habit: { id: 'swim' },
      done: false,
      period: { start: '2026-03-09', end: '2026-03-15', required: 3, progress: 2, status: 'in_progress' },
    })
  })

  it('shows recovering habits first, with their streak', () => {
    // Both start on the 10th. On the 11th, read is met and meditate isn't: on the 12th, meditate is recovering.
    const today = buildToday({
      habits: [read, meditate],
      identities: [general],
      logs: [log('read', '2026-03-10'), log('meditate', '2026-03-10'), log('read', '2026-03-11')],
      now: local(2026, 3, 12, 9),
      settings,
    })
    expect(today.habits.map((c) => [c.habit.id, c.recovering, c.streak])).toEqual([
      ['meditate', true, { current: 1, best: 1 }],
      ['read', false, { current: 2, best: 2 }],
    ])
  })
})

describe('Today by identity', () => {
  const reader: Identity = { ...general, id: 'reader', name: "I'm a person who reads", isGeneral: false, order: 1 }
  const novels = { ...habit('novels', 'Novels', 2), identityId: 'reader' }
  const input = {
    habits: [read, meditate, novels],
    identities: [general, reader],
    logs: [log('read', '2026-03-15'), log('novels', '2026-03-15')],
    now: local(2026, 3, 15, 9),
    settings,
  }

  it("filtering by an identity shows only its habits and its votes of the day", () => {
    const today = buildToday({ ...input, identityId: 'reader' })
    expect(today.habits.map((c) => c.habit.id)).toEqual(['novels'])
    expect(today.votes).toBe(1)
  })

  it('"General" is filtered like any other identity', () => {
    const today = buildToday({ ...input, identityId: 'general' })
    expect(today.habits.map((c) => c.habit.id)).toEqual(['read', 'meditate'])
    expect(today.votes).toBe(1)
  })

  it('without a filter it shows them all', () => {
    expect(buildToday(input).habits.map((c) => c.habit.id)).toEqual(['read', 'meditate', 'novels'])
    expect(buildToday(input).votes).toBe(2)
  })

  it("an archived identity's habits are kept but don't show up on Today", () => {
    const today = buildToday({ ...input, identities: [general, { ...reader, archived: true }] })
    expect(today.habits.map((c) => c.habit.id)).toEqual(['read', 'meditate'])
  })
})

describe('Today with skips and pauses', () => {
  const base = { identities: [general], logs: [] as Log[], settings }

  it('skipping logs a skip on the logical day, with the reason if given', () => {
    expect(skip({ habit: read, reason: '  Fever ', now: local(2026, 3, 16, 1), settings })).toEqual({
      habitId: 'read',
      day: '2026-03-15',
      type: 'skip',
      reason: 'Fever',
    })
    expect(skip({ habit: read, reason: ' ', now: local(2026, 3, 15, 9), settings })).toEqual({
      habitId: 'read',
      day: '2026-03-15',
      type: 'skip',
    })
  })

  it('skipping a past period (from the calendar): that failure becomes neutral', () => {
    const s = skip({ habit: read, day: '2026-03-12', now: local(2026, 3, 15, 9), settings })
    expect(s).toEqual({ habitId: 'read', day: '2026-03-12', type: 'skip' })
    const { periods } = evaluateHabit({ habit: read, logs: [{ ...s, id: 's', createdAt: '2026-03-15T09:00:00.000Z' }], now: local(2026, 3, 15, 9), settings })
    expect(periods.find((p) => p.start === '2026-03-12')?.status).toBe('skipped')
  })

  it('a skipped habit stays on Today, with its skip so it can be undone, and adds no votes', () => {
    const s: Log = { ...log('read', '2026-03-15'), type: 'skip' }
    const today = buildToday({ ...base, habits: [read], logs: [s], now: local(2026, 3, 15, 9) })
    expect(today.votes).toBe(0)
    expect(today.habits[0]).toMatchObject({ done: false, logs: [], skip: s, period: { status: 'skipped' } })
    // Doing it anyway logs it; it doesn't undo the skip.
    expect(tap({ habit: read, logs: [s], now: local(2026, 3, 15, 9), settings }).type).toBe('log')
  })

  it('a paused habit stays on Today, marked with its pause', () => {
    const pause = { start: '2026-03-14', end: '2026-03-20' }
    const today = buildToday({ ...base, habits: [{ ...read, pauses: [pause] }, meditate], now: local(2026, 3, 15, 9) })
    expect(today.globalPause).toBeUndefined()
    // Meditate hasn't been done for days: it goes first, recovering. Read, paused, isn't.
    expect(today.habits.map((c) => [c.habit.id, c.pause, c.recovering])).toEqual([
      ['meditate', undefined, true],
      ['read', pause, false],
    ])
  })

  it('the global pause shows on Today while it lasts and disappears on its own when it ends', () => {
    const globalPause = { start: '2026-03-14', end: '2026-03-15' }
    const during = buildToday({ ...base, habits: [read], settings: { ...settings, globalPause }, now: local(2026, 3, 16, 3) })
    expect(during.globalPause).toEqual(globalPause)
    expect(during.habits[0].pause).toEqual(globalPause)
    const after = buildToday({ ...base, habits: [read], settings: { ...settings, globalPause }, now: local(2026, 3, 16, 4) })
    expect(after.globalPause).toBeUndefined()
    expect(after.habits[0].pause).toBeUndefined()
  })

  it('pausing a habit adds the pause; resuming today ends it yesterday and keeps future ones', () => {
    const past = { start: '2026-03-01', end: '2026-03-02' }
    const future = { start: '2026-04-01', end: '2026-04-05' }
    const paused = pauseHabit({ ...read, pauses: [past, future] }, { start: '2026-03-12', end: '2026-03-20' })
    expect(paused.pauses).toEqual([past, future, { start: '2026-03-12', end: '2026-03-20' }])
    expect(resumeHabit(paused, local(2026, 3, 15, 9), settings).pauses).toEqual([past, future, { start: '2026-03-12', end: '2026-03-14' }])
    // If the pause started today, resuming removes it entirely.
    const fromToday = pauseHabit(read, { start: '2026-03-15', end: '2026-03-20' })
    expect(resumeHabit(fromToday, local(2026, 3, 15, 9), settings).pauses).toEqual([])
  })

  it("starting the global pause begins today; the previous one is saved on each habit so its days don't fail", () => {
    const previous = { start: '2026-03-01', end: '2026-03-03' }
    const { globalPause, habits } = startGlobalPause({
      settings: { ...settings, globalPause: previous },
      habits: [read, { ...meditate, pauses: [{ start: '2026-02-01', end: '2026-02-02' }] }],
      end: '2026-03-22',
      now: local(2026, 3, 15, 9),
    })
    expect(globalPause).toEqual({ start: '2026-03-15', end: '2026-03-22' })
    expect(habits.map((h) => h.pauses)).toEqual([[previous], [{ start: '2026-02-01', end: '2026-02-02' }, previous]])
    expect(startGlobalPause({ settings, habits: [read], end: '2026-03-22', now: local(2026, 3, 15, 9) }).habits).toEqual([])
  })

  it('ending the global pause today ends it yesterday (or removes it if it started today)', () => {
    const globalPause = { start: '2026-03-10', end: '2026-03-22' }
    expect(endGlobalPause({ settings: { ...settings, globalPause }, now: local(2026, 3, 15, 9) })).toEqual({
      start: '2026-03-10',
      end: '2026-03-14',
    })
    expect(endGlobalPause({ settings: { ...settings, globalPause }, now: local(2026, 3, 10, 9) })).toBeUndefined()
  })
})

describe('tap', () => {
  it('with no log today, logs the minimum version on the logical day', () => {
    expect(tap({ habit: read, logs: [], now: local(2026, 3, 16, 1), settings })).toEqual({
      type: 'log',
      log: { habitId: 'read', day: '2026-03-15', type: 'minimum' },
    })
  })

  it('a long press logs the full version', () => {
    expect(tap({ habit: read, logs: [], now: local(2026, 3, 15, 9), settings, version: 'full' })).toEqual({
      type: 'log',
      log: { habitId: 'read', day: '2026-03-15', type: 'full' },
    })
  })

  it("with the habit already met today, undoes the day's last log", () => {
    const yesterday = log('read', '2026-03-14')
    const today = log('read', '2026-03-15')
    const other = log('meditate', '2026-03-15')
    expect(tap({ habit: read, logs: [today, yesterday, other], now: local(2026, 3, 15, 22), settings })).toEqual({ type: 'undo', logId: today.id })
  })

  it('on a twice-a-day habit, the second tap logs and the third undoes', () => {
    const twiceADay: Habit = { ...read, frequency: { type: 'times_per_period', times: 2, period: 'day' } }
    const first = log('read', '2026-03-15', 0)
    const second = log('read', '2026-03-15', 1)
    const now = local(2026, 3, 15, 22)
    expect(tap({ habit: twiceADay, logs: [first], now, settings }).type).toBe('log')
    expect(tap({ habit: twiceADay, logs: [first, second], now, settings })).toEqual({ type: 'undo', logId: second.id })
  })

  it('on a weekly habit, it logs once per day even if the week is already met', () => {
    const weekly: Habit = { ...read, frequency: { type: 'times_per_period', times: 1, period: 'week' } }
    const monday = log('read', '2026-03-09')
    const wednesday = log('read', '2026-03-11')
    const now = local(2026, 3, 11, 22)
    expect(tap({ habit: weekly, logs: [monday], now, settings }).type).toBe('log')
    expect(tap({ habit: weekly, logs: [monday, wednesday], now, settings })).toEqual({ type: 'undo', logId: wednesday.id })
  })
})

describe("a log's note", () => {
  const done = log('read', '2026-03-15')

  it('is saved without extra whitespace', () => {
    expect(annotate(done, '  with coffee \n')).toEqual({ ...done, note: 'with coffee' })
  })

  it('emptying it removes it', () => {
    expect(annotate({ ...done, note: 'with coffee' }, '  ')).toEqual(done)
  })
})
