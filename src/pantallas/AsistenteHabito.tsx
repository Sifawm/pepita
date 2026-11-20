import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BorrarHabito } from '@/components/BorrarHabito'
import { SelectorFrecuencia } from '@/components/SelectorFrecuencia'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { conId, db, useAjustes } from '@/db'
import { editarHabito, nuevoHabito, type CamposHabito, type Habito, type Identidad, type LeyesInversas, type TipoHabito } from '@/dominio'
import { nombreIdentidad } from '@/lib/utils'

/** Las leyes inversas van sueltas: cada una es un paso que se puede saltar por separado. */
type Borrador = Omit<CamposHabito, 'leyesInversas'> & LeyesInversas & { tipo: TipoHabito }
interface PropsPaso {
  borrador: Borrador
  cambiar: (c: Partial<Borrador>) => void
  identidades: Identidad[]
  /** El tipo solo se elige al crear: cambiarlo reinterpretaría toda la historia. */
  editando: boolean
  /** Id del título del paso, para nombrar el campo cuando es uno solo. */
  titulo: string
}

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
  // Ticket 10 añade aquí «cuantitativo».
  { clave: 'tipo', campos: ['tipo'], opcional: true, visible: ({ editando }) => !editando, Campo: PasoTipo },
  { clave: 'frecuencia', campos: ['frecuencia'], opcional: true, visible: noEvitar, Campo: PasoFrecuencia },
  { clave: 'versiones', campos: ['versionMinima', 'versionCompleta'], opcional: true, visible: noEvitar, Campo: PasoVersiones },
  // Leyes inversas (hábito a evitar): invisible, difícil y qué haré en su lugar.
  ...(['senal', 'friccion', 'sustituto'] as const).map((clave) => ({
    clave,
    campos: [clave],
    opcional: true,
    visible: ({ borrador }: PropsPaso) => borrador.tipo === 'evitar',
    Campo: (p: PropsPaso) => <PasoLey {...p} campo={clave} />,
  })),
  // Ticket 09: intención (cuándo y dónde), entorno y recompensa asociada.
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
    const [identidades, habito] = await Promise.all([
      db.identidades.orderBy('orden').toArray(),
      id ? db.habitos.get(id) : undefined,
    ])
    return { identidades, habito: habito ?? null }
  }, [id])

  if (!datos || !ajustes) return null
  const { habito, identidades } = datos
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
      guardar={async ({ senal, friccion, sustituto, ...resto }) => {
        const b = { ...resto, leyesInversas: { senal, friccion, sustituto } }
        if (habito) await db.habitos.put(editarHabito(habito, b, new Date(), ajustes))
        else await db.habitos.add(conId<Habito>(nuevoHabito({ ...b, orden: await db.habitos.count() }, new Date(), ajustes)))
      }}
    />
  )
}

function Asistente({
  inicial,
  habito,
  identidades,
  guardar,
}: {
  inicial: Borrador
  habito?: Habito
  identidades: Identidad[]
  guardar: (b: Borrador) => Promise<void>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [borrador, setBorrador] = useState(inicial)
  const cambiar = (c: Partial<Borrador>) => setBorrador((b) => ({ ...b, ...c }))
  const props = { borrador, cambiar, identidades, editando: !!habito, titulo: 'paso-titulo' }
  const pasos = PASOS.filter((p) => !p.visible || p.visible(props))
  const [n, setN] = useState(0)
  const paso = pasos[n]
  const ultimo = n === pasos.length - 1

  // Al cambiar de paso, el foco va a su título (al abrir, lo coge el campo del nombre).
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const anterior = useRef(n)
  useEffect(() => {
    if (anterior.current !== n) tituloRef.current?.focus()
    anterior.current = n
  }, [n])

  const terminar = async () => {
    if (!borrador.nombre.trim()) return setN(0)
    await guardar(borrador)
    navigate('/')
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
      <form onSubmit={siguiente} className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">{t(habito ? 'asistente.editar' : 'nuevo.titulo')}</h1>
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
          {n > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setN(n - 1)}>
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

function PasoTipo({ borrador, cambiar }: PropsPaso) {
  const { t } = useTranslation()
  return (
    <fieldset className="space-y-3">
      {/* El título del paso ya hace la pregunta. */}
      <legend className="sr-only">{t('asistente.tipo.titulo')}</legend>
      {(['si_no', 'evitar'] as const).map((tipo) => (
        <label
          key={tipo}
          className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring"
        >
          <input
            type="radio"
            name="tipo"
            className="mt-0.5 size-5 shrink-0 accent-primary"
            checked={borrador.tipo === tipo}
            onChange={() => cambiar({ tipo })}
          />
          <span>
            <span className="block font-bold">{t(`asistente.tipo.${tipo}`)}</span>
            <span className="block text-sm text-muted-foreground">{t(`asistente.tipo.${tipo}Ayuda`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
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
  return <SelectorFrecuencia valor={borrador.frecuencia} cambiar={(frecuencia) => cambiar({ frecuencia })} />
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
