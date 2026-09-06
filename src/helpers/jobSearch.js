import { CATM, PCODE } from "../store/seed/constants.js";
import { annual } from "./utils.js";
import { haversineKm } from "./geo.js";

/* The one real job-matching implementation — used by both SearchPage's live results and
   SavedSearchesPage's "N matches" count, which previously reimplemented a thinner, different
   version of the same rules and could disagree with what Search actually returns. */
export function matchJobsToFilters(jobs, filters, { expandQuery, emp }) {
  const { q = "", where = "", cats = [], types = [], modes = [], exps = [], prov = "", minPay = "", origin = null, radiusKm = 0 } = filters || {};
  let o = jobs.filter(j => j.status === "live");
  // A "-word" token excludes any job matching that word, same field set positive terms match
  // against (e.g. "electrician -apprentice" hides apprentice-level electrician roles).
  const excludeTerms = (q.match(/(?:^|\s)-(\S+)/g) || []).map(t => t.trim().slice(1).toLowerCase());
  const qWithoutExcludes = q.replace(/(?:^|\s)-(\S+)/g, " ");
  const s = qWithoutExcludes.trim().toLowerCase(), w = where.trim().toLowerCase();
  const matchesTerm = (j, t) =>
    j.t.toLowerCase().includes(t) ||
    emp(j.e).name.toLowerCase().includes(t) ||
    j.skills.some(k => k.toLowerCase().includes(t)) ||
    CATM[j.cat].label.toLowerCase().includes(t);
  if (s) {
    const terms = expandQuery(s);
    o = o.filter(j => terms.some(t => matchesTerm(j, t)));
  }
  if (excludeTerms.length) o = o.filter(j => !excludeTerms.some(t => matchesTerm(j, t)));
  // Radius search (real lat/lng distance) supersedes the plain text location match when both an
  // origin and a radius are set - "Toronto" text-matching would miss a job in Mississauga 15km
  // away that never mentions "Toronto" in its city field, which is exactly what a real radius
  // search is for. Jobs with no geocoded coordinates (e.g. from a bulk CSV import, which
  // deliberately skips geocoding to respect Nominatim's no-bulk-lookups usage policy) are excluded
  // from a radius search rather than silently included or excluded inconsistently.
  if (origin && radiusKm > 0) {
    o = o.filter(j => j.lat != null && j.lng != null && haversineKm(origin.lat, origin.lng, j.lat, j.lng) <= radiusKm);
  } else if (w) {
    o = o.filter(j => j.city.toLowerCase().includes(w) || j.prov.toLowerCase() === w ||
      (PCODE[where.trim()] && j.prov === PCODE[where.trim()]) || j.mode.toLowerCase().includes(w));
  }
  if (cats.length) o = o.filter(j => cats.includes(j.cat));
  if (types.length) o = o.filter(j => types.includes(j.type));
  if (modes.length) o = o.filter(j => modes.includes(j.mode));
  if (exps.length) o = o.filter(j => exps.includes(j.exp));
  if (prov) o = o.filter(j => j.prov === PCODE[prov]);
  if (minPay) o = o.filter(j => annual(j) >= Number(minPay));
  return o;
}
