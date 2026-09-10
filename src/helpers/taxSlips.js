/* Real year-end tax slips (T4) and Records of Employment (ROE), computed from the payroll runs
   that were actually executed rather than from a separate set of numbers.

   Scope, stated honestly: this generates the SLIP — a correct, printable T4 or ROE carrying real
   box amounts derived from real payroll lines. It does not FILE anything. Filing a T4 Summary
   with CRA (or submitting an ROE through ROE Web) needs a CRA/Service Canada transmitter account
   and their XML schema, which is a separate integration, not a computation. The generated slip is
   what an employer would check against and hand to an employee; it is not a substitute for
   filing, and the print output says so.

   Boxes implemented are the ones this payroll engine actually has the inputs for. CPP2 (the
   second CPP tier above the YMPE), Quebec's separate QPP/QPIP regime, RPP contributions, union
   dues, and pension adjustments are not modelled by the payroll engine, so their boxes are
   deliberately absent rather than shown as a confident $0. */

export const T4_BOXES = {
  14: "Employment income",
  16: "Employee's CPP contributions",
  18: "Employee's EI premiums",
  22: "Income tax deducted",
  24: "EI insurable earnings",
  26: "CPP pensionable earnings",
};

const round2 = n => Math.round((Number(n) || 0) * 100) / 100;

function yearOf(dateish) {
  if (!dateish) return null;
  const d = new Date(String(dateish).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

/* A run counts toward a T4 year by the date the employee was actually PAID, which is what CRA
   keys a T4 to - not the period the work was performed in. A December period paid in January
   therefore lands on the following year's slip, which is the correct treatment. */
export function runCountsForYear(run, year) {
  if (String(run.status || "").toLowerCase() !== "paid") return false;
  const paidYear = yearOf(run.paidAt || run.paid_at) ?? yearOf(run.runDate || run.run_date);
  return paidYear === Number(year);
}

/* Sums one employee's lines across every paid run in the year into real T4 box amounts.
   `caps` carries the statutory maximums so insurable/pensionable earnings can be reported
   correctly for someone who earned above them. */
/* lineKey exists because HR payroll lines identify the person as `employee` while staffing runs
   use `worker`. One shared computation with a configurable key beats two near-identical copies
   that drift apart the first time a box definition changes. */
export function buildT4({ employee, runs, year, caps = {}, lineKey = "employee" }) {
  const lines = [];
  for (const run of runs) {
    if (!runCountsForYear(run, year)) continue;
    const runLines = Array.isArray(run.lines) ? run.lines : [];
    const mine = runLines.filter(l => l[lineKey] === employee.id);
    for (const l of mine) lines.push(l);
  }
  if (!lines.length) return null;

  const gross = round2(lines.reduce((s, l) => s + (Number(l.gross) || 0), 0));
  const cpp = round2(lines.reduce((s, l) => s + (Number(l.cpp) || 0), 0));
  const ei = round2(lines.reduce((s, l) => s + (Number(l.ei) || 0), 0));
  const tax = round2(lines.reduce((s, l) => s + (Number(l.fedTax) || 0) + (Number(l.provTax) || 0), 0));

  // Insurable and pensionable earnings are the employee's earnings capped at the statutory
  // maximums - reporting raw gross here would be wrong for anyone who earned above them.
  const eiInsurable = round2(Math.min(gross, caps.eiMaxInsurable ?? gross));
  const cppPensionable = round2(Math.min(gross, caps.cppYmpe ?? gross));

  return {
    year: Number(year),
    employeeId: employee.id,
    name: employee.name,
    province: employee.prov || null,
    periodsPaid: lines.length,
    boxes: { 14: gross, 16: cpp, 18: ei, 22: tax, 24: eiInsurable, 26: cppPensionable },
  };
}

export function buildAllT4s({ employees, runs, year, caps, lineKey }) {
  return employees
    .map(e => buildT4({ employee: e, runs, year, caps, lineKey }))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* Which years actually have paid payroll behind them - so the UI offers real choices instead of
   a year picker that mostly returns nothing. */
export function payrollYears(runs) {
  const years = new Set();
  for (const run of runs) {
    if (String(run.status || "").toLowerCase() !== "paid") continue;
    const y = yearOf(run.paidAt || run.paid_at) ?? yearOf(run.runDate || run.run_date);
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export const ROE_REASONS = {
  A: "Shortage of work / end of contract or season",
  D: "Illness or injury",
  E: "Quit",
  G: "Retirement",
  K: "Other",
  M: "Dismissal",
  N: "Leave of absence",
};

/* Service Canada's ROE asks for insurable earnings and insurable HOURS. This payroll engine
   records hours for hourly employees only; for a salaried employee the hours are derived from
   the standard full-time week rather than measured, and the result flags that so whoever signs
   the ROE knows which figure was assumed rather than observed. */
export function buildRoe({ employee, runs, reason = "K", standardWeeklyHours = 40, lineKey = "employee" }) {
  const paid = runs
    .filter(r => String(r.status || "").toLowerCase() === "paid")
    .filter(r => (Array.isArray(r.lines) ? r.lines : []).some(l => l[lineKey] === employee.id))
    .sort((a, b) => String(a.periodStart || "").localeCompare(String(b.periodStart || "")));

  if (!paid.length) return null;

  let insurableEarnings = 0, measuredHours = 0, assumedHours = 0, periods = 0;
  for (const run of paid) {
    const mine = (run.lines || []).filter(l => l[lineKey] === employee.id);
    for (const l of mine) {
      periods++;
      insurableEarnings += Number(l.gross) || 0;
      const hb = l.hourlyBreakdown;
      if (hb && Number.isFinite(Number(hb.totalHours))) measuredHours += Number(hb.totalHours);
      else if (hb && Number.isFinite(Number(hb.regular))) {
        measuredHours += (Number(hb.regular) || 0) + (Number(hb.overtime) || 0) + (Number(hb.stat) || 0);
      } else {
        // Salaried: assume the standard week across a two-week period.
        assumedHours += standardWeeklyHours * 2;
      }
    }
  }

  const first = paid[0];
  const last = paid[paid.length - 1];
  return {
    employeeId: employee.id,
    name: employee.name,
    firstDayWorked: employee.hired || first.periodStart || null,
    lastDayPaid: employee.terminatedAt || last.periodEnd || null,
    reasonCode: reason,
    reasonLabel: ROE_REASONS[reason] || ROE_REASONS.K,
    payPeriodType: "Bi-weekly",
    periods,
    insurableEarnings: round2(insurableEarnings),
    insurableHours: round2(measuredHours + assumedHours),
    hoursWereAssumed: assumedHours > 0,
    assumedHours: round2(assumedHours),
  };
}
