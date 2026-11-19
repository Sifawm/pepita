import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectorFrecuencia } from '@/components/SelectorFrecuencia'
import { Select } from '@/components/ui/select'
import { conId, db, useAjustes } from '@/db'
import { nuevoHabito, type Frecuencia, type Habito } from '@/dominio'
import { nombreIdentidad } from '@/lib/utils'

export default function NuevoHabito() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  // Si se llega desde Hoy filtrado, la identidad del filtro viene elegida.
  const [params] = useSearchParams()
  const [elegida, setElegida] = useState(params.get('identidad') ?? '')
  const identidades = useLiveQuery(() => db.identidades.orderBy('orden').filter((i) => !i.archivada).toArray())
  const general = identidades?.find((i) => i.esGeneral)
  const identidadId = identidades?.some((i) => i.id === elegida) ? elegida : general?.id
  const [frecuencia, setFrecuencia] = useState<Frecuencia>({ tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' })
  const ajustes = useAjustes()

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio || !identidadId || !ajustes) return
    const orden = await db.habitos.count()
    await db.habitos.add(
      conId<Habito>(nuevoHabito({ nombre: limpio, identidadId, orden, frecuencia }, new Date(), ajustes)),
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
      {identidades && identidades.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="identidad">{t('identidades.delHabito')}</Label>
          <Select id="identidad" value={identidadId} onChange={(e) => setElegida(e.target.value)}>
            {identidades.map((i) => (
              <option key={i.id} value={i.id}>
                {nombreIdentidad(i, t)}
              </option>
            ))}
          </Select>
        </div>
      )}
      <SelectorFrecuencia valor={frecuencia} cambiar={setFrecuencia} />
      <div className="flex flex-col gap-3">
        <Button type="submit">{t('nuevo.crear')}</Button>
        <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
          {t('nuevo.cancelar')}
        </Link>
      </div>
    </form>
  )
}
