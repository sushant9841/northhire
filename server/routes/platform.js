import { Router } from "express";
import fs from "node:fs";
import { db, nextId, sqlTime, DB_PATH } from "../db.js";
import { requireAuth, requireAdminScope } from "../auth.js";
import { getAllConfig, setConfig, CONFIG_KEYS } from "../platformConfig.js";
import { geocode } from "../geocode.js";

export const platformRouter = Router();

const SETTINGS_FIELDS = {
  employerBlogs: "employer_blogs", employerTrainings: "employer_trainings", employerFeature: "employer_feature",
  autoApproveJobs: "auto_approve_jobs", publicSignup: "public_signup", cvBuilder: "cv_builder",
  matching: "matching", enrolments: "enrolments", payTransparency: "pay_transparency", maintenance: "maintenance",
};
function serializeSettings(row) {
  const out = {};
  for (const [key, col] of Object.entries(SETTINGS_FIELDS)) out[key] = !!row[col];
  return out;
}

// Business config (plan limits, payroll tax brackets, staffing burden rates/agency policy) - public
// GET because even a logged-out visitor's pricing page or a payslip preview needs these numbers,
// same as the static JS constant this replaced. Only a finance-scope (or full) admin can change
// them, and every change is attributed in the audit log since these numbers affect real money math.
platformRouter.get("/config", (req, res) => { res.json(getAllConfig()); });
platformRouter.patch("/config/:key", requireAuth, requireAdminScope("finance"), (req, res) => {
  if (!CONFIG_KEYS.includes(req.params.key)) return res.status(400).json({ error: "Unknown config key." });
  const updated = setConfig(req.params.key, req.body?.value, `${req.user.name} (${req.user.role})`);
  db.prepare("INSERT INTO activity_log (id, action, text, icon, actor) VALUES (?, 'config.change', ?, 'gear', ?)")
    .run(nextId("l", "activity_log"), `Updated ${req.params.key} config`, `${req.user.name} (${req.user.role})`);
  res.json({ [req.params.key]: updated });
});

// A client can't call Nominatim directly and stay within its usage policy (no custom User-Agent
// from a browser, no shared cache/rate-limit across visitors) - this proxies through the same
// throttled, cached helper server/jobs.js uses when geocoding a new listing.
platformRouter.get("/geocode", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "Missing ?q=" });
  const result = await geocode(q);
  res.json({ result });
});

platformRouter.get("/settings", (req, res) => {
  let row = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get();
  if (!row) { db.prepare("INSERT INTO platform_settings (id) VALUES (1)").run(); row = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get(); }
  res.json({ settings: serializeSettings(row) });
});
platformRouter.patch("/settings", requireAuth, requireAdminScope(), (req, res) => {
  const { key, value } = req.body || {};
  const col = SETTINGS_FIELDS[key];
  if (!col) return res.status(400).json({ error: "Unknown setting." });
  db.prepare("INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT(id) DO NOTHING").run();
  db.prepare(`UPDATE platform_settings SET ${col} = ? WHERE id = 1`).run(value ? 1 : 0);
  db.prepare("INSERT INTO activity_log (id, action, text, icon, actor) VALUES (?, 'settings.change', ?, 'gear', ?)")
    .run(nextId("l", "activity_log"), `${value ? "Enabled" : "Disabled"} ${key}`, `${req.user.name} (${req.user.role})`);
  res.json({ settings: serializeSettings(db.prepare("SELECT * FROM platform_settings WHERE id = 1").get()) });
});

// Real abuse-visibility signals for AdmHome - previously nothing tracked failed logins or
// spam-pattern signups at all, so an admin had no way to notice brute-forcing or bot signups.
platformRouter.get("/security-signals", requireAuth, requireAdminScope("support", "moderator", "finance"), (req, res) => {
  const since24h = "datetime('now','-1 day')";
  const failedLogins24h = db.prepare(`SELECT COUNT(*) AS n FROM failed_logins WHERE created_at >= ${since24h}`).get().n;
  const topOffenders = db.prepare(
    `SELECT email, COUNT(*) AS attempts FROM failed_logins WHERE created_at >= ${since24h} GROUP BY email ORDER BY attempts DESC LIMIT 5`
  ).all();
  const signups24h = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE created_at >= ${since24h}`).get().n;
  // A crude but real signal: an email domain that produced 3+ new signups in the last 24h is
  // worth a human glance (legitimate companies inviting a team rarely all sign up same-day).
  const spamDomains = db.prepare(
    `SELECT SUBSTR(email, INSTR(email,'@')+1) AS domain, COUNT(*) AS n FROM users
     WHERE created_at >= ${since24h} GROUP BY domain HAVING n >= 3 ORDER BY n DESC LIMIT 5`
  ).all();
  const applications24h = db.prepare(`SELECT COUNT(*) AS n FROM applications WHERE created_at >= ${since24h}`).get().n;
  const floodingApplicants = db.prepare(
    `SELECT user_id, COUNT(*) AS n FROM applications WHERE created_at >= ${since24h} GROUP BY user_id HAVING n >= 10 ORDER BY n DESC LIMIT 5`
  ).all();
  res.json({ failedLogins24h, topOffenders, signups24h, spamDomains, applications24h, floodingApplicants });
});

// Real ops-health signals - error rate is measured (server/index.js logs every 5xx to
// server_errors), uptime/db size are read directly from the process/filesystem. "Queue health"
// isn't included: this app has no background job queue to report on, so faking a metric for one
// would be worse than omitting it.
platformRouter.get("/ops-health", requireAuth, requireAdminScope("support", "moderator", "finance"), (req, res) => {
  const since24h = "datetime('now','-1 day')";
  const errors24h = db.prepare(`SELECT COUNT(*) AS n FROM server_errors WHERE created_at >= ${since24h}`).get().n;
  const topErrorPaths = db.prepare(
    `SELECT method, path, status, COUNT(*) AS n, MAX(created_at) AS lastSeen FROM server_errors
     WHERE created_at >= ${since24h} GROUP BY method, path, status ORDER BY n DESC LIMIT 5`
  ).all();
  const recentErrors = db.prepare(`SELECT method, path, status, message, created_at FROM server_errors ORDER BY created_at DESC LIMIT 10`).all();
  let dbSizeBytes = null;
  try { dbSizeBytes = fs.statSync(DB_PATH).size; } catch { /* not on disk (e.g. :memory:) */ }
  res.json({ errors24h, topErrorPaths, recentErrors, uptimeSeconds: Math.round(process.uptime()), dbSizeBytes });
});

platformRouter.get("/activity", requireAuth, requireAdminScope("support", "moderator", "finance"), (req, res) => {
  const rows = db.prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 1000").all();
  res.json({ activity: rows.map(r => ({ id: r.id, action: r.action, text: r.text, icon: r.icon, actor: r.actor, at: sqlTime(r.created_at).getTime() })) });
});
// No frontend call site actually uses this (the client-side activity feed is optimistic/local-
// only via useStore.js's log() helper) - restricting to admin closes an open door for any
// authenticated user to inject spoofed entries into the admin-facing audit log for free.
platformRouter.post("/activity", requireAuth, requireAdminScope(), (req, res) => {
  const { action, text, icon } = req.body || {};
  const id = nextId("l", "activity_log");
  db.prepare("INSERT INTO activity_log (id, action, text, icon, actor) VALUES (?, ?, ?, ?, ?)")
    .run(id, action, text, icon, `${req.user.name} (${req.user.role})`);
  res.status(201).json({ ok: true });
});

/* ─── Contact form: a real ticket + an admin inbox, replacing the old "logs a topic string and
   discards the actual message" behavior. Public - a visitor filing a contact request isn't
   necessarily signed in. ─── */
function serializeContactMessage(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, topic: row.topic, message: row.message, status: row.status, at: sqlTime(row.created_at).getTime() };
}
platformRouter.post("/contact", (req, res) => {
  const { name, email, topic, message } = req.body || {};
  if (!email || !message) return res.status(400).json({ error: "Email and message are required." });
  const id = nextId("ct", "contact_messages");
  db.prepare("INSERT INTO contact_messages (id, name, email, topic, message) VALUES (?, ?, ?, ?, ?)").run(id, name || "", email, topic || "", message);
  res.status(201).json({ ticket: id });
});
platformRouter.get("/contact", requireAuth, requireAdminScope("support"), (req, res) => {
  const rows = db.prepare("SELECT * FROM contact_messages ORDER BY created_at DESC").all();
  res.json({ messages: rows.map(serializeContactMessage) });
});
platformRouter.patch("/contact/:id", requireAuth, requireAdminScope("support"), (req, res) => {
  const { status } = req.body || {};
  db.prepare("UPDATE contact_messages SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ message: serializeContactMessage(db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(req.params.id)) });
});
