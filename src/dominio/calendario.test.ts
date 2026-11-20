import { describe, expect, it } from 'vitest'
import { diaLogico, proximoCierre } from '.'

// Instantes en hora local: el día lógico se calcula sobre el reloj de la persona.
const local = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(a, mes - 1, d, h, min)

describe('día lógico', () => {
  it('un registro a la 01:00 cuenta para el día anterior', () => {
    expect(diaLogico(local(2026, 3, 15, 1), '04:00')).toBe('2026-03-14')
  })

  it('a la hora de cierre empieza el día nuevo', () => {
    expect(diaLogico(local(2026, 3, 15, 3, 59), '04:00')).toBe('2026-03-14')
    expect(diaLogico(local(2026, 3, 15, 4, 0), '04:00')).toBe('2026-03-15')
  })

  it('cruza el cambio de mes y de año', () => {
    expect(diaLogico(local(2026, 3, 1, 2), '04:00')).toBe('2026-02-28')
    expect(diaLogico(local(2027, 1, 1, 0, 30), '04:00')).toBe('2026-12-31')
  })

  it('respeta una hora de cierre distinta', () => {
    expect(diaLogico(local(2026, 3, 15, 1), '00:00')).toBe('2026-03-15')
    expect(diaLogico(local(2026, 3, 15, 5, 59), '06:00')).toBe('2026-03-14')
  })
})

describe('próximo cierre (cuando se cierran los periodos de hoy)', () => {
  it('es la próxima hora de cierre: hoy si aún no ha llegado, si no mañana', () => {
    expect(proximoCierre(local(2026, 3, 15, 1), '04:00')).toEqual(local(2026, 3, 15, 4))
    expect(proximoCierre(local(2026, 3, 15, 12), '04:00')).toEqual(local(2026, 3, 16, 4))
    expect(proximoCierre(local(2026, 3, 15, 4), '04:00')).toEqual(local(2026, 3, 16, 4))
  })

  it('cruza el cambio de mes y en ese instante cambia el día lógico', () => {
    const cierre = proximoCierre(local(2026, 3, 31, 23, 30), '00:00')
    expect(cierre).toEqual(local(2026, 4, 1, 0))
    expect(diaLogico(cierre, '00:00')).toBe('2026-04-01')
  })
})
