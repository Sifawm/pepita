import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, exportar, importar, necesitaCopia, registrosCsv, type Datos } from '.'

const ahora = new Date('2026-05-10T18:30:00.000Z')

const datos: Datos = {
  ajustes: { ...AJUSTES_POR_DEFECTO, horaCierre: '03:00', notificaciones: true, pausaGlobal: { desde: '2026-05-08', hasta: '2026-05-15' } },
  identidades: [
    { id: 'g', creadoEn: '2026-05-01T08:00:00.000Z', nombre: '', esGeneral: true, archivada: false, orden: 0 },
    { id: 'lectora', creadoEn: '2026-05-01T08:01:00.000Z', nombre: 'Soy lectora', esGeneral: false, archivada: true, orden: 1 },
  ],
  habitos: [
    {
      id: 'leer',
      creadoEn: '2026-05-01T08:02:00.000Z',
      identidadId: 'lectora',
      nombre: 'Leer una página, «con calma»',
      tipo: 'si_no',
      frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
      versionMinima: 'Abrir el libro',
      versionCompleta: 'Leer 30 minutos',
      // Una variante de «cuándo» en cada hábito.
      intencion: { cuando: { despuesDeHabitoId: 'correr' }, donde: 'el sofá' },
      entorno: ['Dejar el libro en la almohada', 'Gafas a mano'],
      recompensaAsociada: 'Un té mientras leo',
      fechaInicio: '2026-05-01',
      archivado: false,
      orden: 0,
    },
    // Una variante de cada tipo: TypeScript no avisa si un validador se queda más estrecho que el tipo.
    {
      id: 'correr',
      creadoEn: '2026-05-01T08:03:00.000Z',
      identidadId: 'g',
      nombre: 'Correr',
      tipo: 'si_no',
      frecuencia: { tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' },
      intencion: { cuando: { hora: '07:30' } },
      fechaInicio: '2026-05-04',
      archivado: false,
      orden: 1,
      pausas: [
        { desde: '2026-05-05', hasta: '2026-05-05' },
        { desde: '2026-06-01', hasta: '2026-06-30' },
      ],
      // Historial de reglas: fue diario, luego días concretos, y ahora 3 por semana.
      versiones: [
        { hasta: '2026-05-05', frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' } },
        { hasta: '2026-05-10', frecuencia: { tipo: 'dias_semana', dias: [1, 3, 5] } },
      ],
    },
    {
      id: 'yoga',
      creadoEn: '2026-05-01T08:04:00.000Z',
      identidadId: 'g',
      nombre: 'Yoga',
      tipo: 'si_no',
      frecuencia: { tipo: 'dias_semana', dias: [2, 4] },
      intencion: { cuando: { despuesDeAccion: 'despertarme' } },
      fechaInicio: '2026-05-01',
      archivado: true,
      orden: 2,
    },
    {
      id: 'redes',
      creadoEn: '2026-05-01T08:05:00.000Z',
      identidadId: 'g',
      nombre: 'Redes sociales',
      tipo: 'evitar',
      frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
      leyesInversas: { senal: 'Móvil fuera del cuarto', friccion: 'Cerrar sesión', sustituto: 'Leer' },
      fechaInicio: '2026-05-01',
      archivado: false,
      orden: 3,
    },
  ],
  registros: [
    { id: 'r1', creadoEn: '2026-05-02T20:00:00.000Z', habitoId: 'leer', dia: '2026-05-02', tipo: 'minima' },
    { id: 'r2', creadoEn: '2026-05-03T20:00:00.000Z', habitoId: 'leer', dia: '2026-05-03', tipo: 'completa', nota: 'un capítulo' },
    { id: 'r3', creadoEn: '2026-05-04T20:00:00.000Z', habitoId: 'leer', dia: '2026-05-04', tipo: 'salto', motivo: 'Viaje' },
    { id: 'r4', creadoEn: '2026-05-05T22:00:00.000Z', habitoId: 'redes', dia: '2026-05-05', tipo: 'recaida', disparador: 'Aburrimiento' },
    { id: 'r5', creadoEn: '2026-05-06T22:00:00.000Z', habitoId: 'redes', dia: '2026-05-06', tipo: 'recaida' },
  ],
  anotacionesDeFallo: [
    { id: 'a1', creadoEn: '2026-05-06T09:00:00.000Z', habitoId: 'leer', periodo: '2026-05-05', ley: 3, nota: 'Estaba agotada' },
    { id: 'a2', creadoEn: '2026-05-07T09:00:00.000Z', habitoId: 'correr', periodo: '2026-05-04', ley: 1 },
    { id: 'a3', creadoEn: '2026-05-08T09:00:00.000Z', habitoId: 'leer', periodo: '2026-05-06', nota: 'Ni idea' },
  ],
  hitosCelebrados: [
    { id: 'h1', creadoEn: '2026-05-09T20:00:00.000Z', identidadId: 'lectora', umbral: 10 },
    { id: 'h2', creadoEn: '2026-05-10T20:00:00.000Z', identidadId: 'g', umbral: 1000 },
  ],
}

describe('exportar', () => {
  it('firma la copia como de Pepita, con versión de esquema y fecha de exportación', () => {
    const copia = JSON.parse(exportar(datos, ahora))
    expect(copia).toMatchObject({ app: 'pepita', versionEsquema: 1, exportadoEn: '2026-05-10T18:30:00.000Z' })
  })

  it('exportar y reimportar devuelve los mismos datos, con la copia anotada como última', () => {
    const resultado = importar(exportar(datos, ahora))
    expect(resultado).toEqual({
      ok: true,
      datos: { ...datos, ajustes: { ...datos.ajustes, ultimaCopia: '2026-05-10T18:30:00.000Z' } },
    })
  })
})

describe('importar rechaza un fichero inválido sin devolver datos', () => {
  const valida = () => JSON.parse(exportar(datos, ahora))
  const con = (cambiar: (c: ReturnType<typeof valida>) => void) => {
    const c = valida()
    cambiar(c)
    return JSON.stringify(c)
  }

  it.each([
    ['un fichero que no es JSON', '{"app": "pepita",', { motivo: 'no_es_json' }],
    ['JSON que no es un objeto', '[1, 2]', { motivo: 'no_es_pepita' }],
    ['una copia de otra app', con((c) => (c.app = 'loop')), { motivo: 'no_es_pepita' }],
    ['una copia de una versión más nueva', con((c) => (c.versionEsquema = 2)), { motivo: 'version_nueva' }],
    ['una versión imposible', con((c) => (c.versionEsquema = 0)), { motivo: 'invalido', ruta: 'versionEsquema' }],
    ['una tabla que falta', con((c) => delete c.datos.registros), { motivo: 'invalido', ruta: 'datos.registros' }],
    ['un campo desconocido', con((c) => (c.datos.habitos[0].hackeo = true)), { motivo: 'invalido', ruta: 'datos.habitos[0].hackeo' }],
    ['un campo con tipo equivocado', con((c) => (c.datos.habitos[0].orden = '1')), { motivo: 'invalido', ruta: 'datos.habitos[0].orden' }],
    ['un tipo de registro desconocido', con((c) => (c.datos.registros[1].tipo = 'mucho')), { motivo: 'invalido', ruta: 'datos.registros[1].tipo' }],
    ['una frecuencia desconocida', con((c) => (c.datos.habitos[0].frecuencia.tipo = 'a_veces')), { motivo: 'invalido', ruta: 'datos.habitos[0].frecuencia.tipo' }],
    ['un día de la semana imposible', con((c) => (c.datos.habitos[2].frecuencia.dias = [8])), { motivo: 'invalido', ruta: 'datos.habitos[2].frecuencia.dias[0]' }],
    ['un día imposible', con((c) => (c.datos.registros[0].dia = '2026-02-30')), { motivo: 'invalido', ruta: 'datos.registros[0].dia' }],
    ['una hora de cierre mal escrita', con((c) => (c.datos.ajustes.horaCierre = '25:00')), { motivo: 'invalido', ruta: 'datos.ajustes.horaCierre' }],
    ['un instante que no es ISO', con((c) => (c.exportadoEn = 'ayer')), { motivo: 'invalido', ruta: 'exportadoEn' }],
    ['una versión mínima que no es texto', con((c) => (c.datos.habitos[0].versionMinima = 2)), { motivo: 'invalido', ruta: 'datos.habitos[0].versionMinima' }],
    ['un null donde no cabe', con((c) => (c.datos.registros[0].nota = null)), { motivo: 'invalido', ruta: 'datos.registros[0].nota' }],
    ['ids repetidos', con((c) => (c.datos.registros[1].id = 'r1')), { motivo: 'invalido', ruta: 'datos.registros[1].id' }],
    ['un registro de un hábito que no existe', con((c) => (c.datos.registros[0].habitoId = 'nadie')), { motivo: 'invalido', ruta: 'datos.registros[0].habitoId' }],
    ['un hábito de una identidad que no existe', con((c) => (c.datos.habitos[0].identidadId = 'nadie')), { motivo: 'invalido', ruta: 'datos.habitos[0].identidadId' }],
    ['una pausa que acaba antes de empezar', con((c) => (c.datos.habitos[1].pausas[0].desde = '2026-05-06')), { motivo: 'invalido', ruta: 'datos.habitos[1].pausas[0]' }],
    ['una pausa global con un día imposible', con((c) => (c.datos.ajustes.pausaGlobal.hasta = '2026-13-01')), { motivo: 'invalido', ruta: 'datos.ajustes.pausaGlobal.hasta' }],
    ['un motivo en un registro que no es un salto', con((c) => (c.datos.registros[0].motivo = 'porque sí')), { motivo: 'invalido', ruta: 'datos.registros[0].motivo' }],
    ['una versión de regla mal formada', con((c) => (c.datos.habitos[1].versiones[0].frecuencia.veces = 0)), { motivo: 'invalido', ruta: 'datos.habitos[1].versiones[0].frecuencia.veces' }],
    ['versiones de regla desordenadas', con((c) => (c.datos.habitos[1].versiones[1].hasta = '2026-05-05')), { motivo: 'invalido', ruta: 'datos.habitos[1].versiones[1].hasta' }],
    ['una ley que no es de 1 a 4', con((c) => (c.datos.anotacionesDeFallo[0].ley = 5)), { motivo: 'invalido', ruta: 'datos.anotacionesDeFallo[0].ley' }],
    ['una anotación de un hábito que no existe', con((c) => (c.datos.anotacionesDeFallo[1].habitoId = 'nadie')), { motivo: 'invalido', ruta: 'datos.anotacionesDeFallo[1].habitoId' }],
    ['dos anotaciones del mismo fallo', con((c) => (c.datos.anotacionesDeFallo[2].periodo = '2026-05-05')), { motivo: 'invalido', ruta: 'datos.anotacionesDeFallo[2].periodo' }],
    ['un disparador en un registro que no es una recaída', con((c) => (c.datos.registros[0].disparador = 'el sofá')), { motivo: 'invalido', ruta: 'datos.registros[0].disparador' }],
    ['leyes inversas en un hábito que no es a evitar', con((c) => (c.datos.habitos[0].leyesInversas = { senal: 'x' })), { motivo: 'invalido', ruta: 'datos.habitos[0].leyesInversas' }],
    ['una ley inversa desconocida', con((c) => (c.datos.habitos[3].leyesInversas.premio = 'x')), { motivo: 'invalido', ruta: 'datos.habitos[3].leyesInversas.premio' }],
    ['un tipo de hábito desconocido', con((c) => (c.datos.habitos[0].tipo = 'quizas')), { motivo: 'invalido', ruta: 'datos.habitos[0].tipo' }],
    ['un cuándo con dos disparadores', con((c) => (c.datos.habitos[1].intencion.cuando.despuesDeAccion = 'cenar')), { motivo: 'invalido', ruta: 'datos.habitos[1].intencion.cuando.despuesDeAccion' }],
    ['un cuándo desconocido', con((c) => (c.datos.habitos[1].intencion.cuando = { alAmanecer: true })), { motivo: 'invalido', ruta: 'datos.habitos[1].intencion.cuando.alAmanecer' }],
    ['una hora de intención imposible', con((c) => (c.datos.habitos[1].intencion.cuando.hora = '7:30')), { motivo: 'invalido', ruta: 'datos.habitos[1].intencion.cuando.hora' }],
    ['un entorno que no es una lista de textos', con((c) => (c.datos.habitos[0].entorno = [1])), { motivo: 'invalido', ruta: 'datos.habitos[0].entorno[0]' }],
    ['un hito que no es un umbral de Pepita', con((c) => (c.datos.hitosCelebrados[0].umbral = 11)), { motivo: 'invalido', ruta: 'datos.hitosCelebrados[0].umbral' }],
    ['un hito de una identidad que no existe', con((c) => (c.datos.hitosCelebrados[1].identidadId = 'nadie')), { motivo: 'invalido', ruta: 'datos.hitosCelebrados[1].identidadId' }],
    ['el mismo hito celebrado dos veces', con((c) => (c.datos.hitosCelebrados[1].identidadId = 'lectora', c.datos.hitosCelebrados[1].umbral = 10)), { motivo: 'invalido', ruta: 'datos.hitosCelebrados[1].umbral' }],
    ['sin identidad «General»', con((c) => (c.datos.identidades[0].esGeneral = false)), { motivo: 'invalido', ruta: 'datos.identidades' }],
  ])('%s', (_caso, contenido, error) => {
    expect(importar(contenido)).toEqual({ ok: false, error })
  })
})

describe('necesitaCopia', () => {
  const { registros } = datos // el primero se creó el 2 de mayo a las 20:00 UTC
  const ajustes = AJUSTES_POR_DEFECTO

  it('no avisa si aún no hay nada que perder', () => {
    expect(necesitaCopia({ ajustes, registros: [], ahora: new Date('2026-09-01T12:00:00Z') })).toBe(false)
  })

  it('sin ninguna copia, avisa cuando el primer registro tiene más de 7 días', () => {
    expect(necesitaCopia({ ajustes, registros, ahora: new Date('2026-05-09T19:59:00Z') })).toBe(false)
    expect(necesitaCopia({ ajustes, registros, ahora: new Date('2026-05-09T20:01:00Z') })).toBe(true)
  })

  it('cuenta los 7 días desde la última copia', () => {
    const conCopia = { ...ajustes, ultimaCopia: '2026-06-01T10:00:00.000Z' }
    expect(necesitaCopia({ ajustes: conCopia, registros, ahora: new Date('2026-06-08T09:00:00Z') })).toBe(false)
    expect(necesitaCopia({ ajustes: conCopia, registros, ahora: new Date('2026-06-08T11:00:00Z') })).toBe(true)
  })
})

describe('registrosCsv', () => {
  it('da una fila por registro, por día, con el nombre del hábito y comillas donde hacen falta', () => {
    const registros = [
      ...datos.registros,
      { id: 'r0', creadoEn: '2026-05-01T21:00:00.000Z', habitoId: 'leer', dia: '2026-05-01', tipo: 'minima' as const, nota: 'dijo "basta"\nvale' },
    ]
    expect(registrosCsv({ habitos: datos.habitos, registros })).toBe(
      [
        'dia,habitoId,habito,tipo,nota,motivo,disparador,creadoEn',
        '2026-05-01,leer,"Leer una página, «con calma»",minima,"dijo ""basta""\nvale",,,2026-05-01T21:00:00.000Z',
        '2026-05-02,leer,"Leer una página, «con calma»",minima,,,,2026-05-02T20:00:00.000Z',
        '2026-05-03,leer,"Leer una página, «con calma»",completa,un capítulo,,,2026-05-03T20:00:00.000Z',
        '2026-05-04,leer,"Leer una página, «con calma»",salto,,Viaje,,2026-05-04T20:00:00.000Z',
        '2026-05-05,redes,Redes sociales,recaida,,,Aburrimiento,2026-05-05T22:00:00.000Z',
        '2026-05-06,redes,Redes sociales,recaida,,,,2026-05-06T22:00:00.000Z',
        '',
      ].join('\r\n'),
    )
  })
})
