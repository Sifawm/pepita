import Dexie from 'dexie'
import { CircleAlert } from 'lucide-react'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import i18n from '@/i18n'

/**
 * Last line of defence around the whole app: an error while rendering (a bug, a screen that failed to download)
 * or a database that won't open shows a way back instead of a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; storage?: boolean }> {
  state: { failed: boolean; storage?: boolean } = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidMount() {
    // No IndexedDB, or the browser refuses it (private browsing, site data turned off). It doesn't always throw while
    // rendering: with no IndexedDB at all, live queries just wait forever. Its error names vary, so the source decides.
    db.open().catch(() => this.setState({ failed: true, storage: true }))
  }

  render() {
    if (!this.state.failed) return this.props.children
    const key = this.state.storage ? 'storage' : 'crash'
    return (
      <main className="mx-auto max-w-md space-y-4 px-4 pt-[max(4rem,env(safe-area-inset-top))]">
        <div role="alert" className="space-y-2">
          <h1 className="text-2xl font-bold text-balance">{i18n.t(`failure.${key}.title`)}</h1>
          <p>{i18n.t(`failure.${key}.body`)}</p>
        </div>
        <Button
          onClick={() => {
            // Back on Today: a screen that keeps failing doesn't lock the rest of the app away.
            location.hash = '/'
            location.reload()
          }}
        >
          {i18n.t('failure.reload')}
        </Button>
      </main>
    )
  }
}

/**
 * Says so when a write fails, so a check-in never vanishes in silence. It hears the rejections nobody handled:
 * every write is awaited inside an async handler, because a bare Dexie promise left un-awaited fails without a trace.
 */
export function SaveFailure() {
  const { t } = useTranslation()
  // `n` changes on every failure: the live region speaks again even if the sentence repeats.
  const [failure, setFailure] = useState<{ text: string; n: number }>()
  useEffect(() => {
    const onRejection = ({ reason }: PromiseRejectionEvent) => {
      if (!(reason instanceof Dexie.DexieError)) return
      const full = [reason.name, reason.inner?.name].includes('QuotaExceededError')
      setFailure((f) => ({ text: t(full ? 'failure.storageFull' : 'failure.save'), n: (f?.n ?? 0) + 1 }))
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [t])
  // Escape removes it without moving focus, in case it covers what has focus (WCAG 2.4.11).
  useEffect(() => {
    if (!failure) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFailure(undefined)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [failure])

  return (
    // Stays until closed: a failure that fades on its own can be missed. Above Today's floating stack, by the thumb.
    <div role="alert" className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md print:hidden">
      {failure && (
        <div
          key={failure.n}
          className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 pl-4 text-card-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
        >
          <CircleAlert aria-hidden className="size-5 shrink-0 text-destructive" />
          <p className="min-w-0 flex-[1_1_10rem] font-semibold">{failure.text}</p>
          <Button variant="secondary" onClick={() => setFailure(undefined)}>
            {t('failure.close')}
          </Button>
        </div>
      )}
    </div>
  )
}
