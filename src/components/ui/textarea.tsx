import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Multi-line `Input`: same border, surface, placeholder and focus. */
function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring user-invalid:border-destructive user-invalid:inset-ring user-invalid:inset-ring-destructive disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
