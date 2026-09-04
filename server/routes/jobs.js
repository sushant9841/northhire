import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeJob } from "../serialize.js";

export const jobsRouter = Router();

jobsRouter.get("/", (req, res) => {
  const { q, cat, city, prov, type, mode, minPay, employerId, status } = req.query;
  const clauses = [];
  const params = [];

  if (status) { clauses.push("status = ?"); params.push(status); }
  else { clauses.push("status = 'live'"); }

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
  // A real view counter, incremented once per detail fetch - the audit flagged the frontend's
  // equivalent for inflating views on employer preview clicks; this endpoint is only ever hit
  // by an actual job-detail page view, so incrementing here is honest.
  db.prepare("UPDATE jobs SET views = views + 1 WHERE id = ?").run(req.params.id);
  res.json({ job: serializeJob({ ...row, views: row.views + 1 }) });
});

jobsRouter.post("/", requireAuth, requireRole("employer"), (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.desc) return res.status(400).json({ error: "Title and description are required." });
  const id = nextId("j", "jobs");
  db.prepare(
    `INSERT INTO jobs (id, employer_id, title, cat, city, prov, type, mode, pay_lo, pay_hi, pay_unit,
       vacancies, experience, education, deadline_date, urgent, featured, skills_json, perks_json,
       description, duties_json, requirements_json, how_to_apply, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, req.user.employer_id, b.title, b.cat || null, b.city || null, b.prov || null, b.type || null, b.mode || null,
    b.lo ?? null, b.hi ?? null, b.unit || null, b.vac ?? 1, b.exp || null, b.edu || null, b.dlDate || null,
    b.urgent ? 1 : 0, b.featured ? 1 : 0, JSON.stringify(b.skills || []), JSON.stringify(b.perks || []),
    b.desc, JSON.stringify(b.duties || []), JSON.stringify(b.reqs || []), b.how || null, "review"
  );
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  res.status(201).json({ job: serializeJob(row) });
});

jobsRouter.patch("/:id", requireAuth, requireRole("employer"), (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your listing." });
  const status = req.body?.status;
  if (status && !["live", "paused", "review", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  if (status) db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(status, req.params.id);
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  res.json({ job: serializeJob(row) });
});
