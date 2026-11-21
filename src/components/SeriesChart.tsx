import { useTranslation } from 'react-i18next'
import type { Day } from '@/domain'
import { formatDay } from '@/lib/utils'

const WIDTH = 300
const HEIGHT = 120
const ms = (day: Day) => Date.parse(day)

/**
 * Step curve of a per-day series, in dependency-free SVG. Colors come from theme tokens
 * (`text-primary`), so it works in light and dark. Text alternative: `summary` (accessible name
 * and visible caption) and the expandable data table.
 */
export function SeriesChart({
  points,
  end,
  summary,
  columns,
  max = Math.max(...points.map((p) => p.value), 1),
}: {
  /** In day order; each value holds until the next point. */
  points: { day: Day; value: number }[]
  /** Last day of the axis (usually today): the curve extends up to it. */
  end: Day
  /** One sentence with the essentials: it's the chart's name for the screen reader. */
  summary: string
  /** Data table headers: [day, value]. */
  columns: [string, string]
  /** Top of the vertical axis (by default, the largest value). */
  max?: number
}) {
  const { t, i18n } = useTranslation()
  const start = points[0].day
  const last = end > start ? end : points.at(-1)!.day
  const span = Math.max(ms(last) - ms(start), 1)
  const x = (day: Day) => ((ms(day) - ms(start)) / span) * WIDTH
  const y = (value: number) => HEIGHT - (value / max) * HEIGHT
  const line = `M0 ${HEIGHT} ` + points.map((p) => `H${x(p.day)} V${y(p.value)}`).join(' ') + ` H${WIDTH}`

  return (
    <figure className="space-y-2">
      <div className="flex gap-2">
        <span className="text-xs text-muted-foreground" aria-hidden>
          {max}
        </span>
        <div className="flex-1">
          <svg role="img" aria-label={summary} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible text-primary">
            <line x1={0} y1={HEIGHT} x2={WIDTH} y2={HEIGHT} className="stroke-border" vectorEffect="non-scaling-stroke" />
            <path d={`${line} V${HEIGHT} Z`} className="fill-current opacity-15" />
            <path d={line} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between text-xs text-muted-foreground" aria-hidden>
            <span>{formatDay(start, i18n.language)}</span>
            <span>{formatDay(last, i18n.language)}</span>
          </div>
        </div>
      </div>
      <figcaption className="text-sm text-muted-foreground">{summary}</figcaption>
      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-md px-1 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
          {t('chart.data')}
        </summary>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th scope="col" className="py-1 font-semibold">
                {columns[0]}
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                {columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.day} className="border-t">
                <td className="py-1">{formatDay(p.day, i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                <td className="py-1 text-right tabular-nums">{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
