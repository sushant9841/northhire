import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeEmployer } from "../serialize.js";

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
  return { candidate: row.candidate_id, note: row.note, tags: JSON.parse(row.tags_json || "[]"), updatedAt: new Date(row.created_at).getTime() };
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
  const fieldMap = { name: "name", industry: "industry", city: "city", prov: "prov", size: "size", about: "about", site: "site" };
  const setCols = Object.keys(profileFields).filter(k => fieldMap[k]);
  if (setCols.length) {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Not your company." });
    const stmt = db.prepare(`UPDATE employers SET ${setCols.map(k => `${fieldMap[k]} = ?`).join(", ")} WHERE id = ?`);
    stmt.run(...setCols.map(k => profileFields[k]), req.params.id);
  }

  const updated = db.prepare(`${WITH_OWNER} WHERE employers.id = ?`).get(req.params.id);
  res.json({ employer: serializeEmployer(updated) });
});
