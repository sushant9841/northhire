/* Real Canadian job-posting law, shared by the post wizard (validation + disclosure UI) and by
   POST /jobs (the actual enforcement boundary — the UI check alone would be bypassable, the same
   gap the plan-quota audit finding called out).

   Two regimes bind publicly advertised postings today:

   - Ontario, Working for Workers Act (Bill 149) — IN FORCE since 2026-01-01 for employers with
     25+ employees in Ontario: state expected compensation or a range no wider than $50,000 (the
     range rule stops applying above $200,000), disclose any AI used to screen/assess/select
     applicants, confirm the posting is a real vacancy, don't require "Canadian experience," tell
     interviewed applicants the outcome within 45 days, and keep postings + applications 3 years.
   - British Columbia, Pay Transparency Act — in force since 2023-11-01, every size of employer:
     every publicly advertised posting must state an expected salary or a specific range.

   Both are applied to the posting's OWN province (where the work is), not the company's head
   office, since that's what "advertised in Ontario/BC" turns on. */

const HOURS_PER_YEAR = 2080; // 40h × 52w — the standard full-time conversion

export const AI_DISCLOSURE_TEXT =
  "This employer uses artificial intelligence technology to assist in screening, assessing, or selecting applicants for this position.";

export const VACANCY_CONFIRMED_TEXT =
  "This posting is for an existing, currently open vacancy.";

/* Employer size is stored as a human label ("11-50", "1,000-5,000", "5,000+"). Bill 149's
   threshold is 25+ employees, so the LOWER bound is what decides it — a "1-10" company is
   clearly under, "26-100" clearly over. An unparseable/absent size is treated as over the
   threshold: over-disclosing costs nothing, under-disclosing is the actual legal risk. */
export function employeeCount(sizeLabel) {
  if (!sizeLabel) return null;
  const digits = String(sizeLabel).replace(/,/g, "").match(/\d+/g);
  if (!digits || !digits.length) return null;
  return Number(digits[0]);
}

export function postingRules({ prov, employerSize } = {}) {
  const count = employeeCount(employerSize);
  const ontarioBill149 = prov === "ON" && (count === null || count >= 25);
  const bcPayTransparency = prov === "BC";
  return {
    prov,
    ontarioBill149,
    bcPayTransparency,
    payRequired: ontarioBill149 || bcPayTransparency,
    rangeCap: ontarioBill149,
    aiDisclosure: ontarioBill149,
    vacancyConfirm: ontarioBill149,
    noCanadianExperience: ontarioBill149,
    decisionNoticeDays: ontarioBill149 ? 45 : null,
    retentionYears: ontarioBill149 ? 3 : null,
  };
}

/* Normalize to an annual figure so the $50,000 width cap and $200,000 ceiling can be compared
   consistently. Per-mile pay has no sensible annualization (it depends entirely on distance
   driven), so it opts out of the width cap rather than being guessed at. */
export function annualize(amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === "hr") return n * HOURS_PER_YEAR;
  if (unit === "yr" || unit === "contract") return n;
  return null; // "mi" and anything unknown
}

export const RANGE_CAP = 50000;
export const RANGE_CAP_CEILING = 200000;

/* Returns a human error string, or null when the range is fine. */
export function checkPayRange({ lo, hi, unit, rules }) {
  if (!rules?.rangeCap) return null;
  const annualLo = annualize(lo, unit);
  const annualHi = annualize(hi, unit);
  if (annualLo === null || annualHi === null) return null;
  // The cap stops applying entirely once the top of the range is above $200,000.
  if (annualHi > RANGE_CAP_CEILING) return null;
  const width = annualHi - annualLo;
  if (width <= RANGE_CAP) return null;
  const asPosted = unit === "hr"
    ? `$${(RANGE_CAP / HOURS_PER_YEAR).toFixed(2)}/hr`
    : `$${RANGE_CAP.toLocaleString()}`;
  return `Ontario's Bill 149 caps a posted pay range at $${RANGE_CAP.toLocaleString()} a year (about ${asPosted} here) unless the top of the range is above $${RANGE_CAP_CEILING.toLocaleString()}. This range spans about $${Math.round(width).toLocaleString()}/yr — narrow it, or post a fixed amount.`;
}

/* "Canadian experience" requirements are prohibited outright in Ontario postings and application
   forms. Matching is deliberately narrow — it looks for experience/work/employment tied to Canada,
   so ordinary sentences like "Canadian Tire" or "must hold a Canadian driver's licence" (a real,
   lawful requirement) don't trip it. */
const CANADIAN_EXPERIENCE_PATTERNS = [
  /\bcanadian\s+(work\s+|job\s+|industry\s+)?experience\b/i,
  /\bexperience\s+(working\s+)?in\s+canada\b/i,
  /\bcanadian\s+workplace\s+experience\b/i,
  /\bmust\s+have\s+worked\s+in\s+canada\b/i,
  /\b(canadian|local)\s+market\s+experience\s+required\b/i,
];

export function findCanadianExperience(...texts) {
  for (const raw of texts.flat()) {
    if (!raw) continue;
    const plain = String(raw).replace(/<[^>]+>/g, " ");
    for (const re of CANADIAN_EXPERIENCE_PATTERNS) {
      const m = plain.match(re);
      if (m) return m[0].trim();
    }
  }
  return null;
}

/* Bill 149's 45-day clock runs from the last interview, and applies to applicants an employer
   actually interviewed — not every applicant who ever applied. */
export function decisionNoticeStatus({ interviewedAt, decidedAt, days = 45, now = Date.now() }) {
  if (!interviewedAt) return null;
  const due = interviewedAt + days * 86400000;
  if (decidedAt) return { due, met: decidedAt <= due, decided: true };
  const daysLeft = Math.ceil((due - now) / 86400000);
  return { due, decided: false, overdue: daysLeft < 0, daysLeft };
}

/* Reads the clock off an application's own real stage history rather than a separate field, so
   it stays correct for applications that already existed before this rule was implemented.
   A "decision" is the applicant reaching Offer/Hired, or being rejected (which lands them in
   the Withdrawn stage with a recorded reason). */
const DECIDED_STAGES = new Set(["Offer", "Hired", "Withdrawn"]);

export function applicationDecisionNotice(app, rules, now = Date.now()) {
  if (!app || !rules?.decisionNoticeDays) return null;
  const history = Array.isArray(app.history) ? app.history : [];
  const interviewEntry = [...history].reverse().find(h => h.stage === "Interview");
  if (!interviewEntry && app.stage !== "Interview") return null;
  const interviewedAt = interviewEntry ? new Date(interviewEntry.at).getTime() : null;
  if (!Number.isFinite(interviewedAt)) return null;
  const decidedEntry = history.find(h => DECIDED_STAGES.has(h.stage) && new Date(h.at).getTime() >= interviewedAt);
  const decidedAt = decidedEntry ? new Date(decidedEntry.at).getTime()
    : (DECIDED_STAGES.has(app.stage) ? now : null);
  return decisionNoticeStatus({ interviewedAt, decidedAt, days: rules.decisionNoticeDays, now });
}
