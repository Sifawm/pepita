import { diaLogico } from './calendario'
import { cambiarRegla } from './versiones'
import type { Ajustes, Cuando, Cuantitativo, Frecuencia, Habito, Intencion, LeyesInversas, Nuevo, TipoHabito } from './tipos'

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
  intencion?: Intencion
  entorno?: string[]
  recompensaAsociada?: string
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

/** Los campos que un paso saltado deja sin escribir. */
const OPCIONALES = ['versionMinima', 'versionCompleta', 'intencion', 'entorno', 'recompensaAsociada', 'leyesInversas'] as const
type Opcionales = Pick<CamposHabito, (typeof OPCIONALES)[number]>

/** Recorta los textos y quita los vacíos: un texto sin escribir no se guarda. */
const textos = <T extends object>(campos: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(campos)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      .filter(([, v]) => v),
  ) as Partial<T>

/**
 * Recorta los textos y quita los vacíos (también dentro de la intención, del entorno y de las
 * leyes inversas): un campo sin escribir no se guarda. Las leyes inversas, solo en `evitar`.
 */
function opcionales(tipo: TipoHabito, { versionMinima, versionCompleta, intencion, entorno, recompensaAsociada, leyesInversas }: Opcionales): Opcionales {
  // Un «cuándo» con su único valor vacío (hora, ancla o acción sin elegir) no cuenta.
  const [entrada] = Object.entries(intencion?.cuando ?? {})
  const cuando = entrada?.[1].trim() ? ({ [entrada[0]]: entrada[1].trim() } as Cuando) : undefined
  const donde = intencion?.donde?.trim()
  const lista = entorno?.map((x) => x.trim()).filter(Boolean)
  const leyes = textos(leyesInversas ?? {})
  const campos: Opcionales = {
    versionMinima: versionMinima?.trim(),
    versionCompleta: versionCompleta?.trim(),
    intencion: cuando || donde ? { ...(cuando && { cuando }), ...(donde && { donde }) } : undefined,
    entorno: lista?.length ? lista : undefined,
    recompensaAsociada: recompensaAsociada?.trim(),
    leyesInversas: tipo === 'evitar' && Object.keys(leyes).length ? leyes : undefined,
  }
  return Object.fromEntries(Object.entries(campos).filter(([, v]) => v)) as Opcionales
}

/** Lo cuantitativo, solo si el tipo lo es: unidad sin espacios y objetivo mínimo solo si tiene sentido. */
function cuantitativoDe(tipo: TipoHabito, c?: Cuantitativo) {
  if (tipo !== 'cuantitativo' || !c) return {}
  const { objetivoMinimo, ...resto } = c
  const conMinimo = c.modo === 'al_menos' && objetivoMinimo !== undefined && objetivoMinimo > 0 && objetivoMinimo < c.objetivo
  return { cuantitativo: { ...resto, unidad: c.unidad.trim(), ...(conMinimo && { objetivoMinimo }) } }
}

/** Un hábito que empieza el día lógico en que se crea. */
export function nuevoHabito(
  { frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }, tipo = 'si_no', cuantitativo, nombre, identidadId, orden, ...resto }: DatosHabito,
  ahora: Date,
  ajustes: Ajustes,
): Nuevo<Habito> {
  return {
    nombre: nombre.trim(),
    identidadId,
    orden,
    ...opcionales(tipo, resto),
    tipo,
    ...cuantitativoDe(tipo, cuantitativo),
    frecuencia,
    fechaInicio: diaLogico(ahora, ajustes.horaCierre),
    archivado: false,
  }
}

/**
 * Aplica lo que devuelve el asistente al editar. Inicio, orden, tipo y archivo no cambian; una
 * regla nueva (frecuencia u objetivo) pasa por `cambiarRegla` para que los periodos cerrados conserven la suya.
 */
export function editarHabito(
  habito: Habito,
  { nombre, identidadId, frecuencia, cuantitativo, ...resto }: CamposHabito,
  ahora: Date,
  ajustes: Ajustes,
): Habito {
  const regla = { frecuencia, ...cuantitativoDe(habito.tipo, cuantitativo) }
  // Normalizados igual los dos lados: el orden de las claves no cuenta como cambio.
  const otraRegla = JSON.stringify(regla) !== JSON.stringify({ frecuencia: habito.frecuencia, ...cuantitativoDe(habito.tipo, habito.cuantitativo) })
  const conRegla = otraRegla ? cambiarRegla({ habito, regla, ahora, ajustes }) : habito
  const editado = { ...conRegla, nombre: nombre.trim(), identidadId }
  for (const k of OPCIONALES) delete editado[k] // se sustituyen por los del asistente
  return { ...editado, ...opcionales(habito.tipo, resto) }
}
