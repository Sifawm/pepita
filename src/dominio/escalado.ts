import { diaLogico, sumarDias } from './calendario'
import { evaluarHabito } from './evaluacion'
import type { Ajustes, Diagnostico, Habito, Nuevo, Registro, Regla, SugerenciaDescartada, TipoSugerencia } from './tipos'

// Calibración (Ricitos de Oro): ajustables.
/** Fuerza a partir de la cual el hábito está asentado (un diario perfecto la alcanza hacia los 30 días). */
export const UMBRAL_FUERZA_ALTA = 0.8
/** Días seguidos con fuerza alta antes de sugerir subir el listón (unas 3 semanas). */
export const DIAS_FUERZA_ALTA = 21

/** Días que una sugerencia descartada (o aplicada) no vuelve a salir. */
export const DIAS_SILENCIO_SUGERENCIA = 21
/** Cuánto se mueve el objetivo de un cuantitativo al proponer un cambio (un 20 %, redondeado a entero). */
export const PASO_OBJETIVO = 0.2

/**
 * `predomina`: qué versión se cumplió más (empate = completa). Con la mínima, el texto anima a hacer más
 * a menudo la completa; con la completa, a subir el objetivo o la frecuencia.
 * `propuesta`: la regla nueva que se ofrece confirmar (solo cuantitativos; sin ella, se ajusta en el asistente).
 */
export type Sugerencia = { tipo: 'subir'; predomina: 'minima' | 'completa'; propuesta?: Regla } | { tipo: 'bajar'; propuesta?: Regla }

/** El objetivo un paso más exigente (`+1`) o más fácil (`-1`); en «como mucho», exigir es permitir menos. */
function moverObjetivo({ frecuencia, cuantitativo: c }: Habito, sentido: 1 | -1): Regla | undefined {
  if (!c) return undefined
  const mas = c.modo === 'al_menos' ? sentido : -sentido
  const objetivo = mas > 0 ? Math.ceil(c.objetivo * (1 + PASO_OBJETIVO)) : Math.floor(c.objetivo * (1 - PASO_OBJETIVO))
  return objetivo > 0 ? { frecuencia, cuantitativo: { ...c, objetivo } } : undefined
}

/**
 * Quedarse con la mínima: en «al menos» con objetivo mínimo, este pasa a ser el objetivo; si no, un objetivo
 * algo más fácil. Sí/no y evitar no tienen regla que bajar (se ajustan versiones o fricción en el asistente).
 */
function bajar(habito: Habito): Regla | undefined {
  const c = habito.cuantitativo
  if (c?.objetivoMinimo === undefined) return moverObjetivo(habito, -1)
  const { objetivoMinimo, ...resto } = c
  return { frecuencia: habito.frecuencia, cuantitativo: { ...resto, objetivo: objetivoMinimo } }
}

/** La sugerencia de escalado vigente de un hábito, si la hay. Nunca cambia nada: solo propone. */
export function sugerenciaEscalado({
  habito,
  registros,
  diagnosticos,
  sugerenciasDescartadas,
  ahora,
  ajustes,
}: {
  habito: Habito
  registros: Registro[]
  diagnosticos: Diagnostico[]
  sugerenciasDescartadas: SugerenciaDescartada[]
  ahora: Date
  ajustes: Ajustes
}): Sugerencia | undefined {
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  const silencios = sugerenciasDescartadas.filter((s) => s.habitoId === habito.id)
  const callada = (tipo: TipoSugerencia) => silencios.some((s) => s.tipo === tipo && s.hasta >= hoy)
  const { fuerza, proporcion } = evaluarHabito({ habito, registros, ahora, ajustes })
  const ultimos = fuerza.slice(-DIAS_FUERZA_ALTA)
  // Al evitar no hay listón que subir: el día limpio ya es todo.
  if (habito.tipo !== 'evitar' && ultimos.length === DIAS_FUERZA_ALTA && ultimos.every((p) => p.valor >= UMBRAL_FUERZA_ALTA)) {
    // Con fuerza alta no tiene sentido bajar, aunque subir esté descartada.
    if (callada('subir')) return undefined
    if (proporcion.minima > proporcion.completa) return { tipo: 'subir', predomina: 'minima' }
    const propuesta = moverObjetivo(habito, 1)
    return { tipo: 'subir', predomina: 'completa', ...(propuesta && { propuesta }) }
  }
  const ultimo = diagnosticos
    .filter((d) => d.habitoId === habito.id)
    .reduce<Diagnostico | undefined>((a, d) => (!a || d.periodoQueLoDisparo > a.periodoQueLoDisparo ? d : a), undefined)
  if (ultimo?.estado !== 'respondido' || ultimo.ley !== 3 || callada('bajar')) return undefined
  // Una vez por diagnóstico: atendida después de él, no vuelve aunque pasen los 21 días.
  const atendida = silencios.some((s) => s.tipo === 'bajar' && diaLogico(new Date(s.creadoEn), ajustes.horaCierre) >= ultimo.periodoQueLoDisparo)
  if (atendida) return undefined
  const propuesta = bajar(habito)
  return { tipo: 'bajar', ...(propuesta && { propuesta }) }
}

/** Lo que se guarda al descartar o aplicar una sugerencia: la silencia `DIAS_SILENCIO_SUGERENCIA` días. */
export function descartarSugerencia({ habito, tipo, ahora, ajustes }: { habito: Habito; tipo: TipoSugerencia; ahora: Date; ajustes: Ajustes }): Nuevo<SugerenciaDescartada> {
  return { habitoId: habito.id, tipo, hasta: sumarDias(diaLogico(ahora, ajustes.horaCierre), DIAS_SILENCIO_SUGERENCIA - 1) }
}

/** Las sugerencias vigentes de los hábitos activos, en su orden: para Hoy y la revisión semanal. */
export function sugerenciasEscalado({ habitos, ...resto }: Omit<Parameters<typeof sugerenciaEscalado>[0], 'habito'> & { habitos: Habito[] }) {
  return habitos.flatMap((habito) => {
    const sugerencia = habito.archivado ? undefined : sugerenciaEscalado({ ...resto, habito })
    return sugerencia ? [{ habito, sugerencia }] : []
  })
}
