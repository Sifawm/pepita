import { evaluarHabito } from './evaluacion'
import type { AccionDiagnostico, Ajustes, Diagnostico, Habito, Ley, Nuevo, Registro } from './tipos'

/** Lo que ofrece cada causa. El orden es el de los botones. */
export const ACCIONES_DIAGNOSTICO: Record<Ley, AccionDiagnostico[]> = {
  1: ['editar_intencion', 'exportar_ics'],
  2: ['editar_recompensa', 'editar_identidad'],
  3: ['solo_minima', 'editar_entorno'],
  4: ['ver_votos', 'pausar', 'archivar'],
}

/**
 * Qué diagnósticos crear y borrar para que cuadren con las rupturas de racha actuales.
 * Idempotente: aplicarlo dos veces no cambia nada.
 */
export function reconciliarDiagnosticos({
  habitos,
  registros,
  diagnosticos,
  ahora,
  ajustes,
}: {
  habitos: Habito[]
  registros: Registro[]
  diagnosticos: Diagnostico[]
  ahora: Date
  ajustes: Ajustes
}): { crear: Nuevo<Diagnostico>[]; borrar: string[] } {
  const crear: Nuevo<Diagnostico>[] = []
  const borrar: string[] = []
  for (const habito of habitos.filter((h) => !h.archivado)) {
    const { rupturas, fallosSeguidos } = evaluarHabito({ habito, registros, ahora, ajustes })
    const ultima = rupturas.at(-1)?.desde
    const propios = diagnosticos.filter((d) => d.habitoId === habito.id)
    // Uno sin responder solo sigue abierto si es de la última ruptura: si otra la sustituyó
    // o una corrección del pasado la deshizo, se retira. Los respondidos quedan como historia.
    for (const d of propios) if (abierto(d) && d.periodoQueLoDisparo !== ultima) borrar.push(d.id)
    // Solo la ruptura de la serie de fallos en curso: una ya superada no se pregunta tarde.
    if (ultima && fallosSeguidos >= 2 && !propios.some((d) => d.periodoQueLoDisparo === ultima))
      crear.push({ habitoId: habito.id, periodoQueLoDisparo: ultima, estado: 'pendiente' })
  }
  return { crear, borrar }
}

const abierto = (d: Diagnostico) => d.estado === 'pendiente' || d.estado === 'pospuesto'

export type RespuestaDiagnostico = { estado: 'pospuesto' | 'descartado' } | { estado: 'respondido'; ley: Ley; accion?: AccionDiagnostico }

/** Responder (con la causa y, si se aplicó, su acción), posponer o descartar. */
export function responderDiagnostico(d: Diagnostico, r: RespuestaDiagnostico): Diagnostico {
  // La respuesta nueva sustituye a la anterior.
  const resto = { ...d }
  delete resto.ley
  delete resto.accionAplicada
  if (r.estado !== 'respondido') return { ...resto, estado: r.estado }
  return { ...resto, estado: r.estado, ley: r.ley, ...(r.accion ? { accionAplicada: r.accion } : {}) }
}

/** Lo que Hoy señala: los pendientes de hábitos activos (los pospuestos esperan en su detalle). */
export function diagnosticosPendientes({ habitos, diagnosticos }: { habitos: Habito[]; diagnosticos: Diagnostico[] }) {
  return diagnosticos.flatMap((diagnostico) => {
    const habito = habitos.find((h) => h.id === diagnostico.habitoId)
    return diagnostico.estado === 'pendiente' && habito && !habito.archivado ? [{ diagnostico, habito }] : []
  })
}
