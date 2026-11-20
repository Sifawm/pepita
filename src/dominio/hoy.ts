import { diaLogico } from './calendario'
import { esVoto, evaluarHabito, type Periodo, type Racha } from './evaluacion'
import { pausaEn, pausaGlobalEn } from './pausa'
import type { Ajustes, Dia, Habito, Identidad, Nuevo, Pausa, Registro } from './tipos'

export interface TarjetaHoy {
  habito: Habito
  identidad: Identidad
  /** Registros (mínima o completa) del hábito en el día lógico actual, del más antiguo al más reciente. */
  registros: Registro[]
  /** Hoy ya está hecho: un toque más deshace el último registro del día. */
  hecho: boolean
  /** El periodo en curso, con lo que lleva («2 de 3»). */
  periodo: Periodo
  /** El salto que deja neutro el periodo en curso (para deshacerlo). */
  salto?: Registro
  /** La pausa (del hábito o global) en la que está hoy. */
  pausa?: Pausa
  /** Hábito a evitar: las recaídas del día lógico actual (la última, para deshacerla). */
  recaidas: Registro[]
  /** El periodo anterior fue un fallo: va arriba del todo y sugiere la versión mínima. */
  enRecuperacion: boolean
  racha: Racha
}

export interface Hoy {
  dia: Dia
  /** Votos sumados hoy: +1 por cada registro de versión mínima o completa. */
  votos: number
  habitos: TarjetaHoy[]
  /** La pausa global, si dura hoy. */
  pausaGlobal?: Pausa
}

interface Contexto {
  ahora: Date
  ajustes: Ajustes
}

const delDia = (registros: Registro[], habitoId: string, dia: Dia) =>
  registros
    .filter((r) => r.habitoId === habitoId && r.dia === dia && esVoto(r))
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
    .filter((h) => !h.archivado && (!identidadId || h.identidadId === identidadId))
    .sort((a, b) => a.orden - b.orden)
    .flatMap((habito) => {
      const identidad = identidades.find((i) => i.id === habito.identidadId)
      // Archivar una identidad retira sus hábitos de Hoy sin tocarlos.
      if (!identidad || identidad.archivada) return []
      const { actual: periodo, enRecuperacion, racha } = evaluarHabito({ habito, registros, ahora, ajustes })
      // Sin periodo, aún no ha empezado; no programado, hoy no le toca.
      if (!periodo || periodo.estado === 'no_programado') return []
      const propios = delDia(registros, habito.id, dia)
      const salto =
        periodo.estado === 'saltado'
          ? registros.findLast(
              (r) => r.habitoId === habito.id && r.tipo === 'salto' && r.dia >= periodo.desde && r.dia <= periodo.hasta,
            )
          : undefined
      return [
        {
          habito,
          identidad,
          registros: propios,
          hecho: hechoHoy(habito, propios),
          periodo,
          salto,
          pausa: pausaEn(habito, ajustes, dia),
          recaidas: registros.filter((r) => r.habitoId === habito.id && r.dia === dia && r.tipo === 'recaida'),
          enRecuperacion,
          racha,
        },
      ]
    })
    // Primero los que están en recuperación (orden estable: dentro de cada grupo, por `orden`).
    .sort((a, b) => Number(b.enRecuperacion) - Number(a.enRecuperacion))
  return {
    dia,
    votos: tarjetas.reduce((n, t) => n + t.registros.length, 0),
    habitos: tarjetas,
    pausaGlobal: pausaGlobalEn(ajustes, dia),
  }
}

export type AccionToque =
  | { tipo: 'registrar'; registro: Nuevo<Registro> }
  | { tipo: 'deshacer'; registroId: string }

/**
 * Un toque registra la versión mínima; la pulsación larga, la completa (`version`).
 * Sobre un hábito ya hecho hoy, deshace el último registro del día.
 */
export function toque({
  habito,
  registros,
  ahora,
  ajustes,
  version = 'minima',
}: Contexto & { habito: Habito; registros: Registro[]; version?: 'minima' | 'completa' }): AccionToque {
  const dia = diaLogico(ahora, ajustes.horaCierre)
  const propios = delDia(registros, habito.id, dia)
  if (hechoHoy(habito, propios)) return { tipo: 'deshacer', registroId: propios[propios.length - 1].id }
  return { tipo: 'registrar', registro: { habitoId: habito.id, dia, tipo: version } }
}

/** Pone (o quita, si queda vacía) la nota opcional de cualquier registro. */
export function anotar(registro: Registro, texto: string): Registro {
  const anotado: Registro = { ...registro, nota: texto.trim() }
  if (!anotado.nota) delete anotado.nota
  return anotado
}

/** Saltar el periodo en curso: un registro neutro en el día lógico, con motivo si lo hay. */
export function saltar({ habito, motivo, ahora, ajustes }: Contexto & { habito: Habito; motivo?: string }): Nuevo<Registro> {
  const texto = motivo?.trim()
  return {
    habitoId: habito.id,
    dia: diaLogico(ahora, ajustes.horaCierre),
    tipo: 'salto',
    ...(texto ? { motivo: texto } : {}),
  }
}

/** «He recaído» (hábito a evitar): un registro en el día lógico, con su disparador si lo hay. */
export function recaer({ habito, disparador, ahora, ajustes }: Contexto & { habito: Habito; disparador?: string }): Nuevo<Registro> {
  const texto = disparador?.trim()
  return {
    habitoId: habito.id,
    dia: diaLogico(ahora, ajustes.horaCierre),
    tipo: 'recaida',
    ...(texto ? { disparador: texto } : {}),
  }
}
