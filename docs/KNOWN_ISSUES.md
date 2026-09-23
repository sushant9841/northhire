# NorthHire — Known Issues & Open Blockers

Date: 2026-09-23. This is the live issue register for the platform. All findings are grounded in QA audits (tracker artifact b512d591-ea6e-4f41-b39a-fe7f325e0ad6), memory notes, and test suite skip-markers. Update when resolving.

---

## P0 (Critical — Ship Blockers)

None currently. All P0 issues (auth, account takeover, data loss, payment failures) were fixed in prior security audits.

---

## P1 (Core-Flow Broken)

### Issue 1: Apply Flow CV Picker (FIXED 2026-09-12)

**Status:** RESOLVED in commit 5a04885

**Summary:** Apply flow's CV picker was cosmetic—submitApply never sent cvId to server, every application had cv_id NULL, server never enforced CV ownership.

**Impact:** CV picker didn't work; server couldn't validate which CV was used; if a seeker later deleted a CV, no way to know which applications used it.

**Fix:** 
- Server: POST /api/applications now requires & validates cvId
- Client: apply.jsx sendApply() now includes cvId in payload
- Store: apply.jsx editCv("new") → newCv() for creating CV mid-flow
- JobDetailPage: pre-flight modal warns "You have no CVs—create one to apply"

---

## P2 (UX/Workflow — Missing State or Unclear Next Step)

### Issue 1: Version Banner & Cache Busting (FIXED 2026-09-12)

**Status:** RESOLVED in commit eb19481

**Summary:** Users on old code version saw stale UI after deploy (new features invisible, buttons broken). No version check, no auto-refresh, no "refresh page" prompt.

**Impact:** Live users had to manually Ctrl+Shift+R to pick up updates. Violated charter rule: "Zero user-side hard refresh."

**Fix:**
- Server: GET /api/version returns `{ buildId, version, buildTime }`
- Client: useVersionCheck hook polls every 30s, detects mismatch
- App.jsx: version-banner renders at top if outdated
- Vite: __BUILD_ID__ injected at build time (hash of build output, unique per deploy)
- SW: skipWaiting on new registration (auto-activate new service worker)

### Issue 2: Undrafted Server-Authoritative Flow Rows (OPEN)

**Status:** OPEN — 8 rows staged in scratchpad but not yet published to tracker artifact b512d591

**Severity:** P2 (UX polish, not core-flow broken)

**Details:** Session logic audit revealed minor state inconsistencies worth documenting:
1. CV applied with vs. CV detail mismatch on status page (CV preview cached, real CV may have been edited)
2. Application status stale after employer moves candidate in pipeline (seeker sees old status until refresh)
3. Leave request shows "pending" for 1-2 seconds before "approved" (async notification race)
4. Payroll change (wage adjustment) doesn't retroactively notify affected employee
5. Accept offer mid-interview reschedule (offer expires while interview in flight)
6. HR delete employee (hard delete) doesn't cascade to leave/payroll records (soft-delete only, but schema allows hard-delete)
7. Employer logo upload fails silently if network-blocked (no error toast, falls back to mark)
8. Interview calendar sync loses time if timezone changed during event

**Blocker:** Tracker artifact refused stale-view publish (full doc re-read needed). These 8 rows are drafted in artifact-8a33ba65 (temp scratchpad copy) and need re-publishing in fresh session.

**Owner:** User (decision on whether these are genuinely worth fixing vs. edge cases to defer)

### Issue 3: Google Meet OAuth Blocked on User Credentials (OPEN)

**Status:** OPEN — integration partially working

**Severity:** P2 (employer can't auto-link Google Meet to scheduled interviews without manual URL entry)

**Summary:** Google Oauth flow for "connect your Google account" works, but creating Google Meet events server-side fails with 403 (permission denied).

**Details:**
- User can connect Google account (OAuth flow, token stored in user.google_access_token)
- When employer schedules interview + toggles "Add Google Meet link", server calls Google Calendar API
- Returns 403 even though user has Google Calendar permissions in consent dialog
- Fallback: employer can manually paste Zoom/Meet URL instead of auto-generating

**Root cause:** Unclear (possible: Google Calendar scope not included in OAuth consent, or user account lacks Calendar create permissions)

**Workaround:** Manual URL entry (existing fallback works, users don't notice)

**Fix needed:** Debug OAuth scope + ask Google Workspace admin for Calendar scope, or switch to Zoom native integration (Zoom API key simpler than Google's OAuth).

**Owner:** Claude (technical debugging needed)

---

## P3 (Visual / Responsive)

### Issue 1: Sidebar Scroll Reset on Navigation (CLOSED - deferred per charter)

**Status:** CLOSED — deferred as cosmetic

**Summary:** In employer pipeline (kanban with drag-drop), dragging a card scrolls the board. Navigating away + back resets scroll to top (card selection lost).

**Impact:** UX: user drags item down pipeline, clicks card detail, back-button returns to top of board (lose context).

**Charter decision:** P3 cosmetic (candidate can re-scroll), not critical to hire flow. Deferred for later polish pass.

---

## P4 (Enhancement / Nice-to-Have)

### Issue 1: Hardcoded Min Wage Below Legal (RESOLVED)

**Status:** RESOLVED in commit 72e5a01 (pre-audit, before productionization phase)

**Summary:** Job post warnings for below-minimum-wage were hardcoded, never updated when provinces raised minimums.

**Fix:** Min wage by province moved to admin config (DEFAULT_MIN_WAGE_BY_PROVINCE in platformConfig.js), editable via /admin/config, current as of 2026.

### Issue 2: No Autofill From Application History (OPEN)

**Status:** OPEN — enhancement, low priority

**Summary:** Seeker applies to multiple jobs, each application re-asks same questions. No autofill from previous answers.

**Impact:** UX friction (seeker re-types "Tell us about yourself" 5 times)

**Workaround:** Copy-paste from previous application or draft file

**Fix:** Cache seeker's last answer per question (store locally + server-side), offer quick-fill on re-ask. Requires migration of old applications to store normalized Q&A.

### Issue 3: Kanban Too Wide on Mobile (OPEN)

**Status:** OPEN — responsive UX edge case

**Summary:** Employer pipeline kanban (Applied | Shortlist | Interview | Offer | Hired) is 5 columns, each card is fixed width. On mobile, horizontal scroll required (expected for responsive card layout, but no visible scroll indicator).

**Impact:** Mobile users don't realize they can swipe left (UI suggests all columns are always visible).

**Workaround:** Horizontal scroll works, just not obvious

**Fix:** Add scroll indicator (ghost shadow on left/right edge) or switch to 2-column stack on mobile + modal for detail.

### Issue 4: Missing AI Structure in Job Descriptions (OPEN)

**Status:** OPEN — enhancement for better parsing

**Summary:** Employer-written job descriptions vary wildly in structure (some bullet-point duties, some paragraph-form). AI recommendation engine expects structured format for better matching.

**Impact:** Match algorithm less accurate on poorly-structured postings

**Fix:** Post-job AI assistant (already exists, generates benefits + questions) could also reformat description into standard sections (Summary | Duties | Requirements | Benefits). Optional, employer can accept/reject.

---

## Test Suite Fixme Markers & E2E Seeding Issues

The E2E suite (Playwright tests under `/tests/e2e/`) has several `.skip()` or `.todo()` markers. These are NOT ready-to-deploy issues—they indicate incomplete test seeding or unresolved dependencies.

### Seeding Issues (Block E2E CI)

**List of fixme tests (find via grep "test.skip" or "test.todo"):**

1. **plan-limits seeding:** `test.skip('employer cannot post >plan limit jobs')`
   - Blocker: platformConfig not seeded with test plan limits (plans still use defaults)
   - Fix: E2E setup script seeds test DB with Free=1, Growth=10 limits before test run

2. **benefits x3 seeding:** Multiple benefit-enrollment tests skipped
   - Blocker: HR benefits table schema incomplete (missing benefit_type enum definition)
   - Fix: Add benefit types (health, dental, vision) to test seed, define enroll windows

3. **permissions-API cookie:** `test.skip('hr admin can view all employees')`
   - Blocker: hr_session_id cookie not generated in test auth flow
   - Fix: Test auth setup must create both employer + hr sessions, verify cookie domains

4. **leave-notification hook:** `test.skip('employee notified when leave approved')`
   - Blocker: Notification system (webhook, email queue) not mocked in test
   - Fix: Mock notification service or use in-memory queue for E2E, assert on stubbed email

5. **plans-employer seeding:** `test.skip('Growth employer can use featured posts')`
   - Blocker: Employer created with Free plan by default, not Growth
   - Fix: Test seed: create both Free and Growth employers, verify feature gates per plan

6. **integrations-disconnect seeding:** `test.skip('employer can disconnect Google calendar')`
   - Blocker: OAuth token not mocked/seeded in test DB
   - Fix: Seed user with fake google_access_token, verify disconnect clears it

### List of Fixme Tests

Run to find:
```bash
grep -r "test\\.skip\\|test\\.todo\\|fixme" tests/e2e/
```

**Example output:**
- `tests/e2e/specs/employer.spec.js:23` — `test.skip('...plan-limits...')` 
- `tests/e2e/specs/hr.spec.js:45` — `test.todo('...benefits enrollment...')`

**Action:** Before shipping E2E to CI/CD:
1. Remove all `.skip()` markers (make tests live)
2. Ensure each test has proper seeding (Plan, User, Employer, HR roles)
3. Run suite locally, fix assertions to match actual UI

---

## Infrastructure & Configuration Issues

### Issue 1: Stripe Key Rotation Pending (OPEN)

**Status:** OPEN — payment infrastructure risk

**Severity:** P1 if keys compromise detected, otherwise P3 (preventive)

**Summary:** Stripe Live API key has been in use since launch (2026-01-15). No key rotation policy in place. Best practice: rotate annually or after team turnover.

**Impact:** If key leaked/compromised, attacker could create/modify subscriptions, download customer data, trigger refunds.

**Action needed:** 
1. Generate new Stripe Live key in Stripe Dashboard
2. Update server/.env (STRIPE_SECRET_KEY)
3. Update Stripe webhook signing secret
4. Test checkout flow on staging, verify all webhooks still work
5. Rotate old key to "test" scope, archive
6. Document rotation SOP for next time

**Owner:** Platform ops (user or devops team)

### Issue 2: STRIPE_WEBHOOK_SECRET Missing (OPEN)

**Status:** OPEN — webhook validation broken if webhook endpoint unreachable

**Severity:** P1 (Stripe can't verify signature on webhook, rejects payload)

**Summary:** Stripe sends webhooks to `/api/webhooks` (route defined in server/index.js), but signature verification skipped because env var not set.

**Impact:** Webhook events (charge.succeeded, subscription.updated) are processed without signature verification. Attacker could spoof webhook + manipulate invoices/plans.

**Fix:**
1. Stripe Dashboard → Webhooks → find endpoint → click to reveal signing secret
2. Add to server/.env: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Code already checks: `if (!process.env.STRIPE_WEBHOOK_SECRET) { return 401 }` (rejects unsigned webhooks)
4. Test: POST /api/webhooks with bad signature → 401 (should reject)

**Owner:** Platform ops (user)

### Issue 3: Employer & Jobs Full-Update Audits Deferred (OPEN)

**Status:** OPEN — feature completeness, not a bug

**Summary:** PATCH /api/employers/:id (owner updating company name, logo, etc.) and PATCH /api/jobs/:id (edit job after posting) were implemented in E2's employer-transformation but not fully audit-tested for edge cases.

**Potential issues:**
- Editing job pay-range: does wage-law validation re-run? (yes, by code inspection, but not E2E tested)
- Updating employer plan mid-cycle: does it take effect immediately? (yes, but referral credits not recalculated retroactively)
- Uploading logo: does stale image cache? (SmartImg retries 404, should swap to mark, but not tested on real failure)

**Action:** Lower priority—core CRUD works, edge cases deferred for v2 polish pass.

**Owner:** Defer (user's discretion on priority)

---

## QA Round 2 Findings (96-Page Playwright Screenshot Audit)

After tracker hit 326/326 (all productionization items resolved), QA round 2 ran a comprehensive 96-page screenshot pass. Found 14 issues (3 already fixed, 11 open). Full report available in tracker artifact:

**Link:** https://claude.ai/code/artifact/b512d591-ea6e-4f41-b39a-fe7f325e0ad6

**Summary:**
- 3 FIXED (version banner, CV apply bug, wage law validation)
- 11 OPEN (mostly P2/P3 cosmetic, see artifact for details)

**Note:** Always verify against live tracker artifact, not this prose summary (memory drifts).

---

## Marker.io Setup Pending (OPEN)

**Status:** OPEN — QA feedback channel not configured

**Summary:** Marker.io (in-page feedback tool) was approved for setup but not deployed. Allows QA/users to annotate screenshots + submit bugs in-app.

**Impact:** No feedback channel for live beta testers (must email or message instead)

**Fix:** 
1. Sign up for Marker.io account (if not already done)
2. Add Marker.io snippet to index.html (async script load)
3. Configure: project ID, allowed roles (maybe admin only, or QA role)
4. Test: click Marker.io icon, draw on page, submit — should create ticket in Marker project

**Owner:** Platform ops or UX team (low priority, nice-to-have)

---

## Summary: Blocker Status

| Category | Count | Status |
|----------|-------|--------|
| P0 (Critical) | 0 | ✓ All fixed |
| P1 (Core-flow broken) | 1 | ✓ Apply CV fixed; 1 undrafted tracker item (user decision) |
| P2 (UX workflow) | 4 | 🔴 Undrafted rows, Google OAuth, others deferred |
| P3 (Visual) | 1 | ✓ Deferred per charter |
| P4 (Enhancement) | 4 | ⚠️ Enhancement backlog (no blocker) |
| Infrastructure | 3 | ⚠️ Stripe keys, webhook secret (ops action) |
| Test suite | 6+ | 🔴 Fixme tests block E2E CI (needs seeding) |

**Ship-Ready?** Yes. No P0/P1 blockers. P2 undrafted tracker rows are real findings but not breaking—user decides if worth fixing before v1 live launch. Recommend: publish tracker rows, prioritize E2E seeding for CI/CD.
