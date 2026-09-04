import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

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

platformRouter.get("/settings", (req, res) => {
  let row = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get();
  if (!row) { db.prepare("INSERT INTO platform_settings (id) VALUES (1)").run(); row = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get(); }
  res.json({ settings: serializeSettings(row) });
});
platformRouter.patch("/settings", requireAuth, requireRole("admin"), (req, res) => {
  const { key, value } = req.body || {};
  const col = SETTINGS_FIELDS[key];
  if (!col) return res.status(400).json({ error: "Unknown setting." });
  db.prepare("INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT(id) DO NOTHING").run();
  db.prepare(`UPDATE platform_settings SET ${col} = ? WHERE id = 1`).run(value ? 1 : 0);
  db.prepare("INSERT INTO activity_log (id, action, text, icon, actor) VALUES (?, 'settings.change', ?, 'gear', ?)")
    .run(nextId("l", "activity_log"), `${value ? "Enabled" : "Disabled"} ${key}`, `${req.user.name} (${req.user.role})`);
  res.json({ settings: serializeSettings(db.prepare("SELECT * FROM platform_settings WHERE id = 1").get()) });
});

platformRouter.get("/activity", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 1000").all();
  res.json({ activity: rows.map(r => ({ id: r.id, action: r.action, text: r.text, icon: r.icon, actor: r.actor, at: sqlTime(r.created_at).getTime() })) });
});
platformRouter.post("/activity", requireAuth, (req, res) => {
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
platformRouter.get("/contact", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM contact_messages ORDER BY created_at DESC").all();
  res.json({ messages: rows.map(serializeContactMessage) });
});
platformRouter.patch("/contact/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { status } = req.body || {};
  db.prepare("UPDATE contact_messages SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ message: serializeContactMessage(db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(req.params.id)) });
});
