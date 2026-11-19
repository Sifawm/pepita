import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { guardarAjustes, useAjustes } from '@/db'

export default function Ajustes() {
  const { t } = useTranslation()
  const ajustes = useAjustes()
  if (!ajustes) return null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('ajustes.titulo')}</h1>
      <div className="space-y-2">
        <Label htmlFor="hora-cierre">{t('ajustes.hora_cierre')}</Label>
        <Input
          id="hora-cierre"
          type="time"
          className="w-36"
          value={ajustes.horaCierre}
          aria-describedby="hora-cierre-ayuda"
          // Vacío mientras se escribe a medias: se guarda solo una hora completa.
          onChange={(e) => e.target.value && guardarAjustes({ horaCierre: e.target.value })}
        />
        <p id="hora-cierre-ayuda" className="text-sm text-muted-foreground">
          {t('ajustes.hora_cierre_ayuda', { hora: ajustes.horaCierre })}
        </p>
      </div>
      <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
        {t('ajustes.volver')}
      </Link>
    </div>
  )
}
