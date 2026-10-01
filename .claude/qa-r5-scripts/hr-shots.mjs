/* HR + Staffing dashboard full-page screenshots. Fixed cookie context — each persona gets a
   dedicated ctx that stays alive for the whole persona's route list. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = ".claude/qa-screenshots";
const shot = (persona, label, vp) => {
  const dir = path.join(OUT, persona);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `qa-r5d-${label}-${vp}.png`);
};

async function captureHr(browser, vp) {
  const w = vp === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: w });
  const page = await ctx.newPage();
  const r = await page.request.post("http://localhost:8787/api/hr/login", {
    data: { companyName: "PCL Construction", loginId: "rachel.martel", password: "pcl2026" },
  });
  if (!r.ok()) { console.log(`× HR login failed (${vp}): ${r.status()}`); await ctx.close(); return; }
  console.log(`✓ HR login (${vp}) — cookie set`);
  const routes = [
    ["hrDash", "/hr/dashboard"],
    ["hrPeople", "/hr/people"],
    ["hrChat", "/hr/chat"],
    ["hrAttendance", "/hr/attendance"],
    ["hrLeave", "/hr/leave"],
    ["hrTasks", "/hr/tasks"],
    ["hrPayroll", "/hr/payroll"],
    ["hrReports", "/hr/reports"],
    ["hrSettings", "/hr/settings"],
    ["hrCalendar", "/hr/calendar"],
    ["hrTrainings", "/hr/trainings"],
    ["hrPerf", "/hr/perf-reviews"],
    ["hrProfile", "/hr/profile"],
    ["hrExpenses", "/hr/expenses"],
    ["hrInvoices", "/hr/invoices"],
    ["hrIntegrations", "/hr/integrations"],
  ];
  for (const [label, url] of routes) {
    try {
      await page.goto(`http://localhost:5173${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: shot("hr", label, vp), fullPage: true });
      console.log(`  ✓ hr/${label}/${vp}`);
    } catch (e) {
      console.log(`  × hr/${label}/${vp}: ${e.message.slice(0, 80)}`);
    }
  }
  await ctx.close();
}

async function captureStaffing(browser, vp) {
  const w = vp === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: w });
  const page = await ctx.newPage();
  const r = await page.request.post("http://localhost:8787/api/staffing/login", {
    data: { loginId: "nadia.singh", password: "staff2026" },
  });
  if (!r.ok()) { console.log(`× Staffing login failed (${vp}): ${r.status()}`); await ctx.close(); return; }
  console.log(`✓ Staffing login (${vp}) — cookie set`);
  const routes = [
    ["agencyDash", "/staffing/dashboard"],
    ["agencyJobOrders", "/staffing/job-orders"],
    ["agencyBench", "/staffing/bench"],
    ["agencyAssignments", "/staffing/assignments"],
    ["agencyTimesheets", "/staffing/timesheets"],
    ["agencyPayroll", "/staffing/payroll"],
    ["agencyInvoicing", "/staffing/invoicing"],
    ["agencyClients", "/staffing/clients"],
    ["agencyCompliance", "/staffing/compliance"],
    ["agencyWorkers", "/staffing/workers"],
    ["agencyPlacements", "/staffing/placements"],
    ["agencyMargins", "/staffing/margins"],
    ["agencyBranches", "/staffing/branches"],
    ["agencySettings", "/staffing/settings"],
  ];
  for (const [label, url] of routes) {
    try {
      await page.goto(`http://localhost:5173${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: shot("staffing", label, vp), fullPage: true });
      console.log(`  ✓ staffing/${label}/${vp}`);
    } catch (e) {
      console.log(`  × staffing/${label}/${vp}: ${e.message.slice(0, 80)}`);
    }
  }
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const vp of ["desktop", "mobile"]) {
      await captureHr(browser, vp);
      await captureStaffing(browser, vp);
    }
  } finally {
    await browser.close();
  }
})();
