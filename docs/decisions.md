# Product decisions (definition session)

## Round 1

| # | Decision |
|---|---|
| R1.1 | Personal use, published as **open source** for anyone who wants it. No business model. |
| R1.2 | Follows the *Atomic Habits* method by default, but allows a looser use (a single app for both cases). |
| R1.3 | Core model: **Identity → Habits**; every log counts as a vote. Routines and chains, later. |
| R1.4 | Compassionate failure: **"never miss twice"** as the core rule. Skipping, failing and pausing are different things. No punishment. |
| R1.5 | **PWA**, without depending on app stores. Each person owns their data. |
| R1.6 | *Local-first*, no account; optional sync; export from v1. |
| R1.7 | v1 is individual (written habit contract, no witnesses). Social in v2, already anticipated in the data model. |
| R1.8 | Money bets are ruled out. |
| R1.9 | Light gamification: celebration on logging, votes, milestones. No RPG, mascot or currency. |
| R1.10 | Original, contextual content. No text from the book is reproduced and the brand isn't used. |
| R1.11 | **Spanish and English** from v1, with i18n from the start. |

## Technology: distribution on iOS

| # | Decision |
|---|---|
| T.1 | **PWA** only. Ruled out: installing via a free Apple ID or SideStore (expires after 7 days, at most 3 apps) and EU distribution (requires paying for the Developer Program). Capacitor remains a future, unplanned option. |

## Round 2

| # | Decision |
|---|---|
| R2.12 | **AGPL-3.0** license. Deployed as a static website (GitHub or Codeberg Pages) and can be self-hosted. |
| R2.13 | **Loose mode**: a single wizard that follows the book; each step can be skipped with "Not now". Habits without an identity go to "General". The weekly review reminds about empty fields. |
| R2.14 | Reminders. v1: notifications while the app is open and **.ics** export (alarm + intention phrase). v2: optional self-hostable push. |
| R2.15 | v1: JSON export and import, CSV export, `storage.persist()`, backup reminder and an invitation to install on iOS. Sync (WebDAV or own server) in v2. |
| R2.16 | **React + TS + Vite + Tailwind + shadcn/ui** (design system from day one), Dexie, vite-plugin-pwa, i18next. Rules live in pure functions with their tests. |
| R2.17 | v1 types: **yes/no** and **quantitative** ("at least X" / "at most X"). No timer. |
| R2.18 | Frequency: **X times per period** (day, week or month) or specific days of the week. |
| R2.19 | **Minimum version (2 min) and full version**. The minimum counts as a full vote; stats tell them apart. |
| R2.20 | **Never miss twice**. A failure is a scheduled period not met, not skipped and not paused. A failure makes the next period a **recovery** one (highlighted, suggesting the minimum). Two failures break the streak and open a **4-laws diagnosis**. |
| R2.21 | North-star metric: **votes per identity** (they never go down). Each habit shows its **strength** (Loop's formula). The streak stays in the background. |
| R2.22 | **Implementation intention**: When (a time, or "after" another habit or an action) + Where. They produce a phrase shown on the card and in the reminder. |
| R2.23 | **"Avoid"** type with an inverse-laws wizard (cue, friction, substitute). The **relapse** is logged with its trigger. Every clean day counts as a vote. |
| R2.24 | No AI in v1. Later, optional with your own key or a local model. |

## Round 3

| # | Decision |
|---|---|
| R3.25 | Several identities. Each habit belongs to **one** (or to "General"). Archiving an identity keeps its votes. |
| R3.26 | **1 vote per completed log** (minimum or full version). Quantitative: 1 vote per period in which the goal is reached. "Avoid": 1 vote for each clean day, added only when the day closes. |
| R3.27 | The day ends at a **configurable time (04:00 by default)**. A period without a log counts as a **failure** when it closes. **Unlimited retroactive editing**. |
| R3.28 | Three options in v1: **skip** a period (optional reason, neutral), **pause** a habit between dates and **global pause** (vacation). |
| R3.29 | **Goldilocks**: suggestions only, never automatic changes. Raise the bar after ~3 weeks of high strength; lower it after a diagnosis. |
| R3.30 | Optional fields **"Prime your environment"** (list) and **"Paired reward"** (temptation bundling), shown on the card. |
| R3.31 | The **habit contract** stays out of v1. It will come with social. |
| R3.32 | The **habit scorecard** stays out of v1. |
| R3.33 | **Weekly review** in v1: votes per identity, habits in recovery or diagnosis, progression suggestions, empty fields and a free note. The identity review, later. |
| R3.34 | **Today**: recovering habits first; then sorted by their When, with each habit stacked under its anchor; at the end, those without a time. Filter by identity and votes of the day. |
| R3.35 | **Tap = minimum version, long press = full**. Celebration "+1 vote · [identity]". Optional note on every log. Failure reason according to the 4 laws. |
| R3.36 | **Onboarding**: language → identity → a habit (minimum, When and Where; the rest can be skipped) → log today → install the PWA and enable `persist()`. No account. |
| R3.37 | v1 content: ~20 original microcopy texts (ES/EN) in the wizard, the diagnosis and progression. No daily lessons. |
| R3.38 | Name: **Pepita** (from "Pepito Grillo", Jiminy Cricket's Spanish name, made feminine and without the Disney brand). Repository at `Workspaces/pepita`. |

## Round 4

| # | Decision |
|---|---|
| R4.39 | **Pepita's voice**: a kind conscience. Informal, brief and never guilt-tripping. Only a voice: no mascot or avatar. |
| R4.40 | The weekly review has a **printable or PDF view** (print CSS). The period and content are chosen before printing. |
| R4.41 | **Diagnosis → one-tap action** according to the failing law. 1st: When/Where or .ics. 2nd: reward or identity. 3rd: minimum version or environment. 4th: visible votes, or pause/archive guilt-free. |
| R4.42 | v1 stats. Per identity: accumulated votes curve. Per habit: strength, heatmap, minimum vs. full version, current and best streak. |
| R4.43 | **Milestones** at 10, 25, 50, 100, 250, 500 and 1000 votes per identity. |
| R4.44 | **Straight to code** with shadcn/ui and a custom theme. Penpot, later, for the visual identity. |
| R4.45 | Deliverable: `docs/spec-v1.md` (data model, rules, screens, v1 vs. v2). Then, set up the project. |
| R4.46 | GitHub + GitHub Pages (like the rest of the projects). |
