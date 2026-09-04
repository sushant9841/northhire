import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, "data", "northhire.sqlite");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('seeker','employer','admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  employer_id TEXT REFERENCES employers(id),
  seed INTEGER DEFAULT 0,
  title TEXT, city TEXT, prov TEXT, years INTEGER, phone TEXT,
  skills_json TEXT DEFAULT '[]',
  edu TEXT, eligible TEXT, pay_min REAL, pay_unit TEXT,
  types_json TEXT DEFAULT '[]', modes_json TEXT DEFAULT '[]',
  complete INTEGER DEFAULT 0,
  suspended INTEGER DEFAULT 0, suspension_reason TEXT, suspended_at TEXT,
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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  stage TEXT NOT NULL DEFAULT 'Applied',
  note TEXT, availability TEXT, pay_expectation TEXT, cover_letter TEXT,
  history_json TEXT DEFAULT '[]',
  previous_stage TEXT, withdrawn_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
`);

export function nextId(prefix, table) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get();
  return `${prefix}${Number(row.n) + 1}_${Date.now().toString(36)}`;
}
