import { diaLogico } from './calendario'
import { cambiarRegla } from './versiones'
import type { Ajustes, Cuando, Frecuencia, Habito, Intencion, Nuevo } from './tipos'

/** Lo que pide el asistente. Solo el nombre es obligatorio; un paso saltado deja su campo vacío. */
export interface CamposHabito {
  nombre: string
  identidadId: string
  frecuencia: Frecuencia
  versionMinima?: string
  versionCompleta?: string
  intencion?: Intencion
  entorno?: string[]
  recompensaAsociada?: string
}

export interface DatosHabito extends Omit<CamposHabito, 'frecuencia'> {
  orden: number
  /** Por defecto, una vez al día. */
  frecuencia?: Frecuencia
}

/** Los campos que un paso saltado deja sin escribir. */
const OPCIONALES = ['versionMinima', 'versionCompleta', 'intencion', 'entorno', 'recompensaAsociada'] as const
type Opcionales = Pick<CamposHabito, (typeof OPCIONALES)[number]>

/** Recorta los textos y quita los vacíos (también dentro de la intención y del entorno): un campo sin escribir no se guarda. */
function opcionales({ versionMinima, versionCompleta, intencion, entorno, recompensaAsociada }: Opcionales): Opcionales {
  // Un «cuándo» con su único valor vacío (hora, ancla o acción sin elegir) no cuenta.
  const [entrada] = Object.entries(intencion?.cuando ?? {})
  const cuando = entrada?.[1].trim() ? ({ [entrada[0]]: entrada[1].trim() } as Cuando) : undefined
  const donde = intencion?.donde?.trim()
  const lista = entorno?.map((x) => x.trim()).filter(Boolean)
  const campos: Opcionales = {
    versionMinima: versionMinima?.trim(),
    versionCompleta: versionCompleta?.trim(),
    intencion: cuando || donde ? { ...(cuando && { cuando }), ...(donde && { donde }) } : undefined,
    entorno: lista?.length ? lista : undefined,
    recompensaAsociada: recompensaAsociada?.trim(),
  }
  return Object.fromEntries(Object.entries(campos).filter(([, v]) => v)) as Opcionales
}

/** Un hábito sí/no que empieza el día lógico en que se crea. */
export function nuevoHabito(
  { frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }, nombre, identidadId, orden, ...resto }: DatosHabito,
  ahora: Date,
  ajustes: Ajustes,
): Nuevo<Habito> {
  return {
    nombre: nombre.trim(),
    identidadId,
    orden,
    ...opcionales(resto),
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
  { nombre, identidadId, frecuencia, ...resto }: CamposHabito,
  ahora: Date,
  ajustes: Ajustes,
): Habito {
  const otraRegla = JSON.stringify(frecuencia) !== JSON.stringify(habito.frecuencia)
  const conRegla = otraRegla ? cambiarRegla({ habito, regla: { frecuencia }, ahora, ajustes }) : habito
  const editado = { ...conRegla, nombre: nombre.trim(), identidadId }
  for (const k of OPCIONALES) delete editado[k] // se sustituyen por los del asistente
  return { ...editado, ...opcionales(resto) }
}
