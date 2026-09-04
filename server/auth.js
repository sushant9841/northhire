import crypto from "node:crypto";
import { db } from "./db.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return token;
}

export function userFromToken(token) {
  if (!token) return null;
  const row = db.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')"
  ).get(token);
  return row || null;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = userFromToken(token);
  if (!user) return res.status(401).json({ error: "Not signed in." });
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Not allowed for this account type." });
    next();
  };
}

export function publicUser(row) {
  if (!row) return null;
  const { password_hash, password_salt, skills_json, types_json, modes_json, ...rest } = row;
  return {
    ...rest,
    skills: JSON.parse(skills_json || "[]"),
    types: JSON.parse(types_json || "[]"),
    modes: JSON.parse(modes_json || "[]"),
  };
}
