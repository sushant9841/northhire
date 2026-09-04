import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import {
  serializeCv, serializeSavedSearch, serializeMessage, serializeInterview, serializeReview,
  serializeNotification, serializeReference, serializePaymentMethod,
} from "../serialize.js";

export const seekerMiscRouter = Router();

/* ─── CVs ─── */
seekerMiscRouter.get("/cvs", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM cvs WHERE user_id = ? ORDER BY updated_at DESC").all(req.user.id);
  res.json({ cvs: rows.map(serializeCv) });
});
seekerMiscRouter.post("/cvs", requireAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("cv", "cvs");
  db.prepare(
    `INSERT INTO cvs (id, user_id, name, template, name0, title, email, phone, city, prov, summary, skills_json, certs_json, exp_json, edu_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, req.user.id, d.name, d.template || "classic", d.name0, d.title, d.email, d.phone, d.city, d.prov,
    d.summary || "", JSON.stringify(d.skills || []), JSON.stringify(d.certs || []), JSON.stringify(d.exp || []), JSON.stringify(d.edu || []));
  res.status(201).json({ cv: serializeCv(db.prepare("SELECT * FROM cvs WHERE id = ?").get(id)) });
});
seekerMiscRouter.patch("/cvs/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM cvs WHERE id = ?").get(req.params.id);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: "CV not found." });
  const d = req.body || {};
  const fields = { name: "name", template: "template", name0: "name0", title: "title", email: "email",
    phone: "phone", city: "city", prov: "prov", summary: "summary" };
  const setCols = ["updated_at = datetime('now')"]; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (d.skills !== undefined) { setCols.push("skills_json = ?"); params.push(JSON.stringify(d.skills)); }
  if (d.certs !== undefined) { setCols.push("certs_json = ?"); params.push(JSON.stringify(d.certs)); }
  if (d.exp !== undefined) { setCols.push("exp_json = ?"); params.push(JSON.stringify(d.exp)); }
  if (d.edu !== undefined) { setCols.push("edu_json = ?"); params.push(JSON.stringify(d.edu)); }
  db.prepare(`UPDATE cvs SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ cv: serializeCv(db.prepare("SELECT * FROM cvs WHERE id = ?").get(req.params.id)) });
});
seekerMiscRouter.post("/cvs/:id/duplicate", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM cvs WHERE id = ?").get(req.params.id);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: "CV not found." });
  const id = nextId("cv", "cvs");
  db.prepare(
    `INSERT INTO cvs (id, user_id, name, template, name0, title, email, phone, city, prov, summary, skills_json, certs_json, exp_json, edu_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, req.user.id, `${row.name} (copy)`, row.template, row.name0, row.title, row.email, row.phone, row.city, row.prov,
    row.summary, row.skills_json, row.certs_json, row.exp_json, row.edu_json);
  res.status(201).json({ cv: serializeCv(db.prepare("SELECT * FROM cvs WHERE id = ?").get(id)) });
});
seekerMiscRouter.delete("/cvs/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM cvs WHERE id = ?").get(req.params.id);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: "CV not found." });
  db.prepare("DELETE FROM cvs WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Saved searches ─── */
seekerMiscRouter.get("/saved-searches", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ savedSearches: rows.map(serializeSavedSearch) });
});
seekerMiscRouter.post("/saved-searches", requireAuth, requireRole("seeker"), (req, res) => {
  const d = req.body || {};
  const id = nextId("ss", "saved_searches");
  db.prepare(
    `INSERT INTO saved_searches (id, user_id, name, q, where_text, cats_json, types_json, modes_json, exps_json, prov, min_pay)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, req.user.id, d.name || "Untitled search", d.q || "", d.where || "", JSON.stringify(d.cats || []),
    JSON.stringify(d.types || []), JSON.stringify(d.modes || []), JSON.stringify(d.exps || []), d.prov || "", d.minPay || "");
  res.status(201).json({ savedSearch: serializeSavedSearch(db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(id)) });
});
seekerMiscRouter.patch("/saved-searches/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(req.params.id);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: "Not found." });
  if (req.body?.alerts !== undefined) db.prepare("UPDATE saved_searches SET alerts = ? WHERE id = ?").run(req.body.alerts ? 1 : 0, req.params.id);
  res.json({ savedSearch: serializeSavedSearch(db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(req.params.id)) });
});
seekerMiscRouter.delete("/saved-searches/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(req.params.id);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM saved_searches WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Messages ─── */
seekerMiscRouter.get("/messages", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM messages WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC").all(req.user.id, req.user.id);
  res.json({ messages: rows.map(serializeMessage) });
});
seekerMiscRouter.post("/messages", requireAuth, (req, res) => {
  const { toUserId, jobId, text } = req.body || {};
  const id = nextId("m", "messages");
  db.prepare("INSERT INTO messages (id, from_user_id, to_user_id, job_id, text) VALUES (?, ?, ?, ?, ?)").run(id, req.user.id, toUserId, jobId || null, text);
  res.status(201).json({ message: serializeMessage(db.prepare("SELECT * FROM messages WHERE id = ?").get(id)) });
});
seekerMiscRouter.patch("/messages/:id/read", requireAuth, (req, res) => {
  db.prepare("UPDATE messages SET read = 1 WHERE id = ? AND to_user_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ─── Interviews ─── */
seekerMiscRouter.get("/interviews", requireAuth, (req, res) => {
  const rows = req.user.role === "employer"
    ? db.prepare("SELECT * FROM interviews WHERE employer_id = ? ORDER BY created_at DESC").all(req.user.employer_id)
    : db.prepare("SELECT * FROM interviews WHERE candidate_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ interviews: rows.map(serializeInterview) });
});
seekerMiscRouter.post("/interviews", requireAuth, requireRole("employer"), (req, res) => {
  const { applicationId, when, mode, notes } = req.body || {};
  const app = db.prepare("SELECT applications.*, jobs.employer_id FROM applications JOIN jobs ON jobs.id = applications.job_id WHERE applications.id = ?").get(applicationId);
  if (!app) return res.status(404).json({ error: "Application not found." });
  if (app.employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your candidate." });
  const id = nextId("iv", "interviews");
  db.prepare(
    `INSERT INTO interviews (id, application_id, candidate_id, job_id, employer_id, when_text, mode, notes, status)
     VALUES (?,?,?,?,?,?,?,?, 'scheduled')`
  ).run(id, applicationId, app.user_id, app.job_id, req.user.employer_id, when, mode, notes || "");
  const stageNote = `Interview ${mode === "video" ? "video call" : "in-person"} scheduled for ${when}`;
  db.prepare("UPDATE applications SET stage = 'Interview', note = ? WHERE id = ?").run(stageNote, applicationId);
  res.status(201).json({ interview: serializeInterview(db.prepare("SELECT * FROM interviews WHERE id = ?").get(id)) });
});
seekerMiscRouter.patch("/interviews/:id/cancel", requireAuth, requireRole("employer"), (req, res) => {
  const row = db.prepare("SELECT * FROM interviews WHERE id = ?").get(req.params.id);
  if (!row || row.employer_id !== req.user.employer_id) return res.status(404).json({ error: "Not found." });
  db.prepare("UPDATE interviews SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Reviews ─── */
seekerMiscRouter.get("/reviews/employer/:employerId", (req, res) => {
  const rows = db.prepare("SELECT * FROM reviews WHERE employer_id = ? ORDER BY created_at DESC").all(req.params.employerId);
  res.json({ reviews: rows.map(serializeReview) });
});
seekerMiscRouter.post("/reviews", requireAuth, (req, res) => {
  const { employerId, rating, text, anon } = req.body || {};
  const id = nextId("rv", "reviews");
  db.prepare("INSERT INTO reviews (id, employer_id, user_id, rating, text, anon) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, employerId, req.user.id, rating, text, anon ? 1 : 0);
  const avg = db.prepare("SELECT AVG(rating) AS avg FROM reviews WHERE employer_id = ?").get(employerId).avg;
  db.prepare("UPDATE employers SET rating = ? WHERE id = ?").run(Math.round(avg * 10) / 10, employerId);
  res.status(201).json({ review: serializeReview(db.prepare("SELECT * FROM reviews WHERE id = ?").get(id)) });
});
seekerMiscRouter.delete("/reviews/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(req.params.id);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM reviews WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Notifications ─── */
seekerMiscRouter.get("/notifications", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM notifications WHERE for_value IS NULL OR for_value = ? OR for_value = ? ORDER BY created_at DESC"
  ).all(req.user.id, req.user.role);
  res.json({ notifications: rows.map(serializeNotification) });
});
seekerMiscRouter.patch("/notifications/:id/read", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
seekerMiscRouter.patch("/notifications/read-all", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE for_value IS NULL OR for_value = ? OR for_value = ?").run(req.user.id, req.user.role);
  res.json({ ok: true });
});

/* ─── Saved jobs / followed employers / invited candidates ─── */
seekerMiscRouter.get("/saved-jobs", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT job_id FROM saved_jobs WHERE user_id = ?").all(req.user.id);
  res.json({ jobIds: rows.map(r => r.job_id) });
});
seekerMiscRouter.post("/saved-jobs/:jobId/toggle", requireAuth, (req, res) => {
  const existing = db.prepare("SELECT 1 FROM saved_jobs WHERE user_id = ? AND job_id = ?").get(req.user.id, req.params.jobId);
  if (existing) db.prepare("DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?").run(req.user.id, req.params.jobId);
  else db.prepare("INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)").run(req.user.id, req.params.jobId);
  res.json({ saved: !existing });
});
seekerMiscRouter.get("/followed-employers", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT employer_id FROM followed_employers WHERE user_id = ?").all(req.user.id);
  res.json({ employerIds: rows.map(r => r.employer_id) });
});
seekerMiscRouter.post("/followed-employers/:employerId/toggle", requireAuth, (req, res) => {
  const existing = db.prepare("SELECT 1 FROM followed_employers WHERE user_id = ? AND employer_id = ?").get(req.user.id, req.params.employerId);
  if (existing) db.prepare("DELETE FROM followed_employers WHERE user_id = ? AND employer_id = ?").run(req.user.id, req.params.employerId);
  else db.prepare("INSERT INTO followed_employers (user_id, employer_id) VALUES (?, ?)").run(req.user.id, req.params.employerId);
  res.json({ following: !existing });
});
seekerMiscRouter.post("/invited-candidates", requireAuth, requireRole("employer"), (req, res) => {
  const { jobId, candidateId } = req.body || {};
  db.prepare("INSERT OR IGNORE INTO invited_candidates (job_id, candidate_id) VALUES (?, ?)").run(jobId, candidateId);
  res.status(201).json({ ok: true });
});
seekerMiscRouter.get("/invited-candidates", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare(
    `SELECT invited_candidates.* FROM invited_candidates
     JOIN jobs ON jobs.id = invited_candidates.job_id WHERE jobs.employer_id = ?`
  ).all(req.user.employer_id);
  res.json({ invited: rows.map(r => `${r.job_id}:${r.candidate_id}`) });
});

/* ─── References ─── */
seekerMiscRouter.get("/references", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM reference_contacts WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ references: rows.map(serializeReference) });
});
seekerMiscRouter.post("/references", requireAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("ref", "reference_contacts");
  db.prepare("INSERT INTO reference_contacts (id, user_id, name, relation, email, phone) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, req.user.id, d.name, d.relation, d.email, d.phone);
  res.status(201).json({ reference: serializeReference(db.prepare("SELECT * FROM reference_contacts WHERE id = ?").get(id)) });
});
seekerMiscRouter.delete("/references/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM reference_contacts WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ─── Payment methods ─── */
seekerMiscRouter.get("/payment-methods", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM payment_methods WHERE owner_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ paymentMethods: rows.map(serializePaymentMethod) });
});
seekerMiscRouter.post("/payment-methods", requireAuth, (req, res) => {
  const d = req.body || {};
  const count = db.prepare("SELECT COUNT(*) AS n FROM payment_methods WHERE owner_id = ?").get(req.user.id).n;
  const id = nextId("pm", "payment_methods");
  db.prepare("INSERT INTO payment_methods (id, owner_id, masked, brand, exp, name, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.user.id, `•••• ${(d.number || "").slice(-4)}`, d.brand || "Card", d.exp, d.name, count === 0 ? 1 : 0);
  res.status(201).json({ paymentMethod: serializePaymentMethod(db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(id)) });
});
seekerMiscRouter.delete("/payment-methods/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM payment_methods WHERE id = ? AND owner_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});
seekerMiscRouter.patch("/payment-methods/:id/default", requireAuth, (req, res) => {
  db.prepare("UPDATE payment_methods SET is_default = 0 WHERE owner_id = ?").run(req.user.id);
  db.prepare("UPDATE payment_methods SET is_default = 1 WHERE id = ? AND owner_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ─── User settings (notification prefs, privacy, language) ─── */
function serializeUserSettings(row) {
  if (!row) return { matchAlerts: true, appAlerts: true, marketing: false, discoverable: true, hideEmployer: false, reducedMotion: false, lang: "en" };
  return { matchAlerts: !!row.match_alerts, appAlerts: !!row.app_alerts, marketing: !!row.marketing,
    discoverable: !!row.discoverable, hideEmployer: !!row.hide_employer, reducedMotion: !!row.reduced_motion, lang: row.lang };
}
seekerMiscRouter.get("/user-settings", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(req.user.id);
  res.json({ userSettings: serializeUserSettings(row) });
});
seekerMiscRouter.patch("/user-settings", requireAuth, (req, res) => {
  const fields = { matchAlerts: "match_alerts", appAlerts: "app_alerts", marketing: "marketing",
    discoverable: "discoverable", hideEmployer: "hide_employer", reducedMotion: "reduced_motion", lang: "lang" };
  const d = req.body || {};
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) {
    if (d[key] === undefined) continue;
    setCols.push(`${col} = ?`);
    params.push(typeof d[key] === "boolean" ? (d[key] ? 1 : 0) : d[key]);
  }
  db.prepare("INSERT INTO user_settings (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING").run(req.user.id);
  if (setCols.length) db.prepare(`UPDATE user_settings SET ${setCols.join(", ")} WHERE user_id = ?`).run(...params, req.user.id);
  const row = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(req.user.id);
  res.json({ userSettings: serializeUserSettings(row) });
});

/* ─── Two-factor ─── */
seekerMiscRouter.get("/two-factor", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM two_factor WHERE user_id = ?").get(req.user.id);
  res.json({ twoFactor: row ? { enabled: !!row.enabled, phone: row.phone, backupCodes: JSON.parse(row.backup_codes_json || "[]") } : null });
});
seekerMiscRouter.post("/two-factor/enable", requireAuth, (req, res) => {
  const codes = Array.from({ length: 6 }, () => Math.random().toString(36).slice(2, 10).toUpperCase());
  db.prepare(
    `INSERT INTO two_factor (user_id, enabled, phone, backup_codes_json) VALUES (?, 1, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET enabled = 1, phone = excluded.phone, backup_codes_json = excluded.backup_codes_json`
  ).run(req.user.id, req.body?.phone || "", JSON.stringify(codes));
  res.json({ ok: true, codes });
});
seekerMiscRouter.post("/two-factor/disable", requireAuth, (req, res) => {
  db.prepare("UPDATE two_factor SET enabled = 0 WHERE user_id = ?").run(req.user.id);
  res.json({ ok: true });
});
