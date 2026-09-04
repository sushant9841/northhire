# NorthHire Master Audit — 2026-09-03

Merged from 6 parallel domain audits (marketing/auth, admin console, employer console, HR suite, job-seeker experience, staffing agency console) covering the full page surface of the app. Every finding is sorted into the same 4-bucket lens:

1. **Looks functional but isn't** — dead buttons, fake data, `alert()`/`confirm()`/`prompt()` standing in for real flows
2. **Works but poorly** — missing states, weak validation, confusing flows
3. **Missing vs. a real global HR/staffing/job-platform product** (Workday, BambooHR, Deel, Indeed, LinkedIn Jobs, Bullhorn)
4. **Already built but could be much better** — present and working, but below the bar for paying customers

Domain reports are below, verbatim from each audit pass. **Read the Systemic Issues section first** — it's the new synthesis from merging all 6 reports, and it's where the highest-leverage fixes are: several of these show up independently in 3-5 domains because they trace back to one shared component or store function, so fixing the root once resolves many line-item findings at once.

---

## Systemic Issues (cross-cutting, found in 3+ domains)

1. **No pagination/virtualization anywhere in the app.** Every list in every domain — admin Users/Employers/Jobs, employer job list/pipeline/content library/messages, HR directory/departments/attendance log/salary table, seeker search/saved/matched results, staffing bench/workers/invoicing/assignments, marketing blog/training grids — renders its full unbounded array. This is the single most repeated finding across all 6 audits. Fine at seed-data scale, breaks at real scale.

2. **`alert()`/`confirm()`/`prompt()` standing in for real UI feedback, everywhere.** Staffing "chase supervisors" and rejection reasons, HR call buttons/PDF download/system import, employer staffing "submit request," seeker document upload, marketing training checkout. There's no toast/snackbar system in the design primitives, so every domain independently reached for native browser dialogs instead. Building one shared feedback primitive (`src/design/primitives.jsx`) would let all of these be fixed as a UI swap, not a redesign.

3. **Three separate, inconsistent, fake CPP/EI/tax calculations.** `useHrStore.js` (flat 5.95%/2.21%/14.5%/7.5%), `useStaffingStore.js` (`gross*0.7481` flat multiplier), and `worker.jsx` timesheets (5.95%/2.21%/14.5% again, independently hardcoded). None use real brackets, provincial rates, or credits — and they don't even agree with each other. This needs one real (or realistically stubbed) payroll-tax module shared across HR, staffing, and seeker-worker views, not three.

4. **"Preview" actions inflate real analytics.** `useStore.js:554` (`openJob`) is called both from the admin moderation "eye" preview and the employer's own job preview button — both silently increment the same `views` counter used for real candidate-traffic analytics and conversion-rate stats. One store fix covers both surfaces.

5. **Stored-XSS risk: rich text has no sanitization anywhere in the pipeline.** The RichText editor (`src/design/primitives.jsx:441-481`, built on deprecated `document.execCommand`) captures raw `innerHTML` for job posts, blog articles, and training content. That content is later rendered via `dangerouslySetInnerHTML` (e.g. `src/pages/marketing/pages.jsx:358-360`, BlogPage) with no sanitization step anywhere between input and output. Any employer or admin content author can inject arbitrary script into public-facing pages. **This is a real security gap, not just a polish item — worth prioritizing over most of bucket 4.**

6. **Paid-plan gating is inconsistently enforced, leaking revenue.** Free-plan employers can already message candidates because `can("messages")` treats the string `"limited"` as truthy (`suite.jsx:527-528`). Bulk pipeline actions run for every tier despite being sold as Growth+-only (`suite.jsx:372-377`). Branded career pages are available to all tiers though marketed as paid (`suite.jsx` ~868-880). The advertised "30 applications/month" Free-plan cap and other numeric limits are never enforced (`useStore.js` `can()`/`limitOf()` only gates job count and booleans). Each of these independently gives away a paid feature for free.

7. **Interactive elements built as bare `<div onClick>` instead of semantic controls — a design-primitives-level accessibility gap.** `Switch` (`primitives.jsx:346-349`, used in admin settings, HR settings, seeker filters) has no `role="switch"`/`aria-checked`/keyboard support. `Card`/`JobCard`/`BlogCard`/`TrainingCard` (`primitives.jsx`, `cards.jsx`) and every kanban card (employer pipeline, HR tasks, admin) are plain clickable divs with no `role="button"`/`tabIndex`/`onKeyDown`. `Modal` (`primitives.jsx:400-417`) has no focus trap or Escape-to-close. Because these are shared primitives, fixing them once fixes keyboard/screen-reader access across every domain that uses them — this is the natural first target for the "reusable component sets" phase of the productionization plan.

8. **No real routing — the whole app is in-memory `pg` state (`useStore.js:16-21`).** No bookmarkable/crawlable URLs for jobs, blog posts, trainings, or employer pages; refreshing any deep page resets to home; the browser's actual Back/Forward buttons aren't wired to in-app navigation (`back()` only pops an internal stack). This blocks any real SEO work and is worth flagging as a foundational, not cosmetic, gap.

9. **Every money-handling surface produces fake documents.** Employer billing invoices are a hardcoded literal array disconnected from the real plan/subscription (`suite.jsx:966`). Staffing invoice generation has a dead date picker, hardcoded HST regardless of province, and `Math.random()`-generated invoice numbers with no uniqueness check. HR's invoice/payslip "PDF" download is actually a 3-line `.txt` file. No domain produces a real, well-formed financial document.

10. **No audit trail on sensitive actions, in any admin-type surface.** Platform admin moderation actions (suspend/verify/hold/flag) capture no reason and log nothing beyond a raw state flip. HR salary changes, role changes, and payroll runs are unlogged. Staffing payroll finalization, invoice generation, MSA signing, and rate changes leave no who/when trail. This is a compliance gap that recurs in every back-office surface in the app.

---

## Marketing Site + Auth Flow

*Scope: `src/shells/Header.jsx`, `Footer.jsx`, `TabBar.jsx`; `src/pages/marketing/pages.jsx`; `src/pages/marketing/forEmployers.jsx`; `src/pages/auth/pages.jsx`*

### 1. Looks functional but isn't
- `useStore.js:804` (`A.share()`, used by `pages.jsx:368` Share button) — only writes an activity-log entry; no real share sheet, clipboard copy, or social post. (Also affects seeker `JobDetailPage.jsx:94,139` — see Systemic.)
- `pages.jsx:771` (ContactPage submit) — `logActivity` records only the topic string; the actual message text (`f.msg`) is discarded and never stored for support to read.
- `forEmployers.jsx:132,177,193` and `pages.jsx:960` (plan CTA buttons) — every tier's "Start trial"/"Choose Growth"/"Book a demo" routes through `A.go("signup")` with the selected tier discarded; a guest who picks Growth or Enterprise still signs up on Free.
- `useStore.js:683-692` (`enrol`, from `pages.jsx:463`) — paid-training checkout is a raw `confirm()` dialog standing in for a real payment flow.
- `pages.jsx:905-924` vs `useStore.js:814-818` — "30 applications per month" and other advertised Free-plan limits are never enforced. (See Systemic #6.)
- `pages.jsx:194` vs `88-93` — "Browse by sector" job counts use hardcoded fake numbers from `CATS` while the logged-in "Top industries hiring" block computes real counts, so two contradictory numbers appear on one page.
- `pages.jsx:179` — homepage stat "X+ Live openings across Canada" is `live.length*712`, a fabricated multiplier.
- `auth/pages.jsx:326-327` (WelcomeTourPage) — `useEffect` is only invoked inside an `if(!u)` branch, a Rules-of-Hooks violation that can crash the page if `user` becomes null while mounted.
- `auth/pages.jsx:334-388` (WelcomeTourPage) — per-step `cta` values are only ever read on the last step; every mid-tour CTA is dead data.
- `pages.jsx:727-732` (AboutPage "We're hiring" rows) — no click handler at all; only "See all openings" works, and it routes to the generic contact form, not a careers/ATS listing.
- `shells/Footer.jsx:32-33` — social icons are `href="#"` with `preventDefault`, permanently dead links.
- `auth/pages.jsx:379` (WelcomeTourPage) — states Enterprise is "$499/mo" while `constants.js:33` and every pricing screen charge $599/mo.

### 2. Works but poorly
- `auth/pages.jsx:20-218` (SignupPage) — multi-step wizard lives in local component state only; a refresh or hardware back-button wipes an in-progress signup with no warning or resume.
- `auth/pages.jsx:224-225` (LoginPage) — fake 120ms `setTimeout` "busy" state simulates a network call with no real async path.
- `shells/Header.jsx:54` (browse-jobs dropdown) — closes via `onBlur` + `setTimeout(200ms)` with no Escape-key handling.
- `forEmployers.jsx:28-31,280` — "For staffing → Overview" sets `window.location.hash` then navigates, but the scroll-to-anchor effect only runs on mount, so clicking it while already on the page does nothing.
- `auth/pages.jsx:119,304` — no show/hide toggle on any password field (signup, login, reset).
- `pages.jsx:44-48,592,623,661` (`H` helper) — nearly every section title is an `h2` regardless of visual weight, giving a flat, unhelpful heading outline.
- `pages.jsx:283,390` (Blogs/Trainings search) — plain `.includes()` on title/excerpt only; a typo or multi-word query silently returns zero results.
- `auth/pages.jsx:211` (SignupPage step 0) — button labelled "Cancel" actually navigates all the way home.
- `pages.jsx:210-213` (SignupPage progress bar) — "% complete" is step-index-based for both 6-step seeker and 3-step employer flows, with no way to jump back to a completed step.

### 3. Missing vs. a real HR/staffing/job-platform product
- No URL-based routing anywhere (see Systemic #8) — no bookmarkable/crawlable job/blog/training URLs.
- `useStore.js:109` (`back`) — only pops an in-memory stack; browser Back/Forward not wired.
- `auth/pages.jsx:123-137` (SignupPage employer "company" step) — copy promises business-number/incorporation verification that the form never actually collects.
- `auth/pages.jsx` (LoginPage) — no MFA prompt at sign-in despite 2FA existing in the store (`useStore.js:305-316`); no CAPTCHA/lockout; no "remember this device."
- `auth/pages.jsx:253-266` — real-looking demo credentials for all four roles printed directly on the public sign-in page.
- ContactPage — no ticket/reference number, no SLA tracker, no attachment upload, no admin-side inbox to read submissions.
- PricingPage/`forEmployers.jsx` — no real checkout: no card entry, proration preview, invoice/receipt, or GST/HST calculation.
- `forEmployers.jsx:118,179,329` — comparison table/FAQ promise Workday/Greenhouse/Lever integrations, Zapier, SSO/SAML, and an API with zero implementation.
- Blogs/Trainings pages — no RSS feed, no topic taxonomy beyond one flat filter, author name/avatar clicks do nothing.
- SignupPage — no social/SSO sign-up (Google/LinkedIn/Indeed), no email verification; accounts are fully active immediately.
- AboutPage careers list — three "open roles" with no link to an actual careers page or application form.
- HowItWorksPage — text + icons only, no screenshots, demo video, or interactive walkthrough.
- Header browse-jobs mega-menu — no recent-search chips or recently-viewed-jobs shortcut.
- BlogPage/TrainingPage — no Open Graph/Twitter-card metadata possible (no per-article URL).
- ForgotPasswordPage — no resend-cooldown timer, no rate limit on code-verification attempts.

### 4. Already built but could be much better
- `cards.jsx:71-96` / `primitives.jsx:316-320` — all clickable cards are plain `<div onClick>` (see Systemic #7); directly contradicts `pages.jsx:1049` AccessibilityPage claiming keyboard reachability.
- `pages.jsx:358-360` (BlogPage) — renders body via `dangerouslySetInnerHTML` with no sanitization (see Systemic #5).
- `pages.jsx:317-318,418-419` (Blogs/Trainings grids) — no pagination or virtualization (see Systemic #1).
- `pages.jsx:582-583,696` (AboutPage press/investor logos) — plain gray text rather than real logo marks, reads as unfinished.
- `pages.jsx:784-787` (ContactPage office numbers) — obviously fake sequential numbers for all four "real" offices.
- PricingPage/AboutPage stat blocks (e.g. "50k+ Hires made") — frozen literal strings never derived from real data.
- `shells/Header.jsx:36` — "Browse all companies" and "Verified employers only" call the identical `A.go("employers")` with no verified filter actually applied.
- `auth/pages.jsx:32-43` (SignupPage `SUG` skill suggestions) — large inline literal keyed only by category; any sector added elsewhere gets an empty suggestion list.
- `primitives.jsx:346-356` (Switch/CheckRow) — `<div onClick>` toggles instead of real inputs (see Systemic #7).
- `auth/pages.jsx:400-402` (WelcomeTourPage progress dots) — purely decorative, not clickable.
- Hero sections — heavy reliance on generic placeholder art site-wide.
- `forEmployers.jsx:330` (FAQ) vs `Footer.jsx:49` — FAQ says French support is "coming Q2 2026" while the footer hardcodes "English (CA)" with no locale switcher, despite bilingual/PIPEDA claims throughout.

---

## Platform Admin Console

*Scope: `src/pages/admin/suite.jsx` (AdmHome, AdmUsers, AdmEmployers, AdmJobs, AdmSettings, AdmLog, AdmStats)*

### 1. Looks functional but isn't
- `suite.jsx:42,115` / `useStore.js:658` — "Hold" only logs a line; no `hold`/status field is ever added to the employer object, so the employer stays in the exact same pending list with no visible or persisted effect.
- `suite.jsx:79-80` / `useStore.js:659-660` — "Suspend/Restore" toggles a `suspended` Set used only to paint a badge; never checked in login, job application, or messaging — a "suspended" user keeps using the platform normally.
- `suite.jsx:16,31` (AdmHome) — Monthly revenue stat is `A.employers.length*149`, billing every employer at the Growth price regardless of real plan.
- `suite.jsx:31` — "+22% MoM" delta is a hardcoded string, not computed.
- `suite.jsx:226,248-254` (AdmStats) — revenue trend chart is fully hardcoded, disconnected from real billing data.
- `suite.jsx:168` / `useStore.js:76` — "CV builder enabled" setting is stored/toggled but never read anywhere; zero effect on the real feature.
- `suite.jsx:172` / `useStore.js:627-633` — "Require a pay range" toggle is never enforced during job publishing.
- `suite.jsx:138,142` — "Closed" job tag is unreachable dead code; jobs pending moderation incorrectly render as "Closed" instead of "Pending review."

### 2. Works but poorly
- `suite.jsx:41-42,79-80,113-115,140-142` — no confirmation dialog and no success/failure toast on any moderation action (see Systemic #2).
- `suite.jsx:85-117` (AdmEmployers) — no search/filter box at all, only pending/verified tabs.
- `suite.jsx:63-64` (AdmUsers) — search is bare substring on name/email/title only; no filter by suspended status/role/apps, no sort.
- `suite.jsx:119-129` (AdmJobs) — can't combine search with flagged/paused tabs; "Not live" lumps "review" and "paused" together.
- `suite.jsx:61-145` — no bulk moderation anywhere; every action is single-row.
- `suite.jsx:140` / `useStore.js:554` — Preview inflates real `views` (see Systemic #4).
- `suite.jsx:199` / `useStore.js:802-803` — "Export CSV" always dumps the entire unfiltered activity array.
- `suite.jsx:150-173` (AdmSettings) — no "changed by/when" shown inline; only in the separate activity log.
- `suite.jsx:141` — "Restore" label reused for un-pausing a live job and approving a "review" job — same text, two different actions.
- `useStore.js:92-93` (`log`) — activity log capped at 120 entries client-side; older events silently dropped.

### 3. Missing vs. a real platform-admin console
- `routes.js:111-119,128` — only one flat "admin" role; no scoped roles (support/moderator/finance/read-only).
- No required moderator note/reason capture on approve/hold/suspend/flag (see Systemic #10).
- `useStore.js:656-660` — no hard-delete/ban flow; only reversible toggles; no GDPR-style data-erasure tooling.
- No data export for Users or Employers tables (only Applicants-CSV and Activity-Log-CSV exist).
- No visibility into abuse/rate-limiting signals (failed logins, spam sign-ups, application flooding).
- No pagination/virtualization for platform-scale tables (see Systemic #1).
- `useStore.js:74,92-93` — activity log has no server-side persistence or retention policy.
- `useStore.js:370-378` (`impersonate`) — once impersonating, actions log as the target user's identity; admin actions aren't distinguishable from the user's own.
- No drill-down/detail view for a user or employer — just a flat row per record.
- `suite.jsx:11-59` (AdmHome) — no ops-health signals (error rates, failed logins, queue health, uptime).
- `suite.jsx:22-26` — no escalation/alerting beyond a static banner.

### 4. Already built but could be much better
- `primitives.jsx:346-349` (Switch) — inaccessible custom toggle (see Systemic #7).
- `suite.jsx:221-256` (AdmStats) — no date-range selection, no real trend-over-time, no cohort/funnel/retention views.
- `suite.jsx:187-219` (AdmLog) — filtering is one search box + one category dropdown; no date-range, actor filter, or export-of-filtered-view.
- `suite.jsx:61-83` (AdmUsers) — no sortable columns, no signup/last-active column, no suspension reason/history.
- `suite.jsx:85-117` (AdmEmployers) — verification is a single Approve button with no supporting evidence panel.
- `suite.jsx:52-57` vs `161-165` — same 3 feature switches duplicated across two screens with no indication they're the same setting.
- `suite.jsx:239-247` (AdmStats byCat/byStage) — plain bar lists with raw counts only, no period-over-period comparison.

---

## Employer Console

*Scope: `src/pages/employer/suite.jsx`, `src/pages/employer/staffing.jsx`*

### 1. Looks functional but isn't
- `suite.jsx:161` — `publishJob` always sends `featured:false`; no UI to mark a listing "featured" — the Growth/Enterprise "featured job upgrades" perk is unusable.
- `suite.jsx:297` — copy claims featured listings sort automatically by performance; `job.urgent`/`job.featured` are only ever rendered as a badge, no sort/boost logic exists.
- `suite.jsx:966` — billing invoice list is a hardcoded literal array, disconnected from real plan/subscription history (see Systemic #9).
- `staffing.jsx:136` — "Submit request" in Request Workers modal only `alert()`s; no job order is ever created.
- `suite.jsx:527-528` — Free plan's `messages:"limited"` is truthy, so `can("messages")` returns true — Free employers can already message candidates (see Systemic #6).
- `constants.js:31-40` + `DashShell.jsx:60-74,215` — upgrade-modal copy exists for `bulkActions`/`customStages`/`branded`/`api`/`sso`/`manager`, but `setUpgradeModal` is only invoked for 4 of them — the rest is unreachable dead code.
- `suite.jsx:372-377,442-451` — bulk move/reject run for every plan tier with no `can("bulkActions")` check, despite being marketed as Growth+ (see Systemic #6).
- `suite.jsx` (EmpCompany, ~868-880) — branded logo/color editor available to every tier though sold as paid; no custom URL slug despite being advertised.
- `useStore.js:554` (`openJob`) — Preview inflates real `views` (see Systemic #4).
- `useStore.js:452-479` (`importJobsCSV`) — splits rows with plain `row.split(",")`, no quote/escape handling; a comma in any free-text field silently corrupts subsequent columns.
- `suite.jsx:271,316` — "Number of vacancies" is captured but never decremented against Hired count and never auto-closes the listing.
- `useStore.js:612-614` (`rejectApp`) — hardcodes "This position has been filled" for every rejection, even routine ones.
- `primitives.jsx:441-481` (RichText → `dangerouslySetInnerHTML`) — no sanitization anywhere in the pipeline (see Systemic #5, this is the source).

### 2. Works but poorly
- `suite.jsx:450` — "Reject all" bulk action fires immediately with zero confirmation.
- `suite.jsx:529` — "Not a fit" single-candidate reject has no confirmation step.
- `suite.jsx:446-448` — "Move to…" bulk dropdown has no click-outside/escape handling, no `aria-expanded`/`role="menu"`.
- `suite.jsx:462-481` — Kanban cards/checkboxes are plain divs with `onClick` only (see Systemic #7).
- `suite.jsx:62-106,441-482` — no pagination anywhere (see Systemic #1).
- `suite.jsx:108-345` — job-post wizard has no autosave/draft persistence; a refresh loses every field.
- `suite.jsx:140-148` — pay validation only checks presence and `hi>lo`; no sanity bounds.
- `useStore.js:493` — conversion rate (`totalApps/totalViews*100`) is never clamped, can exceed 100%.
- `suite.jsx:929` — "Renews 1 September 2026" is a hardcoded string unrelated to any real subscription date.
- `staffing.jsx:177` — "Return" (reject timesheet) uses a native `prompt()` (see Systemic #2).
- `suite.jsx:861-895` — dirty-check for company profile is a whole-object stringify compare; no per-field indicator, no confirm before "Discard."
- `suite.jsx:580-634` — Content Manager has no search/filter by status/category, no bulk publish/unpublish/delete.
- `shared/MessagesPage.jsx:11-18`, `shared/AlertsPage.jsx:8` — full render every time, no search/filter/pagination.
- `suite.jsx:355,401-409` — pipeline "Filters" state doesn't reset when switching jobs; filters silently carry over.
- `primitives.jsx:441-481` — RichText relies on deprecated `execCommand`, no image support, no HTML source view.

### 3. Missing vs. a real ATS/staffing product
- `constants.js:31-33` — plans advertise "5 recruiter seats" but only one login per employer exists; no teammate invites, no per-user roles/audit trail.
- `constants.js:22,37` — pipeline stages are a single hardcoded 6-stage constant shared by every employer; no custom stages despite being a sold Growth+ feature.
- No candidate communication templates, canned responses, merge fields, or automation on stage change.
- `suite.jsx:557-575` — "Schedule interview" is free-text only: no calendar sync, no candidate self-serve booking, no availability/conflict checking, no panel interviews/scorecards.
- No structured hiring-team feedback/scorecards beyond a single auto-computed fit percentage.
- "Offer" is just a stage label — no offer-letter generation/e-signature, comp approval chain, or background/reference-check integration.
- `suite.jsx:394-409` — candidate search limited to min score/province/one skill keyword; no full-text/boolean search, tagging, or saved searches.
- `suite.jsx:411-438` — talent pool is a one-shot reverse-match list, no CRM-style relationship tracking.
- No requisition/approval workflow before a listing goes live.
- `constants.js:32-33` — API/webhooks and SSO/SAML sold on Enterprise pricing, zero implementation.
- `staffing.jsx` (whole file) — no submittal/interview pipeline, bench/skills-matching UI, VMS integration, or compliance-doc visibility.
- No EEO/diversity or compliance reporting; work-permit eligibility is a single free-text question.
- `suite.jsx:977-1023` — Analytics has no time-to-hire/time-in-stage, no source-of-hire breakdown, no trend-over-time.
- CSV export is per-job only; no company-wide export.
- `shared/SettingsPage.jsx:25-30` — employer accounts get identical seeker notification toggles, nothing employer-relevant like "new applicant."

### 4. Already built but could be much better
- `shared/formControls.jsx:162-181` — AI job-description auto-fill is 4 hardcoded templates per category, easily spotted as boilerplate.
- `useStore.js:113-123` — candidate scoring is one fixed deterministic formula with no per-job configurability or breakdown shown to the employer.
- `suite.jsx:977-1023` — Analytics is only 4 stats + a funnel + one "top job" card.
- `suite.jsx:452-482` — Kanban is drag-free (buttons only), fixed-width columns get cramped with 6 stages.
- Empty states throughout are largely generic/repeated ("Post a job").
- `useStore.js:797` — "PDF" invoice download is really a 3-line `.txt` file (see Systemic #9).
- `primitives.jsx:441-481` — RichText is thin: no images/tables/source view.
- `suite.jsx:580-634` — Content Manager has no scheduling, revision history, or per-article analytics.
- `staffing.jsx:57-112` — client dashboard KPIs are solid tiles but no drill-down (except timesheets) and no date-range picker.
- `useStore.js:435-443` — reverse-match talent pool capped at top-10/score≥65, no adjustable threshold, no pagination.
- `shared/AlertsPage.jsx:6-26` — flat reverse-chronological list, no grouping of repeated similar alerts.
- `suite.jsx:859-897` — company profile has no logo image upload, no live preview link to the public employer page.

---

## HR Suite

*Scope: `src/pages/hr/suite.jsx`, `src/pages/hr/people.jsx`, `src/store/useHrStore.js`*

### 1. Looks functional but isn't
- `useHrStore.js:216-241` (`runPayroll`) — gross is just annual salary/26; never reads punch-clock hours, so payroll and attendance are entirely disconnected.
- `suite.jsx:1204,1277` vs `useHrStore.js:225-228` — claims "CPP/EI/tax calculated per CRA rates" but uses flat percentages with no brackets/credits/YTD caps (see Systemic #3).
- `suite.jsx:1574-1582` vs `808-929` — chat settings toggles are saved but never read anywhere in HrChat/_HrNewChat.
- `suite.jsx:1550-1559` vs `useHrStore.js:115-133` — attendance settings (hours, late threshold) are stored but punch in/out never consults them.
- `suite.jsx:857-858` — voice/video call buttons just `alert()` "connecting…" (see Systemic #2).
- `suite.jsx:1171` — invoice "Download PDF" just `alert()`s that it "would happen server-side."
- `suite.jsx:1710-1714`, `useHrStore.js:296-301` — "Import from existing HR system" only flips `connected:true` and fakes an email alert; nothing is actually imported.
- `suite.jsx:1693-1697`, `useHrStore.js:289-295` — "Connect a punch machine" only sets `connected:true`; no attendance data ever syncs.
- `suite.jsx:154` (HrDashboard) — "Leave balance" hardcodes 15 vacation days instead of reading `settings.leave.annualVacationDays` (used correctly on the Leave page itself), so the two pages can disagree.
- `suite.jsx:263-332,931-997` — HrDirectory/HrPeople components are fully built dead code; routing goes to `people.jsx` instead.
- `DashShell.jsx:70` — promises "Performance reviews and 1-on-1s" as a bundled feature; no such module exists.
- `HrShell.jsx:24-26` — module-visibility toggle only filters the sidebar; a "disabled" module is still fully functional if reached directly.
- `suite.jsx:1607` — Settings promises certifications sync to public profile; no certifications field/module exists anywhere.

### 2. Works but poorly
- `people.jsx:110-133` (org-chart Node) — no cycle detection; a manager loop will infinite-recurse and crash the tab.
- `people.jsx:323-326,349-352` — "Reports to" picker only excludes the employee themself, not their subordinates — indirect circular chains possible.
- `suite.jsx:963`, `people.jsx:344` — any owner/admin can change anyone's role via a plain dropdown, no confirmation.
- `useHrStore.js:110-112` + `people.jsx:104` — offboarding leaves manager references dangling; reports silently become orphaned top-level nodes.
- `suite.jsx:1240,1295` — payroll runs and paid invoices have no undo/reversal, only a `confirm()` gate (see Systemic #2).
- `suite.jsx:1406` — badge removal is instant/permanent via `confirm()`; no audit trail of who awarded/removed it.
- `suite.jsx:987`, `people.jsx:328,354` — salary inputs use `Number(v)||0`, silently coercing invalid entries to $0.
- `suite.jsx:591-593,642` — leave request never checks `advanceNoticeDays` policy.
- `suite.jsx:592` — leave days = naive calendar-day difference, no weekend/holiday exclusion.
- `useHrStore.js:124-133` (`punchOut`) — no day-rollover handling, produces garbage/negative hours for overnight shifts.
- `suite.jsx:1077-1082` — invoice line items allow negative qty/unit price.
- `suite.jsx:598-605` — "Sick/Personal days" cards show the flat policy number, not actual used/remaining, inconsistent with the correctly-computed vacation card.
- `people.jsx:169-173,207` — "Remove department" only renders when member count is 0, making its own caveat text permanently unreachable.
- `suite.jsx:1619-1620` — garbled settings copy ("When Marketing your Job Platform hires someone…").
- `suite.jsx:696-699` — kanban move/delete are icon-only glyphs with no aria-labels, no drag-and-drop.
- `suite.jsx:817-823` — chat channel membership by department string match; changing an employee's department silently drops them from their old channel.
- `people.jsx:443,531` — expense rejection reason via `window.prompt()` (see Systemic #2).

### 3. Missing vs. a real global HR platform
- No performance-review cycles, goals/OKRs, or 1:1 tracking, despite being advertised.
- No benefits administration (health/dental/RRSP/pension/deductions).
- No T4/T4A or year-end tax slip generation, no CRA remittance tracking, no CPP/EI annual max enforcement.
- No e-signature/acknowledgement flow for offer letters, handbook, or policy sign-off.
- No org-wide/global search — only per-module.
- No email/push notification delivery for leave/task/payroll/badge events — everything silent within the session.
- No document management (contracts, ID/SIN, direct-deposit forms) attached to employee records.
- No time-off accrual engine — vacation is a flat annual number, no accrual per pay period, no carryover/cap.
- No shift scheduling/roster planning — only after-the-fact attendance logging.
- No multi-country/multi-currency payroll.
- No overtime, statutory-holiday pay, or shift-differential handling.
- No audit log for sensitive actions (see Systemic #10).
- `useHrStore.js:307` references a "payslips" module for employees but no payslip UI exists.
- No structured offboarding checklist — a single status flip.
- No configurable approval chains — any hr/admin/owner can approve any employee's leave/expense.
- No data export (CSV/PDF) for directory, reports, or payroll registers.
- No certifications/compliance tracking despite Settings referencing it.
- No native punch-clock/kiosk mode — web-only despite claiming biometric/RFID hardware support.

### 4. Already built but could be much better
- `useHrStore.js:222-231` — flat tax model for every employee regardless of province/bracket/credits (see Systemic #3).
- `people.jsx:66,187` — employee/department grids have no pagination (see Systemic #1).
- `suite.jsx:1472-1521` — Reports is 4 KPI cards + two static bars; no trends, turnover/attrition, cost-per-hire, or date-range filtering.
- `suite.jsx:1540` — module-visibility labels use raw camelCase with CSS `capitalize`.
- `suite.jsx:829-886` — chat has no read receipts, typing indicators, or unread-count badges.
- `suite.jsx:1380-1411` — badge wall has no filtering/sorting or per-employee award timeline.
- `suite.jsx:1014,1093` — HST hardcoded at 13% regardless of jurisdiction.
- `people.jsx:110-149` — org chart has no collapse-all/expand-all, zoom, or search for large orgs.
- `suite.jsx:673-704` — kanban tasks have no overdue indicator, comments, attachments, or assignee filter.
- `suite.jsx:559` — attendance log hard-caps at 50 rows with no date-range filter or export.
- `suite.jsx:1250-1273` — all-employee salaries table has no sort/filter/search despite being sensitive data.
- `people.jsx:369-378` — expense categories are a fixed hardcoded list, no company customization or GL-code mapping.

---

## Job-Seeker Experience

*Scope: `src/pages/seeker/*`, `src/pages/shared/JobDetailPage.jsx`, `ProfilePage.jsx`, `cards.jsx`*

### 1. Looks functional but isn't
- `apply.jsx:39-85,103` — CV picker modal lets the applicant choose a different CV, but `submitApply()` and the review row always read `A.defaultCv` instead — the picker's selection is never used.
- `SearchPage.jsx:95-96` — "Save this search" drops the type/work-setting/experience/min-pay filters the user just set; only `q, where, f.cats` are saved.
- `shared/JobDetailPage.jsx:94,139` — "Share" calls `A.share(job)`, which only writes an activity-log entry (see Systemic, same root as marketing finding).
- `worker.jsx:272` — "Upload a document" is an `alert("coming soon…")` stub on a page that otherwise presents as real file management.
- `apply.jsx:12,35,136,157` — `ApplyShell`'s `nextDisabled` prop is defined but never passed from Apply1/2/3, so "required" fields never actually block progression.
- `SavedSearchesPage.jsx:12-19` — `countFor()` reimplements match logic with different rules than SearchPage's real filter, so the "N matches" count can disagree with actual search results.
- `cv.jsx:104,144` — "Download PDF" just opens the browser print dialog; produces no actual PDF file.
- `useStore.js:571-573` — application records never store which CV was attached.

### 2. Works but poorly
- `useStore.js:562` + `apply.jsx:150-154` — `beginApply` pre-fills `meets:"Yes"` before the applicant ever sees the experience-requirement question.
- `SearchPage.jsx:43,46,88-114` — type/mode/experience/province/minPay filters live only in local state; opening a job and pressing Back clears all of them except query/where/category.
- `StatusPage.jsx:54` — "Withdraw" fires immediately with no confirmation, only a buried 7-day undo window.
- `cv.jsx:122,143` — "Back to CVs" while dirty gives no unsaved-changes warning.
- `worker.jsx:124-127,171` — timesheet overtime/gross-pay math has no sanity-range validation.
- `shared/JobDetailPage.jsx:45,88`, `useStore.js:113-122` — match score is one opaque number from a hardcoded weighting, only up to 4 short bullet reasons.
- `SearchPage.jsx:25` — sector filter counts are computed against all live jobs, not the user's other active filters.
- `cv.jsx:132-134` — "isPrimary" locks name/email editing on every CV except the first-created one, explained only by a small inline hint.
- `shared/ProfilePage.jsx:19,178-180` — dirty-state Save/Discard sits at the bottom of a long tabbed card with no persistent indicator of unsaved edits.
- `primitives.jsx:400-417` (Modal) — no Escape-to-close or focus trap (see Systemic #7).
- `primitives.jsx:346-349`, `SearchPage.jsx:16-20` (Switch/filter checkboxes) — no `role="switch"`/`aria-checked` (see Systemic #7).
- `shared/JobDetailPage.jsx:135-139` — once applied, no link back to view/edit the answers actually submitted.

### 3. Missing vs. a real global job platform
- `useStore.js:94,261,644`, `SavedSearchesPage.jsx:27-28` — saved-search alerts and stage-change notifications only populate an in-memory list; no real email/push is ever sent despite copy promising it.
- `StatusPage.jsx:32-57` — no timestamped stage-transition history, no employer feedback surfaced.
- `shared/JobDetailPage.jsx` — no employer rating/review display, no "report this listing," no related-jobs module.
- `cv.jsx` — no resume import/parsing (PDF/DOCX/LinkedIn); every field hand-typed.
- `SearchPage.jsx` — no typeahead/autocomplete, no radius/distance search, no map view, no persisted "recent searches."
- `apply.jsx:143-154` — no cover-letter upload, no employer-defined custom screening questions.
- No interview-scheduling UI despite "Interviews" existing as a menu destination.
- `SavedSearchesPage.jsx` — no alert-frequency control, no in-place edit of an existing search.
- `shared/ProfilePage.jsx` — no per-application visibility control over profile fields shown to an employer; no work-eligibility upload, no video intro.
- No ATS-match/keyword score against a specific job before applying.
- No application-deadline reminder tied to saved/applied jobs.
- Withdrawing gives no option to leave a reason; no rejection-reason field surfaced to the seeker.

### 4. Already built but could be much better
- `cv.jsx:8` (CV_TEMPLATES) — only 3 templates, thin vs. mainstream resume builders.
- `SearchPage.jsx:110-111`, `SavedPage.jsx:28-29`, `MatchedPage.jsx:20-33` — no pagination/infinite scroll (see Systemic #1).
- `AccountMenuPage.jsx:12-28` — 15-item account menu is one flat undifferentiated list.
- `MatchedPage.jsx:56` — "Add skills" CTA copy is generic and repeats verbatim.
- `StatusPage.jsx:22-26` — Stat tiles are static all-time counts with no trend/delta.
- `cv.jsx:94-97` — CV thumbnails are clever CSS-scaled renders but give no page-count indication.
- `shared/JobDetailPage.jsx:105-127` — Skills-gap/Salary-insight widgets are useful but buried; salary insight doesn't match the job's own pay unit.
- `shared/ProfilePage.jsx:28-39` — skill suggestions are a small hardcoded per-sector list with no search/autocomplete.
- `worker.jsx:227` — CPP/EI/tax hardcoded flat percentages (see Systemic #3).
- `SavedPage.jsx`/`SearchPage.jsx` — no list/grid toggle, no independent sort for saved jobs.
- `AccountMenuPage.jsx:44-47` — "Actively seeking work" toggle has only one line of explanation, no confirmation/undo.

---

## Staffing Agency Console

*Scope: `src/pages/staffing/suite.jsx`, `src/store/useStaffingStore.js`*

### 1. Looks functional but isn't
- `suite.jsx:797` — "Week starting" DatePicker in the invoice modal has `onChange={()=>{}}` — picking a date does nothing.
- `suite.jsx:801` — Generate-invoices button always calls `generateStaffingInvoices(_weekStart(1))`, ignoring the (dead) date picker.
- `useStaffingStore.js:246` — HST hardcoded to 13% (or 0 for "Healthcare") regardless of the client's real province, despite copy promising per-province tax.
- `useStaffingStore.js:220` — net pay is `gross*0.7481`, a flat magic multiplier, not a real deduction calc (see Systemic #3).
- `useStaffingStore.js:250-252` — invoice `po` field logic is inverted/broken, never surfaces an actual PO number.
- `useStaffingStore.js:250` — invoice numbers use `Math.random()` in a 900-value range with no uniqueness check — duplicates possible.
- `suite.jsx:678-687` — "Ready for next run" banner counts all approved timesheets ever, but payroll only sweeps a rolling 14-day window — older ones show as "ready" forever but are never paid.
- `suite.jsx:186` — "Chase supervisors" just navigates to Timesheets; no reminder/email/notification sent (see Systemic #2).
- `suite.jsx:654` — "Approve on client's behalf" lets any agency staffer unilaterally approve a client's timesheet — there is no real client-side approval step at all.
- `suite.jsx:653` — Return/reject always writes the identical canned reason string.
- `suite.jsx:809-853` (AgencyPlacements) — `acceptPlacement`/`clawbackPlacement` exist in the store but no button calls them; placements can never move past "in-progress," clawbacks can never be initiated.
- `suite.jsx:573-615` (AgencyAssignments) — `endAssignment` is never called from the UI; "Completed" tab is permanently empty, a released worker never returns to "available."
- `suite.jsx:856-897` (AgencyClients) — `upsertStaffingClient` is never called; no "add client/prospect" action despite the job-order form requiring an existing client.
- `suite.jsx:376-395` — no UI to create a timesheet draft for a placed worker; once assigned, nothing gets a worker's hours into the system.

### 2. Works but poorly
- `suite.jsx:416-417,473-474` — pay/bill rate inputs have no min/step guard, only a soft after-the-fact warning if bill rate < pay rate.
- `suite.jsx:703` — "Finalize" payrun fires immediately with no confirmation, though effectively irreversible.
- `suite.jsx:710-728` — "Run biweekly payroll" locks timesheets to "paid" with one click, no undo path.
- `suite.jsx:296-300` — bench-matching score only compares the first word of each must-have ticket — very fragile.
- `suite.jsx:932-935` — worker "status" (active/inactive) doesn't reconcile with "availability"; marking inactive while on-assignment doesn't affect the assignment.
- `suite.jsx:504-570` — placing a worker is only reachable via Job Orders → detail → Place modal; no direct "place" action from a bench row.
- `suite.jsx:1050-1082` (AgencyCompliance) — status cards are static/read-only, don't drill into the offending list.
- `suite.jsx:668-687` — no preview of which timesheets/workers a payroll run will sweep before clicking "Run."

### 3. Missing vs. a real staffing-agency back office
- No real T4/ROE generation — compliance page only prints static statutory reminder text.
- No WSIB claim workflow beyond a single status card.
- No client self-service portal for supervisors to approve their own timesheets/invoices.
- No background-check/reference-tracking fields — only a generic freeform documents list.
- `suite.jsx:967-979` — "Documents on file" is read-only, no upload/replace/expire-renew.
- `creditLimit`/`currentAR` shown but never enforced — no credit-hold blocking new job orders when over limit.
- No submittal/interview pipeline — a worker goes straight from "matched %" to "placed."
- No recruiter commission/payout tracking tied to a placement's fee.
- `vacBalance` accrues but there's no vacation-payout action anywhere.
- No mass timesheet import, EDI feed, or time-clock/GPS integration.
- Invoice generation claims to email clients but no notification is ever produced or logged.
- No audit/activity log for payroll finalization, invoice generation, MSA signing, rate changes (see Systemic #10).
- No multi-branch/office or per-recruiter desk assignment model.
- No rate-card history or bill-rate change log per client.
- No dispute/adjustment workflow for partially-disputed timesheet hours.
- `AgencyLoginPage` — no password reset, MFA, or session-timeout for a payroll-and-PII-bearing back office.

### 4. Already built but could be much better
- No pagination anywhere — Bench, Workers, Invoicing, Assignments (see Systemic #1).
- `suite.jsx:856-897` (AgencyClients) — no search/filter at all, unlike every other list page.
- `suite.jsx:231-236` — job-order search only matches title/location, not client name.
- `useStaffingStore.js:21-33` — `calcStaffingEconomics` always receives `benefitsPerHr=0` from every call site; the "benefits" burden component is fully wired but permanently dead.
- `useStaffingStore.js:23-26` — burden model uses a flat $1.00/hr admin fee and hardcoded 1.4x EI multiplier for every province/worker.
- `suite.jsx:1047-1101` — status differentiation relies on border color + small icon, no semantic status text/aria attributes.
- `suite.jsx:989-1045` — margin figures assume a flat 40hr week for every assignment.
- `suite.jsx:1050-1062` — license/WSIB "ok" cards are static hardcoded text, will silently go stale.
- `suite.jsx:288-300` — "Matched from bench" only shows top 6 by score with no way to see the rest.
- `suite.jsx:809-853` — guarantee countdown only surfaces at ≤30 days, no proactive sort of all placements by soonest-expiring.
- `suite.jsx:855-897` — AR-risk coloring is purely cosmetic, no sort-by-risk or follow-up action.

---

## Suggested next step

This document is the input for prioritization, not a to-do list to execute wholesale. Given the productionization sequencing already agreed ([[project_productionization_phase]]), the natural next move is: pick 2-3 systemic issues above (Switch/Card/Modal primitives accessibility, the toast/snackbar gap, and the RichText XSS gap are the highest-leverage/lowest-risk starting points) and fold their fixes into the "reusable component sets" phase, rather than working domain-by-domain through the raw list.
