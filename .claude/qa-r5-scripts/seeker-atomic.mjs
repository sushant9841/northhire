/* QA-r5 atomic seeker audit — full-page screenshots + console/network telemetry.
   Does NOT overwrite existing screenshots — filenames prefixed audit-r5-*.
   Run: node .claude/qa-r5-scripts/seeker-atomic.mjs */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = ".claude/qa-screenshots/seeker";
const TELEMETRY = ".claude/qa-r5-findings/seeker-telemetry.json";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(TELEMETRY), { recursive: true });

const shotPath = (label, vp) => path.join(OUT, `audit-r5-${label}-${vp}.png`);

const API = "http://localhost:8787";
const APP = "http://localhost:5173";

async function seed() {
  const jobs = await (await fetch(`${API}/api/jobs?limit=6`)).json();
  const emps = await (await fetch(`${API}/api/employers?limit=3`)).json();
  const jobId = jobs.jobs.find(j => j.status === "live")?.id || jobs.jobs[0].id;
  const empId = emps.employers[0].id;
  return { jobId, empId };
}

async function loginSeeker(context) {
  // Login server-side then transplant cookies into browser context
  const r = await context.request.post(`${API}/api/auth/login`, {
    data: { email: "sarah.chen@example.ca", password: "Password123" },
  });
  if (!r.ok()) throw new Error("login failed " + r.status());
  const cvsResp = await context.request.get(`${API}/api/seeker/cvs`);
  let cvId = null;
  try { const j = await cvsResp.json(); cvId = j.cvs?.[0]?.id || null; } catch {}
  return { cvId };
}

const publicRoutes = [
  ["home", "/"],
  ["pricing", "/pricing"],
  ["employers-public", "/employers"],
  ["for-employers", "/for-employers"],
  ["how-it-works", "/how-it-works"],
  ["blogs", "/blogs"],
  ["trainings", "/trainings"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["accessibility", "/accessibility"],
  ["pipeda", "/pipeda"],
  ["login", "/login"],
  ["signup", "/signup"],
  ["forgot", "/forgot"],
];

const seekerStatic = [
  ["home-app", "/home"],
  ["search-empty", "/search"],
  ["search-query", "/search?q=engineer"],
  ["matched", "/matched"],
  ["saved", "/saved"],
  ["saved-searches", "/saved-searches"],
  ["status", "/status"],
  ["alerts", "/alerts"],
  ["messages", "/messages"],
  ["interviews", "/interviews"],
  ["profile", "/profile"],
  ["settings", "/settings"],
  ["cvs", "/cvs"],
  ["apply-done", "/apply-done"],
];

async function capture(context, label, vp, url) {
  const page = await context.newPage();
  const errors = [];
  const netFails = [];
  const longTasks = [];
  page.on("console", m => { if (m.type() === "error") errors.push({ label, vp, url, text: m.text().slice(0, 300) }); });
  page.on("pageerror", e => errors.push({ label, vp, url, text: `pageerror: ${e.message.slice(0, 300)}` }));
  page.on("response", async r => {
    const st = r.status();
    if (st >= 400) netFails.push({ label, vp, url, status: st, u: r.url().slice(0, 200) });
  });
  try {
    const t0 = Date.now();
    await page.goto(`${APP}${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1600);
    // scroll to trigger reveal-on-load / lazy content
    await page.evaluate(async () => {
      await new Promise(r => {
        let y = 0; const step = () => {
          window.scrollTo(0, y); y += 400;
          if (y < document.body.scrollHeight) requestAnimationFrame(step); else r();
        }; step();
      });
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const dur = Date.now() - t0;
    if (dur > 3000) longTasks.push({ label, vp, url, dur });
    await page.screenshot({ path: shotPath(label, vp), fullPage: true });
  } catch (e) {
    errors.push({ label, vp, url, text: `NAV FAIL: ${e.message.slice(0, 200)}` });
  }
  await page.close();
  return { errors, netFails, longTasks };
}

(async () => {
  const { jobId, empId } = await seed();
  console.log(`seed: job=${jobId} emp=${empId}`);
  const browser = await chromium.launch();
  const allTele = { errors: [], netFails: [], longTasks: [] };

  for (const vp of ["desktop", "mobile"]) {
    const viewport = vp === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
    // Public / auth — separate cold context
    const pubCtx = await browser.newContext({ viewport });
    for (const [label, url] of publicRoutes) {
      const r = await capture(pubCtx, label, vp, url);
      allTele.errors.push(...r.errors); allTele.netFails.push(...r.netFails); allTele.longTasks.push(...r.longTasks);
      console.log(`P ${label}/${vp}`);
    }
    await pubCtx.close();

    // Seeker logged-in context
    const seekCtx = await browser.newContext({ viewport });
    const { cvId } = await loginSeeker(seekCtx);
    console.log(`sarah cvId=${cvId}`);
    const seekerDynamic = [
      ...seekerStatic,
      ["cv-edit", cvId ? `/cv/edit/${cvId}` : "/cvs"],
      ["job-detail", `/jobs/${jobId}`],
      ["employer-detail", `/employer/${empId}`],
      ["apply1", `/apply1/${jobId}`],
      ["apply2", `/apply2/${jobId}`],
      ["apply3", `/apply3/${jobId}`],
    ];
    for (const [label, url] of seekerDynamic) {
      const r = await capture(seekCtx, label, vp, url);
      allTele.errors.push(...r.errors); allTele.netFails.push(...r.netFails); allTele.longTasks.push(...r.longTasks);
      console.log(`S ${label}/${vp}`);
    }
    await seekCtx.close();
  }

  fs.writeFileSync(TELEMETRY, JSON.stringify(allTele, null, 2));
  await browser.close();
  console.log(`\nerrors=${allTele.errors.length} netFails=${allTele.netFails.length} longTasks=${allTele.longTasks.length}`);
  console.log("Done.");
})();
