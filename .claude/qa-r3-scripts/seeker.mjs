// Seeker persona QA audit - Playwright script
// Run: node .claude/qa-r3-scripts/seeker.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5173';
const SHOT_DIR = '.claude/qa-screenshots/seeker';
const FINDINGS_FILE = '.claude/qa-r3-findings/seeker.json';
const CONSOLE_LOG = '.claude/qa-r3-findings/seeker-console.log';

fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(FINDINGS_FILE), { recursive: true });

let findings = [];
let findingId = 1;
let logBuf = [];

function appendLog(line) {
  logBuf.push(line);
  if (logBuf.length >= 10) flushLog();
}
function flushLog() {
  if (logBuf.length) {
    fs.appendFileSync(CONSOLE_LOG, logBuf.join('\n') + '\n');
    logBuf = [];
  }
}
function addFinding(f) {
  findings.push({ id: `SK-${String(findingId++).padStart(3, '0')}`, ...f });
  if (findings.length % 5 === 0) flushFindings();
}
function flushFindings() {
  fs.writeFileSync(FINDINGS_FILE, JSON.stringify(findings, null, 2));
}

const seenNetworkErrors = new Set();
const seenConsoleErrors = new Set();
let isLoggedIn = false;
let currentPageName = 'unknown';

function wireLogging(page) {
  page.on('pageerror', (err) => {
    const pageName = currentPageName;
    appendLog(`[PAGEERROR] ${pageName} :: ${err.message}`);
    addFinding({
      severity: 'P1',
      category: 'console-error',
      page: pageName,
      viewport: 'both',
      description: `Uncaught page error: ${err.message}`,
      repro: `Navigate to ${pageName}`,
      fix_hint: 'Check stack trace in seeker-console.log',
      screenshot_ref: null,
    });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const pageName = currentPageName;
      const text = msg.text();
      appendLog(`[CONSOLE ERROR] ${pageName} :: ${text}`);
      if (!/favicon|ResizeObserver loop|401 \(Unauthorized\)/i.test(text)) {
        const key = text.slice(0, 120);
        if (!seenConsoleErrors.has(key)) {
          seenConsoleErrors.add(key);
          addFinding({
            severity: 'P2',
            category: 'console-error',
            page: pageName,
            viewport: 'both',
            description: `Console error (first seen on ${pageName}): ${text.slice(0, 300)}`,
            repro: `Navigate to ${pageName}, open devtools console`,
            fix_hint: 'Investigate source',
            screenshot_ref: null,
          });
        }
      }
    }
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400) {
      const pageName = currentPageName;
      const url = res.url();
      appendLog(`[NETWORK ${status}] ${pageName} :: ${url} (loggedIn=${isLoggedIn})`);
      // Expected 401s from unauthenticated session-check calls are not bugs.
      const isExpectedAuthCheck = !isLoggedIn && status === 401 && /\/api\/(auth|hr)\/me\b/.test(url);
      if (isExpectedAuthCheck) return;
      const key = `${status}:${url.split('?')[0]}:${isLoggedIn}`;
      if (seenNetworkErrors.has(key)) return;
      seenNetworkErrors.add(key);
      addFinding({
        severity: status >= 500 ? 'P1' : 'P2',
        category: 'network-error',
        page: pageName,
        viewport: 'both',
        description: `HTTP ${status} on ${url} (loggedIn=${isLoggedIn}, first seen on ${pageName})`,
        repro: `Load ${pageName}`,
        fix_hint: 'Check API endpoint / auth / route',
        screenshot_ref: null,
      });
    }
  });
}

async function shoot(page, name, viewportLabel) {
  const file = `${SHOT_DIR}/${name}-${viewportLabel}.png`;
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 15000 });
  } catch (e) {
    appendLog(`[SCREENSHOT FAIL] ${name}-${viewportLabel} :: ${e.message}`);
  }
  return `${name}-${viewportLabel}.png`;
}

async function checkHorizontalScroll(page, name, viewportLabel) {
  if (viewportLabel !== 'mobile') return;
  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  if (scrollW > clientW + 2) {
    addFinding({
      severity: 'P2',
      category: 'mobile',
      page: name,
      viewport: viewportLabel,
      description: `Horizontal scroll present: scrollWidth=${scrollW} > clientWidth=${clientW}`,
      repro: `Load ${name} at 390x844`,
      fix_hint: 'Find overflowing element (check width:100vw, fixed px widths, unwrapped flex rows)',
      screenshot_ref: `${name}-${viewportLabel}.png`,
    });
  }
}

async function checkTapTargets(page, name, viewportLabel) {
  if (viewportLabel !== 'mobile') return;
  const small = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a, [role=button], input[type=checkbox], input[type=radio]'));
    const bad = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if ((r.width < 44 || r.height < 44) && r.width > 0 && r.height > 0) {
        bad.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    return bad.slice(0, 8);
  });
  if (small.length) {
    addFinding({
      severity: 'P3',
      category: 'mobile',
      page: name,
      viewport: viewportLabel,
      description: `${small.length} tap target(s) under 44px: ${JSON.stringify(small)}`,
      repro: `Load ${name} at 390x844, inspect listed elements`,
      fix_hint: 'Increase padding/min-height/min-width to 44px for touch targets',
      screenshot_ref: `${name}-${viewportLabel}.png`,
    });
  }
}

async function visitPage(page, url, name, viewportLabel) {
  currentPageName = name;
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 20000 });
  } catch (e) {
    appendLog(`[NAV FAIL] ${name} (${url}) :: ${e.message}`);
    addFinding({
      severity: 'P0',
      category: 'bug',
      page: name,
      viewport: viewportLabel,
      description: `Navigation to ${url} failed/timed out: ${e.message}`,
      repro: `Navigate to ${url}`,
      fix_hint: 'Check route/loading state',
      screenshot_ref: null,
    });
    return false;
  }
  await page.waitForTimeout(400);
  await shoot(page, name, viewportLabel);
  await checkHorizontalScroll(page, name, viewportLabel);
  await checkTapTargets(page, name, viewportLabel);
  return true;
}

const PUBLIC_ROUTES = [
  ['/', 'home-public'],
  ['/employers', 'employers'],
  ['/for-employers', 'for-employers'],
  ['/pricing', 'pricing'],
  ['/resources', 'blogs'],
  ['/trainings', 'trainings'],
  ['/about', 'about'],
  ['/contact', 'contact'],
  ['/privacy', 'privacy'],
  ['/terms', 'terms'],
  ['/accessibility', 'accessibility'],
  ['/how-it-works', 'how-it-works'],
];

const AUTH_ROUTES = [
  ['/login', 'login'],
  ['/signup', 'signup'],
  ['/forgot-password', 'forgot-password'],
];

const SEEKER_ROUTES = [
  ['/', 'home'],
  ['/jobs', 'search'],
  ['/matched', 'matched'],
  ['/saved', 'saved'],
  ['/saved-searches', 'saved-searches'],
  ['/status', 'status'],
  ['/notifications', 'alerts'],
  ['/messages', 'messages'],
  ['/interviews', 'interviews'],
  ['/profile', 'profile'],
  ['/settings', 'settings'],
  ['/account', 'account'],
  ['/cvs', 'cvs'],
];

async function login(page, email, pw) {
  try {
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 20000 });
  } catch (e) {
    appendLog(`[NAV RETRY] login :: ${e.message}`);
    await page.waitForTimeout(1000);
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  }
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', pw);
  const btn = page.locator('button:has-text("Sign in"), button:has-text("Sign In")').first();
  await btn.click();
  await page.waitForTimeout(1500);
  const url = page.url();
  if (url.includes('/login')) {
    addFinding({
      severity: 'P0',
      category: 'bug',
      page: 'login',
      viewport: 'both',
      description: `Login did not redirect away from /login after submitting valid credentials for ${email}`,
      repro: `Go to /login, fill ${email}/password, click Sign in`,
      fix_hint: 'Check auth API response / redirect logic',
      screenshot_ref: null,
    });
    return false;
  }
  isLoggedIn = true;
  return true;
}

(async () => {
  const browser = await chromium.launch();

  for (const viewportLabel of ['desktop', 'mobile']) {
   try {
    isLoggedIn = false;
    const viewport = viewportLabel === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    wireLogging(page);

    // ---- Public pages ----
    for (const [url, name] of PUBLIC_ROUTES) {
      await visitPage(page, url, name, viewportLabel);
    }
    // ---- Auth pages ----
    for (const [url, name] of AUTH_ROUTES) {
      await visitPage(page, url, name, viewportLabel);
    }

    flushFindings();
    flushLog();

    // ---- Login as sarah ----
    let ok = false;
    try {
      ok = await login(page, 'sarah.chen@example.ca', 'Password123');
    } catch (e) {
      appendLog(`[LOGIN FAIL] ${viewportLabel} :: ${e.message}`);
      addFinding({
        severity: 'P0', category: 'bug', page: 'login', viewport: viewportLabel,
        description: `Login flow threw an exception: ${e.message}`,
        repro: 'Go to /login, fill credentials, click Sign in',
        fix_hint: 'Investigate login form/selectors or server error', screenshot_ref: null,
      });
    }
    if (ok) {
      for (const [url, name] of SEEKER_ROUTES) {
        await visitPage(page, url, name, viewportLabel);
      }

      // Dynamic: open a job from search
      try {
        await page.goto(BASE + '/jobs', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const jobCard = page.locator('a[href*="/jobs/"]').first();
        if (await jobCard.count() > 0) {
          await jobCard.click();
          await page.waitForTimeout(800);
          await shoot(page, 'job-detail', viewportLabel);
          await checkHorizontalScroll(page, 'job-detail', viewportLabel);
        } else {
          addFinding({
            severity: 'P1',
            category: 'bug',
            page: 'search',
            viewport: viewportLabel,
            description: 'No job cards with links found on /jobs search results - cannot open job detail',
            repro: 'Login as sarah, go to /jobs',
            fix_hint: 'Check search results rendering / seed data',
            screenshot_ref: `search-${viewportLabel}.png`,
          });
        }
      } catch (e) {
        appendLog(`[FLOW FAIL] job-detail :: ${e.message}`);
      }

      // Dynamic: employer detail via job detail link if present
      try {
        const empLink = page.locator('a[href*="/employers/"]').first();
        if (await empLink.count() > 0) {
          await empLink.click();
          await page.waitForTimeout(800);
          await shoot(page, 'employer-detail', viewportLabel);
        }
      } catch (e) {
        appendLog(`[FLOW FAIL] employer-detail :: ${e.message}`);
      }

      // Apply wizard flow
      try {
        await page.goto(BASE + '/jobs', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const jobCard = page.locator('a[href*="/jobs/"]').first();
        if (await jobCard.count() > 0) {
          await jobCard.click();
          await page.waitForTimeout(800);
          const applyBtn = page.locator('button:has-text("Apply")').first();
          if (await applyBtn.count() > 0) {
            await applyBtn.click();
            await page.waitForTimeout(800);
            await shoot(page, 'apply-1', viewportLabel);
            const curUrl1 = page.url();
            if (!curUrl1.includes('/apply/1')) {
              addFinding({
                severity: 'P2', category: 'bug', page: 'apply1', viewport: viewportLabel,
                description: `Clicking Apply did not navigate to /apply/1 (landed on ${curUrl1})`,
                repro: 'Login, open a job, click Apply', fix_hint: 'Check apply wizard entry routing',
                screenshot_ref: `apply-1-${viewportLabel}.png`,
              });
            }
            const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
            if (await nextBtn.count() > 0) {
              await nextBtn.click();
              await page.waitForTimeout(700);
              await shoot(page, 'apply-2', viewportLabel);
              const nextBtn2 = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Review")').first();
              if (await nextBtn2.count() > 0) {
                await nextBtn2.click();
                await page.waitForTimeout(700);
                await shoot(page, 'apply-3', viewportLabel);
                const submitBtn = page.locator('button:has-text("Submit")').first();
                if (await submitBtn.count() > 0) {
                  await submitBtn.click();
                  await page.waitForTimeout(1000);
                  await shoot(page, 'apply-done', viewportLabel);
                } else {
                  addFinding({
                    severity: 'P2', category: 'ux', page: 'apply3', viewport: viewportLabel,
                    description: 'No Submit button found on apply step 3',
                    repro: 'Complete apply wizard steps 1-2, view step 3',
                    fix_hint: 'Check review/submit step markup', screenshot_ref: `apply-3-${viewportLabel}.png`,
                  });
                }
              }
            } else {
              addFinding({
                severity: 'P2', category: 'bug', page: 'apply1', viewport: viewportLabel,
                description: 'No Next/Continue button found on apply step 1 (may be blocked by validation or missing CV)',
                repro: 'Open apply wizard step 1', fix_hint: 'Check CV picker pre-conditions',
                screenshot_ref: `apply-1-${viewportLabel}.png`,
              });
            }
          } else {
            addFinding({
              severity: 'P2', category: 'ux', page: 'job-detail', viewport: viewportLabel,
              description: 'No visible Apply button on job detail page for logged-in seeker',
              repro: 'Login as sarah, open a job detail page', fix_hint: 'Verify apply CTA visibility / already-applied state',
              screenshot_ref: `job-detail-${viewportLabel}.png`,
            });
          }
        }
      } catch (e) {
        appendLog(`[FLOW FAIL] apply-wizard :: ${e.message}`);
      }

      // CV editor
      try {
        await page.goto(BASE + '/cvs', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const editLink = page.locator('a[href*="/cvs/"][href*="/edit"], button:has-text("Edit")').first();
        if (await editLink.count() > 0) {
          await editLink.click();
          await page.waitForTimeout(800);
          await shoot(page, 'cv-edit', viewportLabel);
        } else {
          addFinding({
            severity: 'P2', category: 'ux', page: 'cvs', viewport: viewportLabel,
            description: 'No edit link/button found on /cvs page to open CV editor',
            repro: 'Login as sarah, go to /cvs', fix_hint: 'Check CV list rendering / seed data',
            screenshot_ref: `cvs-${viewportLabel}.png`,
          });
        }
      } catch (e) {
        appendLog(`[FLOW FAIL] cv-edit :: ${e.message}`);
      }

      // Settings locale toggle
      try {
        await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const frToggle = page.locator('button:has-text("Français"), button:has-text("fr-CA"), [role=switch]').first();
        if (await frToggle.count() > 0) {
          await frToggle.click();
          await page.waitForTimeout(700);
          await shoot(page, 'settings-fr', viewportLabel);
        } else {
          addFinding({
            severity: 'P3', category: 'ux', page: 'settings', viewport: viewportLabel,
            description: 'Could not find an obvious locale toggle control on /settings via generic selectors',
            repro: 'Go to /settings, look for FR/EN toggle', fix_hint: 'Verify selector or manual check needed',
            screenshot_ref: `settings-${viewportLabel}.png`,
          });
        }
      } catch (e) {
        appendLog(`[FLOW FAIL] settings-locale :: ${e.message}`);
      }

      // Keyboard nav on home + search
      try {
        await page.goto(BASE + '/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
        const focusInfo = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          const cs = getComputedStyle(el);
          return { tag: el.tagName, outline: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow };
        });
        if (focusInfo && focusInfo.outline === 'none' && (!focusInfo.boxShadow || focusInfo.boxShadow === 'none')) {
          addFinding({
            severity: 'P2', category: 'a11y', page: 'home', viewport: viewportLabel,
            description: `After 8 Tab presses, focused element (${focusInfo.tag}) has no visible outline or box-shadow focus ring`,
            repro: 'Load /, press Tab 8 times, inspect focused element styles',
            fix_hint: 'Add :focus-visible outline/ring styles', screenshot_ref: null,
          });
        }
        await shoot(page, 'home-keyboard-focus', viewportLabel);
      } catch (e) {
        appendLog(`[FLOW FAIL] keyboard-nav :: ${e.message}`);
      }
    }

    await context.close();
    flushFindings();
    flushLog();
   } catch (e) {
    appendLog(`[VIEWPORT LOOP FAIL] ${viewportLabel} :: ${e.message}`);
    flushFindings();
    flushLog();
   }
  }

  await browser.close();
  flushFindings();
  flushLog();
  console.log(`DONE. ${findings.length} findings written to ${FINDINGS_FILE}`);
})();
