/* Vacation accrual, including the year boundary.

   Accrual itself already worked: entitlement is prorated by how much of the calendar year has
   elapsed, and by hire date so someone who started in October doesn't accrue as if they'd been
   there since January. What was missing was what happens on 1 January — unused days simply
   vanished, which is both wrong and, in several provinces, not lawful.

   Carryover needs a policy, not just arithmetic, so it's expressed as three explicit settings
   rather than assumed:
     carryoverMode  "none" | "capped" | "unlimited"
     carryoverMaxDays   the cap when mode is "capped"
     carryoverExpiryMonths  how long carried days survive into the new year (0 = no expiry)

   The default is "capped" at 5 days, which is the common Canadian arrangement — but it's a
   setting, because an employer with a use-it-or-lose-it policy and one with full carryover are
   both making a legitimate choice this shouldn't silently override. */

export const DEFAULT_CARRYOVER = { carryoverMode: "capped", carryoverMaxDays: 5, carryoverExpiryMonths: 3 };

const startOfYear = y => new Date(Date.UTC(y, 0, 1));
const daysIn = y => (Date.UTC(y, 11, 31) - Date.UTC(y, 0, 1)) / 86400000 + 1;

/* Days accrued within one calendar year, prorated by elapsed time and by hire date. */
export function accruedInYear({ annualDays, hired, year, now = Date.now() }) {
  const ys = startOfYear(year);
  const hireDate = hired ? new Date(hired) : ys;
  const start = hireDate > ys ? hireDate : ys;
  const yearEnd = Date.UTC(year, 11, 31, 23, 59, 59);
  const upTo = Math.min(now, yearEnd);
  if (upTo <= start.getTime()) return 0;
  const elapsed = (upTo - start.getTime()) / 86400000;
  return Math.round(annualDays * Math.min(1, elapsed / daysIn(year)) * 10) / 10;
}

function applyCarryoverPolicy(unused, policy) {
  const mode = policy.carryoverMode || "capped";
  if (mode === "none") return 0;
  if (mode === "unlimited") return Math.max(0, unused);
  const cap = Number(policy.carryoverMaxDays);
  return Math.max(0, Math.min(unused, Number.isFinite(cap) ? cap : 0));
}

/* Full picture for one employee: what carried in from last year, what's accrued this year, what's
   been used, and what's actually available today.

   `usedByYear` is a map of year -> approved days taken, because carryover depends on what was
   left at the END of the previous year — not on the running total. */
export function vacationBalance({ annualDays, hired, usedByYear = {}, policy = DEFAULT_CARRYOVER, now = Date.now() }) {
  const today = new Date(now);
  const year = today.getUTCFullYear();
  const prevYear = year - 1;

  const hireYear = hired ? new Date(hired).getUTCFullYear() : year;
  let carriedIn = 0;
  let carryoverExpired = false;

  if (hireYear <= prevYear) {
    const accruedPrev = accruedInYear({ annualDays, hired, year: prevYear, now: Date.UTC(prevYear, 11, 31, 23, 59, 59) });
    const usedPrev = Number(usedByYear[prevYear]) || 0;
    carriedIn = applyCarryoverPolicy(Math.round((accruedPrev - usedPrev) * 10) / 10, policy);

    // Carried days can expire partway into the new year — after that date they're simply gone,
    // which is the whole point of an expiry policy and has to actually take effect.
    const expiryMonths = Number(policy.carryoverExpiryMonths) || 0;
    if (expiryMonths > 0) {
      const expiresAt = Date.UTC(year, expiryMonths, 1);
      if (now >= expiresAt) { carriedIn = 0; carryoverExpired = true; }
    }
  }

  const accrued = accruedInYear({ annualDays, hired, year, now });
  const usedThisYear = Number(usedByYear[year]) || 0;
  const available = Math.round((carriedIn + accrued - usedThisYear) * 10) / 10;

  return {
    year, carriedIn, carryoverExpired, accrued, used: usedThisYear,
    available,
    // Surfaced so the UI can warn before days are lost rather than after.
    carryoverExpiresOn: (Number(policy.carryoverExpiryMonths) || 0) > 0
      ? new Date(Date.UTC(year, Number(policy.carryoverExpiryMonths), 1)).toISOString().slice(0, 10)
      : null,
  };
}

/* Groups approved leave days by the calendar year they fall in. */
export function usedDaysByYear(leaveRows, type = "Vacation") {
  const out = {};
  for (const l of leaveRows || []) {
    if (l.status !== "approved" || l.type !== type) continue;
    const y = new Date(l.from || l.fromDate || l.requestedAt || Date.now()).getUTCFullYear();
    if (!Number.isFinite(y)) continue;
    out[y] = (out[y] || 0) + (Number(l.days) || 0);
  }
  return out;
}
