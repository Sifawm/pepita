import { describe, expect, it } from 'vitest'
import en from './en.json'
import es from './es.json'

type Arbol = { [clave: string]: string | Arbol }

/** Todas las claves hoja con su texto, plurales (`_one`/`_other`) incluidos. */
const hojas = (arbol: Arbol, prefijo = ''): [string, string][] =>
  Object.entries(arbol).flatMap(([k, v]) => (typeof v === 'string' ? [[prefijo + k, v] as [string, string]] : hojas(v, `${prefijo}${k}.`)))
const claves = (arbol: Arbol) => hojas(arbol).map(([k]) => k).sort()

describe('textos', () => {
  it('es y en tienen exactamente las mismas claves', () => {
    expect(claves(en)).toEqual(claves(es))
  })

  it('ningún texto está vacío', () => {
    expect([...hojas(es), ...hojas(en)].filter(([, v]) => v.trim() === '').map(([k]) => k)).toEqual([])
  })
})
