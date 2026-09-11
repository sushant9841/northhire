import { Router } from "express";
import crypto from "node:crypto";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { sendAndLogMail } from "../mail.js";
import { localeForEmail, emailStrings } from "../emailLocale.js";

export const offersRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* Real e-signature for offer letters.

   Before this, "Offer" was a pipeline stage plus a print-to-PDF document with a blank signature
   line — the employer printed it, emailed it themselves, and nothing recorded whether the
   candidate ever accepted. This is the same click-wrap construction the HR handbook module
   already uses (typed legal name + required acknowledgement + timestamp + hashed IP), which is
   the standard most ATS offer-letter tools actually rely on, extended to someone who is not yet
   an employee and therefore has no login.

   What makes it hold up as a record rather than a button press: the exact text agreed to is
   snapshotted onto the row at send time, so editing a template later cannot retroactively change
   what somebody signed. */

const hashIp = ip => crypto.createHash("sha256").update(String(ip || "") + "northhire-offer").digest("hex").slice(0, 32);

function loadOwnedApplication(applicationId, employerId) {
  return db.prepare(
    `SELECT applications.*, jobs.employer_id AS emp, jobs.title AS job_title, users.name AS candidate_name, users.email AS candidate_email
       FROM applications JOIN jobs ON jobs.id = applications.job_id JOIN users ON users.id = applications.user_id
      WHERE applications.id = ? AND jobs.employer_id = ?`
  ).get(applicationId, employerId);
}

function publicOffer(row, employerName) {
  return {
    id: row.id, status: row.status, body: row.body,
    position: row.position, compensation: row.compensation,
    startDate: row.start_date, reportingTo: row.reporting_to,
    expiresAt: row.expires_at, employer: employerName,
    signedName: row.signed_name, signedAt: row.signed_at,
    declineReason: row.decline_reason,
  };
}

/* ─── Employer side ─── */

offersRouter.get("/application/:applicationId", requireAuth, requireRole("employer"), (req, res) => {
  const app = loadOwnedApplication(req.params.applicationId, req.user.employer_id);
  if (!app) return res.status(404).json({ error: "Application not found." });
  const rows = db.prepare("SELECT * FROM offer_letters WHERE application_id = ? ORDER BY created_at DESC").all(req.params.applicationId);
  res.json({
    offers: rows.map(r => ({
      ...publicOffer(r, null),
      // The employer needs the link to send it; the candidate's copy never exposes other offers'.
      link: `${FRONTEND_URL}/offer/${r.token}`,
      createdAt: sqlTime(r.created_at).getTime(),
    })),
  });
});

offersRouter.post("/application/:applicationId", requireAuth, requireRole("employer"), async (req, res) => {
  const app = loadOwnedApplication(req.params.applicationId, req.user.employer_id);
  if (!app) return res.status(404).json({ error: "Application not found." });
  const body = String(req.body?.body || "").trim();
  if (body.length < 40) return res.status(400).json({ error: "The offer letter needs actual terms in it." });
  const expiresAt = String(req.body?.expiresAt || "").trim();
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return res.status(400).json({ error: "Expiry must be a date (YYYY-MM-DD)." });

  // An outstanding offer is superseded rather than duplicated, so a candidate never holds two
  // live links and sign one that the employer has already replaced.
  db.prepare("UPDATE offer_letters SET status = 'withdrawn' WHERE application_id = ? AND status = 'sent'")
    .run(req.params.applicationId);

  const id = nextId("off", "offer_letters");
  const token = `off_${crypto.randomBytes(24).toString("hex")}`;
  db.prepare(
    `INSERT INTO offer_letters (id, application_id, employer_id, token, body, position, compensation, start_date, reporting_to, expires_at, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, req.params.applicationId, req.user.employer_id, token, body,
    req.body?.position || app.job_title, req.body?.compensation || null,
    req.body?.startDate || null, req.body?.reportingTo || null, expiresAt || null, req.user.name);

  const link = `${FRONTEND_URL}/offer/${token}`;
  const employer = db.prepare("SELECT name FROM employers WHERE id = ?").get(req.user.employer_id);
  res.status(201).json({ offer: { id, link, status: "sent" } });

  // Sent after responding - an offer is transactional mail (not a CEM), so it doesn't consult
  // marketing consent, but it still must not make the employer wait on delivery.
  {
    const es = emailStrings(localeForEmail(app.candidate_email));
    sendAndLogMail(app.candidate_email, es.offerSubject(employer?.name || "NorthHire"),
      es.offerBody(app.candidate_name, employer?.name || "The employer", req.body?.position || app.job_title, link, expiresAt)
    ).catch(() => {});
  }
});

offersRouter.post("/:id/withdraw", requireAuth, requireRole("employer"), (req, res) => {
  const row = db.prepare("SELECT * FROM offer_letters WHERE id = ? AND employer_id = ?").get(req.params.id, req.user.employer_id);
  if (!row) return res.status(404).json({ error: "Offer not found." });
  if (row.status === "accepted") return res.status(409).json({ error: "That offer was already accepted — withdrawing it now is a conversation to have directly, not a button." });
  db.prepare("UPDATE offer_letters SET status = 'withdrawn' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Candidate side: token-authenticated, no login ─── */

offersRouter.get("/token/:token", (req, res) => {
  const row = db.prepare("SELECT * FROM offer_letters WHERE token = ?").get(req.params.token);
  if (!row) return res.status(404).json({ error: "This offer link isn't valid. Ask your contact to resend it." });
  const employer = db.prepare("SELECT name FROM employers WHERE id = ?").get(row.employer_id);
  const expired = row.status === "sent" && row.expires_at && row.expires_at < new Date().toISOString().slice(0, 10);
  res.json({ offer: { ...publicOffer(row, employer?.name || null), expired } });
});

offersRouter.post("/token/:token/sign", (req, res) => {
  const row = db.prepare("SELECT * FROM offer_letters WHERE token = ?").get(req.params.token);
  if (!row) return res.status(404).json({ error: "This offer link isn't valid." });
  if (row.status !== "sent") return res.status(409).json({ error: `This offer is already marked ${row.status}.` });
  if (row.expires_at && row.expires_at < new Date().toISOString().slice(0, 10)) {
    return res.status(409).json({ error: "This offer has expired. Ask your contact to send a new one." });
  }

  const signedName = String(req.body?.signedName || "").trim();
  const agreed = req.body?.agreed === true;
  // Both halves are what make this a signature rather than a click: an explicit acknowledgement
  // AND the person typing their own name. Neither alone is accepted.
  if (!agreed) return res.status(400).json({ error: "Please confirm you've read and accept the offer." });
  if (signedName.length < 2) return res.status(400).json({ error: "Type your full legal name to sign." });

  db.prepare("UPDATE offer_letters SET status = 'accepted', signed_name = ?, signed_at = datetime('now'), ip_hash = ? WHERE id = ?")
    .run(signedName, hashIp(req.ip), row.id);

  // Accepting the offer moves the application itself, so the employer's pipeline reflects reality
  // without anyone having to remember to drag a card.
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(row.application_id);
  if (app) {
    const history = JSON.parse(app.history_json || "[]");
    history.push({ stage: "Hired", note: `Offer accepted and signed by ${signedName}`, at: new Date().toISOString() });
    db.prepare("UPDATE applications SET stage = 'Hired', note = ?, history_json = ? WHERE id = ?")
      .run(`Offer accepted ${new Date().toISOString().slice(0, 10)}`, JSON.stringify(history), app.id);
  }
  res.json({ ok: true, status: "accepted", signedName });
});

offersRouter.post("/token/:token/decline", (req, res) => {
  const row = db.prepare("SELECT * FROM offer_letters WHERE token = ?").get(req.params.token);
  if (!row) return res.status(404).json({ error: "This offer link isn't valid." });
  if (row.status !== "sent") return res.status(409).json({ error: `This offer is already marked ${row.status}.` });
  db.prepare("UPDATE offer_letters SET status = 'declined', decline_reason = ?, signed_at = datetime('now') WHERE id = ?")
    .run(String(req.body?.reason || "").trim().slice(0, 500) || null, row.id);
  res.json({ ok: true, status: "declined" });
});
