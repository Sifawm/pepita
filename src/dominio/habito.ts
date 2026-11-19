import { diaLogico } from './calendario'
import type { Ajustes, Frecuencia, Habito, Nuevo } from './tipos'

export interface DatosHabito {
  nombre: string
  identidadId: string
  orden: number
  /** Por defecto, una vez al día. */
  frecuencia?: Frecuencia
}

/** Un hábito sí/no que empieza el día lógico en que se crea. */
export function nuevoHabito(
  { frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }, ...datos }: DatosHabito,
  ahora: Date,
  ajustes: Ajustes,
): Nuevo<Habito> {
  return {
    ...datos,
    tipo: 'si_no',
    frecuencia,
    fechaInicio: diaLogico(ahora, ajustes.horaCierre),
    archivado: false,
  }
}
