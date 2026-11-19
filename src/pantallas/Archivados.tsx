import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BorrarHabito } from '@/components/BorrarHabito'
import { Button, buttonVariants } from '@/components/ui/button'
import { db } from '@/db'
import { nombreIdentidad } from '@/lib/utils'

export default function Archivados() {
  const { t } = useTranslation()
  const datos = useLiveQuery(async () => {
    const [habitos, identidades] = await Promise.all([db.habitos.orderBy('orden').toArray(), db.identidades.toArray()])
    return { habitos: habitos.filter((h) => h.archivado), identidades }
  })
  if (!datos) return null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('archivados.titulo')}</h1>
        <p className="text-muted-foreground">{t('archivados.intro')}</p>
      </header>

      {datos.habitos.length === 0 ? (
        <p className="text-muted-foreground">{t('archivados.vacio')}</p>
      ) : (
        <ul aria-label={t('archivados.titulo')} className="space-y-3">
          {datos.habitos.map((habito) => {
            const identidad = datos.identidades.find((i) => i.id === habito.identidadId)
            return (
              <li key={habito.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div>
                  <p className="text-lg font-semibold break-words">{habito.nombre}</p>
                  {identidad && <p className="text-sm text-muted-foreground">{nombreIdentidad(identidad, t)}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" onClick={() => db.habitos.update(habito.id, { archivado: false })}>
                    <ArchiveRestore aria-hidden />
                    {t('habito.recuperar')}
                  </Button>
                  <BorrarHabito habito={habito} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Link to="/" className={buttonVariants({ variant: 'ghost', className: 'w-full' })}>
        {t('ajustes.volver')}
      </Link>
    </div>
  )
}
