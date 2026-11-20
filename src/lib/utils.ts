import { clsx, type ClassValue } from 'clsx'
import type { TFunction } from 'i18next'
import { twMerge } from 'tailwind-merge'
import type { Dia, FraseIntencion, Identidad } from '@/dominio'

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
