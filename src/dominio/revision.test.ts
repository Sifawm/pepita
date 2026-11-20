import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, notaSemanal, revision, sumarDias, type AnotacionDeFallo, type Diagnostico, type Habito, type Identidad, type Registro } from '.'

const ajustes = AJUSTES_POR_DEFECTO
// Lunes 16 a domingo 22 de noviembre de 2026; «ahora» es el jueves 19.
const ahora = new Date(2026, 10, 19, 12)

const identidad = (id: string, orden: number, extra: Partial<Identidad> = {}): Identidad => ({
  id,
  creadoEn: '2026-11-01T10:00:00.000Z',
  nombre: id,
  esGeneral: false,
  archivada: false,
  orden,
  ...extra,
})
const general = identidad('general', 0, { nombre: '', esGeneral: true })

const habito = (id: string, identidadId: string, extra: Partial<Habito> = {}): Habito => ({
  id,
  creadoEn: '2026-11-01T08:00:00.000Z',
  identidadId,
  nombre: id,
  tipo: 'si_no',
  frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
  versionMinima: 'Un poco',
  intencion: { cuando: { hora: '08:00' } },
  entorno: ['Todo listo'],
  recompensaAsociada: 'Un té',
  fechaInicio: '2026-11-01',
  archivado: false,
  orden: 0,
  ...extra,
})
const registro = (habitoId: string, dia: string, extra: Partial<Registro> = {}): Registro => ({
  id: `${habitoId}-${dia}`,
  creadoEn: `${dia}T10:00:00.000Z`,
  habitoId,
  dia,
  tipo: 'minima',
  ...extra,
})

const sinMas = { diagnosticos: [], sugerenciasDescartadas: [], revisionesSemanales: [], anotacionesDeFallo: [], ahora, ajustes }

describe('votos de la semana', () => {
  it('suma por identidad solo los votos de lunes a domingo de la semana pedida', () => {
    const lectora = identidad('lectora', 1)
    const r = revision({
      ...sinMas,
      desde: '2026-11-19',
      identidades: [lectora, general],
      habitos: [habito('leer', 'lectora'), habito('correr', 'general')],
      registros: [
        registro('leer', '2026-11-15'), // domingo anterior: fuera
        registro('leer', '2026-11-16'),
        registro('leer', '2026-11-18'),
        registro('correr', '2026-11-22'), // domingo: dentro
        registro('correr', '2026-11-23'), // lunes siguiente: fuera
      ],
    })
    expect(r.desde).toBe('2026-11-16')
    expect(r.hasta).toBe('2026-11-22')
    expect(r.votos.map((v) => [v.identidad.id, v.votos])).toEqual([
      ['general', 1],
      ['lectora', 2],
    ])
  })

  it('para imprimir abarca semanas enteras, y una identidad archivada solo sale si sumó', () => {
    const r = revision({
      ...sinMas,
      desde: '2026-11-04',
      hasta: '2026-11-17',
      identidades: [general, identidad('antes', 1, { archivada: true }), identidad('nada', 2, { archivada: true })],
      habitos: [habito('leer', 'general'), habito('viejo', 'antes', { archivado: true })],
      registros: [registro('leer', '2026-11-01'), registro('leer', '2026-11-02'), registro('viejo', '2026-11-10'), registro('leer', '2026-11-22'), registro('leer', '2026-11-23')],
    })
    expect([r.desde, r.hasta]).toEqual(['2026-11-02', '2026-11-22'])
    expect(r.votos.map((v) => [v.identidad.id, v.votos])).toEqual([
      ['general', 2],
      ['antes', 1],
    ])
  })
})

describe('nota libre', () => {
  it('trae las notas de las semanas del periodo, de la más antigua a la más reciente', () => {
    const nota = (semana: string) => ({ id: semana, creadoEn: `${semana}T20:00:00.000Z`, semana, nota: `Semana ${semana}` })
    const r = revision({
      ...sinMas,
      desde: '2026-11-10',
      hasta: '2026-11-17',
      identidades: [general],
      habitos: [],
      registros: [],
      revisionesSemanales: [nota('2026-11-23'), nota('2026-11-16'), nota('2026-11-02'), nota('2026-11-09')],
    })
    expect(r.notas.map((n) => n.semana)).toEqual(['2026-11-09', '2026-11-16'])
  })
})

describe('lo que necesita atención', () => {
  /** Un registro cada día del `desde` al `hasta`, salvo los de `menos`. */
  const cadaDia = (habitoId: string, desde: string, hasta: string, menos: string[] = []) => {
    const rs: Registro[] = []
    for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) if (!menos.includes(dia)) rs.push(registro(habitoId, dia))
    return rs
  }
  const diagnostico = (id: string, habitoId: string, extra: Partial<Diagnostico>): Diagnostico => ({
    id,
    creadoEn: '2026-11-10T10:00:00.000Z',
    habitoId,
    periodoQueLoDisparo: '2026-11-09',
    estado: 'pendiente',
    ...extra,
  })

  it('reúne los hábitos en recuperación, los diagnósticos sin responder y las sugerencias de escalado', () => {
    const habitos = [
      habito('leer', 'general'),
      habito('correr', 'general', { orden: 1 }),
      habito('meditar', 'general', { orden: 2 }),
      habito('viejo', 'general', { archivado: true }),
    ]
    const r = revision({
      ...sinMas,
      desde: '2026-11-19',
      identidades: [general],
      habitos,
      // «leer» falló ayer; «viejo» también, pero está archivado.
      registros: [...cadaDia('leer', '2026-11-01', '2026-11-17'), ...cadaDia('correr', '2026-11-01', '2026-11-18'), ...cadaDia('meditar', '2026-11-01', '2026-11-18'), ...cadaDia('viejo', '2026-11-01', '2026-11-17')],
      diagnosticos: [
        diagnostico('d1', 'correr', { estado: 'pospuesto' }),
        diagnostico('d2', 'meditar', { estado: 'respondido', ley: 3 }),
        diagnostico('d3', 'leer', { periodoQueLoDisparo: '2026-11-05', estado: 'descartado' }),
        diagnostico('d4', 'leer', { periodoQueLoDisparo: '2026-11-06' }),
        diagnostico('d5', 'viejo', {}),
      ],
    })
    expect(r.enRecuperacion.map((h) => h.id)).toEqual(['leer'])
    expect(r.diagnosticos.map((d) => [d.habito.id, d.diagnostico.id])).toEqual([
      ['leer', 'd4'],
      ['correr', 'd1'],
    ])
    expect(r.sugerencias.map((s) => [s.habito.id, s.sugerencia.tipo])).toEqual([['meditar', 'bajar']])
  })
})

describe('campos del método vacíos', () => {
  it('recuerda en cada hábito activo solo los campos que tienen sentido para su tipo', () => {
    const lectora = identidad('lectora', 1)
    const vacio = { versionMinima: undefined, intencion: undefined, entorno: undefined, recompensaAsociada: undefined }
    const objetivo = { unidad: 'páginas', objetivo: 10 }
    const r = revision({
      ...sinMas,
      desde: '2026-11-19',
      identidades: [general, lectora],
      registros: [],
      habitos: [
        habito('completo', 'lectora'),
        habito('suelto', 'general', { ...vacio, orden: 1 }),
        habito('paginas', 'lectora', { tipo: 'cuantitativo', cuantitativo: { ...objetivo, modo: 'al_menos' }, versionMinima: undefined, orden: 2 }),
        habito('cafes', 'lectora', { tipo: 'cuantitativo', cuantitativo: { ...objetivo, modo: 'como_mucho' }, versionMinima: undefined, orden: 3 }),
        habito('redes', 'lectora', { tipo: 'evitar', ...vacio, orden: 4 }),
        habito('tele', 'general', { tipo: 'evitar', ...vacio, orden: 5 }),
        habito('viejo', 'general', { ...vacio, archivado: true }),
      ],
    })
    expect(r.camposVacios.map((c) => [c.habito.id, c.campos])).toEqual([
      ['suelto', ['identidad', 'versionMinima', 'intencion', 'entorno', 'recompensa']],
      ['paginas', ['versionMinima']],
      ['tele', ['identidad']],
    ])
  })
})

describe('motivos de los fallos anotados', () => {
  const anotacion = (id: string, habitoId: string, periodo: string, extra: Partial<AnotacionDeFallo> = {}): AnotacionDeFallo => ({
    id,
    creadoEn: `${periodo}T22:00:00.000Z`,
    habitoId,
    periodo,
    ...extra,
  })

  it('reúne los de los periodos de la semana, en orden, con su hábito (también si está archivado)', () => {
    const leer = habito('leer', 'general')
    const viejo = habito('viejo', 'general', { archivado: true, orden: 1 })
    const r = revision({
      ...sinMas,
      desde: '2026-11-19',
      identidades: [general],
      habitos: [leer, viejo],
      registros: [],
      anotacionesDeFallo: [
        anotacion('a', 'leer', '2026-11-18', { nota: 'Muy cansada' }),
        anotacion('b', 'viejo', '2026-11-16', { ley: 3 }),
        anotacion('c', 'leer', '2026-11-15', { ley: 1 }), // domingo anterior: fuera
      ],
    })
    expect(r.fallos.map((f) => [f.habito.id, f.anotacion.id])).toEqual([
      ['viejo', 'b'],
      ['leer', 'a'],
    ])
  })
})

describe('nota libre de la semana', () => {
  it('se guarda recortada y en el lunes de su semana', () => {
    expect(notaSemanal('2026-11-19', '  Buena semana \n')).toEqual({ semana: '2026-11-16', nota: 'Buena semana' })
  })

  it('sin texto no hay nota (la persistencia la borra)', () => {
    expect(notaSemanal('2026-11-16', '   ')).toBeUndefined()
  })
})
