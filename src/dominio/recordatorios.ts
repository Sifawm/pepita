// Recordatorios: el fichero .ics para el calendario del móvil.
import { diaDeLaSemana, sumarDias } from './calendario'
import { componerHoy } from './hoy'
import { anclaDe, fraseIntencion, type FraseIntencion } from './intencion'
import type { Ajustes, Habito, Hora, Identidad, Registro } from './tipos'

/** Cómo se escribe la frase en el idioma de la persona: el núcleo no traduce. */
export type TextoFrase = (frase: FraseIntencion) => string

/** Escapa un valor TEXT (RFC 5545 §3.3.11). */
const escapar = (v: string) => v.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n')

/** Pliega a 75 octetos por línea sin partir un carácter (RFC 5545 §3.1). */
function plegar(linea: string) {
  const trozos: string[] = []
  let actual = ''
  let octetos = 0
  for (const c of linea) {
    const n = new TextEncoder().encode(c).length
    // La primera línea admite 75; las de continuación, 74 más el espacio inicial.
    if (octetos + n > (trozos.length ? 74 : 75)) {
      trozos.push(actual)
      actual = ''
      octetos = 0
    }
    actual += c
    octetos += n
  }
  return [...trozos, actual].join('\r\n ')
}

const BYDAY = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

/**
 * RRULE y primer día: `dias_semana` semanal esos días (DTSTART en el primero, como pide el RFC); el
 * resto, diario. Una hora antes del cierre es ya el día natural siguiente: todo se corre un día.
 */
function repeticion({ frecuencia: f, fechaInicio }: Habito, hora: Hora, { horaCierre }: Ajustes) {
  const corre = hora < horaCierre ? 1 : 0
  if (f.tipo !== 'dias_semana') return { rrule: 'FREQ=DAILY', desde: sumarDias(fechaInicio, corre) }
  let desde = fechaInicio
  while (!f.dias.includes(diaDeLaSemana(desde))) desde = sumarDias(desde, 1)
  const dias = f.dias.map((d) => ((d - 1 + corre) % 7) + 1).sort()
  return { rrule: `FREQ=WEEKLY;BYDAY=${dias.map((d) => BYDAY[d]).join(',')}`, desde: sumarDias(desde, corre) }
}

/** Los hábitos a evitar nunca avisan (ni por su cuenta ni en la cadena de otro). */
const avisa = (h: Habito) => !h.archivado && h.tipo !== 'evitar'

/** Los anclados a `ancla`, a cualquier nivel, en el orden de la cadena (cada uno seguido de los suyos). */
const anclados = (ancla: Habito, habitos: Habito[]): Habito[] =>
  habitos.filter((h) => avisa(h) && anclaDe(h, habitos) === ancla).flatMap((h) => [h, ...anclados(h, habitos)])

const horaDe = (h: Habito) => {
  const c = h.intencion?.cuando
  return c && 'hora' in c ? c.hora : undefined
}

/** `20260315T080509Z` */
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

/**
 * Un VEVENT por cada hábito con hora propia, que se repite según su frecuencia y avisa a esa hora.
 * El título es la frase de intención (`texto` la pone en el idioma de la persona).
 */
export function recordatoriosIcs({ habitos, ahora, ajustes, texto }: { habitos: Habito[]; ahora: Date; ajustes: Ajustes; texto: TextoFrase }) {
  const eventos = habitos.flatMap((h) => {
    const hora = horaDe(h)
    if (!hora || !avisa(h)) return []
    const titulo = texto(fraseIntencion(h, habitos)!)
    const cadena = anclados(h, habitos).map((a) => texto(fraseIntencion(a, habitos)!))
    const { rrule, desde } = repeticion(h, hora, ajustes)
    return [
      'BEGIN:VEVENT',
      `UID:${h.id}@pepita`,
      `DTSTAMP:${utc(ahora)}`,
      `DTSTART:${desde.replace(/-/g, '')}T${hora.replace(':', '')}00`,
      `RRULE:${rrule}`,
      `SUMMARY:${escapar(titulo)}`,
      ...(cadena.length ? [`DESCRIPTION:${escapar(cadena.join('\n'))}`] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:PT0S',
      `DESCRIPTION:${escapar(titulo)}`,
      'END:VALARM',
      'END:VEVENT',
    ]
  })
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pepita//Pepita//ES', 'CALSCALE:GREGORIAN', ...eventos, 'END:VCALENDAR']
  return lineas.map(plegar).join('\r\n') + '\r\n'
}

export interface Aviso {
  habito: Habito
  /** Cuándo avisar: la hora del hábito en el día lógico de hoy (pasado el cierre, ya en el día natural siguiente). */
  instante: Date
  frase: FraseIntencion
  /** Los anclados aún pendientes, en orden de cadena. */
  anclados: FraseIntencion[]
}

/**
 * Los avisos que quedan hoy: un hábito con hora que toca hoy y aún está pendiente (ni hecho, ni
 * saltado, ni en pausa). La interfaz los programa en memoria mientras la app está abierta.
 */
export function avisosDeHoy(ctx: { habitos: Habito[]; identidades: Identidad[]; registros: Registro[]; ahora: Date; ajustes: Ajustes }): Aviso[] {
  const { habitos, ahora, ajustes } = ctx
  const hoy = componerHoy(ctx)
  const pendientes = hoy.habitos
    .filter((t) => !t.hecho && !t.pausa && t.periodo.estado !== 'saltado' && avisa(t.habito))
    .map((t) => t.habito)
  const [a, m, d] = hoy.dia.split('-').map(Number)
  const avisos = pendientes.flatMap((habito) => {
    const hora = horaDe(habito)
    if (!hora) return []
    const [hh, mm] = hora.split(':').map(Number)
    const instante = new Date(a, m - 1, d + (hora < ajustes.horaCierre ? 1 : 0), hh, mm)
    if (instante <= ahora) return []
    const cadena = anclados(habito, habitos).filter((x) => pendientes.includes(x))
    return [{ habito, instante, frase: fraseIntencion(habito, habitos)!, anclados: cadena.map((x) => fraseIntencion(x, habitos)!) }]
  })
  return avisos.sort((x, y) => x.instante.getTime() - y.instante.getTime())
}
