# E2E Regression Suite — How to Run, Read, and Extend

This is the persistent Playwright regression suite (Playbook Phase H / §20 / §21). Before this
suite existed, QA on NorthHire was ad-hoc screenshot passes with no repeatable pass/fail signal.

## Running it

```
npm run test:e2e
```

That single command boots both servers automatically (see `playwright.config.ts`'s `webServer`
entries — API on :8787, Vite dev server on :5173) and runs the suite against them. Outside CI it
reuses an already-running dev server/API on those ports rather than killing and respawning them,
so you can also just run it against your own `npm run dev` + `npm run server` session.

Useful variants:

```
npx playwright test tests/e2e/auth.spec.ts            # one file
npx playwright test --project=chromium-desktop         # one project only
npx playwright test --project=chromium-mobile           # 390x844 mobile viewport
npx playwright show-report                               # open the last HTML report
```

`BASE_URL` and `API_BASE` env vars point the suite at a different environment (see
`tests/e2e/fixtures/server.ts`).

### A real gotcha: Cloudflare Turnstile

This repo's `.env` carries real Cloudflare Turnstile keys (bot-protection on signup). A headless
suite can't solve a live captcha widget, so `playwright.config.ts`'s API `webServer` entry blanks
`TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` for **that spawned process only** — it never touches
the real `.env`. If you see signup hang on a disabled "Finish and start matching" button, check
whether some *other*, already-running API server process (started outside this config, with the
real keys still loaded) is what the suite's `reuseExistingServer` attached to instead of spawning
its own — kill whatever's listening on :8787 and let Playwright start a fresh one.

## Reading a failure

1. `npx playwright show-report` after a run — click into a failing test for its trace, screenshot,
   and video (all captured `retain-on-failure` / `only-on-failure`).
2. `npx playwright show-trace test-results/<test-dir>/trace.zip` opens the full trace viewer
   (DOM snapshots at every step, network log, console log).
3. Every spec fails on ANY uncaught client-side error (`tests/e2e/fixtures/base.ts` wires
   `page.on("pageerror")` into every test's `page` fixture) — a failure whose stack trace points
   into `src/**` rather than a locator timeout usually means a real app crash, not a bad selector.

## Known runtime notes

- **Serial execution, one worker.** All specs run against the SAME SQLite-backed dev server and
  share one seeded dataset — parallel workers would race on rows another spec's assertions depend
  on (an application count, a CV list). Don't raise `workers` above 1 without addressing that.
- **`tests/e2e/seeker/cv.spec.ts`'s autosave test takes about 65 real seconds.** The save
  indicator's "N min ago" text is computed from a real `Date.now()` delta on a real 30s
  `setInterval` (`src/pages/seeker/cv.jsx`) — Playwright's fake-clock API (`page.clock`) was tried
  first to avoid the wait, but installing it after that `setInterval` was already running left the
  interval un-advanced by `clock.fastForward()`. Rather than fight timer-patching order for one
  assertion, the test takes the real wait. If this becomes a CI time problem, the fix is either
  (a) install `page.clock` before the CV editor mounts (requires either intercepting the very
  first navigation or exposing a `?fakeClock=1` test hook the app checks before scheduling its
  interval), or (b) drop the "N min ago" assertion and keep only "Saved just now". This test is
  also mildly flaky on its first attempt (typing into the summary field's contenteditable
  occasionally doesn't register before the "Saved just now" check) and passes reliably on the
  config's single retry — a `.type()`-into-`contenteditable` timing quirk, not a functional bug.
- **Demo accounts accumulate state across runs.** `sarah.chen@example.ca` and
  `marcus.b@example.ca` are real, persistent rows in the dev SQLite file — every suite run against
  the same database leaves their CV/application counts higher than before. Specs that need a
  guaranteed-clean starting state (the CV-picker states in `apply.spec.ts`) sign up a brand-new
  seeker via `fixtures/auth.ts`'s `signupFreshSeeker()` instead of relying on Sarah/Marcus being at
  some assumed count. `status.spec.ts` and `cv.spec.ts`'s cap test are written to tolerate
  Sarah/Marcus's count growing over time (they read the current state rather than assume 0).
- **`server/seed.js` is additive, not a reset.** `tests/e2e/fixtures/seed.ts`'s `resetSeedData()`
  re-runs it before a suite invocation to make sure every demo account/job/application the suite
  depends on exists — it does NOT undo mutations a previous run made (stage changes, new
  applications). There is no "wipe and reseed from scratch" step here by design: this suite is
  meant to run against the same persistent dev DB a human is also using, the same way the app
  itself is additive-only (`INSERT OR IGNORE`).

## Adding a new test

1. Pick (or add a row to) `docs/TEST_MATRIX.md` first — that's the source of truth for what
   Playbook §21 requires and what's actually covered.
2. Read the real component/route before writing locators. This suite's own history is a good
   argument for this: three separate wrong-assumption failures (a nav item that only opens a
   dropdown, an i18n key that wasn't actually the one wired to a button, a label with no
   `htmlFor`) all came from writing a locator against an assumed string instead of the literal
   rendered text. `grep` the `en.js` messages file for the literal string before trusting an i18n
   key name.
3. Use `tests/e2e/fixtures/auth.ts` for login — don't hand-roll another copy of the placeholder-
   based workaround for the unlabeled `<Field>` inputs.
4. Prefer accessible-name/role locators (`getByRole`, `getByText`) over CSS class selectors; this
   codebase's CSS classes are Tailwind utility soup that changes with any restyle. A few specs use
   structural selectors (`div.grid.gap-4 > div` for a JobCard) only where there's no accessible
   role to hang onto — `src/pages/shared/cards.jsx`'s `JobCard` is a clickable `<div>` with no
   `role`/`href`, which is itself a real a11y gap worth fixing separately.
5. Run the new spec directly (`npx playwright test tests/e2e/path/to/new.spec.ts`) before adding
   it to a batch — this suite hits a real, stateful dev database, so failures are often about
   sequencing/state assumptions rather than the assertion itself.
6. If a flow depends on something external-gated (a real Stripe webhook round-trip, Google Meet
   OAuth), write the test, then mark it `.fixme` with a comment naming the env var that would
   enable it for real — see the pattern check other specs use once employer/HR flows land.
7. Do not commit a red test. Either make it pass against a fresh dev server, or `.fixme` it with a
   reason.

## When a bug is fixed

Add (or un-skip) the regression test that would have caught it in the same PR as the fix — see
`server/serialize.js`'s `serializeCv()` fix + `tests/e2e/seeker/apply.spec.ts` for the pattern:
the bug is described in a comment directly above the code that would have caught it, not just in
a commit message.
