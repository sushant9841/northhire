/* Pipeline load for the demo employer (e1, hr@pcl.com). Every one of its twenty published jobs gets
   5-15 applications distributed across the six live stages plus Withdrawn, so the kanban board is
   exercised under realistic volume instead of the three-card demo it shipped with. Deterministic:
   the same seed run produces the same board, which keeps screenshots and QA comparable. */

import { SEED_JOBS } from "./jobs.js";
import { EXTRA_PEOPLE } from "./peopleExtra.js";

const DEMO_EMPLOYER_ID = "e1";

/* Weighted so the funnel narrows the way a real pipeline does — most candidates sit in Applied,
   very few reach Offer or Hired. A flat distribution would make the board look fake. */
const STAGE_WEIGHTS = [
  ["Applied", 34], ["Reviewed", 22], ["Shortlisted", 16],
  ["Interview", 12], ["Offer", 5], ["Hired", 4], ["Withdrawn", 7],
];
const STAGE_TABLE = STAGE_WEIGHTS.flatMap(([stage, w]) => Array(w).fill(stage));

const NOTES = {
  Applied: ["Waiting for employer review", "Application received", "In the queue for screening"],
  Reviewed: ["Employer opened your profile", "Resume reviewed by the hiring team", "Screened — decision pending"],
  Shortlisted: ["Shortlisted for interview scheduling", "Invited to a hiring session", "Moved to the shortlist by the superintendent"],
  Interview: ["Site interview booked", "Panel interview scheduled with the project manager", "Second interview to be confirmed"],
  Offer: ["Offer letter sent, awaiting response", "Conditional offer pending references", "Offer under review by the candidate"],
  Hired: ["Offer accepted — start date confirmed", "Hired, onboarding scheduled", "Accepted and orientation booked"],
  Withdrawn: ["Candidate withdrew — accepted another role", "Withdrawn by the candidate", "No longer available for this posting"],
};
const AVAIL = ["Immediately", "Within 2 weeks", "Within 1 month", "Negotiable"];

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };

const demoJobIds = SEED_JOBS.filter((j) => j.e === DEMO_EMPLOYER_ID).map((j) => j.id);
const candidateIds = EXTRA_PEOPLE.map((p) => p.id);

export const EXTRA_APPS = (() => {
  const out = [];
  let n = 0;
  demoJobIds.forEach((jobId, ji) => {
    const h = hash(jobId);
    const count = 5 + (h % 11); // 5-15 applications per job
    const used = new Set();
    for (let k = 0; k < count; k++) {
      /* Walk the candidate list with a job-specific offset and a stride coprime to its length, so
         each job draws a different, non-repeating slice of the seeker pool. */
      let idx = (h + ji * 13 + k * 7) % candidateIds.length;
      while (used.has(idx)) idx = (idx + 1) % candidateIds.length;
      used.add(idx);
      const s = hash(`${jobId}:${k}`);
      const stage = STAGE_TABLE[s % STAGE_TABLE.length];
      const notes = NOTES[stage];
      out.push({
        id: `xa${++n}`,
        job: jobId,
        user: candidateIds[idx],
        stage,
        at: `${1 + (s % 28)} days ago`,
        note: notes[s % notes.length],
        avail: AVAIL[s % AVAIL.length],
        expect: "",
        letter: "",
      });
    }
  });
  return out;
})();
