import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { conId, db } from '@/db'
import { cambiarRegla, descartarSugerencia, type Ajustes, type Habito, type Sugerencia, type SugerenciaDescartada } from '@/dominio'

/**
 * El paso del asistente donde se ajusta una sugerencia sin regla propuesta (sí/no, evitar, o un
 * objetivo que no se puede mover más). Sin paso, la sugerencia es solo un ánimo.
 */
function pasoDe(habito: Habito, s: Sugerencia): string | undefined {
  if (s.propuesta) return undefined
  if (s.tipo === 'subir' && s.predomina === 'minima') return habito.tipo === 'si_no' && !habito.versionCompleta ? 'versiones' : undefined
  if (habito.tipo === 'evitar') return 'friccion'
  if (habito.tipo === 'cuantitativo') return 'tipo'
  return s.tipo === 'subir' ? 'frecuencia' : 'versiones'
}

/** La clave del texto de Pepita para la sugerencia (también en la revisión semanal). */
// eslint-disable-next-line react-refresh/only-export-components
export const claveTexto = (habito: Habito, s: Sugerencia) =>
  s.tipo === 'subir' ? `escalado.subir.${s.predomina}` : habito.tipo === 'evitar' ? 'escalado.bajar.evitar' : 'escalado.bajar.otro'

/**
 * La sugerencia vigente de un hábito, en su detalle (montado siempre: el aviso sobrevive a la tarjeta).
 * Nada se aplica solo: un objetivo nuevo se confirma aquí; el resto se ajusta en el asistente (que no
 * guarda nada hasta «Guardar»). Aplicarla o descartarla la silencia 21 días.
 */
export function SugerenciaEscalado({ habito, sugerencia, ajustes }: { habito: Habito; sugerencia?: Sugerencia; ajustes: Ajustes }) {
  const { t } = useTranslation()
  const [aviso, setAviso] = useState('')
  return (
    <>
      {sugerencia && <Tarjeta key={sugerencia.tipo} habito={habito} sugerencia={sugerencia} ajustes={ajustes} avisar={setAviso} />}
      <p role="status" className="empty:hidden text-sm text-muted-foreground">
        {aviso && t(aviso)}
      </p>
    </>
  )
}

function Tarjeta({ habito, sugerencia, ajustes, avisar }: { habito: Habito; sugerencia: Sugerencia; ajustes: Ajustes; avisar: (clave: string) => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const ref = useRef<HTMLElement>(null)
  // Viene de «Quedarme con la mínima» del diagnóstico: el foco llega aquí.
  const desdeDiagnostico = (useLocation().state as { escalado?: boolean } | null)?.escalado
  useEffect(() => {
    if (desdeDiagnostico) ref.current?.focus()
  }, [desdeDiagnostico])
  const [confirmar, setConfirmar] = useState(false)
  const paso = pasoDe(habito, sugerencia)
  const nueva = sugerencia.propuesta?.cuantitativo
  const n = (x: number) => x.toLocaleString(i18n.language)

  const silenciar = () => db.sugerenciasDescartadas.add(conId<SugerenciaDescartada>(descartarSugerencia({ habito, tipo: sugerencia.tipo, ahora: new Date(), ajustes })))
  const aplicar = async () => {
    await db.transaction('rw', db.habitos, db.sugerenciasDescartadas, async () => {
      if (sugerencia.propuesta) await db.habitos.put(cambiarRegla({ habito, regla: sugerencia.propuesta, ahora: new Date(), ajustes }))
      await silenciar()
    })
    avisar('escalado.cambiado')
  }
  const descartar = async () => (await silenciar(), avisar('escalado.descartado'))

  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="escalado" className="space-y-3 rounded-lg border bg-card p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
      <h2 id="escalado" className="flex items-center gap-2 text-xl font-bold">
        <Sparkles aria-hidden className="size-5 shrink-0 text-primary" />
        {t('escalado.titulo')}
      </h2>
      <p>{t(claveTexto(habito, sugerencia), { nombre: habito.nombre })}</p>
      {nueva && habito.cuantitativo && (
        <p className="font-semibold">
          {t(`escalado.propuesta.${nueva.modo}`, { antes: n(habito.cuantitativo.objetivo), despues: n(nueva.objetivo), unidad: nueva.unidad })}
        </p>
      )}
      {confirmar ? (
        <div role="alertdialog" aria-labelledby="escalado-confirmar" className="space-y-3 border-t pt-3">
          <p id="escalado-confirmar">{t('escalado.confirmar')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={aplicar}>{t('escalado.cambiar')}</Button>
            {/* El foco empieza en la opción segura. */}
            <Button variant="secondary" autoFocus onClick={() => setConfirmar(false)}>
              {t('escalado.cancelar')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          {nueva ? (
            <Button onClick={() => setConfirmar(true)}>{t('escalado.verCambio')}</Button>
          ) : paso ? (
            <Button onClick={async () => (await silenciar(), navigate(`/habito/${habito.id}/editar?paso=${paso}`))}>{t('escalado.ajustar')}</Button>
          ) : (
            <Button onClick={async () => (await silenciar(), avisar('escalado.animo'))}>{t('escalado.entendido')}</Button>
          )}
          <Button variant="ghost" onClick={descartar}>
            {t('escalado.descartar')}
          </Button>
        </div>
      )}
    </section>
  )
}

/** En Hoy, una pista ligera por hábito con sugerencia: lleva a su detalle. */
export function AvisosEscalado({ items }: { items: { habito: Habito; sugerencia: Sugerencia }[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <ul aria-label={t('escalado.avisos')} className="space-y-1">
      {items.map(({ habito, sugerencia }) => {
        const Icono = sugerencia.tipo === 'subir' ? TrendingUp : TrendingDown
        return (
          <li key={habito.id}>
            <Link to={`/habito/${habito.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring">
              <Icono aria-hidden className="size-4 shrink-0" />
              {t('escalado.aviso', { nombre: habito.nombre })}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
