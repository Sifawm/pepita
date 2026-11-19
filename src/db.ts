// Persistencia: tablas Dexie y escrituras. Sin lógica de negocio (vive en @/dominio).
import Dexie, { type EntityTable } from 'dexie'
import type { Entidad, Habito, Identidad, Nuevo, Registro } from '@/dominio'

export const db = new Dexie('pepita') as Dexie & {
  identidades: EntityTable<Identidad, 'id'>
  habitos: EntityTable<Habito, 'id'>
  registros: EntityTable<Registro, 'id'>
}

// Cambios de esquema: añade un `db.version(n + 1)` nuevo; nunca edites uno existente.
db.version(1).stores({
  identidades: 'id, orden',
  habitos: 'id, identidadId, orden',
  registros: 'id, habitoId, dia, [habitoId+dia]',
})

/** Añade `id` y `creadoEn` a lo que crea el núcleo. */
export const conId = <T extends Entidad>(datos: Nuevo<T>): T =>
  ({ ...datos, id: crypto.randomUUID(), creadoEn: new Date().toISOString() }) as T

db.on('populate', (tx) =>
  tx.table('identidades').add(conId<Identidad>({ nombre: '', esGeneral: true, archivada: false, orden: 0 })),
)
