# 06 · Estadísticas y progreso

**Principios del libro que toca:** mejora del 1 % (progreso acumulado), meseta del potencial latente (hacer visible el progreso que no se nota), ley de Goodhart (no convertir la medida en el objetivo) y revisión periódica.

## Cómo lo resuelve cada app

| App | Qué muestra |
|---|---|
| **Loop** | **Fuerza del hábito (score)**. Además: historial, calendario tipo heatmap, frecuencia por día de la semana y rachas. Fórmula en la sección siguiente |
| **Habitify** | La analítica más rica: **mapa de calor de constancia**, *Average Daily Score* (media del % diario), tendencia frente al periodo anterior, barra Nada/Parcial/Completo, ritmo por día de la semana, *Peak Focus Zones* por momento del día, saltados frente a fallados, hábito más saltado o fallado, tarjetas por área, informe de malos hábitos, email semanal. **Habi AI** busca correlaciones |
| **Streaks** | Racha actual y mejor, tasa de cumplimiento, **cumplimiento por día y hora**, calendario |
| **Atoms** | Pestaña *Progress*: repeticiones, **hitos con celebración**, rachas, el día de hoy frente al resto de la semana, *Perfect Days*. Queja: el calendario solo mostraba una semana |
| **Way of Life** | Gráficos de barras con **línea de tendencia** a largo plazo, distribución por día de la semana, indicador *Trend* («hábitos que necesitan atención»), *Scoreboard* semanal y mensual |
| **Strides** | Rachas, tasa de éxito, calendarios, gráficos de línea y barras, **pace line**, informe global |
| **Beeminder** | Gráfico con la **línea roja** y la tendencia suavizada |
| **Productive** | Tasa de completado, patrones semanales, *perfect days*. Por hábito, solo en premium |
| **Finch** | **Tendencias de ánimo** cruzadas con objetivos, diario y cuestionarios. Hitos por área |
| **Habitica** | Color de la tarea de rojo a azul (fuerza implícita) e historial por tarea |
| **TickTick** | Calendario, tasa y rachas (criticada por superficial) |
| **HabitNow** | Racha, %, últimos 7 días y gráficos |
| **Fabulous, HabitShare, stickK** | Básicas |

### La fórmula de la «fuerza del hábito» de Loop

Es la referencia del sector para un indicador que perdona los fallos puntuales (código abierto, `Score.kt`):

- Multiplicador `m = 0,5^(√f / 13)`, donde `f` es la frecuencia (1 = diario, 2/7 = dos veces por semana).
- Cada día: `score = score_anterior · m + v · (1 − m)`. Es un suavizado exponencial con una vida media de unos 13 días en un hábito diario.
- `v` es el porcentaje cumplido en la ventana del intervalo (en hábitos medibles, `suma / objetivo`, acotado a 1).
- Los días saltados no cambian el score.
- **Efecto:** un hábito diario perfecto llega al 80 % en un mes, al 96 % en dos y al 99 % en tres. Un fallo aislado tras un historial largo apenas resta; los fallos frecuentes sí hunden el score.

## Patrones del mercado

- Lo básico es universal: rachas, tasa y calendario o heatmap.
- Lo que aporta valor de verdad:
  - Un indicador **que perdona** (Loop).
  - **Tendencia** a largo plazo (Way of Life).
  - **Patrones** por día y hora (Streaks, Habitify).
  - **Correlaciones** con el ánimo (Finch, Habitify AI).
- Los *Perfect days* (Atoms, Productive, Strides) son populares, pero refuerzan el «todo o nada».

## Huecos y oportunidades

- Un **contador de votos por identidad** como métrica principal (ver doc 02).
- Una visualización de la **curva del 1 %** o de la meseta del potencial latente, que explique por qué todavía no ves resultados.
- Una **revisión semanal o mensual guiada**: qué funcionó, qué hábito necesita reducirse o pasar a su versión de 2 minutos.
- Cuidado con la ley de Goodhart: que la métrica principal no invite a hacer trampas, por ejemplo marcar hábitos solo para no perder la racha.
