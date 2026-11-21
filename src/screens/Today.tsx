import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, Check, ChevronDown, NotebookPen, Palmtree, Plus, Sparkles, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { DiagnosisList } from '@/components/DiagnosisCard'
import { ProgressionNotices } from '@/components/ProgressionSuggestion'
import { Celebration, HabitCard, type Panel } from '@/components/HabitCard'
import { buttonVariants } from '@/components/ui/button'
import { db, useSettings } from '@/db'
import { buildToday, pendingDiagnoses, needsBackup, needsOnboarding, summarizeIdentities, progressionSuggestions } from '@/domain'
import { cn, formatDay, identityName } from '@/lib/utils'
import { ScreenHeader } from '@/components/ScreenHeader'

/** The screen's clock: ticks every minute so Today rolls over to the next day on its own. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function TodayScreen() {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const settings = useSettings()
  // The filter lives in the URL: it survives going to create a habit and coming back.
  const [params, setParams] = useSearchParams()
  // ponytail: loads every log (the current period can be a month); narrow by date if it gets heavy.
  const data = useLiveQuery(async () => {
    const [habits, identities, logs, celebratedMilestones, diagnoses, dismissedSuggestions] = await Promise.all([
      db.habits.toArray(),
      db.identities.toArray(),
      db.logs.toArray(),
      db.celebratedMilestones.toArray(),
      db.diagnoses.toArray(),
      db.dismissedSuggestions.toArray(),
    ])
    return { habits, identities, logs, celebratedMilestones, diagnoses, dismissedSuggestions }
  })

  // A single open panel (menu or note) in the whole list.
  const [openPanel, setOpenPanel] = useState<{ habitId: string; panel: Panel }>()
  const [celebration, setCelebration] = useState<{ habitId: string; text: string; n: number }>()
  const closeCelebration = useCallback(() => setCelebration(undefined), [])
  // Pepita's notes stay on screen while open, even after the last one is answered: its confirmation lives inside.
  const [notesOpen, setNotesOpen] = useState(false)

  if (!data || !settings) return null
  // Nothing of their own yet: start with onboarding.
  if (needsOnboarding(data)) return <Navigate to="/onboarding" replace />
  const active = data.identities.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
  const filter = active.find((i) => i.id === params.get('identity'))
  const today = buildToday({ ...data, now, settings, identityId: filter?.id })
  const date = formatDay(today.day, i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  // Votes never go down: the total counts archived habits and identities too.
  const summaries = summarizeIdentities({ ...data, now, settings })
  const votesOf = (id: string) => summaries.find((s) => s.identity.id === id)?.votes ?? 0
  const total = filter ? votesOf(filter.id) : summaries.reduce((n, s) => n + s.votes, 0)
  const n = (x: number) => x.toLocaleString(i18n.language)

  // Pepita's notes wait below the habits. A habit done today isn't asked "what happened?" yet.
  const diagnoses = pendingDiagnoses(data).filter(({ habit }) => !today.habits.some((c) => c.done && c.habit.id === habit.id))
  const suggestions = progressionSuggestions({ ...data, now, settings })
  const backup = needsBackup({ settings, logs: data.logs, now })
  const notes = diagnoses.length + suggestions.length + (backup ? 1 : 0) + (today.globalPause ? 1 : 0)

  return (
    // Bottom room for the "+1 vote" toast: it never covers the last link.
    <div className="space-y-6 pb-20">
      <ScreenHeader title={t('today.title')} />
      <header className="space-y-2">
        <p className="text-muted-foreground first-letter:uppercase">{date}</p>
        <div aria-live="polite" aria-atomic="true">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-5xl leading-none font-extrabold tracking-tight text-primary tabular-nums">{n(total)}</span>
            <span className="text-lg font-semibold text-balance">
              {filter ? t('today.votesFor', { count: total, identity: identityName(filter, t) }) : t('today.votesTotal', { count: total })}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('today.votes', { count: today.votes })}</p>
        </div>
      </header>

      <section aria-label={t('today.list')} className="space-y-3">
        {active.length > 1 && (
          <div role="group" aria-label={t('identities.filter')} className="flex flex-wrap gap-2">
            {[undefined, ...active].map((i) => {
              const selected = filter?.id === i?.id
              return (
                <button
                  key={i?.id ?? 'all'}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setParams(i ? { identity: i.id } : {}, { replace: true })}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-left text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                    selected ? 'border-foreground bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  {selected && <Check aria-hidden className="size-4 shrink-0" />}
                  {i ? (
                    <>
                      {identityName(i, t)}
                      <span className="font-normal tabular-nums">{n(votesOf(i.id))}</span>
                    </>
                  ) : (
                    t('identities.allShort')
                  )}
                </button>
              )
            })}
          </div>
        )}

        {today.habits.length === 0 ? (
          <p className="text-muted-foreground">{t(filter ? 'identities.filterEmpty' : 'today.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {today.habits.map((card) => (
              <li key={card.habit.id}>
                <HabitCard
                  card={card}
                  logs={data.logs}
                  settings={settings}
                  panel={openPanel?.habitId === card.habit.id ? openPanel.panel : undefined}
                  open={(panel) => setOpenPanel(panel && { habitId: card.habit.id, panel })}
                  celebrate={() =>
                    setCelebration((c) => ({
                      habitId: card.habit.id,
                      text: t('today.celebration', { identity: identityName(card.identity, t) }),
                      n: (c?.n ?? 0) + 1,
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(notes > 0 || notesOpen) && (
        <details open={notesOpen} onToggle={(e) => setNotesOpen(e.currentTarget.open)} className="group rounded-lg border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <Sparkles aria-hidden className="size-5 shrink-0 text-primary" />
            <span className="flex-1">{t('today.notes', { count: notes })}</span>
            <ChevronDown aria-hidden className="size-5 shrink-0 text-muted-foreground motion-safe:transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t p-4">
            {today.globalPause && (
              <p className="flex items-start gap-3">
                <Palmtree aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                {t('pauses.global.notice', { date: formatDay(today.globalPause.end, i18n.language) })}
              </p>
            )}
            <DiagnosisList items={diagnoses} />
            <ProgressionNotices items={suggestions} />
            {backup && (
              <div className="space-y-3">
                <p>{t('backups.notice')}</p>
                <Link to="/settings" className={buttonVariants({ variant: 'secondary', className: 'w-full' })}>
                  {t('backups.noticeAction')}
                </Link>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-3">
        <Link to={filter ? `/new?identity=${filter.id}` : '/new'} className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
          <Plus aria-hidden />
          {t('today.new')}
        </Link>
        <Link to="/identities" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
          <Users aria-hidden />
          {t('identities.title')}
        </Link>
        <Link to="/review" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
          <NotebookPen aria-hidden />
          {t('review.title')}
        </Link>
        {data.habits.some((h) => h.archived) && (
          <Link to="/archived" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
            <Archive aria-hidden />
            {t('archived.title')}
          </Link>
        )}
      </div>

      <MilestoneCelebration summaries={summaries} />
      <Celebration
        text={celebration?.text}
        animationKey={celebration?.n ?? 0}
        onClose={closeCelebration}
        onAddNote={() => {
          if (celebration) setOpenPanel({ habitId: celebration.habitId, panel: 'note' })
          setCelebration(undefined)
        }}
      />
    </div>
  )
}
