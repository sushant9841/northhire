import { db } from "./db.js";

/* Bill 96: every transactional/commercial email must be able to go out in the recipient's own
   language. Deliberately a small hand-written dictionary (mirroring the front-end's
   src/i18n/messages/{en,fr}.js approach) rather than a shared bundle with the client — server
   and client run in different module systems here, and the set of strings an email needs is
   small and stable enough that duplication is cheaper than a shared package. */

export function localeForEmail(email) {
  if (!email) return "en-CA";
  const row = db.prepare("SELECT locale FROM users WHERE email = ?").get(String(email).toLowerCase());
  return row?.locale === "fr-CA" ? "fr-CA" : "en-CA";
}

export function localeForUserId(userId) {
  if (!userId) return "en-CA";
  const row = db.prepare("SELECT locale FROM users WHERE id = ?").get(userId);
  return row?.locale === "fr-CA" ? "fr-CA" : "en-CA";
}

// Agency staff (the staffing console) are a separate account table from `users` and can share an
// email address with an unrelated NorthHire account, so their locale is looked up independently.
export function localeForAgencyStaffEmail(email) {
  if (!email) return "en-CA";
  const row = db.prepare("SELECT locale FROM agency_staff WHERE lower(email) = ?").get(String(email).toLowerCase());
  return row?.locale === "fr-CA" ? "fr-CA" : "en-CA";
}

const EMAIL_STRINGS = {
  "en-CA": {
    resetSubject: "Reset your NorthHire password",
    resetBody: code => `Your reset code is ${code}. It expires in 15 minutes.`,
    staffingResetSubject: "Reset your NorthHire Staffing password",
    signinCodeSubject: "Your NorthHire sign-in code",
    signinCodeBody: code => `Your sign-in code is ${code}. It expires in 15 minutes.`,
    verifySubject: "Confirm your NorthHire email",
    verifyBody: (name, link) =>
      `Hi ${name},\n\nConfirm this is your address:\n${link}\n\nIf you didn't create a NorthHire account, you can ignore this.`,
    offerSubject: employerName => `Your offer from ${employerName}`,
    offerBody: (name, employerName, position, link, expiresAt) =>
      [`Hello ${name},`, "", `${employerName} has sent you an offer for ${position}.`, "",
        `Read and respond here: ${link}`, expiresAt ? `\nThis offer is open until ${expiresAt}.` : ""].join("\n"),
    caslIntro: "You are receiving this because you asked NorthHire to email you about matching jobs.",
    caslUnsub: link => `Unsubscribe instantly: ${link}`,
    payNotStated: "Pay not stated",
    instantMatchSubject: (title, city) => `New match: ${title} in ${city}`,
    instantMatchIntro: name => `A new job matches your saved search "${name}":`,
    untitledSearch: "Untitled search",
    seeAllMatches: link => `See all matches: ${link}`,
    digestSubject: (count, name) => `${count} new ${count === 1 ? "match" : "matches"} for "${name}"`,
    yourSavedSearch: "your saved search",
    digestIntro: (frequency, name) => `Your ${frequency === "daily" ? "daily" : "weekly"} job alert for "${name}":`,
    andMore: n => `…and ${n} more.`,
  },
  "fr-CA": {
    resetSubject: "Réinitialisez votre mot de passe NorthHire",
    resetBody: code => `Votre code de réinitialisation est ${code}. Il expire dans 15 minutes.`,
    staffingResetSubject: "Réinitialisez votre mot de passe NorthHire Staffing",
    signinCodeSubject: "Votre code de connexion NorthHire",
    signinCodeBody: code => `Votre code de connexion est ${code}. Il expire dans 15 minutes.`,
    verifySubject: "Confirmez votre courriel NorthHire",
    verifyBody: (name, link) =>
      `Bonjour ${name},\n\nConfirmez qu'il s'agit bien de votre adresse :\n${link}\n\nSi vous n'avez pas créé de compte NorthHire, vous pouvez ignorer ce message.`,
    offerSubject: employerName => `Votre offre de ${employerName}`,
    offerBody: (name, employerName, position, link, expiresAt) =>
      [`Bonjour ${name},`, "", `${employerName} vous a envoyé une offre pour le poste de ${position}.`, "",
        `Consultez-la et répondez ici : ${link}`, expiresAt ? `\nCette offre est valide jusqu'au ${expiresAt}.` : ""].join("\n"),
    caslIntro: "Vous recevez ce courriel parce que vous avez demandé à NorthHire de vous informer par courriel des emplois correspondants.",
    caslUnsub: link => `Désabonnement instantané : ${link}`,
    payNotStated: "Salaire non précisé",
    instantMatchSubject: (title, city) => `Nouvelle correspondance : ${title} à ${city}`,
    instantMatchIntro: name => `Un nouvel emploi correspond à votre recherche sauvegardée « ${name} » :`,
    untitledSearch: "Recherche sans titre",
    seeAllMatches: link => `Voir toutes les correspondances : ${link}`,
    digestSubject: (count, name) => `${count} nouvelle${count === 1 ? "" : "s"} correspondance${count === 1 ? "" : "s"} pour « ${name} »`,
    yourSavedSearch: "votre recherche sauvegardée",
    digestIntro: (frequency, name) => `Votre alerte d'emploi ${frequency === "daily" ? "quotidienne" : "hebdomadaire"} pour « ${name} » :`,
    andMore: n => `… et ${n} de plus.`,
  },
};

export function emailStrings(locale) {
  return EMAIL_STRINGS[locale] || EMAIL_STRINGS["en-CA"];
}

/* In-app / push notification strings. Kept in the same table so a single place governs every
   server-generated user-facing string (mailer + notifications). Bill 96 applies just as much to
   an in-app notification as it does to an email - the "commercial or transactional message in
   the recipient's preferred language" bar isn't email-specific. */
const NOTIF_STRINGS = {
  "en-CA": {
    newApplicationTitle: "New application",
    newApplicationBody: jobTitle => `${jobTitle} just got a new applicant.`,
    stageTitle: (stage, employerName) => `${stage} — ${employerName || "an employer"}`,
    hrSetupTitle: "You're set up in HR Suite",
    hrSetupBody: "Your employer added you to their HR Suite for attendance, leave and payroll.",
    newMessageTitle: sender => `New message from ${sender || "someone"}`,
    interviewScheduledTitle: employer => `Interview scheduled — ${employer || "an employer"}`,
    interviewScheduledBody: (mode, when) => `${mode === "video" ? "Video call" : "On-site interview"} on ${when}.`,
    interviewCancelledTitle: "Interview cancelled",
    interviewCancelledBody: "An upcoming interview was cancelled.",
  },
  "fr-CA": {
    newApplicationTitle: "Nouvelle candidature",
    newApplicationBody: jobTitle => `${jobTitle} vient de recevoir une nouvelle candidature.`,
    stageTitle: (stage, employerName) => `${stage} — ${employerName || "un employeur"}`,
    hrSetupTitle: "Vous êtes configuré·e dans HR Suite",
    hrSetupBody: "Votre employeur vous a ajouté·e à sa HR Suite pour la présence, les congés et la paie.",
    newMessageTitle: sender => `Nouveau message de ${sender || "quelqu'un"}`,
    interviewScheduledTitle: employer => `Entrevue planifiée — ${employer || "un employeur"}`,
    interviewScheduledBody: (mode, when) => `${mode === "video" ? "Appel vidéo" : "Entrevue en personne"} le ${when}.`,
    interviewCancelledTitle: "Entrevue annulée",
    interviewCancelledBody: "Une entrevue à venir a été annulée.",
  },
};

export function notifStrings(locale) {
  return NOTIF_STRINGS[locale] || NOTIF_STRINGS["en-CA"];
}
export function notifStringsForUser(userId) {
  return notifStrings(localeForUserId(userId));
}
