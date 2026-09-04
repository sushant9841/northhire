# NorthHire API (backend, wired to the frontend)

A real Express + SQLite backend, started per the user's explicit go-ahead to begin backend
work without waiting for a named stack, then wired into the React app on a follow-up request.
Zero-cost-to-start on purpose: `node:sqlite` is Node's built-in module (no native compile step,
no separate DB server to install), and Express/cors/playwright are the only added
dependencies (playwright is dev-only, for verifying this end-to-end).

## Running it

Two processes, both required for the full experience:

```
npm run server:seed   # creates server/data/northhire.sqlite and populates it from src/store/seed/*.js
npm run server        # starts the API on http://localhost:8787
npm run dev           # (separate terminal) the Vite frontend, as before
```

`server/data/*.sqlite*` is gitignored — delete the file and re-run `server:seed` any time to reset to a clean seeded state.

Demo logins after seeding (same credentials the LoginPage already advertises): any seeker email from `src/store/seed/people.js` (e.g. `sarah.chen@example.ca`) with password `Password123`; any employer's `owner` email from `src/store/seed/employers.js` (e.g. `hr@pcl.com`) with password `Employer123`; `admin@northhire.ca` with `Admin1234`.

**If the API isn't running**, the frontend still works: jobs/employers fall back to whatever local/seed data it already has (a console warning notes the API is unreachable), and any action that genuinely needs the server (signing in, posting a job, applying) shows a clear "Can't reach the NorthHire API — is `npm run server` running?" error instead of crashing.

## What's here

- `db.js` — schema (`users`, `employers`, `jobs`, `applications`, `sessions`) and the SQLite connection.
- `auth.js` — password hashing (`crypto.scrypt`, no bcrypt dependency needed), session tokens, `requireAuth`/`requireRole` middleware.
- `serialize.js` — DB row → API shape, including computing `posted`/`daysLeft` display strings from real timestamps at read time instead of storing frozen "2 days ago" text that would never advance (the exact staleness bug the frontend's seed data has).
- `routes/` — `auth` (signup/login/me), `jobs` (list with `status=all` support/detail/view-counter/create/patch status+flag/CSV import), `employers` (list/detail/patch profile+verify+hold+plan, with owner email joined in), `applications` (apply/list-mine/list-for-a-job/list-for-an-employer-across-all-jobs/move-stage/reject/withdraw/restore/accept-offer, each with real history tracking), `users` (self profile patch, admin list+suspend).
- `seed.js` — imports directly from `src/store/seed/*.js` so the backend starts with the same data the client-only prototype already shows, not a second diverging dataset.

## Frontend wiring

`src/helpers/api.js` (fetch wrapper + session token in localStorage) and `src/helpers/apiMap.js`
(field-name bridging, e.g. `daysLeft` → `dl`) are the two new files; the actual wiring lives in
`src/store/useStore.js`:

- **Global sync on mount**: `jobs` and `employers` are fetched from the API (replacing the seed
  arrays) and kept as the app's single in-memory source of truth, exactly like before this
  wiring existed — every existing page/derived computation (matching, scoring, analytics, admin
  moderation) keeps working unchanged since the API's response shape matches the old seed shape.
- **Per-session sync**: `applications` are fetched scoped to whoever is logged in (a seeker's own
  via `/applications/mine`, an employer's own across all their jobs via
  `/applications/employer/mine`) whenever `user` changes - this is what makes an application a
  seeker submits in one browser actually show up in the employer's pipeline in another, which a
  single mount-time fetch wouldn't catch.
- **Auth**: `loginWithPassword`/`completeSignup`/`completeEmployerSignup`/`logout` all call the
  real API now (async - the 3 call sites in `auth/pages.jsx` that consumed their return value
  synchronously were updated to `await`; every other caller was already fire-and-forget and
  needed no change since React ignores a discarded returned promise).
- **Mutations**: `publishJob`, `toggleJobStatus`, `flagJob`, `importJobsCSV`, `submitApply`,
  `moveApp`, `rejectApp`, `withdraw`, `restoreApp`, `acceptOffer`, `verifyEmployer`,
  `holdEmployer`, `toggleSuspend`, `saveCompany`, `choosePlan`, `saveProfile` all call their
  matching endpoint and fold the server's response back into local state, preserving every
  existing side effect (notify/log/saved-search-alerts/HR-onboarding-suggestion) exactly as
  before.

## What's still NOT wired (deliberately, not an oversight)

HR Suite, the staffing agency console, blogs/trainings, messages/interviews/reviews, CVs,
2FA, payment methods, and the platform activity log all still run entirely client-side against
localStorage - `useHrStore.js`/`useStaffingStore.js` are untouched. Extending the backend to
cover those is real, substantial follow-up work with its own schema design, not implied by this
wiring's existence.

## Extending the schema

Follow the pattern in `db.js`/`seed.js`: add a `CREATE TABLE IF NOT EXISTS` block, a matching
`serialize*` function, a route module, and a `SEED_*` import in `seed.js` pulling from the
matching `src/store/seed/*.js` file — most of the remaining domains (HR, staffing, content)
already have seed files shaped the same way as `jobs.js`/`employers.js`.
