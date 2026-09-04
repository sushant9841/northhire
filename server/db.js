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
  seed INTEGER DEFAULT 0,
  title TEXT, cat TEXT, city TEXT, prov TEXT, years INTEGER, phone TEXT,
  skills_json TEXT DEFAULT '[]',
  edu TEXT, eligible TEXT, pay_min REAL, pay_unit TEXT,
  types_json TEXT DEFAULT '[]', modes_json TEXT DEFAULT '[]',
  complete INTEGER DEFAULT 0, summary TEXT,
  suspended INTEGER DEFAULT 0, suspension_reason TEXT, suspended_at TEXT,
  default_cv TEXT, start_when TEXT, joined TEXT,
  visibility_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mark TEXT, a TEXT, b TEXT,
  industry TEXT, city TEXT, prov TEXT, size TEXT,
  rating REAL DEFAULT 0, verified INTEGER DEFAULT 0, hold INTEGER DEFAULT 0,
  about TEXT, founded INTEGER, site TEXT, plan TEXT DEFAULT 'Free',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  title TEXT NOT NULL,
  cat TEXT, city TEXT, prov TEXT, type TEXT, mode TEXT,
  pay_lo REAL, pay_hi REAL, pay_unit TEXT,
  vacancies INTEGER DEFAULT 1,
  experience TEXT, education TEXT,
  deadline_date TEXT,
  views INTEGER DEFAULT 0,
  urgent INTEGER DEFAULT 0, featured INTEGER DEFAULT 0,
  skills_json TEXT DEFAULT '[]', perks_json TEXT DEFAULT '[]',
  description TEXT, duties_json TEXT DEFAULT '[]', requirements_json TEXT DEFAULT '[]', how_to_apply TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK(status IN ('live','paused','review','closed')),
  flagged INTEGER DEFAULT 0,
  hiring_type TEXT NOT NULL DEFAULT 'direct' CHECK(hiring_type IN ('direct','agency-contract','agency-perm')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  stage TEXT NOT NULL DEFAULT 'Applied',
  note TEXT, availability TEXT, pay_expectation TEXT, cover_letter TEXT, cv_id TEXT, meets TEXT,
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
  expires_at TEXT NOT NULL
);

/* ═══════════════ CONTENT: blogs, trainings ═══════════════ */
CREATE TABLE IF NOT EXISTS blogs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL, cat TEXT, scene TEXT, tone TEXT,
  mins INTEGER DEFAULT 5, author TEXT, author_seed INTEGER DEFAULT 0,
  excerpt TEXT, body_json TEXT DEFAULT '[]',
  owner_employer_id TEXT REFERENCES employers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
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
  featured INTEGER DEFAULT 0,
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
  prov TEXT, min_pay TEXT, alerts INTEGER DEFAULT 1,
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
  PRIMARY KEY (job_id, candidate_id)
);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, to_email TEXT, subject TEXT, body TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reset_codes (
  email TEXT PRIMARY KEY, code TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS login_2fa_codes (
  email TEXT PRIMARY KEY, code TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY, action TEXT, text TEXT, icon TEXT, actor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS platform_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  employer_blogs INTEGER DEFAULT 1, employer_trainings INTEGER DEFAULT 1, employer_feature INTEGER DEFAULT 1,
  auto_approve_jobs INTEGER DEFAULT 1, public_signup INTEGER DEFAULT 1, cv_builder INTEGER DEFAULT 1,
  matching INTEGER DEFAULT 1, enrolments INTEGER DEFAULT 1, pay_transparency INTEGER DEFAULT 1, maintenance INTEGER DEFAULT 0
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
  manager TEXT, skills_json TEXT DEFAULT '[]', badges_json TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  terminated_at TEXT,
  visibility_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, email)
);

CREATE TABLE IF NOT EXISTS hr_attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES hr_employees(id),
  date TEXT NOT NULL, clock_in TEXT, clock_out TEXT, source TEXT DEFAULT 'web',
  hours REAL DEFAULT 0, site TEXT, late INTEGER DEFAULT 0
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
  password_hash TEXT NOT NULL, password_salt TEXT NOT NULL
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
  tickets_json TEXT DEFAULT '[]', notes TEXT, vac_balance REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS staffing_clients (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id),
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

CREATE TABLE IF NOT EXISTS staffing_assignments (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES staffing_workers(id),
  client_id TEXT NOT NULL REFERENCES staffing_clients(id),
  job_order_id TEXT REFERENCES staffing_job_orders(id),
  status TEXT DEFAULT 'active', start_date TEXT, end_date TEXT, ongoing INTEGER DEFAULT 1,
  pay_rate REAL, bill_rate REAL, supervisor TEXT, supervisor_email TEXT, site TEXT, shift_pattern TEXT, notes TEXT
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
  clawback_reason TEXT, replacement_due INTEGER DEFAULT 0, notes TEXT
);
`);

export function nextId(prefix, table) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get();
  return `${prefix}${Number(row.n) + 1}_${Date.now().toString(36)}`;
}
