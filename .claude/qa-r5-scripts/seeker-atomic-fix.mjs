/* Reshoot the routes whose actual path differs from the task-spec alias. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = ".claude/qa-screenshots/seeker";
fs.mkdirSync(OUT, { recursive: true });
const shotPath = (label, vp) => path.join(OUT, `audit-r5-${label}-${vp}.png`);
const API = "http://localhost:8787";
const APP = "http://localhost:5173";

async function loginSeeker(context) {
  const r = await context.request.post(`${API}/api/auth/login`, { data: { email: "sarah.chen@example.ca", password: "Password123" } });
  if (!r.ok()) throw new Error("login failed");
}

async function shoot(context, label, vp, url) {
  const page = await context.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(`pageerror: ${e.message.slice(0,200)}`));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0,200)); });
  try {
    await page.goto(`${APP}${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1800);
    await page.evaluate(async () => { let y=0; while (y < document.body.scrollHeight) { window.scrollTo(0,y); y+=400; await new Promise(r=>requestAnimationFrame(r)); } window.scrollTo(0,0); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: shotPath(label, vp), fullPage: true });
    console.log(`OK ${label}/${vp} errs=${errs.length}`);
  } catch (e) { console.log(`FAIL ${label}/${vp} ${e.message.slice(0,80)}`); }
  await page.close();
  return errs;
}

(async () => {
  const jobs = await (await fetch(`${API}/api/jobs?limit=1`)).json();
  const emps = await (await fetch(`${API}/api/employers?limit=1`)).json();
  const jobId = jobs.jobs[0].id, empId = emps.employers[0].id;

  const browser = await chromium.launch();
  const allErrs = [];
  for (const vp of ["desktop","mobile"]) {
    const w = vp === "desktop" ? { width:1440, height:900 } : { width:390, height:844 };
    // Public/auth — no login needed
    const pubCtx = await browser.newContext({ viewport: w });
    for (const [label, url] of [
      ["forgot", "/forgot-password"],
      ["employers-public", "/employers"], // canonical
    ]) allErrs.push(...(await shoot(pubCtx, label, vp, url)).map(t=>({label,vp,t})));
    await pubCtx.close();

    const ctx = await browser.newContext({ viewport: w });
    await loginSeeker(ctx);
    for (const [label, url] of [
      ["search-empty",   "/jobs"],
      ["search-query",   "/jobs?q=engineer"],
      ["alerts",         "/notifications"],
      ["apply1",         `/apply/1?job=${jobId}`],
      ["apply2",         `/apply/2?job=${jobId}`],
      ["apply3",         `/apply/3?job=${jobId}`],
      ["apply-done",     "/apply/done"],
      ["cv-edit",        "/cvs/cv100059_mufizzns/edit"],
      ["employer-detail",`/employers/${empId}`],
      ["home-app",       "/home"], // /home may not exist - test
    ]) allErrs.push(...(await shoot(ctx, label, vp, url)).map(t=>({label,vp,t})));
    await ctx.close();
  }
  fs.writeFileSync(".claude/qa-r5-findings/fix-errors.json", JSON.stringify(allErrs, null, 2));
  await browser.close();
})();
