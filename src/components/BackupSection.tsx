import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { saveSettings, readAllData, replaceAllData, useSettings } from '@/db'
import { logicalDay, exportBackup, importBackup, backupStamp, logsCsv, type AppData, type ImportError } from '@/domain'
import { usePersistentStorage } from '@/lib/install'
import { download } from '@/lib/utils'

/** Local `YYYY-MM-DD` for the file name. */
const localToday = (now: Date) => logicalDay(now, '00:00')

export default function BackupSection() {
  const { t, i18n } = useTranslation()
  const settings = useSettings()
  const persistent = usePersistentStorage()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<ImportError>()
  const [pending, setPending] = useState<AppData>()
  const [notice, setNotice] = useState('')

  const exportJson = async () => {
    const now = new Date()
    download(`pepita-${localToday(now)}.json`, [exportBackup(await readAllData(), now)], 'application/json')
    // The same stamp the file carries.
    await saveSettings(backupStamp(now))
    setNotice(t('backups.exported'))
  }

  const exportCsv = async () => {
    // The BOM makes spreadsheets read accented characters correctly.
    download(`pepita-logs-${localToday(new Date())}.csv`, ['﻿', logsCsv(await readAllData())], 'text/csv;charset=utf-8')
  }

  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so the same file can be chosen again
    if (!file) return
    setNotice('')
    const result = importBackup(await file.text())
    setError(result.ok ? undefined : result.error)
    setPending(result.ok ? result.data : undefined)
  }

  const replace = async () => {
    if (!pending) return
    await replaceAllData(pending)
    setPending(undefined)
    setNotice(t('backups.imported'))
  }

  const last = settings?.lastBackup
    ? t('backups.last', {
        date: new Date(settings.lastBackup).toLocaleString(i18n.language, { dateStyle: 'long', timeStyle: 'short' }),
      })
    : t('backups.none')

  return (
    <section aria-labelledby="backups-title" className="space-y-4">
      <h2 id="backups-title" className="text-xl font-bold">
        {t('backups.title')}
      </h2>
      <p className="text-muted-foreground">{t('backups.intro')}</p>
      {settings && <p>{last}</p>}

      <div className="flex flex-col gap-3">
        <Button onClick={exportJson}>
          <Download aria-hidden />
          {t('backups.exportJson')}
        </Button>
        <Button variant="secondary" onClick={exportCsv}>
          <FileSpreadsheet aria-hidden />
          {t('backups.exportCsv')}
        </Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()} aria-describedby="import-help">
          <Upload aria-hidden />
          {t('backups.import')}
        </Button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={onFileChosen} />
        <p id="import-help" className="text-sm text-muted-foreground">
          {t('backups.importHelp')}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive p-4">
          {t(`backups.error.${error.reason}`, { path: 'path' in error ? error.path : '' })} {t('backups.unchanged')}
        </p>
      )}

      {pending && (
        <div role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-text" className="space-y-3 rounded-lg border bg-card p-4">
          <h3 id="confirm-title" className="text-lg font-bold">
            {t('backups.confirmTitle')}
          </h3>
          <p id="confirm-text">
            {t('backups.confirmText', {
              habits: t('backups.habits', { count: pending.habits.length }),
              logs: t('backups.logs', { count: pending.logs.length }),
            })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={replace}>{t('backups.confirm')}</Button>
            {/* Focus starts on the safe option. */}
            <Button variant="secondary" autoFocus onClick={() => setPending(undefined)}>
              {t('backups.cancel')}
            </Button>
          </div>
        </div>
      )}

      <p role="status" className="font-semibold text-primary">
        {notice}
      </p>

      <h2 className="pt-2 text-xl font-bold">{t('backups.storage')}</h2>
      {persistent !== undefined && <p>{t(persistent === null ? 'backups.persistentUnavailable' : persistent ? 'backups.persistentYes' : 'backups.persistentNo')}</p>}
    </section>
  )
}
