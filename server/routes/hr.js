import { Router } from "express";
import crypto from "node:crypto";
import { db, nextId, sqlTime } from "../db.js";
import { calcNetPay, calcHourlyGross } from "../../src/helpers/payrollTax.js";
import { buildT4, buildAllT4s, buildRoe, payrollYears } from "../../src/helpers/taxSlips.js";
import { getConfig } from "../platformConfig.js";
import { sendAndLogMail } from "../mail.js";
import { hashPassword, verifyPassword, createSessionCookie, clearSessionCookie, requireHrAuth, hrEmployeeFromRequest, requireAuth, requireRole } from "../auth.js";
import {
  serializeHrEmployee, serializeHrAttendance, serializeHrLeave, serializeHrTask, serializeHrEvent,
  serializeHrInvoice, serializeHrDepartment, serializeHrExpense, serializeHrPayrun, serializeHrChat, serializeHrChatMessage,
  serializeHrAuditEntry, serializeHrSignDocument, serializeHrSignature, serializeHrShift,
} from "../serialize.js";

export const hrRouter = Router();

function logHrAudit(companyId, actorEmployeeId, action, detail) {
  db.prepare("INSERT INTO hr_audit_log (id, company_id, actor_employee_id, action, detail) VALUES (?, ?, ?, ?, ?)")
    .run(nextId("al", "hr_audit_log"), companyId, actorEmployeeId, action, detail);
}

/* ─── Auth ─── */
const HR_LOGIN_LOCKOUT_MAX_ATTEMPTS = 5;
const HR_LOGIN_LOCKOUT_WINDOW_MIN = 15;
hrRouter.post("/login", (req, res) => {
  const { companyName, loginId, password } = req.body || {};
  const id = (loginId || "").toLowerCase().trim();
  // Keyed on company+loginId (not a real email necessarily) since the lockout has to apply
  // before the employee is even resolved, to slow down guessing the login ID itself too.
  const lockoutKey = `hr:${(companyName || "").trim().toLowerCase()}:${id}`;
  const recentFails = db.prepare(
    `SELECT COUNT(*) AS n FROM failed_logins WHERE email = ? AND kind = 'hr' AND created_at >= datetime('now', ?)`
  ).get(lockoutKey, `-${HR_LOGIN_LOCKOUT_WINDOW_MIN} minutes`).n;
  if (recentFails >= HR_LOGIN_LOCKOUT_MAX_ATTEMPTS) {
    return res.status(429).json({ error: `Too many failed attempts — try again in ${HR_LOGIN_LOCKOUT_WINDOW_MIN} minutes.` });
  }
  const fail = () => db.prepare("INSERT INTO failed_logins (id, email, kind) VALUES (?, ?, 'hr')").run(nextId("fl", "failed_logins"), lockoutKey);

  const company = db.prepare("SELECT * FROM employers WHERE lower(name) = lower(?)").get((companyName || "").trim());
  if (!company) { fail(); return res.status(404).json({ error: `No company named "${companyName}"` }); }
  if (company.plan !== "Enterprise") return res.status(403).json({ error: `${company.name} does not have an Enterprise plan. HR Suite is Enterprise-only.` });
  const emp = db.prepare("SELECT * FROM hr_employees WHERE company_id = ?").all(company.id)
    .find(e => e.email.toLowerCase() === id || e.email.toLowerCase().split("@")[0] === id || e.name.toLowerCase() === id);
  if (!emp) { fail(); return res.status(404).json({ error: `No employee with that login ID at ${company.name}` }); }
  if (emp.status === "terminated") return res.status(403).json({ error: "This employee account is not active" });
  if (!verifyPassword(password, emp.password_hash, emp.password_salt)) { fail(); return res.status(401).json({ error: "Password does not match" }); }
  db.prepare("DELETE FROM failed_logins WHERE email = ? AND kind = 'hr'").run(lockoutKey);
  createSessionCookie(res, "hr_session", "hr", emp.id);
  res.json({ employee: serializeHrEmployee(emp), company: { id: company.id, name: company.name, plan: company.plan } });
});
hrRouter.post("/logout", (req, res) => { clearSessionCookie(req, res, "hr_session", "hr"); res.json({ ok: true }); });
/* Bridges the main employer session straight into an HR session for their own company, so
   navigating into HR Suite from the employer console doesn't demand a second, separate login -
   only valid for the employer's own Enterprise company, never any other. */
hrRouter.post("/auto-login", requireAuth, requireRole("employer"), (req, res) => {
  // Only the account owner bridges into HR Suite this way - without this check, any invited
  // "member" teammate could call this route and be logged in as the company's HR owner/admin,
  // gaining salary/payroll/termination access they were never granted.
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can open HR Suite this way." });
  const company = db.prepare("SELECT * FROM employers WHERE id = ?").get(req.user.employer_id);
  if (!company || company.plan !== "Enterprise") return res.status(403).json({ error: "HR Suite is Enterprise-only." });
  const emps = db.prepare("SELECT * FROM hr_employees WHERE company_id = ? AND status = 'active'").all(company.id);
  const owner = emps.find(e => e.role === "owner" || e.role === "admin") || emps[0];
  if (!owner) return res.status(404).json({ error: "No HR employees at this company yet." });
  createSessionCookie(res, "hr_session", "hr", owner.id);
  res.json({ employee: serializeHrEmployee(owner), company: { id: company.id, name: company.name, plan: company.plan } });
});
hrRouter.get("/me", requireHrAuth, (req, res) => {
  const company = db.prepare("SELECT * FROM employers WHERE id = ?").get(req.hrEmployee.company_id);
  res.json({ employee: serializeHrEmployee(req.hrEmployee), company: { id: company.id, name: company.name, plan: company.plan } });
});

function isPriv(emp) { return ["owner", "admin", "hr"].includes(emp.role); }
function requireHrPriv(req, res, next) { if (!isPriv(req.hrEmployee)) return res.status(403).json({ error: "Not allowed for your role." }); next(); }
// A plain "employee"-role manager can approve their own direct reports' leave/expenses -
// previously only owner/admin/hr could approve anyone's, bypassing the real reporting chain
// (hr_employees.manager) entirely.
function canDecideFor(hrEmployee, targetEmployeeId) {
  const target = db.prepare("SELECT manager, company_id FROM hr_employees WHERE id = ?").get(targetEmployeeId);
  if (!target || target.company_id !== hrEmployee.company_id) return false;
  return isPriv(hrEmployee) || target.manager === hrEmployee.id;
}

/* P4 deferred #15 - editable approval chains. Reads the company settings' approvalChains blob
   (edited from HR Settings) and answers the two questions the two decide-endpoints ask:
   "may this HR user approve this row" and (for expenses) "is a second approver required for
   this amount". If no chain is configured for a workflow, the legacy canDecideFor rule stands.
   Delegations let an approver route their approvals to a colleague during PTO for a date range;
   a delegate can approve on the delegator's behalf without appearing in the chain itself. */
function getCompanySettings(companyId) {
  const row = db.prepare("SELECT settings_json FROM hr_company_settings WHERE company_id = ?").get(companyId);
  return row ? JSON.parse(row.settings_json) : null;
}
function activeDelegateFor(settings, delegatorId) {
  const d = settings?.delegations?.[delegatorId];
  if (!d?.toId) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (d.from && d.from > today) return null;
  if (d.to && d.to < today) return null;
  return d.toId;
}
function chainApprovers(settings, workflow) {
  const list = settings?.approvalChains?.[workflow]?.approvers;
  return Array.isArray(list) ? list.filter(x => typeof x === "string") : [];
}
export function canDecideByChain(hrEmployee, targetEmployeeId, workflow) {
  const settings = getCompanySettings(hrEmployee.company_id);
  const approvers = chainApprovers(settings, workflow);
  // No chain configured -> fall back to the legacy manager+HR rule (fully backwards compatible).
  if (!approvers.length) return canDecideFor(hrEmployee, targetEmployeeId);
  if (approvers.includes(hrEmployee.id)) return canDecideFor(hrEmployee, targetEmployeeId);
  // Delegate check: any listed approver can name a stand-in during a date range, and that
  // stand-in acts with the same rights as the delegator - so a listed approver going on PTO
  // doesn't jam the queue.
  for (const approverId of approvers) {
    if (activeDelegateFor(settings, approverId) === hrEmployee.id) return canDecideFor(hrEmployee, targetEmployeeId);
  }
  return false;
}
export function requiresDualApproval(companyId, workflow, amount) {
  const settings = getCompanySettings(companyId);
  const chain = settings?.approvalChains?.[workflow];
  if (!chain) return false;
  const threshold = Number(chain.dualThreshold || 0);
  return threshold > 0 && Number(amount || 0) >= threshold;
}

// Each employee's own visibility_json (salary/phone/birthDate/email/manager) was previously only
// enforced by a client-side helper (hrPublicProfile) run on data the browser already had in full -
// any colleague could read the raw network response and see every hidden field regardless of the
// UI. Privileged roles (owner/admin/hr) and an employee viewing their own record still see
// everything; anyone else gets exactly what that person chose to show.
function maskHrEmployeeForViewer(emp, viewerHrEmployee) {
  if (isPriv(viewerHrEmployee) || emp.id === viewerHrEmployee.id) return emp;
  const v = emp.visibility || {};
  const masked = { ...emp };
  if (v.salary === false) masked.salary = null;
  if (v.phone === false) masked.phone = null;
  if (v.birthDate === false) masked.birthDate = null;
  if (v.email === false) masked.email = null;
  if (v.manager === false) masked.manager = null;
  return masked;
}

/* ─── Employees ─── */
hrRouter.get("/employees", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_employees WHERE company_id = ?").all(req.hrEmployee.company_id);
  res.json({ employees: rows.map(r => maskHrEmployeeForViewer(serializeHrEmployee(r), req.hrEmployee)) });
});
hrRouter.post("/employees", requireHrAuth, requireHrPriv, (req, res) => {
  const d = req.body || {};
  const { hash, salt } = hashPassword("pcl2026"); // shared demo password for newly-added demo employees, matching the seeded set
  const id = nextId("emp", "hr_employees");
  db.prepare(
    `INSERT INTO hr_employees (id, company_id, name, email, password_hash, password_salt, role, dept, title, hired, seed, phone, city, prov, salary, birth_date, manager, skills_json, badges_json, pay_type, hourly_rate)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, req.hrEmployee.company_id, d.name, d.email, hash, salt, d.role || "employee", d.dept, d.title,
    d.hired || new Date().toISOString().slice(0, 10), d.seed ?? Math.floor(Math.random() * 11), d.phone, d.city, d.prov,
    d.salary, d.birthDate, d.manager || null, JSON.stringify(d.skills || []), JSON.stringify(d.badges || []),
    d.payType === "hourly" ? "hourly" : "salary", d.hourlyRate || null);
  res.status(201).json({ employee: serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(id)) });
});
hrRouter.patch("/employees/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  const d = req.body || {};
  if (d.payType !== undefined && !["salary", "hourly"].includes(d.payType)) return res.status(400).json({ error: "payType must be 'salary' or 'hourly'." });
  const fields = { name: "name", title: "title", role: "role", dept: "dept", manager: "manager", phone: "phone", salary: "salary", benefitsPerPay: "benefits_per_pay", benefitsPlan: "benefits_plan", benefitsTier: "benefits_tier", payType: "pay_type", hourlyRate: "hourly_rate" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (d.td1OnFile !== undefined) { setCols.push("td1_on_file = ?"); params.push(d.td1OnFile ? 1 : 0); }
  if (d.certifications !== undefined) {
    setCols.push("certifications_json = ?");
    params.push(JSON.stringify((d.certifications || []).filter(c => c && c.name).map(c => ({ name: c.name, issued: c.issued || null, expires: c.expires || null }))));
  }
  if (setCols.length) db.prepare(`UPDATE hr_employees SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  if (d.salary !== undefined && d.salary !== row.salary) {
    logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "salary_change", `${row.name}'s salary changed from $${row.salary?.toLocaleString() ?? "—"} to $${d.salary.toLocaleString()}`);
  }
  if (d.role !== undefined && d.role !== row.role) {
    logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "role_change", `${row.name}'s role changed from ${row.role} to ${d.role}`);
  }
  res.json({ employee: serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.params.id)) });
});
hrRouter.patch("/employees/:id/visibility", requireHrAuth, (req, res) => {
  // Only the employee themself (or a privileged role) may change what's visible about them -
  // previously any authenticated employee could PATCH anyone else's visibility_json by id.
  if (req.params.id !== req.hrEmployee.id && !isPriv(req.hrEmployee)) return res.status(403).json({ error: "You can only change your own visibility settings." });
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  const visibility = { ...JSON.parse(row.visibility_json || "{}"), ...(req.body || {}) };
  db.prepare("UPDATE hr_employees SET visibility_json = ? WHERE id = ?").run(JSON.stringify(visibility), req.params.id);
  res.json({ employee: maskHrEmployeeForViewer(serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.params.id)), req.hrEmployee) });
});
hrRouter.delete("/employees/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  db.prepare("UPDATE hr_employees SET status = 'terminated', terminated_at = date('now') WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE hr_employees SET manager = ? WHERE manager = ?").run(row.manager, req.params.id);
  res.json({ ok: true });
});
/* Real erasure for an HR employee, mirroring the seeker GDPR-erasure route in users.js: scrubs
   every piece of personal data this app actually stores, but keeps the row (so payroll/expense
   history a company is required to retain doesn't dangle) and never touches payroll/expense
   money records - "terminated" already means "off the books going forward"; "erased" means the
   personal-data trail is gone, not that financial history was rewritten. Restricted to a
   terminated employee only - erasing an active employee's own login/profile makes no sense. */
hrRouter.post("/employees/:id/erase", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  if (row.status !== "terminated") return res.status(400).json({ error: "Only a terminated employee's data can be erased." });
  const id = req.params.id;
  db.prepare("DELETE FROM hr_documents WHERE employee_id = ?").run(id);
  db.prepare("DELETE FROM hr_chat_reads WHERE employee_id = ?").run(id);
  db.prepare("UPDATE hr_chat_messages SET text = '[message removed]' WHERE from_employee = ?").run(id);
  const { hash, salt } = hashPassword(crypto.randomBytes(24).toString("hex"));
  db.prepare(
    `UPDATE hr_employees SET name = 'Erased employee', email = ?, password_hash = ?, password_salt = ?,
       phone = NULL, birth_date = NULL, manager = NULL, skills_json = '[]', badges_json = '[]', certifications_json = '[]',
       visibility_json = '{}', erased = 1, erased_at = datetime('now')
     WHERE id = ?`
  ).run(`erased-${id}@erased.northhire.ca`, hash, salt, id);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "employee_erased", `Erased personal data for ${row.name}`);
  res.json({ ok: true });
});
hrRouter.patch("/employees/:id/badges", requireHrAuth, requireHrPriv, async (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  const { badge, remove } = req.body || {};
  // Stored as {name, awardedAt} objects (not bare strings) so the badge wall can actually
  // filter/sort by date and show a per-employee award timeline.
  const badges = JSON.parse(row.badges_json || "[]").filter(b => b.name !== badge);
  if (!remove) badges.push({ name: badge, awardedAt: new Date().toISOString() });
  db.prepare("UPDATE hr_employees SET badges_json = ? WHERE id = ?").run(JSON.stringify(badges), req.params.id);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, remove ? "badge_removed" : "badge_awarded", `${remove ? "Removed" : "Awarded"} "${badge}" ${remove ? "from" : "to"} ${row.name}`);
  if (!remove && !row.erased) await sendAndLogMail(row.email, `You earned a badge: ${badge}`, `${req.hrEmployee.name} awarded you the "${badge}" badge. Check the badge wall in HR Suite to see it.`);
  res.json({ employee: serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.params.id)) });
});

/* ─── Documents ─── */
// No file-hosting backend exists, so an upload embeds the file as a base64 data: URI in the DB -
// the same "honest ceiling" the RichText image-insert and print-to-PDF helpers already settled
// on elsewhere in this app. Capped well under SQLite's practical row-size comfort zone.
const MAX_DOC_BYTES = 3 * 1024 * 1024;
hrRouter.get("/employees/:id/documents", requireHrAuth, (req, res) => {
  const emp = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!emp) return res.status(404).json({ error: "Employee not found." });
  if (!isPriv(req.hrEmployee) && req.hrEmployee.id !== emp.id) return res.status(403).json({ error: "Only this employee or HR/admin/owner can view these documents." });
  const rows = db.prepare("SELECT id, employee_id, name, size, uploaded_by, created_at FROM hr_documents WHERE employee_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ documents: rows.map(r => ({ id: r.id, employee: r.employee_id, name: r.name, size: r.size, uploadedBy: r.uploaded_by, at: sqlTime(r.created_at).getTime() })) });
});
hrRouter.get("/documents/:id", requireHrAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_documents WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found." });
  const emp = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(row.employee_id);
  if (!emp || emp.company_id !== req.hrEmployee.company_id) return res.status(404).json({ error: "Not found." });
  if (!isPriv(req.hrEmployee) && req.hrEmployee.id !== emp.id) return res.status(403).json({ error: "Only this employee or HR/admin/owner can view this document." });
  res.json({ id: row.id, name: row.name, dataUrl: row.data_url });
});
hrRouter.post("/employees/:id/documents", requireHrAuth, requireHrPriv, (req, res) => {
  const emp = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!emp) return res.status(404).json({ error: "Employee not found." });
  const { name, dataUrl } = req.body || {};
  if (!name?.trim() || !dataUrl) return res.status(400).json({ error: "A file name and file are required." });
  if (dataUrl.length > MAX_DOC_BYTES * 1.4) return res.status(413).json({ error: "File is too large — please use one under 3 MB." });
  // Only accept a data: URI whose declared MIME type is on the allowlist - a real content
  // sniff isn't practical without a file-inspection library, but this at least blocks storing
  // (and later force-downloading with the browser choosing how to open) text/html content.
  const ALLOWED_DOC_MIME = /^data:(application\/pdf|image\/(png|jpe?g|webp)|text\/plain);base64,/i;
  if (!ALLOWED_DOC_MIME.test(dataUrl)) return res.status(400).json({ error: "Only PDF, image, or plain text files are allowed." });
  const id = nextId("doc", "hr_documents");
  db.prepare("INSERT INTO hr_documents (id, employee_id, name, data_url, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, name.trim(), dataUrl, dataUrl.length, req.hrEmployee.name);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "document_uploaded", `Uploaded "${name.trim()}" for ${emp.name}`);
  res.status(201).json({ document: { id, employee: req.params.id, name: name.trim(), size: dataUrl.length, uploadedBy: req.hrEmployee.name, at: Date.now() } });
});
hrRouter.delete("/documents/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_documents WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found." });
  const emp = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(row.employee_id);
  if (!emp || emp.company_id !== req.hrEmployee.company_id) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM hr_documents WHERE id = ?").run(req.params.id);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "document_removed", `Removed "${row.name}" from ${emp.name}`);
  res.json({ ok: true });
});

/* ─── Attendance ─── */
/* ─── Shift/roster scheduling - forward-looking, distinct from attendance (after-the-fact
   clock records against no plan). A manager/HR/admin/owner assigns a shift; every employee sees
   their own upcoming shifts, privileged roles see the whole company's roster. ─── */
hrRouter.get("/shifts", requireHrAuth, (req, res) => {
  const { from, to } = req.query;
  const clauses = ["company_id = ?"]; const params = [req.hrEmployee.company_id];
  if (from) { clauses.push("date >= ?"); params.push(from); }
  if (to) { clauses.push("date <= ?"); params.push(to); }
  // A plain employee (not manager/HR/admin/owner) only sees their own shifts; privileged roles see
  // the whole roster, same visibility split used throughout the rest of HR Suite.
  if (!isPriv(req.hrEmployee)) { clauses.push("employee_id = ?"); params.push(req.hrEmployee.id); }
  const rows = db.prepare(`SELECT * FROM hr_shifts WHERE ${clauses.join(" AND ")} ORDER BY date ASC, start_time ASC`).all(...params);
  res.json({ shifts: rows.map(serializeHrShift) });
});
hrRouter.post("/shifts", requireHrAuth, requireHrPriv, (req, res) => {
  const { employeeId, date, startTime, endTime, role, site, notes } = req.body || {};
  if (!employeeId || !date || !startTime || !endTime) return res.status(400).json({ error: "Employee, date, start and end time are required." });
  if (endTime <= startTime) return res.status(400).json({ error: "End time must be after start time." });
  const emp = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(employeeId, req.hrEmployee.company_id);
  if (!emp) return res.status(404).json({ error: "Employee not found." });
  const id = nextId("shf", "hr_shifts");
  db.prepare("INSERT INTO hr_shifts (id, company_id, employee_id, date, start_time, end_time, role, site, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.hrEmployee.company_id, employeeId, date, startTime, endTime, role || null, site || null, notes || null, req.hrEmployee.id);
  res.status(201).json({ shift: serializeHrShift(db.prepare("SELECT * FROM hr_shifts WHERE id = ?").get(id)) });
});
hrRouter.patch("/shifts/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_shifts WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Shift not found." });
  const d = req.body || {};
  const fields = { date: "date", startTime: "start_time", endTime: "end_time", role: "role", site: "site", notes: "notes" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (setCols.length) db.prepare(`UPDATE hr_shifts SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ shift: serializeHrShift(db.prepare("SELECT * FROM hr_shifts WHERE id = ?").get(req.params.id)) });
});
hrRouter.delete("/shifts/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_shifts WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Shift not found." });
  db.prepare("DELETE FROM hr_shifts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

hrRouter.get("/attendance", requireHrAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT hr_attendance.* FROM hr_attendance JOIN hr_employees ON hr_employees.id = hr_attendance.employee_id
     WHERE hr_employees.company_id = ? ORDER BY hr_attendance.date DESC`
  ).all(req.hrEmployee.company_id);
  res.json({ attendance: rows.map(serializeHrAttendance) });
});
/* ─── Shared-terminal time clock (kiosk) ───────────────────────────────────────────────────
   A tablet at the site entrance that accepts punches for one company. Two separate secrets are
   needed: the DEVICE holds a token proving it's an authorised terminal, and the EMPLOYEE keys in
   a short PIN. Neither alone is enough, and a PIN can never sign anyone into the HR Suite — it's
   punch-only, because people type it in front of colleagues.

   A 4-6 digit PIN is inherently weak, so attempts are rate-limited per device using the same
   failed_logins table the password flows use. */
const KIOSK_WINDOW_MIN = 5;
const KIOSK_MAX_ATTEMPTS = 8;

function kioskDeviceFromRequest(req) {
  const token = req.get("x-kiosk-token") || req.body?.deviceToken || "";
  if (!token) return null;
  return db.prepare("SELECT * FROM hr_kiosk_devices WHERE token = ?").get(token) || null;
}

hrRouter.get("/kiosk/devices", requireHrAuth, requireHrPriv, (req, res) => {
  const rows = db.prepare("SELECT id, name, site, last_seen, created_at FROM hr_kiosk_devices WHERE company_id = ? ORDER BY created_at DESC")
    .all(req.hrEmployee.company_id);
  res.json({ devices: rows.map(r => ({ id: r.id, name: r.name, site: r.site, lastSeen: r.last_seen, createdAt: r.created_at })) });
});

hrRouter.post("/kiosk/devices", requireHrAuth, requireHrPriv, (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Give the terminal a name so it can be told apart from the others." });
  const id = nextId("kd", "hr_kiosk_devices");
  const token = `kiosk_${crypto.randomBytes(24).toString("hex")}`;
  db.prepare("INSERT INTO hr_kiosk_devices (id, company_id, name, token, site, created_by) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, req.hrEmployee.company_id, name, token, String(req.body?.site || "").trim() || null, req.hrEmployee.id);
  // The token is returned exactly once, at creation - it is never readable again from the list
  // endpoint, so a leaked screen later can't hand someone a working terminal credential.
  res.status(201).json({ device: { id, name, site: req.body?.site || null }, token });
});

hrRouter.delete("/kiosk/devices/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const r = db.prepare("DELETE FROM hr_kiosk_devices WHERE id = ? AND company_id = ?").run(req.params.id, req.hrEmployee.company_id);
  if (!r.changes) return res.status(404).json({ error: "Terminal not found." });
  res.json({ ok: true });
});

/* Setting a punch PIN: a privileged role can set anyone's, an employee can set their own. */
hrRouter.put("/employees/:id/punch-pin", requireHrAuth, (req, res) => {
  const target = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!target) return res.status(404).json({ error: "Employee not found." });
  const isSelf = target.id === req.hrEmployee.id;
  if (!isSelf && !isPriv(req.hrEmployee)) return res.status(403).json({ error: "Not allowed for your role." });
  const pin = String(req.body?.pin ?? "");
  if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: "A punch PIN is 4 to 6 digits." });
  // Reject PINs that are trivially guessable on a shared terminal in front of colleagues.
  if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) {
    return res.status(400).json({ error: "Choose a less predictable PIN — no repeated digits or straight runs." });
  }
  const { hash, salt } = hashPassword(pin);
  db.prepare("UPDATE hr_employees SET punch_pin_hash = ?, punch_pin_salt = ? WHERE id = ?").run(hash, salt, target.id);
  res.json({ ok: true });
});

/* The kiosk punch itself. Deliberately NOT behind requireHrAuth - the terminal has no HR session,
   it authenticates as a device. Toggles: punched in already today -> punch out, otherwise in. */
hrRouter.post("/kiosk/punch", (req, res) => {
  const device = kioskDeviceFromRequest(req);
  if (!device) return res.status(401).json({ error: "This terminal isn't paired. Ask an administrator to set it up." });

  const lockoutKey = `kiosk:${device.id}`;
  const recentFails = db.prepare(
    `SELECT COUNT(*) AS n FROM failed_logins WHERE email = ? AND kind = 'hr' AND created_at >= datetime('now', ?)`
  ).get(lockoutKey, `-${KIOSK_WINDOW_MIN} minutes`).n;
  if (recentFails >= KIOSK_MAX_ATTEMPTS) {
    return res.status(429).json({ error: `Too many incorrect PINs on this terminal — wait ${KIOSK_WINDOW_MIN} minutes.` });
  }

  const pin = String(req.body?.pin ?? "");
  const candidates = db.prepare("SELECT * FROM hr_employees WHERE company_id = ? AND status = 'active' AND erased = 0 AND punch_pin_hash IS NOT NULL")
    .all(device.company_id);
  // Every candidate is checked rather than looking the employee up by PIN, so a wrong PIN can't
  // be distinguished from an unset one by timing or by a different error.
  const employee = candidates.find(e => verifyPassword(pin, e.punch_pin_hash, e.punch_pin_salt));
  if (!employee) {
    db.prepare("INSERT INTO failed_logins (id, email, kind) VALUES (?, ?, 'hr')").run(nextId("fl", "failed_logins"), lockoutKey);
    return res.status(401).json({ error: "PIN not recognised." });
  }

  db.prepare("UPDATE hr_kiosk_devices SET last_seen = datetime('now') WHERE id = ?").run(device.id);

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const open = db.prepare("SELECT * FROM hr_attendance WHERE employee_id = ? AND clock_out IS NULL ORDER BY date DESC LIMIT 1").get(employee.id);

  if (open) {
    const clockInAt = new Date(`${open.date}T${open.clock_in}:00`);
    const hours = Math.max(0, Math.round((now - clockInAt) / 36000) / 100);
    db.prepare("UPDATE hr_attendance SET clock_out = ?, hours = ? WHERE id = ?").run(time, hours, open.id);
    return res.json({ action: "out", name: employee.name, time, hours, site: device.site || null });
  }

  const existingToday = db.prepare("SELECT * FROM hr_attendance WHERE employee_id = ? AND date = ?").get(employee.id, today);
  if (existingToday) return res.status(409).json({ error: `${employee.name} already completed a shift today.`, name: employee.name });

  const settingsRow = db.prepare("SELECT settings_json FROM hr_company_settings WHERE company_id = ?").get(device.company_id);
  const settings = settingsRow ? JSON.parse(settingsRow.settings_json) : null;
  const att = settings?.attendance || { workingHoursStart: "08:00", lateThresholdMin: 15 };
  const [sh, sm] = (att.workingHoursStart || "08:00").split(":").map(Number);
  const late = (now.getHours() * 60 + now.getMinutes()) > (sh * 60 + sm + (att.lateThresholdMin || 0));
  const id = `att_${employee.id}_${today}`;
  db.prepare("INSERT INTO hr_attendance (id, employee_id, date, clock_in, source, site, late) VALUES (?, ?, ?, ?, 'kiosk', ?, ?)")
    .run(id, employee.id, today, time, device.site || "Head Office", late ? 1 : 0);
  res.status(201).json({ action: "in", name: employee.name, time, late: !!late, site: device.site || null });
});

hrRouter.post("/attendance/punch-in", requireHrAuth, (req, res) => {
  // No caller-supplied employeeId override - nothing in the app ever legitimately punches in on
  // someone else's behalf, and honoring one let any employee forge a colleague's attendance
  // (which feeds directly into lateness/payroll deductions).
  const empId = req.hrEmployee.id;
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare("SELECT * FROM hr_attendance WHERE employee_id = ? AND date = ?").get(empId, today);
  if (existing) return res.status(409).json({ error: `Already punched in today at ${existing.clock_in}` });
  const now = new Date(); const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const settingsRow = db.prepare("SELECT settings_json FROM hr_company_settings WHERE company_id = ?").get(req.hrEmployee.company_id);
  const settings = settingsRow ? JSON.parse(settingsRow.settings_json) : null;
  const att = settings?.attendance || { workingHoursStart: "08:00", lateThresholdMin: 15, allowRemotePunch: true };
  const source = req.body?.source || "web";
  // The app itself only ever punches in over the web (there's no separate office-terminal
  // client) — so with remote punch-in disabled, a "web" source is exactly what should be blocked.
  if (att.allowRemotePunch === false && source === "web") {
    return res.status(403).json({ error: "Remote punch-in is disabled for this company — use the office time clock." });
  }
  const [sh, sm] = att.workingHoursStart.split(":").map(Number);
  const late = (now.getHours() * 60 + now.getMinutes()) > (sh * 60 + sm + (att.lateThresholdMin || 0));
  const id = `att_${empId}_${today}`;
  db.prepare("INSERT INTO hr_attendance (id, employee_id, date, clock_in, source, site, late) VALUES (?, ?, ?, ?, ?, 'Head Office', ?)")
    .run(id, empId, today, time, source, late ? 1 : 0);
  res.status(201).json({ record: serializeHrAttendance(db.prepare("SELECT * FROM hr_attendance WHERE id = ?").get(id)) });
});
hrRouter.post("/attendance/punch-out", requireHrAuth, (req, res) => {
  const empId = req.hrEmployee.id;
  const existing = db.prepare("SELECT * FROM hr_attendance WHERE employee_id = ? AND clock_out IS NULL ORDER BY date DESC LIMIT 1").get(empId);
  if (!existing) return res.status(400).json({ error: "You haven't punched in" });
  const now = new Date(); const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const clockInAt = new Date(`${existing.date}T${existing.clock_in}:00`);
  const hours = Math.max(0, Math.round((now - clockInAt) / 36000) / 100);
  db.prepare("UPDATE hr_attendance SET clock_out = ?, hours = ? WHERE id = ?").run(time, hours, existing.id);
  const settingsRow = db.prepare("SELECT settings_json FROM hr_company_settings WHERE company_id = ?").get(req.hrEmployee.company_id);
  const settings = settingsRow ? JSON.parse(settingsRow.settings_json) : null;
  const att = settings?.attendance || { workingHoursEnd: "17:00" };
  const [eh, em] = (att.workingHoursEnd || "17:00").split(":").map(Number);
  const earlyLeave = (now.getHours() * 60 + now.getMinutes()) < (eh * 60 + em);
  res.json({ hours, earlyLeave, record: serializeHrAttendance(db.prepare("SELECT * FROM hr_attendance WHERE id = ?").get(existing.id)) });
});

/* ─── Leave ─── */
hrRouter.get("/leave", requireHrAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT hr_leave.* FROM hr_leave JOIN hr_employees ON hr_employees.id = hr_leave.employee_id
     WHERE hr_employees.company_id = ? ORDER BY hr_leave.requested_at DESC`
  ).all(req.hrEmployee.company_id);
  res.json({ leave: rows.map(serializeHrLeave) });
});
hrRouter.post("/leave", requireHrAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("lv", "hr_leave");
  db.prepare("INSERT INTO hr_leave (id, employee_id, type, from_date, to_date, days, reason) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.hrEmployee.id, d.type, d.from, d.to, d.days, d.reason);
  res.status(201).json({ leave: serializeHrLeave(db.prepare("SELECT * FROM hr_leave WHERE id = ?").get(id)) });
});
hrRouter.patch("/leave/:id/decide", requireHrAuth, async (req, res) => {
  const row = db.prepare("SELECT * FROM hr_leave WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Leave request not found." });
  if (!canDecideByChain(req.hrEmployee, row.employee_id, "leave")) return res.status(403).json({ error: "You aren't on this workflow's approval chain." });
  // Dual approval: threshold expressed as days of leave for the leave workflow. First "approved"
  // decision stamps first_approved_by but keeps status pending; the second must be a different
  // person. A "denied" decision short-circuits (single denial is final).
  const decision = req.body?.decision;
  if (decision === "approved" && requiresDualApproval(req.hrEmployee.company_id, "leave", row.days) && !row.first_approved_by) {
    db.prepare("UPDATE hr_leave SET first_approved_by = ? WHERE id = ?").run(req.hrEmployee.id, req.params.id);
    return res.json({ leave: serializeHrLeave(db.prepare("SELECT * FROM hr_leave WHERE id = ?").get(req.params.id)), awaitingSecond: true });
  }
  if (decision === "approved" && row.first_approved_by && row.first_approved_by === req.hrEmployee.id) {
    return res.status(400).json({ error: "This request needs a second, different approver." });
  }
  db.prepare("UPDATE hr_leave SET status = ?, approved_by = ? WHERE id = ?").run(decision, req.hrEmployee.id, req.params.id);
  const emp = db.prepare("SELECT name, email, erased FROM hr_employees WHERE id = ?").get(row.employee_id);
  if (emp && !emp.erased) {
    await sendAndLogMail(emp.email, `Your ${row.type} leave request was ${req.body?.decision}`,
      `Your leave request for ${row.from_date} to ${row.to_date} was ${req.body?.decision} by ${req.hrEmployee.name}.`);
  }
  res.json({ leave: serializeHrLeave(db.prepare("SELECT * FROM hr_leave WHERE id = ?").get(req.params.id)) });
});

/* ─── Tasks ─── */
hrRouter.get("/tasks", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_tasks WHERE company_id = ? ORDER BY created_at DESC").all(req.hrEmployee.company_id);
  res.json({ tasks: rows.map(serializeHrTask) });
});
hrRouter.post("/tasks", requireHrAuth, async (req, res) => {
  const d = req.body || {};
  const id = nextId("tk", "hr_tasks");
  db.prepare("INSERT INTO hr_tasks (id, company_id, title, assignee, assigned_by, due, priority, tags_json) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, req.hrEmployee.company_id, d.title, d.assignee, req.hrEmployee.id, d.due, d.priority || "medium", JSON.stringify(d.tags || []));
  const assignee = d.assignee ? db.prepare("SELECT name, email, erased FROM hr_employees WHERE id = ?").get(d.assignee) : null;
  if (assignee && !assignee.erased && d.assignee !== req.hrEmployee.id) {
    await sendAndLogMail(assignee.email, `New task: ${d.title}`, `${req.hrEmployee.name} assigned you a task${d.due ? `, due ${d.due}` : ""}: ${d.title}`);
  }
  res.status(201).json({ task: serializeHrTask(db.prepare("SELECT * FROM hr_tasks WHERE id = ?").get(id)) });
});
hrRouter.patch("/tasks/:id/status", requireHrAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM hr_tasks WHERE id = ?").get(req.params.id);
  if (!task || task.company_id !== req.hrEmployee.company_id) return res.status(404).json({ error: "Task not found." });
  const { status } = req.body || {};
  db.prepare("UPDATE hr_tasks SET status = ?, completed_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END WHERE id = ?").run(status, status, req.params.id);
  res.json({ task: serializeHrTask(db.prepare("SELECT * FROM hr_tasks WHERE id = ?").get(req.params.id)) });
});
hrRouter.delete("/tasks/:id", requireHrAuth, (req, res) => {
  db.prepare("DELETE FROM hr_tasks WHERE id = ? AND company_id = ?").run(req.params.id, req.hrEmployee.company_id);
  res.json({ ok: true });
});

/* ─── Events ─── */
hrRouter.get("/events", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_events WHERE company_id = ? ORDER BY event_date").all(req.hrEmployee.company_id);
  res.json({ events: rows.map(serializeHrEvent) });
});
hrRouter.post("/events", requireHrAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("ev", "hr_events");
  db.prepare("INSERT INTO hr_events (id, company_id, title, event_date, time, duration, type, location, invitees, organiser, description) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, req.hrEmployee.company_id, d.title, d.when, d.time, d.duration, d.type, d.location, d.invitees, req.hrEmployee.id, d.description || "");
  res.status(201).json({ event: serializeHrEvent(db.prepare("SELECT * FROM hr_events WHERE id = ?").get(id)) });
});
hrRouter.delete("/events/:id", requireHrAuth, (req, res) => {
  db.prepare("DELETE FROM hr_events WHERE id = ? AND company_id = ?").run(req.params.id, req.hrEmployee.company_id);
  res.json({ ok: true });
});

/* ─── Invoices ─── */
hrRouter.get("/invoices", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_invoices WHERE company_id = ? ORDER BY issued DESC").all(req.hrEmployee.company_id);
  res.json({ invoices: rows.map(serializeHrInvoice) });
});
hrRouter.post("/invoices", requireHrAuth, requireHrPriv, (req, res) => {
  const d = req.body || {};
  const items = (d.items || []).filter(it => (it.qty || 0) >= 0 && (it.unitPrice || 0) >= 0);
  if (items.length !== (d.items || []).length) return res.status(400).json({ error: "Invoice line items can't have a negative quantity or price." });
  const next = 1042 + db.prepare("SELECT COUNT(*) AS n FROM hr_invoices WHERE company_id = ?").get(req.hrEmployee.company_id).n + 1;
  const id = nextId("inv", "hr_invoices");
  db.prepare(
    `INSERT INTO hr_invoices (id, company_id, number, client, amount, subtotal, hst, tax_label, po, status, issued, due, created_by, items_json)
     VALUES (?,?,?,?,?,?,?,?,?, 'draft', date('now'), ?, ?, ?)`
  ).run(id, req.hrEmployee.company_id, `INV-2026-${next}`, d.client, d.amount, d.subtotal, d.hst, d.taxLabel, d.po || "",
    d.due, req.hrEmployee.id, JSON.stringify(items));
  res.status(201).json({ invoice: serializeHrInvoice(db.prepare("SELECT * FROM hr_invoices WHERE id = ?").get(id)) });
});
function resolveOwnHrInvoice(req, res) {
  const inv = db.prepare("SELECT * FROM hr_invoices WHERE id = ?").get(req.params.id);
  if (!inv || inv.company_id !== req.hrEmployee.company_id) { res.status(404).json({ error: "Invoice not found." }); return null; }
  return inv;
}
hrRouter.patch("/invoices/:id/send", requireHrAuth, requireHrPriv, (req, res) => {
  if (!resolveOwnHrInvoice(req, res)) return;
  db.prepare("UPDATE hr_invoices SET status = 'pending' WHERE id = ?").run(req.params.id);
  res.json({ invoice: serializeHrInvoice(db.prepare("SELECT * FROM hr_invoices WHERE id = ?").get(req.params.id)) });
});
hrRouter.patch("/invoices/:id/paid", requireHrAuth, requireHrPriv, (req, res) => {
  if (!resolveOwnHrInvoice(req, res)) return;
  db.prepare("UPDATE hr_invoices SET status = 'paid', paid = date('now') WHERE id = ?").run(req.params.id);
  res.json({ invoice: serializeHrInvoice(db.prepare("SELECT * FROM hr_invoices WHERE id = ?").get(req.params.id)) });
});
// A real reversal path (standard accounting practice: flip status + a logged reason, rather than
// deleting or silently editing the paid record) instead of no undo path at all.
hrRouter.patch("/invoices/:id/reverse", requireHrAuth, requireHrPriv, (req, res) => {
  const inv = resolveOwnHrInvoice(req, res); if (!inv) return;
  if (inv.status !== "paid") return res.status(400).json({ error: "Only a paid invoice can be reversed." });
  const reason = (req.body?.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "A reason is required to reverse a paid invoice." });
  db.prepare("UPDATE hr_invoices SET status = 'reversed' WHERE id = ?").run(req.params.id);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "invoice_reversed", `Reversed invoice ${inv.number} ($${inv.total}): ${reason}`);
  res.json({ invoice: serializeHrInvoice(db.prepare("SELECT * FROM hr_invoices WHERE id = ?").get(req.params.id)) });
});

/* ─── Departments ─── */
hrRouter.get("/departments", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_departments WHERE company_id = ?").all(req.hrEmployee.company_id);
  res.json({ departments: rows.map(serializeHrDepartment) });
});
hrRouter.post("/departments", requireHrAuth, requireHrPriv, (req, res) => {
  const d = req.body || {};
  const id = nextId("d", "hr_departments");
  db.prepare("INSERT INTO hr_departments (id, company_id, name, lead, color, about) VALUES (?,?,?,?,?,?)")
    .run(id, req.hrEmployee.company_id, d.name, d.lead || null, d.color || "#6AACFF", d.about || "");
  res.status(201).json({ department: serializeHrDepartment(db.prepare("SELECT * FROM hr_departments WHERE id = ?").get(id)) });
});
hrRouter.patch("/departments/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const dept = db.prepare("SELECT * FROM hr_departments WHERE id = ?").get(req.params.id);
  if (!dept || dept.company_id !== req.hrEmployee.company_id) return res.status(404).json({ error: "Department not found." });
  const d = req.body || {};
  const fields = { name: "name", lead: "lead", color: "color", about: "about" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (setCols.length) db.prepare(`UPDATE hr_departments SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ department: serializeHrDepartment(db.prepare("SELECT * FROM hr_departments WHERE id = ?").get(req.params.id)) });
});
hrRouter.delete("/departments/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const dept = db.prepare("SELECT * FROM hr_departments WHERE id = ?").get(req.params.id);
  if (!dept || dept.company_id !== req.hrEmployee.company_id) return res.status(404).json({ error: "Department not found." });
  const assigned = db.prepare("SELECT COUNT(*) AS n FROM hr_employees WHERE dept = ?").get(req.params.id).n;
  if (assigned > 0) return res.status(409).json({ error: `${assigned} employees are in this department. Move them first.` });
  db.prepare("DELETE FROM hr_departments WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Expenses ─── */
hrRouter.get("/expenses/mine", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_expenses WHERE employee_id = ? ORDER BY submitted_at DESC").all(req.hrEmployee.id);
  res.json({ expenses: rows.map(serializeHrExpense) });
});
// A manager (any role, including plain "employee") can see just their own direct reports'
// expense claims - the real reporting-chain-scoped counterpart to /expenses/company below,
// which stays HR/finance/owner-only since it returns the whole company.
hrRouter.get("/expenses/team", requireHrAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT hr_expenses.* FROM hr_expenses JOIN hr_employees ON hr_employees.id = hr_expenses.employee_id
     WHERE hr_employees.manager = ? ORDER BY hr_expenses.submitted_at DESC`
  ).all(req.hrEmployee.id);
  res.json({ expenses: rows.map(serializeHrExpense) });
});
hrRouter.get("/expenses/company", requireHrAuth, requireHrPriv, (req, res) => {
  const rows = db.prepare(
    `SELECT hr_expenses.* FROM hr_expenses JOIN hr_employees ON hr_employees.id = hr_expenses.employee_id
     WHERE hr_employees.company_id = ? ORDER BY hr_expenses.submitted_at DESC`
  ).all(req.hrEmployee.company_id);
  res.json({ expenses: rows.map(serializeHrExpense) });
});
hrRouter.post("/expenses", requireHrAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("xp", "hr_expenses");
  db.prepare(
    `INSERT INTO hr_expenses (id, employee_id, category, merchant, amount, description, receipt_url, date, reimburse_via)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(id, req.hrEmployee.id, d.category, d.merchant, d.amount, d.description || "", d.receiptUrl || null, d.date, d.reimburseVia || "next-payroll");
  res.status(201).json({ expense: serializeHrExpense(db.prepare("SELECT * FROM hr_expenses WHERE id = ?").get(id)) });
});
hrRouter.patch("/expenses/:id/decide", requireHrAuth, (req, res) => {
  const target = db.prepare("SELECT * FROM hr_expenses WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Expense claim not found." });
  if (!canDecideByChain(req.hrEmployee, target.employee_id, "expense")) return res.status(403).json({ error: "You aren't on this workflow's approval chain." });
  const { decision, reason } = req.body || {};
  // Dual-approval on the expense workflow: amount above the configured threshold requires two
  // distinct approvers. The first "approved" is stamped in first_approved_by and status stays
  // submitted; the second must be a different HR employee and finalizes the row. A "rejected"
  // decision is single-step regardless of amount.
  if (decision === "approved" && requiresDualApproval(req.hrEmployee.company_id, "expense", target.amount) && !target.first_approved_by) {
    db.prepare("UPDATE hr_expenses SET first_approved_by = ? WHERE id = ?").run(req.hrEmployee.id, req.params.id);
    return res.json({ expense: serializeHrExpense(db.prepare("SELECT * FROM hr_expenses WHERE id = ?").get(req.params.id)), awaitingSecond: true });
  }
  if (decision === "approved" && target.first_approved_by && target.first_approved_by === req.hrEmployee.id) {
    return res.status(400).json({ error: "This claim needs a second, different approver." });
  }
  db.prepare("UPDATE hr_expenses SET status = ?, approved_by = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END, reject_reason = ? WHERE id = ?")
    .run(decision, req.hrEmployee.id, decision, reason || null, req.params.id);
  res.json({ expense: serializeHrExpense(db.prepare("SELECT * FROM hr_expenses WHERE id = ?").get(req.params.id)) });
});
hrRouter.patch("/expenses/:id/pay", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare(
    `SELECT hr_expenses.* FROM hr_expenses JOIN hr_employees ON hr_employees.id = hr_expenses.employee_id
     WHERE hr_expenses.id = ? AND hr_employees.company_id = ?`
  ).get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Expense claim not found." });
  db.prepare("UPDATE hr_expenses SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ expense: serializeHrExpense(db.prepare("SELECT * FROM hr_expenses WHERE id = ?").get(req.params.id)) });
});

/* ─── Payroll ─── */
hrRouter.get("/payruns", requireHrAuth, requireHrPriv, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_payruns WHERE company_id = ? ORDER BY run_date DESC").all(req.hrEmployee.company_id);
  res.json({ payruns: rows.map(serializeHrPayrun) });
});
/* Every employee (not just owner/admin/hr) can see their own payslips - this returns only
   their own line from each paid run, never the full lines_json (which holds every colleague's
   salary breakdown too). */
hrRouter.get("/payslips/mine", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_payruns WHERE company_id = ? AND status = 'paid' ORDER BY run_date DESC").all(req.hrEmployee.company_id);
  const slips = rows
    .map(r => { const run = serializeHrPayrun(r); const line = run.lines.find(l => l.employee === req.hrEmployee.id); return line ? { run: { ...run, lines: undefined }, line } : null; })
    .filter(Boolean);
  res.json({ payslips: slips });
});
/* ─── Year-end tax slips (T4) and Records of Employment ────────────────────────────────────
   Both are computed from the payroll runs that were actually paid, never from a parallel set of
   numbers. See src/helpers/taxSlips.js for what is and isn't modelled - these generate a real,
   printable slip, they do not file anything with CRA or Service Canada. */

hrRouter.get("/tax-slips/years", requireHrAuth, requireHrPriv, (req, res) => {
  const runs = db.prepare("SELECT * FROM hr_payruns WHERE company_id = ?").all(req.hrEmployee.company_id).map(serializeHrPayrun);
  res.json({ years: payrollYears(runs) });
});

hrRouter.get("/tax-slips/:year", requireHrAuth, requireHrPriv, (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year)) return res.status(400).json({ error: "Invalid year." });
  const companyId = req.hrEmployee.company_id;
  const runs = db.prepare("SELECT * FROM hr_payruns WHERE company_id = ?").all(companyId).map(serializeHrPayrun);
  const employees = db.prepare("SELECT * FROM hr_employees WHERE company_id = ? AND erased = 0").all(companyId).map(serializeHrEmployee);
  const cfg = getConfig("payrollTax");
  const slips = buildAllT4s({ employees, runs, year, caps: { cppYmpe: cfg.cppYmpe, eiMaxInsurable: cfg.eiMaxInsurable } });
  const employer = db.prepare("SELECT name, business_number, city, prov FROM employers WHERE id = ?").get(companyId);
  res.json({
    year, slips,
    employer: { name: employer?.name, businessNumber: employer?.business_number || null, city: employer?.city, prov: employer?.prov },
    totals: slips.reduce((t, s) => ({
      gross: t.gross + s.boxes[14], cpp: t.cpp + s.boxes[16], ei: t.ei + s.boxes[18], tax: t.tax + s.boxes[22],
    }), { gross: 0, cpp: 0, ei: 0, tax: 0 }),
  });
});

/* An employee can always pull their OWN T4 without a privileged role - it's their income. */
hrRouter.get("/tax-slips/:year/mine", requireHrAuth, (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year)) return res.status(400).json({ error: "Invalid year." });
  const companyId = req.hrEmployee.company_id;
  const runs = db.prepare("SELECT * FROM hr_payruns WHERE company_id = ?").all(companyId).map(serializeHrPayrun);
  const me = serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.hrEmployee.id));
  const cfg = getConfig("payrollTax");
  const slip = buildT4({ employee: me, runs, year, caps: { cppYmpe: cfg.cppYmpe, eiMaxInsurable: cfg.eiMaxInsurable } });
  if (!slip) return res.status(404).json({ error: `No paid payroll recorded for you in ${year}.` });
  const employer = db.prepare("SELECT name, business_number FROM employers WHERE id = ?").get(companyId);
  res.json({ year, slip, employer: { name: employer?.name, businessNumber: employer?.business_number || null } });
});

hrRouter.get("/roe/:employeeId", requireHrAuth, requireHrPriv, (req, res) => {
  const companyId = req.hrEmployee.company_id;
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.employeeId, companyId);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  const employee = serializeHrEmployee(row);
  const runs = db.prepare("SELECT * FROM hr_payruns WHERE company_id = ?").all(companyId).map(serializeHrPayrun);
  const roe = buildRoe({ employee, runs, reason: String(req.query.reason || "K").toUpperCase() });
  if (!roe) return res.status(404).json({ error: "No paid payroll on record for this employee, so there are no insurable earnings to report." });
  const employer = db.prepare("SELECT name, business_number, city, prov FROM employers WHERE id = ?").get(companyId);
  res.json({ roe, employer: { name: employer?.name, businessNumber: employer?.business_number || null, city: employer?.city, prov: employer?.prov } });
});

hrRouter.post("/payruns", requireHrAuth, requireHrPriv, (req, res) => {
  const { periodStart, periodEnd } = req.body || {};
  const taxConfig = getConfig("payrollTax");
  const otPolicy = getConfig("overtimePolicy");
  const emps = db.prepare("SELECT * FROM hr_employees WHERE company_id = ? AND status = 'active'").all(req.hrEmployee.company_id);
  // Hourly employees' gross comes from real attendance (+ shift timing for the night differential)
  // within the pay period, not salary/26 - fetch both, grouped by employee, once for the whole run.
  const hourlyIds = emps.filter(e => e.pay_type === "hourly").map(e => e.id);
  const attByEmp = {}, shiftsByEmp = {};
  if (hourlyIds.length) {
    const att = db.prepare(
      `SELECT * FROM hr_attendance WHERE date >= ? AND date <= ? AND employee_id IN (${hourlyIds.map(() => "?").join(",")})`
    ).all(periodStart, periodEnd, ...hourlyIds);
    att.forEach(a => (attByEmp[a.employee_id] ||= []).push(a));
    const shifts = db.prepare(
      `SELECT * FROM hr_shifts WHERE date >= ? AND date <= ? AND employee_id IN (${hourlyIds.map(() => "?").join(",")})`
    ).all(periodStart, periodEnd, ...hourlyIds);
    shifts.forEach(s => (shiftsByEmp[s.employee_id] ||= []).push(s));
  }
  // Real CPP/EI annual-maximum enforcement needs year-to-date contributions per employee - summed
  // from every already-paid run this calendar year (draft/approved runs haven't actually withheld
  // anything yet, so they don't count toward YTD).
  const payYear = (periodStart || "").slice(0, 4);
  const paidRunsThisYear = db.prepare(
    "SELECT lines_json FROM hr_payruns WHERE company_id = ? AND status = 'paid' AND period_start LIKE ?"
  ).all(req.hrEmployee.company_id, `${payYear}%`);
  const ytdByEmp = {};
  for (const run of paidRunsThisYear) {
    for (const line of JSON.parse(run.lines_json || "[]")) {
      if (!ytdByEmp[line.employee]) ytdByEmp[line.employee] = { cpp: 0, ei: 0 };
      ytdByEmp[line.employee].cpp += line.cpp || 0;
      ytdByEmp[line.employee].ei += line.ei || 0;
    }
  }
  const dueExpenses = db.prepare(
    `SELECT * FROM hr_expenses WHERE status = 'approved' AND reimburse_via = 'next-payroll'
     AND employee_id IN (${emps.map(() => "?").join(",") || "''"})`
  ).all(...emps.map(e => e.id));
  const expByEmp = {}; dueExpenses.forEach(x => { expByEmp[x.employee_id] = (expByEmp[x.employee_id] || 0) + x.amount; });
  // Approved unpaid leave overlapping this pay period reduces salary - otherwise "Unpaid" leave
  // (a real, selectable leave type) has no actual effect on pay, which defeats the point of it.
  const approvedUnpaid = db.prepare(
    `SELECT * FROM hr_leave WHERE status = 'approved' AND type = 'Unpaid'
     AND employee_id IN (${emps.map(() => "?").join(",") || "''"})`
  ).all(...emps.map(e => e.id));
  const periodStartDate = new Date(periodStart), periodEndDate = new Date(periodEnd);
  const unpaidDaysByEmp = {};
  approvedUnpaid.forEach(l => {
    const from = new Date(l.from_date), to = new Date(l.to_date);
    const overlapStart = from > periodStartDate ? from : periodStartDate;
    const overlapEnd = to < periodEndDate ? to : periodEndDate;
    if (overlapEnd < overlapStart) return;
    const overlapDays = Math.round((overlapEnd - overlapStart) / 86400000) + 1;
    unpaidDaysByEmp[l.employee_id] = (unpaidDaysByEmp[l.employee_id] || 0) + Math.min(l.days || overlapDays, overlapDays);
  });
  const lines = emps.map(e => {
    let grossPeriod, unpaidDeduction = 0, hourlyBreakdown = null;
    if (e.pay_type === "hourly") {
      // Unpaid leave already shows up here as fewer/no attendance rows for those days - no separate
      // deduction needed the way salaried pay needs one (a fixed salary doesn't otherwise flex down).
      const breakdown = calcHourlyGross(e.hourly_rate || 0, attByEmp[e.id] || [], shiftsByEmp[e.id] || [], otPolicy);
      grossPeriod = breakdown.gross;
      hourlyBreakdown = breakdown;
    } else {
      unpaidDeduction = Math.round((unpaidDaysByEmp[e.id] || 0) * ((e.salary || 0) / 260));
      grossPeriod = Math.max(0, Math.round((e.salary || 0) / 26) - unpaidDeduction);
    }
    const reimb = expByEmp[e.id] || 0;
    const ytd = ytdByEmp[e.id] || { cpp: 0, ei: 0 };
    const { cpp, ei, fedTax, provTax, net: netBeforeReimb } = calcNetPay(grossPeriod,
      { province: e.prov, payPeriodsPerYear: 26, td1OnFile: !!e.td1_on_file, ytdCpp: ytd.cpp, ytdEi: ytd.ei }, taxConfig);
    const benefits = e.benefits_per_pay || 0;
    const net = netBeforeReimb + reimb - benefits;
    return { employee: e.id, name: e.name, payType: e.pay_type, gross: grossPeriod, unpaidDeduction, hourlyBreakdown, cpp, ei, fedTax, provTax, benefits, reimb, net };
  });
  const id = nextId("pr", "hr_payruns");
  db.prepare(
    `INSERT INTO hr_payruns (id, company_id, period_start, period_end, run_date, status, employees, total_gross, total_net, total_reimb, lines_json)
     VALUES (?,?,?,?,date('now'),'draft',?,?,?,?,?)`
  ).run(id, req.hrEmployee.company_id, periodStart, periodEnd, lines.length,
    lines.reduce((s, l) => s + l.gross, 0), lines.reduce((s, l) => s + l.net, 0), lines.reduce((s, l) => s + l.reimb, 0),
    JSON.stringify(lines));
  res.status(201).json({ payrun: serializeHrPayrun(db.prepare("SELECT * FROM hr_payruns WHERE id = ?").get(id)) });
});
function resolveOwnHrPayrun(req, res) {
  const run = db.prepare("SELECT * FROM hr_payruns WHERE id = ?").get(req.params.id);
  if (!run || run.company_id !== req.hrEmployee.company_id) { res.status(404).json({ error: "Not found." }); return null; }
  return run;
}
hrRouter.patch("/payruns/:id/approve", requireHrAuth, requireHrPriv, (req, res) => {
  const run = resolveOwnHrPayrun(req, res); if (!run) return;
  if (run.status !== "draft") return res.status(400).json({ error: "Only a draft run can be approved." });
  db.prepare("UPDATE hr_payruns SET status = 'approved', approved_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ payrun: serializeHrPayrun(db.prepare("SELECT * FROM hr_payruns WHERE id = ?").get(req.params.id)) });
});
// Must come from 'approved' specifically - without this, calling execute twice (a double-click,
// or a replayed request) would re-run the expense-reimbursement side effect below a second time.
hrRouter.patch("/payruns/:id/execute", requireHrAuth, requireHrPriv, (req, res) => {
  const run = resolveOwnHrPayrun(req, res); if (!run) return;
  if (run.status !== "approved") return res.status(400).json({ error: "Only an approved run can be executed." });
  db.prepare("UPDATE hr_payruns SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(req.params.id);
  const lines = JSON.parse(run.lines_json || "[]");
  for (const line of lines) {
    if (line.reimb > 0) {
      db.prepare(
        `UPDATE hr_expenses SET status = 'paid', paid_at = datetime('now')
         WHERE employee_id = ? AND status = 'approved' AND reimburse_via = 'next-payroll'`
      ).run(line.employee);
    }
  }
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "payroll_executed", `Executed payroll for ${run.period_start} → ${run.period_end} (${lines.length} employees, $${run.total_net?.toLocaleString()} net)`);
  res.json({ ok: true });
  // Notification emails happen after responding, not awaited in the request path - a payroll run
  // for a real-sized company (dozens to hundreds of employees) sending each email sequentially
  // before responding would make this endpoint hang for a long time for no reason the caller needs
  // to wait on; each send is still logged to the outbox exactly the same, just not on the critical path.
  for (const line of lines) {
    const emp = db.prepare("SELECT email, erased FROM hr_employees WHERE id = ?").get(line.employee);
    if (emp && !emp.erased) {
      sendAndLogMail(emp.email, "Your pay has been deposited", `Your pay for ${run.period_start} to ${run.period_end} ($${line.net.toFixed(2)} net) has been deposited. View your full pay stub in HR Suite.`)
        .catch(() => {});
    }
  }
});
// Same reversal pattern as invoices above - flip status + a logged, required reason. Also undoes
// the expense side-effect execute() applied, so a reversed run doesn't leave those claims stuck
// showing "paid" for reimbursements that (in a reversal) didn't happen.
hrRouter.patch("/payruns/:id/reverse", requireHrAuth, requireHrPriv, (req, res) => {
  const run = resolveOwnHrPayrun(req, res); if (!run) return;
  if (run.status !== "paid") return res.status(400).json({ error: "Only an executed (paid) payroll run can be reversed." });
  const reason = (req.body?.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "A reason is required to reverse a paid payroll run." });
  db.prepare("UPDATE hr_payruns SET status = 'reversed' WHERE id = ?").run(req.params.id);
  const lines = JSON.parse(run.lines_json || "[]");
  for (const line of lines) {
    if (line.reimb > 0) {
      db.prepare(
        `UPDATE hr_expenses SET status = 'approved', paid_at = NULL WHERE employee_id = ? AND status = 'paid' AND reimburse_via = 'next-payroll'`
      ).run(line.employee);
    }
  }
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "payroll_reversed", `Reversed payroll for ${run.period_start} → ${run.period_end} ($${run.total_net?.toLocaleString()} net): ${reason}`);
  res.json({ ok: true });
});
/* Manager 1:1s - the manager and the report can both read and write; HR/owner can read
   everything (they own the People module and need it for coaching + escalation) but the
   colleague-visibility question is "no one else". */
hrRouter.get("/one-on-ones", requireHrAuth, (req, res) => {
  const { managerId, reportId } = req.query;
  const me = req.hrEmployee;
  const isOnPair = me.id === managerId || me.id === reportId;
  if (!isOnPair && !isPriv(me)) return res.status(403).json({ error: "This is a private log between the manager and their report." });
  if (!managerId || !reportId) return res.status(400).json({ error: "managerId and reportId are required." });
  const rows = db.prepare(
    "SELECT * FROM hr_one_on_ones WHERE company_id = ? AND manager_id = ? AND report_id = ? ORDER BY meeting_date DESC"
  ).all(me.company_id, managerId, reportId);
  res.json({ entries: rows.map(r => ({
    id: r.id, meetingDate: r.meeting_date, agenda: r.agenda, notes: r.notes,
    actionItems: r.action_items, createdBy: r.created_by, createdAt: r.created_at,
  })) });
});
hrRouter.post("/one-on-ones", requireHrAuth, (req, res) => {
  const { managerId, reportId, meetingDate, agenda, notes, actionItems } = req.body || {};
  const me = req.hrEmployee;
  if (!managerId || !reportId || !meetingDate) return res.status(400).json({ error: "managerId, reportId, meetingDate are required." });
  // Both the manager and the report can log a 1:1 (either can capture what was discussed).
  // HR/owner can also log on behalf of others - a real HRIS lets HR record a coaching note.
  const isOnPair = me.id === managerId || me.id === reportId;
  if (!isOnPair && !isPriv(me)) return res.status(403).json({ error: "You can only log a 1:1 you're part of." });
  const id = nextId("oo", "hr_one_on_ones");
  db.prepare(
    `INSERT INTO hr_one_on_ones (id, company_id, manager_id, report_id, meeting_date, agenda, notes, action_items, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, me.company_id, managerId, reportId, meetingDate,
    (agenda || "").slice(0, 2000), (notes || "").slice(0, 8000), (actionItems || "").slice(0, 4000), me.id);
  res.status(201).json({ id });
});
hrRouter.delete("/one-on-ones/:id", requireHrAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_one_on_ones WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Not found." });
  const me = req.hrEmployee;
  // Only the person who logged the note can delete it; HR/owner can also (for compliance
  // reasons - someone leaving needs their notes cleaned up).
  if (row.created_by !== me.id && !isPriv(me)) return res.status(403).json({ error: "You can only remove notes you wrote." });
  db.prepare("DELETE FROM hr_one_on_ones WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

hrRouter.get("/audit-log", requireHrAuth, (req, res) => {
  if (!isPriv(req.hrEmployee) && req.hrEmployee.role !== "finance") return res.status(403).json({ error: "Not allowed for your role." });
  const rows = db.prepare("SELECT hr_audit_log.*, hr_employees.name AS actor_name FROM hr_audit_log LEFT JOIN hr_employees ON hr_employees.id = hr_audit_log.actor_employee_id WHERE hr_audit_log.company_id = ? ORDER BY hr_audit_log.created_at DESC LIMIT 500").all(req.hrEmployee.company_id);
  res.json({ auditLog: rows.map(r => ({ ...serializeHrAuditEntry(r), actorName: r.actor_name || "—" })) });
});

/* ─── Chat ─── */
hrRouter.get("/chats", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_chats WHERE company_id = ?").all(req.hrEmployee.company_id);
  res.json({ chats: rows.map(row => {
    const chat = serializeHrChat(row);
    const read = db.prepare("SELECT last_read_at FROM hr_chat_reads WHERE chat_id = ? AND employee_id = ?").get(row.id, req.hrEmployee.id);
    const unreadCount = db.prepare(
      `SELECT COUNT(*) AS n FROM hr_chat_messages WHERE chat_id = ? AND from_employee != ?
       AND created_at > ?`
    ).get(row.id, req.hrEmployee.id, read?.last_read_at || "1970-01-01").n;
    return { ...chat, unreadCount };
  }) });
});
hrRouter.post("/chats", requireHrAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("gc", "hr_chats");
  db.prepare("INSERT INTO hr_chats (id, company_id, kind, name, members, about, created_by) VALUES (?,?,?,?,?,?,?)")
    .run(id, req.hrEmployee.company_id, d.kind || "group", d.name, d.members, d.about || "", req.hrEmployee.id);
  res.status(201).json({ chat: serializeHrChat(db.prepare("SELECT * FROM hr_chats WHERE id = ?").get(id)) });
});
// Every route below trusted a bare chat id with no check that the chat belongs to the caller's
// own company - any HR employee at any company could read/post into another company's internal
// chat by guessing or observing an id.
function resolveOwnHrChat(req, res) {
  const chat = db.prepare("SELECT * FROM hr_chats WHERE id = ?").get(req.params.id);
  if (!chat || chat.company_id !== req.hrEmployee.company_id) { res.status(404).json({ error: "Chat not found." }); return null; }
  return chat;
}
hrRouter.get("/chats/:id/messages", requireHrAuth, (req, res) => {
  if (!resolveOwnHrChat(req, res)) return;
  const rows = db.prepare("SELECT * FROM hr_chat_messages WHERE chat_id = ? ORDER BY created_at").all(req.params.id);
  res.json({ messages: rows.map(serializeHrChatMessage) });
});
// A separate explicit action, NOT fired on the message fetch above - the frontend bulk-loads
// every chat's messages upfront on sync, so tying "read" to that GET would mark everything read
// instantly and the unread badge could never show anything. Only the UI actually opening a
// specific chat calls this.
hrRouter.patch("/chats/:id/read", requireHrAuth, (req, res) => {
  if (!resolveOwnHrChat(req, res)) return;
  db.prepare(
    `INSERT INTO hr_chat_reads (chat_id, employee_id, last_read_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(chat_id, employee_id) DO UPDATE SET last_read_at = excluded.last_read_at`
  ).run(req.params.id, req.hrEmployee.id);
  res.json({ ok: true });
});
hrRouter.post("/chats/:id/messages", requireHrAuth, (req, res) => {
  if (!resolveOwnHrChat(req, res)) return;
  const id = nextId("hm", "hr_chat_messages");
  db.prepare("INSERT INTO hr_chat_messages (id, chat_id, from_employee, text) VALUES (?, ?, ?, ?)")
    .run(id, req.params.id, req.hrEmployee.id, req.body?.text);
  res.status(201).json({ message: serializeHrChatMessage(db.prepare("SELECT * FROM hr_chat_messages WHERE id = ?").get(id)) });
});

/* ─── Company settings ─── */
hrRouter.get("/company-settings", requireHrAuth, (req, res) => {
  const row = db.prepare("SELECT settings_json FROM hr_company_settings WHERE company_id = ?").get(req.hrEmployee.company_id);
  res.json({ settings: row ? JSON.parse(row.settings_json) : null });
});
hrRouter.patch("/company-settings", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT settings_json FROM hr_company_settings WHERE company_id = ?").get(req.hrEmployee.company_id);
  const current = row ? JSON.parse(row.settings_json) : {};
  const merged = { ...current, ...(req.body || {}) };
  db.prepare(
    `INSERT INTO hr_company_settings (company_id, settings_json) VALUES (?, ?)
     ON CONFLICT(company_id) DO UPDATE SET settings_json = excluded.settings_json`
  ).run(req.hrEmployee.company_id, JSON.stringify(merged));
  res.json({ settings: merged });
});

/* ─── Policies & e-signature (real click-wrap acknowledgment, see db.js for the design note) ─── */
function docAppliesTo(doc, employeeId) {
  return doc.requiredFor.includes("all") || doc.requiredFor.includes(employeeId);
}
hrRouter.get("/sign-documents", requireHrAuth, (req, res) => {
  const docs = db.prepare("SELECT * FROM hr_sign_documents WHERE company_id = ? ORDER BY created_at DESC")
    .all(req.hrEmployee.company_id).map(serializeHrSignDocument);
  const mySignatures = db.prepare("SELECT document_id FROM hr_signatures WHERE employee_id = ?").all(req.hrEmployee.id).map(r => r.document_id);
  const mine = docs.filter(d => docAppliesTo(d, req.hrEmployee.id)).map(d => ({ ...d, signed: mySignatures.includes(d.id) }));
  let stats = null;
  if (isPriv(req.hrEmployee)) {
    const activeIds = db.prepare("SELECT id FROM hr_employees WHERE company_id = ? AND status = 'active'").all(req.hrEmployee.company_id).map(r => r.id);
    stats = docs.map(d => {
      const targetIds = d.requiredFor.includes("all") ? activeIds : d.requiredFor.filter(id => activeIds.includes(id));
      const signedCount = db.prepare(
        `SELECT COUNT(*) AS n FROM hr_signatures WHERE document_id = ? AND employee_id IN (${targetIds.map(() => "?").join(",") || "''"})`
      ).get(d.id, ...targetIds).n;
      return { ...d, targetCount: targetIds.length, signedCount };
    });
  }
  res.json({ documents: mine, allDocuments: stats });
});
hrRouter.post("/sign-documents", requireHrAuth, requireHrPriv, (req, res) => {
  const { title, body, requiredFor } = req.body || {};
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: "A title and body are required." });
  const id = nextId("sd", "hr_sign_documents");
  db.prepare("INSERT INTO hr_sign_documents (id, company_id, title, body, required_for_json, created_by) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, req.hrEmployee.company_id, title.trim(), body.trim(), JSON.stringify(Array.isArray(requiredFor) && requiredFor.length ? requiredFor : ["all"]), req.hrEmployee.id);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "sign_document_created", `Published "${title.trim()}" for sign-off`);
  res.status(201).json({ document: serializeHrSignDocument(db.prepare("SELECT * FROM hr_sign_documents WHERE id = ?").get(id)) });
});
hrRouter.delete("/sign-documents/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_sign_documents WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM hr_signatures WHERE document_id = ?").run(req.params.id);
  db.prepare("DELETE FROM hr_sign_documents WHERE id = ?").run(req.params.id);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "sign_document_removed", `Removed "${row.title}"`);
  res.json({ ok: true });
});
hrRouter.get("/sign-documents/:id/signatures", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_sign_documents WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Not found." });
  const sigs = db.prepare("SELECT * FROM hr_signatures WHERE document_id = ?").all(req.params.id).map(serializeHrSignature);
  res.json({ signatures: sigs });
});
hrRouter.post("/sign-documents/:id/sign", requireHrAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_sign_documents WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Not found." });
  const doc = serializeHrSignDocument(row);
  if (!docAppliesTo(doc, req.hrEmployee.id)) return res.status(403).json({ error: "This document isn't assigned to you." });
  const { signedName } = req.body || {};
  if (!signedName?.trim() || signedName.trim().length < 2) return res.status(400).json({ error: "Type your full legal name to sign." });
  if (db.prepare("SELECT id FROM hr_signatures WHERE document_id = ? AND employee_id = ?").get(req.params.id, req.hrEmployee.id))
    return res.status(409).json({ error: "You've already signed this document." });
  const id = nextId("sig", "hr_signatures");
  // Never store the raw IP - a one-way hash is enough to show "signed from a consistent, traceable
  // origin" for an audit trail without keeping a directly-identifying record indefinitely.
  const ipHash = crypto.createHash("sha256").update(req.ip || "unknown").digest("hex").slice(0, 16);
  db.prepare("INSERT INTO hr_signatures (id, document_id, employee_id, signed_name, ip_hash) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.params.id, req.hrEmployee.id, signedName.trim(), ipHash);
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "document_signed", `${req.hrEmployee.name} signed "${row.title}"`);
  res.status(201).json({ signature: serializeHrSignature(db.prepare("SELECT * FROM hr_signatures WHERE id = ?").get(id)) });
});

/* ─── Task comments ─────────────────────────────────────────────────────────────────────────
   Discussion belongs with the work. Anyone who can see the task can comment; a comment can be
   removed by its author or by a privileged role, since a task board that nobody can tidy fills
   up with mistakes. */
hrRouter.get("/tasks/:id/comments", requireHrAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM hr_tasks WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!task) return res.status(404).json({ error: "Task not found." });
  const rows = db.prepare(
    `SELECT c.*, e.name AS author FROM hr_task_comments c JOIN hr_employees e ON e.id = c.employee_id
      WHERE c.task_id = ? ORDER BY c.created_at ASC`
  ).all(req.params.id);
  res.json({ comments: rows.map(r => ({ id: r.id, task: r.task_id, author: r.author, authorId: r.employee_id, body: r.body, at: sqlTime(r.created_at).getTime() })) });
});

hrRouter.post("/tasks/:id/comments", requireHrAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM hr_tasks WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!task) return res.status(404).json({ error: "Task not found." });
  const body = String(req.body?.body || "").trim();
  if (!body) return res.status(400).json({ error: "Write something first." });
  if (body.length > 2000) return res.status(400).json({ error: "Keep a comment under 2000 characters." });
  const id = nextId("tc", "hr_task_comments");
  db.prepare("INSERT INTO hr_task_comments (id, task_id, employee_id, body) VALUES (?,?,?,?)")
    .run(id, req.params.id, req.hrEmployee.id, body);
  res.status(201).json({ comment: { id, task: req.params.id, author: req.hrEmployee.name, authorId: req.hrEmployee.id, body, at: Date.now() } });
});

hrRouter.delete("/task-comments/:id", requireHrAuth, (req, res) => {
  const row = db.prepare(
    `SELECT c.* FROM hr_task_comments c JOIN hr_tasks t ON t.id = c.task_id
      WHERE c.id = ? AND t.company_id = ?`
  ).get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Comment not found." });
  if (row.employee_id !== req.hrEmployee.id && !isPriv(req.hrEmployee)) {
    return res.status(403).json({ error: "You can only remove your own comments." });
  }
  db.prepare("DELETE FROM hr_task_comments WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ─── Expense categories ────────────────────────────────────────────────────────────────────
   Was a hardcoded list, so a company whose chart of accounts didn't match had no correct option
   to file an expense under. A company with no rows gets the platform defaults, so nothing has to
   be configured before expenses work. */
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Travel", glCode: "6100" }, { name: "Meals & entertainment", glCode: "6200" },
  { name: "Equipment & tools", glCode: "6300" }, { name: "Training & certification", glCode: "6400" },
  { name: "Mileage", glCode: "6110" }, { name: "Other", glCode: "6900" },
];

hrRouter.get("/expense-categories", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_expense_categories WHERE company_id = ? AND active = 1 ORDER BY sort_order, name")
    .all(req.hrEmployee.company_id);
  if (!rows.length) return res.json({ categories: DEFAULT_EXPENSE_CATEGORIES, isCustom: false });
  res.json({ categories: rows.map(r => ({ id: r.id, name: r.name, glCode: r.gl_code })), isCustom: true });
});

hrRouter.put("/expense-categories", requireHrAuth, requireHrPriv, (req, res) => {
  const list = Array.isArray(req.body?.categories) ? req.body.categories : null;
  if (!list) return res.status(400).json({ error: "Send a `categories` array." });
  const clean = list
    .map(c => ({ name: String(c?.name || "").trim().slice(0, 60), glCode: String(c?.glCode || "").trim().slice(0, 20) }))
    .filter(c => c.name);
  if (!clean.length) return res.status(400).json({ error: "Keep at least one category." });
  if (new Set(clean.map(c => c.name.toLowerCase())).size !== clean.length) {
    return res.status(400).json({ error: "Category names have to be unique." });
  }
  // Categories already used by an expense are deactivated rather than deleted, so historical
  // expenses keep reporting under the category they were actually filed against.
  const existing = db.prepare("SELECT * FROM hr_expense_categories WHERE company_id = ?").all(req.hrEmployee.company_id);
  const keep = new Set(clean.map(c => c.name.toLowerCase()));
  for (const row of existing) {
    if (!keep.has(row.name.toLowerCase())) {
      db.prepare("UPDATE hr_expense_categories SET active = 0 WHERE id = ?").run(row.id);
    }
  }
  clean.forEach((c, i) => {
    const match = existing.find(e => e.name.toLowerCase() === c.name.toLowerCase());
    if (match) db.prepare("UPDATE hr_expense_categories SET gl_code = ?, active = 1, sort_order = ? WHERE id = ?").run(c.glCode || null, i, match.id);
    else db.prepare("INSERT INTO hr_expense_categories (id, company_id, name, gl_code, sort_order) VALUES (?,?,?,?,?)")
      .run(nextId("ec", "hr_expense_categories"), req.hrEmployee.company_id, c.name, c.glCode || null, i);
  });
  logHrAudit(req.hrEmployee.company_id, req.hrEmployee.id, "expense_categories_updated", `Updated expense categories (${clean.length})`);
  res.json({ ok: true, categories: clean });
});
