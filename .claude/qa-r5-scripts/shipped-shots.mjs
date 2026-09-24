/* Capture screenshots of surfaces shipped in QA-r5 so the next audit has fresh evidence.
   Preserves existing shots — uses roadmap-QA-r5-<label>-<viewport>.png naming. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = ".claude/qa-screenshots";
const shot = (persona, label, viewport) => {
  const dir = path.join(OUT, persona);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `roadmap-QA-r5-${label}-${viewport}.png`);
};

async function walk(browser, persona, viewport, fn) {
  const w = viewport === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: w });
  const page = await ctx.newPage();
  await fn(page, viewport);
  await ctx.close();
}

const targets = [
  // Public: job detail on a real seed job — must NOT show "$0k – $0k" or "4.913..." or scale text
  ["seeker", "job-detail-fixed", async (page, vp) => {
    // Land on any real seed job — j122_mu5f1vi2 (QA Publish Verification Role)
    // Actually a real customer-facing seed is better — grab the first live job.
    const list = await (await page.request.get("http://localhost:8787/api/jobs?limit=1")).json();
    const jobId = list.jobs[0].id;
    await page.goto(`http://localhost:5173/jobs/${jobId}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: shot("seeker", "job-detail-fixed", vp), fullPage: true });
  }],
  // Public: employers grid — rating chips
  ["seeker", "employers-grid", async (page, vp) => {
    await page.goto("http://localhost:5173/companies", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: shot("seeker", "employers-grid", vp), fullPage: true });
  }],
  // Public: trainings — rating chips
  ["seeker", "trainings-grid", async (page, vp) => {
    await page.goto("http://localhost:5173/trainings", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: shot("seeker", "trainings-grid", vp), fullPage: true });
  }],
  // Admin: sidebar with new scope pill
  ["admin", "shell-scope-pill", async (page, vp) => {
    // Log in as admin first
    const login = await page.request.post("http://localhost:8787/api/auth/login", { data: { email: "admin@northhire.ca", password: "Admin1234" } });
    if (!login.ok()) { console.log("admin login failed"); return; }
    await page.goto("http://localhost:5173/admin", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot("admin", "shell-scope-pill", vp), fullPage: true });
  }],
];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const vp of ["desktop", "mobile"]) {
      for (const [persona, label, fn] of targets) {
        try {
          await walk(browser, persona, vp, fn);
          console.log(`✓ ${persona}/${label}/${vp}`);
        } catch (e) {
          console.log(`✗ ${persona}/${label}/${vp}: ${e.message.slice(0, 80)}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log("Done.");
})();
