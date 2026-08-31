import { useState } from "react";
import { Ctx } from "./store/context.js";
import { useStore } from "./store/useStore.js";
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
import { MessagesPage } from "./pages/shared/MessagesPage.jsx";
import { InterviewsPage } from "./pages/shared/InterviewsPage.jsx";
import { WorkerDashboard, WorkerTimesheet, WorkerPayStubs, WorkerDocuments } from "./pages/seeker/worker.jsx";
import {
  EmpHome, EmpJobs, EmpPost, EmpPipeline, EmpCandidate, ContentManager, EmpArticlesPage,
  EmpTrainingsAdminPage, BlogEditor, TrainingEditor, EmpCompany, EmpBilling, EmpAnalyticsPage,
} from "./pages/employer/suite.jsx";
import {
  EmpStaffing, EmpStaffingTimesheets, EmpStaffingInvoices, EmpStaffingAssignments, EmpStaffingRequests,
} from "./pages/employer/staffing.jsx";
import {
  HrLoginPage, HrDashboard, HrProfile, HrAttendance, HrLeave, HrTasks, HrCalendar, HrChat,
  HrInvoices, HrPayroll, HrTrainings, HrBadges, HrHiring, HrReports, HrSettings, HrIntegrations,
} from "./pages/hr/suite.jsx";
import { HrPeoplePage, HrExpensesPage } from "./pages/hr/people.jsx";
import { HireOnboardingModal } from "./pages/shared/HireOnboardingModal.jsx";
import {
  AgencyLoginPage, AgencyDashboard, AgencyJobOrders, AgencyBench, AgencyAssignments,
  AgencyTimesheets, AgencyPayroll, AgencyInvoicing, AgencyPlacements, AgencyClients,
  AgencyWorkers, AgencyMargins, AgencyCompliance,
} from "./pages/staffing/suite.jsx";
import { AdmHome, AdmUsers, AdmEmployers, AdmJobs, AdmSettings, AdmLog, AdmStats } from "./pages/admin/suite.jsx";
import {
  HomePage, BlogsPage, BlogPage, TrainingsPage, TrainingPage, AboutPage, ContactPage, LegalPage,
  PricingPage, AccessibilityPage, PipedaPage,
} from "./pages/marketing/pages.jsx";
import { ForEmployersPage, HowItWorksPage } from "./pages/marketing/forEmployers.jsx";
import { SignupPage, LoginPage, ForgotPasswordPage, WelcomeTourPage } from "./pages/auth/pages.jsx";
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
  const [cookieAck,setCookieAck]=useState(()=>{if(typeof window==="undefined")return true;
    try{return localStorage.getItem("northhire.cookies")==="1";}catch{return true;}});
  const acceptCookies=()=>{try{localStorage.setItem("northhire.cookies","1");}catch{}
    setCookieAck(true); A.logActivity("cookies.accepted","Accepted cookie use","shield");};

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
    pricing:<PricingPage/>,forEmployers:<ForEmployersPage/>,howItWorks:<HowItWorksPage/>,login:<LoginPage/>,signup:<SignupPage/>,forgot:<ForgotPasswordPage/>,denied:<DeniedPage/>,
    welcome:<WelcomeTourPage kind="seeker"/>,welcomeEmp:<WelcomeTourPage kind="employer"/>,
    empHome:<EmpShell><EmpHome/></EmpShell>,empJobs:<EmpShell><EmpJobs/></EmpShell>,empPost:<EmpShell><EmpPost/></EmpShell>,empPipeline:<EmpShell><EmpPipeline/></EmpShell>,empCandidate:<EmpShell><EmpCandidate/></EmpShell>,
    empContent:<EmpShell><ContentManager scope="employer"/></EmpShell>,
    empArticles:<EmpShell><EmpArticlesPage/></EmpShell>,empTrainings:<EmpShell><EmpTrainingsAdminPage/></EmpShell>,empBlogEdit:_roleWrap(<BlogEditor/>),empTrainEdit:_roleWrap(<TrainingEditor/>),
    empCompany:<EmpShell><EmpCompany/></EmpShell>,empBilling:<EmpShell><EmpBilling/></EmpShell>,empAnalytics:<EmpShell><EmpAnalyticsPage/></EmpShell>,
    admHome:<AdmShell><AdmHome/></AdmShell>,admUsers:<AdmShell><AdmUsers/></AdmShell>,admEmployers:<AdmShell><AdmEmployers/></AdmShell>,admJobs:<AdmShell><AdmJobs/></AdmShell>,
    account:<AccountMenuPage/>,
    accessibility:<AccessibilityPage/>,pipeda:<PipedaPage/>,
    admBlogs:<AdmShell><ContentManager scope="admin"/></AdmShell>,admTrainings:<AdmShell><ContentManager scope="admin"/></AdmShell>,
    admSettings:<AdmShell><AdmSettings/></AdmShell>,admLog:<AdmShell><AdmLog/></AdmShell>,admStats:<AdmShell><AdmStats/></AdmShell>,
    /* HR Suite */
    hrLogin:<HrLoginPage/>,
    hrDashboard:<HrShell><HrDashboard/></HrShell>,
    hrDirectory:<HrShell><HrPeoplePage/></HrShell>, /* backward-compat: routes to new merged People */
    hrProfile:<HrShell><HrProfile/></HrShell>,
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
    hrIntegrations:<HrShell><HrIntegrations/></HrShell>,
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
    agencyCompliance:<AgencyShell><AgencyCompliance/></AgencyShell>,
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
  const guarded=r.roles&&(!user||!r.roles.includes(user.role));
  const view=guarded?<DeniedPage/>:(PAGES[pg]||<HomePage/>);
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
            {impersonating?.originalUser&&<div style={{background:C.warn,color:"#fff",padding:"10px 18px",
              display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:13.5,fontWeight:600}} data-impersonation-banner>
              <span style={{display:"flex",alignItems:"center",gap:8}}><I n="eye" s={16}/>Viewing as {user?.name}</span>
              <button onClick={stopImpersonating} style={{background:"#fff",color:C.warn,border:"none",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Return to admin</button>
            </div>}
            {!_isBare&&<Header/>}
            <main key={pg} style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,animation:"fadeIn .22s ease"}}>{view}</main>
            {showFooter&&<Footer/>}
            {showTabs&&<TabBar/>}
            {hireOnboarding&&<HireOnboardingModal payload={hireOnboarding} onClose={()=>setHireOnboarding(null)}/>}
            {!cookieAck&&<div style={{position:"fixed",bottom:mob?76:20,left:mob?12:20,right:mob?12:20,maxWidth:560,margin:mob?"0":"0",
              background:C.ink,color:"#fff",borderRadius:14,padding:mob?"14px 16px":"16px 20px",boxShadow:SH.xl,
              display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",zIndex:600}} data-cookie-accepted="false">
              <div style={{color:"#6AACFF",display:"flex",flexShrink:0}}><I n="shield" s={20}/></div>
              <div style={{flex:"1 1 240px",minWidth:0,fontSize:13.5,lineHeight:1.55}}>
                We use cookies for sign-in, saved jobs and analytics. See our <button onClick={()=>{acceptCookies();go("privacy");}}
                  style={{background:"none",border:"none",padding:0,color:"#6AACFF",cursor:"pointer",fontFamily:"inherit",fontSize:13.5,fontWeight:600,textDecoration:"underline"}}>privacy policy</button>.</div>
              <button onClick={acceptCookies} style={{background:"#fff",color:C.ink,border:"none",padding:"9px 18px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",flexShrink:0}}>Got it</button>
            </div>}
          </>}
    </div></Ctx.Provider>;
}
