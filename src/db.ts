// Persistencia: tablas Dexie y escrituras. Sin lógica de negocio (vive en @/dominio).
import Dexie, { liveQuery, type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { AJUSTES_POR_DEFECTO, reconciliarDiagnosticos, type Ajustes, type AnotacionDeFallo, type Diagnostico, type Entidad, type Habito, type HitoCelebrado, type Identidad, type Nuevo, type Registro } from '@/dominio'
import type { Datos } from '@/dominio'

export const db = new Dexie('pepita') as Dexie & {
  identidades: EntityTable<Identidad, 'id'>
  habitos: EntityTable<Habito, 'id'>
  registros: EntityTable<Registro, 'id'>
  anotacionesDeFallo: EntityTable<AnotacionDeFallo, 'id'>
  hitosCelebrados: EntityTable<HitoCelebrado, 'id'>
  diagnosticos: EntityTable<Diagnostico, 'id'>
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

/** Añade `id` y `creadoEn` a lo que crea el núcleo. */
export const conId = <T extends Entidad>(datos: Nuevo<T>): T =>
  ({ ...datos, id: crypto.randomUUID(), creadoEn: new Date().toISOString() }) as T

db.on('populate', (tx) =>
  tx.table('identidades').add(conId<Identidad>({ nombre: '', esGeneral: true, archivada: false, orden: 0 })),
)

/** Ajustes guardados sobre los de por defecto; `undefined` mientras cargan. */
export const useAjustes = (): Ajustes | undefined =>
  useLiveQuery(async () => ({ ...AJUSTES_POR_DEFECTO, ...(await db.ajustes.get('ajustes')) }))

export const guardarAjustes = (cambios: Partial<Ajustes>) =>
  db.transaction('rw', db.ajustes, async () => {
    await db.ajustes.put({ ...(await db.ajustes.get('ajustes')), ...cambios, id: 'ajustes' })
  })

/** Borra un hábito y todo lo que cuelga de él. Si añades una tabla con `habitoId`, bórrala aquí también. */
export const borrarHabito = (id: string) =>
  db.transaction('rw', [db.habitos, db.registros, db.anotacionesDeFallo, db.diagnosticos], async () => {
    await db.registros.where('habitoId').equals(id).delete()
    await db.anotacionesDeFallo.where('habitoId').equals(id).delete()
    await db.diagnosticos.where('habitoId').equals(id).delete()
    await db.habitos.delete(id)
  })

/** Guarda hitos como celebrados. Idempotente: un hito ya guardado no se duplica. */
export const celebrarHitos = (identidadId: string, umbrales: number[]) =>
  db.transaction('rw', db.hitosCelebrados, async () => {
    const ya = new Set((await db.hitosCelebrados.where('identidadId').equals(identidadId).toArray()).map((h) => h.umbral))
    const nuevos = umbrales.filter((umbral) => !ya.has(umbral))
    await db.hitosCelebrados.bulkAdd(nuevos.map((umbral) => conId<HitoCelebrado>({ identidadId, umbral })))
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
      ajustes: { ...AJUSTES_POR_DEFECTO, ...(await db.ajustes.get('ajustes')) },
      ahora,
    })
    await db.diagnosticos.bulkDelete(borrar)
    await db.diagnosticos.bulkAdd(crear.map((d) => conId<Diagnostico>(d)))
  })

/**
 * Mantiene los diagnósticos al día mientras la app está abierta: tras cada cambio de hábitos,
 * registros o ajustes (también al corregir el pasado o importar). Se monta una vez, en `App`.
 * ponytail: un periodo que se cierra con la app abierta espera al siguiente cambio o recarga;
 * engancharlo al reloj de Hoy si se nota.
 */
export function useDiagnosticosAlDia() {
  useEffect(() => {
    const s = liveQuery(() => Promise.all([db.habitos.toArray(), db.registros.toArray(), db.ajustes.toArray()])).subscribe(
      () => void reconciliarDiagnosticosGuardados(new Date()),
    )
    return () => s.unsubscribe()
  }, [])
}

/** Todos los datos, de una vez y coherentes entre sí: lo que va en una copia. */
export const leerDatos = (): Promise<Datos> =>
  db.transaction('r', db.tables, async () => {
    const { id, ...guardados } = (await db.ajustes.get('ajustes')) ?? { id: 'ajustes' }
    void id // la fila lleva `id`; los ajustes de la copia, no.
    return {
      ajustes: { ...AJUSTES_POR_DEFECTO, ...guardados },
      identidades: await db.identidades.toArray(),
      habitos: await db.habitos.toArray(),
      registros: await db.registros.toArray(),
      anotacionesDeFallo: await db.anotacionesDeFallo.toArray(),
      hitosCelebrados: await db.hitosCelebrados.toArray(),
      diagnosticos: await db.diagnosticos.toArray(),
    }
  })

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
