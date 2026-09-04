import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeApplication } from "../serialize.js";

export const applicationsRouter = Router();

applicationsRouter.get("/mine", requireAuth, requireRole("seeker"), (req, res) => {
  const rows = db.prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ applications: rows.map(serializeApplication) });
});

applicationsRouter.get("/job/:jobId", requireAuth, requireRole("employer"), (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your listing." });
  const rows = db.prepare("SELECT * FROM applications WHERE job_id = ? ORDER BY created_at DESC").all(req.params.jobId);
  res.json({ applications: rows.map(serializeApplication) });
});

applicationsRouter.post("/", requireAuth, requireRole("seeker"), (req, res) => {
  const { jobId, availability, payExpectation, coverLetter } = req.body || {};
  const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'live'").get(jobId);
  if (!job) return res.status(404).json({ error: "This listing is no longer accepting applications." });

  const already = db.prepare("SELECT id FROM applications WHERE job_id = ? AND user_id = ?").get(jobId, req.user.id);
  if (already) return res.status(409).json({ error: "You've already applied to this job." });

  const id = nextId("a", "applications");
  db.prepare(
    `INSERT INTO applications (id, job_id, user_id, stage, availability, pay_expectation, cover_letter)
     VALUES (?, ?, ?, 'Applied', ?, ?, ?)`
  ).run(id, jobId, req.user.id, availability || null, payExpectation || null, coverLetter || null);

  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
  res.status(201).json({ application: serializeApplication(row) });
});

const STAGES = ["Applied", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired", "Rejected"];
applicationsRouter.patch("/:id/stage", requireAuth, requireRole("employer"), (req, res) => {
  const { stage } = req.body || {};
  if (!STAGES.includes(stage)) return res.status(400).json({ error: "Invalid stage." });
  const app = db.prepare(
    `SELECT applications.*, jobs.employer_id AS job_employer_id FROM applications
     JOIN jobs ON jobs.id = applications.job_id WHERE applications.id = ?`
  ).get(req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found." });
  if (app.job_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your listing." });
  db.prepare("UPDATE applications SET stage = ? WHERE id = ?").run(stage, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
});
