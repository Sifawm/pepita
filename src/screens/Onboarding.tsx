import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Share, Sparkles, SquarePlus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { withId, db, saveSettings, useSettings } from '@/db'
import { newIdentity, newHabit, nextOrder, tap, type LanguageCode, type Habit, type Identity, type Log } from '@/domain'
import { isIos, isInstalled, install, useInstallPrompt, usePersistentStorage } from '@/lib/install'
import { cn } from '@/lib/utils'
import { Wizard } from '@/screens/HabitWizard'

/** Languages are named in their own language. */
const LANGUAGE_NAMES: Record<LanguageCode, string> = { es: 'Español', en: 'English' }

type Stage = 'language' | 'identity' | 'habit' | 'log' | 'install'

/**
 * Onboarding: language → identity → a habit → log it today → install and protect the data.
 * Today brings people here when there's no data (`needsOnboarding`); Settings lets them repeat it.
 * Nothing is saved until the habit is created (except the chosen language): if abandoned earlier, it shows up again.
 */
export default function OnboardingScreen() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useSettings()
  const data = useLiveQuery(async () => {
    const [identities, habits] = await Promise.all([db.identities.orderBy('order').toArray(), db.habits.orderBy('order').toArray()])
    return { identities, habits }
  })
  const [stage, setStage] = useState<Stage>('language')
  const [identity, setIdentity] = useState('')
  const [habit, setHabit] = useState<Habit>()
  const [voted, setVoted] = useState(false)

  if (!data || !settings) return null
  const general = data.identities.find((i) => i.isGeneral)!

  if (stage === 'habit')
    return (
      <Wizard
        initial={{ name: '', identityId: general.id, type: 'yes_no', frequency: { type: 'times_per_period', times: 1, period: 'day' } }}
        identities={data.identities}
        habits={data.habits}
        // The minimum for the first vote: what, minimum version, when and where. The rest, whenever they like.
        steps={['name', 'versions', 'intention']}
        title={t('onboarding.habit')}
        onBack={() => setStage('identity')}
        onSave={async (draft) => {
          await db.transaction('rw', db.identities, db.habits, async () => {
            const fresh = newIdentity(identity, await db.identities.toArray())
            const own = fresh.name ? withId<Identity>(fresh) : undefined
            if (own) await db.identities.add(own)
            const h = withId<Habit>(newHabit({ ...draft, identityId: own?.id ?? general.id, order: nextOrder(await db.habits.toArray()) }, new Date(), settings))
            await db.habits.add(h)
            setHabit(h)
          })
          // Moving on without touching the language accepts the suggested one: it's saved in Settings (and in the backup).
          await saveSettings({ language: i18n.resolvedLanguage as LanguageCode })
        }}
        onFinish={() => setStage('log')}
      />
    )

  const logFirst = async () => {
    if (!habit) return
    const action = tap({ habit, logs: [], now: new Date(), settings })
    if (action.type === 'log') await db.logs.add(withId<Log>(action.log))
    setVoted(true)
    setStage('install')
  }

  switch (stage) {
    case 'language':
      return (
        <OnboardingStep
          key="language"
          title={t('onboarding.language.title')}
          help={t('onboarding.language.help')}
          onNext={() => setStage('identity')}
          extra={
            <Link to="/settings" className={buttonVariants({ variant: 'ghost' })}>
              {t('onboarding.language.backup')}
            </Link>
          }
        >
          <LanguagePicker />
        </OnboardingStep>
      )
    case 'identity':
      return (
        <OnboardingStep
          key="identity"
          title={t('onboarding.identity.title')}
          help={t('onboarding.identity.help')}
          onNext={() => setStage('habit')}
          onNotNow={() => {
            setIdentity('')
            setStage('habit')
          }}
          onBack={() => setStage('language')}
        >
          <Input aria-labelledby="stage-title" value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder={t('identities.example')} autoComplete="off" />
        </OnboardingStep>
      )
    case 'log':
      return (
        <OnboardingStep key="log" title={t('onboarding.log.title')} help={t('onboarding.log.help')} onNotNow={() => setStage('install')}>
          {/* The same gesture as on Today: tapping logs the minimum version. */}
          <Button type="button" className="h-auto min-h-16 w-full text-lg whitespace-normal" onClick={logFirst}>
            {t('today.minimum', { text: habit?.minimumVersion || habit?.name })}
          </Button>
        </OnboardingStep>
      )
    case 'install':
      return (
        <OnboardingStep key="install" title={t('onboarding.install.title')} help={t('onboarding.install.help')} onNext={() => navigate('/')} nextLabel={t('onboarding.start')}>
          {voted && (
            <p className="rounded-lg bg-primary p-3 text-lg font-bold text-primary-foreground">
              {t('today.celebration', { identity: identity.trim() || t('identity.general') })}
            </p>
          )}
          <InstallGuide />
        </OnboardingStep>
      )
  }
}

/** One onboarding step: focused title, Pepita's tip, content and buttons. */
function OnboardingStep({
  title,
  help,
  children,
  onNext,
  nextLabel,
  onNotNow,
  onBack,
  extra,
}: {
  title: string
  help: string
  children: ReactNode
  onNext?: () => void
  nextLabel?: string
  onNotNow?: () => void
  onBack?: () => void
  extra?: ReactNode
}) {
  const { t } = useTranslation()
  // Each step mounts anew (`key`): focus goes to its title so the screen reader announces it.
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onNext?.()
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <ScreenHeader title={t('onboarding.title')} onBack={onBack} />
      <header className="space-y-3">
        <h2 id="stage-title" ref={ref} tabIndex={-1} className="text-2xl font-bold outline-none">
          {title}
        </h2>
        <p className="flex gap-2 rounded-lg bg-accent p-3 text-accent-foreground">
          <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            <span className="sr-only">{t('wizard.pepita')} </span>
            {help}
          </span>
        </p>
      </header>
      <section className="space-y-4">{children}</section>
      <div className="flex flex-col gap-3">
        {onNext && <Button type="submit">{nextLabel ?? t('wizard.next')}</Button>}
        {onNotNow && (
          <Button type="button" variant="secondary" onClick={onNotNow}>
            {t('wizard.notNow')}
          </Button>
        )}
        {extra}
      </div>
    </form>
  )
}

/**
 * Choose the language: suggests the browser's (i18next detects it) and, on choosing, switches the whole app and
 * saves it in Settings. Also in Settings: it can be changed at any time.
 */
export function LanguagePicker({ legend }: { legend?: string }) {
  const { t, i18n } = useTranslation()
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{legend ?? t('onboarding.language.title')}</legend>
      {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
        <label
          key={code}
          lang={code}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 text-lg font-semibold has-[:checked]:border-primary has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring"
        >
          <input
            type="radio"
            name="language"
            value={code}
            checked={i18n.resolvedLanguage === code}
            onChange={() => (void i18n.changeLanguage(code), void saveSettings({ language: code as LanguageCode }))}
            className="size-5 accent-primary outline-none"
          />
          {name}
        </label>
      ))}
    </fieldset>
  )
}

/** Install: a manual guide on iPhone/iPad, the native prompt where it exists; and the storage status. */
function InstallGuide() {
  const { t } = useTranslation()
  const prompt = useInstallPrompt()
  const persistent = usePersistentStorage()
  const iosStep = 'flex items-start gap-3'
  return (
    <>
      {isInstalled() ? (
        <p>{t('onboarding.install.alreadyInstalled')}</p>
      ) : isIos() ? (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">{t('onboarding.install.ios.title')}</h2>
          <ol className="space-y-3">
            <li className={iosStep}>
              <Share aria-hidden className="size-6 shrink-0 text-primary" />
              <span>{t('onboarding.install.ios.share')}</span>
            </li>
            <li className={iosStep}>
              <SquarePlus aria-hidden className="size-6 shrink-0 text-primary" />
              <span>{t('onboarding.install.ios.add')}</span>
            </li>
            <li className={iosStep}>
              <Sparkles aria-hidden className="size-6 shrink-0 text-primary" />
              <span>{t('onboarding.install.ios.open')}</span>
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">{t('onboarding.install.ios.why')}</p>
        </div>
      ) : prompt ? (
        <Button type="button" variant="secondary" className="w-full" onClick={install}>
          <Download aria-hidden />
          {t('onboarding.install.button')}
        </Button>
      ) : (
        <p>{t('onboarding.install.menu')}</p>
      )}
      {persistent !== undefined && (
        <p className={cn(!persistent && 'text-muted-foreground')}>
          {t(persistent === null ? 'backups.persistentUnavailable' : persistent ? 'backups.persistentYes' : 'backups.persistentNo')}
        </p>
      )}
    </>
  )
}
