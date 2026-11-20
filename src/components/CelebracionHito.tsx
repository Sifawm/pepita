import { PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { celebrarHitos } from '@/db'
import type { Identidad, ResumenIdentidad } from '@/dominio'
import { nombreIdentidad } from '@/lib/utils'

/**
 * Celebración especial de un hito. Muestra los de una identidad a la vez y, al mostrarlos, los
 * guarda como celebrados (así no vuelven nunca). Si se pasaron varios a la vez (una copia
 * importada, ediciones), celebra solo el mayor. Los de otra identidad esperan a que se cierre.
 */
export function CelebracionHito({ resumenes }: { resumenes: ResumenIdentidad[] }) {
  const { t } = useTranslation()
  const pendiente = resumenes.find((r) => r.porCelebrar.length)
  const [hito, setHito] = useState<{ identidad: Identidad; umbrales: number[] }>()
  // Ajuste de estado durante el render: con la pantalla libre, el siguiente hito pasa a mostrarse.
  // Sin esperar a que se cierre el anterior, guardarlo hacía saltar el de otra identidad encima.
  if (pendiente && !hito) setHito({ identidad: pendiente.identidad, umbrales: pendiente.porCelebrar })

  useEffect(() => {
    if (hito) void celebrarHitos(hito.identidad.id, hito.umbrales)
  }, [hito])

  // Escape lo cierra sin mover el foco: así nunca tapa lo que tenga el foco (WCAG 2.4.11).
  useEffect(() => {
    if (!hito) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setHito(undefined)
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [hito])

  return (
    // Región viva siempre montada, para que el lector de pantalla anuncie el hito.
    <div role="status" className="pointer-events-none fixed inset-x-4 top-4 z-20 mx-auto max-w-md">
      {hito && (
        <div className="pointer-events-auto space-y-3 rounded-xl border-2 border-primary bg-card p-5 text-card-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-500">
          <div className="flex items-start gap-3">
            <PartyPopper aria-hidden className="size-8 shrink-0 text-primary motion-safe:animate-in motion-safe:spin-in-45 motion-safe:duration-700" />
            <div>
              <p className="text-xl font-bold">{t('hitos.celebracion', { count: hito.umbrales.at(-1) })}</p>
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
