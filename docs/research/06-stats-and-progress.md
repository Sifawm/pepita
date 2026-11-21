# 06 · Stats and progress

**Principles from the book it touches:** 1% better (accumulated progress), plateau of latent potential (making unnoticed progress visible), Goodhart's law (don't turn the measure into the goal) and periodic review.

## How each app handles it

| App | What it shows |
|---|---|
| **Loop** | **Habit strength (score)**. Also: history, heatmap-style calendar, frequency by weekday and streaks. Formula in the next section |
| **Habitify** | The richest analytics: **consistency heatmap**, *Average Daily Score* (mean daily %), trend versus the previous period, None/Partial/Complete bar, rhythm by weekday, *Peak Focus Zones* by time of day, skipped versus failed, most skipped or failed habit, cards per area, bad habits report, weekly email. **Habi AI** looks for correlations |
| **Streaks** | Current and best streak, completion rate, **completion by day and hour**, calendar |
| **Atoms** | *Progress* tab: repetitions, **milestones with celebration**, streaks, today versus the rest of the week, *Perfect Days*. Complaint: the calendar only showed one week |
| **Way of Life** | Bar charts with a long-term **trend line**, distribution by weekday, *Trend* indicator ("habits that need attention"), weekly and monthly *Scoreboard* |
| **Strides** | Streaks, success rate, calendars, line and bar charts, **pace line**, overall report |
| **Beeminder** | Chart with the **red line** and the smoothed trend |
| **Productive** | Completion rate, weekly patterns, *perfect days*. Per habit, premium only |
| **Finch** | **Mood trends** crossed with goals, journal and questionnaires. Milestones per area |
| **Habitica** | Task color from red to blue (implicit strength) and per-task history |
| **TickTick** | Calendar, rate and streaks (criticized as shallow) |
| **HabitNow** | Streak, %, last 7 days and charts |
| **Fabulous, HabitShare, stickK** | Basic |

### Loop's "habit strength" formula

It's the industry reference for an indicator that forgives occasional misses (open source, `Score.kt`):

- Multiplier `m = 0.5^(√f / 13)`, where `f` is the frequency (1 = daily, 2/7 = twice a week).
- Each day: `score = previous_score · m + v · (1 − m)`. It's exponential smoothing with a half-life of about 13 days for a daily habit.
- `v` is the percentage met within the interval's window (for measurable habits, `sum / target`, capped at 1).
- Skipped days don't change the score.
- **Effect:** a perfect daily habit reaches 80% in a month, 96% in two and 99% in three. An isolated miss after a long history barely subtracts; frequent misses do sink the score.

## Market patterns

- The basics are universal: streaks, rate and calendar or heatmap.
- What actually adds value:
  - An indicator **that forgives** (Loop).
  - Long-term **trend** (Way of Life).
  - **Patterns** by day and hour (Streaks, Habitify).
  - **Correlations** with mood (Finch, Habitify AI).
- *Perfect days* (Atoms, Productive, Strides) are popular, but they reinforce "all or nothing".

## Gaps and opportunities

- A **vote counter per identity** as the main metric (see doc 02).
- A visualization of the **1% curve** or the plateau of latent potential, explaining why you don't see results yet.
- A **guided weekly or monthly review**: what worked, which habit needs to shrink or move to its 2-minute version.
- Beware of Goodhart's law: the main metric shouldn't invite cheating, for example checking habits just to keep the streak.
