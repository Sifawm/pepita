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
  fechaInicio: Dia
  archivado: boolean
  orden: number
  /** Opcional: los hábitos guardados antes de las pausas no la tienen. */
  pausas?: Pausa[]
}

/** `salto`: el periodo que lo contiene queda neutro (ni suma ni falla). */
export type TipoRegistro = 'minima' | 'completa' | 'salto'

export interface Registro extends Entidad {
  habitoId: string
  dia: Dia
  tipo: TipoRegistro
  nota?: string
  /** Solo en `salto`, y opcional. */
  motivo?: string
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
