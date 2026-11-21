import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { db, saveSettings, readSettings, useSettings } from '@/db'
import { todayReminders, icsReminders } from '@/domain'
import { download, phraseTitle } from '@/lib/utils'

/** Downloads the .ics with every reminder. Returns whether there was any. */
function useExportIcs() {
  const { t } = useTranslation()
  return async () => {
    const [habits, settings] = await Promise.all([db.habits.toArray(), readSettings()])
    const { ics, events } = icsReminders({ habits, now: new Date(), settings, text: (p) => phraseTitle(p, t) })
    download('pepita-reminders.ics', [ics], 'text/calendar;charset=utf-8')
    return events > 0
  }
}

/** "Export reminders (.ics)" button with its notice. For Settings and for the 1st-law diagnosis. */
export function ExportIcsButton({ variant = 'secondary' }: { variant?: 'default' | 'secondary' }) {
  const { t } = useTranslation()
  const exportIcs = useExportIcs()
  const [notice, setNotice] = useState('')
  return (
    <div className="space-y-2">
      <Button variant={variant} className="w-full" onClick={async () => setNotice(t((await exportIcs()) ? 'reminders.exported' : 'reminders.none'))}>
        <CalendarPlus aria-hidden />
        {t('reminders.export')}
      </Button>
      <p role="status" className="text-sm font-semibold text-primary">
        {notice}
      </p>
    </div>
  )
}

const supported = () => 'Notification' in window

/** Settings section: the .ics and the reminders while the app is open. */
export function RemindersSection() {
  const { t } = useTranslation()
  const settings = useSettings()
  const [permission, setPermission] = useState(() => (supported() ? Notification.permission : undefined))
  const enabled = !!settings?.notifications && permission === 'granted'

  const toggle = async (enable: boolean) => {
    if (enable && Notification.permission !== 'granted') {
      const answer = await Notification.requestPermission()
      setPermission(answer)
      if (answer !== 'granted') return
    }
    await saveSettings({ notifications: enable })
  }

  return (
    <section aria-labelledby="reminders-title" className="space-y-4">
      <h2 id="reminders-title" className="text-xl font-bold">
        {t('reminders.title')}
      </h2>
      <p className="text-muted-foreground">{t('reminders.intro')}</p>
      <ExportIcsButton />
      <p className="text-sm text-muted-foreground">{t('reminders.exportHelp')}</p>

      {permission === undefined ? (
        <p>{t('reminders.unavailable')}</p>
      ) : (
        <div className="space-y-2">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={enabled}
              disabled={permission === 'denied'}
              aria-describedby="notifications-help"
              onChange={(e) => toggle(e.target.checked)}
            />
            {t('reminders.notifications')}
          </label>
          <p id="notifications-help" className="text-sm text-muted-foreground">
            {t(permission === 'denied' ? 'reminders.blocked' : 'reminders.notificationsHelp')}
          </p>
        </div>
      )}
    </section>
  )
}

/** Android only shows notifications from the service worker; without one (development), the constructor. */
function show(title: string, options: NotificationOptions) {
  navigator.serviceWorker
    ?.getRegistration()
    .then((r) => {
      if (r) return r.showNotification(title, options)
      new Notification(title, options)
    })
    .catch(() => {})
}

/**
 * Schedules today's remaining reminders in memory, only with permission. They're rescheduled when the
 * data changes (doing a habit cancels its reminder) and every hour (to roll over to the next day). Closing the
 * app cancels them.
 */
export function Notifications() {
  const { t } = useTranslation()
  const settings = useSettings()
  const enabled = !!settings?.notifications && supported() && Notification.permission === 'granted'
  const data = useLiveQuery(async () => {
    if (!enabled) return undefined
    const [habits, identities, logs] = await Promise.all([db.habits.toArray(), db.identities.toArray(), db.logs.toArray()])
    return { habits, identities, logs }
  }, [enabled])
  const [hour, setHour] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setHour((n) => n + 1), 3_600_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!enabled || !data || !settings) return
    const now = new Date()
    const timers = todayReminders({ ...data, now, settings }).map((reminder) =>
      setTimeout(
        () =>
          show(phraseTitle(reminder.phrase, t), {
            tag: reminder.habit.id,
            icon: 'pwa-192.png',
            body: reminder.anchored.length ? t('reminders.then', { list: reminder.anchored.map((p) => p.what).join(', ') }) : undefined,
          }),
        reminder.instant.getTime() - now.getTime(),
      ),
    )
    return () => timers.forEach(clearTimeout)
  }, [enabled, data, settings, hour, t])

  return null
}
