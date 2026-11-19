import type { Dia, Hora } from './tipos'

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
