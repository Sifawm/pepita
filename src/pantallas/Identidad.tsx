import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { GraficoSerie } from '@/components/GraficoSerie'
import { buttonVariants } from '@/components/ui/button'
import { db, useAjustes } from '@/db'
import { diaLogico, HITOS, resumirIdentidades } from '@/dominio'
import { cn, fechaDia, nombreIdentidad } from '@/lib/utils'

/** Detalle de una identidad: curva de votos acumulados, hitos y sus hábitos. */
export default function Identidad() {
  const { t, i18n } = useTranslation()
  const { id = '' } = useParams()
  const ajustes = useAjustes()
  const datos = useLiveQuery(async () => {
    const identidad = await db.identidades.get(id)
    const habitos = await db.habitos.where('identidadId').equals(id).toArray()
    const registros = await db.registros.where('habitoId').anyOf(habitos.map((h) => h.id)).toArray()
    return { identidad, habitos, registros }
  }, [id])

  if (!datos || !ajustes) return null
  const { identidad, habitos } = datos
  if (!identidad) return <p>{t('detalleIdentidad.noExiste')}</p>

  const ahora = new Date()
  const [resumen] = resumirIdentidades({ ...datos, identidades: [identidad], ahora, ajustes })
  const siguiente = HITOS.find((h) => h > resumen.votos)
  const ordenados = [...habitos].sort((a, b) => Number(a.archivado) - Number(b.archivado) || a.orden - b.orden)

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold break-words">{nombreIdentidad(identidad, t)}</h1>
        <p className="text-lg font-semibold text-primary">{t('identidades.votos', { count: resumen.votos })}</p>
      </header>

      <section aria-labelledby="curva" className="space-y-3">
        <h2 id="curva" className="text-xl font-bold">
          {t('detalleIdentidad.curva')}
        </h2>
        {resumen.serie.length ? (
          <GraficoSerie
            puntos={resumen.serie.map((p) => ({ dia: p.dia, valor: p.votos }))}
            hasta={diaLogico(ahora, ajustes.horaCierre)}
            resumen={t('detalleIdentidad.resumenCurva', {
              count: resumen.votos,
              desde: fechaDia(resumen.serie[0].dia, i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }),
            })}
            columnas={[t('detalleIdentidad.columnaDia'), t('detalleIdentidad.columnaVotos')]}
          />
        ) : (
          <p className="text-muted-foreground">{t('detalleIdentidad.sinVotos')}</p>
        )}
      </section>

      <section aria-labelledby="hitos" className="space-y-3">
        <h2 id="hitos" className="text-xl font-bold">
          {t('hitos.titulo')}
        </h2>
        {resumen.hitos.length > 0 && (
          <ul className="space-y-2">
            {resumen.hitos.map((h) => (
              <li key={h.umbral} className="flex items-center gap-3">
                <Check aria-hidden className="size-5 shrink-0 text-primary" />
                <span>
                  {t('hitos.alcanzado', { count: h.umbral, fecha: fechaDia(h.dia, i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground">
          {siguiente
            ? t('hitos.siguiente', { count: siguiente, faltan: siguiente - resumen.votos })
            : t('hitos.todos')}
        </p>
      </section>

      <section aria-labelledby="habitos" className="space-y-3">
        <h2 id="habitos" className="text-xl font-bold">
          {t('detalleIdentidad.habitos')}
        </h2>
        {ordenados.length === 0 ? (
          <p className="text-muted-foreground">{t('detalleIdentidad.sinHabitos')}</p>
        ) : (
          <ul className="space-y-3">
            {ordenados.map((h) => (
              <li key={h.id} className="space-y-1 rounded-lg border bg-card p-4">
                <p className="text-lg font-semibold break-words">
                  {h.nombre}
                  {h.archivado && <span className="ml-2 text-sm font-normal text-muted-foreground">{t('detalleIdentidad.archivado')}</span>}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Link to={`/habito/${h.id}`} className={buttonVariants({ variant: 'ghost' })}>
                    <CalendarDays aria-hidden />
                    {t('detalleIdentidad.calendario')}
                    <span className="sr-only">{h.nombre}</span>
                  </Link>
                  {!h.archivado && (
                    <Link to={`/habito/${h.id}/editar`} className={buttonVariants({ variant: 'ghost' })}>
                      <Pencil aria-hidden />
                      {t('detalleIdentidad.editar')}
                      <span className="sr-only">{h.nombre}</span>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!identidad.archivada && (
          <Link to={`/nuevo?identidad=${identidad.id}`} className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
            {t('hoy.nuevo')}
          </Link>
        )}
      </section>
    </div>
  )
}
