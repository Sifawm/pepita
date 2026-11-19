import { clsx, type ClassValue } from 'clsx'
import type { TFunction } from 'i18next'
import { twMerge } from 'tailwind-merge'
import type { Dia, Identidad } from '@/dominio'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** «General» se muestra traducida mientras nadie le ponga nombre propio. */
export const nombreIdentidad = (identidad: Identidad, t: TFunction) =>
  identidad.nombre || t('identidad.general')

/** Un día lógico (`AAAA-MM-DD`) en texto del idioma: «15 de marzo». */
export const fechaDia = (dia: Dia, idioma: string, opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString(idioma, opciones)
}
