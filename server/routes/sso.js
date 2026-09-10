import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole, createSessionCookie } from "../auth.js";
import { getConfig } from "../platformConfig.js";
import {
  getSsoConfig, ssoConfigForEmail, issueSsoState, consumeSsoState,
  buildSsoAuthUrl, exchangeSsoCode, discover, ssoCallbackUrl,
} from "../sso.js";

export const ssoRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function planAllowsSso(employerId) {
  const employer = db.prepare("SELECT plan FROM employers WHERE id = ?").get(employerId);
  return !!getConfig("plans")[employer?.plan || "Free"]?.sso;
}

/* Public: does this email address belong to a domain with SSO configured? The sign-in page calls
   this to decide whether to show "Continue with your company account". It answers only yes/no plus
   the company name - never whether an ACCOUNT exists, so it can't be used to enumerate users. */
ssoRouter.get("/lookup", (req, res) => {
  const config = ssoConfigForEmail(req.query.email);
  if (!config) return res.json({ sso: false });
  const employer = db.prepare("SELECT name FROM employers WHERE id = ?").get(config.employer_id);
  res.json({ sso: true, company: employer?.name || null });
});

ssoRouter.get("/start", async (req, res) => {
  const config = ssoConfigForEmail(req.query.email);
  if (!config) return res.status(404).json({ error: "No single sign-on is configured for that email domain." });
  if (!planAllowsSso(config.employer_id)) return res.status(403).json({ error: "Single sign-on isn't active for this account." });
  try {
    const state = issueSsoState(config.employer_id);
    res.json({ url: await buildSsoAuthUrl(config, state) });
  } catch (e) {
    res.status(502).json({ error: `Couldn't reach the identity provider: ${e.message}` });
  }
});

ssoRouter.get("/callback", async (req, res) => {
  const fail = msg => res.redirect(`${FRONTEND_URL}/login?ssoError=${encodeURIComponent(msg)}`);
  const entry = consumeSsoState(String(req.query.state || ""));
  if (!entry) return fail("That sign-in link expired. Please try again.");
  const config = getSsoConfig(entry.employerId);
  if (!config || !config.enabled) return fail("Single sign-on is not enabled for this company.");
  if (!planAllowsSso(entry.employerId)) return fail("Single sign-on isn't active for this account.");

  try {
    const profile = await exchangeSsoCode(config, String(req.query.code || ""));
    // The identity provider vouches for the email, but only for ITS OWN domain - a misconfigured
    // or hostile IdP must not be able to assert someone else's address and take over that account.
    if (profile.email.split("@")[1] !== String(config.email_domain).toLowerCase()) {
      return fail("That account isn't on this company's verified domain.");
    }
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(profile.email);
    if (!user) {
      // SSO provisions a teammate on the employer account, never an owner - joining via SSO
      // shouldn't hand someone billing and seat control over a company they just authenticated to.
      const { hashPassword } = await import("../auth.js");
      const crypto = await import("node:crypto");
      const { hash, salt } = hashPassword(crypto.randomBytes(24).toString("hex"));
      const { nextId } = await import("../db.js");
      const id = nextId("u", "users");
      db.prepare(
        `INSERT INTO users (id, role, name, email, password_hash, password_salt, employer_id, employer_role)
         VALUES (?, 'employer', ?, ?, ?, ?, ?, 'member')`
      ).run(id, profile.name, profile.email, hash, salt, entry.employerId);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    } else if (user.employer_id !== entry.employerId) {
      return fail("That email is already registered to a different account.");
    }
    if (user.suspended) return fail("This account has been suspended.");
    db.prepare("UPDATE employer_sso SET last_used = datetime('now') WHERE employer_id = ?").run(entry.employerId);
    createSessionCookie(res, "session", "main", user.id);
    res.redirect(`${FRONTEND_URL}/?ssoSuccess=1`);
  } catch (e) {
    fail(e.message || "Single sign-on failed.");
  }
});

/* ─── Admin configuration (owner only, Enterprise only) ─── */

ssoRouter.get("/config", requireAuth, requireRole("employer"), (req, res) => {
  const enabled = planAllowsSso(req.user.employer_id);
  const config = getSsoConfig(req.user.employer_id);
  res.json({
    available: enabled,
    callbackUrl: ssoCallbackUrl(),
    // The client secret is never returned - only whether one is on file.
    config: config ? {
      issuer: config.issuer, clientId: config.client_id, emailDomain: config.email_domain,
      enabled: !!config.enabled, hasSecret: !!config.client_secret, lastUsed: config.last_used,
    } : null,
  });
});

ssoRouter.put("/config", requireAuth, requireRole("employer"), async (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can configure single sign-on." });
  if (!planAllowsSso(req.user.employer_id)) return res.status(403).json({ error: "Single sign-on is available on Enterprise." });
  const issuer = String(req.body?.issuer || "").trim().replace(/\/+$/, "");
  const clientId = String(req.body?.clientId || "").trim();
  const clientSecret = String(req.body?.clientSecret || "").trim();
  const emailDomain = String(req.body?.emailDomain || "").trim().toLowerCase().replace(/^@/, "");

  let parsed;
  try { parsed = new URL(issuer); } catch { return res.status(400).json({ error: "Issuer must be a URL." }); }
  if (parsed.protocol !== "https:") return res.status(400).json({ error: "The issuer URL must use HTTPS." });
  if (!clientId) return res.status(400).json({ error: "A client ID is required." });
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(emailDomain)) return res.status(400).json({ error: "Enter the email domain your staff sign in with, e.g. yourcompany.ca." });

  const existing = getSsoConfig(req.user.employer_id);
  const secret = clientSecret || existing?.client_secret;
  if (!secret) return res.status(400).json({ error: "A client secret is required." });

  // One domain can only route to one company, or a sign-in would be ambiguous.
  const clash = db.prepare("SELECT employer_id FROM employer_sso WHERE lower(email_domain) = ? AND employer_id != ?")
    .get(emailDomain, req.user.employer_id);
  if (clash) return res.status(409).json({ error: "That email domain is already configured for another company." });

  // Prove the issuer really is an OIDC provider before saving, rather than letting a typo surface
  // later as a broken sign-in for the whole company.
  try { await discover(issuer); }
  catch (e) { return res.status(400).json({ error: `Couldn't verify that issuer: ${e.message}` }); }

  db.prepare(
    `INSERT INTO employer_sso (employer_id, issuer, client_id, client_secret, email_domain, enabled)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(employer_id) DO UPDATE SET issuer=excluded.issuer, client_id=excluded.client_id,
       client_secret=excluded.client_secret, email_domain=excluded.email_domain, enabled=excluded.enabled`
  ).run(req.user.employer_id, issuer, clientId, secret, emailDomain, req.body?.enabled ? 1 : 0);
  res.json({ ok: true });
});

ssoRouter.delete("/config", requireAuth, requireRole("employer"), (req, res) => {
  if (req.user.employer_role !== "owner") return res.status(403).json({ error: "Only the account owner can remove single sign-on." });
  db.prepare("DELETE FROM employer_sso WHERE employer_id = ?").run(req.user.employer_id);
  res.json({ ok: true });
});
