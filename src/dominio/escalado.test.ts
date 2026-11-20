import { describe, expect, it } from 'vitest'
import {
  AJUSTES_POR_DEFECTO,
  descartarSugerencia,
  sugerenciaEscalado,
  sugerenciasEscalado,
  sumarDias,
  type Diagnostico,
  type Habito,
  type Registro,
  type SugerenciaDescartada,
  type TipoRegistro,
} from '.'

const local = (a: number, mes: number, d: number, h = 12) => new Date(a, mes - 1, d, h)
const ajustes = AJUSTES_POR_DEFECTO

// Hábito diario desde el jueves 1 de enero de 2026.
const leer: Habito = {
  id: 'h',
  creadoEn: '2026-01-01T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Leer',
  tipo: 'si_no',
  frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
  fechaInicio: '2026-01-01',
  archivado: false,
  orden: 0,
}

/** Un registro por día, del `desde` al `hasta` (incluidos). */
function cadaDia(desde: string, hasta: string, tipo: TipoRegistro = 'minima', extra: Partial<Registro> = {}): Registro[] {
  const rs: Registro[] = []
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1))
    rs.push({ id: `${dia}-${tipo}`, creadoEn: `${dia}T10:00:00.000Z`, habitoId: 'h', dia, tipo, ...extra })
  return rs
}

const sugerencia = (
  registros: Registro[],
  ahora: Date,
  { habito = leer, diagnosticos = [] as Diagnostico[], sugerenciasDescartadas = [] as SugerenciaDescartada[] } = {},
) => sugerenciaEscalado({ habito, registros, diagnosticos, sugerenciasDescartadas, ahora, ajustes })

describe('escalado: subir el listón tras 21 días con fuerza alta', () => {
  it('con unas 3 semanas de fuerza ≥ 0,8 sugiere subir', () => {
    // Un hábito diario perfecto ronda 0,8 a los 30 días: el 1 de marzo lleva más de 3 semanas por encima.
    expect(sugerencia(cadaDia('2026-01-01', '2026-03-01', 'completa'), local(2026, 3, 1))).toMatchObject({ tipo: 'subir' })
  })

  it('con fuerza alta desde hace pocos días, aún no', () => {
    expect(sugerencia(cadaDia('2026-01-01', '2026-02-10', 'completa'), local(2026, 2, 10))).toBeUndefined()
  })

  it('un hábito recién empezado nunca sugiere nada', () => {
    expect(sugerencia([], local(2026, 1, 1))).toBeUndefined()
  })
})

describe('escalado: qué propone subir', () => {
  const ahora = local(2026, 3, 1)

  it('si predomina la mínima, propone hacer más a menudo la completa (sin cambiar la regla)', () => {
    expect(sugerencia(cadaDia('2026-01-01', '2026-03-01', 'minima'), ahora)).toEqual({ tipo: 'subir', predomina: 'minima' })
  })

  it('lo que predomina se mira en las últimas 3 semanas, no en toda la historia', () => {
    // 37 días de mínima y luego 23 de completa: en total gana la mínima, pero lo reciente es completa.
    const registros = [...cadaDia('2026-01-01', '2026-02-06', 'minima'), ...cadaDia('2026-02-07', '2026-03-01', 'completa')]
    expect(sugerencia(registros, ahora)).toEqual({ tipo: 'subir', predomina: 'completa' })
  })

  it('si predomina la completa en un sí/no, propone subir el objetivo o la frecuencia (se elige en el asistente)', () => {
    expect(sugerencia(cadaDia('2026-01-01', '2026-03-01', 'completa'), ahora)).toEqual({ tipo: 'subir', predomina: 'completa' })
  })

  it('en un cuantitativo «al menos», propone un objetivo algo mayor', () => {
    const paginas: Habito = { ...leer, tipo: 'cuantitativo', cuantitativo: { unidad: 'páginas', objetivo: 10, objetivoMinimo: 2, modo: 'al_menos' } }
    expect(sugerencia(cadaDia('2026-01-01', '2026-03-01', 'valor', { valor: 10 }), ahora, { habito: paginas })).toEqual({
      tipo: 'subir',
      predomina: 'completa',
      propuesta: { frecuencia: leer.frecuencia, cuantitativo: { unidad: 'páginas', objetivo: 12, objetivoMinimo: 2, modo: 'al_menos' } },
    })
  })

  it('en un cuantitativo «como mucho», subir el listón es permitir menos', () => {
    const cafes: Habito = { ...leer, tipo: 'cuantitativo', cuantitativo: { unidad: 'cafés', objetivo: 3, modo: 'como_mucho' } }
    expect(sugerencia([], ahora, { habito: cafes })).toEqual({
      tipo: 'subir',
      predomina: 'completa',
      propuesta: { frecuencia: leer.frecuencia, cuantitativo: { unidad: 'cafés', objetivo: 2, modo: 'como_mucho' } },
    })
    // Con «como mucho 1» no hay un número menor que proponer: se ajusta en el asistente.
    const uno: Habito = { ...cafes, cuantitativo: { unidad: 'cafés', objetivo: 1, modo: 'como_mucho' } }
    expect(sugerencia([], ahora, { habito: uno })).toEqual({ tipo: 'subir', predomina: 'completa' })
  })

  it('un hábito a evitar no tiene listón que subir', () => {
    expect(sugerencia([], ahora, { habito: { ...leer, tipo: 'evitar' } })).toBeUndefined()
  })
})

describe('escalado: bajar el listón tras un diagnóstico de la 3ª ley', () => {
  // Hecho hasta el 1 de marzo, falla el 2 y el 3 (ruptura el 3); hoy es el 4.
  const registros = cadaDia('2026-02-20', '2026-03-01')
  const ahora = local(2026, 3, 4)
  const diagnostico = (ley: 1 | 2 | 3 | 4, extra: Partial<Diagnostico> = {}): Diagnostico => ({
    id: 'd',
    creadoEn: '2026-03-04T09:00:00.000Z',
    habitoId: 'h',
    periodoQueLoDisparo: '2026-03-03',
    estado: 'respondido',
    ley,
    ...extra,
  })

  it('«era difícil» sugiere quedarse con la mínima; en un sí/no se ajusta en el asistente', () => {
    expect(sugerencia(registros, ahora, { diagnosticos: [diagnostico(3)] })).toEqual({ tipo: 'bajar' })
  })

  it('otra causa, o un diagnóstico sin responder, no sugiere bajar', () => {
    expect(sugerencia(registros, ahora, { diagnosticos: [diagnostico(1)] })).toBeUndefined()
    expect(sugerencia(registros, ahora, { diagnosticos: [diagnostico(3, { estado: 'pospuesto', ley: undefined })] })).toBeUndefined()
  })

  it('solo cuenta el último diagnóstico del hábito', () => {
    const anterior = diagnostico(3, { id: 'antes', periodoQueLoDisparo: '2026-02-10' })
    expect(sugerencia(registros, ahora, { diagnosticos: [diagnostico(4), anterior] })).toBeUndefined()
  })

  it('en un cuantitativo «al menos», propone que el objetivo mínimo pase a ser el objetivo', () => {
    const paginas: Habito = { ...leer, tipo: 'cuantitativo', cuantitativo: { unidad: 'páginas', objetivo: 20, objetivoMinimo: 5, modo: 'al_menos' } }
    expect(sugerencia([], ahora, { habito: paginas, diagnosticos: [diagnostico(3)] })).toEqual({
      tipo: 'bajar',
      propuesta: { frecuencia: leer.frecuencia, cuantitativo: { unidad: 'páginas', objetivo: 5, modo: 'al_menos' } },
    })
    // Sin objetivo mínimo, propone uno algo menor.
    const sinMinimo: Habito = { ...paginas, cuantitativo: { unidad: 'páginas', objetivo: 20, modo: 'al_menos' } }
    expect(sugerencia([], ahora, { habito: sinMinimo, diagnosticos: [diagnostico(3)] })).toMatchObject({
      propuesta: { cuantitativo: { objetivo: 16 } },
    })
  })

  it('en un cuantitativo «como mucho», bajar el listón es permitir algo más', () => {
    // Empezado hace poco: un «como mucho» sin registros aún no tiene fuerza alta.
    const cafes: Habito = { ...leer, fechaInicio: '2026-03-01', tipo: 'cuantitativo', cuantitativo: { unidad: 'cafés', objetivo: 3, modo: 'como_mucho' } }
    expect(sugerencia([], ahora, { habito: cafes, diagnosticos: [diagnostico(3)] })).toEqual({
      tipo: 'bajar',
      propuesta: { frecuencia: leer.frecuencia, cuantitativo: { unidad: 'cafés', objetivo: 4, modo: 'como_mucho' } },
    })
  })

  it('al evitar también se sugiere (sin regla que cambiar: se repasa la fricción en el asistente)', () => {
    expect(sugerencia([], ahora, { habito: { ...leer, tipo: 'evitar' }, diagnosticos: [diagnostico(3)] })).toEqual({ tipo: 'bajar' })
  })
})

/** Lo que guardaría la persistencia al descartar (o aplicar) la sugerencia en ese instante. */
const descartada = (tipo: 'subir' | 'bajar', ahora: Date): SugerenciaDescartada => ({
  ...descartarSugerencia({ habito: leer, tipo, ahora, ajustes }),
  id: `s-${tipo}`,
  creadoEn: ahora.toISOString(),
})

describe('escalado: una sugerencia descartada no vuelve hasta pasados 21 días', () => {
  it('subir, descartada el 1 de marzo, no sale hasta el 22', () => {
    const registros = cadaDia('2026-01-01', '2026-03-31', 'completa')
    const sugerenciasDescartadas = [descartada('subir', local(2026, 3, 1))]
    expect(sugerencias(registros, local(2026, 3, 1), sugerenciasDescartadas)).toBeUndefined()
    expect(sugerencias(registros, local(2026, 3, 21), sugerenciasDescartadas)).toBeUndefined()
    expect(sugerencias(registros, local(2026, 3, 22), sugerenciasDescartadas)).toMatchObject({ tipo: 'subir' })
  })

  it('bajar, descartada el 4 de marzo, no sale hasta el 25 (sigue valiendo el mismo diagnóstico)', () => {
    const d: Diagnostico = { id: 'a', creadoEn: '2026-03-04T09:00:00.000Z', habitoId: 'h', periodoQueLoDisparo: '2026-03-03', estado: 'respondido', ley: 3 }
    const sugerenciasDescartadas = [descartada('bajar', local(2026, 3, 4))]
    const con = (ahora: Date) => sugerencia([], ahora, { diagnosticos: [d], sugerenciasDescartadas })
    expect(con(local(2026, 3, 4))).toBeUndefined()
    expect(con(local(2026, 3, 24))).toBeUndefined()
    expect(con(local(2026, 3, 25))).toEqual({ tipo: 'bajar' })
  })

  it('bajar aplicada (la regla cambió tras el diagnóstico) no vuelve a proponer otro recorte', () => {
    const d: Diagnostico = { id: 'a', creadoEn: '2026-03-04T09:00:00.000Z', habitoId: 'h', periodoQueLoDisparo: '2026-03-03', estado: 'respondido', ley: 3 }
    const paginas: Habito = {
      ...leer,
      tipo: 'cuantitativo',
      cuantitativo: { unidad: 'páginas', objetivo: 5, modo: 'al_menos' },
      // Objetivo 20 (mínimo 5) hasta el 3 de marzo; desde el 4, el mínimo pasó a ser el objetivo.
      versiones: [{ hasta: '2026-03-03', frecuencia: leer.frecuencia, cuantitativo: { unidad: 'páginas', objetivo: 20, objetivoMinimo: 5, modo: 'al_menos' } }],
    }
    const sugerenciasDescartadas = [descartada('bajar', local(2026, 3, 4))]
    expect(sugerencia([], local(2026, 4, 30), { habito: paginas, diagnosticos: [d], sugerenciasDescartadas })).toBeUndefined()
  })

  function sugerencias(registros: Registro[], ahora: Date, sugerenciasDescartadas: SugerenciaDescartada[]) {
    return sugerencia(registros, ahora, { sugerenciasDescartadas })
  }
})

describe('escalado: la lista para Hoy y la revisión', () => {
  it('reúne la sugerencia vigente de cada hábito activo', () => {
    const correr: Habito = { ...leer, id: 'c', nombre: 'Correr' }
    const archivado: Habito = { ...leer, id: 'a', archivado: true }
    const registros = ['h', 'c', 'a'].flatMap((habitoId) => cadaDia('2026-01-01', '2026-03-01', 'completa').map((r) => ({ ...r, id: `${habitoId}${r.id}`, habitoId })))
    const lista = sugerenciasEscalado({ habitos: [leer, correr, archivado], registros, diagnosticos: [], sugerenciasDescartadas: [descartada('subir', local(2026, 2, 25))], ahora: local(2026, 3, 1), ajustes })
    expect(lista).toEqual([{ habito: correr, sugerencia: { tipo: 'subir', predomina: 'completa' } }])
  })
})
