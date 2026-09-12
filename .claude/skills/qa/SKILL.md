---
name: qa
description: Lightweight, low-token QA agent workflow for NorthHire — periodic audits covering visual/UI, functionality, responsiveness, accessibility, performance, SEO, content, and code quality, following an audit → fix → re-verify loop. Use when asked to run a QA pass, check the app's health, or before/after a batch of changes to confirm nothing regressed.
---

# QA Workflow

## Goal

A repeatable, cheap way to catch regressions and surface issues without re-reading the whole codebase every time. Bias toward **low token cost per run** — this is meant to run often, not to be a one-time deep audit (that's the [features](../features/SKILL.md) 4-bucket framework's job).

## The loop

1. **Build** — `npm run build`. A build failure is an instant stop; report it before anything else.
2. **Pick a small, targeted surface** — either the pages/flows the user just asked about, or (for a periodic sweep) rotate through domains (marketing, seeker, employer, admin, staffing, HR) a few pages at a time rather than the whole app every run.
3. **Playwright pass** — launch headless, navigate the target flows, screenshot key states, and always attach a `page.on("pageerror", ...)` listener. Zero `pageerror`s is necessary but not sufficient — actually look at the screenshots (Read tool) before declaring success. This mirrors the exact discipline used throughout the Tailwind-conversion pass — see [project_tailwind_conversion](../../memory/project_tailwind_conversion.md).
4. **Score against the checklist below** — only the categories relevant to what changed; don't run a full accessibility audit because someone tweaked a button color.
5. **Report findings using the 4-bucket framework** from [features](../features/SKILL.md) — this keeps QA output consistent with the rest of the productionization audit.
6. **Fix, then re-run step 3 on just the affected flow** before considering it closed.
7. **Delete scratch Playwright scripts (`.mjs` files) but KEEP screenshots** — save them to `D:\NorthHire-spa\.claude\qa-screenshots\<domain>\<page-or-flow>.png` (create subfolders per domain: `admin/`, `employer/`, `staffing/`, `hr/`, `seeker/`, `marketing/`, `design-system/`). Use a stable, descriptive filename per page/state (e.g. `admin/employers-onhold-tab.png`) so a later run **overwrites** the same file instead of accumulating duplicates — this builds a running before/after visual record across the whole productionization pass, useful for future audits and QA without re-navigating the whole app. Never delete this directory's contents; only ever add or overwrite.

## Screenshot library

The persistent screenshot set lives in the repo at `.claude/qa-screenshots/` (untracked in git like the rest of `.claude/`, but not ephemeral — it survives across sessions on disk). Before re-shooting a page from scratch, check whether a current screenshot already exists there — reuse it if nothing in that flow has changed since. When a page's UI changes (a fix, a new component, a redesign), re-shoot and overwrite its file so the library stays current rather than stale.

## Checklist (pick relevant subset per run)

- **Userflow correctness** — mandatory on every audit. Walk each top flow (apply, post-job, hire, punch-in, message, interview) in TWO account states: one that has the required prior data (a CV, an employer profile, an HR employee record) and one that doesn't. For each, verify:
  - Empty state names what's missing and offers a one-click path to create it (never a silent bounce to a builder mid-flow).
  - "Which one" selection appears when N > 1, with a sensible default (first-created, most-recent, or the one already flagged as primary).
  - Single-item cases default to that item and skip the picker.
  - Every action button moves the user's world forward — no click-does-nothing, no toast-only "coming soon", no modal whose Save just closes.
  - Pre-checks catch missing state BEFORE the user fills a form, not at submit.
  - Silent 401/403 doesn't look like an empty state.
  - Data written on one side (employer moves stage, HR schedules interview) appears live on the other side without refresh — SSE is wired.
  - The critical CTA is visible in the first fold at 400px width — mobile-hidden-under-menu is a defect.
  See [feedback-userflow-audit](../../memory/feedback_userflow_audit.md) for the ten anti-patterns and their examples.
- **Server-authoritative** — mandatory on every audit. Grep `localStorage\.` and verify every hit fits the whitelist in [feedback-server-authoritative](../../memory/feedback_server_authoritative.md): per-viewer UI conveniences only. Any business data in localStorage (CVs, applications, saved jobs, messages, notifications, plan state, HR records) is a defect and must be moved server-side.
- **Visual/UI**: layout breaks at the actual breakpoints this app uses (900/820/1024/960px via `mob`, not Tailwind's defaults), overflow/clipping, inconsistent spacing or type scale versus [ui](../ui/SKILL.md).
- **Functionality**: does the action actually reach the store (`use()`/`A.*` calls) AND the server (API call), not just update local component state or local store state that looks like it worked?
- **Responsiveness**: test at a genuinely narrow viewport (390px) and at desktop — this app's mobile bugs have historically been real (see the CV-builder sidebar/grid bugs fixed earlier), not hypothetical.
- **Accessibility**: keyboard reachability of custom controls (toolbar buttons, dropdown menus, modals — does Escape/click-outside close them?), focus visibility, alt text on meaningful images, color contrast on custom inline-style text.
- **Performance**: obvious problems only at this stage — unpaginated tables rendering hundreds of rows, images with no size hints, redundant re-renders from inline object/array literals in render (lower priority, don't chase micro-optimizations without profiling first).
- **SEO**: see [seo-cro](../seo-cro/SKILL.md) — mostly blocked on routing/SSR status, don't over-invest here yet.
- **Content**: tone check against [content](../content/SKILL.md) only if copy was touched.
- **Code quality**: does the change follow [code-optimization](../code-optimization/SKILL.md) (no premature abstraction, no behavior drift, correct layering)?

## Reporting

Keep the report terse and actionable — file:line references, one-sentence problem statements, bucketed by the 4-category framework, most severe first. Don't pad with narrative about the process.
