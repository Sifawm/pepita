import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { db, useAjustes } from '@/db'
import { necesitaCopia } from '@/dominio'

/** Recordatorio amable de copia; no aparece si no toca. */
export default function AvisoCopia({ ahora }: { ahora: Date }) {
  const { t } = useTranslation()
  const ajustes = useAjustes()
  const registros = useLiveQuery(() => db.registros.toArray())
  if (!ajustes || !registros || !necesitaCopia({ ajustes, registros, ahora })) return null

  return (
    <aside aria-label={t('copias.titulo')} className="space-y-3 rounded-lg border bg-accent p-4 text-accent-foreground">
      <p>{t('copias.aviso')}</p>
      <Link to="/ajustes" className={buttonVariants({ variant: 'secondary', className: 'w-full' })}>
        {t('copias.avisoAccion')}
      </Link>
    </aside>
  )
}
