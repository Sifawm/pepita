// Intención de implementación: la frase («Después de…, en…: …»), las anclas y el orden por hora de Hoy.
import type { Habito, Hora } from './tipos'

/** El ancla de un hábito, solo mientras exista y no esté archivada: si falta, el hábito queda «sin hora». */
function anclaDe(habito: Pick<Habito, 'intencion'>, habitos: Habito[]) {
  const c = habito.intencion?.cuando
  return c && 'despuesDeHabitoId' in c ? habitos.find((h) => h.id === c.despuesDeHabitoId && !h.archivado) : undefined
}

/** La cadena de anclas hacia arriba, sin repetir (un ciclo en datos importados no cuelga nada). */
function cadena(habito: Habito, habitos: Habito[]) {
  const vistos = [habito]
  for (let a = anclaDe(habito, habitos); a && !vistos.includes(a); a = anclaDe(a, habitos)) vistos.push(a)
  return vistos
}

/** La hora del hábito, o la de su ancla (a cualquier nivel). Sin hora: acción libre, sin cuándo o ancla perdida. */
const horaDe = (habito: Habito, habitos: Habito[]): Hora | undefined =>
  cadena(habito, habitos)
    .map((h) => h.intencion?.cuando)
    .find((c): c is { hora: Hora } => !!c && 'hora' in c)?.hora

/**
 * Orden por hora: cada anclado justo debajo de su ancla (si está en la lista; si no, ocupa su
 * hora) y al final los que no tienen hora. Empate: por `orden`. Ordena un grupo cualquiera
 * (Hoy lo aplica dentro de «en recuperación» y del resto).
 */
export function ordenarPorHora<T extends { habito: Habito }>(tarjetas: T[], habitos: Habito[]): T[] {
  const clave = (t: T) => horaDe(t.habito, habitos) ?? '99:99'
  const porHora = [...tarjetas].sort((a, b) => clave(a).localeCompare(clave(b)) || a.habito.orden - b.habito.orden)
  const hijos = new Map<string, T[]>()
  const raices: T[] = []
  for (const t of porHora) {
    const ancla = anclaDe(t.habito, habitos)
    const enLista = ancla && porHora.some((x) => x.habito.id === ancla.id)
    if (enLista) hijos.set(ancla.id, [...(hijos.get(ancla.id) ?? []), t])
    else raices.push(t)
  }
  const puestas = new Set<T>()
  const poner = (t: T): T[] => {
    if (puestas.has(t)) return []
    puestas.add(t)
    return [t, ...(hijos.get(t.habito.id) ?? []).flatMap(poner)]
  }
  // Tras las raíces, lo que quede (un ciclo) va en su sitio por hora.
  return [...raices, ...porHora].flatMap(poner)
}

/** Hábitos que pueden ser ancla de `habitoId` (o de uno nuevo): activos y sin cerrar un ciclo. */
export const anclasPosibles = (habitoId: string | undefined, habitos: Habito[]) =>
  habitos.filter((h) => !h.archivado && !cadena(h, habitos).some((x) => x.id === habitoId))

/** La frase como estructura; la interfaz la traduce. `que` = la versión mínima o, si no hay, el nombre. */
export interface FraseIntencion {
  cuando?: { hora: Hora } | { despuesDe: string } | { despuesDeAccion: string }
  donde?: string
  que: string
}

/** Sin cuándo ni dónde no hay frase. Un ancla perdida se omite de la frase. */
export function fraseIntencion(
  habito: Pick<Habito, 'nombre' | 'versionMinima' | 'intencion'>,
  habitos: Habito[],
): FraseIntencion | undefined {
  const c = habito.intencion?.cuando
  const ancla = anclaDe(habito, habitos)
  const cuando: FraseIntencion['cuando'] = c && 'despuesDeHabitoId' in c ? ancla && { despuesDe: ancla.nombre } : c
  const donde = habito.intencion?.donde
  if (!cuando && !donde) return undefined
  return { ...(cuando && { cuando }), ...(donde && { donde }), que: habito.versionMinima ?? habito.nombre }
}
