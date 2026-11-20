import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { conId, db, useAjustes } from '@/db'
import {
  moverIdentidad,
  nuevaIdentidad,
  resumirIdentidades,
  type Identidad,
  type ResumenIdentidad,
} from '@/dominio'
import { cn, enfocar, nombreIdentidad } from '@/lib/utils'

export default function Identidades() {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState('')
  const [aviso, setAviso] = useState('')
  const ajustes = useAjustes()
  const datos = useLiveQuery(async () => {
    const [identidades, habitos, registros] = await Promise.all([
      db.identidades.toArray(),
      db.habitos.toArray(),
      db.registros.toArray(),
    ])
    return { identidades, habitos, registros }
  })

  if (!datos || !ajustes) return null
  const resumen = resumirIdentidades({ ...datos, ahora: new Date(), ajustes })
  const activas = resumen.filter((r) => !r.identidad.archivada)
  const archivadas = resumen.filter((r) => r.identidad.archivada)

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    const nueva = nuevaIdentidad(nombre, datos.identidades)
    if (!nueva.nombre) return
    setNombre('')
    await db.identidades.add(conId<Identidad>(nueva))
    setAviso(t('identidades.creada', { nombre: nueva.nombre }))
  }

  const mover = async (identidad: Identidad, paso: -1 | 1) => {
    const cambios = moverIdentidad(datos.identidades, identidad.id, paso)
    if (!cambios.length) return
    await db.identidades.bulkPut(cambios)
    const puesto = activas.findIndex((r) => r.identidad.id === identidad.id) + 1 + paso
    setAviso(t('identidades.movida', { nombre: nombreIdentidad(identidad, t), puesto }))
    // Al reordenar, React mueve el nodo y el foco puede perderse: lo devolvemos al botón pulsado.
    requestAnimationFrame(() => {
      const [este, otro] = [paso, -paso].map((p) => document.getElementById(`mover${p}-${identidad.id}`))
      ;(este instanceof HTMLButtonElement && !este.disabled ? este : otro)?.focus()
    })
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 id="identidades-titulo" tabIndex={-1} className="text-3xl font-bold outline-none">
          {t('identidades.titulo')}
        </h1>
        <p className="text-muted-foreground">{t('identidades.intro')}</p>
      </header>
      <p className="sr-only" aria-live="polite">
        {aviso}
      </p>

      <ul aria-label={t('identidades.lista')} className="space-y-3">
        {activas.map((r, i) => (
          <li key={r.identidad.id}>
            <Fila resumen={r} primera={i === 0} ultima={i === activas.length - 1} mover={mover} />
          </li>
        ))}
      </ul>

      <form onSubmit={crear} className="space-y-2">
        <Label htmlFor="nueva-identidad">{t('identidades.nueva')}</Label>
        <div className="flex gap-2">
          <Input
            id="nueva-identidad"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t('identidades.ejemplo')}
            aria-describedby="nueva-identidad-ayuda"
            required
            autoComplete="off"
          />
          <Button type="submit">{t('identidades.crear')}</Button>
        </div>
        <p id="nueva-identidad-ayuda" className="text-sm text-muted-foreground">
          {t('identidades.ayuda')}
        </p>
      </form>

      {archivadas.length > 0 && (
        <section aria-labelledby="archivadas" className="space-y-3">
          <h2 id="archivadas" tabIndex={-1} className="text-xl font-bold outline-none">
            {t('identidades.archivadas')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('identidades.archivadasAyuda')}</p>
          <ul className="space-y-3">
            {archivadas.map((r) => (
              <li key={r.identidad.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <Nombre resumen={r} />
                <Button variant="ghost" onClick={() => db.identidades.update(r.identidad.id, { archivada: false }).then(() => enfocar('identidades-titulo'))}>
                  <ArchiveRestore aria-hidden />
                  {t('identidades.recuperar')}
                  <span className="sr-only">{nombreIdentidad(r.identidad, t)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
        {t('identidades.volver')}
      </Link>
    </div>
  )
}

function Nombre({ resumen: { identidad, votos, votosHoy } }: { resumen: ResumenIdentidad }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0 flex-1">
      <Link
        to={`/identidades/${identidad.id}`}
        className="inline-flex min-h-11 items-center rounded-md text-lg font-semibold break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {nombreIdentidad(identidad, t)}
      </Link>
      <p className="text-sm text-muted-foreground">
        {t('identidades.votos', { count: votos })}
        {' · '}
        {t('identidades.votosHoy', { count: votosHoy })}
      </p>
    </div>
  )
}

function Fila({
  resumen,
  primera,
  ultima,
  mover,
}: {
  resumen: ResumenIdentidad
  primera: boolean
  ultima: boolean
  mover: (identidad: Identidad, paso: -1 | 1) => void
}) {
  const { t } = useTranslation()
  const { identidad } = resumen
  const nombre = nombreIdentidad(identidad, t)
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(identidad.nombre)

  const renombrar = async (e: FormEvent) => {
    e.preventDefault()
    const limpio = texto.trim()
    // «General» puede quedarse sin nombre propio (vuelve al traducido); las demás no.
    if (!limpio && !identidad.esGeneral) return
    await db.identidades.update(identidad.id, { nombre: limpio })
    setEditando(false)
    enfocar(`renombrar-boton-${identidad.id}`)
  }

  if (editando) {
    const campo = `renombrar-${identidad.id}`
    return (
      <form onSubmit={renombrar} className="space-y-2 rounded-lg border bg-card p-4">
        <Label htmlFor={campo}>{t('identidades.renombrarCampo')}</Label>
        <Input
          id={campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={identidad.esGeneral ? t('identidad.general') : t('identidades.ejemplo')}
          required={!identidad.esGeneral}
          autoFocus
          autoComplete="off"
        />
        <div className="flex gap-2">
          <Button type="submit">{t('identidades.guardar')}</Button>
          <Button type="button" variant="ghost" onClick={() => (setTexto(identidad.nombre), setEditando(false), enfocar(`renombrar-boton-${identidad.id}`))}>
            {t('identidades.cancelar')}
          </Button>
        </div>
      </form>
    )
  }

  const icono = 'w-11 px-0'
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <Nombre resumen={resumen} />
      <div className="flex flex-wrap gap-1">
        <Button
          id={`mover-1-${identidad.id}`}
          variant="ghost"
          className={icono}
          disabled={primera}
          onClick={() => mover(identidad, -1)}
          aria-label={t('identidades.subir', { nombre })}
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          id={`mover1-${identidad.id}`}
          variant="ghost"
          className={icono}
          disabled={ultima}
          onClick={() => mover(identidad, 1)}
          aria-label={t('identidades.bajar', { nombre })}
        >
          <ArrowDown aria-hidden />
        </Button>
        <Button id={`renombrar-boton-${identidad.id}`} variant="ghost" onClick={() => setEditando(true)}>
          <Pencil aria-hidden />
          {t('identidades.renombrar')}
          <span className="sr-only">{nombre}</span>
        </Button>
        {/* «General» no se archiva: es donde van los hábitos sin identidad. */}
        {!identidad.esGeneral && (
          <Button variant="ghost" onClick={() => db.identidades.update(identidad.id, { archivada: true }).then(() => enfocar('archivadas'))}>
            <Archive aria-hidden />
            {t('identidades.archivar')}
            <span className="sr-only">{nombre}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
