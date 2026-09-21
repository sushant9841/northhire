import { execSync } from "node:child_process";

/*
 * Demo seed reset. `server/seed.js` is an additive top-up (every INSERT uses INSERT OR IGNORE —
 * see the file's own header comment), so re-running it against the live dev DB never duplicates
 * rows or fails on a populated database; it just makes sure every row the suite depends on
 * (demo accounts, seed jobs, seed applications) exists before a run. It does NOT reset rows a
 * previous test run mutated (stage changes, new applications, etc.) — specs that need a clean
 * slate for a specific row create their own fixture data via the API instead of relying on
 * global resets, since a destructive reset would fight the "reuseExistingServer" dev-server
 * model this config uses locally.
 */
export function resetSeedData() {
  execSync("node server/seed.js", { stdio: "inherit", cwd: process.cwd() });
}
