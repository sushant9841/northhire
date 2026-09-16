# NorthHire — Product Charter

This document is the standing product-quality charter for NorthHire. It's the governance framework every future audit / implementation pass reads before touching code.

Origin: user brief 2026-09-16. Verbatim in the session transcript; the operative rules from it are reproduced here as the working reference so agents never re-derive them.

## Roles this framework assumes

Every implementation pass acts as the combined: Senior Product Architect, Senior UX/UI Designer, Product Manager, Senior Frontend Engineer, Senior Backend Engineer, QA Engineer, Accessibility Engineer, Mobile UX Specialist, SaaS Product Designer, Design Systems Architect.

## The one rule that beats all others

**This is not a prototype.** A feature is complete when a real user can accomplish the goal end-to-end with clear guidance, minimal friction, appropriate validation / loading / empty / error / success states, correct permissions, correct plan gating, correct responsive behaviour, no dead ends, and a clear next action. Rendering ≠ complete.

## The three products

- **P1 — Job Seeker** (free). Registration, auth, profile, search, discovery, recommendations, job detail, saved jobs, applications, tracking, CV builder (max 5 CVs), training, notifications, settings. Mobile-first.
- **P2 — Employer platform.** Free (1 active job) / Growth (10 active + messaging + interview scheduling + talent pool + CSV import + full analytics + 2 featured/mo + branded page + 5 seats) / Enterprise ($599/mo, unlimited everything + API + SSO/OIDC + dedicated AM + HR Suite).
- **P3 — NorthHire HR Suite** (Enterprise only). Directory, profiles, attendance, punch, leave, tasks, calendar, events, training, internal chat (1:1, group), invoices, salary, notifications, role management (Owner / Admin / HR / Finance / Employee), feature toggles per module, sync with public NorthHire profiles.

## Governance rules (verbatim intent)

**Do not treat this as a prototype.** Do not simply patch. Do not redesign unrelated areas. Do not remove functionality without approval. Do not silently break APIs or storage. Do not claim done because the page renders.

**Two modes of operation:**
1. **AUDIT** — no code changes; produce findings + severity + affected flows + recommendation + risk + dependencies; wait for approval.
2. **IMPLEMENTATION** — only approved changes. Before writing, explain what/why/risk/tests, then implement.

**Priority system:**
- P0 — security, auth, data loss, payment failures, catastrophic
- P1 — core-flow blockers (cannot apply / post / publish / hire / HR core broken)
- P2 — UX/workflow (confusing flow, missing state, unclear next step)
- P3 — visual (spacing, typography, alignment, responsive)
- P4 — enhancement

Always P0/P1 before P3.

**Design bar:** modern / premium / trustworthy / professional / clean / calm / approachable / Canadian-professional / contemporary / polished / technically sophisticated without feeling complicated. Subtle beats flashy. Avoid AI-generic patterns (excessive cards, giant hero, gradient text, decorative blobs, oversized icons, repetitive dashboard cards).

**Quality reference bar:** Linear / Notion / Stripe / Shopify / Slack / Airbnb / modern HRIS-ATS products. Reference for hierarchy / consistency / clarity / interaction / information architecture / polish / responsive behaviour — do not copy their designs.

## Standing rules already in memory (reproduced for external readers)

- Session/auth is load-bearing (any bug is P0).
- Every localStorage key must be on the whitelist (locale hint, cookie ack, panel-collapsed, unsent draft, kiosk device token). Business data goes through `/api/*`.
- Zero user-side hard refresh — version banner + cache-bust `index.html` handle upgrade friction.
- Every user-facing string wrapped in `t()`, both `en.js` and `fr.js` (Quebec French: courriel / employé·e / candidat·e / poste / paie / quart / feuille de temps).
- Green build ≠ working code — every shell / route wrapper / hook order change exercised in a live page-load before commit.
- Server is authoritative. `useStore.set(...)` calls that never round-trip are bugs.
- Never third-party image CDNs on tracker-blocklisted domains (Clearbit, randomuser.me — both already replaced with local SVG fallbacks).
- Cost discipline — default subagent tier Haiku, escalate deliberately, keep briefs short, no idle background agents.

## Deliverables the charter mandates (audit + docs)

The charter's "First Task" mandates 26 deliverables — inventories (routes, features, components, roles, permissions, plan-gating, APIs, DB, tests), flow maps (seeker / employer / HR / admin), current design-system assessment, and problem catalogs (UX, functional, missing flows / states, mobile, a11y, perf, tech debt, high-risk areas). Plus a phased roadmap A → I ending in production QA.

The initial audit lives at `docs/INITIAL_AUDIT.md`. Subsequent doc buildouts (product map, personas, user flows, permissions, plans-and-limits, design system, regression matrix) each get their own file and are populated per-phase, not all at once.

## Approval gates (mandatory)

- No code changes during audit.
- Phase A cannot begin until the audit + phased roadmap is approved.
- Every subsequent phase requires explicit approval to start.
- Every major product/UX change during implementation is explained + approval-gated, not silently shipped.
