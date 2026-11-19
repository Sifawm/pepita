import { diaDeLaSemana, diaLogico, periodoDe, sumarDias } from './calendario'
import type { Ajustes, Dia, Frecuencia, Habito, Pausa, Registro } from './tipos'

export type EstadoPeriodo =
  | 'cumplido_minima'
  | 'cumplido_completa'
  | 'fallido'
  | 'saltado'
  | 'pausado'
  | 'en_curso'
  | 'no_programado'

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

/** Los registros que cuentan como hecho (y como voto): un salto no. */
export const esVoto = (r: Registro) => r.tipo === 'minima' || r.tipo === 'completa'

/** Las pausas que valen para el hábito: las suyas y la global. */
export const pausasDe = (habito: Habito, ajustes: Ajustes): Pausa[] => [
  ...(habito.pausas ?? []),
  ...(ajustes.pausaGlobal ? [ajustes.pausaGlobal] : []),
]

function estado(pide: number, registros: Registro[], { desde, hasta }: Pausa, pausas: Pausa[], hoy: Dia): EstadoPeriodo {
  if (pide === 0) return 'no_programado'
  const hechos = registros.filter(esVoto)
  // Cumplir gana a saltar o pausar: lo hecho, hecho está.
  if (hechos.length >= pide)
    return hechos.every((r) => r.tipo === 'completa') ? 'cumplido_completa' : 'cumplido_minima'
  if (registros.some((r) => r.tipo === 'salto')) return 'saltado'
  // Basta un día en pausa (ya llegado) para que el periodo no pueda fallar: Pepita nunca culpa.
  const llegado = hasta < hoy ? hasta : hoy
  if (pausas.some((p) => p.desde <= llegado && p.hasta >= desde)) return 'pausado'
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
  const pausas = pausasDe(habito, ajustes)
  const periodos: Periodo[] = []
  for (let dia = habito.fechaInicio; dia <= hoy; ) {
    // La regla se pide por periodo: aquí entrarán las versiones con fecha de vigencia.
    const { desde, hasta, pide } = periodoQueContiene(dia, habito.frecuencia)
    const dentro = propios.filter((r) => r.dia >= desde && r.dia <= hasta)
    periodos.push({ desde, hasta, pide, hechos: dentro.filter(esVoto).length, estado: estado(pide, dentro, { desde, hasta }, pausas, hoy) })
    dia = sumarDias(hasta, 1)
  }
  return { periodos, actual: periodos.at(-1), votos: propios.filter(esVoto).length }
}
