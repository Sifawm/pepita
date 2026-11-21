import { Plus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Quantitative } from '@/domain'

const option =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:font-bold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring'

/** Empty or non-numeric = `undefined`: the field is unwritten. */
const parseNumber = (text: string) => (text.trim() === '' || Number.isNaN(Number(text)) ? undefined : Number(text))

/** Mode, target, unit and (with "at least") minimum target. Used by the wizard's "type" step. */
export function QuantitativeFields({ value, onChange }: { value: Quantitative; onChange: (q: Quantitative) => void }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">{t('quantitative.mode')}</legend>
        {(['at_least', 'at_most'] as const).map((mode) => (
          <label key={mode} className={option}>
            <input type="radio" name={`${id}-mode`} className="size-5 accent-primary" checked={value.mode === mode} onChange={() => onChange({ ...value, mode })} />
            {t(`quantitative.modes.${mode}`)}
          </label>
        ))}
      </fieldset>
      <div className="flex gap-3">
        <div className="w-28 space-y-2">
          <Label htmlFor={`${id}-target`}>{t('quantitative.target')}</Label>
          <Input
            id={`${id}-target`}
            type="number"
            inputMode="decimal"
            min={0.01}
            step="any"
            required
            value={value.target || ''}
            onChange={(e) => onChange({ ...value, target: parseNumber(e.target.value) ?? 0 })}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={`${id}-unit`}>{t('quantitative.unit')}</Label>
          <Input
            id={`${id}-unit`}
            required
            autoComplete="off"
            placeholder={t('quantitative.unitExample')}
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value })}
          />
        </div>
      </div>
      {value.mode === 'at_least' && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-minimum`}>{t('quantitative.minTarget')}</Label>
          <p id={`${id}-minimum-help`} className="text-sm text-muted-foreground">
            {t('quantitative.minTargetHelp')}
          </p>
          <Input
            id={`${id}-minimum`}
            aria-describedby={`${id}-minimum-help`}
            type="number"
            inputMode="decimal"
            min={0.01}
            max={value.target || undefined}
            step="any"
            className="w-28"
            value={value.minTarget ?? ''}
            onChange={(e) => onChange({ ...value, minTarget: parseNumber(e.target.value) })}
          />
        </div>
      )}
    </div>
  )
}

/** Field to add an amount: on Today's card and when editing a calendar day. */
export function AddValueForm({ unit, name, onAdd }: { unit: string; name: string; onAdd: (value: number) => Promise<unknown> }) {
  const { t } = useTranslation()
  const id = useId()
  const [text, setText] = useState('')
  const { form, message } = useFormError()
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = parseNumber(text)
    if (!value || value <= 0) return
    await onAdd(value)
    setText('')
  }
  return (
    <form onSubmit={submit} {...form} className="space-y-1">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={id}>{t('quantitative.add', { unit })}</Label>
          {/* Not `required`: the field empties after every add, and a required empty field would turn red right after a vote. */}
          <Input id={id} type="number" inputMode="decimal" min={0.01} step="any" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <Button type="submit" disabled={!text} aria-label={t('quantitative.addButton', { name })}>
          <Plus aria-hidden />
          {t('quantitative.addShort')}
        </Button>
      </div>
      {message}
    </form>
  )
}
