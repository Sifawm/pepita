import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, possibleAnchors, buildToday, editHabit, intentionPhrase, newHabit, type Habit, type Identity, type Intention, type Log } from '.'

const settings = DEFAULT_SETTINGS
const now = new Date(2026, 2, 15, 9)
const general: Identity = { id: 'general', createdAt: '2026-03-01T10:00:00.000Z', name: '', isGeneral: true, archived: false, order: 0 }

let order = 0
const habit = (id: string, intention?: Intention, extra: Partial<Habit> = {}): Habit => ({
  ...newHabit({ name: id, identityId: 'general', order: order++, intention }, new Date(2026, 2, 10, 9), settings),
  id,
  createdAt: '2026-03-10T08:00:00.000Z',
  ...extra,
})

// With no logs, they've all been failing for days: all recovering (a single group). `upToDate` did theirs yesterday.
const yesterday = (habitId: string): Log => ({ id: `l-${habitId}`, createdAt: '2026-03-14T10:00:00.000Z', habitId, day: '2026-03-14', type: 'minimum' })
const todayOrder = (habits: Habit[], upToDate: string[] = []) =>
  buildToday({ habits, identities: [general], logs: upToDate.map(yesterday), now, settings }).habits.map((c) => c.habit.id)

describe('Today ordering', () => {
  it('by time, each anchored habit right below its anchor (in multi-level chains) and the ones with no time at the end', () => {
    const habits = [
      habit('noTime'),
      habit('coffee', { when: { afterAction: 'pouring my coffee' } }),
      habit('stretch', { when: { afterHabitId: 'meditate' } }),
      habit('dinner', { when: { time: '21:00' } }),
      habit('meditate', { when: { time: '07:30' } }),
      habit('read', { when: { afterHabitId: 'stretch' } }),
      habit('water', { when: { afterHabitId: 'meditate' } }),
      habit('teeth', { when: { afterHabitId: 'dinner' } }),
    ]
    expect(todayOrder(habits)).toEqual(['meditate', 'stretch', 'read', 'water', 'dinner', 'teeth', 'noTime', 'coffee'])
  })

  it('when an anchor is archived or deleted, the habits that depended on it become "no time" with their own chain', () => {
    const meditate = habit('meditate', { when: { time: '07:30' } })
    const stretch = habit('stretch', { when: { afterHabitId: 'meditate' } })
    const read = habit('read', { when: { afterHabitId: 'stretch' } })
    const dinner = habit('dinner', { when: { time: '21:00' } })
    const free = habit('free')
    expect(todayOrder([meditate, stretch, read, dinner, free])).toEqual(['meditate', 'stretch', 'read', 'dinner', 'free'])
    expect(todayOrder([{ ...meditate, archived: true }, stretch, read, dinner, free])).toEqual(['dinner', 'stretch', 'read', 'free'])
    expect(todayOrder([stretch, read, dinner, free])).toEqual(['dinner', 'stretch', 'read', 'free'])
  })

  it("an anchored habit whose anchor isn't on today takes its anchor's time", () => {
    const weights = habit('weights', { when: { time: '07:00' } }, { frequency: { type: 'weekdays', days: [1] } }) // today is Sunday
    const shake = habit('shake', { when: { afterHabitId: 'weights' } })
    const dinner = habit('dinner', { when: { time: '21:00' } })
    const free = habit('free')
    expect(todayOrder([free, dinner, shake, weights])).toEqual(['shake', 'dinner', 'free'])
  })

  it('recovering ones first, each group sorted by time with its chains', () => {
    const habits = [
      habit('dinner', { when: { time: '21:00' } }),
      habit('teeth', { when: { afterHabitId: 'dinner' } }),
      habit('meditate', { when: { time: '07:30' } }),
      habit('stretch', { when: { afterHabitId: 'meditate' } }),
      habit('free'),
    ]
    // Recovering: dinner and stretch. Teeth keeps its time (dinner's) among the rest.
    expect(todayOrder(habits, ['teeth', 'meditate', 'free'])).toEqual(['stretch', 'dinner', 'meditate', 'teeth', 'free'])
  })

  it("an anchor cycle (in imported data) doesn't break Today: they go with no time", () => {
    const a = habit('a', { when: { afterHabitId: 'b' } })
    const b = habit('b', { when: { afterHabitId: 'a' } })
    const dinner = habit('dinner', { when: { time: '21:00' } })
    expect(todayOrder([a, b, dinner])).toEqual(['dinner', 'a', 'b'])
  })
})

describe('intention phrase', () => {
  const coffee = habit('coffee', undefined, { name: 'Pour my coffee' })
  const habits = [coffee]

  it('after a habit, where, and the minimum version', () => {
    const read = habit('read', { when: { afterHabitId: 'coffee' }, where: 'the kitchen' }, { name: 'Read', minimumVersion: 'read 1 page' })
    expect(intentionPhrase(read, habits)).toEqual({ when: { after: 'Pour my coffee' }, where: 'the kitchen', what: 'read 1 page' })
  })

  it('at a time or after a free action; without a minimum version, the name', () => {
    expect(intentionPhrase(habit('read', { when: { time: '07:30' } }, { name: 'Read' }), habits)).toEqual({
      when: { time: '07:30' },
      what: 'Read',
    })
    expect(intentionPhrase(habit('read', { when: { afterAction: 'dinner' } }, { name: 'Read' }), habits)).toEqual({
      when: { afterAction: 'dinner' },
      what: 'Read',
    })
  })

  it("with the anchor archived or deleted the where stays; with no when and no where there's no phrase", () => {
    const read = habit('read', { when: { afterHabitId: 'coffee' }, where: 'the kitchen' }, { name: 'Read' })
    expect(intentionPhrase(read, [{ ...coffee, archived: true }])).toEqual({ where: 'the kitchen', what: 'Read' })
    expect(intentionPhrase(habit('alone', { when: { afterHabitId: 'nobody' } }), habits)).toBeUndefined()
    expect(intentionPhrase(habit('nothing'), habits)).toBeUndefined()
  })

  it("works as a preview in the wizard: ignores what's still blank", () => {
    const draft = { name: 'Read', minimumVersion: ' ', intention: { when: { time: '' }, where: ' the couch ' } }
    expect(intentionPhrase(draft, habits)).toEqual({ where: 'the couch', what: 'Read' })
    expect(intentionPhrase({ ...draft, intention: { when: { afterAction: ' ' } } }, habits)).toBeUndefined()
  })

  it("goes on Today's card", () => {
    const read = habit('read', { when: { time: '07:30' }, where: 'the couch' }, { name: 'Read' })
    const [card] = buildToday({ habits: [read], identities: [general], logs: [], now, settings }).habits
    expect(card.phrase).toEqual({ when: { time: '07:30' }, where: 'the couch', what: 'Read' })
  })
})

describe('possible anchors', () => {
  it('any active habit except itself and those already hanging from it (no cycles)', () => {
    const habits = [
      habit('meditate', { when: { time: '07:30' } }),
      habit('stretch', { when: { afterHabitId: 'meditate' } }),
      habit('read', { when: { afterHabitId: 'stretch' } }),
      habit('dinner'),
      habit('old', undefined, { archived: true }),
    ]
    expect(possibleAnchors('stretch', habits).map((h) => h.id)).toEqual(['meditate', 'dinner'])
    expect(possibleAnchors(undefined, habits).map((h) => h.id)).toEqual(['meditate', 'stretch', 'read', 'dinner'])
  })
})

describe('wizard: intention, environment and reward', () => {
  const base = { name: 'Read', identityId: 'general', order: 0 }

  it('saves the filled-in steps without extra whitespace', () => {
    const h = newHabit(
      {
        ...base,
        intention: { when: { afterAction: ' pouring my coffee ' }, where: ' the kitchen ' },
        environment: [' leave the book on the table ', '', 'glasses'],
        pairedReward: ' a tea ',
      },
      now,
      settings,
    )
    expect(h).toMatchObject({
      intention: { when: { afterAction: 'pouring my coffee' }, where: 'the kitchen' },
      environment: ['leave the book on the table', 'glasses'],
      pairedReward: 'a tea',
    })
  })

  it("what's left empty isn't saved", () => {
    const h = newHabit({ ...base, intention: { when: { afterAction: ' ' }, where: '' }, environment: [' '], pairedReward: ' ' }, now, settings)
    expect(h).not.toHaveProperty('intention')
    expect(h).not.toHaveProperty('environment')
    expect(h).not.toHaveProperty('pairedReward')
    const whereOnly = newHabit({ ...base, intention: { when: { afterAction: '' }, where: 'the park' } }, now, settings)
    expect(whereOnly.intention).toEqual({ where: 'the park' })
    // The form leaves the time or the anchor empty if not chosen.
    expect(newHabit({ ...base, intention: { when: { time: '' } } }, now, settings)).not.toHaveProperty('intention')
    expect(newHabit({ ...base, intention: { when: { afterHabitId: '' } } }, now, settings)).not.toHaveProperty('intention')
  })

  it('when editing, changing the time replaces it and emptying the environment removes it (without touching the rule)', () => {
    const read: Habit = { ...newHabit({ ...base, intention: { when: { time: '07:30' } }, environment: ['book'] }, now, settings), id: 'read', createdAt: '2026-03-15T08:00:00.000Z' }
    const edited = editHabit(read, { ...read, intention: { when: { time: '22:00' } }, environment: [] }, new Date(2026, 2, 20, 9), settings)
    expect(edited).toEqual({ ...(({ environment, ...r }) => (void environment, r))(read), intention: { when: { time: '22:00' } } })
  })
})
