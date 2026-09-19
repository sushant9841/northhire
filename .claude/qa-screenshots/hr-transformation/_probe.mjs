import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
const p = await ctx.newPage();
p.on("response", async r => { if (r.status() === 401) console.log(r.status(), r.request().method(), r.url()); });
await p.goto("http://localhost:5173/hr/login", { waitUntil: "networkidle" });
await p.waitForTimeout(300);
await p.locator('button:has-text("rachel.martel")').first().click();
await p.waitForTimeout(1500);
for (const r of ["hrAttendance","hrLeave","hrTasks"]) {
  await p.locator(`[data-nav-key="${r}"]`).first().click().catch(()=>{});
  await p.waitForTimeout(700);
}
await b.close();
