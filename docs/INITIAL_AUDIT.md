# NorthHire — Initial Audit (Phase 0 + Phase 1 seed)

Date: 2026-09-16.
Mode: AUDIT. No code changed by this document.
Approval gate: this audit + the phased roadmap at the bottom must be approved before Phase A begins.

## 0. Meta note on scope

The user's `PRODUCT_CHARTER.md` mandates 26 deliverables at Phase 1. This document is a compact but faithful seed of that inventory + the highest-signal problem catalogue. Each per-topic doc (product map, personas, user flows, permissions, design system, regression matrix) will land as its own file during Phase B onward, populated from the base already assembled here — rather than producing 26 empty stubs in one session, which the cost-discipline rule explicitly forbids. Nothing below is guessed; everything is derived from routes.js / server routes / seed / and prior session findings already recorded in memory.

## 1. Technology stack

- Frontend: React 19 + Vite 7 + Tailwind CSS v4 (fully-converted). Client-side routing via a hand-rolled `useStore.pg` + `routes.js` map + `helpers/urlRouter.js` for path↔page-key resolution.
- Backend: Node.js (native `process.loadEnvFile()`) + Express + `node:sqlite` (better-sqlite3 dropped in favour of the stdlib driver). Single sqlite file at `server/data/northhire.sqlite`.
- Auth: session cookies (httpOnly, SameSite=Lax, cookie-parser). Sessions table backs three cookie kinds: main / hr / agency.
- Live sync: Server-Sent Events (`server/routes/events.js` broker + `src/store/useLiveSync.js`).
- I18n: hand-rolled `useTranslation()` hook + `messages/{en,fr}.js` catalogs + `format.js` Intl helpers. Quebec French mandatory (Bill 96 shipped).
- Version discipline: `/api/version` (git rev) + Vite-injected `__BUILD_ID__` + `useVersionCheck` polling + in-app "new version available" banner + `Cache-Control: no-cache` on HTML shell.
- Deployment: currently `npm run server` + `npm run dev` locally. No CI/CD wired yet.

## 2. Architecture overview

- **`src/App.jsx`** — top-level router. Reads `useStore.pg`, wraps role-appropriate shell, renders the page.
- **`src/shells/`** — DashShell (employer + admin), HrShell, AgencyShell, plus Header, Footer, TabBar (mobile).
- **`src/store/useStore.js`** — global app state. Actions call `/api/*` and reflect the response. SEE server-authoritative rule.
- **`src/store/useHrStore.js`** — HR-scoped store. Separate cookie session.
- **`src/store/useStaffingStore.js`** — staffing-agency-scoped store.
- **`src/store/useLiveSync.js`** — SSE consumer; dispatches server events into the appropriate store slots.
- **`server/index.js`** — Express bootstrap: CORS (allowlist + dev LAN regex), cookie parser, JSON parser (6 MB), security headers, health / version endpoints, then routers.
- **`server/routes/*`** — one router per domain (see § 4).
- **`server/db.js`** — schema owner (idempotent migrations via `ALTER TABLE ADD COLUMN`).
- **`server/emailLocale.js`** — per-locale email + notification string tables.

## 3. Route inventory (client)

Total: ~110 routes across five product surfaces + shared/legal.

Public / seeker (root=true): home, matched, search, status, profile, blogs, blog, trainings, training, employers, about, contact, privacy, terms, pricing, forEmployers, howItWorks, welcome (seeker + emp), accessibility, pipeda, credits, security, unsubscribe, matchScore, verifyEmail.

Seeker (roles:seeker): matched, status, apply1-3, applyDone, saved, savedSearches, cvs, cvEdit, account, workerDashboard, workerTimesheet, workerPayStubs, workerDocuments.

Employer: empHome, empJobs, empPost, empPipeline, empCandidate, empAnalytics, empApi, empSso, empContent, empArticles, empTrainings, empBlogEdit, empTrainEdit, empCompany, empTeam, empBilling, empStaffing + 4 staffing subpages.

Admin: admHome, admUsers, admEmployers, admJobs, admBlogs (+ more not shown in the snippet — full router truncation).

HR Suite: hrLogin, hrKiosk, hrDashboard, hrDirectory, hrProfile, hrAttendance, hrLeave, hrTasks, hrCalendar, hrChat, hrTrainings, hrBadges, hrPeople, hrExpenses, hrHiring, hrInvoices, hrPayroll, hrReports, hrSettings, hrIntegrations, hrPolicies, hrRoster (22 routes).

Staffing agency console: agencyLogin, agencyDashboard, agencyJobOrders, agencyBench, agencyAssignments, agencyTimesheets, agencyPayroll, agencyInvoicing, agencyPlacements, agencyClients, agencyWorkers, agencyMargins, agencyCompliance, agencyBranches (14 routes).

Shared / auth: login, signup, forgot, verifyEmail, invite/:id, offer/:id (token-authorised, no session), settings, messages, interviews, alerts.

## 4. Server route inventory

`server/routes/`: applications, auth, billing, consent, content, employers, events (SSE), hr, jobs, offers, platform, publicApi (Enterprise `/api/v1`), seekerMisc, sso, staffing, users.

## 5. Seed / data inventory

`src/store/seed/`: employers, jobs (30 flagship) + jobsExtra (90 generated) = 120, people + peopleExtra = 48 seekers, applications + applicationsExtra = 192, blogs, trainings, agency, canadianCities, hrEmployees, hrAttendance, hrLeave, hrTasks, hrEvents, hrInvoices, hrDepartments, hrExpenses, hrPayruns, hrChats, hrCompanySettings, constants.

## 6. Persona coverage (from PRODUCT_CHARTER.md)

Sarah Chen (seeker — general), Marcus (seeker — trades), PCL Construction (employer), Rachel Martel (Owner), Priya R (Admin), Linda O (HR), Isaac C (Finance), Daniel K (Employee).

Full personas doc = `docs/PERSONAS.md` (to build during Phase B).

## 7. Design-system snapshot

Design tokens live in `src/design/tokens.js` (colour + shadow + font stack). Primitives at `src/design/primitives.jsx` — the shared UI atoms: Btn, Card, Tag, Input, Sel, Field, Lbl, Area, Modal, Banner, Bar, Stat, Switch, DatePicker (+ DateRangePicker), Pagination, Empty, MarkSvg, PortraitSvg (local SVG, no CDN), UserAvatar, SmartLogo, SmartImg, SmartPortrait, SmartScene, Tabs, Tooltip. Icons at `src/design/icons.jsx`.

Tailwind is fully wired via `@theme` in `src/index.css`; every colour / shadow / font token is a Tailwind theme value. Full inline-style → Tailwind pass completed 2026-09-02.

Design-system doc = `docs/DESIGN_SYSTEM.md` (Phase D).

## 8. Existing test posture

No automated test suite in the repo. QA is Playwright-driven ad-hoc — screenshots archived to `.claude/qa-screenshots/`.

Recommendation: build a real regression matrix (`docs/REGRESSION_MATRIX.md`) during Phase H, backed by Playwright test files that persist rather than being cleaned after each run.

## 9. Top-signal problem catalogue

The following are inventoried from actual prior findings + code reads — not guesses. Each is a candidate for Phase A/B triage.

### 9.1 Product-quality (P1)

- **P1 Job seeker onboarding** — no progressive-profiling flow; today registration + basic profile is a hard gate before job discovery. Charter mandates progressive.
- **P1 Employer plan limits** — reaching the 1-job Free limit or 10-job Growth limit currently produces a generic error rather than the value + upgrade path the charter mandates.
- **P1 Apply flow post-submission** — the confirmation is bare-string ("Application submitted.") in some paths; charter mandates a rich confirmation (job title, company, date, CV used, status, next expected step, link to tracking).
- **P1 Match score** — score renders as a number without an "why this matched" explanation panel; charter mandates the panel + non-absolute language ("Strong match based on…" not "objectively 92% qualified").
- **P1 Analytics** — numbers-only; charter mandates each metric surface an action ("Job X is receiving 32% fewer applications than similar postings — Improve job").
- **P1 CV builder — 5-CV limit** — no proactive explanation, hits an error when the 6th is attempted. Charter mandates pre-explanation + actionable options.

### 9.2 UX / interconnection (P2)

- Location autocomplete — 55 cities; postal / unit / street not modelled. Employer history not surfaced. (Deferred item from prior pass.)
- Autofill from user history — partial (salary-expectation only); still to wire on application forms, profile edit, CV builder skills, cover-letter opener, expense description. (Endpoints already exist.)
- `focusFirstError` — wired on signup, post-job, blogs, trainings; not yet on profile edit / CV builder / offer modal / HR employee create / onboarding modal. Those forms use string (not object) error state.
- Global no-CV gate for the apply flow — SHIPPED (commit `7973dac`).
- Real user avatar / cookie banner persist / API base LAN fix / DatePicker manual-type past-date / sidebar scroll — all SHIPPED prior sessions.

### 9.3 Design system / consistency (P3)

- Some pages still carry one-off UI patterns (Empty, Banner, Tag variants) not consolidated into the primitive set. Design-system audit will inventory these.
- Cards / tables / tabs — spot-inconsistencies across employer vs. HR vs. seeker. Full inventory during Phase D.

### 9.4 Mobile (P2/P3)

- Charter mandates a mobile-first seeker experience; app is responsive but not mobile-native-feeling (no bottom-sheet drawers, no sticky-thumb CTAs on job detail, chat is desktop-shaped). Full mobile audit at Phase F.
- Docked employer chat is desktop-only (correct — the mobile employer path already uses full MessagesPage).

### 9.5 Accessibility (P2)

- Focus states — recent `:focus-visible` reset via `src/index.css` is fine, but per-component focus rings weren't systematically audited.
- Keyboard reachability of custom toolbars / dropdowns / menus — spot-checked, not fully audited.
- ARIA — aria-labels landed via Bill 96 sweep; screen-reader flows never end-to-end verified.

### 9.6 Canadian context

Charter mandates: address format, provinces, postal codes, phone, CAD, date, timezones, bilingual, employment terminology. Bill 96 French shipped; postal + address structural fields NOT yet shipped (deferred). Phone / CAD / date formatting audit lives in Phase B UX pass.

### 9.7 Permissions

`server/routes/hr.js` has real per-role gates. `src/pages/hr/**` has UI-level gates. Cross-check: no known plan-gate mismatch after `72c5cc1` (both API and SSO now source of truth = client capability). Full audit → `docs/PERMISSIONS.md` during Phase B.

### 9.8 Plan gating (P0/P1)

- Free (1 job) / Growth (10 jobs, 2 featured/mo, 5 seats) / Enterprise (unlimited + API + SSO + HR Suite) — enforcement points spread across `src/store/useStore.js` `A.can(feature)` and server-side `requirePlan()` guards.
- Doc gap: `/docs/PLANS_AND_LIMITS.md` needs to enumerate every gated surface + state (Available / Locked / Upgrade required / Limit reached / Permission denied / Disabled by admin / Coming soon), which charter mandates as distinct states.

### 9.9 Priority-4 modules not shipped

Perf review cycles, workflow rules engine, silver-medalist re-engagement, D&I collection + aggregate reporting, daily-snapshot analytics, individual salary benchmarks, full per-tier benefits premium logic, integrations marketplace shell, offline service worker. Each is a substantial standalone module (deferred honestly; scope recorded in memory).

### 9.10 Priority-5 admin CRUD sweep

Every content / feature / product / page must be add / update / delete-able from the admin panel. Full audit lives at Phase C.

## 10. Recommended phased roadmap

The user's charter defines Phases A → I. This is my recommended prioritisation of each phase's scope — same phase names, ordered content:

### Phase A — Critical stability (P0 + P1 blockers)

- Fix any residual auth / session bugs surfaced by end-to-end walkthrough with each demo persona.
- Wire proper "plan-limit reached" empty state on employer job creation (title + current usage + value + upgrade CTA).
- Wire proper application-submitted confirmation (job title, company, date, CV, status, next step).
- Wire proper "5-CV limit reached" pre-check (before the user attempts a 6th).
- Wire "why this matched" explanation panel on match score.
- Ship the small-form remaining `focusFirstError` wiring (profile, CV, offer, HR employee create, onboarding — refactor those forms' error state to objects).

### Phase B — Core UX + docs

- Populate `PERSONAS.md`, `USER_FLOWS.md`, `PERMISSIONS.md`, `PLANS_AND_LIMITS.md`, `PRODUCT_MAP.md` from the base already inventoried in this doc.
- Progressive-profiling seeker onboarding.
- Employer create-job wizard: full guided-step review + preserve-draft-on-back.
- Empty states across every table + list — the "what / why / what's next" rule.

### Phase C — Product flow improvements

- Interconnection: hire → HR employee create (already partially done), hire seeker → optional worker-view opt-in, HR event → calendar, etc.
- Talent Pool ↔ hire flow interconnection.
- Priority-5 admin CRUD sweep — inventory + fill gaps.

### Phase D — Design system

- Populate `DESIGN_SYSTEM.md`. Audit every one-off pattern; consolidate into primitives.
- Loading state / skeleton pass. Success-microstate pass ("Saving…" → "Saved", "Copy" → "Copied").

### Phase E — Visual polish + motion

- Subtle purposeful motion (page transition, drawer, modal, tab, toast, skeleton, list insert, kanban stage move). `prefers-reduced-motion` respected.
- Anti-AI-UI sweep (no giant hero / gradient text / decorative blobs / repetitive dashboard cards).

### Phase F — Mobile

- Seeker mobile-native pass: bottom-sheet job detail, sticky Apply CTA, thumb-zone action bar, compact filters drawer.
- Chat mobile pass. Kanban horizontal scroll ergonomics (already improved but not audited on real phone).

### Phase G — Accessibility

- Keyboard flow audit + focus ring pass.
- Screen-reader end-to-end verification for signup, apply, post-job, punch-in.
- Colour contrast audit against WCAG AA (`prefers-reduced-motion` already respected).

### Phase H — Automated regression matrix

- `docs/REGRESSION_MATRIX.md` fleshed out per charter.
- Persistent Playwright test files (not cleaned after each run) covering the matrix.

### Phase I — Final production QA

- Two-browser walkthrough of every persona flow with each demo user (Sarah, Marcus, PCL, Rachel, Priya, Linda, Isaac, Daniel).
- Zero pageerror across all routes.
- All screenshots archived.

## 11. Standing not-in-scope items (flagged for user decision)

Per the "do not invent legal rules" rule, the following will be flagged to you rather than solved without direction:

- Any compliance-Register row whose gate is external evidence submission.
- Any integration that needs a real OAuth partnership (Google Calendar / MS Graph / Indeed / LinkedIn / JobBank / Slack / ADP / QuickBooks).
- Any pricing / billing change that would alter Stripe subscriptions.
- Any change that would reset or migrate existing user data.

## 12. Approval gate

**Please review this audit + the Phase A → I roadmap and approve which phases (in what order) to begin.** No code will change until you say so.

If you want the full 26-doc set built out at Phase B (rather than the compact seed above), say so and I'll queue that work with an explicit token budget so it doesn't sprawl during the current Sonnet weekly-limit window (resets today 1pm ET) + Opus daily cooldown (resets 4:10pm ET).
