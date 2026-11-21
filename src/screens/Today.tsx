import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, NotebookPen, Palmtree, Plus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router'
import BackupReminder from '@/components/BackupReminder'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { DiagnosisList } from '@/components/DiagnosisCard'
import { ProgressionNotices } from '@/components/ProgressionSuggestion'
import { Celebration, HabitCard, type Panel } from '@/components/HabitCard'
import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { db, useSettings } from '@/db'
import { buildToday, pendingDiagnoses, needsOnboarding, summarizeIdentities, progressionSuggestions } from '@/domain'
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

  if (!data || !settings) return null
  // Nothing of their own yet: start with onboarding.
  if (needsOnboarding(data)) return <Navigate to="/onboarding" replace />
  const active = data.identities.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
  const filter = active.find((i) => i.id === params.get('identity'))
  const today = buildToday({ ...data, now, settings, identityId: filter?.id })
  const date = formatDay(today.day, i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <ScreenHeader title={t('today.title')} />
      <header className="space-y-1">
        <p className="text-muted-foreground first-letter:uppercase">{date}</p>
        <p className="text-lg font-semibold text-primary" aria-live="polite">
          {t('today.votes', { count: today.votes })}
        </p>
      </header>

      <BackupReminder now={now} />

      <DiagnosisList items={pendingDiagnoses(data)} />

      <ProgressionNotices items={progressionSuggestions({ ...data, now, settings })} />

      {today.globalPause && (
        <aside aria-label={t('pauses.global.title')} className="flex items-start gap-3 rounded-lg border bg-accent p-4 text-accent-foreground">
          <Palmtree aria-hidden className="mt-0.5 size-6 shrink-0" />
          <p>{t('pauses.global.notice', { date: formatDay(today.globalPause.end, i18n.language) })}</p>
        </aside>
      )}

      {active.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="filter">{t('identities.filter')}</Label>
          <Select id="filter" value={filter?.id ?? ''} onChange={(e) => setParams(e.target.value ? { identity: e.target.value } : {}, { replace: true })}>
            <option value="">{t('identities.all')}</option>
            {active.map((i) => (
              <option key={i.id} value={i.id}>
                {identityName(i, t)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {today.habits.length === 0 ? (
        <p className="text-muted-foreground">{t(filter ? 'identities.filterEmpty' : 'today.empty')}</p>
      ) : (
        <ul aria-label={t('today.list')} className="space-y-3">
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

      <div className="flex flex-col gap-3">
        <Link to={filter ? `/new?identity=${filter.id}` : '/new'} className={cn(buttonVariants(), 'w-full')}>
          <Plus aria-hidden />
          {t('today.new')}
        </Link>
        <Link to="/identities" className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
          <Users aria-hidden />
          {t('identities.title')}
        </Link>
        <Link to="/review" className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
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

      <MilestoneCelebration summaries={summarizeIdentities({ ...data, now, settings })} />
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
