/* Real job-alert delivery for saved searches. Until now a saved search with alerts switched on
   only ever pushed an in-app notification into an in-memory list, while the UI promised email —
   the audit's "saved-search alerts never actually send" finding.

   Every alert here is a commercial electronic message under CASL, so it goes out through
   sendCommercialMail(), which refuses to send without a recorded consent and appends the
   required sender identification and unsubscribe link. A seeker who saved a search but never
   consented to email still gets the in-app notification; they just don't get mail. */
import { db } from "./db.js";
import { serializeJob, serializeSavedSearch, serializeEmployer } from "./serialize.js";
import { sendCommercialMail } from "./mail.js";
import { matchJobsToFilters } from "../src/helpers/jobSearch.js";
import { expandQuery } from "../src/helpers/synonyms.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function employerLookup() {
  const rows = db.prepare("SELECT * FROM employers").all().map(serializeEmployer);
  const byId = new Map(rows.map(e => [e.id, e]));
  // matchJobsToFilters calls emp(id).name unconditionally, so never hand it undefined.
  return id => byId.get(id) || { id, name: "" };
}

function liveJobs() {
  return db.prepare("SELECT * FROM jobs WHERE status = 'live' AND pending_owner_approval = 0").all().map(serializeJob);
}

function filtersFor(saved) {
  const s = serializeSavedSearch(saved);
  return { q: s.q || "", where: s.where || "", cats: s.cats || [], types: s.types || [],
    modes: s.modes || [], exps: s.exps || [], prov: s.prov || "", minPay: s.minPay || "" };
}

function jobLine(j) {
  const pay = j.lo && j.hi
    ? (j.lo === j.hi ? `$${j.lo}` : `$${j.lo}–$${j.hi}`) + (j.unit === "yr" ? "/yr" : j.unit === "hr" ? "/hr" : "")
    : "Pay not stated";
  return `• ${j.t} — ${j.city}, ${j.prov} — ${pay}\n  ${FRONTEND_URL}/jobs/${j.id}`;
}

/* Instant alerts: called right after a job is published. Only saved searches set to "instant"
   are considered; daily/weekly ones are picked up by runDigests() instead. */
export async function notifyInstantMatches(jobId) {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'live' AND pending_owner_approval = 0").get(jobId);
  if (!row) return { considered: 0, sent: 0 };
  const job = serializeJob(row);
  const emp = employerLookup();
  const searches = db.prepare("SELECT * FROM saved_searches WHERE alerts = 1 AND frequency = 'instant'").all();
  let sent = 0;
  for (const s of searches) {
    const hit = matchJobsToFilters([job], filtersFor(s), { expandQuery, emp });
    if (!hit.length) continue;
    const res = await sendCommercialMail({
      userId: s.user_id,
      subject: `New match: ${job.t} in ${job.city}`,
      body: [`A new job matches your saved search "${s.name || "Untitled search"}":`, "", jobLine(job), "",
        `See all matches: ${FRONTEND_URL}/saved-searches`].join("\n"),
    });
    if (res.sent) sent++;
    db.prepare("UPDATE saved_searches SET last_run = datetime('now') WHERE id = ?").run(s.id);
  }
  return { considered: searches.length, sent };
}

/* Daily/weekly digests. Deliberately driven by an explicit call (an admin action today, a cron
   later) rather than a timer inside the web process, and each search's own last_run is what
   decides whether it is due - so calling this twice in a day sends one digest, not two. */
export async function runDigests(now = Date.now()) {
  const emp = employerLookup();
  const jobs = liveJobs();
  const searches = db.prepare("SELECT * FROM saved_searches WHERE alerts = 1 AND frequency IN ('daily','weekly')").all();
  let sent = 0, due = 0;
  for (const s of searches) {
    const intervalMs = s.frequency === "daily" ? 86400000 : 7 * 86400000;
    const last = s.last_run ? new Date(s.last_run.replace(" ", "T") + "Z").getTime() : 0;
    if (now - last < intervalMs) continue;
    due++;
    const matches = matchJobsToFilters(jobs, filtersFor(s), { expandQuery, emp });
    // Only mail when there is something to say - an empty digest is exactly the kind of message
    // that gets a sender marked as spam, and CASL compliance does not make it welcome.
    const fresh = matches.filter(j => (now - (j.createdAt || 0)) < intervalMs);
    if (fresh.length) {
      const res = await sendCommercialMail({
        userId: s.user_id,
        subject: `${fresh.length} new ${fresh.length === 1 ? "match" : "matches"} for "${s.name || "your saved search"}"`,
        body: [`Your ${s.frequency} job alert for "${s.name || "Untitled search"}":`, "",
          ...fresh.slice(0, 10).map(jobLine), "",
          fresh.length > 10 ? `…and ${fresh.length - 10} more.` : "",
          `See all matches: ${FRONTEND_URL}/saved-searches`].filter(Boolean).join("\n"),
      });
      if (res.sent) sent++;
    }
    db.prepare("UPDATE saved_searches SET last_run = datetime('now'), last_count = ? WHERE id = ?").run(matches.length, s.id);
  }
  return { searches: searches.length, due, sent };
}
