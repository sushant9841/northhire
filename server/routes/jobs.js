import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeJob } from "../serialize.js";

export const jobsRouter = Router();

jobsRouter.get("/", (req, res) => {
  const { q, cat, city, prov, type, mode, minPay, employerId, status } = req.query;
  const clauses = [];
  const params = [];

  if (status && status !== "all") { clauses.push("status = ?"); params.push(status); }
  else if (!status) { clauses.push("status = 'live'"); }
  // status === "all" applies no status filter - used by an owning employer's "my jobs" list
  // and admin moderation, both of which need to see paused/review/closed listings too.

  if (employerId) { clauses.push("employer_id = ?"); params.push(employerId); }
  if (cat) { clauses.push("cat = ?"); params.push(cat); }
  if (city) { clauses.push("city = ?"); params.push(city); }
  if (prov) { clauses.push("prov = ?"); params.push(prov); }
  if (type) { clauses.push("type = ?"); params.push(type); }
  if (mode) { clauses.push("mode = ?"); params.push(mode); }
  if (minPay) { clauses.push("(pay_hi >= ? OR pay_lo >= ?)"); params.push(Number(minPay), Number(minPay)); }
  if (q) { clauses.push("(title LIKE ? OR description LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }

  const sql = `SELECT * FROM jobs${clauses.length ? " WHERE " + clauses.join(" AND ") : ""} ORDER BY created_at DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ jobs: rows.map(serializeJob) });
});

jobsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Job not found." });
  res.json({ job: serializeJob(row) });
});

jobsRouter.post("/:id/view", (req, res) => {
  // A real view counter, incremented only when a job-detail page actually renders (the caller
  // skips this for employer preview clicks) - the audit flagged the frontend's old equivalent
  // for inflating views on every preview open regardless of who was looking.
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Job not found." });
  db.prepare("UPDATE jobs SET views = views + 1 WHERE id = ?").run(req.params.id);
  res.json({ views: row.views + 1 });
});

jobsRouter.post("/", requireAuth, requireRole("employer"), (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.desc) return res.status(400).json({ error: "Title and description are required." });
  const initialStatus = b.status === "live" ? "live" : "review";
  const id = nextId("j", "jobs");
  db.prepare(
    `INSERT INTO jobs (id, employer_id, title, cat, city, prov, type, mode, pay_lo, pay_hi, pay_unit,
       vacancies, experience, education, deadline_date, urgent, featured, skills_json, perks_json,
       description, duties_json, requirements_json, how_to_apply, screening_questions_json, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, req.user.employer_id, b.title, b.cat || null, b.city || null, b.prov || null, b.type || null, b.mode || null,
    b.lo ?? null, b.hi ?? null, b.unit || null, b.vac ?? 1, b.exp || null, b.edu || null, b.dlDate || null,
    b.urgent ? 1 : 0, b.featured ? 1 : 0, JSON.stringify(b.skills || []), JSON.stringify(b.perks || []),
    b.desc, JSON.stringify(b.duties || []), JSON.stringify(b.reqs || []), b.how || null,
    // Employer-authored screening questions (yes/no, single/multiple choice, short/long answer) -
    // keep only the fields the applicant-facing form actually needs, capped at a sane count.
    JSON.stringify((b.questions || []).filter(q => q && q.prompt && q.prompt.trim()).slice(0, 10)
      .map(q => ({ id: q.id, type: q.type, prompt: q.prompt.trim(), required: !!q.required, options: Array.isArray(q.options) ? q.options : [] }))),
    initialStatus
  );
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  res.status(201).json({ job: serializeJob(row) });
});

jobsRouter.patch("/:id", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && job.employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your listing." });

  const { status, flagged } = req.body || {};
  if (status !== undefined) {
    if (!["live", "paused", "review", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status." });
    db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(status, req.params.id);
  }
  if (flagged !== undefined) {
    if (!isAdmin) return res.status(403).json({ error: "Only an administrator can flag a listing." });
    db.prepare("UPDATE jobs SET flagged = ? WHERE id = ?").run(flagged ? 1 : 0, req.params.id);
  }
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  res.json({ job: serializeJob(row) });
});

jobsRouter.post("/import-csv", requireAuth, requireRole("employer"), (req, res) => {
  const { jobs } = req.body || {};
  if (!Array.isArray(jobs) || !jobs.length) return res.status(400).json({ error: "No jobs to import." });
  const insert = db.prepare(
    `INSERT INTO jobs (id, employer_id, title, cat, city, prov, type, mode, pay_lo, pay_hi, pay_unit,
       vacancies, experience, education, skills_json, perks_json, description, duties_json,
       requirements_json, how_to_apply, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const createdIds = [];
  for (const b of jobs) {
    if (!b.title) continue;
    const id = nextId("j", "jobs");
    insert.run(
      id, req.user.employer_id, b.title, b.cat || null, b.city || null, b.prov || null,
      b.type || null, b.mode || null, b.lo ?? null, b.hi ?? null, b.unit || null, b.vac ?? 1,
      b.exp || null, b.edu || null, JSON.stringify(b.skills || []), JSON.stringify(b.perks || []),
      b.desc || `Hiring ${b.title}.`, JSON.stringify(b.duties || []), JSON.stringify(b.reqs || []),
      b.how || "Apply through NorthHire.", "review"
    );
    createdIds.push(id);
  }
  const created = createdIds.map(id => serializeJob(db.prepare("SELECT * FROM jobs WHERE id = ?").get(id)));
  res.status(201).json({ imported: created.length, jobs: created });
});
