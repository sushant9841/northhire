import crypto from "node:crypto";
import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { verifyPassword, hashPassword, createSessionCookie, clearSessionCookie, requireAgencyAuth, requireAuth, requireRole } from "../auth.js";
import { salesTaxRate } from "../../src/helpers/salesTax.js";
import { calcNetPay } from "../../src/helpers/payrollTax.js";
import { calcStaffingEconomics } from "../../src/helpers/staffingEconomics.js";
import { getConfig } from "../platformConfig.js";
import { sendAndLogMail } from "../mail.js";
import {
  serializeWorker, serializeWorkerForClient, serializeStaffingClient, serializeStaffingBranch, serializeJobOrder, serializeAssignment, serializeSubmittal,
  serializeStaffingTimesheet, serializeStaffingPayrun, serializeStaffingInvoice, serializePlacement,
  serializeStaffingAuditEntry, serializeWsibClaim,
} from "../serialize.js";

export const staffingRouter = Router();

function logStaffingAudit(actorStaffId, action, detail) {
  db.prepare("INSERT INTO staffing_audit_log (id, actor_staff_id, action, detail) VALUES (?, ?, ?, ?)")
    .run(nextId("al", "staffing_audit_log"), actorStaffId, action, detail);
}

function round2(n) { return Math.round(n * 100) / 100; }
function round1(n) { return Math.round(n * 10) / 10; }

/* Burden rates come from the admin-editable platform_config now (see platformConfig.js) instead
   of a hardcoded table - calcStaffingEconomics is imported from the shared helper and called with
   getConfig("staffingRates") at each call site below. */

/* ─── Agency auth ─── */
const AGENCY_LOGIN_LOCKOUT_MAX_ATTEMPTS = 5;
const AGENCY_LOGIN_LOCKOUT_WINDOW_MIN = 15;
staffingRouter.post("/login", (req, res) => {
  const { loginId, password } = req.body || {};
  const id = (loginId || "").toLowerCase().trim();
  const recentFails = db.prepare(
    `SELECT COUNT(*) AS n FROM failed_logins WHERE email = ? AND kind = 'agency' AND created_at >= datetime('now', ?)`
  ).get(id, `-${AGENCY_LOGIN_LOCKOUT_WINDOW_MIN} minutes`).n;
  if (recentFails >= AGENCY_LOGIN_LOCKOUT_MAX_ATTEMPTS) {
    return res.status(429).json({ error: `Too many failed attempts — try again in ${AGENCY_LOGIN_LOCKOUT_WINDOW_MIN} minutes.` });
  }
  const staff = db.prepare("SELECT * FROM agency_staff WHERE login_id = ?").get(id);
  if (!staff || !verifyPassword(password, staff.password_hash, staff.password_salt)) {
    db.prepare("INSERT INTO failed_logins (id, email, kind) VALUES (?, ?, 'agency')").run(nextId("fl", "failed_logins"), id);
    return res.status(staff ? 401 : 404).json({ error: staff ? "Password does not match" : "No agency account with that login ID" });
  }
  db.prepare("DELETE FROM failed_logins WHERE email = ? AND kind = 'agency'").run(id);
  createSessionCookie(res, "agency_session", "agency", staff.id);
  const { password_hash, password_salt, ...pub } = staff;
  res.json({ staff: { id: pub.id, loginId: pub.login_id, name: pub.name, role: pub.role, title: pub.title, seed: pub.seed, email: pub.email } });
});
staffingRouter.post("/logout", (req, res) => { clearSessionCookie(req, res, "agency_session", "agency"); res.json({ ok: true }); });
staffingRouter.get("/me", requireAgencyAuth, (req, res) => {
  const s = req.agencyStaff;
  res.json({ staff: { id: s.id, loginId: s.login_id, name: s.name, role: s.role, title: s.title, seed: s.seed, email: s.email } });
});
staffingRouter.get("/staff", requireAgencyAuth, (req, res) => {
  const rows = db.prepare("SELECT id, name, role, title, seed, branch_id FROM agency_staff ORDER BY name").all();
  res.json({ staff: rows.map(r => ({ id: r.id, name: r.name, role: r.role, title: r.title, seed: r.seed, branchId: r.branch_id })) });
});
staffingRouter.patch("/staff/:id/branch", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM agency_staff WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Staff member not found." });
  db.prepare("UPDATE agency_staff SET branch_id = ? WHERE id = ?").run(req.body?.branchId || null, req.params.id);
  res.json({ ok: true });
});

/* ─── Branches (multi-office / per-desk model) ─── */
staffingRouter.get("/branches", requireAgencyAuth, (req, res) => {
  res.json({ branches: db.prepare("SELECT * FROM staffing_branches ORDER BY name").all().map(serializeStaffingBranch) });
});
staffingRouter.post("/branches", requireAgencyAuth, (req, res) => {
  const { name, city, province } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "A branch name is required." });
  const id = nextId("br", "staffing_branches");
  db.prepare("INSERT INTO staffing_branches (id, name, city, province) VALUES (?, ?, ?, ?)").run(id, name.trim(), city || null, province || null);
  logStaffingAudit(req.agencyStaff.id, "branch_created", `Opened a new branch: ${name.trim()}`);
  res.status(201).json({ branch: serializeStaffingBranch(db.prepare("SELECT * FROM staffing_branches WHERE id = ?").get(id)) });
});
staffingRouter.delete("/branches/:id", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_branches WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Branch not found." });
  // Unassign rather than block the delete or cascade - a closed branch's clients/staff still
  // exist, they just go back to being unassigned (visible in an "Unassigned" bucket) instead of
  // silently orphaned with a dangling foreign key or losing all their other data.
  db.prepare("UPDATE staffing_clients SET branch_id = NULL WHERE branch_id = ?").run(req.params.id);
  db.prepare("UPDATE agency_staff SET branch_id = NULL WHERE branch_id = ?").run(req.params.id);
  db.prepare("DELETE FROM staffing_branches WHERE id = ?").run(req.params.id);
  logStaffingAudit(req.agencyStaff.id, "branch_closed", `Closed branch: ${row.name}`);
  res.json({ ok: true });
});

// Password reset for the agency console - previously the only auth surface with none at all,
// a real gap for a payroll-and-PII-bearing back office. Same cooldown/attempt-lockout shape as
// the main site's reset flow (auth.js), scoped to its own table since agency staff and NorthHire
// users are entirely separate accounts that can share an email address.
const AGENCY_RESET_COOLDOWN_MS = 60 * 1000;
const AGENCY_RESET_MAX_ATTEMPTS = 5;
staffingRouter.post("/reset/request", async (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();
  const staff = db.prepare("SELECT id FROM agency_staff WHERE lower(email) = ?").get(email);
  if (!staff) return res.status(404).json({ error: "No agency account with that email." });
  const existing = db.prepare("SELECT * FROM agency_reset_codes WHERE email = ?").get(email);
  if (existing) {
    const sinceLast = Date.now() - sqlTime(existing.created_at).getTime();
    if (sinceLast < AGENCY_RESET_COOLDOWN_MS) {
      return res.status(429).json({ error: `Please wait ${Math.ceil((AGENCY_RESET_COOLDOWN_MS - sinceLast) / 1000)} more seconds before requesting another code.` });
    }
  }
  const code = crypto.randomInt(100000, 1000000).toString();
  db.prepare("INSERT INTO agency_reset_codes (email, code, attempts) VALUES (?, ?, 0) ON CONFLICT(email) DO UPDATE SET code = excluded.code, attempts = 0, created_at = datetime('now')").run(email, code);
  await sendAndLogMail(email, "Reset your NorthHire Staffing password", `Your reset code is ${code}. It expires in 15 minutes.`);
  // Same fix as the main site's reset flow (auth.js) - never hand the code back to whoever merely
  // knows the target email, only outside production where there's no real email to demo with.
  res.json({ ok: true, code: process.env.NODE_ENV === "production" ? undefined : code });
});
staffingRouter.post("/reset/confirm", (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();
  const { code, newPassword } = req.body || {};
  const rec = db.prepare("SELECT * FROM agency_reset_codes WHERE email = ?").get(email);
  if (!rec) return res.status(400).json({ error: "No pending reset for this account." });
  if (rec.attempts >= AGENCY_RESET_MAX_ATTEMPTS) {
    db.prepare("DELETE FROM agency_reset_codes WHERE email = ?").run(email);
    return res.status(429).json({ error: "Too many incorrect attempts — request a new code." });
  }
  if (Date.now() - sqlTime(rec.created_at).getTime() > 15 * 60 * 1000) return res.status(400).json({ error: "Code expired — request a new one." });
  if (rec.code !== code) {
    db.prepare("UPDATE agency_reset_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
    const remaining = AGENCY_RESET_MAX_ATTEMPTS - rec.attempts - 1;
    return res.status(400).json({ error: `Code does not match.${remaining > 0 ? ` ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` : " No attempts remaining — request a new code."}` });
  }
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const { hash, salt } = hashPassword(newPassword);
  db.prepare("UPDATE agency_staff SET password_hash = ?, password_salt = ? WHERE lower(email) = ?").run(hash, salt, email);
  db.prepare("DELETE FROM agency_reset_codes WHERE email = ?").run(email);
  res.json({ ok: true });
});

/* ─── Job hiring type (reads jobs.hiring_type directly now) ─── */
staffingRouter.get("/job-hiring-type/:jobId", (req, res) => {
  const job = db.prepare("SELECT hiring_type FROM jobs WHERE id = ?").get(req.params.jobId);
  const t = job?.hiring_type || "direct";
  const label = t === "agency-contract" ? "Agency contract — NorthHire Staffing"
    : t === "agency-perm" ? "Agency permanent — placed by NorthHire Staffing"
    : "Direct — hired by employer";
  res.json({ type: t, label });
});

/* ─── Workers ─── */
staffingRouter.get("/workers", requireAgencyAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM staffing_workers").all();
  res.json({ workers: rows.map(serializeWorker) });
});
staffingRouter.post("/workers/opt-in", requireAuth, requireRole("seeker"), (req, res) => {
  const seeker = req.user;
  const existing = db.prepare("SELECT * FROM staffing_workers WHERE person_id = ?").get(seeker.id);
  if (existing) return res.status(409).json({ error: "Already a worker" });
  const id = nextId("w", "staffing_workers");
  db.prepare(
    `INSERT INTO staffing_workers (id, person_id, status, availability, onboarded, province, city, tickets_json)
     VALUES (?, ?, 'active', 'available', date('now'), ?, ?, ?)`
  ).run(id, seeker.id, (seeker.prov || "ON").slice(0, 2).toUpperCase(), seeker.city || "", seeker.skills_json || "[]");
  res.status(201).json({ worker: serializeWorker(db.prepare("SELECT * FROM staffing_workers WHERE id = ?").get(id)) });
});
staffingRouter.get("/workers/by-person/:personId", requireAuth, (req, res) => {
  if (req.user.id !== req.params.personId) return res.status(403).json({ error: "Not allowed." });
  const row = db.prepare("SELECT * FROM staffing_workers WHERE person_id = ?").get(req.params.personId);
  res.json({ worker: serializeWorker(row) });
});
staffingRouter.patch("/workers/:id", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_workers WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Worker not found." });
  const d = req.body || {};
  const fields = {
    status: "status", availability: "availability", province: "province", city: "city",
    payRateFloor: "pay_rate_floor", payRateTarget: "pay_rate_target", sinLast3: "sin_last3",
    workEligibility: "work_eligibility", weExpiry: "we_expiry", notes: "notes", vacBalance: "vac_balance",
    defaultBenefitsPerHr: "default_benefits_per_hr",
  };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (d.tdOnFile !== undefined) { setCols.push("td_on_file = ?"); params.push(d.tdOnFile ? 1 : 0); }
  if (d.directDepositOnFile !== undefined) { setCols.push("direct_deposit_on_file = ?"); params.push(d.directDepositOnFile ? 1 : 0); }
  if (d.emergencyContact !== undefined) { setCols.push("emergency_contact_json = ?"); params.push(JSON.stringify(d.emergencyContact)); }
  if (d.documents !== undefined) { setCols.push("documents_json = ?"); params.push(JSON.stringify(d.documents)); }
  if (d.tickets !== undefined) { setCols.push("tickets_json = ?"); params.push(JSON.stringify(d.tickets)); }
  if (d.backgroundCheck !== undefined) { setCols.push("background_check_json = ?"); params.push(JSON.stringify(d.backgroundCheck)); }
  if (d.references !== undefined) { setCols.push("references_json = ?"); params.push(JSON.stringify(d.references)); }
  if (setCols.length) db.prepare(`UPDATE staffing_workers SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ worker: serializeWorker(db.prepare("SELECT * FROM staffing_workers WHERE id = ?").get(req.params.id)) });
});

staffingRouter.patch("/workers/:id/payout-vacation", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_workers WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Worker not found." });
  const amount = row.vac_balance;
  db.prepare("UPDATE staffing_workers SET vac_balance = 0 WHERE id = ?").run(req.params.id);
  res.json({ worker: serializeWorker(db.prepare("SELECT * FROM staffing_workers WHERE id = ?").get(req.params.id)), amount });
});

/* ─── Clients ─── */
staffingRouter.get("/clients", requireAgencyAuth, (req, res) => {
  res.json({ clients: db.prepare("SELECT * FROM staffing_clients").all().map(serializeStaffingClient) });
});
staffingRouter.get("/clients/by-employer/:employerId", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_clients WHERE employer_id = ?").get(req.params.employerId);
  res.json({ client: serializeStaffingClient(row) });
});
staffingRouter.post("/clients", requireAgencyAuth, (req, res) => {
  const d = req.body || {};
  const existing = db.prepare("SELECT * FROM staffing_clients WHERE employer_id = ?").get(d.employerId);
  if (existing) {
    const fields = {
      status: "status", billToAddress: "bill_to_address", paymentTermsDays: "payment_terms_days",
      defaultSupervisorEmail: "default_supervisor_email", conversionFeePct: "conversion_fee_pct",
      creditLimit: "credit_limit", currentAR: "current_ar", industry: "industry", markup: "markup", notes: "notes",
      branchId: "branch_id",
    };
    const setCols = []; const params = [];
    for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
    if (d.poRequired !== undefined) { setCols.push("po_required = ?"); params.push(d.poRequired ? 1 : 0); }
    if (setCols.length) db.prepare(`UPDATE staffing_clients SET ${setCols.join(", ")} WHERE id = ?`).run(...params, existing.id);
    return res.json({ client: serializeStaffingClient(db.prepare("SELECT * FROM staffing_clients WHERE id = ?").get(existing.id)) });
  }
  const id = nextId("c", "staffing_clients");
  db.prepare(
    `INSERT INTO staffing_clients (id, employer_id, branch_id, industry, notes) VALUES (?, ?, ?, ?, ?)`
  ).run(id, d.employerId, d.branchId || null, d.industry || null, d.notes || null);
  res.status(201).json({ client: serializeStaffingClient(db.prepare("SELECT * FROM staffing_clients WHERE id = ?").get(id)) });
});
staffingRouter.patch("/clients/:id/sign-msa", requireAgencyAuth, (req, res) => {
  db.prepare("UPDATE staffing_clients SET status = 'active', signed_msa = date('now') WHERE id = ?").run(req.params.id);
  const client = db.prepare("SELECT * FROM staffing_clients WHERE id = ?").get(req.params.id);
  const employer = db.prepare("SELECT name FROM employers WHERE id = ?").get(client.employer_id);
  logStaffingAudit(req.agencyStaff.id, "msa_signed", `MSA signed with ${employer?.name || client.id}`);
  res.json({ client: serializeStaffingClient(client) });
});

/* ─── Job orders ─── */
staffingRouter.get("/job-orders", requireAgencyAuth, (req, res) => {
  res.json({ jobOrders: db.prepare("SELECT * FROM staffing_job_orders").all().map(serializeJobOrder) });
});
function creditHoldError(client) {
  if (client.current_ar >= client.credit_limit) {
    const employer = db.prepare("SELECT name FROM employers WHERE id = ?").get(client.employer_id);
    return `${employer?.name || "This client"} is over its credit limit ($${client.current_ar.toLocaleString()} of $${client.credit_limit.toLocaleString()} AR) — settle outstanding invoices before placing new orders.`;
  }
  return null;
}
staffingRouter.post("/job-orders", requireAgencyAuth, (req, res) => {
  const d = req.body || {};
  const client = db.prepare("SELECT * FROM staffing_clients WHERE id = ?").get(d.client);
  if (!client) return res.status(404).json({ error: "Client not found." });
  const holdMsg = creditHoldError(client);
  if (holdMsg) return res.status(409).json({ error: holdMsg });
  const id = nextId("jo", "staffing_job_orders");
  db.prepare(
    `INSERT INTO staffing_job_orders
      (id, client_id, status, urgency, title, positions, location, province, start_date, end_date, ongoing,
       shift_pattern, overtime_available, pay_rate, bill_rate, must_have_json, nice_to_have_json,
       supervisor, supervisor_email, supervisor_phone, ppe, notes)
     VALUES (?,?,'open',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, d.client, d.urgency || "medium", d.title, d.positions || 1, d.location, d.province,
    d.startDate || null, d.endDate || null, d.ongoing ? 1 : 0, d.shiftPattern || null, d.overtimeAvailable ? 1 : 0,
    d.payRate, d.billRate, JSON.stringify(d.mustHave || []), JSON.stringify(d.niceToHave || []),
    d.supervisor || null, d.supervisorEmail || null, d.supervisorPhone || null, d.ppe || null, d.notes || null);
  res.status(201).json({ jobOrder: serializeJobOrder(db.prepare("SELECT * FROM staffing_job_orders WHERE id = ?").get(id)) });
});
staffingRouter.patch("/job-orders/:id", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_job_orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Job order not found." });
  const d = req.body || {};
  const fields = { status: "status", urgency: "urgency", title: "title", positions: "positions", filled: "filled",
    location: "location", province: "province", startDate: "start_date", endDate: "end_date",
    shiftPattern: "shift_pattern", payRate: "pay_rate", billRate: "bill_rate",
    supervisor: "supervisor", supervisorEmail: "supervisor_email", supervisorPhone: "supervisor_phone",
    ppe: "ppe", notes: "notes" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (d.ongoing !== undefined) { setCols.push("ongoing = ?"); params.push(d.ongoing ? 1 : 0); }
  if (d.overtimeAvailable !== undefined) { setCols.push("overtime_available = ?"); params.push(d.overtimeAvailable ? 1 : 0); }
  if (d.mustHave !== undefined) { setCols.push("must_have_json = ?"); params.push(JSON.stringify(d.mustHave)); }
  if (d.niceToHave !== undefined) { setCols.push("nice_to_have_json = ?"); params.push(JSON.stringify(d.niceToHave)); }
  // The one action on this route that moves real money math - worth a real audit trail, unlike
  // every other cosmetic field here (title, location, notes, ...).
  if ((d.payRate !== undefined && d.payRate !== row.pay_rate) || (d.billRate !== undefined && d.billRate !== row.bill_rate)) {
    logStaffingAudit(req.agencyStaff.id, "job_order_rate_changed",
      `${row.title}: pay $${row.pay_rate ?? "—"}→$${d.payRate ?? row.pay_rate}, bill $${row.bill_rate ?? "—"}→$${d.billRate ?? row.bill_rate}`);
  }
  if (setCols.length) db.prepare(`UPDATE staffing_job_orders SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ jobOrder: serializeJobOrder(db.prepare("SELECT * FROM staffing_job_orders WHERE id = ?").get(req.params.id)) });
});
staffingRouter.patch("/job-orders/:id/close", requireAgencyAuth, (req, res) => {
  db.prepare("UPDATE staffing_job_orders SET status = 'closed' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Submittal pipeline (submitted -> client review -> interview -> offer -> placed/rejected) -
   previously a worker went straight from "matched %" to a real placement with no stage tracking
   at all, unlike how a real staffing desk actually works a job order. ─── */
const SUBMITTAL_STAGES = ["submitted", "client_review", "interview", "offer", "placed", "rejected"];
staffingRouter.get("/job-orders/:id/submittals", requireAgencyAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM staffing_submittals WHERE job_order_id = ? ORDER BY created_at ASC").all(req.params.id);
  res.json({ submittals: rows.map(serializeSubmittal) });
});
staffingRouter.post("/job-orders/:id/submittals", requireAgencyAuth, (req, res) => {
  const jo = db.prepare("SELECT * FROM staffing_job_orders WHERE id = ?").get(req.params.id);
  if (!jo) return res.status(404).json({ error: "Job order not found." });
  const { workerId } = req.body || {};
  if (!workerId) return res.status(400).json({ error: "A worker is required." });
  const active = db.prepare(
    "SELECT id FROM staffing_submittals WHERE job_order_id = ? AND worker_id = ? AND stage NOT IN ('placed','rejected')"
  ).get(req.params.id, workerId);
  if (active) return res.status(409).json({ error: "This worker already has an active submittal for this job order." });
  const id = nextId("sub", "staffing_submittals");
  db.prepare("INSERT INTO staffing_submittals (id, job_order_id, worker_id, stage) VALUES (?, ?, ?, 'submitted')").run(id, req.params.id, workerId);
  logStaffingAudit(req.agencyStaff.id, "worker_submitted", `Submitted a worker to job order "${jo.title}"`);
  res.status(201).json({ submittal: serializeSubmittal(db.prepare("SELECT * FROM staffing_submittals WHERE id = ?").get(id)) });
});
staffingRouter.patch("/submittals/:id", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_submittals WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Submittal not found." });
  const { stage, notes } = req.body || {};
  if (stage !== undefined) {
    if (!SUBMITTAL_STAGES.includes(stage)) return res.status(400).json({ error: "Invalid stage." });
    if (["placed", "rejected"].includes(row.stage)) return res.status(400).json({ error: "This submittal is already closed out." });
  }
  const setCols = ["updated_at = datetime('now')"]; const params = [];
  if (stage !== undefined) { setCols.push("stage = ?"); params.push(stage); }
  if (notes !== undefined) { setCols.push("notes = ?"); params.push(notes); }
  db.prepare(`UPDATE staffing_submittals SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  if (stage !== undefined) {
    const jo = db.prepare("SELECT title FROM staffing_job_orders WHERE id = ?").get(row.job_order_id);
    logStaffingAudit(req.agencyStaff.id, "submittal_stage_changed", `Job order "${jo?.title || row.job_order_id}": submittal moved to ${stage}`);
  }
  res.json({ submittal: serializeSubmittal(db.prepare("SELECT * FROM staffing_submittals WHERE id = ?").get(req.params.id)) });
});

/* ─── Assignments ─── */
staffingRouter.get("/assignments", requireAgencyAuth, (req, res) => {
  res.json({ assignments: db.prepare("SELECT * FROM staffing_assignments").all().map(serializeAssignment) });
});
staffingRouter.post("/assignments", requireAgencyAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("a", "staffing_assignments");
  // Benefits/hr defaults to the worker's own default (set on their profile) when the placement
  // form doesn't override it, so every new assignment carries a real burden figure instead of the
  // permanently-dead 0 this used to always pass.
  const worker = d.worker ? db.prepare("SELECT default_benefits_per_hr FROM staffing_workers WHERE id = ?").get(d.worker) : null;
  const benefitsPerHr = d.benefitsPerHr !== undefined ? d.benefitsPerHr : (worker?.default_benefits_per_hr || 0);
  db.prepare(
    `INSERT INTO staffing_assignments
      (id, worker_id, client_id, job_order_id, status, start_date, ongoing, pay_rate, bill_rate, benefits_per_hr, supervisor, supervisor_email, site, shift_pattern, notes)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, d.worker, d.client, d.jobOrder || null, d.startDate || new Date().toISOString().slice(0, 10),
    d.ongoing !== false ? 1 : 0, d.payRate, d.billRate, benefitsPerHr, d.supervisor || null, d.supervisorEmail || null,
    d.site || null, d.shiftPattern || null, d.notes || null);
  if (d.jobOrder) {
    const jo = db.prepare("SELECT * FROM staffing_job_orders WHERE id = ?").get(d.jobOrder);
    if (jo) {
      const filled = jo.filled + 1;
      db.prepare("UPDATE staffing_job_orders SET filled = ? WHERE id = ?").run(filled, d.jobOrder);
      if (filled >= jo.positions) db.prepare("UPDATE staffing_job_orders SET status = 'filled' WHERE id = ?").run(d.jobOrder);
    }
  }
  if (d.worker) db.prepare("UPDATE staffing_workers SET availability = 'on-assignment' WHERE id = ?").run(d.worker);
  res.status(201).json({ assignment: serializeAssignment(db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(id)) });
});
staffingRouter.patch("/assignments/:id", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Assignment not found." });
  const d = req.body || {};
  const fields = { payRate: "pay_rate", billRate: "bill_rate", benefitsPerHr: "benefits_per_hr",
    supervisor: "supervisor", supervisorEmail: "supervisor_email", site: "site", shiftPattern: "shift_pattern", notes: "notes" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if ((d.payRate !== undefined && d.payRate !== row.pay_rate) || (d.billRate !== undefined && d.billRate !== row.bill_rate)) {
    logStaffingAudit(req.agencyStaff.id, "assignment_rate_changed",
      `Assignment ${req.params.id}: pay $${row.pay_rate ?? "—"}→$${d.payRate ?? row.pay_rate}, bill $${row.bill_rate ?? "—"}→$${d.billRate ?? row.bill_rate}`);
  }
  if (setCols.length) db.prepare(`UPDATE staffing_assignments SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ assignment: serializeAssignment(db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(req.params.id)) });
});
staffingRouter.patch("/assignments/:id/end", requireAgencyAuth, (req, res) => {
  const a = db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Assignment not found." });
  const endDate = req.body?.endDate || new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE staffing_assignments SET status = 'completed', end_date = ? WHERE id = ?").run(endDate, req.params.id);
  if (a.worker_id) db.prepare("UPDATE staffing_workers SET availability = 'available' WHERE id = ?").run(a.worker_id);
  res.json({ ok: true });
});
staffingRouter.get("/assignments/:id/margin", requireAgencyAuth, (req, res) => {
  const a = db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found." });
  const w = db.prepare("SELECT * FROM staffing_workers WHERE id = ?").get(a.worker_id);
  res.json(calcStaffingEconomics(a.pay_rate, a.bill_rate, w?.province || "ON", a.benefits_per_hr || 0, getConfig("staffingRates")));
});

/* ─── Timesheets ─── */
function timesheetTotal(t) { const h = JSON.parse(t.hours_json || "{}"); return (h.mon||0)+(h.tue||0)+(h.wed||0)+(h.thu||0)+(h.fri||0)+(h.sat||0)+(h.sun||0); }
function timesheetGross(t, a) { if (!a) return 0; const total = timesheetTotal(t); const reg = Math.max(0, total - (t.ot_hours || 0)); return reg * a.pay_rate + (t.ot_hours || 0) * a.pay_rate * 1.5; }
function timesheetBill(t, a) { if (!a) return 0; const total = timesheetTotal(t); const reg = Math.max(0, total - (t.ot_hours || 0)); return reg * a.bill_rate + (t.ot_hours || 0) * a.bill_rate * 1.5; }

staffingRouter.get("/timesheets", requireAgencyAuth, (req, res) => {
  res.json({ timesheets: db.prepare("SELECT * FROM staffing_timesheets").all().map(serializeStaffingTimesheet) });
});
staffingRouter.get("/timesheets/worker/:workerId", requireAgencyAuth, (req, res) => {
  res.json({ timesheets: db.prepare("SELECT * FROM staffing_timesheets WHERE worker_id = ?").all(req.params.workerId).map(serializeStaffingTimesheet) });
});
staffingRouter.post("/timesheets/draft", requireAgencyAuth, (req, res) => {
  const { assignmentId, workerId, weekStart, hours, otHours, notes } = req.body || {};
  const existing = db.prepare("SELECT * FROM staffing_timesheets WHERE assignment_id = ? AND week_start = ?").get(assignmentId, weekStart);
  if (existing) {
    if (existing.status !== "draft") return res.status(409).json({ error: "Timesheet already submitted" });
    db.prepare("UPDATE staffing_timesheets SET hours_json = ?, ot_hours = ?, notes = ? WHERE id = ?")
      .run(JSON.stringify(hours), otHours || 0, notes || "", existing.id);
    return res.json({ ok: true, timesheet: serializeStaffingTimesheet(db.prepare("SELECT * FROM staffing_timesheets WHERE id = ?").get(existing.id)) });
  }
  const id = nextId("ts", "staffing_timesheets");
  db.prepare(
    `INSERT INTO staffing_timesheets (id, assignment_id, worker_id, week_start, status, hours_json, ot_hours, notes)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`
  ).run(id, assignmentId, workerId, weekStart, JSON.stringify(hours), otHours || 0, notes || "");
  res.status(201).json({ ok: true, timesheet: serializeStaffingTimesheet(db.prepare("SELECT * FROM staffing_timesheets WHERE id = ?").get(id)) });
});
staffingRouter.patch("/timesheets/:id/submit", requireAgencyAuth, (req, res) => {
  const t = db.prepare("SELECT * FROM staffing_timesheets WHERE id = ?").get(req.params.id);
  if (!t) return res.status(404).json({ error: "Not found" });
  if (t.status !== "draft") return res.status(409).json({ error: "Already submitted" });
  db.prepare("UPDATE staffing_timesheets SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
staffingRouter.patch("/timesheets/:id/approve", requireAgencyAuth, (req, res) => {
  db.prepare("UPDATE staffing_timesheets SET status = 'approved', approved_at = datetime('now'), approved_by = ? WHERE id = ?")
    .run(req.body?.approver || req.agencyStaff.name, req.params.id);
  res.json({ ok: true });
});
staffingRouter.patch("/timesheets/:id/reject", requireAgencyAuth, (req, res) => {
  const t = db.prepare("SELECT * FROM staffing_timesheets WHERE id = ?").get(req.params.id);
  if (!t) return res.status(404).json({ error: "Not found" });
  const note = `${t.notes || ""}\n[Returned: ${req.body?.reason || "reason not given"}]`;
  db.prepare("UPDATE staffing_timesheets SET status = 'draft', submitted_at = NULL, notes = ? WHERE id = ?").run(note, req.params.id);
  res.json({ ok: true });
});

/* ─── Payroll ─── */
staffingRouter.post("/payroll/run", requireAgencyAuth, (req, res) => {
  const { periodStart, periodEnd } = req.body || {};
  const taxConfig = getConfig("payrollTax");
  // Real CPP/EI annual-maximum enforcement (same as HR payroll) needs each worker's year-to-date
  // contributions, summed from every already-paid run this calendar year.
  const payYear = (periodStart || "").slice(0, 4);
  const paidRunsThisYear = db.prepare("SELECT lines_json FROM staffing_payruns WHERE status = 'paid' AND period_start LIKE ?").all(`${payYear}%`);
  const ytdByWorker = {};
  for (const run of paidRunsThisYear) {
    for (const line of JSON.parse(run.lines_json || "[]")) {
      if (!ytdByWorker[line.worker]) ytdByWorker[line.worker] = { cpp: 0, ei: 0 };
      ytdByWorker[line.worker].cpp += line.cpp || 0;
      ytdByWorker[line.worker].ei += line.ei || 0;
    }
  }
  const inPeriod = db.prepare("SELECT * FROM staffing_timesheets WHERE status = 'approved' AND week_start >= ? AND week_start < ?").all(periodStart, periodEnd);
  const byWorker = {};
  for (const t of inPeriod) {
    const a = db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(t.assignment_id);
    const gross = timesheetGross(t, a), hours = timesheetTotal(t);
    if (!byWorker[t.worker_id]) byWorker[t.worker_id] = { hours: 0, gross: 0, otHrs: 0 };
    byWorker[t.worker_id].hours += hours; byWorker[t.worker_id].gross += gross; byWorker[t.worker_id].otHrs += (t.ot_hours || 0);
  }
  const lines = Object.entries(byWorker).map(([wid, d]) => {
    const gross = round2(d.gross);
    const w = db.prepare("SELECT province, td_on_file FROM staffing_workers WHERE id = ?").get(wid);
    const ytd = ytdByWorker[wid] || { cpp: 0, ei: 0 };
    const calc = calcNetPay(gross, { province: w?.province, payPeriodsPerYear: 26, td1OnFile: !!w?.td_on_file, ytdCpp: ytd.cpp, ytdEi: ytd.ei }, taxConfig);
    return { worker: wid, hours: d.hours, gross, net: round2(calc.net), otHrs: d.otHrs, cpp: calc.cpp, ei: calc.ei, fedTax: calc.fedTax, provTax: calc.provTax };
  });
  const totalHours = lines.reduce((s, l) => s + l.hours, 0);
  const totalGross = round2(lines.reduce((s, l) => s + l.gross, 0));
  const totalNet = round2(lines.reduce((s, l) => s + l.net, 0));
  const id = nextId("spr", "staffing_payruns");
  db.prepare(
    `INSERT INTO staffing_payruns (id, period_start, period_end, run_date, status, workers, total_hours, total_gross, total_net, lines_json)
     VALUES (?, ?, ?, date('now'), 'pending', ?, ?, ?, ?, ?)`
  ).run(id, periodStart, periodEnd, lines.length, totalHours, totalGross, totalNet, JSON.stringify(lines));
  db.prepare("UPDATE staffing_timesheets SET status = 'paid' WHERE status = 'approved' AND week_start >= ? AND week_start < ?").run(periodStart, periodEnd);
  res.status(201).json({ payrun: serializeStaffingPayrun(db.prepare("SELECT * FROM staffing_payruns WHERE id = ?").get(id)) });
});
staffingRouter.get("/payruns", requireAgencyAuth, (req, res) => {
  res.json({ payruns: db.prepare("SELECT * FROM staffing_payruns ORDER BY run_date DESC").all().map(serializeStaffingPayrun) });
});
staffingRouter.patch("/payruns/:id/finalize", requireAgencyAuth, (req, res) => {
  const run = db.prepare("SELECT * FROM staffing_payruns WHERE id = ?").get(req.params.id);
  if (!run) return res.status(404).json({ error: "Not found." });
  // Without this, finalizing twice (or reviving an already-reversed run back to "paid" with no
  // new reason recorded) was possible - matches the same guard added to HR's execute route.
  if (run.status !== "pending") return res.status(400).json({ error: "Only a pending payroll run can be finalized." });
  db.prepare("UPDATE staffing_payruns SET status = 'paid' WHERE id = ?").run(req.params.id);
  logStaffingAudit(req.agencyStaff.id, "payroll_finalized", `Finalized staffing payroll ${run.period_start} → ${run.period_end} (${run.workers} workers, $${run.total_net?.toLocaleString()} net)`);
  res.json({ ok: true });
});
// Same reversal pattern established for HR payroll/invoices: only valid from 'paid', requires a
// reason, flips to 'reversed', logs to the audit trail.
staffingRouter.patch("/payruns/:id/reverse", requireAgencyAuth, (req, res) => {
  const run = db.prepare("SELECT * FROM staffing_payruns WHERE id = ?").get(req.params.id);
  if (!run) return res.status(404).json({ error: "Not found." });
  if (run.status !== "paid") return res.status(400).json({ error: "Only a finalized (paid) payroll run can be reversed." });
  const reason = (req.body?.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "A reason is required to reverse a finalized payroll run." });
  db.prepare("UPDATE staffing_payruns SET status = 'reversed' WHERE id = ?").run(req.params.id);
  logStaffingAudit(req.agencyStaff.id, "payroll_reversed", `Reversed staffing payroll ${run.period_start} → ${run.period_end} ($${run.total_net?.toLocaleString()} net): ${reason}`);
  res.json({ ok: true });
});

/* ─── Invoicing ─── */
staffingRouter.post("/invoices/generate", requireAgencyAuth, async (req, res) => {
  const { weekStart } = req.body || {};
  const inWeek = db.prepare("SELECT * FROM staffing_timesheets WHERE status = 'approved' AND week_start = ?").all(weekStart);
  const byClient = {};
  for (const t of inWeek) {
    const a = db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(t.assignment_id);
    if (!a) continue;
    if (!byClient[a.client_id]) byClient[a.client_id] = { lines: [] };
    const total = timesheetTotal(t); const reg = Math.max(0, total - (t.ot_hours || 0));
    const subtotal = round2(reg * a.bill_rate + (t.ot_hours || 0) * a.bill_rate * 1.5);
    byClient[a.client_id].lines.push({ assignment: a.id, worker: t.worker_id, hours: total, billRate: a.bill_rate, otHrs: t.ot_hours || 0, subtotal });
  }
  const existingNumbers = new Set(db.prepare("SELECT number FROM staffing_invoices").all().map(r => r.number));
  const nextNumber = () => {
    const y = new Date().getFullYear(); let n;
    do { n = `SI-${y}-${1000 + existingNumbers.size + 1 + Math.floor(Math.random() * 50)}`; } while (existingNumbers.has(n));
    existingNumbers.add(n); return n;
  };
  const created = [];
  for (const [cid, d] of Object.entries(byClient)) {
    const client = db.prepare("SELECT * FROM staffing_clients WHERE id = ?").get(cid);
    const subtotal = round2(d.lines.reduce((s, l) => s + l.subtotal, 0));
    const hst = round2(subtotal * salesTaxRate(client?.province));
    const total = round2(subtotal + hst);
    const dueDays = client?.payment_terms_days || 30;
    const due = new Date(); due.setDate(due.getDate() + dueDays);
    const id = nextId("si", "staffing_invoices");
    db.prepare(
      `INSERT INTO staffing_invoices (id, number, client_id, week_start, issued, due, status, lines_json, subtotal, gst, hst, total, po)
       VALUES (?, ?, ?, ?, date('now'), ?, 'pending', ?, ?, 0, ?, ?, ?)`
    ).run(id, nextNumber(), cid, weekStart, due.toISOString().slice(0, 10), JSON.stringify(d.lines), subtotal, hst, total, client?.po_number || "—");
    const invoice = serializeStaffingInvoice(db.prepare("SELECT * FROM staffing_invoices WHERE id = ?").get(id));
    // Only sent when the client actually has a billing contact on file, since sending to no one
    // isn't "emailed" either.
    if (client?.default_supervisor_email) {
      await sendAndLogMail(client.default_supervisor_email, `Invoice ${invoice.number} from your staffing agency`,
        `Invoice ${invoice.number} for the week of ${weekStart} is ready: $${total.toFixed(2)} total, due ${invoice.due}.`);
    }
    created.push(invoice);
  }
  if (created.length) logStaffingAudit(req.agencyStaff.id, "invoices_generated", `Generated ${created.length} invoice${created.length === 1 ? "" : "s"} for week of ${weekStart}`);
  res.status(201).json({ invoices: created });
});
staffingRouter.get("/invoices", requireAgencyAuth, (req, res) => {
  res.json({ invoices: db.prepare("SELECT * FROM staffing_invoices ORDER BY issued DESC").all().map(serializeStaffingInvoice) });
});
staffingRouter.patch("/invoices/:id/paid", requireAgencyAuth, (req, res) => {
  db.prepare("UPDATE staffing_invoices SET status = 'paid', paid_on = date('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Placements ─── */
staffingRouter.get("/placements", requireAgencyAuth, (req, res) => {
  res.json({ placements: db.prepare("SELECT * FROM staffing_placements").all().map(serializePlacement) });
});
staffingRouter.post("/placements", requireAgencyAuth, (req, res) => {
  const d = req.body || {};
  const salary = Number(d.salary) || 0, feePct = Number(d.feePct) || 20;
  const fee = round2(salary * feePct / 100);
  const commissionPct = getConfig("staffingAgency").recruiterCommissionPct || 0;
  const commission = d.recruiterId ? round2(fee * commissionPct / 100) : null;
  const id = nextId("pl", "staffing_placements");
  db.prepare(
    `INSERT INTO staffing_placements (id, client_id, candidate_id, role, offered_at, status, salary, fee_pct, fee, notes, recruiter_id, commission)
     VALUES (?, ?, ?, ?, date('now'), 'in-progress', ?, ?, ?, ?, ?, ?)`
  ).run(id, d.client, d.candidate || null, d.role, salary, feePct, fee, d.notes || null, d.recruiterId || null, commission);
  res.status(201).json({ placement: serializePlacement(db.prepare("SELECT * FROM staffing_placements WHERE id = ?").get(id)) });
});
staffingRouter.patch("/placements/:id/recruiter", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_placements WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Placement not found." });
  const { recruiterId } = req.body || {};
  const commissionPct = getConfig("staffingAgency").recruiterCommissionPct || 0;
  const commission = recruiterId ? round2(row.fee * commissionPct / 100) : null;
  db.prepare("UPDATE staffing_placements SET recruiter_id = ?, commission = ? WHERE id = ?").run(recruiterId || null, commission, req.params.id);
  res.json({ placement: serializePlacement(db.prepare("SELECT * FROM staffing_placements WHERE id = ?").get(req.params.id)) });
});
// Commission is only payable once the fee itself has actually been billed (guaranteed status =
// invoiced, still within the replacement-guarantee window) - paying a recruiter before the agency
// has even invoiced the client would be commission on money that was never actually earned yet.
staffingRouter.patch("/placements/:id/pay-commission", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_placements WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Placement not found." });
  if (!row.recruiter_id) return res.status(400).json({ error: "No recruiter assigned to this placement." });
  if (row.status !== "guaranteed") return res.status(400).json({ error: row.status === "clawed-back" ? "This placement was clawed back — no commission is payable." : "Commission is only payable once the placement fee has been invoiced." });
  if (row.commission_paid) return res.status(400).json({ error: "Commission already paid." });
  db.prepare("UPDATE staffing_placements SET commission_paid = 1, commission_paid_at = date('now') WHERE id = ?").run(req.params.id);
  const recruiter = db.prepare("SELECT name FROM agency_staff WHERE id = ?").get(row.recruiter_id);
  logStaffingAudit(req.agencyStaff.id, "commission_paid", `Paid $${row.commission?.toFixed(2)} commission to ${recruiter?.name || row.recruiter_id} for ${row.role}`);
  res.json({ placement: serializePlacement(db.prepare("SELECT * FROM staffing_placements WHERE id = ?").get(req.params.id)) });
});
staffingRouter.patch("/placements/:id/accept", requireAgencyAuth, (req, res) => {
  const { startDate } = req.body || {};
  const ge = new Date(startDate); ge.setDate(ge.getDate() + 90);
  db.prepare("UPDATE staffing_placements SET status = 'accepted', start_date = ?, guarantee_ends = ? WHERE id = ?")
    .run(startDate, ge.toISOString().slice(0, 10), req.params.id);
  res.json({ ok: true });
});
staffingRouter.patch("/placements/:id/invoice", requireAgencyAuth, (req, res) => {
  db.prepare("UPDATE staffing_placements SET status = 'guaranteed', invoiced_on = date('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
staffingRouter.patch("/placements/:id/clawback", requireAgencyAuth, (req, res) => {
  db.prepare("UPDATE staffing_placements SET status = 'clawed-back', clawback_reason = ?, replacement_due = 1 WHERE id = ?")
    .run(req.body?.reason || null, req.params.id);
  res.json({ ok: true });
});

/* ─── Analytics ─── */
/* ─── Employer-facing views (the client side of a staffing relationship, not agency back-office) ───
   An employer with a signed staffing client record can see and act on their own jobOrders/
   assignments/timesheets - never another employer's - without needing agency-staff credentials. */
function resolveOwnClient(req, res) {
  const client = db.prepare("SELECT * FROM staffing_clients WHERE employer_id = ?").get(req.user.employer_id);
  if (!client) { res.status(404).json({ error: "No staffing relationship on file for your company." }); return null; }
  return client;
}
staffingRouter.get("/employer/data", requireAuth, requireRole("employer"), (req, res) => {
  const client = resolveOwnClient(req, res); if (!client) return;
  const jobOrders = db.prepare("SELECT * FROM staffing_job_orders WHERE client_id = ?").all(client.id);
  const assignments = db.prepare("SELECT * FROM staffing_assignments WHERE client_id = ?").all(client.id);
  const asnIds = assignments.map(a => a.id);
  const timesheets = asnIds.length
    ? db.prepare(`SELECT * FROM staffing_timesheets WHERE assignment_id IN (${asnIds.map(() => "?").join(",")})`).all(...asnIds)
    : [];
  const workerIds = [...new Set(assignments.map(a => a.worker_id))];
  const workers = workerIds.length
    ? db.prepare(`SELECT * FROM staffing_workers WHERE id IN (${workerIds.map(() => "?").join(",")})`).all(...workerIds)
    : [];
  const invoices = db.prepare("SELECT * FROM staffing_invoices WHERE client_id = ?").all(client.id);
  res.json({
    client: serializeStaffingClient(client), jobOrders: jobOrders.map(serializeJobOrder),
    assignments: assignments.map(serializeAssignment), timesheets: timesheets.map(serializeStaffingTimesheet),
    workers: workers.map(serializeWorkerForClient), invoices: invoices.map(serializeStaffingInvoice),
  });
});
staffingRouter.post("/employer/job-orders", requireAuth, requireRole("employer"), (req, res) => {
  const client = resolveOwnClient(req, res); if (!client) return;
  const holdMsg = creditHoldError(client);
  if (holdMsg) return res.status(409).json({ error: "Your account is over its credit limit — please settle outstanding invoices before requesting more workers." });
  const d = req.body || {};
  const id = nextId("jo", "staffing_job_orders");
  db.prepare(
    `INSERT INTO staffing_job_orders (id, client_id, status, urgency, title, positions, location, province, start_date, end_date, ongoing, shift_pattern, pay_rate, bill_rate, must_have_json, notes)
     VALUES (?,?,'open',?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, client.id, d.urgency || "medium", d.title, d.positions || 1, d.location || client.bill_to_address, client.industry,
    d.startDate || null, d.endDate || null, d.ongoing ? 1 : 0, d.shiftPattern || null, d.payRate || 0, d.billRate || 0,
    JSON.stringify(d.mustHave || []), d.notes || "");
  res.status(201).json({ jobOrder: serializeJobOrder(db.prepare("SELECT * FROM staffing_job_orders WHERE id = ?").get(id)) });
});
function ownTimesheetForEmployer(req, res) {
  const client = resolveOwnClient(req, res); if (!client) return null;
  const t = db.prepare("SELECT * FROM staffing_timesheets WHERE id = ?").get(req.params.id);
  if (!t) { res.status(404).json({ error: "Timesheet not found." }); return null; }
  const a = db.prepare("SELECT * FROM staffing_assignments WHERE id = ?").get(t.assignment_id);
  if (!a || a.client_id !== client.id) { res.status(403).json({ error: "Not your timesheet to approve." }); return null; }
  return t;
}
staffingRouter.patch("/employer/timesheets/:id/approve", requireAuth, requireRole("employer"), (req, res) => {
  if (!ownTimesheetForEmployer(req, res)) return;
  db.prepare("UPDATE staffing_timesheets SET status = 'approved', approved_at = datetime('now'), approved_by = ? WHERE id = ?")
    .run(req.body?.approver || req.user.email, req.params.id);
  res.json({ ok: true });
});
staffingRouter.patch("/employer/timesheets/:id/reject", requireAuth, requireRole("employer"), (req, res) => {
  const t = ownTimesheetForEmployer(req, res); if (!t) return;
  const note = `${t.notes || ""}\n[Returned: ${req.body?.reason || "reason not given"}]`;
  db.prepare("UPDATE staffing_timesheets SET status = 'draft', submitted_at = NULL, notes = ? WHERE id = ?").run(note, req.params.id);
  res.json({ ok: true });
});

/* ─── Seeker-facing "worker portal" (self-service, main NorthHire session - not agency staff) ─── */
function resolveOwnWorker(req, res) {
  const worker = db.prepare("SELECT * FROM staffing_workers WHERE person_id = ?").get(req.user.id);
  if (!worker) { res.status(404).json({ error: "You haven't opted in as a worker yet." }); return null; }
  return worker;
}
staffingRouter.get("/my/data", requireAuth, requireRole("seeker"), (req, res) => {
  const worker = resolveOwnWorker(req, res); if (!worker) return;
  const assignments = db.prepare("SELECT * FROM staffing_assignments WHERE worker_id = ?").all(worker.id);
  const timesheets = db.prepare("SELECT * FROM staffing_timesheets WHERE worker_id = ?").all(worker.id);
  res.json({
    worker: serializeWorker(worker), assignments: assignments.map(serializeAssignment),
    timesheets: timesheets.map(serializeStaffingTimesheet),
  });
});
staffingRouter.post("/my/timesheets/draft", requireAuth, requireRole("seeker"), (req, res) => {
  const worker = resolveOwnWorker(req, res); if (!worker) return;
  const { assignmentId, weekStart, hours, otHours, notes } = req.body || {};
  const a = db.prepare("SELECT * FROM staffing_assignments WHERE id = ? AND worker_id = ?").get(assignmentId, worker.id);
  if (!a) return res.status(403).json({ error: "Not your assignment." });
  const existing = db.prepare("SELECT * FROM staffing_timesheets WHERE assignment_id = ? AND week_start = ?").get(assignmentId, weekStart);
  if (existing) {
    if (existing.status !== "draft") return res.status(409).json({ error: "Timesheet already submitted" });
    db.prepare("UPDATE staffing_timesheets SET hours_json = ?, ot_hours = ?, notes = ? WHERE id = ?")
      .run(JSON.stringify(hours), otHours || 0, notes || "", existing.id);
    return res.json({ ok: true, timesheet: serializeStaffingTimesheet(db.prepare("SELECT * FROM staffing_timesheets WHERE id = ?").get(existing.id)) });
  }
  const id = nextId("ts", "staffing_timesheets");
  db.prepare(
    `INSERT INTO staffing_timesheets (id, assignment_id, worker_id, week_start, status, hours_json, ot_hours, notes)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`
  ).run(id, assignmentId, worker.id, weekStart, JSON.stringify(hours), otHours || 0, notes || "");
  res.status(201).json({ ok: true, timesheet: serializeStaffingTimesheet(db.prepare("SELECT * FROM staffing_timesheets WHERE id = ?").get(id)) });
});
staffingRouter.patch("/my/availability", requireAuth, requireRole("seeker"), (req, res) => {
  const worker = resolveOwnWorker(req, res); if (!worker) return;
  db.prepare("UPDATE staffing_workers SET availability = ? WHERE id = ?").run(req.body?.availability, worker.id);
  res.json({ worker: serializeWorker(db.prepare("SELECT * FROM staffing_workers WHERE id = ?").get(worker.id)) });
});
staffingRouter.patch("/my/timesheets/:id/submit", requireAuth, requireRole("seeker"), (req, res) => {
  const worker = resolveOwnWorker(req, res); if (!worker) return;
  const t = db.prepare("SELECT * FROM staffing_timesheets WHERE id = ? AND worker_id = ?").get(req.params.id, worker.id);
  if (!t) return res.status(404).json({ error: "Not found" });
  if (t.status !== "draft") return res.status(409).json({ error: "Already submitted" });
  db.prepare("UPDATE staffing_timesheets SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── WSIB claims ─── */
staffingRouter.get("/wsib-claims", requireAgencyAuth, (req, res) => {
  res.json({ claims: db.prepare("SELECT * FROM staffing_wsib_claims ORDER BY created_at DESC").all().map(serializeWsibClaim) });
});
staffingRouter.post("/wsib-claims", requireAgencyAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("wc", "staffing_wsib_claims");
  db.prepare(
    `INSERT INTO staffing_wsib_claims (id, worker_id, assignment_id, claim_number, filed_date, incident_date, description, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, d.worker, d.assignment || null, d.claimNumber || null, d.filedDate || new Date().toISOString().slice(0, 10), d.incidentDate || null, d.description || "", d.notes || "");
  const claim = db.prepare("SELECT * FROM staffing_wsib_claims WHERE id = ?").get(id);
  logStaffingAudit(req.agencyStaff.id, "wsib_claim_filed", `Filed WSIB claim for worker ${d.worker}${d.claimNumber ? ` (${d.claimNumber})` : ""}`);
  res.status(201).json({ claim: serializeWsibClaim(claim) });
});
staffingRouter.patch("/wsib-claims/:id", requireAgencyAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM staffing_wsib_claims WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Claim not found." });
  const d = req.body || {};
  const fields = { status: "status", claimNumber: "claim_number", notes: "notes" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (setCols.length) db.prepare(`UPDATE staffing_wsib_claims SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  if (d.status && d.status !== row.status) logStaffingAudit(req.agencyStaff.id, "wsib_claim_updated", `WSIB claim ${row.claim_number || row.id} status: ${row.status} → ${d.status}`);
  res.json({ claim: serializeWsibClaim(db.prepare("SELECT * FROM staffing_wsib_claims WHERE id = ?").get(req.params.id)) });
});

staffingRouter.get("/audit-log", requireAgencyAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT staffing_audit_log.*, agency_staff.name AS actor_name FROM staffing_audit_log LEFT JOIN agency_staff ON agency_staff.id = staffing_audit_log.actor_staff_id ORDER BY staffing_audit_log.created_at DESC LIMIT 500"
  ).all();
  res.json({ auditLog: rows.map(r => ({ ...serializeStaffingAuditEntry(r), actorName: r.actor_name || "—" })) });
});

staffingRouter.get("/kpis", requireAgencyAuth, (req, res) => {
  const activeCount = db.prepare("SELECT COUNT(*) AS n FROM staffing_assignments WHERE status = 'active'").get().n;
  const availableWorkers = db.prepare("SELECT COUNT(*) AS n FROM staffing_workers WHERE availability = 'available' AND status = 'active'").get().n;
  const openOrders = db.prepare("SELECT * FROM staffing_job_orders WHERE status = 'open'").all();
  const openPositions = openOrders.reduce((s, j) => s + (j.positions - j.filled), 0);
  const pendingTimesheets = db.prepare("SELECT COUNT(*) AS n FROM staffing_timesheets WHERE status = 'submitted'").get().n;
  const draftTimesheets = db.prepare("SELECT COUNT(*) AS n FROM staffing_timesheets WHERE status = 'draft'").get().n;
  const invoices = db.prepare("SELECT * FROM staffing_invoices").all();
  const arTotal = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const overdueTotal = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const placements = db.prepare("SELECT * FROM staffing_placements").all();
  const inProgressPlacements = placements.filter(p => p.status === "in-progress" || p.status === "accepted").length;
  const guaranteeExpiring = placements.filter(p => {
    if (p.status !== "guaranteed" || !p.guarantee_ends) return false;
    const days = (new Date(p.guarantee_ends) - Date.now()) / 864e5;
    return days >= 0 && days <= 30;
  }).length;
  const activeAssignments = db.prepare("SELECT * FROM staffing_assignments WHERE status = 'active'").all();
  const runRateWeekly = activeAssignments.reduce((s, a) => s + a.bill_rate * 40, 0);
  res.json({
    activeCount, availableWorkers, openPositions, openOrdersCount: openOrders.length,
    pendingTimesheets, draftTimesheets, arTotal: round2(arTotal), overdueTotal: round2(overdueTotal),
    inProgressPlacements, guaranteeExpiring, runRateWeekly: round2(runRateWeekly),
  });
});
