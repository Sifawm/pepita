// Exportación e importación de copias JSON. La importación es una frontera de confianza:
// se valida entera antes de devolver nada, y la persistencia solo escribe si sale `ok`.
import { HITOS } from './identidad'
import type { Ajustes, AnotacionDeFallo, Cuando, Datos, Frecuencia, Habito, HitoCelebrado, Identidad, Instante, Intencion, Pausa, Registro, VersionRegla } from './tipos'
import {
  booleano,
  conPatron,
  entero,
  Invalido,
  lista,
  literal,
  objeto,
  opcional,
  segunTipo,
  texto,
  type Validador,
} from './validacion'

/**
 * Versión del formato de la copia. Mientras la v1 no se publique se queda en 1 y los tickets
 * solo amplían los validadores. Tras publicarla, un cambio incompatible sube este número y
 * añade en `importar` el paso que convierte la versión anterior en la nueva.
 */
export const VERSION_ESQUEMA = 1

export interface Copia {
  app: 'pepita'
  versionEsquema: number
  exportadoEn: Instante
  datos: Datos
}

export type ErrorImportacion =
  | { motivo: 'no_es_json' | 'no_es_pepita' | 'version_nueva' }
  | { motivo: 'invalido'; ruta: string }

export type ResultadoImportacion = { ok: true; datos: Datos } | { ok: false; error: ErrorImportacion }

// --- Esquema: un validador por tipo de `tipos.ts` ---

const id = conPatron(/\S/)
const dia: Validador<string> = (v, r) => {
  const d = conPatron(/^\d{4}-\d{2}-\d{2}$/)(v, r)
  // Descarta fechas imposibles como 2026-02-30.
  if (Number.isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) throw new Invalido(r)
  return d
}
const hora = conPatron(/^([01]\d|2[0-3]):[0-5]\d$/)
const instante: Validador<string> = (v, r) => {
  const s = texto(v, r)
  // La persistencia escribe siempre `toISOString()`: exigimos exactamente ese formato.
  if (Number.isNaN(Date.parse(s)) || new Date(s).toISOString() !== s) throw new Invalido(r)
  return s
}
const entidad = { id, creadoEn: instante }

const pausa: Validador<Pausa> = (v, r) => {
  const p = objeto<Pausa>({ desde: dia, hasta: dia })(v, r)
  if (p.hasta < p.desde) throw new Invalido(r)
  return p
}

const ajustes = objeto<Ajustes>({ horaCierre: hora, ultimaCopia: opcional(instante), pausaGlobal: opcional(pausa) })

const identidad = objeto<Identidad>({
  ...entidad,
  nombre: texto,
  esGeneral: booleano,
  archivada: booleano,
  orden: entero(0),
})

const frecuencia = segunTipo<Frecuencia>({
  veces_por_periodo: objeto({ tipo: literal('veces_por_periodo'), veces: entero(1), periodo: literal('dia', 'semana', 'mes') }),
  dias_semana: objeto({ tipo: literal('dias_semana'), dias: lista(literal(1, 2, 3, 4, 5, 6, 7)) }),
})

/** Historial de reglas: cada versión acaba después que la anterior (si no, un tramo quedaría vacío). */
const versiones: Validador<VersionRegla[]> = (v, r) => {
  const vs = lista(objeto<VersionRegla>({ hasta: dia, frecuencia }))(v, r)
  vs.forEach((x, i) => {
    if (i > 0 && x.hasta <= vs[i - 1].hasta) throw new Invalido(`${r}[${i}].hasta`)
  })
  return vs
}

/** Uno solo de los tres disparadores. Un ancla que ya no existe vale: el hábito queda «sin hora». */
const cuando: Validador<Cuando> = (v, r) => {
  const c = typeof v === 'object' && v !== null ? v : {}
  if ('hora' in c) return objeto<{ hora: string }>({ hora })(v, r)
  if ('despuesDeHabitoId' in c) return objeto<{ despuesDeHabitoId: string }>({ despuesDeHabitoId: id })(v, r)
  return objeto<{ despuesDeAccion: string }>({ despuesDeAccion: conPatron(/\S/) })(v, r)
}

const intencion = objeto<Intencion>({ cuando: opcional(cuando), donde: opcional(conPatron(/\S/)) })

const habito = objeto<Habito>({
  ...entidad,
  identidadId: id,
  nombre: conPatron(/\S/),
  tipo: literal('si_no'),
  frecuencia,
  versionMinima: opcional(texto),
  versionCompleta: opcional(texto),
  fechaInicio: dia,
  archivado: booleano,
  orden: entero(0),
  pausas: opcional(lista(pausa)),
  versiones: opcional(versiones),
  intencion: opcional(intencion),
  entorno: opcional(lista(texto)),
  recompensaAsociada: opcional(texto),
})

const registro: Validador<Registro> = (v, r) => {
  const reg = objeto<Registro>({
    ...entidad,
    habitoId: id,
    dia,
    tipo: literal('minima', 'completa', 'salto'),
    nota: opcional(texto),
    motivo: opcional(texto),
  })(v, r)
  if (reg.motivo !== undefined && reg.tipo !== 'salto') throw new Invalido(`${r}.motivo`)
  return reg
}

const anotacionDeFallo = objeto<AnotacionDeFallo>({
  ...entidad,
  habitoId: id,
  periodo: dia,
  ley: opcional(literal(1, 2, 3, 4)),
  nota: opcional(texto),
})

const hitoCelebrado = objeto<HitoCelebrado>({ ...entidad, identidadId: id, umbral: literal(...HITOS) })

/** Al añadir una tabla a `Datos`, añádela aquí (TypeScript lo exige) y en `comprobarReferencias`. */
const datos = objeto<Datos>({
  ajustes,
  identidades: lista(identidad),
  habitos: lista(habito),
  registros: lista(registro),
  anotacionesDeFallo: lista(anotacionDeFallo),
  hitosCelebrados: lista(hitoCelebrado),
})

const copia = objeto<Copia>({
  app: literal('pepita'),
  versionEsquema: entero(1, VERSION_ESQUEMA),
  exportadoEn: instante,
  datos,
})

// --- Integridad entre tablas: ids únicos, referencias que existen y una sola «General» ---

function comprobarReferencias(d: Datos) {
  const ids = (tabla: string, filas: { id: string }[]) => {
    const vistos = new Set<string>()
    filas.forEach((f, i) => {
      if (vistos.has(f.id)) throw new Invalido(`datos.${tabla}[${i}].id`)
      vistos.add(f.id)
    })
    return vistos
  }
  const identidades = ids('identidades', d.identidades)
  const habitos = ids('habitos', d.habitos)
  ids('registros', d.registros)
  ids('anotacionesDeFallo', d.anotacionesDeFallo)
  ids('hitosCelebrados', d.hitosCelebrados)

  if (d.identidades.filter((i) => i.esGeneral).length !== 1) throw new Invalido('datos.identidades')
  d.habitos.forEach((h, i) => {
    if (!identidades.has(h.identidadId)) throw new Invalido(`datos.habitos[${i}].identidadId`)
  })
  d.registros.forEach((r, i) => {
    if (!habitos.has(r.habitoId)) throw new Invalido(`datos.registros[${i}].habitoId`)
  })
  const fallos = new Set<string>()
  d.anotacionesDeFallo.forEach((a, i) => {
    if (!habitos.has(a.habitoId)) throw new Invalido(`datos.anotacionesDeFallo[${i}].habitoId`)
    if (fallos.has(`${a.habitoId} ${a.periodo}`)) throw new Invalido(`datos.anotacionesDeFallo[${i}].periodo`)
    fallos.add(`${a.habitoId} ${a.periodo}`)
  })
  const hitos = new Set<string>()
  d.hitosCelebrados.forEach((h, i) => {
    if (!identidades.has(h.identidadId)) throw new Invalido(`datos.hitosCelebrados[${i}].identidadId`)
    if (hitos.has(`${h.identidadId} ${h.umbral}`)) throw new Invalido(`datos.hitosCelebrados[${i}].umbral`)
    hitos.add(`${h.identidadId} ${h.umbral}`)
  })
}

/** Serializa todos los datos. La copia se anota a sí misma como `ultimaCopia`. */
export function exportar(d: Datos, ahora: Date): string {
  const exportadoEn = ahora.toISOString()
  const resultado: Copia = {
    app: 'pepita',
    versionEsquema: VERSION_ESQUEMA,
    exportadoEn,
    datos: { ...d, ajustes: { ...d.ajustes, ultimaCopia: exportadoEn } },
  }
  return JSON.stringify(resultado, null, 2)
}

/** Calibración: días sin copia antes de avisar (con amabilidad). Afínalo con el uso real. */
export const DIAS_AVISO_COPIA = 7

/**
 * ¿Toca recordar que haga una copia? Sin registros no hay nada que perder; sin ninguna copia,
 * se cuenta desde el primer registro.
 */
export function necesitaCopia({ ajustes, registros, ahora }: { ajustes: Ajustes; registros: Registro[]; ahora: Date }) {
  if (registros.length === 0) return false
  const desde = ajustes.ultimaCopia ?? registros.reduce((min, r) => (r.creadoEn < min ? r.creadoEn : min), registros[0].creadoEn)
  return ahora.getTime() - Date.parse(desde) > DIAS_AVISO_COPIA * 24 * 60 * 60 * 1000
}

/**
 * Registros en CSV plano (RFC 4180), por día y hora de creación. Las columnas usan los nombres
 * del esquema; si amplías `Registro` (valor, motivo…), añade aquí su columna.
 */
export function registrosCsv({ habitos, registros }: Pick<Datos, 'habitos' | 'registros'>): string {
  const nombres = new Map(habitos.map((h) => [h.id, h.nombre]))
  const campo = (v = '') => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)
  const filas = [...registros]
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.creadoEn.localeCompare(b.creadoEn))
    .map((r) => [r.dia, r.habitoId, nombres.get(r.habitoId), r.tipo, r.nota, r.motivo, r.creadoEn])
  return [['dia', 'habitoId', 'habito', 'tipo', 'nota', 'motivo', 'creadoEn'], ...filas]
    .map((fila) => fila.map(campo).join(',') + '\r\n')
    .join('')
}

/** Valida estrictamente un fichero de copia. Si algo no cuadra, no devuelve ningún dato. */
export function importar(contenido: string): ResultadoImportacion {
  let json: unknown
  try {
    json = JSON.parse(contenido)
  } catch {
    return { ok: false, error: { motivo: 'no_es_json' } }
  }
  const cabecera = (json ?? {}) as Partial<Copia>
  if (cabecera.app !== 'pepita') return { ok: false, error: { motivo: 'no_es_pepita' } }
  if (typeof cabecera.versionEsquema === 'number' && cabecera.versionEsquema > VERSION_ESQUEMA)
    return { ok: false, error: { motivo: 'version_nueva' } }
  try {
    const { datos: d } = copia(json, '')
    comprobarReferencias(d)
    return { ok: true, datos: d }
  } catch (e) {
    if (e instanceof Invalido) return { ok: false, error: { motivo: 'invalido', ruta: e.ruta } }
    throw e
  }
}
