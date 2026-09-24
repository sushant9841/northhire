import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const SHOT_DIR = 'D:/NorthHire-spa/.claude/qa-screenshots/staffing';
const FINDINGS_PATH = 'D:/NorthHire-spa/.claude/qa-r3-findings/staffing.json';
const CONSOLE_LOG_PATH = 'D:/NorthHire-spa/.claude/qa-r3-findings/staffing-console.log';

let findings = JSON.parse(fs.readFileSync(FINDINGS_PATH, 'utf8'));
let consoleLines = fs.readFileSync(CONSOLE_LOG_PATH, 'utf8').split('\n');

function addFinding(f) {
  findings.push(f);
  fs.writeFileSync(FINDINGS_PATH, JSON.stringify(findings, null, 2));
  console.log('FINDING:', f.severity, f.title);
}
function logLine(s) {
  consoleLines.push(s);
  fs.writeFileSync(CONSOLE_LOG_PATH, consoleLines.join('\n'));
}

const PAGES = [
  ['assignments', '/staffing/assignments'],
  ['timesheets', '/staffing/timesheets'],
  ['payroll', '/staffing/payroll'],
  ['invoicing', '/staffing/invoicing'],
  ['placements', '/staffing/placements'],
  ['clients', '/staffing/clients'],
  ['workers', '/staffing/workers'],
  ['margins', '/staffing/margins'],
  ['compliance', '/staffing/compliance'],
  ['settings', '/staffing/settings'],
];

async function attachConsoleListeners(page, ctxLabel) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      logLine(`[${ctxLabel}] console.${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    logLine(`[${ctxLabel}] pageerror: ${err.message}`);
    addFinding({ severity: 'P0', title: `JS exception on ${ctxLabel}`, detail: err.message, page: ctxLabel });
  });
  page.on('response', (resp) => {
    const status = resp.status();
    if (status >= 400 && resp.url().includes('/api/')) {
      logLine(`[${ctxLabel}] network ${status}: ${resp.url()}`);
      addFinding({ severity: status >= 500 ? 'P0' : 'P1', title: `HTTP ${status} on ${resp.url()}`, detail: `context=${ctxLabel}`, page: ctxLabel });
    }
  });
}

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

async function run(viewport, suffix) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await attachConsoleListeners(page, `${suffix}-retry`);
  await login(page);

  for (const [name, path] of PAGES) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SHOT_DIR}/${name}-${suffix}.png`, fullPage: true });
      const hasOverflow = suffix.includes('390') ? await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5) : false;
      if (hasOverflow) {
        addFinding({ severity: 'P2', title: `Horizontal scroll/overflow on mobile for ${path}`, detail: '', page: name });
      }
    } catch (e) {
      addFinding({ severity: 'P0', title: `Retry: Failed to load ${path} (${suffix})`, detail: String(e).slice(0,300), page: name });
      // reload fresh page in case context died
      try { await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 20000 }); await page.waitForTimeout(1000); await page.screenshot({ path: `${SHOT_DIR}/${name}-${suffix}.png`, fullPage: true }); } catch(e2) {}
    }
  }
  await browser.close();
}

async function main() {
  await run({ width: 1440, height: 900 }, '1440x900');
  await run({ width: 390, height: 844 }, '390x844');
  logLine('=== RETRY DONE ===');
}

main().catch(e => {
  console.error('FATAL', e);
  logLine('FATAL: ' + String(e.stack || e));
});
