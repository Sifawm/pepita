import { diaLogico } from './calendario'
import { cambiarRegla } from './versiones'
import type { Ajustes, Cuantitativo, Frecuencia, Habito, Nuevo, TipoHabito } from './tipos'

/** Lo que pide el asistente. Solo el nombre es obligatorio; un paso saltado deja su campo vacío. */
export interface CamposHabito {
  nombre: string
  identidadId: string
  frecuencia: Frecuencia
  /** Por defecto, sí/no. Solo cuenta al crear: editar no cambia el tipo. */
  tipo?: TipoHabito
  /** Solo en `cuantitativo`. */
  cuantitativo?: Cuantitativo
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

/** Lo cuantitativo, solo si el tipo lo es: unidad sin espacios y objetivo mínimo solo si tiene sentido. */
function cuantitativoDe(tipo: TipoHabito, c?: Cuantitativo) {
  if (tipo !== 'cuantitativo' || !c) return {}
  const { objetivoMinimo, ...resto } = c
  const conMinimo = c.modo === 'al_menos' && objetivoMinimo !== undefined && objetivoMinimo > 0 && objetivoMinimo < c.objetivo
  return { cuantitativo: { ...resto, unidad: c.unidad.trim(), ...(conMinimo && { objetivoMinimo }) } }
}

/** Un hábito nuevo (sí/no salvo que se diga otro tipo) que empieza el día lógico en que se crea. */
export function nuevoHabito(
  { frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }, tipo = 'si_no', cuantitativo, ...datos }: DatosHabito,
  ahora: Date,
  ajustes: Ajustes,
): Nuevo<Habito> {
  return {
    ...limpiar(datos),
    tipo,
    ...cuantitativoDe(tipo, cuantitativo),
    frecuencia,
    fechaInicio: diaLogico(ahora, ajustes.horaCierre),
    archivado: false,
  }
}

/**
 * Aplica lo que devuelve el asistente al editar. Tipo, inicio, orden y archivo no cambian; una
 * regla nueva (frecuencia u objetivo) pasa por `cambiarRegla` para que los periodos cerrados conserven la suya.
 */
export function editarHabito(
  habito: Habito,
  { nombre, identidadId, frecuencia, cuantitativo, versionMinima, versionCompleta }: CamposHabito,
  ahora: Date,
  ajustes: Ajustes,
): Habito {
  const regla = { frecuencia, ...cuantitativoDe(habito.tipo, cuantitativo) }
  // Normalizados igual los dos lados: el orden de las claves no cuenta como cambio.
  const otraRegla = JSON.stringify(regla) !== JSON.stringify({ frecuencia: habito.frecuencia, ...cuantitativoDe(habito.tipo, habito.cuantitativo) })
  const conRegla = otraRegla ? cambiarRegla({ habito, regla, ahora, ajustes }) : habito
  const editado = { ...conRegla, ...limpiar({ nombre, identidadId }) }
  delete editado.versionMinima
  delete editado.versionCompleta
  return { ...editado, ...limpiar({ versionMinima, versionCompleta }) }
}
