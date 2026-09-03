---
name: content
description: Copywriting and content-tone rules for NorthHire's marketing and product copy — use when writing or rewriting any user-facing text (marketing pages, empty states, error messages, onboarding, emails) or when asked to make copy sound less robotic, generic, or promotional.
---

# Content & Copy

NorthHire is a Canadian job platform + staffing agency + HR Suite, aimed at trades, healthcare, transport, hospitality, and warehouse workers as much as office workers — the existing copy already leans into this ("built for the 90%," wage-transparency-first) and that positioning is worth protecting, not smoothing into generic SaaS voice.

## What "sounds robotic" actually means here

When asked to fix copy that reads as generic/robotic/overly promotional, look for:
- Marketing-speak with no concrete claim behind it ("seamless," "revolutionize," "empower," "best-in-class") — replace with the specific mechanism or number the page already has nearby (this app is dense with real seed data: wage ranges, hire-time stats, plan prices — use those instead of adjectives).
- Sentences that could describe any SaaS product, not specifically a Canadian trades/healthcare/staffing platform. If a line could be pasted into a generic HR tool's landing page unchanged, it's not doing its job.
- Repeated sentence shapes back-to-back (three feature bullets that all start "Get real-time X" or similar) — vary structure, don't just vary the noun.
- Explaining what a feature does when the surrounding UI already shows it — copy should carry the *why it matters*, not restate the UI.

## What NOT to flatten

- Don't strip out the Canadian specificity (CRA, WSIB, PIPEDA, provinces, HST, Red Seal) — that's the product's actual differentiation, not filler.
- Don't over-correct into cuteness or forced personality. Plain, confident, specific beats "clever."
- Pre-existing intentional copy choices (e.g. staffing agency's blunt "we carry the cash gap" explanation) are a working example of the target tone — direct, plain-English, no hedging.

## Process for a content pass

1. Scope first — ask whether the pass is "everything" or specific pages the user has actually noticed reads badly. Don't silently rewrite copy nobody flagged as a problem; a rewrite is a diff a human has to review, and unscoped ones are expensive to review.
2. Read a page's copy in full context (not isolated strings) before rewriting — tone judgments made on a fragment are usually wrong.
3. Preserve every route key, action name, and data binding exactly — this is a copy pass, not a refactor. Match the discipline already established in the Tailwind conversion (style/layout only, zero behavior change) — see [project_tailwind_conversion](project_tailwind_conversion.md) memory.
4. Flag (don't silently fix) anything that looks like a factual/compliance claim you're not sure is accurate (e.g. specific WSIB/CRA figures, license numbers) — those need the user's sign-off, not just tone judgment.
