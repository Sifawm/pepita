import { diaLogico } from './calendario'
import type { Ajustes, Dia, Habito, Identidad, Nuevo, Registro } from './tipos'

export interface TarjetaHoy {
  habito: Habito
  identidad: Identidad
  /** Registros del hábito en el día lógico actual, del más antiguo al más reciente. */
  registros: Registro[]
  hecho: boolean
}

export interface Hoy {
  dia: Dia
  /** Votos sumados hoy: +1 por cada registro de versión mínima o completa. */
  votos: number
  habitos: TarjetaHoy[]
}

interface Contexto {
  ahora: Date
  ajustes: Ajustes
}

const delDia = (registros: Registro[], habitoId: string, dia: Dia) =>
  registros
    .filter((r) => r.habitoId === habitoId && r.dia === dia)
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))

const cumplido = (habito: Habito, registrosDelDia: Registro[]) =>
  registrosDelDia.length >= habito.frecuencia.veces

export function componerHoy({
  habitos,
  identidades,
  registros,
  ahora,
  ajustes,
  identidadId,
}: Contexto & {
  habitos: Habito[]
  identidades: Identidad[]
  registros: Registro[]
  /** Filtro: solo los hábitos de esta identidad (y sus votos). */
  identidadId?: string
}): Hoy {
  const dia = diaLogico(ahora, ajustes.horaCierre)
  const tarjetas = habitos
    .filter((h) => !h.archivado && h.fechaInicio <= dia && (!identidadId || h.identidadId === identidadId))
    .sort((a, b) => a.orden - b.orden)
    .flatMap((habito) => {
      const identidad = identidades.find((i) => i.id === habito.identidadId)
      // Archivar una identidad retira sus hábitos de Hoy sin tocarlos.
      if (!identidad || identidad.archivada) return []
      const propios = delDia(registros, habito.id, dia)
      return [{ habito, identidad, registros: propios, hecho: cumplido(habito, propios) }]
    })
  return {
    dia,
    votos: tarjetas.reduce((n, t) => n + t.registros.length, 0),
    habitos: tarjetas,
  }
}

export type AccionToque =
  | { tipo: 'registrar'; registro: Nuevo<Registro> }
  | { tipo: 'deshacer'; registroId: string }

/** Un toque registra la versión mínima; sobre un hábito ya cumplido hoy, deshace el último registro. */
export function toque({
  habito,
  registros,
  ahora,
  ajustes,
}: Contexto & { habito: Habito; registros: Registro[] }): AccionToque {
  const dia = diaLogico(ahora, ajustes.horaCierre)
  const propios = delDia(registros, habito.id, dia)
  if (cumplido(habito, propios)) return { tipo: 'deshacer', registroId: propios[propios.length - 1].id }
  return { tipo: 'registrar', registro: { habitoId: habito.id, dia, tipo: 'minima' } }
}
