import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole, publicUser } from "../auth.js";

export const usersRouter = Router();

const OWN_PROFILE_FIELDS = {
  title: "title", cat: "cat", city: "city", prov: "prov", years: "years", phone: "phone",
  edu: "edu", eligible: "eligible", payMin: "pay_min", payUnit: "pay_unit", summary: "summary",
  defaultCv: "default_cv", startWhen: "start_when",
};
usersRouter.patch("/me", requireAuth, (req, res) => {
  const body = req.body || {};
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(OWN_PROFILE_FIELDS)) {
    if (body[key] !== undefined) { setCols.push(`${col} = ?`); params.push(body[key]); }
  }
  if (body.skills !== undefined) { setCols.push("skills_json = ?"); params.push(JSON.stringify(body.skills)); }
  if (body.types !== undefined) { setCols.push("types_json = ?"); params.push(JSON.stringify(body.types)); }
  if (body.modes !== undefined) { setCols.push("modes_json = ?"); params.push(JSON.stringify(body.modes)); }
  if (setCols.length) {
    db.prepare(`UPDATE users SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.user.id);
  }
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(updated) });
});

usersRouter.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role = 'seeker' ORDER BY created_at DESC").all();
  res.json({ users: rows.map(publicUser) });
});

usersRouter.patch("/:id/suspend", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "User not found." });
  const suspend = !row.suspended;
  const reason = req.body?.reason || null;
  db.prepare("UPDATE users SET suspended = ?, suspension_reason = ?, suspended_at = ? WHERE id = ?")
    .run(suspend ? 1 : 0, suspend ? reason : null, suspend ? new Date().toISOString() : null, req.params.id);
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  res.json({ user: publicUser(updated) });
});
