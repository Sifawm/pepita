import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Weekday, Frequency } from '@/domain'
import { cn } from '@/lib/utils'

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7]
// January 1st 2024 was a Monday: used to ask the browser for each day's name.
const dayName = (d: Weekday, language: string, weekday: 'long' | 'short') => new Date(2024, 0, d).toLocaleDateString(language, { weekday })

const option =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:font-bold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring'

/** `periodOnly`: a quantitative habit requires its target per period, not a number of times. */
export function FrequencyPicker({
  value,
  onChange,
  periodOnly = false,
}: {
  value: Frequency
  onChange: (f: Frequency) => void
  periodOnly?: boolean
}) {
  const { t, i18n } = useTranslation()
  const times = value.type === 'times_per_period' ? value : { times: 1, period: 'day' as const }
  const days = value.type === 'weekdays' ? value.days : []

  return (
    <fieldset className="space-y-3">
      {/* The wizard already asks it in the step's title. */}
      <legend className="sr-only">{t('frequency.title')}</legend>

      <label className={option}>
        <input
          type="radio"
          name="frequency"
          className="size-5 accent-primary"
          checked={value.type === 'times_per_period'}
          onChange={() => onChange({ type: 'times_per_period', ...times })}
        />
        {t(periodOnly ? 'frequency.every_period' : 'frequency.times_per_period')}
      </label>
      {value.type === 'times_per_period' && (
        <div className="flex flex-wrap items-center gap-2 pl-8">
          {!periodOnly && (
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              step={1}
              required
              aria-label={t('frequency.times')}
              className="w-20"
              value={value.times || ''}
              onChange={(e) => onChange({ ...value, times: Math.trunc(e.target.valueAsNumber) || 0 })}
            />
          )}
          <Select
            aria-label={t('frequency.period')}
            className="w-auto"
            value={value.period}
            onChange={(e) => onChange({ ...value, period: e.target.value as typeof value.period })}
          >
            {(['day', 'week', 'month'] as const).map((p) => (
              <option key={p} value={p}>
                {periodOnly ? t(`frequency.every_${p}`) : t(`frequency.per_${p}`, { count: value.times })}
              </option>
            ))}
          </Select>
        </div>
      )}

      <label className={option}>
        <input type="radio" name="frequency" className="size-5 accent-primary" checked={value.type === 'weekdays'} onChange={() => onChange({ type: 'weekdays', days })} />
        {t('frequency.weekdays')}
      </label>
      {value.type === 'weekdays' && (
        <div role="group" aria-label={t('frequency.whichDays')} className="flex flex-wrap gap-2 pl-8">
          {DAYS.map((d) => (
            <label key={d} className={cn(option, 'relative min-w-11 justify-center px-2 capitalize has-[:user-invalid]:border-destructive')}>
              <input
                type="checkbox"
                // Invisible but covering the chip (not sr-only): the "pick a day" message points at the chips, not at a 1px dot.
                className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-md outline-none"
                // With no day checked, the form won't submit and says "pick at least one day" (useFormError).
                required={days.length === 0}
                checked={days.includes(d)}
                onChange={(e) =>
                  onChange({
                    type: 'weekdays',
                    days: e.target.checked ? [...days, d].sort((a, b) => a - b) : days.filter((x) => x !== d),
                  })
                }
              />
              <span aria-hidden>{dayName(d, i18n.language, 'short')}</span>
              <span className="sr-only">{dayName(d, i18n.language, 'long')}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
