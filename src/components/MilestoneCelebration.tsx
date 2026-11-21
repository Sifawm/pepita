import { PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { celebrateMilestones } from '@/db'
import type { Identity, IdentitySummary } from '@/domain'
import { identityName } from '@/lib/utils'

/**
 * Special celebration of a milestone. Shows one identity's at a time and, when shown, stores them
 * as celebrated (so they never come back). If several were passed at once (an imported
 * backup, edits), it only celebrates the largest. Another identity's wait until this one is closed.
 */
export function MilestoneCelebration({ summaries }: { summaries: IdentitySummary[] }) {
  const { t } = useTranslation()
  const pending = summaries.find((s) => s.toCelebrate.length)
  const [milestone, setMilestone] = useState<{ identity: Identity; thresholds: number[] }>()
  // State adjustment during render: once the screen is free, the next milestone gets shown.
  // Without waiting for the previous one to close, storing it made another identity's pop up on top.
  if (pending && !milestone) setMilestone({ identity: pending.identity, thresholds: pending.toCelebrate })

  useEffect(() => {
    if (milestone) void celebrateMilestones(milestone.identity.id, milestone.thresholds)
  }, [milestone])

  // Escape closes it without moving focus: that way it never covers what has focus (WCAG 2.4.11).
  useEffect(() => {
    if (!milestone) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMilestone(undefined)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [milestone])

  return (
    // Live region always mounted, so the screen reader announces the milestone. Positioned by Today's floating stack.
    // Shrinks to the room the stack leaves beside the toast: with large text it scrolls inside, so "Close" stays reachable.
    <div role="status" className="flex min-h-0 flex-col">
      {milestone && (
        <div className="pointer-events-auto min-h-0 space-y-3 overflow-y-auto overscroll-contain rounded-xl border-2 border-primary bg-card p-5 text-card-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-500">
          <div className="flex items-start gap-3">
            <PartyPopper aria-hidden className="size-8 shrink-0 text-primary motion-safe:animate-in motion-safe:spin-in-45 motion-safe:duration-700" />
            <div>
              <p className="text-xl font-bold">{t('milestones.celebration', { count: milestone.thresholds.at(-1) })}</p>
              <p>{t('milestones.celebrationIdentity', { identity: identityName(milestone.identity, t) })}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link to={`/identities/${milestone.identity.id}`} className={buttonVariants({ variant: 'secondary' })}>
              {t('milestones.viewCurve')}
            </Link>
            <Button onClick={() => setMilestone(undefined)}>{t('milestones.close')}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
