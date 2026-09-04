// Populates the SQLite database from the same seed data the frontend prototype ships with,
// so the real backend starts with the identical jobs/employers/people/applications a user
// already sees in the client-only version - not a mismatched second dataset.
import { db, nextId } from "./db.js";
import { hashPassword } from "./auth.js";
import { SEED_EMPLOYERS } from "../src/store/seed/employers.js";
import { SEED_JOBS } from "../src/store/seed/jobs.js";
import { SEED_PEOPLE } from "../src/store/seed/people.js";
import { SEED_APPS } from "../src/store/seed/applications.js";

const already = db.prepare("SELECT COUNT(*) AS n FROM employers").get();
if (already.n > 0) {
  console.log(`Already seeded (${already.n} employers exist) - skipping. Delete server/data/northhire.sqlite to reseed from scratch.`);
  process.exit(0);
}

const insertEmployer = db.prepare(
  `INSERT INTO employers (id, name, mark, a, b, industry, city, prov, size, rating, verified, about, founded, site, plan)
   VALUES (@id,@name,@mark,@a,@b,@industry,@city,@prov,@size,@rating,@verified,@about,@founded,@site,@plan)`
);
for (const e of SEED_EMPLOYERS) {
  insertEmployer.run({
    id: e.id, name: e.name, mark: e.mark || "hex", a: e.a || "#005CCC", b: e.b || "#FFFFFF",
    industry: e.industry || null, city: e.city || null, prov: e.prov || null, size: e.size || null,
    rating: e.rating || 0, verified: e.verified ? 1 : 0, about: e.about || null,
    founded: e.founded || null, site: e.site || null, plan: e.plan || "Free",
  });
}
console.log(`Seeded ${SEED_EMPLOYERS.length} employers.`);

const insertEmployerUser = db.prepare(
  `INSERT INTO users (id, role, name, email, password_hash, password_salt, employer_id)
   VALUES (@id,'employer',@name,@email,@password_hash,@password_salt,@employer_id)`
);
const DEMO_PASSWORD_EMPLOYER = "employer2026";
let employerUserCount = 0;
for (const e of SEED_EMPLOYERS) {
  if (!e.owner) continue;
  const { hash, salt } = hashPassword(DEMO_PASSWORD_EMPLOYER);
  insertEmployerUser.run({
    id: nextId("eu", "users"), name: `${e.name} HR`, email: e.owner,
    password_hash: hash, password_salt: salt, employer_id: e.id,
  });
  employerUserCount++;
}
console.log(`Seeded ${employerUserCount} employer accounts (demo password for all: "${DEMO_PASSWORD_EMPLOYER}").`);

// Real deadline dates derived from the frontend's day-count (`dl`) relative to today, and a
// real created_at derived from its "N days ago" posted string, so the served data behaves
// like actual records instead of text that would otherwise never advance.
const parseDaysAgo = s => {
  const m = /(\d+)\s*day/.exec(s || "");
  return m ? Number(m[1]) : 0;
};
const insertJob = db.prepare(
  `INSERT INTO jobs (id, employer_id, title, cat, city, prov, type, mode, pay_lo, pay_hi, pay_unit,
     vacancies, experience, education, deadline_date, views, urgent, featured, skills_json, perks_json,
     description, duties_json, requirements_json, how_to_apply, status, flagged, created_at)
   VALUES (@id,@employer_id,@title,@cat,@city,@prov,@type,@mode,@pay_lo,@pay_hi,@pay_unit,
     @vacancies,@experience,@education,@deadline_date,@views,@urgent,@featured,@skills_json,@perks_json,
     @description,@duties_json,@requirements_json,@how_to_apply,@status,@flagged,@created_at)`
);
for (const j of SEED_JOBS) {
  const postedDaysAgo = parseDaysAgo(j.posted);
  const createdAt = new Date(Date.now() - postedDaysAgo * 86400000).toISOString();
  const deadlineDate = new Date(Date.now() + (j.dl || 14) * 86400000).toISOString().slice(0, 10);
  insertJob.run({
    id: j.id, employer_id: j.e, title: j.t, cat: j.cat || null, city: j.city || null, prov: j.prov || null,
    type: j.type || null, mode: j.mode || null, pay_lo: j.lo ?? null, pay_hi: j.hi ?? null, pay_unit: j.unit || null,
    vacancies: j.vac || 1, experience: j.exp || null, education: j.edu || null, deadline_date: deadlineDate,
    views: j.views || 0, urgent: j.urgent ? 1 : 0, featured: j.featured ? 1 : 0,
    skills_json: JSON.stringify(j.skills || []), perks_json: JSON.stringify(j.perks || []),
    description: j.desc || "", duties_json: JSON.stringify(j.duties || []), requirements_json: JSON.stringify(j.reqs || []),
    how_to_apply: j.how || null, status: j.status || "live", flagged: j.flagged ? 1 : 0, created_at: createdAt,
  });
}
console.log(`Seeded ${SEED_JOBS.length} jobs.`);

const insertUser = db.prepare(
  `INSERT INTO users (id, role, name, email, password_hash, password_salt, seed, title, city, prov, years,
     phone, skills_json, edu, eligible, pay_min, pay_unit, types_json, modes_json, complete)
   VALUES (@id,'seeker',@name,@email,@password_hash,@password_salt,@seed,@title,@city,@prov,@years,
     @phone,@skills_json,@edu,@eligible,@pay_min,@pay_unit,@types_json,@modes_json,@complete)`
);
const DEMO_PASSWORD = "northhire2026";
for (const p of SEED_PEOPLE) {
  const { hash, salt } = hashPassword(DEMO_PASSWORD);
  insertUser.run({
    id: p.id, name: p.name, email: p.email, password_hash: hash, password_salt: salt, seed: p.seed || 0,
    title: p.title || null, city: p.city || null, prov: p.prov || null, years: p.years || 0, phone: p.phone || null,
    skills_json: JSON.stringify(p.skills || []), edu: p.edu || null, eligible: p.eligible || null,
    pay_min: p.payMin ?? null, pay_unit: p.payUnit || null, types_json: JSON.stringify(p.types || []),
    modes_json: JSON.stringify(p.modes || []), complete: p.complete || 0,
  });
}
console.log(`Seeded ${SEED_PEOPLE.length} seeker accounts (demo password for all: "${DEMO_PASSWORD}").`);

const insertApp = db.prepare(
  `INSERT INTO applications (id, job_id, user_id, stage, note, availability, pay_expectation, cover_letter, created_at)
   VALUES (@id,@job_id,@user_id,@stage,@note,@availability,@pay_expectation,@cover_letter,@created_at)`
);
for (const a of SEED_APPS) {
  const createdAt = new Date(Date.now() - parseDaysAgo(a.at) * 86400000).toISOString();
  insertApp.run({
    id: a.id, job_id: a.job, user_id: a.user, stage: a.stage, note: a.note || null,
    availability: a.avail || null, pay_expectation: a.expect || null, cover_letter: a.letter || null,
    created_at: createdAt,
  });
}
console.log(`Seeded ${SEED_APPS.length} applications.`);

const ADMIN_PASSWORD = "Admin1234";
const { hash: adminHash, salt: adminSalt } = hashPassword(ADMIN_PASSWORD);
db.prepare(
  `INSERT INTO users (id, role, name, email, password_hash, password_salt) VALUES ('adm1','admin','Platform Admin','admin@northhire.ca',?,?)`
).run(adminHash, adminSalt);
console.log(`Seeded 1 admin account (admin@northhire.ca / "${ADMIN_PASSWORD}").`);

console.log("Done.");
