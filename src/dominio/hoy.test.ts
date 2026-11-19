import { describe, expect, it } from 'vitest'
import {
  activarPausaGlobal,
  AJUSTES_POR_DEFECTO,
  componerHoy,
  nuevoHabito,
  pausarHabito,
  reanudarHabito,
  saltar,
  terminarPausaGlobal,
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

  it('acepta otra frecuencia', () => {
    const h = nuevoHabito(
      { nombre: 'Nadar', identidadId: 'general', orden: 0, frecuencia: { tipo: 'dias_semana', dias: [2, 4] } },
      local(2026, 3, 15, 9),
      ajustes,
    )
    expect(h.frecuencia).toEqual({ tipo: 'dias_semana', dias: [2, 4] })
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

  it('muestra solo los hábitos que tocan hoy, con lo que llevan del periodo', () => {
    // El domingo 15 de marzo: correr toca lunes y miércoles; nadar, 3 veces por semana.
    const correr: Habito = { ...habito('correr', 'Correr', 2), frecuencia: { tipo: 'dias_semana', dias: [1, 3] } }
    const nadar: Habito = {
      ...habito('nadar', 'Nadar', 3),
      frecuencia: { tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' },
    }
    const hoy = componerHoy({
      habitos: [correr, nadar],
      identidades: [general],
      registros: [registro('nadar', '2026-03-10'), registro('nadar', '2026-03-12')],
      ahora: local(2026, 3, 15, 9),
      ajustes,
    })
    expect(hoy.habitos).toHaveLength(1)
    expect(hoy.habitos[0]).toMatchObject({
      habito: { id: 'nadar' },
      hecho: false,
      periodo: { desde: '2026-03-09', hasta: '2026-03-15', pide: 3, hechos: 2, estado: 'en_curso' },
    })
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

describe('Hoy con saltos y pausas', () => {
  const base = { identidades: [general], registros: [] as Registro[], ajustes }

  it('saltar registra un salto en el día lógico, con el motivo si lo hay', () => {
    expect(saltar({ habito: leer, motivo: '  Fiebre ', ahora: local(2026, 3, 16, 1), ajustes })).toEqual({
      habitoId: 'leer',
      dia: '2026-03-15',
      tipo: 'salto',
      motivo: 'Fiebre',
    })
    expect(saltar({ habito: leer, motivo: ' ', ahora: local(2026, 3, 15, 9), ajustes })).toEqual({
      habitoId: 'leer',
      dia: '2026-03-15',
      tipo: 'salto',
    })
  })

  it('un hábito saltado sigue en Hoy, con su salto para poder deshacerlo, y no suma votos', () => {
    const salto: Registro = { ...registro('leer', '2026-03-15'), tipo: 'salto' }
    const hoy = componerHoy({ ...base, habitos: [leer], registros: [salto], ahora: local(2026, 3, 15, 9) })
    expect(hoy.votos).toBe(0)
    expect(hoy.habitos[0]).toMatchObject({ hecho: false, registros: [], salto, periodo: { estado: 'saltado' } })
    // Hacerlo igualmente registra, no deshace el salto.
    expect(toque({ habito: leer, registros: [salto], ahora: local(2026, 3, 15, 9), ajustes }).tipo).toBe('registrar')
  })

  it('un hábito en pausa sigue en Hoy, marcado con su pausa', () => {
    const pausa = { desde: '2026-03-14', hasta: '2026-03-20' }
    const hoy = componerHoy({ ...base, habitos: [{ ...leer, pausas: [pausa] }, meditar], ahora: local(2026, 3, 15, 9) })
    expect(hoy.pausaGlobal).toBeUndefined()
    expect(hoy.habitos.map((t) => [t.habito.id, t.pausa])).toEqual([
      ['leer', pausa],
      ['meditar', undefined],
    ])
  })

  it('la pausa global se ve en Hoy mientras dura y desaparece sola al acabar', () => {
    const pausaGlobal = { desde: '2026-03-14', hasta: '2026-03-15' }
    const durante = componerHoy({ ...base, habitos: [leer], ajustes: { ...ajustes, pausaGlobal }, ahora: local(2026, 3, 16, 3) })
    expect(durante.pausaGlobal).toEqual(pausaGlobal)
    expect(durante.habitos[0].pausa).toEqual(pausaGlobal)
    const despues = componerHoy({ ...base, habitos: [leer], ajustes: { ...ajustes, pausaGlobal }, ahora: local(2026, 3, 16, 4) })
    expect(despues.pausaGlobal).toBeUndefined()
    expect(despues.habitos[0].pausa).toBeUndefined()
  })

  it('pausar un hábito añade la pausa; reanudar hoy la cierra ayer y deja las futuras', () => {
    const pasada = { desde: '2026-03-01', hasta: '2026-03-02' }
    const futura = { desde: '2026-04-01', hasta: '2026-04-05' }
    const pausado = pausarHabito({ ...leer, pausas: [pasada, futura] }, { desde: '2026-03-12', hasta: '2026-03-20' })
    expect(pausado.pausas).toEqual([pasada, futura, { desde: '2026-03-12', hasta: '2026-03-20' }])
    expect(reanudarHabito(pausado, local(2026, 3, 15, 9), ajustes).pausas).toEqual([
      pasada,
      futura,
      { desde: '2026-03-12', hasta: '2026-03-14' },
    ])
    // Si la pausa empezaba hoy, reanudar la quita entera.
    const deHoy = pausarHabito(leer, { desde: '2026-03-15', hasta: '2026-03-20' })
    expect(reanudarHabito(deHoy, local(2026, 3, 15, 9), ajustes).pausas).toEqual([])
  })

  it('activar la pausa global empieza hoy; la anterior se guarda en cada hábito para que sus días no fallen', () => {
    const anterior = { desde: '2026-03-01', hasta: '2026-03-03' }
    const { pausaGlobal, habitos } = activarPausaGlobal({
      ajustes: { ...ajustes, pausaGlobal: anterior },
      habitos: [leer, { ...meditar, pausas: [{ desde: '2026-02-01', hasta: '2026-02-02' }] }],
      hasta: '2026-03-22',
      ahora: local(2026, 3, 15, 9),
    })
    expect(pausaGlobal).toEqual({ desde: '2026-03-15', hasta: '2026-03-22' })
    expect(habitos.map((h) => h.pausas)).toEqual([[anterior], [{ desde: '2026-02-01', hasta: '2026-02-02' }, anterior]])
    expect(activarPausaGlobal({ ajustes, habitos: [leer], hasta: '2026-03-22', ahora: local(2026, 3, 15, 9) }).habitos).toEqual([])
  })

  it('terminar la pausa global hoy la cierra ayer (o la quita si empezaba hoy)', () => {
    const pausaGlobal = { desde: '2026-03-10', hasta: '2026-03-22' }
    expect(terminarPausaGlobal({ ajustes: { ...ajustes, pausaGlobal }, ahora: local(2026, 3, 15, 9) })).toEqual({
      desde: '2026-03-10',
      hasta: '2026-03-14',
    })
    expect(terminarPausaGlobal({ ajustes: { ...ajustes, pausaGlobal }, ahora: local(2026, 3, 10, 9) })).toBeUndefined()
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

  it('en un hábito de 2 veces al día, el segundo toque registra y el tercero deshace', () => {
    const dosAlDia: Habito = { ...leer, frecuencia: { tipo: 'veces_por_periodo', veces: 2, periodo: 'dia' } }
    const primero = registro('leer', '2026-03-15', 0)
    const segundo = registro('leer', '2026-03-15', 1)
    const ahora = local(2026, 3, 15, 22)
    expect(toque({ habito: dosAlDia, registros: [primero], ahora, ajustes }).tipo).toBe('registrar')
    expect(toque({ habito: dosAlDia, registros: [primero, segundo], ahora, ajustes })).toEqual({
      tipo: 'deshacer',
      registroId: segundo.id,
    })
  })

  it('en un hábito semanal, se registra una vez por día aunque la semana ya esté cumplida', () => {
    const semanal: Habito = { ...leer, frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'semana' } }
    const lunes = registro('leer', '2026-03-09')
    const miercoles = registro('leer', '2026-03-11')
    const ahora = local(2026, 3, 11, 22)
    expect(toque({ habito: semanal, registros: [lunes], ahora, ajustes }).tipo).toBe('registrar')
    expect(toque({ habito: semanal, registros: [lunes, miercoles], ahora, ajustes })).toEqual({
      tipo: 'deshacer',
      registroId: miercoles.id,
    })
  })
})
