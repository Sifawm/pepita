import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { SeriesChart } from '@/components/SeriesChart'
import { buttonVariants } from '@/components/ui/button'
import { db, useSettings } from '@/db'
import { logicalDay, MILESTONES, summarizeIdentities } from '@/domain'
import { cn, formatDay, identityName } from '@/lib/utils'
import { ScreenHeader } from '@/components/ScreenHeader'

/** An identity's detail: accumulated votes curve, milestones and its habits. */
export default function IdentityDetailScreen() {
  const { t, i18n } = useTranslation()
  const { id = '' } = useParams()
  const settings = useSettings()
  const data = useLiveQuery(async () => {
    const identity = await db.identities.get(id)
    const habits = await db.habits.where('identityId').equals(id).toArray()
    const logs = await db.logs.where('habitId').anyOf(habits.map((h) => h.id)).toArray()
    return { identity, habits, logs }
  }, [id])

  if (!data || !settings) return null
  const { identity, habits } = data
  if (!identity)
    return (
      <>
        <ScreenHeader title={t('identityDetail.notFound')} />
        <p className="text-muted-foreground">{t('identityDetail.notFoundHelp')}</p>
      </>
    )

  const now = new Date()
  const [summary] = summarizeIdentities({ ...data, identities: [identity], now, settings })
  const next = MILESTONES.find((m) => m > summary.votes)
  const sorted = [...habits].sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order)
  const long = { day: 'numeric', month: 'long', year: 'numeric' } as const

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <ScreenHeader title={identityName(identity, t)} />
        <p className="text-lg font-semibold text-primary">{t('identities.votes', { count: summary.votes })}</p>
      </header>

      <section aria-labelledby="curve" className="space-y-3">
        <h2 id="curve" className="text-xl font-bold">
          {t('identityDetail.curve')}
        </h2>
        {summary.series.length ? (
          <SeriesChart
            points={summary.series.map((p) => ({ day: p.day, value: p.votes }))}
            end={logicalDay(now, settings.dayCutoff)}
            summary={t('identityDetail.curveSummary', {
              count: summary.votes,
              from: formatDay(summary.series[0].day, i18n.language, long),
            })}
            columns={[t('identityDetail.dayColumn'), t('identityDetail.votesColumn')]}
          />
        ) : (
          <p className="text-muted-foreground">{t('identityDetail.noVotes')}</p>
        )}
      </section>

      <section aria-labelledby="milestones" className="space-y-3">
        <h2 id="milestones" className="text-xl font-bold">
          {t('milestones.title')}
        </h2>
        {summary.milestones.length > 0 && (
          <ul className="space-y-2">
            {summary.milestones.map((m) => (
              <li key={m.threshold} className="flex items-center gap-3">
                <Check aria-hidden className="size-5 shrink-0 text-primary" />
                <span>{t('milestones.reached', { count: m.threshold, date: formatDay(m.day, i18n.language, long) })}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground">{next ? t('milestones.next', { count: next, remaining: next - summary.votes }) : t('milestones.all')}</p>
      </section>

      <section aria-labelledby="habits" className="space-y-3">
        <h2 id="habits" className="text-xl font-bold">
          {t('identityDetail.habits')}
        </h2>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">{t('identityDetail.noHabits')}</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((h) => (
              <li key={h.id} className="space-y-1 rounded-lg border bg-card p-4">
                <p className="text-lg font-semibold break-words">
                  {h.name}
                  {h.archived && <span className="ml-2 text-sm font-normal text-muted-foreground">{t('identityDetail.archived')}</span>}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Link to={`/habit/${h.id}`} className={buttonVariants({ variant: 'ghost' })}>
                    <CalendarDays aria-hidden />
                    {t('identityDetail.calendar')}
                    <span className="sr-only">{h.name}</span>
                  </Link>
                  {!h.archived && (
                    <Link to={`/habit/${h.id}/edit`} className={buttonVariants({ variant: 'ghost' })}>
                      <Pencil aria-hidden />
                      {t('identityDetail.edit')}
                      <span className="sr-only">{h.name}</span>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!identity.archived && (
          <Link to={`/new?identity=${identity.id}`} className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
            {t('today.new')}
          </Link>
        )}
      </section>
    </div>
  )
}
