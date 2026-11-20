import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { SumarValor } from '@/components/Cuantitativo'
import { Diagnosticos } from '@/components/Diagnostico'
import { SugerenciaEscalado } from '@/components/Escalado'
import { GraficoSerie } from '@/components/GraficoSerie'
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
  mapaDeCalor,
  sugerenciaEscalado,
  sumarDias,
  type Ajustes,
  type AnotacionDeFallo,
  type DiaCalendario,
  type Dia,
  type EstadoPeriodo,
  type EvaluacionHabito,
  type Frecuencia,
  type Habito as THabito,
  type Ley,
  type Registro,
} from '@/dominio'
import { cn, enfocar, fechaDia } from '@/lib/utils'

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

/** Detalle de un hábito: fuerza, mapa de calor, mínima/completa, calendario para editar cualquier día pasado y cambio de frecuencia. */
export default function Habito() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const ajustes = useAjustes()
  const datos = useLiveQuery(async () => ({
    habito: await db.habitos.get(id),
    registros: await db.registros.where('habitoId').equals(id).toArray(),
    diagnosticos: await db.diagnosticos.where('habitoId').equals(id).toArray(),
    sugerenciasDescartadas: await db.sugerenciasDescartadas.where('habitoId').equals(id).toArray(),
  }), [id])

  if (!datos || !ajustes) return null
  if (!datos.habito)
    return (
      <div className="space-y-6">
        <p>{t('habito.noExiste')}</p>
        <Volver />
      </div>
    )

  const ahora = new Date()
  const evaluacion = evaluarHabito({ ...datos, habito: datos.habito, ahora, ajustes })
  // El sin responder (pendiente o pospuesto): como mucho uno por hábito.
  const diagnostico = datos.diagnosticos.find((d) => d.estado === 'pendiente' || d.estado === 'pospuesto')

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold break-words">{datos.habito.nombre}</h1>
        {/* En segundo plano: la racha es referencia, no lo principal. */}
        <p className="text-sm text-muted-foreground">
          {t('recuperacion.racha', { ...evaluacion.racha })}
          {' · '}
          {t('recuperacion.rachaAyuda')}
        </p>
      </header>
      <Diagnosticos items={diagnostico ? [{ diagnostico, habito: datos.habito }] : []} />
      {!datos.habito.archivado && (
        <SugerenciaEscalado habito={datos.habito} sugerencia={sugerenciaEscalado({ ...datos, habito: datos.habito, ahora, ajustes })} ajustes={ajustes} />
      )}
      <Fuerza evaluacion={evaluacion} hoy={diaLogico(ahora, ajustes.horaCierre)} />
      <MapaDeCalor habito={datos.habito} registros={datos.registros} ahora={ahora} ajustes={ajustes} />
      {/* Al evitar no hay versiones: todo día limpio es completo. */}
      {datos.habito.tipo !== 'evitar' && <Proporcion {...evaluacion.proporcion} />}
      <Calendario habito={datos.habito} registros={datos.registros} ajustes={ajustes} />
      {/* Al evitar, el periodo es siempre el día. */}
      {datos.habito.tipo !== 'evitar' && <CambiarFrecuencia key={datos.habito.id} habito={datos.habito} ajustes={ajustes} />}
      <Link to={`/habito/${id}/editar`} className={buttonVariants({ variant: 'secondary', className: 'w-full' })}>
        {t('asistente.editar')}
      </Link>
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

function Fuerza({ evaluacion: { fuerza }, hoy }: { evaluacion: EvaluacionHabito; hoy: Dia }) {
  const { t } = useTranslation()
  const puntos = fuerza.map((p) => ({ dia: p.dia, valor: Math.round(p.valor * 100) }))
  return (
    <section aria-labelledby="fuerza" className="space-y-3">
      <h2 id="fuerza" className="text-xl font-bold">
        {t('detalleHabito.fuerza')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('detalleHabito.fuerzaAyuda')}</p>
      {puntos.length ? (
        <GraficoSerie
          puntos={puntos}
          hasta={hoy}
          maximo={100}
          resumen={t('detalleHabito.resumenFuerza', { valor: puntos.at(-1)!.valor })}
          columnas={[t('detalleHabito.columnaDia'), t('detalleHabito.columnaFuerza')]}
        />
      ) : (
        <p className="text-muted-foreground">{t('detalleHabito.sinEmpezar')}</p>
      )}
    </section>
  )
}

const SEMANAS_MAPA = 26

// Celdas pequeñas: relleno = completa, claro = mínima, borde discontinuo = sin hacer, punteado = saltado,
// gris = en pausa. La leyenda con el recuento de días es la alternativa textual.
const CELDA: Record<EstadoPeriodo, string> = {
  cumplido_completa: 'bg-primary',
  cumplido_minima: 'bg-primary/40',
  fallido: 'border border-dashed border-muted-foreground',
  en_curso: 'border border-input',
  no_programado: '',
  saltado: 'border border-dotted border-muted-foreground',
  pausado: 'bg-muted',
}

function MapaDeCalor({ habito, registros, ahora, ajustes }: { habito: THabito; registros: Registro[]; ahora: Date; ajustes: Ajustes }) {
  const { t, i18n } = useTranslation()
  const mapa = mapaDeCalor({ habito, registros, semanas: SEMANAS_MAPA, ahora, ajustes })
  if (!mapa.dias.length) return null
  const nombreEstado = (e: EstadoPeriodo) => t(habito.tipo === 'evitar' ? `evitar.estado.${e}` : `habito.estado.${e}`)
  const estados = (['cumplido_completa', 'cumplido_minima', 'fallido', 'saltado', 'pausado'] as const).filter(
    (e) => habito.tipo !== 'evitar' || e !== 'cumplido_minima',
  )
  return (
    <section aria-labelledby="mapa" className="space-y-3">
      <h2 id="mapa" className="text-xl font-bold">
        {t('detalleHabito.mapa')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('detalleHabito.mapaAyuda')} {fechaDia(mapa.desde, i18n.language)} – {fechaDia(mapa.hasta, i18n.language)}
      </p>
      <div
        aria-hidden
        className="grid grid-flow-col grid-rows-7 gap-0.5"
        style={{ gridTemplateColumns: `repeat(${mapa.dias.length / 7}, minmax(0, 1.25rem))` }}
      >
        {mapa.dias.map((d) => (
          <span key={d.dia} className={cn('aspect-square rounded-sm', d.estado && CELDA[d.estado])} />
        ))}
      </div>
      <ul aria-label={t('habito.leyenda')} className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {estados.map((e) => (
          <li key={e} className="flex items-center gap-2">
            <span aria-hidden className={cn('size-4 rounded-sm', CELDA[e])} />
            {nombreEstado(e)} · {t('detalleHabito.dias', { count: mapa.dias.filter((d) => d.estado === e).length })}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Proporcion({ minima, completa }: { minima: number; completa: number }) {
  const { t } = useTranslation()
  const total = minima + completa
  return (
    <section aria-labelledby="proporcion" className="space-y-3">
      <h2 id="proporcion" className="text-xl font-bold">
        {t('detalleHabito.proporcion')}
      </h2>
      {total ? (
        <>
          <div aria-hidden className="flex h-3 overflow-hidden rounded-full">
            <div className="bg-primary/40" style={{ width: `${(minima / total) * 100}%` }} />
            <div className="flex-1 bg-primary" />
          </div>
          <p className="font-semibold">{t('detalleHabito.proporcionTexto', { minima, completa })}</p>
          <p className="text-sm text-muted-foreground">{t('detalleHabito.proporcionAyuda')}</p>
        </>
      ) : (
        <p className="text-muted-foreground">{t('detalleHabito.sinProporcion')}</p>
      )}
    </section>
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
  const nombreEstado = (e: EstadoPeriodo) => t(habito.tipo === 'evitar' ? `evitar.estado.${e}` : `habito.estado.${e}`)
  const etiqueta = (d: DiaCalendario) =>
    [largo(d.dia), d.estado && nombreEstado(d.estado), t('habito.registros', { count: d.registros.length })]
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
              {d.registros.some((r) => r.tipo === 'minima' || r.tipo === 'completa') && <Check aria-hidden className="size-3" />}
            </button>
          )
        })}
      </div>

      <ul aria-label={t('habito.leyenda')} className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {(['cumplido_completa', 'cumplido_minima', 'fallido', 'en_curso', 'saltado', 'pausado'] as const)
          .filter((e) => habito.tipo !== 'evitar' || e !== 'cumplido_minima')
          .map((e) => (
            <li key={e} className="flex items-center gap-2">
              <span aria-hidden className={cn('size-5 rounded border-2', ESTILO[e])} />
              {nombreEstado(e)}
            </li>
          ))}
      </ul>

      {dia && <EditarDia habito={habito} dia={dia} titulo={largo(dia.dia)} nombreEstado={nombreEstado} />}
    </section>
  )
}

/** Registrar, corregir o deshacer un día. La evaluación se recalcula sola al cambiar los registros. */
function EditarDia({
  habito,
  dia,
  titulo,
  nombreEstado,
}: {
  habito: THabito
  dia: DiaCalendario
  titulo: string
  nombreEstado: (e: EstadoPeriodo) => string
}) {
  const { t, i18n } = useTranslation()
  const anadir = (tipo: Registro['tipo'], valor?: number) =>
    db.registros.add(conId<Registro>({ habitoId: habito.id, dia: dia.dia, tipo, ...(valor !== undefined && { valor }) }))
  const c = habito.cuantitativo

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 id="dia-titulo" tabIndex={-1} className="text-lg font-semibold outline-none first-letter:uppercase">
        {titulo}
      </h3>
      <p aria-live="polite" className="text-muted-foreground">
        {dia.estado && `${nombreEstado(dia.estado)} · `}
        {dia.registros.length ? t('habito.registros', { count: dia.registros.length }) : t('habito.sinRegistros')}
      </p>
      {dia.registros.length > 0 && (
        <ul className="space-y-2">
          {dia.registros.map((r) => {
            const otro = r.tipo === 'minima' ? 'completa' : 'minima'
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span className="flex-1 font-semibold">
                  {r.tipo === 'valor' ? `${r.valor?.toLocaleString(i18n.language)} ${c?.unidad}` : t(`habito.tipo.${r.tipo}`)}
                  {(r.motivo ?? r.disparador) && <span className="font-normal text-muted-foreground"> · {r.motivo ?? r.disparador}</span>}
                </span>
                {(r.tipo === 'minima' || r.tipo === 'completa') && (
                  <Button variant="secondary" onClick={() => db.registros.update(r.id, { tipo: otro })}>
                    {t(`habito.pasarA.${otro}`)}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => db.registros.delete(r.id).then(() => enfocar('dia-titulo'))}>
                  {t('habito.deshacer')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {c ? (
        <SumarValor unidad={c.unidad} nombre={habito.nombre} sumar={(valor) => anadir('valor', valor)} />
      ) : habito.tipo === 'evitar' ? (
        <Button variant="secondary" onClick={() => anadir('recaida')}>
          {t('evitar.anadir')}
        </Button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => anadir('minima')}>{t('habito.anadir.minima')}</Button>
          <Button variant="secondary" onClick={() => anadir('completa')}>
            {t('habito.anadir.completa')}
          </Button>
        </div>
      )}
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
      <SelectorFrecuencia
        valor={frecuencia}
        cambiar={(f) => (setFrecuencia(f), setGuardada(false))}
        soloPeriodo={habito.tipo === 'cuantitativo'}
      />
      <Button type="submit" disabled={igual}>
        {t('habito.guardarFrecuencia')}
      </Button>
      <p aria-live="polite" className="text-sm font-semibold text-primary">
        {guardada && t('habito.frecuenciaGuardada')}
      </p>
    </form>
  )
}
