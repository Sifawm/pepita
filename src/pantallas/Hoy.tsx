import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, Palmtree, Plus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router'
import AvisoCopia from '@/components/AvisoCopia'
import { CelebracionHito } from '@/components/CelebracionHito'
import { Diagnosticos } from '@/components/Diagnostico'
import { Celebracion, TarjetaHabito, type Panel } from '@/components/TarjetaHabito'
import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { db, useAjustes } from '@/db'
import { componerHoy, diagnosticosPendientes, necesitaPrimerosPasos, resumirIdentidades } from '@/dominio'
import { cn, fechaDia, nombreIdentidad } from '@/lib/utils'

/** El reloj de la pantalla: avanza cada minuto para que Hoy cambie de día sola. */
function useAhora() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return ahora
}

export default function Hoy() {
  const { t, i18n } = useTranslation()
  const ahora = useAhora()
  const ajustes = useAjustes()
  // El filtro vive en la URL: sobrevive a ir a crear un hábito y volver.
  const [params, setParams] = useSearchParams()
  // ponytail: carga todos los registros (el periodo en curso puede ser un mes); acotar por fecha si pesa.
  const datos = useLiveQuery(async () => {
    const [habitos, identidades, registros, hitosCelebrados, diagnosticos] = await Promise.all([
      db.habitos.toArray(),
      db.identidades.toArray(),
      db.registros.toArray(),
      db.hitosCelebrados.toArray(),
      db.diagnosticos.toArray(),
    ])
    return { habitos, identidades, registros, hitosCelebrados, diagnosticos }
  })

  // Un solo panel abierto (menú o nota) en toda la lista.
  const [abierto, setAbierto] = useState<{ habitoId: string; panel: Panel }>()
  const [celebracion, setCelebracion] = useState<{ habitoId: string; texto: string; n: number }>()
  const cerrarCelebracion = useCallback(() => setCelebracion(undefined), [])

  if (!datos || !ajustes) return null
  // Sin nada suyo todavía: empieza por los primeros pasos.
  if (necesitaPrimerosPasos(datos)) return <Navigate to="/primeros-pasos" replace />
  const activas = datos.identidades.filter((i) => !i.archivada).sort((a, b) => a.orden - b.orden)
  const filtro = activas.find((i) => i.id === params.get('identidad'))
  const hoy = componerHoy({ ...datos, ahora, ajustes, identidadId: filtro?.id })
  const fecha = fechaDia(hoy.dia, i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('hoy.titulo')}</h1>
        <p className="text-muted-foreground first-letter:uppercase">{fecha}</p>
        <p className="text-lg font-semibold text-primary" aria-live="polite">
          {t('hoy.votos', { count: hoy.votos })}
        </p>
      </header>

      <AvisoCopia ahora={ahora} />

      <Diagnosticos items={diagnosticosPendientes(datos)} />

      {hoy.pausaGlobal && (
        <aside aria-label={t('pausas.global.titulo')} className="flex items-start gap-3 rounded-lg border bg-accent p-4 text-accent-foreground">
          <Palmtree aria-hidden className="mt-0.5 size-6 shrink-0" />
          <p>{t('pausas.global.aviso', { fecha: fechaDia(hoy.pausaGlobal.hasta, i18n.language) })}</p>
        </aside>
      )}

      {activas.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="filtro">{t('identidades.filtro')}</Label>
          <Select
            id="filtro"
            value={filtro?.id ?? ''}
            onChange={(e) => setParams(e.target.value ? { identidad: e.target.value } : {}, { replace: true })}
          >
            <option value="">{t('identidades.todas')}</option>
            {activas.map((i) => (
              <option key={i.id} value={i.id}>
                {nombreIdentidad(i, t)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {hoy.habitos.length === 0 ? (
        <p className="text-muted-foreground">{t(filtro ? 'identidades.filtroVacio' : 'hoy.vacio')}</p>
      ) : (
        <ul aria-label={t('hoy.lista')} className="space-y-3">
          {hoy.habitos.map((tarjeta) => (
            <li key={tarjeta.habito.id}>
              <TarjetaHabito
                tarjeta={tarjeta}
                registros={datos.registros}
                ajustes={ajustes}
                panel={abierto?.habitoId === tarjeta.habito.id ? abierto.panel : undefined}
                abrir={(panel) => setAbierto(panel && { habitoId: tarjeta.habito.id, panel })}
                celebrar={() =>
                  setCelebracion((c) => ({
                    habitoId: tarjeta.habito.id,
                    texto: t('hoy.celebracion', { identidad: nombreIdentidad(tarjeta.identidad, t) }),
                    n: (c?.n ?? 0) + 1,
                  }))
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <Link to={filtro ? `/nuevo?identidad=${filtro.id}` : '/nuevo'} className={cn(buttonVariants(), 'w-full')}>
          <Plus aria-hidden />
          {t('hoy.nuevo')}
        </Link>
        <Link to="/identidades" className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
          <Users aria-hidden />
          {t('identidades.titulo')}
        </Link>
        {datos.habitos.some((h) => h.archivado) && (
          <Link to="/archivados" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
            <Archive aria-hidden />
            {t('archivados.titulo')}
          </Link>
        )}
      </div>

      <CelebracionHito resumenes={resumirIdentidades({ ...datos, ahora, ajustes })} />
      <Celebracion
        texto={celebracion?.texto}
        clave={celebracion?.n ?? 0}
        cerrar={cerrarCelebracion}
        anotar={() => {
          if (celebracion) setAbierto({ habitoId: celebracion.habitoId, panel: 'nota' })
          setCelebracion(undefined)
        }}
      />
    </div>
  )
}
