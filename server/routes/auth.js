import crypto from "node:crypto";
import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { hashPassword, verifyPassword, createSessionCookie, clearSessionCookie, publicUser, requireAuth } from "../auth.js";
import { sendAndLogMail } from "../mail.js";

export const authRouter = Router();

const CODE_COOLDOWN_MS = 60 * 1000; // shared by reset-password and login-2FA code requests
const CODE_MAX_ATTEMPTS = 5;

// Simple in-memory per-IP sliding window against mass account creation - no persistence needed
// (resets on restart, and a single-process deployment doesn't need it shared across instances).
const SIGNUP_LIMIT_MAX = 10;
const SIGNUP_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const signupAttemptsByIp = new Map();
function signupRateLimited(ip) {
  const now = Date.now();
  const recent = (signupAttemptsByIp.get(ip) || []).filter(t => now - t < SIGNUP_LIMIT_WINDOW_MS);
  recent.push(now);
  signupAttemptsByIp.set(ip, recent);
  return recent.length > SIGNUP_LIMIT_MAX;
}

authRouter.post("/signup", (req, res) => {
  if (signupRateLimited(req.ip)) return res.status(429).json({ error: "Too many accounts created from this network — try again later." });
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

// Accepting a teammate invite (public - the invited person has no account, and therefore no
// session, yet). See employers.js's /team/invite for how the invite/token gets created.
authRouter.get("/invites/:token", (req, res) => {
  const invite = db.prepare("SELECT * FROM employer_invites WHERE token = ? AND status = 'pending'").get(req.params.token);
  if (!invite) return res.status(404).json({ error: "This invite is invalid or has already been used." });
  const employer = db.prepare("SELECT name FROM employers WHERE id = ?").get(invite.employer_id);
  res.json({ email: invite.email, companyName: employer?.name || "" });
});
authRouter.post("/invites/:token/accept", (req, res) => {
  const invite = db.prepare("SELECT * FROM employer_invites WHERE token = ? AND status = 'pending'").get(req.params.token);
  if (!invite) return res.status(404).json({ error: "This invite is invalid or has already been used." });
  const { name, password } = req.body || {};
  if (!name || !password) return res.status(400).json({ error: "Name and password are required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(invite.email)) return res.status(409).json({ error: "An account with that email already exists." });
  const { hash, salt } = hashPassword(password);
  const id = nextId("u", "users");
  db.prepare(
    `INSERT INTO users (id, role, name, email, password_hash, password_salt, employer_id, employer_role, seed)
     VALUES (?, 'employer', ?, ?, ?, ?, ?, 'member', ?)`
  ).run(id, name, invite.email, hash, salt, invite.employer_id, Math.floor(Math.random() * 12));
  db.prepare("INSERT INTO user_settings (user_id) VALUES (?)").run(id);
  db.prepare("UPDATE employer_invites SET status = 'accepted' WHERE id = ?").run(invite.id);
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

const LOGIN_LOCKOUT_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_WINDOW_MIN = 15;
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const emailLower = email.toLowerCase();

  const recentFails = db.prepare(
    `SELECT COUNT(*) AS n FROM failed_logins WHERE email = ? AND kind = 'main' AND created_at >= datetime('now', ?)`
  ).get(emailLower, `-${LOGIN_LOCKOUT_WINDOW_MIN} minutes`).n;
  if (recentFails >= LOGIN_LOCKOUT_MAX_ATTEMPTS) {
    return res.status(429).json({ error: `Too many failed attempts — try again in ${LOGIN_LOCKOUT_WINDOW_MIN} minutes.` });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(emailLower);
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    db.prepare("INSERT INTO failed_logins (id, email, kind) VALUES (?, ?, 'main')").run(nextId("fl", "failed_logins"), emailLower);
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  if (user.suspended) {
    return res.status(403).json({ error: "This account has been suspended. Contact support for help." });
  }
  db.prepare("DELETE FROM failed_logins WHERE email = ? AND kind = 'main'").run(emailLower);
  const tf = db.prepare("SELECT * FROM two_factor WHERE user_id = ?").get(user.id);
  if (tf?.enabled) {
    const code = crypto.randomInt(100000, 1000000).toString();
    db.prepare("INSERT INTO login_2fa_codes (email, code) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET code = excluded.code, created_at = datetime('now')")
      .run(user.email, code);
    await sendAndLogMail(user.email, "Your NorthHire sign-in code", `Your sign-in code is ${code}. It expires in 15 minutes.`);
    // Returning the code in the response defeats 2FA entirely for anyone who already has the
    // password (the whole point of a second factor) - only ever expose it outside production. The
    // email above is now genuinely sent (via Ethereal), but its preview link takes an extra click
    // to reach outside the outbox UI, so this stays as a dev-only convenience.
    return res.json({ mfaRequired: true, email: user.email, code: process.env.NODE_ENV === "production" ? undefined : code });
  }
  createSessionCookie(res, "session", "main", user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post("/login/verify-2fa", (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();
  const { code } = req.body || {};
  const rec = db.prepare("SELECT * FROM login_2fa_codes WHERE email = ?").get(email);
  if (!rec) return res.status(400).json({ error: "No pending sign-in for this account." });
  if (rec.attempts >= CODE_MAX_ATTEMPTS) {
    db.prepare("DELETE FROM login_2fa_codes WHERE email = ?").run(email);
    return res.status(429).json({ error: "Too many incorrect attempts — sign in again to get a new code." });
  }
  if (Date.now() - sqlTime(rec.created_at).getTime() > 15 * 60 * 1000) return res.status(400).json({ error: "Code expired — sign in again." });
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const tf = user ? db.prepare("SELECT * FROM two_factor WHERE user_id = ?").get(user.id) : null;
  const backupCodes = tf ? JSON.parse(tf.backup_codes_json || "[]") : [];
  if (rec.code !== code && !backupCodes.includes(code)) {
    db.prepare("UPDATE login_2fa_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
    const remaining = CODE_MAX_ATTEMPTS - rec.attempts - 1;
    return res.status(400).json({ error: `Code does not match.${remaining > 0 ? ` ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` : " No attempts remaining — sign in again for a new code."}` });
  }
  db.prepare("DELETE FROM login_2fa_codes WHERE email = ?").run(email);
  if (backupCodes.includes(code)) {
    db.prepare("UPDATE two_factor SET backup_codes_json = ? WHERE user_id = ?").run(JSON.stringify(backupCodes.filter(c => c !== code)), user.id);
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

authRouter.get("/outbox", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM outbox WHERE to_email = ? ORDER BY created_at DESC").all(req.user.email);
  res.json({ outbox: rows.map(r => ({ id: r.id, to: r.to_email, subject: r.subject, body: r.body, previewUrl: r.preview_url, at: sqlTime(r.created_at).toLocaleString("en-CA") })) });
});

authRouter.post("/reset/request", async (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!user) return res.status(404).json({ error: "No account with that email." });
  const existing = db.prepare("SELECT * FROM reset_codes WHERE email = ?").get(email);
  if (existing) {
    const sinceLast = Date.now() - sqlTime(existing.created_at).getTime();
    if (sinceLast < CODE_COOLDOWN_MS) {
      return res.status(429).json({ error: `Please wait ${Math.ceil((CODE_COOLDOWN_MS - sinceLast) / 1000)} more seconds before requesting another code.` });
    }
  }
  const code = crypto.randomInt(100000, 1000000).toString();
  db.prepare("INSERT INTO reset_codes (email, code, attempts) VALUES (?, ?, 0) ON CONFLICT(email) DO UPDATE SET code = excluded.code, attempts = 0, created_at = datetime('now')").run(email, code);
  await sendAndLogMail(email, "Reset your NorthHire password", `Your reset code is ${code}. It expires in 15 minutes.`);
  // Returning the code to whoever merely knows the target email defeats password reset entirely -
  // anyone could take over any account, admin included, without ever touching the real inbox.
  // Only exposed outside production, where there's no real email delivery to demo the flow with.
  res.json({ ok: true, code: process.env.NODE_ENV === "production" ? undefined : code });
});

authRouter.post("/reset/confirm", (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();
  const { code, newPassword } = req.body || {};
  const rec = db.prepare("SELECT * FROM reset_codes WHERE email = ?").get(email);
  if (!rec) return res.status(400).json({ error: "No pending reset for this account." });
  if (rec.attempts >= CODE_MAX_ATTEMPTS) {
    db.prepare("DELETE FROM reset_codes WHERE email = ?").run(email);
    return res.status(429).json({ error: "Too many incorrect attempts — request a new code." });
  }
  if (Date.now() - sqlTime(rec.created_at).getTime() > 15 * 60 * 1000) return res.status(400).json({ error: "Code expired — request a new one." });
  if (rec.code !== code) {
    db.prepare("UPDATE reset_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
    const remaining = CODE_MAX_ATTEMPTS - rec.attempts - 1;
    return res.status(400).json({ error: `Code does not match.${remaining > 0 ? ` ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` : " No attempts remaining — request a new code."}` });
  }
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const { hash, salt } = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE email = ?").run(hash, salt, email);
  db.prepare("DELETE FROM reset_codes WHERE email = ?").run(email);
  res.json({ ok: true });
});
