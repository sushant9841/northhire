import crypto from "node:crypto";
import { db } from "./db.js";

/* Outbound webhooks for the Enterprise API. Each delivery carries an HMAC-SHA256 signature over
   `timestamp.body` using the endpoint's own secret, so a receiver can verify the call really came
   from NorthHire — the same construction Stripe uses, and for the same reason: signing the body
   alone would let an intercepted delivery be replayed forever.

   Delivery is fire-and-forget with a short timeout. A customer's slow or broken endpoint must
   never make the request that triggered the event wait (the same mistake HR payroll made by
   awaiting every employee's email before responding), and the last status is recorded so a
   failing endpoint is visible in the UI instead of failing silently. */

export const WEBHOOK_EVENTS = [
  "application.created",
  "application.stage_changed",
  "job.published",
];

const TIMEOUT_MS = 5000;

export function signPayload(secret, timestamp, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function deliver(hook, event, data) {
  const body = JSON.stringify({ event, data, sentAt: new Date().toISOString() });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(hook.secret, timestamp, body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-NorthHire-Event": event,
        "X-NorthHire-Signature": `t=${timestamp},v1=${signature}`,
      },
      body,
      signal: controller.signal,
    });
    db.prepare("UPDATE employer_webhooks SET last_status = ?, last_error = NULL, last_at = datetime('now') WHERE id = ?")
      .run(res.status, hook.id);
  } catch (e) {
    db.prepare("UPDATE employer_webhooks SET last_status = 0, last_error = ?, last_at = datetime('now') WHERE id = ?")
      .run(String(e.message || e).slice(0, 200), hook.id);
  } finally {
    clearTimeout(timer);
  }
}

/* Never awaited by a route handler - call it and move on. */
export function emitWebhook(employerId, event, data) {
  if (!WEBHOOK_EVENTS.includes(event)) return;
  let hooks;
  try {
    hooks = db.prepare("SELECT * FROM employer_webhooks WHERE employer_id = ? AND active = 1").all(employerId);
  } catch { return; }
  for (const hook of hooks) {
    let subscribed = [];
    try { subscribed = JSON.parse(hook.events_json || "[]"); } catch { subscribed = []; }
    if (subscribed.length && !subscribed.includes(event)) continue;
    deliver(hook, event, data).catch(() => {});
  }
}
