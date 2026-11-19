/** Día lógico como `AAAA-MM-DD`. */
export type Dia = string
/** Hora local como `HH:MM`. */
export type Hora = string
/** Instante como cadena ISO 8601 (`Date.toISOString()`). */
export type Instante = string

export interface Ajustes {
  horaCierre: Hora
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

export type Frecuencia = { tipo: 'veces_por_periodo'; veces: number; periodo: 'dia' }

export interface Habito extends Entidad {
  identidadId: string
  nombre: string
  tipo: TipoHabito
  frecuencia: Frecuencia
  fechaInicio: Dia
  archivado: boolean
  orden: number
}

export type TipoRegistro = 'minima' | 'completa'

export interface Registro extends Entidad {
  habitoId: string
  dia: Dia
  tipo: TipoRegistro
  nota?: string
}

/** Lo que el núcleo crea; la persistencia le añade `id` y `creadoEn`. */
export type Nuevo<T extends Entidad> = Omit<T, keyof Entidad>
