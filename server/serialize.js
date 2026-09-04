// Real created_at/deadline_date timestamps replace the frontend seed data's frozen
// "2 days ago" / dl-day-count strings, which never advanced once written - the same
// "fake historical data" gap the productionization audit flagged repeatedly. Here the
// display text is computed fresh on every read, so it's always actually correct.
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function relativeDaysAgo(isoDate) {
  const d = daysBetween(new Date(isoDate), new Date());
  if (d <= 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export function daysUntil(isoDate) {
  if (!isoDate) return null;
  return daysBetween(new Date(), new Date(isoDate));
}

export function serializeJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    e: row.employer_id,
    t: row.title,
    cat: row.cat,
    city: row.city,
    prov: row.prov,
    type: row.type,
    mode: row.mode,
    lo: row.pay_lo,
    hi: row.pay_hi,
    unit: row.pay_unit,
    vac: row.vacancies,
    exp: row.experience,
    edu: row.education,
    dlDate: row.deadline_date,
    daysLeft: daysUntil(row.deadline_date),
    posted: relativeDaysAgo(row.created_at),
    views: row.views,
    urgent: !!row.urgent,
    featured: !!row.featured,
    skills: JSON.parse(row.skills_json || "[]"),
    perks: JSON.parse(row.perks_json || "[]"),
    desc: row.description,
    duties: JSON.parse(row.duties_json || "[]"),
    reqs: JSON.parse(row.requirements_json || "[]"),
    how: row.how_to_apply,
    status: row.status,
    flagged: !!row.flagged,
  };
}

export function serializeEmployer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    mark: row.mark,
    a: row.a,
    b: row.b,
    industry: row.industry,
    city: row.city,
    prov: row.prov,
    size: row.size,
    rating: row.rating,
    verified: !!row.verified,
    hold: !!row.hold,
    about: row.about,
    founded: row.founded,
    site: row.site,
    plan: row.plan,
    owner: row.owner || null,
    ownerName: row.ownerName || null,
  };
}

export function serializeApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    job: row.job_id,
    user: row.user_id,
    stage: row.stage,
    note: row.note,
    at: relativeDaysAgo(row.created_at),
    avail: row.availability,
    expect: row.pay_expectation,
    letter: row.cover_letter,
    history: JSON.parse(row.history_json || "[]"),
    previousStage: row.previous_stage,
    withdrawnAt: row.withdrawn_at,
  };
}
