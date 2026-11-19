import { describe, expect, it } from 'vitest'
import {
  AJUSTES_POR_DEFECTO,
  componerHoy,
  nuevoHabito,
  toque,
  type Habito,
  type Identidad,
  type Registro,
} from '.'

const local = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(a, mes - 1, d, h, min)

const ajustes = AJUSTES_POR_DEFECTO
const general: Identidad = {
  id: 'general',
  creadoEn: '2026-03-01T10:00:00.000Z',
  nombre: '',
  esGeneral: true,
  archivada: false,
  orden: 0,
}

const habito = (id: string, nombre: string, orden: number): Habito => ({
  ...nuevoHabito({ nombre, identidadId: 'general', orden }, local(2026, 3, 10, 9), ajustes),
  id,
  creadoEn: '2026-03-10T08:00:00.000Z',
})
const leer = habito('leer', 'Leer', 0)
const meditar = habito('meditar', 'Meditar', 1)

const registro = (habitoId: string, dia: string, n = 0): Registro => ({
  id: `${habitoId}-${dia}-${n}`,
  creadoEn: `${dia}T10:0${n}:00.000Z`,
  habitoId,
  dia,
  tipo: 'minima',
})

describe('nuevo hábito', () => {
  it('es sí/no diario y empieza en el día lógico de su creación', () => {
    const h = nuevoHabito({ nombre: 'Leer', identidadId: 'general', orden: 3 }, local(2026, 3, 15, 1), ajustes)
    expect(h).toMatchObject({
      nombre: 'Leer',
      identidadId: 'general',
      tipo: 'si_no',
      frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
      fechaInicio: '2026-03-14',
      archivado: false,
      orden: 3,
    })
  })
})

describe('Hoy', () => {
  it('muestra los hábitos con su identidad y sin votos al empezar el día', () => {
    const hoy = componerHoy({
      habitos: [meditar, leer],
      identidades: [general],
      registros: [],
      ahora: local(2026, 3, 15, 9),
      ajustes,
    })
    expect(hoy.dia).toBe('2026-03-15')
    expect(hoy.votos).toBe(0)
    expect(hoy.habitos.map((t) => [t.habito.id, t.identidad.id, t.hecho])).toEqual([
      ['leer', 'general', false],
      ['meditar', 'general', false],
    ])
  })

  it('cuenta un voto por cada registro del día lógico, incluido el de la 01:00', () => {
    const hoy = componerHoy({
      habitos: [leer, meditar],
      identidades: [general],
      registros: [registro('leer', '2026-03-14'), registro('leer', '2026-03-15')],
      ahora: local(2026, 3, 16, 1),
      ajustes,
    })
    expect(hoy.dia).toBe('2026-03-15')
    expect(hoy.votos).toBe(1)
    expect(hoy.habitos.find((t) => t.habito.id === 'leer')?.hecho).toBe(true)
    expect(hoy.habitos.find((t) => t.habito.id === 'meditar')?.hecho).toBe(false)
  })

  it('no muestra los hábitos archivados ni los que aún no han empezado', () => {
    const hoy = componerHoy({
      habitos: [{ ...leer, archivado: true }, { ...meditar, fechaInicio: '2026-03-20' }],
      identidades: [general],
      registros: [],
      ahora: local(2026, 3, 15, 9),
      ajustes,
    })
    expect(hoy.habitos).toEqual([])
  })
})

describe('Hoy por identidad', () => {
  const lectora: Identidad = { ...general, id: 'lectora', nombre: 'Soy una persona que lee', esGeneral: false, orden: 1 }
  const novelas = { ...habito('novelas', 'Novelas', 2), identidadId: 'lectora' }
  const datos = {
    habitos: [leer, meditar, novelas],
    identidades: [general, lectora],
    registros: [registro('leer', '2026-03-15'), registro('novelas', '2026-03-15')],
    ahora: local(2026, 3, 15, 9),
    ajustes,
  }

  it('filtrar por una identidad muestra solo sus hábitos y sus votos del día', () => {
    const hoy = componerHoy({ ...datos, identidadId: 'lectora' })
    expect(hoy.habitos.map((t) => t.habito.id)).toEqual(['novelas'])
    expect(hoy.votos).toBe(1)
  })

  it('«General» se filtra como una identidad más', () => {
    const hoy = componerHoy({ ...datos, identidadId: 'general' })
    expect(hoy.habitos.map((t) => t.habito.id)).toEqual(['leer', 'meditar'])
    expect(hoy.votos).toBe(1)
  })

  it('sin filtro muestra todas', () => {
    expect(componerHoy(datos).habitos.map((t) => t.habito.id)).toEqual(['leer', 'meditar', 'novelas'])
    expect(componerHoy(datos).votos).toBe(2)
  })

  it('los hábitos de una identidad archivada se guardan pero no aparecen en Hoy', () => {
    const hoy = componerHoy({ ...datos, identidades: [general, { ...lectora, archivada: true }] })
    expect(hoy.habitos.map((t) => t.habito.id)).toEqual(['leer', 'meditar'])
  })
})

describe('toque', () => {
  it('sin registro hoy, registra la versión mínima en el día lógico', () => {
    expect(toque({ habito: leer, registros: [], ahora: local(2026, 3, 16, 1), ajustes })).toEqual({
      tipo: 'registrar',
      registro: { habitoId: 'leer', dia: '2026-03-15', tipo: 'minima' },
    })
  })

  it('con el hábito ya cumplido hoy, deshace el último registro del día', () => {
    const ayer = registro('leer', '2026-03-14')
    const hoy = registro('leer', '2026-03-15')
    const otro = registro('meditar', '2026-03-15')
    expect(
      toque({ habito: leer, registros: [hoy, ayer, otro], ahora: local(2026, 3, 15, 22), ajustes }),
    ).toEqual({ tipo: 'deshacer', registroId: hoy.id })
  })
})
