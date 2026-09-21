# Stripe integration

NorthHire uses Stripe for two things:

1. **Plan checkout** (existing) — Checkout Sessions + Billing Portal for employers moving onto a paid plan (`server/routes/billing.js`, `server/stripe.js`).
2. **Employer referral credits** (Priority-4 #9) — a real Stripe customer-balance credit issued to a referring employer once the company they referred completes its first paid month.

## Local dev setup

1. `.env` needs:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...   # see below - only needed to test the referral-credit trigger
   ```
   The server reads `.env` via `process.loadEnvFile()` at boot (`server/index.js`). Every Stripe-backed route/feature checks `stripeConfigured()` (or `getStripe() === null`) and degrades gracefully (a clear 503, or a `pending_stripe` row) rather than crashing when the key is absent — this is the same pattern `oauth.js`/`turnstile.js` already use.

2. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) once, then forward webhook events to the local server:
   ```
   stripe login
   stripe listen --forward-to localhost:8787/api/billing/stripe-webhook
   ```
   The CLI prints a `whsec_...` value the first time you run `listen` — put that in `.env` as `STRIPE_WEBHOOK_SECRET` and restart the server. Without it, `POST /api/billing/stripe-webhook` always returns `503` with a message pointing back at this same command — it never silently accepts an unverified webhook call.

3. Trigger the referral flow end-to-end against the Stripe **test** dashboard:
   ```
   stripe trigger invoice.paid
   ```
   or, for a real walkthrough: sign up employer A, copy their referral link (`/signup?ref=<code>`), sign up employer B through it, run B's Stripe Checkout in test mode (any [test card](https://stripe.com/docs/testing), e.g. `4242 4242 4242 4242`), and complete payment. The webhook fires `invoice.paid` for B's subscription; the server credits A's Stripe customer balance for one month of B's plan tier.

## Credit-issuance flow

```
employer B (referred_by_employer_id = A) completes Stripe Checkout for a paid plan
        │
        ▼
Stripe fires invoice.paid  →  POST /api/billing/stripe-webhook (signature-verified)
        │
        ▼
handleInvoicePaid(invoice) in server/routes/billing.js:
  - looks up employer B by invoice.customer (stripe_customer_id)
  - only proceeds if B has referred_by_employer_id AND this is B's first paid invoice
    AND no employer_referral_credits row exists yet for B (UNIQUE index enforces this too)
        │
        ▼
issueReferralCreditNote(A, B, amountCents, "cad", note)  in server/stripe.js
  - INSERTs (or reuses) one employer_referral_credits row, status='pending'
  - if Stripe isn't configured, or A has no stripe_customer_id yet (still on Free) →
    status='pending_stripe', logged, row stays for replay
  - else calls stripe.customerBalanceTransactions.create(A.stripe_customer_id, {amount: -cents, ...})
    → status='issued' on success, status='failed' + error_message on a Stripe-side error
```

A **customer balance transaction** (not a Credit Note) is used: a Credit Note exists to reduce/refund an already-finalized invoice, which doesn't fit "here's a month free on your *next* invoice" with no invoice to attach to yet. A negative balance transaction is simpler and Stripe automatically applies it to the referrer's next invoice.

Only the **referrer** (A) receives the credit — the referred company (B) is not separately credited. (`employer.team.referralDesc` was updated to say this plainly; an earlier draft of that copy said "we credit both accounts," which was never actually implemented.)

## Idempotency

- `employer_referral_credits.referred_employer_id` has a **UNIQUE index** — a given referral relationship can only ever produce one credit row, full stop, regardless of how many times `invoice.paid` fires (webhook redelivery, a later monthly renewal, etc).
- `issueReferralCreditNote()` itself also no-ops (returns the existing row untouched) if it's already `status = 'issued'` — the admin retry button and the webhook path both call the same function, so neither can double-credit.

## Endpoints

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/employers/me/referral-credits` | employer (own account) | `{ credits, earnedCents, pendingCents }` for the signed-in employer's own referral card (EmpTeam). |
| `GET /api/admin/referral-credits` | admin (`support`/`moderator` scope) | Every credit row, cross-employer, newest first. |
| `POST /api/admin/referral-credits/:id/retry` | admin (`moderator` scope) | Re-runs `issueReferralCreditNote` for a `pending_stripe` or `failed` row. Refuses (`409`) if already `issued`. |
| `POST /api/billing/stripe-webhook` | Stripe signature only (no session auth — this is server-to-server) | Verifies `Stripe-Signature` against `STRIPE_WEBHOOK_SECRET`; handles `invoice.paid` (referral trigger), `credit_note.created` and `charge.refunded` (logged for now). |

## Production requirements

- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`: **live-mode** keys (`sk_live_…` / `pk_live_…`), set as real environment variables — never committed, never logged (see below).
- `STRIPE_WEBHOOK_SECRET`: create a webhook endpoint in the Stripe **Dashboard** (Developers → Webhooks) pointing at `https://<your-domain>/api/billing/stripe-webhook`, subscribed to at least `invoice.paid`, `credit_note.created`, `charge.refunded`. Copy its signing secret into the environment as `STRIPE_WEBHOOK_SECRET`. This is a *different* secret from the one the CLI prints for local dev — each webhook endpoint (CLI-forwarded or dashboard-registered) has its own.
- The billing portal's default configuration must be saved once in the Dashboard (Settings → Billing → Customer portal) for `POST /api/billing/portal` to work — Stripe returns a clear error otherwise, surfaced as-is rather than swallowed.
- **The Stripe secret key is never logged.** Every error path in `server/stripe.js` and the webhook handler logs Stripe's own error message text only, never `process.env.STRIPE_SECRET_KEY` or any request/response object that might embed it.
