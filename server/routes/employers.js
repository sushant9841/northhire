import crypto from "node:crypto";
import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireRole, requireAdminScope, hashPassword, createSessionCookie, publicUser, hasAdminScope } from "../auth.js";
import { serializeEmployer } from "../serialize.js";
import { getConfig } from "../platformConfig.js";
import { storeUpload, listUploads, getUpload, deleteUpload } from "../uploads.js";
import { sendAndLogMail } from "../mail.js";
import { validateConditions, validateActions, RuleValidationError } from "../lib/workflowRules.js";
import { DEMOGRAPHIC_FIELDS, suppressedBucket } from "../lib/demographics.js";

export const employersRouter = Router();

// Records one team-management event. Called from the invite/remove/revoke handlers below so a
// per-employer audit trail actually accumulates - the tracker flagged that seat management had no
// paper trail of who did what. Never fails the request even if logging fails, since a failure to
// audit is not a good reason to also fail the operation the audit was going to record.
function logEmployerAudit(employerId, actor, action, detail) {
  try {
    db.prepare("INSERT INTO employer_audit_log (id, employer_id, actor_user_id, actor_name, action, detail) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nextId("eal", "employer_audit_log"), employerId, actor?.id || null, actor?.name || "unknown", action, detail);
  } catch (e) { console.error("audit log:", e.message); }
}

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

/* Priority-4 #6 - the employer-side "Silver medalist matches" card on EmpPipeline. Server-enforced
   to req.user.employer_id exactly like candidate-notes/candidate-outreach above, so one employer
   can never see another's matched candidates. Bare ids only (seekerId/jobId) - the client already
   holds `people`/`jobs` and resolves via A.person()/A.job(), same as reverseMatch's candidates. */
employersRouter.get("/silver-medalist-matches", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM silver_medalist_matches WHERE employer_id = ? AND dismissed_at IS NULL ORDER BY matched_at DESC"
  ).all(req.user.employer_id);
  res.json({
    matches: rows.map(r => ({
      id: r.id, jobId: r.job_id, seekerId: r.seeker_id,
      overlapScore: r.overlap_score, matchedAt: sqlTime(r.matched_at).getTime(),
    })),
  });
});
employersRouter.patch("/silver-medalist-matches/:id/dismiss", requireAuth, requireRole("employer"), (req, res) => {
  const row = db.prepare("SELECT * FROM silver_medalist_matches WHERE id = ? AND employer_id = ?").get(req.params.id, req.user.employer_id);
  if (!row) return res.status(404).json({ error: "Match not found." });
  db.prepare("UPDATE silver_medalist_matches SET dismissed_at = datetime('now') WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

/* Real outreach-history timeline for the talent pool - unifies every actual touch this company's
   team has had with a candidate (invites, messages either direction, the private note) into one
   chronological feed, instead of the talent pool being a one-shot list with no memory of past
   contact. Scoped to req.user.employer_id throughout, so an employer only ever sees its own
   team's history with a candidate, never another company's. */
employersRouter.get("/candidate-outreach/:candidateId", requireAuth, requireRole("employer"), (req, res) => {
  const candidateId = req.params.candidateId;
  const events = [];
  const invites = db.prepare(
    `SELECT invited_candidates.created_at AS at, jobs.title AS job_title FROM invited_candidates
     JOIN jobs ON jobs.id = invited_candidates.job_id
     WHERE jobs.employer_id = ? AND invited_candidates.candidate_id = ?`
  ).all(req.user.employer_id, candidateId);
  invites.forEach(i => events.push({ type: "invite", at: sqlTime(i.at).getTime(), detail: `Invited to apply: ${i.job_title}` }));

  const messages = db.prepare(
    `SELECT m.*, sender.name AS senderName FROM messages m JOIN users sender ON sender.id = m.from_user_id
     WHERE (m.from_user_id IN (SELECT id FROM users WHERE employer_id = ?) AND m.to_user_id = ?)
        OR (m.to_user_id IN (SELECT id FROM users WHERE employer_id = ?) AND m.from_user_id = ?)`
  ).all(req.user.employer_id, candidateId, req.user.employer_id, candidateId);
  messages.forEach(m => events.push({
    type: "message", at: sqlTime(m.created_at).getTime(),
    detail: m.to_user_id === candidateId ? `${m.senderName} messaged: "${m.text.slice(0, 80)}${m.text.length > 80 ? "…" : ""}"` : `Candidate replied: "${m.text.slice(0, 80)}${m.text.length > 80 ? "…" : ""}"`,
  }));

  const note = db.prepare("SELECT * FROM candidate_notes WHERE employer_id = ? AND candidate_id = ?").get(req.user.employer_id, candidateId);
  if (note && note.note.trim()) events.push({ type: "note", at: sqlTime(note.created_at).getTime(), detail: `Note: "${note.note.slice(0, 100)}${note.note.length > 100 ? "…" : ""}"` });

  events.sort((a, b) => b.at - a.at);
  res.json({ events });
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
// Message templates / canned responses - contained to the employer's own account, no cross-tenant
// sharing, so any teammate on the account sees and can use every template.
/* ─── Custom hiring pipeline stages (Growth+) ──────────────────────────────────────────────
   Sold on Growth and Enterprise but never implemented - every company shared one hardcoded
   six-stage set. The plan gate is enforced here, not only in the UI.

   The dangerous edit is removing or renaming a stage that still holds applications: those rows
   would keep a stage string no column of the board renders, and the candidates in them would
   silently vanish from the pipeline. Rather than silently remapping someone's candidates, a
   destructive save is refused and names exactly which stages are still occupied. */
const DEFAULT_PIPELINE_STAGES = ["Applied", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired"];

employersRouter.get("/pipeline-stages", requireAuth, requireRole("employer"), (req, res) => {
  const employer = db.prepare("SELECT pipeline_stages_json, plan FROM employers WHERE id = ?").get(req.user.employer_id);
  const custom = employer?.pipeline_stages_json ? JSON.parse(employer.pipeline_stages_json) : null;
  res.json({
    stages: custom || DEFAULT_PIPELINE_STAGES,
    isCustom: !!custom,
    defaultStages: DEFAULT_PIPELINE_STAGES,
    canCustomise: !!getConfig("plans")[employer?.plan || "Free"]?.customStages,
  });
});

employersRouter.put("/pipeline-stages", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can change pipeline stages." });
  const employerId = req.user.employer_id;
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(employerId);
  if (!getConfig("plans")[employer?.plan || "Free"]?.customStages) {
    return res.status(403).json({ error: "Custom pipeline stages are available on Growth and above." });
  }

  const raw = Array.isArray(req.body?.stages) ? req.body.stages : null;
  if (!raw) return res.status(400).json({ error: "Send a `stages` array." });
  const stages = raw.map(s => String(s || "").trim()).filter(Boolean);
  if (stages.length < 2) return res.status(400).json({ error: "A pipeline needs at least two stages." });
  if (stages.length > 10) return res.status(400).json({ error: "A pipeline can have at most 10 stages." });
  if (stages.some(s => s.length > 32)) return res.status(400).json({ error: "Stage names are limited to 32 characters." });
  if (new Set(stages.map(s => s.toLowerCase())).size !== stages.length) {
    return res.status(400).json({ error: "Stage names have to be unique." });
  }
  // "Withdrawn" is the terminal state a rejection or withdrawal writes; it isn't a board column
  // and must not be redefinable as one, or a rejected candidate would reappear mid-pipeline.
  if (stages.some(s => s.toLowerCase() === "withdrawn")) {
    return res.status(400).json({ error: '"Withdrawn" is reserved for rejected and withdrawn applications.' });
  }

  const inUse = db.prepare(
    `SELECT applications.stage AS stage, COUNT(*) AS n
       FROM applications JOIN jobs ON jobs.id = applications.job_id
      WHERE jobs.employer_id = ? AND applications.stage != 'Withdrawn'
      GROUP BY applications.stage`
  ).all(employerId);
  const kept = new Set(stages);
  const orphaned = inUse.filter(r => !kept.has(r.stage));
  if (orphaned.length) {
    const detail = orphaned.map(r => `${r.stage} (${r.n})`).join(", ");
    return res.status(409).json({
      error: `These stages still hold candidates, so removing or renaming them would hide those applications: ${detail}. Move them first, then save.`,
    });
  }

  db.prepare("UPDATE employers SET pipeline_stages_json = ? WHERE id = ?").run(JSON.stringify(stages), employerId);
  res.json({ stages, isCustom: true });
});

employersRouter.get("/templates", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare("SELECT * FROM message_templates WHERE employer_id = ? ORDER BY created_at DESC").all(req.user.employer_id);
  res.json({ templates: rows.map(r => ({ id: r.id, name: r.name, body: r.body })) });
});
employersRouter.post("/templates", requireAuth, requireRole("employer"), (req, res) => {
  const { name, body } = req.body || {};
  if (!name?.trim() || !body?.trim()) return res.status(400).json({ error: "Name and message body are required." });
  const id = nextId("mt", "message_templates");
  db.prepare("INSERT INTO message_templates (id, employer_id, name, body) VALUES (?, ?, ?, ?)").run(id, req.user.employer_id, name.trim(), body.trim());
  res.status(201).json({ template: { id, name: name.trim(), body: body.trim() } });
});
employersRouter.delete("/templates/:id", requireAuth, requireRole("employer"), (req, res) => {
  const row = db.prepare("SELECT * FROM message_templates WHERE id = ?").get(req.params.id);
  if (!row || row.employer_id !== req.user.employer_id) return res.status(404).json({ error: "Template not found." });
  db.prepare("DELETE FROM message_templates WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* Stage-change automations. One rule per employer per stage: when a candidate moves to `stage`,
   the linked template is sent as a message from the person who ran the move (or the employer's
   first-created user when the move was made by webhook or bulk action). Merge fields honour the
   same {{name}}/{{job}}/{{company}} substitution as manual template use, so what's sent lines up
   with what an operator sees in the preview when they built the template. */
employersRouter.get("/automations", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare(
    `SELECT sa.*, mt.name AS template_name FROM stage_automations sa
     JOIN message_templates mt ON mt.id = sa.template_id
     WHERE sa.employer_id = ? ORDER BY sa.stage ASC`
  ).all(req.user.employer_id);
  res.json({ automations: rows.map(r => ({ stage: r.stage, templateId: r.template_id, templateName: r.template_name, enabled: !!r.enabled })) });
});
employersRouter.put("/automations/:stage", requireAuth, requireRole("employer"), (req, res) => {
  const stage = req.params.stage;
  const { templateId, enabled = true } = req.body || {};
  if (!templateId) {
    db.prepare("DELETE FROM stage_automations WHERE employer_id = ? AND stage = ?").run(req.user.employer_id, stage);
    return res.json({ ok: true });
  }
  const tpl = db.prepare("SELECT id FROM message_templates WHERE id = ? AND employer_id = ?").get(templateId, req.user.employer_id);
  if (!tpl) return res.status(404).json({ error: "Template not found on your account." });
  db.prepare(
    `INSERT INTO stage_automations (employer_id, stage, template_id, enabled) VALUES (?, ?, ?, ?)
     ON CONFLICT(employer_id, stage) DO UPDATE SET template_id = excluded.template_id, enabled = excluded.enabled`
  ).run(req.user.employer_id, stage, templateId, enabled ? 1 : 0);
  res.json({ ok: true });
});

/* ─── Workflow rules engine (Priority-4 #2) ───
   A general IF/THEN rule builder that supersedes the single-rule-per-stage automation above for
   anything more elaborate than "send this template on this stage" - stage_automations keeps
   firing unaltered so nobody's existing binding silently breaks. Creating/editing/deleting rules
   is restricted to the account owner, same as pipeline-stage customisation - these rules can move
   candidates and send mail on their behalf, which is not something a regular teammate seat should
   be able to set up unilaterally. */
function serializeWorkflowRule(row) {
  return {
    id: row.id, name: row.name,
    conditions: JSON.parse(row.conditions_json || '{"type":"group","op":"and","children":[]}'),
    actions: JSON.parse(row.actions_json || "[]"),
    enabled: !!row.enabled,
    createdAt: sqlTime(row.created_at).getTime(), updatedAt: sqlTime(row.updated_at).getTime(),
  };
}
employersRouter.get("/workflow-rules", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare("SELECT * FROM workflow_rules WHERE employer_id = ? ORDER BY created_at DESC").all(req.user.employer_id);
  res.json({ rules: rows.map(serializeWorkflowRule) });
});
employersRouter.post("/workflow-rules", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can create workflow rules." });
  const { name, conditions, actions, enabled = true } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  try {
    const cleanConditions = validateConditions(conditions);
    const cleanActions = validateActions(actions);
    const id = nextId("wr", "workflow_rules");
    db.prepare(
      "INSERT INTO workflow_rules (id, employer_id, name, conditions_json, actions_json, enabled) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, req.user.employer_id, name.trim(), JSON.stringify(cleanConditions), JSON.stringify(cleanActions), enabled ? 1 : 0);
    const row = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(id);
    res.status(201).json({ rule: serializeWorkflowRule(row) });
  } catch (e) {
    if (e instanceof RuleValidationError) return res.status(400).json({ error: e.message });
    throw e;
  }
});
employersRouter.put("/workflow-rules/:id", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can edit workflow rules." });
  const row = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(req.params.id);
  if (!row || row.employer_id !== req.user.employer_id) return res.status(404).json({ error: "Rule not found." });
  const { name, conditions, actions, enabled } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  try {
    const cleanConditions = validateConditions(conditions);
    const cleanActions = validateActions(actions);
    db.prepare(
      "UPDATE workflow_rules SET name = ?, conditions_json = ?, actions_json = ?, enabled = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(name.trim(), JSON.stringify(cleanConditions), JSON.stringify(cleanActions), enabled === false ? 0 : 1, req.params.id);
    const updated = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(req.params.id);
    res.json({ rule: serializeWorkflowRule(updated) });
  } catch (e) {
    if (e instanceof RuleValidationError) return res.status(400).json({ error: e.message });
    throw e;
  }
});
employersRouter.patch("/workflow-rules/:id/enabled", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can change workflow rules." });
  const row = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(req.params.id);
  if (!row || row.employer_id !== req.user.employer_id) return res.status(404).json({ error: "Rule not found." });
  db.prepare("UPDATE workflow_rules SET enabled = ?, updated_at = datetime('now') WHERE id = ?").run(req.body?.enabled ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
employersRouter.delete("/workflow-rules/:id", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can delete workflow rules." });
  const row = db.prepare("SELECT * FROM workflow_rules WHERE id = ?").get(req.params.id);
  if (!row || row.employer_id !== req.user.employer_id) return res.status(404).json({ error: "Rule not found." });
  // Tasks a deleted rule already created are real work items, not orphans to cascade-delete -
  // detach them from the (now gone) rule rather than losing the FK integrity check on delete.
  db.prepare("UPDATE workflow_tasks SET rule_id = NULL WHERE rule_id = ?").run(req.params.id);
  db.prepare("DELETE FROM workflow_rules WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

employersRouter.get("/team", requireAuth, requireRole("employer"), (req, res) => {
  const members = db.prepare("SELECT id, name, email, employer_role, created_at FROM users WHERE employer_id = ? ORDER BY created_at ASC")
    .all(req.user.employer_id)
    .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.employer_role, joinedAt: sqlTime(u.created_at).getTime() }));
  const invites = db.prepare("SELECT * FROM employer_invites WHERE employer_id = ? AND status = 'pending' ORDER BY created_at DESC")
    .all(req.user.employer_id).map(serializeInvite);
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(req.user.employer_id);
  const rawLimit = getConfig("plans")[employer?.plan || "Free"]?.seats ?? 1;
  // Infinity (Enterprise's unlimited seats) silently serializes to null over JSON - send null
  // deliberately as the "unlimited" sentinel instead of letting that happen by accident.
  res.json({ members, invites, seatLimit: rawLimit === Infinity ? null : rawLimit, seatsUsed: members.length + invites.length });
});
employersRouter.post("/team/invite", requireAuth, requireRole("employer"), async (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can invite teammates." });
  const email = (req.body?.email || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Enter a valid email address." });
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return res.status(409).json({ error: "That email already has a NorthHire account." });
  if (db.prepare("SELECT id FROM employer_invites WHERE employer_id = ? AND email = ? AND status = 'pending'").get(req.user.employer_id, email))
    return res.status(409).json({ error: "There's already a pending invite for that email." });
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(req.user.employer_id);
  const seatLimit = getConfig("plans")[employer?.plan || "Free"]?.seats ?? 1;
  const seatsUsed = db.prepare("SELECT COUNT(*) AS n FROM users WHERE employer_id = ?").get(req.user.employer_id).n
    + db.prepare("SELECT COUNT(*) AS n FROM employer_invites WHERE employer_id = ? AND status = 'pending'").get(req.user.employer_id).n;
  if (seatsUsed >= seatLimit) return res.status(403).json({ error: `Your plan includes ${seatLimit} seat${seatLimit === 1 ? "" : "s"}. Remove a teammate or upgrade to invite another.` });
  const id = nextId("inv", "employer_invites");
  const token = crypto.randomBytes(20).toString("hex");
  db.prepare("INSERT INTO employer_invites (id, employer_id, email, invited_by, token) VALUES (?, ?, ?, ?, ?)").run(id, req.user.employer_id, email, req.user.id, token);
  await sendAndLogMail(email, "You have been invited to a NorthHire employer account", `${req.user.name} invited you to join their team on NorthHire. Your invite code: ${token}`);
  logEmployerAudit(req.user.employer_id, req.user, "team.invite.sent", `Invited ${email}`);
  // The invited person has no account yet, so they can't check their own /auth/outbox even though
  // the email really was sent (to their Ethereal-sandboxed inbox) - also return the link straight
  // to the owner so this demo doesn't require digging up a preview URL to test the invite flow.
  res.status(201).json({ invite: serializeInvite(db.prepare("SELECT * FROM employer_invites WHERE id = ?").get(id)), inviteToken: token });
});
employersRouter.delete("/team/invite/:id", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can revoke invites." });
  const row = db.prepare("SELECT * FROM employer_invites WHERE id = ? AND employer_id = ?").get(req.params.id, req.user.employer_id);
  if (!row) return res.status(404).json({ error: "Invite not found." });
  db.prepare("UPDATE employer_invites SET status = 'revoked' WHERE id = ?").run(req.params.id);
  logEmployerAudit(req.user.employer_id, req.user, "team.invite.revoked", `Revoked invite to ${row.email}`);
  res.json({ ok: true });
});
employersRouter.delete("/team/:userId", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can remove teammates." });
  if (req.params.userId === req.user.id) return res.status(400).json({ error: "You can't remove yourself." });
  const target = db.prepare("SELECT * FROM users WHERE id = ? AND employer_id = ?").get(req.params.userId, req.user.employer_id);
  if (!target) return res.status(404).json({ error: "Teammate not found." });
  if (target.employer_role === "owner") return res.status(400).json({ error: "Transfer ownership before removing an owner." });
  db.prepare("UPDATE users SET employer_id = NULL WHERE id = ?").run(req.params.userId);
  logEmployerAudit(req.user.employer_id, req.user, "team.member.removed", `Removed ${target.name} (${target.email})`);
  res.json({ ok: true });
});

// Read the audit trail. Any teammate on the account can see it, not just the owner - so a member
// who was removed and later reinstated (or a new owner after a transfer) can review what happened
// on the account they now have access to.
employersRouter.get("/team/audit", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare("SELECT * FROM employer_audit_log WHERE employer_id = ? ORDER BY created_at DESC LIMIT 200")
    .all(req.user.employer_id);
  res.json({ events: rows.map(r => ({
    id: r.id, action: r.action, detail: r.detail,
    actorName: r.actor_name, at: sqlTime(r.created_at).getTime(),
  })) });
});

// Post-checkout welcome screen (E6): stamped once the employer dismisses or tours the welcome
// screen for their CURRENT plan, so it never reappears for that same plan again but does show
// again after any future plan change (up or down).
employersRouter.post("/welcome-seen", requireAuth, requireRole("employer"), (req, res) => {
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(req.user.employer_id);
  if (!employer) return res.status(404).json({ error: "Employer not found." });
  db.prepare("UPDATE employers SET welcome_seen_plan = ? WHERE id = ?").run(employer.plan, req.user.employer_id);
  res.json({ ok: true });
});

// Cities/provinces this employer has actually posted a job in before, so the location
// autocomplete can surface "your own past locations" above the generic gazette - registered
// before the generic "/:id" route or "me" would be swallowed as an employer id lookup.
employersRouter.get("/me/locations", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare(
    `SELECT DISTINCT city, prov FROM jobs WHERE employer_id = ? AND city IS NOT NULL AND prov IS NOT NULL ORDER BY city`
  ).all(req.user.employer_id);
  res.json({ locations: rows.map(r => ({ city: r.city, province: r.prov })) });
});

/* Priority-4 #3 - Diversity of your applicant pool, opt-in aggregate reporting. Every bucket is
   built server-side from user_demographics joined against this employer's own applicants/hires -
   the server does the suppression (never returns a raw count under SUPPRESSION_FLOOR), so there
   is no client code path that could ever receive, let alone render, an identifying small number. */
employersRouter.get("/me/demographics-aggregate", requireAuth, requireRole("employer"), (req, res) => {
  const employerId = req.user.employer_id;
  const applicantIds = db.prepare(
    `SELECT DISTINCT applications.user_id AS id FROM applications
     JOIN jobs ON jobs.id = applications.job_id WHERE jobs.employer_id = ?`
  ).all(employerId).map(r => r.id);
  const hireIds = db.prepare(
    `SELECT DISTINCT applications.user_id AS id FROM applications
     JOIN jobs ON jobs.id = applications.job_id WHERE jobs.employer_id = ? AND applications.stage = 'Hired'`
  ).all(employerId).map(r => r.id);

  const bucketsFor = (ids, field) => {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = db.prepare(
      `SELECT value, COUNT(*) AS n FROM user_demographics WHERE field = ? AND user_id IN (${placeholders}) GROUP BY value`
    ).all(field, ...ids);
    return rows.map(r => suppressedBucket(r.value, r.n));
  };

  const fields = {};
  for (const field of Object.keys(DEMOGRAPHIC_FIELDS)) {
    fields[field] = { applicants: bucketsFor(applicantIds, field), hires: bucketsFor(hireIds, field) };
  }
  const respondentCount = applicantIds.length
    ? db.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_demographics WHERE user_id IN (${applicantIds.map(() => "?").join(",")})`).get(...applicantIds).n
    : 0;
  res.json({ totalApplicants: applicantIds.length, totalHires: hireIds.length, respondentCount, fields });
});

/* Priority-4 #4 - daily-snapshot analytics, employer-scoped. `metric` optional: one of
   applications/live_jobs/hires returns that series alone; omitted returns all three keyed by
   name. Gaps (days with nothing captured) are filled with 0 so a sparkline never has holes. */
employersRouter.get("/me/snapshots", requireAuth, requireRole("employer"), (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 60));
  const metric = req.query.metric;
  const validMetrics = ["applications", "live_jobs", "hires"];
  if (metric && !validMetrics.includes(metric)) return res.status(400).json({ error: "Unknown metric." });
  const metrics = metric ? [metric] : validMetrics;
  const dateList = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - i);
    dateList.push(d.toISOString().slice(0, 10));
  }
  const series = {};
  for (const m of metrics) {
    const rows = db.prepare(
      `SELECT date, value FROM daily_snapshots WHERE metric = ? AND dimension = ? AND date >= ? ORDER BY date ASC`
    ).all(m, req.user.employer_id, dateList[0]);
    const byDate = Object.fromEntries(rows.map(r => [r.date, r.value]));
    series[m] = dateList.map(date => ({ date, value: byDate[date] || 0 }));
  }
  res.json(metric ? { days, metric, series: series[metric] } : { days, series });
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
    if (!hasAdminScope(req.user, "moderator")) return res.status(403).json({ error: "This admin account doesn't have access to employer verification." });
    db.prepare("UPDATE employers SET verified = ?, hold = CASE WHEN ? THEN 0 ELSE hold END WHERE id = ?")
      .run(verified ? 1 : 0, verified ? 1 : 0, req.params.id);
  }
  if (hold !== undefined) {
    if (!isAdmin) return res.status(403).json({ error: "Only an administrator can hold a company." });
    if (!hasAdminScope(req.user, "moderator")) return res.status(403).json({ error: "This admin account doesn't have access to employer holds." });
    db.prepare("UPDATE employers SET hold = ? WHERE id = ?").run(hold ? 1 : 0, req.params.id);
  }
  if (plan !== undefined) {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Not your company." });
    if (isAdmin && !hasAdminScope(req.user, "finance")) return res.status(403).json({ error: "This admin account doesn't have access to plan changes." });
    // An owner can only self-serve down to a free plan here - moving onto any priced plan has to
    // go through real Stripe checkout (POST /billing/checkout), not a direct PATCH. An admin
    // (finance scope) can still set any plan directly, for comps/trials/support overrides.
    const targetPrice = getConfig("plans")[plan]?.price ?? 0;
    if (isOwner && !isAdmin && targetPrice > 0) return res.status(402).json({ error: "Upgrading to a paid plan requires checkout." });
    db.prepare("UPDATE employers SET plan = ? WHERE id = ?").run(plan, req.params.id);
  }
  const fieldMap = { name: "name", industry: "industry", city: "city", prov: "prov", size: "size", about: "about", site: "site", businessNumber: "business_number", founded: "founded", mark: "mark", a: "a", b: "b" };
  const BRAND_FIELDS = ["mark", "a", "b"];
  let setCols = Object.keys(profileFields).filter(k => fieldMap[k]);
  if (setCols.length) {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Not your company." });
    // Custom logo mark / brand colour is a Growth+ feature — silently drop those fields for a
    // Free-plan company instead of erroring, so the rest of the profile save still succeeds.
    if (!isAdmin && BRAND_FIELDS.some(k => setCols.includes(k))) {
      const plans = getConfig("plans");
      const plan = plans[row.plan] || plans.Free;
      if (!plan.branded) setCols = setCols.filter(k => !BRAND_FIELDS.includes(k));
    }
  }
  if (setCols.length) {
    const stmt = db.prepare(`UPDATE employers SET ${setCols.map(k => `${fieldMap[k]} = ?`).join(", ")} WHERE id = ?`);
    stmt.run(...setCols.map(k => profileFields[k]), req.params.id);
  }

  const updated = db.prepare(`${WITH_OWNER} WHERE employers.id = ?`).get(req.params.id);
  res.json({ employer: serializeEmployer(updated) });
});

/* ─── Incorporation / verification documents ────────────────────────────────────────────────
   The signup wizard promises business-number and incorporation verification. The business number
   was already collected; the document half was deferred as "needs file upload", which was stale —
   see server/uploads.js. An employer uploads their own proof; a moderator-scope admin reviews it
   alongside the other verification evidence. */
employersRouter.get("/verification-documents", requireAuth, requireRole("employer"), (req, res) => {
  res.json({ documents: listUploads("incorporation", "employer", req.user.employer_id) });
});

employersRouter.post("/verification-documents", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can upload verification documents." });
  const r = storeUpload({
    kind: "incorporation", ownerType: "employer", ownerId: req.user.employer_id,
    name: req.body?.name, dataUrl: req.body?.dataUrl, uploadedBy: req.user.name,
  });
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.status(201).json({ document: listUploads("incorporation", "employer", req.user.employer_id).find(d => d.id === r.id) });
});

employersRouter.delete("/verification-documents/:id", requireAuth, requireRole("employer"), (req, res) => {
  const row = getUpload(req.params.id);
  if (!row || row.owner_type !== "employer" || row.owner_id !== req.user.employer_id) return res.status(404).json({ error: "Not found." });
  deleteUpload(req.params.id);
  res.json({ ok: true });
});

/* Admin review. Scoped to moderators (the role that already approves/holds employers) — an
   incorporation certificate carries real business identity data, so it isn't readable by every
   admin scope, including readonly. */
employersRouter.get("/:id/verification-documents", requireAuth, requireAdminScope("moderator"), (req, res) => {
  res.json({ documents: listUploads("incorporation", "employer", req.params.id) });
});

employersRouter.get("/verification-documents/file/:docId", requireAuth, (req, res) => {
  const row = getUpload(req.params.docId);
  if (!row || row.kind !== "incorporation") return res.status(404).json({ error: "Not found." });
  const isOwningEmployer = req.user.role === "employer" && row.owner_id === req.user.employer_id;
  const isReviewer = req.user.role === "admin" && hasAdminScope(req.user, "moderator");
  if (!isOwningEmployer && !isReviewer) return res.status(403).json({ error: "Not allowed." });
  res.json({ id: row.id, name: row.name, dataUrl: row.data_url });
});
