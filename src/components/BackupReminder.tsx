import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { db, useSettings } from '@/db'
import { needsBackup } from '@/domain'

/** A kind backup reminder; it doesn't show up unless it's due. */
export default function BackupReminder({ now }: { now: Date }) {
  const { t } = useTranslation()
  const settings = useSettings()
  const logs = useLiveQuery(() => db.logs.toArray())
  if (!settings || !logs || !needsBackup({ settings, logs, now })) return null

  return (
    <aside aria-label={t('backups.title')} className="space-y-3 rounded-lg border bg-accent p-4 text-accent-foreground">
      <p>{t('backups.notice')}</p>
      <Link to="/settings" className={buttonVariants({ variant: 'secondary', className: 'w-full' })}>
        {t('backups.noticeAction')}
      </Link>
    </aside>
  )
}
