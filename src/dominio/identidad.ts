import { diaLogico } from './calendario'
import { evaluarHabito } from './evaluacion'
import type { Ajustes, Dia, Habito, HitoCelebrado, Identidad, Nuevo, Registro } from './tipos'

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
  /** Curva de votos acumulados: un punto por cada día con votos, en orden. */
  serie: { dia: Dia; votos: number }[]
  /** Hitos alcanzados y el día en que se llegó a cada uno. */
  hitos: { umbral: number; dia: Dia }[]
  /** Umbrales alcanzados que aún no están en `HitoCelebrado`, de menor a mayor. */
  porCelebrar: number[]
}

/**
 * Calibración: votos de una identidad que Pepita celebra de forma especial, una sola vez cada uno.
 * Afínalos con el uso real; un umbral nuevo se celebra al alcanzarlo (o enseguida, si ya se pasó).
 */
export const HITOS = [10, 25, 50, 100, 250, 500, 1000]

/** Votos de cada identidad («General» incluida), en el orden de la lista. */
export function resumirIdentidades({
  identidades,
  habitos,
  registros,
  hitosCelebrados = [],
  ahora,
  ajustes,
}: {
  identidades: Identidad[]
  habitos: Habito[]
  registros: Registro[]
  hitosCelebrados?: HitoCelebrado[]
  ahora: Date
  ajustes: Ajustes
}): ResumenIdentidad[] {
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  return [...identidades]
    .sort((a, b) => a.orden - b.orden)
    .map((identidad) => {
      // Los votos salen de la evaluación de cada hábito: un tipo nuevo los cambia allí, no aquí.
      const dias = habitos
        .filter((h) => h.identidadId === identidad.id)
        .flatMap((habito) => evaluarHabito({ habito, registros, ahora, ajustes }).diasVoto)
        .sort()
      const serie: ResumenIdentidad['serie'] = []
      dias.forEach((dia, i) => {
        if (serie.at(-1)?.dia === dia) serie.at(-1)!.votos++
        else serie.push({ dia, votos: i + 1 })
      })
      // Celebrado queda celebrado: bajar del umbral al editar y volver a subir no lo relanza.
      const hitos = HITOS.filter((umbral) => umbral <= dias.length).map((umbral) => ({ umbral, dia: dias[umbral - 1] }))
      const celebrados = new Set(hitosCelebrados.filter((h) => h.identidadId === identidad.id).map((h) => h.umbral))
      const porCelebrar = hitos.map((h) => h.umbral).filter((u) => !celebrados.has(u))
      return { identidad, votos: dias.length, votosHoy: dias.filter((d) => d === hoy).length, serie, hitos, porCelebrar }
    })
}
