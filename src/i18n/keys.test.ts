import { describe, expect, it } from 'vitest'
import en from './en.json'
import es from './es.json'

type Tree = { [key: string]: string | Tree }

/** Every leaf key with its text, plurals (`_one`/`_other`) included. */
const leaves = (tree: Tree, prefix = ''): [string, string][] =>
  Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [[prefix + k, v] as [string, string]] : leaves(v, `${prefix}${k}.`)))
const keys = (tree: Tree) => leaves(tree).map(([k]) => k).sort()

describe('copy', () => {
  it('es and en have exactly the same keys', () => {
    expect(keys(en)).toEqual(keys(es))
  })

  it('no text is empty', () => {
    expect([...leaves(es), ...leaves(en)].filter(([, v]) => v.trim() === '').map(([k]) => k)).toEqual([])
  })
})
