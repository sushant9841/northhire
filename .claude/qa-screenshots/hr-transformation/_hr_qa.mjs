import { chromium } from "playwright";

const OUT = "D:/NorthHire-spa/.claude/qa-screenshots/hr-transformation";
const users = [
  { id: "rachel.martel", tag: "rachel", role: "owner" },
  { id: "priya.r", tag: "priya", role: "admin" },
  { id: "linda.o", tag: "linda", role: "hr" },
  { id: "isaac.c", tag: "isaac", role: "finance" },
  { id: "daniel.k", tag: "daniel", role: "employee" },
];

const b = await chromium.launch();
const errors = [];

async function run(u, mobile) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1400, height: 950 } });
  const p = await ctx.newPage();
  const tag = u.tag + (mobile ? "_mobile" : "");
  p.on("pageerror", e => errors.push({ tag, error: e.message }));
  p.on("console", msg => { if (msg.type() === "error" && !/favicon|DevTools/.test(msg.text())) errors.push({ tag, console: msg.text() }); });

  await p.goto("http://localhost:5173/hr/login", { waitUntil: "networkidle" }).catch(() => {});
  await p.waitForTimeout(400);

  const demoBtn = p.locator(`button:has-text("${u.id}")`).first();
  await demoBtn.click({ timeout: 5000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/${tag}_dashboard.png` });

  const routes = mobile
    ? ["hrDashboard", "hrProfile", "hrLeave", "hrTasks"]
    : ["hrDashboard", "hrAttendance", "hrLeave", "hrTasks", "hrTrainings", "hrChat", "hrProfile", "hrPeople",
       ...(u.role === "owner" || u.role === "finance" ? ["hrPayroll", "hrInvoices", "hrExpenses"] : []),
      ];

  for (const r of routes) {
    if (mobile) {
      await p.locator('button[aria-label]').first().click().catch(() => {});
      await p.waitForTimeout(200);
    }
    await p.locator(`[data-nav-key="${r}"]`).first().click({ timeout: 3000 }).catch(e => console.log(tag, r, "nav click failed:", e.message));
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${tag}_${r}.png` }).catch(() => {});
  }

  // Focus-scroll check: from HrLeave, click a name to jump to profile.
  if (!mobile) {
    await p.locator('[data-nav-key="hrLeave"]').first().click().catch(() => {});
    await p.waitForTimeout(500);
    const nameBtn = p.locator('button:has-text(" ")').filter({ hasText: /./ }).and(p.locator('button.hover\\:underline'));
    const count = await p.locator('button.hover\\:underline').count();
    if (count > 0) {
      await p.locator('button.hover\\:underline').first().click();
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/${tag}_focusscroll_leave.png` });
    } else {
      console.log(tag, "no pending leave row to test focus-scroll on");
    }
  }

  console.log(tag, "done");
  await ctx.close();
}

for (const u of users) {
  await run(u, false);
}
await run(users.find(u => u.tag === "daniel"), true);

await b.close();
console.log("\nERRORS:", errors.length);
for (const e of errors) console.log(" -", JSON.stringify(e));
process.exit(errors.length ? 1 : 0);
