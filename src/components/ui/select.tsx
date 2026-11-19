import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** `<select>` nativo con el aspecto de `Input`: accesible y cómodo en móvil sin librerías. */
function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'flex min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Select }
