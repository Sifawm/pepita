import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { AddValueForm } from '@/components/QuantitativeInputs'
import { DiagnosisList } from '@/components/DiagnosisCard'
import { ProgressionSuggestion } from '@/components/ProgressionSuggestion'
import { SeriesChart } from '@/components/SeriesChart'
import { FrequencyPicker } from '@/components/FrequencyPicker'
import { NoteEditor } from '@/components/HabitCard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { withId, db, useSettings } from '@/db'
import {
  failureNote,
  habitCalendar,
  changeRule,
  weekday,
  isOpenDiagnosis,
  logicalDay,
  isVote,
  evaluateHabit,
  heatmap,
  relapse,
  skip,
  progressionSuggestion,
  addDays,
  type Settings,
  type FailureNote,
  type CalendarDay,
  type Day,
  type PeriodStatus,
  type HabitEvaluation,
  type Frequency,
  type Habit,
  type Law,
  type New,
  type Log,
} from '@/domain'
import { cn, focusById, formatDay } from '@/lib/utils'

const toDate = (day: Day) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Shape, on top of color (WCAG 1.4.1): filled = full, light = minimum, dashed = not done,
// dotted = skipped, borderless gray = paused.
const STYLE: Record<PeriodStatus, string> = {
  done_full: 'border-primary bg-primary text-primary-foreground',
  done_minimum: 'border-primary bg-accent',
  failed: 'border-dashed border-input',
  in_progress: 'border-input',
  not_scheduled: 'border-transparent text-muted-foreground',
  skipped: 'border-dotted border-input text-muted-foreground',
  paused: 'border-transparent bg-muted text-muted-foreground',
}

/** A habit's detail: strength, heatmap, minimum/full, a calendar to edit any past day, and frequency change. */
export default function HabitDetailScreen() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const settings = useSettings()
  const data = useLiveQuery(
    async () => ({
      habit: await db.habits.get(id),
      logs: await db.logs.where('habitId').equals(id).toArray(),
      diagnoses: await db.diagnoses.where('habitId').equals(id).toArray(),
      dismissedSuggestions: await db.dismissedSuggestions.where('habitId').equals(id).toArray(),
    }),
    [id],
  )

  if (!data || !settings) return null
  if (!data.habit) return <p>{t('habit.notFound')}</p>

  const now = new Date()
  const evaluation = evaluateHabit({ ...data, habit: data.habit, now, settings })
  // The unanswered ones (pending or snoozed): the core leaves at most one per habit.
  const open = data.diagnoses.filter(isOpenDiagnosis).map((diagnosis) => ({ diagnosis, habit: data.habit! }))

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold break-words">{data.habit.name}</h1>
        {/* In the background: the streak is a reference, not the main thing. */}
        <p className="text-sm text-muted-foreground">
          {t('recovery.streak', { ...evaluation.streak })}
          {' · '}
          {t('recovery.streakHelp')}
        </p>
      </header>
      <DiagnosisList items={open} />
      {!data.habit.archived && (
        <ProgressionSuggestion habit={data.habit} suggestion={progressionSuggestion({ ...data, habit: data.habit, now, settings })} settings={settings} />
      )}
      <Strength evaluation={evaluation} today={logicalDay(now, settings.dayCutoff)} />
      <Heatmap habit={data.habit} logs={data.logs} now={now} settings={settings} />
      {/* When avoiding there are no versions: every clean day is full. */}
      {data.habit.type !== 'avoid' && <Ratio {...evaluation.ratio} />}
      <Calendar habit={data.habit} logs={data.logs} settings={settings} />
      {/* When avoiding, the period is always the day. */}
      {data.habit.type !== 'avoid' && <ChangeFrequency key={data.habit.id} habit={data.habit} settings={settings} />}
      <Link to={`/habit/${id}/edit`} className={buttonVariants({ variant: 'secondary', className: 'w-full' })}>
        {t('wizard.edit')}
      </Link>
    </div>
  )
}

function Strength({ evaluation: { strength }, today }: { evaluation: HabitEvaluation; today: Day }) {
  const { t } = useTranslation()
  const points = strength.map((p) => ({ day: p.day, value: Math.round(p.value * 100) }))
  return (
    <section aria-labelledby="strength" className="space-y-3">
      <h2 id="strength" className="text-xl font-bold">
        {t('habitDetail.strength')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('habitDetail.strengthHelp')}</p>
      {points.length ? (
        <SeriesChart
          points={points}
          end={today}
          max={100}
          summary={t('habitDetail.strengthSummary', { value: points.at(-1)!.value })}
          columns={[t('habitDetail.dayColumn'), t('habitDetail.strengthColumn')]}
        />
      ) : (
        <p className="text-muted-foreground">{t('habitDetail.notStarted')}</p>
      )}
    </section>
  )
}

const HEATMAP_WEEKS = 26

// Small cells: filled = full, light = minimum, dashed border = not done, dotted = skipped,
// gray = paused. The legend with the day count is the text alternative.
const CELL: Record<PeriodStatus, string> = {
  done_full: 'bg-primary',
  done_minimum: 'bg-primary/40',
  failed: 'border border-dashed border-muted-foreground',
  in_progress: 'border border-input',
  not_scheduled: '',
  skipped: 'border border-dotted border-muted-foreground',
  paused: 'bg-muted',
}

function Heatmap({ habit, logs, now, settings }: { habit: Habit; logs: Log[]; now: Date; settings: Settings }) {
  const { t, i18n } = useTranslation()
  const map = heatmap({ habit, logs, weeks: HEATMAP_WEEKS, now, settings })
  if (!map.days.length) return null
  const statusName = (s: PeriodStatus) => t(habit.type === 'avoid' ? `avoid.status.${s}` : `habit.status.${s}`)
  const statuses = (['done_full', 'done_minimum', 'failed', 'skipped', 'paused'] as const).filter((s) => habit.type !== 'avoid' || s !== 'done_minimum')
  return (
    <section aria-labelledby="heatmap" className="space-y-3">
      <h2 id="heatmap" className="text-xl font-bold">
        {t('habitDetail.heatmap')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('habitDetail.heatmapHelp')} {formatDay(map.start, i18n.language)} – {formatDay(map.end, i18n.language)}
      </p>
      <div aria-hidden className="grid grid-flow-col grid-rows-7 gap-0.5" style={{ gridTemplateColumns: `repeat(${map.days.length / 7}, minmax(0, 1.25rem))` }}>
        {map.days.map((d) => (
          <span key={d.day} className={cn('aspect-square rounded-sm', d.status && CELL[d.status])} />
        ))}
      </div>
      <ul aria-label={t('habit.legend')} className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {statuses.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden className={cn('size-4 rounded-sm', CELL[s])} />
            {statusName(s)} · {t('habitDetail.days', { count: map.days.filter((d) => d.status === s).length })}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Ratio({ minimum, full }: { minimum: number; full: number }) {
  const { t } = useTranslation()
  const total = minimum + full
  return (
    <section aria-labelledby="ratio" className="space-y-3">
      <h2 id="ratio" className="text-xl font-bold">
        {t('habitDetail.ratio')}
      </h2>
      {total ? (
        <>
          <div aria-hidden className="flex h-3 overflow-hidden rounded-full">
            <div className="bg-primary/40" style={{ width: `${(minimum / total) * 100}%` }} />
            <div className="flex-1 bg-primary" />
          </div>
          <p className="font-semibold">{t('habitDetail.ratioText', { minimum, full })}</p>
          <p className="text-sm text-muted-foreground">{t('habitDetail.ratioHelp')}</p>
        </>
      ) : (
        <p className="text-muted-foreground">{t('habitDetail.noRatio')}</p>
      )}
    </section>
  )
}

function Calendar({ habit, logs, settings }: { habit: Habit; logs: Log[]; settings: Settings }) {
  const { t, i18n } = useTranslation()
  const now = new Date()
  const today = logicalDay(now, settings.dayCutoff)
  const [month, setMonth] = useState(today)
  const [selected, setSelected] = useState<Day>(today)
  const calendar = habitCalendar({ habit, logs, month, now, settings })
  const day = calendar.days.find((d) => d.day === selected && d.editable)
  const longDate = (d: Day) => toDate(d).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  const statusName = (s: PeriodStatus) => t(habit.type === 'avoid' ? `avoid.status.${s}` : `habit.status.${s}`)
  const label = (d: CalendarDay) => [longDate(d.day), d.status && statusName(d.status), t('habit.logs', { count: d.logs.length })].filter(Boolean).join(' · ')

  return (
    <section aria-labelledby="calendar" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="min-w-11 px-0"
          aria-label={t('habit.previousMonth')}
          disabled={calendar.start <= habit.startDate}
          onClick={() => setMonth(addDays(calendar.start, -1))}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <h2 id="calendar" className="text-xl font-bold first-letter:uppercase" aria-live="polite">
          {toDate(calendar.start).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
        </h2>
        <Button variant="ghost" className="min-w-11 px-0" aria-label={t('habit.nextMonth')} disabled={calendar.end >= today} onClick={() => setMonth(addDays(calendar.end, 1))}>
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t('habit.help')}</p>

      <div className="grid grid-cols-7 gap-1 text-center">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d} aria-hidden className="text-xs font-semibold text-muted-foreground capitalize">
            {new Date(2024, 0, d).toLocaleDateString(i18n.language, { weekday: 'narrow' })}
          </span>
        ))}
        {/* The week starts on Monday: blanks up to day 1. */}
        {Array.from({ length: weekday(calendar.start) - 1 }, (_, i) => (
          <span key={`blank${i}`} aria-hidden />
        ))}
        {calendar.days.map((d) => {
          const dayNumber = Number(d.day.slice(8))
          if (!d.editable)
            return (
              <span key={d.day} className="flex min-h-11 items-center justify-center text-muted-foreground" aria-hidden>
                {dayNumber}
              </span>
            )
          return (
            <button
              key={d.day}
              type="button"
              aria-label={label(d)}
              aria-pressed={d.day === day?.day}
              onClick={() => setSelected(d.day)}
              className={cn(
                'relative flex min-h-11 flex-col items-center justify-center rounded-md border-2 font-semibold outline-none',
                'focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                d.status && STYLE[d.status],
                d.day === day?.day && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
              )}
            >
              <span aria-hidden>{dayNumber}</span>
              {d.logs.some(isVote) && <Check aria-hidden className="size-3" />}
            </button>
          )
        })}
      </div>

      <ul aria-label={t('habit.legend')} className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {(['done_full', 'done_minimum', 'failed', 'in_progress', 'skipped', 'paused'] as const)
          .filter((s) => habit.type !== 'avoid' || s !== 'done_minimum')
          .map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span aria-hidden className={cn('size-5 rounded border-2', STYLE[s])} />
              {statusName(s)}
            </li>
          ))}
      </ul>

      {day && <EditDay key={day.day} habit={habit} day={day} title={longDate(day.day)} statusName={statusName} settings={settings} />}
    </section>
  )
}

/**
 * Log, fix, annotate, skip or undo a day. The evaluation (and the diagnoses) recompute
 * on their own when the logs change.
 */
function EditDay({
  habit,
  day,
  title,
  statusName,
  settings,
}: {
  habit: Habit
  day: CalendarDay
  title: string
  statusName: (s: PeriodStatus) => string
  settings: Settings
}) {
  const { t, i18n } = useTranslation()
  const [noteFor, setNoteFor] = useState<string>()
  const save = (log: New<Log>) => db.logs.add(withId<Log>(log))
  // Minimum, full and value have no rule to apply: they're written as is.
  const add = (type: Log['type'], value?: number) => save({ habitId: habit.id, day: day.day, type, ...(value !== undefined && { value }) })
  const context = { habit, day: day.day, now: new Date(), settings }
  const q = habit.quantitative
  // An unmet period (past or current) can also be skipped from here.
  const skippable = day.status === 'failed' || day.status === 'in_progress'

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 id="day-title" tabIndex={-1} className="text-lg font-semibold outline-none first-letter:uppercase">
        {title}
      </h3>
      <p aria-live="polite" className="text-muted-foreground">
        {day.status && `${statusName(day.status)} · `}
        {day.logs.length ? t('habit.logs', { count: day.logs.length }) : t('habit.noLogs')}
      </p>
      {day.logs.length > 0 && (
        <ul className="space-y-2">
          {day.logs.map((l) => {
            const other = l.type === 'minimum' ? 'full' : 'minimum'
            return (
              <li key={l.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span id={`log-${l.id}`} className="flex-1 font-semibold">
                    {l.type === 'value' ? `${l.value?.toLocaleString(i18n.language)} ${q?.unit}` : t(`habit.type.${l.type}`)}
                    {(l.reason ?? l.trigger) && <span className="font-normal text-muted-foreground"> · {l.reason ?? l.trigger}</span>}
                    {l.note && <span className="block font-normal break-words text-muted-foreground">{l.note}</span>}
                  </span>
                  {isVote(l) && (
                    <Button variant="secondary" onClick={() => db.logs.update(l.id, { type: other })}>
                      {t(`habit.switchTo.${other}`)}
                    </Button>
                  )}
                  <Button
                    id={`note-button-${l.id}`}
                    variant="ghost"
                    aria-describedby={`log-${l.id}`}
                    aria-expanded={noteFor === l.id}
                    onClick={() => setNoteFor(noteFor === l.id ? undefined : l.id)}
                  >
                    {t(l.note ? 'today.editNote' : 'today.addNote')}
                  </Button>
                  <Button variant="ghost" aria-describedby={`log-${l.id}`} onClick={() => db.logs.delete(l.id).then(() => focusById('day-title'))}>
                    {t('habit.undo')}
                  </Button>
                </div>
                {noteFor === l.id && (
                  <NoteEditor
                    log={l}
                    onClose={() => {
                      setNoteFor(undefined)
                      focusById(`note-button-${l.id}`)
                    }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
      {q ? (
        <AddValueForm unit={q.unit} name={habit.name} onAdd={(value) => add('value', value)} />
      ) : habit.type === 'avoid' ? (
        <Button variant="secondary" onClick={() => save(relapse(context))}>
          {t('avoid.add')}
        </Button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => add('minimum')}>{t('habit.add.minimum')}</Button>
          <Button variant="secondary" onClick={() => add('full')}>
            {t('habit.add.full')}
          </Button>
        </div>
      )}
      {skippable && (
        <Button variant="ghost" className="w-full" onClick={() => save(skip(context))}>
          {t('habit.skip')}
        </Button>
      )}
      {day.status === 'failed' && day.period && <NoteFailure habitId={habit.id} period={day.period} />}
    </div>
  )
}

/** Optional reason for a failure (one per period). Saving it empty deletes it. */
function NoteFailure({ habitId, period }: { habitId: string; period: Day }) {
  const notes = useLiveQuery(() => db.failureNotes.where({ habitId, period }).toArray(), [habitId, period])
  if (!notes) return null
  return <FailureForm key={`${habitId} ${period}`} habitId={habitId} period={period} existing={notes[0]} />
}

function FailureForm({ habitId, period, existing }: { habitId: string; period: Day; existing?: FailureNote }) {
  const { t } = useTranslation()
  const [law, setLaw] = useState(existing?.law ? String(existing.law) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [saved, setSaved] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const fresh = failureNote({ habitId, period, law: law ? (Number(law) as Law) : undefined, note })
    // Without a law or a note there's nothing left to save: any existing one is deleted.
    if (!fresh) await (existing && db.failureNotes.delete(existing.id))
    else await db.failureNotes.put(existing ? { id: existing.id, createdAt: existing.createdAt, ...fresh } : withId<FailureNote>(fresh))
    setSaved(true)
  }

  return (
    <form onSubmit={save} aria-labelledby="note-failure" className="space-y-3 border-t pt-3">
      <h4 id="note-failure" className="font-semibold">
        {t('recovery.record')}
      </h4>
      <p className="text-sm text-muted-foreground">{t('recovery.recordHelp')}</p>
      <div className="space-y-2">
        <Label htmlFor="law">{t('recovery.law')}</Label>
        <Select id="law" value={law} onChange={(e) => (setLaw(e.target.value), setSaved(false))}>
          <option value="">{t('recovery.noLaw')}</option>
          {[1, 2, 3, 4].map((l) => (
            <option key={l} value={l}>
              {t(`recovery.laws.${l}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="failure-note">{t('recovery.note')}</Label>
        <Input id="failure-note" value={note} onChange={(e) => (setNote(e.target.value), setSaved(false))} />
      </div>
      <Button type="submit" variant="secondary">
        {t('recovery.save')}
      </Button>
      <p aria-live="polite" className="text-sm font-semibold text-primary">
        {saved && t('recovery.saved')}
      </p>
    </form>
  )
}

function ChangeFrequency({ habit, settings }: { habit: Habit; settings: Settings }) {
  const { t } = useTranslation()
  const [frequency, setFrequency] = useState<Frequency>(habit.frequency)
  const [saved, setSaved] = useState(false)
  const unchanged = JSON.stringify(frequency) === JSON.stringify(habit.frequency)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    await db.habits.put(changeRule({ habit, rule: { frequency }, now: new Date(), settings }))
    setSaved(true)
  }

  return (
    <form onSubmit={save} aria-labelledby="change-frequency" className="space-y-4">
      <h2 id="change-frequency" className="text-xl font-bold">
        {t('habit.frequency')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('habit.frequencyHelp')}</p>
      <FrequencyPicker value={frequency} onChange={(f) => (setFrequency(f), setSaved(false))} periodOnly={habit.type === 'quantitative'} />
      <Button type="submit" disabled={unchanged}>
        {t('habit.saveFrequency')}
      </Button>
      <p aria-live="polite" className="text-sm font-semibold text-primary">
        {saved && t('habit.frequencySaved')}
      </p>
    </form>
  )
}
