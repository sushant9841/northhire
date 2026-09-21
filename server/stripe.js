// Real Stripe integration (test mode) for plan checkout - not a stub. Gates on STRIPE_SECRET_KEY
// being set (same graceful-degradation pattern as oauth.js/turnstile.js); until set, checkout
// routes return a clear 503 instead of crashing on a missing key.
import Stripe from "stripe";
import { db, nextId } from "./db.js";
import { salesTaxRate, salesTaxLabel } from "../src/helpers/salesTax.js";

// Pinned rather than left to the SDK's own default - an unpinned client silently picks up
// whatever API version the installed `stripe` package's release date defaults to, so a routine
// `npm update` could change request/response shapes under us with no code change to review.
// Matches the installed SDK's own current default (stripe@22.6.1) - bump deliberately, not by
// accident.
const STRIPE_API_VERSION = "2026-08-26.dahlia";

let _stripe = null;
export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}
// Lazy-initialized client, pinned to STRIPE_API_VERSION. Returns null (never throws) when no key
// is configured yet, so callers that already have their own graceful-degradation path (the
// referral-credit issuer below) can check-and-log instead of crashing.
export function getStripe() {
  if (!stripeConfigured()) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  return _stripe;
}
function stripe() {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");
  return client;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* GST/HST is folded into one recurring unit_amount rather than a second Checkout line item -
   Stripe's subscription-mode Checkout Sessions require every line to be recurring, and computing
   the real per-province tax ourselves (the same shared helper staffing/HR invoicing already use)
   is simpler and more portable across Stripe API versions than depending on Stripe Tax being
   separately activated in the dashboard. The pretax/tax split is still recorded in our own
   employer_invoices table for a real itemized receipt. */
// Annual billing gets 15% off - matches the PricingPage toggle. When a real annual price is
// registered in the Stripe dashboard the discount and interval are still authored here (single
// source of truth on the server), so switching cycles never means editing two places.
export const ANNUAL_DISCOUNT_PCT = 0.15;

export async function createCheckoutSession({ employerId, employerEmail, plan, priceDollars, province, billingCycle = "monthly" }) {
  const taxRate = salesTaxRate(province);
  const isAnnual = billingCycle === "annual";
  // Annual = 12 monthly payments with the discount applied, charged once a year. The pretax is
  // the discounted yearly total, tax is province-based on that pretax, and Stripe's recurring
  // interval switches to "year" so the customer sees a real annual line on their receipt.
  const pretax = isAnnual ? Math.round(priceDollars * 12 * (1 - ANNUAL_DISCOUNT_PCT) * 100) / 100 : priceDollars;
  const tax = Math.round(pretax * taxRate * 100) / 100;
  const total = Math.round((pretax + tax) * 100) / 100;
  const cycleLabel = isAnnual ? "annual" : "month";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: employerEmail,
    line_items: [{
      price_data: {
        currency: "cad",
        product_data: { name: `NorthHire ${plan} plan (${cycleLabel})`, description: `Includes ${salesTaxLabel(province)} — $${pretax.toFixed(2)} + $${tax.toFixed(2)} tax` },
        recurring: { interval: isAnnual ? "year" : "month" },
        unit_amount: Math.round(total * 100),
      },
      quantity: 1,
    }],
    success_url: `${FRONTEND_URL}/employer/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/pricing?checkout=cancelled`,
    metadata: { employerId, plan, pretax: String(pretax), tax: String(tax), taxLabel: salesTaxLabel(province), billingCycle: isAnnual ? "annual" : "monthly" },
  });
  return session;
}

export async function retrieveCheckoutSession(sessionId) {
  return stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
}

// Stripe's real hosted Billing Portal - lets a customer update their card, view/download every
// Stripe-side invoice, or cancel, without this app building any of that UI itself. Needs the
// portal's default configuration saved once in the Stripe dashboard (Settings > Billing >
// Customer portal) - if that's never been done, Stripe returns a clear "No configuration
// provided" error, surfaced as-is to the caller rather than swallowed.
export async function createPortalSession(customerId) {
  return stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${FRONTEND_URL}/employer/billing`,
  });
}

/* Priority-4 #9: referral-program credit issuance. Called once per referred employer, when their
   first invoice is paid (see routes/billing.js's stripe-webhook handler). Always writes a row to
   employer_referral_credits first (or reuses one already created by the caller) so the referral
   is recorded even if Stripe itself is unreachable or not yet configured - a real credit note can
   always be replayed later from that row (see the admin retry endpoint), but attribution of "this
   company referred that one, and it converted" must never be lost just because a webhook landed
   before a key was set.

   Prefers a customer balance transaction (a negative amount = credit) over an actual Credit Note:
   a Credit Note in Stripe's model exists to reduce/refund a specific already-finalized invoice,
   which doesn't fit a forward-looking "here's a month free next time" reward with no open invoice
   to attach to. A customer balance credit is simpler, needs no invoice reference, and is what
   actually reduces the referrer's NEXT invoice automatically. */
export async function issueReferralCreditNote(referrerEmployerId, referredEmployerId, amountCents, currency = "cad", note = "") {
  const existing = db.prepare("SELECT * FROM employer_referral_credits WHERE referred_employer_id = ?").get(referredEmployerId);
  const rowId = existing ? existing.id : nextId("refcred", "employer_referral_credits");
  if (!existing) {
    db.prepare(
      `INSERT INTO employer_referral_credits (id, referrer_employer_id, referred_employer_id, amount_cents, currency, status, trigger_reason)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    ).run(rowId, referrerEmployerId, referredEmployerId, amountCents, String(currency || "CAD").toUpperCase(), note || null);
  } else if (existing.status === "issued") {
    return db.prepare("SELECT * FROM employer_referral_credits WHERE id = ?").get(rowId); // already issued - never double-credit
  }

  const referrer = db.prepare("SELECT * FROM employers WHERE id = ?").get(referrerEmployerId);
  const client = getStripe();
  if (!client || !referrer?.stripe_customer_id) {
    // No Stripe configured yet, or the referrer has never actually been through Stripe checkout
    // (e.g. still on the Free plan) - nothing to attach a customer-balance credit to. Recorded for
    // replay: once a key is set / the referrer has a real Stripe customer, the admin retry button
    // calls this same function again with the row already in place.
    const reason = !client ? "Stripe not configured" : "Referrer has no Stripe customer yet (never completed a paid checkout)";
    db.prepare("UPDATE employer_referral_credits SET status = 'pending_stripe', error_message = ? WHERE id = ?").run(reason, rowId);
    console.log(`[referral-credit] ${reason} - queued referral credit ${rowId} for replay`);
    return db.prepare("SELECT * FROM employer_referral_credits WHERE id = ?").get(rowId);
  }

  try {
    const txn = await client.customers.createBalanceTransaction(referrer.stripe_customer_id, {
      amount: -Math.abs(Math.round(amountCents)), // negative = credit to the customer's balance
      currency: String(currency || "cad").toLowerCase(),
      description: note || `Referral credit for referring ${referredEmployerId}`,
    });
    db.prepare("UPDATE employer_referral_credits SET status = 'issued', stripe_reference_id = ?, error_message = NULL, issued_at = datetime('now') WHERE id = ?")
      .run(txn.id, rowId);
  } catch (e) {
    // Never let a Stripe-side failure crash the webhook handler that called this - the row stays
    // 'failed' with the error message (not the secret key - just Stripe's own error text) for an
    // admin to inspect and retry.
    db.prepare("UPDATE employer_referral_credits SET status = 'failed', error_message = ? WHERE id = ?").run(String(e.message || e).slice(0, 300), rowId);
  }
  return db.prepare("SELECT * FROM employer_referral_credits WHERE id = ?").get(rowId);
}
