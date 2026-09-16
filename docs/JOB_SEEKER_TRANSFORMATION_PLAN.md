# NorthHire — Job Seeker Transformation Plan

Date: 2026-09-16. Mode: **IMPLEMENTATION PROPOSAL.** No code changed by this document.

## Guiding principle (from your brief)

**FIND → EVALUATE → APPLY → TRACK.** The seeker should never wonder "what do I do next?" The mobile experience must feel intentionally designed for touch.

## Approach

Rather than redesign individual screens (which produces incoherence), this plan reshapes the seeker journey as one continuous product. Findings map to five tranches. Each tranche is one commit unit, ships end-to-end, is verified in a live browser page-load, and can stand alone if we stop between tranches.

Tranches are ordered so a seeker who signs up mid-transformation sees a coherent experience at every point.

Findings from [`UX_AUDIT.md`](UX_AUDIT.md) referenced by ID.

---

## TRANCHE 1 — Registration & Progressive Profile (JS-01)

**Goal.** Seeker signs up in ≤30 seconds and sees jobs immediately. Profile completeness becomes a contextual nudge, not a signup gate.

### Before

`AuthSignupPage` wizard demands: email, password, name, role, location, availability, work modes, employment types, salary floor, skills, experience level, education, then arrives on home. 9 fields + 5 selectors before value.

### After

- **Step 1 (only step at signup):** role tile (Seeker / Employer), email, password, first name. 4 inputs, 1 tile. Enter → straight to home, showing job recommendations by IP-geolocated city (approximate is fine; we'll refine when they engage).
- **Contextual profile prompts (post-signup):**
  - Opening Match for the first time → inline card "Add 3+ skills to see personalised matches" with a 30-second chip picker.
  - Tapping a job's location → asks "Where are you looking?" once.
  - First Apply → the CV pre-check + a "For faster matches later, tell us your experience level" prompt after apply completes (not before).
- **Persistent completeness meter** on dashboard: "Your profile is 40% complete. Add your CV to unlock CV-based matching."
- **Draft-safe** — the existing `sessionStorage northhire.signupDraft` continues to protect data on refresh.

### Files touched

- `src/pages/auth/pages.jsx` (SignupPage, split wizard)
- `src/pages/marketing/pages.jsx` (HomePage seeker-view — completeness meter)
- `src/store/useStore.js` (`profileCompleteness()` selector)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Existing referral / `?ref=CODE` pre-fill flow must survive (already tested by existing sessionStorage draft).
- Existing sessionStorage draft key stays valid.

### Tests

- Playwright: signup with only email/password/name lands on home showing jobs.
- Signup refresh mid-form recovers draft.
- Referral URL still pre-fills the referral code.

### Complexity: **M**

---

## TRANCHE 2 — Find & Evaluate (JS-02, JS-03, JS-06, JS-11)

**Goal.** Search → results → job detail feels like a modern mobile-first job app. Match score is trustworthy and explained. Mobile has a sticky Apply CTA.

### Search & Results

- **Mobile filter drawer** switches to bottom-sheet with auto-apply on each toggle (JS-02). Sticky filter-chip strip at top of results.
- **Filter memory** — search + filters persist per-session (already partial) + a "Recent searches" list on Search page.
- **Sort control** exposed inline (Newest / Best match / Highest pay / Closing soon).
- **Job cards** — one visual language across Home / Search / Matched / Saved. Compact by default; a "Preview" long-press on mobile opens a bottom-sheet preview without leaving the list.

### Job Detail

- **Sticky bottom bar on mobile** (JS-11): Apply (primary) + Save (heart). Reveals on scroll past hero.
- **Above-fold answer set** — Job title / Company (with verified badge) / Pay / Location + mode / Employment type. One line each, no walls of text.
- **Match Score drawer** (JS-03) — tap the score → right-drawer (desktop) or bottom-sheet (mobile) with:
  - Skills match: matched chips + missing chips
  - Experience match
  - Location fit
  - Education match
  - Summary line: "Strong match based on your Red Seal Electrician certification and 4 years of commercial experience." (never "objectively 92%")
- **Related jobs** at the bottom.
- **Status pill tooltip** (JS-06) on any status shown in the detail.

### Files touched

- `src/pages/seeker/SearchPage.jsx` (bottom-sheet filters, sort control)
- `src/pages/shared/cards.jsx` (JobCard preview mode)
- `src/pages/shared/JobDetailPage.jsx` (sticky bar, above-fold, match drawer)
- New `src/pages/shared/MatchScoreDrawer.jsx`
- `src/design/primitives.jsx` (BottomSheet primitive if not present)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Sticky bottom bar must not collide with existing mobile bottom nav (`TabBar`). Bottom bar sits above tab bar or replaces it on job detail page.
- Match drawer needs the existing `scoreCandidate` shape — verify it exposes per-factor breakdown, add if not.

### Tests

- Playwright mobile viewport (390×844): sticky Apply visible on scroll; Save toggle animates; match drawer opens and dismisses.
- Filter toggles auto-apply; recent searches list persists.

### Complexity: **L**

---

## TRANCHE 3 — Apply flow: fast, honest, complete (JS-04 already fixed, JS-05, JS-07)

**Goal.** Apply flow uses everything NorthHire already knows. CV picker with sensible default. Rich confirmation. 5-CV limit surfaced proactively.

### Apply flow changes

- **Step 1 pre-fill audit** — before showing Apply1, compute what NorthHire already has (name, email, phone, city, availability, expected pay). Show a green banner: "We've pre-filled from your profile — you only need to answer employer questions." Editable fields for corrections.
- **Step 2** = employer's screening questions (if any). Otherwise skip.
- **Step 3 (review)** — a single scannable review: which CV is attached (with change-link), summary of answers, cover letter opener (optional).
- **Post-submit success card (JS-05):**
  - Company logo + "Application sent to {company}."
  - Meta line: {job title} · applied {now, formatted per locale}.
  - CV pill: "Using {CV name}."
  - Status pill: Applied.
  - What happens next: "{company} typically reviews within 3 business days."
  - Primary CTA: "Track application" → Status page pre-scrolled to this application.
  - Secondary: "See similar roles."

### CV Builder changes

- **5-CV proactive limit (JS-07)** — at cv-count=5, "New CV" becomes an inline info card: "You've reached the maximum of 5 CVs. Edit an existing one, duplicate one to save time, or delete an old one to free a slot." Actions inline. Every disabled control tooltip explains why.
- **Autosave indicator (JS-08 — deferred to Tranche 5)** — reserved for polish tranche.

### Files touched

- `src/pages/seeker/apply.jsx` (pre-fill audit banner, review screen redesign, success card)
- `src/pages/seeker/cv.jsx` (5-CV limit surface)
- `src/store/useStore.js` (`profilePrefillFor(job)` selector)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Pre-fill audit must NOT invisibly change what gets submitted; user always sees editable pre-filled values.
- Success card replaces existing `ApplyDone` — verify existing route/state doesn't leak.

### Tests

- Playwright: apply with pre-fill visible, edit one field, submit, see rich success card, tap "Track application" → status page scrolled to the new row.
- 5-CV account: create-CV button → limit surface with all 3 actions functional.

### Complexity: **M**

---

## TRANCHE 4 — Track & Return: Status, Saved, Notifications (JS-06, JS-10)

**Goal.** Seeker returns to a page that answers "where do I stand?" not "what data do we have?" Notifications propel forward, don't decorate.

### Status page

- **Top card:** "You have {N} active applications." Ordered by most-recently-updated.
- **Each application row:** company logo, job title, status pill (with tooltip explaining meaning — JS-06), last-update relative time, primary action ("Message hiring team" if messaging is available, else "See job again"), and next-expected-step microcopy.
- **Interviews strip** at top when any are scheduled (already partially built, shipped `37a8ab6`). Adds "Add to calendar" .ics and "Message hiring manager" quick actions.
- **Withdrawn / Not selected** rows: kind copy + "Similar roles" CTA.

### Saved page

- Grouped by "Closing soon" (dl<=7 days) at top, then "Recently saved."
- Bulk action: "Apply to selected" (opens sequential apply flow — one at a time, but with data pre-fill making each fast).

### Notifications

- Every notification carries `action_route + focus_id` (JS-10). Tap → route + smooth-scroll to the referenced entity (application row, message, interview).
- Grouping: "Today" / "This week" / "Earlier."
- Empty state: "You're up to date. We'll notify you when {company} reviews your application or replies to your message."

### Proactive nudges

- Incomplete profile: "Complete your profile to improve your matches" — dismissable but re-appears every 7 days until 80% complete.
- Strong new match: "3 new strong matches for you today" — a summary card, not 3 separate notifications.
- Interview tomorrow: single high-priority card at top of Status.

### Files touched

- `src/pages/seeker/StatusPage.jsx` (redesign)
- `src/pages/seeker/SavedPage.jsx` (grouping + bulk apply)
- `src/shells/NotificationBell.jsx` (grouping + focus scroll)
- `src/store/useStore.js` (grouping selectors, `focusScrollTo(id)` helper)
- `src/i18n/messages/{en,fr}.js`

### Risks

- Notification `focus_id` requires server-side payload to include target entity IDs — verify `server/lib/notify.js` payloads carry them; extend if not.
- Bulk-apply flow needs isolated per-application state to avoid cross-contamination.

### Tests

- Playwright: create 3 applications, verify Status page groups + interview strip.
- Notification tap on "New match" → route + scroll.
- Bulk-apply from Saved: pick 2, complete both, see 2 success cards.

### Complexity: **M**

---

## TRANCHE 5 — Mobile-native + microinteractions + Training (X-07, X-09, JS-08, JS-09)

**Goal.** The whole seeker surface feels touched by a designer. Subtle motion. Autosave. Free vs paid training clarified.

### Mobile-native pass

- Bottom-sheet primitive used consistently: filters (Tranche 2), job preview (Tranche 2), match drawer (Tranche 2), attach-CV chooser, "sort by" chip menu.
- Thumb-zone action bar on Job Detail (Tranche 2 sticky bar) — dark, elevated.
- Larger touch targets (minimum 44×44) audited across seeker surfaces.
- Chat mobile pattern (deferred to a separate Employee/Seeker chat pass — flagged, not shipped in this transformation).

### Microinteractions & motion

- Save-heart: scale-and-pulse animation on save/unsave.
- Save (in CV): "Saving…" → "Saved just now" (JS-08 autosave indicator).
- Apply CTA: press-down animation + loading state during submit.
- Toast: slide-up from bottom on mobile, top-right on desktop.
- Kanban stage moves: subtle spring for SSE-arrived cards (also serves employer side).
- Modal / drawer: 180 ms fade + 6px translate.
- All motion behind `prefers-reduced-motion`.

### Training clarification

- Free vs paid badge on every card (JS-09).
- Free-only filter toggle on Trainings index.
- Course detail: price + "Starts free / continues paid at X."

### Files touched

- `src/design/primitives.jsx` (BottomSheet, Btn loading state)
- `src/pages/seeker/cv.jsx` (autosave indicator)
- `src/pages/shared/cards.jsx` (SaveBtn animation)
- `src/pages/marketing/pages.jsx` (TrainingsPage badges + filter)
- `src/i18n/messages/{en,fr}.js`
- `src/index.css` (motion tokens, reduced-motion guards)

### Risks

- Motion pass must NOT slow interaction — cap durations, avoid long transitions.
- Reduced-motion respected globally, not per-component.

### Tests

- Playwright: reduced-motion emulation → animations skip.
- Motion durations under 200ms on all common interactions.

### Complexity: **M**

---

## Cross-tranche design system pieces (shared)

Reusable primitives introduced by these tranches:

- **`<SuccessCard>`** — the JS-05 rich confirmation shape. Reused later by employer Publish / Hire / Interview scheduled.
- **`<MatchExplanationDrawer>`** — the JS-03 breakdown. Reused later by employer candidate profile.
- **`<BottomSheet>`** — the mobile bottom-sheet primitive. Reused across mobile filters, pickers, and Training / Blog detail on mobile.
- **`<ProactiveNudge>`** — dismissable-and-scheduled nudge card. Reused for employer nudges (job about to expire etc.).
- **`<StatusPill>`** with tooltip — JS-06. Reused everywhere status is shown.

Each primitive is documented in `docs/DESIGN_SYSTEM.md` as it lands (Phase D of the audit's phased roadmap).

## What is EXPLICITLY OUT OF SCOPE for this transformation

- Server-generated email/notification text i18n sweep (Bill 96 tail — already flagged elsewhere).
- Employer/HR/Staffing/Admin surface changes (their own transformations).
- Location gazette + street/unit/postal address model (address transformation is its own pass).
- Priority-4 modules (perf reviews, workflow rules engine, silver-medalist, D&I, daily snapshots, per-tier benefits, integrations shell, offline SW).
- Chat mobile-native redesign (flagged for the Employee mobile pass).

## Rollout order and check-in cadence

- **Tranche 1 → verify live → check in.**
- **Tranche 2 → verify live → check in.**
- **Tranche 3 → verify live → check in.**
- **Tranche 4 → verify live → check in.**
- **Tranche 5 → verify live → check in.**

Each tranche produces:
- A single commit (or a small commit chain).
- Playwright pass with zero `pageerror`.
- Screenshots to `.claude/qa-screenshots/seeker-transformation/`.
- A short report — what shipped, what changed, per-persona demo login used to verify.

## Model routing per tranche (cost discipline)

Per `feedback_cost_discipline.md`:

- Tranches 1, 3, 4 — mostly mechanical + form work → **Sonnet** (once weekly limit resets today at 1pm ET) or **Haiku** if the diff is truly mechanical.
- Tranches 2 and 5 — new primitives (BottomSheet, MatchScoreDrawer, motion tokens) + cross-file coordination → **Sonnet or Opus** for the primitive design, then **Haiku** for the mechanical rewiring across call sites.

Total estimate: 5 focused sessions (one per tranche), each staying under 100k context via short briefs (per cost discipline).

## Risks common to all tranches

- Existing seeker tests (Playwright screenshots) will change visually. Retake and archive.
- Any seeker route currently public but expecting `A.user` (edge cases): check on each tranche.
- SSE-driven live updates on Status / Saved must survive redesigns.

## Approval gate

Please pick one:

1. **Approve all 5 tranches, execute in order** — each with per-tranche check-in.
2. **Approve Tranches 1 + 2** first (Register + Find/Evaluate); check in after both; then approve 3 + 4; then 5.
3. **Approve one specific tranche** to start — name it.
4. **Adjust scope** — call out anything you want added or removed before we begin.

Nothing touches code until you answer.
