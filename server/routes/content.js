import { Router } from "express";
import { db, nextId, sqlTime } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { serializeBlog, serializeTraining, serializeContentRevision } from "../serialize.js";
import { getConfig } from "../platformConfig.js";

export const contentRouter = Router();

// Publishing (not drafting) articles/trainings is a Growth+ plan feature per the UI's own gate -
// nothing stopped calling the API directly with status:"published" on a Free plan. Plan limits are
// admin-editable business config (see platformConfig.js), not a hardcoded constant.
function employerPlan(employerId) {
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(employerId);
  const plans = getConfig("plans");
  return plans[employer?.plan] || plans.Free;
}

// Scheduled publishing: a draft with a scheduled_at in the past auto-promotes to published the
// next time anyone reads the list - no cron/background job exists in this app, so (same pattern
// already used for computed posted/daysLeft on jobs) this is evaluated lazily on read instead.
function promoteScheduled(table) {
  // scheduled_at is stored as the ISO 8601 string the client's <input type="datetime-local">
  // produces via .toISOString() ("2026-09-06T03:09:13.771Z") - SQLite's own datetime('now') uses
  // its own space-separated format with no 'T'/'Z'/milliseconds, so a raw string comparison
  // between the two is meaningless (lexicographic order isn't chronological order across two
  // different formats). Wrapping both sides in datetime() normalizes them to the same format
  // first, which is what actually makes the comparison correct.
  db.prepare(`UPDATE ${table} SET status = 'published', scheduled_at = NULL WHERE status = 'draft' AND scheduled_at IS NOT NULL AND datetime(scheduled_at) <= datetime('now')`).run();
}
function saveRevision(contentType, row) {
  db.prepare("INSERT INTO content_revisions (id, content_type, content_id, snapshot_json, created_by) VALUES (?, ?, ?, ?, ?)")
    .run(nextId("rev", "content_revisions"), contentType, row.id, JSON.stringify(row), null);
}

function ownerFilter(req) {
  // Admin sees everything; an employer sees platform ("admin") content + their own.
  if (req.user.role === "admin") return { clause: "1=1", params: [] };
  return { clause: "(owner_employer_id = ? OR owner_employer_id IS NULL)", params: [req.user.employer_id] };
}

contentRouter.get("/blogs", (req, res) => {
  promoteScheduled("blogs");
  const { status } = req.query;
  // "all" means "every status" (drafts included) - it was previously matched as a literal
  // status value instead, so ?status=all silently returned zero rows.
  const clauses = []; const params = [];
  if (status && status !== "all") { clauses.push("status = ?"); params.push(status); }
  else if (!status) { clauses.push("status = 'published'"); }
  const rows = db.prepare(`SELECT * FROM blogs${clauses.length ? " WHERE " + clauses.join(" AND ") : ""} ORDER BY created_at DESC`).all(...params);
  res.json({ blogs: rows.map(serializeBlog) });
});
// Real RSS 2.0 feed of published articles - a career-resources reader can subscribe in any
// feed app, rather than the "no RSS at all" gap this closes. XML-escaped by hand since these
// are the only 5 characters RSS/XML care about and pulling in a dependency for that is overkill.
function xmlEscape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}
contentRouter.get("/blogs/rss.xml", (req, res) => {
  const rows = db.prepare("SELECT * FROM blogs WHERE status = 'published' ORDER BY created_at DESC LIMIT 50").all();
  const siteUrl = `${req.protocol}://${req.get("host")}`;
  const items = rows.map(r => `
    <item>
      <title>${xmlEscape(r.title)}</title>
      <link>${siteUrl}/#blog/${xmlEscape(r.id)}</link>
      <guid isPermaLink="false">${xmlEscape(r.id)}</guid>
      <category>${xmlEscape(r.cat)}</category>
      <author>${xmlEscape(r.author)}</author>
      <pubDate>${sqlTime(r.created_at).toUTCString()}</pubDate>
      <description>${xmlEscape(r.excerpt)}</description>
    </item>`).join("");
  res.type("application/rss+xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>NorthHire Career Resources</title>
  <link>${siteUrl}/#blogs</link>
  <description>Guides on Canadian trades certification, résumé standards, wages, and interviewing.</description>
  <language>en-ca</language>${items}
</channel></rss>`);
});
contentRouter.get("/blogs/mine", requireAuth, requireRole("employer", "admin"), (req, res) => {
  promoteScheduled("blogs");
  const { clause, params } = ownerFilter(req);
  const rows = db.prepare(`SELECT * FROM blogs WHERE ${clause} ORDER BY created_at DESC`).all(...params);
  res.json({ blogs: rows.map(serializeBlog) });
});
contentRouter.get("/blogs/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM blogs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Article not found." });
  res.json({ blog: serializeBlog(row) });
});
contentRouter.post("/blogs", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const b = req.body || {};
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && b.status === "published" && !employerPlan(req.user.employer_id).articles) {
    return res.status(403).json({ error: "Publishing articles is a Growth+ feature." });
  }
  // A scheduled publish stays a draft (with scheduled_at set) until promoteScheduled() flips it -
  // requires the same Growth+ check a real publish would, since it's real publishing, just delayed.
  if (!isAdmin && b.scheduledAt && !employerPlan(req.user.employer_id).articles) {
    return res.status(403).json({ error: "Publishing articles is a Growth+ feature." });
  }
  const id = nextId("bl", "blogs");
  db.prepare(
    `INSERT INTO blogs (id, title, cat, scene, tone, mins, author, author_seed, excerpt, body_json, owner_employer_id, status, scheduled_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, b.title, b.cat || null, b.scene || "office", b.tone || "#005CCC", b.mins || 5, b.author || "", b.authorSeed || 0,
    b.excerpt || "", JSON.stringify(b.body || []), isAdmin ? null : req.user.employer_id, b.scheduledAt ? "draft" : (b.status || "draft"), b.scheduledAt || null);
  res.status(201).json({ blog: serializeBlog(db.prepare("SELECT * FROM blogs WHERE id = ?").get(id)) });
});
contentRouter.get("/blogs/:id/revisions", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM blogs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Article not found." });
  if (req.user.role !== "admin" && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your article." });
  const revs = db.prepare("SELECT * FROM content_revisions WHERE content_type = 'blog' AND content_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ revisions: revs.map(serializeContentRevision) });
});
contentRouter.patch("/blogs/:id", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM blogs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Article not found." });
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your article." });
  if (!isAdmin && (req.body?.status === "published" || req.body?.scheduledAt) && !employerPlan(req.user.employer_id).articles) {
    return res.status(403).json({ error: "Publishing articles is a Growth+ feature." });
  }
  saveRevision("blog", row);
  const b = req.body || {};
  const fields = { title: "title", cat: "cat", scene: "scene", tone: "tone", mins: "mins", author: "author",
    excerpt: "excerpt", status: "status" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (b[key] !== undefined) { setCols.push(`${col} = ?`); params.push(b[key]); }
  if (b.body !== undefined) { setCols.push("body_json = ?"); params.push(JSON.stringify(b.body)); }
  if (b.scheduledAt !== undefined) {
    setCols.push("scheduled_at = ?"); params.push(b.scheduledAt || null);
    if (b.scheduledAt && b.status === undefined) { setCols.push("status = 'draft'"); }
  }
  if (setCols.length) db.prepare(`UPDATE blogs SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ blog: serializeBlog(db.prepare("SELECT * FROM blogs WHERE id = ?").get(req.params.id)) });
});
contentRouter.post("/blogs/:id/restore/:revisionId", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM blogs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Article not found." });
  if (req.user.role !== "admin" && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your article." });
  const rev = db.prepare("SELECT * FROM content_revisions WHERE id = ? AND content_type = 'blog' AND content_id = ?").get(req.params.revisionId, req.params.id);
  if (!rev) return res.status(404).json({ error: "Revision not found." });
  saveRevision("blog", row); // the pre-restore state becomes its own revision, so restoring is itself undoable
  const snap = JSON.parse(rev.snapshot_json);
  db.prepare("UPDATE blogs SET title=?, cat=?, scene=?, tone=?, mins=?, author=?, excerpt=?, body_json=? WHERE id=?")
    .run(snap.title, snap.cat, snap.scene, snap.tone, snap.mins, snap.author, snap.excerpt, snap.body_json, req.params.id);
  res.json({ blog: serializeBlog(db.prepare("SELECT * FROM blogs WHERE id = ?").get(req.params.id)) });
});
contentRouter.delete("/blogs/:id", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM blogs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Article not found." });
  if (req.user.role !== "admin" && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your article." });
  db.prepare("DELETE FROM blogs WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

contentRouter.get("/trainings", (req, res) => {
  promoteScheduled("trainings");
  const { status } = req.query;
  const clauses = []; const params = [];
  if (status && status !== "all") { clauses.push("status = ?"); params.push(status); }
  else if (!status) { clauses.push("status = 'published'"); }
  const rows = db.prepare(`SELECT * FROM trainings${clauses.length ? " WHERE " + clauses.join(" AND ") : ""} ORDER BY created_at DESC`).all(...params);
  res.json({ trainings: rows.map(serializeTraining) });
});
contentRouter.get("/trainings/mine", requireAuth, requireRole("employer", "admin"), (req, res) => {
  promoteScheduled("trainings");
  const { clause, params } = ownerFilter(req);
  const rows = db.prepare(`SELECT * FROM trainings WHERE ${clause} ORDER BY created_at DESC`).all(...params);
  res.json({ trainings: rows.map(serializeTraining) });
});
contentRouter.get("/trainings/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Training not found." });
  res.json({ training: serializeTraining(row) });
});
contentRouter.post("/trainings", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const b = req.body || {};
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && b.status === "published" && !employerPlan(req.user.employer_id).trainings) {
    return res.status(403).json({ error: "Publishing trainings is a Growth+ feature." });
  }
  if (!isAdmin && b.scheduledAt && !employerPlan(req.user.employer_id).trainings) {
    return res.status(403).json({ error: "Publishing trainings is a Growth+ feature." });
  }
  const id = nextId("tr", "trainings");
  db.prepare(
    `INSERT INTO trainings (id, title, cat, scene, tone, provider, provider_seed, level, hours, price, mods_json, outcomes_json, about, owner_employer_id, status, scheduled_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, b.title, b.cat || null, b.scene || "learn", b.tone || "#005CCC", b.provider || "NorthHire Learning", b.providerSeed || 0,
    b.level || "Beginner", b.hours || 1, b.price || 0, JSON.stringify(b.mods || []), JSON.stringify(b.outcomes || []),
    b.about || "", isAdmin ? null : req.user.employer_id, b.scheduledAt ? "draft" : (b.status || "draft"), b.scheduledAt || null);
  res.status(201).json({ training: serializeTraining(db.prepare("SELECT * FROM trainings WHERE id = ?").get(id)) });
});
contentRouter.get("/trainings/:id/revisions", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Training not found." });
  if (req.user.role !== "admin" && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your training." });
  const revs = db.prepare("SELECT * FROM content_revisions WHERE content_type = 'training' AND content_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ revisions: revs.map(serializeContentRevision) });
});
contentRouter.patch("/trainings/:id", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Training not found." });
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your training." });
  if (!isAdmin && (req.body?.status === "published" || req.body?.scheduledAt) && !employerPlan(req.user.employer_id).trainings) {
    return res.status(403).json({ error: "Publishing trainings is a Growth+ feature." });
  }
  saveRevision("training", row);
  const b = req.body || {};
  const fields = { title: "title", cat: "cat", scene: "scene", tone: "tone", provider: "provider", level: "level",
    hours: "hours", price: "price", about: "about", status: "status" };
  const setCols = []; const params = [];
  for (const [key, col] of Object.entries(fields)) if (b[key] !== undefined) { setCols.push(`${col} = ?`); params.push(b[key]); }
  if (b.mods !== undefined) { setCols.push("mods_json = ?"); params.push(JSON.stringify(b.mods)); }
  if (b.outcomes !== undefined) { setCols.push("outcomes_json = ?"); params.push(JSON.stringify(b.outcomes)); }
  if (b.scheduledAt !== undefined) {
    setCols.push("scheduled_at = ?"); params.push(b.scheduledAt || null);
    if (b.scheduledAt && b.status === undefined) { setCols.push("status = 'draft'"); }
  }
  if (setCols.length) db.prepare(`UPDATE trainings SET ${setCols.join(", ")} WHERE id = ?`).run(...params, req.params.id);
  res.json({ training: serializeTraining(db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id)) });
});
contentRouter.post("/trainings/:id/restore/:revisionId", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Training not found." });
  if (req.user.role !== "admin" && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your training." });
  const rev = db.prepare("SELECT * FROM content_revisions WHERE id = ? AND content_type = 'training' AND content_id = ?").get(req.params.revisionId, req.params.id);
  if (!rev) return res.status(404).json({ error: "Revision not found." });
  saveRevision("training", row);
  const snap = JSON.parse(rev.snapshot_json);
  db.prepare("UPDATE trainings SET title=?, cat=?, scene=?, tone=?, provider=?, level=?, hours=?, price=?, mods_json=?, outcomes_json=?, about=? WHERE id=?")
    .run(snap.title, snap.cat, snap.scene, snap.tone, snap.provider, snap.level, snap.hours, snap.price, snap.mods_json, snap.outcomes_json, snap.about, req.params.id);
  res.json({ training: serializeTraining(db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id)) });
});
contentRouter.delete("/trainings/:id", requireAuth, requireRole("employer", "admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Training not found." });
  if (req.user.role !== "admin" && row.owner_employer_id !== req.user.employer_id) return res.status(403).json({ error: "Not your training." });
  db.prepare("DELETE FROM trainings WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

contentRouter.post("/trainings/:id/enrol", requireAuth, requireRole("seeker"), (req, res) => {
  const training = db.prepare("SELECT * FROM trainings WHERE id = ?").get(req.params.id);
  if (!training) return res.status(404).json({ error: "Training not found." });
  const existing = db.prepare("SELECT * FROM training_enrolments WHERE user_id = ? AND training_id = ?").get(req.user.id, req.params.id);
  if (existing) return res.status(409).json({ error: "Already enrolled." });
  const paid = training.price > 0 && req.body?.paid;
  db.prepare("INSERT INTO training_enrolments (user_id, training_id, progress, paid) VALUES (?, ?, 0, ?)").run(req.user.id, req.params.id, paid ? 1 : 0);
  db.prepare("UPDATE trainings SET enrolled = enrolled + 1 WHERE id = ?").run(req.params.id);
  res.status(201).json({ ok: true });
});
contentRouter.patch("/trainings/:id/progress", requireAuth, requireRole("seeker"), (req, res) => {
  const { progress } = req.body || {};
  db.prepare("UPDATE training_enrolments SET progress = ? WHERE user_id = ? AND training_id = ?").run(progress, req.user.id, req.params.id);
  res.json({ ok: true });
});
contentRouter.get("/enrolments/mine", requireAuth, requireRole("seeker"), (req, res) => {
  const rows = db.prepare("SELECT * FROM training_enrolments WHERE user_id = ?").all(req.user.id);
  res.json({ enrolments: rows.map(r => ({ trainingId: r.training_id, progress: r.progress, paid: !!r.paid })) });
});
