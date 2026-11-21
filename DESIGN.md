---
name: Pepita
description: Your kind conscience for building habits.
colors:
  cricket-green: "#2f6b4f"
  cricket-green-dark: "#7fcba3"
  paper-cream: "#fbf8f3"
  paper-cream-dark: "#141a17"
  card-white: "#ffffff"
  card-white-dark: "#1c2420"
  ink-pine: "#1f2a24"
  ink-pine-dark: "#eef2ee"
  sage-wash: "#e9efe9"
  sage-wash-dark: "#26302b"
  oat-mist: "#efebe4"
  oat-mist-dark: "#222a26"
  lichen-grey: "#57635c"
  lichen-grey-dark: "#b3bdb7"
  moss-glow: "#e3efe7"
  moss-glow-dark: "#23362c"
  ember-red: "#b42318"
  ember-red-dark: "#f2867c"
  linen-line: "#ddd6cb"
  linen-line-dark: "#36413b"
  pebble-stroke: "#8a8277"
  pebble-stroke-dark: "#7d8a83"
typography:
  display:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
  headline:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  title:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
  caption:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cricket-green}"
    textColor: "{colors.card-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.sage-wash}"
    textColor: "{colors.ink-pine}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-ghost:
    textColor: "{colors.ink-pine}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.moss-glow}"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-pine}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  habit-card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-pine}"
    rounded: "{rounded.lg}"
    padding: "16px"
    height: "64px"
  habit-card-hover:
    backgroundColor: "{colors.oat-mist}"
  habit-card-done:
    backgroundColor: "{colors.moss-glow}"
    textColor: "{colors.lichen-grey}"
  celebration-toast:
    backgroundColor: "{colors.cricket-green}"
    textColor: "{colors.card-white}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "12px 12px 12px 16px"
---

# Design System: Pepita

## Overview

**Creative North Star: "The Quiet Conscience"**

Pepita's interface steps back so its voice can speak. Each screen is a single narrow column on warm paper, with one clear action at a time and Pepita's short, kind sentences doing the persuading. Nothing decorates; the green appears where something is done, needs attention, or is the next step. The feeling is a calm friend at your ear, not a dashboard demanding you look at it.

Density is low and touch-first: the app lives in a phone, opened for a few seconds several times a day. Targets are large, the type is rounded and friendly (Nunito), and surfaces are flat. Motion exists only to acknowledge an action (a stroke drawing through a finished habit, a "+1 vote" rising from the bottom) and always yields to `prefers-reduced-motion`.

The current palette and type are a provisional adjusted shadcn/ui theme; a dedicated identity (logo, palette) is planned in Penpot. Until then, this file is the authority.

**Key Characteristics:**
- One centered column (448px max) on cream paper, 16px side gutters.
- A single accent, Cricket Green, reserved for done, recovery, primary action and focus.
- Flat surfaces separated by hairline borders; shadows only on floating celebrations.
- Every interactive target at least 44px; focus is always a visible 3px ring.
- State is never color alone: recovery adds a thicker border and a sentence, a relapse adds a dashed border.
- Light and dark follow the system; print is always light.

## Colors

A quiet, warm-neutral palette with one forest-green voice. Every token has a light and a `-dark` pair; the dark theme swaps to a lifted mint of the same hue so contrast holds at AA.

### Primary
- **Cricket Green** (`cricket-green` / `cricket-green-dark`): named after Pepito Grillo. Primary buttons, done check circles and their border, recovery borders and copy, the day's vote count, live status notices, chart lines, and the focus ring. The only saturated color in the system.

### Neutral
- **Paper Cream** (`paper-cream`): the page background. Warm, never pure white, so cards read as lifted sheets.
- **Card White** (`card-white`): cards, inputs, menus, forms. Also the text on Cricket Green.
- **Ink Pine** (`ink-pine`): all primary text. A green-tinted near-black that keeps the palette in one family.
- **Lichen Grey** (`lichen-grey`): secondary text (identity, period counters, dates, captions) and the text of done habits.
- **Sage Wash** (`sage-wash`): secondary buttons.
- **Moss Glow** (`moss-glow`): done-card fill, ghost-button hover, the global-pause notice.
- **Oat Mist** (`oat-mist`): hover on undone habit cards; muted fills.
- **Linen Line** (`linen-line`): every hairline border and divider.
- **Pebble Stroke** (`pebble-stroke`): input borders and the empty check circle, darker than Linen Line so controls meet 3:1 non-text contrast.
- **Ember Red** (`ember-red`): destroying data (the delete-habit confirmation) and errors (a rejected import, invalid fields).

### Named Rules
**The One Voice Rule.** Cricket Green is the only accent. It marks done, recovery, the next action and focus; nothing else gets color. Don't add a second hue for categories, identities or decoration.

**The Never Red Rule.** Failure, missed periods and relapses are never shown in Ember Red. Red is reserved for destroying data and real errors. A bad day is information, not an alarm.

## Typography

**Display Font:** Nunito Variable (with ui-sans-serif, system-ui)
**Body Font:** Nunito Variable
**Label/Mono Font:** none; labels use Nunito at semibold.

**Character:** One rounded humanist sans for everything. Its soft terminals carry the "kind" in kind conscience; hierarchy comes from size and weight, never from a second family.

### Hierarchy
- **Display** (700, 1.5rem/2rem): onboarding step titles and the printed report's title.
- **Headline** (700, 1.25rem/1.75rem): section headings (h2) inside screens, diagnosis and milestone titles.
- **Title** (600, 1.125rem/1.75rem): the screen title in the header, habit names, the day's vote count, the celebration toast (at 700).
- **Body** (400, 1rem/1.5rem): Pepita's sentences, intention phrases, minimum versions, form values. 16px minimum so iOS never zooms inputs.
- **Label** (600, 0.875rem/1.25rem): form labels, notices, recovery suggestion. At 400 it is secondary metadata.
- **Caption** (400, 0.75rem/1rem): streak line, chart axes.

### Named Rules
**The Sentence Case Rule.** All copy is sentence case, including buttons and headings. No uppercase labels, no tracking: Pepita talks, it doesn't announce.

## Layout

A single mobile column: `max-width: 448px`, centered, 16px horizontal padding, 40px bottom padding. Desktop shows the same column; there are no multi-column breakpoints. Print removes the width cap and padding.

The header is a 56px row: back chevron and screen title on the left, settings on the right. Each screen fills it through a slot.

Spacing runs on a 4px base. Screens stack sections at 24px (`xl`) or 32px (`2xl`) for long forms; lists of habit cards at 12px (`md`); inside a card, lines sit tight and controls keep 8px (`sm`) gaps. Secondary navigation (new habit, identities, weekly review, archived) sits at the bottom of Today as full-width stacked buttons.

**The Thumb Column Rule.** Everything lives in one reachable column. Card side actions stack vertically so the habit text keeps its width at 375px.

## Elevation & Depth

Flat by default. Depth comes from tone (cream page, white card) and 1px Linen Line borders. Shadows appear only on elements that float above the page and disappear on their own: the "+1 vote" toast and the milestone celebration.

### Shadow Vocabulary
- **Toast lift** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): the bottom "+1 vote" celebration.
- **Milestone lift** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): the top milestone card.

### Named Rules
**The Floating-Only Shadow Rule.** If it stays on the page, it has no shadow. Shadows mean "this is temporary and above everything".

## Shapes

Gently rounded throughout, on a 12px base radius. Controls (buttons, inputs, selects) use 10px (`md`); cards, menus and inline forms use 12px (`lg`); the milestone card uses 16px (`xl`); check circles are full circles. Borders are 1px hairlines; state can thicken them to 2px (recovery, done circle, milestone) or dash them (relapsed day). No clipping, no custom silhouettes.

## Components

### Buttons
Tactile and calm: big enough to hit without looking, quiet at rest.
- **Shape:** gently rounded (10px), minimum 44px tall, 16px horizontal padding, 8px icon gap, 20px icons.
- **Primary:** Cricket Green fill with Card White semibold text. One per view: the next step.
- **Hover / Focus:** hover drops the fill to 90% opacity; focus shows a 3px Cricket Green ring offset 2px from the page. Disabled is 50% opacity.
- **Secondary:** Sage Wash fill, Ink Pine text; hover at 80%. Used for alternatives and Today's secondary navigation.
- **Ghost:** transparent, Moss Glow on hover. Icon buttons (back, settings, card actions) are ghost at 44×44; card actions add a hairline border.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Card White on Paper Cream.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Linen Line.
- **Internal Padding:** 16px for cards; 8–12px for inline menus and forms.

### Inputs / Fields
- **Style:** Card White fill, 1px Pebble Stroke border, 10px radius, 44px tall, 8px × 12px padding, 16px text. Native `<select>`, date and time controls are styled the same and keep their system behavior (`color-scheme: light dark`).
- **Focus:** 3px Cricket Green ring.
- **Error / Disabled:** Ember Red border via `aria-invalid`; disabled at 50% opacity.
- **Labels:** always visible above the field, Label style.

### Navigation
No tab bar. A compact header (back chevron in Cricket Green, screen title, settings gear) and full-width buttons at the bottom of Today. Back destinations follow the route, like a native mobile app.

### Habit Card (signature)
The whole card is the button: **tap logs the minimum version, long press (500ms) the full one.**
- **Rest:** white card, 64px minimum, 16px padding, a 40px empty circle in Pebble Stroke, the habit name in Title, then the minimum version, intention phrase and a Lichen Grey metadata line (identity · counter · status).
- **Done:** Moss Glow fill, Cricket Green border, filled green circle with a check, text drops to Lichen Grey, and a 2px stroke draws through the name over 300ms (instant with reduced motion).
- **Recovery:** 2px Cricket Green border plus a green "minimum version" suggestion line. Sorted to the top of Today.
- **Avoid habits:** not tappable; a secondary "I slipped" button, and a dashed border once a relapse is logged.
- **Side actions:** two stacked 44px bordered ghost buttons (calendar, more options). "More options" opens an inline menu that duplicates every gesture as a button, the accessible alternative to the long press.

### Celebration Toast (signature)
"+1 vote · [identity]" in a Cricket Green bar fixed to the bottom of the column, with an "Add note" secondary button. Fades, scales and slides in; leaves after 5s unless focused; Escape dismisses. The milestone celebration is its larger sibling at the top: white card, 2px green border, party icon, 16px radius.

## Do's and Don'ts

### Do:
- **Do** keep every tap target at least 44px and every focus ring visible (3px Cricket Green).
- **Do** pair every state color with a second signal: border weight, dashed border, an icon or a sentence.
- **Do** keep Cricket Green for done, recovery, the primary action and focus (The One Voice Rule).
- **Do** use theme tokens for every color so light, dark and print stay correct; charts take `currentColor` from Cricket Green.
- **Do** wrap motion in `motion-safe` / `motion-reduce` and keep it to acknowledgement (≤700ms).
- **Do** write all copy in sentence case, short, in Pepita's voice.

### Don't:
- **Don't** show failure, missed days or relapses in red (The Never Red Rule).
- **Don't** add shadows to anything that stays on the page (The Floating-Only Shadow Rule).
- **Don't** add a mascot, avatar, currency, badges or RPG visuals; Pepita is only a voice.
- **Don't** make the streak visually prominent; votes and strength lead, the streak is a caption.
- **Don't** introduce a second typeface or uppercase tracked labels.
- **Don't** break the single column into a desktop grid.
