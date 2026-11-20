import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { claveTexto } from '@/components/Escalado'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, guardarNotaSemanal, useAjustes } from '@/db'
import { diaLogico, revision, sumarDias, type CampoMetodo, type Habito, type Revision as DatosRevision } from '@/dominio'
import { cn, fechaDia, nombreIdentidad } from '@/lib/utils'

const SECCIONES = ['votos', 'recuperacion', 'diagnosticos', 'fallos', 'sugerencias', 'campos', 'nota'] as const
type Seccion = (typeof SECCIONES)[number]

/** El paso del asistente donde se rellena cada campo del método. */
const pasoDe = (campo: CampoMetodo, habito: Habito) =>
  campo === 'versionMinima' ? (habito.tipo === 'cuantitativo' ? 'tipo' : 'versiones') : campo

const esDia = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

const enlace =
  'inline-flex min-h-11 items-center rounded-md font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring'

/**
 * Revisión semanal: la semana (de lunes a domingo) en la URL (`?semana=`), su nota libre y una
 * vista para imprimir o guardar en PDF (`print:`), con el periodo y las secciones a elegir.
 */
export default function Revision() {
  const { t, i18n } = useTranslation()
  const ajustes = useAjustes()
  const [params, setParams] = useSearchParams()
  const datos = useLiveQuery(async () => {
    const [identidades, habitos, registros, diagnosticos, sugerenciasDescartadas, revisionesSemanales, anotacionesDeFallo] = await Promise.all([
      db.identidades.toArray(),
      db.habitos.toArray(),
      db.registros.toArray(),
      db.diagnosticos.toArray(),
      db.sugerenciasDescartadas.toArray(),
      db.revisionesSemanales.toArray(),
      db.anotacionesDeFallo.toArray(),
    ])
    return { identidades, habitos, registros, diagnosticos, sugerenciasDescartadas, revisionesSemanales, anotacionesDeFallo }
  })
  const [impresion, setImpresion] = useState<{ desde?: string; hasta?: string; secciones: Seccion[] }>({ secciones: [...SECCIONES] })

  if (!datos || !ajustes) return null
  const ahora = new Date()
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  const semana = revision({ ...datos, desde: esDia(params.get('semana')) ? params.get('semana')! : hoy, ahora, ajustes })
  const esActual = semana.hasta >= hoy
  const nota = semana.notas[0]?.nota ?? ''
  const largo = { day: 'numeric', month: 'long', year: 'numeric' } as const

  const desde = esDia(impresion.desde ?? null) ? impresion.desde! : semana.desde
  const hasta = esDia(impresion.hasta ?? null) && impresion.hasta! >= desde ? impresion.hasta! : desde > semana.hasta ? desde : semana.hasta
  const informe = revision({ ...datos, desde, hasta, ahora, ajustes })
  const irA = (dia: string) => setParams({ semana: dia }, { replace: true })

  return (
    <>
      <div className="space-y-8 print:hidden">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">{t('revision.titulo')}</h1>
          <p className="text-muted-foreground">{t('revision.intro')}</p>
        </header>

        <nav aria-label={t('revision.semanas')} className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="min-w-11 px-0" aria-label={t('revision.anterior')} onClick={() => irA(sumarDias(semana.desde, -7))}>
            <ChevronLeft aria-hidden />
          </Button>
          <p className="text-center font-semibold" aria-live="polite">
            {t('revision.semana', { desde: fechaDia(semana.desde, i18n.language), hasta: fechaDia(semana.hasta, i18n.language, largo) })}
          </p>
          <Button variant="ghost" className="min-w-11 px-0" aria-label={t('revision.siguiente')} disabled={esActual} onClick={() => irA(sumarDias(semana.desde, 7))}>
            <ChevronRight aria-hidden />
          </Button>
        </nav>

        <Contenido r={semana} secciones={SECCIONES} />

        <Nota key={semana.desde} semana={semana.desde} inicial={nota} />

        <section aria-labelledby="imprimir" className="space-y-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <h2 id="imprimir" className="text-xl font-bold">
              {t('revision.imprimir.titulo')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('revision.imprimir.ayuda')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="imprimir-desde">{t('revision.imprimir.desde')}</Label>
              <Input id="imprimir-desde" type="date" value={desde} max={hoy} onChange={(e) => setImpresion({ ...impresion, desde: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imprimir-hasta">{t('revision.imprimir.hasta')}</Label>
              <Input id="imprimir-hasta" type="date" value={hasta} min={desde} onChange={(e) => setImpresion({ ...impresion, hasta: e.target.value })} />
            </div>
          </div>
          <fieldset className="space-y-1">
            <legend className="mb-1 font-semibold">{t('revision.imprimir.incluir')}</legend>
            {SECCIONES.map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={impresion.secciones.includes(s)}
                  onChange={(e) =>
                    setImpresion({ ...impresion, secciones: e.target.checked ? SECCIONES.filter((x) => x === s || impresion.secciones.includes(x)) : impresion.secciones.filter((x) => x !== s) })
                  }
                />
                {t(`revision.${s}.titulo`)}
              </label>
            ))}
          </fieldset>
          <Button className="w-full" disabled={impresion.secciones.length === 0} onClick={() => window.print()}>
            <Printer aria-hidden />
            {t('revision.imprimir.boton')}
          </Button>
        </section>

        <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
          {t('revision.volver')}
        </Link>
      </div>

      {/* Solo en papel: siempre claro (ver `@media print` en index.css), sin enlaces ni controles. */}
      <article className="hidden space-y-6 text-black print:block">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{t('revision.imprimir.informe')}</h1>
          <p className="font-semibold">{t('revision.semana', { desde: fechaDia(informe.desde, i18n.language, largo), hasta: fechaDia(informe.hasta, i18n.language, largo) })}</p>
          <p className="text-sm">{t('revision.imprimir.estado', { fecha: fechaDia(hoy, i18n.language, largo) })}</p>
        </header>
        <Contenido r={informe} secciones={impresion.secciones} papel />
      </article>
    </>
  )
}

/** Las secciones de una revisión. En `papel`, texto sin enlaces y las notas de todas sus semanas. */
function Contenido({ r, secciones, papel = false }: { r: DatosRevision; secciones: readonly Seccion[]; papel?: boolean }) {
  const { t, i18n } = useTranslation()
  const habito = (h: Habito, texto: ReactNode = h.nombre) =>
    papel ? (
      texto
    ) : (
      <Link to={`/habito/${h.id}`} className={enlace}>
        {texto}
      </Link>
    )
  const bloques: Record<Seccion, ReactNode> = {
    votos: (
      <Lista vacia={r.votos.every((v) => v.votos === 0) && t('revision.votos.vacia')}>
        {r.votos.map(({ identidad, votos }) => (
          <li key={identidad.id} className="flex justify-between gap-3">
            <span className="break-words">{nombreIdentidad(identidad, t)}</span>
            <span className="shrink-0 font-semibold">{t('revision.votos.n', { count: votos })}</span>
          </li>
        ))}
      </Lista>
    ),
    recuperacion: (
      <Lista vacia={r.enRecuperacion.length === 0 && t('revision.recuperacion.vacia')}>
        {r.enRecuperacion.map((h) => (
          <li key={h.id}>{habito(h)}</li>
        ))}
      </Lista>
    ),
    diagnosticos: (
      <Lista vacia={r.diagnosticos.length === 0 && t('revision.diagnosticos.vacia')}>
        {r.diagnosticos.map(({ diagnostico, habito: h }) => (
          <li key={diagnostico.id}>{habito(h, t('revision.diagnosticos.item', { nombre: h.nombre }))}</li>
        ))}
      </Lista>
    ),
    fallos: (
      <Lista vacia={r.fallos.length === 0 && t('revision.fallos.vacia')}>
        {r.fallos.map(({ habito: h, anotacion: a }) => (
          <li key={a.id} className="space-y-1">
            <p className="break-words">
              <span className="font-semibold">{habito(h)}</span> · {fechaDia(a.periodo, i18n.language)}
            </p>
            <p className="break-words">{[a.ley && t(`recuperacion.leyes.${a.ley}`), a.nota].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
      </Lista>
    ),
    sugerencias: (
      <Lista vacia={r.sugerencias.length === 0 && t('revision.sugerencias.vacia')}>
        {r.sugerencias.map(({ habito: h, sugerencia }) => (
          <li key={h.id} className="space-y-1">
            <p>{t(claveTexto(h, sugerencia), { nombre: h.nombre })}</p>
            {!papel && (
              <Link to={`/habito/${h.id}`} className={cn(enlace, 'text-sm')} aria-label={t('revision.sugerencias.ver', { nombre: h.nombre })}>
                {t('revision.sugerencias.verCorto')}
              </Link>
            )}
          </li>
        ))}
      </Lista>
    ),
    campos: (
      <>
        {r.camposVacios.length > 0 && <p className="text-muted-foreground print:text-black">{t('revision.campos.intro')}</p>}
        <Lista vacia={r.camposVacios.length === 0 && t('revision.campos.vacia')}>
          {r.camposVacios.map(({ habito: h, campos }) => (
            <li key={h.id} className="space-y-1">
              <p className="font-semibold break-words">{h.nombre}</p>
              {papel ? (
                <p>{campos.map((c) => t(`revision.campos.${c}`)).join(', ')}</p>
              ) : (
                <ul className="flex flex-wrap gap-x-4">
                  {campos.map((c) => (
                    <li key={c}>
                      <Link to={`/habito/${h.id}/editar?paso=${pasoDe(c, h)}`} className={enlace} aria-label={t('revision.campos.rellenar', { campo: t(`revision.campos.${c}`), nombre: h.nombre })}>
                        {t(`revision.campos.${c}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </Lista>
      </>
    ),
    // En pantalla, la nota se escribe aparte (`Nota`); en papel salen las de cada semana del periodo.
    nota: papel && (
      <Lista vacia={r.notas.length === 0 && t('revision.nota.vacia')}>
        {r.notas.map((n) => (
          <li key={n.id} className="space-y-1">
            <p className="font-semibold">{t('revision.nota.semana', { fecha: fechaDia(n.semana, i18n.language) })}</p>
            <p className="whitespace-pre-wrap">{n.nota}</p>
          </li>
        ))}
      </Lista>
    ),
  }
  return secciones.map(
    (s) =>
      bloques[s] && (
        <section key={s} aria-labelledby={`${papel ? 'papel' : 'seccion'}-${s}`} className="space-y-3 print:break-inside-avoid">
          <h2 id={`${papel ? 'papel' : 'seccion'}-${s}`} className="text-xl font-bold">
            {t(`revision.${s}.titulo`)}
          </h2>
          {bloques[s]}
        </section>
      ),
  )
}

function Lista({ vacia, children }: { vacia: string | false; children: ReactNode }) {
  if (vacia) return <p className="text-muted-foreground print:text-black">{vacia}</p>
  return <ul className="space-y-2">{children}</ul>
}

/** La nota libre de la semana. Guardarla vacía la borra. */
function Nota({ semana, inicial }: { semana: string; inicial: string }) {
  const { t } = useTranslation()
  const [texto, setTexto] = useState(inicial)
  const [aviso, setAviso] = useState('')
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        await guardarNotaSemanal(semana, texto)
        setAviso(texto.trim() ? 'revision.nota.guardada' : 'revision.nota.borrada')
      }}
    >
      <h2 className="text-xl font-bold">
        <label htmlFor="nota-semana">{t('revision.nota.titulo')}</label>
      </h2>
      <p id="nota-ayuda" className="text-sm text-muted-foreground">
        {t('revision.nota.ayuda')}
      </p>
      <textarea
        id="nota-semana"
        aria-describedby="nota-ayuda"
        rows={4}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAviso('')
        }}
        className="w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
      <Button type="submit" variant="secondary">
        {t('revision.nota.guardar')}
      </Button>
      <p role="status" className="text-sm text-muted-foreground empty:hidden">
        {aviso && t(aviso)}
      </p>
    </form>
  )
}
