import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { db, guardarAjustes, leerAjustes, useAjustes } from '@/db'
import { avisosDeHoy, recordatoriosIcs } from '@/dominio'
import { descargar, tituloFrase } from '@/lib/utils'

/** Descarga el .ics de todos los recordatorios. Devuelve si había alguno. */
function useExportarIcs() {
  const { t } = useTranslation()
  return async () => {
    const [habitos, ajustes] = await Promise.all([db.habitos.toArray(), leerAjustes()])
    const { ics, eventos } = recordatoriosIcs({ habitos, ahora: new Date(), ajustes, texto: (f) => tituloFrase(f, t) })
    descargar('pepita-recordatorios.ics', [ics], 'text/calendar;charset=utf-8')
    return eventos > 0
  }
}

/** Botón «Exportar recordatorios (.ics)» con su aviso. Para Ajustes y para el diagnóstico de la 1ª ley. */
export function BotonExportarIcs({ variant = 'secondary' }: { variant?: 'default' | 'secondary' }) {
  const { t } = useTranslation()
  const exportarIcs = useExportarIcs()
  const [aviso, setAviso] = useState('')
  return (
    <div className="space-y-2">
      <Button variant={variant} className="w-full" onClick={async () => setAviso(t((await exportarIcs()) ? 'recordatorios.exportados' : 'recordatorios.ninguno'))}>
        <CalendarPlus aria-hidden />
        {t('recordatorios.exportar')}
      </Button>
      <p role="status" className="text-sm font-semibold text-primary">
        {aviso}
      </p>
    </div>
  )
}

const soportadas = () => 'Notification' in window

/** Sección de Ajustes: el .ics y los avisos con la app abierta. */
export function SeccionRecordatorios() {
  const { t } = useTranslation()
  const ajustes = useAjustes()
  const [permiso, setPermiso] = useState(() => (soportadas() ? Notification.permission : undefined))
  const activas = !!ajustes?.notificaciones && permiso === 'granted'

  const cambiar = async (activar: boolean) => {
    if (activar && Notification.permission !== 'granted') {
      const respuesta = await Notification.requestPermission()
      setPermiso(respuesta)
      if (respuesta !== 'granted') return
    }
    await guardarAjustes({ notificaciones: activar })
  }

  return (
    <section aria-labelledby="recordatorios-titulo" className="space-y-4">
      <h2 id="recordatorios-titulo" className="text-xl font-bold">
        {t('recordatorios.titulo')}
      </h2>
      <p className="text-muted-foreground">{t('recordatorios.intro')}</p>
      <BotonExportarIcs />
      <p className="text-sm text-muted-foreground">{t('recordatorios.exportarAyuda')}</p>

      {permiso === undefined ? (
        <p>{t('recordatorios.noDisponibles')}</p>
      ) : (
        <div className="space-y-2">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={activas}
              disabled={permiso === 'denied'}
              aria-describedby="notificaciones-ayuda"
              onChange={(e) => cambiar(e.target.checked)}
            />
            {t('recordatorios.notificaciones')}
          </label>
          <p id="notificaciones-ayuda" className="text-sm text-muted-foreground">
            {t(permiso === 'denied' ? 'recordatorios.bloqueadas' : 'recordatorios.notificacionesAyuda')}
          </p>
        </div>
      )}
    </section>
  )
}

/** Android solo muestra avisos desde el service worker; sin él (desarrollo), el constructor. */
function mostrar(titulo: string, opciones: NotificationOptions) {
  navigator.serviceWorker
    ?.getRegistration()
    .then((r) => {
      if (r) return r.showNotification(titulo, opciones)
      new Notification(titulo, opciones)
    })
    .catch(() => {})
}

/**
 * Programa en memoria los avisos que quedan hoy, solo con permiso. Se reprograman al cambiar los
 * datos (hacer un hábito cancela su aviso) y cada hora (para pasar al día siguiente). Cerrar la
 * app los cancela.
 */
export function Avisos() {
  const { t } = useTranslation()
  const ajustes = useAjustes()
  const activas = !!ajustes?.notificaciones && soportadas() && Notification.permission === 'granted'
  const datos = useLiveQuery(async () => {
    if (!activas) return undefined
    const [habitos, identidades, registros] = await Promise.all([db.habitos.toArray(), db.identidades.toArray(), db.registros.toArray()])
    return { habitos, identidades, registros }
  }, [activas])
  const [hora, setHora] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setHora((n) => n + 1), 3_600_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!activas || !datos || !ajustes) return
    const ahora = new Date()
    const temporizadores = avisosDeHoy({ ...datos, ahora, ajustes }).map((aviso) =>
      setTimeout(
        () =>
          mostrar(tituloFrase(aviso.frase, t), {
            tag: aviso.habito.id,
            icon: 'pwa-192.png',
            body: aviso.anclados.length ? t('recordatorios.despues', { lista: aviso.anclados.map((f) => f.que).join(', ') }) : undefined,
          }),
        aviso.instante.getTime() - ahora.getTime(),
      ),
    )
    return () => temporizadores.forEach(clearTimeout)
  }, [activas, datos, ajustes, hora, t])

  return null
}
