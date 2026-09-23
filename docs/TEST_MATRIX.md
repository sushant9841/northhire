# E2E Test Matrix — Playbook §21 Critical Flow Matrix

Persona x flow x invariant matrix from `NorthHire_Production_Transformation_Playbook.pdf`
§21, cross-referenced against the spec file that covers each row. Status reflects the state
of the suite as delivered — see `docs/REGRESSION.md` for how to run it and how to extend a
row that is currently `.fixme` or not yet started.

| # | Flow | Persona(s) | Spec file | Status |
|---|------|-----------|-----------|--------|
| 1 | Login (all 8 personas) · logout · unauthorized 401 | Sarah, PCL, admin, Rachel, Priya, Linda, Isaac, Daniel | `tests/e2e/auth.spec.ts` | **Passing** (10 tests x 2 projects = 20/20) |
| 2 | Home -> search -> filter -> job detail, filter persistence, sort | Guest/seeker | `tests/e2e/seeker/discovery.spec.ts` | **Passing** (2/2) |
| 3 | Apply: 0/1/N-CV picker states, SuccessCard, Track application | Seeker (fresh signups) | `tests/e2e/seeker/apply.spec.ts` | **Passing** (6/6) — see "Bugs found" below |
| 4 | CV builder: cap at 5, limit card, autosave indicator tick | Sarah | `tests/e2e/seeker/cv.spec.ts` | **Passing** (2/2; autosave test runs ~65s real time — see REGRESSION.md) |
| 5 | Application row status pill tooltip, interviews stat | Marcus | `tests/e2e/seeker/status.spec.ts` | **Passing** (1/1) — interview-stage coverage only; no scheduled-interview object in seed data (see file header) |
| 6 | Post job: draft autosave/resume, preview, publish, SuccessCard w/ copy-link | Employer (PCL) | `tests/e2e/employer/post-job.spec.ts` | **Not started** — stopping point, see report |
| 7 | Pipeline: kanban, candidate drawer, keyboard shortcuts A/M/I/N/R/->/<-, advance stage | Employer | `tests/e2e/employer/pipeline.spec.ts` | **Not started** |
| 8 | Plan limits: Free 1-job cap -> UpgradePromptModal, message gate | Employer (Free plan) | `tests/e2e/employer/plan-limits.spec.ts` | **Not started** |
| 9 | Schedule interview -> TZ banner (employer + candidate zones) | Employer | `tests/e2e/employer/interviews.spec.ts` | **Not started** |
| 10 | Advance to Hired -> HireOnboardingModal -> HR employee record | Employer | `tests/e2e/employer/hire.spec.ts` | **Not started** |
| 11 | HR Owner: org-health attention stack, role-scoped nav | Rachel | `tests/e2e/hr/owner.spec.ts` | **Not started** |
| 12 | HR permissions: Linda 403 salary, Isaac sees salary, Daniel own-profile-only, server 403s | Linda, Isaac, Daniel | `tests/e2e/hr/permissions.spec.ts` | **Not started** |
| 13 | Leave: Daniel submits -> Linda approves -> calendar updates -> single notification | Daniel, Linda | `tests/e2e/hr/leave.spec.ts` | **Not started** |
| 14 | Attendance: clock-in idempotency, exception on HR Overview | HR employee | `tests/e2e/hr/attendance.spec.ts` | **Not started** |
| 15 | Benefits: create plan, closed-window enrollment rejection/override, life event | Owner | `tests/e2e/hr/benefits.spec.ts` | **Not started** |
| 16 | Perf reviews: create cycle, launch stamps reviews, manager rates report | Owner, manager | `tests/e2e/hr/perf-reviews.spec.ts` | **Not started** |
| 17 | Admin moderation: hide/unhide, cancel, revoke, delete, archive-rejected-if-enrolled, cascade delete | Admin | `tests/e2e/admin/moderation.spec.ts` | **Not started** |
| 18 | Admin plans: create, delete (rejected if live employers on it) | Admin | `tests/e2e/admin/plans.spec.ts` | **Not started** |
| 19 | Admin integrations: connect/disconnect (HR/staffing/employer) | Admin | `tests/e2e/admin/integrations.spec.ts` | **Not started** |
| 20 | Version banner: bump build id, banner renders, Refresh reloads | Any | `tests/e2e/shared/version-banner.spec.ts` | **Not started** |
| 21 | No hard refresh: session cookie across navigations, Cache-Control no-cache on HTML shell | Any | `tests/e2e/shared/no-hard-refresh.spec.ts` | **Not started** |
| 22 | i18n: toggle locale, every critical route renders French, no missing-key literals | Any | `tests/e2e/shared/i18n.spec.ts` | **Not started** |

## Bugs found by this pass

- **CRITICAL — CV ownership never matched (fixed in this pass).** `server/serialize.js`'s
  `serializeCv()` never returned a `user` field, so every client-side `c.user === A.user?.id`
  check (the zero-CV apply gate, the CV picker's active-CV lookup, the 5-CV limit counter) always
  compared `undefined` to a real id and always lost. In production, every seeker — regardless of
  how many CVs they had actually built — was shown "You don't have a CV yet" and blocked from
  attaching one on every single Apply click. Fixed by adding `user: row.user_id`. See
  `tests/e2e/seeker/apply.spec.ts` for the regression coverage.
- **A11y — unlabeled form inputs.** The login and HR-login forms' `<label>` elements
  (`src/design/primitives.jsx` `Field`) render as plain siblings of their `<input>`, with no
  `htmlFor`/`id` pairing — no accessible name for a screen reader or for `getByLabel()`. Worked
  around in `tests/e2e/fixtures/auth.ts` via placeholder-text locators; not fixed (out of scope
  for a test-suite pass, flagged here for a real accessibility fix).
- **Header nav mislabeled expectation.** "Find jobs" in the header nav
  (`src/shells/Header.jsx`) is a category-browse dropdown *toggle*, not a link to `/jobs` — a
  reasonable-looking assumption that turned out wrong; the homepage's "All jobs" CTA is the real
  one-click path. Not a bug (the dropdown is intentional UX), just documented so a future test
  author doesn't repeat the same wrong assumption.

## Playbook rows not yet covered

Rows 6-22 (employer, HR, admin, and 3 of the 4 shared/cross-cutting flows) are not yet
implemented. This was a deliberate stop, not a skip-and-forget: each of the 17 remaining rows
needs the same level of ground-truth verification the first 5 rows did (real component/route
reading, real login-flow discovery, running against a live dev server, fixing locators against
actual rendered text rather than assumed i18n keys) — the first 5 rows alone took substantially
longer than a mechanical "write 22 spec files" pass would suggest, because two of them surfaced
real defects (the CV-ownership bug above, and several wrong-selector assumptions) that only
running the tests against the live app could catch. Extending this matrix is exactly what
`docs/REGRESSION.md`'s "adding a new test" section describes.
