import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, calendarioHabito, evaluarHabito, type Habito, type Registro } from '.'

const ajustes = AJUSTES_POR_DEFECTO
// Empieza el miércoles 4 de marzo de 2026; «hoy» es el lunes 6 de abril a mediodía.
const ahora = new Date(2026, 3, 6, 12)
const habito: Habito = {
  id: 'h',
  creadoEn: '2026-03-04T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Meditar',
  tipo: 'si_no',
  frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
  fechaInicio: '2026-03-04',
  archivado: false,
  orden: 0,
}
const registro = (id: string, dia: string, tipo: Registro['tipo'] = 'minima', habitoId = 'h'): Registro => ({
  id,
  creadoEn: `${dia}T10:00:00.000Z`,
  habitoId,
  dia,
  tipo,
})

describe('calendario del hábito', () => {
  it('da el mes entero, con los registros y el estado del periodo de cada día', () => {
    const registros = [registro('a', '2026-03-05'), registro('b', '2026-03-05', 'completa'), registro('otro', '2026-03-06', 'minima', 'otro')]
    const mes = calendarioHabito({ habito, registros, mes: '2026-03-17', ahora, ajustes })

    expect([mes.desde, mes.hasta, mes.dias.length]).toEqual(['2026-03-01', '2026-03-31', 31])
    expect(mes.dias.slice(2, 6).map((d) => [d.dia, d.registros.map((r) => r.id), d.estado])).toEqual([
      ['2026-03-03', [], undefined],
      ['2026-03-04', [], 'fallido'],
      ['2026-03-05', ['a', 'b'], 'cumplido_minima'],
      ['2026-03-06', [], 'fallido'],
    ])
  })

  it('se puede editar cualquier día desde el inicio hasta hoy, sin límite hacia atrás', () => {
    const marzo = calendarioHabito({ habito, registros: [], mes: '2026-03-01', ahora, ajustes })
    const abril = calendarioHabito({ habito, registros: [], mes: '2026-04-30', ahora, ajustes })
    const editables = (m: typeof marzo) => m.dias.filter((d) => d.editable).map((d) => d.dia)

    expect(editables(marzo)).toEqual(marzo.dias.slice(3).map((d) => d.dia))
    expect(editables(abril)).toEqual(['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'])
    expect(abril.dias.at(-1)?.estado).toBeUndefined()
  })

  it('registrar un olvido en el pasado convierte el fallo en cumplido y suma su voto', () => {
    const antes = [registro('a', '2026-03-10')]
    const despues = [...antes, registro('olvido', '2026-03-09', 'completa')]
    const dia9 = (rs: Registro[]) => calendarioHabito({ habito, registros: rs, mes: '2026-03-09', ahora, ajustes }).dias[8]

    expect(dia9(antes).estado).toBe('fallido')
    expect(dia9(despues).estado).toBe('cumplido_completa')
    expect(evaluarHabito({ habito, registros: despues, ahora, ajustes }).votos).toBe(2)
  })

  it('deshacer un registro pasado vuelve a dejar el día como fallido y resta su voto', () => {
    const registros = [registro('a', '2026-03-10'), registro('b', '2026-03-11')]
    const sinB = registros.filter((r) => r.id !== 'b')
    const dia11 = calendarioHabito({ habito, registros: sinB, mes: '2026-03-01', ahora, ajustes }).dias[10]

    expect(dia11.estado).toBe('fallido')
    expect(evaluarHabito({ habito, registros: sinB, ahora, ajustes }).votos).toBe(1)
  })

  it('en un hábito semanal, cada día muestra el estado de su semana', () => {
    const semanal: Habito = { ...habito, frecuencia: { tipo: 'veces_por_periodo', veces: 2, periodo: 'semana' } }
    const registros = [registro('a', '2026-03-10'), registro('b', '2026-03-12')]
    const mes = calendarioHabito({ habito: semanal, registros, mes: '2026-03-01', ahora, ajustes })

    // Semana del 9 al 15: cumplida aunque cada día por separado tenga 0 o 1 registros.
    expect(mes.dias.slice(8, 15).map((d) => d.estado)).toEqual(Array(7).fill('cumplido_minima'))
    expect(mes.dias[8].registros).toEqual([])
    // Cada día sabe qué periodo lo contiene (para anotar el fallo de la semana entera).
    expect(mes.dias[11].periodo).toBe('2026-03-09')
  })
})
