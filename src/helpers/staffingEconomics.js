/* Shared staffing-agency burden/margin math, used by both the server (payroll run, assignment
   margin endpoint) and the client (live margin preview while placing a worker) - previously
   duplicated verbatim in both places with its own hardcoded per-province rate table. Rates and
   agency policy numbers (markup floor/target/ceiling, pay period length, etc.) are admin-editable
   business config now, not hardcoded constants - DEFAULT_STAFFING_RATES/DEFAULT_STAFFING_AGENCY
   below are only the seed values written into the backend's platform_config table on first read
   (see server/platformConfig.js); every real call site fetches the live config and passes it in. */

export const DEFAULT_STAFFING_RATES = {
  ON: { cpp: 0.0595, ei: 0.0221, eht: 0.0195, wsib: 0.028, vac: 0.04, stat: 0.0384, label: "Ontario" },
  AB: { cpp: 0.0595, ei: 0.0221, eht: 0, wsib: 0.024, vac: 0.04, stat: 0.0384, label: "Alberta" },
  BC: { cpp: 0.0595, ei: 0.0221, eht: 0.0195, wsib: 0.026, vac: 0.04, stat: 0.0384, label: "British Columbia" },
  QC: { cpp: 0.064, ei: 0.0192, eht: 0.0206, wsib: 0.021, vac: 0.04, stat: 0.0384, label: "Québec" },
  MB: { cpp: 0.0595, ei: 0.0221, eht: 0.0215, wsib: 0.019, vac: 0.04, stat: 0.0384, label: "Manitoba" },
  SK: { cpp: 0.0595, ei: 0.0221, eht: 0, wsib: 0.021, vac: 0.04, stat: 0.0384, label: "Saskatchewan" },
  NS: { cpp: 0.0595, ei: 0.0221, eht: 0, wsib: 0.024, vac: 0.04, stat: 0.0384, label: "Nova Scotia" },
  NB: { cpp: 0.0595, ei: 0.0221, eht: 0, wsib: 0.021, vac: 0.04, stat: 0.0384, label: "New Brunswick" },
};

export const DEFAULT_STAFFING_AGENCY = {
  id: "stf1", name: "NorthHire Staffing", tagline: "Canadian workers, Canadian workplaces",
  license: "ON-THA-2026-4471", licenseExpiry: "2027-01-01", licenseLocAmount: 25000,
  wsibProvinces: ["ON", "AB", "BC"], wsibRateGroup: "3 (Staffing)",
  provinces: ["ON", "AB", "BC", "QC", "MB", "SK", "NS", "NB"], founded: "2026-01-01",
  markupFloor: 25, markupTarget: 38, markupCeiling: 65,
  payPeriodDays: 14, invoiceCycleDays: 7, paymentTermsDefaultDays: 30, vacationPayMode: "accrue",
};

function round2(n) { return Math.round(n * 100) / 100; }
function round1(n) { return Math.round(n * 10) / 10; }

export function calcStaffingEconomics(pay, bill, prov, benefitsPerHr = 0, rates = DEFAULT_STAFFING_RATES) {
  const r = rates[prov] || rates.ON;
  const cpp = pay * r.cpp, ei = pay * r.ei * 1.4, eht = pay * r.eht;
  const wsib = pay * r.wsib, vac = pay * r.vac, stat = pay * r.stat;
  const admin = 1.0;
  const burden = cpp + ei + eht + wsib + vac + stat + admin + benefitsPerHr;
  const trueCost = pay + burden;
  const margin = bill - trueCost;
  const marginPct = bill > 0 ? (margin / bill) * 100 : 0;
  const markupPct = pay > 0 ? ((bill - pay) / pay) * 100 : 0;
  return {
    pay, bill, burden: round2(burden), trueCost: round2(trueCost), margin: round2(margin),
    marginPct: round1(marginPct), markupPct: round1(markupPct),
    breakdown: { cpp: round2(cpp), ei: round2(ei), eht: round2(eht), wsib: round2(wsib), vac: round2(vac), stat: round2(stat), admin: round2(admin), benefits: round2(benefitsPerHr) },
  };
}
