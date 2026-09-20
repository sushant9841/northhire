/* Priority-4 #6 - Silver-medalist candidate re-engagement.
   A "silver medalist" is a seeker who got far enough into a pipeline (Interview / Offer /
   Withdrawn - i.e. genuinely evaluated, not just "Applied" and never looked at) at a given
   employer within the last 12 months, but that specific role didn't work out. If that same
   employer later posts something else this person is a real skills fit for, that's a warm
   re-engagement, not cold outreach - both sides already know each other.

   CASL gate: only seekers who have explicitly ticked opt_in_future_opportunities are ever
   considered here (see users.opt_in_future_opportunities, migration in db.js). An opt-out simply
   removes them from the seekers query on the next run - already-created match rows for them are
   left alone (harmless leftovers a dismiss or the UI's own opt-in check will hide), since a batch
   job has no obligation to retroactively delete rows the instant a flag flips; the eligibility
   check happens again at read time in the routes (see users.js/employers.js) as the real gate. */
import { db, nextId } from "../db.js";
import { pushNotification } from "./notify.js";
import { notifStringsForUser } from "../emailLocale.js";

const FINAL_STAGES = ["Interview", "Offer", "Withdrawn"];
const MATCH_WINDOW_MONTHS = 12;

function normSkills(json) {
  try { return (JSON.parse(json || "[]") || []).map(s => String(s).toLowerCase().trim()).filter(Boolean); }
  catch { return []; }
}

/** Recomputes silver-medalist matches for every opted-in seeker. Safe to call repeatedly - a
    (seeker, job) pair that already has a row (dismissed or not) is never re-inserted, so this
    only ever adds genuinely new matches and never re-notifies for one already seen. Returns
    {created} for callers (the boot interval, or the admin/test refresh endpoint) that want a
    count without reaching into the DB themselves. */
export function refreshSilverMedalistMatches() {
  const seekers = db.prepare(
    "SELECT id, skills_json FROM users WHERE role = 'seeker' AND opt_in_future_opportunities = 1"
  ).all();

  let created = 0;
  for (const seeker of seekers) {
    const seekerSkills = normSkills(seeker.skills_json);
    if (!seekerSkills.length) continue;

    const alreadyApplied = new Set(
      db.prepare("SELECT job_id FROM applications WHERE user_id = ?").all(seeker.id).map(r => r.job_id)
    );

    const employerRows = db.prepare(
      `SELECT DISTINCT jobs.employer_id AS employer_id
       FROM applications
       JOIN jobs ON jobs.id = applications.job_id
       WHERE applications.user_id = ?
         AND applications.stage IN (${FINAL_STAGES.map(() => "?").join(",")})
         AND applications.created_at >= datetime('now', '-${MATCH_WINDOW_MONTHS} months')`
    ).all(seeker.id, ...FINAL_STAGES);

    for (const { employer_id } of employerRows) {
      const liveJobs = db.prepare(
        "SELECT id, title, skills_json FROM jobs WHERE employer_id = ? AND status = 'live'"
      ).all(employer_id);

      for (const job of liveJobs) {
        if (alreadyApplied.has(job.id)) continue;
        const jobSkills = normSkills(job.skills_json);
        const overlap = jobSkills.filter(s => seekerSkills.includes(s)).length;
        if (overlap < 1) continue;

        const existing = db.prepare(
          "SELECT id FROM silver_medalist_matches WHERE seeker_id = ? AND job_id = ?"
        ).get(seeker.id, job.id);
        if (existing) continue;

        const id = nextId("smm", "silver_medalist_matches");
        db.prepare(
          `INSERT INTO silver_medalist_matches (id, seeker_id, job_id, employer_id, overlap_score, notified_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        ).run(id, seeker.id, job.id, employer_id, overlap);
        created++;

        // Fires ONE notification per new match, not N: exactly one pushNotification call per
        // newly-inserted row, right here, and the existing-row check above means a later run of
        // this same job never notifies twice for the same (seeker, job) pair.
        const employerRow = db.prepare("SELECT name FROM employers WHERE id = ?").get(employer_id);
        const strings = notifStringsForUser(seeker.id);
        pushNotification({
          for: seeker.id,
          icon: "target",
          title: strings.silverMedalistTitle,
          body: strings.silverMedalistBody(job.title, employerRow?.name),
          link: "status",
        });
      }
    }
  }
  return { created };
}
