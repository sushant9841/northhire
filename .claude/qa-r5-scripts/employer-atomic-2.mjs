// Employer atomic audit — extended (pass 2)
// Adds finer atomic checks per page and appends to employer-atomic.json.
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const FINDINGS_FILE = '.claude/qa-r5-findings/employer-atomic.json';
const CONSOLE_LOG = '.claude/qa-r5-findings/employer-console.log';

let findings = JSON.parse(fs.readFileSync(FINDINGS_FILE, 'utf8'));
let fid = findings.length + 1;
function add(f) {
  findings.push({ id: `EMP-${String(fid++).padStart(3,'0')}`, ...f });
  if (findings.length % 8 === 0) fs.writeFileSync(FINDINGS_FILE, JSON.stringify(findings,null,2));
}
function log(s){ try{fs.appendFileSync(CONSOLE_LOG,s+'\n');}catch{} }

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(500);
  await page.fill('input[type=email]', 'hr@pcl.com');
  await page.fill('input[type=password]', 'Employer123');
  await page.locator('button:has-text("Sign in")').first().click();
  await page.waitForTimeout(1800);
  return !page.url().includes('/login');
}

const PAGES = [
  ['/employer', 'dashboard'],
  ['/employer/jobs', 'jobs'],
  ['/employer/jobs/new', 'post-step1'],
  ['/employer/pipeline', 'pipeline'],
  ['/messages', 'messages'],
  ['/interviews', 'interviews'],
  ['/employer/analytics', 'analytics'],
  ['/employer/api', 'api'],
  ['/employer/sso', 'sso'],
  ['/employer/company', 'company'],
  ['/employer/team', 'team'],
  ['/employer/billing', 'billing'],
  ['/employer/content', 'content'],
  ['/employer/content/articles', 'content-articles'],
  ['/employer/content/trainings', 'content-trainings'],
  ['/employer/staffing', 'staffing'],
  ['/employer/staffing/requests', 'staffing-requests'],
  ['/employer/staffing/assignments', 'staffing-assignments'],
  ['/employer/staffing/timesheets', 'staffing-timesheets'],
  ['/employer/staffing/invoices', 'staffing-invoices'],
  ['/hr/integrations', 'hr-integrations'],
  ['/employers/e1', 'public-profile'],
];

async function atomicChecks(page, name, vp, shotRef) {
  const r = await page.evaluate(() => {
    const results = {};
    // 1. Images without alt
    const imgs = Array.from(document.querySelectorAll('img'));
    results.imgsNoAlt = imgs.filter(i => !i.hasAttribute('alt') || (i.alt === '' && !i.hasAttribute('aria-hidden'))).length;
    results.imgCount = imgs.length;
    // 2. Form inputs without label / aria-label
    const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea'));
    const unlabeled = inputs.filter(i => {
      if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.getAttribute('title')) return false;
      if (i.id && document.querySelector(`label[for="${CSS.escape(i.id)}"]`)) return false;
      if (i.closest('label')) return false;
      if (i.getAttribute('placeholder')) return 'placeholder-only';
      return true;
    });
    results.unlabeledInputs = unlabeled.length;
    results.placeholderOnly = inputs.filter(i => {
      if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby')) return false;
      if (i.id && document.querySelector(`label[for="${CSS.escape(i.id)}"]`)) return false;
      if (i.closest('label')) return false;
      return !!i.getAttribute('placeholder');
    }).length;
    // 3. Multiple primary CTAs? (>1 solid button in hero)
    const bigButtons = Array.from(document.querySelectorAll('button, a[role=button], a.btn')).filter(b => {
      const rect = b.getBoundingClientRect();
      const bg = getComputedStyle(b).backgroundColor;
      return rect.width >= 100 && rect.height >= 36 && rect.top < 800 && bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    });
    results.bigButtons = bigButtons.length;
    // 4. Heading order breaks (h3 before h2 etc)
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => parseInt(h.tagName[1]));
    let breaks = 0;
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i-1] + 1) breaks++;
    }
    results.headingBreaks = breaks;
    results.h1Count = document.querySelectorAll('h1').length;
    // 5. Tables — sortable? empty state? pagination?
    const tables = Array.from(document.querySelectorAll('table'));
    results.tableCount = tables.length;
    results.sortableTables = tables.filter(t => t.querySelector('button[aria-sort], th[aria-sort], th button')).length;
    results.emptyTables = tables.filter(t => t.querySelectorAll('tbody tr').length === 0).length;
    // 6. Empty-state copy heuristic
    const body = document.body.innerText || '';
    results.hasEmptyStateCopy = /(no .* yet|nothing here|get started|invite your first|post your first|no results|no matches)/i.test(body);
    results.bodyLen = body.length;
    // 7. Loading spinners still visible (stuck)
    results.spinners = document.querySelectorAll('[role=progressbar], [class*=spinner i], [class*=loading i][aria-busy]').length;
    // 8. Generic link/button text
    const genericTexts = ['Learn more','Click here','Read more','See more','View more'];
    const genericCounts = {};
    Array.from(document.querySelectorAll('button, a')).forEach(b => {
      const t = (b.innerText||'').trim();
      if (genericTexts.includes(t)) genericCounts[t] = (genericCounts[t]||0)+1;
    });
    results.genericTexts = Object.entries(genericCounts).filter(([,n])=>n>=3);
    // 9. Focus-visible outlines removed globally?
    const bodyStyle = getComputedStyle(document.body);
    results.bodyOutline = bodyStyle.outlineWidth;
    // 10. Modals present — do they trap? (heuristic: dialog role with tabindex)
    const dialogs = document.querySelectorAll('[role=dialog], dialog[open]');
    results.dialogCount = dialogs.length;
    // 11. Fonts too bold: count large text with font-weight >= 700
    const bigBold = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,div')).filter(el => {
      if (el.children.length > 0) return false;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize) || 0;
      const w = parseInt(cs.fontWeight) || 400;
      return size >= 24 && w >= 700;
    }).length;
    results.bigBold = bigBold;
    // 12. Sticky elements
    results.stickyEls = Array.from(document.querySelectorAll('*')).filter(el => {
      const p = getComputedStyle(el).position;
      return p === 'sticky' || p === 'fixed';
    }).length;
    return results;
  }).catch(e=>({err: e.message}));

  if (r.err) return;

  if (r.imgsNoAlt > 0) add({
    severity: 'P2', category: 'a11y', page: name, viewport: vp,
    description: `${r.imgsNoAlt}/${r.imgCount} <img> lack alt text`,
    repro: `Load ${name}, inspect images`, fix_hint: 'Add alt="" for decorative, meaningful alt for informative',
    screenshot_ref: shotRef,
  });
  if (r.unlabeledInputs > 0) add({
    severity: 'P2', category: 'a11y', page: name, viewport: vp,
    description: `${r.unlabeledInputs} form input(s) with no <label>/aria-label/title`,
    repro: `Load ${name}, inspect inputs`, fix_hint: 'Attach a <label for> or aria-label',
    screenshot_ref: shotRef,
  });
  if (r.placeholderOnly >= 3) add({
    severity: 'P3', category: 'a11y', page: name, viewport: vp,
    description: `${r.placeholderOnly} input(s) rely on placeholder as label`,
    repro: `Load ${name}, inspect inputs`, fix_hint: 'Placeholder is not a label; add visible label above',
    screenshot_ref: shotRef,
  });
  if (r.h1Count === 0) add({
    severity: 'P2', category: 'seo', page: name, viewport: vp,
    description: `No <h1> on ${name}`,
    repro: `Load ${name}, run document.querySelectorAll('h1').length`,
    fix_hint: 'Every page needs exactly one h1', screenshot_ref: shotRef,
  });
  if (r.h1Count > 1) add({
    severity: 'P3', category: 'seo', page: name, viewport: vp,
    description: `${r.h1Count} <h1> on ${name} (should be 1)`,
    repro: `Load ${name}`, fix_hint: 'Demote all but one to h2', screenshot_ref: shotRef,
  });
  if (r.headingBreaks >= 2) add({
    severity: 'P3', category: 'a11y', page: name, viewport: vp,
    description: `${r.headingBreaks} heading-order jump(s) on ${name} (skip levels)`,
    repro: `Load ${name}, inspect heading sequence`, fix_hint: 'Never skip heading levels', screenshot_ref: shotRef,
  });
  if (r.tableCount > 0 && r.sortableTables === 0) add({
    severity: 'P2', category: 'ux', page: name, viewport: vp,
    description: `${r.tableCount} table(s) on ${name} but none sortable`,
    repro: `Load ${name}`, fix_hint: 'Add column-header sort for data tables (jobs, candidates, invoices)', screenshot_ref: shotRef,
  });
  if (r.tableCount > 0 && r.emptyTables > 0 && !r.hasEmptyStateCopy) add({
    severity: 'P2', category: 'ux', page: name, viewport: vp,
    description: `${r.emptyTables} empty table(s) on ${name} with no empty-state copy`,
    repro: `Load ${name}`, fix_hint: 'Add empty-state row with icon + explanation + primary CTA', screenshot_ref: shotRef,
  });
  if (r.genericTexts.length) add({
    severity: 'P3', category: 'content', page: name, viewport: vp,
    description: `Repeated generic link text on ${name}: ${JSON.stringify(r.genericTexts)}`,
    repro: `Load ${name}`, fix_hint: 'Use descriptive labels ("View invoice", "See timesheet detail")', screenshot_ref: shotRef,
  });
  if (r.bigBold >= 10) add({
    severity: 'P3', category: 'ui', page: name, viewport: vp,
    description: `${r.bigBold} large-text elements at font-weight ≥700 on ${name}`,
    repro: `Load ${name}`, fix_hint: 'Reduce weight on secondary large text to 500-600 for hierarchy', screenshot_ref: shotRef,
  });
  if (r.spinners >= 2) add({
    severity: 'P2', category: 'bug', page: name, viewport: vp,
    description: `${r.spinners} loading spinners still visible after settle on ${name}`,
    repro: `Load ${name}, wait 700ms`, fix_hint: 'Data fetch may be hanging or spinner not being cleared', screenshot_ref: shotRef,
  });
  if (r.bigButtons >= 4) add({
    severity: 'P3', category: 'ui', page: name, viewport: vp,
    description: `${r.bigButtons} filled/large buttons above the fold on ${name} — competing CTAs`,
    repro: `Load ${name}`, fix_hint: 'One primary CTA per view; demote others to ghost/link', screenshot_ref: shotRef,
  });
  if (r.bodyLen < 400) add({
    severity: 'P1', category: 'bug', page: name, viewport: vp,
    description: `Very thin content on ${name} (bodyLen=${r.bodyLen}) — page may be empty or data missing`,
    repro: `Load ${name}`, fix_hint: 'Verify data loads or add rich empty-state', screenshot_ref: shotRef,
  });
  if (r.stickyEls === 0 && (name==='pipeline' || name==='jobs')) add({
    severity: 'P3', category: 'ux', page: name, viewport: vp,
    description: `${name} has no sticky header/toolbar — filters scroll away with content`,
    repro: `Load ${name}, scroll`, fix_hint: 'Consider sticky filter/toolbar for long tables', screenshot_ref: shotRef,
  });
}

// Post-wizard field-level checks
async function postWizardChecks(page, vp) {
  await page.goto(BASE + '/employer/jobs/new', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const body = document.body.innerText || '';
    return {
      hasStepIndicator: /step\s*1|1\s*of\s*\d|1\/\d/i.test(body) || document.querySelectorAll('[aria-current=step], nav ol li').length >= 2,
      hasAutosave: /(saved|auto[- ]?sav|draft saved)/i.test(body),
      hasPreview: /preview/i.test(body),
      hasAI: /(ai|assist|generate|help me write)/i.test(body),
      requiredMarkers: document.querySelectorAll('[required], [aria-required=true]').length,
      inputCount: document.querySelectorAll('input, textarea, select').length,
    };
  }).catch(()=>({}));
  const shotRef = `audit-r5-post-step1-${vp}.png`;
  if (!r.hasStepIndicator) add({
    severity: 'P2', category: 'ux', page: 'post-step1', viewport: vp,
    description: 'Post wizard has no visible step indicator (e.g. "Step 1 of 4")',
    repro: '/employer/jobs/new', fix_hint: 'Show progress: 1 of 4 with labels', screenshot_ref: shotRef,
  });
  if (!r.hasAutosave) add({
    severity: 'P2', category: 'ux', page: 'post-step1', viewport: vp,
    description: 'No visible autosave indicator on post wizard — user cannot tell if draft is safe',
    repro: '/employer/jobs/new, type in a field', fix_hint: 'Show "Draft saved · 2s ago" after any change', screenshot_ref: shotRef,
  });
  if (!r.hasPreview) add({
    severity: 'P3', category: 'ux', page: 'post-step1', viewport: vp,
    description: 'No preview affordance on post wizard',
    repro: '/employer/jobs/new', fix_hint: 'Add "Preview as candidate" side-by-side or modal', screenshot_ref: shotRef,
  });
  if (!r.hasAI) add({
    severity: 'P3', category: 'feature', page: 'post-step1', viewport: vp,
    description: 'No AI-assist affordance on post wizard',
    repro: '/employer/jobs/new', fix_hint: 'Offer "Generate description from title/company" to reduce blank-page paralysis', screenshot_ref: shotRef,
  });
  if (r.inputCount > 0 && r.requiredMarkers === 0) add({
    severity: 'P2', category: 'a11y', page: 'post-step1', viewport: vp,
    description: `${r.inputCount} fields but 0 marked [required] / aria-required`,
    repro: '/employer/jobs/new', fix_hint: 'Mark mandatory fields programmatically for AT + validation', screenshot_ref: shotRef,
  });
}

// Analytics field-level (y-axis, tooltip, trend arrows)
async function analyticsChecks(page, vp) {
  await page.goto(BASE + '/employer/analytics', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const body = document.body.innerText || '';
    return {
      recharts: document.querySelectorAll('.recharts-wrapper, .recharts-surface').length,
      yAxis: document.querySelectorAll('.recharts-yAxis, .yAxis, g[class*=y-axis]').length,
      xAxis: document.querySelectorAll('.recharts-xAxis, .xAxis, g[class*=x-axis]').length,
      tooltipHint: /hover|drag to select|click a bar/i.test(body),
      trendArrows: /[▲▼↑↓]/.test(body) || document.querySelectorAll('[class*=trend i] svg, [aria-label*=trend i]').length,
      dateRange: /(last 7 days|last 30 days|this month|date range|custom range)/i.test(body),
      exportBtn: /(export|download.*csv|download.*pdf)/i.test(body),
    };
  }).catch(()=>({}));
  const shotRef = `audit-r5-analytics-${vp}.png`;
  if (r.recharts > 0 && r.yAxis === 0) add({
    severity: 'P2', category: 'ux', page: 'analytics', viewport: vp,
    description: 'Recharts present but no y-axis rendered — magnitudes unreadable',
    repro: '/employer/analytics', fix_hint: 'Add <YAxis /> with tick formatter', screenshot_ref: shotRef,
  });
  if (!r.dateRange) add({
    severity: 'P2', category: 'ux', page: 'analytics', viewport: vp,
    description: 'No date-range selector on analytics',
    repro: '/employer/analytics', fix_hint: 'Add 7d/30d/90d/custom range control', screenshot_ref: shotRef,
  });
  if (!r.exportBtn) add({
    severity: 'P3', category: 'ux', page: 'analytics', viewport: vp,
    description: 'No CSV/PDF export on analytics',
    repro: '/employer/analytics', fix_hint: 'Export drives adoption in enterprise; add download button', screenshot_ref: shotRef,
  });
  if (!r.trendArrows) add({
    severity: 'P3', category: 'ui', page: 'analytics', viewport: vp,
    description: 'No trend arrows/deltas on analytics metrics',
    repro: '/employer/analytics', fix_hint: 'Show week-over-week ▲/▼ delta with color', screenshot_ref: shotRef,
  });
}

// Pipeline drag interaction
async function pipelineDragCheck(page, vp) {
  if (vp !== 'desktop') return;
  await page.goto(BASE + '/employer/pipeline', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const draggables = document.querySelectorAll('[draggable=true], [data-rbd-draggable-id], [aria-roledescription*=drag i]').length;
    return { draggables };
  }).catch(()=>({}));
  const shotRef = 'audit-r5-pipeline-desktop.png';
  if (r.draggables === 0) add({
    severity: 'P2', category: 'feature', page: 'pipeline', viewport: 'desktop',
    description: 'No draggable candidate cards on kanban (0 [draggable=true] / dnd markers)',
    repro: '/employer/pipeline as PCL', fix_hint: 'Wire dnd-kit / rbd on cards so recruiters can move candidates between stages', screenshot_ref: shotRef,
  });
}

(async () => {
  const browser = await chromium.launch();
  const started = Date.now();
  for (const vp of ['desktop','mobile']) {
    if (Date.now() - started > 30*60*1000) break;
    const viewport = vp === 'desktop' ? {width:1440,height:900} : {width:390,height:844};
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    page.on('pageerror', e => log(`[pageerr ${vp}] ${e.message}`));
    const ok = await login(page);
    if (!ok) { log(`[login fail pass2] ${vp}`); await ctx.close(); continue; }
    for (const [url, name] of PAGES) {
      try {
        await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(600);
        const shotRef = `audit-r5-${name}-${vp}.png`;
        await atomicChecks(page, name, vp, shotRef);
      } catch (e) { log(`[visit fail pass2] ${name} ${vp} :: ${e.message}`); }
    }
    try { await postWizardChecks(page, vp); } catch (e) { log('pw '+e.message); }
    try { await analyticsChecks(page, vp); } catch (e) { log('an '+e.message); }
    try { await pipelineDragCheck(page, vp); } catch (e) { log('pd '+e.message); }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(FINDINGS_FILE, JSON.stringify(findings, null, 2));
  console.log(`[done pass2] total findings=${findings.length}, elapsed=${Math.round((Date.now()-started)/1000)}s`);
})().catch(e => { console.error('FATAL', e); fs.writeFileSync(FINDINGS_FILE, JSON.stringify(findings,null,2)); process.exit(1); });
