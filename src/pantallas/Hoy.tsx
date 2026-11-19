import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Circle, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { conId, db } from '@/db'
import { AJUSTES_POR_DEFECTO, componerHoy, diaLogico, toque, type Registro, type TarjetaHoy } from '@/dominio'
import { cn } from '@/lib/utils'

// ponytail: ajustes fijos hasta que exista la pantalla de Ajustes (ticket 04).
const ajustes = AJUSTES_POR_DEFECTO

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
  const dia = diaLogico(ahora, ajustes.horaCierre)
  const datos = useLiveQuery(async () => {
    const [habitos, identidades, registros] = await Promise.all([
      db.habitos.toArray(),
      db.identidades.toArray(),
      db.registros.where('dia').equals(dia).toArray(),
    ])
    return { habitos, identidades, registros }
  }, [dia])

  if (!datos) return null
  const hoy = componerHoy({ ...datos, ahora, ajustes })
  const [a, m, d] = hoy.dia.split('-').map(Number)
  const fecha = new Date(a, m - 1, d).toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('hoy.titulo')}</h1>
        <p className="text-muted-foreground first-letter:uppercase">{fecha}</p>
        <p className="text-lg font-semibold text-primary" aria-live="polite">
          {t('hoy.votos', { count: hoy.votos })}
        </p>
      </header>

      {hoy.habitos.length === 0 ? (
        <p className="text-muted-foreground">{t('hoy.vacio')}</p>
      ) : (
        <ul aria-label={t('hoy.lista')} className="space-y-3">
          {hoy.habitos.map((tarjeta) => (
            <li key={tarjeta.habito.id}>
              <Tarjeta tarjeta={tarjeta} registros={datos.registros} />
            </li>
          ))}
        </ul>
      )}

      <Link to="/nuevo" className={cn(buttonVariants(), 'w-full')}>
        <Plus aria-hidden />
        {t('hoy.nuevo')}
      </Link>
    </div>
  )
}

function Tarjeta({ tarjeta, registros }: { tarjeta: TarjetaHoy; registros: Registro[] }) {
  const { t } = useTranslation()
  const { habito, identidad, hecho } = tarjeta

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
          {identidad.esGeneral ? t('identidad.general') : identidad.nombre}
          {' · '}
          {t(hecho ? 'hoy.hecho' : 'hoy.pendiente')}
        </span>
      </span>
    </button>
  )
}
