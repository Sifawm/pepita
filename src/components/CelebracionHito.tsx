import { PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { celebrarHitos } from '@/db'
import type { Identidad, ResumenIdentidad } from '@/dominio'
import { nombreIdentidad } from '@/lib/utils'

/**
 * Celebración especial de un hito. En cuanto hay uno por celebrar lo guarda como celebrado (así
 * no vuelve nunca) y lo muestra hasta que se cierra. Si se pasaron varios a la vez (una copia
 * importada, ediciones), celebra solo el mayor.
 */
export function CelebracionHito({ resumenes }: { resumenes: ResumenIdentidad[] }) {
  const { t } = useTranslation()
  const pendiente = resumenes.find((r) => r.porCelebrar.length)
  const clave = pendiente && `${pendiente.identidad.id}:${pendiente.porCelebrar.join(',')}`
  const [visto, setVisto] = useState<string>()
  const [hito, setHito] = useState<{ identidad: Identidad; umbral: number }>()
  // Ajuste de estado durante el render: al aparecer un hito nuevo, pasa a mostrarse.
  if (pendiente && clave !== visto) {
    setVisto(clave)
    setHito({ identidad: pendiente.identidad, umbral: pendiente.porCelebrar.at(-1)! })
  }

  const identidadId = pendiente?.identidad.id
  const umbrales = pendiente?.porCelebrar.join(',')
  useEffect(() => {
    if (identidadId && umbrales) void celebrarHitos(identidadId, umbrales.split(',').map(Number))
  }, [identidadId, umbrales])

  return (
    // Región viva siempre montada, para que el lector de pantalla anuncie el hito.
    <div role="status" className="pointer-events-none fixed inset-x-4 top-4 z-20 mx-auto max-w-md">
      {hito && (
        <div className="pointer-events-auto space-y-3 rounded-xl border-2 border-primary bg-card p-5 text-card-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-500">
          <div className="flex items-start gap-3">
            <PartyPopper aria-hidden className="size-8 shrink-0 text-primary motion-safe:animate-in motion-safe:spin-in-45 motion-safe:duration-700" />
            <div>
              <p className="text-xl font-bold">{t('hitos.celebracion', { count: hito.umbral })}</p>
              <p>{t('hitos.celebracionIdentidad', { identidad: nombreIdentidad(hito.identidad, t) })}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link to={`/identidades/${hito.identidad.id}`} className={buttonVariants({ variant: 'secondary' })}>
              {t('hitos.verCurva')}
            </Link>
            <Button onClick={() => setHito(undefined)}>{t('hitos.cerrar')}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
