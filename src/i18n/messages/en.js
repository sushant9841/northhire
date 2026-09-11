/* English (Canada) message catalog — the default/reference locale.
   Keys are namespaced (e.g. "nav.browseJobs") and looked up by useTranslation()'s t().
   {placeholder} tokens are interpolated by the caller — see src/i18n/i18n.jsx. */
export const en = {
  common: {
    save: "Save", cancel: "Cancel", close: "Close", delete: "Delete", edit: "Edit",
    search: "Search", loading: "Loading…", send: "Send", back: "Back", next: "Next",
    done: "Done", yes: "Yes", no: "No", viewAll: "View all", read: "Read", view: "View",
    signIn: "Sign in", signOut: "Sign out", createAccount: "Create account",
    email: "Email", password: "Password", name: "Name", phone: "Phone number",
    submit: "Submit", required: "Required", optional: "Optional", export: "Export",
    revoke: "Revoke", enable: "Enable", disable: "Disable", confirm: "Confirm",
    keepAccount: "Keep my account", deletePermanently: "Delete permanently",
    sending: "Sending…", getHelp: "Get help",
  },
  nav: {
    browseJobs: "Browse jobs", findJobs: "Find jobs", trainings: "Trainings",
    resources: "Resources", forEmployers: "For employers", bySector: "By sector",
    byLocation: "By location", byEmployer: "By employer", browseAllCompanies: "Browse all companies",
    verifiedOnly: "Verified employers only", notifications: "Notifications", account: "Account",
    back: "Back",
  },
  account: {
    myAccount: "My account", editProfile: "Edit profile", myCvs: "My CVs",
    applications: "Applications", savedJobs: "Saved jobs", settings: "Settings",
    dashboard: "Dashboard", postAJob: "Post a job", candidates: "Candidates",
    companyProfile: "Company profile", team: "Team", billing: "Billing",
    overview: "Overview", platformSettings: "Platform settings", activityLog: "Activity log",
    statistics: "Statistics", jobSeeker: "Job seeker", employer: "Employer",
    administrator: "Administrator", language: "Language", languageEnglish: "English",
    languageFrench: "Français",
  },
  settings: {
    title: "Settings", sub: "Account, notifications and privacy",
    language: "Language", languageSub: "Choose the language used across NorthHire and in emails we send you.",
    notifications: "Notifications", privacy: "Privacy", yourData: "Your data",
    security: "Security", outbox: "Outbox", dangerZone: "Danger zone",
  },
  footer: {
    jobSeekers: "Job seekers", browseAllJobs: "Browse all jobs", matchedForYou: "Matched for you",
    myApplications: "My applications", savedJobs: "Saved jobs", buildCv: "Build a CV",
    forEmployers: "For employers", whyNorthHire: "Why NorthHire", pricingPlans: "Pricing plans",
    howItWorks: "How it works", browseEmployers: "Browse employers", employerSignIn: "Employer sign in",
    hrSuiteSignIn: "HR Suite sign in", forStaffing: "For staffing", staffingOverview: "Overview",
    bookADemo: "Book a demo", workerClientSignIn: "Worker & client sign in", agencyStaffSignIn: "Agency staff sign in",
    explore: "Explore", company: "Company", aboutUs: "About us", contactUs: "Contact us",
    careerResources: "Career resources", howMatchingWorks: "How matching works",
    privacyPolicy: "Privacy policy", termsOfService: "Terms of service",
    tagline: "Canada's job platform for every kind of work. Trades, care, transport, kitchens, warehouses and offices, with real pay published on every listing.",
    copyright: "© 2026 NorthHire Technologies Inc. Built in Canada.",
    accessibility: "Accessibility (AODA)", pipeda: "PIPEDA compliant", credits: "Open-source credits",
    fixTracker: "Fix Tracker", complianceRegister: "Compliance Register",
  },
  cookie: {
    text: "We use cookies for sign-in, saved jobs and analytics. See our {link}",
    linkText: "privacy policy", gotIt: "Got it",
  },
  auth: {
    signInTitle: "Sign in", createAccountTitle: "Create your account",
    passwordTooShort: "Password must be at least 8 characters",
    emailPasswordRequired: "Email and password are required.",
    incorrectCredentials: "Incorrect email or password.",
    companyNameRequired: "Company name required",
  },
  legal: {
    lastUpdated: "Last updated", readFull: "Read the full document",
  },
};
