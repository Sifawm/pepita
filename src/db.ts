// Persistencia: tablas Dexie y escrituras. Sin lógica de negocio (vive en @/dominio).
import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { AJUSTES_POR_DEFECTO, notaSemanal, reconciliarDiagnosticos, type Ajustes, type AnotacionDeFallo, type Diagnostico, type Entidad, type Habito, type HitoCelebrado, type Identidad, type Nuevo, type Registro, type RevisionSemanal, type SugerenciaDescartada } from '@/dominio'
import type { Datos } from '@/dominio'

export const db = new Dexie('pepita') as Dexie & {
  identidades: EntityTable<Identidad, 'id'>
  habitos: EntityTable<Habito, 'id'>
  registros: EntityTable<Registro, 'id'>
  anotacionesDeFallo: EntityTable<AnotacionDeFallo, 'id'>
  hitosCelebrados: EntityTable<HitoCelebrado, 'id'>
  diagnosticos: EntityTable<Diagnostico, 'id'>
  sugerenciasDescartadas: EntityTable<SugerenciaDescartada, 'id'>
  revisionesSemanales: EntityTable<RevisionSemanal, 'id'>
  /** Una sola fila, con `id: 'ajustes'`. */
  ajustes: EntityTable<Partial<Ajustes> & { id: string }, 'id'>
}

// Cambios de esquema: añade un `db.version(n + 1)` nuevo; nunca edites uno existente.
db.version(1).stores({
  identidades: 'id, orden',
  habitos: 'id, identidadId, orden',
  registros: 'id, habitoId, dia, [habitoId+dia]',
})

db.version(2).stores({ ajustes: 'id' })

db.version(3).stores({ anotacionesDeFallo: 'id, habitoId, [habitoId+periodo]' })

db.version(4).stores({ hitosCelebrados: 'id, identidadId' })

db.version(5).stores({ diagnosticos: 'id, habitoId' })

db.version(6).stores({ sugerenciasDescartadas: 'id, habitoId' })

db.version(7).stores({ revisionesSemanales: 'id, &semana' })

/** Añade `id` y `creadoEn` a lo que crea el núcleo. */
export const conId = <T extends Entidad>(datos: Nuevo<T>): T =>
  ({ ...datos, id: crypto.randomUUID(), creadoEn: new Date().toISOString() }) as T

db.on('populate', (tx) =>
  tx.table('identidades').add(conId<Identidad>({ nombre: '', esGeneral: true, archivada: false, orden: 0 })),
)

/** Los ajustes guardados sobre los de por defecto (sin el `id` de la fila). */
export async function leerAjustes(): Promise<Ajustes> {
  const { id, ...guardados } = (await db.ajustes.get('ajustes')) ?? { id: 'ajustes' }
  void id // la fila lleva `id`; los ajustes, no.
  return { ...AJUSTES_POR_DEFECTO, ...guardados }
}

/** Ajustes guardados sobre los de por defecto; `undefined` mientras cargan. */
export const useAjustes = (): Ajustes | undefined => useLiveQuery(leerAjustes)

export const guardarAjustes = (cambios: Partial<Ajustes>) =>
  db.transaction('rw', db.ajustes, async () => {
    await db.ajustes.put({ ...(await db.ajustes.get('ajustes')), ...cambios, id: 'ajustes' })
  })

/** Borra un hábito y todo lo que cuelga de él. Si añades una tabla con `habitoId`, bórrala aquí también. */
export const borrarHabito = (id: string) =>
  db.transaction('rw', [db.habitos, db.registros, db.anotacionesDeFallo, db.diagnosticos, db.sugerenciasDescartadas], async () => {
    await db.registros.where('habitoId').equals(id).delete()
    await db.anotacionesDeFallo.where('habitoId').equals(id).delete()
    await db.diagnosticos.where('habitoId').equals(id).delete()
    await db.sugerenciasDescartadas.where('habitoId').equals(id).delete()
    await db.habitos.delete(id)
  })

/** Guarda hitos como celebrados. Idempotente: un hito ya guardado no se duplica. */
export const celebrarHitos = (identidadId: string, umbrales: number[]) =>
  db.transaction('rw', db.hitosCelebrados, async () => {
    const ya = new Set((await db.hitosCelebrados.where('identidadId').equals(identidadId).toArray()).map((h) => h.umbral))
    const nuevos = umbrales.filter((umbral) => !ya.has(umbral))
    await db.hitosCelebrados.bulkAdd(nuevos.map((umbral) => conId<HitoCelebrado>({ identidadId, umbral })))
  })

/** Guarda la nota de la semana (`notaSemanal` decide; sin texto, se borra). */
export const guardarNotaSemanal = (semana: string, nota: string) =>
  db.transaction('rw', db.revisionesSemanales, async () => {
    const nueva = notaSemanal(semana, nota)
    const actual = await db.revisionesSemanales.where('semana').equals(nueva?.semana ?? semana).first()
    if (!nueva) return void (actual && (await db.revisionesSemanales.delete(actual.id)))
    await db.revisionesSemanales.put(actual ? { ...actual, ...nueva } : conId<RevisionSemanal>(nueva))
  })

/**
 * Crea y retira diagnósticos para que cuadren con las rupturas de racha. En una transacción
 * (lee y escribe `diagnosticos` dentro), así dos llamadas a la vez no duplican nada.
 */
export const reconciliarDiagnosticosGuardados = (ahora: Date) =>
  db.transaction('rw', [db.habitos, db.registros, db.diagnosticos, db.ajustes], async () => {
    const { crear, borrar } = reconciliarDiagnosticos({
      habitos: await db.habitos.toArray(),
      registros: await db.registros.toArray(),
      diagnosticos: await db.diagnosticos.toArray(),
      ajustes: await leerAjustes(),
      ahora,
    })
    await db.diagnosticos.bulkDelete(borrar)
    await db.diagnosticos.bulkAdd(crear.map((d) => conId<Diagnostico>(d)))
  })

/** Todos los datos, de una vez y coherentes entre sí: lo que va en una copia. */
export const leerDatos = (): Promise<Datos> =>
  db.transaction('r', db.tables, async () => ({
    ajustes: await leerAjustes(),
    identidades: await db.identidades.toArray(),
    habitos: await db.habitos.toArray(),
    registros: await db.registros.toArray(),
    anotacionesDeFallo: await db.anotacionesDeFallo.toArray(),
    hitosCelebrados: await db.hitosCelebrados.toArray(),
    diagnosticos: await db.diagnosticos.toArray(),
    sugerenciasDescartadas: await db.sugerenciasDescartadas.toArray(),
    revisionesSemanales: await db.revisionesSemanales.toArray(),
  }))

/**
 * Sustituye TODO por `datos` (ya validados por `importar`). En una transacción: si algo falla,
 * no cambia nada. Cada clave de `Datos` salvo `ajustes` se escribe en la tabla del mismo nombre.
 */
export const sustituirDatos = ({ ajustes, ...tablas }: Datos) =>
  db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.ajustes.put({ ...ajustes, id: 'ajustes' })
    for (const [tabla, filas] of Object.entries(tablas)) await db.table(tabla).bulkAdd(filas)
  })
