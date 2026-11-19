import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, cambiarRegla, evaluarHabito, type Frecuencia, type Habito, type Registro } from '.'

const local = (a: number, mes: number, d: number, h: number) => new Date(a, mes - 1, d, h)
const ajustes = AJUSTES_POR_DEFECTO

// Marzo de 2026: los lunes son el 2, el 9 y el 16.
const diario: Frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }
const tresPorSemana: Frecuencia = { tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' }
const habito = (frecuencia: Frecuencia): Habito => ({
  id: 'h',
  creadoEn: '2026-03-02T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Correr',
  tipo: 'si_no',
  frecuencia,
  fechaInicio: '2026-03-02',
  archivado: false,
  orden: 0,
})

let n = 0
const registros = (...dias: string[]): Registro[] =>
  dias.map((dia) => ({ id: `r${n++}`, creadoEn: `${dia}T10:00:00.000Z`, habitoId: 'h', dia, tipo: 'minima' }))

const estados = (h: Habito, rs: Registro[], ahora: Date) =>
  evaluarHabito({ habito: h, registros: rs, ahora, ajustes }).periodos.map((p) => [p.desde, p.hasta, p.pide, p.estado])

describe('cambiar la frecuencia no reescribe el pasado', () => {
  it('de diario a 3 por semana: los días cerrados siguen evaluados como diarios', () => {
    const rs = registros('2026-03-02', '2026-03-04')
    // Miércoles 4 por la tarde: lunes cumplido, martes fallido, miércoles en curso.
    const cambiado = cambiarRegla({ habito: habito(diario), regla: { frecuencia: tresPorSemana }, ahora: local(2026, 3, 4, 18), ajustes })

    expect(cambiado.frecuencia).toEqual(tresPorSemana)
    expect(cambiado.versiones).toEqual([{ hasta: '2026-03-03', frecuencia: diario }])
    // El lunes siguiente: la semana nueva empieza el miércoles (con 1 de 3) y se ha cerrado.
    expect(estados(cambiado, rs, local(2026, 3, 9, 12))).toEqual([
      ['2026-03-02', '2026-03-02', 1, 'cumplido_minima'],
      ['2026-03-03', '2026-03-03', 1, 'fallido'],
      ['2026-03-04', '2026-03-08', 3, 'fallido'],
      ['2026-03-09', '2026-03-15', 3, 'en_curso'],
    ])
  })

  it('de 3 por semana a diario: las semanas cerradas siguen pidiendo 3; la en curso pasa a días', () => {
    const rs = registros('2026-03-02', '2026-03-03', '2026-03-05', '2026-03-10')
    // Miércoles 11: la semana del 2 está cerrada y cumplida; la del 9 sigue en curso.
    const cambiado = cambiarRegla({ habito: habito(tresPorSemana), regla: { frecuencia: diario }, ahora: local(2026, 3, 11, 9), ajustes })

    expect(cambiado.versiones).toEqual([{ hasta: '2026-03-08', frecuencia: tresPorSemana }])
    expect(estados(cambiado, rs, local(2026, 3, 11, 9))).toEqual([
      ['2026-03-02', '2026-03-08', 3, 'cumplido_minima'],
      ['2026-03-09', '2026-03-09', 1, 'fallido'],
      ['2026-03-10', '2026-03-10', 1, 'cumplido_minima'],
      ['2026-03-11', '2026-03-11', 1, 'en_curso'],
    ])
  })

  it('varios cambios dentro del mismo periodo en curso no dejan versiones vacías', () => {
    const h0 = habito(diario)
    const ahora = local(2026, 3, 4, 18)
    const una = cambiarRegla({ habito: h0, regla: { frecuencia: tresPorSemana }, ahora, ajustes })
    const otra = cambiarRegla({ habito: una, regla: { frecuencia: { tipo: 'dias_semana', dias: [3, 5] } }, ahora, ajustes })

    expect(otra.versiones).toEqual([{ hasta: '2026-03-03', frecuencia: diario }])
    expect(otra.frecuencia).toEqual({ tipo: 'dias_semana', dias: [3, 5] })
  })

  it('si aún no hay ningún periodo cerrado, la regla se sustituye sin historial', () => {
    const cambiado = cambiarRegla({ habito: habito(diario), regla: { frecuencia: tresPorSemana }, ahora: local(2026, 3, 2, 20), ajustes })
    expect(cambiado.versiones ?? []).toEqual([])
    expect(cambiado.frecuencia).toEqual(tresPorSemana)
  })

  it('tres reglas seguidas: cada tramo se evalúa con la suya', () => {
    const rs = registros('2026-03-02', '2026-03-05', '2026-03-12')
    const a = cambiarRegla({ habito: habito(diario), regla: { frecuencia: tresPorSemana }, ahora: local(2026, 3, 4, 12), ajustes })
    const b = cambiarRegla({ habito: a, regla: { frecuencia: { tipo: 'dias_semana', dias: [4] } }, ahora: local(2026, 3, 10, 12), ajustes })

    expect(b.versiones).toEqual([
      { hasta: '2026-03-03', frecuencia: diario },
      { hasta: '2026-03-08', frecuencia: tresPorSemana },
    ])
    expect(estados(b, rs, local(2026, 3, 13, 12))).toEqual([
      ['2026-03-02', '2026-03-02', 1, 'cumplido_minima'],
      ['2026-03-03', '2026-03-03', 1, 'fallido'],
      ['2026-03-04', '2026-03-08', 3, 'fallido'],
      ['2026-03-09', '2026-03-09', 0, 'no_programado'],
      ['2026-03-10', '2026-03-10', 0, 'no_programado'],
      ['2026-03-11', '2026-03-11', 0, 'no_programado'],
      ['2026-03-12', '2026-03-12', 1, 'cumplido_minima'],
      ['2026-03-13', '2026-03-13', 0, 'no_programado'],
    ])
  })
})
