import { Router } from "express";
import crypto from "node:crypto";
import { db, nextId } from "../db.js";
import { requireAuth, requireAdminScope, publicUser, hashPassword } from "../auth.js";

export const usersRouter = Router();

const OWN_PROFILE_FIELDS = {
  title: "title", cat: "cat", city: "city", prov: "prov", years: "years", phone: "phone",
  edu: "edu", eligible: "eligible", payMin: "pay_min", payUnit: "pay_unit", summary: "summary",
  defaultCv: "default_cv", startWhen: "start_when",
  // Bill 96: UI/email language preference. Validated against the two supported locales rather
  // than accepted verbatim, same reasoning as any other user-writable enum column.
  locale: "locale",
  // Priority-4 #6: CASL consent for silver-medalist matching, separate from marketing_consent -
  // coerced to a strict 0/1 below since this drives a SQL boolean comparison in the batch job.
  optInFutureOpportunities: "opt_in_future_opportunities",
};
const VALID_LOCALES = ["en-CA", "fr-CA"];
usersRouter.patch("/me", requireAuth, (req, res) => {
  const body = req.body || {};
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(OWN_PROFILE_FIELDS)) {
    if (body[key] === undefined) continue;
    if (key === "locale" && !VALID_LOCALES.includes(body[key])) continue;
    const value = key === "optInFutureOpportunities" ? (body[key] ? 1 : 0) : body[key];
    setCols.push(`${col} = ?`); params.push(value);
  }
  if (body.skills !== undefined) { setCols.push("skills_json = ?"); params.push(JSON.stringify(body.skills)); }
  if (body.types !== undefined) { setCols.push("types_json = ?"); params.push(JSON.stringify(body.types)); }
  if (body.modes !== undefined) { setCols.push("modes_json = ?"); params.push(JSON.stringify(body.modes)); }
  if (body.visibility !== undefined) {
    const current = JSON.parse(db.prepare("SELECT visibility_json FROM users WHERE id = ?").get(req.user.id)?.visibility_json || "{}");
    setCols.push("visibility_json = ?"); params.push(JSON.stringify({ ...current, ...body.visibility }));
  }
  if (setCols.length) {
    db.prepare(`UPDATE users SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.user.id);
  }
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(updated) });
});

usersRouter.get("/", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role = 'seeker' ORDER BY created_at DESC").all();
  res.json({ users: rows.map(publicUser) });
});

const ADMIN_SCOPES = ["full", "support", "moderator", "finance", "readonly"];
// Only a full admin manages other admins' scopes - a scoped admin escalating its own or another
// account's access would defeat the entire point of scoping. Restricted with requireAdminScope()
// (no scopes listed) rather than requireRole("admin"), so a support/moderator/finance/readonly
// admin gets the same 403 a non-admin would.
usersRouter.get("/admins", requireAuth, requireAdminScope(), (req, res) => {
  const rows = db.prepare("SELECT id, name, email, admin_scope, created_at FROM users WHERE role = 'admin' ORDER BY created_at ASC").all();
  res.json({ admins: rows.map(r => ({ id: r.id, name: r.name, email: r.email, adminScope: r.admin_scope || "full", createdAt: r.created_at })) });
});
usersRouter.patch("/:id/admin-scope", requireAuth, requireAdminScope(), (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'admin'").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Admin account not found." });
  const { scope } = req.body || {};
  if (!ADMIN_SCOPES.includes(scope)) return res.status(400).json({ error: "Invalid admin scope." });
  db.prepare("UPDATE users SET admin_scope = ? WHERE id = ?").run(scope, req.params.id);
  db.prepare("INSERT INTO activity_log (id, action, text, icon, actor) VALUES (?, 'admin.scope_change', ?, 'shield', ?)")
    .run(nextId("l", "activity_log"), `Set ${row.name}'s admin scope to ${scope}`, `${req.user.name} (${req.user.role})`);
  res.json({ admin: { id: row.id, name: row.name, email: row.email, adminScope: scope } });
});

usersRouter.patch("/:id/suspend", requireAuth, requireAdminScope("support", "moderator"), (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "User not found." });
  const suspend = !row.suspended;
  const reason = req.body?.reason || null;
  db.prepare("UPDATE users SET suspended = ?, suspension_reason = ?, suspended_at = ? WHERE id = ?")
    .run(suspend ? 1 : 0, suspend ? reason : null, suspend ? new Date().toISOString() : null, req.params.id);
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  res.json({ user: publicUser(updated) });
});

/* Real hard-delete / GDPR-style erasure - removes every piece of the seeker's personal data
   this app stores (CVs, saved searches, messages, reviews, references, payment methods, 2FA,
   saved jobs, follows, enrolments, invites) and anonymizes the account record itself. The
   users row is kept rather than actually dropped, so applications/interviews an employer
   already has on file don't dangle - this mirrors how real erasure requests are handled when
   another party has a legitimate retained copy of a transaction record. */
usersRouter.delete("/:id", requireAuth, requireAdminScope(), (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'seeker'").get(req.params.id);
  if (!row) return res.status(404).json({ error: "User not found." });
  const id = req.params.id;
  db.prepare("DELETE FROM cvs WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM saved_searches WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM messages WHERE from_user_id = ? OR to_user_id = ?").run(id, id);
  db.prepare("DELETE FROM reviews WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM saved_jobs WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM followed_employers WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM training_enrolments WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM invited_candidates WHERE candidate_id = ?").run(id);
  db.prepare("DELETE FROM reference_contacts WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM payment_methods WHERE owner_id = ?").run(id);
  db.prepare("DELETE FROM two_factor WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM user_settings WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM notifications WHERE for_value = ?").run(id);
  const { hash, salt } = hashPassword(crypto.randomBytes(24).toString("hex"));
  db.prepare(
    `UPDATE users SET name = 'Deleted user', email = ?, password_hash = ?, password_salt = ?, phone = NULL,
       skills_json = '[]', summary = NULL, default_cv = NULL, suspended = 1, suspension_reason = 'Account erased', suspended_at = datetime('now')
     WHERE id = ?`
  ).run(`deleted-${id}@erased.northhire.ca`, hash, salt, id);
  db.prepare("INSERT INTO activity_log (id, action, text, icon, actor) VALUES (?, 'user.erase', ?, 'trash', ?)")
    .run(nextId("l", "activity_log"), `Erased account for ${row.name}`, `${req.user.name} (${req.user.role})`);
  res.json({ ok: true });
});
