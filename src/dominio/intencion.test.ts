import { describe, expect, it } from 'vitest'
import {
  AJUSTES_POR_DEFECTO,
  anclasPosibles,
  componerHoy,
  editarHabito,
  fraseIntencion,
  nuevoHabito,
  type Habito,
  type Identidad,
  type Intencion,
  type Registro,
} from '.'

const ajustes = AJUSTES_POR_DEFECTO
const ahora = new Date(2026, 2, 15, 9)
const general: Identidad = { id: 'general', creadoEn: '2026-03-01T10:00:00.000Z', nombre: '', esGeneral: true, archivada: false, orden: 0 }

let orden = 0
const habito = (id: string, intencion?: Intencion, extra: Partial<Habito> = {}): Habito => ({
  ...nuevoHabito({ nombre: id, identidadId: 'general', orden: orden++, intencion }, new Date(2026, 2, 10, 9), ajustes),
  id,
  creadoEn: '2026-03-10T08:00:00.000Z',
  ...extra,
})

// Sin registros, todos llevan días fallando: todos en recuperación (un solo grupo). `alDia` hizo ayer el suyo.
const ayer = (habitoId: string): Registro => ({ id: `r-${habitoId}`, creadoEn: '2026-03-14T10:00:00.000Z', habitoId, dia: '2026-03-14', tipo: 'minima' })
const ordenHoy = (habitos: Habito[], alDia: string[] = []) =>
  componerHoy({ habitos, identidades: [general], registros: alDia.map(ayer), ahora, ajustes }).habitos.map((t) => t.habito.id)

describe('orden de Hoy', () => {
  it('por hora, cada anclado justo debajo de su ancla (en cadenas de varios niveles) y al final los que no tienen hora', () => {
    const habitos = [
      habito('sinHora'),
      habito('cafe', { cuando: { despuesDeAccion: 'servirme el café' } }),
      habito('estirar', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('cena', { cuando: { hora: '21:00' } }),
      habito('meditar', { cuando: { hora: '07:30' } }),
      habito('leer', { cuando: { despuesDeHabitoId: 'estirar' } }),
      habito('agua', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('dientes', { cuando: { despuesDeHabitoId: 'cena' } }),
    ]
    expect(ordenHoy(habitos)).toEqual(['meditar', 'estirar', 'leer', 'agua', 'cena', 'dientes', 'sinHora', 'cafe'])
  })

  it('al archivar o borrar un ancla, los que dependían de ella pasan a «sin hora» con su propia cadena', () => {
    const meditar = habito('meditar', { cuando: { hora: '07:30' } })
    const estirar = habito('estirar', { cuando: { despuesDeHabitoId: 'meditar' } })
    const leer = habito('leer', { cuando: { despuesDeHabitoId: 'estirar' } })
    const cena = habito('cena', { cuando: { hora: '21:00' } })
    const libre = habito('libre')
    expect(ordenHoy([meditar, estirar, leer, cena, libre])).toEqual(['meditar', 'estirar', 'leer', 'cena', 'libre'])
    expect(ordenHoy([{ ...meditar, archivado: true }, estirar, leer, cena, libre])).toEqual(['cena', 'estirar', 'leer', 'libre'])
    expect(ordenHoy([estirar, leer, cena, libre])).toEqual(['cena', 'estirar', 'leer', 'libre'])
  })

  it('un anclado cuya ancla no sale hoy ocupa la hora de su ancla', () => {
    const pesas = habito('pesas', { cuando: { hora: '07:00' } }, { frecuencia: { tipo: 'dias_semana', dias: [1] } }) // hoy es domingo
    const batido = habito('batido', { cuando: { despuesDeHabitoId: 'pesas' } })
    const cena = habito('cena', { cuando: { hora: '21:00' } })
    const libre = habito('libre')
    expect(ordenHoy([libre, cena, batido, pesas])).toEqual(['batido', 'cena', 'libre'])
  })

  it('primero los que están en recuperación, cada grupo ordenado por hora con sus cadenas', () => {
    const habitos = [
      habito('cena', { cuando: { hora: '21:00' } }),
      habito('dientes', { cuando: { despuesDeHabitoId: 'cena' } }),
      habito('meditar', { cuando: { hora: '07:30' } }),
      habito('estirar', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('libre'),
    ]
    // En recuperación: cena y estirar. Dientes sigue a su hora (la de cena) entre los demás.
    expect(ordenHoy(habitos, ['dientes', 'meditar', 'libre'])).toEqual(['estirar', 'cena', 'meditar', 'dientes', 'libre'])
  })

  it('un ciclo de anclas (en datos importados) no rompe Hoy: van sin hora', () => {
    const a = habito('a', { cuando: { despuesDeHabitoId: 'b' } })
    const b = habito('b', { cuando: { despuesDeHabitoId: 'a' } })
    const cena = habito('cena', { cuando: { hora: '21:00' } })
    expect(ordenHoy([a, b, cena])).toEqual(['cena', 'a', 'b'])
  })
})

describe('frase de intención', () => {
  const cafe = habito('cafe', undefined, { nombre: 'Servirme el café' })
  const habitos = [cafe]

  it('después de un hábito, dónde y la versión mínima', () => {
    const leer = habito('leer', { cuando: { despuesDeHabitoId: 'cafe' }, donde: 'la cocina' }, { nombre: 'Leer', versionMinima: 'leer 1 página' })
    expect(fraseIntencion(leer, habitos)).toEqual({ cuando: { despuesDe: 'Servirme el café' }, donde: 'la cocina', que: 'leer 1 página' })
  })

  it('a una hora o tras una acción libre; sin versión mínima, el nombre', () => {
    expect(fraseIntencion(habito('leer', { cuando: { hora: '07:30' } }, { nombre: 'Leer' }), habitos)).toEqual({
      cuando: { hora: '07:30' },
      que: 'Leer',
    })
    expect(fraseIntencion(habito('leer', { cuando: { despuesDeAccion: 'cenar' } }, { nombre: 'Leer' }), habitos)).toEqual({
      cuando: { despuesDeAccion: 'cenar' },
      que: 'Leer',
    })
  })

  it('con el ancla archivada o borrada se queda el dónde; sin cuándo ni dónde no hay frase', () => {
    const leer = habito('leer', { cuando: { despuesDeHabitoId: 'cafe' }, donde: 'la cocina' }, { nombre: 'Leer' })
    expect(fraseIntencion(leer, [{ ...cafe, archivado: true }])).toEqual({ donde: 'la cocina', que: 'Leer' })
    expect(fraseIntencion(habito('solo', { cuando: { despuesDeHabitoId: 'nadie' } }), habitos)).toBeUndefined()
    expect(fraseIntencion(habito('nada'), habitos)).toBeUndefined()
  })

  it('va en la tarjeta de Hoy', () => {
    const leer = habito('leer', { cuando: { hora: '07:30' }, donde: 'el sofá' }, { nombre: 'Leer' })
    const [tarjeta] = componerHoy({ habitos: [leer], identidades: [general], registros: [], ahora, ajustes }).habitos
    expect(tarjeta.frase).toEqual({ cuando: { hora: '07:30' }, donde: 'el sofá', que: 'Leer' })
  })
})

describe('anclas posibles', () => {
  it('cualquier hábito activo salvo él mismo y los que ya cuelgan de él (no se cierran ciclos)', () => {
    const habitos = [
      habito('meditar', { cuando: { hora: '07:30' } }),
      habito('estirar', { cuando: { despuesDeHabitoId: 'meditar' } }),
      habito('leer', { cuando: { despuesDeHabitoId: 'estirar' } }),
      habito('cena'),
      habito('viejo', undefined, { archivado: true }),
    ]
    expect(anclasPosibles('estirar', habitos).map((h) => h.id)).toEqual(['meditar', 'cena'])
    expect(anclasPosibles(undefined, habitos).map((h) => h.id)).toEqual(['meditar', 'estirar', 'leer', 'cena'])
  })
})

describe('asistente: intención, entorno y recompensa', () => {
  const base = { nombre: 'Leer', identidadId: 'general', orden: 0 }

  it('guarda los pasos rellenos sin espacios sobrantes', () => {
    const h = nuevoHabito(
      {
        ...base,
        intencion: { cuando: { despuesDeAccion: ' servirme el café ' }, donde: ' la cocina ' },
        entorno: [' dejar el libro en la mesa ', '', 'gafas'],
        recompensaAsociada: ' un té ',
      },
      ahora,
      ajustes,
    )
    expect(h).toMatchObject({
      intencion: { cuando: { despuesDeAccion: 'servirme el café' }, donde: 'la cocina' },
      entorno: ['dejar el libro en la mesa', 'gafas'],
      recompensaAsociada: 'un té',
    })
  })

  it('lo que queda vacío no se guarda', () => {
    const h = nuevoHabito(
      { ...base, intencion: { cuando: { despuesDeAccion: ' ' }, donde: '' }, entorno: [' '], recompensaAsociada: ' ' },
      ahora,
      ajustes,
    )
    expect(h).not.toHaveProperty('intencion')
    expect(h).not.toHaveProperty('entorno')
    expect(h).not.toHaveProperty('recompensaAsociada')
    const soloDonde = nuevoHabito({ ...base, intencion: { cuando: { despuesDeAccion: '' }, donde: 'el parque' } }, ahora, ajustes)
    expect(soloDonde.intencion).toEqual({ donde: 'el parque' })
    // El formulario deja la hora o el ancla vacías si no se eligen.
    expect(nuevoHabito({ ...base, intencion: { cuando: { hora: '' } } }, ahora, ajustes)).not.toHaveProperty('intencion')
    expect(nuevoHabito({ ...base, intencion: { cuando: { despuesDeHabitoId: '' } } }, ahora, ajustes)).not.toHaveProperty('intencion')
  })

  it('al editar, cambiar la hora la sustituye y vaciar el entorno lo quita (sin tocar la regla)', () => {
    const leer: Habito = { ...nuevoHabito({ ...base, intencion: { cuando: { hora: '07:30' } }, entorno: ['libro'] }, ahora, ajustes), id: 'leer', creadoEn: '2026-03-15T08:00:00.000Z' }
    const editado = editarHabito(leer, { ...leer, intencion: { cuando: { hora: '22:00' } }, entorno: [] }, new Date(2026, 2, 20, 9), ajustes)
    expect(editado).toEqual({ ...(({ entorno, ...r }) => (void entorno, r))(leer), intencion: { cuando: { hora: '22:00' } } })
  })
})
