import { Router } from "express";
import { db, nextId } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { getConfig } from "../platformConfig.js";
import { serializeEmployer, serializeEmployerInvoice } from "../serialize.js";
import { stripeConfigured, createCheckoutSession, retrieveCheckoutSession, createPortalSession, getStripe, issueReferralCreditNote } from "../stripe.js";

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
  const { plan, billingCycle } = req.body || {};
  const plans = getConfig("plans");
  if (!plans[plan]) return res.status(400).json({ error: "Unknown plan." });
  const price = plans[plan].price || 0;
  if (price <= 0) return res.status(400).json({ error: "This plan is free — no checkout needed. Use the plan-switch action instead." });
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  try {
    const session = await createCheckoutSession({
      employerId: employer.id, employerEmail: req.user.email, plan, priceDollars: price, province: employer.prov || "ON", billingCycle: cycle,
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
  const cycle = session.metadata.billingCycle === "annual" ? "annual" : "monthly";
  db.prepare(
    `INSERT INTO employer_invoices (id, employer_id, plan, amount_pretax, tax, tax_label, total, stripe_session_id, stripe_subscription_id, status, billing_cycle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`
  ).run(id, employer.id, plan, pretax, tax, session.metadata.taxLabel || null, pretax + tax, sessionId, session.subscription?.id || null, cycle);
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

/* Referral-program credit trigger: the referred employer's first successful invoice payment.
   Kept idempotent two ways - employer_referral_credits has a UNIQUE index on referred_employer_id
   (so a webhook redelivery, or invoice.paid firing again on a later renewal, can never create a
   second credit for the same referral), and issueReferralCreditNote() itself no-ops if that row is
   already 'issued'. */
async function handleInvoicePaid(invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const employer = db.prepare("SELECT * FROM employers WHERE stripe_customer_id = ?").get(customerId);
  if (!employer || !employer.referred_by_employer_id) return;

  // Already have a credit row for this referral (any status, including a prior attempt) - this
  // invoice.paid is either a later renewal or a webhook redelivery, not the triggering payment.
  const already = db.prepare("SELECT 1 FROM employer_referral_credits WHERE referred_employer_id = ?").get(employer.id);
  if (already) return;

  // "First successful invoice payment" - guard against a renewal being mistaken for it by
  // requiring this to be at most the first paid invoice we've recorded for this employer.
  const { n: paidCount } = db.prepare("SELECT COUNT(*) AS n FROM employer_invoices WHERE employer_id = ? AND status = 'paid'").get(employer.id);
  if (paidCount > 1) return;

  const plan = getConfig("plans")[employer.plan];
  const amountCents = Math.round((plan?.price || 0) * 100);
  if (amountCents <= 0) return; // referred employer is on Free - nothing to credit yet

  await issueReferralCreditNote(
    employer.referred_by_employer_id,
    employer.id,
    amountCents,
    "cad",
    `Referral credit: ${employer.name || employer.id} completed their first paid month (${employer.plan})`
  );
}

// Real Stripe webhook - signature-verified against STRIPE_WEBHOOK_SECRET (never trust an
// unverified POST to this endpoint; anyone could forge one). Missing secret degrades to a 503
// with a pointer to the Stripe CLI for local dev, rather than either crashing or - worse -
// accepting unverified events. Mounted with the raw-body capture from index.js's express.json
// verify callback so the signature is checked against the exact bytes Stripe signed.
billingRouter.post("/stripe-webhook", (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.log("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set - rejecting. Set it, or for local dev run: stripe listen --forward-to localhost:8787/api/billing/stripe-webhook");
    return res.status(503).json({ error: "Webhook not configured. Set STRIPE_WEBHOOK_SECRET or use Stripe CLI: stripe listen --forward-to localhost:8787/api/billing/stripe-webhook" });
  }
  const client = getStripe();
  if (!client) return res.status(503).json({ error: "Payments aren't configured on this server yet." });

  let event;
  try {
    event = client.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], secret);
  } catch (e) {
    console.log(`[stripe-webhook] signature verification failed: ${e.message}`);
    return res.status(400).json({ error: `Webhook signature verification failed: ${e.message}` });
  }

  // Ack immediately, then process - Stripe retries on anything but a fast 2xx, and none of these
  // handlers need to finish before the response goes out.
  res.json({ received: true });

  (async () => {
    try {
      if (event.type === "invoice.paid") {
        await handleInvoicePaid(event.data.object);
      } else if (event.type === "credit_note.created") {
        console.log(`[stripe-webhook] credit_note.created ${event.data.object.id} for customer ${event.data.object.customer}`);
      } else if (event.type === "charge.refunded") {
        console.log(`[stripe-webhook] charge.refunded ${event.data.object.id} amount_refunded=${event.data.object.amount_refunded}`);
      }
    } catch (e) {
      console.log(`[stripe-webhook] error handling ${event.type}: ${e.message}`);
    }
  })();
});
