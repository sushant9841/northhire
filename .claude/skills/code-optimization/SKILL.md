---
name: code-optimization
description: Refactoring and de-duplication rules for NorthHire's codebase — when to extract a shared component/helper vs. leave duplication, where UI/business-logic/data-access boundaries belong. Use when asked to clean up, de-duplicate, or optimize existing code, or before/after building new reusable component sets.
---

# Code Optimization & Architecture

## The standing rule from this codebase's own conventions

Three similar lines is better than a premature abstraction — this codebase already follows that discipline (see the Tailwind-conversion memory: components were only promoted to shared locations after a **3+ occurrence** threshold was actually hit, e.g. `_PillTabs`, `TH_CLS`/`TD_CLS` table-cell constants, `TONE_CLS` tone lookups — each introduced only after the same JSX pattern showed up independently in `staffing/suite.jsx`, `hr/people.jsx`, and `hr/suite.jsx`). Keep applying that threshold rather than abstracting on first sight of a repeated pattern.

## Where logic actually lives here

- `src/store/useStore.js` / `useHrStore.js` — the entire app's state and mutations (a hand-rolled store, not Redux/Zustand-with-devtools). This is the business-logic layer; UI components call into it via `use()` (`const A = use()`) and should never reimplement its logic locally.
- `src/design/primitives.jsx` — the component library. `src/design/tokens.js` — design tokens (colors/shadows/font) mirrored into `src/index.css`'s `@theme`.
- `src/pages/**` — one file per domain area, each exporting several page components; some already have local `_PascalCase` helper components co-located (the established per-domain pattern) rather than every helper being promoted to a shared file.
- `src/helpers/*` — small pure utilities (formatting, hooks like `useMedia`).

When optimizing, respect this layering: don't pull business logic out of `useStore.js` into a component "for simplicity," and don't let a component reach past `use()` into some other module's internals.

## Before refactoring anything

1. **Read before you assume duplication is accidental.** Some repeated shapes are intentional (e.g. `CvPreview` stays inline-style and scale-parametric on purpose, documented in its own file — see the Tailwind memory's "genuinely runtime-parametric" exception). Check for an existing comment explaining *why* something looks duplicated before "fixing" it.
2. **Never change behavior while refactoring for structure.** Route keys, state field names, action names, localStorage keys, and component/function names must stay identical unless the refactor's explicit purpose is to rename them. This mirrors the discipline from both the original JS-split refactor and the Tailwind pass — verify with a build + Playwright pass exactly like those, not just "it compiles."
3. **Don't add abstractions for hypothetical future needs.** A "config-driven" or "pluggable" version of something used in exactly one place is over-engineering here — this app has a long track record (in its own history) of flat, direct code being easier to reason about than a premature framework-within-the-app.
4. **Comments**: default to none; add one only when it captures a non-obvious *why* (a workaround, an invariant, a deliberately-kept quirk) — this codebase's existing comments are almost all of that kind (e.g. the `/* CvPreview renders at three very different scales... */` block), not restating what the code does.

## Dependencies

Until 2026-09-03 this app had zero dependencies beyond the framework (React, Tailwind, Vite, plus dev-only oxlint). `dompurify` was added as the first exception — it sanitizes RichText's raw `execCommand`-produced HTML before every `dangerouslySetInnerHTML` render (a real stored-XSS gap, not a style preference; see `src/helpers/sanitize.js`). Match that bar before adding another dependency: small, single-purpose, and solving a correctness/security problem plain code can't reasonably handle — not a convenience wrapper around something a few lines of vanilla JS/React already cover.

## Verifying an optimization pass

Same discipline as prior phases: `npm run build`, then a Playwright pass hitting the affected flows with a `pageerror` listener, screenshots reviewed before claiming success, scratch scripts deleted afterward. A refactor that "looks right" without this check is not verified.
