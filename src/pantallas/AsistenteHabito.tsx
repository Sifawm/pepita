import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BorrarHabito } from '@/components/BorrarHabito'
import { CamposCuantitativo } from '@/components/Cuantitativo'
import { SelectorFrecuencia } from '@/components/SelectorFrecuencia'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { conId, db, useAjustes } from '@/db'
import {
  anclasPosibles,
  editarHabito,
  fraseIntencion,
  nuevoHabito,
  type CamposHabito,
  type Cuando,
  type Habito,
  type Identidad,
  type Intencion,
  type LeyesInversas,
  type TipoHabito,
} from '@/dominio'
import { nombreIdentidad, textoFrase } from '@/lib/utils'

/** Las leyes inversas van sueltas: cada una es un paso que se puede saltar por separado. */
type Borrador = Omit<CamposHabito, 'leyesInversas'> & LeyesInversas & { tipo: TipoHabito }
interface PropsPaso {
  borrador: Borrador
  cambiar: (c: Partial<Borrador>) => void
  identidades: Identidad[]
  /** El tipo solo se elige al crear: cambiarlo reinterpretaría toda la historia. */
  editando: boolean
  /** Todos los hábitos (para nombrar el ancla en la frase). */
  habitos: Habito[]
  /** Los que pueden ser su ancla: activos y sin cerrar un ciclo. */
  anclas: Habito[]
  /** Id del título del paso, para nombrar el campo cuando es uno solo. */
  titulo: string
}

/** Los tipos que se pueden elegir al crear. Uno nuevo = una entrada aquí + `asistente.tipo.<tipo>` y `<tipo>Ayuda`. */
const TIPOS: TipoHabito[] = ['si_no', 'cuantitativo', 'evitar']

/**
 * Los pasos del método, en orden. Para añadir uno (tipo, intención, entorno, recompensa…):
 * una entrada aquí con los campos que rellena, y sus textos en `asistente.<clave>.*` (titulo, ayuda).
 * «Ahora no» devuelve sus `campos` a como estaban al abrir el asistente y pasa al siguiente.
 */
const PASOS: {
  clave: string
  campos: (keyof Borrador)[]
  opcional: boolean
  visible?: (p: PropsPaso) => boolean
  Campo: (p: PropsPaso) => ReactNode
}[] = [
  { clave: 'nombre', campos: ['nombre'], opcional: false, Campo: PasoNombre },
  {
    clave: 'identidad',
    campos: ['identidadId'],
    opcional: true,
    visible: ({ identidades }) => identidades.length > 1,
    Campo: PasoIdentidad,
  },
  {
    clave: 'tipo',
    campos: ['tipo', 'cuantitativo'],
    opcional: true,
    // Al editar, el tipo no cambia: el paso solo sale para ajustar el objetivo de un cuantitativo.
    visible: ({ editando, borrador }) => !editando || borrador.tipo === 'cuantitativo',
    Campo: PasoTipo,
  },
  { clave: 'frecuencia', campos: ['frecuencia'], opcional: true, visible: noEvitar, Campo: PasoFrecuencia },
  // En un cuantitativo, la versión mínima es su objetivo mínimo.
  {
    clave: 'versiones',
    campos: ['versionMinima', 'versionCompleta'],
    opcional: true,
    visible: ({ borrador }) => borrador.tipo === 'si_no',
    Campo: PasoVersiones,
  },
  // Las leyes para construir; al evitar, sus inversas (sin intención: no hay nada que recordar).
  { clave: 'intencion', campos: ['intencion'], opcional: true, visible: noEvitar, Campo: PasoIntencion },
  { clave: 'entorno', campos: ['entorno'], opcional: true, visible: noEvitar, Campo: PasoEntorno },
  { clave: 'recompensa', campos: ['recompensaAsociada'], opcional: true, visible: noEvitar, Campo: PasoRecompensa },
  // Leyes inversas (hábito a evitar): invisible, difícil y qué haré en su lugar.
  ...(['senal', 'friccion', 'sustituto'] as const).map((clave) => ({
    clave,
    campos: [clave],
    opcional: true,
    visible: ({ borrador }: PropsPaso) => borrador.tipo === 'evitar',
    Campo: (p: PropsPaso) => <PasoLey {...p} campo={clave} />,
  })),
]

function noEvitar({ borrador }: PropsPaso) {
  return borrador.tipo !== 'evitar'
}

/** Crear (`/nuevo`) y editar (`/habito/:id`) son el mismo asistente. */
export default function AsistenteHabito() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const ajustes = useAjustes()
  const datos = useLiveQuery(async () => {
    const [identidades, habitos] = await Promise.all([db.identidades.orderBy('orden').toArray(), db.habitos.orderBy('orden').toArray()])
    return { identidades, habitos, habito: habitos.find((h) => h.id === id) ?? null }
  }, [id])

  if (!datos || !ajustes) return null
  const { habito, habitos, identidades } = datos
  if (id && !habito) return <NoExiste />
  const general = identidades.find((i) => i.esGeneral)!
  // Desde Hoy filtrado, la identidad del filtro viene elegida.
  const pedida = identidades.find((i) => i.id === params.get('identidad') && !i.archivada)
  const inicial: Borrador = habito
    ? { ...habito, ...habito.leyesInversas }
    : {
        nombre: '',
        identidadId: (pedida ?? general).id,
        tipo: 'si_no',
        frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
      }
  return (
    <Asistente
      key={id ?? 'nuevo'}
      inicial={inicial}
      habito={habito ?? undefined}
      // Las archivadas no se ofrecen, salvo la que ya tiene el hábito.
      identidades={identidades.filter((i) => !i.archivada || i.id === inicial.identidadId)}
      habitos={habitos}
      paso={params.get('paso') ?? undefined}
      guardar={async ({ senal, friccion, sustituto, ...resto }) => {
        const b = { ...resto, leyesInversas: { senal, friccion, sustituto } }
        if (habito) await db.habitos.put(editarHabito(habito, b, new Date(), ajustes))
        else await db.habitos.add(conId<Habito>(nuevoHabito({ ...b, orden: await db.habitos.count() }, new Date(), ajustes)))
      }}
    />
  )
}

/** También lo usan los primeros pasos, con menos pasos y su propio final. */
export function Asistente({
  inicial,
  habito,
  identidades,
  habitos,
  paso: pasoPedido,
  guardar,
  claves,
  titulo,
  atras,
  alTerminar,
}: {
  inicial: Borrador
  habito?: Habito
  identidades: Identidad[]
  habitos: Habito[]
  /** `?paso=<clave>`: abre directamente ese paso (lo usa el diagnóstico). */
  paso?: string
  guardar: (b: Borrador) => Promise<void>
  /** Solo estos pasos de `PASOS` (por defecto, todos). */
  claves?: string[]
  titulo?: string
  /** «Atrás» desde el primer paso; por defecto, «Cancelar» vuelve a Hoy. */
  atras?: () => void
  /** Tras guardar; por defecto, vuelve a Hoy. */
  alTerminar?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [borrador, setBorrador] = useState(inicial)
  const cambiar = (c: Partial<Borrador>) => setBorrador((b) => ({ ...b, ...c }))
  const anclas = anclasPosibles(habito?.id, habitos)
  const props = { borrador, cambiar, identidades, habitos, anclas, editando: !!habito, titulo: 'paso-titulo' }
  const pasos = PASOS.filter((p) => (!claves || claves.includes(p.clave)) && (!p.visible || p.visible(props)))
  const [n, setN] = useState(() => Math.max(0, pasos.findIndex((p) => p.clave === pasoPedido)))
  const paso = pasos[n]
  const ultimo = n === pasos.length - 1

  // Al cambiar de paso, el foco va a su título (al abrir, lo coge el campo del nombre).
  const tituloRef = useRef<HTMLHeadingElement>(null)
  // Abierto en un paso pedido, el foco empieza también en su título.
  const anterior = useRef(0)
  useEffect(() => {
    if (anterior.current !== n) tituloRef.current?.focus()
    anterior.current = n
  }, [n])

  const formulario = useRef<HTMLFormElement>(null)
  const terminar = async () => {
    if (!borrador.nombre.trim()) return setN(0)
    // «Guardar» desde un paso a medias: que el navegador avise del campo que falta.
    if (!formulario.current?.reportValidity()) return
    await guardar(borrador)
    if (alTerminar) alTerminar()
    else navigate('/')
  }
  const siguiente = (e?: FormEvent) => {
    e?.preventDefault()
    if (ultimo) void terminar()
    else setN(n + 1)
  }
  const ahoraNo = () => {
    cambiar(Object.fromEntries(paso.campos.map((c) => [c, inicial[c]])))
    siguiente()
  }

  return (
    <div className="space-y-6">
      <form ref={formulario} onSubmit={siguiente} className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">{titulo ?? t(habito ? 'asistente.editar' : 'nuevo.titulo')}</h1>
          <p className="text-muted-foreground">{t('asistente.paso', { n: n + 1, total: pasos.length })}</p>
        </header>

        <section className="space-y-4">
          <h2 id="paso-titulo" ref={tituloRef} tabIndex={-1} className="text-xl font-bold outline-none">
            {t(`asistente.${paso.clave}.titulo`)}
          </h2>
          <p className="flex gap-2 rounded-lg bg-accent p-3 text-accent-foreground">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <span className="sr-only">{t('asistente.pepita')} </span>
              {t(`asistente.${paso.clave}.ayuda`)}
            </span>
          </p>
          <paso.Campo {...props} />
        </section>

        <div className="flex flex-col gap-3">
          <Button type="submit">{t(ultimo ? (habito ? 'asistente.guardar' : 'nuevo.crear') : 'asistente.siguiente')}</Button>
          {paso.opcional && (
            <Button type="button" variant="secondary" onClick={ahoraNo}>
              {t('asistente.ahoraNo')}
            </Button>
          )}
          {/* Al editar, se puede guardar desde cualquier paso. */}
          {habito && !ultimo && (
            <Button type="button" variant="secondary" onClick={terminar}>
              {t('asistente.guardar')}
            </Button>
          )}
          {n > 0 || atras ? (
            <Button type="button" variant="ghost" onClick={() => (n > 0 ? setN(n - 1) : atras?.())}>
              {t('asistente.atras')}
            </Button>
          ) : (
            <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
              {t('nuevo.cancelar')}
            </Link>
          )}
        </div>
      </form>

      {habito && (
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-xl font-bold">{t('habito.mas')}</h2>
          <p className="text-muted-foreground">{t('habito.archivarAyuda')}</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await db.habitos.update(habito.id, { archivado: !habito.archivado })
              navigate(habito.archivado ? '/' : '/archivados')
            }}
          >
            {habito.archivado ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
            {t(habito.archivado ? 'habito.recuperar' : 'habito.archivar')}
          </Button>
          <BorrarHabito habito={habito} alBorrar={() => navigate('/')} />
        </section>
      )}
    </div>
  )
}

function PasoNombre({ borrador, cambiar, titulo }: PropsPaso) {
  const { t } = useTranslation()
  return (
    <Input
      aria-labelledby={titulo}
      value={borrador.nombre}
      onChange={(e) => cambiar({ nombre: e.target.value })}
      placeholder={t('nuevo.ejemplo')}
      required
      autoFocus
      autoComplete="off"
    />
  )
}

function PasoIdentidad({ borrador, cambiar, identidades, titulo }: PropsPaso) {
  const { t } = useTranslation()
  return (
    <Select aria-labelledby={titulo} value={borrador.identidadId} onChange={(e) => cambiar({ identidadId: e.target.value })}>
      {identidades.map((i) => (
        <option key={i.id} value={i.id}>
          {nombreIdentidad(i, t)}
        </option>
      ))}
    </Select>
  )
}

function PasoTipo({ borrador, cambiar, editando }: PropsPaso) {
  const { t } = useTranslation()
  return (
    <>
      {!editando && (
        <fieldset className="space-y-3">
          {/* El título del paso ya hace la pregunta. */}
          <legend className="sr-only">{t('asistente.tipo.titulo')}</legend>
          {TIPOS.map((tipo) => (
            <label
              key={tipo}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="tipo"
                className="mt-0.5 size-5 shrink-0 accent-primary"
                checked={borrador.tipo === tipo}
                onChange={() =>
                  cambiar({
                    tipo,
                    cuantitativo: tipo === 'cuantitativo' ? (borrador.cuantitativo ?? { unidad: '', objetivo: 0, modo: 'al_menos' }) : undefined,
                  })
                }
              />
              <span>
                <span className="block font-bold">{t(`asistente.tipo.${tipo}`)}</span>
                <span className="block text-sm text-muted-foreground">{t(`asistente.tipo.${tipo}Ayuda`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {borrador.tipo === 'cuantitativo' && borrador.cuantitativo && (
        <CamposCuantitativo valor={borrador.cuantitativo} cambiar={(cuantitativo) => cambiar({ cuantitativo })} />
      )}
    </>
  )
}

function PasoLey({ borrador, cambiar, titulo, campo }: PropsPaso & { campo: keyof LeyesInversas }) {
  const { t } = useTranslation()
  return (
    <Input
      aria-labelledby={titulo}
      value={borrador[campo] ?? ''}
      onChange={(e) => cambiar({ [campo]: e.target.value })}
      placeholder={t(`asistente.${campo}.ejemplo`)}
      autoComplete="off"
    />
  )
}

function PasoFrecuencia({ borrador, cambiar }: PropsPaso) {
  return (
    <SelectorFrecuencia
      valor={borrador.frecuencia}
      cambiar={(frecuencia) => cambiar({ frecuencia })}
      soloPeriodo={borrador.tipo === 'cuantitativo'}
    />
  )
}

function PasoVersiones({ borrador, cambiar }: PropsPaso) {
  const { t } = useTranslation()
  return (
    <>
      {(['versionMinima', 'versionCompleta'] as const).map((campo) => (
        <div key={campo} className="space-y-2">
          <Label htmlFor={campo}>{t(`asistente.versiones.${campo}`)}</Label>
          <Input
            id={campo}
            value={borrador[campo] ?? ''}
            onChange={(e) => cambiar({ [campo]: e.target.value })}
            placeholder={t(`asistente.versiones.${campo}Ejemplo`)}
            autoComplete="off"
          />
        </div>
      ))}
    </>
  )
}

type ModoCuando = '' | 'hora' | 'despuesDeHabitoId' | 'despuesDeAccion'

function PasoIntencion({ borrador, cambiar, habitos, anclas }: PropsPaso) {
  const { t } = useTranslation()
  const { cuando, donde } = borrador.intencion ?? {}
  const modo = (cuando ? Object.keys(cuando)[0] : '') as ModoCuando
  const valor = cuando ? Object.values(cuando)[0] : ''
  const intencion = (c: Intencion) => cambiar({ intencion: { cuando, donde, ...c } })
  const frase = fraseIntencion(borrador, habitos)
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="cuando">{t('asistente.intencion.cuando')}</Label>
        <Select
          id="cuando"
          value={modo}
          onChange={(e) => {
            const m = e.target.value as ModoCuando
            intencion({ cuando: m ? ({ [m]: m === 'despuesDeHabitoId' ? (anclas[0]?.id ?? '') : '' } as Cuando) : undefined })
          }}
        >
          <option value="">{t('asistente.intencion.sinDecidir')}</option>
          <option value="hora">{t('asistente.intencion.cuandoHora')}</option>
          {(anclas.length > 0 || modo === 'despuesDeHabitoId') && (
            <option value="despuesDeHabitoId">{t('asistente.intencion.cuandoHabito')}</option>
          )}
          <option value="despuesDeAccion">{t('asistente.intencion.cuandoAccion')}</option>
        </Select>
      </div>
      {modo === 'hora' && (
        <div className="space-y-2">
          <Label htmlFor="hora">{t('asistente.intencion.hora')}</Label>
          <Input id="hora" type="time" value={valor} onChange={(e) => intencion({ cuando: { hora: e.target.value } })} />
        </div>
      )}
      {modo === 'despuesDeHabitoId' && (
        <div className="space-y-2">
          <Label htmlFor="ancla">{t('asistente.intencion.habito')}</Label>
          {/* Un ancla archivada o borrada no se ofrece: queda «Elige un hábito». */}
          <Select
            id="ancla"
            value={anclas.some((h) => h.id === valor) ? valor : ''}
            onChange={(e) => intencion({ cuando: { despuesDeHabitoId: e.target.value } })}
          >
            <option value="" disabled>
              {t('asistente.intencion.elige')}
            </option>
            {anclas.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </Select>
        </div>
      )}
      {modo === 'despuesDeAccion' && (
        <div className="space-y-2">
          <Label htmlFor="accion">{t('asistente.intencion.accion')}</Label>
          <Input
            id="accion"
            value={valor}
            onChange={(e) => intencion({ cuando: { despuesDeAccion: e.target.value } })}
            placeholder={t('asistente.intencion.accionEjemplo')}
            autoComplete="off"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="donde">{t('asistente.intencion.donde')}</Label>
        <Input
          id="donde"
          value={donde ?? ''}
          onChange={(e) => intencion({ donde: e.target.value })}
          placeholder={t('asistente.intencion.dondeEjemplo')}
          autoComplete="off"
        />
      </div>
      <div aria-live="polite" className="space-y-1">
        {frase && (
          <>
            <p className="text-sm text-muted-foreground">{t('asistente.intencion.vistaPrevia')}</p>
            <p className="rounded-lg border p-3 font-semibold break-words first-letter:uppercase">{textoFrase(frase, t)}</p>
          </>
        )}
      </div>
    </>
  )
}

function PasoEntorno({ borrador, cambiar }: PropsPaso) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <Label htmlFor="entorno">{t('asistente.entorno.lista')}</Label>
      {/* Una cosa por línea: las líneas vacías no se guardan. */}
      <textarea
        id="entorno"
        rows={4}
        value={(borrador.entorno ?? []).join('\n')}
        onChange={(e) => cambiar({ entorno: e.target.value.split('\n') })}
        placeholder={t('asistente.entorno.ejemplo')}
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-base placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
    </div>
  )
}

function PasoRecompensa({ borrador, cambiar, titulo }: PropsPaso) {
  const { t } = useTranslation()
  return (
    <Input
      aria-labelledby={titulo}
      value={borrador.recompensaAsociada ?? ''}
      onChange={(e) => cambiar({ recompensaAsociada: e.target.value })}
      placeholder={t('asistente.recompensa.ejemplo')}
      autoComplete="off"
    />
  )
}

function NoExiste() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <p>{t('habito.noExiste')}</p>
      <Link to="/" className={buttonVariants()}>
        {t('ajustes.volver')}
      </Link>
    </div>
  )
}
