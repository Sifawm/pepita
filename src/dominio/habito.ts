import { diaLogico } from './calendario'
import { cambiarRegla } from './versiones'
import type { Ajustes, Frecuencia, Habito, LeyesInversas, Nuevo, TipoHabito } from './tipos'

/** Lo que pide el asistente. Solo el nombre es obligatorio; un paso saltado deja su campo vacío. */
export interface CamposHabito {
  nombre: string
  identidadId: string
  frecuencia: Frecuencia
  versionMinima?: string
  versionCompleta?: string
  /** Solo cuenta en hábitos a evitar. */
  leyesInversas?: LeyesInversas
}

export interface DatosHabito extends Omit<CamposHabito, 'frecuencia'> {
  orden: number
  /** Por defecto, una vez al día. */
  frecuencia?: Frecuencia
  /** Por defecto, sí/no. El tipo no cambia después de crear el hábito. */
  tipo?: TipoHabito
}

/** Recorta los textos y quita los vacíos: un campo sin escribir no se guarda. */
const textos = <T extends object>(campos: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(campos)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      .filter(([, v]) => v),
  ) as Partial<T>

function limpiar<T extends Partial<CamposHabito>>({ versionMinima, versionCompleta, ...campos }: T) {
  return { ...campos, ...(campos.nombre !== undefined && { nombre: campos.nombre.trim() }), ...textos({ versionMinima, versionCompleta }) }
}

/** Las leyes inversas, solo en `evitar` y solo si queda algún paso rellenado. */
function leyes(tipo: TipoHabito, leyesInversas: LeyesInversas = {}) {
  const l = textos(leyesInversas)
  return tipo === 'evitar' && Object.keys(l).length ? { leyesInversas: l } : {}
}

/** Un hábito que empieza el día lógico en que se crea. */
export function nuevoHabito(
  { frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }, tipo = 'si_no', leyesInversas, ...datos }: DatosHabito,
  ahora: Date,
  ajustes: Ajustes,
): Nuevo<Habito> {
  return {
    ...limpiar(datos),
    tipo,
    frecuencia,
    ...leyes(tipo, leyesInversas),
    fechaInicio: diaLogico(ahora, ajustes.horaCierre),
    archivado: false,
  }
}

/**
 * Aplica lo que devuelve el asistente al editar. Inicio, orden, tipo y archivo no cambian; una
 * frecuencia nueva pasa por `cambiarRegla` para que los periodos cerrados conserven la suya.
 */
export function editarHabito(
  habito: Habito,
  { nombre, identidadId, frecuencia, versionMinima, versionCompleta, leyesInversas }: CamposHabito,
  ahora: Date,
  ajustes: Ajustes,
): Habito {
  const otraRegla = JSON.stringify(frecuencia) !== JSON.stringify(habito.frecuencia)
  const conRegla = otraRegla ? cambiarRegla({ habito, regla: { frecuencia }, ahora, ajustes }) : habito
  const editado = { ...conRegla, ...limpiar({ nombre, identidadId }) }
  delete editado.versionMinima
  delete editado.versionCompleta
  delete editado.leyesInversas
  return { ...editado, ...limpiar({ versionMinima, versionCompleta }), ...leyes(habito.tipo, leyesInversas) }
}
