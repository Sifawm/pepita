import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { GlobalPause } from '@/components/Pauses'
import { RemindersSection } from '@/components/Reminders'
import BackupSection from '@/components/BackupSection'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveSettings, useSettings } from '@/db'
import { LanguagePicker } from '@/screens/Onboarding'
import { ScreenHeader } from '@/components/ScreenHeader'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const settings = useSettings()
  if (!settings) return null

  return (
    <div className="space-y-6">
      <ScreenHeader title={t('settings.title')} />
      <div className="space-y-2">
        <Label htmlFor="day-cutoff">{t('settings.dayCutoff')}</Label>
        <Input
          id="day-cutoff"
          type="time"
          className="w-36"
          value={settings.dayCutoff}
          aria-describedby="day-cutoff-help"
          // Empty while half-typed: only a complete time is saved.
          onChange={(e) => e.target.value && saveSettings({ dayCutoff: e.target.value })}
        />
        <p id="day-cutoff-help" className="text-sm text-muted-foreground">
          {t('settings.dayCutoffHelp', { time: settings.dayCutoff })}
        </p>
      </div>
      <section aria-labelledby="language-title" className="space-y-3">
        <h2 id="language-title" className="text-xl font-bold">
          {t('settings.language')}
        </h2>
        <LanguagePicker legend={t('settings.language')} />
      </section>
      <GlobalPause />
      <RemindersSection />
      <BackupSection />
      <section aria-labelledby="onboarding" className="space-y-3">
        <h2 id="onboarding" className="text-xl font-bold">
          {t('onboarding.title')}
        </h2>
        <p className="text-muted-foreground">{t('onboarding.repeatHelp')}</p>
        <Link to="/onboarding" className={buttonVariants({ variant: 'secondary', className: 'w-full' })}>
          {t('onboarding.repeat')}
        </Link>
      </section>
    </div>
  )
}
