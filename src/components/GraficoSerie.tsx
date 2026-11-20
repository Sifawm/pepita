import { useTranslation } from 'react-i18next'
import type { Dia } from '@/dominio'
import { fechaDia } from '@/lib/utils'

const ANCHO = 300
const ALTO = 120
const ms = (dia: Dia) => Date.parse(dia)

/**
 * Curva escalonada de una serie por días, en SVG sin dependencias. Colores por tokens del tema
 * (`text-primary`), así que vale en claro y oscuro. Alternativa textual: `resumen` (nombre accesible
 * y pie visible) y la tabla de datos desplegable.
 */
export function GraficoSerie({
  puntos,
  hasta,
  resumen,
  columnas,
  maximo = Math.max(...puntos.map((p) => p.valor), 1),
}: {
  /** En orden de día; cada valor rige hasta el punto siguiente. */
  puntos: { dia: Dia; valor: number }[]
  /** Último día del eje (normalmente hoy): la curva se alarga hasta él. */
  hasta: Dia
  /** Una frase con lo esencial: es el nombre del gráfico para el lector de pantalla. */
  resumen: string
  /** Cabeceras de la tabla de datos: [día, valor]. */
  columnas: [string, string]
  /** Tope del eje vertical (por defecto, el mayor valor). */
  maximo?: number
}) {
  const { t, i18n } = useTranslation()
  const desde = puntos[0].dia
  const fin = hasta > desde ? hasta : puntos.at(-1)!.dia
  const tramo = Math.max(ms(fin) - ms(desde), 1)
  const x = (dia: Dia) => ((ms(dia) - ms(desde)) / tramo) * ANCHO
  const y = (valor: number) => ALTO - (valor / maximo) * ALTO
  const linea = `M0 ${ALTO} ` + puntos.map((p) => `H${x(p.dia)} V${y(p.valor)}`).join(' ') + ` H${ANCHO}`

  return (
    <figure className="space-y-2">
      <div className="flex gap-2">
        <span className="text-xs text-muted-foreground" aria-hidden>
          {maximo}
        </span>
        <div className="flex-1">
          <svg
            role="img"
            aria-label={resumen}
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
            className="h-40 w-full overflow-visible text-primary"
          >
            <line x1={0} y1={ALTO} x2={ANCHO} y2={ALTO} className="stroke-border" vectorEffect="non-scaling-stroke" />
            <path d={`${linea} V${ALTO} Z`} className="fill-current opacity-15" />
            <path d={linea} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between text-xs text-muted-foreground" aria-hidden>
            <span>{fechaDia(desde, i18n.language)}</span>
            <span>{fechaDia(fin, i18n.language)}</span>
          </div>
        </div>
      </div>
      <figcaption className="text-sm text-muted-foreground">{resumen}</figcaption>
      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-md px-1 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
          {t('grafico.datos')}
        </summary>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th scope="col" className="py-1 font-semibold">{columnas[0]}</th>
              <th scope="col" className="py-1 text-right font-semibold">{columnas[1]}</th>
            </tr>
          </thead>
          <tbody>
            {puntos.map((p) => (
              <tr key={p.dia} className="border-t">
                <td className="py-1">{fechaDia(p.dia, i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                <td className="py-1 text-right tabular-nums">{p.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
