/* Server address helper — every spec and fixture reads the target host from here instead of
   hardcoding localhost, so the whole suite can be pointed at a different environment with
   `BASE_URL=... API_BASE=... npx playwright test` without touching a single spec file. */
export const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
export const API_BASE = process.env.API_BASE || "http://localhost:8787";
