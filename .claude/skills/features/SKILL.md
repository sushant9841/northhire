---
name: features
description: Feature-completeness audit framework for NorthHire — the 4-bucket lens (looks functional but isn't / works but poorly / missing vs a real HR-staffing product / could be much better) for evaluating any module. Use when auditing the app, prioritizing what to build next, or asked whether a feature is "production ready."
---

# Feature Audit Framework

Every audit of this app — full-codebase or single-module — should sort findings into exactly these 4 buckets, per the user's explicit framework (2026-09-02, see [project_productionization_phase](project_productionization_phase.md)):

1. **Looks functional but isn't** — silent failures, buttons wired to nothing, `alert()`/`prompt()` standing in for a real flow, data that's seeded/mocked with no real read-write path, a modal or action that visually completes but never calls into the store. These are the highest-priority findings — they actively mislead a user or reviewer into thinking something works.
2. **Works but poorly** — the happy path functions but: no loading state, no error state, no empty state (or a lazy one-liner), validation that's too permissive or too strict, a flow that loses user input on back-navigation, an interaction that's technically correct but confusing (e.g. ambiguous button labels, no confirmation before a destructive action).
3. **Missing vs. a real global HR/staffing product** — gaps relative to category norms (Workday, BambooHR, Deel, Rippling, Gusto, Bullhorn for the staffing side). Concretely: audit trails, granular permissions beyond the current 5 roles, document e-signature, multi-currency/multi-country payroll, tax-form generation (T4/ROE are referenced in copy but is there an actual generation path?), notifications/email delivery, search/filtering at scale, bulk operations, data export/import beyond the one CSV path, SSO, API/webhooks, mobile apps, audit logging for compliance-sensitive actions (payroll approval, badge/role changes).
4. **Already built but could be much better** — functionally complete and wired correctly, but the UX, performance, or polish is below what a paying customer would expect: pagination-free tables that will choke on real data volume, no keyboard navigation, no undo, weak empty-state copy, a working feature with no onboarding/discoverability.

## How to run an audit

- Scope to a domain (marketing, seeker, employer, admin, staffing agency, HR Suite) or a single module — full-app audits are broad enough to warrant delegating per-domain research to Explore subagents in parallel (see the session-specific guidance on when to use Explore) rather than reading every file inline.
- Findings should be concrete and file/line-anchored where possible, not vague ("the pipeline page could be better" is useless; "EmpPipeline's bulk-move menu has no keyboard escape and no click-outside-to-close" is actionable).
- Don't fix while auditing unless the fix is trivial and the user asked for that — an audit is a report first; let the user prioritize across buckets before you start changing code. Bucket 1 findings are the exception worth flagging immediately even mid-audit if they're severe (e.g. data loss).
- Cross-reference: a "missing feature" (bucket 3) is not automatically higher priority than a "looks functional but isn't" bug (bucket 1) in the same area — a broken existing flow usually outranks an absent new one.
