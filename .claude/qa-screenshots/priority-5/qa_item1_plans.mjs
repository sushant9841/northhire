import { chromium } from "playwright";
const OUT = "D:/NorthHire-spa/.claude/qa-screenshots/priority-5";
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 1100 } });
const p = await ctx.newPage();
p.on("pageerror", e => errors.push({ error: e.message }));
p.on("console", msg => { if (msg.type() === "error" && !/favicon|DevTools/.test(msg.text())) errors.push({ console: msg.text() }); });

await p.goto("http://localhost:5173/login", { waitUntil: "networkidle" }).catch(()=>{});
await p.fill('input[type="email"]', "admin@northhire.ca");
await p.fill('input[type="password"]', "Admin1234");
await p.click('button:has-text("Sign in")');
await p.waitForTimeout(1200);
await p.goto("http://localhost:5173/admin/config", { waitUntil: "networkidle" }).catch(()=>{});
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/admConfig_before.png`, fullPage: true });

// Add a test plan
await p.locator('button:has-text("Add plan")').first().click();
await p.waitForTimeout(200);
await p.locator('input[placeholder*="Plan name"]').fill("QaTestTier");
await p.locator('button:has-text("Add plan")').nth(1).click().catch(async()=>{
  await p.locator('button:has-text("Add plan")').last().click();
});
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/admConfig_added.png`, fullPage: true });

// Save
await p.locator('button:has-text("Save")').first().click();
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/admConfig_saved.png`, fullPage: true });

// Delete it
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(600);
const trashButtons = p.locator('button[aria-label="Delete plan"]');
const count = await trashButtons.count();
console.log("trash buttons:", count);
await trashButtons.last().click();
await p.waitForTimeout(300);
await p.locator('button:has-text("Delete plan")').last().click();
await p.waitForTimeout(400);
await p.locator('button:has-text("Save")').first().click();
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/admConfig_deleted.png`, fullPage: true });

await b.close();
console.log("\nERRORS:", errors.length);
for (const e of errors) console.log(" -", JSON.stringify(e));
process.exit(errors.filter(e=>e.error).length ? 1 : 0);
