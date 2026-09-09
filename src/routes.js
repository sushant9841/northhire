/* ═══════════════ ROUTE MAP + SHELL ═══════════════ */
/* roles: null = everyone. tab = which bottom tab lights up. root = show logo on mobile.
   path: the real URL for this page - see helpers/urlRouter.js for how :id is resolved and
   how a pathname is matched back to a page key (used for refresh, browser back/forward, and
   shareable links). Routes with no real per-entity identity (bare shell pages, wizards) still
   get a real path so refreshing them doesn't bounce back to the homepage. */
export const ROUTES = {
  home:        {title:"Home", tab:"home", root:true, path:"/"},
  matched:     {title:"Matched jobs", tab:"matched", root:true, roles:["seeker"], path:"/matched"},
  search:      {title:"Search jobs", tab:"search", root:true, path:"/jobs"},
  status:      {title:"My status", tab:"status", root:true, roles:["seeker"], path:"/status"},
  profile:     {title:"Profile", tab:"profile", root:true, path:"/profile"},

  job:         {title:"Job details", tab:"search", path:"/jobs/:id"},
  employer:    {title:"Employer", tab:"search", path:"/employers/:id"},
  apply1:      {title:"Apply · Your profile", tab:"search", roles:["seeker"], path:"/apply/1"},
  apply2:      {title:"Apply · Questions", tab:"search", roles:["seeker"], path:"/apply/2"},
  apply3:      {title:"Apply · Review", tab:"search", roles:["seeker"], path:"/apply/3"},
  applyDone:   {title:"Application sent", tab:"search", roles:["seeker"], path:"/apply/done"},

  saved:       {title:"Saved jobs", tab:"status", roles:["seeker"], path:"/saved"},
  savedSearches:{title:"Saved searches", tab:"status", roles:["seeker"], path:"/saved-searches"},
  messages:    {title:"Messages", tab:"alerts", roles:["seeker","employer"], path:"/messages"},
  interviews:  {title:"Interviews", tab:"alerts", roles:["seeker","employer"], path:"/interviews"},
  empAnalytics:{title:"Analytics", tab:"empHome", roles:["employer"], bare:true, root:true, path:"/employer/analytics"},
  alerts:      {title:"Notifications", tab:"status", path:"/notifications"},
  cvs:         {title:"My CVs", tab:"profile", roles:["seeker"], path:"/cvs"},
  cvEdit:      {title:"CV builder", tab:"profile", roles:["seeker"], path:"/cvs/:id/edit"},
  settings:    {title:"Settings", tab:"profile", path:"/settings"},

  blogs:       {title:"Career resources", tab:"home", path:"/resources"},
  blog:        {title:"Article", tab:"home", path:"/resources/:id"},
  trainings:   {title:"Trainings", tab:"home", path:"/trainings"},
  training:    {title:"Training details", tab:"home", path:"/trainings/:id"},
  employers:   {title:"Employers", tab:"search", path:"/employers"},

  about:       {title:"About us", tab:"home", path:"/about"},
  contact:     {title:"Contact us", tab:"home", path:"/contact"},
  privacy:     {title:"Privacy policy", tab:"home", path:"/privacy"},
  terms:       {title:"Terms of service", tab:"home", path:"/terms"},
  pricing:     {title:"Pricing", tab:"home", path:"/pricing"},
  forEmployers:{title:"For employers", tab:"home", path:"/for-employers"},
  howItWorks:  {title:"How it works", tab:"home", path:"/how-it-works"},
  forgot:      {title:"Reset password", tab:"home", bare:true, path:"/forgot-password"},
  welcome:     {title:"Welcome to NorthHire", tab:"home", bare:true, root:true, path:"/welcome"},
  welcomeEmp:  {title:"Welcome to NorthHire", tab:"matched", bare:true, root:true, path:"/welcome/employer"},
  account:     {title:"My account", tab:"profile", roles:["seeker"], path:"/account"},
  accessibility:{title:"Accessibility (AODA)", tab:"home", root:false, path:"/accessibility"},
  pipeda:       {title:"PIPEDA compliance", tab:"home", root:false, path:"/pipeda"},
  credits:      {title:"Open-source credits", tab:"home", root:false, path:"/credits"},
  /* CASL requires the unsubscribe link in a commercial email to work without signing in. */
  unsubscribe:  {title:"Unsubscribe", tab:"home", root:false, path:"/unsubscribe"},
  /* HR Suite routes */
  hrLogin:      {title:"HR Suite login", tab:"home", bare:true, path:"/hr/login"},
  hrDashboard:  {title:"Dashboard", tab:"home", bare:true, path:"/hr/dashboard"},
  hrDirectory:  {title:"Directory", tab:"home", bare:true, path:"/hr/directory"},
  hrProfile:    {title:"My profile", tab:"home", bare:true, path:"/hr/profile"},
  hrAttendance: {title:"Attendance", tab:"home", bare:true, path:"/hr/attendance"},
  hrLeave:      {title:"Leave", tab:"home", bare:true, path:"/hr/leave"},
  hrTasks:      {title:"Tasks", tab:"home", bare:true, path:"/hr/tasks"},
  hrCalendar:   {title:"Calendar", tab:"home", bare:true, path:"/hr/calendar"},
  hrChat:       {title:"Chat", tab:"home", bare:true, path:"/hr/chat"},
  hrTrainings:  {title:"Trainings", tab:"home", bare:true, path:"/hr/trainings"},
  hrBadges:     {title:"Badges", tab:"home", bare:true, path:"/hr/badges"},
  hrPeople:     {title:"People", tab:"home", bare:true, path:"/hr/people"},
  hrExpenses:   {title:"Expenses", tab:"home", bare:true, path:"/hr/expenses"},
  hrHiring:     {title:"Hiring", tab:"home", bare:true, path:"/hr/hiring"},
  hrInvoices:   {title:"Invoices", tab:"home", bare:true, path:"/hr/invoices"},
  hrPayroll:    {title:"Payroll", tab:"home", bare:true, path:"/hr/payroll"},
  hrReports:    {title:"Reports", tab:"home", bare:true, path:"/hr/reports"},
  hrSettings:   {title:"HR Settings", tab:"home", bare:true, path:"/hr/settings"},
  hrIntegrations:{title:"Integrations", tab:"home", bare:true, path:"/hr/integrations"},
  hrPolicies:   {title:"Policies & sign-off", tab:"home", bare:true, path:"/hr/policies"},
  hrRoster:     {title:"Shift roster", tab:"home", bare:true, path:"/hr/roster"},

  /* ─── Staffing agency console ─── */
  agencyLogin:      {title:"Agency sign in", tab:"home", bare:true, path:"/staffing/login"},
  agencyDashboard:  {title:"Agency dashboard", tab:"home", bare:true, root:true, path:"/staffing/dashboard"},
  agencyJobOrders:  {title:"Job orders", tab:"home", bare:true, root:true, path:"/staffing/job-orders"},
  agencyBench:      {title:"Bench", tab:"home", bare:true, root:true, path:"/staffing/bench"},
  agencyAssignments:{title:"Assignments", tab:"home", bare:true, root:true, path:"/staffing/assignments"},
  agencyTimesheets: {title:"Timesheets", tab:"home", bare:true, root:true, path:"/staffing/timesheets"},
  agencyPayroll:    {title:"Staffing payroll", tab:"home", bare:true, root:true, path:"/staffing/payroll"},
  agencyInvoicing:  {title:"Invoicing", tab:"home", bare:true, root:true, path:"/staffing/invoicing"},
  agencyPlacements: {title:"Placements", tab:"home", bare:true, root:true, path:"/staffing/placements"},
  agencyClients:    {title:"Clients", tab:"home", bare:true, root:true, path:"/staffing/clients"},
  agencyWorkers:    {title:"Workers", tab:"home", bare:true, root:true, path:"/staffing/workers"},
  agencyMargins:    {title:"Margins", tab:"home", bare:true, root:true, path:"/staffing/margins"},
  agencyCompliance: {title:"Compliance", tab:"home", bare:true, root:true, path:"/staffing/compliance"},
  agencyBranches:   {title:"Branches", tab:"home", bare:true, root:true, path:"/staffing/branches"},

  /* ─── Worker view (seeker who opted in) ─── */
  workerDashboard:  {title:"Worker dashboard", tab:"profile", roles:["seeker"], path:"/worker"},
  workerTimesheet:  {title:"Weekly timesheet", tab:"profile", roles:["seeker"], path:"/worker/timesheet"},
  workerPayStubs:   {title:"Pay stubs", tab:"profile", roles:["seeker"], path:"/worker/pay-stubs"},
  workerDocuments:  {title:"My documents", tab:"profile", roles:["seeker"], path:"/worker/documents"},

  /* ─── Client staffing tab (employer inside their console) ─── */
  empStaffing:            {title:"Staffing", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing"},
  empStaffingRequests:    {title:"Job requests", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/requests"},
  empStaffingAssignments: {title:"Active assignments", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/assignments"},
  empStaffingTimesheets:  {title:"Approve timesheets", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/timesheets"},
  empStaffingInvoices:    {title:"Staffing invoices", tab:"home", roles:["employer"], bare:true, root:true, path:"/employer/staffing/invoices"},

  login:       {title:"Sign in", tab:"profile", bare:true, path:"/login"},
  signup:      {title:"Create account", tab:"profile", bare:true, path:"/signup"},

  empHome:     {title:"Employer dashboard", tab:"home", roles:["employer"], root:true, bare:true, path:"/employer"},
  empJobs:     {title:"My job listings", tab:"search", roles:["employer"], bare:true, root:true, path:"/employer/jobs"},
  empPost:     {title:"Post a job", tab:"search", roles:["employer"], bare:true, root:true, path:"/employer/jobs/new"},
  empPipeline: {title:"Candidates", tab:"status", roles:["employer"], root:true, bare:true, path:"/employer/pipeline"},
  empCandidate:{title:"Candidate", tab:"status", roles:["employer"], bare:true, root:true, path:"/employer/candidates/:id"},
  empContent:  {title:"Content", tab:"matched", roles:["employer"], root:true, bare:true, path:"/employer/content"},
  empArticles: {title:"Articles", tab:"matched", roles:["employer"], root:true, bare:true, path:"/employer/content/articles"},
  empTrainings:{title:"Trainings", tab:"matched", roles:["employer"], root:true, bare:true, path:"/employer/content/trainings"},
  empBlogEdit: {title:"Edit article", tab:"matched", roles:["employer","admin"], path:"/employer/content/articles/:id/edit"},
  empTrainEdit:{title:"Edit training", tab:"matched", roles:["employer","admin"], path:"/employer/content/trainings/:id/edit"},
  empCompany:  {title:"Company profile", tab:"profile", roles:["employer"], bare:true, root:true, path:"/employer/company"},
  empTeam:     {title:"Team", tab:"profile", roles:["employer"], bare:true, root:true, path:"/employer/team"},
  empBilling:  {title:"Billing", tab:"profile", roles:["employer"], bare:true, root:true, path:"/employer/billing"},

  invite:      {title:"Join your team", tab:"home", bare:true, path:"/invite/:id"},

  admHome:     {title:"Admin overview", tab:"home", roles:["admin"], root:true, bare:true, path:"/admin"},
  admUsers:    {title:"Users", tab:"search", roles:["admin"], bare:true, root:true, path:"/admin/users"},
  admEmployers:{title:"Employers", tab:"search", roles:["admin"], bare:true, root:true, path:"/admin/employers"},
  admJobs:     {title:"Job moderation", tab:"status", roles:["admin"], root:true, bare:true, path:"/admin/jobs"},
  admBlogs:    {title:"Articles", tab:"matched", roles:["admin"], root:true, bare:true, path:"/admin/content/articles"},
  admTrainings:{title:"Trainings", tab:"matched", roles:["admin"], bare:true, root:true, path:"/admin/content/trainings"},
  admSettings: {title:"Platform settings", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/settings"},
  admLog:      {title:"Activity log", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/log"},
  admStats:    {title:"Platform statistics", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/stats"},
  admConfig:   {title:"Business config", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/config"},
  admAdmins:   {title:"Admin accounts", tab:"profile", roles:["admin"], bare:true, root:true, path:"/admin/admins"},

  denied:      {title:"Not available", tab:"home", path:"/denied"},
};

export const TABS_BY_ROLE = {
  guest:    [["home","Home","home"],["search","Jobs","search"],["trainings","Trainings","cap"],["blogs","Resources","book"],["login","Sign in","user"]],
  seeker:   [["home","Home","home"],["matched","Matched","target"],["search","Search","search"],["status","Status","activity"],["account","Profile","user"]],
  employer: [["empHome","Home","home"],["empJobs","Jobs","briefcase"],["empPost","Post","plus"],["empPipeline","Candidates","users"],["empCompany","Profile","building"]],
  admin:    [["admHome","Home","home"],["admBlogs","Content","book"],["admUsers","People","users"],["admJobs","Moderation","shield"],["admSettings","Settings","gear"]],
};
