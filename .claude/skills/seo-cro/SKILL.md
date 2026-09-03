---
name: seo-cro
description: SEO and conversion-rate-optimization guidance for NorthHire's marketing/public pages — use when asked to improve search visibility, page titles/meta, content structure for search, or conversion of landing/pricing/signup flows.
---

# SEO / CRO

## Technical reality check first

NorthHire is a client-side React SPA (`App.jsx` + in-memory route state via `A.go(...)`) with **no server-side rendering and no real URL routing** — every "page" is a JS state change, not a distinct URL. This is the single biggest constraint on SEO work here:
- There's currently no per-page `<title>`/meta description, no sitemap, no distinct crawlable URLs for job postings, blog posts, or marketing pages — a crawler sees one shell HTML document regardless of in-app "route."
- Before writing per-page SEO copy or meta tags, check whether real routing (React Router with actual URL paths, or a framework with SSR/SSG like Next/Remix) is in scope — meta-tag content is close to worthless without addressable URLs and content in the initial HTML response. Flag this architectural gap to the user rather than layering meta-tag content onto a system that can't serve it to a crawler yet.
- If/when real routing exists, the highest-value SEO surface is the marketing site (`pages/marketing/*`) and job/blog/training detail pages — not the authenticated dashboards, which crawlers should never see.

## CRO — this is actionable today regardless of SSR status

- The home page, pricing page, and forEmployers page already carry real numbers (hire-time stats, plan prices, testimonials) — lean on those over adjectives in any CRO copy pass; concrete numbers convert better than claims.
- Check CTA consistency: does every pricing tier's button say what happens next (Start free / Start trial / Book a demo), or do some just say "Choose"? Vague CTAs are a common, easy CRO win.
- Multi-step forms (signup, job-post wizard) should show progress and never lose entered data on a validation error — audit these against the "functional but poor" bucket in the productionization audit, not just as a CRO nicety.
- Trust signals (verified badges, testimonial attribution, license numbers for the staffing agency) are already present in the data — check they're actually visible above the fold on the pages meant to convert, not buried.

## Process

Treat this as advisory until the user decides on real routing/SSR — don't silently add `<meta>` tags or Open Graph content that has no way to reach a crawler. When asked to "improve SEO," first answer *whether the architecture supports it yet*, then do the CRO half of the work, which doesn't depend on that answer.
