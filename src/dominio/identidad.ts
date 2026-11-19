import { diaLogico } from './calendario'
import type { Ajustes, Habito, Identidad, Nuevo, Registro } from './tipos'

/** Una identidad nueva («Soy una persona que…»), al final de la lista. */
export function nuevaIdentidad(nombre: string, identidades: Identidad[]): Nuevo<Identidad> {
  const orden = Math.max(-1, ...identidades.map((i) => i.orden)) + 1
  return { nombre: nombre.trim(), esGeneral: false, archivada: false, orden }
}

/**
 * Sube (`-1`) o baja (`+1`) una identidad un puesto entre las activas.
 * Devuelve las identidades que cambian de `orden` (ninguna si ya está en el extremo).
 */
export function moverIdentidad(identidades: Identidad[], id: string, paso: -1 | 1): Identidad[] {
  const activas = identidades.filter((i) => !i.archivada).sort((a, b) => a.orden - b.orden)
  const i = activas.findIndex((x) => x.id === id)
  const otra = activas[i + paso]
  if (i < 0 || !otra) return []
  const esta = activas[i]
  return [
    { ...esta, orden: otra.orden },
    { ...otra, orden: esta.orden },
  ]
}

export interface ResumenIdentidad {
  identidad: Identidad
  /** Votos acumulados: también los de hábitos archivados y los de identidades archivadas. */
  votos: number
  /** Votos del día lógico actual. */
  votosHoy: number
}

/** Votos de cada identidad («General» incluida), en el orden de la lista. */
export function resumirIdentidades({
  identidades,
  habitos,
  registros,
  ahora,
  ajustes,
}: {
  identidades: Identidad[]
  habitos: Habito[]
  registros: Registro[]
  ahora: Date
  ajustes: Ajustes
}): ResumenIdentidad[] {
  const dia = diaLogico(ahora, ajustes.horaCierre)
  const identidadDe = new Map(habitos.map((h) => [h.id, h.identidadId]))
  const votos = new Map<string, { votos: number; votosHoy: number }>()
  // ponytail: +1 por registro (regla de `si_no`); los votos por periodo de otros tipos llegan con la evaluación.
  for (const r of registros) {
    const id = identidadDe.get(r.habitoId)
    if (!id || (r.tipo !== 'minima' && r.tipo !== 'completa')) continue
    const v = votos.get(id) ?? { votos: 0, votosHoy: 0 }
    v.votos++
    if (r.dia === dia) v.votosHoy++
    votos.set(id, v)
  }
  return [...identidades]
    .sort((a, b) => a.orden - b.orden)
    .map((identidad) => ({ identidad, ...(votos.get(identidad.id) ?? { votos: 0, votosHoy: 0 }) }))
}
