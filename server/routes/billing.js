import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { getConfig } from "../platformConfig.js";
import { serializeEmployer, serializeEmployerInvoice } from "../serialize.js";
import { stripeConfigured, createCheckoutSession, retrieveCheckoutSession, createPortalSession } from "../stripe.js";

export const billingRouter = Router();

function resolveOwnEmployer(req, res) {
  const employer = db.prepare("SELECT * FROM employers WHERE id = ?").get(req.user.employer_id);
  if (!employer) { res.status(404).json({ error: "Company not found." }); return null; }
  return employer;
}

billingRouter.get("/config", (req, res) => {
  res.json({ enabled: stripeConfigured() });
});

// Real checkout for any priced plan - the old behavior (an owner's own PATCH /employers/:id
// directly setting `plan`) is now blocked below for anything above Free; this is the only path
// that can move a company onto a paid plan.
billingRouter.post("/checkout", requireAuth, requireRole("employer"), async (req, res) => {
  if (!stripeConfigured()) return res.status(503).json({ error: "Payments aren't configured on this server yet." });
  const employer = resolveOwnEmployer(req, res); if (!employer) return;
  const { plan } = req.body || {};
  const plans = getConfig("plans");
  if (!plans[plan]) return res.status(400).json({ error: "Unknown plan." });
  const price = plans[plan].price || 0;
  if (price <= 0) return res.status(400).json({ error: "This plan is free — no checkout needed. Use the plan-switch action instead." });
  try {
    const session = await createCheckoutSession({
      employerId: employer.id, employerEmail: req.user.email, plan, priceDollars: price, province: employer.prov || "ON",
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(502).json({ error: `Stripe error: ${e.message}` });
  }
});

// Called when the browser lands back from Stripe's hosted checkout page. Idempotent on
// stripe_session_id (a UNIQUE column) - a refresh of this same return page never double-charges
// or double-records, it just returns the already-recorded invoice.
billingRouter.get("/verify", requireAuth, requireRole("employer"), async (req, res) => {
  if (!stripeConfigured()) return res.status(503).json({ error: "Payments aren't configured on this server yet." });
  const employer = resolveOwnEmployer(req, res); if (!employer) return;
  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: "Missing session_id." });

  const existing = db.prepare("SELECT * FROM employer_invoices WHERE stripe_session_id = ?").get(sessionId);
  if (existing) {
    if (existing.employer_id !== employer.id) return res.status(403).json({ error: "Not your checkout session." });
    return res.json({ paid: true, employer: serializeEmployer(db.prepare("SELECT * FROM employers WHERE id = ?").get(employer.id)), invoice: serializeEmployerInvoice(existing) });
  }

  let session;
  try { session = await retrieveCheckoutSession(sessionId); }
  catch (e) { return res.status(502).json({ error: `Stripe error: ${e.message}` }); }

  // A session belongs to whichever employer's checkout created it (metadata.employerId), not
  // whoever happens to be signed in when they land on the return URL - never trust the caller's
  // own session over what Stripe actually recorded for this checkout.
  if (session.metadata?.employerId !== employer.id) return res.status(403).json({ error: "Not your checkout session." });
  if (session.payment_status !== "paid") return res.json({ paid: false });

  const plan = session.metadata.plan;
  const pretax = Number(session.metadata.pretax) || 0;
  const tax = Number(session.metadata.tax) || 0;
  const id = nextId("inv", "employer_invoices");
  db.prepare(
    `INSERT INTO employer_invoices (id, employer_id, plan, amount_pretax, tax, tax_label, total, stripe_session_id, stripe_subscription_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')`
  ).run(id, employer.id, plan, pretax, tax, session.metadata.taxLabel || null, pretax + tax, sessionId, session.subscription?.id || null);
  db.prepare("UPDATE employers SET plan = ?, stripe_customer_id = COALESCE(stripe_customer_id, ?) WHERE id = ?")
    .run(plan, typeof session.customer === "string" ? session.customer : session.customer?.id, employer.id);

  res.json({
    paid: true,
    employer: serializeEmployer(db.prepare("SELECT * FROM employers WHERE id = ?").get(employer.id)),
    invoice: serializeEmployerInvoice(db.prepare("SELECT * FROM employer_invoices WHERE id = ?").get(id)),
  });
});

billingRouter.post("/portal", requireAuth, requireRole("employer"), async (req, res) => {
  if (!stripeConfigured()) return res.status(503).json({ error: "Payments aren't configured on this server yet." });
  const employer = resolveOwnEmployer(req, res); if (!employer) return;
  if (!employer.stripe_customer_id) return res.status(400).json({ error: "No billing history yet — this appears once you've completed a paid checkout." });
  try {
    const session = await createPortalSession(employer.stripe_customer_id);
    res.json({ url: session.url });
  } catch (e) {
    res.status(502).json({ error: `Stripe error: ${e.message}` });
  }
});

billingRouter.get("/invoices", requireAuth, requireRole("employer"), (req, res) => {
  const employer = resolveOwnEmployer(req, res); if (!employer) return;
  const rows = db.prepare("SELECT * FROM employer_invoices WHERE employer_id = ? ORDER BY created_at DESC").all(employer.id);
  res.json({ invoices: rows.map(serializeEmployerInvoice) });
});
