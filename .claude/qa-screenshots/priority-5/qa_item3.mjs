import { chromium } from "playwright";
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
const p = await ctx.newPage();
p.on("pageerror", e => errors.push({ error: e.message }));
p.on("console", msg => { if (msg.type() === "error" && !/favicon|DevTools/.test(msg.text())) errors.push({ console: msg.text() }); });

await p.goto("http://localhost:5173/hr/login", { waitUntil: "networkidle" }).catch(()=>{});
await p.waitForTimeout(300);
await p.locator('button:has-text("rachel.martel")').first().click({ timeout: 5000 }).catch(()=>{});
await p.waitForTimeout(1000);
for (const route of ["hrPeople", "hrLeave", "hrTasks", "hrTrainings", "hrBadges", "hrPayroll", "hrSettings"]) {
  await p.locator(`[data-nav-key="${route}"]`).first().click({ timeout: 3000 }).catch(()=>{});
  await p.waitForTimeout(500);
}

const empPage = await ctx.newPage();
empPage.on("pageerror", e => errors.push({ tag: "employer", error: e.message }));
await empPage.goto("http://localhost:5173/login", { waitUntil: "networkidle" }).catch(()=>{});
await empPage.fill('input[type="email"]', "hr@pcl.com");
await empPage.fill('input[type="password"]', "Employer123");
await empPage.click('button:has-text("Sign in")');
await empPage.waitForTimeout(1200);
await empPage.goto("http://localhost:5173/employer/team", { waitUntil: "networkidle" }).catch(()=>{});
await empPage.waitForTimeout(700);

await b.close();
console.log("\nERRORS:", errors.length);
for (const e of errors) console.log(" -", JSON.stringify(e));
process.exit(errors.filter(e => e.error).length ? 1 : 0);
