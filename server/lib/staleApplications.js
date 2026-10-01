/* Auto-decline applications stuck at the earliest stages past a cutoff.
   Roadmap B1-07: an application sitting at "Applied"/"Reviewed" for 90 days without
   movement is a broken promise to the seeker — surface it as closed with an honest
   "No response after 90 days" reason so the seeker can move on and employer funnels
   reflect reality instead of silently inflating "Applied" counts.

   Scope guards:
   - Only touches rows at stage="Applied" or stage="Reviewed" — anything that reached
     Shortlisted/Interview/Offer/Hired was engaged with and shouldn't be auto-closed.
   - Only touches rows older than STALE_DAYS whose last history entry (if any) is
     ALSO older than STALE_DAYS, so an employer who moved them back to Applied
     recently gets another full window.
   - Skips rows already withdrawn or rejected.
   - Writes a real history entry so the audit trail shows this was the auto-sweep,
     not an employer action. */

import { db } from "../db.js";

const STALE_DAYS = 90;
const STALE_STAGES = ["Applied", "Reviewed"];

export function sweepStaleApplications() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86400 * 1000).toISOString();
  const placeholders = STALE_STAGES.map(() => "?").join(",");
  const candidates = db.prepare(
    `SELECT id, stage, note, history_json, created_at
     FROM applications
     WHERE stage IN (${placeholders})
       AND created_at < ?
       AND (previous_stage IS NULL OR previous_stage NOT IN ('Rejected', 'Withdrawn'))`
  ).all(...STALE_STAGES, cutoff);

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const cutoffMs = nowMs - STALE_DAYS * 86400 * 1000;
  let swept = 0;

  const update = db.prepare(
    "UPDATE applications SET previous_stage = stage, stage = 'Rejected', note = ?, history_json = ? WHERE id = ?"
  );

  for (const row of candidates) {
    // Second guard: last history entry (if any) must also be older than the cutoff.
    // An employer moving the row back to "Applied" writes a history entry, giving
    // the seeker a fresh 90-day window.
    let history;
    try { history = JSON.parse(row.history_json || "[]"); }
    catch { history = []; }
    const lastEntryAt = history.length ? Date.parse(history[history.length - 1].at || "") : NaN;
    if (Number.isFinite(lastEntryAt) && lastEntryAt > cutoffMs) continue;

    const note = "No response after 90 days — auto-closed by the system so you can move on.";
    history.push({ stage: "Rejected", note, at: nowIso, actor: "system.staleSweep" });
    update.run(note, JSON.stringify(history), row.id);
    swept += 1;
  }

  if (swept > 0) {
    try { console.log(`[staleApplications] auto-closed ${swept} application(s) past ${STALE_DAYS} days.`); }
    catch { /* console unavailable in some runtimes */ }
  }
  return swept;
}
