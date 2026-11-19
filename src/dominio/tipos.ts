/** Día lógico como `AAAA-MM-DD`. */
export type Dia = string
/** Hora local como `HH:MM`. */
export type Hora = string
/** Instante como cadena ISO 8601 (`Date.toISOString()`). */
export type Instante = string

export interface Ajustes {
  horaCierre: Hora
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
export type TipoHabito = 'si_no'

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
  fechaInicio: Dia
  archivado: boolean
  orden: number
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

export type TipoRegistro = 'minima' | 'completa'

export interface Registro extends Entidad {
  habitoId: string
  dia: Dia
  tipo: TipoRegistro
  nota?: string
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
}
