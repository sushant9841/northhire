import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { en } from "./messages/en.js";
import { fr } from "./messages/fr.js";

/* ═══════════════ Lightweight in-house i18n (Bill 96 / Quebec French requirement) ═══════════════
   Deliberately NOT react-intl / i18next — this app only needs two locales and flat namespaced
   catalogs, so a ~60-line hook is enough surface area to support the whole app rather than a
   heavy dependency. Supports {placeholder} interpolation and falls back en-CA -> raw key so a
   missing translation never renders "undefined". */

export const LOCALES = ["en-CA", "fr-CA"];
export const DEFAULT_LOCALE = "en-CA";
const CATALOGS = { "en-CA": en, "fr-CA": fr };
const STORAGE_KEY = "nh_locale";

function normalizeLocale(l) {
  return l === "fr-CA" || l === "fr" ? "fr-CA" : "en-CA";
}

export function readStoredLocale() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeLocale(stored);
  } catch { /* localStorage unavailable (private mode, SSR) - fall through to default */ }
  return DEFAULT_LOCALE;
}

function lookup(catalog, key) {
  return key.split(".").reduce((o, k) => (o == null ? o : o[k]), catalog);
}

function interpolate(str, params) {
  if (!params || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
}

const LocaleCtx = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, _setLocale] = useState(() => (typeof window === "undefined" ? DEFAULT_LOCALE : readStoredLocale()));

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "fr-CA" ? "fr-CA" : "en-CA";
  }, [locale]);

  const setLocale = useCallback(next => {
    const norm = normalizeLocale(next);
    _setLocale(norm);
    try { window.localStorage.setItem(STORAGE_KEY, norm); } catch { /* best-effort persistence only */ }
  }, []);

  const t = useCallback((key, params) => {
    const primary = lookup(CATALOGS[locale], key);
    if (primary !== undefined) return interpolate(primary, params);
    const fallback = lookup(CATALOGS[DEFAULT_LOCALE], key);
    if (fallback !== undefined) return interpolate(fallback, params);
    return key; // last resort: surface the key itself rather than throw or render blank
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

/* useTranslation() — the app-facing hook. Returns {t, locale, setLocale}. */
export function useTranslation() {
  const ctx = useContext(LocaleCtx);
  if (!ctx) {
    // Defensive fallback for any component rendered outside <LocaleProvider> (e.g. a stray test) -
    // still functional, just not reactive to locale changes.
    const locale = typeof window === "undefined" ? DEFAULT_LOCALE : readStoredLocale();
    return { locale, setLocale: () => {}, t: (key, params) => interpolate(lookup(CATALOGS[locale], key) ?? key, params) };
  }
  return ctx;
}
