import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { unsubscribeTokenFor, SENDER_IDENTIFICATION } from "../mail.js";

export const consentRouter = Router();

/* CASL requires an unsubscribe mechanism that works without the recipient having to log in, and
   that is honoured within 10 business days - this honours it immediately. The link carries an
   unguessable per-user token rather than an email address or user id, so the endpoint can't be
   used to enumerate accounts or to unsubscribe somebody else. */
consentRouter.get("/unsubscribe", (req, res) => {
  const token = String(req.query.token || "");
  const user = token ? db.prepare("SELECT id, email FROM users WHERE unsubscribe_token = ?").get(token) : null;
  // Always answer the same way: a wrong/expired token must not reveal whether it maps to a real
  // account. The seeker sees a confirmation either way; only a real token actually changes state.
  if (user) {
    db.prepare("UPDATE users SET marketing_consent = 0, marketing_consent_at = datetime('now'), marketing_consent_source = 'unsubscribe-link' WHERE id = ?")
      .run(user.id);
  }
  res.json({
    ok: true,
    message: "You've been unsubscribed from NorthHire job-alert emails. Saved searches still show matches when you sign in.",
    sender: SENDER_IDENTIFICATION,
  });
});

/* The signed-in equivalent, used by Settings > Notifications. Recording when and how consent was
   given is what makes it provable - CASL puts the burden of proof on the sender. */
consentRouter.get("/marketing", requireAuth, (req, res) => {
  const row = db.prepare("SELECT marketing_consent, marketing_consent_at, marketing_consent_source FROM users WHERE id = ?").get(req.user.id);
  res.json({
    consent: !!row?.marketing_consent,
    at: row?.marketing_consent_at || null,
    source: row?.marketing_consent_source || null,
    sender: SENDER_IDENTIFICATION,
  });
});

consentRouter.patch("/marketing", requireAuth, (req, res) => {
  const consent = !!(req.body || {}).consent;
  db.prepare("UPDATE users SET marketing_consent = ?, marketing_consent_at = datetime('now'), marketing_consent_source = ? WHERE id = ?")
    .run(consent ? 1 : 0, consent ? "settings-opt-in" : "settings-opt-out", req.user.id);
  if (consent) unsubscribeTokenFor(req.user.id); // mint the token now so every later CEM has one
  res.json({ consent });
});
