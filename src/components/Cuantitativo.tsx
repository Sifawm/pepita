import { Plus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Cuantitativo } from '@/dominio'

const opcion =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:font-bold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring'

/** Vacío o no numérico = `undefined`: el campo está sin escribir. */
const numero = (texto: string) => (texto.trim() === '' || Number.isNaN(Number(texto)) ? undefined : Number(texto))

/** Modo, objetivo, unidad y (en «al menos») objetivo mínimo. Lo usa el paso «tipo» del asistente. */
export function CamposCuantitativo({ valor, cambiar }: { valor: Cuantitativo; cambiar: (c: Cuantitativo) => void }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">{t('cuantitativo.modo')}</legend>
        {(['al_menos', 'como_mucho'] as const).map((modo) => (
          <label key={modo} className={opcion}>
            <input
              type="radio"
              name={`${id}-modo`}
              className="size-5 accent-primary"
              checked={valor.modo === modo}
              onChange={() => cambiar({ ...valor, modo })}
            />
            {t(`cuantitativo.modos.${modo}`)}
          </label>
        ))}
      </fieldset>
      <div className="flex gap-3">
        <div className="w-28 space-y-2">
          <Label htmlFor={`${id}-objetivo`}>{t('cuantitativo.objetivo')}</Label>
          <Input
            id={`${id}-objetivo`}
            type="number"
            inputMode="decimal"
            min={0.01}
            step="any"
            required
            value={valor.objetivo || ''}
            onChange={(e) => cambiar({ ...valor, objetivo: numero(e.target.value) ?? 0 })}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={`${id}-unidad`}>{t('cuantitativo.unidad')}</Label>
          <Input
            id={`${id}-unidad`}
            required
            autoComplete="off"
            placeholder={t('cuantitativo.unidadEjemplo')}
            value={valor.unidad}
            onChange={(e) => cambiar({ ...valor, unidad: e.target.value })}
          />
        </div>
      </div>
      {valor.modo === 'al_menos' && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-minimo`}>{t('cuantitativo.objetivoMinimo')}</Label>
          <p id={`${id}-minimo-ayuda`} className="text-sm text-muted-foreground">
            {t('cuantitativo.objetivoMinimoAyuda')}
          </p>
          <Input
            id={`${id}-minimo`}
            aria-describedby={`${id}-minimo-ayuda`}
            type="number"
            inputMode="decimal"
            min={0.01}
            max={valor.objetivo || undefined}
            step="any"
            className="w-28"
            value={valor.objetivoMinimo ?? ''}
            onChange={(e) => cambiar({ ...valor, objetivoMinimo: numero(e.target.value) })}
          />
        </div>
      )}
    </div>
  )
}

/** Campo para sumar una cantidad: en la tarjeta de Hoy y al editar un día del calendario. */
export function SumarValor({ unidad, nombre, sumar }: { unidad: string; nombre: string; sumar: (valor: number) => Promise<unknown> }) {
  const { t } = useTranslation()
  const id = useId()
  const [texto, setTexto] = useState('')
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const valor = numero(texto)
    if (!valor || valor <= 0) return
    await sumar(valor)
    setTexto('')
  }
  return (
    <form onSubmit={enviar} className="flex items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={id}>{t('cuantitativo.sumar', { unidad })}</Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0.01}
          step="any"
          required
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      <Button type="submit" aria-label={t('cuantitativo.sumarBoton', { nombre })}>
        <Plus aria-hidden />
        {t('cuantitativo.sumarCorto')}
      </Button>
    </form>
  )
}
