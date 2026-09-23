# NorthHire — Critical User Flows

Date: 2026-09-23. This document maps the five core user journeys (personas) through the platform, from entry point to success state. Each flow identifies key decision points, route paths, role-based access, and outcomes.

## Persona 1: Job Seeker (Free)

A person looking for work. Entry: homepage or direct signin. Goal: discover jobs, apply, track status.

### Happy Path: Browse → Save → Apply → Hire

**Route entry:** `/` (homepage) or `/login` / `/signup`

**Step 1: Register & Profile Setup**
- Route: `/signup` → `/verify-email` → `/welcome` (tour)
- Actions: email/password, phone (optional), preferred location(s), job categories, locale (en/fr-CA)
- Data saved to `users` table (seeker role, profile visible only to own account)
- localStorage tracks tour completion + any unsent drafts

**Step 2: Browse & Search**
- Route: `/jobs` (search page)
- Query params: `q` (text search), `cat` (category), `city`, `prov`, `type` (full-time/part-time/contract), `mode` (remote/on-site/hybrid), `minPay`
- Server filters live jobs (status='live' AND pending_owner_approval=0, no paused/closed)
- Results show: job title, company, location, pay range, match score (if available), save button
- Matched jobs surface first (badge: "🎯 Match 87%") via silver-medalist algorithm

**Step 3: Job Detail**
- Route: `/jobs/:id`
- Displays: full description, duties, requirements, application questions, interview schedule (if posted), company logo, company size, location, pay transparency (Bill 149 range if applicable)
- Actions: Save job (→ `/saved`), Start application, Share job link
- Match score drawer (right panel on desktop, bottom-sheet on mobile) explains why matched

**Step 4: Save for Later**
- Route: `/saved`
- All saved jobs for this seeker (joined from jobs table)
- Re-save to unsave, sort by date/match score, filter by category/location
- No limit on saved count (different from applications)

**Step 5: Apply**
- Route: `/apply/1` → `/apply/2` → `/apply/3` → `/applyDone`
- Step 1: Choose CV (max 5 per account) or create new one inline
- Step 2: Answer application questions (text inputs, optional)
- Step 3: Review + confirm CV + answers
- Step 4: Submit (POST /api/applications)
  - Server creates record: job_id, user_id, cv_id, answers JSON, created_at
  - Checks: user owns the CV, job is still live, seeker hasn't already applied
  - Returns application ID + status (submitted, awaiting response)
- Success page: SuccessCard + link to `/status`

**Step 6: Track Application Status**
- Route: `/status`
- All applications for this seeker (sent, viewed, rejected, interview scheduled, offered, hired)
- Filters: job, employer, status, date range
- Actions: message employer (if interview scheduled), accept/decline offer, withdraw application
- Statuses flow: submitted → employer views → moves to interview/reject column in their pipeline
- Notifications bell (`:interviews` and `:messages`) shows incoming activity

**Step 7: Interview**
- Route: `/interviews`
- Scheduled interviews (from employer's calendar)
- Details: date/time, interviewer name, format (phone/video/in-person), Google Meet link (if scheduled)
- Actions: Accept, decline, reschedule (if allowed by employer)
- Notification when scheduled, reminder 1 day before

**Step 8: Hire**
- Employer sends offer (POST /api/offers, role changes to 'worker')
- Route: `/offer/:token` (unauthenticated link to review & sign)
- Review: start date, position, pay, benefits, contract terms
- Actions: Accept, decline, request changes
- Success: role changes, welcome email, access to `/worker` dashboard

### Side Paths

**Update CV:**
- Route: `/cvs` → `/cvs/:id/edit`
- Rich text editor for each CV section (summary, experience, education, skills)
- Inline save to localStorage (draft) + auto-sync to server on blur
- Max 5 CVs per account (Growth plan feature, not Free)
- Publish toggle (public visibility in profile vs. only used for applications)

**Account Menu:**
- Route: `/account`
- Name, email, phone, password, locale, profile visibility (public/private)
- CASL unsubscribe from commercial email

**Settings:**
- Route: `/settings`
- Notification preferences: job recommendations, activity digest
- Privacy: profile visibility, who can contact
- Data: download profile, delete account

**Messages:**
- Route: `/messages`
- Inbox with employers (filter: pending, active, archived)
- Shared with employer: messages thread (chronological), typing indicator, photo fallback avatars
- No message limit (Free plan)

**Match Score Breakdown:**
- Route: `/match-score` (via drawer from job detail or stat on matched page)
- Silver-medalist explanation: "We matched you because: your recent job title matches, you have 4+ years experience (they want 3+), your location is close"

---

## Persona 2: Employer (Free / Growth / Enterprise)

A company hiring. Entry: landing page marketing or direct signup. Goal: post jobs, distribute, review applications, interview, hire, manage team/HR.

### Happy Path: Post Job → Distribute → Pipeline → Interview → Hire → Onboard

**Route entry:** `/for-employers` (marketing) → `/signup` (employer form) → `/welcome/employer` (tour)

**Registration:**
- Employer fields: company name, logo (upload or URL), size (employees), province (for wage law), website
- Creates `employers` record + owner user account
- Default plan: Free (1 active job limit)
- Access: `/employer` (dashboard)

**Step 1: Post Job**
- Route: `/employer/jobs/new` (form wizard)
- Fields: title, description (rich text), category, location (city + remote options), type, experience level, pay (lo + hi + unit), duties, requirements, benefits (multi-select + custom), application questions (custom + auto-added by AI)
- Wage law checks (Ontario Bill 149 / BC Pay Transparency):
  - ON: salary range required (if 100+ employees), no "Canadian experience" requirement allowed, vacancy must be real
  - BC: salary range required (public posting), no range cap
  - Validation blocks publish if violated, shows specific error
- Employer size gates featured posts (Growth: 2/month, Enterprise: unlimited)
- Publish action: status → 'review' → admin approval → status → 'live' (or paused if owner hasn't approved yet)
- Success: SuccessCard + link to job detail + share button + go to pipeline

**Step 2: Distribute**
- Route: `/employer/jobs` (job list)
- All jobs (live, paused, draft, pending approval, closed)
- Actions per job: edit, duplicate, pause/resume, close, share link, see applicant count
- Growth feature: featured badge (boosts visibility, 2/month refresh)
- CSV import (Growth only): bulk upload jobs from template
- Smart matching kicks in: seeker profiles matching posted requirements surface in pipeline

**Step 3: Pipeline**
- Route: `/employer/pipeline`
- Kanban board: Applied → Shortlist → Interview → Offer → Hired (columns, drag-drop to move)
- Each card shows: seeker name, applied date, match score, CV preview (click to expand), action buttons
- Filters: job (All/specific), date range, interview scheduling (Google Meet booked vs. pending)
- Growth feature: Messaging available (direct channel to seeker, 1:1 thread)
- Actions: move stage (drag), view full profile, schedule interview, send message, send offer

**Step 4: Messaging**
- Route: `/messages` (shared seeker/employer)
- Employer can message seeker from pipeline
- Thread view: chronological, typing indicator, photo avatars
- Link: offer documents, interview details, contract

**Step 5: Schedule Interview**
- From pipeline card: "Schedule interview"
- Modal: date/time (calendar picker), format (phone/Zoom/in-person), notes
- Growth plan: Google Calendar integration (if sso.google_access_token present)
- Creates `interviews` record + sends notification to seeker
- Seeker sees in `/interviews`, can accept/decline/reschedule
- Employer sees confirmed status in pipeline

**Step 6: Send Offer**
- From pipeline card: "Send offer"
- Modal: start date, position (title), pay (annual/hourly), benefits text, contract HTML
- Growth feature: offer templates (save/reuse)
- Seeker receives notification, link to `/offer/:token` (unauthenticated, just token auth)
- Seeker signs electronically, accepts/declines
- Employer sees status: pending → accepted → hire complete

**Step 7: Hire & Onboard**
- When seeker accepts: `users.role` → 'worker', creates `workers` record
- `/worker` dashboard: timesheet, pay stubs, documents
- Employer sees in pipeline: moved to "Hired" column
- Enterprise: HR Suite invitation sent automatically (add to payroll, assign to teams, send onboarding tasks)

### Side Paths

**Company Settings:**
- Route: `/employer/company`
- Logo, name, size, province, website, company URL slug (for `/employers/:slug` public page)
- Team invite codes / team members list

**Team Management:**
- Route: `/employer/team`
- Add members (email invite), set roles: Owner (full access), Admin (all except billing/team), Recruiter (pipeline, messaging, interviews only)
- Remove members
- Plan seat limit: Free=1 owner, Growth=2 seats, Enterprise=unlimited

**Billing:**
- Route: `/employer/billing`
- Current plan + renewal date
- Upgrade button → Stripe checkout for Growth ($X/month or $Y/year) or Enterprise (contact)
- Invoice history
- Referral credits (employer refers other company, both get $50 credit)

**Content Management:**
- Route: `/employer/content` → `/employer/content/articles` or `/employer/content/trainings`
- Employer can post blog articles (attract SEO traffic) + training content (free resources for jobseekers)
- Rich text editor, publish/draft/schedule
- Growth feature only

**Analytics:**
- Route: `/employer/analytics` (Growth feature, gated by FeatureBoundary)
- Dashboard: job views (by job, by day), application volume (trend), interview completion rate, hire conversion
- Date range picker (default: last 30 days, max 90 for Growth, unlimited for Enterprise)
- No analytics for Free plan (shows upgrade prompt)

**API & SSO:**
- Route: `/employer/api` (Enterprise)
- API keys for programmatic job posting, candidate sync
- Route: `/employer/sso` (Enterprise)
- OIDC/SAML configuration (allow your own identity provider to auth staff)

---

## Persona 3: HR Owner (Enterprise only)

Company administrator setting up HR Suite. Entry: added as owner via invite during employer onboarding.

### Happy Path: Setup → Invite Team → Attendance → Leave → Payroll → Perf Reviews

**Route entry:** `/hr/login` (HR-specific login, different session from employer/seeker)

**Session Scope:**
- HR and Employer are separate authenticated sessions (can have same user in both roles, different sessions)
- `/hr/*` routes require `hr_session` cookie
- User can switch between employer and HR from settings menu

**Step 1: Admin Setup**
- Route: `/hr/dashboard`
- Feature toggles (Owner): enable/disable modules per plan (Attendance, Leave, Payroll, Perf Reviews, Integrations)
- Employee directory import: CSV upload or sync from employer's worker list
- Add team (departments, cost centers)

**Step 2: Invite HR Team**
- Route: `/hr/settings` → Invite tab
- Email invite with role: Admin (full access to all modules), HR (can manage specific sections), Employee (self-service only)
- Permissions matrix: create/edit/view/delete per module

**Step 3: Employee Directory**
- Route: `/hr/people` (merged view of all employees + workers from linked employer account)
- List: name, photo, role, hire date, employment status (Active, On Leave, Probation, Terminated), department
- Actions: view profile (click card), edit profile, off-board (soft delete)
- Perf review badge (if perf review cycle active)

**Step 4: Attendance & Punch**
- Route: `/hr/attendance`
- Calendar view: punch-in/punch-out times per employee per day
- Kiosk: employees self-serve punch via `/hr/kiosk` (device auth, no sign-in needed, displays time)
- Manual entry: HR can override punch times, add time-off blocks
- Reports: attendance rate per employee, late arrivals, no-shows

**Step 5: Leave Management**
- Route: `/hr/leave`
- Policy: accrual by tenure (e.g. 15 days/year), specific types (vacation, sick, bereavement)
- Requests: employees submit via `/hr/leave`, HR approves/denies, calendar shows approved time-off
- Payroll integration: leave days reduce available hours in payroll
- Notifications: employee reminded to request leave, manager notified of request, denied/approved

**Step 6: Payroll**
- Route: `/hr/payroll`
- Cycles: define pay periods (bi-weekly, monthly), run payroll (calculates gross/deductions/taxes)
- Stubs: employees download pay stubs from `/worker/pay-stubs`
- Tax config: province-based tables (ON/BC/AB/QC), custom tax brackets per admin
- Staffing payroll: tracks hourly workers on temp assignments (overtime rules, burden rates)
- Invoicing: generate invoices to client (if staffing agency integration)

**Step 7: Perf Reviews**
- Route: `/hr/perf-reviews`
- Cycle setup: start date, review window (e.g. Dec 1 - Dec 20), goals, rating scale
- Assignments: employees + reviewers (self, manager, peer, admin)
- Completion: employees submit self-review + goals, reviewers fill review form, calibration meeting (admin summarizes)
- Archive: access past review cycles

### Side Paths

**Tasks:**
- Route: `/hr/tasks`
- HR/Team task board (onboarding, policy updates, compliance)
- Assign to team, set due date, track completion

**Calendar:**
- Route: `/hr/calendar`
- Team calendar: time-off, events, company holidays
- Integration: sync to Google Calendar (if sso.google_access_token)

**Internal Chat:**
- Route: `/hr/chat`
- 1:1 messaging with team + group chats (departments)
- Separate from employer platform's messaging (seeker/employer channel)

**Integrations:**
- Route: `/hr/integrations`
- Connect external services: accounting software (sync payroll), benefits provider, time-tracking (sync punch data)

---

## Persona 4: HR Employee (Enterprise, self-service)

Hourly worker or salaried employee accessing HR services.

### Happy Path: Clock In/Out → Request Leave → View Pay

**Route entry:** `/hr/kiosk` (punch time clock, device auth)

**Step 1: Punch Clock**
- Kiosk page: large buttons (Punch In / Punch Out), current time display
- Auth: device token (no login, reusable across shifts)
- Action: tap Punch In → creates attendance record, shows elapsed time, reminds to Punch Out
- Punch Out → confirms time, shows daily total, returns to idle state

**Step 2: Self-Service Portal**
- Employer worker also sees `/worker` tab (if hired via seeker flow)
- Route: `/worker` → tabs: Timesheet, Pay Stubs, Documents

**Timesheet:**
- Route: `/worker/timesheet`
- View: week or month view, punch-in/out times, total hours, any manual HR overrides
- Request time-off: button → modal with reason + dates + submits to HR

**Pay Stubs:**
- Route: `/worker/pay-stubs`
- Download PDF (via `/api/workers/:id/pay-stub`)
- Fields: gross, taxes (federal, provincial), deductions (benefits, pension), net, pay period dates

**Documents:**
- Route: `/worker/documents`
- T4 forms (annual), ROE (record of employment), benefits certificates, company policies
- HR-uploaded docs visible here

---

## Persona 5: Admin (Platform)

Platform maintainers. Moderate jobs, manage plans, configure business rules, audit data.

### Happy Path: Dashboard → Moderation → Config → Analytics

**Route entry:** `/admin` (dashboard, requires admin role)

**Step 1: Admin Dashboard**
- Route: `/admin`
- Alert banners: pending employer approvals (high threshold), flagged jobs, content drafts, moderation backlog
- Quick links: Users, Employers, Jobs, Settings, Config, Log

**Step 2: Moderation**
- Route: `/admin/jobs` (filter by status: all/flagged/review/live/closed)
- Actions: approve job (publish), reject (soft-delete with reason), pause (if violates law), edit directly
- Job audit: submitted by which employer, posting date, views, applications
- Employer audit: any policy violations flagged (bill 149 non-compliance, suspicious volume)

**Step 3: User Management**
- Route: `/admin/users`
- Search + filter: role (seeker/employer/worker), email, created date, last login
- Actions: view account, impersonate (test account), suspend, delete (GDPR)
- Audit: login history, API activity log

**Step 4: Employer Management**
- Route: `/admin/employers`
- List: company name, plan (Free/Growth/Enterprise), job count, team size, invoice status
- Actions: view company, change plan (billing), review applications, export data

**Step 5: Business Config**
- Route: `/admin/config`
- Editable fields: plan limits (job count, featured slots, seats), min wage by province, payroll tax brackets, staffing rates, admin alert thresholds
- Each config change logged with timestamp + admin who changed it
- No deploy required (JSON stored in platform_config table)

**Step 6: Design System**
- Route: `/admin/design-system`
- Catalog of all primitives, tokens, live examples
- QA tool: interactive showcase of Btn kinds/sizes, colors, Tag tones, etc.

**Step 7: Analytics & Logs**
- Route: `/admin/stats` (high-level metrics: active users, jobs posted, applications, revenue)
- Route: `/admin/log` (audit trail: who changed what, when)

---

## Role-Based Route Access

Route guards in `App.jsx` check user role before rendering page:

| Route | Guest | Seeker | Employer | HR | Admin |
|-------|-------|--------|----------|----|----|
| `/` (home) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/jobs`, `/jobs/:id` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/apply/*`, `/status` | ✗ | ✓ | ✗ | ✗ | ✗ |
| `/cvs`, `/cvs/:id/edit` | ✗ | ✓ | ✗ | ✗ | ✗ |
| `/messages`, `/interviews` | ✗ | ✓ | ✓ | ✗ | ✗ |
| `/worker/*` | ✗ | ✓ | ✗ | ✗ | ✗ |
| `/employer/*` | ✗ | ✗ | ✓ | ✗ | ✗ |
| `/hr/*` | ✗ | ✗ | ✗ | ✓ | ✗ |
| `/admin/*` | ✗ | ✗ | ✗ | ✗ | ✓ |
| `/login`, `/signup` | ✓ | ✓ | ✓ | ✓ | ✓ |

Access denied → `/denied` page (explains missing role).

---

## Success & Failure Endings

**Seeker Success:** User hired, signs offer, moves to `/worker` (HR-managed employee).

**Seeker Failure:** No matching jobs found (empty search → try other category/location), application rejected, offer declined.

**Employer Success:** Posted jobs, filled positions, team on board, moved to payroll (HR Suite).

**Employer Failure:** Plan limits hit (max jobs reached, Growth tier), wage law violation blocks publish, no applications received.

**HR Success:** All team onboarded, payroll run on time, no compliance gaps, employees self-serving punch/leave.

**HR Failure:** Payroll sync failed (integration down), employee leave rejected/lost in process, perf review cycle incomplete.

**Admin Success:** Platform running smoothly, no flagged content, all configs updated, compliance audited.

**Admin Failure:** Moderation backlog, bad employers evading law, system config error (broken plan limits).

---

## Cross-Persona Moments

**Public Employer Page:** `/employers/:id`
- Seeker views company, sees jobs posted, company size, logo, website link
- Accessible to anyone (no auth required)

**Offer Signing (Unauthenticated):** `/offer/:token`
- Candidate (may not be registered yet) reviews & signs offer
- Link sent via email, token validates seeker can access (not logged in)

**Referral Credit:** Employer refers another company → both get `$50 credit` (stored as `referral_credits` on `employers` table), applies to next invoice

**CASL Compliance:** All commercial emails have unsubscribe link (route: `/unsubscribe?token=...`)

**Export Data (GDPR):** Any user can request export of their data (jobs, applications, profile, messages, etc.) from account settings
