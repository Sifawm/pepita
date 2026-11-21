import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDay } from '@/lib/utils'

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

/**
 * Replaces the browser's validation bubble (gone in seconds, not in Pepita's voice) with a sentence tied to the field.
 * Spread `form` on the <form> and put `message` where the sentence should read. The constraints stay native
 * (`required`, `min`, `max`); only the way they are reported changes.
 */
export function useFormError() {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [error, setError] = useState('')
  const field = useRef<Field>(null)
  const n = (value: string) => Number(value).toLocaleString(i18n.language)

  const text = ({ validity: v, type, min, max }: Field & { min?: string; max?: string }) =>
    v.valueMissing
      ? // The only required checkboxes are the weekday chips.
        t(type === 'checkbox' ? 'validation.pickDay' : 'validation.required')
      : v.rangeUnderflow
        ? type === 'date'
          ? t('validation.minDate', { date: formatDay(min!, i18n.language) })
          : t('validation.min', { min: n(min!) })
        : v.rangeOverflow
          ? t('validation.max', { max: n(max!) })
          : v.stepMismatch
            ? t('validation.whole')
            : t('validation.number')

  const clear = () => {
    const el = field.current
    if (!el) return
    el.removeAttribute('aria-invalid')
    const rest = el.getAttribute('aria-describedby')?.split(' ').filter((x) => x !== id).join(' ')
    if (rest) el.setAttribute('aria-describedby', rest)
    else el.removeAttribute('aria-describedby')
    field.current = null
    setError('')
  }

  const form = {
    onInvalid: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const target = e.target as Field
      // One sentence at a time: the first invalid field in the form speaks, the rest wait for the next try.
      if (target !== e.currentTarget.querySelector('input:invalid, select:invalid, textarea:invalid')) return
      clear()
      field.current = target
      target.setAttribute('aria-invalid', 'true')
      target.setAttribute('aria-describedby', [target.getAttribute('aria-describedby'), id].filter(Boolean).join(' '))
      setError(text(target))
      target.focus()
    },
    // Any edit takes the sentence away; the next submit says it again if it still applies.
    onChange: () => error && clear(),
  }

  const message = (
    <p id={id} role="alert" className="text-sm font-semibold text-destructive empty:hidden">
      {error}
    </p>
  )

  // `clear` for when the fields change under the form (another wizard step).
  return { form, message, clear }
}
