---
name: backend
description: Backend and database architecture guidance for NorthHire — currently a stub, since the user has explicitly deferred choosing a backend target. Use only to check status/blockers on backend work, never to start implementing a backend or data-access abstraction layer without the user having specified a target provider.
---

# Backend — deferred, do not start without explicit go-ahead

The user has explicitly said they'll specify the backend target later (Supabase, AWS, Firebase, MongoDB, Postgres, or another provider were all named as options, 2026-09-02 — see [project_productionization_phase](project_productionization_phase.md)). **Do not start building a data-access abstraction layer, choose a provider, or scaffold backend infrastructure until they do.**

## Current state (as of the productionization-phase kickoff)

The entire app runs on a hand-rolled, in-memory React store (`src/store/useStore.js`, `useHrStore.js`) seeded from static data in `src/store/seed/*`, persisted only to `localStorage` (see `LS_KEY` in `useStore.js`). There is no server, no real database, no auth beyond client-side demo-credential checks. Every "save" is a `setState` call.

## What to do if this skill triggers

- If the user asks "what's blocking backend work" or similar status questions: answer from this file and the project memory, don't start designing.
- If the user starts specifying a target (e.g. "let's use Supabase"): that's the signal to actually begin. At that point, before writing code, work out with the user: which entities move first (auth is usually the forcing function), whether the abstraction layer should be a repository/adapter pattern behind the existing `useStore` shape (so the loud majority of UI code doesn't need to change) or something else, and how local dev will work without the real cloud target wired up yet.
- Don't preemptively "future proof" other work (the component library build, code optimization pass) by routing things through a speculative backend interface that doesn't exist yet — that's exactly the premature-abstraction pattern this project's own conventions warn against (see [code-optimization](../code-optimization/SKILL.md)).
