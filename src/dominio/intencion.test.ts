import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, componerHoy, nuevoHabito, type Habito, type Identidad, type Intencion } from '.'

const ajustes = AJUSTES_POR_DEFECTO
const ahora = new Date(2026, 2, 15, 9)
const general: Identidad = { id: 'general', creadoEn: '2026-03-01T10:00:00.000Z', nombre: '', esGeneral: true, archivada: false, orden: 0 }

let orden = 0
const habito = (id: string, intencion?: Intencion, extra: Partial<Habito> = {}): Habito => ({
  ...nuevoHabito({ nombre: id, identidadId: 'general', orden: orden++, intencion }, new Date(2026, 2, 10, 9), ajustes),
  id,
  creadoEn: '2026-03-10T08:00:00.000Z',
  ...extra,
})

const ordenHoy = (habitos: Habito[]) =>
  componerHoy({ habitos, identidades: [general], registros: [], ahora, ajustes }).habitos.map((t) => t.habito.id)

describe('orden de Hoy', () => {
  it('por hora, cada anclado justo debajo de su ancla (en cadenas de varios niveles) y al final los que no tienen hora', () => {
    const habitos = [
      habito('sinHora'),
      habito('cafe', { cuando: { despuesDeAccion: 'servirme el café' } }),
      habito('estirar', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('cena', { cuando: { hora: '21:00' } }),
      habito('meditar', { cuando: { hora: '07:30' } }),
      habito('leer', { cuando: { despuesDeHabitoId: 'estirar' } }),
      habito('agua', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('dientes', { cuando: { despuesDeHabitoId: 'cena' } }),
    ]
    expect(ordenHoy(habitos)).toEqual(['meditar', 'estirar', 'leer', 'agua', 'cena', 'dientes', 'sinHora', 'cafe'])
  })
})
