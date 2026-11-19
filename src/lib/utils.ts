import { clsx, type ClassValue } from 'clsx'
import type { TFunction } from 'i18next'
import { twMerge } from 'tailwind-merge'
import type { Identidad } from '@/dominio'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** «General» se muestra traducida mientras nadie le ponga nombre propio. */
export const nombreIdentidad = (identidad: Identidad, t: TFunction) =>
  identidad.nombre || t('identidad.general')
