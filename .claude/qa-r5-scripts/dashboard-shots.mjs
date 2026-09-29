/* Capture full-page screenshots of each persona's dashboards. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = ".claude/qa-screenshots";
const shot = (persona, label, vp) => {
  const dir = path.join(OUT, persona);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `qa-r5c-${label}-${vp}.png`);
};

async function loginMain(page, email, password) {
  return (await page.request.post("http://localhost:8787/api/auth/login", { data: { email, password } })).ok();
}
async function loginHr(page, companyName, loginId, password) {
  return (await page.request.post("http://localhost:8787/api/hr/login", { data: { companyName, loginId, password } })).ok();
}

const targets = [
  ["employer", "empHome", "/employer", () => ({ kind: "main", email: "hr@pcl.com", password: "Employer123" })],
  ["employer", "empJobs", "/employer/jobs", () => null],
  ["employer", "empPipeline", "/employer/pipeline", () => null],
  ["employer", "empAnalytics", "/employer/analytics", () => null],
  ["employer", "empBilling", "/employer/billing", () => null],
  ["employer", "empCompany", "/employer/company", () => null],
  ["employer", "empTeam", "/employer/team", () => null],
  ["hr", "hrDash", "/hr", () => ({ kind: "hr", companyName: "PCL Construction", loginId: "rachel.martel", password: "pcl2026" })],
  ["hr", "hrPeople", "/hr/people", () => null],
  ["admin", "admHome", "/admin", () => ({ kind: "main", email: "admin@northhire.ca", password: "Admin1234" })],
  ["admin", "admUsers", "/admin/users", () => null],
  ["admin", "admJobs", "/admin/jobs", () => null],
];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const vp of ["desktop", "mobile"]) {
      const w = vp === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
      let ctx = null, page = null;
      let currentAuth = null;
      for (const [persona, label, url, authFn] of targets) {
        const nextAuth = authFn();
        if (nextAuth) {
          if (ctx) await ctx.close();
          ctx = await browser.newContext({ viewport: w });
          page = await ctx.newPage();
          const ok = nextAuth.kind === "hr"
            ? await loginHr(page, nextAuth.companyName, nextAuth.loginId, nextAuth.password)
            : await loginMain(page, nextAuth.email, nextAuth.password);
          if (!ok) { console.log(`× login failed for ${persona}/${label}/${vp}`); continue; }
          currentAuth = nextAuth;
        }
        try {
          await page.goto(`http://localhost:5173${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForTimeout(2000);
          await page.screenshot({ path: shot(persona, label, vp), fullPage: true });
          console.log(`✓ ${persona}/${label}/${vp}`);
        } catch (e) {
          console.log(`× ${persona}/${label}/${vp}: ${e.message.slice(0, 80)}`);
        }
      }
      if (ctx) await ctx.close();
    }
  } finally {
    await browser.close();
  }
})();
