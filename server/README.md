# NorthHire API (backend scaffold)

A real Express + SQLite backend, started per the user's explicit go-ahead to begin backend
work without waiting for a named stack. Zero-cost-to-start on purpose: `node:sqlite` is
Node's built-in module (no native compile step, no separate DB server to install), and
Express/cors are the only two added npm dependencies.

## Running it

```
npm run server:seed   # creates server/data/northhire.sqlite and populates it from src/store/seed/*.js
npm run server        # starts the API on http://localhost:8787
```

`server/data/*.sqlite*` is gitignored — delete the file and re-run `server:seed` any time to reset to a clean seeded state.

Demo logins after seeding: any seeker email from `src/store/seed/people.js` (e.g. `sarah.chen@example.ca`) with password `northhire2026`; any employer's `owner` email from `src/store/seed/employers.js` (e.g. `hr@pcl.com`) with password `employer2026`.

## What's here

- `db.js` — schema (`users`, `employers`, `jobs`, `applications`, `sessions`) and the SQLite connection.
- `auth.js` — password hashing (`crypto.scrypt`, no bcrypt dependency needed), session tokens, `requireAuth`/`requireRole` middleware.
- `serialize.js` — DB row → API shape, including computing `posted`/`daysLeft` display strings from real timestamps at read time instead of storing frozen "2 days ago" text that would never advance (the exact staleness bug the frontend's seed data has).
- `routes/` — `auth` (signup/login/me), `jobs` (list/detail/create/patch-status), `employers` (list/detail), `applications` (apply/list-mine/list-for-a-job/move-stage).
- `seed.js` — imports directly from `src/store/seed/*.js` so the backend starts with the same data the client-only prototype already shows, not a second diverging dataset.

## What's deliberately NOT done here

This is a real, running vertical slice of the core job-marketplace loop (accounts, jobs,
applications) — not a token gesture, and not a full migration. The existing React app
(`useStore.js`/`useHrStore.js`/`useStaffingStore.js`) still runs entirely client-side against
localStorage and is untouched by this backend. Wiring the frontend to actually call this API
means converting every synchronous store mutation this app relies on into an async fetch with
loading/error states — a large, high-risk rewrite of the app's central data layer that could
easily leave the currently-working prototype broken if rushed alongside everything else this
session did. That migration, plus extending the schema to cover HR/staffing/content (currently
only the seeker/employer/jobs/applications core exists), is real, substantial follow-up work —
not started here, and shouldn't be treated as implied by this scaffold's existence.

## Extending the schema

Follow the pattern in `db.js`/`seed.js`: add a `CREATE TABLE IF NOT EXISTS` block, a matching
`serialize*` function, a route module, and a `SEED_*` import in `seed.js` pulling from the
matching `src/store/seed/*.js` file — most of the remaining domains (HR, staffing, content)
already have seed files shaped the same way as `jobs.js`/`employers.js`.
