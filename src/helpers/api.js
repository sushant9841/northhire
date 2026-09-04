/* Thin fetch wrapper for the real backend at server/. Session state lives entirely in an
   httpOnly cookie the browser manages itself - nothing here reads or writes localStorage. */

const API_BASE = "http://localhost:8787/api";

/* A network failure (server not running) is distinguished from a real API error response
   so callers can fall back to local-only behavior instead of showing a confusing message. */
export class ApiUnreachableError extends Error {}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method, headers, credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
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
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
};
