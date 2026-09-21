import { defineConfig, devices } from "@playwright/test";

/*
 * Persistent E2E regression suite (Playbook Phase H / §20 / §21).
 *
 * Two webServer entries boot the API (Express, :8787) and the Vite dev server (:5173)
 * automatically so `npm run test:e2e` is a single command. Both use `reuseExistingServer`
 * outside CI so a developer's already-running `npm run dev` / `npm run server` isn't killed
 * and re-spun — Playwright just checks the port answers and attaches.
 *
 * Workers are pinned to 1 and tests run serially: the suite shares one SQLite-backed dev
 * server and one seeded dataset, so parallel workers would race on the same rows (an
 * application created by one spec could shift indices/counts another spec asserts on).
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_BASE = process.env.API_BASE || "http://localhost:8787";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: [
    {
      command: "node server/index.js",
      url: `${API_BASE}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      // Turnstile (server/turnstile.js) is gated purely on TURNSTILE_SECRET_KEY being set, and
      // this repo's .env carries real Cloudflare Turnstile keys — signup would otherwise require
      // solving a real captcha widget, which a headless suite can't do. Blanking both keys for
      // just this spawned test-server process (never touching the real .env) disables that one
      // check for the suite the same way local dev without the key configured already works.
      env: { PORT: "8787", TURNSTILE_SITE_KEY: "", TURNSTILE_SECRET_KEY: "" },
    },
    {
      command: "npx vite --port 5173 --strictPort",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
