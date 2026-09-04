import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeApplication } from "../serialize.js";

export const applicationsRouter = Router();

function appendHistory(row, stage, note) {
  const history = JSON.parse(row.history_json || "[]");
  history.push({ stage, note, at: new Date().toISOString() });
  return JSON.stringify(history);
}

function loadOwnedApplication(id, req, res, ownerColumn) {
  const app = db.prepare(
    `SELECT applications.*, jobs.employer_id AS job_employer_id FROM applications
     JOIN jobs ON jobs.id = applications.job_id WHERE applications.id = ?`
  ).get(id);
  if (!app) { res.status(404).json({ error: "Application not found." }); return null; }
  const owns = ownerColumn === "employer" ? app.job_employer_id === req.user.employer_id : app.user_id === req.user.id;
  if (!owns) { res.status(403).json({ error: "Not your application." }); return null; }
  return app;
}

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

  const already = db.prepare("SELECT id FROM applications WHERE job_id = ? AND user_id = ? AND stage != 'Withdrawn'").get(jobId, req.user.id);
  if (already) return res.status(409).json({ error: "You've already applied to this job." });

  const id = nextId("a", "applications");
  const historyJson = JSON.stringify([{ stage: "Applied", note: "Waiting for employer review", at: new Date().toISOString() }]);
  db.prepare(
    `INSERT INTO applications (id, job_id, user_id, stage, note, availability, pay_expectation, cover_letter, history_json)
     VALUES (?, ?, ?, 'Applied', 'Waiting for employer review', ?, ?, ?, ?)`
  ).run(id, jobId, req.user.id, availability || null, payExpectation || null, coverLetter || null, historyJson);

  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
  res.status(201).json({ application: serializeApplication(row) });
});

const STAGE_NOTE = {
  Reviewed: "Employer reviewed your profile",
  Shortlisted: "Shortlisted by the employer",
  Interview: "Interview stage — expect scheduling details",
  Offer: "Offer extended — check your notifications",
  Hired: "Welcome to the team! Onboarding details coming.",
};
const MOVABLE_STAGES = Object.keys(STAGE_NOTE);

applicationsRouter.patch("/:id/stage", requireAuth, requireRole("employer"), (req, res) => {
  const { stage } = req.body || {};
  if (!MOVABLE_STAGES.includes(stage)) return res.status(400).json({ error: "Invalid stage." });
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;

  const note = STAGE_NOTE[stage];
  const history = appendHistory(app, stage, note);
  db.prepare("UPDATE applications SET stage = ?, note = ?, history_json = ? WHERE id = ?").run(stage, note, history, req.params.id);

  // Filling the last opening closes the listing instead of collecting applicants forever.
  if (stage === "Hired") {
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(app.job_id);
    const vacancies = Math.max(0, (job.vacancies || 1) - 1);
    db.prepare("UPDATE jobs SET vacancies = ?, status = CASE WHEN ? = 0 THEN 'closed' ELSE status END WHERE id = ?")
      .run(vacancies, vacancies, app.job_id);
  }

  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
});

applicationsRouter.patch("/:id/reject", requireAuth, requireRole("employer"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;
  const note = "The employer has decided not to move forward with your application at this time.";
  const history = appendHistory(app, "Withdrawn", note);
  db.prepare("UPDATE applications SET stage = 'Withdrawn', note = ?, history_json = ? WHERE id = ?").run(note, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
});

applicationsRouter.patch("/:id/withdraw", requireAuth, requireRole("seeker"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "seeker");
  if (!app) return;
  const note = "You withdrew this application";
  const history = appendHistory(app, "Withdrawn", note);
  const withdrawnAt = new Date().toISOString();
  db.prepare(
    "UPDATE applications SET previous_stage = ?, stage = 'Withdrawn', note = ?, withdrawn_at = ?, history_json = ? WHERE id = ?"
  ).run(app.stage, note, withdrawnAt, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
});

applicationsRouter.patch("/:id/restore", requireAuth, requireRole("seeker"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "seeker");
  if (!app) return;
  if (!app.withdrawn_at || Date.now() - new Date(app.withdrawn_at).getTime() > 7 * 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: "This application can no longer be restored (past the 7-day window)." });
  }
  const restoredStage = app.previous_stage || "Applied";
  const note = "Restored from withdrawn";
  const history = appendHistory(app, restoredStage, note);
  db.prepare(
    "UPDATE applications SET stage = ?, note = ?, previous_stage = NULL, withdrawn_at = NULL, history_json = ? WHERE id = ?"
  ).run(restoredStage, note, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
});

applicationsRouter.patch("/:id/accept-offer", requireAuth, requireRole("seeker"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "seeker");
  if (!app) return;
  const note = "Offer accepted — congratulations";
  const history = appendHistory(app, app.stage, note);
  db.prepare("UPDATE applications SET note = ?, history_json = ? WHERE id = ?").run(note, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
});
