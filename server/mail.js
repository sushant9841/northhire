import nodemailer from "nodemailer";
import { db, nextId } from "./db.js";

/* Real SMTP delivery via Ethereal - a free, no-signup testing service built for exactly this: it
   hands out a disposable inbox and never actually delivers to a real recipient, which is also the
   responsible choice for a demo app with no verified sending domain (never risk spamming a real
   address from seed/test data). Every "sent" email is genuinely transmitted over SMTP; the
   returned preview URL is where a human actually reads it. One transporter/account is created
   lazily on first send and reused for the life of the process, so every email lands in the same
   inbox instead of a fresh disposable one each time. */
let transporterPromise = null;
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = nodemailer.createTestAccount().then(account =>
      nodemailer.createTransport({
        host: account.smtp.host, port: account.smtp.port, secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      })
    );
  }
  return transporterPromise;
}

export async function sendMail({ to, subject, text }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from: '"NorthHire" <no-reply@northhire.ca>', to, subject, text });
    return nodemailer.getTestMessageUrl(info) || null;
  } catch (e) {
    console.warn(`[mail] send failed, falling back to outbox-only: ${e.message}`);
    return null;
  }
}

/* Every "we sent an email" call site in this app used to just INSERT into `outbox` (the in-app
   "check your mail" fallback, still kept so that UI keeps working even if Ethereal is briefly
   unreachable) - this wraps that same insert with a real send, storing the preview URL on the row
   so anyone with backend access (or the outbox UI, once it renders preview_url) can open the
   actual delivered email, not just read the copy back. */
export async function sendAndLogMail(to, subject, body) {
  const previewUrl = await sendMail({ to, subject, text: body });
  db.prepare("INSERT INTO outbox (id, to_email, subject, body, preview_url) VALUES (?, ?, ?, ?, ?)")
    .run(nextId("m", "outbox"), to, subject, body, previewUrl);
  return previewUrl;
}

/* ─── CASL: commercial electronic messages ─────────────────────────────────────────────────
   Everything above sends transactional mail (a receipt, a reset code, an application-status
   change), which CASL does not regulate. A job-alert digest or a marketing nudge IS a commercial
   electronic message, and those carry three hard requirements: prior consent, identification of
   the sender with a real mailing address, and a working unsubscribe honoured within 10 business
   days. sendCommercialMail() is the only path that may send one, and it refuses rather than
   sending when consent is missing - the burden of proving consent is on the sender. */

export const SENDER_IDENTIFICATION = {
  legalName: "NorthHire Technologies Inc.",
  address: "120 Adelaide Street West, Suite 2500, Toronto, ON M5H 1T1",
  email: "support@northhire.ca",
};

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export function unsubscribeTokenFor(userId) {
  const row = db.prepare("SELECT unsubscribe_token FROM users WHERE id = ?").get(userId);
  if (row?.unsubscribe_token) return row.unsubscribe_token;
  const token = `unsub_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  db.prepare("UPDATE users SET unsubscribe_token = ? WHERE id = ?").run(token, userId);
  return token;
}

function caslFooter(token) {
  return [
    "",
    "———",
    `You are receiving this because you asked NorthHire to email you about matching jobs.`,
    `Unsubscribe instantly: ${FRONTEND_URL}/unsubscribe?token=${token}`,
    "",
    `${SENDER_IDENTIFICATION.legalName}`,
    `${SENDER_IDENTIFICATION.address}`,
    `${SENDER_IDENTIFICATION.email}`,
  ].join("\n");
}

export function hasMarketingConsent(userId) {
  const row = db.prepare("SELECT marketing_consent FROM users WHERE id = ?").get(userId);
  return !!row?.marketing_consent;
}

/* Returns {sent:false, reason} rather than throwing when consent is absent - a missing consent
   is an ordinary, expected outcome for most accounts, not an error condition. */
export async function sendCommercialMail({ userId, subject, body }) {
  const user = db.prepare("SELECT id, email, marketing_consent FROM users WHERE id = ?").get(userId);
  if (!user) return { sent: false, reason: "no-such-user" };
  if (!user.marketing_consent) return { sent: false, reason: "no-consent" };
  const token = unsubscribeTokenFor(user.id);
  const fullBody = `${body}\n${caslFooter(token)}`;
  const previewUrl = await sendAndLogMail(user.email, subject, fullBody);
  return { sent: true, previewUrl, to: user.email };
}
