/* Priority-4 #5 - Full per-tier benefits premium logic.
   Plan shape lives here so the CRUD routes, the premium calculator and the enrollment-window
   check all agree on exactly what a plan's config_json means - see server/db.js's
   benefits_plans/benefits_enrollments/benefits_life_events for the schema note. */

export const DEFAULT_PLAN_CONFIG = () => ({
  tiers: [
    { key: "employee", label: "Employee", monthlyCost: 220, employerPct: 100 },
    { key: "employee_spouse", label: "Employee + Spouse", monthlyCost: 410, employerPct: 80 },
    { key: "family", label: "Family", monthlyCost: 610, employerPct: 70 },
  ],
  rrspMatch: [
    { upToPct: 3, matchPct: 100 },
    { upToPct: 5, matchPct: 50 },
  ],
  // Recurring every year - checked against today's month/day, not a one-time calendar date, so
  // the same plan doesn't need re-configuring annually.
  openEnrollment: { startMonth: 11, startDay: 1, endMonth: 11, endDay: 30 },
});

export function parsePlanConfig(configJson) {
  try {
    const c = JSON.parse(configJson || "{}");
    const def = DEFAULT_PLAN_CONFIG();
    return {
      tiers: Array.isArray(c.tiers) && c.tiers.length ? c.tiers : def.tiers,
      rrspMatch: Array.isArray(c.rrspMatch) ? c.rrspMatch : def.rrspMatch,
      openEnrollment: c.openEnrollment && typeof c.openEnrollment === "object" ? { ...def.openEnrollment, ...c.openEnrollment } : def.openEnrollment,
    };
  } catch {
    return DEFAULT_PLAN_CONFIG();
  }
}

/* Derived monthly premium split for one tier of one plan - the actual "per-tier benefits premium
   logic" this module exists for. Returns null if the tier no longer exists on the plan (it was
   renamed/removed after someone was enrolled in it) so callers can show a "this tier no longer
   exists" state instead of silently defaulting to $0. */
export function computePremium(config, tierKey) {
  const tier = config.tiers.find(t => t.key === tierKey);
  if (!tier) return null;
  const monthlyCost = Number(tier.monthlyCost) || 0;
  const employerPct = Math.max(0, Math.min(100, Number(tier.employerPct) || 0));
  const employerShare = Math.round(monthlyCost * employerPct) / 100;
  const employeeShare = Math.round((monthlyCost - employerShare) * 100) / 100;
  return { tierLabel: tier.label, monthlyCost, employerPct, employerShare, employeeShare };
}

/* Tiered RRSP match: contributionPct is what the employee elects to contribute (as a % of pay).
   Walks the bands in order, matching each slice at its own rate - "up to 3% matched 100%, next
   2% (i.e. the band up to 5%) matched 50%" means a 5% contribution is matched at 3*1.0 + 2*0.5 =
   4% of pay, not 5%*50%=2.5% or 5%*100%=5%. */
export function computeRrspMatchPct(rrspMatch, contributionPct) {
  const bands = [...(rrspMatch || [])].sort((a, b) => a.upToPct - b.upToPct);
  let prevCap = 0;
  let matched = 0;
  const remaining = Math.max(0, Number(contributionPct) || 0);
  for (const band of bands) {
    const bandWidth = Math.max(0, band.upToPct - prevCap);
    const slice = Math.max(0, Math.min(bandWidth, remaining - prevCap));
    if (slice > 0) matched += slice * (Math.max(0, Math.min(100, Number(band.matchPct) || 0)) / 100);
    prevCap = band.upToPct;
  }
  return Math.round(matched * 100) / 100;
}

/* Is today inside the plan's recurring open-enrollment window? Compared as MM-DD strings so a
   window doesn't need re-dating every year; a window that wraps New Year's (e.g. Dec 15 - Jan 15)
   is handled by falling back to an "outside the normal [start, end] order" case. */
export function isOpenEnrollmentActive(openEnrollment, now = new Date()) {
  const mmdd = (m, d) => `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const today = mmdd(now.getMonth() + 1, now.getDate());
  const start = mmdd(openEnrollment.startMonth, openEnrollment.startDay);
  const end = mmdd(openEnrollment.endMonth, openEnrollment.endDay);
  return start <= end ? (today >= start && today <= end) : (today >= start || today <= end);
}

export const LIFE_EVENT_WINDOW_DAYS = 30;

/* A recorded life event reopens enrollment for LIFE_EVENT_WINDOW_DAYS from its event_date
   (not from when it was recorded - HR may log it a few days late), regardless of the calendar
   open-enrollment window. */
export function hasQualifyingLifeEvent(lifeEventRows, now = new Date()) {
  return lifeEventRows.some(ev => {
    const evDate = new Date(`${ev.event_date}T00:00:00Z`);
    if (Number.isNaN(evDate.getTime())) return false;
    const daysSince = (now.getTime() - evDate.getTime()) / 86400000;
    return daysSince >= 0 && daysSince <= LIFE_EVENT_WINDOW_DAYS;
  });
}

/* Next occurrence of the plan's recurring window, from `now` - purely informational (shown as
   "next enrollment window" on the profile), not re-validated later. */
export function nextOpenEnrollmentDate(openEnrollment, now = new Date()) {
  const year = now.getFullYear();
  const candidate = new Date(Date.UTC(year, openEnrollment.startMonth - 1, openEnrollment.startDay));
  if (candidate.getTime() >= Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) {
    return candidate.toISOString().slice(0, 10);
  }
  return new Date(Date.UTC(year + 1, openEnrollment.startMonth - 1, openEnrollment.startDay)).toISOString().slice(0, 10);
}
