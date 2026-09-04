import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole, publicUser } from "../auth.js";

export const usersRouter = Router();

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
