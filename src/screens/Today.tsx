import { liveQuery } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, Check, ChevronDown, NotebookPen, Palmtree, Plus, Sparkles, Users } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { DiagnosisList } from '@/components/DiagnosisCard'
import { ProgressionNotices } from '@/components/ProgressionSuggestion'
import { Celebration, HabitCard, type Panel } from '@/components/HabitCard'
import { buttonVariants } from '@/components/ui/button'
import { db, useSettings } from '@/db'
import { buildToday, pendingDiagnoses, needsBackup, needsOnboarding, nextCutoff, summarizeIdentities, progressionSuggestions, type Log, type Time } from '@/domain'
import { cn, formatDay, identityName } from '@/lib/utils'
import { ScreenHeader } from '@/components/ScreenHeader'

/**
 * Renders Today again at the next logical-day cutoff, so it rolls over to the next day on its own.
 * Nothing else on the screen changes with the minute: a clock ticking every minute re-evaluated every habit for nothing.
 * Also on coming back to the app: a sleeping phone pauses timers, so the cutoff's can fire hours late.
 */
function useDayRollover(dayCutoff?: Time): number {
  const [rollovers, setRollovers] = useState(0)
  useEffect(() => {
    if (!dayCutoff) return
    const rollOver = () => setRollovers((n) => n + 1)
    const onReturn = () => document.visibilityState === 'visible' && rollOver()
    const now = new Date()
    // One second of margin: right at the cutoff it's already the new day.
    const id = setTimeout(rollOver, nextCutoff(now, dayCutoff).getTime() - now.getTime() + 1000)
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      clearTimeout(id)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [rollovers, dayCutoff])
  return rollovers
}

/**
 * Every log (votes count the whole history), with one live query per habit: a tap re-reads and re-watches only the tapped
 * habit's logs. A single query re-read years of logs on every tap, and Dexie re-watches each key a query returns.
 * `undefined` until every habit's logs have arrived; while the habits change, the previous logs stay.
 */
function useLogs(habitIds: string[] | undefined): Log[] | undefined {
  const key = habitIds?.join(',')
  const [logs, setLogs] = useState<Log[]>()
  const [error, setError] = useState<unknown>()
  // Layout, not passive: the logs wait for the habits, and a passive effect added a paint before they started loading.
  useLayoutEffect(() => {
    if (key === undefined) return
    const ids = key ? key.split(',') : []
    const byHabit = new Map<string, Log[]>()
    const publish = () => byHabit.size === ids.length && setLogs(ids.flatMap((id) => byHabit.get(id)!))
    const subscriptions = ids.map((id) =>
      liveQuery(() => db.logs.where('habitId').equals(id).toArray()).subscribe({
        next: (own) => (byHabit.set(id, own), publish()),
        error: (e: unknown) => setError(() => e),
      }),
    )
    publish()
    return () => subscriptions.forEach((s) => s.unsubscribe())
  }, [key])
  // Like `useLiveQuery`: a failed query throws while rendering, for the error boundary.
  if (error) throw error
  return logs
}

export default function TodayScreen() {
  const { t, i18n } = useTranslation()
  const settings = useSettings()
  const rollovers = useDayRollover(settings?.dayCutoff)
  // The filter lives in the URL: it survives going to create a habit and coming back.
  const [params, setParams] = useSearchParams()
  const filterId = params.get('identity')
  const tables = useLiveQuery(async () => {
    const [habits, identities, celebratedMilestones, diagnoses, dismissedSuggestions] = await Promise.all([
      db.habits.toArray(),
      db.identities.toArray(),
      db.celebratedMilestones.toArray(),
      db.diagnoses.toArray(),
      db.dismissedSuggestions.toArray(),
    ])
    return { habits, identities, celebratedMilestones, diagnoses, dismissedSuggestions }
  })
  const logs = useLogs(tables?.habits.map((h) => h.id))
  const data = useMemo(() => tables && logs && { ...tables, logs }, [tables, logs])

  // A single open panel (menu or note) in the whole list.
  const [openPanel, setOpenPanel] = useState<{ habitId: string; panel: Panel }>()
  const [celebration, setCelebration] = useState<{ habitId: string; text: string; n: number }>()
  const closeCelebration = useCallback(() => setCelebration(undefined), [])
  // Pepita's notes stay on screen while open, even after the last one is answered: its confirmation lives inside.
  const [notesOpen, setNotesOpen] = useState(false)

  // Worked out once per data change, rollover or filter: opening a menu or the "+1 vote" toast also renders Today,
  // and summing years of votes again on each of those made every tap wait.
  const derived = useMemo(() => {
    if (!data || !settings || needsOnboarding(data)) return undefined
    // The instant of the data change or of the rollover.
    const now = new Date()
    const active = data.identities.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
    const filter = active.find((i) => i.id === filterId)
    const today = buildToday({ ...data, now, settings, identityId: filter?.id })
    return {
      active,
      filter,
      today,
      // Votes never go down: the total counts archived habits and identities too.
      summaries: summarizeIdentities({ ...data, now, settings }),
      // Pepita's notes wait below the habits. A habit done today isn't asked "what happened?" yet.
      diagnoses: pendingDiagnoses(data).filter(({ habit }) => !today.habits.some((c) => c.done && c.habit.id === habit.id)),
      suggestions: progressionSuggestions({ ...data, now, settings }),
      backup: needsBackup({ settings, logs: data.logs, now }),
    }
    // `rollovers` isn't read: it's there so the cutoff recomputes with the new day's `now`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, settings, filterId, rollovers])

  if (!data || !settings) return null
  // Nothing of their own yet: start with onboarding.
  if (!derived) return <Navigate to="/onboarding" replace />
  const { active, filter, today, summaries, diagnoses, suggestions, backup } = derived
  const date = formatDay(today.day, i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  const votesOf = (id: string) => summaries.find((s) => s.identity.id === id)?.votes ?? 0
  const total = filter ? votesOf(filter.id) : summaries.reduce((n, s) => n + s.votes, 0)
  const n = (x: number) => x.toLocaleString(i18n.language)
  const notes = diagnoses.length + suggestions.length + (backup ? 1 : 0) + (today.globalPause ? 1 : 0)

  return (
    // Bottom room for the "+1 vote" toast: it never covers the last link.
    <div className="space-y-6 pb-20">
      <ScreenHeader title={t('today.title')} />
      <header className="space-y-2">
        <p className="text-muted-foreground first-letter:uppercase">{date}</p>
        {/* Not a live region: the "+1 vote" toast already announces each check-in. */}
        <div>
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
                  open={(panel) => {
                    // Every tap closes panels: with none open, setting state anyway rendered Today again mid-tap.
                    if (panel || openPanel) setOpenPanel(panel && { habitId: card.habit.id, panel })
                  }}
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

      {/* The floating layers share one stack at the bottom, by the thumb: the milestone above the "+1 vote" toast,
          and neither over the votes they celebrate. The stack is capped to the screen; with large text the milestone
          shrinks and scrolls inside, the toast keeps its size. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 mx-auto flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-md flex-col gap-2">
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
    </div>
  )
}
