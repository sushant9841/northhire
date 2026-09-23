# NorthHire — Canadian Business Rules & Regulatory Compliance

Date: 2026-09-23. This document defines the business logic, legal guardrails, plan limits, and regulatory compliance rules enforced by the platform. These are the boundaries of what the system allows and what the real money does.

## Plan Architecture

Plans are admin-editable business config (see `server/platformConfig.js` + `platform_config` database table). Edit via `/admin/config` without redeploy. Fields backfill from `PLANS` constant (in `src/store/seed/constants.js`) on every read, so code updates never lose admin customizations.

### Free Plan

**Cost:** $0/month

**Limits:**
- Active jobs: 1 (employer can't post second until first is closed)
- Team seats: 1 owner only (no team)
- Featured posts: 0
- CSV import: not available
- Message to seeker: not available (no messaging in pipeline)
- Interview scheduling: not available (no Google Calendar integration)
- Analytics: not available
- Referral credits: none applied
- Stripe integration: skip checkout (no payment route)

**Features:**
- Post & manage 1 live job at a time
- Receive applications (Free seeker plan has unlimited applications)
- View applicant profiles, resumes
- Email-only communication (no in-platform messaging)
- Export applicant list as CSV

**Enforcement:**
- `jobs.status = 'live'` filtered where `employer_id = X` to count; if count ≥ 1, reject POST /api/jobs (post new job).
- Referral credits table stays empty (referrer_id = null).

### Growth Plan

**Cost:** $49/month or $490/year (billed by Stripe, cycle tracked in `employer_invoices.billing_cycle`)

**Limits:**
- Active jobs: 10
- Team seats: 2 users (Owner + 1 other role)
- Featured posts: 2 per month (rolling 30-day window, tracked in `featured_post_uses` table)
- CSV import: yes (template download, bulk upload)
- Message to seeker: yes (1:1 chat from pipeline)
- Interview scheduling: yes (Google Meet link if authenticated with Google)
- Analytics: yes (up to 90 days history)
- Referral credits: applies (employer referred, gets $50 credit)

**Features:**
- Everything in Free, plus:
- Messaging thread with each applicant (in-platform DM, no email fallback needed)
- Google Calendar integration (if OAuth token present for Google SSO)
- Featured job badge (boosts visibility in search, 2/month quota)
- Bulk job import (CSV template: title, description, category, location, pay, etc.)
- Analytics dashboard (job views, application trend, hire conversion)

**Enforcement:**
- `COUNT(jobs WHERE status='live' AND employer_id=X) < 10` before allowing new job POST
- Featured posts: `COUNT(featured_post_uses WHERE employer_id=X AND created_at > now()-30 days) < 2` before accepting featured flag
- Growth plan check in `billingRouter` and `jobsRouter`

### Enterprise Plan

**Cost:** $599/month or custom quote (contact sales)

**Limits:**
- Active jobs: unlimited (Infinity in config)
- Team seats: unlimited
- Featured posts: unlimited
- CSV import: yes
- Message to seeker: yes
- Interview scheduling: yes
- Analytics: yes (unlimited history, no 90-day cap)
- Referral credits: applies (but rarely discounts large enterprise deals)
- API access: yes (programmatic job posting, candidate webhook)
- SSO/OIDC: yes (customer's own identity provider)
- Dedicated account manager: contract term

**Features:**
- Everything in Growth, plus:
- HR Suite included (Attendance, Leave, Payroll, Perf Reviews)
- API keys for custom integrations
- OIDC/SAML SSO config (customer sets up, their identity provider authenticates staff)
- Bulk user/team import (HR directory sync)
- Payroll: unlimited employees, custom tax config per province
- Compliance reporting (audit logs, data retention, export on demand)

**Enforcement:**
- All limits either absent or set to Infinity in config
- `apiKeys` table checked on protected endpoints (`/api/publicApi/...`)

---

## Wage Transparency & Pay Disclosure

Enforced via `checkPostingLaw()` in `server/routes/jobs.js`. Rules differ by province (Ontario Bill 149 vs. BC Pay Transparency Act). Triggered on job publish (POST /api/jobs, PATCH /api/jobs/:id).

### Ontario (Bill 149) — Employers 100+ employees

**Requirement:** Publicly posted job posting must state compensation or pay range.

- Rule: `payRequired = true` for ON employers with 100+ employees
- Validation: `lo > 0 || hi > 0` (at least one of pay_lo or pay_hi must be set and positive)
- Error: "Ontario's Bill 149 requires a publicly advertised posting to state the expected compensation or range."

**No Canadian Experience Requirement:**
- Prohibition: Cannot require "Canadian experience", "Canadian work experience", "worked in Canada" in title, description, duties, requirements, or application questions
- Regex scan: case-insensitive scan across all text fields
- Error: "Ontario's Bill 149 prohibits requiring Canadian experience in a job posting or its application form. Remove '[phrase]'."

**Vacancy Confirmation:**
- Rule: `vacancyConfirm = true` for ON postings
- Required: `vacancyConfirmed = 1` (checkbox in UI, bool in POST body)
- Error: "Ontario's Bill 149 requires confirming this posting is for an existing, currently open vacancy."

### British Columbia (Pay Transparency Act) — All Employers

**Requirement:** Every publicly posted job in BC must state salary or pay range.

- Rule: `bcPayTransparency = true` for BC jobs (all sizes)
- Validation: `lo > 0 || hi > 0`
- Error: "British Columbia's Pay Transparency Act requires every publicly advertised posting to state an expected salary or pay range."

### Quebec — No Special Rule (yet)

Jobs posted in QC follow standard rules (no extra wage requirement). French translation via i18n.

### Enforcement Boundary

- **UI validation:** Post job wizard shows warnings + blocks submit if violations detected (UX gate)
- **API enforcement:** Server-side `checkPostingLaw()` also blocks via POST /api/jobs endpoint (real boundary)
- **Seeker-side:** Seekers see full pay range (or nothing if not disclosed) in job listing + detail

---

## Referral Program

When an employer is referred by another employer, both get credit.

**Flow:**
1. Employer A invites Employer B via referral link (contains `referrer_id = A.id`)
2. Employer B signs up, creates employer account
3. `employer_invoices.referral_credit` = $50 (applied as credit on B's first invoice)
4. Employer A's account also gets `employer_invoices.referral_credit` = $50 on their next invoice
5. Credit appears as negative line on invoice (reduces total due)

**Enforcement:**
- Referral link must contain `referrer_id` query param (encrypted/signed token, validated on signup)
- Credit only applies once per new employer (no multi-counting)
- Stored in `employer_invoices` table (one credit per invoice, cumulative if multiple referrals)

---

## Seeker Flow & CV Ownership

Seekers can have up to 5 CVs. When applying, they must choose one CV.

**Rules:**
1. Seeker user_id must own the CV (created by this user, not shared)
2. CVs can be marked public (visible in `/profile` to other seekers / recruiters) or private (only for applications)
3. When applying: server validates `cv.user_id = seeker_id` before creating application record
4. Multiple applications can use the same CV (CV is reusable)

**Enforcement:**
- Application POST checks `cv.user_id = req.user.id` (no cross-user CV theft)
- CV edit requires ownership + logged-in seeker role

---

## Employment Status & Life Cycle

HR Suite tracks employee status throughout employment lifecycle.

### Statuses (Enum in `hr.employment_status`)

1. **Active** — Currently employed, working
2. **On Leave** — Approved time-off (vacation, bereavement, etc.)
3. **Probation** — New hire during trial period (employer-configured duration, e.g. 90 days)
4. **Terminated** — No longer employed (soft-delete: record kept for payroll/compliance history, not shown in active roster)

### Status Transitions

- Hire → **Active** (worker accepts offer, HR adds to roster)
- Active → **On Leave** (approved leave request, auto-revert on return date)
- Active → **Probation** (manual override by HR, if hire had probation clause)
- Any → **Terminated** (HR marks as terminated, keeps history)

### Visibility

- Employee directory shows: Active + On Leave + Probation
- Terminated employees: hidden from normal roster, visible only in HR audit/history view
- Payroll: includes Terminated employees (past pay records accessible, future payroll excludes them)

---

## Benefits Enrollment & Windows

Enterprise feature: HR can configure benefits, set open-enrollment windows, track election history.

**Rules:**
1. Benefit types: health insurance, dental, vision, 401(k)-equivalent, stock options, wellness programs (customizable per company)
2. Enroll-open window: HR sets start/end date (e.g. Dec 1 - Dec 15)
3. Outside window: employees can't change elections (read-only view)
4. Life events: if `life_event = true` (marriage, birth, job change), enrollment window overrides (exception to closed-window rule)
5. History: all benefit elections timestamped + auditable

**Enforcement:**
- POST /api/hr/benefits/{benefitId}/elect checks `now() between window_start and window_end` OR `life_event = true`
- Error: "Enrollment closed. Contact HR for exceptions." (if neither true)

---

## Leave Policy & Accrual

Leave types: vacation, sick, bereavement, parental, unpaid, sabbatical (customizable).

### Accrual Rules

- **Vacation:** accrues by tenure (e.g. 2 weeks/year = 10 days/80 hours)
  - Formula: `days_per_year * (tenure_months / 12)` (prorated in first year)
  - E.g. hire Dec 1 → Jan 31 = 2 months → (10 days/year * 2/12) = 1.67 days
- **Sick:** typically no accrual, fixed allotment (e.g. 3 days/year, provincial minimum varies)
- **Bereavement:** fixed, employer-configured (e.g. 3 days per eligible death, once per calendar year)

### Request & Approval Flow

1. Employee submits leave request (date range, reason, type)
2. Manager notified (in `/hr/leave` pending queue)
3. Manager approves/denies
4. If approved: calendar blocks time, reduces available balance, syncs to payroll
5. If denied: employee notified, can resubmit

**Enforcement:**
- POST /api/hr/leave validates `available_balance >= requested_days` (can't request more than accrued)
- Approved leave deducted from payroll hours on that pay period
- On leave, employee can still punch clock (attendance may show, but hours deducted from leave balance first, not paid hours)

---

## Payroll Execution & Tax Calculation

Payroll runs per configured cycle (bi-weekly, weekly, monthly, semi-monthly).

### Gross Calculation

- **Salaried:** annual_salary / pay_periods_per_year
- **Hourly:** hours_worked * hourly_rate
- **Overtime (if applicable):** hours_over_40_per_week * hourly_rate * 1.5 (OT rate, configurable per province)
- **Bonuses/adjustments:** added manually or via integration sync

### Tax Deductions

Ontario tax brackets (default, overridable in admin config):
- Provincial tax: marginal rate per income bracket
- Federal tax: marginal rate per federal bracket
- CPP (Canada Pension Plan): employee + employer portion
- EI (Employment Insurance): employee portion
- RRSP: if employee elected
- Deductions: benefits premium, union dues, etc.

All rates & brackets sourced from `DEFAULT_PAYROLL_TAX_CONFIG` (see `src/helpers/payrollTax.js`), editable via `/admin/config`.

### Net Calculation

```
Gross - Federal Tax - Provincial Tax - CPP - EI - Deductions = Net
```

### Pay Stub

Generated PDF (accessible via `/worker/pay-stubs`):
- Employee name + ID
- Pay period dates
- Gross
- Each tax/deduction line item
- Net
- YTD totals (year-to-date cumulative)
- Download as PDF

**Enforcement:**
- Only admin/HR can run payroll (button in `/hr/payroll`)
- Once run, `pay_stubs` records created (immutable, can't edit past stub)
- Employee can see stubs (read-only download)

---

## Performance Review Cycle

HR configures annual or semi-annual review window. Employees + reviewers (self, manager, peers, HR) submit feedback.

### Cycle Setup

1. HR defines: start date, end date (review window), rating scale (e.g. 1-5), goal template
2. Assigns participants: each employee + their reviewers

### Submission

- **Self-review:** employee enters goals, self-assessment, strengths, growth areas
- **Manager review:** manager rates performance per scale, adds context
- **Peer reviews (optional):** colleagues provide feedback (anonymous or named)

### Calibration

- HR summary: collates all reviews into one file (PDF/export)
- Possible legal hold: company may retain reviews for compliance/audit

### Result

- Stored in `perf_reviews` table (immutable once submitted)
- Employee can view own review (after cycle closes)
- Used for promotion/raise/severance decisions (not automatic, HR decision)

---

## Workflow Rule Execution Order

Server enforces rules in this order on certain operations (e.g. "accept offer"):

1. **Auth:** user must be logged in + own the resource (offer token for guest, user_id for authenticated)
2. **Status check:** resource must be in correct state (offer status = 'pending', not already accepted/declined)
3. **Time check:** deadline passed? (offer expiry date)
4. **Plan check:** feature available on employer's plan? (some features gated)
5. **Data validation:** all required fields present?
6. **Side effect:** execute the action (update status, send notification, move pipeline stage)
7. **Notification:** email seeker/employer, log activity

Example: Accept offer endpoint
- ✓ User is logged in (seeker)
- ✓ Offer token is valid + not expired
- ✓ Offer status is 'pending' (not already accepted)
- ✓ (no plan gate for offer acceptance)
- ✓ (no extra validation needed)
- → Update `offers.status = 'accepted'`, `users.role = 'worker'`, create `workers` record
- → Email employer "Candidate accepted offer"

---

## Session & Role Isolation

Three distinct session scopes:

### Seeker Session (`/`)

- Cookie: `seeker_session_id`
- Routes: `/`, `/jobs`, `/apply`, `/status`, `/messages`, `/profile`, `/cvs`, `/worker` (if hired)
- Auth via: email + password signup, or link in offer (token-based guest access for `/offer/:token`)

### Employer Session (`/employer`)

- Cookie: `employer_session_id`
- Routes: `/employer/*`
- Auth via: email + password for owner, invite link for team members
- Can message seekers, schedule interviews, send offers

### HR Session (`/hr`)

- Cookie: `hr_session_id` (separate from employer/seeker sessions)
- Routes: `/hr/*`
- Auth via: email + password (can be same user as employer, but different session)
- Seeker/Employer cannot access HR routes even if same user account

**Session Storage:** All in database (no JWT, server-side sessions via `sessions` table with expiry).

**Switch Sessions:** User can switch between sessions in settings (if they have multiple roles), which clears old cookie + sets new one.

---

## Quebec Bill 96 & French Localization

Required for employers registered in Quebec. All user-facing strings must be available in Canadian French (fr-CA locale).

### Supported Locales

- `en` — English (default, all users)
- `fr-CA` — Canadian French (Quebec employers + seekers in QC)

### Translation Keys

Every visible string wrapped in `t('key.path')` (see `src/i18n/i18n.jsx`). Keys defined in `src/i18n/en.js` and `src/i18n/fr.js`.

### Locale Switching

- Seeker: `/settings` → language dropdown → stored in `users.locale`
- Employer: `/employer/company` → language dropdown (applies to company, affects HR invites in that language)
- Load order: user's saved locale > browser locale > default (en)

### Compliance Points

1. Job posting must offer French job title + description option (if employer is QC)
2. Offer letters: can be generated in English or French (if seeker selected fr-CA)
3. HR notices: all leave approval, pay stub notifications, policy updates sent in seeker's locale

### Implementation

- `src/i18n/en.js` — English keys + values
- `src/i18n/fr.js` — French translations (verified by human, not AI-auto)
- Pluralization: handled by i18n library (e.g. "1 application" vs "2 applications")
- Gender (French nouns/adjectives): handled case-by-case in translation (e.g. "employé·e" for mixed-gender contexts)

---

## CASL Compliance (Canadian Anti-Spam Legislation)

All commercial emails must:
1. **Identify sender** — "From: NorthHire Jobs <jobs@northhire.ca>"
2. **Unsubscribe link** — `[Unsubscribe](https://northhire.ca/unsubscribe?token=...)`
3. **Contact info** — physical address or contact form link in footer
4. **Consent proof** — user opted in (tracked in `email_consent` table)

### Consent Types

- **Transactional:** password reset, application status, interview invite (no consent needed, required service)
- **Marketing:** job recommendations, newsletter, company updates (opt-in only)

### Enforcement

- Signup form: "Subscribe to job recommendations?" checkbox (checked by default, can uncheck)
- User can unsubscribe anytime: `/unsubscribe?token=...` (no auth required, token validates)
- Unsubscribe = `users.email_marketing_consent = 0`
- No emails sent to unsubscribed addresses (except transactional)

---

## PIPEDA (Personal Information Protection and Electronic Documents Act)

Privacy regulation requiring consent to collect/use personal data.

### Disclosures

- Privacy Policy: `/privacy` (explains data collection, use, retention)
- Account deletion: users can delete account + all data (see `/settings` → "Delete my account")
- Data export: users can export their data as JSON (see `/settings` → "Download my data")

### Retention

- Active account: keep indefinitely (until user deletes)
- Deleted account: anonymize within 30 days (remove name, email, phone; keep application history for aggregate stats)
- Logs: keep audit trail for 1 year, then archive

---

## Silver-Medalist Matching Algorithm

Seeker-to-job matching (shows match score + "Matched" badge on job detail, surfaces matched jobs first in search).

### Scoring

Match score out of 100:

- **Job category match** (30 pts) — user's saved categories vs. job category
- **Location proximity** (25 pts) — user's saved location(s) vs. job location (exact city or within 50km)
- **Experience level** (20 pts) — user's years of experience vs. job's requirement (±2 years = full points, decay outside range)
- **Pay range** (15 pts) — user's last job pay vs. job's posted range (if disclosed)
- **Recent job title similarity** (10 pts) — TF-IDF match between user's last job title + job title

### Display

- Threshold: ≥65 match score shows badge + breakdown
- Breakdown modal (route: `/match-score`): "We matched you because: you saved this category, your experience matches, etc."

### Refresh

- Recomputed daily (batch job) + on-demand when seeker clicks "Refresh Matches"

---

## Staffing Agency Economics (if enabled)

Staffing agency console manages temporary worker assignments, payroll + margins.

**Burden Rate:** markup above worker pay (e.g. 30% margin = worker earns $20/hr, client invoiced at $26/hr).

**Invoice:** Agency invoices client weekly/bi-weekly (client = employer via staffing tab). Client pays agency, agency pays worker.

**Compliance:** Staffing workers still subject to provincial labor laws (min wage, OT, vacation accrual).

---

## Audit & Logging

Every "material" action logged to `activity_log` table:

- Job posted, paused, closed
- Application submitted, rejected, interview scheduled
- Offer sent, accepted, declined
- Employee hired, terminated
- Leave approved, denied
- Payroll run, pay stub generated
- User data accessed (admin impersonation, export)

**Query:** admin view in `/admin/log` (filter by date, action type, actor, resource).

**Retention:** keep for 3 years (compliance + legal hold).
