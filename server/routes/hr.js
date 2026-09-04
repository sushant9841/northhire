import { Router } from "express";
import { db, nextId } from "../db.js";
import { hashPassword, verifyPassword, createSessionCookie, clearSessionCookie, requireHrAuth, hrEmployeeFromRequest, requireAuth, requireRole } from "../auth.js";
import {
  serializeHrEmployee, serializeHrAttendance, serializeHrLeave, serializeHrTask, serializeHrEvent,
  serializeHrInvoice, serializeHrDepartment, serializeHrExpense, serializeHrPayrun, serializeHrChat, serializeHrChatMessage,
} from "../serialize.js";

export const hrRouter = Router();

/* ─── Auth ─── */
hrRouter.post("/login", (req, res) => {
  const { companyName, loginId, password } = req.body || {};
  const company = db.prepare("SELECT * FROM employers WHERE lower(name) = lower(?)").get((companyName || "").trim());
  if (!company) return res.status(404).json({ error: `No company named "${companyName}"` });
  if (company.plan !== "Enterprise") return res.status(403).json({ error: `${company.name} does not have an Enterprise plan. HR Suite is Enterprise-only.` });
  const id = (loginId || "").toLowerCase().trim();
  const emp = db.prepare("SELECT * FROM hr_employees WHERE company_id = ?").all(company.id)
    .find(e => e.email.toLowerCase() === id || e.email.toLowerCase().split("@")[0] === id || e.name.toLowerCase() === id);
  if (!emp) return res.status(404).json({ error: `No employee with that login ID at ${company.name}` });
  if (emp.status === "terminated") return res.status(403).json({ error: "This employee account is not active" });
  if (!verifyPassword(password, emp.password_hash, emp.password_salt)) return res.status(401).json({ error: "Password does not match" });
  createSessionCookie(res, "hr_session", "hr", emp.id);
  res.json({ employee: serializeHrEmployee(emp), company: { id: company.id, name: company.name, plan: company.plan } });
});
hrRouter.post("/logout", (req, res) => { clearSessionCookie(req, res, "hr_session", "hr"); res.json({ ok: true }); });
/* Bridges the main employer session straight into an HR session for their own company, so
   navigating into HR Suite from the employer console doesn't demand a second, separate login -
   only valid for the employer's own Enterprise company, never any other. */
hrRouter.post("/auto-login", requireAuth, requireRole("employer"), (req, res) => {
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

/* ─── Employees ─── */
hrRouter.get("/employees", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_employees WHERE company_id = ?").all(req.hrEmployee.company_id);
  res.json({ employees: rows.map(serializeHrEmployee) });
});
hrRouter.post("/employees", requireHrAuth, requireHrPriv, (req, res) => {
  const d = req.body || {};
  const { hash, salt } = hashPassword("pcl2026"); // shared demo password for newly-added demo employees, matching the seeded set
  const id = nextId("emp", "hr_employees");
  db.prepare(
    `INSERT INTO hr_employees (id, company_id, name, email, password_hash, password_salt, role, dept, title, hired, seed, phone, city, prov, salary, birth_date, manager, skills_json, badges_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, req.hrEmployee.company_id, d.name, d.email, hash, salt, d.role || "employee", d.dept, d.title,
    d.hired || new Date().toISOString().slice(0, 10), d.seed ?? Math.floor(Math.random() * 11), d.phone, d.city, d.prov,
    d.salary, d.birthDate, d.manager || null, JSON.stringify(d.skills || []), JSON.stringify(d.badges || []));
  res.status(201).json({ employee: serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(id)) });
});
hrRouter.patch("/employees/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  const d = req.body || {};
  const fields = { name: "name", title: "title", role: "role", dept: "dept", manager: "manager", phone: "phone", salary: "salary" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (setCols.length) db.prepare(`UPDATE hr_employees SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ employee: serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.params.id)) });
});
hrRouter.patch("/employees/:id/visibility", requireHrAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  const visibility = { ...JSON.parse(row.visibility_json || "{}"), ...(req.body || {}) };
  db.prepare("UPDATE hr_employees SET visibility_json = ? WHERE id = ?").run(JSON.stringify(visibility), req.params.id);
  res.json({ employee: serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.params.id)) });
});
hrRouter.delete("/employees/:id", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  db.prepare("UPDATE hr_employees SET status = 'terminated', terminated_at = date('now') WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE hr_employees SET manager = ? WHERE manager = ?").run(row.manager, req.params.id);
  res.json({ ok: true });
});
hrRouter.patch("/employees/:id/badges", requireHrAuth, requireHrPriv, (req, res) => {
  const row = db.prepare("SELECT * FROM hr_employees WHERE id = ? AND company_id = ?").get(req.params.id, req.hrEmployee.company_id);
  if (!row) return res.status(404).json({ error: "Employee not found." });
  const { badge, remove } = req.body || {};
  const badges = JSON.parse(row.badges_json || "[]").filter(b => b !== badge);
  if (!remove) badges.push(badge);
  db.prepare("UPDATE hr_employees SET badges_json = ? WHERE id = ?").run(JSON.stringify(badges), req.params.id);
  res.json({ employee: serializeHrEmployee(db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.params.id)) });
});

/* ─── Attendance ─── */
hrRouter.get("/attendance", requireHrAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT hr_attendance.* FROM hr_attendance JOIN hr_employees ON hr_employees.id = hr_attendance.employee_id
     WHERE hr_employees.company_id = ? ORDER BY hr_attendance.date DESC`
  ).all(req.hrEmployee.company_id);
  res.json({ attendance: rows.map(serializeHrAttendance) });
});
hrRouter.post("/attendance/punch-in", requireHrAuth, (req, res) => {
  const empId = req.body?.employeeId || req.hrEmployee.id;
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare("SELECT * FROM hr_attendance WHERE employee_id = ? AND date = ?").get(empId, today);
  if (existing) return res.status(409).json({ error: `Already punched in today at ${existing.clock_in}` });
  const now = new Date(); const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const settingsRow = db.prepare("SELECT settings_json FROM hr_company_settings WHERE company_id = ?").get(req.hrEmployee.company_id);
  const settings = settingsRow ? JSON.parse(settingsRow.settings_json) : null;
  const att = settings?.attendance || { workingHoursStart: "08:00", lateThresholdMin: 15 };
  const [sh, sm] = att.workingHoursStart.split(":").map(Number);
  const late = (now.getHours() * 60 + now.getMinutes()) > (sh * 60 + sm + (att.lateThresholdMin || 0));
  const id = `att_${empId}_${today}`;
  db.prepare("INSERT INTO hr_attendance (id, employee_id, date, clock_in, source, site, late) VALUES (?, ?, ?, ?, ?, 'Head Office', ?)")
    .run(id, empId, today, time, req.body?.source || "web", late ? 1 : 0);
  res.status(201).json({ record: serializeHrAttendance(db.prepare("SELECT * FROM hr_attendance WHERE id = ?").get(id)) });
});
hrRouter.post("/attendance/punch-out", requireHrAuth, (req, res) => {
  const empId = req.body?.employeeId || req.hrEmployee.id;
  const existing = db.prepare("SELECT * FROM hr_attendance WHERE employee_id = ? AND clock_out IS NULL ORDER BY date DESC LIMIT 1").get(empId);
  if (!existing) return res.status(400).json({ error: "You haven't punched in" });
  const now = new Date(); const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const clockInAt = new Date(`${existing.date}T${existing.clock_in}:00`);
  const hours = Math.max(0, Math.round((now - clockInAt) / 36000) / 100);
  db.prepare("UPDATE hr_attendance SET clock_out = ?, hours = ? WHERE id = ?").run(time, hours, existing.id);
  res.json({ hours, record: serializeHrAttendance(db.prepare("SELECT * FROM hr_attendance WHERE id = ?").get(existing.id)) });
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
hrRouter.patch("/leave/:id/decide", requireHrAuth, requireHrPriv, (req, res) => {
  db.prepare("UPDATE hr_leave SET status = ?, approved_by = ? WHERE id = ?").run(req.body?.decision, req.hrEmployee.id, req.params.id);
  res.json({ leave: serializeHrLeave(db.prepare("SELECT * FROM hr_leave WHERE id = ?").get(req.params.id)) });
});

/* ─── Tasks ─── */
hrRouter.get("/tasks", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_tasks WHERE company_id = ? ORDER BY created_at DESC").all(req.hrEmployee.company_id);
  res.json({ tasks: rows.map(serializeHrTask) });
});
hrRouter.post("/tasks", requireHrAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("tk", "hr_tasks");
  db.prepare("INSERT INTO hr_tasks (id, company_id, title, assignee, assigned_by, due, priority, tags_json) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, req.hrEmployee.company_id, d.title, d.assignee, req.hrEmployee.id, d.due, d.priority || "medium", JSON.stringify(d.tags || []));
  res.status(201).json({ task: serializeHrTask(db.prepare("SELECT * FROM hr_tasks WHERE id = ?").get(id)) });
});
hrRouter.patch("/tasks/:id/status", requireHrAuth, (req, res) => {
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
  const next = 1042 + db.prepare("SELECT COUNT(*) AS n FROM hr_invoices WHERE company_id = ?").get(req.hrEmployee.company_id).n + 1;
  const id = nextId("inv", "hr_invoices");
  db.prepare(
    `INSERT INTO hr_invoices (id, company_id, number, client, amount, subtotal, hst, tax_label, po, status, issued, due, created_by, items_json)
     VALUES (?,?,?,?,?,?,?,?,?, 'draft', date('now'), ?, ?, ?)`
  ).run(id, req.hrEmployee.company_id, `INV-2026-${next}`, d.client, d.amount, d.subtotal, d.hst, d.taxLabel, d.po || "",
    d.due, req.hrEmployee.id, JSON.stringify(d.items || []));
  res.status(201).json({ invoice: serializeHrInvoice(db.prepare("SELECT * FROM hr_invoices WHERE id = ?").get(id)) });
});
hrRouter.patch("/invoices/:id/send", requireHrAuth, requireHrPriv, (req, res) => {
  db.prepare("UPDATE hr_invoices SET status = 'pending' WHERE id = ?").run(req.params.id);
  res.json({ invoice: serializeHrInvoice(db.prepare("SELECT * FROM hr_invoices WHERE id = ?").get(req.params.id)) });
});
hrRouter.patch("/invoices/:id/paid", requireHrAuth, requireHrPriv, (req, res) => {
  db.prepare("UPDATE hr_invoices SET status = 'paid', paid = date('now') WHERE id = ?").run(req.params.id);
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
  const d = req.body || {};
  const fields = { name: "name", lead: "lead", color: "color", about: "about" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (d[key] !== undefined) { setCols.push(`${col} = ?`); params.push(d[key]); }
  if (setCols.length) db.prepare(`UPDATE hr_departments SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ department: serializeHrDepartment(db.prepare("SELECT * FROM hr_departments WHERE id = ?").get(req.params.id)) });
});
hrRouter.delete("/departments/:id", requireHrAuth, requireHrPriv, (req, res) => {
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
hrRouter.patch("/expenses/:id/decide", requireHrAuth, requireHrPriv, (req, res) => {
  const { decision, reason } = req.body || {};
  db.prepare("UPDATE hr_expenses SET status = ?, approved_by = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END, reject_reason = ? WHERE id = ?")
    .run(decision, req.hrEmployee.id, decision, reason || null, req.params.id);
  res.json({ expense: serializeHrExpense(db.prepare("SELECT * FROM hr_expenses WHERE id = ?").get(req.params.id)) });
});
hrRouter.patch("/expenses/:id/pay", requireHrAuth, requireHrPriv, (req, res) => {
  db.prepare("UPDATE hr_expenses SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ expense: serializeHrExpense(db.prepare("SELECT * FROM hr_expenses WHERE id = ?").get(req.params.id)) });
});

/* ─── Payroll ─── */
hrRouter.get("/payruns", requireHrAuth, requireHrPriv, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_payruns WHERE company_id = ? ORDER BY run_date DESC").all(req.hrEmployee.company_id);
  res.json({ payruns: rows.map(serializeHrPayrun) });
});
hrRouter.post("/payruns", requireHrAuth, requireHrPriv, (req, res) => {
  const { periodStart, periodEnd } = req.body || {};
  const emps = db.prepare("SELECT * FROM hr_employees WHERE company_id = ? AND status = 'active'").all(req.hrEmployee.company_id);
  const dueExpenses = db.prepare(
    `SELECT * FROM hr_expenses WHERE status = 'approved' AND reimburse_via = 'next-payroll'
     AND employee_id IN (${emps.map(() => "?").join(",") || "''"})`
  ).all(...emps.map(e => e.id));
  const expByEmp = {}; dueExpenses.forEach(x => { expByEmp[x.employee_id] = (expByEmp[x.employee_id] || 0) + x.amount; });
  const lines = emps.map(e => {
    const grossPeriod = Math.round((e.salary || 0) / 26);
    const reimb = expByEmp[e.id] || 0;
    const cpp = Math.round(grossPeriod * 0.0595), ei = Math.round(grossPeriod * 0.0221);
    const fedTax = Math.round(grossPeriod * 0.145), provTax = Math.round(grossPeriod * 0.075);
    const net = grossPeriod - (cpp + ei + fedTax + provTax) + reimb;
    return { employee: e.id, name: e.name, gross: grossPeriod, cpp, ei, fedTax, provTax, reimb, net };
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
hrRouter.patch("/payruns/:id/approve", requireHrAuth, requireHrPriv, (req, res) => {
  db.prepare("UPDATE hr_payruns SET status = 'approved', approved_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ payrun: serializeHrPayrun(db.prepare("SELECT * FROM hr_payruns WHERE id = ?").get(req.params.id)) });
});
hrRouter.patch("/payruns/:id/execute", requireHrAuth, requireHrPriv, (req, res) => {
  const run = db.prepare("SELECT * FROM hr_payruns WHERE id = ?").get(req.params.id);
  if (!run) return res.status(404).json({ error: "Not found." });
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
  res.json({ ok: true });
});

/* ─── Chat ─── */
hrRouter.get("/chats", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_chats WHERE company_id = ?").all(req.hrEmployee.company_id);
  res.json({ chats: rows.map(serializeHrChat) });
});
hrRouter.post("/chats", requireHrAuth, (req, res) => {
  const d = req.body || {};
  const id = nextId("gc", "hr_chats");
  db.prepare("INSERT INTO hr_chats (id, company_id, kind, name, members, about, created_by) VALUES (?,?,?,?,?,?,?)")
    .run(id, req.hrEmployee.company_id, d.kind || "group", d.name, d.members, d.about || "", req.hrEmployee.id);
  res.status(201).json({ chat: serializeHrChat(db.prepare("SELECT * FROM hr_chats WHERE id = ?").get(id)) });
});
hrRouter.get("/chats/:id/messages", requireHrAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM hr_chat_messages WHERE chat_id = ? ORDER BY created_at").all(req.params.id);
  res.json({ messages: rows.map(serializeHrChatMessage) });
});
hrRouter.post("/chats/:id/messages", requireHrAuth, (req, res) => {
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
