import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { suggestionTextKey } from '@/components/ProgressionSuggestion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, saveWeeklyNote, useSettings } from '@/db'
import { logicalDay, review, addDays, type MethodField, type Habit, type Review } from '@/domain'
import { cn, formatDay, identityName } from '@/lib/utils'
import { ScreenHeader } from '@/components/ScreenHeader'

const SECTIONS = ['votes', 'recovery', 'diagnoses', 'failures', 'suggestions', 'fields', 'note'] as const
type Section = (typeof SECTIONS)[number]

/** The wizard step where each method field is filled in. */
const stepFor = (field: MethodField, habit: Habit) => (field === 'minimumVersion' ? (habit.type === 'quantitative' ? 'type' : 'versions') : field)

const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

const linkClass =
  'inline-flex min-h-11 items-center rounded-md font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring'

/**
 * Weekly review: the week (Monday to Sunday) in the URL (`?week=`), its free-form note and a
 * view to print or save as PDF (`print:`), with the period and sections to choose.
 */
export default function WeeklyReviewScreen() {
  const { t, i18n } = useTranslation()
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const data = useLiveQuery(async () => {
    const [identities, habits, logs, diagnoses, dismissedSuggestions, weeklyReviews, failureNotes] = await Promise.all([
      db.identities.toArray(),
      db.habits.toArray(),
      db.logs.toArray(),
      db.diagnoses.toArray(),
      db.dismissedSuggestions.toArray(),
      db.weeklyReviews.toArray(),
      db.failureNotes.toArray(),
    ])
    return { identities, habits, logs, diagnoses, dismissedSuggestions, weeklyReviews, failureNotes }
  })
  const [printing, setPrinting] = useState<{ start?: string; end?: string; sections: Section[] }>({ sections: [...SECTIONS] })

  if (!data || !settings) return null
  const now = new Date()
  const today = logicalDay(now, settings.dayCutoff)
  const week = review({ ...data, start: isDay(params.get('week')) ? params.get('week')! : today, now, settings })
  const isCurrent = week.end >= today
  const note = week.notes[0]?.note ?? ''
  const long = { day: 'numeric', month: 'long', year: 'numeric' } as const

  const start = isDay(printing.start ?? null) ? printing.start! : week.start
  const end = isDay(printing.end ?? null) && printing.end! >= start ? printing.end! : start > week.end ? start : week.end
  const report = review({ ...data, start, end, now, settings })
  const goTo = (day: string) => setParams({ week: day }, { replace: true })

  return (
    <>
      <div className="space-y-8 print:hidden">
        <header className="space-y-1">
          <ScreenHeader title={t('review.title')} />
          <p className="text-muted-foreground">{t('review.intro')}</p>
        </header>

        <nav aria-label={t('review.weeks')} className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="min-w-11 px-0" aria-label={t('review.previous')} onClick={() => goTo(addDays(week.start, -7))}>
            <ChevronLeft aria-hidden />
          </Button>
          <p className="text-center font-semibold" aria-live="polite">
            {t('review.week', { from: formatDay(week.start, i18n.language), until: formatDay(week.end, i18n.language, long) })}
          </p>
          <Button variant="ghost" className="min-w-11 px-0" aria-label={t('review.next')} disabled={isCurrent} onClick={() => goTo(addDays(week.start, 7))}>
            <ChevronRight aria-hidden />
          </Button>
        </nav>

        <ReviewContent r={week} sections={SECTIONS} />

        <WeeklyNote key={week.start} week={week.start} initial={note} />

        <section aria-labelledby="print" className="space-y-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <h2 id="print" className="text-xl font-bold">
              {t('review.print.title')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('review.print.help')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="print-start">{t('review.print.from')}</Label>
              <Input id="print-start" type="date" value={start} max={today} onChange={(e) => setPrinting({ ...printing, start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="print-end">{t('review.print.until')}</Label>
              <Input id="print-end" type="date" value={end} min={start} onChange={(e) => setPrinting({ ...printing, end: e.target.value })} />
            </div>
          </div>
          <fieldset className="space-y-1">
            <legend className="mb-1 font-semibold">{t('review.print.include')}</legend>
            {SECTIONS.map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={printing.sections.includes(s)}
                  onChange={(e) =>
                    setPrinting({
                      ...printing,
                      sections: e.target.checked ? SECTIONS.filter((x) => x === s || printing.sections.includes(x)) : printing.sections.filter((x) => x !== s),
                    })
                  }
                />
                {t(`review.${s}.title`)}
              </label>
            ))}
          </fieldset>
          <Button className="w-full" disabled={printing.sections.length === 0} onClick={() => window.print()}>
            <Printer aria-hidden />
            {t('review.print.button')}
          </Button>
        </section>
      </div>

      {/* Paper only: always light (see `@media print` in index.css), no links or controls. */}
      <article className="hidden space-y-6 text-black print:block">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{t('review.print.report')}</h1>
          <p className="font-semibold">{t('review.week', { from: formatDay(report.start, i18n.language, long), until: formatDay(report.end, i18n.language, long) })}</p>
          <p className="text-sm">{t('review.print.status', { date: formatDay(today, i18n.language, long) })}</p>
        </header>
        <ReviewContent r={report} sections={printing.sections} paper />
      </article>
    </>
  )
}

/** A review's sections. On `paper`, text without links and the notes of all its weeks. */
function ReviewContent({ r, sections, paper = false }: { r: Review; sections: readonly Section[]; paper?: boolean }) {
  const { t, i18n } = useTranslation()
  const habitLink = (h: Habit, text: ReactNode = h.name) =>
    paper ? (
      text
    ) : (
      <Link to={`/habit/${h.id}`} className={linkClass}>
        {text}
      </Link>
    )
  const blocks: Record<Section, ReactNode> = {
    votes: (
      <List empty={r.votes.every((v) => v.votes === 0) && t('review.votes.empty')}>
        {r.votes.map(({ identity, votes }) => (
          <li key={identity.id} className="flex justify-between gap-3">
            <span className="break-words">{identityName(identity, t)}</span>
            <span className="shrink-0 font-semibold">{t('review.votes.n', { count: votes })}</span>
          </li>
        ))}
      </List>
    ),
    recovery: (
      <List empty={r.recovering.length === 0 && t('review.recovery.empty')}>
        {r.recovering.map((h) => (
          <li key={h.id}>{habitLink(h)}</li>
        ))}
      </List>
    ),
    diagnoses: (
      <List empty={r.diagnoses.length === 0 && t('review.diagnoses.empty')}>
        {r.diagnoses.map(({ diagnosis, habit: h }) => (
          <li key={diagnosis.id}>{habitLink(h, t('review.diagnoses.item', { name: h.name }))}</li>
        ))}
      </List>
    ),
    failures: (
      <List empty={r.failures.length === 0 && t('review.failures.empty')}>
        {r.failures.map(({ habit: h, note: n }) => (
          <li key={n.id} className="space-y-1">
            <p className="break-words">
              <span className="font-semibold">{habitLink(h)}</span> · {formatDay(n.period, i18n.language)}
            </p>
            <p className="break-words">{[n.law && t(`recovery.laws.${n.law}`), n.note].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
      </List>
    ),
    suggestions: (
      <List empty={r.suggestions.length === 0 && t('review.suggestions.empty')}>
        {r.suggestions.map(({ habit: h, suggestion }) => (
          <li key={h.id} className="space-y-1">
            <p>{t(suggestionTextKey(h, suggestion), { name: h.name })}</p>
            {!paper && (
              <Link to={`/habit/${h.id}`} className={cn(linkClass, 'text-sm')} aria-label={t('review.suggestions.view', { name: h.name })}>
                {t('review.suggestions.viewShort')}
              </Link>
            )}
          </li>
        ))}
      </List>
    ),
    fields: (
      <>
        {r.emptyFields.length > 0 && <p className="text-muted-foreground print:text-black">{t('review.fields.intro')}</p>}
        <List empty={r.emptyFields.length === 0 && t('review.fields.empty')}>
          {r.emptyFields.map(({ habit: h, fields }) => (
            <li key={h.id} className="space-y-1">
              <p className="font-semibold break-words">{h.name}</p>
              {paper ? (
                <p>{fields.map((f) => t(`review.fields.${f}`)).join(', ')}</p>
              ) : (
                <ul className="flex flex-wrap gap-x-4">
                  {fields.map((f) => (
                    <li key={f}>
                      <Link
                        to={`/habit/${h.id}/edit?step=${stepFor(f, h)}`}
                        className={linkClass}
                        aria-label={t('review.fields.fillIn', { field: t(`review.fields.${f}`), name: h.name })}
                      >
                        {t(`review.fields.${f}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </List>
      </>
    ),
    // On screen, the note is written separately (`WeeklyNote`); on paper, each week's notes for the period show up.
    note: paper && (
      <List empty={r.notes.length === 0 && t('review.note.empty')}>
        {r.notes.map((n) => (
          <li key={n.id} className="space-y-1">
            <p className="font-semibold">{t('review.note.week', { date: formatDay(n.week, i18n.language) })}</p>
            <p className="whitespace-pre-wrap">{n.note}</p>
          </li>
        ))}
      </List>
    ),
  }
  return sections.map(
    (s) =>
      blocks[s] && (
        <section key={s} aria-labelledby={`${paper ? 'paper' : 'section'}-${s}`} className="space-y-3 print:break-inside-avoid">
          <h2 id={`${paper ? 'paper' : 'section'}-${s}`} className="text-xl font-bold">
            {t(`review.${s}.title`)}
          </h2>
          {blocks[s]}
        </section>
      ),
  )
}

function List({ empty, children }: { empty: string | false; children: ReactNode }) {
  if (empty) return <p className="text-muted-foreground print:text-black">{empty}</p>
  return <ul className="space-y-2">{children}</ul>
}

/** The week's free-form note. Saving it empty deletes it. */
function WeeklyNote({ week, initial }: { week: string; initial: string }) {
  const { t } = useTranslation()
  const [text, setText] = useState(initial)
  const [notice, setNotice] = useState('')
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        await saveWeeklyNote(week, text)
        setNotice(text.trim() ? 'review.note.saved' : 'review.note.deleted')
      }}
    >
      <h2 className="text-xl font-bold">
        <label htmlFor="week-note">{t('review.note.title')}</label>
      </h2>
      <p id="note-help" className="text-sm text-muted-foreground">
        {t('review.note.help')}
      </p>
      <textarea
        id="week-note"
        aria-describedby="note-help"
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setNotice('')
        }}
        className="w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
      <Button type="submit" variant="secondary">
        {t('review.note.save')}
      </Button>
      <p role="status" className="text-sm text-muted-foreground empty:hidden">
        {notice && t(notice)}
      </p>
    </form>
  )
}
