import { diaLogico, sumarDias } from './calendario'
import { pausasDe } from './evaluacion'
import type { Ajustes, Dia, Habito, Pausa } from './tipos'

interface Contexto {
  ahora: Date
  ajustes: Ajustes
}

const contiene = (p: Pausa, dia: Dia) => p.desde <= dia && dia <= p.hasta

/** La pausa (del hábito o la global) que cubre `dia`, si la hay. */
export const pausaEn = (habito: Habito, ajustes: Ajustes, dia: Dia) => pausasDe(habito, ajustes).find((p) => contiene(p, dia))

/** La global, solo mientras dura: pasado `hasta` deja de aplicar sola. */
export const pausaGlobalEn = (ajustes: Ajustes, dia: Dia) =>
  ajustes.pausaGlobal && contiene(ajustes.pausaGlobal, dia) ? ajustes.pausaGlobal : undefined

/** Si la pausa cubre hoy, acaba ayer (o desaparece si empezaba hoy); si no, se queda igual. */
function acabarAyer(p: Pausa, hoy: Dia): Pausa | undefined {
  if (!contiene(p, hoy)) return p
  const ayer = sumarDias(hoy, -1)
  return p.desde > ayer ? undefined : { ...p, hasta: ayer }
}

export const pausarHabito = (habito: Habito, pausa: Pausa): Habito => ({
  ...habito,
  pausas: [...(habito.pausas ?? []), pausa],
})

/**
 * Calibración: lo que dura la pausa de un toque que ofrece el diagnóstico de la 4ª ley. El
 * spec no fija la duración; una semana da aire sin que el hábito se olvide. Afínalo con el uso.
 */
export const DIAS_PAUSA_DIAGNOSTICO = 7

/** «Pausar» desde el diagnóstico: `DIAS_PAUSA_DIAGNOSTICO` días a partir de hoy (incluido). */
export function pausaDeDiagnostico({ habito, ahora, ajustes }: Contexto & { habito: Habito }): Habito {
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  return pausarHabito(habito, { desde: hoy, hasta: sumarDias(hoy, DIAS_PAUSA_DIAGNOSTICO - 1) })
}

/** Reanudar hoy: la pausa en curso acaba ayer; las pasadas y las futuras se quedan. */
export function reanudarHabito(habito: Habito, ahora: Date, ajustes: Ajustes): Habito {
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  return { ...habito, pausas: (habito.pausas ?? []).flatMap((p) => acabarAyer(p, hoy) ?? []) }
}

/**
 * Pausa global desde hoy hasta `hasta`. Solo cabe una: la anterior se copia a las pausas de
 * cada hábito (`habitos` = los que cambian) para que sus días sigan sin contar como fallo.
 */
export function activarPausaGlobal({ habitos, hasta, ahora, ajustes }: Contexto & { habitos: Habito[]; hasta: Dia }) {
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  const anterior = ajustes.pausaGlobal && acabarAyer(ajustes.pausaGlobal, hoy)
  return {
    pausaGlobal: { desde: hoy, hasta },
    habitos: anterior ? habitos.map((h) => pausarHabito(h, anterior)) : [],
  }
}

/** Terminar las vacaciones hoy: el nuevo valor de `pausaGlobal` (se conserva lo ya pausado). */
export function terminarPausaGlobal({ ahora, ajustes }: Contexto): Pausa | undefined {
  return ajustes.pausaGlobal && acabarAyer(ajustes.pausaGlobal, diaLogico(ahora, ajustes.horaCierre))
}
