import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, componerHoy, editarHabito, evaluarHabito, nuevoHabito, recaer, resumirIdentidades, type Habito, type Identidad, type Registro } from '.'

const local = (a: number, mes: number, d: number, h: number) => new Date(a, mes - 1, d, h)
const ajustes = AJUSTES_POR_DEFECTO

// Desde el lunes 2 de marzo de 2026, sin redes sociales.
const redes: Habito = {
  id: 'h',
  creadoEn: '2026-03-02T08:00:00.000Z',
  identidadId: 'general',
  nombre: 'Redes sociales',
  tipo: 'evitar',
  frecuencia: { tipo: 'veces_por_periodo', veces: 1, periodo: 'dia' },
  fechaInicio: '2026-03-02',
  archivado: false,
  orden: 0,
}

const recaida = (dia: string, disparador?: string): Registro => ({
  id: `${dia}-recaida`,
  creadoEn: `${dia}T22:00:00.000Z`,
  habitoId: 'h',
  dia,
  tipo: 'recaida',
  ...(disparador && { disparador }),
})

describe('hábito a evitar: el periodo es el día y se cumple si cierra sin recaída', () => {
  it('un día limpio suma 1 voto solo al cerrarse (04:00)', () => {
    const antes = evaluarHabito({ habito: redes, registros: [], ahora: local(2026, 3, 3, 3), ajustes })
    expect(antes.votos).toBe(0)
    expect(antes.actual?.estado).toBe('en_curso')
    const despues = evaluarHabito({ habito: redes, registros: [], ahora: local(2026, 3, 3, 4), ajustes })
    expect(despues.votos).toBe(1)
    // El voto es del día limpio, no del día en que se cerró.
    expect(despues.diasVoto).toEqual(['2026-03-02'])
    expect(despues.periodos.map((p) => p.estado)).toEqual(['cumplido_completa', 'en_curso'])
  })

  it('una recaída convierte ese día en fallo en el acto y no suma voto', () => {
    const e = evaluarHabito({ habito: redes, registros: [recaida('2026-03-03', 'Aburrimiento')], ahora: local(2026, 3, 3, 23), ajustes })
    expect(e.periodos.map((p) => p.estado)).toEqual(['cumplido_completa', 'fallido'])
    expect(e.votos).toBe(1)
  })

  it('tras una recaída, el día siguiente está en recuperación y la racha sigue', () => {
    // 2 y 3 limpios, recaída el 4; hoy es el 5.
    const e = evaluarHabito({ habito: redes, registros: [recaida('2026-03-04')], ahora: local(2026, 3, 5, 12), ajustes })
    expect(e.enRecuperacion).toBe(true)
    expect(e.racha).toEqual({ actual: 2, mejor: 2 })
    expect(e.votos).toBe(2)
  })

  it('dos recaídas seguidas rompen la racha (una ruptura)', () => {
    const e = evaluarHabito({
      habito: redes,
      registros: [recaida('2026-03-04'), recaida('2026-03-05')],
      ahora: local(2026, 3, 6, 12),
      ajustes,
    })
    expect(e.racha).toEqual({ actual: 0, mejor: 2 })
    expect(e.rupturas.map((p) => p.desde)).toEqual(['2026-03-05'])
    expect(e.fallosSeguidos).toBe(2)
  })

  it('el periodo es el día aunque la frecuencia guardada diga otra cosa', () => {
    const semanal: Habito = { ...redes, frecuencia: { tipo: 'veces_por_periodo', veces: 3, periodo: 'semana' } }
    const e = evaluarHabito({ habito: semanal, registros: [], ahora: local(2026, 3, 5, 12), ajustes })
    expect(e.periodos.map((p) => p.desde)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'])
    expect(e.votos).toBe(3)
  })

  it('un día saltado o en pausa no suma ni falla, aunque haya recaída', () => {
    const e = evaluarHabito({
      habito: { ...redes, pausas: [{ desde: '2026-03-03', hasta: '2026-03-03' }] },
      registros: [recaida('2026-03-03'), { ...recaida('2026-03-04'), id: 's', tipo: 'salto' }],
      ahora: local(2026, 3, 5, 12),
      ajustes,
    })
    expect(e.periodos.map((p) => p.estado)).toEqual(['cumplido_completa', 'pausado', 'saltado', 'en_curso'])
    expect(e.votos).toBe(1)
  })
})

describe('votos de la identidad', () => {
  const general: Identidad = { id: 'general', creadoEn: '2026-03-01T08:00:00.000Z', nombre: '', esGeneral: true, archivada: false, orden: 0 }

  it('cada día limpio ya cerrado suma 1 voto a su identidad; hoy aún no', () => {
    // 2, 3 y 5 limpios y cerrados; recaída el 4; hoy (6) en curso.
    const [r] = resumirIdentidades({
      identidades: [general],
      habitos: [redes],
      registros: [recaida('2026-03-04')],
      ahora: local(2026, 3, 6, 12),
      ajustes,
    })
    expect([r.votos, r.votosHoy]).toEqual([3, 0])
  })
})

describe('crear y editar un hábito a evitar (leyes inversas)', () => {
  it('guarda los pasos rellenados, recortados; un paso saltado no se guarda', () => {
    const h = nuevoHabito(
      { nombre: ' Redes ', identidadId: 'general', orden: 0, tipo: 'evitar', leyesInversas: { senal: ' Móvil fuera del cuarto ', friccion: '', sustituto: 'Leer' } },
      local(2026, 3, 2, 9),
      ajustes,
    )
    expect(h).toMatchObject({ nombre: 'Redes', tipo: 'evitar', leyesInversas: { senal: 'Móvil fuera del cuarto', sustituto: 'Leer' } })
    expect(h.leyesInversas).not.toHaveProperty('friccion')
  })

  it('sin ningún paso rellenado no hay leyes inversas; un hábito sí/no nunca las tiene', () => {
    const vacio = { senal: ' ', friccion: '', sustituto: undefined }
    expect(nuevoHabito({ nombre: 'Redes', identidadId: 'general', orden: 0, tipo: 'evitar', leyesInversas: vacio }, local(2026, 3, 2, 9), ajustes)).not.toHaveProperty('leyesInversas')
    expect(nuevoHabito({ nombre: 'Leer', identidadId: 'general', orden: 0, leyesInversas: { senal: 'x' } }, local(2026, 3, 2, 9), ajustes)).toMatchObject({ tipo: 'si_no' })
    expect(nuevoHabito({ nombre: 'Leer', identidadId: 'general', orden: 0, leyesInversas: { senal: 'x' } }, local(2026, 3, 2, 9), ajustes)).not.toHaveProperty('leyesInversas')
  })

  it('editar sustituye las leyes inversas y conserva el tipo', () => {
    const conLeyes = { ...redes, leyesInversas: { senal: 'Móvil', friccion: 'Cerrar sesión' } }
    const editado = editarHabito(
      conLeyes,
      { nombre: 'Redes', identidadId: 'general', frecuencia: redes.frecuencia, leyesInversas: { sustituto: 'Pasear' } },
      local(2026, 3, 5, 9),
      ajustes,
    )
    expect(editado).toMatchObject({ tipo: 'evitar', leyesInversas: { sustituto: 'Pasear' } })
    expect(editado.leyesInversas).toEqual({ sustituto: 'Pasear' })
  })
})

describe('registrar una recaída', () => {
  it('va al día lógico, con el disparador si lo hay', () => {
    expect(recaer({ habito: redes, disparador: ' Aburrimiento ', ahora: local(2026, 3, 4, 1), ajustes })).toEqual({
      habitoId: 'h',
      dia: '2026-03-03',
      tipo: 'recaida',
      disparador: 'Aburrimiento',
    })
    expect(recaer({ habito: redes, disparador: '  ', ahora: local(2026, 3, 4, 12), ajustes })).toEqual({ habitoId: 'h', dia: '2026-03-04', tipo: 'recaida' })
  })
})

describe('en Hoy', () => {
  const general: Identidad = { id: 'general', creadoEn: '2026-03-01T08:00:00.000Z', nombre: '', esGeneral: true, archivada: false, orden: 0 }

  it('la tarjeta lleva las recaídas de hoy y el día queda como fallo; no suma votos de hoy', () => {
    const hoy = componerHoy({
      habitos: [redes],
      identidades: [general],
      registros: [recaida('2026-03-03'), recaida('2026-03-04', 'Estrés')],
      ahora: local(2026, 3, 4, 20),
      ajustes,
    })
    const [t] = hoy.habitos
    expect(t.recaidas.map((r) => r.disparador)).toEqual(['Estrés'])
    expect(t.periodo.estado).toBe('fallido')
    expect(t.hecho).toBe(false)
    expect(hoy.votos).toBe(0)
  })
})
