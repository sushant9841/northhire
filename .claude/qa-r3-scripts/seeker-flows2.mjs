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
function log(l) { fs.appendFileSync(CONSOLE_LOG, l + '\n'); }
async function shoot(page, name, vp) {
  try { await page.screenshot({ path: `${SHOT_DIR}/${name}-${vp}.png`, fullPage: true, timeout: 15000 }); }
  catch (e) { log(`[SCREENSHOT FAIL] ${name}-${vp} :: ${e.message}`); }
}

(async () => {
  const vp = 'desktop';
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', e => log(`[PAGEERROR] flows2 :: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') log(`[CONSOLE ERROR] flows2 :: ${m.text()}`); });
  page.on('response', r => { if (r.status() >= 400) log(`[NETWORK ${r.status()}] flows2 :: ${r.url()}`); });

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'sarah.chen@example.ca');
  await page.fill('input[type=password]', 'Password123');
  await page.locator('button:has-text("Sign in")').first().click();
  await page.waitForTimeout(1200);

  // Look through multiple job cards to find one that's NOT closed, to test a real apply flow
  await page.goto(BASE + '/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const cards = page.locator('div[role=button]');
  const n = await cards.count();
  let appliedFlow = false;
  let closedJobSeen = false;
  for (let i = 0; i < Math.min(n, 12) && !appliedFlow; i++) {
    const card = cards.nth(i);
    const text = (await card.innerText().catch(() => '')) || '';
    if (!/\$|per hour|per year|\/yr|\/hr/i.test(text)) continue; // skip non job cards (filters etc.)
    await card.click();
    await page.waitForTimeout(700);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const isClosed = /\bClosed\b/i.test(bodyText);
    if (isClosed) { closedJobSeen = true; }
    const applyBtn = page.locator('button:has-text("Apply")').first();
    if (await applyBtn.count() > 0 && !isClosed) {
      await shoot(page, 'job-detail-open', vp);
      await applyBtn.click();
      await page.waitForTimeout(800);
      appliedFlow = true;
      await shoot(page, 'apply-1', vp);
      const p1 = new URL(page.url()).pathname;
      if (p1 !== '/apply/1') {
        addFinding({ severity: 'P2', category: 'bug', page: 'apply1', viewport: vp,
          description: `Apply button did not navigate to /apply/1 (got ${p1})`,
          repro: 'Open an open (non-closed) job, click Apply', fix_hint: 'Check apply entry routing', screenshot_ref: 'apply-1-desktop.png' });
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
                repro: 'Complete apply wizard and submit', fix_hint: 'Check submit handler / redirect', screenshot_ref: 'apply-done-desktop.png' });
            }
          } else {
            addFinding({ severity: 'P2', category: 'ux', page: 'apply3', viewport: vp,
              description: 'No Submit button found on apply step 3 (review step)', repro: 'Reach apply step 3',
              fix_hint: 'Check review step markup', screenshot_ref: 'apply-3-desktop.png' });
          }
        } else {
          addFinding({ severity: 'P2', category: 'bug', page: 'apply2', viewport: vp,
            description: 'No Next/Continue/Review button on apply step 2', repro: 'Reach apply step 2',
            fix_hint: 'Check step 2 validation', screenshot_ref: 'apply-2-desktop.png' });
        }
      } else {
        addFinding({ severity: 'P2', category: 'bug', page: 'apply1', viewport: vp,
          description: 'No Next/Continue button on apply step 1', repro: 'Reach apply step 1',
          fix_hint: 'Check CV picker gating', screenshot_ref: 'apply-1-desktop.png' });
      }
    } else {
      await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(400);
    }
  }
  if (!appliedFlow) {
    addFinding({ severity: 'P1', category: 'bug', page: 'search', viewport: vp,
      description: `Could not find any open (non-Closed) job with a working Apply CTA among first ${Math.min(n,12)} search results to test the apply wizard`,
      repro: 'Login, browse /jobs results, look for a job with active Apply button', fix_hint: 'Check seed data freshness / closed-job ratio',
      screenshot_ref: null });
  }
  if (closedJobSeen) {
    // verify: does a Closed job still show an active Apply CTA?
    await page.goto(BASE + '/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    for (let i = 0; i < Math.min(n, 12); i++) {
      const card = cards.nth(i);
      const text = (await card.innerText().catch(() => '')) || '';
      if (!/\$|per hour|per year/i.test(text)) continue;
      await card.click();
      await page.waitForTimeout(600);
      const bodyText = await page.locator('body').innerText().catch(() => '');
      if (/\bClosed\b/i.test(bodyText)) {
        const applyBtn = page.locator('button:has-text("Apply")').first();
        const applyEnabled = await applyBtn.count() > 0 && await applyBtn.isEnabled().catch(() => false);
        await shoot(page, 'job-detail-closed', vp);
        if (applyEnabled) {
          addFinding({ severity: 'P1', category: 'bug', page: 'job-detail', viewport: vp,
            description: 'Job posting marked "Closed" still shows a fully enabled "Apply" CTA - a seeker can submit an application to a closed/expired posting with no warning (broken pre-check anti-pattern)',
            repro: 'Login, open a job detail page for a posting tagged Closed, observe the Apply button is not disabled/hidden',
            fix_hint: 'Disable the Apply CTA (or replace with a "This posting is closed" state) when job.status/closed is true',
            screenshot_ref: 'job-detail-closed-desktop.png' });
        }
        break;
      }
      await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  // CV editor with English labels now
  await page.goto(BASE + '/cvs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shoot(page, 'cvs-en', vp);
  const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(800);
    await shoot(page, 'cv-edit-en', vp);
  } else {
    addFinding({ severity: 'P2', category: 'ux', page: 'cvs', viewport: vp,
      description: 'No "Edit" button/link found on /cvs in English locale either',
      repro: 'Login, go to /cvs (English locale)', fix_hint: 'Check CV list markup / seed CV existence', screenshot_ref: 'cvs-en-desktop.png' });
  }

  await browser.close();
  console.log('flows2 done, appliedFlow=', appliedFlow, 'closedJobSeen=', closedJobSeen);
})();
