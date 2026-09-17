# NorthHire — HR Suite Transformation Plan

Date: 2026-09-16. Mode: **IMPLEMENTATION PROPOSAL.** No code changed by this document.

## Guiding principle (from your brief)

**RECRUIT → HIRE → MANAGE.** The HR Suite is NorthHire's natural continuation, not a bolt-on. Each role sees a role-aware experience; no unauthorized information is exposed. The modules (attendance, leave, tasks, training, calendar, chat) feel interconnected — a leave request updates the calendar and notifies the manager; a training assignment lands as a task with a notification and progress.

## Approach

Six tranches. Each ships end-to-end, each is one commit unit, each verified in a live browser page-load with real HR demo users (Rachel/Priya/Linda/Isaac/Daniel). Reuses primitives from seeker + employer transformations (`SuccessCard`, `BottomSheet`, `MatchScoreDrawer`, `StatusPill`, `ProactiveNudge`, `FeatureBoundary`, `ActionStackCard`).

Findings referenced by UX_AUDIT IDs (HO-* / HA-* / HR-* / FI-* / EE_EMP-* / X-*).

---

## TRANCHE H1 — Recruit → Hire → Employee: the seamless handoff (T3, EE_EMP-04, HR-03)

**Goal.** When an employer hires a NorthHire candidate, the resulting HR employee record is populated from the candidate's profile automatically. No duplicate data entry. Employee's public NorthHire profile stays in sync where appropriate, with the employee's explicit consent.

### Before

`HireOnboardingModal` (fixed `bd42eaa`) creates an `hr_employees` row from the candidate but only carries the candidate's name, email, offered comp, start date. Skills, CV history, education, portrait seed, address — all silently dropped. Employee's public NorthHire profile and HR profile are separate objects with no sync.

### After

- **Extended handoff on hire**: HireOnboardingModal copies candidate → employee: name, email, portrait, phone, city/province, skills, education, work history summary (as a note), CV files (attached as document records with proper category).
- **Sync consent**: Employee sees a first-visit banner in their HR portal: "Sync your NorthHire seeker profile with this HR profile? Skills, education and work history will stay linked." Opt-in only. Linked fields get a small "Synced" indicator on both sides; unlink one-click.
- **Training completion → public badge** (HR-03): when an employee completes a training, they get a "Publish this to your NorthHire profile?" prompt. Consenting produces a "Certified in X" badge visible on the seeker profile.
- **New seeker → employee** (worker-view opt-in): when an employer hires via NorthHire, the seeker sees a post-hire "You now have access to your employer's HR portal" banner in seeker Status page. Tap → HR portal login prefilled with their email.

### Files touched

- `src/pages/shared/HireOnboardingModal.jsx` (extended payload)
- `server/routes/hr.js` (POST `/hr/employees` accepts extended payload; new POST `/hr/employees/:id/sync-consent`)
- `src/pages/hr/HrProfilePage.jsx` (sync banner, linked-field indicator)
- `src/pages/seeker/StatusPage.jsx` (post-hire banner)
- `src/pages/hr/HrTrainingsPage.jsx` (publish-to-profile prompt on completion)
- `src/store/useHrStore.js` + `src/store/useStore.js` (linked-field consent state + selectors)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Candidate has fields employee doesn't (`years`, `payMin`) — decide per field whether to carry, ignore, or store as note.
- Existing seed HR employees (Rachel/Priya/Linda/Isaac/Daniel) must not accidentally be re-synced against seed seekers with matching names.
- Employee's public NorthHire profile must never expose employer-private info (comp, manager, department).

### Tests

- Playwright: employer hires seeker Sarah → HR portal shows Sarah with skills + education carried over.
- Rachel (Owner) triggers a training → Daniel completes it → prompt to publish → confirm → seeker profile shows badge.

### Complexity: **M**

---

## TRANCHE H2 — Role-aware navigation & permissions audit (charter permissions section)

**Goal.** Each role sees a coherent HR nav prioritized around their responsibilities. Server-side permissions enforced; UI matches. `docs/PERMISSIONS.md` published.

### Before

`HrShell.jsx` shows the same nav to every role. Some routes render but immediately show "not authorized" on data fetch — silent 401 pattern (a charter anti-pattern). No documented permissions matrix.

### After

- **Role-scoped nav sections** driven by a per-role manifest:
  - **Owner (Rachel)**: Overview / Organization / People / Attendance / Leave / Training / Finance / Reports / Settings / Integrations / Billing / Policies
  - **Admin (Priya)**: Overview / People / Attendance / Leave / Tasks / Calendar / Training / Chat / Settings / Roster / Policies
  - **HR (Linda)**: Overview / People / Attendance / Leave / Tasks / Calendar / Training / Chat / Onboarding / Policies
  - **Finance (Isaac)**: Overview / Finance-specific: Payroll / Invoices / Expenses / Reports. Everyone-view of People (name + department only, no personal).
  - **Employee (Daniel)**: My Overview / My Profile / My Attendance / My Leave / My Tasks / My Calendar / My Training / Chat / My Documents
- **Server enforcement audit**: for every HR endpoint, verify the role gate. Fix any UI-only gates.
- **Consistent locked/denied states**: charter's 6 states (Available / Locked / Upgrade required / Limit reached / Permission denied / Disabled by admin / Coming soon) rendered via `<FeatureBoundary>` (from employer E6).
- **`docs/PERMISSIONS.md`** — matrix per role × per action.

### Files touched

- `src/shells/HrShell.jsx` (per-role nav manifest)
- `server/routes/hr.js` (audit + fix every route's role gate)
- `docs/PERMISSIONS.md` (new)
- All `src/pages/hr/**` pages (deny states rendered via FeatureBoundary)
- `src/i18n/messages/{en,fr}.js`

### Risks

- A locked-down permission change could break existing HR demo accounts — verify each role logs in and sees the correct nav.
- Server-route audit may surface real security gaps — fix them; those are P0 within this tranche.

### Tests

- Playwright login as each of Rachel/Priya/Linda/Isaac/Daniel; walk their nav; verify they can access what the matrix allows + get useful "not authorized" states for what they can't.
- Attempt server-side unauthorized calls with each role's cookie; assert 403.

### Complexity: **L**

---

## TRANCHE H3 — Action-oriented Overview (HO-01, HA-*, HR-02, EE_EMP-*, X-08)

**Goal.** HR Overview is role-aware, answers "what requires my attention today?" Interconnection between modules starts here.

### After

Reuses `<ActionStackCard>` primitive from employer E1.

- **Owner (Rachel) Overview**: Org-health tiles (headcount trend, attendance rate, leave utilisation, hiring pipeline count) + action stack (pending role changes, department budget alerts, leave overuse, headcount reports due).
- **Admin (Priya) Overview**: pending user invites, role changes to review, settings changes to approve, pending timesheet corrections.
- **HR (Linda) Overview** (biggest change): today's attendance exceptions (HR-02: "3 employees clocked in late today, 1 missed clock-out yesterday"), pending leave requests (with balance in-context — HR-01), tasks due today, upcoming interviews, overdue training assignments, new hires needing onboarding.
- **Finance (Isaac) Overview**: pending payroll runs, invoices due, expense approvals waiting, payroll register export ready.
- **Employee (Daniel) Overview**: my clock-in status, my leave balance, my tasks due today, my upcoming events, my training progress, my recent pay stub.

### Files touched

- `src/pages/hr/HrHomePage.jsx` (role-aware Overview)
- `src/store/useHrStore.js` (`hrAttentionQueue(role, userId)` selector composing existing selectors)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Action stack sourced from many stores — memoise carefully.
- Employee overview must not leak org-level data.

### Tests

- Playwright: each demo role logs in → Overview matches expected priority stack + no cross-role data.

### Complexity: **M**

---

## TRANCHE H4 — Employees as central object (HA-02, X-06 terminology, T3)

**Goal.** Employee Profile is the central HR object. All interactions (attendance, leave, tasks, training, chat) discoverable from and returning to it.

### After

- **HrProfilePage redesign**: hero (portrait, name, role, department, manager, tenure) + tabbed detail (About / Attendance / Leave / Tasks / Training / Documents / Salary — Finance-only / Communication).
- **Timeline** (HA-02): role changes, department moves, promotions, leave events, training completions — chronological.
- **Interconnection**: from any module (leave approval, attendance exception, task assignment), one click → employee profile scrolled to the relevant tab, back-nav returns to the module. Reuses seeker's focus-scroll pattern.
- **1:1 log** (already partially built) — surfaced on profile for the manager view.
- **Directory redesign**: same StatusPill pattern for employment status (Active / On leave / Probation / Terminated); filters by department, role, location, hiring cohort.

### Files touched

- `src/pages/hr/HrProfilePage.jsx` (redesign)
- `src/pages/hr/HrPeople.jsx` (Directory redesign)
- `src/pages/hr/HrTimeline.jsx` (new)
- `src/store/useHrStore.js` (unified employee-selector, timeline aggregator)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Timeline aggregates from many tables — pagination + lazy load.
- Salary tab must ONLY render for Finance/Owner (server-enforced).

### Tests

- Playwright: Linda opens Daniel's profile → all tabs load, no salary tab visible; Isaac opens same → salary tab visible.
- From attendance exception row → Daniel profile → Attendance tab pre-scrolled to the flagged event.

### Complexity: **L**

---

## TRANCHE H5 — Interconnection: leave, attendance, tasks, training, calendar, chat (HR-01, HR-02, HR-03, EE_EMP-01, EE_EMP-02, T4)

**Goal.** The six charter-listed modules feel like one product. Every action ripples: leave → calendar + notification; training → task + notification + progress; task → notification + completion.

### After

- **Leave request flow** (HR-01, EE_EMP-02):
  - Employee side: leave form shows remaining balance for the type inline; warns/blocks over-balance per company policy.
  - Manager/HR side: approval modal shows request + balance + carry-forward + team overlap for those dates. Approve → calendar auto-updates, task assignment auto-blocked for those dates, notification to employee.
- **Attendance exceptions** (HR-02, EE_EMP-01):
  - Server: reject a second `open` shift when one is already open (fix).
  - Client: disable clock-in during inflight.
  - Late/missed exceptions surface on HR Overview (H3) and on the employee profile timeline (H4).
- **Training assignment → task + notification + progress**:
  - Assigning a training creates a task on the employee's list with due date; notification fires.
  - Progress updates on the task from the training module.
  - Completion → notification + optional publish-to-seeker-profile prompt (H1 continued).
- **Task assignment → notification + calendar entry (if due-dated)**:
  - Assigning a task with a due date creates a calendar event.
  - Completion notification to the assigner.
- **Chat improvements**:
  - Deep-link from any employee context ("Message Daniel about his leave") → chat opens with the right thread pre-selected.
  - "Templates" button (reused from employer E4): welcome new hire / leave approved / task assigned / birthday / anniversary.

### Files touched

- `src/pages/hr/HrLeavePage.jsx` (employee + approver views)
- `src/pages/hr/HrAttendancePage.jsx` + `server/routes/hr.js` attendance idempotency
- `src/pages/hr/HrTrainingsPage.jsx` (assignment → task)
- `src/pages/hr/HrTasksPage.jsx` (calendar event on due date)
- `src/pages/hr/HrChatPage.jsx` (deep-link + templates)
- `src/pages/hr/HrCalendarPage.jsx` (leave + task events)
- `src/store/useHrStore.js` (cross-module wiring)
- `server/routes/hr.js` (idempotency + interconnected side effects)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Idempotency change on clock-in is a real API contract — verify existing clients handle it.
- Cross-module side effects can cascade — each change fires exactly one notification, not one per module involved.

### Tests

- Playwright: Daniel submits leave → Linda approves → calendar updates → tasks in that range not assignable → Daniel gets one notification.
- Rachel assigns training → Daniel gets task + notification → completes → Rachel gets notification.

### Complexity: **L**

---

## TRANCHE H6 — Finance surface (FI-01, FI-02) + polish

**Goal.** Finance role feels clearly walled. Payroll → pay stub flow is end-to-end with per-employee status.

### After

- **"Viewing as Finance" indicator** (FI-01): small badge in the topbar when the current view exposes financial data. Prevents Owner-viewing-Finance confusion.
- **Payroll run → pay stub status** (FI-02): per-employee column (Draft / Sent / Viewed / Downloaded / Disputed).
- **Invoice flow polish**: attach candidate reference (source: which staffing placement produced this invoice), tie to `agencyPlacements` where applicable.
- **Expense category management**: admin-editable expense categories in HrSettings (already partial).
- **Polish pass**: motion consistency with the rest of the app, mobile pass on Employee-facing surfaces (My Overview, My Profile, My Leave, My Tasks, My Training).

### Files touched

- `src/pages/hr/HrPayrollPage.jsx`, `src/pages/hr/HrInvoicesPage.jsx`, `src/pages/hr/HrExpensesPage.jsx`
- `src/shells/HrShell.jsx` (Finance indicator badge)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Pay stub status requires an audit log on the pay stub endpoint (view + download events).
- Mobile pass on employee surfaces must not regress desktop.

### Tests

- Playwright: Isaac creates a payroll run → Daniel sees pay stub → status flips to Viewed.
- Rachel opens Payroll (Owner-view-as-Finance) → sees the same data + Finance indicator badge.

### Complexity: **M**

---

## Cross-tranche primitives (mostly reused, minimal new)

- Reused from seeker/employer: `<SuccessCard>`, `<BottomSheet>`, `<MatchScoreDrawer>` (adapted for match-employee-to-training match), `<StatusPill>` with tooltip, `<ProactiveNudge>`, `<FeatureBoundary>`, `<ActionStackCard>`.
- New: `<RoleBadge>` (Finance / Admin / Owner visual indicator when viewing role-scoped data), `<InterconnectionLink>` (small chip showing "→ affects calendar" or "→ notifies manager" during side-effect actions).

## What is EXPLICITLY OUT OF SCOPE for this transformation

- Priority-4 modules: perf review cycles, workflow rules engine, silver-medalist re-engagement, D&I collection, daily-snapshot analytics, integrations marketplace shell, offline SW (each is its own build).
- Staffing agency console.
- Admin platform surfaces (their own transformation).
- Server-side email/notification i18n sweep.
- Full per-tier benefits premium logic (its own module).
- Real payroll tax calculations beyond what's already computed (its own compliance pass).

## Rollout order and check-in cadence

- **H1 → verify live → check in.** (handoff continuity is prerequisite for everything else)
- **H2 → verify live → check in.** (permissions matrix must be locked before role-aware UI ships)
- **H3 → verify live → check in.**
- **H4 → verify live → check in.**
- **H5 → verify live → check in.** (largest — expect dedicated session, possibly two)
- **H6 → verify live → check in.**

Each tranche: one commit (or small chain), Playwright zero-pageerror across affected routes tested with each demo HR user (Rachel, Priya, Linda, Isaac, Daniel), screenshots to `.claude/qa-screenshots/hr-transformation/`, short report.

## Model routing per tranche (cost discipline)

- H1, H3, H4, H6 — **Sonnet** default.
- H2 — permissions audit needs judgment; **Sonnet** for the manifest work + audit, **Opus** if a subtle bug surfaces.
- H5 — cross-module wiring is judgment-heavy; **Sonnet** primary.

## Risks common to all tranches

- HR demo accounts are the ground truth for role scoping — every tranche verified against Rachel/Priya/Linda/Isaac/Daniel.
- Seed data must not shift under our feet during audit (seed is versioned; `ff66f7f` made it additive).
- Server-side role gates fixed in H2 are the source of truth; UI in H3-H6 renders around what the server allows.
- Interconnection cascades in H5 must fire ONE notification per action, not N.

## Approval gate

Please pick one:

1. **All 6 tranches, in order, per-tranche check-in.**
2. **H1 + H2 first** (handoff + permissions foundation); check in; then H3 + H4; then H5 + H6.
3. **One specific tranche** — name it.
4. **Adjust scope** — call out anything to add or remove before we begin.

Nothing HR-side touches code until you answer.
