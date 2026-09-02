import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { SmartPortrait, Tag } from "../design/primitives.jsx";
import { HR_COMPANY_SETTINGS_DEFAULT, HR_MODULES } from "../store/seed/hrCompanySettings.js";
import { ROUTES } from "../routes.js";

export function HrShell({children}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [navOpen,setNavOpen]=useState(!mob);
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const settings=A.hrCompanySettings[company?.id]||HR_COMPANY_SETTINGS_DEFAULT;

  useEffect(()=>{setNavOpen(!mob);},[mob]);

  /* Not signed into HR — route to HR login instead of crashing */
  if(!emp||!company){
    if(typeof window!=="undefined")setTimeout(()=>A.go("hrLogin"),0);
    return null;
  }

  const visibleModules=HR_MODULES.filter(m=>
    A.canAccessModule(emp.role,m.module) && settings.modules[m.module]!==false
  );

  const sidebar=<div className={`w-64 bg-ink text-white flex flex-col border-r border-white/8 h-screen ${mob?"fixed":"sticky"} top-0 left-0 ${mob?"z-900":"z-10"} transition-transform duration-300 ${navOpen?"translate-x-0":"-translate-x-full"}`}>
    <div className="py-5 px-6 border-b border-white/8">
      <button onClick={()=>A.go("home")} className="flex items-center gap-2.5 bg-transparent border-0 text-white cursor-pointer p-0">
        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/35 flex items-center justify-center"><I n="hex" s={16} c="#6AACFF"/></div>
        <div><div className="text-sm font-bold tracking-tight">NorthHire</div>
          <div className="text-xs text-accent font-semibold mt-px">HR Suite</div></div>
      </button>
    </div>
    <div className="py-4 px-3.5 border-b border-white/8">
      <div className="flex gap-2.5 items-center p-2">
        <div className="w-9 h-9 rounded-lg text-white font-bold text-sm shrink-0 flex items-center justify-center" style={{background:company?.a||C.brand}}>
          {company?.name?.charAt(0)||"P"}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap">{company?.name}</div>
          <div className="text-xs text-white/55 mt-px">Enterprise plan</div>
        </div></div>
    </div>
    <nav className="flex-1 overflow-y-auto py-2.5 px-2">
      {visibleModules.map(m=>{const active=A.pg===m.k;
        return <button key={m.k} onClick={()=>{A.go(m.k); if(mob)setNavOpen(false);}}
          className={`w-full flex gap-3 items-center py-2.5 px-3.5 border-0 cursor-pointer text-left rounded-xl my-px text-sm transition duration-150
           ${active?"bg-accent/15 text-accent font-semibold":"text-white/75 font-medium hover:bg-white/5"}`}>
          <I n={m.icon} s={17}/>{m.label}</button>;})}
    </nav>
    <div className="p-3.5 border-t border-white/8">
      <button onClick={()=>{A.hrLogout(); A.go("hrLogin");}} className="w-full flex gap-3 items-center py-2.5 px-3.5 bg-transparent border-0 cursor-pointer text-left rounded-xl text-white/75 text-sm font-medium hover:bg-white/5">
        <I n="logout" s={17}/>Sign out</button>
    </div>
  </div>;

  const topbar=<div className={`bg-white border-b border-line flex gap-3 items-center sticky top-0 z-20 ${mob?"py-3 px-4":"py-3.5 px-7"}`}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} className="bg-transparent border-0 cursor-pointer p-1.5 text-text flex">
      <I n="menu" s={22}/></button>}
    <div className="flex-1 min-w-0">
      <div className="text-base font-bold text-text tracking-tight">
        {HR_MODULES.find(m=>m.k===A.pg)?.label||A.pageTitle||ROUTES[A.pg]?.title||"HR Suite"}</div>
      {!mob&&<div className="text-xs text-text-3 mt-0.5">{company?.name} • {emp?.title}</div>}
    </div>
    <button onClick={()=>A.go("hrProfile")} className="flex gap-2.5 items-center bg-bg border border-line rounded-full py-1.5 pr-3 pl-1.5 cursor-pointer">
      <SmartPortrait seed={emp.seed} size={32}/>
      {!mob&&<span className="text-sm font-semibold text-text">{emp.name.split(" ")[0]}</span>}
      <Tag tone={emp.role==="owner"?"warn":emp.role==="admin"?"brand":emp.role==="hr"?"ok":emp.role==="finance"?"violet":"neutral"} sm>{emp.role}</Tag>
    </button>
  </div>;

  return <div className="flex bg-bg min-h-screen">
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} className="fixed inset-0 bg-black/40 z-800"/>}
    {sidebar}
    <div className="flex-1 min-w-0 flex flex-col">
      {topbar}
      <main className={mob?"pt-5 px-4 pb-10":"pt-8 px-8 pb-15"}>{children}</main>
    </div>
  </div>;
}
