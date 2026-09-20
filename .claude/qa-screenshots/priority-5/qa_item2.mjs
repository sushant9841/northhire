import { chromium } from "playwright";
const OUT = "D:/NorthHire-spa/.claude/qa-screenshots/priority-5";
const errors = [];
const b = await chromium.launch();

async function newPage(tag, mobile=false) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 } } : { viewport: { width: 1400, height: 950 } });
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push({ tag, error: e.message }));
  p.on("console", msg => { if (msg.type() === "error" && !/favicon|DevTools/.test(msg.text())) errors.push({ tag, console: msg.text() }); });
  return p;
}

// Employer - EmpTeam (existing mount, unaffected)
{
  const p = await newPage("employer");
  await p.goto("http://localhost:5173/login", { waitUntil: "networkidle" }).catch(()=>{});
  await p.fill('input[type="email"]', "hr@pcl.com");
  await p.fill('input[type="password"]', "Employer123");
  await p.click('button:has-text("Sign in")');
  await p.waitForTimeout(1200);
  await p.goto("http://localhost:5173/employer/team", { waitUntil: "networkidle" }).catch(()=>{});
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/employer_team_integrations.png`, fullPage: true });
}

// HR - HrSettings
{
  const p = await newPage("hr");
  await p.goto("http://localhost:5173/hr/login", { waitUntil: "networkidle" }).catch(()=>{});
  await p.waitForTimeout(300);
  const demoBtn = p.locator('button:has-text("rachel.martel")').first();
  await demoBtn.click({ timeout: 5000 }).catch(async()=>{
    await p.fill('input', "rachel.martel"); // fallback, unlikely needed
  });
  await p.waitForTimeout(1200);
  await p.goto("http://localhost:5173/hr/settings", { waitUntil: "networkidle" }).catch(()=>{});
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/hr_settings_integrations.png`, fullPage: true });
}

// Staffing - AgencySettings
{
  const p = await newPage("staffing");
  await p.goto("http://localhost:5173/staffing/login", { waitUntil: "networkidle" }).catch(()=>{});
  await p.waitForTimeout(300);
  await p.locator('code:has-text("nadia.singh")').first().click({ timeout: 5000 }).catch(()=>{});
  await p.waitForTimeout(200);
  await p.click('button:has-text("Sign in")').catch(async ()=>{
    // fallback: click parent button of the code element
    await p.locator('button:has-text("nadia.singh")').first().click().catch(()=>{});
    await p.waitForTimeout(200);
  });
  await p.waitForTimeout(1200);
  await p.goto("http://localhost:5173/staffing/settings", { waitUntil: "networkidle" }).catch(()=>{});
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/staffing_settings_integrations.png`, fullPage: true });
}

await b.close();
console.log("\nERRORS:", errors.length);
for (const e of errors) console.log(" -", JSON.stringify(e));
process.exit(errors.length ? 1 : 0);
