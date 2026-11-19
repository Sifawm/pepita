import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { conId, db } from '@/db'
import { AJUSTES_POR_DEFECTO, nuevoHabito, type Habito } from '@/dominio'

export default function NuevoHabito() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) return
    // ponytail: todo va a «General» hasta que existan las identidades (ticket 02).
    const general = await db.identidades.filter((i) => i.esGeneral).first()
    if (!general) return
    const orden = await db.habitos.count()
    await db.habitos.add(
      conId<Habito>(nuevoHabito({ nombre: limpio, identidadId: general.id, orden }, new Date(), AJUSTES_POR_DEFECTO)),
    )
    navigate('/')
  }

  return (
    <form onSubmit={crear} className="space-y-6">
      <h1 className="text-3xl font-bold">{t('nuevo.titulo')}</h1>
      <div className="space-y-2">
        <Label htmlFor="nombre">{t('nuevo.nombre')}</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t('nuevo.ejemplo')}
          aria-describedby="nombre-ayuda"
          required
          autoFocus
          autoComplete="off"
        />
        <p id="nombre-ayuda" className="text-sm text-muted-foreground">
          {t('nuevo.ayuda')}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button type="submit">{t('nuevo.crear')}</Button>
        <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
          {t('nuevo.cancelar')}
        </Link>
      </div>
    </form>
  )
}
