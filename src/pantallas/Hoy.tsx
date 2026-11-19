import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Circle, Palmtree, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import AvisoCopia from '@/components/AvisoCopia'
import { OpcionesHabito } from '@/components/Pausas'
import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { conId, db, useAjustes } from '@/db'
import { componerHoy, toque, type Ajustes, type Registro, type TarjetaHoy } from '@/dominio'
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
    const [habitos, identidades, registros] = await Promise.all([
      db.habitos.toArray(),
      db.identidades.toArray(),
      db.registros.toArray(),
    ])
    return { habitos, identidades, registros }
  })

  if (!datos || !ajustes) return null
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
              <div className="flex items-stretch gap-2">
                <Tarjeta tarjeta={tarjeta} registros={datos.registros} ajustes={ajustes} />
                <Link
                  to={`/habito/${tarjeta.habito.id}`}
                  aria-label={t('habito.abrir', { nombre: tarjeta.habito.nombre })}
                  className={cn(buttonVariants({ variant: 'ghost' }), 'h-auto min-w-11 px-0')}
                >
                  <CalendarDays aria-hidden />
                </Link>
              </div>
              <OpcionesHabito tarjeta={tarjeta} ajustes={ajustes} />
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
      </div>
    </div>
  )
}

function Tarjeta({ tarjeta, registros, ajustes }: { tarjeta: TarjetaHoy; registros: Registro[]; ajustes: Ajustes }) {
  const { t, i18n } = useTranslation()
  const { habito, identidad, hecho, periodo, pausa, enRecuperacion, racha } = tarjeta
  const f = habito.frecuencia
  // «2 de 3 esta semana»: solo cuando el periodo pide más de un día o más de una vez.
  const contador =
    f.tipo === 'veces_por_periodo' && (f.periodo !== 'dia' || f.veces > 1)
      ? t(`frecuencia.lleva_${f.periodo}`, { hechos: periodo.hechos, pide: periodo.pide })
      : null

  const alTocar = async () => {
    // El instante del toque, no el de la última vez que se pintó la pantalla.
    const accion = toque({ habito, registros, ahora: new Date(), ajustes })
    if (accion.tipo === 'registrar') await db.registros.add(conId<Registro>(accion.registro))
    else await db.registros.delete(accion.registroId)
  }

  return (
    <button
      type="button"
      aria-pressed={hecho}
      onClick={alTocar}
      className={cn(
        'flex min-h-16 w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        hecho ? 'border-primary bg-accent' : 'hover:bg-muted',
        // Recuperación: borde grueso además del texto de sugerencia (no solo color).
        enRecuperacion && !hecho && 'border-2 border-primary',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full border-2',
          hecho ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-transparent',
        )}
      >
        {hecho ? <Check className="size-6" /> : <Circle className="size-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold break-words">{habito.nombre}</span>
        <span className="block text-sm text-muted-foreground">
          {nombreIdentidad(identidad, t)}
          {contador && ` · ${contador}`}
          {' · '}
          {hecho
            ? t('hoy.hecho')
            : pausa
              ? t('pausas.enPausa', { fecha: fechaDia(pausa.hasta, i18n.language) })
              : periodo.estado === 'saltado'
                ? t('pausas.saltado')
                : t('hoy.pendiente')}
        </span>
        {enRecuperacion && !hecho && <span className="block text-sm font-semibold text-primary">{t('recuperacion.sugerencia')}</span>}
        {racha.mejor > 0 && <span className="block text-xs text-muted-foreground">{t('recuperacion.racha', { ...racha })}</span>}
      </span>
    </button>
  )
}
