import { liveQuery } from 'dexie'
import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router'
import { Notifications } from '@/components/Reminders'
import { HeaderSlot } from '@/components/ScreenHeader'
import { buttonVariants } from '@/components/ui/button'
import { db, readSettings, reconcileStoredDiagnoses, useSettings } from '@/db'
import { nextCutoff } from '@/domain'
import ArchivedScreen from '@/screens/Archived'
import HabitDetailScreen from '@/screens/HabitDetail'
import HabitWizardScreen from '@/screens/HabitWizard'
import IdentitiesScreen from '@/screens/Identities'
import IdentityDetailScreen from '@/screens/IdentityDetail'
import OnboardingScreen from '@/screens/Onboarding'
import SettingsScreen from '@/screens/Settings'
import TodayScreen from '@/screens/Today'
import WeeklyReviewScreen from '@/screens/WeeklyReview'

/**
 * Keeps diagnoses up to date while the app is open: after every change to habits,
 * logs or settings (also when fixing the past or importing), when coming back to the app and on each
 * logical day cutoff (periods close then and streak breaks may appear).
 */
function useLiveDiagnoses() {
  useEffect(() => {
    let alive = true
    let cutoff: ReturnType<typeof setTimeout> | undefined
    const check = async () => {
      const now = new Date()
      await reconcileStoredDiagnoses(now)
      const { dayCutoff } = await readSettings()
      clearTimeout(cutoff)
      // One second of margin: right at the cutoff it's already the new day.
      if (alive) cutoff = setTimeout(check, nextCutoff(now, dayCutoff).getTime() - now.getTime() + 1000)
    }
    const changes = liveQuery(() => Promise.all([db.habits.toArray(), db.logs.toArray(), db.settings.toArray()])).subscribe(() => void check())
    const onReturn = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      alive = false
      clearTimeout(cutoff)
      changes.unsubscribe()
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [])
}

/** The language saved in Settings wins (also after importing a backup); without it, the browser's. */
function useSavedLanguage() {
  const { i18n } = useTranslation()
  const language = useSettings()?.language
  useEffect(() => {
    if (language && language !== i18n.resolvedLanguage) void i18n.changeLanguage(language)
  }, [language, i18n])
}

function Header({ onSlot }: { onSlot: (slot: HTMLElement | null) => void }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <header className="flex min-h-14 items-center justify-between gap-2 py-2 print:hidden">
      {/* Each screen fills this with `ScreenHeader`: its title and "back". */}
      <div ref={onSlot} className="flex min-w-0 items-center gap-1" />
      {pathname !== '/settings' && (
        <Link to="/settings" aria-label={t('settings.title')} className={buttonVariants({ variant: 'ghost', className: 'min-w-11 px-0' })}>
          <Settings aria-hidden />
        </Link>
      )}
    </header>
  )
}

export default function App() {
  const { t } = useTranslation()
  useLiveDiagnoses()
  useSavedLanguage()
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  return (
    <HashRouter>
      <Notifications />
      <a
        href="#main"
        onClick={(e) => {
          // With hash routing, a normal anchor would change the route.
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-card focus:p-3 print:hidden"
      >
        {t('app.skip')}
      </a>
      <HeaderSlot.Provider value={slot}>
        <div className="mx-auto max-w-md px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] print:max-w-none print:p-0">
          <Header onSlot={setSlot} />
          <main id="main" tabIndex={-1} className="outline-none">
            <Routes>
              <Route path="/" element={<TodayScreen />} />
              <Route path="/new" element={<HabitWizardScreen />} />
              <Route path="/habit/:id/edit" element={<HabitWizardScreen />} />
              <Route path="/archived" element={<ArchivedScreen />} />
              <Route path="/identities" element={<IdentitiesScreen />} />
              <Route path="/identities/:id" element={<IdentityDetailScreen />} />
              <Route path="/habit/:id" element={<HabitDetailScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/onboarding" element={<OnboardingScreen />} />
              <Route path="/review" element={<WeeklyReviewScreen />} />
            </Routes>
          </main>
        </div>
      </HeaderSlot.Provider>
    </HashRouter>
  )
}
