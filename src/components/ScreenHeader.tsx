import { ChevronLeft } from 'lucide-react'
import { createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, matchPath, useLocation } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'

/** The header's slot: every screen puts its title (its h1) and "back" there. */
// eslint-disable-next-line react-refresh/only-export-components -- the slot and its only consumer belong together
export const HeaderSlot = createContext<HTMLElement | null>(null)

/** Where "back" goes by route, like in any mobile app. With no destination, the screen is a root. */
function useRouteBack(): { to: string; label: string } | undefined {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  if (pathname === '/' || pathname === '/onboarding') return undefined
  const edit = matchPath('/habit/:id/edit', pathname)
  if (edit) return { to: `/habit/${edit.params.id}`, label: t('wizard.back') }
  const destination = matchPath('/identities/:id', pathname) ? ['/identities', t('identities.title')] : ['/', t('today.title')]
  return { to: destination[0], label: t('app.backTo', { destination: destination[1] }) }
}

const backClass = '-ml-3 min-w-11 px-0 text-primary'

/** Puts the screen's title and its "back" in the header. `onBack` (a screen's own steps) wins over the route's. Without a slot, renders nothing. */
export function ScreenHeader({ title, id, onBack }: { title: string; id?: string; onBack?: () => void }) {
  const { t } = useTranslation()
  const slot = useContext(HeaderSlot)
  const routeBack = useRouteBack()
  if (!slot) return null
  return createPortal(
    <>
      {onBack ? (
        <Button type="button" variant="ghost" aria-label={t('wizard.back')} onClick={onBack} className={backClass}>
          <ChevronLeft aria-hidden className="size-6" />
        </Button>
      ) : (
        routeBack && (
          <Link to={routeBack.to} aria-label={routeBack.label} className={buttonVariants({ variant: 'ghost', className: backClass })}>
            <ChevronLeft aria-hidden className="size-6" />
          </Link>
        )
      )}
      <h1 id={id} tabIndex={id ? -1 : undefined} className="min-w-0 text-2xl font-bold break-words outline-none">
        {title}
      </h1>
    </>,
    slot,
  )
}
