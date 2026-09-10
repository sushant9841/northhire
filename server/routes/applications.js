import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeApplication } from "../serialize.js";
import { emitWebhook } from "../webhooks.js";

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

/* The candidate's own visibility settings gate which fields the employer viewing this specific
   application actually sees - phone/email default visible (matches the pre-existing behavior),
   a seeker can turn either off from their profile settings. */
applicationsRouter.get("/:id/candidate", requireAuth, requireRole("employer"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(app.user_id);
  if (!user) return res.status(404).json({ error: "Candidate not found." });
  const visibility = JSON.parse(user.visibility_json || "{}");
  res.json({
    candidate: {
      id: user.id, name: user.name,
      email: visibility.email === false ? null : user.email,
      phone: visibility.phone === false ? null : user.phone,
      edu: user.edu,
    },
  });
});

// Structured hiring-team feedback beyond the single auto-computed fit percentage - any teammate
// on the employer account can leave one scorecard per application; all of them show, not just
// the latest, since that's the point of a multi-interviewer scorecard.
applicationsRouter.get("/:id/scorecards", requireAuth, requireRole("employer"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;
  const rows = db.prepare("SELECT * FROM interview_scorecards WHERE application_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ scorecards: rows.map(r => ({ id: r.id, application: r.application_id, author: r.author_name, rating: r.rating, notes: r.notes, at: sqlTime(r.created_at).getTime() })) });
});
applicationsRouter.post("/:id/scorecards", requireAuth, requireRole("employer"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;
  const { rating, notes } = req.body || {};
  const r = Number(rating);
  if (!(r >= 1 && r <= 5)) return res.status(400).json({ error: "Rating must be 1-5." });
  const id = nextId("sc", "interview_scorecards");
  db.prepare("INSERT INTO interview_scorecards (id, application_id, author_id, author_name, rating, notes) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, req.user.id, req.user.name, r, (notes || "").trim());
  res.status(201).json({ scorecard: { id, application: req.params.id, author: req.user.name, rating: r, notes: (notes || "").trim(), at: Date.now() } });
});

applicationsRouter.get("/mine", requireAuth, requireRole("seeker"), (req, res) => {
  const rows = db.prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ applications: rows.map(serializeApplication) });
});

// Every application across every one of the employer's own jobs in one call - the frontend's
// applicant counts (job cards, pipeline, analytics) all read one shared local `applications`
// array rather than fetching per-job, so this is what keeps that array in sync with reality.
applicationsRouter.get("/employer/mine", requireAuth, requireRole("employer"), (req, res) => {
  const rows = db.prepare(
    `SELECT applications.* FROM applications
     JOIN jobs ON jobs.id = applications.job_id
     WHERE jobs.employer_id = ? ORDER BY applications.created_at DESC`
  ).all(req.user.employer_id);
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
  const { jobId, availability, payExpectation, coverLetter, coverLetterUploadId, screeningAnswers } = req.body || {};
  const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'live'").get(jobId);
  if (!job) return res.status(404).json({ error: "This listing is no longer accepting applications." });

  const already = db.prepare("SELECT id FROM applications WHERE job_id = ? AND user_id = ? AND stage != 'Withdrawn'").get(jobId, req.user.id);
  if (already) return res.status(409).json({ error: "You've already applied to this job." });

  // The employer's real questions (with their own required flags) live on the job, not on
  // whatever the client sends - re-derive required-ness here rather than trusting the caller.
  const questions = JSON.parse(job.screening_questions_json || "[]");
  const answers = screeningAnswers && typeof screeningAnswers === "object" ? screeningAnswers : {};
  const isBlank = (q) => q.type === "checkbox" ? !Array.isArray(answers[q.id]) || !answers[q.id].length : !String(answers[q.id] || "").trim();
  if (questions.some(q => q.required && isBlank(q)))
    return res.status(400).json({ error: "Please answer every required question." });
  const answerSnapshot = questions.map(q => ({
    id: q.id, prompt: q.prompt, type: q.type, required: !!q.required,
    answer: answers[q.id] ?? (q.type === "checkbox" ? [] : ""),
  }));

  const id = nextId("a", "applications");
  const historyJson = JSON.stringify([{ stage: "Applied", note: "Waiting for employer review", at: new Date().toISOString() }]);
  db.prepare(
    `INSERT INTO applications (id, job_id, user_id, stage, note, availability, pay_expectation, cover_letter, cover_letter_upload_id, screening_answers_json, history_json)
     VALUES (?, ?, ?, 'Applied', 'Waiting for employer review', ?, ?, ?, ?, ?, ?)`
  ).run(id, jobId, req.user.id, availability || null, payExpectation || null, coverLetter || null,
    // Only accept an upload id this seeker actually owns - otherwise any document id would do.
    (coverLetterUploadId && db.prepare("SELECT 1 FROM uploads WHERE id = ? AND owner_type = 'user' AND owner_id = ?").get(coverLetterUploadId, req.user.id)) ? coverLetterUploadId : null,
    JSON.stringify(answerSnapshot), historyJson);

  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
  res.status(201).json({ application: serializeApplication(row) });
  // Fired after the response so a customer webhook endpoint can never make an applicant wait.
  const ownerJob = db.prepare("SELECT employer_id FROM jobs WHERE id = ?").get(jobId);
  if (ownerJob) emitWebhook(ownerJob.employer_id, "application.created", serializeApplication(row));
});

const STAGE_NOTE = {
  Reviewed: "Employer reviewed your profile",
  Shortlisted: "Shortlisted by the employer",
  Interview: "Interview stage — expect scheduling details",
  Offer: "Offer extended — check your notifications",
  Hired: "Welcome to the team! Onboarding details coming.",
};
const DEFAULT_STAGES = ["Applied", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired"];

/* Which stages this employer's board actually has. Validating against a hardcoded list broke the
   moment custom pipeline stages shipped: the board rendered a custom column but the move into it
   was rejected as "Invalid stage". The stage still has to be one the employer configured — an
   arbitrary caller-supplied string would let anyone write any value into the column that drives
   the seeker's status page and the analytics roll-ups. */
function stagesForEmployer(employerId) {
  const row = db.prepare("SELECT pipeline_stages_json FROM employers WHERE id = ?").get(employerId);
  if (!row?.pipeline_stages_json) return DEFAULT_STAGES;
  try {
    const parsed = JSON.parse(row.pipeline_stages_json);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_STAGES;
  } catch { return DEFAULT_STAGES; }
}

applicationsRouter.patch("/:id/stage", requireAuth, requireRole("employer"), (req, res) => {
  const { stage } = req.body || {};
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;
  const allowed = stagesForEmployer(req.user.employer_id);
  if (typeof stage !== "string" || !allowed.includes(stage)) {
    return res.status(400).json({ error: `Not a stage on this pipeline. Configured stages: ${allowed.join(", ")}.` });
  }

  // A custom stage has no pre-written candidate-facing note, so it gets a plain factual one
  // rather than borrowing the wording of whichever default stage it sits near.
  const note = STAGE_NOTE[stage] || `Moved to ${stage}`;
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
  emitWebhook(req.user.employer_id, "application.stage_changed",
    { ...serializeApplication(row), previousStage: app.stage });
});

applicationsRouter.patch("/:id/reject", requireAuth, requireRole("employer"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;
  const reason = (req.body?.reason || "").trim();
  const note = reason
    ? `The employer has decided not to move forward with your application at this time: ${reason}`
    : "The employer has decided not to move forward with your application at this time.";
  const history = appendHistory(app, "Withdrawn", note);
  db.prepare("UPDATE applications SET stage = 'Withdrawn', note = ?, history_json = ? WHERE id = ?").run(note, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
});

applicationsRouter.patch("/:id/withdraw", requireAuth, requireRole("seeker"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "seeker");
  if (!app) return;
  const reason = (req.body?.reason || "").trim();
  const note = reason ? `You withdrew this application: ${reason}` : "You withdrew this application";
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
  if (!app.withdrawn_at || Date.now() - sqlTime(app.withdrawn_at).getTime() > 7 * 24 * 60 * 60 * 1000) {
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
