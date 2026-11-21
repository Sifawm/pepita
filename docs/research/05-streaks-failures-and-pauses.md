# 05 · Streaks, failures and pauses

**Principles from the book it touches:** "don't break the chain", **never miss twice**, the warning against Goodhart's law (the streak isn't the goal) and the plateau of latent potential.

## How each app handles it

| App | How the streak is computed | What happens on failure | Skip or pause |
|---|---|---|---|
| **Atoms** | Days met | **One miss doesn't break the streak; two in a row do.** Encourages you not to miss tomorrow. "We don't punish you" | Pause unconfirmed |
| **Streaks** | +1 per day met. Unscheduled days don't break it | A miss resets it to 0, except with the **optional "2-Day Rule"** (allows one miss, not two; shows a "2" indicator) | Pause task |
| **Habitify** | Daily: consecutive scheduled days. Weekly or monthly: **period streaks** (failed days don't break it if you meet the period) | *Fail* breaks it | **Skip** protects it. **Off Mode** freezes everything and silences reminders (vacation, illness), and can be scheduled |
| **Loop** | Current and best streaks, **but the main thing is "habit strength"** (see doc 06) | A miss after a long history barely subtracts | Skipped days (dash): don't change the score |
| **Way of Life** | Chains | Red | **Yellow skip** with an optional reason, neutral in stats |
| **Finch** | Counts the **days you open the app**, not whether you follow through | No penalty | **Repair** the streak with currency (*Rainbow Stones*) or a free *Repair Saver*; **Pause Mode** |
| **Fabulous** | Per habit | Some users say they had to restart the Journey | Skip keeps the streak. **No vacation** (requested) |
| **Productive** | Current and best streaks + *perfect days* | Counts as a miss at midnight | Pause or stop a habit |
| **Habitica** | Per *Daily* | **Punishment**: you lose HP according to difficulty. If you die, you lose a level, gold and gear. In a quest with your party, **you damage the whole party** | *Rest in the Inn* freezes damage |
| **Beeminder** | No streaks: the **red line** and the **safety buffer** (days you can do nothing) | **You derail and pay** ($5 → 10 → 30 → 90 → 270). A *legitimacy check* prompt and a dispute within 24 h. Optional *No-Excuses Mode* | Pauses subject to the **akrasia horizon** (7 days: making it easier takes a week to apply; making it harder is immediate) |
| **stickK** | — | You pay the period's stake. **Not reporting = failure** | No pauses. Only cancelled with a medical note |
| **Strides** | Streaks + **pace line** (green or red depending on whether you're on pace) | — | Skip |
| **TickTick** | According to the target frequency | Explicit "Unachieved" status | Unconfirmed |
| **Routinery** | Per routine | **Skipping a step doesn't break the routine** | Unconfirmed |
| **HabitNow, HabitShare** | Basic | — | Unconfirmed |

## Market patterns

- **There are three philosophies:**
  1. **Punishment**: Habitica (HP), Beeminder and stickK (money).
  2. **Binary streak**: Streaks and Productive. Produces the "I lost my 87-day streak" complaint.
  3. **Compassionate**: Atoms, Finch, Loop, Way of Life.
- **"Never miss twice"** is already implemented in Atoms (by default) and Streaks (optional).
- Handling pauses or vacations well takes three things: per-day *Skip* (neutral), per-habit pause and a **global pause** (Habitify Off Mode, Finch Pause Mode, Habitica Inn). Fabulous lacks it and gets complaints.
- Beeminder's **akrasia horizon** is the best known protection against the "in-the-moment self" that wants to lower the goal on impulse.

## Gaps and opportunities

- Make "never miss twice" the **core rule**. After a miss, the next day becomes a **"recovery day"** with its own UI and more insistent reminders.
- A **compassionate** main indicator (habit strength or accumulated votes) instead of the binary streak, without removing the streak.
- Tell apart **Skip** (justified, neutral), **Failure** and **Pause**.
- Use the akrasia horizon (or another cooling-off period) to **lower** habits or contracts.
