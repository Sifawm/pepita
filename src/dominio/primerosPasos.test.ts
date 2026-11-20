import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, necesitaPrimerosPasos, nuevoHabito, type Habito, type Identidad } from '.'

const identidad = (id: string, extra: Partial<Identidad> = {}): Identidad => ({
  id,
  creadoEn: '2026-03-01T10:00:00.000Z',
  nombre: id,
  esGeneral: false,
  archivada: false,
  orden: 1,
  ...extra,
})
const general = identidad('general', { nombre: '', esGeneral: true, orden: 0 })
const habito = (extra: Partial<Habito> = {}): Habito => ({
  ...nuevoHabito({ nombre: 'Leer', identidadId: 'general', orden: 0 }, new Date(2026, 2, 1, 9), AJUSTES_POR_DEFECTO),
  id: 'h',
  creadoEn: '2026-03-01T08:00:00.000Z',
  ...extra,
})

describe('necesitaPrimerosPasos', () => {
  it('sí en una instalación recién estrenada: solo «General», sin nombre propio, y ningún hábito', () => {
    expect(necesitaPrimerosPasos({ identidades: [general], habitos: [] })).toBe(true)
  })

  it('no en cuanto hay un hábito, aunque esté archivado', () => {
    expect(necesitaPrimerosPasos({ identidades: [general], habitos: [habito()] })).toBe(false)
    expect(necesitaPrimerosPasos({ identidades: [general], habitos: [habito({ archivado: true })] })).toBe(false)
  })

  it('no si ya creó una identidad propia (aunque esté archivada) o renombró «General»', () => {
    expect(necesitaPrimerosPasos({ identidades: [general, identidad('lectora')], habitos: [] })).toBe(false)
    expect(necesitaPrimerosPasos({ identidades: [general, identidad('vieja', { archivada: true })], habitos: [] })).toBe(false)
    expect(necesitaPrimerosPasos({ identidades: [{ ...general, nombre: 'Yo' }], habitos: [] })).toBe(false)
  })
})
