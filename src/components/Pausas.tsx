import { useLiveQuery } from 'dexie-react-hooks'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { conId, db, guardarAjustes, useAjustes } from '@/db'
import {
  activarPausaGlobal,
  diaLogico,
  pausaGlobalEn,
  pausarHabito,
  reanudarHabito,
  saltar,
  terminarPausaGlobal,
  unidadDePeriodo,
  type Ajustes,
  type Registro,
  type TarjetaHoy,
} from '@/dominio'
import { enfocar, fechaDia } from '@/lib/utils'

/**
 * Saltar el periodo o pausar el hábito. Va dentro del menú de la tarjeta de Hoy;
 * `hecho` cierra el menú y anuncia el cambio.
 */
export function SaltarYPausar({ tarjeta, ajustes, hecho }: { tarjeta: TarjetaHoy; ajustes: Ajustes; hecho: (aviso: string) => void }) {
  const { t, i18n } = useTranslation()
  const { habito, salto, pausa, periodo } = tarjeta
  const hoy = diaLogico(new Date(), ajustes.horaCierre)
  const [motivo, setMotivo] = useState('')
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const id = useId()
  const unidad = unidadDePeriodo(habito.frecuencia)
  const pausaPropia = pausa && habito.pausas?.includes(pausa)

  const alSaltar = async (e: FormEvent) => {
    e.preventDefault()
    await db.registros.add(conId<Registro>(saltar({ habito, motivo, ahora: new Date(), ajustes })))
    setMotivo('')
    hecho(t('pausas.saltadoAviso'))
  }

  const alPausar = async (e: FormEvent) => {
    e.preventDefault()
    await db.habitos.put(pausarHabito(habito, { desde, hasta }))
    hecho(t('pausas.pausadoAviso', { fecha: fechaDia(hasta, i18n.language) }))
  }

  return (
    <div className="space-y-4 border-t p-2 pt-4">
      {salto ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await db.registros.delete(salto.id)
            hecho(t('pausas.saltoDeshecho'))
          }}
        >
          {t('pausas.deshacerSalto')}
        </Button>
      ) : (
        periodo.estado === 'en_curso' && (
          <form onSubmit={alSaltar} className="space-y-2">
            <Label htmlFor={`${id}-motivo`}>{t('pausas.motivo')}</Label>
            <Input
              id={`${id}-motivo`}
              value={motivo}
              placeholder={t('pausas.motivoEjemplo')}
              aria-describedby={`${id}-saltar-ayuda`}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <p id={`${id}-saltar-ayuda`} className="text-sm text-muted-foreground">
              {t('pausas.saltarAyuda')}
            </p>
            <Button type="submit" variant="secondary" className="w-full">
              {t(`pausas.saltar_${unidad}`)}
            </Button>
          </form>
        )
      )}

      {pausaPropia ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await db.habitos.put(reanudarHabito(habito, new Date(), ajustes))
            hecho(t('pausas.reanudado'))
          }}
        >
          {t('pausas.reanudar')}
        </Button>
      ) : (
        !pausa && (
          <form onSubmit={alPausar} className="space-y-2">
            <fieldset className="space-y-2">
              <legend className="font-semibold">{t('pausas.pausar')}</legend>
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`${id}-desde`}>{t('pausas.desde')}</Label>
                  <Input id={`${id}-desde`} type="date" required min={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-hasta`}>{t('pausas.hasta')}</Label>
                  <Input id={`${id}-hasta`} type="date" required min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
              </div>
            </fieldset>
            <Button type="submit" variant="secondary" className="w-full" disabled={!desde || !hasta || hasta < desde}>
              {t('pausas.pausarAccion')}
            </Button>
          </form>
        )
      )}
    </div>
  )
}

/** Las vacaciones: pausa todos los hábitos hasta una fecha y termina sola. Va en Ajustes. */
export function PausaGlobal() {
  const { t, i18n } = useTranslation()
  const ajustes = useAjustes()
  const habitos = useLiveQuery(() => db.habitos.toArray())
  const [hasta, setHasta] = useState('')
  const [aviso, setAviso] = useState('')
  if (!ajustes || !habitos) return null
  const hoy = diaLogico(new Date(), ajustes.horaCierre)
  const activa = pausaGlobalEn(ajustes, hoy)

  const empezar = async (e: FormEvent) => {
    e.preventDefault()
    const r = activarPausaGlobal({ ajustes, habitos, hasta, ahora: new Date() })
    await db.transaction('rw', db.habitos, db.ajustes, async () => {
      await db.habitos.bulkPut(r.habitos)
      await guardarAjustes({ pausaGlobal: r.pausaGlobal })
    })
    setHasta('')
    enfocar('vacaciones-terminar')
    setAviso(t('pausas.global.empezada', { fecha: fechaDia(r.pausaGlobal.hasta, i18n.language) }))
  }

  const terminar = async () => {
    await guardarAjustes({ pausaGlobal: terminarPausaGlobal({ ajustes, ahora: new Date() }) })
    setAviso(t('pausas.global.terminada'))
    enfocar('vacaciones-hasta')
  }

  return (
    <section aria-labelledby="vacaciones-titulo" className="space-y-3">
      <h2 id="vacaciones-titulo" className="text-xl font-bold">
        {t('pausas.global.titulo')}
      </h2>
      <p className="text-muted-foreground">{t('pausas.global.intro')}</p>
      {activa ? (
        <>
          <p>{t('pausas.global.activa', { fecha: fechaDia(activa.hasta, i18n.language) })}</p>
          <Button id="vacaciones-terminar" variant="secondary" className="w-full" onClick={terminar}>
            {t('pausas.global.terminar')}
          </Button>
        </>
      ) : (
        <form onSubmit={empezar} className="space-y-2">
          <Label htmlFor="vacaciones-hasta">{t('pausas.global.hasta')}</Label>
          <Input id="vacaciones-hasta" type="date" className="w-48" required min={hoy} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <Button type="submit" variant="secondary" className="w-full" disabled={!hasta || hasta < hoy}>
            {t('pausas.global.empezar')}
          </Button>
        </form>
      )}
      <p role="status" className="font-semibold text-primary">
        {aviso}
      </p>
    </section>
  )
}
