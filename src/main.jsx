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
      // Background Sync isn't supported everywhere (Safari, Firefox) - replay right away on
      // reconnect as a fallback so a queued punch isn't stuck until the tab is reloaded.
      window.addEventListener("online", () => {
        reg.active?.postMessage({ type: "northhire-replay-punches" });
      });
    }).catch(() => { /* offline support is a nice-to-have, never block the app on it */ });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
