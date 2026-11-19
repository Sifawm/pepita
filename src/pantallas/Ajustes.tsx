import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import SeccionCopias from '@/components/SeccionCopias'
import { buttonVariants } from '@/components/ui/button'

export default function Ajustes() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('ajustes.titulo')}</h1>
      <SeccionCopias />
      <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
        {t('ajustes.volver')}
      </Link>
    </div>
  )
}
