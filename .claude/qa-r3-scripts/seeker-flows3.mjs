import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const SHOT_DIR = '.claude/qa-screenshots/seeker';
const FINDINGS_FILE = '.claude/qa-r3-findings/seeker.json';
let findings = JSON.parse(fs.readFileSync(FINDINGS_FILE, 'utf8'));
let idCounter = findings.length + 1;
function addFinding(f) { findings.push({ id: `SK-${String(idCounter++).padStart(3, '0')}`, ...f }); fs.writeFileSync(FINDINGS_FILE, JSON.stringify(findings, null, 2)); }
async function shoot(page, name) { try { await page.screenshot({ path: `${SHOT_DIR}/${name}-desktop.png`, fullPage: true, timeout: 15000 }); } catch {} }

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'sarah.chen@example.ca');
  await page.fill('input[type=password]', 'Password123');
  await page.locator('button:has-text("Sign in")').first().click();
  await page.waitForTimeout(1200);

  // Find the Frontend Developer job again (from the crashed run) via search box
  await page.goto(BASE + '/jobs?q=Frontend', { waitUntil: 'networkidle' }).catch(async () => {
    await page.goto(BASE + '/jobs', { waitUntil: 'networkidle' });
  });
  await page.waitForTimeout(600);
  let card = page.locator('div[role=button]:has-text("Frontend Developer")').first();
  if (await card.count() === 0) {
    // fallback: use search input
    const searchInput = page.locator('input[type=text], input[type=search]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Frontend Developer');
      await page.waitForTimeout(700);
      card = page.locator('div[role=button]:has-text("Frontend Developer")').first();
    }
  }
  if (await card.count() > 0) {
    await card.click();
    await page.waitForTimeout(700);
    const applyBtn = page.locator('button:has-text("Apply")').first();
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      await page.waitForTimeout(700);
      // dismiss cookie banner if present
      const gotIt = page.locator('button:has-text("Got it")').first();
      if (await gotIt.count() > 0) { await gotIt.click().catch(() => {}); await page.waitForTimeout(300); }
      const next1 = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await next1.count() > 0) { await next1.click(); await page.waitForTimeout(700); }
      await shoot(page, 'apply-2-clean');
      // answer required Yes/Close to it question
      const yesBtn = page.locator('button:has-text("Yes")').first();
      if (await yesBtn.count() > 0) { await yesBtn.click().catch(() => {}); await page.waitForTimeout(400); }
      await shoot(page, 'apply-2-answered');
      const reviewBtn = page.locator('button:has-text("Review application"), button:has-text("Review")').first();
      if (await reviewBtn.count() > 0 && await reviewBtn.isEnabled()) {
        await reviewBtn.click();
        await page.waitForTimeout(700);
        await shoot(page, 'apply-3-review');
        // Try existing CV path
        const submitBtn = page.locator('button:has-text("Submit")').first();
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForTimeout(1200);
          await shoot(page, 'apply-done-final');
          const pd = new URL(page.url()).pathname;
          if (pd !== '/apply/done') {
            addFinding({ severity: 'P2', category: 'bug', page: 'apply3', viewport: 'desktop',
              description: `Submitting a fully completed application did not land on /apply/done (got ${pd})`,
              repro: 'Complete full apply wizard with all required fields answered, click Submit',
              fix_hint: 'Check submit handler / API response / redirect', screenshot_ref: 'apply-done-final-desktop.png' });
          } else {
            console.log('APPLY FLOW SUCCEEDED end to end');
          }
        } else {
          addFinding({ severity: 'P2', category: 'ux', page: 'apply3', viewport: 'desktop',
            description: 'No Submit button visible on review step even after answering all required questions',
            repro: 'Complete apply wizard steps 1-2, view review step', fix_hint: 'Check review step markup',
            screenshot_ref: 'apply-3-review-desktop.png' });
        }
      } else {
        addFinding({ severity: 'P2', category: 'bug', page: 'apply2', viewport: 'desktop',
          description: 'Review application button still disabled after answering the visible required question - possibly another hidden/required field remains unanswered',
          repro: 'Answer the Yes/Close-to-it question on step 2, check Review application button state',
          fix_hint: 'Check which field is still unset; ensure validation errors are surfaced to the user', screenshot_ref: 'apply-2-answered-desktop.png' });
      }
    }
  } else {
    addFinding({ severity: 'P2', category: 'bug', page: 'search', viewport: 'desktop',
      description: 'Could not re-locate the "Frontend Developer" job via search to retry the apply flow after the cookie-banner blocker',
      repro: 'Search for Frontend Developer on /jobs', fix_hint: 'n/a - script limitation, verify manually', screenshot_ref: null });
  }

  // CV editor check
  await page.goto(BASE + '/cvs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shoot(page, 'cvs-final');
  const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(800);
    await shoot(page, 'cv-edit-final');
  } else {
    addFinding({ severity: 'P2', category: 'ux', page: 'cvs', viewport: 'desktop',
      description: 'No "Edit" control found on /cvs page (English locale, second attempt)',
      repro: 'Login, go to /cvs', fix_hint: 'Check CV list rendering / seed data for this account', screenshot_ref: 'cvs-final-desktop.png' });
  }

  await browser.close();
})();
