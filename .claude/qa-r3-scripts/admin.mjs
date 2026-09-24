// QA Round 3 - Admin console exhaustive audit
// Usage: node .claude/qa-r3-scripts/admin.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5173';
const SHOT_DIR = '.claude/qa-screenshots/admin';
const FIND_FILE = '.claude/qa-r3-findings/admin.json';
const LOG_FILE = '.claude/qa-r3-findings/admin-console.log';

fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(FIND_FILE), { recursive: true });

const findings = [];
const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logLines.push(line);
  console.log(line);
  fs.writeFileSync(LOG_FILE, logLines.join('\n'));
}
function addFinding(f) {
  findings.push({ id: findings.length + 1, ...f });
  fs.writeFileSync(FIND_FILE, JSON.stringify(findings, null, 2));
  log(`FINDING [${f.severity}] ${f.page}: ${f.title}`);
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

// pages to screenshot: label -> path
const PAGES = [
  ['home-stats', '/admin'],
  ['users', '/admin/users'],
  ['employers', '/admin/employers'],
  ['jobs', '/admin/jobs'],
  ['content-articles', '/admin/content/articles'],
  ['content-trainings', '/admin/content/trainings'],
  ['settings', '/admin/settings'],
  ['design-system', '/admin/design-system'],
  ['activity-log', '/admin/log'],
  ['stats', '/admin/stats'],
  ['config', '/admin/config'],
  ['admins', '/admin/admins'],
];

async function shootBoth(page, label) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);
    const file = `${SHOT_DIR}/${label}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true }).catch(e => log(`screenshot fail ${label}-${vp.name}: ${e.message}`));
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
      log(`CONSOLE ERROR @ ${page.url()}: ${msg.text()}`);
    }
  });
  page.on('response', resp => {
    const status = resp.status();
    if (status >= 400) {
      networkErrors.push({ url: resp.url(), status, page: page.url() });
      log(`NETWORK ${status} @ ${page.url()}: ${resp.url()}`);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ url: page.url(), text: 'PAGEERROR: ' + err.message });
    log(`PAGE ERROR @ ${page.url()}: ${err.message}`);
  });

  try {
    log('Navigating to login page');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await shootBoth(page, 'login');

    // Attempt login. Dev-only demo panel has a one-click button containing the admin email
    // (see src/pages/auth/pages.jsx demoAs) - prefer that; fall back to manual fill + Sign in button.
    const demoBtn = page.locator('button:has-text("admin@northhire.ca")').first();
    if (await demoBtn.count() > 0) {
      log('Using dev demo-account button for admin login');
      await demoBtn.click().catch(e => log('demo button click failed: ' + e.message));
    } else {
      log('Demo button not found - falling back to manual email/password fill');
      const emailSel = 'input[type="email"]';
      const passSel = 'input[type="password"]';
      await page.waitForSelector(emailSel, { timeout: 10000 }).catch(() => log('email field not found on login'));
      await page.fill(emailSel, 'admin@northhire.ca').catch(e => log('fill email failed: ' + e.message));
      await page.fill(passSel, 'Admin1234').catch(e => log('fill password failed: ' + e.message));
      const signInBtn = page.locator('button:has-text("Sign in"), button:has-text("Sign In")').first();
      await signInBtn.click().catch(e => log('sign-in click failed: ' + e.message));
    }
    await page.waitForTimeout(2500);
    log(`Post-login URL: ${page.url()}`);
    if (!page.url().includes('/admin')) {
      addFinding({ severity: 'P0', page: 'login', title: 'Admin login did not redirect to /admin console', detail: `Landed at ${page.url()}` });
    }

    for (const [label, route] of PAGES) {
      try {
        log(`Visiting ${route}`);
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(600);
        // check for obvious error boundary / blank page anti-pattern
        const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
        if (!bodyText || bodyText.trim().length < 5) {
          addFinding({ severity: 'P1', page: label, title: 'Page renders blank/empty body', detail: `route=${route}` });
        }
        if (/something went wrong|unexpected error|cannot read prop/i.test(bodyText)) {
          addFinding({ severity: 'P0', page: label, title: 'Error boundary / crash text visible', detail: bodyText.slice(0, 300) });
        }
        await shootBoth(page, label);
      } catch (e) {
        addFinding({ severity: 'P0', page: label, title: 'Navigation/timeout failure', detail: e.message });
      }
    }

    // ---- Deep interaction: Users - suspend with reason ----
    try {
      log('Testing: Users suspend with reason');
      await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);
      const suspendBtn = page.locator('button:has-text("Suspend")').first();
      if (await suspendBtn.count() > 0) {
        await suspendBtn.click();
        await page.waitForTimeout(400);
        const reasonInput = page.locator('textarea, input[name*="reason" i]').first();
        if (await reasonInput.count() > 0) {
          await reasonInput.fill('QA audit test suspension - automated');
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Suspend"), button[type="submit"]').last();
          await confirmBtn.click().catch(() => {});
          await page.waitForTimeout(800);
          const pageText = await page.evaluate(() => document.body.innerText);
          if (!/suspend/i.test(pageText)) {
            addFinding({ severity: 'P1', page: 'users', title: 'Suspend reason/timestamp not visibly reflected after action', detail: 'No "suspend" text found post-action' });
          } else {
            log('Suspend flow appears to reflect state - manual visual check needed via screenshot');
          }
          await page.screenshot({ path: `${SHOT_DIR}/users-suspend-result-desktop.png`, fullPage: true }).catch(() => {});
        } else {
          addFinding({ severity: 'P1', page: 'users', title: 'Suspend action has no reason modal/field', detail: 'Clicked Suspend but no reason input found' });
        }
      } else {
        addFinding({ severity: 'P2', page: 'users', title: 'No Suspend button found on Users page', detail: 'Could not locate any row action labeled Suspend' });
      }
    } catch (e) {
      log('Users suspend test error: ' + e.message);
    }

    // ---- Deep interaction: Employers - verify ----
    try {
      log('Testing: Employers verify evidence panel');
      await page.goto(`${BASE}/admin/employers`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);
      const verifyBtn = page.locator('button:has-text("Verify")').first();
      if (await verifyBtn.count() > 0) {
        await verifyBtn.click();
        await page.waitForTimeout(500);
        const evidenceText = await page.evaluate(() => document.body.innerText);
        if (!/evidence|document|proof/i.test(evidenceText)) {
          addFinding({ severity: 'P1', page: 'employers', title: 'Verification-evidence panel not visible after Verify click', detail: 'No evidence-related text found' });
        }
        await page.screenshot({ path: `${SHOT_DIR}/employers-verify-desktop.png`, fullPage: true }).catch(() => {});
      } else {
        addFinding({ severity: 'P2', page: 'employers', title: 'No Verify button found on Employers page', detail: '' });
      }
    } catch (e) {
      log('Employers verify test error: ' + e.message);
    }

    // ---- Deep interaction: Jobs moderation queue ----
    try {
      log('Testing: Jobs moderation Pending review tab');
      await page.goto(`${BASE}/admin/jobs`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOT_DIR}/jobs-moderation-desktop.png`, fullPage: true }).catch(() => {});
      const pausedTab = page.locator('text=Paused').first();
      if (await pausedTab.count() > 0) {
        await pausedTab.click().catch(() => {});
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SHOT_DIR}/jobs-paused-tab-desktop.png`, fullPage: true }).catch(() => {});
      } else {
        addFinding({ severity: 'P2', page: 'jobs', title: 'No "Paused" tab found in moderation queue', detail: '' });
      }
    } catch (e) {
      log('Jobs moderation test error: ' + e.message);
    }

    // ---- Deep interaction: Settings feature toggle ----
    try {
      log('Testing: Settings feature toggle last-changed-by');
      await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);
      const toggle = page.locator('input[type="checkbox"], [role="switch"]').first();
      if (await toggle.count() > 0) {
        await toggle.click().catch(() => {});
        await page.waitForTimeout(600);
        const text = await page.evaluate(() => document.body.innerText);
        if (!/last changed by|changed by/i.test(text)) {
          addFinding({ severity: 'P1', page: 'settings', title: 'No "Last changed by X" attribution after toggling feature flag', detail: '' });
        }
        await page.screenshot({ path: `${SHOT_DIR}/settings-toggle-desktop.png`, fullPage: true }).catch(() => {});
      } else {
        addFinding({ severity: 'P2', page: 'settings', title: 'No toggle/switch controls found on Settings page', detail: '' });
      }
    } catch (e) {
      log('Settings toggle test error: ' + e.message);
    }

    // ---- Deep interaction: Activity log actor filter ----
    try {
      log('Testing: Activity log actor filter');
      await page.goto(`${BASE}/admin/log`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);
      const filterInput = page.locator('input[placeholder*="actor" i], select[name*="actor" i], input[name*="actor" i]').first();
      if (await filterInput.count() === 0) {
        addFinding({ severity: 'P2', page: 'activity-log', title: 'No actor filter control found on Activity Log', detail: '' });
      }
      await page.screenshot({ path: `${SHOT_DIR}/activity-log-desktop.png`, fullPage: true }).catch(() => {});
    } catch (e) {
      log('Activity log test error: ' + e.message);
    }

    // ---- CSV export checks ----
    for (const [label, route] of [['users', '/admin/users'], ['employers', '/admin/employers'], ['jobs', '/admin/jobs']]) {
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(500);
        const exportBtn = page.locator('button:has-text("Export"), button:has-text("CSV"), a:has-text("Export")').first();
        if (await exportBtn.count() > 0) {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
            exportBtn.click().catch(() => {}),
          ]);
          if (!download) {
            addFinding({ severity: 'P1', page: label, title: 'Export/CSV button click produced no download event', detail: '' });
          } else {
            log(`CSV export triggered for ${label}: ${download.suggestedFilename()}`);
          }
        } else {
          addFinding({ severity: 'P2', page: label, title: 'No Export/CSV button found', detail: '' });
        }
      } catch (e) {
        log(`Export test error for ${label}: ` + e.message);
      }
    }

    // ---- Keyboard nav basic check on home ----
    try {
      await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      log(`Keyboard focus after 2 tabs on /admin: ${focused}`);
    } catch (e) {
      log('Keyboard test error: ' + e.message);
    }

  } catch (e) {
    log('FATAL: ' + e.message);
    addFinding({ severity: 'P0', page: 'global', title: 'Fatal script error', detail: e.message });
  } finally {
    // summarize console/network errors as findings
    const uniqueConsole = [...new Map(consoleErrors.map(c => [c.text, c])).values()];
    for (const c of uniqueConsole.slice(0, 30)) {
      addFinding({ severity: 'P2', page: c.url, title: 'Console error', detail: c.text });
    }
    const uniqueNet = [...new Map(networkErrors.map(n => [n.url + n.status, n])).values()];
    for (const n of uniqueNet.slice(0, 30)) {
      addFinding({ severity: n.status >= 500 ? 'P0' : 'P1', page: n.page, title: `Network ${n.status}`, detail: n.url });
    }
    fs.writeFileSync(FIND_FILE, JSON.stringify(findings, null, 2));
    log(`Done. ${findings.length} findings written to ${FIND_FILE}`);
    await browser.close();
  }
}

main();
