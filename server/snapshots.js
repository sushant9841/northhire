// Priority-4 #4 - Daily-snapshot analytics. Captures a handful of platform/employer counters
// once per day into daily_snapshots so the analytics UI can show a real sparkline + week-over-
// week / month-over-month delta instead of only ever showing "right now".
//
// Metrics captured, one row per (date, metric, dimension):
//   applications    dimension = employer_id  - applications received that calendar day (UTC)
//   live_jobs       dimension = employer_id  - jobs currently 'live' that already existed by
//                                               that date (approximation: we don't keep a
//                                               status-history table, so a job that later closed
//                                               still counts as "live" on its past days - the
//                                               alternative, silently dropping it from history
//                                               entirely, would be a worse distortion)
//   hires           dimension = employer_id  - applications whose stage history shows a "Hired"
//                                               transition landing on that calendar day
//   employer_signups  dimension = 'platform' - new employer accounts created that day
//   seeker_signups    dimension = 'platform' - new seeker accounts created that day
import { db } from "./db.js";

const PLATFORM = "platform";

function upsert(dateStr, metric, dimension, value) {
  db.prepare(
    `INSERT INTO daily_snapshots (date, metric, dimension, value) VALUES (?, ?, ?, ?)
     ON CONFLICT(date, metric, dimension) DO UPDATE SET value = excluded.value`
  ).run(dateStr, metric, dimension, value);
}

/* UTC calendar date, `offsetDays` back from today (0 = today). Matches the format created_at
   columns are stored in (datetime('now'), UTC, "YYYY-MM-DD HH:MM:SS"), so SQLite's date()
   extracts the same calendar day these strings actually represent. */
export function utcDateString(offsetDays = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/* Computes and (re)writes every metric for one calendar date. Safe to call repeatedly for the
   same date (e.g. the nightly interval re-running for "today" as the day progresses) - each
   write is an upsert keyed on (date, metric, dimension). */
export function captureDailySnapshot(dateStr = utcDateString(0)) {
  // applications-per-day, per employer
  const appRows = db.prepare(
    `SELECT jobs.employer_id AS dim, COUNT(*) AS n FROM applications
     JOIN jobs ON jobs.id = applications.job_id
     WHERE date(applications.created_at) = ?
     GROUP BY jobs.employer_id`
  ).all(dateStr);
  appRows.forEach(r => upsert(dateStr, "applications", r.dim, r.n));

  // live-jobs, per employer (see module comment on the approximation)
  const liveRows = db.prepare(
    `SELECT employer_id AS dim, COUNT(*) AS n FROM jobs
     WHERE status = 'live' AND date(created_at) <= ?
     GROUP BY employer_id`
  ).all(dateStr);
  liveRows.forEach(r => upsert(dateStr, "live_jobs", r.dim, r.n));

  // hires, per employer - parsed from each Hired application's own history_json rather than a
  // dedicated hires table, since "when did this become Hired" only exists as a history entry.
  const hiredApps = db.prepare(
    `SELECT jobs.employer_id AS employerId, applications.history_json AS historyJson
     FROM applications JOIN jobs ON jobs.id = applications.job_id
     WHERE applications.stage = 'Hired'`
  ).all();
  const hiresByEmployer = {};
  for (const row of hiredApps) {
    let history = [];
    try { history = JSON.parse(row.historyJson || "[]"); } catch { /* malformed - skip */ }
    const hiredAt = history.find(h => h?.stage === "Hired")?.at;
    if (!hiredAt) continue;
    const hiredDate = String(hiredAt).replace(" ", "T").slice(0, 10);
    if (hiredDate !== dateStr) continue;
    hiresByEmployer[row.employerId] = (hiresByEmployer[row.employerId] || 0) + 1;
  }
  Object.entries(hiresByEmployer).forEach(([dim, n]) => upsert(dateStr, "hires", dim, n));

  // platform-wide signup counters
  const employerSignups = db.prepare(`SELECT COUNT(*) AS n FROM employers WHERE date(created_at) = ?`).get(dateStr).n;
  upsert(dateStr, "employer_signups", PLATFORM, employerSignups);
  const seekerSignups = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'seeker' AND date(created_at) = ?`).get(dateStr).n;
  upsert(dateStr, "seeker_signups", PLATFORM, seekerSignups);

  return dateStr;
}

/* Backfills the trailing `days` calendar days from existing created_at timestamps, run once at
   server start. Past days that already have at least one row are left alone (cheap restart), but
   "today" is always recomputed since it's still accumulating. */
export function backfillDailySnapshots(days = 30) {
  for (let i = days - 1; i >= 0; i--) {
    const dateStr = utcDateString(i);
    if (i > 0) {
      const exists = db.prepare("SELECT 1 FROM daily_snapshots WHERE date = ? LIMIT 1").get(dateStr);
      if (exists) continue;
    }
    captureDailySnapshot(dateStr);
  }
}

export const SNAPSHOT_METRICS = ["applications", "live_jobs", "hires", "employer_signups", "seeker_signups"];
