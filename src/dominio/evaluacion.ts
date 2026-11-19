import { diaDeLaSemana, diaLogico, periodoDe, sumarDias } from './calendario'
import type { Ajustes, Dia, Frecuencia, Habito, Registro } from './tipos'

// Se ampliará con `saltado` y `pausado`.
export type EstadoPeriodo = 'cumplido_minima' | 'cumplido_completa' | 'fallido' | 'en_curso' | 'no_programado'

export interface Periodo {
  desde: Dia
  hasta: Dia
  /** Registros que pide para cumplirse (0 si no está programado). */
  pide: number
  /** Registros hechos dentro del periodo. */
  hechos: number
  estado: EstadoPeriodo
}

export interface EvaluacionHabito {
  /** Desde el que contiene `fechaInicio` hasta el que contiene hoy, en orden. */
  periodos: Periodo[]
  /** El periodo que contiene hoy; no existe si el hábito aún no ha empezado. */
  actual?: Periodo
  /** `si_no`: un voto por registro, también en días no programados. */
  votos: number
}

/** El periodo que contiene `dia` y lo que pide según la frecuencia. */
function periodoQueContiene(dia: Dia, frecuencia: Frecuencia) {
  if (frecuencia.tipo === 'dias_semana')
    return { desde: dia, hasta: dia, pide: frecuencia.dias.includes(diaDeLaSemana(dia)) ? 1 : 0 }
  return { ...periodoDe(dia, frecuencia.periodo), pide: frecuencia.veces }
}

function estado(pide: number, registros: Registro[], hasta: Dia, hoy: Dia): EstadoPeriodo {
  if (pide === 0) return 'no_programado'
  if (registros.length >= pide)
    return registros.every((r) => r.tipo === 'completa') ? 'cumplido_completa' : 'cumplido_minima'
  // Sin cumplir solo es fallo cuando el periodo ya se ha cerrado.
  return hasta < hoy ? 'fallido' : 'en_curso'
}

export function evaluarHabito({
  habito,
  registros,
  ahora,
  ajustes,
}: {
  habito: Habito
  registros: Registro[]
  ahora: Date
  ajustes: Ajustes
}): EvaluacionHabito {
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  const propios = registros.filter((r) => r.habitoId === habito.id)
  const periodos: Periodo[] = []
  for (let dia = habito.fechaInicio; dia <= hoy; ) {
    // La regla se pide por periodo: aquí entrarán las versiones con fecha de vigencia.
    const { desde, hasta, pide } = periodoQueContiene(dia, habito.frecuencia)
    const dentro = propios.filter((r) => r.dia >= desde && r.dia <= hasta)
    periodos.push({ desde, hasta, pide, hechos: dentro.length, estado: estado(pide, dentro, hasta, hoy) })
    dia = sumarDias(hasta, 1)
  }
  return { periodos, actual: periodos.at(-1), votos: propios.length }
}
