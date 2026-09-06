/* Real bracket + TD1-aware Canadian payroll withholding, replacing the old flat-percentage
   approximation. Uses the standard CRA "annualization" method: a pay-period gross is scaled up
   to an annual figure by pay frequency, progressive federal + provincial brackets are applied to
   that annual figure, the basic personal amount (TD1 line 1) is credited at each jurisdiction's
   lowest bracket rate ONLY if a TD1 is on file (no TD1 on file = no personal credit, which is the
   real behavior CRA's own tables specify for "claim code 0"), and the result is divided back down
   to a per-period amount. Bracket/BPA figures below are the published 2024 approximate figures for
   each jurisdiction - this is a demo-grade payroll engine, not a certified CRA-table product;
   CPP2 (the 2024+ second CPP tier above the YMPE) and Quebec's separate QPP/QPIP regime are not
   modelled, both out of scope for a demo of this size.

   These numbers are business config, not code - they change every year and shouldn't require a
   deploy to update. DEFAULT_PAYROLL_TAX_CONFIG below is only the seed value written into the
   backend's platform_config table on first read (see server/platformConfig.js); every real call
   site fetches the live config from the backend and passes it in, so a finance-scope admin can
   edit brackets/rates from the admin panel and have every payroll calc pick it up immediately. */

export const DEFAULT_PAYROLL_TAX_CONFIG = {
  federalBrackets: [
    [55867, 0.15], [111733, 0.205], [173205, 0.26], [246752, 0.29], [Infinity, 0.33],
  ],
  federalBpa: 15705,
  provincial: {
    ON: { brackets: [[51446, 0.0505], [102894, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]], bpa: 12399 },
    AB: { brackets: [[148269, 0.10], [177922, 0.12], [237230, 0.13], [355845, 0.14], [Infinity, 0.15]], bpa: 21885 },
    BC: { brackets: [[47937, 0.0506], [95875, 0.077], [110076, 0.105], [133664, 0.1229], [181232, 0.147], [Infinity, 0.168]], bpa: 12580 },
    QC: { brackets: [[51780, 0.14], [103545, 0.19], [126000, 0.24], [Infinity, 0.2575]], bpa: 18056 },
    MB: { brackets: [[47000, 0.108], [100000, 0.1275], [Infinity, 0.174]], bpa: 15780 },
    SK: { brackets: [[52057, 0.105], [148734, 0.125], [Infinity, 0.145]], bpa: 18491 },
    NS: { brackets: [[29590, 0.0879], [59180, 0.1495], [93000, 0.1667], [150000, 0.175], [Infinity, 0.21]], bpa: 8481 },
    NB: { brackets: [[49958, 0.094], [99916, 0.14], [185064, 0.16], [Infinity, 0.195]], bpa: 13044 },
  },
  cppRate: 0.0595, cppBasicExemption: 3500, cppYmpe: 68500,
  eiRate: 0.0166, eiMaxInsurable: 63200,
};

function progressiveTax(annualIncome, brackets) {
  let tax = 0, prevCap = 0;
  for (const [cap, rate] of brackets) {
    if (annualIncome <= prevCap) break;
    tax += (Math.min(annualIncome, cap) - prevCap) * rate;
    prevCap = cap;
  }
  return tax;
}

// The real annual maximum any employee ever pays into CPP/EI - once year-to-date contributions
// hit this, withholding for the rest of the calendar year is $0. Derived from the same config
// (not a separate hardcoded number) so a finance-scope admin's YMPE/rate edit stays consistent.
export function annualMaxCpp(config = DEFAULT_PAYROLL_TAX_CONFIG) {
  return (config.cppYmpe - config.cppBasicExemption) * config.cppRate;
}
export function annualMaxEi(config = DEFAULT_PAYROLL_TAX_CONFIG) {
  return config.eiMaxInsurable * config.eiRate;
}

export function calcNetPay(gross, { province = "ON", payPeriodsPerYear = 26, td1OnFile = true, ytdCpp = 0, ytdEi = 0 } = {}, config = DEFAULT_PAYROLL_TAX_CONFIG) {
  const cfg = config || DEFAULT_PAYROLL_TAX_CONFIG;
  const prov = cfg.provincial[province] || cfg.provincial.ON;
  const annualGross = gross * payPeriodsPerYear;

  const cppPensionable = Math.max(0, Math.min(annualGross, cfg.cppYmpe) - cfg.cppBasicExemption);
  const cppUncapped = Math.round((cppPensionable * cfg.cppRate) / payPeriodsPerYear);
  // Real CPP/EI annual-maximum enforcement: once this employee's year-to-date contribution
  // reaches the real annual cap, this period's withholding is clamped to whatever's left (often
  // $0 for a high earner late in the year) rather than continuing to overwithhold past the max.
  const cpp = Math.max(0, Math.min(cppUncapped, annualMaxCpp(cfg) - ytdCpp));

  const eiUncapped = Math.round((Math.min(annualGross, cfg.eiMaxInsurable) * cfg.eiRate) / payPeriodsPerYear);
  const ei = Math.max(0, Math.min(eiUncapped, annualMaxEi(cfg) - ytdEi));

  const fedCredit = td1OnFile ? cfg.federalBpa * cfg.federalBrackets[0][1] : 0;
  const fedTax = Math.round(Math.max(0, progressiveTax(annualGross, cfg.federalBrackets) - fedCredit) / payPeriodsPerYear);

  const provCredit = td1OnFile ? prov.bpa * prov.brackets[0][1] : 0;
  const provTax = Math.round(Math.max(0, progressiveTax(annualGross, prov.brackets) - provCredit) / payPeriodsPerYear);

  const net = gross - (cpp + ei + fedTax + provTax);
  return { cpp, ei, fedTax, provTax, net };
}

/* Overtime/stat-holiday/shift-differential policy for hourly employees - business config, same
   admin-editable pattern as DEFAULT_PAYROLL_TAX_CONFIG above (see server/platformConfig.js).
   Salaried employees (the existing majority path, salary/26 per period) are entirely unaffected -
   this only applies to employees explicitly set to payType:"hourly". weeklyOtThreshold follows
   Ontario's common default (44h/week); statHolidays is a flat list of ISO dates an admin maintains
   directly rather than computing federal/provincial holiday calendars, which vary by jurisdiction
   and change yearly. */
export const DEFAULT_OVERTIME_POLICY = {
  weeklyOtThreshold: 44, otMultiplier: 1.5,
  statHolidayMultiplier: 1.5, statHolidays: ["2026-01-01", "2026-02-16", "2026-04-03", "2026-05-18", "2026-07-01", "2026-09-07", "2026-10-12", "2026-12-25"],
  nightDifferentialPerHr: 2, nightStart: "18:00", nightEnd: "06:00",
};

function timeInNightWindow(startTime, endTime, nightStart, nightEnd) {
  // Counts hours of a shift that fall within the night window [nightStart, nightEnd), handling a
  // window that wraps past midnight (e.g. 18:00-06:00) and a shift that itself may cross midnight.
  const toMin = t => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
  let s = toMin(startTime), e = toMin(endTime); if (e <= s) e += 1440;
  const ns = toMin(nightStart), ne0 = toMin(nightEnd); const wraps = ne0 <= ns;
  const windows = wraps ? [[ns, 1440 + ne0]] : [[ns, ne0]];
  let nightMin = 0;
  for (const [ws, we] of windows) {
    for (const off of [0, 1440]) {
      const os = ws + off, oe = we + off;
      nightMin += Math.max(0, Math.min(e, oe) - Math.max(s, os));
    }
  }
  return Math.min(nightMin, e - s) / 60;
}

/* Computes gross pay for one hourly employee over a pay period from real attendance rows (hours
   actually clocked) and shift rows (for night-differential timing, which attendance doesn't carry).
   Mirrors the shape calcNetPay's caller already expects (a single gross figure to run through tax
   withholding), plus a breakdown for display/CSV. */
export function calcHourlyGross(hourlyRate, attendanceRows, shiftRows, policy = DEFAULT_OVERTIME_POLICY) {
  const p = policy || DEFAULT_OVERTIME_POLICY;
  const byWeek = {};
  for (const a of attendanceRows) {
    const d = new Date(a.date);
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
    const wk = weekStart.toISOString().slice(0, 10);
    (byWeek[wk] ||= []).push(a);
  }
  let regularHours = 0, otHours = 0, statHours = 0, statPay = 0;
  for (const rows of Object.values(byWeek)) {
    let weekHours = 0;
    for (const a of rows) {
      const isStat = p.statHolidays.includes(a.date);
      if (isStat) { statHours += a.hours || 0; statPay += (a.hours || 0) * hourlyRate * p.statHolidayMultiplier; continue; }
      weekHours += a.hours || 0;
    }
    const reg = Math.min(weekHours, p.weeklyOtThreshold);
    const ot = Math.max(0, weekHours - p.weeklyOtThreshold);
    regularHours += reg; otHours += ot;
  }
  const nightHours = (shiftRows || []).reduce((s, sh) => s + timeInNightWindow(sh.start_time, sh.end_time, p.nightStart, p.nightEnd), 0);
  const regularPay = regularHours * hourlyRate;
  const otPay = otHours * hourlyRate * p.otMultiplier;
  const nightDiffPay = nightHours * p.nightDifferentialPerHr;
  const gross = Math.round(regularPay + otPay + statPay + nightDiffPay);
  return { gross, regularHours, otHours, statHours, nightHours, regularPay: Math.round(regularPay), otPay: Math.round(otPay), statPay: Math.round(statPay), nightDiffPay: Math.round(nightDiffPay) };
}
