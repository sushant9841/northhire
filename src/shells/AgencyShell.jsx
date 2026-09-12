import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { SmartPortrait } from "../design/primitives.jsx";
import { AGENCY_MODULES, SEED_AGENCY_LICENSE } from "../store/seed/agency.js";
import { ROUTES } from "../routes.js";
import { useStickyNavScroll } from "../helpers/scrollRegion.js";
import { useTranslation } from "../i18n/i18n.jsx";

/* AGENCY_MODULES labels are canonical English in store/seed/agency.js (a static module with no
   locale access) - translated here via a local key map, same pattern used for HrShell/DashShell. */
const AGENCY_MODULE_LABEL_KEY={agencyDashboard:"agencyShell.modDashboard",agencyJobOrders:"agencyShell.modJobOrders",
  agencyBench:"agencyShell.modBench",agencyAssignments:"agencyShell.modAssignments",agencyTimesheets:"agencyShell.modTimesheets",
  agencyPayroll:"agencyShell.modPayroll",agencyInvoicing:"agencyShell.modInvoicing",agencyPlacements:"agencyShell.modPlacements",
  agencyClients:"agencyShell.modClients",agencyWorkers:"agencyShell.modWorkers",agencyMargins:"agencyShell.modMargins",
  agencyCompliance:"agencyShell.modCompliance",agencyBranches:"agencyShell.modBranches"};

export function AgencyShell({children}){
  /* Left nav keeps its scroll position across navigations and remounts. */
  const navScrollRef=useStickyNavScroll("agency",A.pg);
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [navOpen,setNavOpen]=useState(!mob);
  const staff=A.agencyCurrentStaff();
  useEffect(()=>{setNavOpen(!mob);},[mob]);
  /* Wait for the initial /staffing/me check to actually resolve before redirecting - without
     the agencyAuthChecked gate, refreshing on any agency console page bounced to agencyLogin
     every time, since `staff` is null on the very first render regardless of whether the
     session is still valid. Called unconditionally (not inside the `if(!staff)` below) since
     conditionally calling a hook is a real bug - it was in the pre-existing code too - that
     surfaced as a real "Rendered fewer hooks than expected" crash once this effect actually
     had a dependency that changes across renders. */
  useEffect(()=>{if(!staff&&A.agencyAuthChecked)A.go("agencyLogin");},[staff,A.agencyAuthChecked]);

  if(!staff)return null;

  const kpi=A.agencyKPIs();
  const badges={openOrders:kpi.openOrdersCount,
    submittedTimesheets:kpi.pendingTimesheets,
    overdueInvoices:A.staffingInvoices.filter(i=>i.status==="overdue").length};

  const sections=[
    {k:"main",label:t("agencyShell.sectionOperations")},
    {k:"ops",label:t("agencyShell.sectionPayrollBilling")},
    {k:"insights",label:t("agencyShell.sectionInsights")},
  ];

  const sidebar=<aside className={`w-64 bg-ink text-white flex flex-col border-r border-white/8 min-h-screen ${mob?"fixed":"sticky"} top-0 left-0 ${mob?"z-900":"z-10"} transition-transform duration-300 ${navOpen?"translate-x-0":"-translate-x-full"} shrink-0`}>
    <div className="py-5 px-6 border-b border-white/8">
      <button onClick={()=>A.go("home")} className="flex items-center gap-2.5 bg-transparent border-0 text-white cursor-pointer p-0">
        <div className="w-8 h-8 rounded-lg bg-amber/18 border border-amber/40 flex items-center justify-center"><I n="sparkle" s={16} c="#F5A524"/></div>
        <div className="text-left">
          <div className="text-sm font-bold tracking-tight">NorthHire</div>
          <div className="text-xs text-amber font-semibold mt-px tracking-wider">STAFFING</div>
        </div>
      </button>
    </div>
    <div className="p-3.5 border-b border-white/8">
      <div className="flex gap-2.5 items-center p-1.5">
        <SmartPortrait seed={staff.seed} size={34} radius={9}/>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap">{staff.name}</div>
          {/* Full title with real ellipsis-on-overflow, not a hand-rolled two-word slice that
              broke on any title where the second token was punctuation - "Founder & Managing
              Director" was truncating to "Founder &" with the "&" hanging unfinished. */}
          <div className="text-xs text-white/55 mt-px capitalize overflow-hidden text-ellipsis whitespace-nowrap" title={`${staff.role} · ${staff.title}`}>{staff.role} · {staff.title}</div>
        </div>
      </div>
    </div>
    <nav ref={navScrollRef} className="flex-1 overflow-y-auto py-2.5 px-2">
      {sections.map(sec=>{const items=AGENCY_MODULES.filter(m=>m.section===sec.k);
        return <div key={sec.k} className="mb-1.5">
          <div className="text-xs font-bold text-white/40 tracking-widest uppercase pt-3 px-3.5 pb-1.5">{sec.label}</div>
          {items.map(m=>{const active=A.pg===m.k; const badge=m.badge?badges[m.badge]:0;
            return <button key={m.k} data-nav-key={m.k} onClick={()=>{A.go(m.k); if(mob)setNavOpen(false);}}
              className={`w-full flex gap-3 items-center py-2.5 px-3.5 border-0 cursor-pointer text-left rounded-xl my-px text-sm transition duration-150
               ${active?"bg-amber/15 text-amber font-semibold":"text-white/75 font-medium hover:bg-white/5"}`}>
              <I n={m.icon} s={16.5}/>
              <span className="flex-1">{t(AGENCY_MODULE_LABEL_KEY[m.k]||m.label)}</span>
              {badge>0&&<span className={`text-white rounded-full text-xs font-bold py-px px-2 min-w-4 text-center ${active?"bg-brand":"bg-amber"}`}>{badge}</span>}
            </button>;})}
        </div>;})}
    </nav>
    <div className="p-3 border-t border-white/8">
      <div className="py-2 px-3 text-xs text-white/40 leading-normal mb-1.5">
        <div className="font-semibold text-white/55">{t("agencyShell.licenseLabel")}</div>
        <div className="font-mono mt-0.5">{SEED_AGENCY_LICENSE}</div>
      </div>
      <button onClick={()=>{A.agencyLogout(); A.go("home");}} className="w-full flex gap-3 items-center py-2.5 px-3.5 bg-transparent border-0 cursor-pointer text-left rounded-xl text-white/75 text-sm font-medium transition duration-150 hover:bg-white/5">
        <I n="logout" s={16}/>{t("common.signOut")}</button>
    </div>
  </aside>;

  const currentModule=AGENCY_MODULES.find(m=>m.k===A.pg);
  const topbar=<div className={`bg-white border-b border-line flex gap-2.5 items-center sticky top-0 z-20 ${mob?"py-2.5 px-3.5":"py-3.5 px-7"}`}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} aria-label={t("dashShell.menuAria")} className="bg-transparent border-0 cursor-pointer p-1.5 text-text flex">
      <I n="menu" s={22}/></button>}
    {A.history?.length>0&&A.pg!=="agencyDashboard"&&<button onClick={A.back} aria-label={t("nav.back")} className={`bg-transparent border border-line h-9 rounded-lg cursor-pointer flex items-center gap-1 text-text-2 text-sm font-medium transition duration-150 hover:bg-bg hover:text-text ${mob?"px-2":"pr-3 pl-2"}`}>
      <I n="chevL" s={16} w={2}/>{!mob&&t("nav.back")}</button>}
    <div className={`flex-1 min-w-0 ${mob?"text-center":"text-left"}`}>
      <div className="text-base font-bold text-text tracking-tight">
        {currentModule?t(AGENCY_MODULE_LABEL_KEY[currentModule.k]||currentModule.label):(A.pageTitle||(ROUTES[A.pg]?.titleKey&&t(ROUTES[A.pg].titleKey))||t("agencyShell.agencyConsoleFallback"))}</div>
      {!mob&&<div className="text-xs text-text-3 mt-0.5">{A.STAFFING_AGENCY.name} · {staff.title}</div>}
    </div>
    <button onClick={()=>A.go("agencyDashboard")} className="flex gap-2.5 items-center bg-bg border border-line rounded-full py-1.5 pr-3 pl-1.5 cursor-pointer">
      <SmartPortrait seed={staff.seed} size={30} radius={99}/>
      {!mob&&<span className="text-sm font-semibold text-text">{staff.name.split(" ")[0]}</span>}
    </button>
  </div>;

  return <div className="flex bg-bg min-h-screen">
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} className="fixed inset-0 bg-black/40 z-800"/>}
    {sidebar}
    <div className="flex-1 min-w-0 flex flex-col">
      {topbar}
      <main data-scroll-region className={`flex-1 min-w-0 overflow-auto w-full max-w-wide mx-auto ${mob?"pt-5 px-4 pb-10":"pt-8 px-8 pb-15"}`}>{children}</main>
    </div>
  </div>;
}
