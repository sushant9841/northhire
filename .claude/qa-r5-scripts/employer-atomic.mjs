// Employer atomic UI/UX audit - QA r5
// Run: node .claude/qa-r5-scripts/employer-atomic.mjs
// Full-page screenshots ONLY. Never overwrites (audit-r5-* prefix).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5173';
const SHOT_DIR = '.claude/qa-screenshots/employer';
const FINDINGS_FILE = '.claude/qa-r5-findings/employer-atomic.json';
const CONSOLE_LOG = '.claude/qa-r5-findings/employer-console.log';

fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(FINDINGS_FILE), { recursive: true });
try { fs.writeFileSync(CONSOLE_LOG, ''); } catch {}

let findings = [];
let fid = 1;
const seenNet = new Set();
const seenCon = new Set();
let isLoggedIn = false;
let curPage = 'unknown';

function addFinding(f) {
  findings.push({ id: `EMP-${String(fid++).padStart(3,'0')}`, ...f });
  if (findings.length % 5 === 0) flushF();
}
function flushF(){ fs.writeFileSync(FINDINGS_FILE, JSON.stringify(findings, null, 2)); }
function log(s){ try { fs.appendFileSync(CONSOLE_LOG, s+'\n'); } catch {} }

function wire(page) {
  page.on('console', msg => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const text = msg.text();
    const key = `${curPage}::${text.slice(0,140)}`;
    if (seenCon.has(key)) return;
    seenCon.add(key);
    if (msg.type() === 'error') {
      addFinding({
        severity: 'P1',
        category: 'console-error',
        page: curPage, viewport: 'both',
        description: `Console error: ${text.slice(0,240)}`,
        repro: `Load ${curPage} with devtools open`,
        fix_hint: 'Trace stack; likely component render or effect',
        screenshot_ref: null,
      });
    }
    log(`[${msg.type()}] ${curPage} :: ${text}`);
  });
  page.on('pageerror', err => {
    addFinding({
      severity: 'P0', category: 'crash', page: curPage, viewport: 'both',
      description: `Uncaught pageerror on ${curPage}: ${String(err.message).slice(0,240)}`,
      repro: `Load ${curPage}`, fix_hint: 'Fix throw path', screenshot_ref: null,
    });
    log(`[pageerror] ${curPage} :: ${err.message}`);
  });
  page.on('response', async res => {
    const url = res.url();
    const status = res.status();
    if (status < 400) return;
    if (!url.includes('localhost') && !url.startsWith('http://127')) return;
    const key = `${status}::${url.split('?')[0]}`;
    if (seenNet.has(key)) return;
    seenNet.add(key);
    addFinding({
      severity: status >= 500 ? 'P1' : 'P2',
      category: 'network-error',
      page: curPage, viewport: 'both',
      description: `HTTP ${status} on ${url.replace('http://localhost:8787','[api]').replace('http://localhost:5173','[web]')} (loggedIn=${isLoggedIn}, seen on ${curPage})`,
      repro: `Load ${curPage}`,
      fix_hint: 'Check endpoint / auth / route',
      screenshot_ref: null,
    });
  });
}

async function shoot(page, name, vp) {
  const file = `${SHOT_DIR}/audit-r5-${name}-${vp}.png`;
  if (fs.existsSync(file)) return `audit-r5-${name}-${vp}.png`; // never overwrite
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 20000 });
  } catch (e) {
    log(`[shoot fail] ${name}-${vp} :: ${e.message}`);
  }
  return `audit-r5-${name}-${vp}.png`;
}

async function checkHScroll(page, name, vp) {
  if (vp !== 'mobile') return;
  const r = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth })).catch(()=>null);
  if (r && r.s > r.c + 2) {
    addFinding({
      severity: 'P2', category: 'mobile', page: name, viewport: vp,
      description: `Horizontal scroll: scrollWidth=${r.s} > clientWidth=${r.c}`,
      repro: `Load ${name} at 390x844`,
      fix_hint: 'Find element overflowing viewport (100vw, fixed px width, unwrapped flex row, wide table/kanban)',
      screenshot_ref: `audit-r5-${name}-${vp}.png`,
    });
  }
}

async function checkTapTargets(page, name, vp) {
  if (vp !== 'mobile') return;
  const small = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a, [role=button], input[type=checkbox], input[type=radio]'));
    const bad = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if ((r.width < 44 || r.height < 44) && r.width > 0 && r.height > 0) {
        bad.push({ tag: el.tagName, text: (el.textContent||'').trim().slice(0,40), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    return bad.slice(0,8);
  }).catch(()=>[]);
  if (small.length) {
    addFinding({
      severity: 'P3', category: 'mobile', page: name, viewport: vp,
      description: `${small.length} tap target(s) under 44px: ${JSON.stringify(small)}`,
      repro: `Load ${name} at 390x844, inspect listed elements`,
      fix_hint: 'Increase padding/min-height to reach 44x44px',
      screenshot_ref: `audit-r5-${name}-${vp}.png`,
    });
  }
}

async function checkIconOnlyNoLabel(page, name, vp) {
  const bad = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const out = [];
    for (const b of btns) {
      const txt = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || b.getAttribute('title');
      const svg = b.querySelector('svg');
      if (!txt && svg && !aria) {
        const r = b.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push({ w: Math.round(r.width), h: Math.round(r.height), cls: (b.className||'').slice(0,60) });
      }
    }
    return out.slice(0,6);
  }).catch(()=>[]);
  if (bad.length) {
    addFinding({
      severity: 'P2', category: 'a11y', page: name, viewport: vp,
      description: `${bad.length} icon-only button(s) missing aria-label/title: ${JSON.stringify(bad)}`,
      repro: `Load ${name}, inspect icon-only buttons`,
      fix_hint: 'Add aria-label to every icon-only <button>',
      screenshot_ref: `audit-r5-${name}-${vp}.png`,
    });
  }
}

async function checkContentSmells(page, name, vp) {
  const smells = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const out = [];
    // $0k
    if (/\$0k\b/i.test(body)) out.push('$0k literal');
    if (/\$NaN\b/i.test(body)) out.push('$NaN literal');
    if (/NaN\b/.test(body) && !/[A-Za-z]NaN/.test(body)) out.push('NaN literal');
    if (/undefined/.test(body)) out.push('undefined literal in text');
    // raw float k
    const rawFloat = body.match(/\$\d+\.\d{3,}[km]?/i);
    if (rawFloat) out.push(`unformatted float: ${rawFloat[0]}`);
    // empty section headings (h2 followed immediately by another h2)
    const hs = Array.from(document.querySelectorAll('h1,h2,h3'));
    const empty = hs.filter(h => {
      const t = (h.innerText||'').trim();
      return t.length === 0;
    }).length;
    if (empty) out.push(`${empty} empty heading(s)`);
    // Lorem ipsum
    if (/lorem ipsum/i.test(body)) out.push('lorem ipsum copy');
    // TODO/FIXME/PLACEHOLDER visible
    if (/\bTODO\b|\bFIXME\b|\bPLACEHOLDER\b/.test(body)) out.push('TODO/FIXME/PLACEHOLDER visible');
    return out;
  }).catch(()=>[]);
  for (const s of smells) {
    addFinding({
      severity: 'P1', category: 'content', page: name, viewport: vp,
      description: `Content smell on ${name}: ${s}`,
      repro: `Load ${name}, scan body text`,
      fix_hint: 'Format/guard the value before render; add empty-state copy',
      screenshot_ref: `audit-r5-${name}-${vp}.png`,
    });
  }
}

async function checkDupeText(page, name, vp) {
  // Detect duplicate card titles in main content (same title appearing twice = duplicated in Featured+Trending etc)
  const dupes = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('article h2, article h3, article h4, [role=article] h3, li h3, li h4'));
    const m = new Map();
    for (const t of titles) {
      const k = (t.innerText||'').trim();
      if (k.length < 6) continue;
      m.set(k, (m.get(k)||0) + 1);
    }
    return [...m.entries()].filter(([,n]) => n >= 2).slice(0,5).map(([k,n]) => ({ title: k, count: n }));
  }).catch(()=>[]);
  if (dupes.length) {
    addFinding({
      severity: 'P2', category: 'content', page: name, viewport: vp,
      description: `Duplicate card titles: ${JSON.stringify(dupes)}`,
      repro: `Load ${name}, look for same title in multiple sections`,
      fix_hint: 'De-duplicate across sections (e.g. Featured vs Trending)',
      screenshot_ref: `audit-r5-${name}-${vp}.png`,
    });
  }
}

async function checkEmptyMain(page, name, vp) {
  const info = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const h = main.getBoundingClientRect().height;
    const txt = (main.innerText || '').trim().length;
    return { h: Math.round(h), txt };
  }).catch(()=>({h:0,txt:0}));
  if (info.h < 300 || info.txt < 40) {
    addFinding({
      severity: 'P1', category: 'bug', page: name, viewport: vp,
      description: `Main content nearly empty (height=${info.h}px, textLen=${info.txt}) on ${name}`,
      repro: `Load ${name}`,
      fix_hint: 'Page may be routing to blank state / data not loaded / auth gate silent',
      screenshot_ref: `audit-r5-${name}-${vp}.png`,
    });
  }
}

async function login(page, email, pw) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(600);
  try {
    await page.fill('input[type=email]', email, { timeout: 5000 });
    await page.fill('input[type=password]', pw, { timeout: 5000 });
    const btn = page.locator('button:has-text("Sign in"), button:has-text("Sign In")').first();
    await btn.click({ timeout: 5000 });
    await page.waitForTimeout(1800);
    if (page.url().includes('/login')) {
      addFinding({
        severity:'P0', category:'auth', page:'login', viewport:'both',
        description: `Login stuck on /login for ${email}`,
        repro:`/login → fill ${email} → click Sign in`,
        fix_hint:'Check /api/auth/login response', screenshot_ref: null,
      });
      return false;
    }
    isLoggedIn = true;
    return true;
  } catch (e) {
    addFinding({
      severity:'P0', category:'auth', page:'login', viewport:'both',
      description:`Login threw: ${e.message}`,
      repro:'/login', fix_hint:'Check form selectors', screenshot_ref:null,
    });
    return false;
  }
}

async function visit(page, url, name, vp, opts={}) {
  curPage = name;
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 20000 });
  } catch (e) {
    log(`[nav fail] ${name} :: ${e.message}`);
    try { await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch {}
  }
  await page.waitForTimeout(opts.settle || 700);
  const landed = page.url();
  if (!landed.includes(url.split(':')[0].split('?')[0]) && !opts.allowRedirect) {
    // check if redirected to login unexpectedly
    if (landed.includes('/login')) {
      addFinding({
        severity: 'P1', category: 'auth', page: name, viewport: vp,
        description: `Unexpected redirect to /login when navigating to ${url} (loggedIn=${isLoggedIn})`,
        repro: `Login as employer, navigate to ${url}`,
        fix_hint: 'Check role guard / route registration',
        screenshot_ref: null,
      });
    } else if (landed.replace(BASE,'') !== url) {
      addFinding({
        severity: 'P3', category: 'nav', page: name, viewport: vp,
        description: `Navigating to ${url} landed at ${landed.replace(BASE,'')}`,
        repro: `Login as employer, navigate to ${url}`,
        fix_hint: 'Confirm intended redirect or add missing route',
        screenshot_ref: null,
      });
    }
  }
  const ref = await shoot(page, name, vp);
  await checkHScroll(page, name, vp);
  await checkTapTargets(page, name, vp);
  await checkIconOnlyNoLabel(page, name, vp);
  await checkContentSmells(page, name, vp);
  await checkDupeText(page, name, vp);
  await checkEmptyMain(page, name, vp);
  return ref;
}

const EMP_ROUTES = [
  ['/employer', 'dashboard'],
  ['/employer/jobs', 'jobs'],
  ['/employer/jobs/new', 'post-step1'],
  ['/employer/pipeline', 'pipeline'],
  ['/employer/candidates', 'candidates-list'],       // may 404 / redirect - captured
  ['/employer/talent-pool', 'talent-pool'],          // may 404 / redirect - captured
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

(async () => {
  const started = Date.now();
  const TIMEBOX_MS = 40 * 60 * 1000; // 40 min hard cap
  const browser = await chromium.launch();

  for (const vp of ['desktop','mobile']) {
    if (Date.now() - started > TIMEBOX_MS) { log(`[timebox] break at ${vp}`); break; }
    isLoggedIn = false;
    const viewport = vp === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    wire(page);

    // Login first
    const ok = await login(page, 'hr@pcl.com', 'Employer123');
    if (!ok) { await ctx.close(); continue; }

    for (const [url, name] of EMP_ROUTES) {
      if (Date.now() - started > TIMEBOX_MS) { log(`[timebox] break inside ${vp} at ${name}`); break; }
      await visit(page, url, name, vp);
    }

    // ---- Post wizard flow: step through steps ----
    try {
      curPage = 'post-wizard';
      await page.goto(BASE + '/employer/jobs/new', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
      await page.waitForTimeout(700);
      await shoot(page, 'post-wiz-step1', vp);

      // Fill likely fields on step 1
      const titleIn = page.locator('input[name*=title i], input[placeholder*=title i]').first();
      if (await titleIn.count()) await titleIn.fill('QA Audit Test Job').catch(()=>{});
      const cityIn = page.locator('input[name*=city i], input[placeholder*=city i], input[placeholder*=location i]').first();
      if (await cityIn.count()) await cityIn.fill('Calgary').catch(()=>{});

      // Try clicking Next up to 3 times to walk steps 2-4
      for (let step = 2; step <= 4; step++) {
        const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Review")').first();
        if (await nextBtn.count()) {
          await nextBtn.click().catch(()=>{});
          await page.waitForTimeout(700);
          await shoot(page, `post-wiz-step${step}`, vp);
          // note if we stayed on same step (validation blocked and no visible error toast)
        } else {
          addFinding({
            severity: 'P2', category: 'flow', page: `post-wiz-step${step-1}`, viewport: vp,
            description: `No Next/Continue/Review button on post-wizard step ${step-1}`,
            repro: `/employer/jobs/new, walk to step ${step-1}`,
            fix_hint: 'Confirm wizard action button label / disabled state visibility',
            screenshot_ref: `audit-r5-post-wiz-step${step-1}-${vp}.png`,
          });
          break;
        }
      }
    } catch (e) { log(`[post wizard fail] ${vp} :: ${e.message}`); }

    // ---- Pipeline: open first candidate to trigger drawer ----
    try {
      curPage = 'pipeline-drawer';
      await page.goto(BASE + '/employer/pipeline', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
      await page.waitForTimeout(900);
      // Find a candidate card and click it
      const card = page.locator('[data-candidate-id], [data-cand-id], article button, li[role=button], div[role=button]:has-text("years")').first();
      if (await card.count()) {
        await card.click({ timeout: 3000 }).catch(()=>{});
        await page.waitForTimeout(900);
        await shoot(page, 'pipeline-drawer-open', vp);
        // check if drawer appeared
        const drawerH = await page.evaluate(() => {
          const d = document.querySelector('[role=dialog], aside[aria-modal], .drawer, [class*=drawer i]');
          return d ? Math.round(d.getBoundingClientRect().width) : 0;
        }).catch(()=>0);
        if (!drawerH) {
          addFinding({
            severity: 'P2', category: 'flow', page: 'pipeline-drawer', viewport: vp,
            description: 'Clicking a candidate card did not visibly open a drawer/dialog',
            repro: '/employer/pipeline, click a candidate card',
            fix_hint: 'Verify onClick handler / drawer state; may need different selector',
            screenshot_ref: `audit-r5-pipeline-drawer-open-${vp}.png`,
          });
        }
        // ESC to close
        await page.keyboard.press('Escape').catch(()=>{});
        await page.waitForTimeout(400);
      } else {
        addFinding({
          severity: 'P2', category: 'flow', page: 'pipeline', viewport: vp,
          description: 'No candidate cards detected on /employer/pipeline',
          repro: '/employer/pipeline as PCL',
          fix_hint: 'Check seed data / applications for PCL jobs / render loop',
          screenshot_ref: `audit-r5-pipeline-${vp}.png`,
        });
      }
    } catch (e) { log(`[pipeline flow fail] ${vp} :: ${e.message}`); }

    // ---- Company profile "View public page" ----
    try {
      curPage = 'company-view-public';
      await page.goto(BASE + '/employer/company', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
      await page.waitForTimeout(600);
      const publicBtn = page.locator('a:has-text("public"), button:has-text("public"), a:has-text("View public")').first();
      if (await publicBtn.count()) {
        // dont navigate away, just verify link exists
      } else {
        addFinding({
          severity: 'P3', category: 'ux', page: 'company', viewport: vp,
          description: 'No visible "View public page" affordance on /employer/company',
          repro: '/employer/company',
          fix_hint: 'Surface a link/button to /employers/:id public view',
          screenshot_ref: `audit-r5-company-${vp}.png`,
        });
      }
    } catch (e) { log(`[company flow fail] ${vp} :: ${e.message}`); }

    // ---- Billing: is there real Stripe / invoice download? ----
    try {
      curPage = 'billing-check';
      await page.goto(BASE + '/employer/billing', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
      await page.waitForTimeout(700);
      const info = await page.evaluate(() => {
        const body = document.body.innerText || '';
        return {
          hasStripe: /stripe/i.test(body) || document.querySelector('iframe[src*=stripe]') != null,
          hasInvoiceDl: /(download|invoice.pdf|receipt)/i.test(body),
          hasChangePlan: /change plan|upgrade|downgrade|switch plan/i.test(body),
          bodyLen: body.length,
        };
      }).catch(()=>({}));
      if (!info.hasInvoiceDl) {
        addFinding({
          severity: 'P2', category: 'ux', page: 'billing', viewport: vp,
          description: 'No invoice download / receipt affordance visible on /employer/billing',
          repro: '/employer/billing',
          fix_hint: 'Surface per-invoice PDF download; enterprise expects downloadable receipts',
          screenshot_ref: `audit-r5-billing-${vp}.png`,
        });
      }
      if (!info.hasChangePlan) {
        addFinding({
          severity: 'P2', category: 'ux', page: 'billing', viewport: vp,
          description: 'No visible "change plan" affordance on /employer/billing',
          repro: '/employer/billing',
          fix_hint: 'Provide plan-change entry point (upgrade/downgrade/cancel)',
          screenshot_ref: `audit-r5-billing-${vp}.png`,
        });
      }
    } catch (e) { log(`[billing flow fail] ${vp} :: ${e.message}`); }

    // ---- Team: invite / seat limit visibility ----
    try {
      curPage = 'team-check';
      await page.goto(BASE + '/employer/team', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
      await page.waitForTimeout(600);
      const info = await page.evaluate(() => {
        const body = document.body.innerText || '';
        return {
          hasSeat: /seat|of\s+\d+\s+seats?|\d+\/\d+\s+seats?/i.test(body),
          hasInvite: /invite/i.test(body),
          hasRole: !!document.querySelector('select[name*=role i], [aria-haspopup=listbox]'),
        };
      }).catch(()=>({}));
      if (!info.hasSeat) {
        addFinding({
          severity: 'P2', category: 'ux', page: 'team', viewport: vp,
          description: 'No seat-limit indicator (e.g. "3 of 10 seats used") on /employer/team',
          repro: '/employer/team',
          fix_hint: 'Show used/total seats; drives upgrade prompts',
          screenshot_ref: `audit-r5-team-${vp}.png`,
        });
      }
      if (!info.hasInvite) {
        addFinding({
          severity: 'P2', category: 'ux', page: 'team', viewport: vp,
          description: 'No "invite teammate" affordance on /employer/team',
          repro: '/employer/team',
          fix_hint: 'Surface invite CTA on the roster page',
          screenshot_ref: `audit-r5-team-${vp}.png`,
        });
      }
    } catch (e) { log(`[team flow fail] ${vp} :: ${e.message}`); }

    // ---- Analytics: chart presence & no-data state ----
    try {
      curPage = 'analytics-check';
      await page.goto(BASE + '/employer/analytics', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
      await page.waitForTimeout(900);
      const info = await page.evaluate(() => {
        const svgs = document.querySelectorAll('svg').length;
        const body = document.body.innerText || '';
        return {
          svgs,
          hasCharts: svgs > 3,
          hasYAxis: !!document.querySelector('.recharts-yAxis, .yAxis, [class*=y-axis i]'),
          hasTooltipHint: /hover|tooltip/i.test(body),
          hasNoData: /(no data|not enough data)/i.test(body),
          hasNaN: /nan/i.test(body),
        };
      }).catch(()=>({}));
      if (!info.hasCharts) {
        addFinding({
          severity: 'P1', category: 'bug', page: 'analytics', viewport: vp,
          description: `Analytics has too few SVGs (svgs=${info.svgs}) — likely no charts rendered`,
          repro: '/employer/analytics',
          fix_hint: 'Verify chart lib mount / data hook',
          screenshot_ref: `audit-r5-analytics-${vp}.png`,
        });
      }
      if (info.hasNaN) {
        addFinding({
          severity: 'P1', category: 'content', page: 'analytics', viewport: vp,
          description: 'NaN found in analytics body text',
          repro: '/employer/analytics',
          fix_hint: 'Guard divide-by-zero in metric formulas; fallback to "—"',
          screenshot_ref: `audit-r5-analytics-${vp}.png`,
        });
      }
    } catch (e) { log(`[analytics flow fail] ${vp} :: ${e.message}`); }

    // ---- Dashboard: stat tiles — presence, numeric, unit ----
    try {
      curPage = 'dashboard-check';
      await page.goto(BASE + '/employer', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
      await page.waitForTimeout(700);
      const tiles = await page.evaluate(() => {
        // heuristic: elements with a large number and small label
        const nums = Array.from(document.querySelectorAll('*'))
          .filter(el => el.children.length === 0)
          .map(el => ({ text: (el.innerText||'').trim(), size: parseFloat(getComputedStyle(el).fontSize) || 0 }))
          .filter(x => /^\$?\d[\d,.]*[kKmM%]?$/.test(x.text) && x.size >= 22);
        return { count: nums.length, sample: nums.slice(0,8).map(x=>x.text) };
      }).catch(()=>({count:0,sample:[]}));
      if (tiles.count < 2) {
        addFinding({
          severity: 'P2', category: 'ux', page: 'dashboard', viewport: vp,
          description: `Dashboard shows few/no stat tiles (${tiles.count})`,
          repro: '/employer',
          fix_hint: 'Add prominent KPI tiles: open jobs, new applicants, interviews scheduled, offers out',
          screenshot_ref: `audit-r5-dashboard-${vp}.png`,
        });
      }
    } catch (e) { log(`[dashboard flow fail] ${vp} :: ${e.message}`); }

    // ---- Kanban horizontal scroll on mobile ----
    if (vp === 'mobile') {
      try {
        curPage = 'pipeline-mobile-scroll';
        await page.goto(BASE + '/employer/pipeline', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
        await page.waitForTimeout(700);
        const wide = await page.evaluate(() => {
          const cols = document.querySelectorAll('[class*=kanban i], [class*=column i]');
          const w = document.documentElement.scrollWidth;
          return { colCount: cols.length, scrollW: w };
        }).catch(()=>({}));
        if (wide.scrollW > 500) {
          addFinding({
            severity: 'P2', category: 'mobile', page: 'pipeline', viewport: 'mobile',
            description: `Kanban forces horizontal scroll on mobile (scrollWidth=${wide.scrollW})`,
            repro: '/employer/pipeline at 390x844',
            fix_hint: 'Provide swipable/stacked column view on mobile',
            screenshot_ref: `audit-r5-pipeline-mobile.png`,
          });
        }
      } catch (e) { log(`[kanban mobile fail] ${e.message}`); }
    }

    await ctx.close();
  }

  await browser.close();
  flushF();
  console.log(`[done] findings=${findings.length} elapsed=${Math.round((Date.now()-started)/1000)}s`);
})().catch(e => {
  console.error('FATAL', e);
  flushF();
  process.exit(1);
});
