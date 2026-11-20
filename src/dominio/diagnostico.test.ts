import { describe, expect, it } from 'vitest'
import {
  ACCIONES_DIAGNOSTICO,
  AJUSTES_POR_DEFECTO,
  diagnosticosPendientes,
  reconciliarDiagnosticos,
  responderDiagnostico,
  type Diagnostico,
  type Habito,
  type Nuevo,
  type Registro,
} from '.'

const local = (a: number, mes: number, d: number, h: number) => new Date(a, mes - 1, d, h)
const ajustes = AJUSTES_POR_DEFECTO

// Marzo de 2026, hábito diario desde el lunes 2.
const leer: Habito = {
  id: 'h',
  creadoEn: '2026-03-02T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Leer',
  tipo: 'si_no',
  frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
  fechaInicio: '2026-03-02',
  archivado: false,
  orden: 0,
}

const hechos = (...dias: number[]): Registro[] =>
  dias.map((d) => {
    const dia = `2026-03-${String(d).padStart(2, '0')}`
    return { id: dia, creadoEn: `${dia}T10:00:00.000Z`, habitoId: 'h', dia, tipo: 'minima' }
  })

let n = 0
/** Lo que haría la persistencia con lo que crea el núcleo. */
const guardar = (d: Nuevo<Diagnostico>): Diagnostico => ({ ...d, id: `d${++n}`, creadoEn: '2026-03-10T10:00:00.000Z' })

/** Aplica la reconciliación como lo hace la persistencia. */
function reconciliar(diagnosticos: Diagnostico[], registros: Registro[], ahora: Date, habitos = [leer]) {
  const { crear, borrar } = reconciliarDiagnosticos({ habitos, registros, diagnosticos, ahora, ajustes })
  return [...diagnosticos.filter((d) => !borrar.includes(d.id)), ...crear.map(guardar)]
}

describe('diagnóstico: se abre tras dos fallos seguidos', () => {
  it('un fallo aislado no abre ninguno', () => {
    // Día 2 hecho, día 3 sin hacer; hoy es el 4.
    expect(reconciliar([], hechos(2), local(2026, 3, 4, 12))).toEqual([])
  })

  it('el segundo fallo seguido abre uno pendiente, disparado por ese periodo', () => {
    // Días 3 y 4 sin hacer; hoy es el 5.
    const ds = reconciliar([], hechos(2), local(2026, 3, 5, 12))
    expect(ds).toMatchObject([{ habitoId: 'h', periodoQueLoDisparo: '2026-03-04', estado: 'pendiente' }])
    expect(ds[0].ley).toBeUndefined()
  })

  it('recalcular no lo duplica, y un tercer o cuarto fallo no abre otro', () => {
    const ds = reconciliar([], hechos(2), local(2026, 3, 5, 12))
    expect(reconciliar(ds, hechos(2), local(2026, 3, 5, 12))).toEqual(ds)
    expect(reconciliar(ds, hechos(2), local(2026, 3, 7, 12))).toEqual(ds)
  })

  it('una ruptura antigua, ya superada, no abre uno nuevo (p. ej. tras corregir el pasado)', () => {
    // Días 3 y 4 sin hacer, pero del 5 al 9 hecho: hoy (día 10) no hay nada que preguntar.
    expect(reconciliar([], hechos(2, 5, 6, 7, 8, 9), local(2026, 3, 10, 12))).toEqual([])
  })

  it('una nueva ruptura, tras recuperarse, abre otro', () => {
    // Ruptura el 4, recupera el 5, ruptura otra vez el 7.
    const primero = reconciliar([], hechos(2), local(2026, 3, 5, 12))
    const ds = reconciliar(primero.map((d) => responderDiagnostico(d, { estado: 'descartado' })), hechos(2, 5), local(2026, 3, 8, 12))
    expect(ds.map((d) => [d.periodoQueLoDisparo, d.estado])).toEqual([
      ['2026-03-04', 'descartado'],
      ['2026-03-07', 'pendiente'],
    ])
  })

  it('si la nueva ruptura llega con el anterior sin responder, este se retira: uno abierto por hábito', () => {
    const primero = reconciliar([], hechos(2), local(2026, 3, 5, 12))
    const pospuesto = primero.map((d) => responderDiagnostico(d, { estado: 'pospuesto' }))
    expect(reconciliar(pospuesto, hechos(2, 5), local(2026, 3, 8, 12))).toMatchObject([
      { periodoQueLoDisparo: '2026-03-07', estado: 'pendiente' },
    ])
  })

  it('al corregir el pasado, uno sin responder cuya ruptura ya no existe desaparece; uno respondido se queda', () => {
    const ds = reconciliar([], hechos(2), local(2026, 3, 5, 12))
    // Resulta que el día 3 sí lo hizo: ya no hubo dos fallos seguidos.
    expect(reconciliar(ds, hechos(2, 3), local(2026, 3, 5, 12))).toEqual([])
    const respondido = ds.map((d) => responderDiagnostico(d, { estado: 'respondido', ley: 4 }))
    expect(reconciliar(respondido, hechos(2, 3), local(2026, 3, 5, 12))).toEqual(respondido)
  })

  it('los hábitos archivados no abren diagnóstico', () => {
    expect(reconciliar([], hechos(2), local(2026, 3, 5, 12), [{ ...leer, archivado: true }])).toEqual([])
  })
})

describe('diagnóstico: estados', () => {
  const ahora = local(2026, 3, 5, 12)
  const [pendiente] = reconciliar([], hechos(2), ahora)

  it('responder guarda la causa y la acción aplicada', () => {
    expect(responderDiagnostico(pendiente, { estado: 'respondido', ley: 3, accion: 'editar_entorno' })).toEqual({
      ...pendiente,
      estado: 'respondido',
      ley: 3,
      accionAplicada: 'editar_entorno',
    })
    const sinAccion = responderDiagnostico(pendiente, { estado: 'respondido', ley: 1 })
    expect(sinAccion).toMatchObject({ estado: 'respondido', ley: 1 })
    expect('accionAplicada' in sinAccion).toBe(false)
  })

  it.each(['respondido', 'pospuesto', 'descartado'] as const)('uno %s no se vuelve a abrir al recalcular', (estado) => {
    const d =
      estado === 'respondido' ? responderDiagnostico(pendiente, { estado, ley: 2 }) : responderDiagnostico(pendiente, { estado })
    expect(reconciliar([d], hechos(2), ahora)).toEqual([d])
  })

  it('Hoy señala solo los pendientes de hábitos activos', () => {
    const otro: Habito = { ...leer, id: 'otro', nombre: 'Correr', archivado: true }
    const ds: Diagnostico[] = [
      pendiente,
      { ...pendiente, id: 'x', habitoId: 'otro' },
      responderDiagnostico({ ...pendiente, id: 'y' }, { estado: 'pospuesto' }),
    ]
    expect(diagnosticosPendientes({ habitos: [leer, otro], diagnosticos: ds })).toEqual([{ diagnostico: pendiente, habito: leer }])
  })

  it('cada causa ofrece sus acciones', () => {
    expect(ACCIONES_DIAGNOSTICO[1]).toContain('editar_intencion')
    expect(ACCIONES_DIAGNOSTICO[2]).toEqual(['editar_recompensa', 'editar_identidad'])
    expect(ACCIONES_DIAGNOSTICO[3]).toEqual(['solo_minima', 'editar_entorno'])
    expect(ACCIONES_DIAGNOSTICO[4]).toEqual(['ver_votos', 'pausar', 'archivar'])
  })
})
