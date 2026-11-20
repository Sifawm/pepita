import { periodoDe } from './calendario'
import { evaluarHabito } from './evaluacion'
import { sugerenciasEscalado, type Sugerencia } from './escalado'
import type { Ajustes, Diagnostico, Dia, Habito, Identidad, Registro, RevisionSemanal, SugerenciaDescartada } from './tipos'

/** Los pasos del método que Pepita recuerda con suavidad si quedaron sin rellenar. */
export type CampoMetodo = 'identidad' | 'versionMinima' | 'intencion' | 'entorno' | 'recompensa'

/** Los campos vacíos de un hábito, solo entre los que tienen sentido para su tipo. */
function camposVacios(habito: Habito, general: string | undefined): CampoMetodo[] {
  const construir = habito.tipo !== 'evitar'
  // En un cuantitativo «al menos», la versión mínima es su objetivo mínimo; «como mucho» no tiene.
  const minima = habito.tipo === 'si_no' ? !habito.versionMinima : habito.cuantitativo?.modo === 'al_menos' && habito.cuantitativo.objetivoMinimo === undefined
  const vacios: [CampoMetodo, boolean][] = [
    ['identidad', habito.identidadId === general],
    ['versionMinima', minima],
    ['intencion', construir && !habito.intencion],
    ['entorno', construir && !habito.entorno?.length],
    ['recompensa', construir && !habito.recompensaAsociada],
  ]
  return vacios.filter(([, vacio]) => vacio).map(([campo]) => campo)
}

export interface Revision {
  /** Lunes de la primera semana y domingo de la última. */
  desde: Dia
  hasta: Dia
  /** Votos ganados en el periodo, por identidad (las activas y las que sumaron), en su orden. */
  votos: { identidad: Identidad; votos: number }[]
  /** Las notas libres de las semanas del periodo, en orden. */
  notas: RevisionSemanal[]
  // Lo que sigue es el estado de hoy (no del periodo): lo que pide atención ahora.
  /** Hábitos activos en recuperación, en su orden. */
  enRecuperacion: Habito[]
  /** Diagnósticos sin responder (pendientes y pospuestos) de hábitos activos. */
  diagnosticos: { diagnostico: Diagnostico; habito: Habito }[]
  sugerencias: { habito: Habito; sugerencia: Sugerencia }[]
  /** Hábitos activos con algún paso del método sin rellenar (colgar de «General» cuenta como sin identidad). */
  camposVacios: { habito: Habito; campos: CampoMetodo[] }[]
}

/**
 * La revisión de las semanas (de lunes a domingo) que van de la de `desde` a la de `hasta`
 * (por defecto, solo la de `desde`).
 */
export function revision({
  desde,
  hasta = desde,
  identidades,
  habitos,
  registros,
  diagnosticos,
  sugerenciasDescartadas,
  revisionesSemanales,
  ahora,
  ajustes,
}: {
  desde: Dia
  hasta?: Dia
  identidades: Identidad[]
  habitos: Habito[]
  registros: Registro[]
  diagnosticos: Diagnostico[]
  sugerenciasDescartadas: SugerenciaDescartada[]
  revisionesSemanales: RevisionSemanal[]
  ahora: Date
  ajustes: Ajustes
}): Revision {
  const periodo = { desde: periodoDe(desde, 'semana').desde, hasta: periodoDe(hasta, 'semana').hasta }
  const dentro = (dia: Dia) => dia >= periodo.desde && dia <= periodo.hasta
  // Los votos salen de la evaluación de cada hábito (`diasVoto`), como en el resumen de identidad.
  const votos = [...identidades]
    .sort((a, b) => a.orden - b.orden)
    .map((identidad) => ({
      identidad,
      votos: habitos
        .filter((h) => h.identidadId === identidad.id)
        .flatMap((habito) => evaluarHabito({ habito, registros, ahora, ajustes }).diasVoto)
        .filter(dentro).length,
    }))
    .filter((v) => !v.identidad.archivada || v.votos > 0)
  const activos = habitos.filter((h) => !h.archivado).sort((a, b) => a.orden - b.orden)
  return {
    ...periodo,
    votos,
    notas: revisionesSemanales.filter((r) => dentro(r.semana)).sort((a, b) => a.semana.localeCompare(b.semana)),
    enRecuperacion: activos.filter((habito) => evaluarHabito({ habito, registros, ahora, ajustes }).enRecuperacion),
    diagnosticos: activos.flatMap((habito) =>
      diagnosticos
        .filter((d) => d.habitoId === habito.id && (d.estado === 'pendiente' || d.estado === 'pospuesto'))
        .map((diagnostico) => ({ diagnostico, habito })),
    ),
    sugerencias: sugerenciasEscalado({ habitos: activos, registros, diagnosticos, sugerenciasDescartadas, ahora, ajustes }),
    camposVacios: activos.flatMap((habito) => {
      const campos = camposVacios(habito, identidades.find((i) => i.esGeneral)?.id)
      return campos.length ? [{ habito, campos }] : []
    }),
  }
}
