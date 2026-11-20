import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Share, Sparkles, SquarePlus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { conId, db, guardarAjustes, useAjustes } from '@/db'
import { nuevaIdentidad, nuevoHabito, siguienteOrden, toque, type CodigoIdioma, type Habito, type Identidad, type Registro } from '@/dominio'
import { esIos, instalada, instalar, useAvisoInstalacion, usePersistente } from '@/lib/instalacion'
import { cn } from '@/lib/utils'
import { Asistente } from '@/pantallas/AsistenteHabito'

/** Los idiomas se nombran en su propia lengua. */
const IDIOMAS: Record<CodigoIdioma, string> = { es: 'Español', en: 'English' }

type Etapa = 'idioma' | 'identidad' | 'habito' | 'registrar' | 'instalar'

/**
 * Primeros pasos: idioma → identidad → un hábito → registrarlo hoy → instalar y proteger los datos.
 * Hoy trae aquí cuando no hay datos (`necesitaPrimerosPasos`); Ajustes permite repetirlos.
 * Nada se guarda hasta crear el hábito (salvo el idioma elegido): si se abandona antes, vuelven a aparecer.
 */
export default function PrimerosPasos() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const ajustes = useAjustes()
  const datos = useLiveQuery(async () => {
    const [identidades, habitos] = await Promise.all([db.identidades.orderBy('orden').toArray(), db.habitos.orderBy('orden').toArray()])
    return { identidades, habitos }
  })
  const [etapa, setEtapa] = useState<Etapa>('idioma')
  const [identidad, setIdentidad] = useState('')
  const [habito, setHabito] = useState<Habito>()
  const [votado, setVotado] = useState(false)

  if (!datos || !ajustes) return null
  const general = datos.identidades.find((i) => i.esGeneral)!

  if (etapa === 'habito')
    return (
      <Asistente
        inicial={{ nombre: '', identidadId: general.id, tipo: 'si_no', frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' } }}
        identidades={datos.identidades}
        habitos={datos.habitos}
        // Lo mínimo para el primer voto: qué, versión mínima, cuándo y dónde. Lo demás, cuando quiera.
        claves={['nombre', 'versiones', 'intencion']}
        titulo={t('primerosPasos.habito')}
        atras={() => setEtapa('identidad')}
        guardar={async (b) => {
          await db.transaction('rw', db.identidades, db.habitos, async () => {
            const nueva = nuevaIdentidad(identidad, await db.identidades.toArray())
            const propia = nueva.nombre ? conId<Identidad>(nueva) : undefined
            if (propia) await db.identidades.add(propia)
            const h = conId<Habito>(
              nuevoHabito({ ...b, identidadId: propia?.id ?? general.id, orden: siguienteOrden(await db.habitos.toArray()) }, new Date(), ajustes),
            )
            await db.habitos.add(h)
            setHabito(h)
          })
          // Seguir sin tocar el idioma acepta el propuesto: queda guardado en Ajustes (y en la copia).
          await guardarAjustes({ idioma: i18n.resolvedLanguage as CodigoIdioma })
        }}
        alTerminar={() => setEtapa('registrar')}
      />
    )

  const registrar = async () => {
    if (!habito) return
    const accion = toque({ habito, registros: [], ahora: new Date(), ajustes })
    if (accion.tipo === 'registrar') await db.registros.add(conId<Registro>(accion.registro))
    setVotado(true)
    setEtapa('instalar')
  }

  switch (etapa) {
    case 'idioma':
      return (
        <Etapa
          key="idioma"
          titulo={t('primerosPasos.idioma.titulo')}
          ayuda={t('primerosPasos.idioma.ayuda')}
          siguiente={() => setEtapa('identidad')}
          extra={
            <Link to="/ajustes" className={buttonVariants({ variant: 'ghost' })}>
              {t('primerosPasos.idioma.copia')}
            </Link>
          }
        >
          <Idioma />
        </Etapa>
      )
    case 'identidad':
      return (
        <Etapa
          key="identidad"
          titulo={t('primerosPasos.identidad.titulo')}
          ayuda={t('primerosPasos.identidad.ayuda')}
          siguiente={() => setEtapa('habito')}
          ahoraNo={() => {
            setIdentidad('')
            setEtapa('habito')
          }}
          atras={() => setEtapa('idioma')}
        >
          <Input
            aria-labelledby="etapa-titulo"
            value={identidad}
            onChange={(e) => setIdentidad(e.target.value)}
            placeholder={t('identidades.ejemplo')}
            autoComplete="off"
          />
        </Etapa>
      )
    case 'registrar':
      return (
        <Etapa key="registrar" titulo={t('primerosPasos.registrar.titulo')} ayuda={t('primerosPasos.registrar.ayuda')} ahoraNo={() => setEtapa('instalar')}>
          {/* El mismo gesto que en Hoy: tocar registra la versión mínima. */}
          <Button type="button" className="h-auto min-h-16 w-full text-lg whitespace-normal" onClick={registrar}>
            {t('hoy.minima', { texto: habito?.versionMinima || habito?.nombre })}
          </Button>
        </Etapa>
      )
    case 'instalar':
      return (
        <Etapa key="instalar" titulo={t('primerosPasos.instalar.titulo')} ayuda={t('primerosPasos.instalar.ayuda')} siguiente={() => navigate('/')} textoSiguiente={t('primerosPasos.empezar')}>
          {votado && (
            <p className="rounded-lg bg-primary p-3 text-lg font-bold text-primary-foreground">
              {t('hoy.celebracion', { identidad: identidad.trim() || t('identidad.general') })}
            </p>
          )}
          <Instalar />
        </Etapa>
      )
  }
}

/** Un paso de los primeros pasos: título con el foco, consejo de Pepita, contenido y botones. */
function Etapa({
  titulo,
  ayuda,
  children,
  siguiente,
  textoSiguiente,
  ahoraNo,
  atras,
  extra,
}: {
  titulo: string
  ayuda: string
  children: ReactNode
  siguiente?: () => void
  textoSiguiente?: string
  ahoraNo?: () => void
  atras?: () => void
  extra?: ReactNode
}) {
  const { t } = useTranslation()
  // Cada paso se monta de nuevo (`key`): el foco va a su título para que el lector de pantalla lo anuncie.
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    siguiente?.()
  }
  return (
    <form onSubmit={enviar} className="space-y-6">
      <header className="space-y-3">
        <p className="text-muted-foreground">{t('primerosPasos.titulo')}</p>
        <h1 id="etapa-titulo" ref={ref} tabIndex={-1} className="text-3xl font-bold outline-none">
          {titulo}
        </h1>
        <p className="flex gap-2 rounded-lg bg-accent p-3 text-accent-foreground">
          <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            <span className="sr-only">{t('asistente.pepita')} </span>
            {ayuda}
          </span>
        </p>
      </header>
      <section className="space-y-4">{children}</section>
      <div className="flex flex-col gap-3">
        {siguiente && <Button type="submit">{textoSiguiente ?? t('asistente.siguiente')}</Button>}
        {ahoraNo && (
          <Button type="button" variant="secondary" onClick={ahoraNo}>
            {t('asistente.ahoraNo')}
          </Button>
        )}
        {atras && (
          <Button type="button" variant="ghost" onClick={atras}>
            {t('asistente.atras')}
          </Button>
        )}
        {extra}
      </div>
    </form>
  )
}

/**
 * Elegir idioma: propone el del navegador (lo detecta i18next) y, al elegir, cambia toda la app y
 * lo guarda en Ajustes. También en Ajustes: se puede cambiar en cualquier momento.
 */
export function Idioma({ leyenda }: { leyenda?: string }) {
  const { t, i18n } = useTranslation()
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{leyenda ?? t('primerosPasos.idioma.titulo')}</legend>
      {Object.entries(IDIOMAS).map(([codigo, nombre]) => (
        <label
          key={codigo}
          lang={codigo}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 text-lg font-semibold has-[:checked]:border-primary has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring"
        >
          <input
            type="radio"
            name="idioma"
            value={codigo}
            checked={i18n.resolvedLanguage === codigo}
            onChange={() => (void i18n.changeLanguage(codigo), void guardarAjustes({ idioma: codigo as CodigoIdioma }))}
            className="size-5 accent-primary outline-none"
          />
          {nombre}
        </label>
      ))}
    </fieldset>
  )
}

/** Instalar: guía a mano en iPhone/iPad, aviso nativo donde exista; y el estado del almacenamiento. */
function Instalar() {
  const { t } = useTranslation()
  const aviso = useAvisoInstalacion()
  const persistente = usePersistente()
  const pasoIos = 'flex items-start gap-3'
  return (
    <>
      {instalada() ? (
        <p>{t('primerosPasos.instalar.yaInstalada')}</p>
      ) : esIos() ? (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">{t('primerosPasos.instalar.ios.titulo')}</h2>
          <ol className="space-y-3">
            <li className={pasoIos}>
              <Share aria-hidden className="size-6 shrink-0 text-primary" />
              <span>{t('primerosPasos.instalar.ios.compartir')}</span>
            </li>
            <li className={pasoIos}>
              <SquarePlus aria-hidden className="size-6 shrink-0 text-primary" />
              <span>{t('primerosPasos.instalar.ios.anadir')}</span>
            </li>
            <li className={pasoIos}>
              <Sparkles aria-hidden className="size-6 shrink-0 text-primary" />
              <span>{t('primerosPasos.instalar.ios.abrir')}</span>
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">{t('primerosPasos.instalar.ios.porque')}</p>
        </div>
      ) : aviso ? (
        <Button type="button" variant="secondary" className="w-full" onClick={instalar}>
          <Download aria-hidden />
          {t('primerosPasos.instalar.boton')}
        </Button>
      ) : (
        <p>{t('primerosPasos.instalar.menu')}</p>
      )}
      {persistente !== undefined && (
        <p className={cn(!persistente && 'text-muted-foreground')}>
          {t(persistente === null ? 'copias.persistenteNoDisponible' : persistente ? 'copias.persistenteSi' : 'copias.persistenteNo')}
        </p>
      )}
    </>
  )
}
