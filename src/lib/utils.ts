import { clsx, type ClassValue } from 'clsx'
import type { TFunction } from 'i18next'
import { twMerge } from 'tailwind-merge'
import type { Dia, FraseIntencion, Habito, Identidad, Periodo } from '@/dominio'

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

/**
 * La frase de intención en el idioma: «después de servirme el café, en la cocina: leer 1 página».
 * Empieza en minúscula: muéstrala con `first-letter:uppercase` en un elemento de bloque.
 */
export function textoFrase({ cuando, donde, que }: FraseIntencion, t: TFunction) {
  const inicio =
    cuando &&
    ('hora' in cuando
      ? t('intencion.hora', { hora: cuando.hora })
      : 'despuesDe' in cuando
        ? t('intencion.despuesDe', { nombre: cuando.despuesDe })
        : t('intencion.despuesDeAccion', { texto: cuando.despuesDeAccion }))
  return t('intencion.frase', { contexto: [inicio, donde].filter(Boolean).join(', '), que })
}

/**
 * Lleva el foco a un elemento tras el próximo pintado. Para cuando el botón pulsado desaparece
 * (deshacer, archivar, cerrar un formulario): sin esto el foco cae al principio de la página.
 */
export function enfocar(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

/** Descarga un fichero generado en el navegador. */
export function descargar(nombre: string, partes: BlobPart[], tipo: string) {
  const url = URL.createObjectURL(new Blob(partes, { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  // Safari necesita la URL viva un rato después del clic.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** La frase como título suelto (notificación, calendario): con mayúscula inicial. */
export const tituloFrase = (frase: FraseIntencion, t: TFunction) => {
  const texto = textoFrase(frase, t)
  return texto.charAt(0).toLocaleUpperCase() + texto.slice(1)
}
