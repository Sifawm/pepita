import { CalendarDays, Check, Circle, Ellipsis } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { SaltarYPausar } from '@/components/Pausas'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { conId, db } from '@/db'
import { anotar, toque, type Ajustes, type Registro, type TarjetaHoy } from '@/dominio'
import { cn, fechaDia, nombreIdentidad, textoFrase } from '@/lib/utils'

/** Calibración: lo que hay que mantener pulsado para la versión completa. Afínalo con el uso real. */
const PULSACION_LARGA_MS = 500

export type Panel = 'menu' | 'nota'

export function TarjetaHabito({
  tarjeta,
  registros,
  ajustes,
  panel,
  abrir,
  celebrar,
}: {
  tarjeta: TarjetaHoy
  registros: Registro[]
  ajustes: Ajustes
  panel?: Panel
  abrir: (panel?: Panel) => void
  celebrar: () => void
}) {
  const { t, i18n } = useTranslation()
  const { habito, identidad, hecho, periodo, pausa, enRecuperacion, racha } = tarjeta
  const ultimo = tarjeta.registros.at(-1)
  const f = habito.frecuencia
  // «2 de 3 esta semana»: solo cuando el periodo pide más de un día o más de una vez.
  const contador =
    f.tipo === 'veces_por_periodo' && (f.periodo !== 'dia' || f.veces > 1)
      ? t(`frecuencia.lleva_${f.periodo}`, { hechos: periodo.hechos, pide: periodo.pide })
      : null
  const menuId = `menu-${habito.id}`
  const botonMenu = useRef<HTMLButtonElement>(null)
  const [aviso, setAviso] = useState('')
  const estado = hecho
    ? t(ultimo?.tipo === 'completa' ? 'hoy.hechoCompleta' : 'hoy.hechoMinima')
    : pausa
      ? t('pausas.enPausa', { fecha: fechaDia(pausa.hasta, i18n.language) })
      : periodo.estado === 'saltado'
        ? t('pausas.saltado')
        : t('hoy.pendiente')

  const registrar = async (version: 'minima' | 'completa') => {
    abrir()
    // El instante del toque, no el de la última vez que se pintó la pantalla.
    const accion = toque({ habito, registros, ahora: new Date(), ajustes, version })
    if (accion.tipo === 'deshacer') return db.registros.delete(accion.registroId)
    await db.registros.add(conId<Registro>(accion.registro))
    celebrar()
  }
  const deshacer = async () => {
    abrir()
    if (ultimo) await db.registros.delete(ultimo.id)
  }

  // Pulsación larga = versión completa. El clic que la sigue no cuenta como toque.
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined)
  const largo = useRef(false)
  const soltar = () => clearTimeout(temporizador.current)

  const cerrarMenu = () => {
    abrir()
    botonMenu.current?.focus()
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={hecho}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            largo.current = false
            temporizador.current = setTimeout(() => {
              largo.current = true
              void registrar('completa')
            }, PULSACION_LARGA_MS)
          }}
          onPointerUp={soltar}
          onPointerLeave={soltar}
          onPointerCancel={soltar}
          // Sin el menú del sistema al mantener pulsado en el móvil.
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (largo.current) largo.current = false
            else void registrar('minima')
          }}
          className={cn(
            'flex min-h-16 min-w-0 flex-1 touch-manipulation select-none items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors outline-none [-webkit-touch-callout:none]',
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
            {enRecuperacion && !hecho && <span className="block text-sm font-semibold text-primary">{t('recuperacion.sugerencia')}</span>}
            {habito.versionMinima && !hecho && (
              <span className="block break-words">{t('hoy.minima', { texto: habito.versionMinima })}</span>
            )}
            {tarjeta.frase && <span className="block break-words first-letter:uppercase">{textoFrase(tarjeta.frase, t)}</span>}
            <span className="block text-sm text-muted-foreground">
              {nombreIdentidad(identidad, t)}
              {contador && ` · ${contador}`}
              {' · '}
              {estado}
            </span>
            {racha.mejor > 0 && <span className="block text-xs text-muted-foreground">{t('recuperacion.racha', { ...racha })}</span>}
          </span>
        </button>
        <Link
          to={`/habito/${habito.id}`}
          aria-label={t('habito.abrir', { nombre: habito.nombre })}
          className={buttonVariants({ variant: 'ghost', className: 'min-h-16 min-w-11 border px-0' })}
        >
          <CalendarDays aria-hidden />
        </Link>
        <button
          ref={botonMenu}
          type="button"
          aria-label={t('hoy.opciones', { nombre: habito.nombre })}
          aria-expanded={panel === 'menu'}
          aria-controls={menuId}
          onClick={() => {
            setAviso('')
            abrir(panel === 'menu' ? undefined : 'menu')
          }}
          className={buttonVariants({ variant: 'ghost', className: 'min-h-16 min-w-11 border px-0' })}
        >
          <Ellipsis aria-hidden />
        </button>
      </div>

      {!hecho && (habito.entorno || habito.recompensaAsociada) && (
        <div className="space-y-1 px-1 text-sm text-muted-foreground">
          {habito.entorno && (
            <p className="break-words">
              <span className="font-semibold">{t('intencion.entorno')}</span> {habito.entorno.join(' · ')}
            </p>
          )}
          {habito.recompensaAsociada && (
            <p className="break-words">
              <span className="font-semibold">{t('intencion.recompensa')}</span> {habito.recompensaAsociada}
            </p>
          )}
        </div>
      )}

      {panel === 'menu' && (
        // Alternativa accesible a la pulsación larga: todas las acciones como botones.
        <div
          id={menuId}
          role="group"
          aria-label={t('hoy.opciones', { nombre: habito.nombre })}
          onKeyDown={(e) => e.key === 'Escape' && cerrarMenu()}
          className="flex flex-col gap-2 rounded-lg border bg-card p-2"
        >
          {!hecho && (
            <>
              <Button variant="ghost" className="justify-start" autoFocus onClick={() => registrar('minima')}>
                {t('hoy.registrarMinima')}
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => registrar('completa')}>
                {t('hoy.registrarCompleta')}
              </Button>
            </>
          )}
          {ultimo && (
            <>
              <Button variant="ghost" className="justify-start" autoFocus={hecho} onClick={() => abrir('nota')}>
                {t(ultimo.nota ? 'hoy.editarNota' : 'hoy.anadirNota')}
              </Button>
              <Button variant="ghost" className="justify-start" onClick={deshacer}>
                {t('hoy.deshacer')}
              </Button>
            </>
          )}
          <Link to={`/habito/${habito.id}/editar`} className={buttonVariants({ variant: 'ghost', className: 'justify-start' })}>
            {t('asistente.editar')}
          </Link>
          <SaltarYPausar
            tarjeta={tarjeta}
            ajustes={ajustes}
            hecho={(texto) => {
              setAviso(texto)
              cerrarMenu()
            }}
          />
        </div>
      )}
      <p role="status" className="text-sm font-semibold text-primary">
        {aviso}
      </p>

      {panel === 'nota' && ultimo && <EditorNota registro={ultimo} cerrar={cerrarMenu} />}
    </div>
  )
}

function EditorNota({ registro, cerrar }: { registro: Registro; cerrar: () => void }) {
  const { t } = useTranslation()
  const [texto, setTexto] = useState(registro.nota ?? '')
  const id = `nota-${registro.id}`
  return (
    <form
      className="space-y-2 rounded-lg border bg-card p-3"
      onKeyDown={(e) => e.key === 'Escape' && cerrar()}
      onSubmit={async (e) => {
        e.preventDefault()
        await db.registros.put(anotar(registro, texto))
        cerrar()
      }}
    >
      <Label htmlFor={id}>{t('hoy.nota')}</Label>
      <textarea
        id={id}
        autoFocus
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t('hoy.notaEjemplo')}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <Button type="submit">{t('hoy.guardarNota')}</Button>
        <Button type="button" variant="ghost" onClick={cerrar}>
          {t('habito.cancelar')}
        </Button>
      </div>
    </form>
  )
}

/** «+1 voto · identidad». Se va sola salvo si tiene el foco; la nota sigue a mano en el menú. */
export function Celebracion({
  texto,
  clave,
  anotar,
  cerrar,
}: {
  texto?: string
  /** Cambia en cada registro: la animación vuelve a empezar aunque el texto se repita. */
  clave: number
  anotar: () => void
  cerrar: () => void
}) {
  const { t } = useTranslation()
  const [fijada, setFijada] = useState(false)
  useEffect(() => {
    if (!texto || fijada) return
    const id = setTimeout(cerrar, 5000)
    return () => clearTimeout(id)
  }, [texto, clave, fijada, cerrar])

  return (
    // La región viva existe siempre para que el lector de pantalla anuncie cada celebración.
    <div role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-10 mx-auto max-w-md">
      {texto && (
        <div
          key={clave}
          onFocus={() => setFijada(true)}
          onBlur={() => setFijada(false)}
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg bg-primary p-3 pl-4 text-primary-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:slide-in-from-bottom-4"
        >
          <span className="text-lg font-bold">{texto}</span>
          <Button variant="secondary" onClick={anotar}>
            {t('hoy.anadirNota')}
          </Button>
        </div>
      )}
    </div>
  )
}
