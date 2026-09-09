import { Router } from "express";
import crypto from "node:crypto";
import { db, nextId } from "../db.js";
import { hashPassword, verifyPassword, requireAuth, requireRole } from "../auth.js";
import { getConfig } from "../platformConfig.js";
import { serializeJob, serializeApplication } from "../serialize.js";
import { WEBHOOK_EVENTS } from "../webhooks.js";

/* ═══ Enterprise API ═══════════════════════════════════════════════════════════════════════
   "API access" and "API + Zapier" have been on the Enterprise tier's feature list with nothing
   implementing them. This is that surface: a small, real, key-authenticated REST API scoped to
   one employer's own data, plus signed outbound webhooks so Zapier-style integrations don't have
   to poll.

   Deliberately narrow. Every route reads or writes only the calling employer's own records, and
   there is no endpoint that can reach another company's data — an API key is a long-lived
   credential that will end up pasted into third-party tools, so its blast radius has to be small
   by construction rather than by careful checking at each call site. */

export const publicApiRouter = Router();      // mounted at /api/v1 - key auth
export const apiAdminRouter = Router();       // mounted at /api/api-keys - session auth, manages keys

const KEY_PREFIX = "nh_live_";

function employerPlanAllowsApi(employerId) {
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(employerId);
  return !!getConfig("plans")[employer?.plan || "Free"]?.api;
}

/* Key auth. The key is never stored, only its scrypt hash, so a database read can't recover a
   working credential. The visible prefix narrows the candidate set to (normally) one row rather
   than forcing a hash comparison against every key in the table. */
function requireApiKey(req, res, next) {
  const header = req.get("authorization") || "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!presented.startsWith(KEY_PREFIX)) {
    return res.status(401).json({ error: "Send your API key as `Authorization: Bearer nh_live_…`." });
  }
  const prefix = presented.slice(0, KEY_PREFIX.length + 8);
  const candidates = db.prepare("SELECT * FROM employer_api_keys WHERE key_prefix = ? AND revoked = 0").all(prefix);
  const key = candidates.find(k => verifyPassword(presented, k.key_hash, k.key_salt));
  if (!key) return res.status(401).json({ error: "Invalid or revoked API key." });
  // A key outlives the plan that issued it, so the entitlement is checked per request rather
  // than only at creation - downgrading to Growth has to actually close API access.
  if (!employerPlanAllowsApi(key.employer_id)) {
    return res.status(403).json({ error: "API access is an Enterprise feature. This account's plan no longer includes it." });
  }
  db.prepare("UPDATE employer_api_keys SET last_used = datetime('now') WHERE id = ?").run(key.id);
  req.apiEmployerId = key.employer_id;
  next();
}

publicApiRouter.use(requireApiKey);

publicApiRouter.get("/me", (req, res) => {
  const e = db.prepare("SELECT id, name, plan, city, prov FROM employers WHERE id = ?").get(req.apiEmployerId);
  res.json({ employer: e });
});

publicApiRouter.get("/jobs", (req, res) => {
  const rows = db.prepare("SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC").all(req.apiEmployerId);
  res.json({ jobs: rows.map(serializeJob) });
});

publicApiRouter.get("/jobs/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ? AND employer_id = ?").get(req.params.id, req.apiEmployerId);
  if (!row) return res.status(404).json({ error: "Job not found." });
  res.json({ job: serializeJob(row) });
});

publicApiRouter.get("/applications", (req, res) => {
  const clauses = ["jobs.employer_id = ?"];
  const params = [req.apiEmployerId];
  if (req.query.jobId) { clauses.push("applications.job_id = ?"); params.push(req.query.jobId); }
  if (req.query.stage) { clauses.push("applications.stage = ?"); params.push(req.query.stage); }
  const rows = db.prepare(
    `SELECT applications.* FROM applications JOIN jobs ON jobs.id = applications.job_id
      WHERE ${clauses.join(" AND ")} ORDER BY applications.created_at DESC LIMIT 500`
  ).all(...params);
  res.json({ applications: rows.map(serializeApplication) });
});

/* ─── Key management (session-authenticated, not key-authenticated) ─── */

apiAdminRouter.use(requireAuth, requireRole("employer"));

apiAdminRouter.get("/", (req, res) => {
  if (!employerPlanAllowsApi(req.user.employer_id)) {
    return res.json({ keys: [], webhooks: [], enabled: false, events: WEBHOOK_EVENTS });
  }
  const keys = db.prepare("SELECT id, name, key_prefix, last_used, created_at FROM employer_api_keys WHERE employer_id = ? AND revoked = 0 ORDER BY created_at DESC")
    .all(req.user.employer_id)
    .map(k => ({ id: k.id, name: k.name, prefix: k.key_prefix, lastUsed: k.last_used, createdAt: k.created_at }));
  const webhooks = db.prepare("SELECT id, url, events_json, active, last_status, last_error, last_at FROM employer_webhooks WHERE employer_id = ? ORDER BY created_at DESC")
    .all(req.user.employer_id)
    .map(w => ({ id: w.id, url: w.url, events: JSON.parse(w.events_json || "[]"), active: !!w.active,
      lastStatus: w.last_status, lastError: w.last_error, lastAt: w.last_at }));
  res.json({ keys, webhooks, enabled: true, events: WEBHOOK_EVENTS });
});

apiAdminRouter.post("/keys", (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can create API keys." });
  if (!employerPlanAllowsApi(req.user.employer_id)) return res.status(403).json({ error: "API access is available on Enterprise." });
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name the key so it can be told apart from the others." });
  const secret = `${KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
  const { hash, salt } = hashPassword(secret);
  const id = nextId("ak", "employer_api_keys");
  db.prepare("INSERT INTO employer_api_keys (id, employer_id, name, key_hash, key_salt, key_prefix, created_by) VALUES (?,?,?,?,?,?,?)")
    .run(id, req.user.employer_id, name, hash, salt, secret.slice(0, KEY_PREFIX.length + 8), req.user.id);
  // Shown exactly once. There is no endpoint that can return it again.
  res.status(201).json({ key: { id, name, prefix: secret.slice(0, KEY_PREFIX.length + 8) }, secret });
});

apiAdminRouter.delete("/keys/:id", (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can revoke API keys." });
  const r = db.prepare("UPDATE employer_api_keys SET revoked = 1 WHERE id = ? AND employer_id = ?")
    .run(req.params.id, req.user.employer_id);
  if (!r.changes) return res.status(404).json({ error: "Key not found." });
  res.json({ ok: true });
});

apiAdminRouter.post("/webhooks", (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can add webhooks." });
  if (!employerPlanAllowsApi(req.user.employer_id)) return res.status(403).json({ error: "Webhooks are available on Enterprise." });
  const url = String(req.body?.url || "").trim();
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: "Enter a valid URL." }); }
  // Plain http would put the signed payload (which carries candidate data) on the wire in clear.
  if (parsed.protocol !== "https:") return res.status(400).json({ error: "Webhook endpoints must use HTTPS." });
  const events = Array.isArray(req.body?.events) ? req.body.events.filter(e => WEBHOOK_EVENTS.includes(e)) : [];
  const secret = `whsec_${crypto.randomBytes(20).toString("hex")}`;
  const id = nextId("wh", "employer_webhooks");
  db.prepare("INSERT INTO employer_webhooks (id, employer_id, url, secret, events_json) VALUES (?,?,?,?,?)")
    .run(id, req.user.employer_id, url, secret, JSON.stringify(events));
  res.status(201).json({ webhook: { id, url, events }, secret });
});

apiAdminRouter.delete("/webhooks/:id", (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can remove webhooks." });
  const r = db.prepare("DELETE FROM employer_webhooks WHERE id = ? AND employer_id = ?").run(req.params.id, req.user.employer_id);
  if (!r.changes) return res.status(404).json({ error: "Webhook not found." });
  res.json({ ok: true });
});
