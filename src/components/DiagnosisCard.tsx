import { Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { ExportIcsButton } from '@/components/Reminders'
import { Button } from '@/components/ui/button'
import { db, useSettings } from '@/db'
import { DIAGNOSIS_ACTIONS, DIAGNOSIS_PAUSE_DAYS, diagnosisPause, answerDiagnosis, type DiagnosisAction, type Diagnosis, type Habit, type Law, type DiagnosisAnswer } from '@/domain'
import { formatDay } from '@/lib/utils'

const LAWS: Law[] = [1, 2, 3, 4]
const LONG = 'w-full text-left'

/**
 * The diagnoses waiting for an answer, as notices that open the dialog. Lives on Today (the
 * pending ones) and in the habit's detail (the snoozed one too).
 */
export function DiagnosisList({ items }: { items: { diagnosis: Diagnosis; habit: Habit }[] }) {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState<string>()
  const [notice, setNotice] = useState('')
  const chosen = items.find((i) => i.diagnosis.id === openId)
  return (
    <>
      {items.length > 0 && (
        <ul aria-label={t('diagnosis.notices')} className="space-y-2">
          {items.map(({ diagnosis, habit }) => (
            <li key={diagnosis.id}>
              <Button variant="secondary" className={LONG} onClick={() => setOpenId(diagnosis.id)}>
                <Sparkles aria-hidden className="text-primary" />
                {t('diagnosis.notice', { name: habit.name })}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="empty:sr-only text-sm text-muted-foreground">
        {notice}
      </p>
      {chosen && (
        <DiagnosisDialog
          key={chosen.diagnosis.id}
          {...chosen}
          onClose={(text) => {
            setOpenId(undefined)
            setNotice(text ?? '')
            // Answered, snoozed or dismissed, its notice disappears: focus can't go back to it.
            requestAnimationFrame(() => document.activeElement === document.body && document.getElementById('main')?.focus())
          }}
        />
      )}
    </>
  )
}

/** The dialog: the 4 causes and, once one is chosen, its tip and its one-tap actions. */
function DiagnosisDialog({ diagnosis, habit, onClose }: { diagnosis: Diagnosis; habit: Habit; onClose: (notice?: string) => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useSettings()
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [law, setLaw] = useState<Law>()
  // The .ics downloads without closing the dialog (its button announces the result); it's saved when closing with "Done".
  const [exported, setExported] = useState(false)

  // Native modal: traps focus and closes with Escape (changing nothing). On unmount it only leaves
  // the top layer; it isn't closed by hand so `onClose` doesn't fire and wipe the notice.
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal()
  }, [])

  const save = (a: DiagnosisAnswer) => db.diagnoses.put(answerDiagnosis(diagnosis, a))

  const apply = async (action?: DiagnosisAction) => {
    if (!law || !settings) return
    await save({ status: 'answered', law, action })
    const edit = (step: string) => navigate(`/habit/${habit.id}/edit?step=${step}`)
    switch (action) {
      case 'edit_intention':
        return edit('intention')
      case 'edit_reward':
        return edit('reward')
      case 'edit_environment':
        return edit('environment')
      // Cause 3 keeps the `lower` suggestion active: it's confirmed in the habit's detail, never here.
      case 'minimum_only':
        return navigate(`/habit/${habit.id}`, { state: { progression: true } })
      case 'edit_identity':
        return navigate('/identities')
      case 'view_votes':
        return navigate(`/identities/${habit.identityId}`)
      case 'pause': {
        const paused = diagnosisPause({ habit, now: new Date(), settings })
        await db.habits.put(paused)
        return onClose(t('pauses.pausedNotice', { date: formatDay(paused.pauses!.at(-1)!.end, i18n.language) }))
      }
      case 'archive':
        await db.habits.update(habit.id, { archived: true })
        return onClose(t('diagnosis.archived'))
      default:
        return onClose(t('diagnosis.thanks'))
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      onClose={() => onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card p-6 text-card-foreground backdrop:bg-black/50"
    >
      <div className="space-y-4">
        <h2 id={`${id}-title`} className="text-xl font-bold break-words">
          {t('diagnosis.title', { name: habit.name })}
        </h2>
        {law === undefined ? (
          <>
            <p id={`${id}-intro`}>{t('diagnosis.intro')}</p>
            <ul aria-label={t('diagnosis.causes.title')} className="space-y-2">
              {LAWS.map((l) => (
                <li key={l}>
                  <Button variant="secondary" className={LONG} autoFocus={l === 1} onClick={() => setLaw(l)}>
                    {t(`diagnosis.causes.${l}`)}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t pt-4">
              <Button variant="ghost" onClick={async () => (await save({ status: 'snoozed' }), onClose(t('diagnosis.snoozed')))}>
                {t('diagnosis.snooze')}
              </Button>
              <Button variant="ghost" onClick={async () => (await save({ status: 'dismissed' }), onClose(t('diagnosis.dismissed')))}>
                {t('diagnosis.dismiss')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p id={`${id}-intro`} className="flex gap-2 rounded-lg bg-accent p-3 text-accent-foreground">
              <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="sr-only">{t('wizard.pepita')} </span>
                {t(`diagnosis.tips.${law}`)}
              </span>
            </p>
            <ul aria-label={t('diagnosis.actions.title')} className="space-y-2">
              {DIAGNOSIS_ACTIONS[law].map((action, i) => (
                <li key={action}>
                  {action === 'export_ics' ? (
                    <div onClickCapture={() => setExported(true)}>
                      <ExportIcsButton />
                    </div>
                  ) : (
                    <Button className={LONG} variant={i === 0 ? 'default' : 'secondary'} autoFocus={i === 0} onClick={() => apply(action)}>
                      {t(`diagnosis.actions.${action}`, { days: DIAGNOSIS_PAUSE_DAYS })}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => apply(exported ? 'export_ics' : undefined)}>
                {t(exported ? 'diagnosis.done' : 'diagnosis.justNote')}
              </Button>
              <Button variant="ghost" onClick={() => (setLaw(undefined), setExported(false))}>
                {t('diagnosis.otherCause')}
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
