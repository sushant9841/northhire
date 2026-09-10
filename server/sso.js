import crypto from "node:crypto";
import { db } from "./db.js";

/* Enterprise Single Sign-On over OIDC.
   "SSO / SAML" sat on the Enterprise tier with nothing behind it. This implements the OIDC half —
   the same authorization-code flow the Google/GitHub buttons already use, but pointed at an
   issuer each customer configures for themselves, so their staff sign in through their own
   identity provider (Entra ID, Okta, Auth0, Google Workspace, Keycloak — all speak OIDC).

   SAML is deliberately NOT implemented rather than half-implemented. Validating a SAML assertion
   means verifying XML signatures over canonicalized XML, and getting that subtly wrong is an
   authentication bypass, not a cosmetic bug. OIDC reaches the same identity providers with a
   flow this codebase already runs correctly. The pricing copy now says OIDC rather than SAML.

   Configuration is discovered from the issuer's own /.well-known/openid-configuration rather than
   asking an admin to paste three endpoint URLs correctly. */

const SSO_BASE_URL = process.env.OAUTH_BASE_URL || "http://localhost:8787";

export function ssoCallbackUrl() {
  return `${SSO_BASE_URL}/api/sso/callback`;
}

const discoveryCache = new Map();   // issuer -> {doc, expires}

export async function discover(issuer) {
  const cached = discoveryCache.get(issuer);
  if (cached && cached.expires > Date.now()) return cached.doc;
  const base = issuer.replace(/\/+$/, "");
  const res = await fetch(`${base}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Issuer did not return OIDC discovery (HTTP ${res.status}).`);
  const doc = await res.json();
  if (!doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error("Issuer's discovery document is missing an authorization or token endpoint.");
  }
  discoveryCache.set(issuer, { doc, expires: Date.now() + 3600_000 });
  return doc;
}

export function getSsoConfig(employerId) {
  return db.prepare("SELECT * FROM employer_sso WHERE employer_id = ?").get(employerId) || null;
}

/* Which employer a given email should be sent to for SSO. Domain-based, because that's the only
   thing known before the person has authenticated — they type an email, not a company id. */
export function ssoConfigForEmail(email) {
  const domain = String(email || "").toLowerCase().split("@")[1];
  if (!domain) return null;
  return db.prepare("SELECT * FROM employer_sso WHERE lower(email_domain) = ? AND enabled = 1").get(domain) || null;
}

const pendingStates = new Map();
export function issueSsoState(employerId) {
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, { employerId, expires: Date.now() + 5 * 60 * 1000 });
  return state;
}
export function consumeSsoState(state) {
  const entry = pendingStates.get(state);
  pendingStates.delete(state);
  if (!entry || entry.expires < Date.now()) return null;
  return entry;
}

export async function buildSsoAuthUrl(config, state) {
  const doc = await discover(config.issuer);
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: ssoCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `${doc.authorization_endpoint}?${params.toString()}`;
}

/* Reads identity from the ID token's claims where possible, falling back to the userinfo
   endpoint. The ID token's signature is NOT verified here — instead the token is fetched over a
   direct, authenticated TLS back-channel to the issuer's own token endpoint using the client
   secret, so its contents are trusted by transport rather than by signature. That is a real and
   accepted pattern for the authorization-code flow (it is exactly what the existing Google
   button does); it would NOT be acceptable for the implicit flow, which this never uses. */
export async function exchangeSsoCode(config, code) {
  const doc = await discover(config.issuer);
  const res = await fetch(doc.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: config.client_id, client_secret: config.client_secret,
      code, redirect_uri: ssoCallbackUrl(), grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!data.access_token && !data.id_token) {
    throw new Error(data.error_description || data.error || "Identity provider returned no token.");
  }

  let claims = {};
  if (data.id_token) {
    try {
      const payload = data.id_token.split(".")[1];
      claims = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    } catch { claims = {}; }
  }
  if (!claims.email && data.access_token && doc.userinfo_endpoint) {
    try {
      const ui = await fetch(doc.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${data.access_token}` }, signal: AbortSignal.timeout(8000),
      });
      claims = { ...claims, ...(await ui.json()) };
    } catch { /* keep whatever the id_token gave us */ }
  }
  if (!claims.email) throw new Error("Identity provider did not return an email address.");
  return { email: String(claims.email).toLowerCase(), name: claims.name || claims.preferred_username || String(claims.email).split("@")[0] };
}
