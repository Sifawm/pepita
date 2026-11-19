import { diaLogico } from './calendario'
import { cambiarRegla } from './versiones'
import type { Ajustes, Frecuencia, Habito, Nuevo } from './tipos'

/** Lo que pide el asistente. Solo el nombre es obligatorio; un paso saltado deja su campo vacío. */
export interface CamposHabito {
  nombre: string
  identidadId: string
  frecuencia: Frecuencia
  versionMinima?: string
  versionCompleta?: string
}

export interface DatosHabito extends Omit<CamposHabito, 'frecuencia'> {
  orden: number
  /** Por defecto, una vez al día. */
  frecuencia?: Frecuencia
}

/** Recorta los textos y quita los vacíos: un campo sin escribir no se guarda. */
function limpiar<T extends Partial<CamposHabito>>({ versionMinima, versionCompleta, ...campos }: T) {
  const textos = Object.entries({ versionMinima, versionCompleta })
    .map(([k, v]) => [k, v?.trim()])
    .filter(([, v]) => v)
  return { ...campos, ...(campos.nombre !== undefined && { nombre: campos.nombre.trim() }), ...Object.fromEntries(textos) }
}

/** Un hábito sí/no que empieza el día lógico en que se crea. */
export function nuevoHabito(
  { frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }, ...datos }: DatosHabito,
  ahora: Date,
  ajustes: Ajustes,
): Nuevo<Habito> {
  return {
    ...limpiar(datos),
    tipo: 'si_no',
    frecuencia,
    fechaInicio: diaLogico(ahora, ajustes.horaCierre),
    archivado: false,
  }
}

/**
 * Aplica lo que devuelve el asistente al editar. Inicio, orden y archivo no cambian; una
 * frecuencia nueva pasa por `cambiarRegla` para que los periodos cerrados conserven la suya.
 */
export function editarHabito(
  habito: Habito,
  { nombre, identidadId, frecuencia, versionMinima, versionCompleta }: CamposHabito,
  ahora: Date,
  ajustes: Ajustes,
): Habito {
  const otraRegla = JSON.stringify(frecuencia) !== JSON.stringify(habito.frecuencia)
  const conRegla = otraRegla ? cambiarRegla({ habito, regla: { frecuencia }, ahora, ajustes }) : habito
  const editado = { ...conRegla, ...limpiar({ nombre, identidadId }) }
  delete editado.versionMinima
  delete editado.versionCompleta
  return { ...editado, ...limpiar({ versionMinima, versionCompleta }) }
}
