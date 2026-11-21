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
  vote-numeral:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
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

<!-- impeccable:design-map -->
Name: Pepita
Colors: primary: cricket-green #2f6b4f; neutral: paper-cream #fbf8f3; error: ember-red #b42318; primary: cricket-green-dark #7fcba3; neutral: paper-cream-dark #141a17; neutral: ink-pine #1f2a24 (+16 more in the sidecar)
Fonts: Nunito Variable (display, headline, title, body, label, caption, vote-numeral)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px, 2xl 32px
Radius: sm 8px, md 10px, lg 12px, xl 16px, full 9999px
North Star: "The Quiet Conscience"
Rules:
- The One Voice Rule. Cricket Green is the only accent.
- The Never Red Rule. Failure, missed periods and relapses are never shown in Ember Red.
- The Sentence Case Rule. All copy is sentence case, including buttons and headings.
- The Thumb Column Rule. Everything lives in one reachable column.
- The Floating-Only Shadow Rule. If it stays on the page, it has no shadow.
Elevation:
- Toast lift: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
- Milestone lift: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
Don't:
- Don't show failure, missed days or relapses in red (The Never Red Rule).
- Don't add shadows to anything that stays on the page (The Floating-Only Shadow Rule).
- Don't add a mascot, avatar, currency, badges or RPG visuals; Pepita is only a voice.
- Don't make the streak visually prominent; votes and strength lead, the streak is a caption.
- Don't introduce a second typeface or uppercase tracked labels.
- Don't break the single column into a desktop grid.
Do:
- Do keep every tap target at least 44px and every focus ring visible (3px Cricket Green).
- Do pair every state color with a second signal: border weight, dashed border, an icon or a sentence.
- Do keep Cricket Green for done, recovery, the primary action and focus (The One Voice Rule).
- Do use theme tokens for every color so light, dark and print stay correct; charts take `currentColor` from Cricket Green.
- Do wrap motion in `motion-safe` / `motion-reduce` and keep it to acknowledgement (≤700ms).
- Do write all copy in sentence case, short, in Pepita's voice.
Full: .impeccable/design-full.md (read a section when you need its detail)
