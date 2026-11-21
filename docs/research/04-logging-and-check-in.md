# 04 · Logging and check-in

**Principles from the book it touches:** 4th law (Make it satisfying): **immediate** and **simple** tracking. The book recommends **automating** logging when possible and logging right after doing the habit.

## How each app handles it

| App | Logging gesture | Widgets / watch | Automatic | Retroactive |
|---|---|---|---|---|
| **Atoms** | **Hold down** the circle: it fills, shapes appear, it vibrates and plays a sound. The most polished interaction on the market | Widgets (unreliable) and Watch | *Daily Goals* get checked on reaching the goal. No Health | Yes, since v2.5 |
| **Streaks** | Hold down | Interactive widgets, Watch, Siri, Shortcuts, NFC | **80+ Apple Health data types + Screen Time**, also writes to Health | Unconfirmed |
| **Habitify** | Button by type ("Done", "+1", "Timer", "Log"). Swipe right completes, left *Skip/Fail* | Widgets, Watch, Live Activity, Siri | **Two-way Health, Health Connect, Strava, Fitbit, Screen Time, RescueTime, NFC, Zapier, API, MCP** | Yes (Journal) |
| **Way of Life** | Yes / No / Skip / Clear with **auto-advance** to the next habit (under 1 min a day) | Widgets, Siri, URL schemes | No | Yes, on the grid |
| **Loop** | Tap the day's box | 5 widget types | Tasker | Yes |
| **Productive** | Swipe + "Done" | Widgets, Watch | Contradictory | — |
| **Beeminder** | `day value "comment"` format via web, app, email, Slack or SMS | — | **"Autodata"** from dozens of services + API | Yes |
| **Routinery** | Timer per step with voice; pause, skip or adjust | Live Activity, Watch, AirPods | — | — |
| **TickTick** | Check; auto/manual amount | Widget | No | Unconfirmed |
| **HabitNow** | Check; built-in timers (when time is up you have to check it by hand) | Premium widgets | No | Unconfirmed |
| **Fabulous** | Checklist or step-by-step routine mode | Widget, Watch | Unconfirmed | Unconfirmed |
| **Finch** | Tap the goal and then the check; skip without penalty | Unconfirmed | No | Editable mood |
| **Habitica** | Check or +/− | Widgets | Third-party API only | Only "yesterday" before the day changes |
| **stickK** | Success or failure report per period; **not reporting counts as failure** | — | No | 24–72 h window |
| **Strides** | Swipe yes/no | Widgets, Watch, Siri | Health | Yes |
| **HabitShare** | Check | No | No | — |

## Market patterns

- **The fastest actions win.** Hold down (Atoms, Streaks), swipe (Habitify, Productive, Strides) or log from the notification or widget.
- **Automatic logging is what most sets an app apart** (Streaks, Habitify, Beeminder), but it depends on the platform (HealthKit on Apple, Health Connect on Android).
- **Widgets that don't update** is a repeated complaint about Atoms, Habitify and others.
- Retroactive logging took a while to reach Atoms and was a strong complaint. It must be there from the start.
- Quantitative: tell apart **adding** and **setting** the value (Habitify *Add/Set*).

## Gaps and opportunities

- **Immediate celebration** of the log (4th law), Atoms-style, but tied to the identity ("+1 vote for *reader*").
- Log the **minimum version** versus the **full version** with two gestures or two states.
- Decide explicitly what happens when you don't log (stickK: failure; Beeminder *Do Less*: worst case; most: nothing until midnight).
