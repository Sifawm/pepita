import { describe, expect, it } from 'vitest'
import {
  AJUSTES_POR_DEFECTO,
  moverIdentidad,
  nuevaIdentidad,
  nuevoHabito,
  resumirIdentidades,
  type Habito,
  type Identidad,
  type Registro,
} from '.'

const local = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(a, mes - 1, d, h, min)

const ajustes = AJUSTES_POR_DEFECTO
const identidad = (id: string, orden: number, extra: Partial<Identidad> = {}): Identidad => ({
  id,
  creadoEn: '2026-03-01T10:00:00.000Z',
  nombre: id,
  esGeneral: false,
  archivada: false,
  orden,
  ...extra,
})
const general = identidad('general', 0, { nombre: '', esGeneral: true })

const habito = (id: string, identidadId: string, extra: Partial<Habito> = {}): Habito => ({
  ...nuevoHabito({ nombre: id, identidadId, orden: 0 }, local(2026, 3, 1, 9), ajustes),
  id,
  creadoEn: '2026-03-01T08:00:00.000Z',
  ...extra,
})
const registro = (habitoId: string, dia: string, n = 0): Registro => ({
  id: `${habitoId}-${dia}-${n}`,
  creadoEn: `${dia}T10:0${n}:00.000Z`,
  habitoId,
  dia,
  tipo: n % 2 ? 'completa' : 'minima',
})

describe('votos por identidad', () => {
  const lectora = identidad('lectora', 1)
  const corredora = identidad('corredora', 2, { archivada: true })
  const habitos = [
    habito('leer', 'lectora'),
    habito('poesia', 'lectora', { archivado: true }),
    habito('correr', 'corredora'),
    habito('agua', 'general'),
  ]
  const registros = [
    registro('leer', '2026-03-14'),
    registro('leer', '2026-03-15'),
    registro('leer', '2026-03-15', 1),
    registro('poesia', '2026-03-10'),
    registro('correr', '2026-03-02'),
    registro('agua', '2026-03-15'),
  ]

  it('suma cada acción cumplida a su identidad, en total y en el día lógico, en el orden de la lista', () => {
    const resumen = resumirIdentidades({
      identidades: [corredora, lectora, general],
      habitos,
      registros,
      ahora: local(2026, 3, 16, 1),
      ajustes,
    })
    expect(resumen.map((r) => [r.identidad.id, r.votos, r.votosHoy])).toEqual([
      ['general', 1, 1],
      ['lectora', 4, 2],
      ['corredora', 1, 0],
    ])
  })

  it('una identidad sin hábitos empieza con cero votos', () => {
    const [r] = resumirIdentidades({
      identidades: [identidad('nueva', 3)],
      habitos,
      registros,
      ahora: local(2026, 3, 15, 9),
      ajustes,
    })
    expect([r.votos, r.votosHoy]).toEqual([0, 0])
  })
})

describe('reordenar identidades', () => {
  const lectora = identidad('lectora', 1)
  const vieja = identidad('vieja', 2, { archivada: true })
  const corredora = identidad('corredora', 3)
  const lista = [corredora, vieja, general, lectora]

  it('subir intercambia el puesto con la identidad activa de arriba, saltando las archivadas', () => {
    expect(moverIdentidad(lista, 'corredora', -1)).toEqual([
      { ...corredora, orden: 1 },
      { ...lectora, orden: 3 },
    ])
  })

  it('bajar «General» la pone detrás de la siguiente', () => {
    expect(moverIdentidad(lista, 'general', 1)).toEqual([
      { ...general, orden: 1 },
      { ...lectora, orden: 0 },
    ])
  })

  it('en los extremos no cambia nada', () => {
    expect(moverIdentidad(lista, 'general', -1)).toEqual([])
    expect(moverIdentidad(lista, 'corredora', 1)).toEqual([])
  })
})

describe('nueva identidad', () => {
  it('guarda la frase sin espacios sobrantes y va al final de la lista', () => {
    const lectora = identidad('lectora', 1)
    const vieja = identidad('vieja', 7, { archivada: true })
    expect(nuevaIdentidad('  Soy una persona que lee  ', [general, lectora, vieja])).toEqual({
      nombre: 'Soy una persona que lee',
      esGeneral: false,
      archivada: false,
      orden: 8,
    })
  })
})
