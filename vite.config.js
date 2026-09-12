import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'

/* Build-time identity for this bundle. In CI we accept BUILD_ID from env; locally we fall
   back to the current commit hash (or a random-ish timestamp if the tree isn't a repo).
   The client compares it against /api/version at runtime and shows a "new version available"
   banner when they diverge - so a user never has to hard-refresh to pick up shipped code. */
function resolveBuildId() {
  if (process.env.BUILD_ID) return process.env.BUILD_ID
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() }
  catch { return `dev-${Date.now()}` }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true },
  define: { __BUILD_ID__: JSON.stringify(resolveBuildId()) },
})
