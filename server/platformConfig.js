import { db } from "./db.js";
import { PLANS } from "../src/store/seed/constants.js";
import { DEFAULT_PAYROLL_TAX_CONFIG, DEFAULT_OVERTIME_POLICY } from "../src/helpers/payrollTax.js";
import { DEFAULT_STAFFING_RATES, DEFAULT_STAFFING_AGENCY } from "../src/helpers/staffingEconomics.js";
import { infinityReplacer, infinityReviver } from "../src/helpers/jsonInfinity.js";

/* Admin-editable business config, backed by the platform_config table (see db.js) instead of
   hardcoded JS constants - a finance-scope admin can change plan limits, payroll tax brackets,
   or staffing burden rates from the admin panel and have it take effect immediately, with no
   deploy. Values round-trip through infinityReplacer/Reviver (see jsonInfinity.js) both here and
   over HTTP (server/index.js sets infinityReplacer as Express's global json replacer; api.js
   parses every response with infinityReviver), since several of these configs genuinely need a
   real Infinity (Enterprise's unlimited job count, an open-ended tax bracket ceiling) and plain
   JSON.stringify would silently turn that into null. */
/* Admin-alerting thresholds: the number of pending items above which the AdmHome banner
   escalates from "there is a queue" (warn) to "there is a backlog" (danger). Editable in the
   admin business-config panel so a bigger platform can retune without a redeploy - the tracker
   correctly flagged that the previous banner had no configurable trigger at all. */
const DEFAULT_ADMIN_ALERTS = {
  pendingEmployersHigh: 5,
  flaggedJobsHigh: 3,
  contentDraftsHigh: 20,
  moderationBacklogHigh: 10,
};
/* Legal minimum wage by province (hourly, CAD) - editable in admin business-config so the
   platform can push a new rate the day a province raises theirs. Every job-post pay field
   reads the province of the listing and warns (not blocks) when the wage entered is below
   this floor. Values current as of 2026 - update when provinces publish new rates. */
const DEFAULT_MIN_WAGE_BY_PROVINCE = {
  AB: 15.00, BC: 17.85, MB: 15.80, NB: 15.30, NL: 15.60, NS: 15.20,
  ON: 17.20, PE: 16.00, QC: 15.75, SK: 15.00, NT: 16.05, YT: 17.59, NU: 19.00,
};
/* Admin-extendable pools that the post-job AI helper merges on top of the per-sector defaults
   baked into the frontend (see src/pages/shared/formControls.jsx). Empty by default; an admin
   fills these to add sector-specific benefits or common questions without a deploy. */
const DEFAULT_JOB_AI_BENEFITS_BY_SECTOR = {};
const DEFAULT_JOB_AI_QUESTIONS_BY_SECTOR = {};
const CONFIG_KEYS = ["plans", "payrollTax", "staffingRates", "staffingAgency", "overtimePolicy", "adminAlerts", "minWageByProvince", "jobAiBenefitsBySector", "jobAiQuestionsBySector"];
const DEFAULTS = { plans: PLANS, payrollTax: DEFAULT_PAYROLL_TAX_CONFIG, staffingRates: DEFAULT_STAFFING_RATES, staffingAgency: DEFAULT_STAFFING_AGENCY, overtimePolicy: DEFAULT_OVERTIME_POLICY, adminAlerts: DEFAULT_ADMIN_ALERTS, minWageByProvince: DEFAULT_MIN_WAGE_BY_PROVINCE, jobAiBenefitsBySector: DEFAULT_JOB_AI_BENEFITS_BY_SECTOR, jobAiQuestionsBySector: DEFAULT_JOB_AI_QUESTIONS_BY_SECTOR };

export function getConfig(key) {
  if (!CONFIG_KEYS.includes(key)) throw new Error(`Unknown platform config key: ${key}`);
  const row = db.prepare("SELECT value_json FROM platform_config WHERE key = ?").get(key);
  if (row) {
    const stored = JSON.parse(row.value_json, infinityReviver);
    // "plans" is backfilled against DEFAULTS.plans on every read: a plan row persisted before a
    // new per-plan field existed in code (e.g. Employer Transformation E5's analyticsHistoryDays)
    // would otherwise read as undefined forever for every employer, even Enterprise, since this
    // table is the actual source of truth once a row exists - editing the PLANS constant alone
    // never reaches an already-seeded database. Any field an admin has genuinely customized on a
    // plan is left exactly as they set it; only fields ABSENT from the stored plan are filled in.
    if (key === "plans") {
      let healed = false;
      for (const planName of Object.keys(DEFAULTS.plans)) {
        if (!stored[planName]) { stored[planName] = DEFAULTS.plans[planName]; healed = true; continue; }
        for (const field of Object.keys(DEFAULTS.plans[planName])) {
          if (!(field in stored[planName])) { stored[planName][field] = DEFAULTS.plans[planName][field]; healed = true; }
        }
      }
      if (healed) db.prepare("UPDATE platform_config SET value_json = ? WHERE key = ?").run(JSON.stringify(stored, infinityReplacer), key);
    }
    return stored;
  }
  db.prepare("INSERT INTO platform_config (key, value_json) VALUES (?, ?)").run(key, JSON.stringify(DEFAULTS[key], infinityReplacer));
  return DEFAULTS[key];
}
export function getAllConfig() {
  return Object.fromEntries(CONFIG_KEYS.map(k => [k, getConfig(k)]));
}
export function setConfig(key, value, updatedBy) {
  if (!CONFIG_KEYS.includes(key)) throw new Error(`Unknown platform config key: ${key}`);
  db.prepare(
    `INSERT INTO platform_config (key, value_json, updated_at, updated_by) VALUES (?, ?, datetime('now'), ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).run(key, JSON.stringify(value, infinityReplacer), updatedBy || null);
  return getConfig(key);
}
export { CONFIG_KEYS };
