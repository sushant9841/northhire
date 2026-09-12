import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const errors = [];
const routes = [
  "http://localhost:5173/",
  "http://localhost:5173/jobs",
  "http://localhost:5173/employers",
  "http://localhost:5173/resources",
  "http://localhost:5173/trainings",
  "http://localhost:5173/pricing",
  "http://localhost:5173/for-employers",
  "http://localhost:5173/login",
  "http://localhost:5173/signup",
];
for (const url of routes) {
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push({ url, error: e.message }));
  /* skip console noise: 401s to anonymous auth-gated endpoints + resource load fails are
     expected on a bare guest visit. Only real uncaught JS is a pageerror. */
  try {
    await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await p.waitForTimeout(600);
    const slug = url.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    await p.screenshot({ path: `.claude/qa-screenshots/session-${slug}.png`, fullPage: false });
    console.log("OK  ", url);
  } catch (e) { errors.push({ url, nav: e.message }); }
  await p.close();
}
await b.close();
console.log("\nERRORS:", errors.length);
for (const e of errors) console.log(" -", JSON.stringify(e));
process.exit(errors.length ? 1 : 0);
