/* Français (Québec) — respecte les conventions du Québec (« courriel », pas « e-mail »;
   « magasinage », pas « shopping »; « Ma session » pour le menu de compte), pas le français de
   France. Shipped as part of Bill 96 / Loi 96 compliance work. Keys mirror en.js exactly so
   useTranslation() can fall back safely if a key is ever missing here. */
export const fr = {
  common: {
    save: "Enregistrer", cancel: "Annuler", close: "Fermer", delete: "Supprimer", edit: "Modifier",
    search: "Rechercher", loading: "Chargement…", send: "Envoyer", back: "Retour", next: "Suivant",
    done: "Terminé", yes: "Oui", no: "Non", viewAll: "Tout voir", read: "Lire", view: "Voir",
    signIn: "Se connecter", signOut: "Se déconnecter", createAccount: "Créer un compte",
    email: "Courriel", password: "Mot de passe", name: "Nom", phone: "Numéro de téléphone",
    submit: "Soumettre", required: "Obligatoire", optional: "Facultatif", export: "Exporter",
    revoke: "Révoquer", enable: "Activer", disable: "Désactiver", confirm: "Confirmer",
    keepAccount: "Conserver mon compte", deletePermanently: "Supprimer définitivement",
    sending: "Envoi en cours…", getHelp: "Obtenir de l'aide",
  },
  nav: {
    browseJobs: "Parcourir les emplois", findJobs: "Trouver un emploi", trainings: "Formations",
    resources: "Ressources", forEmployers: "Pour les employeurs", bySector: "Par secteur",
    byLocation: "Par emplacement", byEmployer: "Par employeur", browseAllCompanies: "Parcourir toutes les entreprises",
    verifiedOnly: "Employeurs vérifiés seulement", notifications: "Notifications", account: "Compte",
    back: "Retour",
  },
  account: {
    myAccount: "Ma session", editProfile: "Modifier mon profil", myCvs: "Mes CV",
    applications: "Candidatures", savedJobs: "Emplois sauvegardés", settings: "Paramètres",
    dashboard: "Tableau de bord", postAJob: "Publier un emploi", candidates: "Candidat·e·s",
    companyProfile: "Profil de l'entreprise", team: "Équipe", billing: "Facturation",
    overview: "Aperçu", platformSettings: "Paramètres de la plateforme", activityLog: "Journal d'activité",
    statistics: "Statistiques", jobSeeker: "Chercheur·euse d'emploi", employer: "Employeur",
    administrator: "Administrateur·rice", language: "Langue", languageEnglish: "English",
    languageFrench: "Français",
  },
  settings: {
    title: "Paramètres", sub: "Compte, notifications et confidentialité",
    language: "Langue", languageSub: "Choisissez la langue utilisée sur NorthHire et dans les courriels que nous vous envoyons.",
    notifications: "Notifications", privacy: "Confidentialité", yourData: "Vos données",
    security: "Sécurité", outbox: "Courriels envoyés", dangerZone: "Zone de danger",
  },
  footer: {
    jobSeekers: "Chercheurs d'emploi", browseAllJobs: "Parcourir tous les emplois", matchedForYou: "Sélectionnés pour vous",
    myApplications: "Mes candidatures", savedJobs: "Emplois sauvegardés", buildCv: "Créer un CV",
    forEmployers: "Pour les employeurs", whyNorthHire: "Pourquoi NorthHire", pricingPlans: "Forfaits tarifaires",
    howItWorks: "Comment ça marche", browseEmployers: "Parcourir les employeurs", employerSignIn: "Connexion employeur",
    hrSuiteSignIn: "Connexion Suite RH", forStaffing: "Pour le placement de personnel", staffingOverview: "Aperçu",
    bookADemo: "Réserver une démo", workerClientSignIn: "Connexion travailleur·euse et client", agencyStaffSignIn: "Connexion personnel de l'agence",
    explore: "Explorer", company: "Entreprise", aboutUs: "À propos de nous", contactUs: "Nous contacter",
    careerResources: "Ressources de carrière", howMatchingWorks: "Comment fonctionne le jumelage",
    privacyPolicy: "Politique de confidentialité", termsOfService: "Conditions d'utilisation",
    tagline: "La plateforme d'emploi du Canada pour tous les types de travail. Métiers, soins, transport, cuisines, entrepôts et bureaux, avec un salaire réel publié sur chaque annonce.",
    copyright: "© 2026 NorthHire Technologies Inc. Conçu au Canada.",
    accessibility: "Accessibilité (LAPHO)", pipeda: "Conforme à la LPRPDE", credits: "Crédits des logiciels libres",
    fixTracker: "Suivi des correctifs", complianceRegister: "Registre de conformité",
  },
  cookie: {
    text: "Nous utilisons des témoins (cookies) pour la connexion, les emplois sauvegardés et l'analyse. Consultez notre {link}",
    linkText: "politique de confidentialité", gotIt: "Compris",
  },
  auth: {
    signInTitle: "Se connecter", createAccountTitle: "Créer votre compte",
    passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères",
    emailPasswordRequired: "Le courriel et le mot de passe sont obligatoires.",
    incorrectCredentials: "Courriel ou mot de passe incorrect.",
    companyNameRequired: "Le nom de l'entreprise est requis",
  },
  legal: {
    lastUpdated: "Dernière mise à jour", readFull: "Lire le document complet",
  },
};
