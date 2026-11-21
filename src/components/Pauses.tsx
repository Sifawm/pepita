import { useLiveQuery } from 'dexie-react-hooks'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { withId, db, saveSettings, useSettings } from '@/db'
import { startGlobalPause, logicalDay, globalPauseOn, pauseHabit, resumeHabit, skip, endGlobalPause, periodUnit, type Settings, type Log, type TodayCard } from '@/domain'
import { focusById, formatDay } from '@/lib/utils'

/**
 * Skip the period or pause the habit. Lives inside the Today card's menu;
 * `onDone` closes the menu and announces the change.
 */
export function SkipAndPause({ card, settings, onDone }: { card: TodayCard; settings: Settings; onDone: (notice: string) => void }) {
  const { t, i18n } = useTranslation()
  const { habit, skip: skipLog, pause, period } = card
  const today = logicalDay(new Date(), settings.dayCutoff)
  const [reason, setReason] = useState('')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const id = useId()
  const pauseError = useFormError()
  const unit = periodUnit(habit.frequency)
  const ownPause = pause && habit.pauses?.includes(pause)

  const onSkip = async (e: FormEvent) => {
    e.preventDefault()
    await db.logs.add(withId<Log>(skip({ habit, reason, now: new Date(), settings })))
    setReason('')
    onDone(t('pauses.skippedNotice'))
  }

  const onPause = async (e: FormEvent) => {
    e.preventDefault()
    await db.habits.put(pauseHabit(habit, { start, end }))
    onDone(t('pauses.pausedNotice', { date: formatDay(end, i18n.language) }))
  }

  return (
    <div className="space-y-4 border-t p-2 pt-4">
      {skipLog ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await db.logs.delete(skipLog.id)
            onDone(t('pauses.skipUndone'))
          }}
        >
          {t('pauses.undoSkip')}
        </Button>
      ) : (
        period.status === 'in_progress' && (
          <form onSubmit={onSkip} className="space-y-2">
            <Label htmlFor={`${id}-reason`}>{t('pauses.reason')}</Label>
            <Input
              id={`${id}-reason`}
              value={reason}
              placeholder={t('pauses.reasonExample')}
              aria-describedby={`${id}-skip-help`}
              onChange={(e) => setReason(e.target.value)}
            />
            <p id={`${id}-skip-help`} className="text-sm text-muted-foreground">
              {t('pauses.skipHelp')}
            </p>
            <Button type="submit" variant="secondary" className="w-full">
              {t(`pauses.skip_${unit}`)}
            </Button>
          </form>
        )
      )}

      {ownPause ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await db.habits.put(resumeHabit(habit, new Date(), settings))
            onDone(t('pauses.resumed'))
          }}
        >
          {t('pauses.resume')}
        </Button>
      ) : (
        !pause && (
          <form onSubmit={onPause} {...pauseError.form} className="space-y-2">
            <fieldset className="space-y-2">
              <legend className="font-semibold">{t('pauses.pause')}</legend>
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`${id}-start`}>{t('pauses.from')}</Label>
                  <Input id={`${id}-start`} type="date" required min={today} value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-end`}>{t('pauses.until')}</Label>
                  <Input id={`${id}-end`} type="date" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
            </fieldset>
            {pauseError.message}
            {/* Never disabled: a wrong date gets a sentence (useFormError) instead of a dead button. */}
            <Button type="submit" variant="secondary" className="w-full">
              {t('pauses.pauseAction')}
            </Button>
          </form>
        )
      )}
    </div>
  )
}

/** The vacation: pauses every habit until a date and ends on its own. Lives in Settings. */
export function GlobalPause() {
  const { t, i18n } = useTranslation()
  const settings = useSettings()
  const habits = useLiveQuery(() => db.habits.toArray())
  const [end, setEnd] = useState('')
  const [notice, setNotice] = useState('')
  const { form, message } = useFormError()
  if (!settings || !habits) return null
  const today = logicalDay(new Date(), settings.dayCutoff)
  const active = globalPauseOn(settings, today)

  const start = async (e: FormEvent) => {
    e.preventDefault()
    const r = startGlobalPause({ settings, habits, end, now: new Date() })
    await db.transaction('rw', db.habits, db.settings, async () => {
      await db.habits.bulkPut(r.habits)
      await saveSettings({ globalPause: r.globalPause })
    })
    setEnd('')
    focusById('vacation-end')
    setNotice(t('pauses.global.started', { date: formatDay(r.globalPause.end, i18n.language) }))
  }

  const finish = async () => {
    await saveSettings({ globalPause: endGlobalPause({ settings, now: new Date() }) })
    setNotice(t('pauses.global.ended'))
    focusById('vacation-until')
  }

  return (
    <section aria-labelledby="vacation-title" className="space-y-3">
      <h2 id="vacation-title" className="text-xl font-bold">
        {t('pauses.global.title')}
      </h2>
      <p className="text-muted-foreground">{t('pauses.global.intro')}</p>
      {active ? (
        <>
          <p>{t('pauses.global.active', { date: formatDay(active.end, i18n.language) })}</p>
          <Button id="vacation-end" variant="secondary" className="w-full" onClick={finish}>
            {t('pauses.global.end')}
          </Button>
        </>
      ) : (
        <form onSubmit={start} {...form} className="space-y-2">
          <Label htmlFor="vacation-until">{t('pauses.global.until')}</Label>
          <Input id="vacation-until" type="date" className="w-48" required min={today} value={end} onChange={(e) => setEnd(e.target.value)} />
          {message}
          <Button type="submit" variant="secondary" className="w-full">
            {t('pauses.global.start')}
          </Button>
        </form>
      )}
      <p role="status" className="font-semibold text-primary">
        {notice}
      </p>
    </section>
  )
}
