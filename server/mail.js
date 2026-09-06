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
