import { diaLogico } from './calendario'
import { evaluarHabito, type Periodo } from './evaluacion'
import type { Ajustes, Dia, Habito, Identidad, Nuevo, Registro } from './tipos'

export interface TarjetaHoy {
  habito: Habito
  identidad: Identidad
  /** Registros del hábito en el día lógico actual, del más antiguo al más reciente. */
  registros: Registro[]
  /** Hoy ya está hecho: un toque más deshace el último registro del día. */
  hecho: boolean
  /** El periodo en curso, con lo que lleva («2 de 3»). */
  periodo: Periodo
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

/** Registros que un día admite por toques: `veces` si el periodo es el día; si no, uno. */
const hechoHoy = ({ frecuencia: f }: Habito, registrosDelDia: Registro[]) =>
  registrosDelDia.length >= (f.tipo === 'veces_por_periodo' && f.periodo === 'dia' ? f.veces : 1)

export function componerHoy({
  habitos,
  identidades,
  registros,
  ahora,
  ajustes,
}: Contexto & { habitos: Habito[]; identidades: Identidad[]; registros: Registro[] }): Hoy {
  const dia = diaLogico(ahora, ajustes.horaCierre)
  const tarjetas = habitos
    .filter((h) => !h.archivado)
    .sort((a, b) => a.orden - b.orden)
    .flatMap((habito) => {
      const identidad = identidades.find((i) => i.id === habito.identidadId)
      const periodo = evaluarHabito({ habito, registros, ahora, ajustes }).actual
      // Sin periodo, aún no ha empezado; no programado, hoy no le toca.
      if (!identidad || !periodo || periodo.estado === 'no_programado') return []
      const propios = delDia(registros, habito.id, dia)
      return [{ habito, identidad, registros: propios, hecho: hechoHoy(habito, propios), periodo }]
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

/** Un toque registra la versión mínima; sobre un hábito ya hecho hoy, deshace el último registro del día. */
export function toque({
  habito,
  registros,
  ahora,
  ajustes,
}: Contexto & { habito: Habito; registros: Registro[] }): AccionToque {
  const dia = diaLogico(ahora, ajustes.horaCierre)
  const propios = delDia(registros, habito.id, dia)
  if (hechoHoy(habito, propios)) return { tipo: 'deshacer', registroId: propios[propios.length - 1].id }
  return { tipo: 'registrar', registro: { habitoId: habito.id, dia, tipo: 'minima' } }
}
