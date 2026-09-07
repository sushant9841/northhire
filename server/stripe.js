// Real Stripe integration (test mode) for plan checkout - not a stub. Gates on STRIPE_SECRET_KEY
// being set (same graceful-degradation pattern as oauth.js/turnstile.js); until set, checkout
// routes return a clear 503 instead of crashing on a missing key.
import Stripe from "stripe";
import { salesTaxRate, salesTaxLabel } from "../src/helpers/salesTax.js";

let _stripe = null;
export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}
function stripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* GST/HST is folded into one recurring unit_amount rather than a second Checkout line item -
   Stripe's subscription-mode Checkout Sessions require every line to be recurring, and computing
   the real per-province tax ourselves (the same shared helper staffing/HR invoicing already use)
   is simpler and more portable across Stripe API versions than depending on Stripe Tax being
   separately activated in the dashboard. The pretax/tax split is still recorded in our own
   employer_invoices table for a real itemized receipt. */
export async function createCheckoutSession({ employerId, employerEmail, plan, priceDollars, province }) {
  const taxRate = salesTaxRate(province);
  const pretax = priceDollars;
  const tax = Math.round(pretax * taxRate * 100) / 100;
  const total = Math.round((pretax + tax) * 100) / 100;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: employerEmail,
    line_items: [{
      price_data: {
        currency: "cad",
        product_data: { name: `NorthHire ${plan} plan`, description: `Includes ${salesTaxLabel(province)} — $${pretax.toFixed(2)} + $${tax.toFixed(2)} tax` },
        recurring: { interval: "month" },
        unit_amount: Math.round(total * 100),
      },
      quantity: 1,
    }],
    success_url: `${FRONTEND_URL}/employer/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/pricing?checkout=cancelled`,
    metadata: { employerId, plan, pretax: String(pretax), tax: String(tax), taxLabel: salesTaxLabel(province) },
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
