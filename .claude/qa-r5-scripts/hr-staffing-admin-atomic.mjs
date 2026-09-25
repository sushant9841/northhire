/* QA-r5 atomic audit — HR + Staffing + Admin surfaces, all personas, 2 viewports.
   FULL-PAGE screenshots only. Preserves existing files.
   Findings written incrementally to hr-staffing-admin-atomic.json. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE   = "http://localhost:5173";
const OUTDIR = ".claude/qa-screenshots";
const FIND   = ".claude/qa-r5-findings/hr-staffing-admin-atomic.json";
fs.mkdirSync(".claude/qa-r5-findings", { recursive: true });

/* HR routes (path key -> URL). Kiosk is unauth; org-chart lives inside directory. */
const HR_ROUTES = [
  ["dashboard",   "/hr/dashboard"],
  ["directory",   "/hr/directory"],
  ["people",      "/hr/people"],
  ["profile",     "/hr/profile"],
  ["attendance",  "/hr/attendance"],
  ["leave",       "/hr/leave"],
  ["tasks",       "/hr/tasks"],
  ["calendar",    "/hr/calendar"],
  ["chat",        "/hr/chat"],
  ["trainings",   "/hr/trainings"],
  ["badges",      "/hr/badges"],
  ["expenses",    "/hr/expenses"],
  ["hiring",      "/hr/hiring"],
  ["invoices",    "/hr/invoices"],
  ["payroll",     "/hr/payroll"],
  ["reports",     "/hr/reports"],
  ["policies",    "/hr/policies"],
  ["roster",      "/hr/roster"],
  ["perf-reviews","/hr/perf-reviews"],
  ["integrations","/hr/integrations"],
  ["settings",    "/hr/settings"],
];
const STAFFING_ROUTES = [
  ["dashboard",   "/staffing/dashboard"],
  ["job-orders",  "/staffing/job-orders"],
  ["bench",       "/staffing/bench"],
  ["assignments", "/staffing/assignments"],
  ["timesheets",  "/staffing/timesheets"],
  ["payroll",     "/staffing/payroll"],
  ["invoicing",   "/staffing/invoicing"],
  ["placements",  "/staffing/placements"],
  ["clients",     "/staffing/clients"],
  ["workers",     "/staffing/workers"],
  ["margins",     "/staffing/margins"],
  ["compliance",  "/staffing/compliance"],
  ["branches",    "/staffing/branches"],
  ["settings",    "/staffing/settings"],
];
const ADMIN_ROUTES = [
  ["home",       "/admin"],
  ["stats",      "/admin/stats"],
  ["users",      "/admin/users"],
  ["employers",  "/admin/employers"],
  ["jobs",       "/admin/jobs"],
  ["articles",   "/admin/content/articles"],
  ["trainings",  "/admin/content/trainings"],
  ["settings",   "/admin/settings"],
  ["config",     "/admin/config"],
  ["admins",     "/admin/admins"],
  ["log",        "/admin/log"],
  ["design-system","/admin/design-system"],
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile",  { width: 390,  height: 844  }],
];

const HR_PERSONAS = [
  { key: "rachel", loginId: "rachel.martel", pw: "pcl2026", allRoutes: true  },
  { key: "priya",  loginId: "priya.r",       pw: "pcl2026", allRoutes: false },
  { key: "linda",  loginId: "linda.o",       pw: "pcl2026", allRoutes: false },
  { key: "isaac",  loginId: "isaac.c",       pw: "pcl2026", allRoutes: false },
  { key: "daniel", loginId: "daniel.k",      pw: "pcl2026", allRoutes: false },
];
/* Non-owner personas hit a minimal subset so we catch role-scoping bugs cheaply. */
const HR_ROLE_SUBSET = ["dashboard","directory","payroll","invoices","expenses","perf-reviews","chat","settings"];

const findings = [];
function addFinding(f) {
  findings.push({ id: `A5-${String(findings.length + 1).padStart(3,"0")}`, ts: new Date().toISOString(), ...f });
  fs.writeFileSync(FIND, JSON.stringify(findings, null, 2));
}

function shotPath(persona, label, vp) {
  const dir = path.join(OUTDIR, persona);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `audit-r5-${label}-${vp}.png`);
}

async function grab(page, persona, label, vp, consoleErrs) {
  const p = shotPath(persona, label, vp);
  if (fs.existsSync(p)) { console.log(`= exists ${persona}/${label}/${vp}`); return; }
  try {
    await page.waitForTimeout(1400);
    await page.screenshot({ path: p, fullPage: true });
    if (consoleErrs.length) {
      addFinding({ persona, viewport: vp, route: label, severity: "P2",
        kind: "console-error", detail: consoleErrs.slice(0,5).join(" | ").slice(0,600) });
      consoleErrs.length = 0;
    }
    console.log(`+ ${persona}/${label}/${vp}`);
  } catch (e) {
    addFinding({ persona, viewport: vp, route: label, severity: "P1", kind: "screenshot-failed", detail: e.message.slice(0,200) });
  }
}

/* ── Content probes (run once per page after screenshot) ─────────── */
async function probePage(page, persona, label, vp) {
  try {
    const text = await page.evaluate(() => document.body.innerText || "");
    const html = await page.content();

    // Money formatting: raw floats like "12345.6789" without $ or comma → unformatted
    const rawFloat = text.match(/(?<!\$)(?<![\d,])\d{4,}\.\d{2,}(?!\s*%)/g);
    if (rawFloat && rawFloat.length && !/salary|kiosk|log/i.test(label)) {
      addFinding({ persona, viewport: vp, route: label, severity: "P2",
        kind: "unformatted-number", detail: `raw floats: ${rawFloat.slice(0,3).join(", ")}` });
    }
    // Missing currency where "salary"/"pay"/"total" nearby
    if (/\bNaN\b/.test(text)) {
      addFinding({ persona, viewport: vp, route: label, severity: "P1",
        kind: "NaN-in-ui", detail: "NaN literal rendered" });
    }
    if (/\$0\b(?!\.)/g.test(text) && /(payroll|invoice|expense|margin)/i.test(label)) {
      const c = (text.match(/\$0\b/g) || []).length;
      if (c >= 3) addFinding({ persona, viewport: vp, route: label, severity: "P2",
        kind: "many-zero-dollars", detail: `${c} × "$0" in a money view — placeholder?` });
    }
    // Empty state / blank page detection
    if (text.replace(/\s+/g," ").trim().length < 120) {
      addFinding({ persona, viewport: vp, route: label, severity: "P1",
        kind: "near-empty-page", detail: `body text ${text.trim().length} chars` });
    }
    // undefined / null leaks
    if (/\bundefined\b/.test(text) || /\[object Object\]/.test(text)) {
      addFinding({ persona, viewport: vp, route: label, severity: "P1",
        kind: "value-leak", detail: text.match(/(undefined|\[object Object\])/g)?.slice(0,3).join("|") });
    }
    // Missing translation keys (i18n miss shows the key like "hr.dashboard.title")
    const keys = text.match(/\b[a-z]+\.[a-zA-Z]+\.[a-zA-Z]+\b/g);
    if (keys) {
      const suspect = keys.filter(k => /^(hr|staff|adm|routeTitles|common|nav)\./.test(k));
      if (suspect.length) addFinding({ persona, viewport: vp, route: label, severity: "P1",
        kind: "i18n-key-leak", detail: suspect.slice(0,5).join(", ") });
    }
    // Salary column exposed to non-money role
    if (persona !== "rachel" && persona !== "isaac" && /\$\d{2,3},\d{3}/.test(text) && /(salary|Salary)/.test(text)) {
      addFinding({ persona, viewport: vp, route: label, severity: "P0",
        kind: "salary-exposed", detail: `salary-like $ + label visible to ${persona}` });
    }
    // Access-denied surfaced as a whole page for a role that shouldn't be blocked
    if (/access denied|forbidden|not authorized/i.test(text) && persona === "rachel") {
      addFinding({ persona, viewport: vp, route: label, severity: "P1",
        kind: "owner-blocked", detail: "owner Rachel got denied on route" });
    }
    // Redundant Post / Add CTAs?
    const ctaCount = (html.match(/>(\+ ?Add|Add new|New|Create|Post) /g) || []).length;
    if (ctaCount >= 5) addFinding({ persona, viewport: vp, route: label, severity: "P3",
      kind: "redundant-cta", detail: `${ctaCount} add/new/create buttons in one view` });

  } catch (e) {
    addFinding({ persona, viewport: vp, route: label, severity: "P3",
      kind: "probe-error", detail: e.message.slice(0,160) });
  }
}

/* ── Login helpers — go through the API so we don't fight brittle UI selectors.
     Playwright's context.request stores Set-Cookie on the browser context, and since
     both origins are `localhost` (same-site), the SameSite=Lax cookie ships on the
     browser's cross-origin fetches to :8787 just fine. ─────────── */
async function hrLoginApi(context, persona) {
  const r = await context.request.post("http://localhost:8787/api/hr/login", {
    data: { companyName: "PCL Construction", loginId: persona.loginId, password: persona.pw },
  });
  if (!r.ok()) throw new Error(`hr/login ${r.status()}`);
}
async function staffingLoginApi(context, persona) {
  const r = await context.request.post("http://localhost:8787/api/staffing/login", {
    data: { loginId: persona.loginId, password: persona.pw },
  });
  if (!r.ok()) throw new Error(`staffing/login ${r.status()}`);
}
async function adminLoginApi(context) {
  const r = await context.request.post("http://localhost:8787/api/auth/login", {
    data: { email: "admin@northhire.ca", password: "Admin1234" },
  });
  if (!r.ok()) throw new Error(`admin/login ${r.status()}`);
}

/* ── Runner ───────────────────────────────────────────────────── */
async function walkRoutes(browser, persona, routes, allowedSet) {
  for (const [vpName, vp] of VIEWPORTS) {
    // Fresh context per (persona,viewport) so cookies for that persona are isolated
    const context = await browser.newContext({ viewport: vp });
    try {
      if (persona.startsWith("hr-"))       await hrLoginApi(context, HR_PERSONAS.find(p=>`hr-${p.key}`===persona));
      else if (persona === "nadia")        await staffingLoginApi(context, { loginId:"nadia.singh", pw:"staff2026" });
      else if (persona === "admin")        await adminLoginApi(context);
    } catch (e) {
      addFinding({ persona, viewport: vpName, route: "login", severity: "P0",
        kind: "login-failed", detail: e.message.slice(0,220) });
      await context.close(); continue;
    }
    const page = await context.newPage();
    const consoleErrs = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text().slice(0,220)); });
    page.on("pageerror", (e) => consoleErrs.push("PAGEERROR " + e.message.slice(0,220)));
    try {
      // no-op body kept for parity with old try/catch
    } catch (e) {
      addFinding({ persona, viewport: vpName, route: "login", severity: "P0",
        kind: "login-failed", detail: e.message.slice(0,220) });
      await page.close(); continue;
    }
    for (const [label, url] of routes) {
      if (allowedSet && !allowedSet.has(label)) continue;
      try {
        await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 12000 });
      } catch (e) {
        addFinding({ persona, viewport: vpName, route: label, severity: "P1",
          kind: "nav-timeout", detail: e.message.slice(0,180) });
        continue;
      }
      // Land on the file-system persona key (drop hr- prefix)
      const personaDir = persona.startsWith("hr-") ? persona.slice(3) : persona;
      await grab(page, personaDir, label, vpName, consoleErrs);
      await probePage(page, personaDir, label, vpName);
    }
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const p of HR_PERSONAS) {
      const ctx = await browser.newContext();
      const allowed = p.allRoutes ? null : new Set(HR_ROLE_SUBSET);
      await walkRoutes(ctx, `hr-${p.key}`, HR_ROUTES, allowed);
      await ctx.close();
    }
    { const ctx = await browser.newContext();
      await walkRoutes(ctx, "nadia", STAFFING_ROUTES, null);
      await ctx.close(); }
    { const ctx = await browser.newContext();
      await walkRoutes(ctx, "admin", ADMIN_ROUTES, null);
      await ctx.close(); }
  } finally {
    await browser.close();
  }
  console.log(`\nFindings: ${findings.length}`);
  console.log(`Written  : ${FIND}`);
})();
