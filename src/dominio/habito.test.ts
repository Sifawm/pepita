import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, editarHabito, nuevoHabito, type Habito } from '.'

const ajustes = AJUSTES_POR_DEFECTO
const ahora = new Date(2026, 2, 15, 9)

describe('asistente: crear un hábito', () => {
  it('guarda la versión mínima y la completa, sin espacios sobrantes', () => {
    const h = nuevoHabito(
      { nombre: '  Leer ', identidadId: 'general', orden: 0, versionMinima: ' Leer una página ', versionCompleta: 'Leer 30 minutos' },
      ahora,
      ajustes,
    )
    expect(h).toMatchObject({ nombre: 'Leer', versionMinima: 'Leer una página', versionCompleta: 'Leer 30 minutos' })
  })

  it('un paso saltado («Ahora no») deja el campo sin escribir', () => {
    const h = nuevoHabito({ nombre: 'Leer', identidadId: 'general', orden: 0, versionMinima: '   ' }, ahora, ajustes)
    expect(h).not.toHaveProperty('versionMinima')
    expect(h).not.toHaveProperty('versionCompleta')
  })
})

describe('asistente: editar un hábito', () => {
  const leer: Habito = {
    ...nuevoHabito({ nombre: 'Leer', identidadId: 'general', orden: 4, versionMinima: 'Una página' }, ahora, ajustes),
    id: 'leer',
    creadoEn: '2026-03-15T08:00:00.000Z',
  }

  it('cambia los campos del asistente y conserva lo demás (inicio, orden, archivo)', () => {
    const editado = editarHabito(leer, {
      nombre: ' Leer novelas ',
      identidadId: 'lectora',
      frecuencia: { tipo: 'dias_semana', dias: [6, 7] },
      versionMinima: 'Una página',
      versionCompleta: ' Un capítulo ',
    })
    expect(editado).toEqual({
      ...leer,
      nombre: 'Leer novelas',
      identidadId: 'lectora',
      frecuencia: { tipo: 'dias_semana', dias: [6, 7] },
      versionCompleta: 'Un capítulo',
    })
  })

  it('vaciar una versión la borra', () => {
    const editado = editarHabito(leer, { ...leer, versionMinima: '' })
    expect(editado).not.toHaveProperty('versionMinima')
    expect(editado.nombre).toBe('Leer')
  })
})
