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
  /** Avisos del navegador mientras la app está abierta. Falta = desactivados. */
  notificaciones?: boolean
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
export type TipoHabito = 'si_no' | 'cuantitativo' | 'evitar'

/**
 * Un hábito que se mide: «al menos 20 páginas» o «como mucho 2 cafés» por periodo.
 * `objetivoMinimo` (solo en `al_menos`, menor que `objetivo`) es su versión mínima.
 */
export interface Cuantitativo {
  unidad: string
  objetivo: number
  objetivoMinimo?: number
  modo: 'al_menos' | 'como_mucho'
}

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
  /** No cambia tras crear el hábito: su historia se evalúa siempre igual. */
  tipo: TipoHabito
  /** Solo (y siempre) en `cuantitativo`. Es parte de la regla: se cambia con `cambiarRegla`. */
  cuantitativo?: Cuantitativo
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
  /** Intención de implementación: cuándo y dónde. Falta si se saltó el paso. */
  intencion?: Intencion
  /** «Prepara tu entorno»: lo que dejar listo antes de empezar. */
  entorno?: string[]
  /** «Solo escucho mi podcast mientras camino». */
  recompensaAsociada?: string
}

/**
 * El disparador del hábito. Un ancla archivada o borrada no se limpia: el hábito pasa a
 * «sin hora» mientras falte, y vuelve a su cadena si el ancla se recupera.
 */
export type Cuando = { hora: Hora } | { despuesDeHabitoId: string } | { despuesDeAccion: string }

export interface Intencion {
  /** Opcional: se puede indicar solo el «dónde». */
  cuando?: Cuando
  donde?: string
}

/** Lo que decide cómo se evalúa un periodo. */
export type Regla = Pick<Habito, 'frecuencia' | 'cuantitativo'>

export type VersionRegla = Regla & { hasta: Dia }

/**
 * `salto`: el periodo que lo contiene queda neutro (ni suma ni falla).
 * `recaida`: solo en `evitar`; convierte ese día en fallo.
 * `valor`: una cantidad que se suma (cuantitativos).
 */
export type TipoRegistro = 'minima' | 'completa' | 'salto' | 'recaida' | 'valor'

export interface Registro extends Entidad {
  habitoId: string
  dia: Dia
  tipo: TipoRegistro
  nota?: string
  /** Solo en `salto`, y opcional. */
  motivo?: string
  /** Solo en `recaida`, y opcional: qué la provocó. */
  disparador?: string
  /** Solo (y siempre) en `valor`: mayor que 0. */
  valor?: number
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

export type EstadoDiagnostico = 'pendiente' | 'respondido' | 'pospuesto' | 'descartado'

/**
 * Lo que ofrece cada causa, con un toque (`ACCIONES_DIAGNOSTICO`). `solo_minima` deja vigente
 * la sugerencia `bajar` (ver `sugerenciaEscalado`).
 */
export type AccionDiagnostico =
  | 'editar_intencion'
  | 'exportar_ics'
  | 'editar_recompensa'
  | 'editar_identidad'
  | 'solo_minima'
  | 'editar_entorno'
  | 'ver_votos'
  | 'pausar'
  | 'archivar'

/** «¿Qué ha pasado?» tras dos fallos seguidos. Uno como mucho por ruptura de racha. */
export interface Diagnostico extends Entidad {
  habitoId: string
  /** `desde` del segundo periodo fallido (la ruptura). */
  periodoQueLoDisparo: Dia
  /** La causa elegida; solo (y siempre) en `respondido`. */
  ley?: Ley
  estado: EstadoDiagnostico
  /** Una de las acciones de su ley, si se aplicó. */
  accionAplicada?: AccionDiagnostico
}

/** Un hito (`HITOS`) de una identidad ya celebrado: no se vuelve a celebrar nunca. */
export interface HitoCelebrado extends Entidad {
  identidadId: string
  umbral: number
}

/** `subir` el listón (fuerza alta) o `bajar` (tras un diagnóstico de la 3ª ley). */
export type TipoSugerencia = 'subir' | 'bajar'

/**
 * Una sugerencia de escalado ya atendida: descartada o aplicada (las dos la silencian).
 * No vuelve a salir hasta pasado `hasta` (incluido).
 */
export interface SugerenciaDescartada extends Entidad {
  habitoId: string
  tipo: TipoSugerencia
  hasta: Dia
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
  diagnosticos: Diagnostico[]
  sugerenciasDescartadas: SugerenciaDescartada[]
}
