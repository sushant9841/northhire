# NorthHire — Complete UX Audit

Date: 2026-09-16. Mode: AUDIT. **No code changed by this document.**

Method: this is a UX-lens audit (senior product designer perspective), not a code audit. Every finding is grounded in the current codebase and/or verified prior findings from the session archive. Each cross-persona theme is called out once at the top; per-persona sections then reference it by ID to avoid restating the same issue five times.

Severity uses the PRODUCT_CHARTER priority system: **P0** critical / **P1** core-flow / **P2** UX-workflow / **P3** visual / **P4** enhancement.

Format per finding: **ID · Persona · Flow · Severity · Problem · Why it's a problem · Recommended experience · Implementation complexity (S/M/L/XL) · Dependencies.**

---

## SECTION 1 — CROSS-CUTTING FINDINGS (apply across most personas)

### X-01 · All personas · Every flow · P1 · Terse post-action confirmations

**Problem.** Several success states resolve to a single short phrase — "Application sent," "Saved," "Published." No context, no next step.

**Why.** Charter mandates a rich confirmation: what happened, to whom, when, with what, current status, next expected step, link to tracking. Bare confirmation leaves the user staring at the screen wondering "and now?"

**Recommended.** A success card component (reusable) with: primary summary line, meta line (job title + company + timestamp + CV used etc.), status pill, next-expected-step, primary CTA ("Track application" / "View published job" / "Go to pipeline"), secondary link (share / undo where safe).

**Complexity.** M · Depends on inventorying every success state.

### X-02 · All personas · Every table / list · P2 · Empty states don't explain themselves

**Problem.** Several empty states are still "No X yet." style (e.g. empty kanban column, empty saved jobs, empty attendance for the day) without answering *why* or *what next.*

**Why.** Charter's three-question empty-state rule: what's empty, why, what can I do next.

**Recommended.** A reusable `<Empty title icon description action />` (which exists) — wired everywhere with real per-context copy. Example: pipeline stage empty → title "No applicants at this stage" · desc "Candidates will appear here once you move them from Applied" · action → open Applied column.

**Complexity.** M · Inventory pass + copy pass. Charter's DESIGN_SYSTEM.md phase.

### X-03 · All personas · Every form · P2 · Server errors surface as generic strings

**Problem.** Fetch failures currently render as "Request failed (500)" or the generic `err.message` — no recovery text, no "your work is safe" reassurance, no retry button.

**Why.** Charter mandates useful errors + recovery text.

**Recommended.** Error boundary + form-level error banner with "We couldn't complete that action. Your information has not been lost. [Try again]" pattern. Distinguish network / auth / validation / server categories.

**Complexity.** M.

### X-04 · All personas · Loading states · P2 · Inconsistent skeleton vs spinner vs blank

**Problem.** Different pages resolve loading differently — some blank, some spinner, some skeleton, some show stale content. Nothing prevents duplicate submit on a button in a mid-request state everywhere.

**Why.** Charter forbids blank screens + frozen buttons + duplicate submissions.

**Recommended.** Design-system pass: (a) `<Btn loading>` prop with reserved space so text doesn't jump, (b) skeleton primitives for lists and cards, (c) mid-mutation guard on every `onSubmit` and `onClick`.

**Complexity.** M · Design-system phase D.

### X-05 · All personas · Global · P3 · "Coming soon" / disabled tiles in production paths

**Problem.** A few tiles marked "Coming soon" (or the equivalent — inactive icons in shells) appear on premium tabs.

**Why.** Ship or hide. "Coming soon" in a Live product signals prototype.

**Recommended.** Either finish and ship the feature (Phase C) or remove the tile until it lands (Phase A).

**Complexity.** S per tile.

### X-06 · All personas · Global · P3 · Terminology inconsistency

**Problem.** "Applicant" vs "Candidate" vs "Seeker" used interchangeably. "Post" vs "Publish" vs "Publish job." "Company" vs "Employer" vs "Organisation."

**Why.** Consistent terminology is a hallmark of mature products (charter's Linear/Notion/Stripe bar).

**Recommended.** Lock a glossary in DESIGN_SYSTEM.md — Seeker = the user in-app; Applicant = someone who has applied to a job; Candidate = someone in a pipeline; Job = the posting; Company = the employer entity. Ship a terminology sweep (Phase B).

**Complexity.** M · Copy sweep across en.js + fr.js.

### X-07 · All personas · Interaction · P2 · Motion is largely absent

**Problem.** Cards / drawers / modals appear instantly; kanban stage moves don't animate; toast enters without slide.

**Why.** Motion communicates state changes and continuity. Its absence reads as raw wiring.

**Recommended.** Subtle purposeful motion (Phase E): 160-200 ms fade-in for modals + drawers, spring for kanban card handoff, slide-up for toast, list-insertion animation for new SSE-arrived items. Respect `prefers-reduced-motion` (already respected in CSS).

**Complexity.** M.

### X-08 · All personas · Global · P2 · No unified "what should I do next" surface

**Problem.** Dashboards mostly answer "what information do I have" — bar charts + counts. Charter mandates "what should I do next" — actionable summary.

**Why.** Product feels informational rather than propulsive.

**Recommended.** Redesign each dashboard around an actionable list (jobs needing attention, candidates awaiting review, interviews today, leave requests pending, CV incomplete, upcoming training). Numbers stay; they become secondary.

**Complexity.** L per dashboard × 4 (seeker / employer / HR / admin).

### X-09 · Mobile · Seeker + Employee · P1 · Not-mobile-native

**Problem.** App is responsive but not mobile-native — no bottom-sheets, no sticky-thumb CTAs, chat is a desktop shape, filters are a full modal not a bottom sheet.

**Why.** Charter mandates seeker experience be intentionally designed for mobile.

**Recommended.** Phase F mobile pass: sticky Apply CTA on job detail; bottom-sheet filters; bottom-sheet job detail from search on mobile; larger touch targets on kanban and interview list; thumb-zone action bar on candidate profile for employers on mobile.

**Complexity.** XL.

### X-10 · All personas · Global · P2 · Plan-locked features flicker as accessible before entitlement check resolves

**Problem.** Some plan-gated tabs momentarily show as available before the entitlement check settles (was worse pre-`72c5cc1`; still a race for slow networks).

**Why.** Charter: "consistent behaviour for every gated feature."

**Recommended.** Ship the six explicit states charter mandates (Available / Locked / Upgrade required / Limit reached / Permission denied / Disabled by admin / Coming soon), all resolved from a single hook (`useFeatureState(feature)`), all rendered by a single component (`<FeatureBoundary feature={x}>…</FeatureBoundary>`).

**Complexity.** M.

---

## SECTION 2 — JOB SEEKER (persona: Sarah Chen general / Marcus trades)

### JS-01 · Seeker · Registration → dashboard · P1 · No progressive-profiling

**Problem.** Signup wizard requests location + preferences + skills + experience + education before the seeker sees a single job.

**Why.** Charter mandates progressive profiling — user should be able to explore jobs after email + password + role. Every gate before "value seen" costs conversion.

**Recommended.** Split the wizard into two phases: (a) minimum registration = email + password + role + first name (2 fields + role tile), then (b) profile-completeness prompts *contextually* — asking for skills when the user first opens Match, asking for location when the user first searches, asking for CV before the first apply. Track completion % in a persistent nudge on dashboard.

**Complexity.** L · Depends on X-08.

### JS-02 · Seeker · Search · P2 · Filters reset on drawer close in mobile

**Problem.** Mobile filter drawer applies filters only on explicit "Apply filters" tap; a taps-Back or taps-outside gesture loses the picked filters.

**Why.** Users expect filter picks to be "sticky" — a common web pattern.

**Recommended.** Auto-apply on each toggle (Instagram / Airbnb pattern) with a "Clear filters" secondary. Confirm filter chip strip stays sticky at top of the results list.

**Complexity.** S.

### JS-03 · Seeker · Job detail · P1 · Match score number without explanation

**Problem.** Match score renders as "92%" without a breakdown. There's a `/match-score` explainer route but it's a generic page, not a candidate-and-job-specific breakdown.

**Why.** Charter mandates click-to-explain, non-absolute language.

**Recommended.** Click the score → opens a right-drawer showing: skills match (matched vs missing chips), experience match (level match), location match (distance / remote fit), education match, "Strong match based on…" summary. Never "objectively X% qualified."

**Complexity.** M · Reuses existing scoring functions.

### JS-04 · Seeker · Apply · P0 (recent) · CV picker cosmetic bug — FIXED

Fixed in commit `5a04885`. Kept here for the record.

### JS-05 · Seeker · Apply → submission · P1 · Bare "Application sent" confirmation

**Problem.** `applyDone` string is "Application sent" only.

**Why.** X-01 rule. User should see: job title, company logo, CV used, submission timestamp, current status pill (Applied), what happens next ("PCL Construction typically reviews within 3 business days"), next actions (Track application / See similar roles / Set up job alert for this category).

**Recommended.** Redesign ApplyDone page around the success card described in X-01.

**Complexity.** M · Depends on X-01.

### JS-06 · Seeker · Application tracking · P2 · Status labels not self-explanatory

**Problem.** Statuses read as "Applied / Reviewed / Shortlisted / Interview / Offer / Hired / Withdrawn." Meaning is inferrable but not made explicit.

**Why.** Charter mandates each status explains what it means.

**Recommended.** Hover / tap the status pill → tooltip with the definition ("Shortlisted = the employer is planning to interview you"). Also a legend on the tracking page.

**Complexity.** S.

### JS-07 · Seeker · CV builder · P1 · 5-CV limit hits as error

**Problem.** A user with 5 CVs clicking "Create new CV" is not proactively told; the create button attempts and errors.

**Why.** Charter mandates proactive limit surfacing with useful options.

**Recommended.** When cv-count = 5, the "New CV" button becomes a "You've reached the maximum of 5 CVs" banner with actions: Edit existing / Duplicate an existing / Delete an old one. Tooltip on any disabled control explains why.

**Complexity.** S.

### JS-08 · Seeker · CV builder · P2 · No autosave surfacing

**Problem.** CV builder saves on explicit save; there's no "Saving… / Saved 2 min ago" indicator.

**Why.** Microinteraction rule (charter).

**Recommended.** Autosave on blur or debounce; footer indicator: "Saving…" / "Saved just now" / "Unsaved changes."

**Complexity.** M.

### JS-09 · Seeker · Training · P2 · Free vs paid not clearly distinguished up front

**Problem.** Training cards mix free platform training and paid courses without an obvious badge.

**Why.** Charter forbids surprise payment prompts.

**Recommended.** "Free" badge on free courses; price prominent on paid; a filter "Free only" toggle on the trainings index.

**Complexity.** S.

### JS-10 · Seeker · Notifications · P2 · Notification bell shows count but no in-context action

**Problem.** Bell dropdown lists items but many items dead-end at a page that doesn't scroll to the referenced entity.

**Why.** Charter: notifications should propel the user forward.

**Recommended.** Every notification carries an `action_route + focus_id` that navigates AND scrolls-into-view the referenced entity.

**Complexity.** M.

### JS-11 · Seeker · Mobile · P1 · No sticky Apply CTA on job detail

**Problem.** On a long job detail page on mobile, Apply is at the top; user scrolls to read benefits + duties and Apply is out of thumb reach.

**Why.** X-09 mobile-native rule. Airbnb / Indeed pattern is a bottom-sticky primary CTA.

**Recommended.** Sticky bottom bar on job detail (mobile only): Apply + save-heart. Bar reveals on scroll-past-hero.

**Complexity.** S · Depends on X-09.

---

## SECTION 3 — EMPLOYER FREE (persona: small business owner)

### EM-01 · Employer · Onboarding · P1 · No "publish your first job" propulsion

**Problem.** Employer signup lands on empHome dashboard with the full nav; the first-published-job path isn't highlighted.

**Why.** Charter mandates onboarding reach the first meaningful action quickly.

**Recommended.** First-visit dashboard = a two-tile welcome ("Publish your first job" primary / "Complete company profile" secondary). Suppress the analytics / billing / API tiles until the first job publishes.

**Complexity.** M.

### EM-02 · Employer Free · Post-job → publish · P0 (recent) · Step-3 auth loss — FIXED

Fixed in `d7decdf` (API base LAN fix) + `1de777c` (authChecked). Kept for the record.

### EM-03 · Employer Free · Post-job wizard · P2 · No autosave / no draft state

**Problem.** The wizard has `dlDate`, description, benefits, screening questions — a lot of work — but a mistaken back-nav loses it (there's an in-progress-draft banner on some paths but not everywhere).

**Why.** Charter mandates never-lose-entered-data.

**Recommended.** On every field change, debounce-save to `job_drafts` (server-side). On return, offer "Continue draft" or "Start new." Show timestamp of last save in the wizard footer.

**Complexity.** M.

### EM-04 · Employer Free · Job limit reached · P1 · Better than raw error but could go further

**Problem.** Reviewed `useStore.js:1500-1503`. Current text: "Your Free plan includes 1 live job. Pause a job or upgrade to publish this one." — that's decent, but no value-tell of what Growth adds nor a direct upgrade CTA in the modal.

**Why.** Charter mandates: explain limit + value of upgrade + upgrade CTA + what other features come with the upgrade.

**Recommended.** Replace the toast/banner with the standard `<UpgradePromptModal>` (which exists in DashShell). Structure: (a) "You've reached the 1-job limit of Free," (b) Growth value list (3-4 bullets), (c) primary "Upgrade to Growth", (d) secondary "Pause an existing job."

**Complexity.** S · Reuses existing modal.

### EM-05 · Employer Free · Applicant pipeline · P2 · Free plan messaging is fully hidden

**Problem.** Free employers see no "Message candidate" button because messaging is Growth-gated. Charter says "show the feature value and upgrade path rather than simply hiding it."

**Why.** Charter's X-10 principle: never hide gated features; render them locked with upgrade path.

**Recommended.** Message button always rendered; on Free it opens the UpgradePromptModal instead of the composer. Consistent with how EmpApi and EmpSso now handle plan gating.

**Complexity.** S · Reuses existing modal.

### EM-06 · Employer · Candidate profile · P2 · Primary actions not visually prioritised

**Problem.** Shortlist / Message / Schedule interview / Add note all render at similar visual weight.

**Why.** Charter: primary actions should be obvious.

**Recommended.** Primary = "Advance stage" (context: Applied → Reviewed → Shortlisted → Interview → Offer → Hired). Secondaries in a subtle icon row. Add note = keyboard-triggered (press N).

**Complexity.** M.

---

## SECTION 4 — EMPLOYER GROWTH (persona: mid-size hiring team)

### EG-01 · Employer Growth · Featured job · P1 · Credit balance not surfaced up front

**Problem.** "2 featured upgrades / month" — no place shows remaining balance before the user attempts to feature.

**Why.** Charter: no confusing billing surprises.

**Recommended.** EmpBilling shows "Featured credits: 2 of 2 remaining, refreshes Oct 1." EmpJobs job row shows a small "Feature" button; hover explains cost in credits. If none remaining → upgrade path to Enterprise.

**Complexity.** M.

### EG-02 · Employer Growth · Interview scheduling · P2 · Timezone handling not obvious

**Problem.** Interview times get shown in the viewer's locale (P2 shipped fr-CA formatting), but the timezone the employer scheduled in isn't shown alongside.

**Why.** Interviews are cross-timezone — showing only the viewer's TZ produces ambiguity.

**Recommended.** Always display both the interview's original TZ and the viewer's TZ ("Nov 4, 2 PM ET → your time 11 AM PT").

**Complexity.** S.

### EG-03 · Employer Growth · Talent Pool · P2 · Disconnected from pipeline

**Problem.** Talent Pool is a separate tab; matches surface there but no path leads back to inviting the matched candidate to apply to a specific open role.

**Why.** Charter: Talent Pool should clearly connect to hiring.

**Recommended.** Match card → primary action "Invite to apply to <Role>" (select from your open jobs). Reuses the existing invite system.

**Complexity.** M.

### EG-04 · Employer Growth · Analytics · P1 · Metrics without actions

**Problem.** EmpAnalytics shows charts of applications, hires, source performance — but no action per insight.

**Why.** X-08. Charter mandates every insight offer a next action.

**Recommended.** For each metric card: an insight line ("Your Project Manager posting has 32% fewer applications than similar postings") + primary CTA ("Improve posting" → returns to that job's edit).

**Complexity.** M.

---

## SECTION 5 — EMPLOYER ENTERPRISE (persona: large hiring team / PCL Construction)

### EE-01 · Employer Enterprise · Custom branding · P2 · No preview before publish

**Problem.** Branded page config exists (Enterprise) but there's no side-by-side "preview + publish" pattern; changes go live on save.

**Why.** Charter's "preview branding before publishing."

**Recommended.** Branding editor with live preview iframe; explicit Publish button.

**Complexity.** M.

### EE-02 · Employer Enterprise · SSO / API · P0 (recent) · Empty state on Enterprise account — FIXED

Fixed in `72c5cc1`. Retained.

### EE-03 · Employer Enterprise · API keys · P2 · Rate-limit surface is a raw number

**Problem.** API page shows "5000 / hour" as a static line — no chart of consumption, no "you're at 60% of limit" warning.

**Why.** Charter's proactive product behaviour.

**Recommended.** Sparkline of last 24h consumption + threshold alerting (email if > 80% for 3 consecutive periods).

**Complexity.** L.

---

## SECTION 6 — HR OWNER (persona: Rachel Martel)

### HO-01 · Owner · HR dashboard · P2 · No "org health" summary

**Problem.** HR dashboard shows charts but no owner-level summary (headcount trend, attendance rate, leave utilisation, hiring pipeline count).

**Why.** X-08. Owner needs a one-glance view.

**Recommended.** Owner-only banner: 4 stat tiles + change vs prior period.

**Complexity.** M.

### HO-02 · Owner · Feature toggles per module · P2 · Discoverability

**Problem.** Per-module toggles exist (hrSettings) but discovery is hidden — a new Owner won't know they exist.

**Why.** Onboarding.

**Recommended.** First-visit HrSettings coach-mark; also a "Modules" nav item under Settings.

**Complexity.** S.

---

## SECTION 7 — HR ADMIN (persona: Priya R)

### HA-01 · Admin · User invitation · P2 · No bulk-invite

**Problem.** Adding HR users appears to be one-at-a-time.

**Why.** Real HR admins onboard many at once.

**Recommended.** CSV upload OR paste-emails flow (existing pattern from bulk-job CSV import).

**Complexity.** M.

### HA-02 · Admin · Role change · P2 · No audit log surfacing on employee profile

**Problem.** Role changes are recorded server-side but not surfaced on the employee's profile timeline.

**Why.** Charter's coherent-across-pages rule.

**Recommended.** Timeline component on HrProfile showing role changes, department moves, promotions.

**Complexity.** M.

---

## SECTION 8 — HR (persona: Linda O)

### HR-01 · HR · Leave approval · P2 · Approve without seeing balance

**Problem.** Leave approval modal shows the request but not remaining balance in-context.

**Why.** Approver needs the balance to make the call without navigating away.

**Recommended.** Leave request modal shows: type / dates / reason + remaining balance for this type + carry-forward status + team overlap for the requested dates.

**Complexity.** M.

### HR-02 · HR · Attendance · P2 · Exceptions not surfaced

**Problem.** Attendance is a table view; late arrivals + missed clock-outs aren't flagged.

**Why.** X-08.

**Recommended.** Exceptions summary row: "3 employees clocked in late today, 1 missed clock-out yesterday."

**Complexity.** M.

### HR-03 · HR · Employee training · P2 · No completion signal to hiring flow

**Problem.** Completed training is stored but doesn't populate the employee's public NorthHire profile as a badge.

**Why.** Charter's coherent-across-products rule (HR Suite ↔ NorthHire seeker profile).

**Recommended.** On training completion, publish a "Certified in X" badge to the connected seeker profile with the employee's consent.

**Complexity.** M · Depends on seeker profile schema.

---

## SECTION 9 — FINANCE (persona: Isaac C)

### FI-01 · Finance · Invoices · P0-scoped · Financial data must be strictly walled

**Problem.** Charter mandates financial info must not accidentally appear to other roles. Server-side gates exist; UI surfaces would benefit from an explicit "You are viewing this as Finance — non-Finance colleagues cannot see this" indicator (avoids the Owner-viewing-as-Finance confusion).

**Why.** Trust posture.

**Recommended.** Small badge in the topbar when viewing a Finance-restricted surface.

**Complexity.** S.

### FI-02 · Finance · Payroll → pay stub · P2 · No end-to-end link surfaced

**Problem.** Payroll run creation exists; the "employee sees their pay stub" endpoint exists; but there's no visible per-employee status ("Pay stub sent, viewed Nov 4").

**Why.** Interconnection charter rule.

**Recommended.** Per-run per-employee status column: Draft / Sent / Viewed / Downloaded / Disputed.

**Complexity.** M.

---

## SECTION 10 — EMPLOYEE (persona: Daniel K)

### EE_EMP-01 · Employee · Punch-in · P1 · Duplicate clock-in state

**Problem.** Rapid double-tap of punch-in on flaky connection could produce duplicate open sessions.

**Why.** Idempotency.

**Recommended.** Server-side: reject a second `open` shift when one is already open. Client: disable button while inflight.

**Complexity.** S.

### EE_EMP-02 · Employee · Leave request · P2 · Balance not shown before submit

**Problem.** Employee submits without seeing remaining balance / vacation-carry.

**Why.** Charter mandates the info before decision.

**Recommended.** Leave form shows current balance for the selected type; if requesting more than balance, warn or block (per company policy).

**Complexity.** S.

### EE_EMP-03 · Employee · 1:1 chat · P2 · Desktop-shaped chat on mobile

**Problem.** Chat is one desktop layout for all viewports.

**Why.** X-09 mobile-native rule.

**Recommended.** On mobile, chat = full-screen thread view with back-to-list nav (WhatsApp / Messenger pattern).

**Complexity.** L.

### EE_EMP-04 · Employee · Own profile · P2 · No sync with public NorthHire profile obvious

**Problem.** Some fields overlap between HR employee profile and the NorthHire seeker profile (skills, education) but the sync is invisible.

**Why.** Charter's coherent-across-products rule.

**Recommended.** Clear "Synced with your NorthHire profile" indicator on shared fields; unlink/link control.

**Complexity.** M.

---

## SECTION 11 — ADMINISTRATOR (persona: platform administrator)

### AD-01 · Admin · User moderation · P2 · No bulk actions on abusive users

**Problem.** AdmUsers table has one-by-one actions.

**Why.** Real moderators bulk-suspend spam waves.

**Recommended.** Multi-select + bulk actions (suspend / verify / delete).

**Complexity.** M.

### AD-02 · Admin · Job moderation · P0-scoped · Report queue latency

**Problem.** Reported jobs sit in a queue; no SLA indicator.

**Why.** Moderation velocity is trust posture.

**Recommended.** "Oldest report waiting" tile on AdmHome; per-report age chip in AdmJobs.

**Complexity.** S.

### AD-03 · Admin · Platform settings · P2 · Editor is JSON blob for some sections

**Problem.** Some `platform_config` sections still edit as raw JSON.

**Why.** Charter: no prototype-shaped shortcuts.

**Recommended.** Structured editor per section (already shipped for min-wage-by-province; extend to payrollTax, benefits pools, etc.).

**Complexity.** L.

### AD-04 · Admin · All CRUD surfaces · P1 · Priority-5 sweep unfinished

**Problem.** Standing Priority 5 audit incomplete — content / features / pages that should be add / update / delete-able from admin.

**Why.** Charter: everything editable from admin.

**Recommended.** Phase C. Audit all 20+ CRUD surfaces; fill gaps.

**Complexity.** XL · Own phase.

---

## SECTION 12 — TRANSITION AUDITS (verbatim from charter)

### T1 · Seeker · Search → Job → Apply → Application tracking

- Search → Job detail: **OK**. Job card CTA lands on detail. Filters preserved on back.
- Job → Apply: **OK-** (no-CV gate now global, `7973dac`). Missing: on-Apply summary of "we already have X of your info from your profile — you only need to answer employer questions" (charter's "don't ask twice"). **JS-05** applies to the confirmation.
- Apply → Tracking: **P2 gap.** After ApplyDone the seeker isn't nudged to Status ("Track your application"). Add a persistent primary CTA on ApplyDone.

### T2 · Employer · Onboarding → Job creation → Publishing → Applicants → Candidate → Messaging → Interview → Hire

- Onboarding → Job creation: **EM-01** (no propulsion). 
- Job creation → Publish: **EM-03** (autosave). 
- Publish → Applicants: **OK**. SSE-live update lands new applications; unread badge on pipeline.
- Applicants → Candidate: **EM-06** (primary action prioritisation). 
- Candidate → Messaging: **X-10 / EM-05** on Free.
- Messaging → Interview: **OK** — Interview scheduling flow works; **EG-02** (timezone). 
- Interview → Hire: **OK** post-`bd42eaa` (Hire button lands somewhere).
- Hire → HR Suite creation: **OK** on Enterprise (`bd42eaa` fix). Growth-tier hires have no HR Suite target — need Growth "hire" success screen that says "employee record kept in NorthHire; upgrade to Enterprise to access full HR Suite."

### T3 · Employer · Hire → Employee → HR Suite

- Hire → Employee creation: **OK** Enterprise; **T2** note above for Growth.
- Employee → HR Suite modules: **OK**. New employee appears in HrPeople, gets a default department / role.
- Reused data from candidate profile: **partial** — skills carry, some fields don't. **EE_EMP-04**.

### T4 · HR · Employee → Attendance → Leave → Tasks → Training → Communication

- Employee → Attendance: **HR-02** (exceptions). 
- Attendance → Leave: unlinked. Leave doesn't reference attendance patterns. Low priority.
- Leave → Tasks: unlinked. Approved leave should optionally block task assignment on those dates. **P2** enhancement.
- Tasks → Training: reasonable integration; no strong friction.
- Training → Communication: **HR-03** (badge sync to seeker profile). 

### T5 · Subscription · Feature → Restriction → Upgrade → Payment → Feature activation

- Feature → Restriction: **X-10 / EM-05** (some hidden vs some blocked-with-upgrade — inconsistent).
- Restriction → Upgrade: **EM-04**. UpgradePromptModal exists (DashShell) but not routed from every gate.
- Upgrade → Payment: uses `startCheckout` (commit `022f2a8`) — Stripe flow works. **OK**.
- Payment → Feature activation: activation is real (server webhook flips plan). Missing: an in-app "You're now on Growth — here's what's new" welcome screen post-checkout return.

---

## SECTION 13 — PRIORITIZED UX TRANSFORMATION BACKLOG

Sorted P0 → P4 within each phase. Each item cites its finding IDs and rough complexity.

### Phase A — Critical stability (Priority 0/1 blockers)

1. **EM-04** rewire job-limit modal via UpgradePromptModal · S · DashShell modal.
2. **EM-05** locked-messaging surface for Free (upgrade path in message composer) · S · UpgradePromptModal.
3. **JS-05** rich Application-sent confirmation (X-01 pattern) · M · X-01.
4. **JS-07** proactive 5-CV limit surface (JS-07) · S.
5. **X-10** unified `useFeatureState` hook + `<FeatureBoundary>` component · M · X-10.
6. **EE_EMP-01** duplicate clock-in idempotency · S.
7. **AD-02** report queue SLA surfacing · S.

### Phase B — Core UX + docs

1. **JS-01** progressive-profiling seeker signup · L · X-08.
2. **EM-01** first-visit employer dashboard = publish-first-job propulsion · M.
3. **EM-03** post-job wizard draft autosave · M.
4. **EM-06** candidate profile action prioritisation · M.
5. **EG-01** featured credit surface · M.
6. **EG-03** talent-pool → invite-to-apply link · M.
7. **HR-01** leave approval balance in-context · M.
8. **HR-02** attendance exceptions summary · M.
9. **X-01** reusable success card · M.
10. **X-02** every empty state answers three questions · M.
11. **X-03** error boundary + form-level error component · M.
12. **X-06** terminology sweep (Applicant / Candidate / Company / Seeker) · M.
13. Docs: PERSONAS.md · USER_FLOWS.md · PERMISSIONS.md · PLANS_AND_LIMITS.md · PRODUCT_MAP.md.

### Phase C — Product flow improvements

1. **AD-04** Priority-5 admin CRUD sweep · XL.
2. **T2** Growth-tier hire success screen · S.
3. **T5** post-checkout "welcome to Growth/Enterprise" screen · S.
4. **HR-03** training completion → seeker badge sync · M.
5. **FI-02** per-employee pay-stub status column · M.
6. **HO-01** Owner org-health tiles · M.
7. **JS-06** status pill tooltip explaining meaning · S.
8. **JS-08** CV builder autosave indicator · M.
9. **JS-09** free/paid training badges · S.
10. **JS-10** notification action_route + focus_id · M.
11. **EG-04** analytics insight + action pairing · M.
12. **HA-01** HR bulk invite · M.
13. **HA-02** employee profile role-change timeline · M.
14. **AD-01** admin bulk user moderation · M.
15. **AD-03** structured editors for all `platform_config` sections · L.

### Phase D — Design system

1. Consolidate button / card / empty / loading / error variants into primitives.
2. Skeleton primitives.
3. `<Btn loading>` reserved-space fix.
4. Terminology glossary lock (part of X-06).
5. DESIGN_SYSTEM.md.

### Phase E — Visual polish + motion

1. **X-07** motion pass (page transition, modal, drawer, toast, kanban).
2. Anti-AI-UI sweep (no giant hero / gradient text / decorative blobs / repetitive dashboard cards).
3. Loading skeleton pass everywhere.

### Phase F — Mobile

1. **JS-11** sticky Apply CTA on job detail.
2. **X-09 / JS-02** bottom-sheet filters.
3. **EE_EMP-03** mobile chat pattern.
4. Kanban horizontal-scroll ergonomics real-device test.

### Phase G — Accessibility

1. Keyboard flow audit + focus-ring pass.
2. Screen-reader end-to-end (signup / apply / post-job / punch-in).
3. WCAG AA colour contrast audit.
4. ARIA sweep on custom controls.

### Phase H — Automated regression matrix

1. REGRESSION_MATRIX.md.
2. Persistent Playwright test files (auth / seeker / employer / HR / staffing / admin — one file per persona).

### Phase I — Final production QA

1. Two-browser walkthrough with every demo persona.
2. Zero pageerror across all routes.
3. All screenshots archived.
4. Sign-off gate.

---

## SECTION 14 — RECENTLY-FIXED ITEMS (retained for the record)

The following prior findings are already fixed; keeping them here so the audit reads honestly.

- **JS-04** apply-CV picker cosmetic bug — `5a04885`.
- **EM-02** post-job step-3 auth loss — `d7decdf` + `1de777c`.
- **EE-02** Enterprise API/SSO empty state — `72c5cc1`.
- **T2** Hire button broken — `bd42eaa`.
- Sidebar scroll reset — `328fae9` / `4404e49` / `902e9b6` / `abb4094`.
- DatePicker manual-type past dates — `fd194b5`.
- Cookie banner refresh reset — `eb19481`.
- Header avatar missing — `eb19481` (UserAvatar).
- SSE live-sync interconnection (stage move / message / interview / notification) — `ca997eb` / `f6f60bf` / `f10c5db` / `87f7990`.
- LAN CORS / session cookie / API base — `d7decdf` / `98cf1c2`.
- Random-user CDN adblocker issue — `7973dac`.

---

## SECTION 15 — APPROVAL GATE

**Please review this UX audit + the phased backlog and approve one of:**

1. **Approve Phase A** — Critical stability (7 items) begins when model quota resets.
2. **Approve Phase A + Phase B** — bundle stability and core UX + docs.
3. **Different order** — pick specific findings out-of-phase.
4. **Full transformation approved** — proceed through Phase A → I with per-phase check-in.

Nothing else touches code until you answer.
