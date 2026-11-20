import { Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { BotonExportarIcs } from '@/components/Recordatorios'
import { Button } from '@/components/ui/button'
import { db, useAjustes } from '@/db'
import {
  ACCIONES_DIAGNOSTICO,
  DIAS_PAUSA_DIAGNOSTICO,
  pausaDeDiagnostico,
  responderDiagnostico,
  type AccionDiagnostico,
  type Diagnostico,
  type Habito,
  type Ley,
  type RespuestaDiagnostico,
} from '@/dominio'
import { fechaDia } from '@/lib/utils'

const LEYES: Ley[] = [1, 2, 3, 4]
const LARGO = 'h-auto w-full whitespace-normal py-2 text-left'

/**
 * Los diagnósticos que esperan respuesta, como avisos que abren la ventana. Va en Hoy (los
 * pendientes) y en el detalle del hábito (también el pospuesto).
 */
export function Diagnosticos({ items }: { items: { diagnostico: Diagnostico; habito: Habito }[] }) {
  const { t } = useTranslation()
  const [abierto, setAbierto] = useState<string>()
  const [aviso, setAviso] = useState('')
  const elegido = items.find((i) => i.diagnostico.id === abierto)
  return (
    <>
      {items.length > 0 && (
        <ul aria-label={t('diagnostico.avisos')} className="space-y-2">
          {items.map(({ diagnostico, habito }) => (
            <li key={diagnostico.id}>
              <Button variant="secondary" className={LARGO} onClick={() => setAbierto(diagnostico.id)}>
                <Sparkles aria-hidden className="text-primary" />
                {t('diagnostico.aviso', { nombre: habito.nombre })}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="empty:hidden text-sm text-muted-foreground">
        {aviso}
      </p>
      {elegido && (
        <VentanaDiagnostico
          key={elegido.diagnostico.id}
          {...elegido}
          cerrar={(texto) => {
            setAbierto(undefined)
            setAviso(texto ?? '')
            // Respondido, pospuesto o descartado, su aviso desaparece: el foco no puede volver a él.
            requestAnimationFrame(() => document.activeElement === document.body && document.getElementById('principal')?.focus())
          }}
        />
      )}
    </>
  )
}

/** La ventana: las 4 causas y, elegida una, su consejo y sus acciones de un toque. */
function VentanaDiagnostico({
  diagnostico,
  habito,
  cerrar,
}: {
  diagnostico: Diagnostico
  habito: Habito
  cerrar: (aviso?: string) => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const ajustes = useAjustes()
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [ley, setLey] = useState<Ley>()
  // El .ics se descarga sin cerrar la ventana (su botón anuncia el resultado); se guarda al cerrar con «Listo».
  const [exportado, setExportado] = useState(false)

  // Modal nativo: atrapa el foco y cierra con Escape (sin cambiar nada). Al desmontarse sale
  // solo de la capa superior; no se cierra a mano para no disparar `onClose` y borrar el aviso.
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal()
  }, [])

  const guardar = (r: RespuestaDiagnostico) => db.diagnosticos.put(responderDiagnostico(diagnostico, r))

  const aplicar = async (accion?: AccionDiagnostico) => {
    if (!ley || !ajustes) return
    await guardar({ estado: 'respondido', ley, accion })
    const editar = (paso: string) => navigate(`/habito/${habito.id}/editar?paso=${paso}`)
    switch (accion) {
      case 'editar_intencion':
        return editar('intencion')
      case 'editar_recompensa':
        return editar('recompensa')
      case 'editar_entorno':
        return editar('entorno')
      // La causa 3 deja vigente la sugerencia `bajar`: se confirma en el detalle del hábito, nunca aquí.
      case 'solo_minima':
        return navigate(`/habito/${habito.id}`, { state: { escalado: true } })
      case 'editar_identidad':
        return navigate('/identidades')
      case 'ver_votos':
        return navigate(`/identidades/${habito.identidadId}`)
      case 'pausar': {
        const pausado = pausaDeDiagnostico({ habito, ahora: new Date(), ajustes })
        await db.habitos.put(pausado)
        return cerrar(t('pausas.pausadoAviso', { fecha: fechaDia(pausado.pausas!.at(-1)!.hasta, i18n.language) }))
      }
      case 'archivar':
        await db.habitos.update(habito.id, { archivado: true })
        return cerrar(t('diagnostico.archivado'))
      default:
        return cerrar(t('diagnostico.gracias'))
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-intro`}
      onClose={() => cerrar()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card p-6 text-card-foreground backdrop:bg-black/50"
    >
      <div className="space-y-4">
        <h2 id={`${id}-titulo`} className="text-xl font-bold break-words">
          {t('diagnostico.titulo', { nombre: habito.nombre })}
        </h2>
        {ley === undefined ? (
          <>
            <p id={`${id}-intro`}>{t('diagnostico.intro')}</p>
            <ul aria-label={t('diagnostico.causas.titulo')} className="space-y-2">
              {LEYES.map((l) => (
                <li key={l}>
                  <Button variant="secondary" className={LARGO} autoFocus={l === 1} onClick={() => setLey(l)}>
                    {t(`diagnostico.causas.${l}`)}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t pt-4">
              <Button variant="ghost" onClick={async () => (await guardar({ estado: 'pospuesto' }), cerrar(t('diagnostico.pospuesto')))}>
                {t('diagnostico.posponer')}
              </Button>
              <Button variant="ghost" onClick={async () => (await guardar({ estado: 'descartado' }), cerrar(t('diagnostico.descartado')))}>
                {t('diagnostico.descartar')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p id={`${id}-intro`} className="flex gap-2 rounded-lg bg-accent p-3 text-accent-foreground">
              <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="sr-only">{t('asistente.pepita')} </span>
                {t(`diagnostico.consejos.${ley}`)}
              </span>
            </p>
            <ul aria-label={t('diagnostico.acciones.titulo')} className="space-y-2">
              {ACCIONES_DIAGNOSTICO[ley].map((accion, i) => (
                <li key={accion}>
                  {accion === 'exportar_ics' ? (
                    <div onClickCapture={() => setExportado(true)}>
                      <BotonExportarIcs />
                    </div>
                  ) : (
                    <Button className={LARGO} variant={i === 0 ? 'default' : 'secondary'} autoFocus={i === 0} onClick={() => aplicar(accion)}>
                      {t(`diagnostico.acciones.${accion}`, { dias: DIAS_PAUSA_DIAGNOSTICO })}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => aplicar(exportado ? 'exportar_ics' : undefined)}>
                {t(exportado ? 'diagnostico.listo' : 'diagnostico.soloApuntar')}
              </Button>
              <Button variant="ghost" onClick={() => (setLey(undefined), setExportado(false))}>
                {t('diagnostico.otraCausa')}
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
