import { useState, useEffect, useMemo, useRef } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { SmartPortrait, Tag, Input, Card, Btn } from "../design/primitives.jsx";
import { HR_COMPANY_SETTINGS_DEFAULT, HR_MODULES } from "../store/seed/hrCompanySettings.js";
import { ROUTES } from "../routes.js";
import { useStickyNavScroll } from "../helpers/scrollRegion.js";
import { matchesQuery } from "../helpers/utils.js";
import { useTranslation } from "../i18n/i18n.jsx";

/* HR_MODULES/HR_ROLES in store/seed/hrCompanySettings.js carry English labels used by other,
   already-partly-translated pages (src/pages/hr/suite.jsx) - rather than change that shared
   constant (and risk regressing a consumer outside this file's scope), this shell translates its
   own display of them through local key maps, keyed by the same canonical .k/.module ids. */
const HR_MODULE_LABEL_KEY={hrDashboard:"account.dashboard",hrPeople:"tabs.people",hrProfile:"hrShell.myProfile",
  hrAttendance:"dashShell.modHrAttendance",hrLeave:"dashShell.modHrLeave",hrExpenses:"dashShell.modHrExpenses",
  hrTasks:"hrShell.tasks",hrCalendar:"hrShell.calendar",hrChat:"hrShell.chat",hrTrainings:"nav.trainings",
  hrBadges:"hrShell.badges",hrHiring:"hrShell.hiring",hrInvoices:"hrShell.invoices",hrPayroll:"dashShell.modHrPayroll",
  hrReports:"dashShell.modHrReports",hrSettings:"account.settings",hrIntegrations:"hrShell.integrations",
  hrPolicies:"hrShell.policies",hrRoster:"hrShell.roster",hrPerfReviews:"hrShell.perfReviews"};
const HR_ROLE_LABEL_KEY={owner:"hrShell.roleOwner",admin:"hrShell.roleAdmin",hr:"hrShell.roleHr",
  finance:"hrShell.roleFinance",employee:"hrShell.roleEmployee"};

/* H2 - role-scoped nav priority. HR_MODULES is filtered by canAccessModule already (server-side
   modulesForRole is the source of truth for WHICH modules a role can reach); this only reorders
   the ones a role can already see so each role's own priorities lead the list, per
   docs/PERMISSIONS.md - e.g. Linda (HR) sees Attendance/Leave/Tasks near the top, Isaac (Finance)
   sees Payroll/Invoices near the top, instead of everyone getting the same owner-centric order. */
const HR_NAV_PRIORITY={
  owner:["hrDashboard","hrPeople","hrAttendance","hrLeave","hrTrainings","hrPerfReviews","hrPayroll","hrInvoices","hrReports","hrSettings","hrIntegrations"],
  admin:["hrDashboard","hrPeople","hrAttendance","hrLeave","hrTasks","hrCalendar","hrTrainings","hrPerfReviews","hrChat","hrSettings","hrRoster"],
  hr:["hrDashboard","hrPeople","hrAttendance","hrLeave","hrTasks","hrCalendar","hrTrainings","hrPerfReviews","hrChat","hrHiring"],
  finance:["hrDashboard","hrPayroll","hrInvoices","hrExpenses","hrReports","hrPeople"],
  employee:["hrDashboard","hrProfile","hrAttendance","hrLeave","hrTasks","hrCalendar","hrTrainings","hrPerfReviews","hrChat","hrPeople"],
};
function orderModulesForRole(modules,role){
  const order=HR_NAV_PRIORITY[role]||[];
  return [...modules].sort((a,b)=>{
    const ia=order.indexOf(a.k),ib=order.indexOf(b.k);
    if(ia===-1&&ib===-1)return 0;
    if(ia===-1)return 1; if(ib===-1)return -1;
    return ia-ib;
  });
}

/* Org-wide search - previously only per-module search boxes existed (directory, tasks), so
   finding "that one leave request" or "the invoice for X" meant guessing which module to open
   first. Doesn't deep-link to the specific row (no module here has a per-item detail route to
   land on), but it does the real job of this finding: telling you which module has it. */
function HrGlobalSearch(){
  const A=use(); const {t}=useTranslation();
  const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const boxRef=useRef(null);
  useEffect(()=>{
    const onDocClick=e=>{if(boxRef.current&&!boxRef.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",onDocClick);
    return ()=>document.removeEventListener("mousedown",onDocClick);
  },[]);
  const empName=id=>A.hrEmployees.find(e=>e.id===id)?.name||t("hrShell.unknownPerson");
  const results=useMemo(()=>{
    const query=q.trim(); if(!query)return null;
    return {
      people:A.hrEmployees.filter(e=>matchesQuery(query,e.name,e.title||"",e.email||"")).slice(0,4),
      tasks:A.hrTasks.filter(t=>matchesQuery(query,t.title)).slice(0,4),
      leave:A.hrLeave.filter(l=>matchesQuery(query,empName(l.employee),l.type)).slice(0,4),
      expenses:A.hrExpenses.filter(x=>matchesQuery(query,empName(x.employee),x.merchant,x.category)).slice(0,4),
      invoices:(A.hrInvoices||[]).filter(i=>matchesQuery(query,i.client||"",i.number||"")).slice(0,4),
    };
  },[q,A.hrEmployees,A.hrTasks,A.hrLeave,A.hrExpenses,A.hrInvoices]);
  const hasAny=results&&Object.values(results).some(arr=>arr.length>0);
  const go=k=>{A.go(k);setOpen(false);setQ("");};
  return <div ref={boxRef} className="relative flex-1 min-w-0" style={{maxWidth:320}}>
    <Input icon="search" placeholder={t("hrShell.searchPlaceholder")} value={q}
      onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}/>
    {open&&q.trim()&&<div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-line rounded-xl shadow-md z-500 max-h-100 overflow-y-auto" style={{minWidth:300}}>
      {!hasAny?<div className="py-4 px-4 text-sm text-text-3">{t("hrShell.noMatches")}</div>:<>
        {results.people.length>0&&<div className="py-2">
          <div className="text-xs font-semibold text-text-3 uppercase tracking-wide px-4 py-1">{t("hrShell.sectionPeople")}</div>
          {results.people.map(p=><button key={p.id} onClick={()=>go("hrPeople")}
            className="flex items-center gap-2.5 w-full py-2 px-4 bg-transparent border-0 cursor-pointer text-left hover:bg-bg">
            <SmartPortrait seed={p.seed} size={24} radius={6}/><span className="text-sm text-text">{p.name}</span>
            <span className="text-xs text-text-3 ml-auto">{p.title}</span></button>)}</div>}
        {results.tasks.length>0&&<div className="py-2 border-t border-line-soft">
          <div className="text-xs font-semibold text-text-3 uppercase tracking-wide px-4 py-1">{t("hrShell.sectionTasks")}</div>
          {results.tasks.map(ts=><button key={ts.id} onClick={()=>go("hrTasks")}
            className="block w-full py-2 px-4 bg-transparent border-0 cursor-pointer text-left text-sm text-text hover:bg-bg">{ts.title}</button>)}</div>}
        {results.leave.length>0&&<div className="py-2 border-t border-line-soft">
          <div className="text-xs font-semibold text-text-3 uppercase tracking-wide px-4 py-1">{t("hrShell.sectionLeave")}</div>
          {results.leave.map(l=><button key={l.id} onClick={()=>go("hrLeave")}
            className="block w-full py-2 px-4 bg-transparent border-0 cursor-pointer text-left text-sm text-text hover:bg-bg">{empName(l.employee)} • {l.type}</button>)}</div>}
        {results.expenses.length>0&&<div className="py-2 border-t border-line-soft">
          <div className="text-xs font-semibold text-text-3 uppercase tracking-wide px-4 py-1">{t("hrShell.sectionExpenses")}</div>
          {results.expenses.map(x=><button key={x.id} onClick={()=>go("hrExpenses")}
            className="block w-full py-2 px-4 bg-transparent border-0 cursor-pointer text-left text-sm text-text hover:bg-bg">{empName(x.employee)} • {x.merchant}</button>)}</div>}
        {results.invoices.length>0&&<div className="py-2 border-t border-line-soft">
          <div className="text-xs font-semibold text-text-3 uppercase tracking-wide px-4 py-1">{t("hrShell.sectionInvoices")}</div>
          {results.invoices.map(i=><button key={i.id} onClick={()=>go("hrInvoices")}
            className="block w-full py-2 px-4 bg-transparent border-0 cursor-pointer text-left text-sm text-text hover:bg-bg">{i.client} • {i.number}</button>)}</div>}
      </>}
    </div>}
  </div>;
}

/* H2 - visible "Permission denied" / "Disabled by admin" state, replacing the previous silent
   bounce-to-dashboard. Two of the charter's 6 states; distinct copy for each so a role doesn't
   read "ask your admin" when the real answer is "this isn't for your role at all". */
function _HrModuleDenied({reason,onBack}){
  const {t}=useTranslation();
  const denied=reason==="role";
  return <Card pad={32} style={{borderRadius:16,textAlign:"center",maxWidth:440,margin:"48px auto 0"}}>
    <div className="w-14 h-14 rounded-2xl bg-bg text-text-3 flex items-center justify-center mx-auto mb-4">
      <I n={denied?"lock":"shield"} s={26}/></div>
    <div className="text-lg font-bold text-text tracking-tight mb-1.5">
      {denied?t("hrShell.deniedTitle"):t("hrShell.disabledTitle")}</div>
    <p className="text-sm text-text-2 leading-relaxed mb-5">
      {denied?t("hrShell.deniedBody"):t("hrShell.disabledBody")}</p>
    <Btn kind="primary" onClick={onBack}>{t("hrShell.deniedBackBtn")}</Btn>
  </Card>;
}

export function HrShell({children}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  /* Left nav keeps its scroll position + auto-scrolls the active item into view. Must come
     after A is defined. */
  const navScrollRef=useStickyNavScroll("hr",A.pg);
  const [navOpen,setNavOpen]=useState(!mob);
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const settings=A.hrCompanySettings[company?.id]||HR_COMPANY_SETTINGS_DEFAULT;

  useEffect(()=>{setNavOpen(!mob);},[mob]);

  const currentModuleEntry=HR_MODULES.find(m=>m.k===A.pg);
  /* H2 - one of the charter's 6 states: "Permission denied" (role can't reach this module) is
     distinct from "Disabled by admin" (company turned the module off for everyone). Sidebar
     already hides modules a role can't reach, but the URL/route to a page it maps to was never
     actually gated - typing/pasting the path (or having it in history) rendered the full page
     regardless of role, or silently bounced to the dashboard with no explanation (the same
     charter anti-pattern this audit targets, just moved client-side instead of a raw 403). Now
     it renders an actual denied state instead of either. */
  const moduleDeniedReason=emp&&currentModuleEntry
    ?(!A.canAccessModule(emp.role,currentModuleEntry.module)?"role"
      :settings.modules[currentModuleEntry.module]===false?"disabled":null)
    :null;
  const moduleBlocked=!!moduleDeniedReason;

  /* Not signed into HR — route to HR login instead of crashing, unless a bridge login from
     the employer console is in flight, or the initial /hr/me check hasn't resolved yet, in
     which case just wait. Without the hrAuthChecked gate, refreshing on any HR Suite page
     redirected to hrLogin every time - emp/company are null on the very first render
     regardless of whether the session cookie is actually still valid. */
  if(!emp||!company){
    if(A.hrBridging||!A.hrAuthChecked)return null;
    if(typeof window!=="undefined")setTimeout(()=>A.go("hrLogin"),0);
    return null;
  }

  const visibleModules=orderModulesForRole(HR_MODULES.filter(m=>
    A.canAccessModule(emp.role,m.module) && settings.modules[m.module]!==false
  ),emp.role);

  const sidebar=<div className={`w-64 bg-ink text-white flex flex-col border-r border-white/8 h-screen ${mob?"fixed":"sticky"} top-0 left-0 ${mob?"z-900":"z-10"} transition-transform duration-300 ${navOpen?"translate-x-0":"-translate-x-full"}`}>
    <div className="py-5 px-6 border-b border-white/8">
      <button onClick={()=>A.go("home")} className="flex items-center gap-2.5 bg-transparent border-0 text-white cursor-pointer p-0">
        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/35 flex items-center justify-center"><I n="sparkle" s={16} c="#6AACFF"/></div>
        <div><div className="text-sm font-bold tracking-tight">NorthHire</div>
          <div className="text-xs text-accent font-semibold mt-px">{t("hrShell.hrSuiteTag")}</div></div>
      </button>
    </div>
    <div className="py-4 px-3.5 border-b border-white/8">
      <div className="flex gap-2.5 items-center p-2">
        <div className="w-9 h-9 rounded-lg text-white font-bold text-sm shrink-0 flex items-center justify-center" style={{background:company?.a||C.brand}}>
          {company?.name?.charAt(0)||"P"}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap">{company?.name}</div>
          <div className="text-xs text-white/55 mt-px">{t("hrShell.enterprisePlan")}</div>
        </div></div>
    </div>
    <nav ref={navScrollRef} className="flex-1 overflow-y-auto py-2.5 px-2">
      {visibleModules.map(m=>{const active=A.pg===m.k;
        return <button key={m.k} data-nav-key={m.k} onClick={()=>{A.go(m.k); if(mob)setNavOpen(false);}}
          className={`w-full flex gap-3 items-center py-2.5 px-3.5 border-0 cursor-pointer text-left rounded-xl my-px text-sm transition duration-150
           ${active?"bg-accent/15 text-accent font-semibold":"text-white/75 font-medium hover:bg-white/5"}`}>
          <I n={m.icon} s={17}/>{t(HR_MODULE_LABEL_KEY[m.k]||m.label)}</button>;})}
    </nav>
    <div className="p-3.5 border-t border-white/8">
      <button onClick={()=>{A.hrLogout(); A.go("hrLogin");}} className="w-full flex gap-3 items-center py-2.5 px-3.5 bg-transparent border-0 cursor-pointer text-left rounded-xl text-white/75 text-sm font-medium hover:bg-white/5">
        <I n="logout" s={17}/>{t("common.signOut")}</button>
    </div>
  </div>;

  /* H6 - "Viewing as Finance" indicator (FI-01): a small badge when the CURRENT VIEW exposes
     financial data (payroll / invoices / expenses). Scoped to Owner and Finance viewers only -
     those are the two roles who can actually see the money-wide view (all salaries, every
     invoice, every claim) rather than just their own line, so this is exactly where "am I looking
     at this the way Finance does, or is this my own stuff" confusion happens. Admin/HR never reach
     these routes (server + nav already gate that - see docs/PERMISSIONS.md) and an employee on
     their own Payroll page is looking at their own payslip, not the Finance-wide view, so the badge
     would be actively misleading there. */
  const viewingFinanceData=["owner","finance"].includes(emp.role)&&["hrPayroll","hrInvoices","hrExpenses"].includes(A.pg);

  const topbar=<div className={`bg-white border-b border-line flex gap-3 items-center sticky top-0 z-20 ${mob?"py-3 px-4":"py-3.5 px-7"}`}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} aria-label={t("dashShell.menuAria")} className="bg-transparent border-0 cursor-pointer p-1.5 text-text flex">
      <I n="menu" s={22}/></button>}
    {!mob&&<div className="min-w-0 shrink-0">
      <div className="flex items-center gap-2">
        <div className="text-base font-bold text-text tracking-tight">
          {(()=>{const m=HR_MODULES.find(m=>m.k===A.pg);
            return m?t(HR_MODULE_LABEL_KEY[m.k]||m.label):(A.pageTitle||(ROUTES[A.pg]?.titleKey&&t(ROUTES[A.pg].titleKey))||t("hrShell.hrSuiteTag"));})()}</div>
        {viewingFinanceData&&<Tag tone="violet" sm icon="wallet">{t("hrShell.viewingAsFinance")}</Tag>}
      </div>
      <div className="text-xs text-text-3 mt-0.5">{company?.name} • {emp?.title}</div>
    </div>}
    {mob&&viewingFinanceData&&<Tag tone="violet" sm icon="wallet">{t("hrShell.viewingAsFinance")}</Tag>}
    <HrGlobalSearch/>
    <button onClick={()=>A.go("hrProfile")} className="flex gap-2.5 items-center bg-bg border border-line rounded-full py-1.5 pr-3 pl-1.5 cursor-pointer shrink-0">
      <SmartPortrait seed={emp.seed} size={32}/>
      {!mob&&<span className="text-sm font-semibold text-text">{emp.name.split(" ")[0]}</span>}
      <Tag tone={emp.role==="owner"?"warn":emp.role==="admin"?"brand":emp.role==="hr"?"ok":emp.role==="finance"?"violet":"neutral"} sm>{t(HR_ROLE_LABEL_KEY[emp.role]||emp.role)}</Tag>
    </button>
  </div>;

  return <div className="flex bg-bg min-h-screen">
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} className="fixed inset-0 bg-black/40 z-800"/>}
    {sidebar}
    <div className="flex-1 min-w-0 flex flex-col">
      {topbar}
      <main data-scroll-region className={`w-full max-w-wide mx-auto ${mob?"pt-5 px-4 pb-10":"pt-8 px-8 pb-15"}`}>
        {moduleBlocked?<_HrModuleDenied reason={moduleDeniedReason} onBack={()=>A.go("hrDashboard")}/>:children}
      </main>
    </div>
  </div>;
}
