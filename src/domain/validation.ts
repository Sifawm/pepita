// Minimal validators for the trust boundary (import). Internal to the core.
// Each one returns the value already typed or throws `InvalidValue` with the path of the failing field.

export type Validator<T> = (value: unknown, path: string) => T

export class InvalidValue extends Error {
  constructor(readonly path: string) {
    super(`Invalid value at ${path || 'the root'}`)
  }
}

const fail = (path: string): never => {
  throw new InvalidValue(path)
}

export const str: Validator<string> = (v, p) => (typeof v === 'string' ? v : fail(p))

export const matching =
  (pattern: RegExp): Validator<string> =>
  (v, p) =>
    typeof v === 'string' && pattern.test(v) ? v : fail(p)

export const bool: Validator<boolean> = (v, p) => (typeof v === 'boolean' ? v : fail(p))

export const int =
  (min: number, max = Number.MAX_SAFE_INTEGER): Validator<number> =>
  (v, p) =>
    Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : fail(p)

/** Finite number greater than 0 (decimals allowed: 1.5 liters). */
export const positive: Validator<number> = (v, p) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fail(p))

export const literal =
  <const L extends readonly (string | number)[]>(...values: L): Validator<L[number]> =>
  (v, p) =>
    values.includes(v as L[number]) ? (v as L[number]) : fail(p)

/** A field that may be missing. `null` is rejected: Pepita's JSON never writes it. */
export const optional =
  <T>(validator: Validator<T>): Validator<T | undefined> =>
  (v, p) =>
    v === undefined ? undefined : validator(v, p)

export const arrayOf =
  <T>(validator: Validator<T>): Validator<T[]> =>
  (v, p) =>
    Array.isArray(v) ? v.map((x, i) => validator(x, `${p}[${i}]`)) : fail(p)

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Union discriminated by `type`: one validator (usually `object`) per variant.
 * Careful: TypeScript requires one entry per variant, but doesn't catch a validator narrower
 * than its type (e.g. `literal('day')` where `'day' | 'week'` fits): cover it with test data.
 */
export const byType =
  <T extends { type: string }>(variants: { [K in T['type']]: Validator<Extract<T, { type: K }>> }): Validator<T> =>
  (v, p) => {
    const type = isObject(v) ? v.type : undefined
    if (typeof type !== 'string' || !Object.hasOwn(variants, type)) return fail(p ? `${p}.type` : 'type')
    return variants[type as T['type']](v, p)
  }

/**
 * Strict object: requires a validator for every field of `T` (widen the type and TypeScript
 * forces you to widen this too) and rejects any field it doesn't know.
 */
export const object =
  <T>(fields: { [K in keyof T]-?: Validator<T[K]> }): Validator<T> =>
  (v, p) => {
    if (!isObject(v)) return fail(p)
    const path = (k: string) => (p ? `${p}.${k}` : k)
    const unknownKey = Object.keys(v).find((k) => !Object.hasOwn(fields, k))
    if (unknownKey !== undefined) fail(path(unknownKey))
    const result: Record<string, unknown> = {}
    for (const k of Object.keys(fields) as (keyof T & string)[]) {
      const value = fields[k](v[k], path(k))
      if (value !== undefined) result[k] = value
    }
    return result as T
  }
