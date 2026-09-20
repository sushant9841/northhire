/* ═══════════════ ROUTE MAP + SHELL ═══════════════ */
/* roles: null = everyone. tab = which bottom tab lights up. root = show logo on mobile.
   path: the real URL for this page - see helpers/urlRouter.js for how :id is resolved and
   how a pathname is matched back to a page key (used for refresh, browser back/forward, and
   shareable links). Routes with no real per-entity identity (bare shell pages, wizards) still
   get a real path so refreshing them doesn't bounce back to the homepage. */
export const ROUTES = {
  home:        {titleKey:"routeTitles.home", tab:"home", root:true, path:"/"},
  matched:     {titleKey:"routeTitles.matched", tab:"matched", root:true, roles:["seeker"], path:"/matched"},
  search:      {titleKey:"routeTitles.search", tab:"search", root:true, path:"/jobs"},
  status:      {titleKey:"routeTitles.status", tab:"status", root:true, roles:["seeker"], path:"/status"},
  profile:     {titleKey:"routeTitles.profile", tab:"profile", root:true, path:"/profile"},

  job:         {titleKey:"routeTitles.job", tab:"search", path:"/jobs/:id"},
  employer:    {titleKey:"routeTitles.employer", tab:"search", path:"/employers/:id"},
  apply1:      {titleKey:"routeTitles.apply1", tab:"search", roles:["seeker"], path:"/apply/1"},
  apply2:      {titleKey:"routeTitles.apply2", tab:"search", roles:["seeker"], path:"/apply/2"},
  apply3:      {titleKey:"routeTitles.apply3", tab:"search", roles:["seeker"], path:"/apply/3"},
  applyDone:   {titleKey:"routeTitles.applyDone", tab:"search", roles:["seeker"], path:"/apply/done"},

  saved:       {titleKey:"routeTitles.saved", tab:"status", roles:["seeker"], path:"/saved"},
  savedSearches:{titleKey:"routeTitles.savedSearches", tab:"status", roles:["seeker"], path:"/saved-searches"},
  messages:    {titleKey:"routeTitles.messages", tab:"alerts", roles:["seeker","employer"], path:"/messages"},
  interviews:  {titleKey:"routeTitles.interviews", tab:"alerts", roles:["seeker","employer"], path:"/interviews"},
  empAnalytics:{titleKey:"routeTitles.empAnalytics", tab:"empHome", roles:["employer"], bare:true, root:true, path:"/employer/analytics"},
  empApi:      {titleKey:"routeTitles.empApi", tab:"empHome", roles:["employer"], bare:true, root:true, path:"/employer/api"},
  empSso:      {titleKey:"routeTitles.empSso", tab:"empHome", roles:["employer"], bare:true, root:true, path:"/employer/sso"},
  alerts:      {titleKey:"routeTitles.alerts", tab:"status", path:"/notifications"},
  cvs:         {titleKey:"routeTitles.cvs", tab:"profile", roles:["seeker"], path:"/cvs"},
  cvEdit:      {titleKey:"routeTitles.cvEdit", tab:"profile", roles:["seeker"], path:"/cvs/:id/edit"},
  settings:    {titleKey:"routeTitles.settings", tab:"profile", path:"/settings"},

  blogs:       {titleKey:"routeTitles.blogs", tab:"home", path:"/resources"},
  blog:        {titleKey:"routeTitles.blog", tab:"home", path:"/resources/:id"},
  trainings:   {titleKey:"routeTitles.trainings", tab:"home", path:"/trainings"},
  training:    {titleKey:"routeTitles.training", tab:"home", path:"/trainings/:id"},
  employers:   {titleKey:"routeTitles.employers", tab:"search", path:"/employers"},

  about:       {titleKey:"routeTitles.about", tab:"home", path:"/about"},
  contact:     {titleKey:"routeTitles.contact", tab:"home", path:"/contact"},
  privacy:     {titleKey:"routeTitles.privacy", tab:"home", path:"/privacy"},
  terms:       {titleKey:"routeTitles.terms", tab:"home", path:"/terms"},
  pricing:     {titleKey:"routeTitles.pricing", tab:"home", path:"/pricing"},
  forEmployers:{titleKey:"routeTitles.forEmployers", tab:"home", path:"/for-employers"},
  howItWorks:  {titleKey:"routeTitles.howItWorks", tab:"home", path:"/how-it-works"},
  forgot:      {titleKey:"routeTitles.forgot", tab:"home", bare:true, path:"/forgot-password"},
  welcome:     {titleKey:"routeTitles.welcome", tab:"home", bare:true, root:true, path:"/welcome"},
  welcomeEmp:  {titleKey:"routeTitles.welcomeEmp", tab:"matched", bare:true, root:true, path:"/welcome/employer"},
  account:     {titleKey:"routeTitles.account", tab:"profile", roles:["seeker"], path:"/account"},
  accessibility:{titleKey:"routeTitles.accessibility", tab:"home", root:false, path:"/accessibility"},
  pipeda:       {titleKey:"routeTitles.pipeda", tab:"home", root:false, path:"/pipeda"},
  credits:      {titleKey:"routeTitles.credits", tab:"home", root:false, path:"/credits"},
  security:     {titleKey:"routeTitles.security", tab:"home", root:false, path:"/security"},
  /* CASL requires the unsubscribe link in a commercial email to work without signing in. */
  unsubscribe:  {titleKey:"routeTitles.unsubscribe", tab:"home", root:false, path:"/unsubscribe"},
  matchScore:   {titleKey:"routeTitles.matchScore", tab:"home", root:false, path:"/match-score"},
  verifyEmail:  {titleKey:"routeTitles.verifyEmail", tab:"home", root:false, path:"/verify-email"},
  /* HR Suite routes */
  hrLogin:      {titleKey:"routeTitles.hrLogin", tab:"home", bare:true, path:"/hr/login"},
  /* The shared time clock authenticates as a DEVICE, not a person, so it must be reachable
     without an HR session - it is the surface people punch in on before signing in anywhere. */
  hrKiosk:      {titleKey:"routeTitles.hrKiosk", tab:"home", bare:true, path:"/hr/kiosk"},
  hrDashboard:  {titleKey:"routeTitles.hrDashboard", tab:"home", bare:true, path:"/hr/dashboard"},
  hrDirectory:  {titleKey:"routeTitles.hrDirectory", tab:"home", bare:true, path:"/hr/directory"},
  hrProfile:    {titleKey:"routeTitles.hrProfile", tab:"home", bare:true, path:"/hr/profile"},
  hrAttendance: {titleKey:"routeTitles.hrAttendance", tab:"home", bare:true, path:"/hr/attendance"},
  hrLeave:      {titleKey:"routeTitles.hrLeave", tab:"home", bare:true, path:"/hr/leave"},
  hrTasks:      {titleKey:"routeTitles.hrTasks", tab:"home", bare:true, path:"/hr/tasks"},
  hrCalendar:   {titleKey:"routeTitles.hrCalendar", tab:"home", bare:true, path:"/hr/calendar"},
  hrChat:       {titleKey:"routeTitles.hrChat", tab:"home", bare:true, path:"/hr/chat"},
  hrTrainings:  {titleKey:"routeTitles.hrTrainings", tab:"home", bare:true, path:"/hr/trainings"},
  hrBadges:     {titleKey:"routeTitles.hrBadges", tab:"home", bare:true, path:"/hr/badges"},
  hrPeople:     {titleKey:"routeTitles.hrPeople", tab:"home", bare:true, path:"/hr/people"},
  hrProfileView:{titleKey:"routeTitles.hrProfileView", tab:"home", bare:true, path:"/hr/people/:id"},
  hrExpenses:   {titleKey:"routeTitles.hrExpenses", tab:"home", bare:true, path:"/hr/expenses"},
  hrHiring:     {titleKey:"routeTitles.hrHiring", tab:"home", bare:true, path:"/hr/hiring"},
  hrInvoices:   {titleKey:"routeTitles.hrInvoices", tab:"home", bare:true, path:"/hr/invoices"},
  hrPayroll:    {titleKey:"routeTitles.hrPayroll", tab:"home", bare:true, path:"/hr/payroll"},
  hrReports:    {titleKey:"routeTitles.hrReports", tab:"home", bare:true, path:"/hr/reports"},
  hrSettings:   {titleKey:"routeTitles.hrSettings", tab:"home", bare:true, path:"/hr/settings"},
  hrIntegrations:{titleKey:"routeTitles.hrIntegrations", tab:"home", bare:true, path:"/hr/integrations"},
  hrPolicies:   {titleKey:"routeTitles.hrPolicies", tab:"home", bare:true, path:"/hr/policies"},
  hrRoster:     {titleKey:"routeTitles.hrRoster", tab:"home", bare:true, path:"/hr/roster"},
  hrPerfReviews:{titleKey:"routeTitles.hrPerfReviews", tab:"home", bare:true, path:"/hr/perf-reviews"},

  /* ─── Staffing agency console ─── */
  agencyLogin:      {titleKey:"routeTitles.agencyLogin", tab:"home", bare:true, path:"/staffing/login"},
  agencyDashboard:  {titleKey:"routeTitles.agencyDashboard", tab:"home", bare:true, root:true, path:"/staffing/dashboard"},
  agencyJobOrders:  {titleKey:"routeTitles.agencyJobOrders", tab:"home", bare:true, root:true, path:"/staffing/job-orders"},
  agencyBench:      {titleKey:"routeTitles.agencyBench", tab:"home", bare:true, root:true, path:"/staffing/bench"},
  agencyAssignments:{titleKey:"routeTitles.agencyAssignments", tab:"home", bare:true, root:true, path:"/staffing/assignments"},
  agencyTimesheets: {titleKey:"routeTitles.agencyTimesheets", tab:"home", bare:true, root:true, path:"/staffing/timesheets"},
  agencyPayroll:    {titleKey:"routeTitles.agencyPayroll", tab:"home", bare:true, root:true, path:"/staffing/payroll"},
  agencyInvoicing:  {titleKey:"routeTitles.agencyInvoicing", tab:"home", bare:true, root:true, path:"/staffing/invoicing"},
  agencyPlacements: {titleKey:"routeTitles.agencyPlacements", tab:"home", bare:true, root:true, path:"/staffing/placements"},
  agencyClients:    {titleKey:"routeTitles.agencyClients", tab:"home", bare:true, root:true, path:"/staffing/clients"},
  agencyWorkers:    {titleKey:"routeTitles.agencyWorkers", tab:"home", bare:true, root:true, path:"/staffing/workers"},
  agencyMargins:    {titleKey:"routeTitles.agencyMargins", tab:"home", bare:true, root:true, path:"/staffing/margins"},
  agencyCompliance: {titleKey:"routeTitles.agencyCompliance", tab:"home", bare:true, root:true, path:"/staffing/compliance"},
  agencyBranches:   {titleKey:"routeTitles.agencyBranches", tab:"home", bare:true, root:true, path:"/staffing/branches"},
  agencySettings:   {titleKey:"routeTitles.agencySettings", tab:"home", bare:true, root:true, path:"/staffing/settings"},

  /* ─── Worker view (seeker who opted in) ─── */
  workerDashboard:  {titleKey:"routeTitles.workerDashboard", tab:"profile", roles:["seeker"], path:"/worker"},
  workerTimesheet:  {titleKey:"routeTitles.workerTimesheet", tab:"profile", roles:["seeker"], path:"/worker/timesheet"},
  workerPayStubs:   {titleKey:"routeTitles.workerPayStubs", tab:"profile", roles:["seeker"], path:"/worker/pay-stubs"},
  workerDocuments:  {titleKey:"routeTitles.workerDocuments", tab:"profile", roles:["seeker"], path:"/worker/documents"},

  /* ─── Client staffing tab (employer inside their console) ─── */
  empStaffing:            {titleKey:"routeTitles.empStaffing", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing"},
  empStaffingRequests:    {titleKey:"routeTitles.empStaffingRequests", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/requests"},
  empStaffingAssignments: {titleKey:"routeTitles.empStaffingAssignments", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/assignments"},
  empStaffingTimesheets:  {titleKey:"routeTitles.empStaffingTimesheets", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/timesheets"},
  empStaffingInvoices:    {titleKey:"routeTitles.empStaffingInvoices", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/invoices"},

  login:       {titleKey:"routeTitles.login", tab:"profile", bare:true, path:"/login"},
  signup:      {titleKey:"routeTitles.signup", tab:"profile", bare:true, path:"/signup"},

  empHome:     {titleKey:"routeTitles.empHome", tab:"home", roles:["employer"], root:true, bare:true, path:"/employer"},
  empJobs:     {titleKey:"routeTitles.empJobs", tab:"search", roles:["employer"], bare:true, root:true, path:"/employer/jobs"},
  empPost:     {titleKey:"routeTitles.empPost", tab:"search", roles:["employer"], bare:true, root:true, path:"/employer/jobs/new"},
  empPipeline: {titleKey:"routeTitles.empPipeline", tab:"status", roles:["employer"], root:true, bare:true, path:"/employer/pipeline"},
  empCandidate:{titleKey:"routeTitles.empCandidate", tab:"status", roles:["employer"], bare:true, root:true, path:"/employer/candidates/:id"},
  empContent:  {titleKey:"routeTitles.empContent", tab:"matched", roles:["employer"], root:true, bare:true, path:"/employer/content"},
  empArticles: {titleKey:"routeTitles.empArticles", tab:"matched", roles:["employer"], root:true, bare:true, path:"/employer/content/articles"},
  empTrainings:{titleKey:"routeTitles.empTrainings", tab:"matched", roles:["employer"], root:true, bare:true, path:"/employer/content/trainings"},
  empBlogEdit: {titleKey:"routeTitles.empBlogEdit", tab:"matched", roles:["employer","admin"], path:"/employer/content/articles/:id/edit"},
  empTrainEdit:{titleKey:"routeTitles.empTrainEdit", tab:"matched", roles:["employer","admin"], path:"/employer/content/trainings/:id/edit"},
  empCompany:  {titleKey:"routeTitles.empCompany", tab:"profile", roles:["employer"], bare:true, root:true, path:"/employer/company"},
  empTeam:     {titleKey:"routeTitles.empTeam", tab:"profile", roles:["employer"], bare:true, root:true, path:"/employer/team"},
  empBilling:  {titleKey:"routeTitles.empBilling", tab:"profile", roles:["employer"], bare:true, root:true, path:"/employer/billing"},
  empWelcome:  {titleKey:"routeTitles.empWelcome", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/welcome"},

  invite:      {titleKey:"routeTitles.invite", tab:"home", bare:true, path:"/invite/:id"},
  /* A candidate reads and signs an offer here without an account - the token in the URL is what
     authorises it, since someone receiving an offer may have no login and shouldn't need one. */
  offer:       {titleKey:"routeTitles.offer", tab:"home", bare:true, path:"/offer/:id"},

  admHome:     {titleKey:"routeTitles.admHome", tab:"home", roles:["admin"], root:true, bare:true, path:"/admin"},
  admUsers:    {titleKey:"routeTitles.admUsers", tab:"search", roles:["admin"], bare:true, root:true, path:"/admin/users"},
  admEmployers:{titleKey:"routeTitles.admEmployers", tab:"search", roles:["admin"], bare:true, root:true, path:"/admin/employers"},
  admJobs:     {titleKey:"routeTitles.admJobs", tab:"status", roles:["admin"], root:true, bare:true, path:"/admin/jobs"},
  admBlogs:    {titleKey:"routeTitles.admBlogs", tab:"matched", roles:["admin"], root:true, bare:true, path:"/admin/content/articles"},
  admTrainings:{titleKey:"routeTitles.admTrainings", tab:"matched", roles:["admin"], bare:true, root:true, path:"/admin/content/trainings"},
  admSettings: {titleKey:"routeTitles.admSettings", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/settings"},
  admDesignSystem: {titleKey:"routeTitles.admDesignSystem", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/design-system"},
  admLog:      {titleKey:"routeTitles.admLog", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/log"},
  admStats:    {titleKey:"routeTitles.admStats", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/stats"},
  admConfig:   {titleKey:"routeTitles.admConfig", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/config"},
  admAdmins:   {titleKey:"routeTitles.admAdmins", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/admins"},

  denied:      {titleKey:"routeTitles.denied", tab:"home", path:"/denied"},
};

/* Second element of each tuple is an i18n key (looked up with t() at render time in TabBar.jsx
   and Header.jsx), not a literal label - this module is static and has no access to the current
   locale, so translation happens where these are consumed. */
export const TABS_BY_ROLE = {
  guest:    [["home","tabs.home","home"],["search","tabs.jobs","search"],["trainings","nav.trainings","cap"],["blogs","nav.resources","book"],["login","common.signIn","user"]],
  seeker:   [["home","tabs.home","home"],["matched","tabs.matched","target"],["search","common.search","search"],["status","tabs.status","activity"],["messages","tabs.messages","mail"],["account","tabs.profile","user"]],
  employer: [["empHome","tabs.home","home"],["empJobs","tabs.jobs","briefcase"],["empPost","tabs.post","plus"],["empPipeline","tabs.candidates","users"],["empCompany","tabs.profile","building"]],
  admin:    [["admHome","tabs.home","home"],["admBlogs","tabs.content","book"],["admUsers","tabs.people","users"],["admJobs","tabs.moderation","shield"],["admSettings","account.settings","gear"]],
};
