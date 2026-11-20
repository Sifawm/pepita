import type { Dia, DiaSemana, Hora } from './tipos'

/** Fecha local de `fecha` como `AAAA-MM-DD`. */
export function formatearDia(fecha: Date): Dia {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mm}-${dd}`
}

/**
 * Día lógico: `fecha(instante − horaCierre)`, en hora local.
 * Con cierre a las 04:00, la 01:00 sigue siendo el día anterior.
 */
export function diaLogico(instante: Date, horaCierre: Hora): Dia {
  const [h, min] = horaCierre.split(':').map(Number)
  // Restar sobre los campos locales evita saltos raros con el cambio de hora.
  const desplazado = new Date(
    instante.getFullYear(),
    instante.getMonth(),
    instante.getDate(),
    instante.getHours() - h,
    instante.getMinutes() - min,
  )
  return formatearDia(desplazado)
}

/**
 * El próximo instante en que cambia el día lógico: ahí se cierran los periodos de hoy (y con
 * ellos pueden aparecer fallos y diagnósticos). Sirve para volver a evaluar con la app abierta.
 */
export function proximoCierre(ahora: Date, horaCierre: Hora): Date {
  const [h, min] = horaCierre.split(':').map(Number)
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, min)
  return hoy > ahora ? hoy : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, h, min)
}

// Aritmética de días sobre `AAAA-MM-DD` en UTC: sin husos ni cambios de hora.
const aFecha = (dia: Dia) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}
const deFecha = (fecha: Date): Dia => fecha.toISOString().slice(0, 10)

export function sumarDias(dia: Dia, dias: number): Dia {
  const fecha = aFecha(dia)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return deFecha(fecha)
}

/** 1 = lunes … 7 = domingo. */
export const diaDeLaSemana = (dia: Dia) => (((aFecha(dia).getUTCDay() + 6) % 7) + 1) as DiaSemana

/** Día, semana (lunes a domingo) o mes natural que contiene `dia`. */
export function periodoDe(dia: Dia, periodo: 'dia' | 'semana' | 'mes'): { desde: Dia; hasta: Dia } {
  if (periodo === 'dia') return { desde: dia, hasta: dia }
  if (periodo === 'semana') {
    const desde = sumarDias(dia, 1 - diaDeLaSemana(dia))
    return { desde, hasta: sumarDias(desde, 6) }
  }
  const [a, m] = dia.split('-').map(Number)
  return { desde: `${dia.slice(0, 7)}-01`, hasta: deFecha(new Date(Date.UTC(a, m, 0))) }
}
