import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeApplication } from "../serialize.js";
import { emitWebhook } from "../webhooks.js";
import { sendAndLogMail } from "../mail.js";
import { emit as liveEmit, emitMany as liveEmitMany } from "../lib/liveBroker.js";
import { pushNotification } from "../lib/notify.js";
import { notifStringsForUser, candidateStringsForUser } from "../emailLocale.js";
import { runWorkflowRules } from "../lib/workflowRules.js";

/* Every user attached to a given employer_id — the employer account owner plus any teammates.
   Used so a stage move made by one team member instantly refreshes the pipeline on their
   colleagues' open tabs, not just their own. */
function employerUserIds(employerId) {
  return db.prepare("SELECT id FROM users WHERE employer_id = ?").all(employerId).map(r => r.id);
}

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
  const { jobId, availability, payExpectation, coverLetter, coverLetterUploadId, cvId, screeningAnswers, source } = req.body || {};
  const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'live'").get(jobId);
  if (!job) return res.status(404).json({ error: "This listing is no longer accepting applications." });

  // Attach the CV the seeker picked at apply time. Falls back to their default CV so an
  // application never lands with cv_id = null when the seeker has any CV at all - the picker
  // could regress or a caller could omit the field and we'd still send the employer something.
  // A caller-supplied cvId that isn't this seeker's own CV is discarded rather than trusted.
  let attachedCvId = null;
  if (cvId && db.prepare("SELECT 1 FROM cvs WHERE id = ? AND user_id = ?").get(cvId, req.user.id)) {
    attachedCvId = cvId;
  } else {
    const me = db.prepare("SELECT default_cv FROM users WHERE id = ?").get(req.user.id);
    if (me?.default_cv && db.prepare("SELECT 1 FROM cvs WHERE id = ? AND user_id = ?").get(me.default_cv, req.user.id)) {
      attachedCvId = me.default_cv;
    } else {
      const anyCv = db.prepare("SELECT id FROM cvs WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1").get(req.user.id);
      if (anyCv) attachedCvId = anyCv.id;
    }
  }

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
    `INSERT INTO applications (id, job_id, user_id, stage, note, availability, pay_expectation, cover_letter, cover_letter_upload_id, cv_id, source, screening_answers_json, history_json)
     VALUES (?, ?, ?, 'Applied', 'Waiting for employer review', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, jobId, req.user.id, availability || null, payExpectation || null, coverLetter || null,
    // Only accept an upload id this seeker actually owns - otherwise any document id would do.
    (coverLetterUploadId && db.prepare("SELECT 1 FROM uploads WHERE id = ? AND owner_type = 'user' AND owner_id = ?").get(coverLetterUploadId, req.user.id)) ? coverLetterUploadId : null,
    attachedCvId,
    // A caller-supplied source is a hint for analytics, not a security boundary - but it is still
    // constrained to known values so it can never become an injection of arbitrary text.
    ["search","matched","invite","alert","direct","api"].includes(source) ? source : "direct",
    JSON.stringify(answerSnapshot), historyJson);

  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
  res.status(201).json({ application: serializeApplication(row) });
  // Fired after the response so a customer webhook endpoint can never make an applicant wait.
  const ownerJob = db.prepare("SELECT employer_id FROM jobs WHERE id = ?").get(jobId);
  if (ownerJob) {
    emitWebhook(ownerJob.employer_id, "application.created", serializeApplication(row));
    // Live-sync: every employer teammate's Pipeline / Jobs tab picks this up without a refresh.
    liveEmitMany(employerUserIds(ownerJob.employer_id), "application:new", serializeApplication(row));
    for (const uid of employerUserIds(ownerJob.employer_id)) {
      const S = notifStringsForUser(uid);
      pushNotification({ for: uid, icon: "target", title: S.newApplicationTitle,
        body: S.newApplicationBody(job.title), link: "empPipeline" });
    }
    // Forward-email: if the employer set a copy-to address on this listing, send the
    // application summary there too. Best-effort - a mail failure never blocks the application.
    if (job.forward_email) {
      const applicant = db.prepare("SELECT name, email, phone FROM users WHERE id = ?").get(req.user.id);
      const body = [
        `A new application arrived on NorthHire for ${job.title}.`,
        "",
        `Applicant: ${applicant?.name || "(name withheld)"}`,
        `Email: ${applicant?.email || "-"}`,
        `Phone: ${applicant?.phone || "-"}`,
        "",
        `Availability: ${availability || "-"}`,
        `Pay expectation: ${payExpectation || "-"}`,
        "",
        coverLetter ? "Cover letter:" : "",
        coverLetter || "",
        "",
        "View this application on NorthHire in your Pipeline.",
      ].filter(Boolean).join("\n");
      sendAndLogMail(job.forward_email, `New application: ${job.title}`, body).catch(() => {});
    }
    // Workflow rules engine (Priority-4 #2): evaluate this employer's rules against the freshly
    // created application - e.g. auto-tagging a strong match or moving straight to Reviewed.
    // No actorUserId here - the actor is the applying seeker, not an employer teammate, so the
    // per-action confirmation notification (aimed at the employer side) is skipped on this path.
    runWorkflowRules(ownerJob.employer_id, id, {});
  }
});

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
  // rather than borrowing the wording of whichever default stage it sits near. Picked in the
  // candidate's own locale (Bill 96) since this note is persisted verbatim, not re-translated
  // client-side.
  const CS = candidateStringsForUser(app.user_id);
  const note = CS.stageNote[stage] || CS.stageNoteCustom(stage);
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

  /* Live-sync fan-out. The candidate's Status page updates without a refresh, and every
     employer teammate's Pipeline gets the new column position too. Send the previousStage
     alongside the current row so client-side reducers can move a card between columns
     rather than reloading the whole list. */
  const payload = { ...serializeApplication(row), previousStage: app.stage };
  liveEmit(app.user_id, "application:updated", payload);
  liveEmitMany(employerUserIds(req.user.employer_id), "application:updated", payload);

  /* Tell the candidate their application moved. This is transactional mail about something they
     asked for, not a commercial message, so it correctly does not consult marketing consent —
     but it does respect their in-app notification preference, and it is sent after the response
     so the employer's drag never waits on delivery. */
  notifyStageChange(app.user_id, row, stage, note).catch(() => {});

  // Persisted in-app notification (separate from the email above, and from the local-only
  // client notify() this deliberately does NOT rely on) so the candidate's bell badge is real
  // and survives a refresh / different device / being offline when it happened.
  const stageEmployer = db.prepare("SELECT name FROM employers WHERE id = ?").get(req.user.employer_id);
  {
    const S = notifStringsForUser(app.user_id);
    pushNotification({ for: app.user_id, icon: stage === "Hired" || stage === "Offer" ? "award" : "activity",
      // JS-10: encode the entity as "status:<applicationId>" in the existing free-text link
      // column so a tap on the notification can scroll straight to this row, not just the page.
      title: S.stageTitle(stage, stageEmployer?.name), body: note, link: `status:${app.id}` });
  }

  /* Run the employer's stage-change automation, if any: send the linked message template to the
     candidate as an in-app message. Merge-field substitution mirrors what the template picker
     shows the operator when they compose one manually, so the auto-sent copy is what they would
     have sent by hand. Wrapped in try/catch: a failed automation must not fail the underlying
     stage-move that succeeded, since that would leave the pipeline out of sync with what the
     operator sees. */
  try {
    const rule = db.prepare(
      "SELECT sa.template_id, mt.body FROM stage_automations sa JOIN message_templates mt ON mt.id = sa.template_id WHERE sa.employer_id = ? AND sa.stage = ? AND sa.enabled = 1"
    ).get(req.user.employer_id, stage);
    if (rule) {
      const candidate = db.prepare("SELECT name FROM users WHERE id = ?").get(app.user_id);
      const job = db.prepare("SELECT jobs.title, employers.name AS company FROM jobs JOIN employers ON employers.id = jobs.employer_id WHERE jobs.id = ?").get(app.job_id);
      const body = String(rule.body || "")
        .replaceAll("{{name}}", candidate?.name || "")
        .replaceAll("{{job}}", job?.title || "")
        .replaceAll("{{company}}", job?.company || "");
      db.prepare("INSERT INTO messages (id, from_user_id, to_user_id, job_id, text) VALUES (?, ?, ?, ?, ?)")
        .run(nextId("m", "messages"), req.user.id, app.user_id, app.job_id, body);
    }
  } catch (e) { console.error("stage automation:", e.message); }

  // Workflow rules engine (Priority-4 #2): runs alongside the single-rule automation above,
  // not instead of it - existing per-stage template bindings keep working unchanged.
  runWorkflowRules(req.user.employer_id, req.params.id, { actorUserId: req.user.id });
});

async function notifyStageChange(userId, application, stage, note) {
  const prefs = db.prepare("SELECT settings_json FROM user_settings WHERE user_id = ?").get(userId);
  const wantsEmail = prefs ? (JSON.parse(prefs.settings_json || "{}").appAlerts !== false) : true;
  if (!wantsEmail) return;
  const user = db.prepare("SELECT name, email FROM users WHERE id = ?").get(userId);
  if (!user) return;
  const job = db.prepare("SELECT jobs.title, employers.name AS employer FROM jobs JOIN employers ON employers.id = jobs.employer_id WHERE jobs.id = ?")
    .get(application.job_id);
  const CS = candidateStringsForUser(userId);
  const statusLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/status`;
  await sendAndLogMail(user.email, CS.stageChangeSubject(job?.title),
    CS.stageChangeBody(user.name, job?.employer, job?.title, stage, note, statusLink));
}

applicationsRouter.patch("/:id/reject", requireAuth, requireRole("employer"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "employer");
  if (!app) return;
  const reason = (req.body?.reason || "").trim();
  const CS = candidateStringsForUser(app.user_id);
  const note = reason ? CS.rejectNoteWithReason(reason) : CS.rejectNoteNoReason;
  const history = appendHistory(app, "Withdrawn", note);
  db.prepare("UPDATE applications SET stage = 'Withdrawn', note = ?, history_json = ? WHERE id = ?").run(note, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
  const payload = { ...serializeApplication(row), previousStage: app.stage };
  liveEmit(app.user_id, "application:updated", payload);
  liveEmitMany(employerUserIds(req.user.employer_id), "application:updated", payload);
});

applicationsRouter.patch("/:id/withdraw", requireAuth, requireRole("seeker"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "seeker");
  if (!app) return;
  const reason = (req.body?.reason || "").trim();
  const CS = candidateStringsForUser(app.user_id);
  const note = reason ? CS.withdrawNoteWithReason(reason) : CS.withdrawNoteNoReason;
  const history = appendHistory(app, "Withdrawn", note);
  const withdrawnAt = new Date().toISOString();
  db.prepare(
    "UPDATE applications SET previous_stage = ?, stage = 'Withdrawn', note = ?, withdrawn_at = ?, history_json = ? WHERE id = ?"
  ).run(app.stage, note, withdrawnAt, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
  const job = db.prepare("SELECT employer_id FROM jobs WHERE id = ?").get(app.job_id);
  const payload = { ...serializeApplication(row), previousStage: app.stage };
  liveEmit(app.user_id, "application:updated", payload);
  if (job) liveEmitMany(employerUserIds(job.employer_id), "application:updated", payload);
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
  const job = db.prepare("SELECT employer_id FROM jobs WHERE id = ?").get(app.job_id);
  const payload = { ...serializeApplication(row), previousStage: "Withdrawn" };
  liveEmit(app.user_id, "application:updated", payload);
  if (job) liveEmitMany(employerUserIds(job.employer_id), "application:updated", payload);
});

applicationsRouter.patch("/:id/accept-offer", requireAuth, requireRole("seeker"), (req, res) => {
  const app = loadOwnedApplication(req.params.id, req, res, "seeker");
  if (!app) return;
  const note = "Offer accepted — congratulations";
  const history = appendHistory(app, app.stage, note);
  db.prepare("UPDATE applications SET note = ?, history_json = ? WHERE id = ?").run(note, history, req.params.id);
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  res.json({ application: serializeApplication(row) });
  const job = db.prepare("SELECT employer_id FROM jobs WHERE id = ?").get(app.job_id);
  const payload = { ...serializeApplication(row), previousStage: app.stage };
  liveEmit(app.user_id, "application:updated", payload);
  if (job) liveEmitMany(employerUserIds(job.employer_id), "application:updated", payload);
});
