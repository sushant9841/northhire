import { chromium } from "playwright";
const OUT = ".claude/qa-screenshots/employer-transformation";
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });

function sink(p, tag) {
  p.on("pageerror", e => errors.push({ tag, error: e.message }));
  p.on("console", msg => { if (msg.type() === "error") errors.push({ tag, console: msg.text() }); });
}

async function shot(p, name) { await p.screenshot({ path: `${OUT}/${name}.png` }); }

const emp = await ctx.newPage();
sink(emp, "employer");
await emp.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
await emp.fill('input[type="email"]', "hr@pcl.com");
await emp.fill('input[type="password"]', "Employer123");
await emp.click('button:has-text("Sign in")');
await emp.waitForTimeout(1200);
await shot(emp, "01-emp-home");

// --- E2: Post wizard, draft autosave, preview step, publish success ---
await emp.goto("http://localhost:5173/employer/jobs/new", { waitUntil: "networkidle" });
await emp.waitForTimeout(400);
await emp.fill('input[placeholder*="Journeyperson"], input[placeholder*="Cashier"], input', "").catch(()=>{});
const titleInput = emp.locator('input').first();
await titleInput.fill("Verification Test Role");
await emp.selectOption('select >> nth=0', { index: 1 }).catch(()=>{});
await emp.waitForTimeout(300);
await shot(emp, "02-post-step1-filled");
await emp.waitForTimeout(1000); // let draft autosave debounce fire
await shot(emp, "03-post-draft-indicator");

const before = await emp.locator('.text-xs.text-text-3[aria-live="polite"]').first().textContent().catch(()=>null);
errors.push({ tag: "draft-indicator-text", value: before });

const jobId = await emp.evaluate(() => window.__store?.candidateId).catch(()=>null);

const analytics = await emp.goto("http://localhost:5173/employer/analytics", { waitUntil: "networkidle" });
await emp.waitForTimeout(500);
await shot(emp, "04-analytics-insights");

const interviews = await emp.goto("http://localhost:5173/interviews", { waitUntil: "networkidle" });
await emp.waitForTimeout(400);
await shot(emp, "05-interviews-page");

await emp.goto("http://localhost:5173/employer/pipeline", { waitUntil: "networkidle" });
await emp.waitForTimeout(500);
await shot(emp, "06-pipeline-kanban");
const firstCard = emp.locator('[role="button"][aria-label^="Open "]').first();
if (await firstCard.count()) {
  await firstCard.click();
  await emp.waitForTimeout(500);
  await shot(emp, "07-pipeline-candidate-drawer");
  // kanban still visible behind
  const kanbanVisible = await emp.locator('[role="button"][aria-label^="Open "]').first().isVisible().catch(()=>false);
  errors.push({ tag: "kanban-visible-behind-drawer", value: kanbanVisible });
}

// deep link
const candId = await emp.evaluate(() => window.__store?.candidateId).catch(()=>null);
errors.push({ tag: "candidateId-after-drawer-open", value: candId });
if (candId) {
  const p2 = await ctx.newPage();
  sink(p2, "deep-link");
  await p2.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await p2.fill('input[type="email"]', "hr@pcl.com");
  await p2.fill('input[type="password"]', "Employer123");
  await p2.click('button:has-text("Sign in")');
  await p2.waitForTimeout(1000);
  await p2.goto(`http://localhost:5173/employer/candidates/${candId}`, { waitUntil: "networkidle" });
  await p2.waitForTimeout(700);
  await shot(p2, "08-deep-link-candidate-drawer");
  await p2.close();
}

await emp.goto("http://localhost:5173/employer/billing", { waitUntil: "networkidle" });
await emp.waitForTimeout(400);
await shot(emp, "09-billing");

// --- Seeker regression check on JobDetailPage (shared component I modified) ---
const seeker = await ctx.newPage();
sink(seeker, "seeker");
await seeker.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
await seeker.fill('input[type="email"]', "sarah.chen@example.ca");
await seeker.fill('input[type="password"]', "Password123");
await seeker.click('button:has-text("Sign in")');
await seeker.waitForTimeout(1200);
await seeker.goto("http://localhost:5173/jobs", { waitUntil: "networkidle" });
await seeker.waitForTimeout(500);
const jobCard = seeker.locator('a[href^="/jobs/"], [class*="cursor-pointer"]').first();
await seeker.goto("http://localhost:5173/search", { waitUntil: "networkidle" }).catch(()=>{});
await seeker.waitForTimeout(500);
await shot(seeker, "10-seeker-search");
const firstJobLink = seeker.locator('a').filter({ hasText: /./ }).first();
// Try clicking any job card
const anyJobCard = seeker.locator('[class*="rounded"]').filter({ hasText: /Full Time|Part Time|hr|yr/ }).first();
if (await anyJobCard.count()) {
  await anyJobCard.click().catch(()=>{});
  await seeker.waitForTimeout(700);
  await shot(seeker, "11-seeker-job-detail");
}

await b.close();
console.log("\nERRORS/DIAGNOSTICS:", errors.length);
for (const e of errors) console.log(" -", JSON.stringify(e));
const pageErrors = errors.filter(e => e.error || e.console);
process.exit(pageErrors.length ? 1 : 0);
