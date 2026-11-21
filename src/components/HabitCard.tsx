import { CalendarDays, Check, Circle, Ellipsis } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from 'react-router'
import { AddValueForm } from '@/components/QuantitativeInputs'
import { SkipAndPause } from '@/components/Pauses'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { withId, db } from '@/db'
import { annotate, relapse, addValue, tap, type Settings, type Log, type TodayCard } from '@/domain'
import { cn, formatDay, identityName, quantitativeProgress, phraseText } from '@/lib/utils'

/** Calibration: how long to hold for the full version. Tune it with real use. */
const LONG_PRESS_MS = 500
/** The hold ring waits this long before drawing, so an ordinary tap never flashes it. */
const HOLD_RING_DELAY_MS = 120
/** The gesture hint shows until the person has checked in on this many different days. */
const HINT_DAYS = 7

/** The streak as a quiet caption: nothing at 0, no "best" while it is the best. */
const streakText = ({ current, best }: TodayCard['streak'], t: TFunction) =>
  current === 0 ? null : current === best ? t('recovery.streakOnly', { current }) : t('recovery.streak', { current, best })

export type Panel = 'menu' | 'note' | 'relapse'

interface CardProps {
  card: TodayCard
  logs: Log[]
  settings: Settings
  panel?: Panel
  open: (panel?: Panel) => void
  celebrate: () => void
}

export function HabitCard(props: CardProps) {
  return props.card.habit.type === 'avoid' ? <AvoidCard {...props} /> : <YesNoCard {...props} />
}

/** Yes/no (tap = minimum, long press = full) and quantitative (a field to add values). */
function YesNoCard({ card, logs, settings, panel, open, celebrate }: CardProps) {
  const { t, i18n } = useTranslation()
  const { habit, identity, done, period, pause, recovering, streak } = card
  const last = card.logs.at(-1)
  const f = habit.frequency
  const q = habit.quantitative
  // "2 of 3 this week": only when the period spans more than a day or more than once. A quantitative habit, always.
  const counter = q
    ? quantitativeProgress(habit, period, t, i18n.language)
    : f.type === 'times_per_period' && (f.period !== 'day' || f.times > 1)
      ? t(`frequency.progress_${f.period}`, { progress: period.progress, required: period.required })
      : null
  const menuId = `menu-${habit.id}`
  const menuButton = useRef<HTMLButtonElement>(null)
  const [notice, setNotice] = useState('')
  const status = done
    ? q
      ? t(period.status === 'done_full' ? 'quantitative.status.full' : 'quantitative.status.minimum')
      : t(last?.type === 'full' ? 'today.doneFull' : 'today.doneMinimum')
    : pause
      ? t('pauses.pausedUntil', { date: formatDay(pause.end, i18n.language) })
      : period.status === 'skipped'
        ? t('pauses.skipped')
        : !q
          ? // ponytail: a Set over every log on each render; memoize in Today if lists get long.
            new Set(logs.map((l) => l.day)).size >= HINT_DAYS
            ? null
            : t('today.pending')
          : q.mode === 'at_least'
            ? t('quantitative.status.pending')
            : t(period.progress <= q.target ? 'quantitative.status.within' : 'quantitative.status.over')

  const onAdd = async (value: number) => {
    open()
    const { log, vote } = addValue({ habit, logs, value, now: new Date(), settings })
    await db.logs.add(withId<Log>(log))
    if (vote) celebrate()
  }

  // A removed check-in can be put back: a tap on a done card undoes it, and that is easy to do by accident.
  const [removed, setRemoved] = useState<Log>()
  const cardButton = useRef<HTMLButtonElement>(null)
  const remove = async (log?: Log) => {
    if (!log) return
    await db.logs.delete(log.id)
    setRemoved(log)
  }
  const redo = async () => {
    if (removed) await db.logs.add(removed)
    setRemoved(undefined)
    // The Redo button goes away: focus returns to the card.
    ;(cardButton.current ?? menuButton.current)?.focus()
  }

  const logVersion = async (version: 'minimum' | 'full') => {
    open()
    setRemoved(undefined)
    // The instant of the tap, not the last time the screen was painted.
    const action = tap({ habit, logs, now: new Date(), settings, version })
    if (action.type === 'undo') return remove(logs.find((l) => l.id === action.logId))
    await db.logs.add(withId<Log>(action.log))
    celebrate()
  }
  const undo = async () => {
    open()
    await remove(last)
  }

  // Long press = full version. The click that follows it doesn't count as a tap.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const longPress = useRef(false)
  // Drives the ring that draws around the circle while holding: the timer made visible.
  const [holding, setHolding] = useState(false)
  const release = () => {
    clearTimeout(timer.current)
    setHolding(false)
  }

  const closeMenu = () => {
    open()
    menuButton.current?.focus()
  }
  // The pressed button disappears with the menu: focus goes back to "More options", not to the top of the page.
  const fromMenu = (action: () => Promise<unknown>) => () => {
    menuButton.current?.focus()
    void action()
  }

  const box = cn(
    'flex min-h-16 min-w-0 flex-1 items-center gap-4 rounded-lg border bg-card p-4 text-left',
    done && 'border-primary bg-accent',
    // Recovery: thick border on top of the suggestion text (not just color).
    recovering && !done && 'border-2 border-primary',
  )
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-full border-2',
          done ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-transparent',
        )}
      >
        {done ? <Check className="size-6" /> : <Circle className="size-6" />}
        {/* Drawn over the border from 12 o'clock; it closes exactly when the full version is logged.
            Linear because it is a timer; opacity snaps on after the delay so the first arc is already visible.
            Reduced motion: the whole ring appears after the delay instead of being drawn. */}
        {!done && !q && (
          <svg viewBox="0 0 40 40" className="pointer-events-none absolute -inset-0.5 size-10 -rotate-90 text-primary">
            <circle
              cx="20"
              cy="20"
              r="19"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              pathLength={1}
              strokeDasharray={1}
              className={cn(
                'transition-[stroke-dashoffset,opacity] motion-reduce:[stroke-dashoffset:0]',
                // Durations follow transition-property: stroke-dashoffset, then opacity. With motion, the draw is the timer and
                // opacity snaps on (1ms, not 0, so the delayed switch is a real transition). Reduced: the whole ring fades in over
                // the same time instead, so it is never complete before the full version is logged.
                holding
                  ? 'ease-linear [stroke-dashoffset:0] opacity-100 motion-safe:[transition-duration:var(--ring-ms),1ms] motion-reduce:[transition-duration:1ms,var(--ring-ms)]'
                  : 'ease-out [stroke-dashoffset:1] opacity-0',
              )}
              style={
                holding
                  ? ({ '--ring-ms': `${LONG_PRESS_MS - HOLD_RING_DELAY_MS}ms`, transitionDelay: `${HOLD_RING_DELAY_MS}ms` } as CSSProperties)
                  : { transitionDuration: '150ms' }
              }
            />
          </svg>
        )}
      </span>
      {/* Struck through once done: a sense of task completed (aria-pressed and the text already state it).
          text-decoration can't animate, so the title's stroke is a background line whose width grows; clone repeats it on every wrapped line. */}
      <span className={cn('min-w-0 flex-1 transition-colors duration-300', done && 'text-muted-foreground')}>
        <span id={`name-${habit.id}`} className="block text-lg font-semibold break-words">
          <span
            className={cn(
              'box-decoration-clone bg-[linear-gradient(currentColor,currentColor)] bg-[position:0_55%] bg-no-repeat transition-[background-size] duration-300 ease-out motion-reduce:transition-none',
              done ? 'bg-[length:100%_2px]' : 'bg-[length:0%_2px]',
            )}
          >
            {habit.name}
          </span>
        </span>
        <span id={`details-${habit.id}`}>
          {recovering && !done && <span className="block text-sm font-semibold text-primary">{t('recovery.suggestion')}</span>}
          {/* The intention phrase already ends with the minimum version: never both. */}
          {card.phrase ? (
            <span className="block break-words first-letter:uppercase">{phraseText(card.phrase, t)}</span>
          ) : (
            !q && habit.minimumVersion && <span className="block break-words">{t('today.minimum', { text: habit.minimumVersion })}</span>
          )}
          {habit.environment && (
            <span className="block text-sm break-words text-muted-foreground">
              <span className="font-semibold">{t('intention.environment')}</span> {habit.environment.join(' · ')}
            </span>
          )}
          {habit.pairedReward && (
            <span className="block text-sm break-words text-muted-foreground">
              <span className="font-semibold">{t('intention.reward')}</span> {habit.pairedReward}
            </span>
          )}
          <span className="block text-sm text-muted-foreground">{[identityName(identity, t), counter, status].filter(Boolean).join(' · ')}</span>
          {streakText(streak, t) && <span className="block text-xs text-muted-foreground">{streakText(streak, t)}</span>}
        </span>
      </span>
    </>
  )

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* A quantitative habit isn't checked with a tap: values are added in the field below. */}
        {q ? (
          <div className={box}>{content}</div>
        ) : (
          <button
            ref={cardButton}
            type="button"
            aria-pressed={done}
            // Named by the habit alone; the rest is its description, not a seven-phrase name.
            aria-labelledby={`name-${habit.id}`}
            aria-describedby={`details-${habit.id}`}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              longPress.current = false
              // On a done card a hold undoes like a tap does: no ring promising the full version.
              setHolding(!done)
              timer.current = setTimeout(() => {
                longPress.current = true
                // The ring stays closed: the done state replaces it (no unwinding before the check-in paints).
                void logVersion('full')
              }, LONG_PRESS_MS)
            }}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            // No system menu when holding down on mobile.
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (longPress.current) longPress.current = false
              else void logVersion('minimum')
            }}
            className={cn(
              box,
              'touch-manipulation select-none transition-colors outline-none [-webkit-touch-callout:none]',
              'focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              !done && 'hover:bg-muted',
            )}
          >
            {content}
          </button>
        )}
        {/* Stacked: at 375px the card keeps its width for the text. */}
        <div className="flex flex-col gap-2">
          <Link
            to={`/habit/${habit.id}`}
            aria-label={t('habit.open', { name: habit.name })}
            className={buttonVariants({ variant: 'ghost', className: 'size-11 border px-0' })}
          >
            <CalendarDays aria-hidden />
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-label={t('today.options', { name: habit.name })}
            aria-expanded={panel === 'menu'}
            aria-controls={menuId}
            onClick={() => {
              setNotice('')
              open(panel === 'menu' ? undefined : 'menu')
            }}
            className={buttonVariants({ variant: 'ghost', className: 'size-11 border px-0' })}
          >
            <Ellipsis aria-hidden />
          </button>
        </div>
      </div>

      {q && <AddValueForm unit={q.unit} name={habit.name} onAdd={onAdd} />}

      {panel === 'menu' && (
        // Accessible alternative to the long press: every action as a button.
        <div
          id={menuId}
          role="group"
          aria-label={t('today.options', { name: habit.name })}
          onKeyDown={(e) => e.key === 'Escape' && closeMenu()}
          className="flex flex-col gap-2 rounded-lg border bg-card p-2"
        >
          {!q && !done && (
            <>
              <Button variant="ghost" className="justify-start" autoFocus onClick={fromMenu(() => logVersion('minimum'))}>
                {t('today.logMinimum')}
              </Button>
              <Button variant="ghost" className="justify-start" onClick={fromMenu(() => logVersion('full'))}>
                {t('today.logFull')}
              </Button>
            </>
          )}
          {last && (
            <>
              <Button variant="ghost" className="justify-start" autoFocus={done || !!q} onClick={() => open('note')}>
                {t(last.note ? 'today.editNote' : 'today.addNote')}
              </Button>
              <Button variant="ghost" className="justify-start" onClick={fromMenu(undo)}>
                {t('today.undo')}
              </Button>
            </>
          )}
          <Link to={`/habit/${habit.id}/edit`} className={buttonVariants({ variant: 'ghost', className: 'justify-start' })}>
            {t('wizard.edit')}
          </Link>
          <SkipAndPause
            card={card}
            settings={settings}
            onDone={(text) => {
              setNotice(text)
              closeMenu()
            }}
          />
        </div>
      )}
      <div className="flex items-center gap-1">
        <p role="status" className={cn('text-sm font-semibold', notice ? 'text-primary' : 'text-muted-foreground')}>
          {notice || (removed && t('today.removed'))}
        </p>
        {removed && !notice && (
          <Button variant="ghost" className="px-3 text-sm text-primary" onClick={redo}>
            {t('today.redo')}
          </Button>
        )}
      </div>

      {panel === 'note' && last && <NoteEditor log={last} onClose={closeMenu} />}
    </div>
  )
}

/**
 * Habit to avoid: there's nothing to check; the clean day adds its vote only when it closes.
 * "I slipped" opens a form with the optional trigger.
 */
function AvoidCard({ card, settings, panel, open }: CardProps) {
  const { t, i18n } = useTranslation()
  const { habit, identity, period, pause, relapses, streak } = card
  const laws = habit.inverseLaws ?? {}
  const menuId = `menu-${habit.id}`
  const menuButton = useRef<HTMLButtonElement>(null)
  const relapseButton = useRef<HTMLButtonElement>(null)
  const [notice, setNotice] = useState('')
  const relapsed = relapses.length > 0
  const status = relapsed
    ? t('avoid.relapsed')
    : pause
      ? t('pauses.pausedUntil', { date: formatDay(pause.end, i18n.language) })
      : period.status === 'skipped'
        ? t('pauses.skipped')
        : t('avoid.clean')

  const close = (focusTarget: HTMLButtonElement | null, text = '') => {
    open()
    setNotice(text)
    focusTarget?.focus()
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className={cn('min-w-0 flex-1 space-y-3 rounded-lg border bg-card p-4', relapsed && 'border-dashed')}>
          <div>
            <span id={`name-${habit.id}`} className="block text-lg font-semibold break-words">
              {habit.name}
            </span>
            {(['substitute', 'cue', 'friction'] as const).map(
              (law) =>
                laws[law] && (
                  <span key={law} className="block break-words">
                    {t(`avoid.${law}`, { text: laws[law] })}
                  </span>
                ),
            )}
            <span className="block text-sm text-muted-foreground">
              {identityName(identity, t)} · {status}
            </span>
            {streakText(streak, t) && <span className="block text-xs text-muted-foreground">{streakText(streak, t)}</span>}
          </div>
          <Button
            ref={relapseButton}
            variant="secondary"
            className="w-full"
            aria-expanded={panel === 'relapse'}
            aria-describedby={`name-${habit.id}`}
            onClick={() => {
              setNotice('')
              open(panel === 'relapse' ? undefined : 'relapse')
            }}
          >
            {t('avoid.iRelapsed')}
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to={`/habit/${habit.id}`}
            aria-label={t('habit.open', { name: habit.name })}
            className={buttonVariants({ variant: 'ghost', className: 'size-11 border px-0' })}
          >
            <CalendarDays aria-hidden />
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-label={t('today.options', { name: habit.name })}
            aria-expanded={panel === 'menu'}
            aria-controls={menuId}
            onClick={() => {
              setNotice('')
              open(panel === 'menu' ? undefined : 'menu')
            }}
            className={buttonVariants({ variant: 'ghost', className: 'size-11 border px-0' })}
          >
            <Ellipsis aria-hidden />
          </button>
        </div>
      </div>

      {panel === 'relapse' && (
        <RelapseForm
          habitId={habit.id}
          onRecord={async (trigger) => {
            await db.logs.add(withId<Log>(relapse({ habit, trigger, now: new Date(), settings })))
            close(relapseButton.current, t('avoid.recorded'))
          }}
          onClose={() => close(relapseButton.current)}
        />
      )}

      {panel === 'menu' && (
        <div
          id={menuId}
          role="group"
          aria-label={t('today.options', { name: habit.name })}
          onKeyDown={(e) => e.key === 'Escape' && close(menuButton.current)}
          className="flex flex-col gap-2 rounded-lg border bg-card p-2"
        >
          {relapsed && (
            <Button
              variant="ghost"
              className="justify-start"
              autoFocus
              onClick={async () => {
                await db.logs.delete(relapses[relapses.length - 1].id)
                close(menuButton.current, t('avoid.undone'))
              }}
            >
              {t('avoid.undo')}
            </Button>
          )}
          <Link to={`/habit/${habit.id}/edit`} className={buttonVariants({ variant: 'ghost', className: 'justify-start' })}>
            {t('wizard.edit')}
          </Link>
          <SkipAndPause card={card} settings={settings} onDone={(text) => close(menuButton.current, text)} />
        </div>
      )}
      <p role="status" className="text-sm font-semibold text-primary">
        {notice}
      </p>
    </div>
  )
}

function RelapseForm({ habitId, onRecord, onClose }: { habitId: string; onRecord: (trigger: string) => Promise<void>; onClose: () => void }) {
  const { t } = useTranslation()
  const [trigger, setTrigger] = useState('')
  const id = `trigger-${habitId}`
  return (
    <form
      className="space-y-2 rounded-lg border bg-card p-3"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onSubmit={(e) => {
        e.preventDefault()
        void onRecord(trigger)
      }}
    >
      <p className="text-sm">{t('avoid.help')}</p>
      <Label htmlFor={id}>{t('avoid.trigger')}</Label>
      <Input id={id} autoFocus value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder={t('avoid.triggerExample')} autoComplete="off" />
      <div className="flex gap-2">
        <Button type="submit">{t('avoid.record')}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('habit.cancel')}
        </Button>
      </div>
    </form>
  )
}

/** A log's optional note (today's on the card; any day's in the calendar). */
export function NoteEditor({ log, onClose }: { log: Log; onClose: () => void }) {
  const { t } = useTranslation()
  const [text, setText] = useState(log.note ?? '')
  const id = `note-${log.id}`
  return (
    <form
      className="space-y-2 rounded-lg border bg-card p-3"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onSubmit={async (e) => {
        e.preventDefault()
        await db.logs.put(annotate(log, text))
        onClose()
      }}
    >
      <Label htmlFor={id}>{t('today.note')}</Label>
      <textarea
        id={id}
        autoFocus
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('today.noteExample')}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <Button type="submit">{t('today.saveNote')}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('habit.cancel')}
        </Button>
      </div>
    </form>
  )
}

/** "+1 vote · identity". Goes away on its own unless it has focus; the note stays at hand in the menu. */
export function Celebration({
  text,
  animationKey,
  onAddNote,
  onClose,
}: {
  text?: string
  /** Changes on every log: the animation restarts even if the text repeats. */
  animationKey: number
  onAddNote: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    if (!text || pinned) return
    const id = setTimeout(onClose, 5000)
    return () => clearTimeout(id)
  }, [text, animationKey, pinned, onClose])
  // Escape removes it without moving focus, in case it covers what has focus (WCAG 2.4.11).
  useEffect(() => {
    if (!text) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [text, onClose])

  return (
    // The live region always exists so the screen reader announces every celebration.
    <div role="status" className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 mx-auto max-w-md">
      {text && (
        <div
          key={animationKey}
          onFocus={() => setPinned(true)}
          onBlur={() => setPinned(false)}
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg bg-primary p-3 pl-4 text-primary-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:slide-in-from-bottom-4"
        >
          <span className="text-lg font-bold">{text}</span>
          <Button variant="secondary" onClick={onAddNote}>
            {t('today.addNote')}
          </Button>
        </div>
      )}
    </div>
  )
}
