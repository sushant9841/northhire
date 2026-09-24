import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const SHOT_DIR = 'D:/NorthHire-spa/.claude/qa-screenshots/staffing';
const FINDINGS_PATH = 'D:/NorthHire-spa/.claude/qa-r3-findings/staffing.json';

let findings = JSON.parse(fs.readFileSync(FINDINGS_PATH, 'utf8'));
function addFinding(f) { findings.push(f); fs.writeFileSync(FINDINGS_PATH, JSON.stringify(findings, null, 2)); }

async function login(page) {
  await page.goto(`${BASE}/staffing/login`, { waitUntil: 'load', timeout: 20000 });
  const demoBtn = page.locator('button:has-text("nadia.singh")').first();
  if (await demoBtn.count()) await demoBtn.click();
  else {
    await page.locator('input').first().fill('nadia.singh');
    await page.locator('input[type="password"]').first().fill('staff2026');
  }
  const submit = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
  await submit.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await login(page);
  for (const [name, path] of [['dashboard','/staffing/dashboard'],['job-orders','/staffing/job-orders'],['bench','/staffing/bench']]) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOT_DIR}/${name}-390x844.png`, fullPage: true });
    } catch (e) { addFinding({ severity: 'P1', title: `Fill: failed ${path} mobile`, detail: String(e).slice(0,200), page: name }); }
  }
  await browser.close();

  // Job order detail on desktop + mobile
  const browser2 = await chromium.launch();
  const ctx2 = await browser2.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  await login(p2);
  try {
    await p2.goto(`${BASE}/staffing/job-orders`, { waitUntil: 'load', timeout: 20000 });
    await p2.waitForTimeout(800);
    const row = p2.locator('tbody tr, [class*="cursor-pointer"]').first();
    if (await row.count()) {
      await row.click({ timeout: 5000 });
      await p2.waitForTimeout(800);
      await p2.screenshot({ path: `${SHOT_DIR}/job-order-detail-1440x900.png`, fullPage: true });
    } else {
      addFinding({ severity: 'P2', title: 'No clickable job order row found for detail view', detail: '', page: 'job-orders' });
    }
  } catch (e) {
    addFinding({ severity: 'P1', title: 'Fill: job order detail failed', detail: String(e).slice(0,300), page: 'job-orders' });
  }
  await browser2.close();
}

main().catch(e => console.error('FATAL', e));
