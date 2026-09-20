import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C, SH } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { Btn, SmartLogo, SmartPortrait, Tooltip } from "../design/primitives.jsx";
import { ROUTES } from "../routes.js";
import { useStickyNavScroll } from "../helpers/scrollRegion.js";
import { useTranslation } from "../i18n/i18n.jsx";
import { NotificationBell } from "./NotificationBell.jsx";
import { DockedChat } from "../pages/employer/components/DockedChat.jsx";

/* label is an i18n key (looked up with t() at render time) - this module is static and has no
   access to the current locale, same pattern as TABS_BY_ROLE in routes.js. */
export const EMP_MODULES=[
  {k:"empHome",label:"dashShell.modEmpHome",icon:"activity",section:"main"},
  {k:"empJobs",label:"dashShell.modEmpJobs",icon:"briefcase",section:"main"},
  {k:"empPost",label:"dashShell.modEmpPost",icon:"plus",section:"main"},
  {k:"empPipeline",label:"dashShell.modEmpPipeline",icon:"users",section:"main"},
  {k:"empAnalytics",label:"dashShell.modEmpAnalytics",icon:"trend",section:"main"},
  {k:"messages",label:"messages.pageTag",icon:"mail",section:"main"},
  {k:"interviews",label:"interviews.pageTag",icon:"calendar",section:"main",feature:"interviews"},
  /* Staffing services — visible to all, but non-clients see the sales page */
  {k:"empStaffing",label:"dashShell.modEmpStaffing",icon:"target",section:"staffing"},
  {k:"empStaffingRequests",label:"dashShell.modEmpStaffingRequests",icon:"plus",section:"staffing",clientOnly:true},
  {k:"empStaffingAssignments",label:"dashShell.modEmpStaffingAssignments",icon:"activity",section:"staffing",clientOnly:true},
  {k:"empStaffingTimesheets",label:"dashShell.modEmpStaffingTimesheets",icon:"clock",section:"staffing",clientOnly:true},
  {k:"empStaffingInvoices",label:"dashShell.modEmpStaffingInvoices",icon:"file",section:"staffing",clientOnly:true},
  /* HR Suite — Enterprise feature, embedded as tabs */
  {k:"hrDashboard",label:"dashShell.modHrDashboard",icon:"activity",section:"hrsuite",feature:"hrSuite"},
  {k:"hrPeople",label:"tabs.people",icon:"users",section:"hrsuite",feature:"hrSuite"},
  {k:"hrAttendance",label:"dashShell.modHrAttendance",icon:"clock",section:"hrsuite",feature:"hrSuite"},
  {k:"hrLeave",label:"dashShell.modHrLeave",icon:"calendar",section:"hrsuite",feature:"hrSuite"},
  {k:"hrExpenses",label:"dashShell.modHrExpenses",icon:"wallet",section:"hrsuite",feature:"hrSuite"},
  {k:"hrPayroll",label:"dashShell.modHrPayroll",icon:"wallet",section:"hrsuite",feature:"hrSuite"},
  {k:"hrReports",label:"dashShell.modHrReports",icon:"trend",section:"hrsuite",feature:"hrSuite"},
  /* Content — Growth feature */
  {k:"empArticles",label:"dashShell.modEmpArticles",icon:"book",section:"content",feature:"articles"},
  {k:"empTrainings",label:"nav.trainings",icon:"cap",section:"content",feature:"trainings"},
  {k:"empCompany",label:"dashShell.modEmpCompany",icon:"building",section:"account"},
  {k:"empTeam",label:"dashShell.modEmpTeam",icon:"users",section:"account"},
  {k:"empBilling",label:"dashShell.modEmpBilling",icon:"wallet",section:"account"},
  {k:"empApi",label:"dashShell.modEmpApi",icon:"externalLink",section:"account",feature:"api"},
  {k:"empSso",label:"dashShell.modEmpSso",icon:"shield",section:"account",feature:"sso"},
  {k:"settings",label:"account.settings",icon:"gear",section:"account"},
];

/* adminScope: which scoped admin roles see this section - undefined means every admin scope
   (including readonly) sees it, since these are pure visibility gates matching the server-side
   requireAdminScope() checks in server/routes/*.js; "full" always sees everything regardless. */
export const ADM_MODULES=[
  {k:"admHome",label:"account.overview",icon:"activity",section:"main"},
  {k:"admStats",label:"account.statistics",icon:"trend",section:"main"},
  {k:"admLog",label:"account.activityLog",icon:"file",section:"main"},
  {k:"admUsers",label:"profile.users",icon:"users",section:"manage",adminScope:["support","moderator"]},
  {k:"admEmployers",label:"profile.employers",icon:"building",section:"manage",adminScope:["moderator"]},
  {k:"admJobs",label:"tabs.jobs",icon:"briefcase",section:"manage",adminScope:["moderator"]},
  {k:"admModeration",label:"dashShell.modAdmModeration",icon:"shield",section:"manage",adminScope:["moderator"]},
  {k:"admBlogs",label:"dashShell.modAdmBlogs",icon:"book",section:"content",adminScope:["moderator"]},
  {k:"admTrainings",label:"nav.trainings",icon:"cap",section:"content",adminScope:["moderator"]},
  {k:"admConfig",label:"dashShell.modAdmConfig",icon:"wallet",section:"finance",adminScope:["finance"]},
  {k:"admAdmins",label:"dashShell.modAdmAdmins",icon:"shield",section:"account",adminScope:[]},
  {k:"admSettings",label:"account.platformSettings",icon:"gear",section:"account",adminScope:[]},
  {k:"admDesignSystem",label:"dashShell.modAdmDesignSystem",icon:"book",section:"account",adminScope:[]},
];

export const SECTION_LABELS={main:"dashShell.secMain",staffing:"dashShell.secStaffing",hrsuite:"dashShell.secHrsuite",content:"dashShell.secContent",finance:"dashShell.secFinance",manage:"dashShell.secManage",account:"dashShell.secAccount"};

/* ─── Feature-specific upgrade prompt ─── */
export function UpgradePromptModal({payload,onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const {feature,requiredPlan,label,icon}=payload;
  const currentPlan=A.planName();
  /* Rich benefit copy per feature lives in dashShell.featureBenefits.<feature> (title/why/bullets)
     in the message catalogs - not built here, so it stays available in both locales. */
  const fb=t(`dashShell.featureBenefits.${feature}`);
  const b=(fb&&typeof fb==="object")?fb:{title:label,why:t("dashShell.featureBenefitFallbackWhy"),bullets:[]};
  /* Which plans include this */
  const plans=Object.entries(A.PLANS).filter(([_,p])=>{const v=p[feature]; return v===true||typeof v==="number"&&v>0||v==="full"||v===Infinity;});
  const cheapest=plans.reduce((min,[n,p])=>!min||p.price<min[1].price?[n,p]:min,null);
  return <div onClick={onClose} className={`fixed inset-0 bg-[rgba(15,23,42,0.68)] z-9998 flex items-center justify-center backdrop-blur-sm ${mob?"p-4":"p-6"}`}>
    <div onClick={e=>e.stopPropagation()} className={`bg-white max-w-xl w-full max-h-[90vh] overflow-auto shadow-[0_24px_60px_rgba(0,0,0,0.35)] ${mob?"rounded-2xl":"rounded-3xl"}`}>
      {/* Header */}
      <div className={`border-b border-line bg-[linear-gradient(180deg,var(--color-tint)_0%,#fff_100%)] ${mob?"pt-6 px-6 pb-5":"pt-7 px-8 pb-6"}`}>
        <div className="flex gap-3.5 items-start">
          <div className="w-12 h-12 rounded-xl bg-white text-brand border border-line-2 flex items-center justify-center shrink-0">
            <I n={icon||"lock"} s={22}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-block py-1 px-2.5 bg-[#FEF3E2] text-[#D97706] border border-[#FCD9A8] rounded-full text-xs font-bold tracking-wide uppercase mb-2">{t("dashShell.requiresPlanBadge",{plan:requiredPlan})}</div>
            <h2 className={`font-bold tracking-tight text-text mb-1.5 leading-tight ${mob?"text-xl":"text-2xl"}`}>{b.title}</h2>
            <div className="text-sm text-text-3">{t("dashShell.onPlanLabel",{plan:currentPlan})}</div>
          </div>
          <button onClick={onClose} aria-label={t("common.close")} className="bg-transparent border-0 cursor-pointer p-1.5 text-text-3 flex shrink-0"><I n="x" s={20}/></button>
        </div>
      </div>

      {/* Body */}
      <div className={mob?"p-6":"p-8"}>
        <p className="text-sm text-text-2 leading-relaxed mb-5">{b.why}</p>

        {b.bullets.length>0&&<div className="mb-6">
          <div className="text-xs font-bold text-text-3 tracking-wider uppercase mb-3">{t("dashShell.whatYouUnlock")}</div>
          <div className="flex flex-col gap-2.5">
            {b.bullets.map((bl,i)=><div key={i} className="flex gap-2.5 items-start text-sm text-text-2 leading-normal">
              <div className="w-5 h-5 rounded-full bg-tint text-brand flex items-center justify-center shrink-0 mt-px"><I n="check" s={12}/></div>
              <span>{bl}</span>
            </div>)}
          </div>
        </div>}

        {/* Plans that unlock it — doubles as the "what it costs" part of the 5-part shape:
            each row already states the plan's monthly price, and the cheapest plan that unlocks
            this feature is visually called out. */}
        <div className="p-4 bg-bg rounded-xl mb-5">
          <div className="text-xs font-bold text-text-3 tracking-wider uppercase mb-3">{t("dashShell.availableOn")}</div>
          <div className="flex flex-col gap-2">
            {plans.map(([n,p])=><div key={n} className={`flex justify-between items-center py-2.5 px-3 bg-white rounded-lg ${n===cheapest?.[0]?"border-2 border-brand":"border border-line"}`}>
              <div>
                <div className="text-sm font-bold text-text">{n}{n===cheapest?.[0]&&<span className="ml-2 text-xs font-bold text-brand tracking-wide uppercase">{t("dashShell.cheapestTag")}</span>}</div>
                <div className="text-xs text-text-3 mt-0.5">{t("dashShell.perMonthPrice",{price:p.price})}</div>
              </div>
              <I n="check" s={16} c={C.ok}/>
            </div>)}
          </div>
        </div>

        {/* 5th part of the charter-mandated shape: "what changes" — everything on the current
            plan keeps working, this is additive. b.whatChanges is per-feature copy from
            dashShell.featureBenefits.<feature>.whatChanges when written; otherwise a generic
            line that's still true for every feature (nothing is ever removed on upgrade). */}
        <div className="p-4 border border-line-soft rounded-xl flex gap-2.5 items-start">
          <div className="w-6 h-6 rounded-full bg-ok-bg text-ok flex items-center justify-center shrink-0 mt-px"><I n="check" s={13}/></div>
          <div className="text-sm text-text-2 leading-relaxed">
            <span className="font-semibold text-text">{t("dashShell.whatChangesLabel")}</span>{" "}
            {b.whatChanges||t("dashShell.whatChangesFallback",{plan:cheapest?.[0]||requiredPlan})}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className={`border-t border-line bg-bg flex gap-2.5 justify-end flex-wrap ${mob?"pt-4 px-6 pb-6":"pt-5 px-8 pb-7"}`}>
        <Btn kind="ghost" onClick={onClose}>{t("dashShell.maybeLaterBtn")}</Btn>
        <Btn kind="primary" icon="wallet" onClick={()=>{onClose(); A.go("pricing");}}>{t("dashShell.seeAllPlansBtn")}</Btn>
        {cheapest&&<Btn kind="primary" icon="chevR" onClick={()=>{onClose(); A.choosePlan(cheapest[0]);}} style={{background:C.brand,borderColor:C.brand}}>{t("dashShell.upgradeToPlanBtn",{plan:cheapest[0]})}</Btn>}
      </div>
    </div>
  </div>;
}

export function DashShell({modules,children,brandKind}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  /* Left nav keeps its scroll position across navigations and remounts, and auto-scrolls the
     active item into view on every navigation. Must come after A is defined. */
  const navScrollRef=useStickyNavScroll("dash",A.pg);
  const [navOpen,setNavOpen]=useState(!mob);
  const {upgradeModal,setUpgradeModal}=A; /* lifted to the store so pages nested under this shell can also trigger it */
  const [accountMenu,setAccountMenu]=useState(false);
  const [lockHover,setLockHover]=useState(null); /* {key, top, left} of currently-hovered locked item, for the portaled tooltip */
  useEffect(()=>{setNavOpen(!mob);},[mob]);
  useEffect(()=>{
    if(!accountMenu)return;
    const onKey=e=>{if(e.key==="Escape")setAccountMenu(false);};
    document.addEventListener("keydown",onKey);
    return ()=>document.removeEventListener("keydown",onKey);
  },[accountMenu]);

  const user=A.user; const company=A.company;
  // A scoped admin (support/moderator/finance/readonly) only sees the sections its scope covers -
  // "full" (or a non-admin console) sees everything; a section with no adminScope list is visible
  // to every admin scope (matching server routes that don't gate that GET by scope at all).
  const visibleModules=user?.role==="admin"&&(user.adminScope||"full")!=="full"
    ?modules.filter(m=>!m.adminScope||m.adminScope.includes(user.adminScope))
    :modules;
  const currentModule=visibleModules.find(m=>m.k===A.pg);
  const sections=Array.from(new Set(visibleModules.map(m=>m.section)));

  /* Stats block for sidebar top */
  const empStats=user?.role==="employer"&&company?(()=>{
    const jobs=A.jobs.filter(j=>j.e===company.id);
    const apps=A.applications.filter(a=>jobs.some(j=>j.id===a.job));
    return {jobs:jobs.filter(j=>j.status==="live").length,apps:apps.length,plan:company.plan||"Free"};
  })():null;

  const admStats=user?.role==="admin"?(()=>{
    return {users:A.people.length,employers:A.employers.length,jobs:A.jobs.filter(j=>j.status==="live").length};
  })():null;

  const sidebar=<div className={`w-64 bg-ink text-white flex flex-col border-r border-white/8 h-screen ${mob?"fixed":"sticky"} top-0 left-0 ${mob?"z-900":"z-10"} transition-transform duration-300 ${navOpen?"translate-x-0":"-translate-x-full"} shrink-0`}>

    {/* Brand */}
    <div className="py-5 px-6 border-b border-white/8">
      <button onClick={()=>A.go("home")} className="flex items-center gap-2.5 bg-transparent border-0 text-white cursor-pointer p-0">
        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/35 flex items-center justify-center"><I n="sparkle" s={16} c="#6AACFF"/></div>
        <div><div className="text-sm font-bold tracking-tight">NorthHire</div>
          <div className="text-xs text-accent font-semibold mt-px">{brandKind}</div></div>
      </button>
    </div>

    {/* Profile + stats block */}
    <div className="py-4 px-5 border-b border-white/8">
      <div className="flex gap-3 items-center mb-3.5">
        {user?.role==="employer"
          ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
          : <SmartPortrait seed={user?.seed??0} size={40} radius={11}/>}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap">
            {user?.role==="employer"?company?.name:user?.name}</div>
          <div className="text-xs text-white/55 mt-px">
            {user?.role==="employer"?(company?.verified?t("dashShell.verifiedEmployer"):t("dashShell.awaitingVerification")):t("account.administrator")}</div>
        </div>
      </div>
      {empStats&&<div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg py-2.5 px-3">
          <div className="text-base font-bold text-white tracking-tight leading-none">{empStats.jobs}</div>
          <div className="text-xs text-white/60 mt-1">{t("dashShell.liveJobs")}</div></div>
        <div className="bg-white/5 rounded-lg py-2.5 px-3">
          <div className="text-base font-bold text-white tracking-tight leading-none">{empStats.apps}</div>
          <div className="text-xs text-white/60 mt-1">{t("dashShell.applicants")}</div></div>
      </div>}
      {admStats&&<div className="grid grid-cols-3 gap-1.5">
        {[[t("dashShell.statUsers"),admStats.users],[t("dashShell.statCos"),admStats.employers],[t("dashShell.statJobs"),admStats.jobs]].map(([l,v])=>
          <div key={l} className="bg-white/5 rounded-lg py-2.5 px-2 text-center">
            <div className="text-sm font-bold text-white tracking-tight leading-none">{v}</div>
            <div className="text-xs text-white/60 mt-1">{l}</div></div>)}
      </div>}
      {empStats&&<button onClick={()=>A.go("empBilling")} className="mt-2.5 w-full flex justify-between items-center bg-accent/12 border border-accent/25 rounded-lg py-2 px-3 cursor-pointer text-accent">
        <span className="text-xs font-semibold">{t("dashShell.currentPlan")}</span>
        <span className="text-xs font-bold">{empStats.plan}</span></button>}
    </div>

    <nav ref={navScrollRef} className="flex-1 overflow-y-auto py-2.5 px-2">
      {sections.map(sec=>{const items=visibleModules.filter(m=>m.section===sec);
        return <div key={sec} className="mb-2.5">
          <div className="text-xs font-bold text-white/35 tracking-widest uppercase pt-2 px-3 pb-1.5">{t(SECTION_LABELS[sec])}</div>
          {items.map(m=>{const active=A.pg===m.k;
            const locked=m.feature&&A.company&&!A.can(m.feature);
            const requiredPlan=locked?A.planRequires(m.feature):null;
            const moduleLabel=t(m.label);
            /* Build the "which plans have this" phrase */
            const planPhrase=requiredPlan==="Enterprise"?t("dashShell.planPhraseEnterprise"):t("dashShell.planPhraseGrowthEnterprise");
            return <div key={m.k} className="relative"
              onMouseEnter={locked?e=>{const r=e.currentTarget.getBoundingClientRect();
                setLockHover({key:m.k,top:r.top+r.height/2,left:r.right+12});}:undefined}
              onMouseLeave={locked?()=>setLockHover(h=>h?.key===m.k?null:h):undefined}>
              <button data-nav-key={m.k} onClick={()=>{
                if(locked){setUpgradeModal({feature:m.feature,requiredPlan,label:moduleLabel,icon:m.icon}); return;}
                if(m.section==="hrsuite"){if(typeof window!=="undefined")window.open("#hr","_blank"); return;}
                A.go(m.k); if(mob)setNavOpen(false);
              }}
              className={`w-full flex gap-3 items-center py-2.5 px-3.5 border-0 cursor-pointer text-left rounded-xl my-px text-sm transition duration-150
               ${active?"bg-accent/15 text-accent font-semibold":locked?"text-white/40 font-medium":"text-white/75 font-medium hover:bg-white/5"}`}>
              <I n={m.icon} s={16.5}/>
              <span className="flex-1">{moduleLabel}</span>
              {locked&&<I n="lock" s={13} c="rgba(245,165,36,.85)"/>}
              </button>
              <Tooltip show={locked&&lockHover?.key===m.k} top={lockHover?.top} left={lockHover?.left}>
                <div className="flex gap-1.5 items-center mb-1.5">
                  <I n="lock" s={13} c="#F5A524"/>
                  <span className="text-xs font-bold text-amber tracking-wide uppercase">{t("dashShell.lockedTag")}</span>
                </div>
                <div className="text-white/90">{t("dashShell.onlyAvailableOn",{plans:planPhrase})}</div>
                <div className="mt-1.5 text-xs text-white/55">{t("dashShell.clickToSeeUpgrade")}</div>
              </Tooltip>
            </div>;})}
        </div>;})}
    </nav>
    {upgradeModal&&<UpgradePromptModal payload={upgradeModal} onClose={()=>setUpgradeModal(null)}/>}

    <div className="p-3 border-t border-white/8">
      <button onClick={()=>{A.logout(); A.go("home");}} className="w-full flex gap-3 items-center py-2.5 px-3.5 bg-transparent border-0 cursor-pointer text-left rounded-xl text-white/75 text-sm font-medium transition duration-150 hover:bg-white/5">
        <I n="logout" s={16.5}/>{t("common.signOut")}</button>
    </div>
  </div>;

  const topbar=<div className={`bg-white border-b border-line flex gap-3 items-center sticky top-0 z-20 ${mob?"py-2.5 px-3.5":"py-3 px-6"}`}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} aria-label={t("dashShell.menuAria")} className="bg-transparent border-0 cursor-pointer p-1.5 text-text flex"><I n="menu" s={22}/></button>}
    {!mob&&A.history?.length>0&&<button onClick={A.back} aria-label={t("nav.back")} className="bg-transparent border border-line h-9 pr-3 pl-2 rounded-lg cursor-pointer flex items-center gap-1 text-text-2 text-sm font-medium transition duration-150 hover:bg-bg hover:text-text">
      <I n="chevL" s={16} w={2}/>{t("nav.back")}</button>}
    <div className={`flex-1 min-w-0 ${mob?"text-center":"text-left"}`}>
      <div className="text-base font-bold text-text tracking-tight">{currentModule?t(currentModule.label):(A.pageTitle||(ROUTES[A.pg]?.titleKey&&t(ROUTES[A.pg].titleKey))||t("dashShell.dashboardFallback"))}</div>
    </div>
    <NotificationBell/>
    <div className="relative ml-2">
      <button onClick={()=>setAccountMenu(v=>!v)} aria-label={t("nav.accountAria")} aria-haspopup="menu" aria-expanded={accountMenu}
        className="bg-transparent border-0 p-0 cursor-pointer flex rounded-xl transition duration-200 hover:scale-105">
        {user?.role==="employer"
          ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={36} radius={10}/>
          : <SmartPortrait seed={user?.seed??0} size={36} radius={10}/>}
      </button>
      {accountMenu&&<>
        <div onClick={()=>setAccountMenu(false)} className="fixed inset-0 z-490"/>
        <div className="absolute top-11 right-0 w-64 bg-white border border-line rounded-2xl shadow-md z-500 overflow-hidden" style={{animation:"pop .16s ease"}}>
          <div className="py-3.5 px-4 border-b border-line-soft flex gap-3 items-center">
            {user?.role==="employer"
              ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
              : <SmartPortrait seed={user?.seed??0} size={40} radius={11}/>}
            <div className="min-w-0">
              <div className="text-sm font-bold text-text overflow-hidden text-ellipsis whitespace-nowrap">
                {user?.role==="employer"?company?.name:user?.name}</div>
              <div className="text-xs text-text-3">{user?.role==="employer"?t("dashShell.employerLabel"):t("account.administrator")}</div></div></div>
          <div className="p-1.5">
            {(user?.role==="employer"
              ?[["empHome","dashShell.modEmpHome","home"],["empPost","dashShell.modEmpPost","plus"],["empPipeline","dashShell.modEmpPipeline","users"],["empCompany","dashShell.modEmpCompany","building"],["empTeam","dashShell.modEmpTeam","users"],["empBilling","dashShell.billingShort","wallet"],["settings","account.settings","gear"]]
              :[["admHome","account.overview","home"],["admSettings","account.platformSettings","gear"],["admLog","account.activityLog","file"],["admStats","account.statistics","trend"]]
                  .filter(([p])=>visibleModules.some(m=>m.k===p)||p==="admHome"||p==="admLog"||p==="admStats")
            ).map(([p,lk,ic])=>
              <button key={p} onClick={()=>{A.go(p);setAccountMenu(false);}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-text rounded-xl text-left hover:bg-bg">
                <I n={ic} s={17} c={C.text2}/>{t(lk)}</button>)}
            <div className="h-px bg-line-soft my-1.5 mx-1"/>
            <button onClick={()=>{A.logout();setAccountMenu(false);A.go("home");}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-red rounded-xl text-left hover:bg-red-bg">
              <I n="logout" s={17}/>{t("common.signOut")}</button></div></div></>}
    </div>
  </div>;

  return <div className="flex bg-bg min-h-screen">
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} className="fixed inset-0 bg-black/40 z-800"/>}
    {sidebar}
    <div className="flex-1 min-w-0 flex flex-col">
      {topbar}
      <main data-scroll-region className="flex-1 w-full max-w-wide mx-auto">{children}</main>
    </div>
    <DockedChat/>
  </div>;
}

export function EmpShell({children}){const {t}=useTranslation();return <DashShell modules={EMP_MODULES} brandKind={t("dashShell.employerConsole")}>{children}</DashShell>;}
export function AdmShell({children}){const {t}=useTranslation();return <DashShell modules={ADM_MODULES} brandKind={t("dashShell.adminConsole")}>{children}</DashShell>;}
