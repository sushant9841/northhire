import { Router } from "express";
import { db, nextId } from "../db.js";
import { hashPassword, verifyPassword, createSessionCookie, clearSessionCookie, publicUser, requireAuth } from "../auth.js";

export const authRouter = Router();

authRouter.post("/signup", (req, res) => {
  const { name, email, password, role = "seeker", companyName } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (!["seeker", "employer"].includes(role)) return res.status(400).json({ error: "Invalid account type." });
  if (role === "employer" && !companyName) return res.status(400).json({ error: "Company name is required for an employer account." });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  let employerId = null;
  if (role === "employer") {
    employerId = nextId("e", "employers");
    db.prepare(
      `INSERT INTO employers (id, name, mark, a, b, plan, verified) VALUES (?, ?, 'hex', '#005CCC', '#FFFFFF', 'Free', 0)`
    ).run(employerId, companyName);
  }

  const { hash, salt } = hashPassword(password);
  const id = nextId("u", "users");
  db.prepare(
    `INSERT INTO users (id, role, name, email, password_hash, password_salt, employer_id, seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, role, name, email.toLowerCase(), hash, salt, employerId, Math.floor(Math.random() * 12));
  db.prepare("INSERT INTO user_settings (user_id) VALUES (?)").run(id);

  createSessionCookie(res, "session", "main", id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.get("/check-email", (req, res) => {
  const email = (req.query.email || "").toLowerCase().trim();
  if (!email) return res.json({ exists: false });
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  res.json({ exists: !!row });
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  if (user.suspended) {
    return res.status(403).json({ error: "This account has been suspended. Contact support for help." });
  }
  createSessionCookie(res, "session", "main", user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(req, res, "session", "main");
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

authRouter.post("/reset/request", (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!user) return res.status(404).json({ error: "No account with that email." });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.prepare("INSERT INTO reset_codes (email, code) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET code = excluded.code, created_at = datetime('now')").run(email, code);
  db.prepare("INSERT INTO outbox (id, to_email, subject, body) VALUES (?, ?, 'Reset your NorthHire password', ?)")
    .run(nextId("m", "outbox"), email, `Your reset code is ${code}. It expires in 15 minutes.`);
  res.json({ ok: true, code }); // dev returns code for demo visibility, matching the old local-only behavior
});

authRouter.post("/reset/confirm", (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();
  const { code, newPassword } = req.body || {};
  const rec = db.prepare("SELECT * FROM reset_codes WHERE email = ?").get(email);
  if (!rec) return res.status(400).json({ error: "No pending reset for this account." });
  if (Date.now() - new Date(rec.created_at).getTime() > 15 * 60 * 1000) return res.status(400).json({ error: "Code expired — request a new one." });
  if (rec.code !== code) return res.status(400).json({ error: "Code does not match." });
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const { hash, salt } = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE email = ?").run(hash, salt, email);
  db.prepare("DELETE FROM reset_codes WHERE email = ?").run(email);
  res.json({ ok: true });
});
