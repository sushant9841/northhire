/* Scale seed for QA-r4 load testing.
   Layers 100k+ synthetic records ON TOP of the demo seed. Skips if the DB already has scale
   rows so re-running is idempotent. Uses transactions + prepared statements for speed. */
import { db, nextId } from "./db.js";
import { hashPassword } from "./auth.js";
import crypto from "node:crypto";

const args = new Map(process.argv.slice(2).map(a => a.split("=")));
const TARGET = {
  seekers:     Number(args.get("--seekers")     || 100000),
  employers:   Number(args.get("--employers")   || 3000),
  jobs:        Number(args.get("--jobs")        || 15000),
  applications:Number(args.get("--apps")        || 300000),
  cvs:         Number(args.get("--cvs")         || 100000),
  hrEmployees: Number(args.get("--hrEmp")       || 5000),
  messages:    Number(args.get("--msgs")        || 50000),
  saved:       Number(args.get("--saved")       || 50000),
  interviews:  Number(args.get("--interviews")  || 5000),
  notifications:Number(args.get("--notifs")     || 20000),
};

// Sentinel: SCALE seed uses "scl_" id prefix
const already = db.prepare("SELECT COUNT(*) AS n FROM users WHERE id LIKE 'scl_%'").get().n;
if (already > 1000 && !args.has("--force")) {
  console.log(`Scale seed already present (${already} scale-users). Pass --force to rebuild.`);
  process.exit(0);
}

// With --force, wipe every scl_% row across all tables so a fresh run doesn't collide on ids.
if (args.has("--force")) {
  console.log("--force: wiping any existing scl_% rows...");
  db.exec("BEGIN");
  try {
    for (const t of ["notifications","interviews","messages","saved_searches","hr_employees","cvs","applications","jobs","users","employers"]) {
      const col = t === "notifications" ? "for_value" : "id";
      // for_value in notifications isn't prefixed — clear only rows whose id starts scl_.
      db.exec(`DELETE FROM ${t} WHERE id LIKE 'scl_%'`);
    }
    db.exec("COMMIT");
    console.log("  wiped.");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

console.log("Scale seed target:", TARGET);
console.log("(This can take 2-5 minutes for the default 100k+ target.)");

// node:sqlite has no .transaction() shim — hand-wrap for the 100×-faster batch commit.
function tx(fn) { db.exec("BEGIN"); try { fn(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } }

// Shared demo password for every scale account
const { hash: PW_HASH, salt: PW_SALT } = hashPassword("Scale2026");

const CATS = ["trades","hosp","health","tech","retail","transport","admin","finance","edu","manufacturing"];
const PROVS = ["ON","QC","BC","AB","MB","SK","NS","NB","NL","PE","YT","NT","NU"];
const CITIES_BY_PROV = { ON:["Toronto","Ottawa","Hamilton","Mississauga","London","Windsor"],
  QC:["Montreal","Quebec City","Laval","Sherbrooke","Gatineau"], BC:["Vancouver","Victoria","Surrey","Burnaby","Kelowna"],
  AB:["Calgary","Edmonton","Red Deer"], MB:["Winnipeg"], SK:["Regina","Saskatoon"],
  NS:["Halifax"], NB:["Fredericton"], NL:["St John's"], PE:["Charlottetown"], YT:["Whitehorse"], NT:["Yellowknife"], NU:["Iqaluit"] };
const INDUSTRIES = ["Construction","Retail","Hospitality","Healthcare","Manufacturing","Logistics","Technology","Finance","Education","Energy"];
const JOB_TITLES = ["Warehouse Associate","Line Cook","Registered Nurse","Software Engineer","Sales Associate","Truck Driver","Administrative Assistant","Accountant","Teaching Assistant","Machine Operator","Electrician","Plumber","Carpenter","Server","Bartender","Store Manager","Data Analyst","Marketing Coordinator","HR Specialist","Project Manager"];
const FIRST_NAMES = ["Alex","Sam","Jordan","Taylor","Casey","Riley","Morgan","Drew","Blake","Cameron","Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella","William","Aiden","Mia","James","Charlotte","Benjamin","Amelia","Lucas","Harper","Henry","Evelyn"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson"];

function rand(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[rand(arr.length)]; }
function makeName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }

function progress(label, n, total) {
  if (n % Math.max(1, Math.floor(total / 20)) === 0 || n === total) {
    process.stdout.write(`\r  ${label}: ${n}/${total}  `);
  }
}

// ─── Employers ─────────────────────────────────────────────────────────────
console.log("Seeding employers...");
const insEmp = db.prepare(
  `INSERT INTO employers (id, name, industry, city, prov, size, rating, verified, hold, about, founded, plan, created_at)
   VALUES (?,?,?,?,?,?,?,?,0,?,?,?,datetime('now'))`
);
const employerIds = [];
tx(() => {
  for (let i = 0; i < TARGET.employers; i++) {
    const id = `scl_e_${i.toString(36)}`;
    const prov = pick(PROVS);
    const city = pick(CITIES_BY_PROV[prov]);
    const plan = i % 100 === 0 ? "Enterprise" : i % 10 === 0 ? "Growth" : "Free";
    insEmp.run(id, `${pick(INDUSTRIES)} Co ${i}`, pick(INDUSTRIES), city, prov,
      pick(["1-10","11-50","51-200","201-500","500+"]), Math.random() * 2 + 3, i % 3 === 0 ? 1 : 0,
      `Synthetic scale employer #${i}.`, 1970 + rand(56), plan);
    employerIds.push(id);
    progress("employers", i + 1, TARGET.employers);
  }
});
console.log();

// ─── Seekers ───────────────────────────────────────────────────────────────
console.log("Seeding seeker users...");
const insUser = db.prepare(
  `INSERT INTO users (id, role, name, email, password_hash, password_salt, seed, title, cat, city, prov, years, phone, skills_json, complete, joined, created_at)
   VALUES (?, 'seeker', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`
);
const seekerIds = [];
tx(() => {
  for (let i = 0; i < TARGET.seekers; i++) {
    const id = `scl_u_${i.toString(36)}`;
    const prov = pick(PROVS);
    const city = pick(CITIES_BY_PROV[prov]);
    insUser.run(id, makeName(), `scale.seeker.${i}@example.ca`, PW_HASH, PW_SALT, rand(11),
      pick(JOB_TITLES), pick(CATS), city, prov, rand(20),
      `${prov === "QC" ? "514" : prov === "BC" ? "604" : "416"} 555 ${(rand(9000) + 1000)}`,
      JSON.stringify([pick(["Red Seal","Excel","AutoCAD","Java","Python","Class 1","WHMIS","First Aid"])]),
      new Date(Date.now() - rand(1000) * 86400000).toISOString().slice(0, 10));
    seekerIds.push(id);
    progress("seekers", i + 1, TARGET.seekers);
  }
});
console.log();

// ─── Jobs ──────────────────────────────────────────────────────────────────
console.log("Seeding jobs...");
const insJob = db.prepare(
  `INSERT INTO jobs (id, employer_id, title, cat, city, prov, type, mode, pay_lo, pay_hi, pay_unit,
    vacancies, experience, education, deadline_date, views, urgent, featured,
    skills_json, perks_json, description, duties_json, requirements_json, how_to_apply,
    screening_questions_json, ai_screening, vacancy_confirmed, status, flagged, hiring_type, created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1,?,0,'direct',datetime('now'))`
);
const jobIds = [];
tx(() => {
  for (let i = 0; i < TARGET.jobs; i++) {
    const id = `scl_j_${i.toString(36)}`;
    const emp = pick(employerIds);
    const prov = pick(PROVS);
    const city = pick(CITIES_BY_PROV[prov]);
    const payLo = 18 + rand(60);
    const status = i % 20 === 0 ? "paused" : i % 50 === 0 ? "review" : i % 100 === 0 ? "closed" : "live";
    insJob.run(id, emp, `${pick(JOB_TITLES)} — Position ${i}`, pick(CATS), city, prov,
      pick(["Full Time","Part Time","Contract","Casual"]),
      pick(["On-site","Hybrid","Remote"]),
      payLo, payLo + 5 + rand(20), pick(["hr","yr"]),
      1 + rand(4), pick(["Entry","2+ years","5+ years","Senior"]),
      pick(["High school","Diploma","Bachelor's","No formal education required"]),
      new Date(Date.now() + rand(90) * 86400000).toISOString().slice(0, 10),
      rand(500), i % 15 === 0 ? 1 : 0, i % 30 === 0 ? 1 : 0,
      JSON.stringify([pick(["Red Seal","Excel","Class 1"]), pick(["Team lead","Bilingual","Night shift OK"])]),
      JSON.stringify([pick(["Health benefits","RRSP match","Paid time off"])]),
      `Scale seed job #${i}. Verify the platform handles this listing under load.`,
      JSON.stringify(["Duty A", "Duty B"]), JSON.stringify(["Requirement A"]),
      "Apply through NorthHire.", JSON.stringify([]), status);
    jobIds.push(id);
    progress("jobs", i + 1, TARGET.jobs);
  }
});
console.log();

// ─── CVs ───────────────────────────────────────────────────────────────────
console.log("Seeding CVs...");
const insCv = db.prepare(
  `INSERT INTO cvs (id, user_id, name, template, name0, title, email, phone, city, prov, summary, updated_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime('now'))`
);
// Batch-fetch seeker basics once instead of per-CV DB roundtrip (3-5× speedup on 100k)
const seekerBasics = new Map();
for (const s of db.prepare("SELECT id, name, email, phone, city, prov, title FROM users WHERE id LIKE 'scl_u_%'").iterate()) {
  seekerBasics.set(s.id, s);
}
tx(() => {
  for (let i = 0; i < TARGET.cvs; i++) {
    const id = `scl_c_${i.toString(36)}`;
    const user = seekerIds[i % seekerIds.length];
    const s = seekerBasics.get(user);
    if (!s) { progress("cvs", i + 1, TARGET.cvs); continue; }
    insCv.run(id, user, `${s.title} CV`, pick(["classic","modern","concise"]),
      s.name, s.title, s.email, s.phone, s.city, s.prov,
      "Motivated professional with proven track record.");
    progress("cvs", i + 1, TARGET.cvs);
  }
});
console.log();

// ─── Applications ──────────────────────────────────────────────────────────
console.log("Seeding applications (this is the big one)...");
const insApp = db.prepare(
  `INSERT OR IGNORE INTO applications (id, user_id, job_id, stage, cv_id, note, source, created_at)
   VALUES (?,?,?,?,?,?, 'direct', datetime('now', ?))`
);
const STAGES = ["applied","screening","interview","offer","hired","rejected","withdrawn"];
tx(() => {
  for (let i = 0; i < TARGET.applications; i++) {
    const id = `scl_a_${i.toString(36)}`;
    const user = seekerIds[rand(seekerIds.length)];
    const job = jobIds[rand(jobIds.length)];
    const stage = pick(STAGES);
    insApp.run(id, user, job, stage, null, "", `${-rand(180)} days`);
    progress("apps", i + 1, TARGET.applications);
  }
});
console.log();

// ─── Saved jobs ────────────────────────────────────────────────────────────
console.log("Seeding saved jobs...");
const insSaved = db.prepare(
  `INSERT OR IGNORE INTO saved_searches (id, user_id, name, q, where_text, cats_json, prov, min_pay, alerts, frequency, created_at)
   VALUES (?,?,?,?,?,?,?,?, 1, 'weekly', datetime('now'))`
);
tx(() => {
  for (let i = 0; i < TARGET.saved; i++) {
    const id = `scl_ss_${i.toString(36)}`;
    const user = seekerIds[rand(seekerIds.length)];
    const prov = pick(PROVS);
    insSaved.run(id, user, `Saved search #${i}`, pick(JOB_TITLES),
      pick(CITIES_BY_PROV[prov]), JSON.stringify([pick(CATS)]), prov, String(rand(60)));
    progress("saved", i + 1, TARGET.saved);
  }
});
console.log();

// ─── HR employees (needs an Enterprise company) ────────────────────────────
console.log("Seeding HR employees...");
const enterpriseEmps = employerIds.filter((_, i) => i % 100 === 0).slice(0, 20);
const insHr = db.prepare(
  `INSERT INTO hr_employees (id, company_id, name, email, password_hash, password_salt, role, dept, title, hired, seed, salary, pay_type, status)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'active')`
);
const perCompany = Math.floor(TARGET.hrEmployees / Math.max(1, enterpriseEmps.length));
tx(() => {
  let idx = 0;
  for (const co of enterpriseEmps) {
    for (let i = 0; i < perCompany; i++, idx++) {
      const id = `scl_he_${idx.toString(36)}`;
      const role = i === 0 ? "owner" : i < 3 ? "admin" : i < 10 ? "hr" : i < 15 ? "finance" : "employee";
      insHr.run(id, co, makeName(), `scale.hr.${idx}@ent${co}.com`, PW_HASH, PW_SALT, role,
        pick(["Engineering","Sales","Operations","Finance","People"]),
        pick(JOB_TITLES), new Date(Date.now() - rand(3000) * 86400000).toISOString().slice(0, 10),
        rand(11), 50000 + rand(150000), "salary");
      progress("hrEmp", idx + 1, TARGET.hrEmployees);
    }
  }
});
console.log();

// ─── Messages ──────────────────────────────────────────────────────────────
console.log("Seeding messages...");
const insMsg = db.prepare(
  `INSERT INTO messages (id, from_user_id, to_user_id, job_id, text, read, created_at)
   VALUES (?,?,?,?,?, 0, datetime('now', ?))`
);
tx(() => {
  for (let i = 0; i < TARGET.messages; i++) {
    const id = `scl_m_${i.toString(36)}`;
    const from = seekerIds[rand(seekerIds.length)];
    const to = seekerIds[rand(seekerIds.length)];
    if (from === to) { progress("msgs", i + 1, TARGET.messages); continue; }
    insMsg.run(id, from, to, null, `Scale message #${i}: quick note about role.`, `${-rand(60)} days`);
    progress("msgs", i + 1, TARGET.messages);
  }
});
console.log();

// ─── Interviews ────────────────────────────────────────────────────────────
console.log("Seeding interviews...");
const insInt = db.prepare(
  `INSERT INTO interviews (id, application_id, candidate_id, job_id, employer_id, when_text, mode, notes, status, created_at)
   VALUES (?,?,?,?,?,?,?,?, 'scheduled', datetime('now'))`
);
const appRows = db.prepare(
  `SELECT a.id, a.user_id, a.job_id, j.employer_id
     FROM applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.id LIKE 'scl_%' LIMIT ?`
).all(TARGET.interviews);
tx(() => {
  for (let i = 0; i < appRows.length; i++) {
    const id = `scl_iv_${i.toString(36)}`;
    const a = appRows[i];
    insInt.run(id, a.id, a.user_id, a.job_id, a.employer_id,
      new Date(Date.now() + rand(30) * 86400000).toISOString().slice(0, 16).replace("T", " "),
      pick(["Zoom","In person","Phone"]), `Scale interview ${i}.`);
    progress("interviews", i + 1, appRows.length);
  }
});
console.log();

// ─── Notifications ─────────────────────────────────────────────────────────
console.log("Seeding notifications...");
const insNotif = db.prepare(
  `INSERT INTO notifications (id, for_value, icon, title, body, link, read, created_at)
   VALUES (?,?,?,?,?,?, 0, datetime('now', ?))`
);
tx(() => {
  for (let i = 0; i < TARGET.notifications; i++) {
    const id = `scl_n_${i.toString(36)}`;
    const user = seekerIds[rand(seekerIds.length)];
    insNotif.run(id, user, pick(["bell","check","alert","sparkle"]),
      `Scale notification #${i}`, `Body text ${i}.`, "home", `${-rand(60)} days`);
    progress("notifs", i + 1, TARGET.notifications);
  }
});
console.log();

// ─── Summary ───────────────────────────────────────────────────────────────
console.log("\nFinal row counts:");
for (const tbl of ["users","employers","jobs","applications","cvs","hr_employees","messages","saved_searches","interviews","notifications"]) {
  const n = db.prepare(`SELECT COUNT(*) AS n FROM ${tbl}`).get().n;
  console.log(`  ${tbl}: ${n.toLocaleString()}`);
}
console.log("\nScale seed done.");
