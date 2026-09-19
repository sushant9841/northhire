import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole, requireAdminScope, hasAdminScope } from "../auth.js";
import { serializeJob } from "../serialize.js";
import { getConfig } from "../platformConfig.js";
import { geocode } from "../geocode.js";
import { postingRules, checkPayRange, findCanadianExperience } from "../../src/helpers/jobPostingLaw.js";
import { notifyInstantMatches } from "../jobAlerts.js";
import { emitWebhook } from "../webhooks.js";

export const jobsRouter = Router();

/* Ontario Bill 149 / BC Pay Transparency Act enforcement. The post wizard validates the same
   rules for a good error experience, but this is the boundary that actually holds - a direct API
   call would otherwise publish a posting that breaks a currently-in-force law. Returns an error
   string, or null when the posting is clean. */
function checkPostingLaw(b, employer) {
  const rules = postingRules({ prov: b.prov || employer?.prov, employerSize: employer?.size });
  if (!rules.payRequired && !rules.rangeCap && !rules.noCanadianExperience) return null;

  if (rules.payRequired && !(Number(b.lo) > 0) && !(Number(b.hi) > 0)) {
    return rules.bcPayTransparency
      ? "British Columbia's Pay Transparency Act requires every publicly advertised posting to state an expected salary or pay range."
      : "Ontario's Bill 149 requires a publicly advertised posting to state the expected compensation or range.";
  }
  const rangeErr = checkPayRange({ lo: b.lo, hi: b.hi, unit: b.unit, rules });
  if (rangeErr) return rangeErr;

  if (rules.noCanadianExperience) {
    const hit = findCanadianExperience([
      b.title, b.desc, b.how,
      ...(b.duties || []), ...(b.reqs || []),
      ...(b.questions || []).map(q => q && q.prompt),
    ]);
    if (hit) return `Ontario's Bill 149 prohibits requiring Canadian experience in a job posting or its application form. Remove "${hit}".`;
  }
  if (rules.vacancyConfirm && !b.vacancyConfirmed) {
    return "Ontario's Bill 149 requires confirming this posting is for an existing, currently open vacancy.";
  }
  return null;
}

// The UI already gates job-count/featured quotas and CSV-import against the employer's plan, but
// nothing stopped calling the API directly to bypass that check entirely - these mirror the same
// plan-derived limits server-side, the actual enforcement boundary. Plan limits are admin-editable
// business config (see platformConfig.js), not a hardcoded constant.
function employerPlan(employerId) {
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(employerId);
  const plans = getConfig("plans");
  return plans[employer?.plan] || plans.Free;
}

jobsRouter.get("/", (req, res) => {
  const { q, cat, city, prov, type, mode, minPay, employerId, status } = req.query;
  const clauses = [];
  const params = [];

  if (status && status !== "all") { clauses.push("status = ?"); params.push(status); }
  else if (!status) { clauses.push("status = 'live' AND pending_owner_approval = 0"); }
  // status === "all" applies no status filter - used by an owning employer's "my jobs" list
  // and admin moderation, both of which need to see paused/review/closed/pending-approval
  // listings too. The default (public search) view excludes anything still awaiting the
  // account owner's sign-off, even if it already cleared admin moderation to "live".

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

// Anonymised pay benchmark for a given category + province + experience shape, computed live
// from the platform's own listings (not a fixed table) so it tracks the real market as postings
// churn. A count below 5 could otherwise fingerprint a single employer's pay in a thin category/
// province combo, so anything under that floor comes back as `null` with just the raw count.
function computeBenchmark({ cat, prov, exp, unit }) {
  const u = unit === "yr" ? "yr" : "hr";
  const clauses = ["status = 'live'", "pay_unit = ?"];
  const params = [u];
  if (cat) { clauses.push("cat = ?"); params.push(cat); }
  if (prov) { clauses.push("prov = ?"); params.push(prov); }
  if (exp) { clauses.push("experience = ?"); params.push(exp); }
  const rows = db.prepare(
    `SELECT pay_lo, pay_hi FROM jobs WHERE ${clauses.join(" AND ")} AND pay_lo IS NOT NULL AND pay_hi IS NOT NULL AND pay_hi > 0`
  ).all(...params);
  const values = rows
    .map(r => (Number(r.pay_lo) + Number(r.pay_hi)) / 2)
    .filter(v => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  const count = values.length;
  const pct = (p) => {
    if (!count) return null;
    const idx = Math.min(count - 1, Math.max(0, Math.round((p / 100) * (count - 1))));
    return Math.round(values[idx] * 100) / 100;
  };
  if (count < 5) return { count, unit: u, median: null, p25: null, p75: null, suppressed: true };
  return { count, unit: u, median: pct(50), p25: pct(25), p75: pct(75), suppressed: false };
}

jobsRouter.get("/benchmark", (req, res) => {
  const { cat, prov, exp, unit } = req.query;
  res.json(computeBenchmark({ cat, prov, exp, unit }));
});

jobsRouter.get("/reports", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const rows = db.prepare(
    `SELECT job_reports.*, jobs.title AS job_title, users.name AS reporter_name
     FROM job_reports JOIN jobs ON jobs.id = job_reports.job_id LEFT JOIN users ON users.id = job_reports.reporter_id
     ORDER BY job_reports.created_at DESC`
  ).all();
  res.json({ reports: rows.map(r => ({ id: r.id, job: r.job_id, jobTitle: r.job_title, reporterName: r.reporter_name || "—", reason: r.reason, status: r.status, at: r.created_at })) });
});

/* Employer Transformation E2: server-side job-creation draft. One active draft per employer,
   upserted on every autosave tick (client debounces ~800ms). Must sit ABOVE the "/:id" route
   below, or Express would treat "draft" as a job id and 404 it there instead. */
jobsRouter.get("/draft", requireAuth, requireRole("employer"), (req, res) => {
  const row = db.prepare("SELECT * FROM job_drafts WHERE employer_id = ?").get(req.user.employer_id);
  if (!row) return res.json({ draft: null });
  res.json({ draft: { data: JSON.parse(row.data_json || "{}"), step: row.step, updatedAt: row.updated_at } });
});
jobsRouter.put("/draft", requireAuth, requireRole("employer"), (req, res) => {
  const data = req.body?.data;
  const step = Number(req.body?.step) || 1;
  if (!data || typeof data !== "object") return res.status(400).json({ error: "Draft data is required." });
  const existing = db.prepare("SELECT id FROM job_drafts WHERE employer_id = ?").get(req.user.employer_id);
  if (existing) {
    db.prepare("UPDATE job_drafts SET data_json = ?, step = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(data), step, existing.id);
  } else {
    const id = nextId("jd", "job_drafts");
    db.prepare("INSERT INTO job_drafts (id, employer_id, created_by, data_json, step) VALUES (?, ?, ?, ?, ?)")
      .run(id, req.user.employer_id, req.user.id, JSON.stringify(data), step);
  }
  res.json({ ok: true, updatedAt: new Date().toISOString() });
});
jobsRouter.delete("/draft", requireAuth, requireRole("employer"), (req, res) => {
  db.prepare("DELETE FROM job_drafts WHERE employer_id = ?").run(req.user.employer_id);
  res.json({ ok: true });
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

// Seekers can't set the admin-only `flagged` field directly (see PATCH /:id below) - this is
// their own real reporting path, landing in a separate queue an admin actually reviews.
jobsRouter.post("/:id/report", requireAuth, requireRole("seeker"), (req, res) => {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Job not found." });
  const reason = (req.body?.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "Tell us what's wrong with this listing." });
  const id = nextId("jr", "job_reports");
  db.prepare("INSERT INTO job_reports (id, job_id, reporter_id, reason) VALUES (?, ?, ?, ?)").run(id, req.params.id, req.user.id, reason);
  res.status(201).json({ ok: true });
});
jobsRouter.patch("/reports/:id", requireAuth, requireAdminScope("moderator"), (req, res) => {
  const { status } = req.body || {};
  if (!["open", "dismissed", "actioned"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  db.prepare("UPDATE job_reports SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

jobsRouter.post("/", requireAuth, requireRole("employer"), async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.desc) return res.status(400).json({ error: "Title and description are required." });
  const initialStatus = b.status === "live" ? "live" : "review";
  const plan = employerPlan(req.user.employer_id);
  if (initialStatus === "live") {
    const liveCount = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE employer_id = ? AND status = 'live'").get(req.user.employer_id).n;
    if (liveCount >= plan.jobs) return res.status(403).json({ error: `Your plan allows ${plan.jobs} live listing${plan.jobs === 1 ? "" : "s"}. Upgrade to post more.` });
  }
  if (b.featured) {
    const featuredCount = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE employer_id = ? AND featured = 1 AND status = 'live'").get(req.user.employer_id).n;
    if (featuredCount >= plan.featured) return res.status(403).json({ error: `Your plan allows ${plan.featured} featured listing${plan.featured === 1 ? "" : "s"}. Upgrade to feature more.` });
  }
  // A teammate (employer_role 'member') can post, but it doesn't go out to candidates until the
  // account owner signs off - independent of admin's own platform-moderation status above, which
  // is a different gate for a different reason.
  const needsOwnerApproval = req.user.employer_role === "member";
  const employer = db.prepare("SELECT prov, size FROM employers WHERE id = ?").get(req.user.employer_id);
  const lawErr = checkPostingLaw(b, employer);
  if (lawErr) return res.status(400).json({ error: lawErr });
  const id = nextId("j", "jobs");
  // Free OSM geocoding (server/geocode.js) so the listing carries real coordinates for radius
  // search/map view - best-effort, never blocks posting a job if the lookup fails or times out.
  const geo = (b.city && b.prov) ? await geocode(`${b.city}, ${b.prov}, Canada`) : null;
  const distChannels = Array.isArray(b.distributionChannels)
    ? b.distributionChannels.filter(c => typeof c === "string" && c.trim()).slice(0, 10)
    : [];
  const fwdEmail = (typeof b.forwardEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.forwardEmail.trim()))
    ? b.forwardEmail.trim().toLowerCase() : null;
  db.prepare(
    `INSERT INTO jobs (id, employer_id, title, cat, city, prov, lat, lng, type, mode, pay_lo, pay_hi, pay_unit,
       vacancies, experience, education, deadline_date, urgent, featured, skills_json, perks_json,
       description, duties_json, requirements_json, how_to_apply, screening_questions_json,
       ai_screening, vacancy_confirmed, status, pending_owner_approval,
       distribution_channels, forward_email)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, req.user.employer_id, b.title, b.cat || null, b.city || null, b.prov || null, geo?.lat ?? null, geo?.lng ?? null,
    b.type || null, b.mode || null,
    b.lo ?? null, b.hi ?? null, b.unit || null, b.vac ?? 1, b.exp || null, b.edu || null, b.dlDate || null,
    b.urgent ? 1 : 0, b.featured ? 1 : 0, JSON.stringify(b.skills || []), JSON.stringify(b.perks || []),
    b.desc, JSON.stringify(b.duties || []), JSON.stringify(b.reqs || []), b.how || null,
    // Employer-authored screening questions (yes/no, single/multiple choice, short/long answer) -
    // keep only the fields the applicant-facing form actually needs, capped at a sane count.
    JSON.stringify((b.questions || []).filter(q => q && q.prompt && q.prompt.trim()).slice(0, 10)
      .map(q => ({ id: q.id, type: q.type, prompt: q.prompt.trim(), required: !!q.required, options: Array.isArray(q.options) ? q.options : [] }))),
    b.aiScreening === false ? 0 : 1, b.vacancyConfirmed ? 1 : 0,
    initialStatus, needsOwnerApproval ? 1 : 0,
    JSON.stringify(distChannels), fwdEmail
  );
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  res.status(201).json({ job: serializeJob(row) });
  // Instant saved-search alerts go out AFTER the response - a seeker's mail delivery should
  // never make the employer wait to hear their listing published (the same mistake the HR
  // payroll run made by awaiting every employee's email before responding).
  if (initialStatus === "live" && !needsOwnerApproval) {
    notifyInstantMatches(id).catch(e => console.warn(`[jobAlerts] ${e.message}`));
    emitWebhook(req.user.employer_id, "job.published", serializeJob(row));
  }
});

jobsRouter.patch("/:id", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && job.employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your listing." });

  const { status, flagged, approve, scoreWeights, recruitingCost, distributionChannels, forwardEmail } = req.body || {};

  // Distribution channels + forward email are the employer's to edit on their own listing;
  // stored the same way as at create time.
  if (distributionChannels !== undefined) {
    if (isAdmin) return res.status(403).json({ error: "Distribution is the employer's to configure." });
    const clean = Array.isArray(distributionChannels)
      ? distributionChannels.filter(c => typeof c === "string" && c.trim()).slice(0, 10)
      : [];
    db.prepare("UPDATE jobs SET distribution_channels = ? WHERE id = ?").run(JSON.stringify(clean), req.params.id);
  }
  if (forwardEmail !== undefined) {
    if (isAdmin) return res.status(403).json({ error: "Forward email is the employer's to set." });
    const v = typeof forwardEmail === "string" ? forwardEmail.trim() : "";
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return res.status(400).json({ error: "Forward email doesn't look like a valid address." });
    db.prepare("UPDATE jobs SET forward_email = ? WHERE id = ?").run(v ? v.toLowerCase() : null, req.params.id);
  }

  if (recruitingCost !== undefined) {
    if (isAdmin) return res.status(403).json({ error: "Recruiting cost is the employer's to track, not an administrator's." });
    const c = Number(recruitingCost);
    if (!Number.isFinite(c) || c < 0) return res.status(400).json({ error: "Recruiting cost must be a non-negative number." });
    db.prepare("UPDATE jobs SET recruiting_cost = ? WHERE id = ?").run(c, req.params.id);
  }

  /* Per-job scoring weights, so a ticketed trade can weight certifications heavily while a
     coordinator role weights experience. Values are clamped and only the four known components
     are accepted - an arbitrary key would end up multiplied into a candidate's score. */
  if (scoreWeights !== undefined) {
    if (isAdmin) return res.status(403).json({ error: "Scoring is the employer's to configure, not an administrator's." });
    if (scoreWeights === null) {
      db.prepare("UPDATE jobs SET score_weights_json = NULL WHERE id = ?").run(req.params.id);
    } else {
      const keys = ["skills", "experience", "location", "category"];
      const clean = {};
      for (const k of keys) {
        const v = Number(scoreWeights[k]);
        if (!Number.isFinite(v) || v < 0 || v > 100) return res.status(400).json({ error: `Each weight must be between 0 and 100 (${k}).` });
        clean[k] = Math.round(v);
      }
      if (Object.values(clean).reduce((s, v) => s + v, 0) <= 0) {
        return res.status(400).json({ error: "At least one component has to carry some weight." });
      }
      db.prepare("UPDATE jobs SET score_weights_json = ? WHERE id = ?").run(JSON.stringify(clean), req.params.id);
    }
  }
  if (status !== undefined) {
    if (!["live", "paused", "review", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status." });
    if (isAdmin && !hasAdminScope(req.user, "moderator")) return res.status(403).json({ error: "This admin account doesn't have access to listing moderation." });
    if (status === "live" && job.status !== "live" && !isAdmin) {
      const plan = employerPlan(job.employer_id);
      const liveCount = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE employer_id = ? AND status = 'live' AND id != ?").get(job.employer_id, req.params.id).n;
      if (liveCount >= plan.jobs) return res.status(403).json({ error: `Your plan allows ${plan.jobs} live listing${plan.jobs === 1 ? "" : "s"}. Upgrade to republish this one.` });
    }
    db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(status, req.params.id);
  }
  if (flagged !== undefined) {
    if (!isAdmin) return res.status(403).json({ error: "Only an administrator can flag a listing." });
    if (!hasAdminScope(req.user, "moderator")) return res.status(403).json({ error: "This admin account doesn't have access to listing moderation." });
    db.prepare("UPDATE jobs SET flagged = ? WHERE id = ?").run(flagged ? 1 : 0, req.params.id);
  }
  if (approve !== undefined) {
    if (!isAdmin && req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can approve a teammate's job posting." });
    db.prepare("UPDATE jobs SET pending_owner_approval = 0 WHERE id = ?").run(req.params.id);
  }
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  res.json({ job: serializeJob(row) });
});

/* Multi-post distribution: build a per-channel shareable URL an employer can copy into their
   own account on Indeed/LinkedIn/etc. Real programmatic posting requires per-aggregator OAuth
   partnerships and is deferred, but a copy-and-paste URL is genuinely useful today and does
   not require any external secret. Template shape is `<board search URL with our public listing
   pre-filled>` where the board supports one, else the direct link to our listing page - a
   recruiter pastes that into their board's own post flow. */
const _publicJobUrl = (req, jobId) => {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}/jobs/${encodeURIComponent(jobId)}`;
};
const DISTRIBUTION_CHANNELS = {
  indeed:       { label: "Indeed",       url: u => `https://www.indeed.com/post-job?src=${encodeURIComponent(u)}` },
  linkedin:     { label: "LinkedIn",     url: u => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  jobbank:      { label: "Job Bank",     url: u => `https://www.jobbank.gc.ca/employer-job/post?src=${encodeURIComponent(u)}` },
  ziprecruiter: { label: "ZipRecruiter", url: u => `https://www.ziprecruiter.com/post-job?src=${encodeURIComponent(u)}` },
};
jobsRouter.get("/:id/distribute/:channel", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.status !== "live") return res.status(404).json({ error: "Distribution only available on live listings." });
  const spec = DISTRIBUTION_CHANNELS[req.params.channel];
  if (!spec) return res.status(404).json({ error: "Unknown distribution channel." });
  const jobUrl = _publicJobUrl(req, req.params.id);
  res.json({ channel: req.params.channel, label: spec.label, url: spec.url(jobUrl), jobUrl });
});

jobsRouter.post("/import-csv", requireAuth, requireRole("employer"), (req, res) => {
  if (!employerPlan(req.user.employer_id).csvImport) return res.status(403).json({ error: "CSV import is a Growth+ feature." });
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
