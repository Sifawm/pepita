// Validadores mínimos para la frontera de confianza (la importación). Uso interno del núcleo.
// Cada uno devuelve el valor ya tipado o lanza `Invalido` con la ruta del campo que falla.

export type Validador<T> = (valor: unknown, ruta: string) => T

export class Invalido extends Error {
  constructor(readonly ruta: string) {
    super(`Valor inválido en ${ruta || 'la raíz'}`)
  }
}

const falla = (ruta: string): never => {
  throw new Invalido(ruta)
}

export const texto: Validador<string> = (v, r) => (typeof v === 'string' ? v : falla(r))

export const conPatron =
  (patron: RegExp): Validador<string> =>
  (v, r) =>
    typeof v === 'string' && patron.test(v) ? v : falla(r)

export const booleano: Validador<boolean> = (v, r) => (typeof v === 'boolean' ? v : falla(r))

export const entero =
  (min: number, max = Number.MAX_SAFE_INTEGER): Validador<number> =>
  (v, r) =>
    Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : falla(r)

/** Número finito mayor que 0 (admite decimales: 1,5 litros). */
export const positivo: Validador<number> = (v, r) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : falla(r))

export const literal =
  <const L extends readonly (string | number)[]>(...valores: L): Validador<L[number]> =>
  (v, r) =>
    valores.includes(v as L[number]) ? (v as L[number]) : falla(r)

/** Campo que puede faltar. Un `null` no vale: JSON de Pepita nunca lo escribe. */
export const opcional =
  <T>(validador: Validador<T>): Validador<T | undefined> =>
  (v, r) =>
    v === undefined ? undefined : validador(v, r)

export const lista =
  <T>(validador: Validador<T>): Validador<T[]> =>
  (v, r) =>
    Array.isArray(v) ? v.map((x, i) => validador(x, `${r}[${i}]`)) : falla(r)

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Unión discriminada por `tipo`: un validador (normalmente `objeto`) por cada variante.
 * Ojo: TypeScript exige una entrada por variante, pero no detecta un validador más estrecho
 * que su tipo (p. ej. `literal('dia')` donde cabe `'dia' | 'semana'`): cúbrelo con datos de test.
 */
export const segunTipo =
  <T extends { tipo: string }>(variantes: { [K in T['tipo']]: Validador<Extract<T, { tipo: K }>> }): Validador<T> =>
  (v, r) => {
    const tipo = esObjeto(v) ? v.tipo : undefined
    if (typeof tipo !== 'string' || !Object.hasOwn(variantes, tipo)) return falla(r ? `${r}.tipo` : 'tipo')
    return variantes[tipo as T['tipo']](v, r)
  }

/**
 * Objeto estricto: exige un validador por cada campo de `T` (si amplías el tipo, TypeScript
 * te obliga a ampliar aquí) y rechaza cualquier campo que no conozca.
 */
export const objeto =
  <T>(campos: { [K in keyof T]-?: Validador<T[K]> }): Validador<T> =>
  (v, r) => {
    if (!esObjeto(v)) return falla(r)
    const ruta = (k: string) => (r ? `${r}.${k}` : k)
    const desconocido = Object.keys(v).find((k) => !Object.hasOwn(campos, k))
    if (desconocido !== undefined) falla(ruta(desconocido))
    const resultado: Record<string, unknown> = {}
    for (const k of Object.keys(campos) as (keyof T & string)[]) {
      const valor = campos[k](v[k], ruta(k))
      if (valor !== undefined) resultado[k] = valor
    }
    return resultado as T
  }
