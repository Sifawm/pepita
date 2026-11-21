# Pepita v1: specification

> Source of truth for building v1. The decisions and their rationale are in [decisions.md](decisions.md) (R·x references). The market research is in [research/](research/README.md).

## Domain vocabulary

| Term | Meaning |
|---|---|
| **Identity** | The kind of person you want to be ("I'm a person who reads"). Groups habits and accumulates votes. There's a special identity, **General**, for habits without an identity. |
| **Habit** | A behavior with a type, frequency, minimum and full version, and intention. Belongs to an identity. |
| **Type** | `yes/no`, `quantitative` ("at least X" or "at most X") or `avoid`. |
| **Minimum / full version** | The 2-minute version and the ideal version of the habit. Both count as a vote. |
| **Intention** | **When** (a time, "after [habit]" or "after [free action]") and **Where**. Together they produce the intention phrase. |
| **Anchor** | The habit after which another one is done (stacking). |
| **Period** | The unit being evaluated: a day, a week or a month, or each specific day of the week. |
| **Logical day** | The day according to the **day cutoff** (04:00 by default). A log at 01:00 counts for the previous day. |
| **Log** | Each entry made by the user: minimum version, full version, value, skip or relapse. |
| **Vote** | +1 for an identity for each completed action. Failures don't subtract votes. |
| **Strength** | 0-to-1 indicator per habit (exponential smoothing, Loop's formula). Forgives isolated failures. |
| **Failure** | A scheduled, already closed period that wasn't met, skipped or paused. |
| **Recovery** | State of the current period when the previous one was a failure. |
| **Diagnosis** | Opens after two failures in a row. Asks which law failed and offers an action. |
| **Skip** | A period deliberately marked as neutral. |
| **Pause** | A date range without evaluation. Can be per habit or global ("vacation"). |
| **Relapse** | A log on a habit to *avoid*. Turns that day into a failure. |
| **Milestone** | An identity's vote threshold: 10, 25, 50, 100, 250, 500 or 1000. |
| **Weekly review** | Screen to look back on the week. Has a printable view. |

## Problem Statement

I want to improve my habits following the *Atomic Habits* method. The existing apps force me to choose:

- Some are neutral trackers (Habitify, Streaks, Loop). They log well, but don't work on any of what makes the book useful: identity, the 2-minute version, intention, environment, or a method to break habits.
- The official app (Atoms) stays on the surface, limits habits to one or six, is paid and leaves the data in third-party hands.

On top of that, almost all of them punish failure with all-or-nothing streaks. One bad week makes you feel you've lost all your progress, and that's exactly what leads to giving up.

I also want my data to be mine: no accounts, no app stores and no dependency on someone else's server. And I want to be able to show my progress to my therapist.

## Solution

**Pepita** is an open-source (AGPL-3.0), *local-first* PWA, in Spanish and English, that acts as a "kind conscience". It guides you through the book's method and lets you skip any step, so it works both for following the method to the letter and for a looser use.

- Every habit hangs from an **identity**, and every completed action is a **vote** for it. Votes never go down.
- Every habit has a 2-minute **minimum version** that counts the same as the full one. Doing it must be the easiest thing: a single tap.
- The core rule is **"never miss twice"**. A failure puts the habit in recovery. Two failures in a row open a 4-laws diagnosis, and the diagnosis proposes a concrete change applied with one tap.
- Habits to **avoid** have their own inverse-laws wizard and are logged through relapses.
- The **weekly review** gathers what matters and can be printed or saved as PDF.
- All data lives on the device. There's full export and import, and reminders are exported to the system calendar (.ics).

## User Stories

### Onboarding

1. As a user, I want to choose the language (Spanish or English) when opening the app for the first time, to understand everything from the start.
2. As a user, I want the app to detect my browser's language as the initial suggestion, so I don't have to configure it.
3. As a user, I want the first question to be who I want to be, so my habits start from an identity.
4. As a user, I want to create a single habit during onboarding, so I don't get overwhelmed at the start.
5. As a user, I want to log the minimum version of my first habit when finishing onboarding, to get my first vote in under 2 minutes.
6. As a user, I want to use the app without creating any account, so my data never leaves my device.
7. As an iPhone user, I want to be told how to install the app on the home screen, so Safari doesn't delete my data.
8. As a user, I want the app to request persistent storage from the browser, so my data isn't deleted for lack of space.
9. As a user, I want to be able to skip any onboarding step except the habit's name, to start quickly if I don't feel like thinking right now.

### Identities

10. As a user, I want to create several identities, to work on different facets of my life.
11. As a user, I want to write each identity as a sentence ("I'm a person who…"), to reinforce how I see myself.
12. As a user, I want to see each identity's total accumulated votes, to notice progress even if I don't see results yet.
13. As a user, I want to see an accumulated votes curve per identity, to see how it grows over time.
14. As a user, I want to rename an identity, to adjust it when the way I see myself changes.
15. As a user, I want to archive an identity without losing its votes or habits, to retire it without erasing my history.
16. As a user, I want habits without an identity to go to "General" and also add votes, so I'm not forced to define an identity.
17. As a user, I want a special celebration when reaching 10, 25, 50, 100, 250, 500 and 1000 votes on an identity, to feel the milestones.
18. As a user, I want each milestone to be celebrated only once, even if I later edit logs, so I don't get repeated celebrations.

### Creating and editing habits (wizard)

19. As a user, I want a wizard that guides me step by step through the book's method when creating a habit, so my habits are well set up.
20. As a user, I want to be able to press "Not now" on any optional wizard step, to use the app more loosely whenever I want.
21. As a user, I want to choose which identity a habit belongs to, so its votes add up where they belong.
22. As a user, I want to choose the habit type (yes/no, quantitative or avoid), to log each behavior in the way that makes sense.
23. As a user, I want to define a quantitative habit with a unit and target ("at least 20 pages"), to measure amounts.
24. As a user, I want to define a quantitative habit with a limit ("at most 2 coffees"), to moderate something without having to eliminate it.
25. As a user, I want to choose the frequency as "X times per day, week or month", so I'm not tied to doing it daily.
26. As a user, I want to choose specific days of the week as the frequency, for habits that only apply on those days.
27. As a user, I want to write the minimum (2-minute) and full version of each habit, to have a decent option on bad days.
28. As a user, I want the minimum version of "at least X" quantitative habits to be a reduced target, so it also counts as a vote.
29. As a user, I want to state **when** I do the habit (a time, after another habit or after a free action), so it has a clear trigger.
30. As a user, I want to state **where** I do the habit, to complete my implementation intention.
31. As a user, I want to see the generated phrase ("After pouring my coffee, in the kitchen, I'll read 1 page"), to have my intention clear and visible.
32. As a user, I want to add a "Prime your environment" list, to reduce friction before starting.
33. As a user, I want to add a "Paired reward" ("I only listen to my podcast while I walk"), to make the habit more attractive.
34. As a user, I want a habit to *avoid* to ask me which cue I'll remove, which friction I'll add and what I'll do instead, to break it with a method.
35. As a user, I want to see brief tips from Pepita on each wizard step, to understand why it's asking.
36. As a user, I want to edit any field of a habit after creating it, to adjust it when I learn something.
37. As a user, I want changing the frequency or target not to rewrite how past periods were evaluated, so my history stays true.
38. As a user, I want to archive a habit keeping its history and votes, to drop it without losing what I achieved.
39. As a user, I want to delete a habit with explicit confirmation, to remove something created by mistake.
40. As a user, I want to create as many habits and identities as I want, with no limits.

### Today screen and logging

41. As a user, I want a Today screen with the habits that are due, to know what to do at a glance.
42. As a user, I want to see recovering habits at the very top, highlighted, so I don't miss twice.
43. As a user, I want to see habits sorted by their time, to follow the rhythm of my day.
44. As a user, I want to see each anchored habit right below its anchor, to see my habit chains.
45. As a user, I want to see habits without a time at the end, to keep them in mind without getting in the way.
46. As a user, I want to filter Today by identity, to focus on one facet.
47. As a user, I want to see the votes I have today, to feel the day's progress.
48. As a user, I want to log the minimum version with a tap, so showing up is the easiest thing.
49. As a user, I want to log the full version with a long press, to tell it apart without another button.
50. As a user, I want to enter a value (added to what I already had) on quantitative habits, to log partial amounts throughout the day.
51. As a user, I want to see a "+1 vote · [identity]" celebration when logging, so the habit feels satisfying in the moment.
52. As a user, I want to add an optional note to any log, to remember the context.
53. As a user, I want to undo a log made by mistake, to keep the data faithful.
54. As a user, I want to see the intention phrase, environment and paired reward on the habit's card, to keep them in mind when doing it.
55. As a user, I want to see how many I've done out of how many on "X times per period" habits, to know how much is left.
56. As a user, I want to log a relapse on a habit to *avoid*, with its optional trigger, to learn what causes it.
57. As a user, I want each day without a relapse to add a vote only when it closes, so I don't have to log something I didn't do.

### Logical days, forgetting and retroactive editing

58. As a user, I want to configure the day cutoff (04:00 by default), so staying up late doesn't count as the next day.
59. As a user, I want a period without a log to count as a failure only when it closes, to have the whole period to meet it.
60. As a user, I want to log or fix any past day, so forgetting doesn't turn into a false failure.
61. As a user, I want fixing the past to recompute votes, strength, streaks, recoveries and diagnoses, so everything adds up.

### Failures, recovery and diagnosis

62. As a user, I want an isolated failure not to break my streak, so one bad day doesn't make me feel I've lost everything.
63. As a user, I want the next period after a failure to be marked as recovery and suggest the minimum version, so I don't miss twice.
64. As a user, I want the app to propose a diagnosis after two failures in a row, to understand what isn't working instead of blaming myself.
65. As a user, I want to answer the diagnosis by choosing one of four causes (I didn't notice / I didn't feel like it / it was hard / it didn't feel worth it), to identify which law is failing.
66. As a user, I want each cause to offer me a concrete action applicable with one tap, to fix the habit effortlessly.
67. As a user, I want to be able to snooze or dismiss a diagnosis, so I don't feel forced.
68. As a user, I want to optionally note the reason for any failure according to the 4 laws, to have data for the review.
69. As a user, I want Pepita's copy never to guilt-trip me, so the app is a support and not a judge.

### Skips and pauses

70. As a user, I want to skip a period with an optional reason, so a justified day doesn't count as a failure.
71. As a user, I want a skip to neither add nor subtract votes, strength or streak, so it's truly neutral.
72. As a user, I want to pause a habit between two dates, for periods when it doesn't apply.
73. As a user, I want to start a global pause with an end date, to go on vacation or be sick without worrying.
74. As a user, I want the global pause to end on its own on its date, so I don't forget to reactivate anything.

### Progress and stats

75. As a user, I want to see each habit's strength over time, to see how settled it's becoming.
76. As a user, I want to see a heatmap-style calendar per habit, to spot patterns at a glance.
77. As a user, I want to see each habit's minimum vs. full version ratio, to know if I'm ready to raise the bar.
78. As a user, I want to see each habit's current and best streak, in the background, as a reference without being the main thing.

### Progressive scaling (Goldilocks)

79. As a user, I want the app to suggest raising the bar when a habit has had high strength for about 3 weeks, to keep the challenge just right.
80. As a user, I want the app to suggest sticking to the minimum version after a difficulty diagnosis, to regain consistency.
81. As a user, I want suggestions never to change anything without my permission and to be dismissable, to stay in control.
82. As a user, I want a dismissed suggestion not to come back for a while, so I don't feel pressured.

### Weekly review and report

83. As a user, I want an optional weekly review showing the week's votes per identity, to close the week with perspective.
84. As a user, I want to see recovering habits and pending diagnoses in the review, to attend to what needs attention.
85. As a user, I want to see progression suggestions in the review, to decide adjustments calmly.
86. As a user, I want the review to gently remind me of the method fields I left empty, to go back to the book whenever I want.
87. As a user, I want to write a free note in each review, to reflect.
88. As a user, I want a printable or PDF view of the review, choosing the period and what to include, to share it with my therapist.

### Reminders

89. As a user, I want to export my reminders to an .ics file with an alarm and the intention phrase, to get reliable alerts from my phone's calendar without a server.
90. As a user, I want anchored habits to appear in the description of their anchor's reminder, to remember the whole chain.
91. As a user, I want to get notifications while the app is open, if I give permission, to have alerts without configuring anything else.

### Data and backups

92. As a user, I want to export all my data as JSON, to have a full backup.
93. As a user, I want to export my logs as CSV, to analyze them in a spreadsheet.
94. As a user, I want to import a JSON backup with validation and confirmation, to restore my data or move it to another device.
95. As a user, I want an invalid import to be rejected without touching my current data, so I don't lose anything because of a corrupt file.
96. As a user, I want a kind reminder if I've gone more than 7 days without a backup, so I don't lose data.
97. As a user, I want the app to work offline, to use it anywhere.
98. As a user, I want the app to make no network calls and have no telemetry, to trust that my data is only mine.

### Settings, accessibility and appearance

99. As a user, I want to change the language at any time, to use the app as I prefer.
100. As a user, I want the app to follow the system's light or dark theme, to use it comfortably at night.
101. As a user, I want the app to meet accessibility level AA (contrast, touch target sizes, visible focus, an alternative to the long press for screen readers), to use it with any ability.
102. As someone who wants to host their own instance, I want to serve the app as static files on any server, so I don't depend on the public instance.
103. As a contributor, I want the domain rules to be separate from the UI and covered by tests, to change them safely.

## Implementation Decisions

### Stack and deployment
- React + TypeScript + Vite + Tailwind + **shadcn/ui** (with a custom Pepita theme), **Dexie** over IndexedDB, **vite-plugin-pwa** (offline precache, manifest and install) and **i18next** (es/en, with plurals).
- **Hash** routing, so it works on GitHub Pages without rewrites.
- Static deployment on **GitHub Pages** via GitHub Actions. **AGPL-3.0** license.
- Zero network calls at runtime, except downloading the app itself. Fonts and icons are bundled.

### Modules
1. **Domain core** (pure: no React, no Dexie, no implicit `Date.now()`; takes `now` and `settings` as parameters). It's the only unit with logic and the only one tested. It exposes:
   - **Calendar**: logical day according to the day cutoff and period computation (the week starts on Monday).
   - **Habit evaluation**: given a habit, its logs, the settings and the current instant, returns the list of periods with their status (`done_minimum`, `done_full`, `failed`, `skipped`, `paused`, `in_progress`, `not_scheduled`), votes, current and best streak, strength series, whether it's recovering, whether it has a pending diagnosis, the minimum vs. full ratio, and the active progression suggestion.
   - **Identity summary**: total votes, accumulated series, and milestones reached and pending celebration.
   - **Today composition**: ordering (recovery → by time, with anchored habits after their anchor → no time), identity filter and votes of the day.
   - **Weekly review**: the week's aggregated data.
   - **Intention phrase**: returns a structure (not text); the UI translates it.
   - **.ics generator**: iCalendar text from habits and settings.
   - **Export and import**: serializes and **strictly validates** the import (it's a trust boundary).
   - **CSV**: logs in a flat format.
2. **Persistence**: Dexie database with the schema's tables and reactive queries. No business logic.
3. **UI**: screens Onboarding, Today, Habit wizard (create and edit), Habit detail, Identities (list and detail), Diagnosis (modal), Weekly review (with a printable view via print CSS), Settings and Archived.
4. **PWA**: manifest, service worker, `navigator.storage.persist()`, iOS install guide and backup reminder.
5. **i18n**: all copy, including Pepita's ~20 microcopy texts, in es/en language files from day one.

### Schema (version 1)

Every record has `id` (UUID) and `createdAt`. Day dates are stored as `YYYY-MM-DD` (logical day).

- **Settings**: `language`, `dayCutoff` (default `"04:00"`), `globalPause` (`{start, end}` or missing), `lastBackup`, `notifications` (enabled or not).
- **Identity**: `name`, `isGeneral`, `archived`, `order`.
- **Habit**:
  - `identityId`, `name`.
  - `type`: `yes_no` | `quantitative` | `avoid`.
  - `quantitative`: `{unit, target, minTarget?, mode: at_least | at_most}`.
  - `frequency`: `{type: times_per_period, times, period: day | week | month}` | `{type: weekdays, days: [1..7]}`.
  - `minimumVersion`, `fullVersion`.
  - `intention`: `{when: {time} | {afterHabitId} | {afterAction: text}, where?}`.
  - `environment` (list), `pairedReward`.
  - `inverseLaws`: `{cue, friction, substitute}`, only on `avoid`.
  - `pauses`: list of `{start, end}`.
  - `startDate`, `archived`, `order`.
  - **`versions`**: history of frequency and target with their validity date, to evaluate the past with the rules that applied then (story 37).
- **Log**: `habitId`, `day`, `type` (`minimum` | `full` | `value` | `skip` | `relapse`), `value?`, `note?`, `reason?` (skip) and `trigger?` (relapse).
- **FailureNote**: `habitId`, `period`, `law?` (1–4), `note?`.
- **Diagnosis**: `habitId`, `triggerPeriod`, `law?`, `status` (`pending` | `answered` | `dismissed` | `snoozed`), `appliedAction?`.
- **CelebratedMilestone**: `identityId`, `threshold`.
- **DismissedSuggestion**: `habitId`, `type` (`raise` | `lower`), `until`.
- **WeeklyReview**: `week` (Monday of that week), `note`.

The JSON export carries `app: "pepita"`, `schemaVersion` and `exportedAt`. The import **replaces** all data, after confirmation. Schema migrations go through Dexie versions.

### Domain rules
- **Logical day**: `day(instant) = date(instant − dayCutoff)`.
- **Periods**:
  - `weekdays`: each marked day is a period that requires 1.
  - `times_per_period`: calendar day, week (Monday to Sunday) or month periods that require `times`.
  - Only periods from `startDate` on are evaluated.
- **Met**:
  - `yes_no`: as many `minimum` or `full` logs as `times`. It's "full" if all of them are; otherwise, "minimum".
  - `quantitative at_least`: if the sum ≥ `target`, full; if the sum ≥ `minTarget`, minimum.
  - `quantitative at_most`: if the sum ≤ `target` at close. **A period without logs counts as met**: just like with *avoid*, the excess is logged, not the success.
  - `avoid`: the period is the day; it's met if it closes without a relapse.
- **Failure**: a closed period that isn't met, skipped or paused (habit or global).
- **Votes**:
  - `yes_no`: +1 for each `minimum` or `full` log, also outside scheduled days.
  - `quantitative`: +1 per met period.
  - `avoid`: +1 per clean day already closed.
  - Votes are never subtracted for a failure; they only change if logs are edited.
- **Recovery**: the current period is in recovery if the last closed, evaluable period was a failure. Skips and pauses are ignored when looking for "the previous one".
- **Streak**: counts consecutive met periods. Skips and pauses are ignored. An isolated failure doesn't add but doesn't break it either; **the second consecutive failure resets it to 0**.
- **Diagnosis**: a `pending` one is created when two consecutive failures happen, at most one per streak break. Actions per law:
  - 1st: edit When and Where, or export the .ics.
  - 2nd: add a paired reward, or edit the identity.
  - 3rd: enable minimum-only mode (a `lower` suggestion) or edit the environment.
  - 4th: open the vote counter, or pause or archive.
- **Strength** (reimplementation of Loop's formula):
  - `m = 0.5^(√f / 13)`, where `f` = `times / period days` (day = 1, week = 7, month = 30) or `number of days / 7`.
  - Each day: `strength = previous_strength · m + v · (1 − m)`.
  - `v` is the completion within the interval's window, clamped to [0, 1]. With `at_most`, `v = 1 − (sum − target)/target`, clamped to [0, 1].
  - Skipped or paused days leave strength unchanged.
  - Reference: a perfect daily habit is around 0.8 at 30 days and 0.96 at 60.
- **Progression** (the constants are tunable, with their comment):
  - `raise` is suggested if strength ≥ 0.8 for 21 consecutive days. If the minimum version dominates, the copy proposes doing the full one more often; if the full one dominates, it proposes raising the target or the frequency.
  - `lower` is suggested after a 3rd-law diagnosis.
  - A dismissed suggestion doesn't come back until 21 days have passed.
- **Milestones**: 10, 25, 50, 100, 250, 500 and 1000 votes per identity. Each milestone is celebrated only once (it's stored in CelebratedMilestone).

### Reminders
- **.ics**: one `VEVENT` per habit with a time, with an `RRULE` (`WEEKLY;BYDAY` for `weekdays` and `DAILY` otherwise) and a `VALARM` at that time.
  - The summary is the intention phrase.
  - The description lists the chained anchored habits.
  - Anchored habits don't generate their own event.
- **Notifications while the app is open**: only with permission. Scheduled in memory for today's times and cancelled when the app closes.

### Interaction
- On a `yes_no` habit's card: **tap = minimum version** and **long press = full version**. The accessible context menu offers both, plus skip, add note and undo.
- On a `quantitative` habit's card: a field to add a value.
- On an `avoid` habit's card: the "I slipped" button.
- "+1 vote · [identity]" celebration, honoring `prefers-reduced-motion`. No vibration on iOS.

## Testing Decisions

- **A single test boundary: the domain core.** Only its public interface is tested, with input data (habit, logs, settings, `now`) and observable results (period statuses, votes, streak, strength, recovery, diagnosis, Today ordering, .ics, import validation). Never its internal functions.
- A good test describes a user scenario with concrete dates. For example: "3-per-week habit, 2 logs, the week closes on Sunday at 04:00 → failure; Monday is in recovery".
- Must-have cases:
  - The logical day with a log at 01:00.
  - An isolated failure doesn't break the streak; two do, and create the diagnosis only once.
  - Skips and pauses are transparent.
  - The global pause.
  - `at_most` without logs.
  - `avoid` votes when the day closes.
  - Perfect strength at 30 and 60 days against Loop's reference values.
  - A retroactive edit recomputes everything.
  - A frequency change doesn't alter past periods.
  - Milestones without repetition.
  - An invalid import is rejected.
  - Exporting and reimporting returns the same data.
- Persistence, PWA and UI: no automated tests in v1. Verified by hand. Logic must not live there.
- Tool: **Vitest**. There are no previous tests to use as a reference: the repository is empty.

## Out of Scope

Outside v1:
- Social, accountability partner and **habit contract** (v2).
- Cross-device sync (WebDAV or self-hostable server, v2).
- Push server (v2).
- AI (with your own key or a local model, later).
- Habit scorecard, identity review and annual review.
- Timed habits.
- Guided sequential routines.
- Health integrations (Apple Health / Health Connect), widgets, watch and a native or Capacitor app.
- Advanced stats (patterns by hour, correlations).
- Daily lessons.
- Mascot, currency or RPG.
- Money bets (**ruled out forever**).
- Merging data on import (import always replaces).
- Several profiles on the same device.

## Further Notes

- **Name origin**: "Pepita" comes from Pepito Grillo (Jiminy Cricket's Spanish name), made feminine and without the Disney brand. The author's therapist suggested it. The app doesn't use the "Atomic Habits" brand or reproduce text from the book: the content is original.
- **Assumptions accepted without an explicit question**: light and dark theme following the system, AA level, zero telemetry, Vitest only on the core, no limits on habits or identities, "General" adds votes, archiving keeps and deleting asks for confirmation, and notifications while the app is open only with permission.
- The strength formula is **reimplemented** from its description. Loop is GPL-3.0, compatible with AGPL-3.0 either way.
- The engine's constants (0.8 threshold, 21 days, milestones, backup reminder at 7 days) are **calibration settings**: they live as named constants with a comment, to tune them with real use.
- The visual identity (logo, palette) will be designed later in Penpot. v1 starts from an adjusted shadcn/ui theme.
