import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, todayReminders, newHabit, icsReminders, type IntentionPhrase, type Habit, type Identity, type Intention, type Log } from '.'

const settings = DEFAULT_SETTINGS
const now = new Date(Date.UTC(2026, 2, 15, 8, 5, 9))

let order = 0
const habit = (id: string, intention?: Intention, extra: Partial<Habit> = {}): Habit => ({
  ...newHabit({ name: id, identityId: 'general', order: order++, intention }, new Date(2026, 2, 10, 9), settings),
  id,
  createdAt: '2026-03-10T08:00:00.000Z',
  ...extra,
})

// Toy translation: the UI passes its own (i18n) so the core doesn't depend on the language.
const text = ({ when, where, what }: IntentionPhrase) =>
  [when && ('time' in when ? `at ${when.time}` : 'after' in when ? `after ${when.after}` : when.afterAction), where && `in ${where}`, what].filter(Boolean).join(', ')

const ics = (habits: Habit[], s = settings) => icsReminders({ habits, now, settings: s, text }).ics

/** Minimal iCalendar (RFC 5545) reader to check the file from the outside. */
function parse(file: string) {
  expect(file.endsWith('\r\n')).toBe(true)
  const physical = file.slice(0, -2).split('\r\n')
  for (const l of physical) {
    expect(l).not.toMatch(/[\r\n]/)
    expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
  }
  // Unfold: a line starting with a space continues the previous one.
  const lines = physical.reduce<string[]>((ls, l) => (l.startsWith(' ') ? [...ls.slice(0, -1), ls.at(-1) + l.slice(1)] : [...ls, l]), [])
  interface Component {
    type: string
    props: [string, string][]
    children: Component[]
  }
  const root: Component = { type: 'ROOT', props: [], children: [] }
  const stack: Component[] = [root]
  for (const l of lines) {
    const i = l.indexOf(':')
    const [name, value] = [l.slice(0, i), l.slice(i + 1)]
    if (name === 'BEGIN') {
      const c: Component = { type: value, props: [], children: [] }
      stack.at(-1)!.children.push(c)
      stack.push(c)
    } else if (name === 'END') expect(stack.pop()!.type).toBe(value)
    else stack.at(-1)!.props.push([name, value])
  }
  expect(stack).toHaveLength(1)
  expect(root.children).toHaveLength(1)
  const prop = (c: Component, n: string) => c.props.find(([k]) => k === n)?.[1]
  const unescape = (v = '') => v.replace(/\\([\\;,nN])/g, (_, c: string) => (c.toLowerCase() === 'n' ? '\n' : c))
  const cal = root.children[0]
  expect(cal.type).toBe('VCALENDAR')
  expect(prop(cal, 'VERSION')).toBe('2.0')
  expect(prop(cal, 'PRODID')).toBeTruthy()
  return {
    events: cal.children.map((e) => {
      expect(e.type).toBe('VEVENT')
      expect(prop(e, 'UID')).toBeTruthy()
      expect(prop(e, 'DTSTAMP')).toMatch(/^\d{8}T\d{6}Z$/)
      const alarms = e.children.map((a) => ({ type: a.type, action: prop(a, 'ACTION'), trigger: prop(a, 'TRIGGER'), description: unescape(prop(a, 'DESCRIPTION')) }))
      return {
        uid: prop(e, 'UID'),
        dtstamp: prop(e, 'DTSTAMP'),
        dtstart: prop(e, 'DTSTART'),
        rrule: prop(e, 'RRULE'),
        summary: unescape(prop(e, 'SUMMARY')),
        description: prop(e, 'DESCRIPTION') === undefined ? undefined : unescape(prop(e, 'DESCRIPTION')),
        alarms,
      }
    }),
  }
}

describe('reminders as .ics', () => {
  it('a daily habit with a time: one event repeating every day at that time, with an alarm and the phrase as title', () => {
    const { events } = parse(ics([habit('meditate', { when: { time: '07:30' }, where: 'the living room' })]))
    expect(events).toEqual([
      {
        uid: 'meditate@pepita',
        dtstamp: '20260315T080509Z',
        dtstart: '20260310T073000',
        rrule: 'FREQ=DAILY',
        summary: 'at 07:30, in the living room, meditate',
        description: undefined,
        alarms: [{ type: 'VALARM', action: 'DISPLAY', trigger: 'PT0S', description: 'at 07:30, in the living room, meditate' }],
      },
    ])
  })

  it('specific weekdays: repeats weekly on those days, starting on the first of them from the start date', () => {
    // Starts Tuesday, March 10th; due Monday, Wednesday and Friday → first time Wednesday the 11th.
    const weights = habit('weights', { when: { time: '18:00' } }, { frequency: { type: 'weekdays', days: [5, 1, 3] } })
    const [event] = parse(ics([weights])).events
    expect(event.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(event.dtstart).toBe('20260311T180000')
  })

  it('times per week or per month: daily reminder', () => {
    const run = habit('run', { when: { time: '19:00' } }, { frequency: { type: 'times_per_period', times: 3, period: 'week' } })
    expect(parse(ics([run])).events[0].rrule).toBe('FREQ=DAILY')
  })

  it("anchored habits don't get their own event: they go as a chain in their anchor's description", () => {
    const habits = [
      habit('stretch', { when: { afterHabitId: 'meditate' } }),
      habit('meditate', { when: { time: '07:30' } }),
      habit('read', { when: { afterHabitId: 'stretch' } }),
      habit('water', { when: { afterHabitId: 'meditate' } }),
      habit('old', { when: { afterHabitId: 'meditate' } }, { archived: true }),
    ]
    const { events } = parse(ics(habits))
    expect(events.map((e) => e.uid)).toEqual(['meditate@pepita'])
    expect(events[0].description).toBe('after meditate, stretch\nafter stretch, read\nafter meditate, water')
  })

  it('no reminder: no time, archived, habits to avoid and those anchored to a lost anchor', () => {
    const habits = [
      habit('free'),
      habit('coffee', { when: { afterAction: 'pouring my coffee' } }),
      habit('whereOnly', { where: 'the kitchen' }),
      habit('archived', { when: { time: '08:00' } }, { archived: true }),
      habit('orphan', { when: { afterHabitId: 'archived' } }),
      habit('smoke', { when: { time: '10:00' } }, { type: 'avoid' }),
      habit('anchorToAvoid', { when: { afterHabitId: 'smoke' } }),
      habit('dinner', { when: { time: '21:00' } }),
      habit('snack', { when: { afterHabitId: 'dinner' } }, { type: 'avoid' }),
    ]
    const { events } = parse(ics(habits))
    expect(events.map((e) => e.uid)).toEqual(['dinner@pepita'])
    expect(events[0].description).toBeUndefined()
  })

  it('with no timed habits: a valid, empty calendar', () => {
    expect(parse(ics([habit('free')])).events).toEqual([])
  })

  it('says how many reminders it has (the UI warns if there are none)', () => {
    const count = (habits: Habit[]) => icsReminders({ habits, now, settings, text }).events
    expect(count([habit('free')])).toBe(0)
    expect(count([habit('meditate', { when: { time: '07:30' } }), habit('dinner', { when: { time: '21:00' } })])).toBe(2)
  })

  it('long texts, with accents, emojis and reserved characters: folded to 75 octets and escaped without losing anything', () => {
    const name = 'Leer «Hábitos atómicos»; capítulo 3, notas\\resumen 📚🌱 — '.repeat(4).trim()
    const long = habit('long', { when: { time: '22:15' }, where: 'the sofá,\nwith tea' }, { name })
    const { events } = parse(ics([long]))
    expect(events[0].summary).toBe(`at 22:15, in the sofá,\nwith tea, ${name}`)
    expect(events[0].alarms[0].description).toBe(events[0].summary)
  })

  it('a time before the day cutoff falls on the next calendar day: weekdays shift with it', () => {
    // Cutoff at 04:00: "Monday at 01:00" is early Tuesday morning. Starts Tuesday the 10th → first logical Monday the 16th.
    const late = habit('late', { when: { time: '01:00' } }, { frequency: { type: 'weekdays', days: [1, 7] } })
    const [event] = parse(ics([late])).events
    expect(event.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,TU')
    expect(event.dtstart).toBe('20260316T010000')
    // With the cutoff at 00:30, 01:00 already belongs to the same day: nothing shifts.
    expect(parse(ics([late], { ...settings, dayCutoff: '00:30' })).events[0]).toMatchObject({ rrule: 'FREQ=WEEKLY;BYDAY=MO,SU', dtstart: '20260315T010000' })
  })
})

describe("today's reminders (notifications with the app open)", () => {
  const general: Identity = { id: 'general', createdAt: '2026-03-01T10:00:00.000Z', name: '', isGeneral: true, archived: false, order: 0 }
  const log = (habitId: string, type: Log['type'] = 'minimum'): Log => ({ id: `l-${habitId}`, createdAt: '2026-03-15T08:00:00.000Z', habitId, day: '2026-03-15', type })

  it("at today's remaining times, only what's pending and due today, with its pending anchored habits", () => {
    // Sunday, March 15th at 09:00, cutoff at 04:00.
    const habits = [
      habit('meditate', { when: { time: '07:30' } }), // already passed
      habit('run', { when: { time: '19:00' } }),
      habit('stretch', { when: { afterHabitId: 'run' } }),
      habit('shower', { when: { afterHabitId: 'stretch' } }), // done: not reminded
      habit('read', { when: { time: '21:00' } }), // done
      habit('weights', { when: { time: '18:00' } }, { frequency: { type: 'weekdays', days: [1] } }), // not due today
      habit('smoke', { when: { time: '10:00' } }, { type: 'avoid' }),
      habit('skipped', { when: { time: '12:00' } }),
      habit('paused', { when: { time: '12:00' } }, { pauses: [{ start: '2026-03-14', end: '2026-03-20' }] }),
      habit('lateNight', { when: { time: '01:00' } }), // still today: early Monday morning
    ]
    const logs = [log('shower'), log('read'), log('skipped', 'skip')]
    const reminders = todayReminders({ habits, identities: [general], logs, now: new Date(2026, 2, 15, 9), settings })
    expect(reminders.map((r) => ({ id: r.habit.id, instant: r.instant, title: text(r.phrase), anchored: r.anchored.map(text) }))).toEqual([
      { id: 'run', instant: new Date(2026, 2, 15, 19), title: 'at 19:00, run', anchored: ['after run, stretch'] },
      { id: 'lateNight', instant: new Date(2026, 2, 16, 1), title: 'at 01:00, lateNight', anchored: [] },
    ])
  })
})
