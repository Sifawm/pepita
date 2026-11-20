import { CalendarDays, Check, Circle, Ellipsis } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { SumarValor } from '@/components/Cuantitativo'
import { SaltarYPausar } from '@/components/Pausas'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { conId, db } from '@/db'
import { anotar, recaer, sumarValor, toque, type Ajustes, type Registro, type TarjetaHoy } from '@/dominio'
import { cn, fechaDia, nombreIdentidad, progresoCuantitativo, textoFrase } from '@/lib/utils'

/** Calibración: lo que hay que mantener pulsado para la versión completa. Afínalo con el uso real. */
const PULSACION_LARGA_MS = 500

export type Panel = 'menu' | 'nota' | 'recaida'

interface PropsTarjeta {
  tarjeta: TarjetaHoy
  registros: Registro[]
  ajustes: Ajustes
  panel?: Panel
  abrir: (panel?: Panel) => void
  celebrar: () => void
}

export function TarjetaHabito(props: PropsTarjeta) {
  return props.tarjeta.habito.tipo === 'evitar' ? <TarjetaEvitar {...props} /> : <TarjetaSiNo {...props} />
}

/** Sí/no (toque = mínima, pulsación larga = completa) y cuantitativo (un campo para sumar valores). */
function TarjetaSiNo({ tarjeta, registros, ajustes, panel, abrir, celebrar }: PropsTarjeta) {
  const { t, i18n } = useTranslation()
  const { habito, identidad, hecho, periodo, pausa, enRecuperacion, racha } = tarjeta
  const ultimo = tarjeta.registros.at(-1)
  const f = habito.frecuencia
  const c = habito.cuantitativo
  // «2 de 3 esta semana»: solo cuando el periodo pide más de un día o más de una vez. Un cuantitativo, siempre.
  const contador = c
    ? progresoCuantitativo(habito, periodo, t, i18n.language)
    : f.tipo === 'veces_por_periodo' && (f.periodo !== 'dia' || f.veces > 1)
      ? t(`frecuencia.lleva_${f.periodo}`, { hechos: periodo.hechos, pide: periodo.pide })
      : null
  const menuId = `menu-${habito.id}`
  const botonMenu = useRef<HTMLButtonElement>(null)
  const [aviso, setAviso] = useState('')
  const estado = hecho
    ? c
      ? t(periodo.estado === 'cumplido_completa' ? 'cuantitativo.estado.completa' : 'cuantitativo.estado.minima')
      : t(ultimo?.tipo === 'completa' ? 'hoy.hechoCompleta' : 'hoy.hechoMinima')
    : pausa
      ? t('pausas.enPausa', { fecha: fechaDia(pausa.hasta, i18n.language) })
      : periodo.estado === 'saltado'
        ? t('pausas.saltado')
        : !c
          ? t('hoy.pendiente')
          : c.modo === 'al_menos'
            ? t('cuantitativo.estado.pendiente')
            : t(periodo.hechos <= c.objetivo ? 'cuantitativo.estado.dentro' : 'cuantitativo.estado.pasado')

  const sumar = async (valor: number) => {
    abrir()
    const { registro, voto } = sumarValor({ habito, registros, valor, ahora: new Date(), ajustes })
    await db.registros.add(conId<Registro>(registro))
    if (voto) celebrar()
  }

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
  // El botón pulsado desaparece con el menú: el foco vuelve a «Más opciones», no al principio de la página.
  const desdeMenu = (accion: () => Promise<unknown>) => () => {
    botonMenu.current?.focus()
    void accion()
  }

  const caja = cn(
    'flex min-h-16 min-w-0 flex-1 items-center gap-4 rounded-lg border bg-card p-4 text-left',
    hecho && 'border-primary bg-accent',
    // Recuperación: borde grueso además del texto de sugerencia (no solo color).
    enRecuperacion && !hecho && 'border-2 border-primary',
  )
  const contenido = (
    <>
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
        {!c && habito.versionMinima && !hecho && (
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
    </>
  )

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Un cuantitativo no se marca con un toque: se le suman valores en el campo de abajo. */}
        {c ? (
          <div className={caja}>{contenido}</div>
        ) : (
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
              caja,
              'touch-manipulation select-none transition-colors outline-none [-webkit-touch-callout:none]',
              'focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              !hecho && 'hover:bg-muted',
            )}
          >
            {contenido}
          </button>
        )}
        {/* Apilados: a 375px la tarjeta conserva el ancho para el texto. */}
        <div className="flex flex-col gap-2">
          <Link
            to={`/habito/${habito.id}`}
            aria-label={t('habito.abrir', { nombre: habito.nombre })}
            className={buttonVariants({ variant: 'ghost', className: 'min-h-11 min-w-11 flex-1 border px-0' })}
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
            className={buttonVariants({ variant: 'ghost', className: 'min-h-11 min-w-11 flex-1 border px-0' })}
          >
            <Ellipsis aria-hidden />
          </button>
        </div>
      </div>

      {c && <SumarValor unidad={c.unidad} nombre={habito.nombre} sumar={sumar} />}

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
          {!c && !hecho && (
            <>
              <Button variant="ghost" className="justify-start" autoFocus onClick={desdeMenu(() => registrar('minima'))}>
                {t('hoy.registrarMinima')}
              </Button>
              <Button variant="ghost" className="justify-start" onClick={desdeMenu(() => registrar('completa'))}>
                {t('hoy.registrarCompleta')}
              </Button>
            </>
          )}
          {ultimo && (
            <>
              <Button variant="ghost" className="justify-start" autoFocus={hecho || !!c} onClick={() => abrir('nota')}>
                {t(ultimo.nota ? 'hoy.editarNota' : 'hoy.anadirNota')}
              </Button>
              <Button variant="ghost" className="justify-start" onClick={desdeMenu(deshacer)}>
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

/**
 * Hábito a evitar: no hay nada que marcar; el día limpio suma su voto solo al cerrarse.
 * «He recaído» abre un formulario con el disparador opcional.
 */
function TarjetaEvitar({ tarjeta, ajustes, panel, abrir }: PropsTarjeta) {
  const { t, i18n } = useTranslation()
  const { habito, identidad, periodo, pausa, recaidas, racha } = tarjeta
  const leyes = habito.leyesInversas ?? {}
  const menuId = `menu-${habito.id}`
  const botonMenu = useRef<HTMLButtonElement>(null)
  const botonRecaida = useRef<HTMLButtonElement>(null)
  const [aviso, setAviso] = useState('')
  const recaido = recaidas.length > 0
  const estado = recaido
    ? t('evitar.recaido')
    : pausa
      ? t('pausas.enPausa', { fecha: fechaDia(pausa.hasta, i18n.language) })
      : periodo.estado === 'saltado'
        ? t('pausas.saltado')
        : t('evitar.limpio')

  const cerrar = (foco: HTMLButtonElement | null, texto = '') => {
    abrir()
    setAviso(texto)
    foco?.focus()
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className={cn('min-w-0 flex-1 space-y-3 rounded-lg border bg-card p-4', recaido && 'border-dashed')}>
          <div>
            <span id={`nombre-${habito.id}`} className="block text-lg font-semibold break-words">
              {habito.nombre}
            </span>
            {(['sustituto', 'senal', 'friccion'] as const).map(
              (ley) =>
                leyes[ley] && (
                  <span key={ley} className="block break-words">
                    {t(`evitar.${ley}`, { texto: leyes[ley] })}
                  </span>
                ),
            )}
            <span className="block text-sm text-muted-foreground">
              {nombreIdentidad(identidad, t)} · {estado}
            </span>
            {racha.mejor > 0 && <span className="block text-xs text-muted-foreground">{t('recuperacion.racha', { ...racha })}</span>}
          </div>
          <Button
            ref={botonRecaida}
            variant="secondary"
            className="w-full"
            aria-expanded={panel === 'recaida'}
            aria-describedby={`nombre-${habito.id}`}
            onClick={() => {
              setAviso('')
              abrir(panel === 'recaida' ? undefined : 'recaida')
            }}
          >
            {t('evitar.heRecaido')}
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to={`/habito/${habito.id}`}
            aria-label={t('habito.abrir', { nombre: habito.nombre })}
            className={buttonVariants({ variant: 'ghost', className: 'min-h-11 min-w-11 flex-1 border px-0' })}
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
            className={buttonVariants({ variant: 'ghost', className: 'min-h-11 min-w-11 flex-1 border px-0' })}
          >
            <Ellipsis aria-hidden />
          </button>
        </div>
      </div>

      {panel === 'recaida' && (
        <FormRecaida
          habitoId={habito.id}
          anotar={async (disparador) => {
            await db.registros.add(conId<Registro>(recaer({ habito, disparador, ahora: new Date(), ajustes })))
            cerrar(botonRecaida.current, t('evitar.anotada'))
          }}
          cerrar={() => cerrar(botonRecaida.current)}
        />
      )}

      {panel === 'menu' && (
        <div
          id={menuId}
          role="group"
          aria-label={t('hoy.opciones', { nombre: habito.nombre })}
          onKeyDown={(e) => e.key === 'Escape' && cerrar(botonMenu.current)}
          className="flex flex-col gap-2 rounded-lg border bg-card p-2"
        >
          {recaido && (
            <Button
              variant="ghost"
              className="justify-start"
              autoFocus
              onClick={async () => {
                await db.registros.delete(recaidas[recaidas.length - 1].id)
                cerrar(botonMenu.current, t('evitar.deshecha'))
              }}
            >
              {t('evitar.deshacer')}
            </Button>
          )}
          <Link to={`/habito/${habito.id}/editar`} className={buttonVariants({ variant: 'ghost', className: 'justify-start' })}>
            {t('asistente.editar')}
          </Link>
          <SaltarYPausar tarjeta={tarjeta} ajustes={ajustes} hecho={(texto) => cerrar(botonMenu.current, texto)} />
        </div>
      )}
      <p role="status" className="text-sm font-semibold text-primary">
        {aviso}
      </p>
    </div>
  )
}

function FormRecaida({ habitoId, anotar, cerrar }: { habitoId: string; anotar: (disparador: string) => Promise<void>; cerrar: () => void }) {
  const { t } = useTranslation()
  const [disparador, setDisparador] = useState('')
  const id = `disparador-${habitoId}`
  return (
    <form
      className="space-y-2 rounded-lg border bg-card p-3"
      onKeyDown={(e) => e.key === 'Escape' && cerrar()}
      onSubmit={(e) => {
        e.preventDefault()
        void anotar(disparador)
      }}
    >
      <p className="text-sm">{t('evitar.ayuda')}</p>
      <Label htmlFor={id}>{t('evitar.disparador')}</Label>
      <Input id={id} autoFocus value={disparador} onChange={(e) => setDisparador(e.target.value)} placeholder={t('evitar.disparadorEjemplo')} autoComplete="off" />
      <div className="flex gap-2">
        <Button type="submit">{t('evitar.anotar')}</Button>
        <Button type="button" variant="ghost" onClick={cerrar}>
          {t('habito.cancelar')}
        </Button>
      </div>
    </form>
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
  // Escape la quita sin mover el foco, por si tapa lo que lo tiene (WCAG 2.4.11).
  useEffect(() => {
    if (!texto) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [texto, cerrar])

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
