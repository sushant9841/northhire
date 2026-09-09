/* Fuzzy/synonym expansion for job-search queries. Extracted out of useStore so the server can
   run the exact same matching when it decides whether a saved search matches a newly published
   job (server/jobAlerts.js) — a second, subtly different copy on the server would mean the email
   alert and the on-site search results disagree about what "matches", which is precisely the
   drift the SavedSearchesPage count bug was about. */
export const SYNONYMS = {
  nurse: ["rn", "psw", "nursing", "registered nurse", "personal support worker"],
  rn: ["nurse", "nursing"],
  psw: ["personal support worker", "health care aide", "hca"],
  electrician: ["electric", "electrical", "journeyperson", "red seal"],
  driver: ["driving", "truck", "az", "dz", "hauler", "operator", "chauffeur"],
  cook: ["cooking", "kitchen", "chef", "line cook", "prep", "food"],
  welder: ["welding", "fabricator", "fabrication"],
  plumber: ["plumbing", "gas fitter"],
  admin: ["administrative", "clerk", "assistant", "reception", "secretary"],
  warehouse: ["forklift", "picker", "packer", "stockroom"],
  developer: ["engineer", "programmer", "software", "dev", "coder"],
  accountant: ["bookkeeper", "accounting", "cpa", "finance"],
  security: ["guard", "officer"],
  teacher: ["educator", "instructor", "tutor"],
};

export function expandQuery(q) {
  if (!q) return [];
  const base = q.toLowerCase().trim();
  const words = base.split(/\s+/);
  const set = new Set([base, ...words]);
  words.forEach(w => {
    // exact synonym match
    if (SYNONYMS[w]) SYNONYMS[w].forEach(s => set.add(s));
    // reverse lookup: is w a synonym of something?
    Object.entries(SYNONYMS).forEach(([k, vals]) => { if (vals.includes(w)) set.add(k); });
    // stem: drop trailing s, ing, ed
    if (w.length > 4) {
      if (w.endsWith("s")) set.add(w.slice(0, -1));
      if (w.endsWith("ing")) set.add(w.slice(0, -3));
      if (w.endsWith("ed")) set.add(w.slice(0, -2));
    }
  });
  return [...set].filter(Boolean);
}
