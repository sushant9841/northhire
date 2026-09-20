import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireAdminScope } from "../auth.js";
import { serializeApplication, serializeInterview } from "../serialize.js";
import { emit as liveEmit } from "../lib/liveBroker.js";
import { DEMOGRAPHIC_FIELDS, suppressedBucket } from "../lib/demographics.js";

/* Priority-5 admin CRUD sweep: applications, interviews and offers are all user-generated (a
   seeker applying, an employer scheduling/offering) - the admin surface for each is Read
   (platform-wide, unlike the employer/seeker-scoped GETs already in applications.js/
   seekerMisc.js/offers.js) plus one moderation verb, never a Create:
     - applications: soft-hide/unhide (mirrors jobs.flagged - a flag, not a delete)
     - interviews:   cancel (reuses the same 'cancelled' status the employer-side cancel sets)
     - offers:       revoke (reuses the same 'withdrawn' status the employer-side withdraw sets)
   Mounted at /api/admin alongside adminSnapshotsRouter. */
export const adminModerationRouter = Router();

function logAdminAction(req, action, text) {
  db.prepare("INSERT INTO activity_log (id, action, text, icon, actor) VALUES (?, ?, ?, 'shield', ?)")
    .run(nextId("l", "activity_log"), action, text, `${req.user.name} (${req.user.role})`);
}

/* ─── Applications ─── */
adminModerationRouter.get("/applications", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const rows = db.prepare("SELECT * FROM applications ORDER BY created_at DESC LIMIT 500").all();
  res.json({ applications: rows.map(serializeApplication) });
});
adminModerationRouter.patch("/applications/:id/moderate", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Application not found." });
  const { hidden, reason } = req.body || {};
  if (hidden) {
    if (!String(reason || "").trim()) return res.status(400).json({ error: "A reason is required to hide an application." });
    db.prepare("UPDATE applications SET admin_hidden_at = datetime('now'), admin_hidden_reason = ? WHERE id = ?").run(reason.trim(), req.params.id);
    logAdminAction(req, "admin.applicationHide", `Hid application ${req.params.id} — ${reason.trim()}`);
  } else {
    db.prepare("UPDATE applications SET admin_hidden_at = NULL, admin_hidden_reason = NULL WHERE id = ?").run(req.params.id);
    logAdminAction(req, "admin.applicationUnhide", `Unhid application ${req.params.id}`);
  }
  res.json({ application: serializeApplication(db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id)) });
});

/* ─── Interviews ─── */
adminModerationRouter.get("/interviews", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const rows = db.prepare("SELECT * FROM interviews ORDER BY created_at DESC LIMIT 500").all();
  res.json({ interviews: rows.map(serializeInterview) });
});
adminModerationRouter.patch("/interviews/:id/cancel", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const row = db.prepare("SELECT * FROM interviews WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Interview not found." });
  if (row.status === "cancelled") return res.status(409).json({ error: "Already cancelled." });
  db.prepare("UPDATE interviews SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  logAdminAction(req, "admin.interviewCancel", `Cancelled interview ${req.params.id}`);
  const iv = serializeInterview(db.prepare("SELECT * FROM interviews WHERE id = ?").get(req.params.id));
  res.json({ interview: iv });
  liveEmit(row.candidate_id, "interview:cancelled", iv);
  const teammates = db.prepare("SELECT id FROM users WHERE employer_id = ?").all(row.employer_id).map(r => r.id);
  for (const t of teammates) liveEmit(t, "interview:cancelled", iv);
});

/* ─── Offers ─── */
function serializeAdminOffer(row) {
  return {
    id: row.id, applicationId: row.application_id, employerId: row.employer_id,
    status: row.status, position: row.position, compensation: row.compensation,
    startDate: row.start_date, expiresAt: row.expires_at, createdAt: sqlTime(row.created_at).getTime(),
  };
}
adminModerationRouter.get("/offers", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const rows = db.prepare("SELECT * FROM offer_letters ORDER BY created_at DESC LIMIT 500").all();
  res.json({ offers: rows.map(serializeAdminOffer) });
});
adminModerationRouter.patch("/offers/:id/revoke", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const row = db.prepare("SELECT * FROM offer_letters WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Offer not found." });
  if (row.status === "accepted") return res.status(409).json({ error: "That offer was already accepted — revoking it now is a conversation to have directly, not a button." });
  if (row.status === "withdrawn") return res.status(409).json({ error: "Already revoked." });
  db.prepare("UPDATE offer_letters SET status = 'withdrawn' WHERE id = ?").run(req.params.id);
  logAdminAction(req, "admin.offerRevoke", `Revoked offer ${req.params.id}`);
  res.json({ offer: serializeAdminOffer(db.prepare("SELECT * FROM offer_letters WHERE id = ?").get(req.params.id)) });
});

/* ─── Demographics (platform-wide aggregate) ───────────────────────────────────────────────────
   Read-only by design (this is an aggregation, not a record an admin edits or deletes) - the
   per-employer version already lives at GET /employers/me/demographics-aggregate; this is the
   same suppression-floor logic applied across every applicant/hire on the platform instead of one
   employer's own pool, for the platform admin's own D&I visibility. Every bucket under
   SUPPRESSION_FLOOR (10) is still replaced with a flag rather than a raw count. */
adminModerationRouter.get("/demographics-aggregate", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const applicantIds = db.prepare("SELECT DISTINCT user_id AS id FROM applications").all().map(r => r.id);
  const hireIds = db.prepare("SELECT DISTINCT user_id AS id FROM applications WHERE stage = 'Hired'").all().map(r => r.id);
  const bucketsFor = (ids, field) => {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = db.prepare(
      `SELECT value, COUNT(*) AS n FROM user_demographics WHERE field = ? AND user_id IN (${placeholders}) GROUP BY value`
    ).all(field, ...ids);
    return rows.map(r => suppressedBucket(r.value, r.n));
  };
  const fields = {};
  for (const field of Object.keys(DEMOGRAPHIC_FIELDS)) {
    fields[field] = { applicants: bucketsFor(applicantIds, field), hires: bucketsFor(hireIds, field) };
  }
  const respondentCount = applicantIds.length
    ? db.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_demographics WHERE user_id IN (${applicantIds.map(() => "?").join(",")})`).get(...applicantIds).n
    : 0;
  res.json({ totalApplicants: applicantIds.length, totalHires: hireIds.length, respondentCount, fields });
});

/* ─── Workflow rules (per-employer, admin cross-org read + delete stale) ─── */
adminModerationRouter.get("/workflow-rules", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const rows = db.prepare(
    `SELECT wr.*, e.name AS employer_name FROM workflow_rules wr
     LEFT JOIN employers e ON e.id = wr.employer_id
     ORDER BY wr.updated_at DESC LIMIT 500`
  ).all();
  res.json({ rules: rows.map(r => ({ id: r.id, name: r.name, employerId: r.employer_id, employerName: r.employer_name, enabled: !!r.enabled, updatedAt: r.updated_at })) });
});
adminModerationRouter.delete("/workflow-rules/:id", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const row = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Rule not found." });
  db.prepare("DELETE FROM workflow_rules WHERE id = ?").run(req.params.id);
  logAdminAction(req, "admin.workflowRuleDelete", `Deleted workflow rule ${row.name} (employer ${row.employer_id})`);
  res.json({ ok: true });
});

/* ─── Benefits plans (per-employer, admin cross-org read + soft-archive via `active` flag) ─── */
adminModerationRouter.get("/benefits-plans", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const rows = db.prepare(
    `SELECT bp.*, e.name AS employer_name,
       (SELECT COUNT(*) FROM benefits_enrollments be WHERE be.plan_id = bp.id AND be.ended_at IS NULL) AS enrolled_count
     FROM benefits_plans bp
     LEFT JOIN employers e ON e.id = bp.employer_id
     ORDER BY bp.created_at DESC LIMIT 500`
  ).all();
  res.json({ plans: rows.map(r => ({ id: r.id, name: r.name, employerId: r.employer_id, employerName: r.employer_name, active: !!r.active, enrolledCount: r.enrolled_count, createdAt: r.created_at })) });
});
adminModerationRouter.patch("/benefits-plans/:id/archive", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const row = db.prepare("SELECT * FROM benefits_plans WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Plan not found." });
  const enrolled = db.prepare("SELECT COUNT(*) AS n FROM benefits_enrollments WHERE plan_id = ? AND ended_at IS NULL").get(req.params.id).n;
  if (enrolled > 0) return res.status(409).json({ error: `Plan still has ${enrolled} active enrollment(s). End enrollments first.` });
  db.prepare("UPDATE benefits_plans SET active = 0 WHERE id = ?").run(req.params.id);
  logAdminAction(req, "admin.benefitsPlanArchive", `Archived benefits plan ${row.name} (employer ${row.employer_id})`);
  res.json({ ok: true });
});

/* ─── Perf review cycles (per-company, admin cross-org read + delete stale) ─── */
adminModerationRouter.get("/perf-cycles", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const rows = db.prepare(
    `SELECT pc.*, e.name AS company_name,
       (SELECT COUNT(*) FROM perf_reviews pr WHERE pr.cycle_id = pc.id) AS review_count
     FROM perf_cycles pc
     LEFT JOIN employers e ON e.id = pc.company_id
     ORDER BY pc.period_end DESC LIMIT 500`
  ).all();
  res.json({ cycles: rows.map(r => ({ id: r.id, name: r.name, companyId: r.company_id, companyName: r.company_name, status: r.status, periodStart: r.period_start, periodEnd: r.period_end, reviewCount: r.review_count })) });
});
adminModerationRouter.delete("/perf-cycles/:id", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const row = db.prepare("SELECT * FROM perf_cycles WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Cycle not found." });
  /* Cascade the reviews explicitly (SQLite ON DELETE CASCADE wasn't declared on this pair). */
  db.prepare("DELETE FROM perf_reviews WHERE cycle_id = ?").run(req.params.id);
  db.prepare("DELETE FROM perf_cycles WHERE id = ?").run(req.params.id);
  logAdminAction(req, "admin.perfCycleDelete", `Deleted perf cycle ${row.name} (company ${row.company_id})`);
  res.json({ ok: true });
});
