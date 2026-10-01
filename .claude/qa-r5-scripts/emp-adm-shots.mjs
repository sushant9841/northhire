/* Employer + Admin full-page screenshots across every suite route, both viewports. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = ".claude/qa-screenshots";
const shot = (persona, label, vp) => {
  const dir = path.join(OUT, persona);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `qa-r5e-${label}-${vp}.png`);
};

async function capture(browser, vp, loginData, loginUrl, routes, persona) {
  const w = vp === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: w });
  const page = await ctx.newPage();
  const r = await page.request.post(loginUrl, { data: loginData });
  if (!r.ok()) { console.log(`× ${persona} login failed (${vp}): ${r.status()}`); await ctx.close(); return; }
  console.log(`✓ ${persona} login (${vp}) — cookie set`);
  for (const [label, url] of routes) {
    try {
      await page.goto(`http://localhost:5173${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: shot(persona, label, vp), fullPage: true });
      console.log(`  ✓ ${persona}/${label}/${vp}`);
    } catch (e) {
      console.log(`  × ${persona}/${label}/${vp}: ${e.message.slice(0, 80)}`);
    }
  }
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const employer = [
    ["empHome", "/employer"],
    ["empJobs", "/employer/jobs"],
    ["empPipeline", "/employer/pipeline"],
    ["empAnalytics", "/employer/analytics"],
    ["empBilling", "/employer/billing"],
    ["empCompany", "/employer/company"],
    ["empTeam", "/employer/team"],
    ["empStaffing", "/employer/staffing"],
    ["empStaffingRequests", "/employer/staffing/requests"],
    ["empStaffingAssignments", "/employer/staffing/assignments"],
    ["empStaffingTimesheets", "/employer/staffing/timesheets"],
    ["empStaffingInvoices", "/employer/staffing/invoices"],
    ["empContent", "/employer/content"],
    ["empSso", "/employer/sso"],
    ["empApi", "/employer/api"],
  ];
  const admin = [
    ["admHome", "/admin"],
    ["admUsers", "/admin/users"],
    ["admJobs", "/admin/jobs"],
    ["admEmployers", "/admin/employers"],
    ["admArticles", "/admin/content/articles"],
    ["admTrainings", "/admin/content/trainings"],
    ["admStats", "/admin/stats"],
    ["admConfig", "/admin/config"],
    ["admLog", "/admin/log"],
    ["admSettings", "/admin/settings"],
    ["admDesignSystem", "/admin/design-system"],
    ["admAdmins", "/admin/admins"],
  ];
  try {
    for (const vp of ["desktop", "mobile"]) {
      await capture(browser, vp, { email: "hr@pcl.com", password: "Employer123" },
        "http://localhost:8787/api/auth/login", employer, "employer");
      await capture(browser, vp, { email: "admin@northhire.ca", password: "Admin1234" },
        "http://localhost:8787/api/auth/login", admin, "admin");
    }
  } finally {
    await browser.close();
  }
})();
