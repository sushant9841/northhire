// Populates the SQLite database from the same seed data the frontend prototype ships with,
// so the real backend starts with the identical jobs/employers/people/applications a user
// already sees in the client-only version - not a mismatched second dataset.
import { db, nextId } from "./db.js";
import { hashPassword } from "./auth.js";
import { SEED_EMPLOYERS } from "../src/store/seed/employers.js";
import { SEED_JOBS } from "../src/store/seed/jobs.js";
import { SEED_PEOPLE } from "../src/store/seed/people.js";
import { SEED_APPS } from "../src/store/seed/applications.js";
import { SEED_BLOGS } from "../src/store/seed/blogs.js";
import { SEED_TRAININGS } from "../src/store/seed/trainings.js";
import { HR_EMPLOYEES } from "../src/store/seed/hrEmployees.js";
import { HR_ATTENDANCE } from "../src/store/seed/hrAttendance.js";
import { HR_LEAVE_REQUESTS } from "../src/store/seed/hrLeave.js";
import { HR_TASKS } from "../src/store/seed/hrTasks.js";
import { HR_EVENTS } from "../src/store/seed/hrEvents.js";
import { HR_INVOICES } from "../src/store/seed/hrInvoices.js";
import { HR_DEPARTMENTS_SEED } from "../src/store/seed/hrDepartments.js";
import { HR_EXPENSES_SEED } from "../src/store/seed/hrExpenses.js";
import { HR_PAYRUNS } from "../src/store/seed/hrPayruns.js";
import { HR_CHATS, HR_CHAT_MESSAGES } from "../src/store/seed/hrChats.js";
import { HR_COMPANY_SETTINGS_DEFAULT } from "../src/store/seed/hrCompanySettings.js";
import {
  SEED_WORKERS, SEED_STAFFING_CLIENTS, SEED_JOB_ORDERS, SEED_ASSIGNMENTS, SEED_TIMESHEETS,
  SEED_STAFFING_PAYRUNS, SEED_STAFFING_INVOICES, SEED_PLACEMENTS, AGENCY_PERM_JOB_IDS,
} from "../src/store/seed/agency.js";

const already = db.prepare("SELECT COUNT(*) AS n FROM employers").get();
if (already.n > 0) {
  console.log(`Already seeded (${already.n} employers exist) - skipping. Delete server/data/northhire.sqlite to reseed from scratch.`);
  process.exit(0);
}

const insertEmployer = db.prepare(
  `INSERT INTO employers (id, name, mark, a, b, industry, city, prov, size, rating, verified, about, founded, site, plan)
   VALUES (@id,@name,@mark,@a,@b,@industry,@city,@prov,@size,@rating,@verified,@about,@founded,@site,@plan)`
);
for (const e of SEED_EMPLOYERS) {
  insertEmployer.run({
    id: e.id, name: e.name, mark: e.mark || "hex", a: e.a || "#005CCC", b: e.b || "#FFFFFF",
    industry: e.industry || null, city: e.city || null, prov: e.prov || null, size: e.size || null,
    rating: e.rating || 0, verified: e.verified ? 1 : 0, about: e.about || null,
    founded: e.founded || null, site: e.site || null, plan: e.plan || "Free",
  });
}
console.log(`Seeded ${SEED_EMPLOYERS.length} employers.`);

const insertEmployerUser = db.prepare(
  `INSERT INTO users (id, role, name, email, password_hash, password_salt, employer_id)
   VALUES (@id,'employer',@name,@email,@password_hash,@password_salt,@employer_id)`
);
const DEMO_PASSWORD_EMPLOYER = "Employer123"; // matches the demo credentials LoginPage already advertises
let employerUserCount = 0;
for (const e of SEED_EMPLOYERS) {
  if (!e.owner) continue;
  const { hash, salt } = hashPassword(DEMO_PASSWORD_EMPLOYER);
  insertEmployerUser.run({
    id: nextId("eu", "users"), name: `${e.name} HR`, email: e.owner,
    password_hash: hash, password_salt: salt, employer_id: e.id,
  });
  employerUserCount++;
}
console.log(`Seeded ${employerUserCount} employer accounts (demo password for all: "${DEMO_PASSWORD_EMPLOYER}").`);

// Real deadline dates derived from the frontend's day-count (`dl`) relative to today, and a
// real created_at derived from its "N days ago" posted string, so the served data behaves
// like actual records instead of text that would otherwise never advance.
const parseDaysAgo = s => {
  const m = /(\d+)\s*day/.exec(s || "");
  return m ? Number(m[1]) : 0;
};
const insertJob = db.prepare(
  `INSERT INTO jobs (id, employer_id, title, cat, city, prov, type, mode, pay_lo, pay_hi, pay_unit,
     vacancies, experience, education, deadline_date, views, urgent, featured, skills_json, perks_json,
     description, duties_json, requirements_json, how_to_apply, status, flagged, created_at)
   VALUES (@id,@employer_id,@title,@cat,@city,@prov,@type,@mode,@pay_lo,@pay_hi,@pay_unit,
     @vacancies,@experience,@education,@deadline_date,@views,@urgent,@featured,@skills_json,@perks_json,
     @description,@duties_json,@requirements_json,@how_to_apply,@status,@flagged,@created_at)`
);
for (const j of SEED_JOBS) {
  const postedDaysAgo = parseDaysAgo(j.posted);
  const createdAt = new Date(Date.now() - postedDaysAgo * 86400000).toISOString();
  const deadlineDate = new Date(Date.now() + (j.dl || 14) * 86400000).toISOString().slice(0, 10);
  insertJob.run({
    id: j.id, employer_id: j.e, title: j.t, cat: j.cat || null, city: j.city || null, prov: j.prov || null,
    type: j.type || null, mode: j.mode || null, pay_lo: j.lo ?? null, pay_hi: j.hi ?? null, pay_unit: j.unit || null,
    vacancies: j.vac || 1, experience: j.exp || null, education: j.edu || null, deadline_date: deadlineDate,
    views: j.views || 0, urgent: j.urgent ? 1 : 0, featured: j.featured ? 1 : 0,
    skills_json: JSON.stringify(j.skills || []), perks_json: JSON.stringify(j.perks || []),
    description: j.desc || "", duties_json: JSON.stringify(j.duties || []), requirements_json: JSON.stringify(j.reqs || []),
    how_to_apply: j.how || null, status: j.status || "live", flagged: j.flagged ? 1 : 0, created_at: createdAt,
  });
}
console.log(`Seeded ${SEED_JOBS.length} jobs.`);

const insertUser = db.prepare(
  `INSERT INTO users (id, role, name, email, password_hash, password_salt, seed, title, cat, city, prov, years,
     phone, skills_json, edu, eligible, pay_min, pay_unit, types_json, modes_json, complete)
   VALUES (@id,'seeker',@name,@email,@password_hash,@password_salt,@seed,@title,@cat,@city,@prov,@years,
     @phone,@skills_json,@edu,@eligible,@pay_min,@pay_unit,@types_json,@modes_json,@complete)`
);
const DEMO_PASSWORD = "Password123"; // matches the demo credentials LoginPage already advertises
for (const p of SEED_PEOPLE) {
  const { hash, salt } = hashPassword(DEMO_PASSWORD);
  insertUser.run({
    id: p.id, name: p.name, email: p.email, password_hash: hash, password_salt: salt, seed: p.seed || 0,
    title: p.title || null, cat: p.cat || null, city: p.city || null, prov: p.prov || null, years: p.years || 0, phone: p.phone || null,
    skills_json: JSON.stringify(p.skills || []), edu: p.edu || null, eligible: p.eligible || null,
    pay_min: p.payMin ?? null, pay_unit: p.payUnit || null, types_json: JSON.stringify(p.types || []),
    modes_json: JSON.stringify(p.modes || []), complete: p.complete || 0,
  });
}
console.log(`Seeded ${SEED_PEOPLE.length} seeker accounts (demo password for all: "${DEMO_PASSWORD}").`);

const insertApp = db.prepare(
  `INSERT INTO applications (id, job_id, user_id, stage, note, availability, pay_expectation, cover_letter, history_json, created_at)
   VALUES (@id,@job_id,@user_id,@stage,@note,@availability,@pay_expectation,@cover_letter,@history_json,@created_at)`
);
for (const a of SEED_APPS) {
  const createdAt = new Date(Date.now() - parseDaysAgo(a.at) * 86400000).toISOString();
  insertApp.run({
    id: a.id, job_id: a.job, user_id: a.user, stage: a.stage, note: a.note || null,
    availability: a.avail || null, pay_expectation: a.expect || null, cover_letter: a.letter || null,
    history_json: JSON.stringify([{ stage: a.stage, note: a.note || "", at: createdAt }]),
    created_at: createdAt,
  });
}
console.log(`Seeded ${SEED_APPS.length} applications.`);

const ADMIN_PASSWORD = "Admin1234";
const { hash: adminHash, salt: adminSalt } = hashPassword(ADMIN_PASSWORD);
db.prepare(
  `INSERT INTO users (id, role, name, email, password_hash, password_salt) VALUES ('adm1','admin','Platform Admin','admin@northhire.ca',?,?)`
).run(adminHash, adminSalt);
console.log(`Seeded 1 admin account (admin@northhire.ca / "${ADMIN_PASSWORD}").`);

// Mark the seed jobs the agency has placed permanently - matches AGENCY_PERM_JOB_IDS from the
// frontend's old client-side Set, now a real relational column instead of a hardcoded id list.
const setHiringType = db.prepare("UPDATE jobs SET hiring_type = 'agency-perm' WHERE id = ?");
for (const jobId of AGENCY_PERM_JOB_IDS) setHiringType.run(jobId);

/* ═══════════════ CONTENT: blogs, trainings ═══════════════ */
const insertBlog = db.prepare(
  `INSERT INTO blogs (id, title, cat, scene, tone, mins, author, author_seed, excerpt, body_json, owner_employer_id, status, views, featured, created_at)
   VALUES (@id,@title,@cat,@scene,@tone,@mins,@author,@author_seed,@excerpt,@body_json,@owner_employer_id,@status,@views,@featured,@created_at)`
);
for (const b of SEED_BLOGS) {
  insertBlog.run({
    id: b.id, title: b.title, cat: b.cat || null, scene: b.scene, tone: b.tone, mins: b.mins,
    author: b.author, author_seed: b.authorSeed || 0, excerpt: b.excerpt, body_json: JSON.stringify(b.body || []),
    owner_employer_id: b.owner === "admin" ? null : b.owner, status: b.status || "published",
    views: b.views || 0, featured: b.featured ? 1 : 0, created_at: new Date(b.date).toISOString(),
  });
}
console.log(`Seeded ${SEED_BLOGS.length} blog articles.`);

const insertTraining = db.prepare(
  `INSERT INTO trainings (id, title, cat, scene, tone, provider, provider_seed, level, hours, price, rating, enrolled, mods_json, outcomes_json, about, owner_employer_id, status, featured)
   VALUES (@id,@title,@cat,@scene,@tone,@provider,@provider_seed,@level,@hours,@price,@rating,@enrolled,@mods_json,@outcomes_json,@about,@owner_employer_id,@status,@featured)`
);
for (const t of SEED_TRAININGS) {
  insertTraining.run({
    id: t.id, title: t.title, cat: t.cat || null, scene: t.scene, tone: t.tone, provider: t.provider,
    provider_seed: t.providerSeed || 0, level: t.level, hours: t.hours, price: t.price, rating: t.rating,
    enrolled: t.enrolled || 0, mods_json: JSON.stringify(t.mods || []), outcomes_json: JSON.stringify(t.outcomes || []),
    about: t.about, owner_employer_id: t.owner === "admin" ? null : t.owner, status: t.status || "published",
    featured: t.featured ? 1 : 0,
  });
}
console.log(`Seeded ${SEED_TRAININGS.length} trainings.`);

/* ═══════════════ PLATFORM SETTINGS ═══════════════ */
db.prepare("INSERT INTO platform_settings (id) VALUES (1)").run();

/* ═══════════════ HR SUITE (PCL Construction, employer e1) ═══════════════ */
const insertHrDept = db.prepare(
  `INSERT INTO hr_departments (id, company_id, name, lead, color, about) VALUES (@id,@company_id,@name,@lead,@color,@about)`
);
for (const d of HR_DEPARTMENTS_SEED) {
  insertHrDept.run({ id: d.id, company_id: d.companyId, name: d.name, lead: d.lead || null, color: d.color, about: d.about || "" });
}
console.log(`Seeded ${HR_DEPARTMENTS_SEED.length} HR departments.`);

const insertHrEmployee = db.prepare(
  `INSERT INTO hr_employees (id, company_id, name, email, password_hash, password_salt, role, dept, title, hired, seed,
     phone, city, prov, salary, birth_date, manager, skills_json, badges_json, status, visibility_json)
   VALUES (@id,@company_id,@name,@email,@password_hash,@password_salt,@role,@dept,@title,@hired,@seed,
     @phone,@city,@prov,@salary,@birth_date,@manager,@skills_json,@badges_json,'active',@visibility_json)`
);
const HR_DEMO_PASSWORD = "pcl2026"; // matches the demo password the old client-only HR Suite login advertised
for (const e of HR_EMPLOYEES) {
  const { hash, salt } = hashPassword(HR_DEMO_PASSWORD);
  insertHrEmployee.run({
    id: e.id, company_id: e.companyId, name: e.name, email: e.email, password_hash: hash, password_salt: salt,
    role: e.role, dept: e.dept, title: e.title, hired: e.hired, seed: e.seed || 0, phone: e.phone || null,
    city: e.city || null, prov: e.prov || null, salary: e.salary || null, birth_date: e.birthDate || null,
    manager: e.manager || null, skills_json: JSON.stringify(e.skills || []), badges_json: JSON.stringify(e.badges || []),
    visibility_json: JSON.stringify(e.visibility || {}),
  });
}
console.log(`Seeded ${HR_EMPLOYEES.length} HR employees (demo password for all: "${HR_DEMO_PASSWORD}").`);

const insertHrAttendance = db.prepare(
  `INSERT INTO hr_attendance (id, employee_id, date, clock_in, clock_out, source, hours, site, late)
   VALUES (@id,@employee_id,@date,@clock_in,@clock_out,@source,@hours,@site,0)`
);
for (const a of HR_ATTENDANCE) {
  insertHrAttendance.run({
    id: a.id, employee_id: a.employee, date: a.date, clock_in: a.clockIn, clock_out: a.clockOut,
    source: a.source, hours: a.hours, site: a.site,
  });
}
console.log(`Seeded ${HR_ATTENDANCE.length} HR attendance records.`);

const insertHrLeave = db.prepare(
  `INSERT INTO hr_leave (id, employee_id, type, from_date, to_date, days, status, reason, approved_by, requested_at)
   VALUES (@id,@employee_id,@type,@from_date,@to_date,@days,@status,@reason,@approved_by,@requested_at)`
);
for (const l of HR_LEAVE_REQUESTS) {
  insertHrLeave.run({
    id: l.id, employee_id: l.employee, type: l.type, from_date: l.from, to_date: l.to, days: l.days,
    status: l.status, reason: l.reason, approved_by: l.approvedBy || null, requested_at: new Date(l.requestedAt).toISOString(),
  });
}
console.log(`Seeded ${HR_LEAVE_REQUESTS.length} HR leave requests.`);

const insertHrTask = db.prepare(
  `INSERT INTO hr_tasks (id, company_id, title, assignee, assigned_by, due, priority, status, tags_json, created_at, completed_at)
   VALUES (@id,'e1',@title,@assignee,@assigned_by,@due,@priority,@status,@tags_json,@created_at,@completed_at)`
);
for (const t of HR_TASKS) {
  insertHrTask.run({
    id: t.id, title: t.title, assignee: t.assignee, assigned_by: t.assignedBy, due: t.due, priority: t.priority,
    status: t.status, tags_json: JSON.stringify(t.tags || []), created_at: new Date(t.created).toISOString(),
    completed_at: t.completed ? new Date(t.completed).toISOString() : null,
  });
}
console.log(`Seeded ${HR_TASKS.length} HR tasks.`);

const insertHrEvent = db.prepare(
  `INSERT INTO hr_events (id, company_id, title, event_date, time, duration, type, location, invitees, organiser, description)
   VALUES (@id,'e1',@title,@event_date,@time,@duration,@type,@location,@invitees,@organiser,@description)`
);
for (const e of HR_EVENTS) {
  insertHrEvent.run({
    id: e.id, title: e.title, event_date: e.when, time: e.time, duration: e.duration, type: e.type,
    location: e.location, invitees: e.invitees, organiser: e.organiser, description: e.description || "",
  });
}
console.log(`Seeded ${HR_EVENTS.length} HR calendar events.`);

const insertHrInvoice = db.prepare(
  `INSERT INTO hr_invoices (id, company_id, number, client, amount, status, issued, due, paid, created_by, po)
   VALUES (@id,'e1',@number,@client,@amount,@status,@issued,@due,@paid,@created_by,@po)`
);
for (const i of HR_INVOICES) {
  insertHrInvoice.run({
    id: i.id, number: i.number, client: i.client, amount: i.amount, status: i.status,
    issued: i.issued, due: i.due, paid: i.paid || null, created_by: i.createdBy, po: i.po || "",
  });
}
console.log(`Seeded ${HR_INVOICES.length} HR invoices.`);

const insertHrExpense = db.prepare(
  `INSERT INTO hr_expenses (id, employee_id, category, merchant, amount, currency, description, receipt_url, date,
     status, submitted_at, approved_by, approved_at, paid_at, reject_reason, reimburse_via)
   VALUES (@id,@employee_id,@category,@merchant,@amount,@currency,@description,@receipt_url,@date,
     @status,@submitted_at,@approved_by,@approved_at,@paid_at,@reject_reason,@reimburse_via)`
);
for (const x of HR_EXPENSES_SEED) {
  insertHrExpense.run({
    id: x.id, employee_id: x.employee, category: x.category, merchant: x.merchant, amount: x.amount,
    currency: x.currency, description: x.description || "", receipt_url: x.receiptUrl || null, date: x.date,
    status: x.status, submitted_at: new Date(x.submitted).toISOString(), approved_by: x.approvedBy || null,
    approved_at: x.approvedAt ? new Date(x.approvedAt).toISOString() : null,
    paid_at: x.paidAt ? new Date(x.paidAt).toISOString() : null, reject_reason: x.rejectReason || null,
    reimburse_via: x.reimburseVia,
  });
}
console.log(`Seeded ${HR_EXPENSES_SEED.length} HR expense claims.`);

const insertHrPayrun = db.prepare(
  `INSERT INTO hr_payruns (id, company_id, period_start, period_end, run_date, status, employees, total_gross, total_net, total_reimb, lines_json)
   VALUES (@id,'e1',@period_start,@period_end,@run_date,@status,@employees,@total_gross,@total_net,0,'[]')`
);
for (const p of HR_PAYRUNS) {
  insertHrPayrun.run({
    id: p.id, period_start: `${p.period}-01`, period_end: `${p.period}-28`, run_date: p.runDate,
    status: p.status, employees: p.employees, total_gross: p.totalGross, total_net: p.totalNet,
  });
}
console.log(`Seeded ${HR_PAYRUNS.length} HR payroll runs.`);

const insertHrChat = db.prepare(
  `INSERT INTO hr_chats (id, company_id, kind, name, members, about, created_by, created_at)
   VALUES (@id,'e1',@kind,@name,@members,@about,@created_by,@created_at)`
);
for (const c of HR_CHATS) {
  insertHrChat.run({
    id: c.id, kind: c.kind, name: c.name, members: c.members, about: c.about || "",
    created_by: c.createdBy, created_at: new Date(c.createdAt).toISOString(),
  });
}
const insertHrChatMessage = db.prepare(
  `INSERT INTO hr_chat_messages (id, chat_id, from_employee, text, created_at) VALUES (@id,@chat_id,@from_employee,@text,@created_at)`
);
for (const m of HR_CHAT_MESSAGES) {
  insertHrChatMessage.run({ id: m.id, chat_id: m.chat, from_employee: m.from, text: m.text, created_at: new Date(m.at).toISOString() });
}
console.log(`Seeded ${HR_CHATS.length} HR chats with ${HR_CHAT_MESSAGES.length} messages.`);

db.prepare("INSERT INTO hr_company_settings (company_id, settings_json) VALUES ('e1', ?)").run(JSON.stringify(HR_COMPANY_SETTINGS_DEFAULT));
console.log("Seeded HR company settings for e1 (PCL Construction).");

/* ═══════════════ STAFFING AGENCY (NorthHire Staffing) ═══════════════ */
const AGENCY_STAFF_SEED = [
  { id: "as1", loginId: "nadia.singh", name: "Nadia Singh", role: "owner", title: "Founder & Managing Director", seed: 14, email: "nadia@northhirestaffing.ca" },
  { id: "as2", loginId: "joel.tremblay", name: "Joël Tremblay", role: "recruiter", title: "Senior Recruiter", seed: 9, email: "joel@northhirestaffing.ca" },
  { id: "as3", loginId: "aisha.mohamed", name: "Aisha Mohamed", role: "payroll", title: "Payroll & Compliance", seed: 12, email: "aisha@northhirestaffing.ca" },
];
const AGENCY_DEMO_PASSWORD = "staff2026"; // matches the demo password the old client-only agency login advertised
const insertAgencyStaff = db.prepare(
  `INSERT INTO agency_staff (id, login_id, name, role, title, seed, email, password_hash, password_salt)
   VALUES (@id,@login_id,@name,@role,@title,@seed,@email,@password_hash,@password_salt)`
);
for (const s of AGENCY_STAFF_SEED) {
  const { hash, salt } = hashPassword(AGENCY_DEMO_PASSWORD);
  insertAgencyStaff.run({ id: s.id, login_id: s.loginId, name: s.name, role: s.role, title: s.title, seed: s.seed, email: s.email, password_hash: hash, password_salt: salt });
}
console.log(`Seeded ${AGENCY_STAFF_SEED.length} agency staff accounts (demo password for all: "${AGENCY_DEMO_PASSWORD}").`);

const insertWorker = db.prepare(
  `INSERT INTO staffing_workers (id, person_id, status, availability, onboarded, province, city, pay_rate_floor, pay_rate_target,
     sin_last3, td_on_file, direct_deposit_on_file, work_eligibility, we_expiry, emergency_contact_json, documents_json, tickets_json, notes, vac_balance)
   VALUES (@id,@person_id,@status,@availability,@onboarded,@province,@city,@pay_rate_floor,@pay_rate_target,
     @sin_last3,@td_on_file,@direct_deposit_on_file,@work_eligibility,@we_expiry,@emergency_contact_json,@documents_json,@tickets_json,@notes,@vac_balance)`
);
for (const w of SEED_WORKERS) {
  insertWorker.run({
    id: w.id, person_id: w.personId, status: w.status, availability: w.availability, onboarded: w.onboarded,
    province: w.province, city: w.city, pay_rate_floor: w.payRateFloor, pay_rate_target: w.payRateTarget,
    sin_last3: w.sinLast3 || null, td_on_file: w.tdOnFile ? 1 : 0, direct_deposit_on_file: w.directDepositOnFile ? 1 : 0,
    work_eligibility: w.workEligibility || null, we_expiry: w.weExpiry || null,
    emergency_contact_json: JSON.stringify(w.emergencyContact || {}), documents_json: JSON.stringify(w.documents || []),
    tickets_json: JSON.stringify(w.tickets || []), notes: w.notes || "", vac_balance: w.vacBalance || 0,
  });
}
console.log(`Seeded ${SEED_WORKERS.length} staffing workers.`);

const insertStaffingClient = db.prepare(
  `INSERT INTO staffing_clients (id, employer_id, status, signed_msa, bill_to_address, payment_terms_days, po_required,
     default_supervisor_email, conversion_fee_pct, credit_limit, current_ar, industry, markup, notes)
   VALUES (@id,@employer_id,@status,@signed_msa,@bill_to_address,@payment_terms_days,@po_required,
     @default_supervisor_email,@conversion_fee_pct,@credit_limit,@current_ar,@industry,@markup,@notes)`
);
for (const c of SEED_STAFFING_CLIENTS) {
  insertStaffingClient.run({
    id: c.id, employer_id: c.employerId, status: c.status, signed_msa: c.signedMsa || null,
    bill_to_address: c.billToAddress, payment_terms_days: c.paymentTermsDays, po_required: c.poRequired ? 1 : 0,
    default_supervisor_email: c.defaultSupervisorEmail, conversion_fee_pct: c.conversionFeePct,
    credit_limit: c.creditLimit, current_ar: c.currentAR, industry: c.industry, markup: c.markup, notes: c.notes || "",
  });
}
console.log(`Seeded ${SEED_STAFFING_CLIENTS.length} staffing clients.`);

const insertJobOrder = db.prepare(
  `INSERT INTO staffing_job_orders (id, client_id, created_at, status, urgency, title, positions, filled, location, province,
     start_date, end_date, ongoing, shift_pattern, overtime_available, pay_rate, bill_rate, must_have_json, nice_to_have_json,
     supervisor, supervisor_email, supervisor_phone, ppe, notes)
   VALUES (@id,@client_id,@created_at,@status,@urgency,@title,@positions,@filled,@location,@province,
     @start_date,@end_date,@ongoing,@shift_pattern,@overtime_available,@pay_rate,@bill_rate,@must_have_json,@nice_to_have_json,
     @supervisor,@supervisor_email,@supervisor_phone,@ppe,@notes)`
);
for (const j of SEED_JOB_ORDERS) {
  insertJobOrder.run({
    id: j.id, client_id: j.client, created_at: new Date(j.createdAt).toISOString(), status: j.status, urgency: j.urgency,
    title: j.title, positions: j.positions, filled: j.filled, location: j.location, province: j.province,
    start_date: j.startDate || null, end_date: j.endDate || null, ongoing: j.ongoing ? 1 : 0,
    shift_pattern: j.shiftPattern, overtime_available: j.overtimeAvailable ? 1 : 0, pay_rate: j.payRate, bill_rate: j.billRate,
    must_have_json: JSON.stringify(j.mustHave || []), nice_to_have_json: JSON.stringify(j.niceToHave || []),
    supervisor: j.supervisor, supervisor_email: j.supervisorEmail, supervisor_phone: j.supervisorPhone,
    ppe: j.ppe, notes: j.notes || "",
  });
}
console.log(`Seeded ${SEED_JOB_ORDERS.length} staffing job orders.`);

const insertAssignment = db.prepare(
  `INSERT INTO staffing_assignments (id, worker_id, client_id, job_order_id, status, start_date, end_date, ongoing,
     pay_rate, bill_rate, supervisor, supervisor_email, site, shift_pattern, notes)
   VALUES (@id,@worker_id,@client_id,@job_order_id,@status,@start_date,@end_date,@ongoing,
     @pay_rate,@bill_rate,@supervisor,@supervisor_email,@site,@shift_pattern,@notes)`
);
for (const a of SEED_ASSIGNMENTS) {
  insertAssignment.run({
    id: a.id, worker_id: a.worker, client_id: a.client, job_order_id: a.jobOrder || null, status: a.status,
    start_date: a.startDate, end_date: a.endDate || null, ongoing: a.ongoing ? 1 : 0,
    pay_rate: a.payRate, bill_rate: a.billRate, supervisor: a.supervisor, supervisor_email: a.supervisorEmail,
    site: a.site, shift_pattern: a.shiftPattern, notes: a.notes || "",
  });
}
console.log(`Seeded ${SEED_ASSIGNMENTS.length} staffing assignments.`);

const insertTimesheet = db.prepare(
  `INSERT INTO staffing_timesheets (id, assignment_id, worker_id, week_start, status, hours_json, ot_hours, submitted_at, approved_at, approved_by, notes)
   VALUES (@id,@assignment_id,@worker_id,@week_start,@status,@hours_json,@ot_hours,@submitted_at,@approved_at,@approved_by,@notes)`
);
for (const t of SEED_TIMESHEETS) {
  insertTimesheet.run({
    id: t.id, assignment_id: t.assignment, worker_id: t.worker, week_start: t.weekStart, status: t.status,
    hours_json: JSON.stringify(t.hours || {}), ot_hours: t.otHours || 0,
    submitted_at: t.submittedAt ? new Date(t.submittedAt).toISOString() : null,
    approved_at: t.approvedAt ? new Date(t.approvedAt).toISOString() : null,
    approved_by: t.approvedBy || null, notes: t.notes || "",
  });
}
console.log(`Seeded ${SEED_TIMESHEETS.length} staffing timesheets.`);

const insertStaffingPayrun = db.prepare(
  `INSERT INTO staffing_payruns (id, period_start, period_end, run_date, status, workers, total_hours, total_gross, total_net, lines_json)
   VALUES (@id,@period_start,@period_end,@run_date,@status,@workers,@total_hours,@total_gross,@total_net,@lines_json)`
);
for (const p of SEED_STAFFING_PAYRUNS) {
  insertStaffingPayrun.run({
    id: p.id, period_start: p.periodStart, period_end: p.periodEnd, run_date: p.runDate, status: p.status,
    workers: p.workers, total_hours: p.totalHours, total_gross: p.totalGross, total_net: p.totalNet,
    lines_json: JSON.stringify(p.lines || []),
  });
}
console.log(`Seeded ${SEED_STAFFING_PAYRUNS.length} staffing payroll runs.`);

const insertStaffingInvoice = db.prepare(
  `INSERT INTO staffing_invoices (id, number, client_id, week_start, issued, due, status, paid_on, lines_json, subtotal, gst, hst, total, po)
   VALUES (@id,@number,@client_id,@week_start,@issued,@due,@status,@paid_on,@lines_json,@subtotal,@gst,@hst,@total,@po)`
);
for (const i of SEED_STAFFING_INVOICES) {
  insertStaffingInvoice.run({
    id: i.id, number: i.number, client_id: i.client, week_start: i.weekStart, issued: i.issued,
    due: String(i.due), status: i.status, paid_on: i.paidOn || null, lines_json: JSON.stringify(i.lines || []),
    subtotal: i.subtotal, gst: i.gst || 0, hst: i.hst, total: i.total, po: i.po || "",
  });
}
console.log(`Seeded ${SEED_STAFFING_INVOICES.length} staffing invoices.`);

const insertPlacement = db.prepare(
  `INSERT INTO staffing_placements (id, client_id, candidate_id, role, offered_at, start_date, status, salary, fee_pct, fee,
     guarantee_ends, invoiced_on, paid_on, clawback_reason, replacement_due, notes)
   VALUES (@id,@client_id,@candidate_id,@role,@offered_at,@start_date,@status,@salary,@fee_pct,@fee,
     @guarantee_ends,@invoiced_on,@paid_on,@clawback_reason,@replacement_due,@notes)`
);
for (const p of SEED_PLACEMENTS) {
  insertPlacement.run({
    id: p.id, client_id: p.client, candidate_id: p.candidate || null, role: p.role, offered_at: p.offeredAt,
    start_date: p.startDate || null, status: p.status, salary: p.salary, fee_pct: p.feePct, fee: p.fee,
    guarantee_ends: p.guaranteeEnds || null, invoiced_on: p.invoicedOn || null, paid_on: p.paidOn || null,
    clawback_reason: p.clawbackReason || null, replacement_due: p.replacementDue ? 1 : 0, notes: p.notes || "",
  });
}
console.log(`Seeded ${SEED_PLACEMENTS.length} staffing placements.`);

console.log("Done.");
