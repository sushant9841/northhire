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

const EMAIL_STRINGS = {
  "en-CA": {
    resetSubject: "Reset your NorthHire password",
    resetBody: code => `Your reset code is ${code}. It expires in 15 minutes.`,
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
  },
  "fr-CA": {
    resetSubject: "Réinitialisez votre mot de passe NorthHire",
    resetBody: code => `Votre code de réinitialisation est ${code}. Il expire dans 15 minutes.`,
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
  },
};

export function emailStrings(locale) {
  return EMAIL_STRINGS[locale] || EMAIL_STRINGS["en-CA"];
}
