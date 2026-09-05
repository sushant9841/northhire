import crypto from "node:crypto";
import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireRole, hashPassword, createSessionCookie, publicUser } from "../auth.js";
import { serializeEmployer } from "../serialize.js";
import { PLANS } from "../../src/store/seed/constants.js";

export const employersRouter = Router();

// Employer contact/owner is a real relation (users.employer_id), not a denormalized field on
// employers - joined in here so the frontend's existing `e.owner`/`e.ownerName` reads keep working.
const WITH_OWNER = `
  SELECT employers.*, owner.email AS owner, owner.name AS ownerName
  FROM employers
  LEFT JOIN users AS owner ON owner.employer_id = employers.id AND owner.role = 'employer'
    AND owner.id = (SELECT id FROM users WHERE employer_id = employers.id AND role = 'employer' ORDER BY created_at ASC LIMIT 1)
`;

employersRouter.get("/", (req, res) => {
  const rows = db.prepare(`${WITH_OWNER} ORDER BY employers.name`).all();
  res.json({ employers: rows.map(serializeEmployer) });
});

/* Must come before GET /:id, or "candidate-notes" would itself be matched as an :id. */
function serializeCandidateNote(row) {
  if (!row) return null;
  return { candidate: row.candidate_id, note: row.note, tags: JSON.parse(row.tags_json || "[]"), updatedAt: sqlTime(row.created_at).getTime() };
}
employersRouter.get("/candidate-notes", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare("SELECT * FROM candidate_notes WHERE employer_id = ?").all(req.user.employer_id);
  res.json({ notes: rows.map(serializeCandidateNote) });
});
employersRouter.put("/candidate-notes/:candidateId", requireAuth, requireRole("employer"), (req, res) => {
  const { note, tags } = req.body || {};
  const existing = db.prepare("SELECT * FROM candidate_notes WHERE employer_id = ? AND candidate_id = ?").get(req.user.employer_id, req.params.candidateId);
  if (existing) {
    db.prepare("UPDATE candidate_notes SET note = ?, tags_json = ?, created_by = ?, created_at = datetime('now') WHERE id = ?")
      .run(note || "", JSON.stringify(tags || []), req.user.name, existing.id);
  } else {
    db.prepare("INSERT INTO candidate_notes (id, employer_id, candidate_id, note, tags_json, created_by) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nextId("cn", "candidate_notes"), req.user.employer_id, req.params.candidateId, note || "", JSON.stringify(tags || []), req.user.name);
  }
  const row = db.prepare("SELECT * FROM candidate_notes WHERE employer_id = ? AND candidate_id = ?").get(req.user.employer_id, req.params.candidateId);
  res.json({ note: serializeCandidateNote(row) });
});

/* ─── Teammate seats ───
   Plans advertise up to 5 (Growth) or unlimited (Enterprise) recruiter seats, but until now the
   product only ever supported one login per company. users.employer_id already allowed more
   than one account per employer (no unique constraint) - the real gap was entirely in the
   application layer: no invite flow, no per-seat role, no seat-limit enforcement. */
function serializeInvite(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, status: row.status, createdAt: sqlTime(row.created_at).getTime() };
}
employersRouter.get("/team", requireAuth, requireRole("employer"), (req, res) => {
  const members = db.prepare("SELECT id, name, email, employer_role, created_at FROM users WHERE employer_id = ? ORDER BY created_at ASC")
    .all(req.user.employer_id)
    .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.employer_role, joinedAt: sqlTime(u.created_at).getTime() }));
  const invites = db.prepare("SELECT * FROM employer_invites WHERE employer_id = ? AND status = 'pending' ORDER BY created_at DESC")
    .all(req.user.employer_id).map(serializeInvite);
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(req.user.employer_id);
  const rawLimit = PLANS[employer?.plan || "Free"]?.seats ?? 1;
  // Infinity (Enterprise's unlimited seats) silently serializes to null over JSON - send null
  // deliberately as the "unlimited" sentinel instead of letting that happen by accident.
  res.json({ members, invites, seatLimit: rawLimit === Infinity ? null : rawLimit, seatsUsed: members.length + invites.length });
});
employersRouter.post("/team/invite", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can invite teammates." });
  const email = (req.body?.email || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Enter a valid email address." });
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return res.status(409).json({ error: "That email already has a NorthHire account." });
  if (db.prepare("SELECT id FROM employer_invites WHERE employer_id = ? AND email = ? AND status = 'pending'").get(req.user.employer_id, email))
    return res.status(409).json({ error: "There's already a pending invite for that email." });
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(req.user.employer_id);
  const seatLimit = PLANS[employer?.plan || "Free"]?.seats ?? 1;
  const seatsUsed = db.prepare("SELECT COUNT(*) AS n FROM users WHERE employer_id = ?").get(req.user.employer_id).n
    + db.prepare("SELECT COUNT(*) AS n FROM employer_invites WHERE employer_id = ? AND status = 'pending'").get(req.user.employer_id).n;
  if (seatsUsed >= seatLimit) return res.status(403).json({ error: `Your plan includes ${seatLimit} seat${seatLimit === 1 ? "" : "s"}. Remove a teammate or upgrade to invite another.` });
  const id = nextId("inv", "employer_invites");
  const token = crypto.randomBytes(20).toString("hex");
  db.prepare("INSERT INTO employer_invites (id, employer_id, email, invited_by, token) VALUES (?, ?, ?, ?, ?)").run(id, req.user.employer_id, email, req.user.id, token);
  db.prepare("INSERT INTO outbox (id, to_email, subject, body) VALUES (?, ?, 'You have been invited to a NorthHire employer account', ?)")
    .run(nextId("m", "outbox"), email, `${req.user.name} invited you to join their team on NorthHire. Your invite code: ${token}`);
  // No real email delivery exists (the same honest ceiling as the reset-code/2FA flows) - the
  // invited person has no account yet, so they can't check their own /auth/outbox. Return the
  // link straight to the owner, who copies and sends it themselves for this demo.
  res.status(201).json({ invite: serializeInvite(db.prepare("SELECT * FROM employer_invites WHERE id = ?").get(id)), inviteToken: token });
});
employersRouter.delete("/team/invite/:id", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can revoke invites." });
  const row = db.prepare("SELECT * FROM employer_invites WHERE id = ? AND employer_id = ?").get(req.params.id, req.user.employer_id);
  if (!row) return res.status(404).json({ error: "Invite not found." });
  db.prepare("UPDATE employer_invites SET status = 'revoked' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
employersRouter.delete("/team/:userId", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can remove teammates." });
  if (req.params.userId === req.user.id) return res.status(400).json({ error: "You can't remove yourself." });
  const target = db.prepare("SELECT * FROM users WHERE id = ? AND employer_id = ?").get(req.params.userId, req.user.employer_id);
  if (!target) return res.status(404).json({ error: "Teammate not found." });
  if (target.employer_role === "owner") return res.status(400).json({ error: "Transfer ownership before removing an owner." });
  db.prepare("UPDATE users SET employer_id = NULL WHERE id = ?").run(req.params.userId);
  res.json({ ok: true });
});

employersRouter.get("/:id", (req, res) => {
  const row = db.prepare(`${WITH_OWNER} WHERE employers.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Employer not found." });
  res.json({ employer: serializeEmployer(row) });
});

employersRouter.patch("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM employers WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Employer not found." });
  const { verified, hold, plan, ...profileFields } = req.body || {};
  const isAdmin = req.user.role === "admin";
  const isOwner = req.user.role === "employer" && req.user.employer_id === req.params.id;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: "Not your company." });

  if (verified !== undefined) {
    if (!isAdmin) return res.status(403).json({ error: "Only an administrator can verify a company." });
    db.prepare("UPDATE employers SET verified = ?, hold = CASE WHEN ? THEN 0 ELSE hold END WHERE id = ?")
      .run(verified ? 1 : 0, verified ? 1 : 0, req.params.id);
  }
  if (hold !== undefined) {
    if (!isAdmin) return res.status(403).json({ error: "Only an administrator can hold a company." });
    db.prepare("UPDATE employers SET hold = ? WHERE id = ?").run(hold ? 1 : 0, req.params.id);
  }
  if (plan !== undefined) {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Not your company." });
    db.prepare("UPDATE employers SET plan = ? WHERE id = ?").run(plan, req.params.id);
  }
  const fieldMap = { name: "name", industry: "industry", city: "city", prov: "prov", size: "size", about: "about", site: "site", businessNumber: "business_number" };
  const setCols = Object.keys(profileFields).filter(k => fieldMap[k]);
  if (setCols.length) {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Not your company." });
    const stmt = db.prepare(`UPDATE employers SET ${setCols.map(k => `${fieldMap[k]} = ?`).join(", ")} WHERE id = ?`);
    stmt.run(...setCols.map(k => profileFields[k]), req.params.id);
  }

  const updated = db.prepare(`${WITH_OWNER} WHERE employers.id = ?`).get(req.params.id);
  res.json({ employer: serializeEmployer(updated) });
});
