import { clsx, type ClassValue } from 'clsx'
import type { TFunction } from 'i18next'
import { twMerge } from 'tailwind-merge'
import type { Dia, Habito, Identidad, Periodo } from '@/dominio'

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

/** «12 de 20 páginas hoy» / «1 café hoy (máximo 2)»: lo que lleva un cuantitativo en su periodo. */
export const progresoCuantitativo = ({ cuantitativo: c, frecuencia: f }: Habito, periodo: Periodo, t: TFunction, idioma: string) => {
  if (!c) return ''
  const n = (x: number) => x.toLocaleString(idioma)
  return t(`cuantitativo.lleva.${c.modo}`, {
    hechos: n(periodo.hechos),
    objetivo: n(c.objetivo),
    unidad: c.unidad,
    periodo: t(`cuantitativo.periodo.${f.tipo === 'veces_por_periodo' ? f.periodo : 'dia'}`),
  })
}
