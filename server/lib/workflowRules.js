/* Priority-4 #2 - Workflow rules engine.
   Generalises the old one-rule-per-stage `stage_automations` binding into a real condition-tree
   rule builder: IF <field> <op> <value> [AND/OR/NOT] THEN <action(s)>, evaluated on every
   application create and stage change. This module owns validation (used when an employer saves
   a rule) and evaluation (used by the runtime evaluator in applications.js) so both sides agree
   on exactly what a well-formed rule looks like. */
import { db, nextId, sqlTime } from "../db.js";
import { emit as liveEmit } from "./liveBroker.js";
import { pushNotification } from "./notify.js";
import { sendAndLogMail } from "../mail.js";

export const FIELDS = ["stage", "score", "days-in-stage", "source", "tags", "skills-match", "location", "employment-type"];
export const OPS = ["eq", "ne", "gt", "lt", "gte", "lte", "in", "contains"];
export const ACTION_TYPES = ["move_stage", "send_email", "add_tag", "create_task", "notify_user"];
const MAX_DEPTH = 4;
const MAX_NODES = 40;

/* ─── Validation - a bad rule must be refused at save time, not silently no-op at eval time ─── */
class RuleValidationError extends Error {}

function validateConditionNode(node, depth, counter) {
  if (depth > MAX_DEPTH) throw new RuleValidationError("Condition tree is nested too deeply (max 4 levels).");
  counter.n++;
  if (counter.n > MAX_NODES) throw new RuleValidationError("Too many conditions in one rule (max 40).");
  if (!node || typeof node !== "object") throw new RuleValidationError("Malformed condition.");

  if (node.type === "group") {
    const op = ["and", "or", "not"].includes(node.op) ? node.op : null;
    if (!op) throw new RuleValidationError("Group op must be AND, OR or NOT.");
    const children = Array.isArray(node.children) ? node.children : [];
    if (op === "not" && children.length !== 1) throw new RuleValidationError("NOT takes exactly one condition or group.");
    if (op !== "not" && children.length === 0) throw new RuleValidationError("AND/OR need at least one condition.");
    return { type: "group", op, children: children.map(c => validateConditionNode(c, depth + 1, counter)) };
  }
  if (node.type === "condition") {
    if (!FIELDS.includes(node.field)) throw new RuleValidationError(`Unknown field "${node.field}".`);
    if (!OPS.includes(node.op)) throw new RuleValidationError(`Unknown operator "${node.op}".`);
    if (node.value === undefined || node.value === null || node.value === "") throw new RuleValidationError("Every condition needs a value.");
    return { type: "condition", field: node.field, op: node.op, value: Array.isArray(node.value) ? node.value.map(String).slice(0, 20) : String(node.value).slice(0, 200) };
  }
  throw new RuleValidationError('Condition node must be type "group" or "condition".');
}

export function validateConditions(conditionsRaw) {
  // An empty/omitted tree means "always matches" - a rule that's pure actions with no gate.
  if (!conditionsRaw || (conditionsRaw.type === "group" && (conditionsRaw.children || []).length === 0)) {
    return { type: "group", op: "and", children: [] };
  }
  return validateConditionNode(conditionsRaw, 0, { n: 0 });
}

export function validateActions(actionsRaw) {
  const actions = Array.isArray(actionsRaw) ? actionsRaw : [];
  if (actions.length === 0) throw new RuleValidationError("A rule needs at least one action.");
  if (actions.length > 10) throw new RuleValidationError("A rule can have at most 10 actions.");
  return actions.map(a => {
    if (!a || !ACTION_TYPES.includes(a.type)) throw new RuleValidationError(`Unknown action type "${a?.type}".`);
    switch (a.type) {
      case "move_stage":
        if (!a.stage || typeof a.stage !== "string") throw new RuleValidationError("move_stage needs a target stage.");
        return { type: "move_stage", stage: a.stage.slice(0, 64) };
      case "send_email":
        if (!a.templateId) throw new RuleValidationError("send_email needs a templateId.");
        return { type: "send_email", templateId: String(a.templateId) };
      case "add_tag":
        if (!a.tag || typeof a.tag !== "string") throw new RuleValidationError("add_tag needs a tag.");
        return { type: "add_tag", tag: a.tag.trim().slice(0, 32) };
      case "create_task":
        if (!a.title || typeof a.title !== "string") throw new RuleValidationError("create_task needs a title.");
        return { type: "create_task", title: a.title.trim().slice(0, 140), assigneeUserId: a.assigneeUserId ? String(a.assigneeUserId) : null };
      case "notify_user":
        if (!a.userId) throw new RuleValidationError("notify_user needs a userId.");
        return { type: "notify_user", userId: String(a.userId), message: a.message ? String(a.message).slice(0, 300) : "" };
      default:
        throw new RuleValidationError("Unhandled action type.");
    }
  });
}

export { RuleValidationError };

/* ─── Field resolution - what each condition field means against a live application row ─── */
const DEFAULT_SCORE_WEIGHTS = { skills: 54, experience: 16, location: 14, category: 16 };
function weightsFor(job) {
  let w = null;
  try { w = job.score_weights_json ? JSON.parse(job.score_weights_json) : null; } catch { /* ignore */ }
  if (!w) return DEFAULT_SCORE_WEIGHTS;
  const merged = { ...DEFAULT_SCORE_WEIGHTS, ...w };
  const total = Object.values(merged).reduce((s, v) => s + (Number(v) || 0), 0);
  if (total <= 0) return DEFAULT_SCORE_WEIGHTS;
  return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, (Number(v) || 0) / total * 100]));
}
/* Server-side mirror of useStore.js's client-only scoreCandidate() - same four weighted
   components (skills / experience / location / category fit) - so a rule condition on "score"
   evaluates the same number an employer sees on the candidate card. */
function computeMatchScore(user, job) {
  if (!user || !job) return 70;
  const req = JSON.parse(job.skills_json || "[]").map(s => String(s).toLowerCase());
  const has = JSON.parse(user.skills_json || "[]").map(s => String(s).toLowerCase());
  const overlap = req.filter(s => has.includes(s)).length;
  const skill = req.length ? overlap / req.length : 0.5;
  const expYears = typeof user.years === "number" ? user.years : 3;
  const exp = Math.min(1, expYears / 8);
  const loc = user.prov === job.prov ? 1 : job.mode === "Remote" ? 0.9 : 0.5;
  const catFit = user.cat === job.cat ? 1 : 0.6;
  const w = weightsFor(job);
  return Math.max(38, Math.min(99, Math.round(skill * w.skills + exp * w.experience + loc * w.location + catFit * w.category)));
}
function skillsMatchPct(user, job) {
  const req = JSON.parse(job.skills_json || "[]").map(s => String(s).toLowerCase());
  if (!req.length) return 100;
  const has = JSON.parse(user.skills_json || "[]").map(s => String(s).toLowerCase());
  const overlap = req.filter(s => has.includes(s)).length;
  return Math.round((overlap / req.length) * 100);
}
function daysInStage(app) {
  const history = JSON.parse(app.history_json || "[]");
  const entry = [...history].reverse().find(h => h.stage === app.stage);
  const since = entry?.at ? sqlTime(entry.at.includes("T") ? entry.at.replace("Z", "").replace("T", " ") : entry.at) : sqlTime(app.created_at);
  if (!since) return 0;
  return Math.max(0, Math.floor((Date.now() - since.getTime()) / 86400000));
}

function resolveField(field, ctx) {
  const { app, user, job } = ctx;
  switch (field) {
    case "stage": return app.stage;
    case "score": return computeMatchScore(user, job);
    case "days-in-stage": return daysInStage(app);
    case "source": return app.source || "unknown";
    case "tags": return JSON.parse(app.tags_json || "[]");
    case "skills-match": return skillsMatchPct(user, job);
    case "location": return [user?.city, user?.prov].filter(Boolean).join(", ");
    case "employment-type": return job?.type || "";
    default: return null;
  }
}

function compare(op, actual, expected) {
  const numActual = Number(actual), numExpected = Number(expected);
  const bothNumeric = actual !== "" && expected !== "" && !Number.isNaN(numActual) && !Number.isNaN(numExpected);
  switch (op) {
    case "eq": return bothNumeric ? numActual === numExpected : String(actual).toLowerCase() === String(expected).toLowerCase();
    case "ne": return !compare("eq", actual, expected);
    case "gt": return bothNumeric && numActual > numExpected;
    case "lt": return bothNumeric && numActual < numExpected;
    case "gte": return bothNumeric && numActual >= numExpected;
    case "lte": return bothNumeric && numActual <= numExpected;
    case "in": {
      const list = Array.isArray(expected) ? expected : String(expected).split(",").map(s => s.trim());
      if (Array.isArray(actual)) return actual.some(a => list.some(l => String(l).toLowerCase() === String(a).toLowerCase()));
      return list.some(l => String(l).toLowerCase() === String(actual).toLowerCase());
    }
    case "contains": {
      if (Array.isArray(actual)) return actual.some(a => String(a).toLowerCase().includes(String(expected).toLowerCase()));
      return String(actual ?? "").toLowerCase().includes(String(expected).toLowerCase());
    }
    default: return false;
  }
}

function evalNode(node, ctx) {
  if (node.type === "group") {
    if (node.op === "not") return !evalNode(node.children[0], ctx);
    if (node.op === "and") return node.children.every(c => evalNode(c, ctx));
    return node.children.some(c => evalNode(c, ctx)); // or
  }
  const actual = resolveField(node.field, ctx);
  return compare(node.op, actual, node.value);
}

/* ─── Execution ─── */
function runAction(action, ctx, results) {
  const { app, user, job, employerId, actorUserId } = ctx;
  switch (action.type) {
    case "move_stage": {
      const allowed = (() => {
        const emp = db.prepare("SELECT pipeline_stages_json FROM employers WHERE id = ?").get(employerId);
        try { const p = emp?.pipeline_stages_json ? JSON.parse(emp.pipeline_stages_json) : null; return Array.isArray(p) && p.length ? p : null; } catch { return null; }
      })() || ["Applied", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired"];
      if (!allowed.includes(action.stage) || action.stage === app.stage) return;
      db.prepare("UPDATE applications SET stage = ? WHERE id = ?").run(action.stage, app.id);
      app.stage = action.stage;
      liveEmit(app.user_id, "application:updated", { id: app.id, stage: action.stage });
      results.push(`Moved to "${action.stage}"`);
      break;
    }
    case "send_email": {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE id = ? AND employer_id = ?").get(action.templateId, employerId);
      if (!tpl) return;
      const employer = db.prepare("SELECT name FROM employers WHERE id = ?").get(employerId);
      const body = String(tpl.body || "")
        .replaceAll("{{name}}", user?.name || "")
        .replaceAll("{{job}}", job?.title || "")
        .replaceAll("{{company}}", employer?.name || "");
      if (user?.email) sendAndLogMail(user.email, tpl.name, body).catch(() => {});
      results.push(`Sent "${tpl.name}"`);
      break;
    }
    case "add_tag": {
      const tags = JSON.parse(app.tags_json || "[]");
      if (!tags.includes(action.tag)) tags.push(action.tag);
      db.prepare("UPDATE applications SET tags_json = ? WHERE id = ?").run(JSON.stringify(tags), app.id);
      app.tags_json = JSON.stringify(tags);
      results.push(`Tagged "${action.tag}"`);
      break;
    }
    case "create_task": {
      db.prepare(
        "INSERT INTO workflow_tasks (id, employer_id, application_id, rule_id, title, assignee_user_id) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(nextId("wt", "workflow_tasks"), employerId, app.id, ctx.ruleId, action.title, action.assigneeUserId || null);
      results.push(`Created task "${action.title}"`);
      break;
    }
    case "notify_user": {
      const target = db.prepare("SELECT id FROM users WHERE id = ? AND employer_id = ?").get(action.userId, employerId);
      if (!target) return;
      pushNotification({ for: target.id, icon: "zap", title: "Workflow rule fired",
        body: action.message || `A workflow rule ran on ${user?.name || "an applicant"}'s application.`, link: "empPipeline" });
      results.push("Notified teammate");
      break;
    }
  }
  // "One notification per action fired" - besides any action-specific email/notify above, the
  // actor (whoever's request triggered evaluation) gets a single confirmation notification per
  // action so a rule's effects are never silent even when the actor isn't the action's target.
  if (actorUserId) {
    pushNotification({ for: actorUserId, icon: "zap", title: "Workflow rule action ran",
      body: results[results.length - 1] || "A workflow rule action ran.", link: "empPipeline" });
  }
}

/** Evaluates every enabled workflow rule for this employer against one application, in order,
    running every action of every rule whose condition tree matches. Never throws — a bad rule
    must not break the application create/stage-change request that triggered it. */
export function runWorkflowRules(employerId, applicationId, { actorUserId } = {}) {
  try {
    const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId);
    if (!app) return;
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(app.job_id);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(app.user_id);
    const rules = db.prepare("SELECT * FROM workflow_rules WHERE employer_id = ? AND enabled = 1 ORDER BY created_at ASC").all(employerId);
    for (const rule of rules) {
      let tree, actions;
      try {
        tree = JSON.parse(rule.conditions_json);
        actions = JSON.parse(rule.actions_json);
      } catch { continue; }
      const ctx = { app, user, job, employerId, actorUserId, ruleId: rule.id };
      let matches = false;
      try { matches = evalNode(tree, ctx); } catch { continue; }
      if (!matches) continue;
      const results = [];
      for (const action of actions) {
        try { runAction(action, ctx, results); } catch (e) { console.error("workflow rule action:", rule.id, e.message); }
      }
    }
  } catch (e) { console.error("workflow rules eval:", e.message); }
}
