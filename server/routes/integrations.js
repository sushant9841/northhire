/* Priority-4 #7: integrations marketplace shell. Owner-scoped CRUD over the `integrations`
   table. OAuth flows for individual providers land later; this is the shell that makes the
   install/disconnect state real and persistent so the "installed?" UI never lies. Providers
   are a fixed allowlist so a bad client can't inject arbitrary rows. */
import express from "express";
import { db } from "../db.js";
import { userFromRequest, hrEmployeeFromRequest, agencyStaffFromRequest } from "../auth.js";

export const integrationsRouter = express.Router();

/* Single fixed owner id for the staffing scope - the app models exactly one staffing agency
   (see agency_staff, which has no agency_id column at all: every other staffing route is
   single-tenant the same way, gating purely on requireAgencyAuth). */
const STAFFING_OWNER_ID = "agency";

const HR_PRIV_ROLES = ["owner", "admin", "hr"];

/* Each scope authenticates against its OWN session kind - the main account session (employer),
   the HR Suite employee session (hr), or the agency staff session (staffing). These are three
   independent cookies/session kinds (see auth.js) - reusing the main-account requireAuth for
   all three, as the original Priority-4 #7 shell did, silently 401'd every hr/staffing caller
   since neither session type is a `users` row. Also gates mutations (install/disconnect) to a
   privileged role per scope - any signed-in company employee could otherwise toggle company-
   wide integrations. */
function authForScope(req, res, { mutate }) {
  const scope = req.params.scope;
  if (scope === "employer") {
    const user = userFromRequest(req);
    if (!user || user.role !== "employer") { res.status(401).json({ error: "Not signed in." }); return null; }
    return { ownerId: user.employer_id || null };
  }
  if (scope === "hr") {
    const emp = hrEmployeeFromRequest(req);
    if (!emp) { res.status(401).json({ error: "Not signed in to HR Suite." }); return null; }
    if (mutate && !HR_PRIV_ROLES.includes(emp.role)) { res.status(403).json({ error: "Not allowed for your role." }); return null; }
    return { ownerId: emp.company_id || null };
  }
  if (scope === "staffing") {
    const staff = agencyStaffFromRequest(req);
    if (!staff) { res.status(401).json({ error: "Not signed in to the agency console." }); return null; }
    if (mutate && staff.role !== "owner") { res.status(403).json({ error: "Not allowed for your role." }); return null; }
    return { ownerId: STAFFING_OWNER_ID };
  }
  return null;
}

/* Fixed provider allowlist. Adding a new provider means a real integration commit -
   copy/pasting the id in the client isn't enough to create a row here. */
const PROVIDERS = {
  employer: [
    { key: "google_workspace", name: "Google Workspace", category: "sso" },
    { key: "slack", name: "Slack", category: "messaging" },
    { key: "zapier", name: "Zapier", category: "webhooks" },
    { key: "quickbooks", name: "QuickBooks", category: "finance" },
    { key: "adp_export", name: "ADP export", category: "payroll" },
  ],
  hr: [
    { key: "google_workspace", name: "Google Workspace", category: "sso" },
    { key: "slack", name: "Slack", category: "messaging" },
    { key: "quickbooks", name: "QuickBooks", category: "finance" },
    { key: "adp_export", name: "ADP export", category: "payroll" },
  ],
  staffing: [
    { key: "quickbooks", name: "QuickBooks", category: "finance" },
    { key: "adp_export", name: "ADP export", category: "payroll" },
  ],
};

/* GET all integrations for the caller's scope, merged with the allowlist so the client always
   has one row per available provider (installed OR not) — the UI renders one card per provider
   either way, so a "not installed" state must be present. */
integrationsRouter.get("/:scope", (req, res) => {
  const scope = req.params.scope;
  if (!PROVIDERS[scope]) return res.status(400).json({ error: "Unknown scope." });
  const auth = authForScope(req, res, { mutate: false });
  if (!auth) return;
  const { ownerId } = auth;
  if (!ownerId) return res.status(403).json({ error: "No integration owner for your session." });
  const installed = db.prepare(
    `SELECT provider, status, config_json, installed_at, updated_at
     FROM integrations WHERE owner_scope = ? AND owner_id = ?`
  ).all(scope, ownerId);
  const byProvider = Object.fromEntries(installed.map(r => [r.provider, r]));
  const items = PROVIDERS[scope].map(p => {
    const row = byProvider[p.key];
    return {
      provider: p.key,
      name: p.name,
      category: p.category,
      status: row?.status || "not-connected",
      installedAt: row?.installed_at || null,
      updatedAt: row?.updated_at || null,
      config: row ? (() => { try { return JSON.parse(row.config_json); } catch { return {}; } })() : {},
    };
  });
  res.json({ scope, items });
});

/* Install / re-enable a provider. OAuth flows land later per provider; today this just marks
   the row as connected and records any client-supplied config (webhook URL / API key ref). */
integrationsRouter.post("/:scope/:provider", (req, res) => {
  const { scope, provider } = req.params;
  if (!PROVIDERS[scope]) return res.status(400).json({ error: "Unknown scope." });
  if (!PROVIDERS[scope].find(p => p.key === provider)) return res.status(400).json({ error: "Provider not available for this scope." });
  const auth = authForScope(req, res, { mutate: true });
  if (!auth) return;
  const { ownerId } = auth;
  if (!ownerId) return res.status(403).json({ error: "No integration owner for your session." });
  const config = (req.body && typeof req.body.config === "object" && req.body.config) || {};
  const id = `int_${scope}_${ownerId}_${provider}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO integrations (id, owner_scope, owner_id, provider, status, config_json, installed_at, updated_at)
     VALUES (?, ?, ?, ?, 'connected', ?, ?, ?)
     ON CONFLICT(owner_scope, owner_id, provider) DO UPDATE SET
       status = 'connected',
       config_json = excluded.config_json,
       installed_at = COALESCE(integrations.installed_at, excluded.installed_at),
       updated_at = excluded.updated_at`
  ).run(id, scope, ownerId, provider, JSON.stringify(config), now, now);
  res.json({ ok: true });
});

/* Disconnect — keeps the row so re-connecting preserves history, just flips status. */
integrationsRouter.delete("/:scope/:provider", (req, res) => {
  const { scope, provider } = req.params;
  if (!PROVIDERS[scope]) return res.status(400).json({ error: "Unknown scope." });
  const auth = authForScope(req, res, { mutate: true });
  if (!auth) return;
  const { ownerId } = auth;
  if (!ownerId) return res.status(403).json({ error: "No integration owner for your session." });
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE integrations SET status = 'not-connected', updated_at = ?
     WHERE owner_scope = ? AND owner_id = ? AND provider = ?`
  ).run(now, scope, ownerId, provider);
  res.json({ ok: true });
});
