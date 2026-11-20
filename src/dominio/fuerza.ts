import { sumarDias } from './calendario'
import { esVoto, type Periodo } from './evaluacion'
import type { Dia, Habito, Registro, Regla } from './tipos'
import { reglaEn } from './versiones'

export interface PuntoFuerza {
  dia: Dia
  /** De 0 a 1. */
  valor: number
}

const DIAS_PERIODO = { dia: 1, semana: 7, mes: 30 }

/** La ventana que mira cada día (sus días) y cuántas veces pide en ella; `f = veces / dias`. */
function ventana(habito: Habito, { frecuencia: f, cuantitativo: c }: Regla) {
  if (habito.tipo === 'evitar') return { dias: 1, veces: 1 }
  if (f.tipo === 'dias_semana') return { dias: 7, veces: f.dias.length }
  // Un cuantitativo pide su objetivo una vez por periodo (las `veces` no cuentan).
  return { dias: DIAS_PERIODO[f.periodo], veces: c ? 1 : f.veces }
}

/** Cumplimiento (de 0 a 1) en los registros de la ventana que acaba en el día. */
function cumplimiento(habito: Habito, { cuantitativo: c }: Regla, veces: number, registros: Registro[]) {
  if (habito.tipo === 'evitar') return registros.some((r) => r.tipo === 'recaida') ? 0 : 1
  if (!c) return Math.min(1, registros.filter(esVoto).length / veces)
  const objetivo = c.objetivo * veces
  const total = registros.reduce((n, r) => n + (r.tipo === 'valor' ? (r.valor ?? 0) : 0), 0)
  const v = c.modo === 'como_mucho' ? 1 - (total - objetivo) / objetivo : total / objetivo
  return Math.min(1, Math.max(0, v))
}

/**
 * Fuerza día a día desde `fechaInicio` hasta hoy (fórmula de Loop): `m = 0,5^(√f/13)` y cada día
 * `fuerza = fuerza·m + v·(1 − m)`, con `v` el cumplimiento en la ventana del periodo que acaba ese día.
 * Perdona los fallos aislados.
 */
export function serieFuerza(habito: Habito, registros: Registro[], periodos: Periodo[], hoy: Dia): PuntoFuerza[] {
  const porDia = Map.groupBy(registros, (r) => r.dia)
  const serie: PuntoFuerza[] = []
  let valor = 0
  let i = 0
  for (let dia = habito.fechaInicio; dia <= hoy; dia = sumarDias(dia, 1)) {
    while (periodos[i].hasta < dia) i++
    const { estado } = periodos[i]
    const regla = reglaEn(habito, dia)
    // Al evitar y en «como mucho» el éxito solo se sabe al cerrar: un periodo abierto aún no cuenta.
    const alCerrar = habito.tipo === 'evitar' || regla.cuantitativo?.modo === 'como_mucho'
    // Saltar o pausar es neutro: la fuerza no cambia.
    if (estado !== 'saltado' && estado !== 'pausado' && !(alCerrar && estado === 'en_curso')) {
      const { dias, veces } = ventana(habito, regla)
      const dentro = Array.from({ length: dias }, (_, d) => porDia.get(sumarDias(dia, -d)) ?? []).flat()
      const m = 0.5 ** (Math.sqrt(veces / dias) / 13)
      const nuevo = valor * m + cumplimiento(habito, regla, veces, dentro) * (1 - m)
      // Un periodo aún abierto puede subirla, pero no bajarla: falta tiempo para cumplir.
      if (estado !== 'en_curso' || nuevo > valor) valor = nuevo
    }
    serie.push({ dia, valor })
  }
  return serie
}
