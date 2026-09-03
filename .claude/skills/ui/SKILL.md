---
name: ui
description: Design-system and component-reuse rules for NorthHire's front end — typography scale, when to extract a shared component vs. reuse an existing primitive, Tailwind conventions. Use whenever touching visual styling, adding a new UI pattern, or asked to make the app look "more polished," "consistent," or "less bold/heavy."
---

# UI / Design System

NorthHire's whole visual layer is Tailwind v4 (`@tailwindcss/vite`), configured through a single `@theme` block in `src/index.css` — there is no `tailwind.config.js`. Every design token (colors, shadows, font, container widths) is registered there and mirrors `src/design/tokens.js` (`C`, `SH`, `FONT`). `src/design/primitives.jsx` holds ~44 shared components (`Btn`, `Card`, `Tag`, `Input`, `Modal`, `H1`/`H2`, `Banner`, `Field`, `Sel`, `Switch`, `SmartPortrait`, etc.) — read it before building anything that looks like a button, card, badge, form field, table, or modal. Building a bespoke version of something that already exists there is the single most common mistake to avoid.

## Before adding any new UI

1. Grep `src/design/primitives.jsx` for something close to what you need. Extend a prop rather than forking a new component, unless the visual language is genuinely different.
2. Grep the page files for the pattern you're about to build (e.g. a tab bar, a stat card, a status pill) — the same shape has probably been hand-rolled 3+ times across `pages/employer`, `pages/staffing`, `pages/hr`. If so, this is exactly the "recurring UI element" the user wants promoted to a real shared component, not rebuilt a fourth time.
3. Only promote something to `src/components/` (new shared, cross-domain location) once it's duplicated in 3+ places, per the user's own stated threshold from the original refactor. Two occurrences can stay co-located.

## Typography

The user has flagged headings as "overly bold" throughout. Current defaults lean on `font-extrabold`/`font-bold` heavily for `h1`/`h2`. When auditing or fixing:
- Establish one clear type scale (e.g. page title, section heading, card title, label, body, caption) and apply it consistently — right now weight/size choices were made per-file during the Tailwind conversion, not from a single scale, so drift is expected and likely.
- Prefer `font-bold` (700) over `font-extrabold` (800) for most headings; reserve extrabold for true hero/marketing display text, not routine dashboard `H1`/`H2`.
- Tighter `tracking-tight` on large display text reads as more "designed" than just increasing weight — consider that instead of defaulting to heavier weight for emphasis.
- Check `H1`/`H2` in `primitives.jsx` first — fixing the shared component fixes every page at once; don't patch individual pages unless they've overridden the primitive.

## Accessible interactive primitives (don't re-hand-roll these)

`Switch` and `CheckRow` are real `<button role="switch"/"checkbox" aria-checked>` elements — keyboard-operable via native Enter/Space, no manual key handling needed at call sites. `Card` and `Stat` stay `<div>` (some callers, e.g. `JobCard`, nest a real `<button>` like `SaveBtn` inside them — a real `<button>` wrapper can't legally contain another button) but get `role="button" tabIndex={0}` plus Enter/Space `onKeyDown` via a small `clickableA11y(onClick)` helper local to `primitives.jsx`, applied automatically whenever `onClick` is passed. `Modal` closes on Escape and traps Tab focus inside itself. If you build a new clickable `<div>` anywhere — `BlogCard`/`TrainingCard` in `src/pages/shared/cards.jsx` predate `Card` and don't use it, so they carry the same pattern inline — copy this role/tabIndex/onKeyDown shape rather than shipping a mouse-only click target.

Any new `dangerouslySetInnerHTML` call must go through `sanitizeHtml()` from `src/helpers/sanitize.js` (wraps `dompurify`) — RichText's editor output is untrusted HTML, and every existing render site (employer job descriptions, seeker CV sections, marketing blog bodies) is already routed through it. Don't add a render site that skips it.

## Tailwind mechanics — load-bearing, don't relearn these by trial and error

- **Spacing scale**: `w-`, `h-`, `p-`, `m-`, `gap-`, `top-`, `z-`, etc. accept any whole integer (N → N×4px) **plus exactly four half-steps**: `0.5`=2px, `1.5`=6px, `2.5`=10px, `3.5`=14px. No other decimal generates anything — `gap-4.5`, `py-2.75`, etc. silently produce no CSS. If a pixel value doesn't land on the scale, round to the nearest valid step (ties round up) — this was the user's explicit, deliberate choice over arbitrary-value brackets (`gap-[18px]`), specifically because clean utility classes matter more here than sub-2px pixel-exactness.
- **Never build a className via string interpolation of a runtime variable** (e.g. `` `hover:border-${tone}` ``) — Tailwind's static scanner can't see it and generates no CSS. Route through a literal lookup object whose complete class strings appear verbatim in source (see `TONE_CLS`/`PRODUCT_TONE` patterns already used in `pages/employer/staffing.jsx`, `pages/marketing/forEmployers.jsx`, `pages/staffing/suite.jsx`).
- Dynamic `gridTemplateColumns` using `repeat(auto-fill,minmax(Npx,1fr))` has no clean static Tailwind utility — leave it as inline `style`, paired with a Tailwind `gap-*` class. This is an accepted, repeated pattern, not a gap to close.
- `Card`, `Btn`, `Tag`, `H1`, `H2`, `Banner`, `Field`, `Modal`, `Sel` only accept a `style` prop, not `className` — a caller passing `className` to one of these is silently ignored. Override via `style` or add the missing prop to the primitive itself.
- The custom `mob` boolean (from `useMedia`, breakpoints at 900/820/1024/960px depending on shell) is the responsive mechanism everywhere — don't introduce Tailwind's `sm:`/`md:` prefixes alongside it; that's a parallel system that will drift.

## Missing shared primitives — build these, don't hand-roll another one-off

Confirmed by the design-system audit (2026-09-03), still unbuilt as of this writing — check the [Fix Tracker](https://claude.ai/code/artifact/8a33ba65-c63c-4e7c-8785-6ff9f67874b0)'s Design System domain before starting, it may already be in progress:
- **Toast/notification** — no auto-dismissing feedback primitive exists anywhere; `Banner` is inline/persistent only. Needed to replace the many `alert()` calls used as ad-hoc success/error feedback across every domain.
- **ConfirmDialog** — 7+ call sites reimplement "are you sure?" with native `confirm()`/`window.confirm()` (offboard employee, wipe local data, execute payroll, remove badge, etc.). Build one shared modal-based confirm, then migrate those call sites.
- **Table/DataTable** — ~9 hand-rolled tables (`TH_CLS`/`TD_CLS` constants redeclared per-file with drifting padding) across employer/staffing/HR/admin/marketing. Extract one shared table shell (header row, cell padding, empty state) once, then adopt it.
- **`statusTone()` helper** — the same status→tag-tone ternary (paid/overdue/warn, live/paused/closed) is copy-pasted verbatim in staffing/suite.jsx, hr/suite.jsx, employer/staffing.jsx. One small pure function in `src/helpers/` (or `primitives.jsx`) replaces all three.
- **`Empty` adoption** — the primitive already exists (icon/title/body/action slots) but 17+ places still hand-roll a bare `"No X yet"` div instead of using it. This is an adoption pass, not a new build.
- **Heading consolidation** — 29 hand-rolled "hero" headings + 22 hand-rolled "section titles" across the app bypass `H1`/`H2` entirely, each with its own size/weight guess. This is the actual root of the original "overly bold" complaint — fixing `H1`/`H2` alone (already done) doesn't touch pages that never used them. Needs a real pass replacing the ad-hoc headings with the shared primitives.

## Verifying visual changes

There's no automated visual-diff tooling in this repo. After any styling change: `npm run build` (catches syntax errors, not visual regressions), then a Playwright script (see prior session pattern: launch, screenshot key states, check `pageerror` events). Screenshots now get **kept**, not deleted — see the [qa](../qa/SKILL.md) skill's screenshot-library convention (`.claude/qa-screenshots/<domain>/`). Delete only the scratch `.mjs` script itself. Don't claim a visual fix is done without an actual screenshot.
