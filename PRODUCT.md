# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the author.** Pepita is built for the author's own habit work, following the *Atomic Habits* method. Their real use decides; other users are welcome but don't drive decisions.
- **Secondary: anyone who wants it.** Published as open source; self-hosters can serve it as static files.
- **Secondary: the author's therapist.** Reads only the printable/PDF weekly review. The report must be clear to someone who never opens the app.

Situation: quick check-ins throughout the day on the phone, from the installed PWA. Desktop is secondary (weekly review, printing, backups).

## Product Purpose

A *local-first* PWA that acts as a "kind conscience" for building and breaking habits with the *Atomic Habits* method. It guides the method step by step and lets the user skip any step, so it serves both strict and loose use.

Success: the user keeps showing up after bad days instead of giving up, and their progress is visible as votes for the person they want to be.

## Positioning

- Neutral trackers (Habitify, Streaks, Loop) log well but ignore identity, the 2-minute version, intention, environment and breaking habits. The official app is shallow, limited, paid, and holds the data.
- Pepita works the method itself: every habit hangs from an identity, every completed action is a vote that never goes down, the minimum version counts the same as the full one, and failure is handled by "never miss twice" (recovery → 4-laws diagnosis → one-tap fix), not all-or-nothing streaks.
- No accounts, no server, no app store, no telemetry, AGPL-3.0.

## Operating Context

- Daily: the Today screen. Tap = minimum version, long press = full version, "+1 vote · [identity]" celebration. Recovering habits on top.
- Weekly: optional weekly review with a free note and a printable/PDF view shared with the therapist.
- Reminders live in the system calendar via exported .ics; in-app notifications only while open.
- Data safety rituals: JSON/CSV export, JSON import (replaces all data), backup reminder after 7 days, iOS install guide so Safari doesn't evict data.

## Capabilities and Constraints

- Full v1 scope, vocabulary and rules: `docs/spec-v1.md`; rationale: `docs/decisions.md`; market research: `docs/research/`.
- Habit types: yes/no, quantitative (at least / at most X), avoid (logged via relapses, voted per clean day).
- Logical day with configurable cutoff (04:00); unlimited retroactive editing recomputes everything.
- Skip, per-habit pause, global pause are distinct from failure.
- Suggestions (raise/lower the bar) never change anything without permission.
- Zero runtime network calls; fonts and icons bundled. Hash routing; static deploy to GitHub Pages.
- Spanish and English from day one; all copy in `src/i18n/`.
- Out of scope for v1: social, sync, push server, AI, mascot/currency/RPG. Money bets ruled out forever.

## Brand Commitments

- **Name:** Pepita, from Pepito Grillo (Jiminy Cricket's Spanish name), made feminine and without the Disney brand.
- **Voice:** a kind conscience. Informal, brief, never guilt-tripping. A voice only: no mascot or avatar.
- Does not use the "Atomic Habits" brand or reproduce text from the book; all content is original.
- The visual identity (logo, palette) is provisional: v1 runs on an adjusted shadcn/ui theme, and the identity is planned to be designed later in Penpot.

## Evidence on Hand

- Real product copy (ES/EN): `src/i18n/en.json`, `src/i18n/es.json`.
- Icons: `public/favicon.svg`, `public/pwa-192.png`, `public/pwa-512.png`, `public/apple-touch-icon.png`.
- No user testimonials, usage data or other users' feedback exist. Don't fabricate any.

## Product Principles

1. **Showing up beats perfection.** The minimum version must always be the easiest action: one tap.
2. **Never judge.** Failure is information for a diagnosis, never a punishment; votes never go down and the streak stays in the background.
3. **Method by default, freedom always.** Every method step is guided and every optional step can be skipped with "Not now".
4. **The data belongs to the user.** Local, exportable, no network, no telemetry.
5. **Suggest, never impose.** Changes only happen with the user's permission.

## Accessibility & Inclusion

- WCAG AA: contrast, touch target sizes, visible focus.
- An accessible alternative to the long press (context menu with minimum, full, skip, note, undo).
- Celebrations honor `prefers-reduced-motion`; no vibration on iOS.
- Light and dark themes following the system.
