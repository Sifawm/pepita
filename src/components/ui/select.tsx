import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Native `<select>` styled like `Input`: accessible and comfortable on mobile, no libraries. */
function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'flex min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base outline-none user-invalid:border-destructive user-invalid:inset-ring user-invalid:inset-ring-destructive focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Select }
