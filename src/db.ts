// Persistencia: tablas Dexie y escrituras. Sin lógica de negocio (vive en @/dominio).
import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { AJUSTES_POR_DEFECTO, type Ajustes, type Entidad, type Habito, type Identidad, type Nuevo, type Registro } from '@/dominio'

export const db = new Dexie('pepita') as Dexie & {
  identidades: EntityTable<Identidad, 'id'>
  habitos: EntityTable<Habito, 'id'>
  registros: EntityTable<Registro, 'id'>
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
