/* Locale-aware date/time/currency formatting. fr-CA uses Quebec French conventions
   (e.g. "11 septembre 2026", "1 234,56 $") which differ from both en-CA and France's fr-FR
   (Intl's "fr-CA" locale data already gets this right — no manual formatting needed). */

const intlLocale = locale => (locale === "fr-CA" ? "fr-CA" : "en-CA");

export function formatDate(date, locale, opts) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), opts || { year: "numeric", month: "long", day: "numeric" }).format(d);
}

export function formatDateShort(date, locale) {
  return formatDate(date, locale, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateNumeric(date, locale) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale)).format(d);
}

export function formatDateTime(date, locale, opts) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), opts || { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

export function formatCurrency(amount, locale, currency = "CAD") {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(n);
}

export function formatNumber(n, locale, opts) {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(Number(n) || 0);
}

export function formatTime(date, locale, opts) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), opts || { hour: "2-digit", minute: "2-digit" }).format(d);
}
