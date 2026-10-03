import { useState, useEffect, useRef } from "react";
import { Ctx } from "./store/context.js";
import { useStore } from "./store/useStore.js";
import { useVersionCheck } from "./store/useVersionCheck.js";
import { useTranslation } from "./i18n/i18n.jsx";
import { Header } from "./shells/Header.jsx";
import { TabBar } from "./shells/TabBar.jsx";
import { Footer } from "./shells/Footer.jsx";
import { HrShell } from "./shells/HrShell.jsx";
import { EmpShell, AdmShell } from "./shells/DashShell.jsx";
import { AgencyShell } from "./shells/AgencyShell.jsx";
import { JobDetailPage } from "./pages/shared/JobDetailPage.jsx";
import { Apply1, Apply2, Apply3, ApplyDone } from "./pages/seeker/apply.jsx";
import { SearchPage } from "./pages/seeker/SearchPage.jsx";
import { MatchedPage } from "./pages/seeker/MatchedPage.jsx";
import { SavedPage } from "./pages/seeker/SavedPage.jsx";
import { SavedSearchesPage } from "./pages/seeker/SavedSearchesPage.jsx";
import { EmployersPage, EmployerPublicPage } from "./pages/shared/employers.jsx";
import { StatusPage } from "./pages/seeker/StatusPage.jsx";
import { AccountMenuPage } from "./pages/seeker/AccountMenuPage.jsx";
import { CvsPage, CvEditPage } from "./pages/seeker/cv.jsx";
import { AlertsPage } from "./pages/shared/AlertsPage.jsx";
import { DeniedPage } from "./pages/shared/DeniedPage.jsx";
import { ProfilePage } from "./pages/shared/ProfilePage.jsx";
import { SettingsPage } from "./pages/shared/SettingsPage.jsx";
import { UnsubscribePage } from "./pages/shared/UnsubscribePage.jsx";
import { MatchScorePage } from "./pages/shared/MatchScorePage.jsx";
import { OfferPage } from "./pages/shared/OfferPage.jsx";
import { VerifyEmailPage } from "./pages/shared/VerifyEmailPage.jsx";
import { MessagesPage } from "./pages/shared/MessagesPage.jsx";
import { InterviewsPage } from "./pages/shared/InterviewsPage.jsx";
import { WorkerDashboard, WorkerTimesheet, WorkerPayStubs, WorkerDocuments } from "./pages/seeker/worker.jsx";
import {
  EmpHome, EmpJobs, EmpPost, EmpPipeline, ContentManager, EmpArticlesPage,
  EmpTrainingsAdminPage, BlogEditor, TrainingEditor, EmpCompany, EmpTeam, EmpBilling, EmpAnalyticsPage,
} from "./pages/employer/suite.jsx";
import { EmpPostCheckoutWelcome } from "./pages/employer/PostCheckoutWelcome.jsx";
import {
  EmpStaffing, EmpStaffingTimesheets, EmpStaffingInvoices, EmpStaffingAssignments, EmpStaffingRequests,
} from "./pages/employer/staffing.jsx";
import {
  HrLoginPage, HrDashboard, HrProfile, HrProfilePage, HrAttendance, HrLeave, HrTasks, HrCalendar, HrChat,
  HrInvoices, HrPayroll, HrTrainings, HrBadges, HrHiring, HrReports, HrSettings, HrIntegrations, HrPolicies, HrRoster, HrPerfReviews,
} from "./pages/hr/suite.jsx";
import { HrPeoplePage, HrExpensesPage } from "./pages/hr/people.jsx";
import { KioskPage } from "./pages/hr/KioskPage.jsx";
import { EmpApiPage, EmpSsoPage } from "./pages/employer/api.jsx";
import { HireOnboardingModal } from "./pages/shared/HireOnboardingModal.jsx";
import { ToastHost, Modal, Btn } from "./design/primitives.jsx";
import { pay, payUnit, dlText } from "./helpers/utils.js";
import {
  AgencyLoginPage, AgencyDashboard, AgencyJobOrders, AgencyBench, AgencyAssignments,
  AgencyTimesheets, AgencyPayroll, AgencyInvoicing, AgencyPlacements, AgencyClients,
  AgencyWorkers, AgencyMargins, AgencyCompliance, AgencyBranches, AgencySettings,
} from "./pages/staffing/suite.jsx";
import { AdmHome, AdmUsers, AdmEmployers, AdmJobs, AdmSettings, AdmLog, AdmStats, AdmConfig, AdmAdmins, AdmModeration } from "./pages/admin/suite.jsx";
import { AdmDesignSystem } from "./pages/admin/designSystem.jsx";
import {
  HomePage, BlogsPage, BlogPage, TrainingsPage, TrainingPage, AboutPage, ContactPage, LegalPage,
  PricingPage, AccessibilityPage, PipedaPage, CreditsPage, SecurityPage, SalaryCalculatorPage,
} from "./pages/marketing/pages.jsx";
import { ForEmployersPage, HowItWorksPage } from "./pages/marketing/forEmployers.jsx";
import { SignupPage, LoginPage, ForgotPasswordPage, WelcomeTourPage, InviteAcceptPage } from "./pages/auth/pages.jsx";
import { ROUTES } from "./routes.js";
import { C, FONT, SH } from "./design/tokens.js";
import { I } from "./design/icons.jsx";
import { Card } from "./design/primitives.jsx";
import { useMedia } from "./helpers/hooks.js";

/* ═══════════════ ROOT — store, actions, router, guards ═══════════════ */

export default function NorthHire(){
  const mob=useMedia("(max-width: 900px)");
  const A=useStore();
  const {pg,user,settings,impersonating,stopImpersonating,hireOnboarding,setHireOnboarding,go}=A;
  const {locale,setLocale,t}=useTranslation();
  const outdated=useVersionCheck();
  /* Once a session loads a user with a saved `locale`, that account's preference wins over
     whatever this browser had stored locally (e.g. signing into a fr-CA account on a machine
     that was last used in English switches the UI to French, matching what Settings shows). */
  useEffect(()=>{
    if(user?.locale&&user.locale!==locale)setLocale(user.locale);
  },[user?.locale]);
  /* Persist the "accepted cookies" flag - it's a per-viewer UI convenience (matches the memory
     allow-list) AND a legal record of consent. A fresh reload should not bring the banner back
     to a user who has already dismissed it. Reads guarded with try/catch since a private-window
     or storage-blocked browser can throw the accessor itself. */
  const [cookieAck,setCookieAck]=useState(()=>{
    try { return localStorage.getItem("northhire.cookieAck")==="1"; } catch { return false; }
  });
  const acceptCookies=()=>{
    setCookieAck(true);
    try { localStorage.setItem("northhire.cookieAck","1"); } catch { /* fine - the acceptance still holds for this tab */ }
    A.logActivity("cookies.accepted","Accepted cookie use","shield");
  };

  const _roleWrap=(node)=>{
    if(user?.role==="employer")return <EmpShell>{node}</EmpShell>;
    if(user?.role==="admin")return <AdmShell>{node}</AdmShell>;
    return node; /* seeker or guest: plain page */
  };
  const PAGES={home:<HomePage/>,search:<SearchPage/>,matched:<MatchedPage/>,saved:<SavedPage/>,savedSearches:<SavedSearchesPage/>,messages:_roleWrap(<MessagesPage/>),interviews:_roleWrap(<InterviewsPage/>),status:<StatusPage/>,
    alerts:<AlertsPage/>,profile:<ProfilePage/>,settings:_roleWrap(<SettingsPage/>),cvs:<CvsPage/>,cvEdit:<CvEditPage/>,
    job:<JobDetailPage/>,employer:<EmployerPublicPage/>,employers:<EmployersPage/>,
    apply1:<Apply1/>,apply2:<Apply2/>,apply3:<Apply3/>,applyDone:<ApplyDone/>,
    blogs:<BlogsPage/>,blog:<BlogPage/>,trainings:<TrainingsPage/>,training:<TrainingPage/>,
    about:<AboutPage/>,contact:<ContactPage/>,privacy:<LegalPage kind="privacy"/>,terms:<LegalPage kind="terms"/>,
    pricing:<PricingPage/>,forEmployers:<ForEmployersPage/>,howItWorks:<HowItWorksPage/>,login:<LoginPage/>,signup:<SignupPage/>,forgot:<ForgotPasswordPage/>,invite:<InviteAcceptPage/>,denied:<DeniedPage/>,
    welcome:<WelcomeTourPage kind="seeker"/>,welcomeEmp:<WelcomeTourPage kind="employer"/>,
    empHome:<EmpShell><EmpHome/></EmpShell>,empJobs:<EmpShell><EmpJobs/></EmpShell>,empPost:<EmpShell><EmpPost/></EmpShell>,empPipeline:<EmpShell><EmpPipeline/></EmpShell>,
    /* E3: the candidate detail route now renders EmpPipeline too (with its drawer forced open
       for A.candidateId) rather than the old standalone full-page EmpCandidate, so a deep link
       to /employer/candidates/:id shows the same kanban-with-drawer experience as opening one
       from the pipeline itself. */
    empCandidate:<EmpShell><EmpPipeline/></EmpShell>,
    empContent:<EmpShell><ContentManager scope="employer"/></EmpShell>,
    empArticles:<EmpShell><EmpArticlesPage/></EmpShell>,empTrainings:<EmpShell><EmpTrainingsAdminPage/></EmpShell>,empBlogEdit:_roleWrap(<BlogEditor/>),empTrainEdit:_roleWrap(<TrainingEditor/>),
    empCompany:<EmpShell><EmpCompany/></EmpShell>,empTeam:<EmpShell><EmpTeam/></EmpShell>,empBilling:<EmpShell><EmpBilling/></EmpShell>,empAnalytics:<EmpShell><EmpAnalyticsPage/></EmpShell>,empApi:<EmpShell><EmpApiPage/></EmpShell>,empSso:<EmpShell><EmpSsoPage/></EmpShell>,
    empWelcome:<EmpShell><EmpPostCheckoutWelcome/></EmpShell>,
    admHome:<AdmShell><AdmHome/></AdmShell>,admUsers:<AdmShell><AdmUsers/></AdmShell>,admEmployers:<AdmShell><AdmEmployers/></AdmShell>,admJobs:<AdmShell><AdmJobs/></AdmShell>,admModeration:<AdmShell><AdmModeration/></AdmShell>,
    account:<AccountMenuPage/>,
    accessibility:<AccessibilityPage/>,pipeda:<PipedaPage/>,credits:<CreditsPage/>,security:<SecurityPage/>,salaryCalc:<SalaryCalculatorPage/>,unsubscribe:<UnsubscribePage/>,matchScore:<MatchScorePage/>,offer:<OfferPage/>,verifyEmail:<VerifyEmailPage/>,
    admBlogs:<AdmShell><ContentManager scope="admin"/></AdmShell>,admTrainings:<AdmShell><ContentManager scope="admin"/></AdmShell>,
    admSettings:<AdmShell><AdmSettings/></AdmShell>,admLog:<AdmShell><AdmLog/></AdmShell>,admStats:<AdmShell><AdmStats/></AdmShell>,admDesignSystem:<AdmShell><AdmDesignSystem/></AdmShell>,
    admConfig:<AdmShell><AdmConfig/></AdmShell>,admAdmins:<AdmShell><AdmAdmins/></AdmShell>,
    /* HR Suite */
    hrLogin:<HrLoginPage/>,hrKiosk:<KioskPage/>,
    hrDashboard:<HrShell><HrDashboard/></HrShell>,
    hrDirectory:<HrShell><HrPeoplePage/></HrShell>, /* backward-compat: routes to new merged People */
    hrProfile:<HrShell><HrProfile/></HrShell>,
    hrProfileView:<HrShell><HrProfilePage/></HrShell>,
    hrAttendance:<HrShell><HrAttendance/></HrShell>,
    hrLeave:<HrShell><HrLeave/></HrShell>,
    hrExpenses:<HrShell><HrExpensesPage/></HrShell>,
    hrTasks:<HrShell><HrTasks/></HrShell>,
    hrCalendar:<HrShell><HrCalendar/></HrShell>,
    hrChat:<HrShell><HrChat/></HrShell>,
    hrTrainings:<HrShell><HrTrainings/></HrShell>,
    hrBadges:<HrShell><HrBadges/></HrShell>,
    hrPeople:<HrShell><HrPeoplePage/></HrShell>,
    hrHiring:<HrShell><HrHiring/></HrShell>,
    hrInvoices:<HrShell><HrInvoices/></HrShell>,
    hrPayroll:<HrShell><HrPayroll/></HrShell>,
    hrReports:<HrShell><HrReports/></HrShell>,
    hrSettings:<HrShell><HrSettings/></HrShell>,
    hrIntegrations:<HrShell><HrIntegrations/></HrShell>,hrPolicies:<HrShell><HrPolicies/></HrShell>,hrRoster:<HrShell><HrRoster/></HrShell>,
    hrPerfReviews:<HrShell><HrPerfReviews/></HrShell>,
    /* ─── Agency console ─── */
    agencyLogin:<AgencyLoginPage/>,
    agencyDashboard:<AgencyShell><AgencyDashboard/></AgencyShell>,
    agencyJobOrders:<AgencyShell><AgencyJobOrders/></AgencyShell>,
    agencyBench:<AgencyShell><AgencyBench/></AgencyShell>,
    agencyAssignments:<AgencyShell><AgencyAssignments/></AgencyShell>,
    agencyTimesheets:<AgencyShell><AgencyTimesheets/></AgencyShell>,
    agencyPayroll:<AgencyShell><AgencyPayroll/></AgencyShell>,
    agencyInvoicing:<AgencyShell><AgencyInvoicing/></AgencyShell>,
    agencyPlacements:<AgencyShell><AgencyPlacements/></AgencyShell>,
    agencyClients:<AgencyShell><AgencyClients/></AgencyShell>,
    agencyWorkers:<AgencyShell><AgencyWorkers/></AgencyShell>,
    agencyMargins:<AgencyShell><AgencyMargins/></AgencyShell>,
    agencyCompliance:<AgencyShell><AgencyCompliance/></AgencyShell>,agencyBranches:<AgencyShell><AgencyBranches/></AgencyShell>,
    agencySettings:<AgencyShell><AgencySettings/></AgencyShell>,
    /* ─── Worker routes (seeker who opted in) ─── */
    workerDashboard:<WorkerDashboard/>,
    workerTimesheet:<WorkerTimesheet/>,
    workerPayStubs:<WorkerPayStubs/>,
    workerDocuments:<WorkerDocuments/>,
    /* ─── Client staffing routes (employer with active assignments) ─── */
    empStaffing:<EmpShell><EmpStaffing/></EmpShell>,
    empStaffingRequests:<EmpShell><EmpStaffingRequests/></EmpShell>,
    empStaffingAssignments:<EmpShell><EmpStaffingAssignments/></EmpShell>,
    empStaffingTimesheets:<EmpShell><EmpStaffingTimesheets/></EmpShell>,
    empStaffingInvoices:<EmpShell><EmpStaffingInvoices/></EmpShell>,
};

  const r=ROUTES[pg]||ROUTES.home;
  /* Role guard: while the /auth/me check is still in flight, `user` is null but that is NOT
     evidence of a signed-out session. Rendering DeniedPage there flashed "You need to sign in
     to open this page" on every hard refresh of any role-guarded route (empJobs, hrDashboard,
     the post-job wizard's step 3 on re-mount) — the exact symptom the user reported. Render a
     small placeholder until authChecked flips, then apply the real guard. */
  const authPending=!A.authChecked&&!user;
  const guarded=r.roles&&(!user||!r.roles.includes(user.role));
  const view=authPending&&r.roles?<div style={{minHeight:"40vh"}} aria-busy="true"/>:(guarded?<DeniedPage/>:(PAGES[pg]||<HomePage/>));
  /* Shared routes (messages, interviews, settings, blog/training editors) are wrapped in a shell
     for employers/admins — so treat them as `bare` at the root layout level so we don't stack
     the site header/footer on top of the shell chrome. */
  const _sharedInShell=["messages","interviews","settings","empBlogEdit","empTrainEdit"].includes(pg)&&(user?.role==="employer"||user?.role==="admin");
  const _isBare=r.bare||_sharedInShell;
  /* Desktop: show footer on any non-bare page that isn't the CV editor / pipeline.
     Mobile: show a compact footer only on the true landing pages FOR GUESTS.
     Signed-in users always get the tabbar (never the mobile footer) so navigation is consistent. */
  const _guestMobFooterPages=["home","about","contact","pricing","forEmployers","howItWorks","blogs","trainings","privacy","terms","accessibility","pipeda","employers"];
  const showFooter=!_isBare&&!["cvEdit","empPipeline"].includes(pg)&&(!mob||(!user&&_guestMobFooterPages.includes(pg)));
  const showTabs=mob&&!_isBare&&!showFooter&&!!user; /* Signed-in mobile users get the tabbar everywhere */

  return <Ctx.Provider value={A}>
    <div style={{fontFamily:FONT,background:C.bg,color:C.text,minHeight:"100vh",display:"flex",flexDirection:"column",WebkitFontSmoothing:"antialiased"}}>
      <style>{`
        html,body,#root{height:100%}
        input::placeholder,textarea::placeholder{color:${C.text3}}
        button{font-family:inherit}
        ::-webkit-scrollbar{width:9px;height:9px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.line};border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:${C.text3}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
        @keyframes up{from{transform:translateY(100%)}to{transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
        @keyframes slideInR{from{transform:translateX(100%)}to{transform:none}}
        @keyframes grow{from{height:0}}
        @keyframes shake{10%,90%{transform:translateX(-1px)}30%,70%{transform:translateX(2px)}50%{transform:translateX(-2px)}}
        @media print{header,nav,footer{display:none!important}}
        /* Subtle global motion — respected by prefers-reduced-motion below */
        button, a { transition: transform .18s ease, background-color .16s ease, color .16s ease, border-color .16s ease, box-shadow .18s ease, filter .16s ease; }
        button:active { transform: scale(.97); }
        /* Cards lift on hover */
        [data-card]:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -8px rgba(15,23,42,.09); }
        /* Route content mount fade */
        [data-page-content] { animation: rise .34s cubic-bezier(.22,.9,.32,1) both; }
        [data-fade] { animation: fadeIn .3s ease both; }
        @media (prefers-reduced-motion: reduce){
          *,*::before,*::after{animation-duration:.01s!important;animation-iteration-count:1!important;transition-duration:.01s!important;scroll-behavior:auto!important}
          [data-card]:hover{transform:none!important;box-shadow:none!important}
        }
      `}</style>
      {settings.maintenance&&user?.role!=="admin"
        ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <Card pad={34} style={{maxWidth:440,textAlign:"center"}}>
              <div style={{width:64,height:64,borderRadius:99,background:C.warnBg,display:"flex",alignItems:"center",
                justifyContent:"center",margin:"0 auto 18px",color:C.warn}}><I n="gear" s={30}/></div>
              <h1 style={{fontSize:22,fontWeight:730,color:C.text,margin:"0 0 10px"}}>NorthHire is under maintenance</h1>
              <p style={{fontSize:15,color:C.text2,lineHeight:1.65,margin:0}}>
                We are making some improvements and will be back shortly. Thanks for your patience.</p></Card></div>
        : <>
            {outdated&&<div role="status" aria-live="polite" style={{background:C.ink,color:"#fff",padding:"10px 18px",
              display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:13.5,fontWeight:600}} data-version-banner>
              <span style={{display:"flex",alignItems:"center",gap:8}}><I n="sparkle" s={16}/>{t("common.newVersionMsg")}</span>
              <button onClick={()=>{try{window.location.reload();}catch{/* ignore */}}} style={{background:"#fff",color:C.ink,border:"none",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>{t("common.newVersionBtn")}</button>
            </div>}
            {impersonating?.originalUser&&<div style={{background:C.warn,color:"#fff",padding:"10px 18px",
              display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:13.5,fontWeight:600}} data-impersonation-banner>
              <span style={{display:"flex",alignItems:"center",gap:8}}><I n="eye" s={16}/>Viewing as {user?.name}</span>
              <button onClick={stopImpersonating} style={{background:"#fff",color:C.warn,border:"none",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Return to admin</button>
            </div>}
            <a href="#main-content" style={{position:"absolute",left:-9999,top:"auto",width:1,height:1,overflow:"hidden",zIndex:9999,
              background:C.brand,color:"#fff",padding:"14px 20px",minHeight:44,display:"inline-flex",alignItems:"center",borderRadius:8,fontWeight:700,fontSize:14}}
              onFocus={e=>Object.assign(e.currentTarget.style,{left:12,top:12,width:"auto",height:"auto",overflow:"visible"})}
              onBlur={e=>Object.assign(e.currentTarget.style,{left:-9999,top:"auto",width:1,height:1,overflow:"hidden"})}>Skip to main content</a>
            {!_isBare&&<Header/>}
            <main id="main-content" tabIndex={-1} key={pg} style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,animation:"rise .32s ease",outline:"none"}}>{view}</main>
            {showFooter&&<Footer/>}
            {showTabs&&<TabBar/>}
            {hireOnboarding&&<HireOnboardingModal payload={hireOnboarding} onClose={()=>setHireOnboarding(null)}/>}
            {/* Zero-CV pre-flight is a global concern - every apply entry point (job detail, search
                cards, matched-jobs list, invited-candidate CTA) routes through A.beginApply() and
                fires this modal when the signed-in seeker has no CV attached yet. */}
            {A.noCvGateJobId&&<Modal onClose={A.closeNoCvGate} title={t("shared.jobDetail.noCvGateTitle")}>
              <p className="text-sm text-text-2 leading-relaxed mb-4">{t("shared.jobDetail.noCvGateBody")}</p>
              <div className="flex gap-2.5 justify-end flex-wrap">
                <Btn kind="ghost" onClick={A.closeNoCvGate}>{t("shared.jobDetail.noCvGateNotNow")}</Btn>
                <Btn kind="primary" icon="plus" onClick={()=>{A.closeNoCvGate();A.go("cvs");}}>{t("shared.jobDetail.noCvGateCreate")}</Btn>
              </div>
            </Modal>}
            <ToastHost toasts={A.toasts} dismiss={A.dismissToast}/>
            <CompareBar/>
            <CommandPalette/>
            {/* Cookie banner hides on dashboard-shell pages: a signed-in user is on a page whose
                left rail carries the "Sign out" and bottom-of-nav controls, and the fixed
                bottom-left banner was overlapping and hiding them. Signed-in users have
                obviously consented to session cookies to be signed in at all.
                Button sizing: min-height 48 to clear WCAG comfortable-tap-target guidance,
                since the banner is the first thing a mobile visitor sees.
                Auto-dismiss on scroll-past-footer: an IntersectionObserver watches the site
                footer; as soon as it enters the viewport the banner hides itself, since a
                reader who scrolled all the way down clearly saw the page and doesn't need a
                second dismissal prompt overlapping the footer nav links. */}
            {!cookieAck&&!_isBare&&<CookieBanner mob={mob} onAccept={acceptCookies} onGoPolicy={()=>{acceptCookies();go("privacy");}}/>}
          </>}
    </div></Ctx.Provider>;
}

/* Roadmap B4-12: command palette (Cmd+K / Ctrl+K). A global modal that fuzzy-matches route
   titles + the user's own entities (jobs they can navigate to, saved searches, employers they
   follow) + a handful of named actions. Keeps the keyboard-only path short — power users on
   30+ job listings or 200+ employees never want to click through the nav. */
function CommandPalette(){
  const A=use(); const {t}=useTranslation();
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const [cursor,setCursor]=useState(0);
  useEffect(()=>{
    const onKey=e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setOpen(o=>!o);setQ("");setCursor(0);return;}
      if(e.key==="Escape"&&open){setOpen(false);}
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[open]);
  if(!open) return null;
  const nq=q.trim().toLowerCase();
  const items=[];
  const tabsForRole=(A.user?.role==="employer")?[["empHome","Dashboard"],["empJobs","My jobs"],["empPipeline","Candidates"],["empAnalytics","Analytics"],["empBilling","Billing"],["empCompany","Company profile"],["empTeam","Team"],["empPost","Post a job"],["interviews","Interviews"],["messages","Messages"],["settings","Settings"]]
    :(A.user?.role==="admin")?[["admin","Overview"],["admUsers","Users"],["admEmployers","Employers"],["admJobs","Jobs moderation"],["admStats","Statistics"],["admLog","Activity log"],["admConfig","Business config"],["admSettings","Settings"]]
    :[["home","Home"],["search","Search jobs"],["matched","Matched"],["saved","Saved"],["status","My applications"],["interviews","Interviews"],["messages","Messages"],["profile","Profile"],["cvs","My CVs"],["salaryCalc","Salary calculator"],["settings","Settings"]];
  for(const [page,label] of tabsForRole){
    if(!nq||label.toLowerCase().includes(nq)) items.push({kind:"page",label,action:()=>A.go(page)});
  }
  if(A.user?.role==="employer"&&(A.jobs||[]).length){
    for(const j of A.jobs.filter(j=>j.e===A.company?.id)){
      if(nq&&!j.t.toLowerCase().includes(nq)) continue;
      items.push({kind:"job",label:`Pipeline — ${j.t}`,hint:`${j.city||""}, ${j.prov||""}`.replace(/^, |, $/,""),action:()=>{A.setPipelineJob(j.id);A.go("empPipeline");}});
      if(items.length>=40) break;
    }
  }
  if(A.user?.role==="seeker"&&(A.savedSearches||[]).length){
    for(const s of A.savedSearches){
      if(nq&&!s.name?.toLowerCase().includes(nq)) continue;
      items.push({kind:"search",label:`Open saved search — ${s.name}`,action:()=>{A.setSearch({q:s.q,where:s.where,cats:s.cats||[]});A.go("search");}});
    }
  }
  const take=items.slice(0,20);
  const pick=i=>{if(take[i]){take[i].action();setOpen(false);}};
  return <div onClick={()=>setOpen(false)} className="fixed inset-0 z-[950] bg-ink/40 flex items-start justify-center" style={{paddingTop:80,animation:"fade .15s ease both"}}>
    <div onClick={e=>e.stopPropagation()} className="bg-white rounded-2xl shadow-xl border border-line" style={{width:"min(92vw,560px)",overflow:"hidden"}}>
      <input autoFocus value={q} onChange={e=>{setQ(e.target.value);setCursor(0);}}
        onKeyDown={e=>{
          if(e.key==="ArrowDown"){e.preventDefault();setCursor(c=>Math.min(c+1,take.length-1));}
          else if(e.key==="ArrowUp"){e.preventDefault();setCursor(c=>Math.max(c-1,0));}
          else if(e.key==="Enter"){e.preventDefault();pick(cursor);}
        }}
        placeholder={t("palette.placeholder")}
        className="w-full border-0 outline-none text-base p-4 border-b border-line text-text"/>
      <div className="max-h-96 overflow-y-auto">
        {take.length===0
          ? <div className="p-5 text-sm text-text-3">{t("palette.noResults")}</div>
          : take.map((it,i)=><button key={i} onMouseEnter={()=>setCursor(i)} onClick={()=>pick(i)}
              className={`w-full text-left py-2.5 px-4 border-0 bg-transparent cursor-pointer flex items-center gap-3 ${i===cursor?"bg-wash":""}`}>
              <span className="text-xs font-bold uppercase tracking-wide text-text-3 w-16 shrink-0">{it.kind}</span>
              <span className="text-sm text-text flex-1 min-w-0 truncate">{it.label}</span>
              {it.hint&&<span className="text-xs text-text-3 shrink-0">{it.hint}</span>}
            </button>)}
      </div>
      <div className="py-2 px-4 border-t border-line-soft text-xs text-text-3 flex justify-between">
        <span>{t("palette.hint")}</span>
        <span>↑↓ · ⏎ · Esc</span>
      </div>
    </div>
  </div>;
}

/* Roadmap B4-11: compare-jobs floating bar. Appears when the seeker has ticked 2+ jobs via the
   JobCard checkbox; clicking Compare opens a side-by-side modal with pay/location/type/mode/
   deadline rows. Session-scoped — clears on sign-out or by the Clear button. Hidden entirely
   when nothing is selected so it doesn't clutter the page. */
function CompareBar(){
  const A=use(); const {t}=useTranslation();
  const [showModal,setShowModal]=useState(false);
  const ids=[...(A.compare||[])];
  if(!ids.length) return null;
  const picked=ids.map(id=>A.job(id)).filter(Boolean);
  const rows=[
    ["cards.pay", j=>pay(j)+" "+payUnit(j)],
    ["cards.location", j=>`${j.city}, ${j.prov}`],
    ["cards.employmentType", j=>j.type],
    ["cards.workMode", j=>j.mode],
    ["cards.applyBy", j=>dlText(j.dl)],
    ["cards.openings", j=>String(j.vac)],
  ];
  return <>
    <div className="fixed left-1/2 z-[800] bg-ink text-white rounded-full py-2 px-4 flex gap-3 items-center shadow-lg"
      style={{bottom:24, transform:"translateX(-50%)"}}>
      <span className="text-sm font-semibold">{t("cards.compareCount",{n:picked.length})}</span>
      <button onClick={()=>setShowModal(true)} disabled={picked.length<2}
        className={`bg-brand text-white border-0 rounded-full py-1.5 px-3.5 text-xs font-bold uppercase tracking-wide cursor-pointer ${picked.length<2?"opacity-50 cursor-not-allowed":""}`}>
        {t("cards.compareBtn")}</button>
      <button onClick={A.clearCompare} className="bg-transparent border-0 text-white/70 text-xs font-semibold cursor-pointer hover:text-white">
        {t("cards.clearCompare")}</button>
    </div>
    {showModal&&<Modal onClose={()=>setShowModal(false)} title={t("cards.compareModalTitle")} wide>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{minWidth:picked.length*220}}>
          <thead><tr><th className="text-left text-xs font-bold text-text-3 uppercase tracking-wide py-2.5 px-3 border-b border-line sticky left-0 bg-white z-10">{t("cards.compareFieldCol")}</th>
            {picked.map(j=><th key={j.id} className="text-left py-2.5 px-3 border-b border-line min-w-50">
              <button onClick={()=>{setShowModal(false);A.openJob(j.id);}} className="bg-transparent border-0 cursor-pointer text-left p-0">
                <div className="text-sm font-bold text-text">{j.t}</div>
                <div className="text-xs text-text-2 mt-0.5">{A.emp(j.e)?.name}</div></button></th>)}
          </tr></thead>
          <tbody>{rows.map(([k,getV])=><tr key={k}>
            <td className="text-xs font-semibold text-text-3 py-3 px-3 border-b border-line-soft sticky left-0 bg-white z-10">{t(k)}</td>
            {picked.map(j=><td key={j.id} className="text-sm text-text py-3 px-3 border-b border-line-soft">{getV(j)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </Modal>}
  </>;
}

/* Cookie banner extracted so it can carry its own IntersectionObserver on the site footer
   (or the bottom-of-page marker when no footer is rendered). Once the footer scrolls into
   view the banner is hidden - a reader who's read the whole page has clearly seen it and
   doesn't need a second dismissal prompt overlapping the footer's own nav links. */
function CookieBanner({mob,onAccept,onGoPolicy}){
  const {t}=useTranslation();
  const [hidden,setHidden]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const footer=document.querySelector("footer");
    if(!footer||typeof IntersectionObserver!=="function")return;
    const io=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting))setHidden(true);
    },{rootMargin:"0px 0px -20px 0px"});
    io.observe(footer);
    return ()=>io.disconnect();
  },[]);
  // QA-r3 P1: banner covered a required Yes/No radio on apply-step-2 — user couldn't
  // complete the wizard without dismissing cookies. Push page content up by the banner's real
  // rendered height so nothing underneath is ever hidden. Cleared on hide/unmount.
  useEffect(()=>{
    if(hidden){document.body.style.paddingBottom="";return;}
    const measure=()=>{
      const h=ref.current?.getBoundingClientRect().height||0;
      document.body.style.paddingBottom=h?(h+(mob?12:20))+"px":"";
    };
    measure();
    const ro=typeof ResizeObserver!=="undefined"&&ref.current?new ResizeObserver(measure):null;
    if(ro&&ref.current)ro.observe(ref.current);
    window.addEventListener("resize",measure);
    return ()=>{document.body.style.paddingBottom="";ro?.disconnect();window.removeEventListener("resize",measure);};
  },[hidden,mob]);
  if(hidden)return null;
  return <div ref={ref} style={{position:"fixed",bottom:mob?76:20,left:mob?12:20,right:mob?12:20,maxWidth:560,margin:mob?"0":"0",
    background:C.ink,color:"#fff",borderRadius:14,padding:mob?"14px 16px":"16px 20px",boxShadow:SH.xl,
    display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",zIndex:600}} data-cookie-accepted="false">
    <div style={{color:"#6AACFF",display:"flex",flexShrink:0}}><I n="shield" s={20}/></div>
    <div style={{flex:"1 1 240px",minWidth:0,fontSize:13.5,lineHeight:1.55}}>
      {t("cookie.text",{link:""})}<button onClick={onGoPolicy}
        style={{background:"none",border:"none",padding:0,color:"#6AACFF",cursor:"pointer",fontFamily:"inherit",fontSize:13.5,fontWeight:600,textDecoration:"underline"}}>{t("cookie.linkText")}</button>.</div>
    <button onClick={onAccept} style={{background:"#fff",color:C.ink,border:"none",minHeight:48,padding:"12px 20px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",flexShrink:0}}>{t("cookie.gotIt")}</button>
  </div>;
}
