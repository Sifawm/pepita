import { clsx, type ClassValue } from 'clsx'
import type { TFunction } from 'i18next'
import { twMerge } from 'tailwind-merge'
import { periodUnit, type Day, type IntentionPhrase, type Habit, type Identity, type Period } from '@/domain'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "General" is shown translated until someone gives it a name of their own. */
export const identityName = (identity: Identity, t: TFunction) => identity.name || t('identity.general')

/** A logical day (`YYYY-MM-DD`) as text in the language: "March 15". */
export const formatDay = (day: Day, language: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(language, options)
}

/** "12 of 20 pages today" / "1 coffee today (at most 2)": a quantitative habit's progress in its period. */
export const quantitativeProgress = ({ quantitative: q, frequency: f }: Habit, period: Period, t: TFunction, language: string) => {
  if (!q) return ''
  const n = (x: number) => x.toLocaleString(language)
  return t(`quantitative.progress.${q.mode}`, {
    progress: n(period.progress),
    target: n(q.target),
    unit: q.unit,
    period: t(`quantitative.period.${periodUnit(f)}`),
  })
}

/**
 * The intention phrase in the language: "after pouring my coffee, in the kitchen: read 1 page".
 * Starts in lowercase: show it with `first-letter:uppercase` on a block element.
 */
export function phraseText({ when, where, what }: IntentionPhrase, t: TFunction) {
  const start =
    when &&
    ('time' in when
      ? t('intention.time', { time: when.time })
      : 'after' in when
        ? t('intention.after', { name: when.after })
        : t('intention.afterAction', { text: when.afterAction }))
  return t('intention.phrase', { context: [start, where].filter(Boolean).join(', '), what })
}

/**
 * Moves focus to an element once it's on screen. For when the pressed button disappears
 * (undo, archive, closing a form): without this, focus falls to the top of the page.
 * The target may only appear when a database query renders again, which can take several frames
 * on a slow phone: it keeps looking for about half a second.
 */
export function focusById(id: string, frames = 30) {
  requestAnimationFrame(() => {
    const target = document.getElementById(id)
    if (target) target.focus()
    else if (frames > 1) focusById(id, frames - 1)
  })
}

/** Downloads a file generated in the browser. */
export function download(name: string, parts: BlobPart[], type: string) {
  const url = URL.createObjectURL(new Blob(parts, { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  // Safari needs the URL alive for a while after the click.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** The phrase as a standalone title (notification, calendar): with an initial capital. */
export const phraseTitle = (phrase: IntentionPhrase, t: TFunction) => {
  const text = phraseText(phrase, t)
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}
