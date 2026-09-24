import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:5173";
const OUT_SHOTS = "D:/NorthHire-spa/.claude/qa-screenshots/employer";
const OUT_FINDINGS = "D:/NorthHire-spa/.claude/qa-r3-findings/employer.json";
const OUT_CONSOLE = "D:/NorthHire-spa/.claude/qa-r3-findings/employer-console.log";

fs.mkdirSync(OUT_SHOTS, { recursive: true });
fs.mkdirSync("D:/NorthHire-spa/.claude/qa-r3-findings", { recursive: true });

const findings = [];
const consoleLog = [];
let findingId = 1;

function addFinding(f) {
  findings.push({ id: `EMP-${String(findingId++).padStart(3, "0")}`, severity: f.severity, page: f.page, title: f.title, detail: f.detail, repro: f.repro || null });
  fs.writeFileSync(OUT_FINDINGS, JSON.stringify(findings, null, 2));
}
function logLine(s) {
  console.log(s);
  consoleLog.push(s);
  fs.writeFileSync(OUT_CONSOLE, consoleLog.join("\n"));
}

function wireConsole(page, tag) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      logLine(`[${tag}] console.error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    logLine(`[${tag}] pageerror: ${err.message}`);
    addFinding({ severity: "P0", page: tag, title: "Uncaught page error", detail: err.message });
  });
  page.on("response", async (res) => {
    const status = res.status();
    if (status >= 400) {
      const url = res.url();
      if (url.includes("/api/")) {
        logLine(`[${tag}] HTTP ${status}: ${url}`);
      }
    }
  });
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function shootBoth(browser, path, name, { afterLoad } = {}) {
  for (const [vp, tag] of [[DESKTOP, "desktop"], [MOBILE, "mobile"]]) {
    const ctx = await browser.newContext({ viewport: vp, storageState: "D:/NorthHire-spa/.claude/qa-r3-scripts/emp-storage.json" });
    const page = await ctx.newPage();
    wireConsole(page, `${name}-${tag}`);
    try {
      await page.goto(BASE + path, { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(1800);
      if (afterLoad) await afterLoad(page, tag).catch((e) => logLine(`afterLoad error ${name}-${tag}: ${e.message}`));
      await page.screenshot({ path: `${OUT_SHOTS}/${name}-${tag}.png`, fullPage: true });
    } catch (e) {
      logLine(`[${name}-${tag}] navigation/screenshot failed: ${e.message}`);
      addFinding({ severity: "P1", page: name, title: "Page failed to load/screenshot", detail: e.message });
    }
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();

  // 1. Login as employer and save storage state
  const loginCtx = await browser.newContext({ viewport: DESKTOP });
  const loginPage = await loginCtx.newPage();
  wireConsole(loginPage, "login");
  await loginPage.goto(BASE + "/login", { waitUntil: "networkidle" });
  await loginPage.screenshot({ path: `${OUT_SHOTS}/00-login-desktop.png` });

  // Try the credential given in the task first
  let loggedIn = false;
  for (const [email, pw, label] of [
    ["admin@pcl.ca", "Employer123", "admin@pcl.ca (as given in task)"],
    ["hr@pcl.com", "Employer123", "hr@pcl.com (seed owner email fallback)"],
  ]) {
    await loginPage.goto(BASE + "/login", { waitUntil: "networkidle" });
    await loginPage.getByPlaceholder("you@example.ca").fill(email).catch(() => {});
    await loginPage.getByPlaceholder("Your password").fill(pw).catch(() => {});
    await loginPage.getByRole("button", { name: "Sign in", exact: true }).click().catch(() => {});
    await loginPage.waitForTimeout(1200);
    const url = loginPage.url();
    if (!url.includes("/login")) {
      logLine(`Login succeeded with ${label}`);
      loggedIn = true;
      if (email !== "admin@pcl.ca") {
        addFinding({
          severity: "P2",
          page: "auth/login",
          title: "Task-provided credential admin@pcl.ca does not exist; real PCL owner login is hr@pcl.com",
          detail: "The QA brief specified admin@pcl.ca/Employer123 as the PCL Construction employer persona. This account does not exist in src/store/seed/employers.js (owner field is hr@pcl.com). Used hr@pcl.com/Employer123 instead to proceed with the audit.",
        });
      }
      break;
    } else {
      logLine(`Login FAILED with ${label}`);
    }
  }

  if (!loggedIn) {
    addFinding({ severity: "P0", page: "auth/login", title: "Could not log in as any employer credential", detail: "Both admin@pcl.ca and hr@pcl.com failed to authenticate." });
    await browser.close();
    return;
  }

  await loginPage.context().storageState({ path: "D:/NorthHire-spa/.claude/qa-r3-scripts/emp-storage.json" });
  await loginPage.screenshot({ path: `${OUT_SHOTS}/00-dashboard-desktop.png` });
  await loginCtx.close();

  // 2. Walk all main employer routes with both viewports
  const routes = [
    ["/employer", "dashboard"],
    ["/employer/jobs", "jobs"],
    ["/employer/jobs/new", "post-wizard-step1"],
    ["/employer/pipeline", "pipeline"],
    ["/employer/content", "content"],
    ["/employer/content/articles", "content-articles"],
    ["/employer/content/trainings", "content-trainings"],
    ["/employer/company", "company"],
    ["/employer/team", "team"],
    ["/employer/billing", "billing"],
    ["/employer/analytics", "analytics"],
    ["/employer/api", "api"],
    ["/employer/sso", "sso"],
    ["/employer/staffing", "staffing"],
    ["/employer/staffing/requests", "staffing-requests"],
    ["/employer/staffing/assignments", "staffing-assignments"],
    ["/employer/staffing/timesheets", "staffing-timesheets"],
    ["/employer/staffing/invoices", "staffing-invoices"],
    ["/messages", "messages"],
    ["/interviews", "interviews"],
  ];

  for (const [path, name] of routes) {
    logLine(`Visiting ${path} -> ${name}`);
    await shootBoth(browser, path, name);
  }

  logLine("=== Route walk complete, moving to functional tests ===");
  await browser.close();
})();
