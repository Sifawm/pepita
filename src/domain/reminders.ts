// Reminders: the .ics file for the phone's calendar.
import { weekday, addDays } from './calendar'
import { buildToday } from './today'
import { anchorOf, intentionPhrase, type IntentionPhrase } from './intention'
import type { Settings, Habit, Time, Identity, Log } from './types'

/** How the phrase is written in the person's language: the core doesn't translate. */
export type PhraseText = (phrase: IntentionPhrase) => string

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
const escape = (v: string) => v.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n')

/** Folds to 75 octets per line without splitting a character (RFC 5545 §3.1). */
function fold(line: string) {
  const chunks: string[] = []
  let current = ''
  let octets = 0
  for (const c of line) {
    const n = new TextEncoder().encode(c).length
    // The first line allows 75; continuation lines, 74 plus the leading space.
    if (octets + n > (chunks.length ? 74 : 75)) {
      chunks.push(current)
      current = ''
      octets = 0
    }
    current += c
    octets += n
  }
  return [...chunks, current].join('\r\n ')
}

const BYDAY = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

/**
 * RRULE and first day: `weekdays` weekly on those days (DTSTART on the first one, as the RFC requires); the
 * rest, daily. A time before the cutoff is already the next calendar day: everything shifts one day.
 */
function recurrence({ frequency: f, startDate }: Habit, time: Time, { dayCutoff }: Settings) {
  const shift = time < dayCutoff ? 1 : 0
  if (f.type !== 'weekdays') return { rrule: 'FREQ=DAILY', start: addDays(startDate, shift) }
  let start = startDate
  while (!f.days.includes(weekday(start))) start = addDays(start, 1)
  const days = f.days.map((d) => ((d - 1 + shift) % 7) + 1).sort()
  return { rrule: `FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(',')}`, start: addDays(start, shift) }
}

/** Habits to avoid never remind (neither on their own nor in another's chain). */
const reminds = (h: Habit) => !h.archived && h.type !== 'avoid'

/** The habits anchored to `anchor`, at any level, in chain order (each followed by its own). */
const anchoredTo = (anchor: Habit, habits: Habit[]): Habit[] =>
  habits.filter((h) => reminds(h) && anchorOf(h, habits) === anchor).flatMap((h) => [h, ...anchoredTo(h, habits)])

const timeOf = (h: Habit) => {
  const w = h.intention?.when
  return w && 'time' in w ? w.time : undefined
}

/** `20260315T080509Z` */
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

/**
 * One VEVENT per habit with its own time, repeating by its frequency and alerting at that time.
 * The title is the intention phrase (`text` writes it in the person's language).
 * `events`: how many it has (0 = no habit with a time).
 */
export function icsReminders({ habits, now, settings, text }: { habits: Habit[]; now: Date; settings: Settings; text: PhraseText }) {
  const events = habits.map((h) => {
    const time = timeOf(h)
    if (!time || !reminds(h)) return []
    const title = text(intentionPhrase(h, habits)!)
    const chain = anchoredTo(h, habits).map((a) => text(intentionPhrase(a, habits)!))
    const { rrule, start } = recurrence(h, time, settings)
    return [
      'BEGIN:VEVENT',
      `UID:${h.id}@pepita`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART:${start.replace(/-/g, '')}T${time.replace(':', '')}00`,
      `RRULE:${rrule}`,
      `SUMMARY:${escape(title)}`,
      ...(chain.length ? [`DESCRIPTION:${escape(chain.join('\n'))}`] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:PT0S',
      `DESCRIPTION:${escape(title)}`,
      'END:VALARM',
      'END:VEVENT',
    ]
  })
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pepita//Pepita//ES', 'CALSCALE:GREGORIAN', ...events.flat(), 'END:VCALENDAR']
  return { ics: lines.map(fold).join('\r\n') + '\r\n', events: events.filter((e) => e.length).length }
}

export interface Reminder {
  habit: Habit
  /** When to alert: the habit's time on today's logical day (after the cutoff, already on the next calendar day). */
  instant: Date
  phrase: IntentionPhrase
  /** The anchored habits still pending, in chain order. */
  anchored: IntentionPhrase[]
}

/**
 * Today's remaining reminders: a habit with a time that's due today and still pending (not done,
 * skipped or paused). The UI schedules them in memory while the app is open.
 */
export function todayReminders(ctx: { habits: Habit[]; identities: Identity[]; logs: Log[]; now: Date; settings: Settings }): Reminder[] {
  const { habits, now, settings } = ctx
  const today = buildToday(ctx)
  const pending = today.habits
    .filter((c) => !c.done && !c.pause && c.period.status !== 'skipped' && reminds(c.habit))
    .map((c) => c.habit)
  const [y, m, d] = today.day.split('-').map(Number)
  const reminders = pending.flatMap((habit) => {
    const time = timeOf(habit)
    if (!time) return []
    const [hh, mm] = time.split(':').map(Number)
    const instant = new Date(y, m - 1, d + (time < settings.dayCutoff ? 1 : 0), hh, mm)
    if (instant <= now) return []
    const chain = anchoredTo(habit, habits).filter((x) => pending.includes(x))
    return [{ habit, instant, phrase: intentionPhrase(habit, habits)!, anchored: chain.map((x) => intentionPhrase(x, habits)!) }]
  })
  return reminders.sort((a, b) => a.instant.getTime() - b.instant.getTime())
}
