// QA r3 — HR Suite exhaustive pass. Standalone Playwright script (not test runner) so we can
// write findings incrementally and keep going even if one page throws.
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:5173";
const SCREEN_DIR = ".claude/qa-screenshots/hr";
const FINDINGS_PATH = ".claude/qa-r3-findings/hr.json";
const CONSOLE_LOG_PATH = ".claude/qa-r3-findings/hr-console.log";

fs.mkdirSync(SCREEN_DIR, { recursive: true });
fs.mkdirSync(path.dirname(FINDINGS_PATH), { recursive: true });

const findings = [];
const consoleLines = [];

function addFinding(f) {
  findings.push({ id: `HR-${findings.length + 1}`, ts: new Date().toISOString(), ...f });
  fs.writeFileSync(FINDINGS_PATH, JSON.stringify(findings, null, 2));
}
function logConsole(line) {
  consoleLines.push(line);
  fs.writeFileSync(CONSOLE_LOG_PATH, consoleLines.join("\n"));
}

const PERSONAS = {
  rachel: { loginId: "rachel.martel@pcl.com", role: "owner" },
  priya: { loginId: "priya.r@pcl.com", role: "admin/manager" },
  linda: { loginId: "linda.o@pcl.com", role: "hr" },
  isaac: { loginId: "isaac.c@pcl.com", role: "finance" },
  daniel: { loginId: "daniel.k@pcl.com", role: "employee" },
};

const ROUTES = [
  ["dashboard", "/hr/dashboard"],
  ["directory", "/hr/directory"],
  ["profile", "/hr/profile"],
  ["attendance", "/hr/attendance"],
  ["leave", "/hr/leave"],
  ["tasks", "/hr/tasks"],
  ["calendar", "/hr/calendar"],
  ["chat", "/hr/chat"],
  ["trainings", "/hr/trainings"],
  ["badges", "/hr/badges"],
  ["people", "/hr/people"],
  ["expenses", "/hr/expenses"],
  ["hiring", "/hr/hiring"],
  ["invoices", "/hr/invoices"],
  ["payroll", "/hr/payroll"],
  ["reports", "/hr/reports"],
  ["settings", "/hr/settings"],
  ["integrations", "/hr/integrations"],
  ["policies", "/hr/policies"],
  ["roster", "/hr/roster"],
  ["perf-reviews", "/hr/perf-reviews"],
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];

async function loginAsHr(page, loginId, password = "pcl2026", company = "PCL Construction") {
  await page.goto(`${BASE}/hr/login`);
  await page.locator('input[placeholder="e.g. PCL Construction"]').fill(company);
  await page.locator('input[placeholder="jean.dupuis"]').fill(loginId);
  await page.getByPlaceholder("Your password").fill(password);
  await page.getByRole("button", { name: /Enter HR Suite|Signing in/ }).click();
  await page.waitForURL(/\/hr\/dashboard/, { timeout: 10000 });
}

async function run() {
  const browser = await chromium.launch();

  for (const [personaName, persona] of Object.entries(PERSONAS)) {
    for (const [vpName, vp] of VIEWPORTS) {
      const context = await browser.newContext({ viewport: vp });
      const page = await context.newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          logConsole(`[${personaName}/${vpName}] CONSOLE ERROR: ${msg.text()}`);
        }
      });
      page.on("response", (resp) => {
        if (resp.status() >= 400) {
          logConsole(`[${personaName}/${vpName}] HTTP ${resp.status()} ${resp.url()}`);
        }
      });
      page.on("pageerror", (err) => {
        logConsole(`[${personaName}/${vpName}] PAGE ERROR: ${err.message}`);
      });

      try {
        await loginAsHr(page, persona.loginId);
      } catch (e) {
        addFinding({
          severity: "P0",
          persona: personaName,
          area: "login",
          desc: `Login failed for ${persona.loginId}: ${e.message}`,
        });
        await context.close();
        continue;
      }

      for (const [routeName, routePath] of ROUTES) {
        try {
          await page.goto(`${BASE}${routePath}`, { waitUntil: "networkidle", timeout: 15000 });
          await page.waitForTimeout(500);
          const shotPath = `${SCREEN_DIR}/${personaName}-${routeName}-${vpName}.png`;
          await page.screenshot({ path: shotPath, fullPage: true });
          const url = page.url();
          if (url.includes("/hr/login")) {
            addFinding({
              severity: "P2",
              persona: personaName,
              area: routeName,
              desc: `Navigating to ${routePath} redirected back to /hr/login (session dropped or route not permitted) — viewport ${vpName}`,
            });
          }
        } catch (e) {
          addFinding({
            severity: "P1",
            persona: personaName,
            area: routeName,
            desc: `Navigation/screenshot failed for ${routePath} (${vpName}): ${e.message}`,
          });
        }
      }
      await context.close();
      console.log(`done: ${personaName}/${vpName}`);
    }
  }

  await browser.close();
  console.log(`Total findings so far: ${findings.length}`);
}

run().catch((e) => {
  console.error("FATAL", e);
  addFinding({ severity: "P0", persona: "n/a", area: "script", desc: `Fatal script error: ${e.message}` });
  process.exit(1);
});
