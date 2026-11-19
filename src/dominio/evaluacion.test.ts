import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, evaluarHabito, type Frecuencia, type Habito, type Registro } from '.'

const local = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(a, mes - 1, d, h, min)
const ajustes = AJUSTES_POR_DEFECTO

// Marzo de 2026: el lunes 2 empieza semana; el domingo 8 la cierra.
const habito = (frecuencia: Frecuencia, fechaInicio = '2026-03-02'): Habito => ({
  id: 'h',
  creadoEn: '2026-03-02T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Leer',
  tipo: 'si_no',
  frecuencia,
  fechaInicio,
  archivado: false,
  orden: 0,
})
const diario = habito({ tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' })

let n = 0
const registro = (dia: string, tipo: Registro['tipo'] = 'minima'): Registro => ({
  id: `r${n++}`,
  creadoEn: `${dia}T10:00:00.000Z`,
  habitoId: 'h',
  dia,
  tipo,
})

const estados = (e: ReturnType<typeof evaluarHabito>) => e.periodos.map((p) => [p.desde, p.estado])

describe('evaluación: hábito diario', () => {
  it('cada día es un periodo; el de hoy sigue en curso hasta la hora de cierre', () => {
    const e = evaluarHabito({
      habito: diario,
      registros: [registro('2026-03-02')],
      ahora: local(2026, 3, 4, 3, 59),
      ajustes,
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_minima'],
      ['2026-03-03', 'en_curso'],
    ])
  })

  it('un día sin registro pasa a fallido al cerrarse', () => {
    const e = evaluarHabito({
      habito: diario,
      registros: [registro('2026-03-02')],
      ahora: local(2026, 3, 4, 4),
      ajustes,
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_minima'],
      ['2026-03-03', 'fallido'],
      ['2026-03-04', 'en_curso'],
    ])
  })

  it('es completo solo si todos los registros del periodo son la versión completa', () => {
    const dosAlDia = habito({ tipo: 'veces_por_periodo', veces: 2, periodo: 'dia' })
    const e = evaluarHabito({
      habito: dosAlDia,
      registros: [
        registro('2026-03-02', 'completa'),
        registro('2026-03-02', 'completa'),
        registro('2026-03-03', 'completa'),
        registro('2026-03-03', 'minima'),
      ],
      ahora: local(2026, 3, 3, 12),
      ajustes,
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_completa'],
      ['2026-03-03', 'cumplido_minima'],
    ])
  })

  it('el cierre sigue la hora configurada', () => {
    const e = evaluarHabito({
      habito: diario,
      registros: [],
      ahora: local(2026, 3, 3, 0, 30),
      ajustes: { horaCierre: '00:00' },
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'fallido'],
      ['2026-03-03', 'en_curso'],
    ])
  })

  it('aún no tiene periodos si empieza en el futuro', () => {
    const e = evaluarHabito({
      habito: habito(diario.frecuencia, '2026-03-10'),
      registros: [],
      ahora: local(2026, 3, 9, 12),
      ajustes,
    })
    expect(e.periodos).toEqual([])
    expect(e.actual).toBeUndefined()
  })
})

describe('evaluación: veces por semana', () => {
  const tresPorSemana = habito({ tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' })
  const dos = [registro('2026-03-03'), registro('2026-03-05')]

  it('con 2 de 3 la semana sigue en curso hasta el domingo a la hora de cierre', () => {
    const e = evaluarHabito({ habito: tresPorSemana, registros: dos, ahora: local(2026, 3, 9, 3, 59), ajustes })
    expect(e.periodos).toEqual([
      { desde: '2026-03-02', hasta: '2026-03-08', pide: 3, hechos: 2, estado: 'en_curso' },
    ])
  })

  it('con 2 de 3 la semana falla al cerrarse el domingo y empieza otra', () => {
    const e = evaluarHabito({ habito: tresPorSemana, registros: dos, ahora: local(2026, 3, 9, 4), ajustes })
    expect(e.periodos.map((p) => [p.desde, p.hasta, p.hechos, p.estado])).toEqual([
      ['2026-03-02', '2026-03-08', 2, 'fallido'],
      ['2026-03-09', '2026-03-15', 0, 'en_curso'],
    ])
    expect(e.actual).toMatchObject({ desde: '2026-03-09', pide: 3, hechos: 0 })
  })

  it('se cumple en cuanto llega al tercero, aunque la semana no haya acabado', () => {
    const e = evaluarHabito({
      habito: tresPorSemana,
      registros: [...dos, registro('2026-03-06')],
      ahora: local(2026, 3, 6, 20),
      ajustes,
    })
    expect(e.actual).toMatchObject({ hechos: 3, estado: 'cumplido_minima' })
  })

  it('si empieza a mitad de semana, el primer periodo es la semana natural entera', () => {
    const e = evaluarHabito({
      habito: habito(tresPorSemana.frecuencia, '2026-03-04'),
      registros: [],
      ahora: local(2026, 3, 4, 12),
      ajustes,
    })
    expect(estados(e)).toEqual([['2026-03-02', 'en_curso']])
  })
})

describe('evaluación: veces por mes', () => {
  it('los periodos son meses naturales, también febrero', () => {
    const e = evaluarHabito({
      habito: habito({ tipo: 'veces_por_periodo', veces: 2, periodo: 'mes' }, '2026-01-20'),
      registros: [registro('2026-01-21'), registro('2026-01-31'), registro('2026-02-10')],
      ahora: local(2026, 3, 1, 3),
      ajustes,
    })
    expect(e.periodos.map((p) => [p.desde, p.hasta, p.estado])).toEqual([
      ['2026-01-01', '2026-01-31', 'cumplido_minima'],
      ['2026-02-01', '2026-02-28', 'en_curso'],
    ])
  })
})

describe('evaluación: días concretos de la semana', () => {
  // Lunes, miércoles y viernes.
  const lmv = habito({ tipo: 'dias_semana', dias: [1, 3, 5] })

  it('cada día marcado pide 1; los demás no están programados', () => {
    const e = evaluarHabito({
      habito: lmv,
      registros: [registro('2026-03-02')],
      ahora: local(2026, 3, 6, 12),
      ajustes,
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_minima'],
      ['2026-03-03', 'no_programado'],
      ['2026-03-04', 'fallido'],
      ['2026-03-05', 'no_programado'],
      ['2026-03-06', 'en_curso'],
    ])
  })

  it('un registro en un día no programado suma voto pero no cumple otro día', () => {
    const e = evaluarHabito({
      habito: lmv,
      registros: [registro('2026-03-02'), registro('2026-03-03'), registro('2026-03-03')],
      ahora: local(2026, 3, 4, 12),
      ajustes,
    })
    expect(e.votos).toBe(3)
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_minima'],
      ['2026-03-03', 'no_programado'],
      ['2026-03-04', 'en_curso'],
    ])
  })
})

describe('evaluación: votos', () => {
  it('cuenta todos los registros del hábito, aunque el periodo ya esté cumplido', () => {
    const e = evaluarHabito({
      habito: diario,
      registros: [
        registro('2026-03-02'),
        registro('2026-03-02', 'completa'),
        { ...registro('2026-03-02'), habitoId: 'otro' },
      ],
      ahora: local(2026, 3, 3, 12),
      ajustes,
    })
    expect(e.votos).toBe(2)
  })
})
