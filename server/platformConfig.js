import { db } from "./db.js";
import { PLANS } from "../src/store/seed/constants.js";
import { DEFAULT_PAYROLL_TAX_CONFIG } from "../src/helpers/payrollTax.js";
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
const CONFIG_KEYS = ["plans", "payrollTax", "staffingRates", "staffingAgency"];
const DEFAULTS = { plans: PLANS, payrollTax: DEFAULT_PAYROLL_TAX_CONFIG, staffingRates: DEFAULT_STAFFING_RATES, staffingAgency: DEFAULT_STAFFING_AGENCY };

export function getConfig(key) {
  if (!CONFIG_KEYS.includes(key)) throw new Error(`Unknown platform config key: ${key}`);
  const row = db.prepare("SELECT value_json FROM platform_config WHERE key = ?").get(key);
  if (row) return JSON.parse(row.value_json, infinityReviver);
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
