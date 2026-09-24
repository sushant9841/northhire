import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const SHOT_DIR = 'D:/NorthHire-spa/.claude/qa-screenshots/staffing';
const FINDINGS_PATH = 'D:/NorthHire-spa/.claude/qa-r3-findings/staffing.json';
const CONSOLE_LOG_PATH = 'D:/NorthHire-spa/.claude/qa-r3-findings/staffing-console.log';

fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.mkdirSync('D:/NorthHire-spa/.claude/qa-r3-findings', { recursive: true });

const findings = [];
const consoleLines = [];

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
  ['dashboard', '/staffing/dashboard'],
  ['job-orders', '/staffing/job-orders'],
  ['bench', '/staffing/bench'],
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

async function main() {
  const browser = await chromium.launch();

  // ---- LOGIN ----
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await attachConsoleListeners(page, 'login');

  await page.goto(`${BASE}/staffing/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SHOT_DIR}/login-1440x900.png` });

  // try clicking nadia demo button if present, else fill manually
  const demoBtn = page.locator('button:has-text("nadia.singh")').first();
  if (await demoBtn.count()) {
    await demoBtn.click();
  } else {
    const idInput = page.locator('input').first();
    await idInput.fill('nadia.singh');
  }
  // find password field
  const pwInput = page.locator('input[type="password"]').first();
  if (await pwInput.count()) {
    const val = await pwInput.inputValue();
    if (!val) await pwInput.fill('staff2026');
  }
  const loginSubmit = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
  await loginSubmit.click({ timeout: 5000 }).catch(async () => {
    addFinding({ severity: 'P1', title: 'Could not find login submit button', detail: 'staffing login page', page: 'login' });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT_DIR}/post-login-1440x900.png` });

  const cookies = await context.cookies();
  logLine('Cookies after login: ' + JSON.stringify(cookies.map(c => c.name)));
  if (!cookies.find(c => c.name.toLowerCase().includes('staffing'))) {
    addFinding({ severity: 'P2', title: 'No cookie literally named "staffing" found post-login', detail: JSON.stringify(cookies.map(c=>c.name)), page: 'login' });
  }

  const currentUrl = page.url();
  if (!currentUrl.includes('/staffing/dashboard') && !currentUrl.includes('/staffing/')) {
    addFinding({ severity: 'P0', title: 'Login did not redirect into staffing console', detail: `Landed at ${currentUrl}`, page: 'login' });
  }

  // ---- Desktop screenshots of every route ----
  for (const [name, path] of PAGES) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOT_DIR}/${name}-1440x900.png`, fullPage: true });
      const bodyText = await page.locator('body').innerText().catch(() => '');
      if (/not found|404|nothing here/i.test(bodyText) && bodyText.length < 400) {
        addFinding({ severity: 'P1', title: `Route ${path} appears to render empty/404-like content`, detail: bodyText.slice(0,200), page: name });
      }
    } catch (e) {
      addFinding({ severity: 'P0', title: `Failed to load ${path}`, detail: String(e), page: name });
    }
  }

  // ---- Job order detail: click first job order row ----
  try {
    await page.goto(`${BASE}/staffing/job-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const row = page.locator('table tbody tr, [class*="row"], a, button').filter({ hasText: /./ }).first();
    // Try more specific: any clickable row-like element in a list
    const clickable = page.locator('tbody tr').first();
    if (await clickable.count()) {
      await clickable.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOT_DIR}/job-order-detail-1440x900.png`, fullPage: true });
    } else {
      addFinding({ severity: 'P2', title: 'No job order rows found to open detail view', detail: '', page: 'job-orders' });
    }
  } catch (e) {
    addFinding({ severity: 'P1', title: 'Error opening job order detail', detail: String(e), page: 'job-orders' });
  }

  await browser.close();

  // ---- Mobile pass ----
  const browser2 = await chromium.launch();
  const mctx = await browser2.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mctx.newPage();
  await attachConsoleListeners(mpage, 'mobile-login');
  await mpage.goto(`${BASE}/staffing/login`, { waitUntil: 'networkidle' });
  const mDemoBtn = mpage.locator('button:has-text("nadia.singh")').first();
  if (await mDemoBtn.count()) await mDemoBtn.click();
  else {
    await mpage.locator('input').first().fill('nadia.singh');
    await mpage.locator('input[type="password"]').first().fill('staff2026');
  }
  const mSubmit = mpage.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
  await mSubmit.click({ timeout: 5000 }).catch(() => {});
  await mpage.waitForTimeout(1200);

  for (const [name, path] of PAGES) {
    try {
      await mpage.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await mpage.waitForTimeout(500);
      await mpage.screenshot({ path: `${SHOT_DIR}/${name}-390x844.png`, fullPage: true });
      // Check for horizontal overflow (mobile-hidden CTA anti-pattern signal)
      const hasOverflow = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
      if (hasOverflow) {
        addFinding({ severity: 'P2', title: `Horizontal scroll/overflow on mobile for ${path}`, detail: '', page: name });
      }
    } catch (e) {
      addFinding({ severity: 'P1', title: `Mobile: failed to load ${path}`, detail: String(e), page: name });
    }
  }
  await browser2.close();

  logLine('=== DONE ===');
  console.log('Total findings:', findings.length);
}

main().catch(e => {
  console.error('FATAL', e);
  fs.writeFileSync('D:/NorthHire-spa/.claude/qa-r3-findings/staffing-fatal.log', String(e.stack || e));
});
