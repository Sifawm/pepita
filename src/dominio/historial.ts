import { diaLogico, periodoDe, sumarDias } from './calendario'
import { evaluarHabito, type EstadoPeriodo } from './evaluacion'
import type { Ajustes, Dia, Habito, Registro } from './tipos'

export interface DiaCalendario {
  dia: Dia
  /** Registros del hábito en ese día, del más antiguo al más reciente. */
  registros: Registro[]
  /** Estado del periodo que contiene el día; falta antes del inicio y después de hoy. */
  estado?: EstadoPeriodo
  /** Se puede registrar, corregir o deshacer: cualquier día desde el inicio hasta hoy. */
  editable: boolean
}

export interface MesCalendario {
  desde: Dia
  hasta: Dia
  dias: DiaCalendario[]
}

/** El mes natural que contiene `mes`, día a día. Editar un registro y volver a llamarla lo recalcula todo. */
export function calendarioHabito({
  habito,
  registros,
  mes,
  ahora,
  ajustes,
}: {
  habito: Habito
  registros: Registro[]
  mes: Dia
  ahora: Date
  ajustes: Ajustes
}): MesCalendario {
  const hoy = diaLogico(ahora, ajustes.horaCierre)
  const { periodos } = evaluarHabito({ habito, registros, ahora, ajustes })
  const propios = registros
    .filter((r) => r.habitoId === habito.id)
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  const { desde, hasta } = periodoDe(mes, 'mes')
  const dias: DiaCalendario[] = []
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    const editable = dia >= habito.fechaInicio && dia <= hoy
    dias.push({
      dia,
      registros: propios.filter((r) => r.dia === dia),
      // El primer periodo puede empezar antes del inicio (semana natural): antes del inicio no hay estado.
      estado: editable ? periodos.find((p) => p.desde <= dia && dia <= p.hasta)?.estado : undefined,
      editable,
    })
  }
  return { desde, hasta, dias }
}
