import { resetSeedData } from "./fixtures/seed";

/*
 * Runs once before the whole suite (wired via playwright.config.ts's `globalSetup`). Tops up the
 * dev database with the demo accounts/jobs/applications every spec in this suite assumes exist
 * (Sarah, Marcus, PCL Construction's HR employees, the seed job catalogue, etc.) — see
 * fixtures/seed.ts for why this is additive rather than a destructive reset.
 */
export default function globalSetup() {
  resetSeedData();
}
