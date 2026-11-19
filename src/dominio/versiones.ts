import { sumarDias } from './calendario'
import { evaluarHabito } from './evaluacion'
import type { Ajustes, Dia, Habito, Regla } from './tipos'

/** La regla que rige `dia` y el tramo de días en que rige (`desde`/`hasta` sin límite si faltan). */
export function reglaEn(habito: Habito, dia: Dia): Regla & { desde?: Dia; hasta?: Dia } {
  const versiones = habito.versiones ?? []
  const i = versiones.findIndex((v) => dia <= v.hasta)
  const anterior = versiones[i === -1 ? versiones.length - 1 : i - 1]
  const desde = anterior && sumarDias(anterior.hasta, 1)
  if (i === -1) return { frecuencia: habito.frecuencia, desde }
  return { ...versiones[i], desde }
}

/**
 * Cambia la regla desde el periodo en curso: los periodos ya cerrados se siguen evaluando
 * con la regla que regía entonces. Si con la regla actual aún no se cerró ninguno, la sustituye.
 */
export function cambiarRegla({ habito, regla, ahora, ajustes }: { habito: Habito; regla: Regla; ahora: Date; ajustes: Ajustes }): Habito {
  const actual = evaluarHabito({ habito, registros: [], ahora, ajustes }).actual
  const ultima = habito.versiones?.at(-1)
  const inicio = ultima ? sumarDias(ultima.hasta, 1) : habito.fechaInicio
  const cambiado = { ...habito, ...regla }
  if (!actual || actual.desde <= inicio) return cambiado
  return { ...cambiado, versiones: [...(habito.versiones ?? []), { frecuencia: habito.frecuencia, hasta: sumarDias(actual.desde, -1) }] }
}
