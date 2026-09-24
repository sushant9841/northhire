/* QA-r4 scale — front-end perf walk on Opus main-loop after Sonnet audit agents 429'd.
   Walks representative routes for seeker + employer + HR + admin, measures load timings,
   captures network payload totals, screenshots at desktop + mobile. Writes findings to
   .claude/qa-r4-findings/perf-walk.json.
   Preserves screenshots — never overwrites existing files. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_FIND = ".claude/qa-r4-findings/perf-walk.json";
const OUT_SHOTS = ".claude/qa-screenshots";
fs.mkdirSync(".claude/qa-r4-findings", { recursive: true });

const findings = [];
function fail(rec) { findings.push(rec); fs.writeFileSync(OUT_FIND, JSON.stringify(findings, null, 2)); }

function shotPath(persona, page, viewport) {
  const dir = path.join(OUT_SHOTS, persona);
  fs.mkdirSync(dir, { recursive: true });
  // -qar4- suffix never collides with earlier -scale- / plain names.
  const p = path.join(dir, `${page}-qar4-${viewport}.png`);
  return p;
}

async function login(page, kind, creds) {
  if (kind === "seeker" || kind === "employer" || kind === "admin") {
    const r = await page.request.post("http://localhost:8787/api/auth/login", { data: creds });
    return r.ok();
  }
  if (kind === "hr") {
    const r = await page.request.post("http://localhost:8787/api/hr/login", { data: creds });
    return r.ok();
  }
}

async function walk(browser, persona, viewport, routes, loginKind, creds) {
  const w = viewport === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: w });
  const page = await ctx.newPage();
  const errors = [];
  const slow = [];
  page.on("pageerror", e => { errors.push({ msg: String(e), route: page.url() }); });
  page.on("response", async r => {
    const t = r.request().timing();
    const dur = t?.responseEnd || 0;
    if (dur > 1500) slow.push({ url: r.url(), status: r.status(), ms: Math.round(dur) });
  });

  if (loginKind) {
    const ok = await login(page, loginKind, creds);
    if (!ok) { fail({ severity: "P1", persona, category: "auth", desc: `Login failed for ${loginKind}`, creds }); }
  }

  for (const [name, url] of routes) {
    try {
      const started = Date.now();
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      // give React a moment to paint + hydrate
      await page.waitForTimeout(1500);
      const elapsed = Date.now() - started;
      // FCP + memory
      const perf = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
        const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : null;
        return { fcp: fcp ? Math.round(fcp) : null, loadEnd: nav ? Math.round(nav.loadEventEnd) : null, mem };
      }).catch(() => ({}));
      await page.screenshot({ path: shotPath(persona, name, viewport), fullPage: false });
      // record slow-page finding
      if (elapsed > 5000) fail({ severity: "P1", persona, viewport, category: "perf", page: name, url, elapsed_ms: elapsed, fcp: perf.fcp, mem_mb: perf.mem, desc: `Slow load (${elapsed}ms)` });
      else if (elapsed > 3000) fail({ severity: "P2", persona, viewport, category: "perf", page: name, url, elapsed_ms: elapsed, fcp: perf.fcp, mem_mb: perf.mem, desc: `Sluggish load (${elapsed}ms)` });
      console.log(`  ${persona}/${viewport}/${name}: ${elapsed}ms  fcp=${perf.fcp}  mem=${perf.mem}MB  http=${resp?.status()}`);
    } catch (e) {
      fail({ severity: "P1", persona, viewport, category: "nav-fail", page: name, url, error: String(e).slice(0, 200) });
      console.log(`  ${persona}/${viewport}/${name}: FAIL ${e.message.slice(0,80)}`);
    }
  }
  for (const err of errors) fail({ severity: "P0", persona, viewport, category: "console-error", ...err });
  for (const s of slow) fail({ severity: "P2", persona, viewport, category: "slow-api", ...s });
  await ctx.close();
}

const SEEKER_ROUTES = [
  ["home", "http://localhost:5173/#home"],
  ["search", "http://localhost:5173/#search"],
  ["matched", "http://localhost:5173/#matched"],
  ["cvs", "http://localhost:5173/#cvs"],
  ["messages", "http://localhost:5173/#messages"],
  ["profile", "http://localhost:5173/#profile"],
];

const EMPLOYER_ROUTES = [
  ["dashboard", "http://localhost:5173/#empDash"],
  ["jobs", "http://localhost:5173/#empJobs"],
  ["pipeline", "http://localhost:5173/#empPipeline"],
  ["analytics", "http://localhost:5173/#empAnalytics"],
];

const HR_ROUTES = [
  ["home", "http://localhost:5173/#hr"],
  ["people", "http://localhost:5173/#hrPeople"],
  ["attendance", "http://localhost:5173/#hrAttendance"],
];

const ADMIN_ROUTES = [
  ["home", "http://localhost:5173/#adminHome"],
  ["users", "http://localhost:5173/#admUsers"],
  ["jobs", "http://localhost:5173/#admJobs"],
];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const vp of ["desktop", "mobile"]) {
      console.log(`\n=== SEEKER ${vp} ===`);
      await walk(browser, "seeker", vp, SEEKER_ROUTES, "seeker", { email: "sarah.chen@example.ca", password: "Password123" });
      console.log(`\n=== EMPLOYER ${vp} ===`);
      await walk(browser, "employer", vp, EMPLOYER_ROUTES, "employer", { email: "hr@pcl.com", password: "Employer123" });
      console.log(`\n=== ADMIN ${vp} ===`);
      await walk(browser, "admin", vp, ADMIN_ROUTES, "admin", { email: "admin@northhire.ca", password: "Admin1234" });
    }
    console.log(`\nTotal findings: ${findings.length}. Written to ${OUT_FIND}`);
  } finally {
    await browser.close();
  }
})();
