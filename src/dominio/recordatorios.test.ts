import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, avisosDeHoy, nuevoHabito, recordatoriosIcs, type FraseIntencion, type Habito, type Identidad, type Intencion, type Registro } from '.'

const ajustes = AJUSTES_POR_DEFECTO
const ahora = new Date(Date.UTC(2026, 2, 15, 8, 5, 9))

let orden = 0
const habito = (id: string, intencion?: Intencion, extra: Partial<Habito> = {}): Habito => ({
  ...nuevoHabito({ nombre: id, identidadId: 'general', orden: orden++, intencion }, new Date(2026, 2, 10, 9), ajustes),
  id,
  creadoEn: '2026-03-10T08:00:00.000Z',
  ...extra,
})

// Traducción de juguete: la UI pasa la suya (i18n) para que el núcleo no dependa del idioma.
const texto = ({ cuando, donde, que }: FraseIntencion) =>
  [cuando && ('hora' in cuando ? `a las ${cuando.hora}` : 'despuesDe' in cuando ? `después de ${cuando.despuesDe}` : cuando.despuesDeAccion), donde && `en ${donde}`, que]
    .filter(Boolean)
    .join(', ')

const ics = (habitos: Habito[], a = ajustes) => recordatoriosIcs({ habitos, ahora, ajustes: a, texto }).ics

/** Lector mínimo de iCalendar (RFC 5545) para comprobar el fichero desde fuera. */
function leer(fichero: string) {
  expect(fichero.endsWith('\r\n')).toBe(true)
  const fisicas = fichero.slice(0, -2).split('\r\n')
  for (const l of fisicas) {
    expect(l).not.toMatch(/[\r\n]/)
    expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
  }
  // Desplegar: una línea que empieza por espacio continúa la anterior.
  const lineas = fisicas.reduce<string[]>((ls, l) => (l.startsWith(' ') ? [...ls.slice(0, -1), ls.at(-1) + l.slice(1)] : [...ls, l]), [])
  interface Componente {
    tipo: string
    props: [string, string][]
    hijos: Componente[]
  }
  const raiz: Componente = { tipo: 'RAIZ', props: [], hijos: [] }
  const pila: Componente[] = [raiz]
  for (const l of lineas) {
    const i = l.indexOf(':')
    const [nombre, valor] = [l.slice(0, i), l.slice(i + 1)]
    if (nombre === 'BEGIN') {
      const c: Componente = { tipo: valor, props: [], hijos: [] }
      pila.at(-1)!.hijos.push(c)
      pila.push(c)
    } else if (nombre === 'END') expect(pila.pop()!.tipo).toBe(valor)
    else pila.at(-1)!.props.push([nombre, valor])
  }
  expect(pila).toHaveLength(1)
  expect(raiz.hijos).toHaveLength(1)
  const prop = (c: Componente, n: string) => c.props.find(([k]) => k === n)?.[1]
  const desescapar = (v = '') => v.replace(/\\([\\;,nN])/g, (_, c: string) => (c.toLowerCase() === 'n' ? '\n' : c))
  const cal = raiz.hijos[0]
  expect(cal.tipo).toBe('VCALENDAR')
  expect(prop(cal, 'VERSION')).toBe('2.0')
  expect(prop(cal, 'PRODID')).toBeTruthy()
  return {
    eventos: cal.hijos.map((e) => {
      expect(e.tipo).toBe('VEVENT')
      expect(prop(e, 'UID')).toBeTruthy()
      expect(prop(e, 'DTSTAMP')).toMatch(/^\d{8}T\d{6}Z$/)
      const alarmas = e.hijos.map((a) => ({ tipo: a.tipo, action: prop(a, 'ACTION'), trigger: prop(a, 'TRIGGER'), description: desescapar(prop(a, 'DESCRIPTION')) }))
      return {
        uid: prop(e, 'UID'),
        dtstamp: prop(e, 'DTSTAMP'),
        dtstart: prop(e, 'DTSTART'),
        rrule: prop(e, 'RRULE'),
        summary: desescapar(prop(e, 'SUMMARY')),
        description: prop(e, 'DESCRIPTION') === undefined ? undefined : desescapar(prop(e, 'DESCRIPTION')),
        alarmas,
      }
    }),
  }
}

describe('recordatorios en .ics', () => {
  it('un hábito diario con hora: un evento que se repite cada día a esa hora, con alarma y la frase como título', () => {
    const { eventos } = leer(ics([habito('meditar', { cuando: { hora: '07:30' }, donde: 'el salón' })]))
    expect(eventos).toEqual([
      {
        uid: 'meditar@pepita',
        dtstamp: '20260315T080509Z',
        dtstart: '20260310T073000',
        rrule: 'FREQ=DAILY',
        summary: 'a las 07:30, en el salón, meditar',
        description: undefined,
        alarmas: [{ tipo: 'VALARM', action: 'DISPLAY', trigger: 'PT0S', description: 'a las 07:30, en el salón, meditar' }],
      },
    ])
  })

  it('días concretos: se repite semanalmente esos días, empezando el primero de ellos desde el inicio', () => {
    // Inicio el martes 10 de marzo; toca lunes, miércoles y viernes → primera vez el miércoles 11.
    const pesas = habito('pesas', { cuando: { hora: '18:00' } }, { frecuencia: { tipo: 'dias_semana', dias: [5, 1, 3] } })
    const [evento] = leer(ics([pesas])).eventos
    expect(evento.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(evento.dtstart).toBe('20260311T180000')
  })

  it('veces por semana o por mes: aviso diario', () => {
    const correr = habito('correr', { cuando: { hora: '19:00' } }, { frecuencia: { tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' } })
    expect(leer(ics([correr])).eventos[0].rrule).toBe('FREQ=DAILY')
  })

  it('los anclados no tienen evento propio: van en cadena en la descripción de su ancla', () => {
    const habitos = [
      habito('estirar', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('meditar', { cuando: { hora: '07:30' } }),
      habito('leer', { cuando: { despuesDeHabitoId: 'estirar' } }),
      habito('agua', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('viejo', { cuando: { despuesDeHabitoId: 'meditar' } }, { archivado: true }),
    ]
    const { eventos } = leer(ics(habitos))
    expect(eventos.map((e) => e.uid)).toEqual(['meditar@pepita'])
    expect(eventos[0].description).toBe('después de meditar, estirar\ndespués de estirar, leer\ndespués de meditar, agua')
  })

  it('sin aviso: sin hora, archivados, hábitos a evitar y anclados a un ancla perdida', () => {
    const habitos = [
      habito('libre'),
      habito('cafe', { cuando: { despuesDeAccion: 'servirme el café' } }),
      habito('soloDonde', { donde: 'la cocina' }),
      habito('archivado', { cuando: { hora: '08:00' } }, { archivado: true }),
      habito('huerfano', { cuando: { despuesDeHabitoId: 'archivado' } }),
      habito('fumar', { cuando: { hora: '10:00' } }, { tipo: 'evitar' }),
      habito('anclaAEvitar', { cuando: { despuesDeHabitoId: 'fumar' } }),
      habito('cena', { cuando: { hora: '21:00' } }),
      habito('picar', { cuando: { despuesDeHabitoId: 'cena' } }, { tipo: 'evitar' }),
    ]
    const { eventos } = leer(ics(habitos))
    expect(eventos.map((e) => e.uid)).toEqual(['cena@pepita'])
    expect(eventos[0].description).toBeUndefined()
  })

  it('sin hábitos con hora: un calendario válido y vacío', () => {
    expect(leer(ics([habito('libre')])).eventos).toEqual([])
  })

  it('dice cuántos avisos lleva (la interfaz avisa si no hay ninguno)', () => {
    const contar = (habitos: Habito[]) => recordatoriosIcs({ habitos, ahora, ajustes, texto }).eventos
    expect(contar([habito('libre')])).toBe(0)
    expect(contar([habito('meditar', { cuando: { hora: '07:30' } }), habito('cena', { cuando: { hora: '21:00' } })])).toBe(2)
  })

  it('textos largos, con tildes, emojis y signos reservados: se pliegan a 75 octetos y se escapan sin perder nada', () => {
    const nombre = 'Leer «Hábitos atómicos»; capítulo 3, notas\\resumen 📚🌱 — '.repeat(4).trim()
    const largo = habito('largo', { cuando: { hora: '22:15' }, donde: 'el sofá,\ncon té' }, { nombre })
    const { eventos } = leer(ics([largo]))
    expect(eventos[0].summary).toBe(`a las 22:15, en el sofá,\ncon té, ${nombre}`)
    expect(eventos[0].alarmas[0].description).toBe(eventos[0].summary)
  })

  it('una hora antes del cierre del día cae en el día natural siguiente: los días de la semana se corren con ella', () => {
    // Cierre a las 04:00: «lunes a la 01:00» es la madrugada del martes. Inicio el martes 10 → primer lunes lógico el 16.
    const tarde = habito('tarde', { cuando: { hora: '01:00' } }, { frecuencia: { tipo: 'dias_semana', dias: [1, 7] } })
    const [evento] = leer(ics([tarde])).eventos
    expect(evento.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,TU')
    expect(evento.dtstart).toBe('20260316T010000')
    // Con cierre a las 00:30, la 01:00 ya es del mismo día: no se corre nada.
    expect(leer(ics([tarde], { ...ajustes, horaCierre: '00:30' })).eventos[0]).toMatchObject({ rrule: 'FREQ=WEEKLY;BYDAY=MO,SU', dtstart: '20260315T010000' })
  })
})

describe('avisos de hoy (notificaciones con la app abierta)', () => {
  const general: Identidad = { id: 'general', creadoEn: '2026-03-01T10:00:00.000Z', nombre: '', esGeneral: true, archivada: false, orden: 0 }
  const registro = (habitoId: string, tipo: Registro['tipo'] = 'minima'): Registro => ({ id: `r-${habitoId}`, creadoEn: '2026-03-15T08:00:00.000Z', habitoId, dia: '2026-03-15', tipo })

  it('a las horas que quedan de hoy, solo lo pendiente que toca hoy, con sus anclados pendientes', () => {
    // Domingo 15 de marzo a las 09:00, cierre a las 04:00.
    const habitos = [
      habito('meditar', { cuando: { hora: '07:30' } }), // ya pasó
      habito('correr', { cuando: { hora: '19:00' } }),
      habito('estirar', { cuando: { despuesDeHabitoId: 'correr' } }),
      habito('ducha', { cuando: { despuesDeHabitoId: 'estirar' } }), // hecho: no se recuerda
      habito('leer', { cuando: { hora: '21:00' } }), // hecho
      habito('pesas', { cuando: { hora: '18:00' } }, { frecuencia: { tipo: 'dias_semana', dias: [1] } }), // hoy no toca
      habito('fumar', { cuando: { hora: '10:00' } }, { tipo: 'evitar' }),
      habito('saltado', { cuando: { hora: '12:00' } }),
      habito('pausado', { cuando: { hora: '12:00' } }, { pausas: [{ desde: '2026-03-14', hasta: '2026-03-20' }] }),
      habito('trasnoche', { cuando: { hora: '01:00' } }), // aún es hoy: la madrugada del lunes
    ]
    const registros = [registro('ducha'), registro('leer'), registro('saltado', 'salto')]
    const avisos = avisosDeHoy({ habitos, identidades: [general], registros, ahora: new Date(2026, 2, 15, 9), ajustes })
    expect(avisos.map((a) => ({ id: a.habito.id, instante: a.instante, titulo: texto(a.frase), anclados: a.anclados.map(texto) }))).toEqual([
      { id: 'correr', instante: new Date(2026, 2, 15, 19), titulo: 'a las 19:00, correr', anclados: ['después de correr, estirar'] },
      { id: 'trasnoche', instante: new Date(2026, 2, 16, 1), titulo: 'a las 01:00, trasnoche', anclados: [] },
    ])
  })
})
