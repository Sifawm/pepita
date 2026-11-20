import { diaDeLaSemana, diaLogico, periodoDe, sumarDias } from './calendario'
import type { Ajustes, Dia, Frecuencia, Habito, Pausa, Registro, Regla } from './tipos'
import { reglaEn } from './versiones'

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
  /** Registros que pide para cumplirse (0 si no está programado); en un cuantitativo, su objetivo. */
  pide: number
  /** Registros hechos dentro del periodo; en un cuantitativo, la suma de sus valores. */
  hechos: number
  estado: EstadoPeriodo
}

export interface EvaluacionHabito {
  /** Desde el que contiene `fechaInicio` hasta el que contiene hoy, en orden. */
  periodos: Periodo[]
  /** El periodo que contiene hoy; no existe si el hábito aún no ha empezado. */
  actual?: Periodo
  /** `si_no`: un voto por registro, también en días no programados; `cuantitativo`: uno por periodo cumplido. Es `diasVoto.length`. */
  votos: number
  /**
   * El día en que se ganó cada voto, en orden: la única fuente de votos del núcleo (resumen de
   * identidad, curva, hitos). Un tipo nuevo (cuantitativo, evitar) cambia aquí cómo se ganan.
   */
  diasVoto: Dia[]
  /** En periodos. Un fallo aislado no suma ni la rompe; el segundo seguido la pone a 0. */
  racha: Racha
  /** El último periodo cerrado y evaluable fue un fallo, y el actual se puede cumplir aún. */
  enRecuperacion: boolean
  /** Fallos seguidos al final (saltos, pausas y días no programados no cortan la serie). */
  fallosSeguidos: number
  /** Cada periodo que rompió la racha: el segundo fallo de cada serie, uno por ruptura. */
  rupturas: Periodo[]
}

export interface Racha {
  actual: number
  mejor: number
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

/** Suma de los valores (cuantitativos). */
const suma = (registros: Registro[]) => registros.reduce((n, r) => n + (r.tipo === 'valor' ? (r.valor ?? 0) : 0), 0)

/** Si el periodo ya está cumplido y con qué versión, según el tipo de hábito y su regla. */
function cumplido(pide: number, registros: Registro[], { cuantitativo: c }: Regla, cerrado: boolean): EstadoPeriodo | undefined {
  if (c) {
    const total = suma(registros)
    // «Como mucho»: se registra el exceso, no el éxito; por eso solo se sabe al cerrar.
    if (c.modo === 'como_mucho') return cerrado && total <= c.objetivo ? 'cumplido_completa' : undefined
    if (total >= c.objetivo) return 'cumplido_completa'
    return c.objetivoMinimo !== undefined && total >= c.objetivoMinimo ? 'cumplido_minima' : undefined
  }
  const hechos = registros.filter(esVoto)
  if (hechos.length < pide) return undefined
  return hechos.every((r) => r.tipo === 'completa') ? 'cumplido_completa' : 'cumplido_minima'
}

function estado(pide: number, registros: Registro[], regla: Regla, { desde, hasta }: Pausa, pausas: Pausa[], hoy: Dia): EstadoPeriodo {
  if (pide === 0) return 'no_programado'
  // Cumplir gana a saltar o pausar: lo hecho, hecho está.
  const hecho = cumplido(pide, registros, regla, hasta < hoy)
  if (hecho) return hecho
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
    // Cada periodo se evalúa con la regla que regía entonces, recortado a su tramo de vigencia.
    const regla = reglaEn(habito, dia)
    const periodo = periodoQueContiene(dia, regla.frecuencia)
    const desde = regla.desde && periodo.desde < regla.desde ? regla.desde : periodo.desde
    const hasta = regla.hasta && regla.hasta < periodo.hasta ? regla.hasta : periodo.hasta
    const c = regla.cuantitativo
    // Un cuantitativo pide su objetivo (las `veces` no cuentan: la frecuencia solo marca el periodo).
    const pide = c && periodo.pide > 0 ? c.objetivo : periodo.pide
    const dentro = propios.filter((r) => r.dia >= desde && r.dia <= hasta)
    const hechos = c ? suma(dentro) : dentro.filter(esVoto).length
    periodos.push({ desde, hasta, pide, hechos, estado: estado(pide, dentro, regla, { desde, hasta }, pausas, hoy) })
    dia = sumarDias(hasta, 1)
  }
  // `si_no`: 1 voto por registro; `cuantitativo`: 1 por periodo cumplido, el día en que se ganó.
  const diasVoto = (habito.tipo === 'cuantitativo' ? diasVotoCuantitativo(periodos, propios, habito) : propios.filter(esVoto).map((r) => r.dia)).sort()
  return { periodos, actual: periodos.at(-1), votos: diasVoto.length, diasVoto, ...racha(periodos) }
}

/**
 * El día en que cada periodo cuantitativo cumplido ganó su voto: en «al menos», el del registro con el
 * que la suma llegó al primer umbral (mínimo u objetivo); en «como mucho», su último día (se gana al cerrar).
 */
function diasVotoCuantitativo(periodos: Periodo[], registros: Registro[], habito: Habito): Dia[] {
  return periodos.filter(estaCumplido).map(({ desde, hasta }) => {
    const c = reglaEn(habito, desde).cuantitativo
    if (!c || c.modo === 'como_mucho') return hasta
    const umbral = c.objetivoMinimo ?? c.objetivo
    let total = 0
    const valores = registros.filter((r) => r.tipo === 'valor' && r.dia >= desde && r.dia <= hasta).sort((a, b) => a.dia.localeCompare(b.dia))
    return valores.find((r) => (total += r.valor ?? 0) >= umbral)?.dia ?? hasta
  })
}

const estaCumplido = (p: Periodo) => p.estado === 'cumplido_minima' || p.estado === 'cumplido_completa'

/** Racha, recuperación y fallos seguidos. Solo cuentan los periodos cumplidos o fallidos. */
function racha(periodos: Periodo[]) {
  let actual = 0
  let mejor = 0
  let fallosSeguidos = 0
  let fallosAntesDeHoy = 0
  const rupturas: Periodo[] = []
  periodos.forEach((p, i) => {
    if (i === periodos.length - 1) fallosAntesDeHoy = fallosSeguidos
    if (estaCumplido(p)) {
      fallosSeguidos = 0
      mejor = Math.max(mejor, ++actual)
    } else if (p.estado === 'fallido' && ++fallosSeguidos === 2) {
      actual = 0
      rupturas.push(p)
    }
  })
  const hoy = periodos.at(-1)?.estado
  const evaluable = hoy === 'en_curso' || hoy === 'cumplido_minima' || hoy === 'cumplido_completa'
  return { racha: { actual, mejor }, enRecuperacion: evaluable && fallosAntesDeHoy > 0, fallosSeguidos, rupturas }
}
