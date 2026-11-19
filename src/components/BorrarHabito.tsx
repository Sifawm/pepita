import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { borrarHabito, db } from '@/db'
import type { Habito } from '@/dominio'

/** Borrar es para siempre: pide confirmación explícita, con el foco en la opción segura. */
export function BorrarHabito({ habito, alBorrar }: { habito: Habito; alBorrar?: () => void }) {
  const { t } = useTranslation()
  const [confirmando, setConfirmando] = useState(false)
  const registros = useLiveQuery(() => db.registros.where('habitoId').equals(habito.id).count(), [habito.id])
  const titulo = `borrar-${habito.id}-titulo`
  const texto = `borrar-${habito.id}-texto`

  if (!confirmando)
    return (
      <Button variant="ghost" className="text-destructive" onClick={() => setConfirmando(true)}>
        {t('habito.borrar')}
      </Button>
    )
  return (
    <div role="alertdialog" aria-labelledby={titulo} aria-describedby={texto} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 id={titulo} className="text-lg font-bold">
        {t('habito.borrarTitulo', { nombre: habito.nombre })}
      </h3>
      <p id={texto}>{t('habito.borrarTexto', { count: registros ?? 0 })}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="bg-destructive text-background hover:bg-destructive/90"
          onClick={async () => {
            await borrarHabito(habito.id)
            alBorrar?.()
          }}
        >
          {t('habito.borrarConfirmar')}
        </Button>
        <Button variant="secondary" autoFocus onClick={() => setConfirmando(false)}>
          {t('habito.cancelar')}
        </Button>
      </div>
    </div>
  )
}
