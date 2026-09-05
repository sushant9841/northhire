import crypto from "node:crypto";
import { db } from "./db.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
// `secure` is conditional on NODE_ENV rather than always-on because local dev runs over plain
// HTTP - a hardcoded `secure:true` would silently break every login outside production.
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_TTL_MS };

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

/* One `sessions` table, three independent cookie-scoped session kinds - the main NorthHire
   account, an HR Suite employee session, and an agency-staff session. Each is entirely separate
   (a company's Enterprise employer account and its HR employees are different login surfaces in
   the real product, same as before this migration - see hr.js/agency.js). No token is ever
   handed to the frontend to store itself; the cookie is the only place a session lives. */
export function createSessionCookie(res, cookieName, kind, subjectId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (token, kind, subject_id, expires_at) VALUES (?, ?, ?, ?)").run(token, kind, subjectId, expiresAt);
  res.cookie(cookieName, token, COOKIE_OPTS);
}

export function clearSessionCookie(req, res, cookieName, kind) {
  const token = req.cookies?.[cookieName];
  if (token) db.prepare("DELETE FROM sessions WHERE token = ? AND kind = ?").run(token, kind);
  res.clearCookie(cookieName);
}

function subjectIdFromCookie(req, cookieName, kind) {
  const token = req.cookies?.[cookieName];
  if (!token) return null;
  const row = db.prepare(
    "SELECT subject_id FROM sessions WHERE token = ? AND kind = ? AND expires_at > datetime('now')"
  ).get(token, kind);
  return row?.subject_id || null;
}

export function userFromRequest(req) {
  const id = subjectIdFromCookie(req, "session", "main");
  if (!id) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

export function requireAuth(req, res, next) {
  const user = userFromRequest(req);
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

/* Scoped admin roles - previously every admin account was a single flat "can do anything" role.
   `admin_scope` on the users row is 'full' (sees/does everything, the only pre-existing
   behavior), 'readonly' (sees everything, writes nothing), or one of the named domain scopes
   below, which only unlocks the specific admin sections listed at each call site. */
export function hasAdminScope(user, ...scopes) {
  if (user.role !== "admin") return false;
  const s = user.admin_scope || "full";
  if (s === "full") return true;
  if (s === "readonly") return false; // read-only never satisfies a write-capability check
  return scopes.includes(s);
}
export function requireAdminScope(...scopes) {
  return (req, res, next) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Not allowed for this account type." });
    const s = req.user.admin_scope || "full";
    if (s === "full") return next();
    if (s === "readonly") return req.method === "GET" ? next() : res.status(403).json({ error: "This is a read-only admin account — it can't make changes." });
    if (scopes.includes(s)) return next();
    return res.status(403).json({ error: "This admin account doesn't have access to that section." });
  };
}

/* HR Suite session - subject_id is an hr_employees.id */
export function hrEmployeeFromRequest(req) {
  const id = subjectIdFromCookie(req, "hr_session", "hr");
  if (!id) return null;
  return db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(id) || null;
}
export function requireHrAuth(req, res, next) {
  const emp = hrEmployeeFromRequest(req);
  if (!emp) return res.status(401).json({ error: "Not signed in to HR Suite." });
  req.hrEmployee = emp;
  next();
}

/* Agency staff session - subject_id is an agency_staff.id */
export function agencyStaffFromRequest(req) {
  const id = subjectIdFromCookie(req, "agency_session", "agency");
  if (!id) return null;
  return db.prepare("SELECT * FROM agency_staff WHERE id = ?").get(id) || null;
}
export function requireAgencyAuth(req, res, next) {
  const staff = agencyStaffFromRequest(req);
  if (!staff) return res.status(401).json({ error: "Not signed in to the agency console." });
  req.agencyStaff = staff;
  next();
}

export function publicUser(row) {
  if (!row) return null;
  const { password_hash, password_salt, skills_json, types_json, modes_json, visibility_json, ...rest } = row;
  return {
    ...rest,
    skills: JSON.parse(skills_json || "[]"),
    types: JSON.parse(types_json || "[]"),
    modes: JSON.parse(modes_json || "[]"),
    visibility: JSON.parse(visibility_json || "{}"),
  };
}
