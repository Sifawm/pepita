/** Día lógico como `AAAA-MM-DD`. */
export type Dia = string
/** Hora local como `HH:MM`. */
export type Hora = string
/** Instante como cadena ISO 8601 (`Date.toISOString()`). */
export type Instante = string

/** Rango de días sin evaluación, ambos incluidos. */
export interface Pausa {
  desde: Dia
  hasta: Dia
}

export interface Ajustes {
  horaCierre: Hora
  /** «Vacaciones»: pausa todos los hábitos. Deja de aplicar sola después de `hasta`. */
  pausaGlobal?: Pausa
  /** Instante de la última copia JSON exportada (o la de la copia importada). */
  ultimaCopia?: Instante
}

export const AJUSTES_POR_DEFECTO: Ajustes = { horaCierre: '04:00' }

/** Todo lo que se guarda lleva `id` (UUID) y `creadoEn`; los pone la persistencia. */
export interface Entidad {
  id: string
  creadoEn: Instante
}

export interface Identidad extends Entidad {
  /** Vacío en «General»: la interfaz muestra su nombre traducido. */
  nombre: string
  esGeneral: boolean
  archivada: boolean
  orden: number
}

// Los tipos son estrechos a propósito: cada ticket los amplía cuando el núcleo sabe evaluarlos.
/** `evitar`: el periodo es siempre el día; se cumple si cierra sin recaída. */
export type TipoHabito = 'si_no' | 'evitar'

/** El asistente de leyes inversas de un hábito a evitar. Cada paso se puede saltar. */
export interface LeyesInversas {
  /** Qué señal voy a eliminar (invisible). */
  senal?: string
  /** Qué fricción voy a añadir (difícil). */
  friccion?: string
  /** Qué haré en su lugar. */
  sustituto?: string
}

/** 1 = lunes … 7 = domingo. */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Frecuencia =
  | { tipo: 'veces_por_periodo'; veces: number; periodo: 'dia' | 'semana' | 'mes' }
  | { tipo: 'dias_semana'; dias: DiaSemana[] }

export interface Habito extends Entidad {
  identidadId: string
  nombre: string
  tipo: TipoHabito
  frecuencia: Frecuencia
  /** La versión de 2 minutos. Las dos versiones son opcionales («Ahora no») y valen 1 voto. */
  versionMinima?: string
  versionCompleta?: string
  /** Solo en `evitar`, y solo si se rellenó algún paso. */
  leyesInversas?: LeyesInversas
  fechaInicio: Dia
  archivado: boolean
  orden: number
  /** Opcional: los hábitos guardados antes de las pausas no la tienen. */
  pausas?: Pausa[]
  /**
   * Reglas anteriores, de la más antigua a la más reciente: cada una rigió hasta `hasta`
   * (incluido) desde el día siguiente a la anterior (o desde el inicio). Después rige la actual.
   * Falta si la regla nunca cambió. Se cambia solo con `cambiarRegla`.
   */
  versiones?: VersionRegla[]
}

/** Lo que decide cómo se evalúa un periodo. El objetivo cuantitativo entrará aquí. */
export type Regla = Pick<Habito, 'frecuencia'>

export type VersionRegla = Regla & { hasta: Dia }

/**
 * `salto`: el periodo que lo contiene queda neutro (ni suma ni falla).
 * `recaida`: solo en `evitar`; convierte ese día en fallo.
 */
export type TipoRegistro = 'minima' | 'completa' | 'salto' | 'recaida'

export interface Registro extends Entidad {
  habitoId: string
  dia: Dia
  tipo: TipoRegistro
  nota?: string
  /** Solo en `salto`, y opcional. */
  motivo?: string
  /** Solo en `recaida`, y opcional: qué la provocó. */
  disparador?: string
}

/** Las 4 leyes del cambio: 1 obvio (señal), 2 atractivo (anhelo), 3 fácil (respuesta), 4 satisfactorio (recompensa). */
export type Ley = 1 | 2 | 3 | 4

/** Por qué falló un periodo, si la persona quiere contarlo. Una como mucho por fallo. */
export interface AnotacionDeFallo extends Entidad {
  habitoId: string
  /** `desde` del periodo fallido. */
  periodo: Dia
  ley?: Ley
  nota?: string
}

/** Un hito (`HITOS`) de una identidad ya celebrado: no se vuelve a celebrar nunca. */
export interface HitoCelebrado extends Entidad {
  identidadId: string
  umbral: number
}

/** Lo que el núcleo crea; la persistencia le añade `id` y `creadoEn`. */
export type Nuevo<T extends Entidad> = Omit<T, keyof Entidad>

/**
 * Todos los datos de la persona: lo que exporta e importa una copia.
 * Cada clave (salvo `ajustes`) es también una tabla Dexie con el mismo nombre.
 */
export interface Datos {
  ajustes: Ajustes
  identidades: Identidad[]
  habitos: Habito[]
  registros: Registro[]
  anotacionesDeFallo: AnotacionDeFallo[]
  hitosCelebrados: HitoCelebrado[]
}
