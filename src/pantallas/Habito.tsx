import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { SelectorFrecuencia } from '@/components/SelectorFrecuencia'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { conId, db, useAjustes } from '@/db'
import {
  calendarioHabito,
  cambiarRegla,
  diaDeLaSemana,
  diaLogico,
  evaluarHabito,
  sumarDias,
  type Ajustes,
  type AnotacionDeFallo,
  type DiaCalendario,
  type Dia,
  type EstadoPeriodo,
  type Frecuencia,
  type Habito as THabito,
  type Ley,
  type Registro,
} from '@/dominio'
import { cn } from '@/lib/utils'

const fechaDe = (dia: Dia) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d)
}

// Forma, además de color (WCAG 1.4.1): relleno = completa, claro = mínima, discontinuo = sin hacer,
// punteado = saltado, gris sin borde = en pausa.
const ESTILO: Record<EstadoPeriodo, string> = {
  cumplido_completa: 'border-primary bg-primary text-primary-foreground',
  cumplido_minima: 'border-primary bg-accent',
  fallido: 'border-dashed border-input',
  en_curso: 'border-input',
  no_programado: 'border-transparent text-muted-foreground',
  saltado: 'border-dotted border-input text-muted-foreground',
  pausado: 'border-transparent bg-muted text-muted-foreground',
}

/** Detalle de un hábito: calendario para editar cualquier día pasado y cambio de frecuencia. */
export default function Habito() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const ajustes = useAjustes()
  const datos = useLiveQuery(async () => ({
    habito: await db.habitos.get(id),
    registros: await db.registros.where('habitoId').equals(id).toArray(),
  }), [id])

  if (!datos || !ajustes) return null
  if (!datos.habito)
    return (
      <div className="space-y-6">
        <p>{t('habito.noExiste')}</p>
        <Volver />
      </div>
    )

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold break-words">{datos.habito.nombre}</h1>
        {/* En segundo plano: la racha es referencia, no lo principal. */}
        <p className="text-sm text-muted-foreground">
          {t('recuperacion.racha', { ...evaluarHabito({ ...datos, habito: datos.habito, ahora: new Date(), ajustes }).racha })}
          {' · '}
          {t('recuperacion.rachaAyuda')}
        </p>
      </header>
      <Calendario habito={datos.habito} registros={datos.registros} ajustes={ajustes} />
      <CambiarFrecuencia key={datos.habito.id} habito={datos.habito} ajustes={ajustes} />
      <Volver />
    </div>
  )
}

function Volver() {
  const { t } = useTranslation()
  return (
    <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
      {t('habito.volver')}
    </Link>
  )
}

function Calendario({ habito, registros, ajustes }: { habito: THabito; registros: Registro[]; ajustes: Ajustes }) {
  const { t, i18n } = useTranslation()
  const ahora = new Date()
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  const [mes, setMes] = useState(hoy)
  const [elegido, setElegido] = useState<Dia>(hoy)
  const calendario = calendarioHabito({ habito, registros, mes, ahora, ajustes })
  const dia = calendario.dias.find((d) => d.dia === elegido && d.editable)
  const largo = (d: Dia) => fechaDe(d).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  const etiqueta = (d: DiaCalendario) =>
    [largo(d.dia), d.estado && t(`habito.estado.${d.estado}`), t('habito.registros', { count: d.registros.length })]
      .filter(Boolean)
      .join(' · ')

  return (
    <section aria-labelledby="calendario" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="min-w-11 px-0" aria-label={t('habito.mesAnterior')} disabled={calendario.desde <= habito.fechaInicio} onClick={() => setMes(sumarDias(calendario.desde, -1))}>
          <ChevronLeft aria-hidden />
        </Button>
        <h2 id="calendario" className="text-xl font-bold first-letter:uppercase" aria-live="polite">
          {fechaDe(calendario.desde).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
        </h2>
        <Button variant="ghost" className="min-w-11 px-0" aria-label={t('habito.mesSiguiente')} disabled={calendario.hasta >= hoy} onClick={() => setMes(sumarDias(calendario.hasta, 1))}>
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t('habito.ayuda')}</p>

      <div className="grid grid-cols-7 gap-1 text-center">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d} aria-hidden className="text-xs font-semibold text-muted-foreground capitalize">
            {new Date(2024, 0, d).toLocaleDateString(i18n.language, { weekday: 'narrow' })}
          </span>
        ))}
        {/* La semana empieza el lunes: huecos hasta el día 1. */}
        {Array.from({ length: diaDeLaSemana(calendario.desde) - 1 }, (_, i) => (
          <span key={`hueco${i}`} aria-hidden />
        ))}
        {calendario.dias.map((d) => {
          const numero = Number(d.dia.slice(8))
          if (!d.editable)
            return (
              <span key={d.dia} className="flex min-h-11 items-center justify-center text-muted-foreground" aria-hidden>
                {numero}
              </span>
            )
          return (
            <button
              key={d.dia}
              type="button"
              aria-label={etiqueta(d)}
              aria-pressed={d.dia === dia?.dia}
              onClick={() => setElegido(d.dia)}
              className={cn(
                'relative flex min-h-11 flex-col items-center justify-center rounded-md border-2 font-semibold outline-none',
                'focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                d.estado && ESTILO[d.estado],
                d.dia === dia?.dia && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
              )}
            >
              <span aria-hidden>{numero}</span>
              {d.registros.some((r) => r.tipo !== 'salto') && <Check aria-hidden className="size-3" />}
            </button>
          )
        })}
      </div>

      <ul aria-label={t('habito.leyenda')} className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {(['cumplido_completa', 'cumplido_minima', 'fallido', 'en_curso', 'saltado', 'pausado'] as const).map((e) => (
          <li key={e} className="flex items-center gap-2">
            <span aria-hidden className={cn('size-5 rounded border-2', ESTILO[e])} />
            {t(`habito.estado.${e}`)}
          </li>
        ))}
      </ul>

      {dia && <EditarDia habito={habito} dia={dia} titulo={largo(dia.dia)} />}
    </section>
  )
}

/** Registrar, corregir o deshacer un día. La evaluación se recalcula sola al cambiar los registros. */
function EditarDia({ habito, dia, titulo }: { habito: THabito; dia: DiaCalendario; titulo: string }) {
  const { t } = useTranslation()
  const anadir = (tipo: Registro['tipo']) => db.registros.add(conId<Registro>({ habitoId: habito.id, dia: dia.dia, tipo }))

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-lg font-semibold first-letter:uppercase">{titulo}</h3>
      <p aria-live="polite" className="text-muted-foreground">
        {dia.estado && `${t(`habito.estado.${dia.estado}`)} · `}
        {dia.registros.length ? t('habito.registros', { count: dia.registros.length }) : t('habito.sinRegistros')}
      </p>
      {dia.registros.length > 0 && (
        <ul className="space-y-2">
          {dia.registros.map((r) => {
            const otro = r.tipo === 'minima' ? 'completa' : 'minima'
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span className="flex-1 font-semibold">
                  {t(`habito.tipo.${r.tipo}`)}
                  {r.motivo && <span className="font-normal text-muted-foreground"> · {r.motivo}</span>}
                </span>
                {r.tipo !== 'salto' && (
                  <Button variant="secondary" onClick={() => db.registros.update(r.id, { tipo: otro })}>
                    {t(`habito.pasarA.${otro}`)}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => db.registros.delete(r.id)}>
                  {t('habito.deshacer')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => anadir('minima')}>{t('habito.anadir.minima')}</Button>
        <Button variant="secondary" onClick={() => anadir('completa')}>
          {t('habito.anadir.completa')}
        </Button>
      </div>
      {dia.estado === 'fallido' && dia.periodo && <AnotarFallo habitoId={habito.id} periodo={dia.periodo} />}
    </div>
  )
}

/** Motivo opcional de un fallo (uno por periodo). Guardarlo vacío lo borra. */
function AnotarFallo({ habitoId, periodo }: { habitoId: string; periodo: Dia }) {
  const anotaciones = useLiveQuery(() => db.anotacionesDeFallo.where({ habitoId, periodo }).toArray(), [habitoId, periodo])
  if (!anotaciones) return null
  return <FormFallo key={`${habitoId} ${periodo}`} habitoId={habitoId} periodo={periodo} anotacion={anotaciones[0]} />
}

function FormFallo({ habitoId, periodo, anotacion }: { habitoId: string; periodo: Dia; anotacion?: AnotacionDeFallo }) {
  const { t } = useTranslation()
  const [ley, setLey] = useState(anotacion?.ley ? String(anotacion.ley) : '')
  const [nota, setNota] = useState(anotacion?.nota ?? '')
  const [guardada, setGuardada] = useState(false)

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const texto = nota.trim()
    const datos = { habitoId, periodo, ...(ley ? { ley: Number(ley) as Ley } : {}), ...(texto ? { nota: texto } : {}) }
    if (!ley && !texto) {
      if (anotacion) await db.anotacionesDeFallo.delete(anotacion.id)
    } else
      await db.anotacionesDeFallo.put(
        anotacion ? { id: anotacion.id, creadoEn: anotacion.creadoEn, ...datos } : conId<AnotacionDeFallo>(datos),
      )
    setGuardada(true)
  }

  return (
    <form onSubmit={guardar} aria-labelledby="anotar-fallo" className="space-y-3 border-t pt-3">
      <h4 id="anotar-fallo" className="font-semibold">
        {t('recuperacion.anotar')}
      </h4>
      <p className="text-sm text-muted-foreground">{t('recuperacion.anotarAyuda')}</p>
      <div className="space-y-2">
        <Label htmlFor="ley">{t('recuperacion.ley')}</Label>
        <Select id="ley" value={ley} onChange={(e) => (setLey(e.target.value), setGuardada(false))}>
          <option value="">{t('recuperacion.sinLey')}</option>
          {[1, 2, 3, 4].map((l) => (
            <option key={l} value={l}>
              {t(`recuperacion.leyes.${l}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nota-fallo">{t('recuperacion.nota')}</Label>
        <Input id="nota-fallo" value={nota} onChange={(e) => (setNota(e.target.value), setGuardada(false))} />
      </div>
      <Button type="submit" variant="secondary">
        {t('recuperacion.guardar')}
      </Button>
      <p aria-live="polite" className="text-sm font-semibold text-primary">
        {guardada && t('recuperacion.guardada')}
      </p>
    </form>
  )
}

function CambiarFrecuencia({ habito, ajustes }: { habito: THabito; ajustes: Ajustes }) {
  const { t } = useTranslation()
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(habito.frecuencia)
  const [guardada, setGuardada] = useState(false)
  const igual = JSON.stringify(frecuencia) === JSON.stringify(habito.frecuencia)

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    await db.habitos.put(cambiarRegla({ habito, regla: { frecuencia }, ahora: new Date(), ajustes }))
    setGuardada(true)
  }

  return (
    <form onSubmit={guardar} aria-labelledby="cambiar-frecuencia" className="space-y-4">
      <h2 id="cambiar-frecuencia" className="text-xl font-bold">
        {t('habito.frecuencia')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('habito.frecuenciaAyuda')}</p>
      <SelectorFrecuencia valor={frecuencia} cambiar={(f) => (setFrecuencia(f), setGuardada(false))} />
      <Button type="submit" disabled={igual}>
        {t('habito.guardarFrecuencia')}
      </Button>
      <p aria-live="polite" className="text-sm font-semibold text-primary">
        {guardada && t('habito.frecuenciaGuardada')}
      </p>
    </form>
  )
}
