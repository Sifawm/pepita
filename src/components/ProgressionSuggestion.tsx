import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { withId, db } from '@/db'
import { changeRule, dismissSuggestion, type Settings, type Habit, type Suggestion, type DismissedSuggestion } from '@/domain'

/**
 * The wizard step where a suggestion without a proposed rule is adjusted (yes/no, avoid, or a
 * target that can't move any further). Without a step, the suggestion is just encouragement.
 */
function stepFor(habit: Habit, s: Suggestion): string | undefined {
  if (s.proposal) return undefined
  if (s.type === 'raise' && s.dominant === 'minimum') return habit.type === 'yes_no' && !habit.fullVersion ? 'versions' : undefined
  if (habit.type === 'avoid') return 'friction'
  if (habit.type === 'quantitative') return 'type'
  return s.type === 'raise' ? 'frequency' : 'versions'
}

/** The key of Pepita's copy for the suggestion (also used in the weekly review). */
// eslint-disable-next-line react-refresh/only-export-components
export const suggestionTextKey = (habit: Habit, s: Suggestion) =>
  s.type === 'raise' ? `progression.raise.${s.dominant}` : habit.type === 'avoid' ? 'progression.lower.avoid' : 'progression.lower.other'

/**
 * A habit's active suggestion, in its detail (always mounted: the notice outlives the card).
 * Nothing applies on its own: a new target is confirmed here; the rest is adjusted in the wizard (which
 * saves nothing until "Save"). Applying or dismissing it silences it for 21 days.
 */
export function ProgressionSuggestion({ habit, suggestion, settings }: { habit: Habit; suggestion?: Suggestion; settings: Settings }) {
  const { t } = useTranslation()
  const [notice, setNotice] = useState('')
  return (
    <>
      {suggestion && <SuggestionCard key={suggestion.type} habit={habit} suggestion={suggestion} settings={settings} announce={setNotice} />}
      <p role="status" className="empty:hidden text-sm text-muted-foreground">
        {notice && t(notice)}
      </p>
    </>
  )
}

function SuggestionCard({ habit, suggestion, settings, announce }: { habit: Habit; suggestion: Suggestion; settings: Settings; announce: (key: string) => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const ref = useRef<HTMLElement>(null)
  // Coming from the diagnosis' "Stick to the minimum": focus lands here.
  const fromDiagnosis = (useLocation().state as { progression?: boolean } | null)?.progression
  useEffect(() => {
    if (fromDiagnosis) ref.current?.focus()
  }, [fromDiagnosis])
  const [confirming, setConfirming] = useState(false)
  const step = stepFor(habit, suggestion)
  const proposed = suggestion.proposal?.quantitative
  const n = (x: number) => x.toLocaleString(i18n.language)

  const silence = () => db.dismissedSuggestions.add(withId<DismissedSuggestion>(dismissSuggestion({ habit, type: suggestion.type, now: new Date(), settings })))
  const apply = async () => {
    await db.transaction('rw', db.habits, db.dismissedSuggestions, async () => {
      if (suggestion.proposal) await db.habits.put(changeRule({ habit, rule: suggestion.proposal, now: new Date(), settings }))
      await silence()
    })
    announce('progression.changed')
  }
  const dismiss = async () => (await silence(), announce('progression.dismissed'))

  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="progression" className="space-y-3 rounded-lg border bg-card p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
      <h2 id="progression" className="flex items-center gap-2 text-xl font-bold">
        <Sparkles aria-hidden className="size-5 shrink-0 text-primary" />
        {t('progression.title')}
      </h2>
      <p>{t(suggestionTextKey(habit, suggestion), { name: habit.name })}</p>
      {proposed && habit.quantitative && (
        <p className="font-semibold">{t(`progression.proposal.${proposed.mode}`, { before: n(habit.quantitative.target), after: n(proposed.target), unit: proposed.unit })}</p>
      )}
      {confirming ? (
        <div role="alertdialog" aria-labelledby="progression-confirm" className="space-y-3 border-t pt-3">
          <p id="progression-confirm">{t('progression.confirm')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={apply}>{t('progression.change')}</Button>
            {/* Focus starts on the safe option. */}
            <Button variant="secondary" autoFocus onClick={() => setConfirming(false)}>
              {t('progression.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          {proposed ? (
            <Button onClick={() => setConfirming(true)}>{t('progression.viewChange')}</Button>
          ) : step ? (
            <Button onClick={async () => (await silence(), navigate(`/habit/${habit.id}/edit?step=${step}`))}>{t('progression.adjust')}</Button>
          ) : (
            <Button onClick={async () => (await silence(), announce('progression.encouragement'))}>{t('progression.gotIt')}</Button>
          )}
          <Button variant="ghost" onClick={dismiss}>
            {t('progression.dismiss')}
          </Button>
        </div>
      )}
    </section>
  )
}

/** On Today, a light hint per habit with a suggestion: it leads to its detail. */
export function ProgressionNotices({ items }: { items: { habit: Habit; suggestion: Suggestion }[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <ul aria-label={t('progression.notices')} className="space-y-1">
      {items.map(({ habit, suggestion }) => {
        const Icon = suggestion.type === 'raise' ? TrendingUp : TrendingDown
        return (
          <li key={habit.id}>
            <Link
              to={`/habit/${habit.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {t('progression.notice', { name: habit.name })}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
