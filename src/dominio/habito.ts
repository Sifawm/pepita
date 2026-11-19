import { diaLogico } from './calendario'
import type { Ajustes, Habito, Nuevo } from './tipos'

export interface DatosHabito {
  nombre: string
  identidadId: string
  orden: number
}

/** Un hábito sí/no diario que empieza el día lógico en que se crea. */
export function nuevoHabito(datos: DatosHabito, ahora: Date, ajustes: Ajustes): Nuevo<Habito> {
  return {
    ...datos,
    tipo: 'si_no',
    frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
    fechaInicio: diaLogico(ahora, ajustes.horaCierre),
    archivado: false,
  }
}
