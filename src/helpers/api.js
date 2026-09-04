/* Thin fetch wrapper for the real backend at server/ (see server/README.md for scope).
   Covers accounts, jobs, employers and applications - the only domains the backend has;
   everything else in the app (HR, staffing, content, messages...) stays on localStorage. */

const API_BASE = "http://localhost:8787/api";
const TOKEN_KEY = "northhire.apiToken";

export function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  if (typeof window === "undefined") return;
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

/* A network failure (server not running) is distinguished from a real API error response
   so callers can fall back to local-only behavior instead of showing a confusing message. */
export class ApiUnreachableError extends Error {}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiUnreachableError("Can't reach the NorthHire API — is `npm run server` running?");
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
};
