import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { guardarAjustes, leerDatos, sustituirDatos, useAjustes } from '@/db'
import { diaLogico, exportar, importar, registrosCsv, type Datos, type ErrorImportacion } from '@/dominio'
import { usePersistente } from '@/lib/instalacion'
import { descargar } from '@/lib/utils'

/** `AAAA-MM-DD` local para el nombre del fichero. */
const hoyLocal = (ahora: Date) => diaLogico(ahora, '00:00')

export default function SeccionCopias() {
  const { t, i18n } = useTranslation()
  const ajustes = useAjustes()
  const persistente = usePersistente()
  const fichero = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<ErrorImportacion>()
  const [pendiente, setPendiente] = useState<Datos>()
  const [aviso, setAviso] = useState('')

  const exportarJson = async () => {
    const ahora = new Date()
    descargar(`pepita-${hoyLocal(ahora)}.json`, [exportar(await leerDatos(), ahora)], 'application/json')
    await guardarAjustes({ ultimaCopia: ahora.toISOString() })
    setAviso(t('copias.exportada'))
  }

  const exportarCsv = async () => {
    // La marca BOM hace que las hojas de cálculo lean bien las tildes.
    descargar(`pepita-registros-${hoyLocal(new Date())}.csv`, ['﻿', registrosCsv(await leerDatos())], 'text/csv;charset=utf-8')
  }

  const elegido = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = '' // para poder elegir el mismo fichero otra vez
    if (!archivo) return
    setAviso('')
    const resultado = importar(await archivo.text())
    setError(resultado.ok ? undefined : resultado.error)
    setPendiente(resultado.ok ? resultado.datos : undefined)
  }

  const sustituir = async () => {
    if (!pendiente) return
    await sustituirDatos(pendiente)
    setPendiente(undefined)
    setAviso(t('copias.importada'))
  }

  const ultima = ajustes?.ultimaCopia
    ? t('copias.ultima', {
        fecha: new Date(ajustes.ultimaCopia).toLocaleString(i18n.language, { dateStyle: 'long', timeStyle: 'short' }),
      })
    : t('copias.ninguna')

  return (
    <section aria-labelledby="copias-titulo" className="space-y-4">
      <h2 id="copias-titulo" className="text-xl font-bold">
        {t('copias.titulo')}
      </h2>
      <p className="text-muted-foreground">{t('copias.intro')}</p>
      {ajustes && <p>{ultima}</p>}

      <div className="flex flex-col gap-3">
        <Button onClick={exportarJson}>
          <Download aria-hidden />
          {t('copias.exportarJson')}
        </Button>
        <Button variant="secondary" onClick={exportarCsv}>
          <FileSpreadsheet aria-hidden />
          {t('copias.exportarCsv')}
        </Button>
        <Button variant="secondary" onClick={() => fichero.current?.click()} aria-describedby="importar-ayuda">
          <Upload aria-hidden />
          {t('copias.importar')}
        </Button>
        <input ref={fichero} type="file" accept=".json,application/json" hidden onChange={elegido} />
        <p id="importar-ayuda" className="text-sm text-muted-foreground">
          {t('copias.importarAyuda')}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive p-4">
          {t(`copias.error.${error.motivo}`, { ruta: 'ruta' in error ? error.ruta : '' })} {t('copias.intactos')}
        </p>
      )}

      {pendiente && (
        <div role="alertdialog" aria-labelledby="confirmar-titulo" aria-describedby="confirmar-texto" className="space-y-3 rounded-lg border bg-card p-4">
          <h3 id="confirmar-titulo" className="text-lg font-bold">
            {t('copias.confirmarTitulo')}
          </h3>
          <p id="confirmar-texto">
            {t('copias.confirmarTexto', {
              habitos: t('copias.habitos', { count: pendiente.habitos.length }),
              registros: t('copias.registros', { count: pendiente.registros.length }),
            })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={sustituir}>{t('copias.confirmar')}</Button>
            {/* El foco empieza en la opción segura. */}
            <Button variant="secondary" autoFocus onClick={() => setPendiente(undefined)}>
              {t('copias.cancelar')}
            </Button>
          </div>
        </div>
      )}

      <p role="status" className="font-semibold text-primary">
        {aviso}
      </p>

      <h2 className="pt-2 text-xl font-bold">{t('copias.almacenamiento')}</h2>
      {persistente !== undefined && (
        <p>{t(persistente === null ? 'copias.persistenteNoDisponible' : persistente ? 'copias.persistenteSi' : 'copias.persistenteNo')}</p>
      )}
    </section>
  )
}
