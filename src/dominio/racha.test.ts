import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, evaluarHabito, type Habito, type Registro } from '.'

const local = (a: number, mes: number, d: number, h: number) => new Date(a, mes - 1, d, h)
const ajustes = AJUSTES_POR_DEFECTO

// Marzo de 2026: el lunes 2 empieza semana.
const diario: Habito = {
  id: 'h',
  creadoEn: '2026-03-02T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Leer',
  tipo: 'si_no',
  frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
  fechaInicio: '2026-03-02',
  archivado: false,
  orden: 0,
}

const registro = (dia: string, tipo: Registro['tipo'] = 'minima'): Registro => ({
  id: `${dia}-${tipo}`,
  creadoEn: `${dia}T10:00:00.000Z`,
  habitoId: 'h',
  dia,
  tipo,
})
const hechos = (...dias: number[]) => dias.map((d) => registro(`2026-03-${String(d).padStart(2, '0')}`))

describe('recuperación («nunca falles dos veces»)', () => {
  it('tras un fallo, el periodo actual queda en recuperación; cumplido el siguiente, deja de estarlo', () => {
    // Día 2 hecho, día 3 sin hacer.
    const tras = evaluarHabito({ habito: diario, registros: hechos(2), ahora: local(2026, 3, 4, 12), ajustes })
    expect(tras.enRecuperacion).toBe(true)
    const despues = evaluarHabito({ habito: diario, registros: hechos(2, 4), ahora: local(2026, 3, 5, 12), ajustes })
    expect(despues.enRecuperacion).toBe(false)
  })

  it('sigue en recuperación aunque ya lo hayas hecho hoy (Hoy no reordena al tocar)', () => {
    const e = evaluarHabito({ habito: diario, registros: hechos(2, 4), ahora: local(2026, 3, 4, 12), ajustes })
    expect(e.enRecuperacion).toBe(true)
  })

  it('los saltos y las pausas no cuentan al buscar el periodo anterior', () => {
    const conSalto = evaluarHabito({
      habito: diario,
      registros: [...hechos(2), registro('2026-03-04', 'salto')],
      ahora: local(2026, 3, 5, 12),
      ajustes,
    })
    expect(conSalto.enRecuperacion).toBe(true)
    const conPausa = evaluarHabito({
      habito: { ...diario, pausas: [{ desde: '2026-03-04', hasta: '2026-03-05' }] },
      registros: hechos(2),
      ahora: local(2026, 3, 6, 12),
      ajustes,
    })
    expect(conPausa.enRecuperacion).toBe(true)
  })

  it('los días no programados tampoco: el lunes fallado pone en recuperación el miércoles', () => {
    const lx: Habito = { ...diario, frecuencia: { tipo: 'dias_semana', dias: [1, 3] } }
    const e = evaluarHabito({ habito: lx, registros: [], ahora: local(2026, 3, 4, 12), ajustes })
    expect(e.enRecuperacion).toBe(true)
  })

  it('hoy saltado o en pausa no está en recuperación (no hay nada que sugerir)', () => {
    const e = evaluarHabito({
      habito: diario,
      registros: [registro('2026-03-04', 'salto')],
      ahora: local(2026, 3, 4, 12),
      ajustes,
    })
    expect(e.enRecuperacion).toBe(false)
  })

  it('semanal: 2 de 3 al cerrar el domingo es fallo; el lunes está en recuperación', () => {
    const tres: Habito = { ...diario, frecuencia: { tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' } }
    expect(evaluarHabito({ habito: tres, registros: hechos(3, 5), ahora: local(2026, 3, 9, 3), ajustes }).enRecuperacion).toBe(false)
    expect(evaluarHabito({ habito: tres, registros: hechos(3, 5), ahora: local(2026, 3, 9, 4), ajustes }).enRecuperacion).toBe(true)
  })

  it('la edición retroactiva recalcula la recuperación: registrar el día olvidado la quita', () => {
    const olvido = evaluarHabito({ habito: diario, registros: hechos(2), ahora: local(2026, 3, 4, 12), ajustes })
    expect(olvido.enRecuperacion).toBe(true)
    const corregido = evaluarHabito({ habito: diario, registros: hechos(2, 3), ahora: local(2026, 3, 4, 12), ajustes })
    expect(corregido.enRecuperacion).toBe(false)
  })
})

describe('racha', () => {
  it('cuenta los periodos cumplidos seguidos, incluido el de hoy si ya está hecho', () => {
    const e = evaluarHabito({ habito: diario, registros: hechos(2, 3, 4), ahora: local(2026, 3, 4, 12), ajustes })
    expect(e.racha).toEqual({ actual: 3, mejor: 3 })
  })

  it('el periodo en curso sin hacer no la rompe', () => {
    const e = evaluarHabito({ habito: diario, registros: hechos(2, 3), ahora: local(2026, 3, 4, 12), ajustes })
    expect(e.racha).toEqual({ actual: 2, mejor: 2 })
  })

  it('un fallo aislado no suma pero tampoco la rompe', () => {
    const e = evaluarHabito({ habito: diario, registros: hechos(2, 3, 5, 6), ahora: local(2026, 3, 7, 12), ajustes })
    expect(e.racha).toEqual({ actual: 4, mejor: 4 })
    expect(e.fallosSeguidos).toBe(0)
  })

  it('el segundo fallo seguido la pone a 0; la mejor se conserva', () => {
    const e = evaluarHabito({ habito: diario, registros: hechos(2, 3, 4, 7), ahora: local(2026, 3, 7, 12), ajustes })
    expect(e.racha).toEqual({ actual: 1, mejor: 3 })
  })

  it('un fallo, un salto y otro fallo cuentan como dos fallos seguidos', () => {
    const e = evaluarHabito({
      habito: diario,
      registros: [...hechos(2, 3), registro('2026-03-05', 'salto')],
      ahora: local(2026, 3, 7, 12),
      ajustes,
    })
    expect(e.racha).toEqual({ actual: 0, mejor: 2 })
    expect(e.fallosSeguidos).toBe(2)
  })

  it('las pausas tampoco la afectan', () => {
    const e = evaluarHabito({
      habito: { ...diario, pausas: [{ desde: '2026-03-04', hasta: '2026-03-05' }] },
      registros: hechos(2, 3, 6),
      ahora: local(2026, 3, 6, 12),
      ajustes,
    })
    expect(e.racha).toEqual({ actual: 3, mejor: 3 })
  })
})

describe('fallos seguidos (para el diagnóstico)', () => {
  it('cuenta los fallos al final y marca cada ruptura de racha una sola vez', () => {
    // Fallan 3, 4 y 5 (una ruptura, en el 4); se cumple el 6; fallan 7 y 8 (otra ruptura, en el 8).
    const e = evaluarHabito({ habito: diario, registros: hechos(2, 6), ahora: local(2026, 3, 9, 12), ajustes })
    expect(e.fallosSeguidos).toBe(2)
    expect(e.rupturas.map((p) => p.desde)).toEqual(['2026-03-04', '2026-03-08'])
  })

  it('la edición retroactiva recalcula las rupturas', () => {
    const e = evaluarHabito({ habito: diario, registros: hechos(2, 4, 6), ahora: local(2026, 3, 9, 12), ajustes })
    expect(e.rupturas.map((p) => p.desde)).toEqual(['2026-03-08'])
  })
})
