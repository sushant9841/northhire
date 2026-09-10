/* Time-to-hire, time-in-stage and source-of-hire, computed from data the app genuinely records.

   The tracker's finding asked for all three. Two were computable all along and simply hadn't
   been: every application carries a real `history` of stage transitions with ISO timestamps, so
   how long someone sat at each stage and how long the whole process took are measurements, not
   estimates. The third (source) needed an actual attribution field, which now exists — and
   crucially, applications recorded before that field existed report as "unknown" rather than
   being silently bucketed into "direct", which would overstate direct traffic forever. */

const ms = iso => { const t = new Date(String(iso || "").replace(" ", "T")).getTime(); return Number.isFinite(t) ? t : null; };
const DAY = 86400000;

export const TERMINAL_STAGES = new Set(["Hired", "Withdrawn"]);

/* Days from the application arriving to it reaching `Hired`. Only completed hires count — including
   still-open applications would drag the average toward "however long ago we started looking". */
export function timeToHire(app) {
  const hired = (app.history || []).find(h => h.stage === "Hired");
  if (!hired) return null;
  const start = app.createdAt || ms(app.history?.[0]?.at);
  const end = ms(hired.at);
  if (!start || !end || end < start) return null;
  return Math.round(((end - start) / DAY) * 10) / 10;
}

/* How long an application sat at each stage. The final stage is measured to now when the
   application is still open, which is the number that actually matters for spotting a stall. */
export function timeInStages(app, now = Date.now()) {
  const hist = [...(app.history || [])].filter(h => ms(h.at)).sort((a, b) => ms(a.at) - ms(b.at));
  if (!hist.length) return [];
  const out = [];
  for (let i = 0; i < hist.length; i++) {
    const from = ms(hist[i].at);
    const to = i < hist.length - 1 ? ms(hist[i + 1].at) : (TERMINAL_STAGES.has(app.stage) ? null : now);
    if (to == null) continue;
    out.push({ stage: hist[i].stage, days: Math.round(((to - from) / DAY) * 10) / 10, open: i === hist.length - 1 && !TERMINAL_STAGES.has(app.stage) });
  }
  return out;
}

/* Which stage an application is currently stuck in, and for how long — the practical use of
   time-in-stage data. */
export function stalledFor(app, now = Date.now()) {
  if (TERMINAL_STAGES.has(app.stage)) return null;
  const hist = [...(app.history || [])].filter(h => ms(h.at)).sort((a, b) => ms(a.at) - ms(b.at));
  const last = hist[hist.length - 1];
  const since = last ? ms(last.at) : app.createdAt;
  if (!since) return null;
  return Math.round(((now - since) / DAY) * 10) / 10;
}

export const SOURCE_LABELS = {
  search: "Job search",
  matched: "Matched for you",
  invite: "Invited by employer",
  alert: "Job alert email",
  direct: "Direct link",
  api: "API / integration",
  unknown: "Not recorded",
};

export function sourceBreakdown(apps) {
  const counts = {};
  for (const a of apps) {
    const k = a.source && SOURCE_LABELS[a.source] ? a.source : "unknown";
    counts[k] = (counts[k] || 0) + 1;
  }
  const total = apps.length || 1;
  return Object.entries(counts)
    .map(([k, n]) => ({ source: k, label: SOURCE_LABELS[k], count: n, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

/* Source-of-HIRE rather than source-of-application: which channels actually produced hires, which
   is the question worth asking when deciding where to spend. */
export function sourceOfHire(apps) {
  return sourceBreakdown(apps.filter(a => a.stage === "Hired"));
}

export function hiringSummary(apps, now = Date.now()) {
  const hires = apps.filter(a => a.stage === "Hired");
  const times = hires.map(timeToHire).filter(v => v != null);
  const median = times.length
    ? (() => { const s = [...times].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10; })()
    : null;

  // Average days spent at each stage across every application that has left that stage.
  const byStage = {};
  for (const a of apps) {
    for (const t of timeInStages(a, now)) {
      if (t.open) continue;
      (byStage[t.stage] ||= []).push(t.days);
    }
  }
  const stageAverages = Object.entries(byStage)
    .map(([stage, arr]) => ({ stage, avgDays: Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10, n: arr.length }));

  const stalled = apps
    .map(a => ({ app: a, days: stalledFor(a, now) }))
    .filter(x => x.days != null && x.days >= 14)
    .sort((a, b) => b.days - a.days);

  return { hires: hires.length, medianTimeToHire: median, stageAverages, stalled, sourceOfHire: sourceOfHire(apps) };
}
