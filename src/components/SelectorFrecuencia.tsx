import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import type { DiaSemana, Frecuencia } from '@/dominio'
import { cn } from '@/lib/utils'

const DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 7]
// El 1 de enero de 2024 fue lunes: sirve para pedir al navegador el nombre de cada día.
const nombreDia = (d: DiaSemana, idioma: string, weekday: 'long' | 'short') =>
  new Date(2024, 0, d).toLocaleDateString(idioma, { weekday })

const opcion =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:font-bold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring'

/** `soloPeriodo`: un cuantitativo pide su objetivo por periodo, no un número de veces. */
export function SelectorFrecuencia({
  valor,
  cambiar,
  soloPeriodo = false,
}: {
  valor: Frecuencia
  cambiar: (f: Frecuencia) => void
  soloPeriodo?: boolean
}) {
  const { t, i18n } = useTranslation()
  const veces = valor.tipo === 'veces_por_periodo' ? valor : { veces: 1, periodo: 'dia' as const }
  const dias = valor.tipo === 'dias_semana' ? valor.dias : []

  return (
    <fieldset className="space-y-3">
      {/* El asistente ya lo pregunta en el título del paso. */}
      <legend className="sr-only">{t('frecuencia.titulo')}</legend>

      <label className={opcion}>
        <input
          type="radio"
          name="frecuencia"
          className="size-5 accent-primary"
          checked={valor.tipo === 'veces_por_periodo'}
          onChange={() => cambiar({ tipo: 'veces_por_periodo', ...veces })}
        />
        {t(soloPeriodo ? 'frecuencia.cada_periodo' : 'frecuencia.veces_por_periodo')}
      </label>
      {valor.tipo === 'veces_por_periodo' && (
        <div className="flex items-center gap-2 pl-8">
          {!soloPeriodo && (
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              step={1}
              required
              aria-label={t('frecuencia.veces')}
              className="w-20"
              value={valor.veces || ''}
              onChange={(e) => cambiar({ ...valor, veces: Math.trunc(e.target.valueAsNumber) || 0 })}
            />
          )}
          <select
            aria-label={t('frecuencia.periodo')}
            className="min-h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            value={valor.periodo}
            onChange={(e) => cambiar({ ...valor, periodo: e.target.value as typeof valor.periodo })}
          >
            {(['dia', 'semana', 'mes'] as const).map((p) => (
              <option key={p} value={p}>
                {soloPeriodo ? t(`frecuencia.cada_${p}`) : t(`frecuencia.por_${p}`, { count: valor.veces })}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className={opcion}>
        <input
          type="radio"
          name="frecuencia"
          className="size-5 accent-primary"
          checked={valor.tipo === 'dias_semana'}
          onChange={() => cambiar({ tipo: 'dias_semana', dias })}
        />
        {t('frecuencia.dias_semana')}
      </label>
      {valor.tipo === 'dias_semana' && (
        <div role="group" aria-label={t('frecuencia.que_dias')} className="flex flex-wrap gap-2 pl-8">
          {DIAS.map((d) => (
            <label key={d} className={cn(opcion, 'min-w-11 justify-center px-2 capitalize')}>
              <input
                type="checkbox"
                className="sr-only"
                // Sin ningún día marcado, el navegador no deja crear el hábito.
                required={dias.length === 0}
                checked={dias.includes(d)}
                onChange={(e) =>
                  cambiar({
                    tipo: 'dias_semana',
                    dias: e.target.checked ? [...dias, d].sort((a, b) => a - b) : dias.filter((x) => x !== d),
                  })
                }
              />
              <span aria-hidden>{nombreDia(d, i18n.language, 'short')}</span>
              <span className="sr-only">{nombreDia(d, i18n.language, 'long')}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
