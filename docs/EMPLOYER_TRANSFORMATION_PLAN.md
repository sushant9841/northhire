# NorthHire — Employer Transformation Plan

Date: 2026-09-16. Mode: **IMPLEMENTATION PROPOSAL.** No code changed by this document.

## Guiding principle (from your brief)

**POST → FIND → EVALUATE → CONTACT → INTERVIEW → HIRE.** The employer dashboard must be action-oriented: "What requires my attention?" — not "What data do I have?" Plan gating uses contextual upgrade moments, not annoying popups. Every upgrade prompt explains what's locked, why it matters, what's received, cost of next plan, what changes after upgrade.

## Approach

Six tranches, each shipping end-to-end, each one commit unit, each verified in a live browser page-load. Ordered so an employer signing up mid-transformation sees a coherent experience at every point. Reuses primitives introduced in the seeker transformation (`SuccessCard`, `BottomSheet`, `MatchScoreDrawer`, `StatusPill`, `ProactiveNudge`).

Findings referenced by UX_AUDIT ID (EM-* / EG-* / EE-* / X-*).

---

## TRANCHE E1 — Employer onboarding + action-oriented dashboard (EM-01, X-08)

**Goal.** New employer reaches "publish your first job" in ≤3 clicks. Returning employer opens EmpHome and immediately sees what needs their attention.

### Before

`EmpHome` shows a full dashboard with analytics tiles, module chrome, links to every feature — no propulsion toward the first job. Returning employers see the same tiles regardless of state (candidates awaiting review, interviews today, expiring jobs).

### After

- **First-visit dashboard** (no jobs, no candidates, no company profile completeness):
  - Big hero card: "Publish your first job" (primary CTA → EmpPost) + "Complete company profile" (secondary → EmpCompany).
  - Suppress analytics / billing / API / SSO tiles until first job publishes.
  - "How NorthHire works" 3-step strip below.
- **Returning-employer action stack** — an ordered list of what needs attention today, sourced from a single `employerAttentionQueue()` selector:
  1. Interviews today (highest priority)
  2. Candidates awaiting review (>= 24h in Applied)
  3. Strong candidates (match score >= 85% newly applied)
  4. Jobs approaching expiration (dl <= 3 days)
  5. Poor-performing jobs (open >7 days, < 3 applicants)
  6. Featured credits remaining (Growth) / expiring soon
  7. Hiring progress (jobs at Offer stage waiting on response)
- Numbers/analytics move to a secondary "Insights" section below the action stack.

### Files touched

- `src/pages/employer/suite.jsx` (EmpHome redesign)
- `src/store/useStore.js` (`employerAttentionQueue()` selector, `firstVisitState()` helper)
- `src/i18n/messages/{en,fr}.js`

### Risks

- The attention queue selector reads many stores — it must be memoised or debounced to avoid recomputing on every render.
- Existing EmpHome routes and tab active-state must not regress.

### Tests

- Playwright: fresh employer signup → EmpHome shows first-visit hero, not the full dashboard. Publish first job → EmpHome shifts to the returning state.
- Populated employer (PCL Construction demo) → action stack shows real items sourced from live DB (has 20 jobs / 181 applications).

### Complexity: **M**

---

## TRANCHE E2 — Job creation flow (EM-03, EM-06 partial)

**Goal.** Job creation is a guided, forgiving process. Employers never lose data. Preview before publish.

### Before

`EmpPostJobWizard` — 3 steps. Draft-safe on some fields, not all. AI generation lives in Step 3. No auto-save. Back-nav preserves most fields but a mistaken refresh mid-way loses everything.

### After

- **Auto-save to `job_drafts` server-side** on every field change (debounced 800ms). Returning to EmpPost with a draft → "Continue draft (last saved 3 min ago)" or "Start new."
- **Wizard footer** shows autosave state: "All changes saved" / "Saving…" / "Draft saved 12 seconds ago."
- **Step 4 = Preview** — the job as it will render on the public JobDetailPage, in an iframe or embedded component. Primary CTA: "Publish job." Secondary: "Save as draft."
- **Publish success card** (reuses `SuccessCard` primitive from seeker Tranche 3):
  - "Your job is live: {title}."
  - Preview link · Share link · Copy public URL · Pin on employer page.
  - "3 candidates already match this posting — Review candidates" (if any).
  - "Post to Indeed / LinkedIn / JobBank / ZipRecruiter" copy-link buttons (already wired via `9524f56`).

### Files touched

- `server/db.js` (new `job_drafts` table)
- `server/routes/jobs.js` (draft save + restore endpoints)
- `src/pages/employer/suite.jsx` (EmpPostJobWizard — autosave + preview step + success card)
- `src/store/useStore.js` (`saveJobDraft`, `loadJobDraft`)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Draft persistence must not conflict with the existing sessionStorage draft pattern (which stays as the pre-server fallback for network failures).
- Auto-save must not trigger on validation-error state, or the draft holds broken data.

### Tests

- Playwright: fill 6 fields → hard-refresh → return → autosave restored, footer says "Draft saved N minutes ago."
- Preview step renders identical to public JobDetail.
- Publish success card lists actionable links.

### Complexity: **M**

---

## TRANCHE E3 — Applicant pipeline: candidate review at speed (EM-06, X-01 for pipeline)

**Goal.** A recruiter reviews a candidate and moves them without leaving the pipeline. Every action is one keystroke or one click away.

### Before

`EmpPipeline` shows a kanban. Clicking a candidate opens `EmpCandidate` full-page. All primary actions (Shortlist / Message / Schedule / Note / Advance) render at similar visual weight. No keyboard shortcuts. No "next candidate" flow after finishing one.

### After

- **Candidate detail as a right-drawer** on the pipeline page (mobile: bottom-sheet). Kanban stays visible. Close drawer → back to kanban with your scroll position and the candidate you just closed briefly highlighted.
- **Primary action = "Advance to {next stage}"** rendered as the largest CTA. Contextual: from Applied → "Move to Reviewed"; from Shortlisted → "Schedule interview"; from Interview → "Send offer" or "Move to next round"; from Offer → "Mark hired" (opens HireOnboardingModal).
- **Secondary actions** in an icon row below primary: Shortlist, Message, Schedule, Note, Reject.
- **Keyboard shortcuts** — S = shortlist, M = message, I = interview, N = note, → = next candidate, ← = previous, Esc = close drawer, A = advance.
- **Match Score panel** inline in the drawer (reuses `MatchScoreDrawer` primitive from seeker Tranche 2 — same per-factor breakdown component, employer-side view).
- **"Next candidate" flow** — after any action, a small chip appears: "Next in Applied →" or "That's the last one — back to pipeline."
- **CV inline** — CV renders in-drawer, not a modal-over-modal.
- **Bulk actions strip** at bottom of the pipeline when N > 0 selected (already partially shipped in `7ebf364`) — verify + polish.

### Files touched

- `src/pages/employer/suite.jsx` (EmpPipeline drawer redesign, EmpCandidate → drawer content)
- `src/pages/employer/components/CandidateDrawer.jsx` (new)
- `src/pages/employer/components/CandidateKeyboardShortcuts.jsx` (new, uses existing keyboard-shortcut pattern)
- `src/store/useStore.js` (`nextCandidateInStage(currentId, stage)` selector, `advanceStage(applicationId)` action)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Existing `EmpCandidate` route must still work for deep-linked candidate URLs (`/employer/candidates/:id`); either redirect to `/employer/pipeline?candidate=:id` (drawer opens) or keep the full page as fallback.
- Keyboard shortcuts must not conflict with text-field input (guard with `document.activeElement.tagName` check).
- Match Score panel must handle candidates with incomplete profiles gracefully.

### Tests

- Playwright: PCL demo pipeline (has 20 jobs / 181 apps). Open candidate → drawer opens, kanban visible behind. S / M / I / A / → keyboard shortcuts fire. Advance → success toast + drawer moves to next candidate in the target stage.
- Deep-link `/employer/candidates/xa5` still works.
- Mobile viewport: drawer becomes bottom-sheet with the same primary/secondary hierarchy.

### Complexity: **L**

---

## TRANCHE E4 — Messaging, interviews, offers (EG-02, T2 handoff polish)

**Goal.** Two-party interactions (message, interview, offer) feel like a serious professional recruiting product. Timezone handling is honest. Handoffs between stages don't lose context.

### After

- **DockedChat drawer** (already shipped `87f7990`) — polish pass:
  - "Templates" button in composer (canned messages for common scenarios: shortlist ping / interview invite / offer follow-up / rejection).
  - Draft persistence per thread (already partial).
  - "Compose from this candidate" shortcut from any EmpCandidate drawer (Tranche E3).
- **Interview scheduling modal** — timezone honesty (EG-02):
  - Dropdown for interviewer TZ + candidate TZ, defaults to employer's browser TZ + candidate's stored TZ from profile.
  - Preview line: "Nov 4, 2:00 PM ET → 11:00 AM PT (candidate's time)."
  - Sends both TZs in the notification.
  - Add-to-calendar .ics on both sides.
- **Offer flow** — existing offer modal:
  - Preview of the offer letter with the employer's branding.
  - Send → shareable public offer link + email to candidate.
  - Track: sent / viewed / accepted / declined / expired.
  - Reuse `SuccessCard` after send.
- **Rejection flow** — kind copy templates ("Not selected this time" vs "Passing on this role" vs "Moving forward with another candidate"), optional candidate-facing message, silver-medalist opt-in (deferred feature — flag for later).

### Files touched

- `src/pages/employer/components/DockedChat.jsx` (templates, draft persistence)
- `src/pages/employer/suite.jsx` (interview modal, offer modal)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Timezone conversions must use `Intl.DateTimeFormat` with explicit TZ, not naive `toLocaleString`.
- Offer tracking states must map to the existing `offers` table columns.

### Tests

- Playwright: schedule an interview with candidate in a different TZ → preview shows both times.
- Send offer → candidate receives link → open in incognito → offer renders with employer branding → accept flow.
- Message from EmpCandidate drawer with a template → thread opens in DockedChat with template text pre-filled.

### Complexity: **M**

---

## TRANCHE E5 — Talent pool, analytics with actions, featured jobs (EG-01, EG-03, EG-04)

**Goal.** Every insight is paired with an action. Talent Pool connects to hiring. Featured credits are always visible.

### After

- **Talent Pool** (EG-03):
  - "Invite to apply to <Role>" primary CTA on each match card (dropdown of the employer's open jobs).
  - Match card shows: portrait, name, top 3 matching skills, years, location fit, "Invite to apply" primary + "Message" secondary + "Save to shortlist" tertiary.
  - Empty state: "Define your ideal candidate to see matches" → opens filter builder.
- **Analytics with actions** (EG-04):
  - Each metric card has an insight line + action:
    - Job with low applicant count: "Improve posting" → EmpPost edit mode.
    - Job with high drop-off in pipeline: "Review pipeline flow" → EmpPipeline filtered to that job.
    - Featured credit balance: "You've used 1 of 2 featured credits this month. Featuring boosts applications 3-5x — Choose a job to feature."
    - Time-to-hire trending up: "Your median time-to-hire is 21 days, up from 15. Common causes: slow shortlisting. See pipeline."
- **Featured credit surface** (EG-01):
  - Pill on EmpHome header: "Featured credits: 1 of 2" (Growth) or "Unlimited" (Enterprise).
  - Same pill on EmpJobs list.
  - Featuring a job: modal shows credit cost, remaining balance, projected uplift (from historical data if any), confirm CTA.

### Files touched

- `src/pages/employer/suite.jsx` (EmpTalentPool, EmpAnalyticsPage, EmpHome header, EmpJobs)
- `src/store/useStore.js` (analytics-with-insight selectors, featured-credit balance)
- `src/i18n/messages/{en,fr}.js`

### Risks

- "Invite to apply" must actually invite (server route may or may not exist — verify).
- Insight generation must be defensive: if a metric can't be computed (new employer, no data), the card explains the empty state instead of showing "NaN".

### Tests

- Playwright: Talent Pool match → invite to apply → invited seeker sees the invitation in their notifications.
- Analytics: mock low-applicant job → improve-posting CTA opens EmpPost edit.

### Complexity: **L**

---

## TRANCHE E6 — Plan gating: contextual upgrade moments (EM-04, EM-05, EE-01, X-10)

**Goal.** Every locked feature explains what's locked / why it matters / what you receive / what next plan costs / what changes after upgrade. No annoying popups; contextual moments only.

### After

- **Unified `<FeatureBoundary feature="messaging">…</FeatureBoundary>`** primitive:
  - Renders children when the employer has access.
  - Renders a contextual locked state (button-styled, inline card, or full section — configurable) when they don't.
  - Locked state uses the standard `UpgradePromptModal` (already exists in DashShell) when clicked.
- **UpgradePromptModal** copy expanded to the charter's mandated 5-part shape per feature:
  - **What's locked** — the specific action they tried ("Message candidates").
  - **Why it matters** — 1-sentence value ("Direct messaging cuts response time from days to hours in most postings").
  - **What you get with Growth** — 3-4 bullets of the full plan value.
  - **What Growth costs** — "$X/month, billed monthly (or $Y/year, save 15%)."
  - **What changes** — "Your Free features stay; Growth adds…"
- **Contextual upgrade moments** — surfaced at the moment of intent, not on page load:
  - Free employer tries to publish 2nd job → job-limit modal (already wired for job publish per `useStore.js:1500`, polish + use FeatureBoundary shape).
  - Free employer tries to message a candidate → messaging modal.
  - Free employer opens Interviews page → contextual banner "Schedule interviews with Growth."
  - Growth employer clicks "Feature this job" with 0 credits → featured-credit modal + upgrade path to Enterprise.
  - Growth employer visits Analytics history >90 days → banner "Full trend history is on Enterprise."
- **Post-checkout welcome screen** — after Stripe returns:
  - "Welcome to Growth. Here's what you unlocked."
  - 4 tiles of new features + "Take the tour" or "Skip to dashboard."
  - Skip on returning subscription changes.

### Files touched

- `src/design/primitives.jsx` (`<FeatureBoundary>`)
- `src/pages/employer/suite.jsx` (wire FeatureBoundary at every gated site)
- `src/shells/DashShell.jsx` (UpgradePromptModal copy)
- `src/pages/employer/PostCheckoutWelcome.jsx` (new)
- `src/i18n/messages/{en,fr}.js`

### Risks

- FeatureBoundary must not double-gate — server-side gates are the source of truth, this component is UX only.
- Post-checkout welcome must be one-shot per plan change (persistent flag: `seen_welcome_for_plan_growth`).

### Tests

- Playwright: fresh Free employer → try to message → contextual modal with 5-part copy.
- Growth employer at 0 featured credits → click Feature → modal with upgrade-to-Enterprise path.
- Simulated Stripe return → welcome screen renders once, doesn't re-appear on next visit.

### Complexity: **M**

---

## Cross-tranche primitives (introduced or reused)

- **`<SuccessCard>`** — reused from seeker Tranche 3 (rich confirmation for job-published, offer-sent, hire-complete).
- **`<BottomSheet>`** — reused from seeker Tranche 2 (mobile candidate drawer, filter/pickers).
- **`<MatchScoreDrawer>`** — reused from seeker Tranche 2 (employer-side per-factor breakdown).
- **`<StatusPill>`** with tooltip — reused (pipeline stage pills, application statuses, offer statuses).
- **`<FeatureBoundary>`** — new (E6), reused everywhere plan gating applies.
- **`<CandidateDrawer>`** — new (E3), employer-specific composition of the above.
- **`<ActionStackCard>`** — new (E1), reused later by seeker Status page and HR Owner dashboard.

## What is EXPLICITLY OUT OF SCOPE for this transformation

- HR Suite surface changes (its own transformation).
- Staffing agency console surface changes (its own transformation).
- Admin surface changes (its own transformation + Priority-5 CRUD sweep).
- Public marketing pages (their own polish pass).
- Priority-4 modules: perf reviews, workflow rules engine, silver-medalist re-engagement, D&I collection, daily-snapshot analytics, individual salary benchmarks (there's uncommitted WIP for this — a separate decision), full per-tier benefits, integrations marketplace shell, offline SW.
- Location gazette + street/unit/postal address model (there's uncommitted WIP for this — a separate decision).
- Server-side email/notification i18n sweep.

## Rollout order and check-in cadence

- **E1 → verify live → check in.**
- **E2 → verify live → check in.**
- **E3 → verify live → check in** (this is the largest tranche — expect one dedicated session).
- **E4 → verify live → check in.**
- **E5 → verify live → check in.**
- **E6 → verify live → check in.**

Each tranche produces one commit (or a small chain), Playwright zero-pageerror pass, screenshots to `.claude/qa-screenshots/employer-transformation/`, and a short report.

## Model routing per tranche (cost discipline)

Per `feedback_cost_discipline.md`:

- E1, E2, E4, E6 — form work + wiring → **Sonnet** default.
- E3 — new drawer + keyboard shortcuts + kanban integration → **Sonnet** for drawer scaffold, then **Haiku** for wiring across kanban cells if applicable.
- E5 — new selectors + insight generation → **Sonnet**.

Total estimate: 6 focused sessions.

## Risks common to all tranches

- Existing employer tests / screenshots will change; retake per tranche.
- SSE-driven live updates on pipeline, messages, interviews must survive redesigns.
- Enterprise-only surfaces (API, SSO) already tested — must not regress plan gating (fix `72c5cc1` stays valid).
- PCL Construction demo employer's 20 jobs / 181 applications continue to load correctly through pipeline redesign.

## Approval gate

Please pick one:

1. **Approve all 6 tranches, execute in order** — each with per-tranche check-in.
2. **Approve E1 + E2 first** (dashboard + job creation); check in after both; then approve E3 (largest); then E4 + E5 + E6.
3. **Approve one specific tranche** to start — name it.
4. **Adjust scope** — call out anything you want added or removed before we begin.

Nothing touches code until you answer.
