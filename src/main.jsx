import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LocaleProvider } from './i18n/i18n.jsx'

/* Offline support (Priority-4 #8): app shell + hashed assets cached, read-only public API
   responses served stale-while-revalidate, and punch-in/out queued in IndexedDB when offline
   and replayed on reconnect. Registered only in production builds - dev's HMR and the SW's
   caching would otherwise fight each other. */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      window.addEventListener("online", () => {
        reg.active?.postMessage({ type: "northhire-replay-punches" });
      });
    }).catch(() => {});
  });
}
// QA-r5: dev mode actively purges any stale service worker + its caches. A user who visited a
// production deploy at any point has that SW installed; switching to dev then means the dev
// bundle races against a cached prod shell, and the version-banner never clears because the
// SW keeps serving old code. Unregister every SW and delete every cache on load — dev workflow
// is HMR, not service workers.
if ("serviceWorker" in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
  if ("caches" in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
