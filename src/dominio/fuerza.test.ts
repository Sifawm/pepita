import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, evaluarHabito, sumarDias, type Habito, type Registro } from '.'

const ajustes = AJUSTES_POR_DEFECTO
const INICIO = '2026-03-02' // lunes

const diario: Habito = {
  id: 'h',
  creadoEn: '2026-03-02T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Leer',
  tipo: 'si_no',
  frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
  fechaInicio: INICIO,
  archivado: false,
  orden: 0,
}

let n = 0
/** Registro el día `d` del hábito (1 = el día de inicio). */
const registro = (d: number, tipo: Registro['tipo'] = 'minima', valor?: number): Registro => ({
  id: `r${n++}`,
  creadoEn: `${sumarDias(INICIO, d - 1)}T10:00:00.000Z`,
  habitoId: 'h',
  dia: sumarDias(INICIO, d - 1),
  tipo,
  ...(valor !== undefined && { valor }),
})
/** Un registro cada `paso` días durante los `dias` primeros días. */
const cada = (dias: number, paso = 1, tipo: Registro['tipo'] = 'minima', valor?: number) =>
  Array.from({ length: Math.ceil(dias / paso) }, (_, i) => registro(1 + i * paso, tipo, valor))
/** Evaluación a las 23:00 del día `d` del hábito. */
const evaluarEl = (habito: Habito, registros: Registro[], d: number) => {
  const [a, m, dd] = sumarDias(INICIO, d - 1).split('-').map(Number)
  return evaluarHabito({ habito, registros, ahora: new Date(a, m - 1, dd, 23), ajustes })
}
/** La fuerza al final del día `d`, con todo lo registrado hasta entonces. */
const fuerzaEl = (habito: Habito, registros: Registro[], d: number) => evaluarEl(habito, registros, d).fuerza.at(-1)!.valor

describe('fuerza (fórmula de Loop)', () => {
  it('un hábito diario perfecto ronda 0,8 a los 30 días y 0,96 a los 60', () => {
    const registros = cada(60)
    expect(fuerzaEl(diario, registros, 30)).toBeCloseTo(0.8, 2)
    expect(fuerzaEl(diario, registros, 60)).toBeCloseTo(0.96, 2)
  })

  it('perdona un fallo aislado: baja un poco y vuelve a subir', () => {
    const conFallo = [...cada(10), ...cada(20).slice(11)] // el día 11 sin hacer
    const { fuerza } = evaluarEl(diario, conFallo, 20)
    const [antes, fallo] = [fuerza[9].valor, fuerza[10].valor]
    expect(fallo).toBeLessThan(antes)
    expect(fallo).toBeGreaterThan(antes * 0.9)
    expect(fuerza[11].valor).toBeGreaterThan(antes)
  })

  it('un día saltado o en pausa deja la fuerza igual', () => {
    const antes = fuerzaEl(diario, cada(10), 10)
    expect(fuerzaEl(diario, [...cada(10), registro(11, 'salto')], 11)).toBe(antes)
    const pausado = { ...diario, pausas: [{ desde: sumarDias(INICIO, 10), hasta: sumarDias(INICIO, 12) }] }
    expect(fuerzaEl(pausado, cada(10), 13)).toBe(antes)
    // La pausa global también.
    const [a, m, d] = sumarDias(INICIO, 10).split('-').map(Number)
    const vacaciones = { ...ajustes, pausaGlobal: { desde: sumarDias(INICIO, 10), hasta: sumarDias(INICIO, 10) } }
    expect(evaluarHabito({ habito: diario, registros: cada(10), ahora: new Date(a, m - 1, d, 23), ajustes: vacaciones }).fuerza.at(-1)!.valor).toBe(antes)
  })

  it('hoy, aún sin hacer, no baja la fuerza; al cerrarse sin hacer, sí', () => {
    const antes = fuerzaEl(diario, cada(10), 10)
    expect(fuerzaEl(diario, cada(10), 11)).toBe(antes)
    expect(fuerzaEl(diario, cada(10), 12)).toBeLessThan(antes)
  })

  describe('frecuencias no diarias: f = veces / días del periodo, o nº de días / 7', () => {
    const tresPorSemana: Habito = { ...diario, frecuencia: { tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' } }
    const lxv: Habito = { ...diario, frecuencia: { tipo: 'dias_semana', dias: [1, 3, 5] } }
    const lunesMiercolesViernes = Array.from({ length: 8 }, (_, s) => [1, 3, 5].map((d) => registro(s * 7 + d))).flat()

    it('3 por semana cumplido (lunes, miércoles y viernes) se asienta aunque haya días sin registro', () => {
      expect(fuerzaEl(tresPorSemana, lunesMiercolesViernes, 56)).toBeGreaterThan(0.8)
      // Con menos repeticiones por semana, la fuerza sube más despacio que la de un diario perfecto.
      expect(fuerzaEl(tresPorSemana, lunesMiercolesViernes, 28)).toBeLessThan(fuerzaEl(diario, cada(28), 28))
      expect(fuerzaEl(tresPorSemana, lunesMiercolesViernes, 28)).toBeGreaterThan(0.5)
    })

    it('lunes, miércoles y viernes vale lo mismo que 3 por semana', () => {
      expect(fuerzaEl(lxv, lunesMiercolesViernes, 56)).toBeCloseTo(fuerzaEl(tresPorSemana, lunesMiercolesViernes, 56), 10)
    })

    it('una sola vez por semana de las 3 pedidas cuenta un tercio', () => {
      const unaPorSemana = Array.from({ length: 8 }, (_, s) => registro(s * 7 + 1))
      const f = fuerzaEl(tresPorSemana, unaPorSemana, 56)
      expect(f).toBeGreaterThan(0.25)
      expect(f).toBeLessThan(0.4)
    })

    it('1 al mes cumplido también se asienta', () => {
      const mensual: Habito = { ...diario, frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'mes' } }
      // Marzo, abril y mayo, cada uno el día 2.
      const registros = [registro(1), registro(32), registro(62)]
      expect(fuerzaEl(mensual, registros, 92)).toBeGreaterThan(0.5)
    })
  })

  describe('cuantitativo: v es la parte del objetivo hecha en la ventana', () => {
    const cuantitativo = (modo: 'al_menos' | 'como_mucho', objetivo: number): Habito => ({
      ...diario,
      tipo: 'cuantitativo',
      cuantitativo: { unidad: 'u', objetivo, modo },
    })
    const m = 0.5 ** (1 / 13)

    it('«al menos» 20 páginas: 10 páginas cuentan medio día', () => {
      expect(evaluarEl(cuantitativo('al_menos', 20), [registro(1, 'valor', 10)], 2).fuerza[0].valor).toBeCloseTo(0.5 * (1 - m), 10)
      expect(evaluarEl(cuantitativo('al_menos', 20), [registro(1, 'valor', 30)], 2).fuerza[0].valor).toBeCloseTo(1 - m, 10)
    })

    it('«como mucho» 2 cafés: v = 1 − (suma − objetivo)/objetivo, entre 0 y 1', () => {
      const cafes = cuantitativo('como_mucho', 2)
      const primerDia = (valores: number[]) => evaluarEl(cafes, valores.map((v) => registro(1, 'valor', v)), 2).fuerza[0].valor
      expect(primerDia([])).toBeCloseTo(1 - m, 10)
      expect(primerDia([2])).toBeCloseTo(1 - m, 10)
      expect(primerDia([1, 2])).toBeCloseTo(0.5 * (1 - m), 10)
      expect(primerDia([5])).toBe(0)
    })
  })

  describe('a evitar: un día limpio suma, una recaída resta', () => {
    const redes: Habito = { ...diario, tipo: 'evitar' }

    it('30 días limpios dan la misma fuerza que un diario perfecto', () => {
      expect(fuerzaEl(redes, [], 31)).toBeCloseTo(fuerzaEl(diario, cada(30), 31), 10)
    })

    it('una recaída hoy baja la fuerza ya (el día es un fallo en el acto)', () => {
      // Hoy limpio aún no suma: se gana al cerrar el día.
      const limpio = evaluarEl(redes, [], 11).fuerza
      expect(limpio[10].valor).toBe(limpio[9].valor)
      const recaida = evaluarEl(redes, [registro(11, 'recaida')], 11).fuerza
      expect(recaida[10].valor).toBeLessThan(recaida[9].valor)
    })
  })

  it('un punto por día desde el inicio hasta hoy', () => {
    const { fuerza } = evaluarEl(diario, cada(3), 3)
    expect(fuerza.map((p) => p.dia)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04'])
  })
})

describe('proporción entre versión mínima y completa', () => {
  it('cuenta los periodos cumplidos con cada versión', () => {
    const registros = [...cada(3), registro(4, 'completa'), registro(5, 'salto')]
    expect(evaluarEl(diario, registros, 6).proporcion).toEqual({ minima: 3, completa: 1 })
  })

  it('en un cuantitativo, la mínima es llegar al objetivo mínimo', () => {
    const paginas: Habito = {
      ...diario,
      tipo: 'cuantitativo',
      cuantitativo: { unidad: 'páginas', objetivo: 20, objetivoMinimo: 5, modo: 'al_menos' },
    }
    const registros = [registro(1, 'valor', 5), registro(2, 'valor', 25), registro(3, 'valor', 2)]
    expect(evaluarEl(paginas, registros, 4).proporcion).toEqual({ minima: 1, completa: 1 })
  })
})
