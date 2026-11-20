import { describe, expect, it } from 'vitest'
import {
  AJUSTES_POR_DEFECTO,
  cambiarRegla,
  componerHoy,
  editarHabito,
  evaluarHabito,
  nuevoHabito,
  resumirIdentidades,
  sumarValor,
  type Cuantitativo,
  type Frecuencia,
  type Habito,
  type Identidad,
  type Registro,
} from '.'

const local = (a: number, mes: number, d: number, h: number, min = 0) => new Date(a, mes - 1, d, h, min)
const ajustes = AJUSTES_POR_DEFECTO
const DIARIO: Frecuencia = { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' }

// Marzo de 2026: el lunes 2 empieza semana; el domingo 8 la cierra.
const habito = (cuantitativo: Cuantitativo, frecuencia = DIARIO): Habito => ({
  id: 'h',
  creadoEn: '2026-03-02T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Leer',
  tipo: 'cuantitativo',
  cuantitativo,
  frecuencia,
  fechaInicio: '2026-03-02',
  archivado: false,
  orden: 0,
})
const paginas = habito({ unidad: 'páginas', objetivo: 20, objetivoMinimo: 5, modo: 'al_menos' })
const cafes = habito({ unidad: 'cafés', objetivo: 2, modo: 'como_mucho' })

let n = 0
const valor = (dia: string, v: number): Registro => ({
  id: `r${n++}`,
  creadoEn: `${dia}T10:00:00.000Z`,
  habitoId: 'h',
  dia,
  tipo: 'valor',
  valor: v,
})

const estados = (e: ReturnType<typeof evaluarHabito>) => e.periodos.map((p) => [p.desde, p.estado])

describe('cuantitativo «al menos»', () => {
  it('suma los valores del periodo: objetivo = completa, objetivo mínimo = mínima, si no, fallo al cierre', () => {
    const e = evaluarHabito({
      habito: paginas,
      registros: [valor('2026-03-02', 12), valor('2026-03-02', 8), valor('2026-03-03', 5), valor('2026-03-04', 4)],
      ahora: local(2026, 3, 5, 12),
      ajustes,
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_completa'],
      ['2026-03-03', 'cumplido_minima'],
      ['2026-03-04', 'fallido'],
      ['2026-03-05', 'en_curso'],
    ])
    expect(e.periodos.map((p) => [p.hechos, p.pide])).toEqual([
      [20, 20],
      [5, 20],
      [4, 20],
      [0, 20],
    ])
  })

  it('gana 1 voto por periodo cumplido, no por registro; llegar al objetivo hoy ya cuenta', () => {
    const e = evaluarHabito({
      habito: paginas,
      registros: [valor('2026-03-02', 10), valor('2026-03-02', 15), valor('2026-03-03', 5), valor('2026-03-04', 2), valor('2026-03-05', 30)],
      ahora: local(2026, 3, 5, 12),
      ajustes,
    })
    expect(e.votos).toBe(3)
  })

  it('sin objetivo mínimo, quedarse corto es un fallo', () => {
    const sinMinimo = habito({ unidad: 'km', objetivo: 5, modo: 'al_menos' })
    const e = evaluarHabito({ habito: sinMinimo, registros: [valor('2026-03-02', 4.5)], ahora: local(2026, 3, 3, 12), ajustes })
    expect(estados(e)[0]).toEqual(['2026-03-02', 'fallido'])
  })

  it('con frecuencia semanal, el objetivo es para la semana entera', () => {
    const semanal = habito({ unidad: 'km', objetivo: 10, modo: 'al_menos' }, { tipo: 'veces_por_periodo', veces: 1, periodo: 'semana' })
    const e = evaluarHabito({
      habito: semanal,
      registros: [valor('2026-03-03', 4), valor('2026-03-07', 6), valor('2026-03-10', 3)],
      ahora: local(2026, 3, 11, 12),
      ajustes,
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_completa'],
      ['2026-03-09', 'en_curso'],
    ])
    expect(e.actual?.hechos).toBe(3)
  })
})

describe('cuantitativo «como mucho»', () => {
  it('se cumple al cierre si la suma no supera el objetivo; un periodo sin registros también cuenta', () => {
    const e = evaluarHabito({
      habito: cafes,
      registros: [valor('2026-03-02', 2), valor('2026-03-03', 1), valor('2026-03-03', 2)],
      ahora: local(2026, 3, 5, 12),
      ajustes,
    })
    expect(estados(e)).toEqual([
      ['2026-03-02', 'cumplido_completa'],
      ['2026-03-03', 'fallido'],
      ['2026-03-04', 'cumplido_completa'],
      ['2026-03-05', 'en_curso'],
    ])
    expect(e.votos).toBe(2)
  })

  it('el periodo en curso no se cumple ni falla hasta la hora de cierre', () => {
    const registros = [valor('2026-03-02', 3)]
    expect(evaluarHabito({ habito: cafes, registros, ahora: local(2026, 3, 3, 3, 59), ajustes }).actual?.estado).toBe('en_curso')
    expect(evaluarHabito({ habito: cafes, registros: [], ahora: local(2026, 3, 3, 3, 59), ajustes }).votos).toBe(0)
    expect(evaluarHabito({ habito: cafes, registros: [], ahora: local(2026, 3, 3, 4), ajustes }).votos).toBe(1)
  })

  it('un día saltado o en pausa en el que te pasaste no cuenta como fallo', () => {
    const salto: Registro = { id: 's', creadoEn: '2026-03-02T11:00:00.000Z', habitoId: 'h', dia: '2026-03-02', tipo: 'salto' }
    const e = evaluarHabito({ habito: cafes, registros: [valor('2026-03-02', 5), salto], ahora: local(2026, 3, 3, 12), ajustes })
    expect(estados(e)[0]).toEqual(['2026-03-02', 'saltado'])
  })
})

describe('el día de cada voto (curva e hitos de la identidad)', () => {
  it('«al menos»: el día en que la suma llegó al umbral; «como mucho»: el último día del periodo', () => {
    const semanal = habito({ unidad: 'km', objetivo: 10, objetivoMinimo: 4, modo: 'al_menos' }, { tipo: 'veces_por_periodo', veces: 1, periodo: 'semana' })
    const registros = [valor('2026-03-03', 2), valor('2026-03-05', 3), valor('2026-03-07', 9)]
    expect(evaluarHabito({ habito: semanal, registros, ahora: local(2026, 3, 10, 12), ajustes }).diasVoto).toEqual(['2026-03-05'])
    expect(evaluarHabito({ habito: cafes, registros: [valor('2026-03-03', 9)], ahora: local(2026, 3, 4, 12), ajustes }).diasVoto).toEqual(['2026-03-02'])
  })
})

describe('cambiar el objetivo', () => {
  it('cuenta desde el periodo en curso: los días cerrados se siguen evaluando con el objetivo de entonces', () => {
    const registros = [valor('2026-03-02', 10), valor('2026-03-03', 10), valor('2026-03-04', 10)]
    const ahora = local(2026, 3, 4, 12)
    const cambiado = cambiarRegla({
      habito: paginas,
      regla: { frecuencia: DIARIO, cuantitativo: { unidad: 'páginas', objetivo: 10, modo: 'al_menos' } },
      ahora,
      ajustes,
    })
    expect(estados(evaluarHabito({ habito: cambiado, registros, ahora, ajustes }))).toEqual([
      ['2026-03-02', 'cumplido_minima'],
      ['2026-03-03', 'cumplido_minima'],
      ['2026-03-04', 'cumplido_completa'],
    ])
  })
})

describe('asistente: hábito cuantitativo', () => {
  const ahora = local(2026, 3, 2, 9)
  const datos = { nombre: 'Leer', identidadId: 'general', orden: 0 }

  it('se crea con su unidad (sin espacios sobrantes), objetivo, objetivo mínimo y modo', () => {
    const h = nuevoHabito(
      { ...datos, tipo: 'cuantitativo', cuantitativo: { unidad: ' páginas ', objetivo: 20, objetivoMinimo: 5, modo: 'al_menos' } },
      ahora,
      ajustes,
    )
    expect(h).toMatchObject({ tipo: 'cuantitativo', cuantitativo: { unidad: 'páginas', objetivo: 20, objetivoMinimo: 5, modo: 'al_menos' } })
  })

  it('«como mucho» no tiene objetivo mínimo, ni «al menos» uno que no quede por debajo del objetivo', () => {
    const limite = nuevoHabito({ ...datos, tipo: 'cuantitativo', cuantitativo: { unidad: 'cafés', objetivo: 2, objetivoMinimo: 1, modo: 'como_mucho' } }, ahora, ajustes)
    expect(limite.cuantitativo).toEqual({ unidad: 'cafés', objetivo: 2, modo: 'como_mucho' })
    const igual = nuevoHabito({ ...datos, tipo: 'cuantitativo', cuantitativo: { unidad: 'km', objetivo: 5, objetivoMinimo: 5, modo: 'al_menos' } }, ahora, ajustes)
    expect(igual.cuantitativo).toEqual({ unidad: 'km', objetivo: 5, modo: 'al_menos' })
  })

  it('un hábito sí/no no guarda datos cuantitativos', () => {
    const h = nuevoHabito({ ...datos, tipo: 'si_no', cuantitativo: { unidad: 'km', objetivo: 5, modo: 'al_menos' } }, ahora, ajustes)
    expect(h.tipo).toBe('si_no')
    expect(h).not.toHaveProperty('cuantitativo')
  })

  it('al editar, cambiar el objetivo días después guarda el anterior en el historial; el tipo no cambia', () => {
    const jueves = local(2026, 3, 5, 9)
    const editado = editarHabito(paginas, { ...paginas, tipo: 'si_no', cuantitativo: { ...paginas.cuantitativo!, objetivo: 30 } }, jueves, ajustes)
    expect(editado.tipo).toBe('cuantitativo')
    expect(editado.cuantitativo?.objetivo).toBe(30)
    expect(editado.versiones).toEqual([{ frecuencia: DIARIO, cuantitativo: paginas.cuantitativo, hasta: '2026-03-04' }])
  })

  it('editar solo el nombre no crea una versión de la regla', () => {
    expect(editarHabito(paginas, { ...paginas, nombre: 'Leer más' }, local(2026, 3, 5, 9), ajustes)).not.toHaveProperty('versiones')
  })
})

describe('Hoy con un hábito cuantitativo', () => {
  const general: Identidad = { id: 'general', creadoEn: '2026-03-01T10:00:00.000Z', nombre: '', esGeneral: true, archivada: false, orden: 0 }
  const hoy = (registros: Registro[], ahora: Date, habito = paginas) =>
    componerHoy({ habitos: [habito], identidades: [general], registros, ahora, ajustes })

  it('sumar un valor lo apunta en el día lógico (también a la 01:00)', () => {
    const { registro } = sumarValor({ habito: paginas, registros: [], valor: 7, ahora: local(2026, 3, 4, 1), ajustes })
    expect(registro).toEqual({ habitoId: 'h', dia: '2026-03-03', tipo: 'valor', valor: 7 })
  })

  it('el valor que alcanza el objetivo mínimo trae el voto; los siguientes del mismo periodo, no', () => {
    const ahora = local(2026, 3, 4, 12)
    const voto = (registros: Registro[], v: number) => sumarValor({ habito: paginas, registros, valor: v, ahora, ajustes }).voto
    expect(voto([], 3)).toBe(false)
    expect(voto([valor('2026-03-04', 3)], 2)).toBe(true)
    expect(voto([valor('2026-03-04', 5)], 15)).toBe(false)
    // «Como mucho» solo se cumple al cerrar el día.
    expect(sumarValor({ habito: cafes, registros: [], valor: 1, ahora, ajustes }).voto).toBe(false)
  })

  it('la tarjeta muestra lo que lleva el periodo y los valores de hoy (para deshacer el último)', () => {
    const registros = [valor('2026-03-04', 1.5), valor('2026-03-04', 2)]
    const [tarjeta] = hoy(registros, local(2026, 3, 4, 12)).habitos
    expect(tarjeta.periodo).toMatchObject({ hechos: 3.5, pide: 20, estado: 'en_curso' })
    expect(tarjeta.registros).toEqual(registros)
    expect(tarjeta.hecho).toBe(false)
    expect(hoy([valor('2026-03-04', 20)], local(2026, 3, 4, 12)).habitos[0].hecho).toBe(true)
  })

  it('los votos de hoy cuentan el periodo cumplido hoy, no cada valor ni la semana cumplida antes', () => {
    expect(hoy([valor('2026-03-04', 3), valor('2026-03-04', 20)], local(2026, 3, 4, 12)).votos).toBe(1)
    const semanal = habito({ unidad: 'km', objetivo: 10, modo: 'al_menos' }, { tipo: 'veces_por_periodo', veces: 1, periodo: 'semana' })
    const registros = [valor('2026-03-03', 10), valor('2026-03-04', 2)]
    expect(hoy(registros, local(2026, 3, 3, 12), semanal).votos).toBe(1)
    expect(hoy(registros, local(2026, 3, 4, 12), semanal).votos).toBe(0)
  })

  it('suma a su identidad 1 voto por periodo cumplido', () => {
    const registros = [valor('2026-03-02', 25), valor('2026-03-03', 5), valor('2026-03-04', 1), valor('2026-03-04', 5)]
    const [resumen] = resumirIdentidades({ identidades: [general], habitos: [paginas], registros, ahora: local(2026, 3, 4, 12), ajustes })
    expect(resumen).toMatchObject({ votos: 3, votosHoy: 1 })
  })
})
