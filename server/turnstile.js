// Cloudflare Turnstile bot-protection - a real server-side verification call, not a stub. Free,
// no request cap. Gates on TURNSTILE_SECRET_KEY being set (same graceful-degradation pattern as
// oauth.js) so local dev without the key configured isn't blocked - once set, it's enforced.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileConfigured() {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(token, remoteip) {
  if (!turnstileConfigured()) return true; // not configured - nothing to enforce
  if (!token) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token });
  if (remoteip) body.set("remoteip", remoteip);
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false; // Cloudflare unreachable - fail closed, not open, for a bot-protection check
  }
}
