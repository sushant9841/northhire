import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, "data", "northhire.sqlite");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
/* ═══════════════ CORE: accounts, employers, jobs, applications, sessions ═══════════════ */
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('seeker','employer','admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  employer_id TEXT REFERENCES employers(id),
  employer_role TEXT DEFAULT 'owner' CHECK(employer_role IN ('owner','member')),
  admin_scope TEXT DEFAULT 'full' CHECK(admin_scope IN ('full','support','moderator','finance','readonly')),
  seed INTEGER DEFAULT 0,
  title TEXT, cat TEXT, city TEXT, prov TEXT, years INTEGER, phone TEXT,
  skills_json TEXT DEFAULT '[]',
  edu TEXT, eligible TEXT, pay_min REAL, pay_unit TEXT,
  types_json TEXT DEFAULT '[]', modes_json TEXT DEFAULT '[]',
  complete INTEGER DEFAULT 0, summary TEXT,
  suspended INTEGER DEFAULT 0, suspension_reason TEXT, suspended_at TEXT,
  default_cv TEXT, start_when TEXT, joined TEXT,
  visibility_json TEXT DEFAULT '{}',
  /* CASL (Canada's Anti-Spam Legislation) consent record. A commercial electronic message - a
     job-alert digest, a marketing nudge - may only be sent with express or implied consent, and
     the sender carries the burden of proving it, so when and how consent was given is stored
     alongside the flag rather than just a boolean. Transactional mail (receipts, password
     resets, application-status updates) is not a CEM and does not consult this.
     unsubscribe_token backs the one-click unsubscribe link CASL requires on every CEM. */
  marketing_consent INTEGER DEFAULT 0,
  marketing_consent_at TEXT,
  marketing_consent_source TEXT,
  unsubscribe_token TEXT,
  /* Email verification. Accounts stay usable while unverified rather than being locked out -
     blocking someone from browsing jobs because a confirmation mail is slow helps nobody - but
     the state is real and surfaced, and actions where a wrong address genuinely costs something
     (a job alert going to a stranger, an employer messaging the wrong inbox) can consult it. */
  email_verified INTEGER DEFAULT 0,
  email_verify_token TEXT,
  email_verify_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Admin-editable business config (payroll tax brackets, plan limits, staffing burden rates,
   agency policy numbers) that used to be hardcoded JS constants baked into the bundle - moved
   here so a finance-scope admin can actually change them at runtime instead of needing a code
   deploy, and so the "source of truth" for money-relevant numbers is the backend, not a file
   shipped to every browser. Rows are seeded lazily on first read (see platformConfig.js) rather
   than in this schema, so the JS-side defaults stay the single place those numbers are authored. */
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS employer_invites (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  email TEXT NOT NULL,
  invited_by TEXT REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Automation rule: when a candidate lands on a stage, auto-send the linked template to them,
   with the template's merge fields substituted. One employer can have at most one rule per
   stage - a PRIMARY KEY on (employer_id, stage) keeps that invariant at the schema level so
   the UI can't accidentally register two rules that fire on the same event. */
CREATE TABLE IF NOT EXISTS stage_automations (
  employer_id TEXT NOT NULL REFERENCES employers(id),
  stage TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES message_templates(id),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (employer_id, stage)
);

CREATE TABLE IF NOT EXISTS employers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mark TEXT, a TEXT, b TEXT,
  industry TEXT, city TEXT, prov TEXT, size TEXT,
  rating REAL DEFAULT 0, verified INTEGER DEFAULT 0, hold INTEGER DEFAULT 0,
  about TEXT, founded INTEGER, site TEXT, plan TEXT DEFAULT 'Free',
  business_number TEXT, stripe_customer_id TEXT,
  /* Custom hiring pipeline stages, sold on Growth+ but previously not implemented at all -
     every company shared one hardcoded six-stage set. NULL means "use the platform default",
     which is what every existing company keeps until they deliberately change it. */
  pipeline_stages_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Real Stripe checkout receipts - one row per successfully paid plan purchase, replacing the
   previous UI that fabricated 4 fake monthly invoices client-side from nothing but the current
   plan's price. stripe_session_id is UNIQUE so verifying the same checkout session twice (e.g. a
   page refresh right after returning from Stripe) never double-records it. */
/* Enterprise API access, sold on the pricing page ("API access", "API + Zapier") with nothing
   behind it. A key is stored only as a hash - the full key is shown once at creation, exactly
   like the kiosk pairing token, so a leaked screen later can't hand someone working credentials.
   key_prefix is the visible fragment that lets someone identify which key to revoke. */
CREATE TABLE IF NOT EXISTS employer_api_keys (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, key_salt TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_by TEXT,
  last_used TEXT,
  revoked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Outbound webhooks so an employer's own systems (or Zapier) learn about events without polling.
   Each delivery is signed with the endpoint's own secret so the receiver can verify it really
   came from NorthHire and wasn't replayed. */
CREATE TABLE IF NOT EXISTS employer_webhooks (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events_json TEXT DEFAULT '[]',
  active INTEGER DEFAULT 1,
  last_status INTEGER, last_error TEXT, last_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Enterprise SSO over OIDC (see server/sso.js). One configuration per employer, keyed for lookup
   by the email domain their staff sign in with — that's the only thing known before someone has
   authenticated. SAML is deliberately not modelled; the copy says OIDC because that's what's real. */
CREATE TABLE IF NOT EXISTS employer_sso (
  employer_id TEXT PRIMARY KEY REFERENCES employers(id),
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  last_used TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_employer_sso_domain ON employer_sso(email_domain);

CREATE TABLE IF NOT EXISTS employer_invoices (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  plan TEXT NOT NULL,
  amount_pretax REAL NOT NULL, tax REAL NOT NULL, tax_label TEXT, total REAL NOT NULL,
  stripe_session_id TEXT UNIQUE, stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Per-employer audit trail for team-management actions - who invited/removed whom, when.
   The platform-wide activity_log serves admin-side events; this one is scoped to a single
   employer so its owner can see what happened on their own account without needing admin
   access. Kept intentionally narrow: invite created/revoked/accepted, member removed, and
   role/ownership changes; not a general "everything anyone did" log. */
CREATE TABLE IF NOT EXISTS employer_audit_log (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  actor_user_id TEXT REFERENCES users(id),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_employer_audit_log_emp ON employer_audit_log(employer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  title TEXT NOT NULL,
  cat TEXT, city TEXT, prov TEXT, type TEXT, mode TEXT,
  pay_lo REAL, pay_hi REAL, pay_unit TEXT,
  lat REAL, lng REAL,
  vacancies INTEGER DEFAULT 1,
  experience TEXT, education TEXT,
  deadline_date TEXT,
  views INTEGER DEFAULT 0,
  urgent INTEGER DEFAULT 0, featured INTEGER DEFAULT 0,
  skills_json TEXT DEFAULT '[]', perks_json TEXT DEFAULT '[]',
  description TEXT, duties_json TEXT DEFAULT '[]', requirements_json TEXT DEFAULT '[]', how_to_apply TEXT,
  screening_questions_json TEXT DEFAULT '[]',
  /* Ontario Bill 149 posting disclosures (in force 2026-01-01). ai_screening defaults to 1
     because this platform genuinely does auto-score every applicant against the posting - a
     posting that didn't disclose it would be the inaccurate state, not the safe one. */
  /* Per-job scoring weights, so an employer can say this role is mostly about tickets rather
     than years. NULL means the platform default weighting. */
  score_weights_json TEXT,
  ai_screening INTEGER DEFAULT 1,
  vacancy_confirmed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'live' CHECK(status IN ('live','paused','review','closed')),
  flagged INTEGER DEFAULT 0,
  hiring_type TEXT NOT NULL DEFAULT 'direct' CHECK(hiring_type IN ('direct','agency-contract','agency-perm')),
  pending_owner_approval INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_reports (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  reporter_id TEXT REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','dismissed','actioned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  stage TEXT NOT NULL DEFAULT 'Applied',
  note TEXT, availability TEXT, pay_expectation TEXT, cover_letter TEXT, cv_id TEXT, meets TEXT,
  /* An optional uploaded cover-letter file, alongside the typed cover_letter text - the seeker
     may do either or both. */
  cover_letter_upload_id TEXT REFERENCES uploads(id),
  /* Where this application came from, so source-of-hire analytics reads real attribution rather
     than being inferred. Set at apply time from how the seeker reached the posting.
     Deliberately NULL by default, not 'direct': an application recorded before attribution
     existed genuinely has an unknown source, and defaulting it to a real channel would overstate
     that channel permanently while looking like data. */
  source TEXT,
  screening_answers_json TEXT DEFAULT '[]',
  history_json TEXT DEFAULT '[]',
  previous_stage TEXT, withdrawn_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('main','hr','agency')),
  subject_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen TEXT
);
/* Existing installs may not yet carry last_seen - added defensively so agency/HR idle timeout
   works on already-migrated dbs without needing a hand-run ALTER. Safe no-op when the column
   already exists (SQLite raises a duplicate-column error which the migration block swallows). */

/* "Remember this device" for two-factor sign-in. A device that has already passed 2FA carries its
   own long-lived token so the person isn't re-challenged on their own laptop every time, while a
   sign-in from anywhere else still is. Deliberately separate from the session: signing out must
   not forget the device, and revoking the device must not depend on being signed in on it.
   Storing only a hash means a database read can't produce a token that skips someone's 2FA. */
CREATE TABLE IF NOT EXISTS trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  label TEXT,
  last_used TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);

/* ═══════════════ CONTENT: blogs, trainings ═══════════════ */
CREATE TABLE IF NOT EXISTS blogs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL, cat TEXT, scene TEXT, tone TEXT,
  mins INTEGER DEFAULT 5, author TEXT, author_seed INTEGER DEFAULT 0,
  excerpt TEXT, body_json TEXT DEFAULT '[]',
  owner_employer_id TEXT REFERENCES employers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
  scheduled_at TEXT,
  views INTEGER DEFAULT 0, featured INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trainings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL, cat TEXT, scene TEXT, tone TEXT,
  provider TEXT DEFAULT 'NorthHire Learning', provider_seed INTEGER DEFAULT 0,
  level TEXT, hours INTEGER DEFAULT 1, price REAL DEFAULT 0, rating REAL DEFAULT 0, enrolled INTEGER DEFAULT 0,
  mods_json TEXT DEFAULT '[]', outcomes_json TEXT DEFAULT '[]', about TEXT,
  owner_employer_id TEXT REFERENCES employers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
  scheduled_at TEXT,
  featured INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
/* Per-article view events. The old blogs.views counter was a raw increment with no way to look
   at trend, referrer, or reader vs. author. This is the raw event stream: one row per rendered
   view, with viewer identity when signed in and a rough referrer bucket. Aggregations happen in
   the read endpoint rather than at write time so the write path stays a single insert. */
CREATE TABLE IF NOT EXISTS content_views (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK(content_type IN ('blog','training')),
  content_id TEXT NOT NULL,
  viewer_user_id TEXT REFERENCES users(id),
  viewer_bucket TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_content_views_ctx ON content_views(content_type, content_id, created_at DESC);

/* Revision history for both content types - a snapshot of the full row taken right before every
   edit, so "what did this look like last week" is answerable and a bad edit can be restored. */
CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK(content_type IN ('blog','training')),
  content_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ═══════════════ SEEKER MISC: CVs, saved searches, messages, interviews, reviews, notifications ═══════════════ */
CREATE TABLE IF NOT EXISTS cvs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT, template TEXT DEFAULT 'classic',
  name0 TEXT, title TEXT, email TEXT, phone TEXT, city TEXT, prov TEXT,
  summary TEXT, skills_json TEXT DEFAULT '[]', certs_json TEXT DEFAULT '[]',
  exp_json TEXT DEFAULT '[]', edu_json TEXT DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT, q TEXT, where_text TEXT, cats_json TEXT DEFAULT '[]',
  types_json TEXT DEFAULT '[]', modes_json TEXT DEFAULT '[]', exps_json TEXT DEFAULT '[]',
  prov TEXT, min_pay TEXT, alerts INTEGER DEFAULT 1, frequency TEXT DEFAULT 'instant',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), last_run TEXT, last_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL, to_user_id TEXT NOT NULL, job_id TEXT REFERENCES jobs(id),
  text TEXT, read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  candidate_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES jobs(id), employer_id TEXT NOT NULL REFERENCES employers(id),
  when_text TEXT, mode TEXT, notes TEXT, status TEXT DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id), user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER, text TEXT, anon INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  for_value TEXT, /* null = everyone; a user id; or a role name like 'seeker' */
  icon TEXT, title TEXT, body TEXT, link TEXT, read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ═══════════════ ACCOUNT/PLATFORM MISC ═══════════════ */
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  match_alerts INTEGER DEFAULT 1, app_alerts INTEGER DEFAULT 1, marketing INTEGER DEFAULT 0,
  discoverable INTEGER DEFAULT 1, hide_employer INTEGER DEFAULT 0, reduced_motion INTEGER DEFAULT 0, lang TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  masked TEXT, brand TEXT, exp TEXT, name TEXT, is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS two_factor (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  enabled INTEGER DEFAULT 0, phone TEXT, backup_codes_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS reference_contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT, relation TEXT, email TEXT, phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id TEXT NOT NULL, job_id TEXT NOT NULL,
  PRIMARY KEY (user_id, job_id)
);
CREATE TABLE IF NOT EXISTS followed_employers (
  user_id TEXT NOT NULL, employer_id TEXT NOT NULL,
  PRIMARY KEY (user_id, employer_id)
);
CREATE TABLE IF NOT EXISTS training_enrolments (
  user_id TEXT NOT NULL, training_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0, paid INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, training_id)
);
CREATE TABLE IF NOT EXISTS invited_candidates (
  job_id TEXT NOT NULL, candidate_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (job_id, candidate_id)
);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, to_email TEXT, subject TEXT, body TEXT, preview_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reset_codes (
  email TEXT PRIMARY KEY, code TEXT, attempts INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS login_2fa_codes (
  email TEXT PRIMARY KEY, code TEXT, attempts INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT, email TEXT NOT NULL, topic TEXT, message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY, action TEXT, text TEXT, icon TEXT, actor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS failed_logins (
  id TEXT PRIMARY KEY, email TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'main', -- 'main' | 'hr' | 'agency' - each login surface is its own account space
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
/* Real ops-health signal for AdmHome - every 5xx response (thrown error or an explicit
   res.status(500+)) gets logged here by server/index.js's response-finish listener, so "error
   rate" is an actual measurement, not a placeholder. */
CREATE TABLE IF NOT EXISTS server_errors (
  id TEXT PRIMARY KEY, method TEXT NOT NULL, path TEXT NOT NULL, status INTEGER NOT NULL,
  message TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS platform_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  employer_blogs INTEGER DEFAULT 1, employer_trainings INTEGER DEFAULT 1, employer_feature INTEGER DEFAULT 1,
  auto_approve_jobs INTEGER DEFAULT 1, public_signup INTEGER DEFAULT 1, cv_builder INTEGER DEFAULT 1,
  matching INTEGER DEFAULT 1, enrolments INTEGER DEFAULT 1, pay_transparency INTEGER DEFAULT 1, maintenance INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS interview_scorecards (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidate_notes (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  candidate_id TEXT NOT NULL REFERENCES users(id),
  note TEXT NOT NULL DEFAULT '',
  tags_json TEXT DEFAULT '[]',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employer_id, candidate_id)
);

/* ═══════════════ HR SUITE ═══════════════ */
CREATE TABLE IF NOT EXISTS hr_employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  name TEXT NOT NULL, email TEXT NOT NULL,
  password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  dept TEXT, title TEXT, hired TEXT, seed INTEGER DEFAULT 0,
  phone TEXT, city TEXT, prov TEXT, salary REAL, birth_date TEXT,
  manager TEXT, skills_json TEXT DEFAULT '[]', badges_json TEXT DEFAULT '[]', certifications_json TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  terminated_at TEXT,
  td1_on_file INTEGER DEFAULT 1,
  benefits_per_pay REAL DEFAULT 0, benefits_plan TEXT,
  pay_type TEXT NOT NULL DEFAULT 'salary', hourly_rate REAL,
  /* Shared-terminal punch PIN, hashed with the same scrypt helper as passwords. A PIN is punch-
     only and can never sign anyone into the HR Suite - people key it in on a tablet in front of
     colleagues, so it must not be worth shoulder-surfing. */
  punch_pin_hash TEXT, punch_pin_salt TEXT,
  erased INTEGER DEFAULT 0, erased_at TEXT,
  visibility_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, email)
);

/* Real shift/roster scheduling - previously HR Suite only had after-the-fact attendance logging
   (punch in/out against no plan) with zero forward scheduling of who's supposed to work when. */
/* Manager 1:1s - private notes and action items between a manager and a direct report over
   time. Visible only to the two people on the record (manager and report) plus HR/owner - a
   colleague can't read another pair's 1:1 log. This is the lightweight complement to full
   performance reviews (still deferred as a separate module). */
CREATE TABLE IF NOT EXISTS hr_one_on_ones (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  manager_id TEXT NOT NULL REFERENCES hr_employees(id),
  report_id TEXT NOT NULL REFERENCES hr_employees(id),
  meeting_date TEXT NOT NULL,
  agenda TEXT,
  notes TEXT,
  action_items TEXT,
  created_by TEXT REFERENCES hr_employees(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hr_one_on_ones_pair ON hr_one_on_ones(company_id, manager_id, report_id, meeting_date DESC);

CREATE TABLE IF NOT EXISTS hr_shifts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  role TEXT, site TEXT, notes TEXT,
  created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Real e-signature, click-wrap style (typed full legal name + a required checkbox + timestamp +
   a hashed IP, never the raw IP) - the same acknowledgment pattern plenty of real lightweight HR
   systems use for handbook/policy sign-off, not a full DocuSign-style envelope-and-witness flow.
   requiredFor lets a document target specific employees or every active one at creation time. */
/* Comments on a task, so the discussion lives with the work rather than in a chat thread nobody
   can find later. Attachments deliberately reuse the shared uploads table rather than adding a
   parallel one. */
CREATE TABLE IF NOT EXISTS hr_task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES hr_tasks(id),
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hr_task_comments ON hr_task_comments(task_id);

/* Per-company expense categories with their GL code. Previously a hardcoded list, so a company
   whose chart of accounts didn't match had no way to record expenses correctly. NULL rows mean
   the company hasn't customised and gets the platform defaults. */
CREATE TABLE IF NOT EXISTS hr_expense_categories (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  name TEXT NOT NULL,
  gl_code TEXT,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hr_expense_cats ON hr_expense_categories(company_id);

CREATE TABLE IF NOT EXISTS hr_sign_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  title TEXT NOT NULL, body TEXT NOT NULL,
  required_for_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hr_signatures (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES hr_sign_documents(id),
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  signed_name TEXT NOT NULL, ip_hash TEXT,
  signed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(document_id, employee_id)
);

/* Offer letters a candidate can actually accept in-app, with a real record of it.
   The HR handbook module already had click-wrap signing, but only for people who are already
   employees with an HR Suite login. A candidate isn't one yet, so this carries its own
   unguessable token: the employer sends a link, the candidate reads the offer and signs by typing
   their legal name against a required acknowledgement. What makes it evidence rather than a
   button press is the record kept alongside it — what exact text they agreed to (snapshotted, so
   later edits to the template can't rewrite history), when, and a one-way hash of their IP. */
CREATE TABLE IF NOT EXISTS offer_letters (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  employer_id TEXT NOT NULL REFERENCES employers(id),
  token TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  position TEXT, compensation TEXT, start_date TEXT, reporting_to TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','accepted','declined','withdrawn')),
  signed_name TEXT, signed_at TEXT, ip_hash TEXT, decline_reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_offer_letters_app ON offer_letters(application_id);

/* Shared document storage (see server/uploads.js). owner_type/owner_id are deliberately loose so
   one table serves a seeker's cover letter, an employer's incorporation proof, a support-ticket
   attachment and a staffing worker's certificates — every caller does its own authorisation
   before reading or writing, since "who may see this" differs completely per kind. */
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  owner_type TEXT NOT NULL, owner_id TEXT NOT NULL,
  name TEXT NOT NULL, data_url TEXT NOT NULL, size INTEGER,
  uploaded_by TEXT, meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_uploads_owner ON uploads(kind, owner_type, owner_id);

CREATE TABLE IF NOT EXISTS hr_documents (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  name TEXT NOT NULL, data_url TEXT NOT NULL, size INTEGER, uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hr_attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  date TEXT NOT NULL, clock_in TEXT, clock_out TEXT, source TEXT DEFAULT 'web',
  hours REAL DEFAULT 0, site TEXT, late INTEGER DEFAULT 0
);

/* A physical shared terminal (a tablet by the site entrance) authorised to accept punches for one
   company. The device holds a token; an employee then only keys in a short PIN. Without this the
   "remote punch-in disabled - use the office time clock" setting had nothing behind it, and any
   browser could have posted a punch for anyone. Revoking a lost tablet is deleting its row. */
CREATE TABLE IF NOT EXISTS hr_kiosk_devices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  site TEXT,
  created_by TEXT,
  last_seen TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hr_leave (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  type TEXT, from_date TEXT, to_date TEXT, days REAL,
  status TEXT DEFAULT 'pending', reason TEXT, approved_by TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hr_tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  title TEXT, assignee TEXT, assigned_by TEXT, due TEXT,
  priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'todo',
  tags_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT
);

CREATE TABLE IF NOT EXISTS hr_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  title TEXT, event_date TEXT, time TEXT, duration INTEGER, type TEXT, location TEXT,
  invitees TEXT, organiser TEXT, description TEXT
);

CREATE TABLE IF NOT EXISTS hr_invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  number TEXT, client TEXT, amount REAL, subtotal REAL, hst REAL, tax_label TEXT, po TEXT,
  status TEXT DEFAULT 'draft', issued TEXT, due TEXT, paid TEXT, created_by TEXT,
  items_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS hr_departments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  name TEXT, lead TEXT, color TEXT, about TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hr_expenses (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  category TEXT, merchant TEXT, amount REAL, currency TEXT DEFAULT 'CAD',
  description TEXT, receipt_url TEXT, date TEXT,
  status TEXT DEFAULT 'submitted', submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_by TEXT, approved_at TEXT, paid_at TEXT, reject_reason TEXT, reimburse_via TEXT DEFAULT 'next-payroll'
);

CREATE TABLE IF NOT EXISTS hr_payruns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  period_start TEXT, period_end TEXT, run_date TEXT,
  status TEXT DEFAULT 'draft', employees INTEGER, total_gross REAL, total_net REAL, total_reimb REAL,
  lines_json TEXT DEFAULT '[]', approved_at TEXT, paid_at TEXT
);

CREATE TABLE IF NOT EXISTS hr_chats (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  kind TEXT DEFAULT 'group', name TEXT, members TEXT, about TEXT, created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hr_chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES hr_chats(id),
  from_employee TEXT, text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hr_chat_reads (
  chat_id TEXT NOT NULL REFERENCES hr_chats(id),
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, employee_id)
);
CREATE TABLE IF NOT EXISTS hr_company_settings (
  company_id TEXT PRIMARY KEY REFERENCES employers(id),
  settings_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS hr_audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES employers(id),
  actor_employee_id TEXT REFERENCES hr_employees(id),
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ═══════════════ STAFFING AGENCY ═══════════════ */
CREATE TABLE IF NOT EXISTS agency_staff (
  id TEXT PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE, name TEXT, role TEXT, title TEXT, seed INTEGER DEFAULT 0, email TEXT,
  branch_id TEXT REFERENCES staffing_branches(id),
  password_hash TEXT NOT NULL, password_salt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agency_reset_codes (
  email TEXT PRIMARY KEY, code TEXT, attempts INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staffing_workers (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'active', availability TEXT DEFAULT 'available',
  onboarded TEXT, province TEXT, city TEXT,
  pay_rate_floor REAL DEFAULT 0, pay_rate_target REAL DEFAULT 0,
  sin_last3 TEXT, td_on_file INTEGER DEFAULT 0, direct_deposit_on_file INTEGER DEFAULT 0,
  work_eligibility TEXT, we_expiry TEXT,
  emergency_contact_json TEXT DEFAULT '{}', documents_json TEXT DEFAULT '[]',
  tickets_json TEXT DEFAULT '[]', notes TEXT, vac_balance REAL DEFAULT 0,
  default_benefits_per_hr REAL DEFAULT 0,
  background_check_json TEXT DEFAULT '{"status":"not-started"}', references_json TEXT DEFAULT '[]'
);

/* Multi-branch/per-desk model - previously the whole book was one shared, undifferentiated desk
   with no way to say "this client/this recruiter belongs to the Calgary office." Branch ownership
   flows from the client (job orders/assignments/workers inherit it implicitly through their
   client, so nothing else needed a new column); staff are assigned to a branch directly. */
CREATE TABLE IF NOT EXISTS staffing_branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, city TEXT, province TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staffing_clients (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  branch_id TEXT REFERENCES staffing_branches(id),
  status TEXT DEFAULT 'prospect', signed_msa TEXT,
  bill_to_address TEXT, payment_terms_days INTEGER DEFAULT 30, po_required INTEGER DEFAULT 0,
  default_supervisor_email TEXT, conversion_fee_pct REAL DEFAULT 20,
  credit_limit REAL DEFAULT 50000, current_ar REAL DEFAULT 0,
  industry TEXT, markup REAL DEFAULT 35, notes TEXT
);

CREATE TABLE IF NOT EXISTS staffing_job_orders (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES staffing_clients(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT DEFAULT 'open', urgency TEXT DEFAULT 'medium',
  title TEXT, positions INTEGER DEFAULT 1, filled INTEGER DEFAULT 0,
  location TEXT, province TEXT, start_date TEXT, end_date TEXT, ongoing INTEGER DEFAULT 0,
  shift_pattern TEXT, overtime_available INTEGER DEFAULT 0,
  pay_rate REAL, bill_rate REAL,
  must_have_json TEXT DEFAULT '[]', nice_to_have_json TEXT DEFAULT '[]',
  supervisor TEXT, supervisor_email TEXT, supervisor_phone TEXT, ppe TEXT, notes TEXT
);

/* Real submittal/interview pipeline - previously a worker went straight from "matched %" to
   "placed" with zero stage tracking, unlike every real staffing agency's actual workflow
   (submit to client -> client review -> interview -> offer -> placed/rejected). */
CREATE TABLE IF NOT EXISTS staffing_submittals (
  id TEXT PRIMARY KEY,
  job_order_id TEXT NOT NULL REFERENCES staffing_job_orders(id),
  worker_id TEXT NOT NULL REFERENCES staffing_workers(id),
  stage TEXT NOT NULL DEFAULT 'submitted' CHECK(stage IN ('submitted','client_review','interview','offer','placed','rejected')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staffing_assignments (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES staffing_workers(id),
  client_id TEXT NOT NULL REFERENCES staffing_clients(id),
  job_order_id TEXT REFERENCES staffing_job_orders(id),
  status TEXT DEFAULT 'active', start_date TEXT, end_date TEXT, ongoing INTEGER DEFAULT 1,
  pay_rate REAL, bill_rate REAL, benefits_per_hr REAL DEFAULT 0,
  supervisor TEXT, supervisor_email TEXT, site TEXT, shift_pattern TEXT, notes TEXT
);

CREATE TABLE IF NOT EXISTS staffing_timesheets (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES staffing_assignments(id),
  worker_id TEXT NOT NULL REFERENCES staffing_workers(id),
  week_start TEXT, status TEXT DEFAULT 'draft',
  hours_json TEXT DEFAULT '{}', ot_hours REAL DEFAULT 0,
  submitted_at TEXT, approved_at TEXT, approved_by TEXT, notes TEXT
);

CREATE TABLE IF NOT EXISTS staffing_payruns (
  id TEXT PRIMARY KEY,
  period_start TEXT, period_end TEXT, run_date TEXT, status TEXT DEFAULT 'pending',
  workers INTEGER, total_hours REAL, total_gross REAL, total_net REAL, lines_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS staffing_invoices (
  id TEXT PRIMARY KEY,
  number TEXT, client_id TEXT NOT NULL REFERENCES staffing_clients(id),
  week_start TEXT, issued TEXT, due TEXT, status TEXT DEFAULT 'pending', paid_on TEXT,
  lines_json TEXT DEFAULT '[]', subtotal REAL, gst REAL DEFAULT 0, hst REAL, total REAL, po TEXT
);

CREATE TABLE IF NOT EXISTS staffing_wsib_claims (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES staffing_workers(id),
  assignment_id TEXT REFERENCES staffing_assignments(id),
  claim_number TEXT, filed_date TEXT, incident_date TEXT, description TEXT,
  status TEXT NOT NULL DEFAULT 'filed' CHECK(status IN ('filed','under-review','approved','denied','closed')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS staffing_audit_log (
  id TEXT PRIMARY KEY,
  actor_staff_id TEXT REFERENCES agency_staff(id),
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS staffing_placements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES staffing_clients(id),
  candidate_id TEXT REFERENCES staffing_workers(id),
  role TEXT, offered_at TEXT, start_date TEXT, status TEXT DEFAULT 'in-progress',
  salary REAL, fee_pct REAL DEFAULT 20, fee REAL,
  guarantee_ends TEXT, invoiced_on TEXT, paid_on TEXT,
  clawback_reason TEXT, replacement_due INTEGER DEFAULT 0, notes TEXT,
  recruiter_id TEXT REFERENCES agency_staff(id), commission REAL,
  commission_paid INTEGER DEFAULT 0, commission_paid_at TEXT
);
`);

/* Ad-hoc migrations - columns added in later revisions that need to land on already-created dbs
   without a full rebuild. Each ALTER wrapped so a "duplicate column name" on a fresh db (where
   the CREATE TABLE above already carries it) is not fatal. */
for (const stmt of [
  "ALTER TABLE sessions ADD COLUMN last_seen TEXT",
  "ALTER TABLE employer_api_keys ADD COLUMN calls_this_hour INTEGER DEFAULT 0",
  "ALTER TABLE employer_api_keys ADD COLUMN calls_hour_start TEXT",
  "ALTER TABLE employer_api_keys ADD COLUMN calls_total INTEGER DEFAULT 0",
  /* Employer referral: every company gets a stable code, and any new employer signup can
     record who referred them. Credit issuance is a follow-up (needs Stripe integration to
     actually apply a credit note) - this is the relationship + attribution half. */
  "ALTER TABLE employers ADD COLUMN referral_code TEXT",
  "ALTER TABLE employers ADD COLUMN referred_by_employer_id TEXT",
  // Cost-per-hire: an employer enters what they spent to source this posting (ad spend, agency
  // fee, referral bonus). Divided by hires produces a real per-hire cost the analytics page can
  // surface without inventing numbers.
  "ALTER TABLE jobs ADD COLUMN recruiting_cost REAL DEFAULT 0",
  // Multi-tier benefits: coverage tier alongside the existing per-pay amount.
  "ALTER TABLE hr_employees ADD COLUMN benefits_tier TEXT",
  // Bill 96 (Quebec French language law): each user's preferred UI/email language. Quebec-registered
  // employers default new accounts to fr-CA at signup (client patches this right after signup, once
  // the employer's province is known); every other account defaults to en-CA.
  "ALTER TABLE users ADD COLUMN locale TEXT DEFAULT 'en-CA'",
  // Bill 96 Content Manager: employer-authored articles/trainings can carry a French version
  // alongside the English original, edited from a language tab in the same editor. NULL means
  // "no French version yet" - the public blog/training pages fall back to the English fields.
  "ALTER TABLE blogs ADD COLUMN title_fr TEXT",
  "ALTER TABLE blogs ADD COLUMN excerpt_fr TEXT",
  "ALTER TABLE blogs ADD COLUMN body_json_fr TEXT",
  "ALTER TABLE trainings ADD COLUMN title_fr TEXT",
  "ALTER TABLE trainings ADD COLUMN about_fr TEXT",
  // Bill 96 P2: agency staff (the staffing console) are a separate account table from `users` and
  // need their own locale so password-reset and other transactional mail to them can be localized
  // the same way it is for regular users.
  "ALTER TABLE agency_staff ADD COLUMN locale TEXT DEFAULT 'en-CA'",
  // P4 deferred item #16 - annual pricing: every subscription-checkout invoice records which
  // billing cycle the customer chose so the receipt/portal shows year-vs-month correctly.
  "ALTER TABLE employer_invoices ADD COLUMN billing_cycle TEXT DEFAULT 'monthly'",
  // P4 deferred #15 - editable approval chains. First approver id is stamped on the row so a
  // dual-approval threshold (an amount above which two distinct approvers must agree) can enforce
  // that the second decision is by a different person. Legacy rows keep NULL and behave as
  // single-approval, unchanged.
  "ALTER TABLE hr_leave ADD COLUMN first_approved_by TEXT",
  "ALTER TABLE hr_expenses ADD COLUMN first_approved_by TEXT",
  // Multi-post distribution: which aggregator/board this listing should be surfaced on (JSON
  // array of channel keys like "indeed", "linkedin", "jobbank", "ziprecruiter"), and an optional
  // email address the employer wants every application also forwarded to. Actual outbound
  // posting to those aggregators requires per-aggregator OAuth partnerships and is deferred -
  // this column stores the intent and drives the on-publish "copy shareable link" affordance +
  // the /jobs/:id/distribute/:channel URL builder + the forward-email BCC on new applications.
  "ALTER TABLE jobs ADD COLUMN distribution_channels TEXT",
  "ALTER TABLE jobs ADD COLUMN forward_email TEXT",
  // Autofill from user history: every user-touched form field remembered so subsequent forms
  // can offer datalist suggestions ranked by use_count. Server-owned rather than client-owned
  // so a signed-in user gets their history across devices.
  `CREATE TABLE IF NOT EXISTS user_field_history (
     user_id TEXT NOT NULL, field TEXT NOT NULL, value TEXT NOT NULL,
     use_count INTEGER NOT NULL DEFAULT 1, last_used TEXT NOT NULL DEFAULT (datetime('now')),
     PRIMARY KEY (user_id, field, value)
   )`,
  // Employer Transformation E2: server-side job-creation drafts, replacing the sessionStorage-only
  // draft (which still stays wired as the pre-server fallback for network failures/offline edits).
  // One active draft per employer - the wizard is a single in-progress "next job" concept, not a
  // multi-draft library, so employer_id is UNIQUE and every save upserts the same row.
  `CREATE TABLE IF NOT EXISTS job_drafts (
     id TEXT PRIMARY KEY,
     employer_id TEXT NOT NULL UNIQUE REFERENCES employers(id),
     created_by TEXT,
     data_json TEXT NOT NULL,
     step INTEGER NOT NULL DEFAULT 1,
     updated_at TEXT NOT NULL DEFAULT (datetime('now')),
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  // Offer tracking (E4): distinguish "sent, not yet opened" from "candidate opened the link" so
  // the employer-side status list can show sent/viewed/accepted/declined/expired instead of
  // collapsing viewed into sent. Set once, the first time the token GET fires while status='sent'.
  "ALTER TABLE offer_letters ADD COLUMN viewed_at TEXT",
  // Post-checkout welcome screen (E6): one-shot per plan change. Stores the plan name the
  // employer has already seen the welcome tour for; the client compares it to the employer's
  // current plan rather than trusting a purely local flag, so it survives across devices/browsers
  // and a plan downgrade-then-upgrade correctly re-shows the tour.
  "ALTER TABLE employers ADD COLUMN welcome_seen_plan TEXT",
  // HR Suite Transformation H1 - Recruit -> Hire -> Employee handoff. `notes` carries a short
  // work-history/education summary copied from the candidate at hire time (the candidate object
  // has no structured work-history table of its own, so this is stored as free text rather than
  // invented structured rows). `sync_json` records whether this HR employee's NorthHire seeker
  // account (if any) has opted in to keep skills/education linked between the two profiles -
  // {seekerId, consent, linkedFields, offeredAt} - and is written once, at hire time, when the
  // candidate's email matches an existing seeker account.
  "ALTER TABLE hr_employees ADD COLUMN notes TEXT",
  "ALTER TABLE hr_employees ADD COLUMN sync_json TEXT DEFAULT '{}'",
  // A seeker's public NorthHire profile can carry badges published from their employer's HR
  // Suite (e.g. a training/recognition badge), once the seeker has explicitly consented to the
  // HR<->seeker profile sync above. Separate from hr_employees.badges_json, which is the
  // employer-internal badge record and is never itself shown to the public.
  "ALTER TABLE users ADD COLUMN badges_json TEXT DEFAULT '[]'",
  // HR Suite Tranche H4 - employee-profile timeline aggregator needs to filter the shared
  // company-wide audit log down to entries about ONE employee. Previously every audit row only
  // recorded who performed the action (actor_employee_id), not who it was about - fine for the
  // company-wide audit log page, useless for "show Daniel's history". Nullable and only populated
  // going forward; older rows simply won't appear on a profile timeline.
  "ALTER TABLE hr_audit_log ADD COLUMN target_employee_id TEXT",
  // HR Suite Tranche H6 - "invoice-to-staffing-placement link where applicable". HR Suite
  // invoices (hr_invoices) belong to an Enterprise company's own billing of ITS clients; the
  // staffing_placements table belongs to a separate business (a staffing agency's own workers
  // placed with ITS clients, keyed off staffing_clients) - there's no real foreign-key
  // relationship between the two in this schema, so this is a soft, free-text reference an
  // invoice-issuer can fill in themselves when a given invoice does correspond to a placement
  // they know about (e.g. a construction company invoicing for a role that a staffing agency
  // helped fill), rather than a fabricated cross-tenant join.
  "ALTER TABLE hr_invoices ADD COLUMN placement_ref TEXT",
  // Priority-4 #1 - Performance review cycles. A cycle is a company-wide review period (e.g.
  // "H2 2026 review"); each cycle spawns one or more perf_reviews rows, one per
  // (employee, reviewer, reviewer_role) triple - self/manager always created, peer optional and
  // added ad hoc. reviewer_role distinguishes the three so an employee's self-review and their
  // manager's review of them (same cycle, same employee_id) don't collide.
  `CREATE TABLE IF NOT EXISTS perf_cycles (
     id TEXT PRIMARY KEY,
     company_id TEXT NOT NULL REFERENCES employers(id),
     name TEXT NOT NULL,
     period_start TEXT NOT NULL,
     period_end TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'draft',
     created_by TEXT REFERENCES hr_employees(id),
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS perf_reviews (
     id TEXT PRIMARY KEY,
     cycle_id TEXT NOT NULL REFERENCES perf_cycles(id),
     employee_id TEXT NOT NULL REFERENCES hr_employees(id),
     reviewer_id TEXT NOT NULL REFERENCES hr_employees(id),
     reviewer_role TEXT NOT NULL DEFAULT 'manager',
     rating INTEGER,
     notes_json TEXT NOT NULL DEFAULT '{}',
     submitted_at TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  "CREATE INDEX IF NOT EXISTS idx_perf_reviews_cycle ON perf_reviews(cycle_id)",
  "CREATE INDEX IF NOT EXISTS idx_perf_reviews_employee ON perf_reviews(employee_id)",
  "CREATE INDEX IF NOT EXISTS idx_perf_reviews_reviewer ON perf_reviews(reviewer_id)",
  // Priority-4 #2 - Workflow rules engine. Generalises the old one-rule-per-stage
  // stage_automations into a real IF/THEN rule builder: a condition tree (AND/OR/NOT groups
  // over application fields) and an ordered list of actions, evaluated on application create and
  // every stage change. stage_automations keeps firing unchanged alongside this - both paths run,
  // so nobody's existing per-stage template binding silently stops working the day this ships.
  `CREATE TABLE IF NOT EXISTS workflow_rules (
     id TEXT PRIMARY KEY,
     employer_id TEXT NOT NULL REFERENCES employers(id),
     name TEXT NOT NULL,
     conditions_json TEXT NOT NULL DEFAULT '{"type":"group","op":"and","children":[]}',
     actions_json TEXT NOT NULL DEFAULT '[]',
     enabled INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  "CREATE INDEX IF NOT EXISTS idx_workflow_rules_employer ON workflow_rules(employer_id)",
  // Free-form tags an employer's own automations (or a person) can attach to an application - the
  // rule engine's "add tag" action and "tags" condition field both read/write this. Independent
  // of hr_tasks.tags_json / candidate_notes.tags_json, which are different entities entirely.
  "ALTER TABLE applications ADD COLUMN tags_json TEXT DEFAULT '[]'",
  // Workflow rules engine "create task" action - a lightweight follow-up item tied to one
  // application and (optionally) assigned to a specific teammate, distinct from hr_tasks (which
  // belongs to the separate HR Suite / hr_employees login space, not the employer console).
  `CREATE TABLE IF NOT EXISTS workflow_tasks (
     id TEXT PRIMARY KEY,
     employer_id TEXT NOT NULL REFERENCES employers(id),
     application_id TEXT NOT NULL REFERENCES applications(id),
     rule_id TEXT REFERENCES workflow_rules(id),
     title TEXT NOT NULL,
     assignee_user_id TEXT REFERENCES users(id),
     status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  "CREATE INDEX IF NOT EXISTS idx_workflow_tasks_employer ON workflow_tasks(employer_id)",
  // Priority-4 #3 - D&I voluntary self-ID collection. One row per (user, field) so a seeker can
  // fill in some fields and skip others, and can update a single field later without resending
  // the whole form. Values are free-text banded strings (e.g. "30-39", "prefer-not-to-say") that
  // the client renders from a fixed option list - never free-typed - so aggregate reporting can
  // group on exact string equality.
  `CREATE TABLE IF NOT EXISTS user_demographics (
     user_id TEXT NOT NULL REFERENCES users(id),
     field TEXT NOT NULL,
     value TEXT NOT NULL,
     recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
     PRIMARY KEY (user_id, field)
   )`,
]) {
  try { db.exec(stmt); } catch (e) { if (!/duplicate column/i.test(e.message)) console.error("migration:", stmt, e.message); }
}

export function nextId(prefix, table) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get();
  return `${prefix}${Number(row.n) + 1}_${Date.now().toString(36)}`;
}

/* SQLite's datetime('now') (and CURRENT_TIMESTAMP) return "YYYY-MM-DD HH:MM:SS" in UTC with no
   timezone marker. JS's Date constructor treats a string in that shape as LOCAL time, not UTC -
   on any server whose local time isn't UTC, every `new Date(row.created_at)` silently drifts by
   the server's UTC offset, breaking real elapsed-time math (expiry windows, cooldowns, "N days
   ago") even though it looks fine on a UTC machine. Every place that parses a datetime()-sourced
   column for arithmetic or display should go through this instead of a bare `new Date(...)`.
   (A plain `date('now')` column like "2026-09-04" has no time part and isn't affected - ISO
   date-only strings are already parsed as UTC per spec.) */
export function sqlTime(s) {
  if (!s) return null;
  if (!/[ T]\d{2}:\d{2}/.test(s)) return new Date(s); // date-only ("2026-09-18") - already correctly UTC per spec, untouched
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s); // already has an explicit offset (e.g. JS toISOString())
  return new Date(s.replace(" ", "T") + "Z");
}
