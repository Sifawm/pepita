# 03 · Triggers and reminders

**Principles from the book it touches:** 1st law (Make it obvious): **implementation intention** ("I will do X at time Y in place Z"), **habit stacking** ("after [A], I will do [B]"), environment design. Inverse: make it invisible.

## How each app handles it

| App | By time | By location | Stacking | Other |
|---|---|---|---|---|
| **Atoms** | One or several per day per habit | No (unconfirmed) | Yes, since v3.3 (mechanics unconfirmed) | **Time and place are part of creating the habit.** It's the only explicit implementation intention |
| **Habitify** | Several per habit, with a different schedule per weekday; can ring like an alarm | **Yes** (Plus/Pro), on arriving or leaving, with a radius | **Yes, by event**: alerts N minutes after completing another habit | Live Activity with a check on the lock screen. **Bad habits have no reminder, on purpose** |
| **Productive** | *Smart reminders* by time of day; per habit in premium | **Yes** (premium) | No | — |
| **Streaks** | Per task, with a "pending" alert | Not native (Shortcuts/NFC) | No | Siri can create and complete |
| **Fabulous** | Alarm per routine | No | Implicit: the routine is an ordered chain | Excess of marketing notifications (complaint) |
| **Routinery** | Alarm per routine | No | **The routine is a sequence of stacked habits** | A voice announces the next step |
| **Loop** | One per habit and days | No | No | **Doesn't alert if the period is already met.** Check or dismiss from the notification |
| **Beeminder** | Email, SMS, webhook, app | No | No | **"Zeno polling"**: reminders get more frequent as the deadline approaches |
| **Finch** | Per goal | No | No | The "day" starts 2 h before your wake-up time |
| **TickTick** | Up to 10 per habit | Tasks only | No | Log from the notification |
| **HabitNow** | Reminders and alarms | No | No | Complaints about alarms that don't ring |
| **Habitica, Way of Life, Strides, HabitShare, stickK** | Basic | No | No | — |

## Market patterns

- Time-based reminders are universal. **Notification reliability is one of the most repeated complaints** (HabitNow, Loop with battery saving, Routinery, stickK).
- **Real stacking** only exists in two forms:
  - *By event* (Habitify): alerts when the anchor habit is completed.
  - *By sequence* (Fabulous, Routinery): the ordered routine.
- Only Atoms captures the **implementation intention** (time + place) as structured data.
- Location is a premium feature (Habitify, Productive).

## Gaps and opportunities

- An **implementation intention phrase** generated from fields ("After pouring my coffee, in the kitchen, I'll read 1 page"). Shown in the reminder and on the habit's card.
- Explicitly offer three triggers: **time**, **anchor habit** (stacking) and **place**.
- An **environment design checklist** per habit ("leave the book on the pillow"), with a reminder the night before.
- Reminders that **don't bother** you if you've already met it and get more insistent if you've had a failure (so it doesn't become two).
