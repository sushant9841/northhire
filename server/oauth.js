/* Google + GitHub OAuth ("Sign in with...") - a real, standard authorization-code flow, not a
   stub. Needs a free app registration from the user on each provider's developer console (no
   billing, no paid tier - the basic "read my email/profile" scope has no cost or hard usage cap
   on either platform for normal login traffic), with two env vars per provider:
     GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   - console.cloud.google.com > APIs & Services > Credentials
     GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET   - github.com/settings/developers > OAuth Apps
   Both apps' "Authorized redirect URI" must be set to exactly this server's callback URL below
   (OAUTH_BASE_URL + /api/auth/oauth/<provider>/callback). Until the env vars are set, a provider
   simply reports itself as unavailable (see GET /auth/oauth/status) and its button never shows -
   no broken UI, no silent failure. */
import crypto from "node:crypto";

const OAUTH_BASE_URL = process.env.OAUTH_BASE_URL || "http://localhost:8787";

export const PROVIDERS = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    authExtra: { access_type: "online", prompt: "select_account" },
    async fetchProfile(accessToken) {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
      const p = await res.json();
      return { email: p.email, name: p.name || p.email?.split("@")[0] };
    },
  },
  github: {
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    authExtra: {},
    async fetchProfile(accessToken) {
      const headers = { Authorization: `Bearer ${accessToken}`, "User-Agent": "NorthHire-demo-app" };
      const [userRes, emailsRes] = await Promise.all([
        fetch("https://api.github.com/user", { headers }),
        fetch("https://api.github.com/user/emails", { headers }),
      ]);
      const user = await userRes.json();
      const emails = await emailsRes.json().catch(() => []);
      const primary = Array.isArray(emails) ? emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) : null;
      return { email: primary?.email || user.email, name: user.name || user.login };
    },
  },
};

export function isConfigured(provider) {
  const p = PROVIDERS[provider];
  return !!(p && p.clientId() && p.clientSecret());
}

export function callbackUrl(provider) {
  return `${OAUTH_BASE_URL}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthUrl(provider, state) {
  const p = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: p.clientId(), redirect_uri: callbackUrl(provider), scope: p.scope,
    response_type: "code", state, ...p.authExtra,
  });
  return `${p.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForProfile(provider, code) {
  const p = PROVIDERS[provider];
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: p.clientId(), client_secret: p.clientSecret(), code,
      redirect_uri: callbackUrl(provider), grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || "No access token returned.");
  return p.fetchProfile(data.access_token);
}

// Short-lived, single-use CSRF state tokens for the OAuth redirect round-trip - not a session, so
// a plain in-memory Map (with expiry) is enough; nothing here needs to survive a server restart.
const pendingStates = new Map();
export function issueState() {
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now() + 5 * 60 * 1000);
  return state;
}
export function consumeState(state) {
  const expiry = pendingStates.get(state);
  pendingStates.delete(state);
  return !!expiry && expiry > Date.now();
}
