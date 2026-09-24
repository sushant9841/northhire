// Follow-up: interactive flows requiring role=button card clicks (Card primitive has no <a href>).
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const SHOT_DIR = '.claude/qa-screenshots/seeker';
const FINDINGS_FILE = '.claude/qa-r3-findings/seeker.json';
const CONSOLE_LOG = '.claude/qa-r3-findings/seeker-console.log';

let findings = JSON.parse(fs.readFileSync(FINDINGS_FILE, 'utf8'));
let idCounter = findings.length + 1;
function addFinding(f) {
  findings.push({ id: `SK-${String(idCounter++).padStart(3, '0')}`, ...f });
  fs.writeFileSync(FINDINGS_FILE, JSON.stringify(findings, null, 2));
}
function log(line) { fs.appendFileSync(CONSOLE_LOG, line + '\n'); }

async function shoot(page, name, vp) {
  try { await page.screenshot({ path: `${SHOT_DIR}/${name}-${vp}.png`, fullPage: true, timeout: 15000 }); }
  catch (e) { log(`[SCREENSHOT FAIL] ${name}-${vp} :: ${e.message}`); }
}

async function run(vp) {
  const browser = await chromium.launch();
  const viewport = vp === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('pageerror', e => log(`[PAGEERROR] flows-${vp} :: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') log(`[CONSOLE ERROR] flows-${vp} :: ${m.text()}`); });
  page.on('response', r => { if (r.status() >= 400) log(`[NETWORK ${r.status()}] flows-${vp} :: ${r.url()}`); });

  // Login
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'sarah.chen@example.ca');
  await page.fill('input[type=password]', 'Password123');
  await page.locator('button:has-text("Sign in")').first().click();
  await page.waitForTimeout(1200);
  if (page.url().includes('/login')) {
    addFinding({ severity: 'P0', category: 'bug', page: 'login', viewport: vp,
      description: 'Follow-up script: login failed even with corrected .ca email',
      repro: 'Login sarah.chen@example.ca/Password123', fix_hint: 'n/a', screenshot_ref: null });
    await browser.close(); return;
  }

  // Search + open job via role=button card
  await page.goto(BASE + '/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const cards = page.locator('div[role=button]');
  const cardCount = await cards.count();
  log(`[INFO] flows-${vp} :: found ${cardCount} role=button divs on /jobs`);
  if (cardCount === 0) {
    addFinding({ severity: 'P1', category: 'bug', page: 'search', viewport: vp,
      description: 'No role=button job cards found on /jobs at all (search may be returning zero results)',
      repro: 'Login, go to /jobs', fix_hint: 'Check seed data / search default filters', screenshot_ref: `search-${vp}.png` });
  } else {
    // job cards are usually the ones with a $ pay chip; just click the first one and confirm nav to /jobs/:id
    await cards.first().click();
    await page.waitForTimeout(900);
    await shoot(page, 'job-detail', vp);
    if (!/\/jobs\/[^/]+$/.test(new URL(page.url()).pathname)) {
      addFinding({ severity: 'P2', category: 'bug', page: 'search', viewport: vp,
        description: `Clicking first job card did not land on /jobs/:id (landed on ${page.url()})`,
        repro: 'Login, go to /jobs, click first job card', fix_hint: 'Check card onClick routing',
        screenshot_ref: `job-detail-${vp}.png` });
    } else {
      // Check for real <a> semantics - a11y/SEO finding (only record once, on desktop)
      if (vp === 'desktop') {
        addFinding({ severity: 'P3', category: 'a11y', page: 'search', viewport: 'both',
          description: 'Job cards are div[role=button] (JS-click only), not real <a href> links - cannot middle-click/ctrl-click to open in new tab, not crawlable, and screen readers announce as generic button rather than link to a job posting',
          repro: 'Login, go to /jobs, try middle-clicking a job card to open in a new tab',
          fix_hint: 'Consider wrapping card content in an <a href={jobUrl}> with onClick preventDefault for the enhanced nav, or use a real anchor as the outer element',
          screenshot_ref: `search-${vp}.png` });
      }

      // Apply wizard
      const applyBtn = page.locator('button:has-text("Apply")').first();
      if (await applyBtn.count() > 0) {
        await applyBtn.click();
        await page.waitForTimeout(800);
        await shoot(page, 'apply-1', vp);
        const p1 = new URL(page.url()).pathname;
        if (p1 !== '/apply/1') {
          addFinding({ severity: 'P2', category: 'bug', page: 'apply1', viewport: vp,
            description: `Apply button did not navigate to /apply/1 (got ${p1})`,
            repro: 'Open job detail, click Apply', fix_hint: 'Check apply entry routing', screenshot_ref: `apply-1-${vp}.png` });
        }
        const next1 = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
        if (await next1.count() > 0) {
          await next1.click();
          await page.waitForTimeout(700);
          await shoot(page, 'apply-2', vp);
          const next2 = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Review")').first();
          if (await next2.count() > 0) {
            await next2.click();
            await page.waitForTimeout(700);
            await shoot(page, 'apply-3', vp);
            const submit = page.locator('button:has-text("Submit")').first();
            if (await submit.count() > 0) {
              await submit.click();
              await page.waitForTimeout(1200);
              await shoot(page, 'apply-done', vp);
              const pd = new URL(page.url()).pathname;
              if (pd !== '/apply/done') {
                addFinding({ severity: 'P2', category: 'bug', page: 'apply3', viewport: vp,
                  description: `Submitting application did not land on /apply/done (got ${pd})`,
                  repro: 'Complete apply wizard and submit', fix_hint: 'Check submit handler / redirect',
                  screenshot_ref: `apply-done-${vp}.png` });
              }
            } else {
              addFinding({ severity: 'P2', category: 'ux', page: 'apply3', viewport: vp,
                description: 'No Submit button found on apply step 3 (review step)',
                repro: 'Reach apply step 3', fix_hint: 'Check review step markup', screenshot_ref: `apply-3-${vp}.png` });
            }
          } else {
            addFinding({ severity: 'P2', category: 'bug', page: 'apply2', viewport: vp,
              description: 'No Next/Continue/Review button found on apply step 2',
              repro: 'Reach apply step 2', fix_hint: 'Check step 2 validation/markup', screenshot_ref: `apply-2-${vp}.png` });
          }
        } else {
          addFinding({ severity: 'P2', category: 'bug', page: 'apply1', viewport: vp,
            description: 'No Next/Continue button found on apply step 1 (possibly blocked awaiting CV selection)',
            repro: 'Reach apply step 1', fix_hint: 'Check CV picker gating', screenshot_ref: `apply-1-${vp}.png` });
        }
      } else {
        addFinding({ severity: 'P2', category: 'ux', page: 'job-detail', viewport: vp,
          description: 'No visible "Apply" button text found on job detail page for logged-in seeker (may already be applied, or button labeled differently)',
          repro: 'Login, open a job detail page', fix_hint: 'Verify apply CTA / already-applied state copy',
          screenshot_ref: `job-detail-${vp}.png` });
      }
    }
  }

  // Employer detail: go back to search, try to find an employer link/card
  await page.goto(BASE + '/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await cards.first().click().catch(() => {});
  await page.waitForTimeout(700);
  const empLink = page.locator('a[href*="/employers/"], div[role=button]:has-text("View company")').first();
  if (await empLink.count() > 0) {
    await empLink.click().catch(() => {});
    await page.waitForTimeout(700);
    await shoot(page, 'employer-detail', vp);
  }

  // CV editor
  await page.goto(BASE + '/cvs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shoot(page, 'cvs', vp);
  const editCtl = page.locator('button:has-text("Edit"), div[role=button]').first();
  if (await editCtl.count() > 0) {
    await editCtl.click().catch(() => {});
    await page.waitForTimeout(800);
    await shoot(page, 'cv-edit', vp);
  } else {
    addFinding({ severity: 'P2', category: 'ux', page: 'cvs', viewport: vp,
      description: 'No clickable CV row/edit control found on /cvs',
      repro: 'Login, go to /cvs', fix_hint: 'Check CV list rendering / seed data', screenshot_ref: `cvs-${vp}.png` });
  }

  // Settings locale toggle
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shoot(page, 'settings', vp);
  const frToggle = page.locator('button:has-text("Français"), button:has-text("French"), [role=switch]').first();
  if (await frToggle.count() > 0) {
    await frToggle.click().catch(() => {});
    await page.waitForTimeout(700);
    await shoot(page, 'settings-fr', vp);
  } else {
    addFinding({ severity: 'P3', category: 'ux', page: 'settings', viewport: vp,
      description: 'Could not find an obvious FR/EN locale toggle on /settings via generic text selectors (manual check needed)',
      repro: 'Go to /settings', fix_hint: 'n/a - selector limitation, verify manually', screenshot_ref: `settings-${vp}.png` });
  }

  // Status page
  await page.goto(BASE + '/status', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shoot(page, 'status', vp);

  await browser.close();
}

(async () => {
  await run('desktop');
  await run('mobile');
  console.log('flows done');
})();
