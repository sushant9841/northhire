import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const errors = [];
const seekerRoutes = ["profile","cvs","status","matched","search"];
const empRoutes = ["empHome","empJobs","empPost","empPipeline","empBilling","empAnalytics","admConfig"];
async function pageerrorSink(p, tag) {
  p.on("pageerror", e => errors.push({ tag, error: e.message }));
}
async function loginAndVisit(email, pw, tag, routes) {
  const p = await ctx.newPage();
  pageerrorSink(p, tag);
  await p.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', pw);
  await Promise.all([
    p.waitForLoadState("networkidle"),
    p.click('button:has-text("Sign in")'),
  ]);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `.claude/qa-screenshots/session-${tag}-signed-in.png` });
  for (const r of routes) {
    try {
      await p.evaluate(k => window.dispatchEvent(new CustomEvent("go",{detail:k})), r);
    } catch {}
    try {
      // fallback: click a nav link if the go event isn't wired for that key
      await p.evaluate(k => { if (window.__store?.go) window.__store.go(k); }, r);
    } catch {}
    // simple: nav via hash-changed url isn't wired, so just visit relevant public path where possible.
    // Just check we didn't error yet.
  }
  console.log(tag, "OK");
  return p;
}
try {
  const seekerPage = await ctx.newPage();
  pageerrorSink(seekerPage, "seeker");
  await seekerPage.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await seekerPage.fill('input[type="email"]', "sarah.chen@example.ca");
  await seekerPage.fill('input[type="password"]', "Password123");
  await seekerPage.click('button:has-text("Sign in")');
  await seekerPage.waitForTimeout(1500);
  await seekerPage.screenshot({ path: ".claude/qa-screenshots/session-seeker-home.png", fullPage: false });
  for (const path of ["/profile","/cvs","/status","/jobs","/matched","/notifications","/messages","/settings"]) {
    await seekerPage.goto("http://localhost:5173" + path, { waitUntil: "networkidle" }).catch(()=>{});
    await seekerPage.waitForTimeout(400);
    await seekerPage.screenshot({ path: `.claude/qa-screenshots/session-seeker-${path.replace(/[^a-z0-9]+/gi,"_")}.png` });
  }

  const empPage = await ctx.newPage();
  pageerrorSink(empPage, "employer");
  await empPage.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await empPage.fill('input[type="email"]', "hr@pcl.com");
  await empPage.fill('input[type="password"]', "Employer123");
  await empPage.click('button:has-text("Sign in")');
  await empPage.waitForTimeout(1500);
  await empPage.screenshot({ path: ".claude/qa-screenshots/session-employer-home.png" });
  for (const path of ["/employer","/employer/jobs","/employer/post","/employer/pipeline","/employer/billing","/employer/analytics"]) {
    await empPage.goto("http://localhost:5173" + path, { waitUntil: "networkidle" }).catch(()=>{});
    await empPage.waitForTimeout(500);
    await empPage.screenshot({ path: `.claude/qa-screenshots/session-emp-${path.replace(/[^a-z0-9]+/gi,"_")}.png` });
  }
} catch (e) {
  errors.push({ nav: e.message });
}
await b.close();
console.log("\nERRORS:", errors.length);
for (const e of errors) console.log(" -", JSON.stringify(e));
process.exit(errors.length ? 1 : 0);
