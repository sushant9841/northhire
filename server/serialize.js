import { sqlTime } from "./db.js";

// Real created_at/deadline_date timestamps replace the frontend seed data's frozen
// "2 days ago" / dl-day-count strings, which never advanced once written - the same
// "fake historical data" gap the productionization audit flagged repeatedly. Here the
// display text is computed fresh on every read, so it's always actually correct.
// (sqlTime, not a bare `new Date`, because SQLite's datetime('now') columns are naive UTC
// strings with no timezone marker - the JS Date constructor would otherwise silently parse
// them as local time and drift every comparison by the server's UTC offset.)
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function relativeDaysAgo(isoDate) {
  const d = daysBetween(sqlTime(isoDate), new Date());
  if (d <= 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export function daysUntil(isoDate) {
  if (!isoDate) return null;
  return daysBetween(new Date(), sqlTime(isoDate));
}

// Finer-grained relative time for things stamped with a real timestamp shown at
// minute/hour granularity (notifications) rather than day granularity (jobs/applications).
export function relativeTime(isoDate) {
  const ms = Date.now() - sqlTime(isoDate).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.floor(hr / 24);
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

export function serializeJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    e: row.employer_id,
    t: row.title,
    cat: row.cat,
    city: row.city,
    prov: row.prov,
    lat: row.lat,
    lng: row.lng,
    type: row.type,
    mode: row.mode,
    lo: row.pay_lo,
    hi: row.pay_hi,
    unit: row.pay_unit,
    vac: row.vacancies,
    exp: row.experience,
    edu: row.education,
    dlDate: row.deadline_date,
    daysLeft: daysUntil(row.deadline_date),
    posted: relativeDaysAgo(row.created_at),
    createdAt: sqlTime(row.created_at).getTime(),
    views: row.views,
    urgent: !!row.urgent,
    featured: !!row.featured,
    skills: JSON.parse(row.skills_json || "[]"),
    perks: JSON.parse(row.perks_json || "[]"),
    desc: row.description,
    duties: JSON.parse(row.duties_json || "[]"),
    reqs: JSON.parse(row.requirements_json || "[]"),
    how: row.how_to_apply,
    questions: JSON.parse(row.screening_questions_json || "[]"),
    status: row.status,
    flagged: !!row.flagged,
    hiringType: row.hiring_type,
    pendingOwnerApproval: !!row.pending_owner_approval,
  };
}

export function serializeEmployer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    mark: row.mark,
    a: row.a,
    b: row.b,
    industry: row.industry,
    city: row.city,
    prov: row.prov,
    size: row.size,
    rating: row.rating,
    verified: !!row.verified,
    hold: !!row.hold,
    about: row.about,
    founded: row.founded,
    site: row.site,
    plan: row.plan,
    businessNumber: row.business_number,
    owner: row.owner || null,
    ownerName: row.ownerName || null,
  };
}

export function serializeApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    job: row.job_id,
    user: row.user_id,
    stage: row.stage,
    note: row.note,
    at: relativeDaysAgo(row.created_at),
    createdAt: sqlTime(row.created_at).getTime(),
    avail: row.availability,
    expect: row.pay_expectation,
    letter: row.cover_letter,
    cv: row.cv_id,
    meets: row.meets,
    screeningAnswers: JSON.parse(row.screening_answers_json || "[]"),
    history: JSON.parse(row.history_json || "[]"),
    previousStage: row.previous_stage,
    withdrawnAt: row.withdrawn_at,
  };
}

/* ═══════════════ CONTENT ═══════════════ */
export function serializeBlog(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, cat: row.cat, scene: row.scene, tone: row.tone,
    mins: row.mins, author: row.author, authorSeed: row.author_seed,
    date: sqlTime(row.created_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" }),
    excerpt: row.excerpt, body: JSON.parse(row.body_json || "[]"),
    owner: row.owner_employer_id || "admin",
    status: row.status, scheduledAt: row.scheduled_at, views: row.views, featured: !!row.featured,
  };
}
export function serializeTraining(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, cat: row.cat, scene: row.scene, tone: row.tone,
    provider: row.provider, providerSeed: row.provider_seed, level: row.level,
    hours: row.hours, price: row.price, rating: row.rating, enrolled: row.enrolled,
    mods: JSON.parse(row.mods_json || "[]"), outcomes: JSON.parse(row.outcomes_json || "[]"), about: row.about,
    owner: row.owner_employer_id || "admin",
    status: row.status, scheduledAt: row.scheduled_at, featured: !!row.featured,
  };
}
export function serializeContentRevision(row) {
  if (!row) return null;
  return { id: row.id, contentType: row.content_type, contentId: row.content_id,
    snapshot: JSON.parse(row.snapshot_json), createdBy: row.created_by, createdAt: sqlTime(row.created_at).getTime() };
}

/* ═══════════════ SEEKER MISC ═══════════════ */
export function serializeCv(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, template: row.template,
    name0: row.name0, title: row.title, email: row.email, phone: row.phone, city: row.city, prov: row.prov,
    summary: row.summary, skills: JSON.parse(row.skills_json || "[]"), certs: JSON.parse(row.certs_json || "[]"),
    exp: JSON.parse(row.exp_json || "[]"), edu: JSON.parse(row.edu_json || "[]"),
    updated: relativeTime(row.updated_at),
  };
}
export function serializeSavedSearch(row) {
  if (!row) return null;
  return {
    id: row.id, user: row.user_id, name: row.name, q: row.q, where: row.where_text,
    cats: JSON.parse(row.cats_json || "[]"), types: JSON.parse(row.types_json || "[]"),
    modes: JSON.parse(row.modes_json || "[]"), exps: JSON.parse(row.exps_json || "[]"),
    prov: row.prov, minPay: row.min_pay, alerts: !!row.alerts, frequency: row.frequency || "instant",
    createdAt: sqlTime(row.created_at).getTime(), lastRun: row.last_run ? sqlTime(row.last_run).getTime() : null,
    lastCount: row.last_count,
  };
}
export function serializeMessage(row) {
  if (!row) return null;
  return { id: row.id, from: row.from_user_id, to: row.to_user_id, job: row.job_id, text: row.text,
    read: !!row.read, at: sqlTime(row.created_at).getTime() };
}
export function serializeInterview(row) {
  if (!row) return null;
  return { id: row.id, app: row.application_id, candidate: row.candidate_id, job: row.job_id, employer: row.employer_id,
    when: row.when_text, mode: row.mode, notes: row.notes, status: row.status, createdAt: sqlTime(row.created_at).getTime() };
}
export function serializeReview(row) {
  if (!row) return null;
  return { id: row.id, employer: row.employer_id, user: row.user_id, rating: row.rating, text: row.text,
    anon: !!row.anon, at: sqlTime(row.created_at).getTime() };
}
export function serializeNotification(row) {
  if (!row) return null;
  return { id: row.id, for: row.for_value, icon: row.icon, title: row.title, body: row.body, link: row.link,
    read: !!row.read, at: relativeTime(row.created_at) };
}
export function serializeReference(row) {
  if (!row) return null;
  return { id: row.id, user: row.user_id, name: row.name, relation: row.relation, email: row.email, phone: row.phone,
    addedAt: sqlTime(row.created_at).getTime() };
}
export function serializePaymentMethod(row) {
  if (!row) return null;
  return { id: row.id, masked: row.masked, brand: row.brand, exp: row.exp, name: row.name, default: !!row.is_default };
}

/* ═══════════════ HR SUITE ═══════════════ */
export function serializeHrEmployee(row) {
  if (!row) return null;
  const { password_hash, password_salt, ...rest } = row;
  return {
    id: rest.id, companyId: rest.company_id, name: rest.name, email: rest.email, role: rest.role,
    dept: rest.dept, title: rest.title, hired: rest.hired, seed: rest.seed, phone: rest.phone,
    city: rest.city, prov: rest.prov, salary: rest.salary, birthDate: rest.birth_date, manager: rest.manager,
    skills: JSON.parse(rest.skills_json || "[]"), badges: JSON.parse(rest.badges_json || "[]"),
    certifications: JSON.parse(rest.certifications_json || "[]"),
    status: rest.status, terminatedAt: rest.terminated_at,
    td1OnFile: !!rest.td1_on_file, benefitsPerPay: rest.benefits_per_pay, benefitsPlan: rest.benefits_plan,
    erased: !!rest.erased, erasedAt: rest.erased_at,
    visibility: JSON.parse(rest.visibility_json || "{}"),
    joinedDate: rest.hired,
  };
}
export function serializeHrAttendance(row) {
  if (!row) return null;
  return { id: row.id, employee: row.employee_id, date: row.date, clockIn: row.clock_in, clockOut: row.clock_out,
    source: row.source, hours: row.hours, site: row.site, late: !!row.late };
}
export function serializeHrLeave(row) {
  if (!row) return null;
  return { id: row.id, employee: row.employee_id, type: row.type, from: row.from_date, to: row.to_date, days: row.days,
    status: row.status, reason: row.reason, approvedBy: row.approved_by, requestedAt: sqlTime(row.requested_at).getTime() };
}
export function serializeHrTask(row) {
  if (!row) return null;
  return { id: row.id, title: row.title, assignee: row.assignee, assignedBy: row.assigned_by, due: row.due,
    priority: row.priority, status: row.status, tags: JSON.parse(row.tags_json || "[]"),
    created: sqlTime(row.created_at).getTime(), completed: row.completed_at ? sqlTime(row.completed_at).getTime() : null };
}
export function serializeHrEvent(row) {
  if (!row) return null;
  return { id: row.id, title: row.title, when: row.event_date, time: row.time, duration: row.duration, type: row.type,
    location: row.location, invitees: row.invitees, organiser: row.organiser, description: row.description };
}
export function serializeHrInvoice(row) {
  if (!row) return null;
  return { id: row.id, number: row.number, client: row.client, amount: row.amount, subtotal: row.subtotal, hst: row.hst,
    taxLabel: row.tax_label, po: row.po, status: row.status, issued: row.issued, due: row.due, paid: row.paid,
    createdBy: row.created_by, items: JSON.parse(row.items_json || "[]") };
}
export function serializeHrDepartment(row) {
  if (!row) return null;
  return { id: row.id, companyId: row.company_id, name: row.name, lead: row.lead, color: row.color, about: row.about };
}
export function serializeHrExpense(row) {
  if (!row) return null;
  return { id: row.id, employee: row.employee_id, category: row.category, merchant: row.merchant, amount: row.amount,
    currency: row.currency, description: row.description, receiptUrl: row.receipt_url, date: row.date,
    status: row.status, submitted: sqlTime(row.submitted_at).getTime(), approvedBy: row.approved_by,
    approvedAt: row.approved_at ? sqlTime(row.approved_at).getTime() : null,
    paidAt: row.paid_at ? sqlTime(row.paid_at).getTime() : null,
    rejectReason: row.reject_reason, reimburseVia: row.reimburse_via };
}
export function serializeHrPayrun(row) {
  if (!row) return null;
  return { id: row.id, companyId: row.company_id, periodStart: row.period_start, periodEnd: row.period_end,
    period: `${row.period_start} → ${row.period_end}`, runDate: row.run_date, status: row.status,
    employees: row.employees, totalGross: row.total_gross, totalNet: row.total_net, totalReimb: row.total_reimb,
    lines: JSON.parse(row.lines_json || "[]") };
}
export function serializeHrChat(row) {
  if (!row) return null;
  return { id: row.id, kind: row.kind, name: row.name, members: row.members, about: row.about,
    createdBy: row.created_by, createdAt: sqlTime(row.created_at).getTime() };
}
export function serializeHrChatMessage(row) {
  if (!row) return null;
  return { id: row.id, chat: row.chat_id, from: row.from_employee, text: row.text, at: sqlTime(row.created_at).getTime() };
}
export function serializeHrAuditEntry(row) {
  if (!row) return null;
  return { id: row.id, actor: row.actor_employee_id, action: row.action, detail: row.detail, at: sqlTime(row.created_at).getTime() };
}
export function serializeHrShift(row) {
  if (!row) return null;
  return { id: row.id, companyId: row.company_id, employee: row.employee_id, date: row.date,
    startTime: row.start_time, endTime: row.end_time, role: row.role, site: row.site, notes: row.notes,
    createdBy: row.created_by, createdAt: sqlTime(row.created_at).getTime() };
}
export function serializeHrSignDocument(row) {
  if (!row) return null;
  return { id: row.id, companyId: row.company_id, title: row.title, body: row.body,
    requiredFor: JSON.parse(row.required_for_json || "[]"), createdBy: row.created_by, createdAt: sqlTime(row.created_at).getTime() };
}
export function serializeHrSignature(row) {
  if (!row) return null;
  return { id: row.id, document: row.document_id, employee: row.employee_id, signedName: row.signed_name, signedAt: sqlTime(row.signed_at).getTime() };
}

/* ═══════════════ STAFFING AGENCY ═══════════════ */
export function serializeWorker(row) {
  if (!row) return null;
  return { id: row.id, personId: row.person_id, status: row.status, availability: row.availability,
    onboarded: row.onboarded, province: row.province, city: row.city,
    payRateFloor: row.pay_rate_floor, payRateTarget: row.pay_rate_target,
    sinLast3: row.sin_last3, tdOnFile: !!row.td_on_file, directDepositOnFile: !!row.direct_deposit_on_file,
    workEligibility: row.work_eligibility, weExpiry: row.we_expiry,
    emergencyContact: JSON.parse(row.emergency_contact_json || "{}"), documents: JSON.parse(row.documents_json || "[]"),
    tickets: JSON.parse(row.tickets_json || "[]"), notes: row.notes, vacBalance: row.vac_balance,
    defaultBenefitsPerHr: row.default_benefits_per_hr };
}
// A client company only needs enough to identify/display the worker assigned to their site - the
// agency's internal HR file on that worker (SIN, emergency contact, private pay-rate range,
// documents, notes) has no business crossing to a third-party client, unlike serializeWorker()
// which is for the agency's own back-office.
export function serializeWorkerForClient(row) {
  if (!row) return null;
  return { id: row.id, personId: row.person_id, status: row.status, availability: row.availability,
    province: row.province, city: row.city, tickets: JSON.parse(row.tickets_json || "[]") };
}
export function serializeStaffingClient(row) {
  if (!row) return null;
  return { id: row.id, employerId: row.employer_id, status: row.status, signedMsa: row.signed_msa,
    billToAddress: row.bill_to_address, paymentTermsDays: row.payment_terms_days, poRequired: !!row.po_required,
    defaultSupervisorEmail: row.default_supervisor_email, conversionFeePct: row.conversion_fee_pct,
    creditLimit: row.credit_limit, currentAR: row.current_ar, industry: row.industry, markup: row.markup, notes: row.notes };
}
export function serializeJobOrder(row) {
  if (!row) return null;
  return { id: row.id, client: row.client_id, createdAt: sqlTime(row.created_at).getTime(), status: row.status,
    urgency: row.urgency, title: row.title, positions: row.positions, filled: row.filled,
    location: row.location, province: row.province, startDate: row.start_date, endDate: row.end_date,
    ongoing: !!row.ongoing, shiftPattern: row.shift_pattern, overtimeAvailable: !!row.overtime_available,
    payRate: row.pay_rate, billRate: row.bill_rate,
    mustHave: JSON.parse(row.must_have_json || "[]"), niceToHave: JSON.parse(row.nice_to_have_json || "[]"),
    supervisor: row.supervisor, supervisorEmail: row.supervisor_email, supervisorPhone: row.supervisor_phone,
    ppe: row.ppe, notes: row.notes };
}
export function serializeSubmittal(row) {
  if (!row) return null;
  return { id: row.id, jobOrder: row.job_order_id, worker: row.worker_id, stage: row.stage, notes: row.notes,
    createdAt: sqlTime(row.created_at).getTime(), updatedAt: sqlTime(row.updated_at).getTime() };
}
export function serializeAssignment(row) {
  if (!row) return null;
  return { id: row.id, worker: row.worker_id, client: row.client_id, jobOrder: row.job_order_id, status: row.status,
    startDate: row.start_date, endDate: row.end_date, ongoing: !!row.ongoing, payRate: row.pay_rate, billRate: row.bill_rate,
    benefitsPerHr: row.benefits_per_hr,
    supervisor: row.supervisor, supervisorEmail: row.supervisor_email, site: row.site, shiftPattern: row.shift_pattern, notes: row.notes };
}
export function serializeStaffingTimesheet(row) {
  if (!row) return null;
  return { id: row.id, assignment: row.assignment_id, worker: row.worker_id, weekStart: row.week_start, status: row.status,
    hours: JSON.parse(row.hours_json || "{}"), otHours: row.ot_hours,
    submittedAt: row.submitted_at ? sqlTime(row.submitted_at).getTime() : null,
    approvedAt: row.approved_at ? sqlTime(row.approved_at).getTime() : null,
    approvedBy: row.approved_by, notes: row.notes };
}
export function serializeStaffingPayrun(row) {
  if (!row) return null;
  return { id: row.id, periodStart: row.period_start, periodEnd: row.period_end, runDate: row.run_date, status: row.status,
    workers: row.workers, totalHours: row.total_hours, totalGross: row.total_gross, totalNet: row.total_net,
    lines: JSON.parse(row.lines_json || "[]") };
}
export function serializeStaffingInvoice(row) {
  if (!row) return null;
  return { id: row.id, number: row.number, client: row.client_id, weekStart: row.week_start, issued: row.issued,
    due: row.due, status: row.status, paidOn: row.paid_on, lines: JSON.parse(row.lines_json || "[]"),
    subtotal: row.subtotal, gst: row.gst, hst: row.hst, total: row.total, po: row.po };
}
export function serializeWsibClaim(row) {
  if (!row) return null;
  return { id: row.id, worker: row.worker_id, assignment: row.assignment_id, claimNumber: row.claim_number,
    filedDate: row.filed_date, incidentDate: row.incident_date, description: row.description,
    status: row.status, notes: row.notes, createdAt: sqlTime(row.created_at).getTime() };
}
export function serializeStaffingAuditEntry(row) {
  if (!row) return null;
  return { id: row.id, actor: row.actor_staff_id, action: row.action, detail: row.detail, at: sqlTime(row.created_at).getTime() };
}
export function serializePlacement(row) {
  if (!row) return null;
  return { id: row.id, client: row.client_id, candidate: row.candidate_id, role: row.role, offeredAt: row.offered_at,
    startDate: row.start_date, status: row.status, salary: row.salary, feePct: row.fee_pct, fee: row.fee,
    guaranteeEnds: row.guarantee_ends, invoicedOn: row.invoiced_on, paidOn: row.paid_on,
    clawbackReason: row.clawback_reason, replacementDue: !!row.replacement_due, notes: row.notes,
    recruiterId: row.recruiter_id, commission: row.commission, commissionPaid: !!row.commission_paid, commissionPaidAt: row.commission_paid_at };
}
