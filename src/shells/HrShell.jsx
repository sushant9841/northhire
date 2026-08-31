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

  const sidebar=<div style={{width:260,background:C.ink,color:"#fff",display:"flex",flexDirection:"column",
    borderRight:"1px solid rgba(255,255,255,.08)",height:"100vh",position:mob?"fixed":"sticky",top:0,left:0,
    zIndex:mob?900:10,transform:navOpen?"translateX(0)":`translateX(-100%)`,transition:"transform .28s ease"}}>
    <div style={{padding:"20px 22px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <button onClick={()=>A.go("home")} style={{display:"flex",alignItems:"center",gap:10,background:"none",
        border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",padding:0}}>
        <div style={{width:32,height:32,borderRadius:9,background:"rgba(106,172,255,.2)",border:"1px solid rgba(106,172,255,.35)",
          display:"flex",alignItems:"center",justifyContent:"center"}}><I n="hex" s={16} c="#6AACFF"/></div>
        <div><div style={{fontSize:14,fontWeight:720,letterSpacing:"-.02em"}}>NorthHire</div>
          <div style={{fontSize:11,color:"#6AACFF",fontWeight:600,marginTop:1}}>HR Suite</div></div>
      </button>
    </div>
    <div style={{padding:"16px 14px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <div style={{display:"flex",gap:10,alignItems:"center",padding:"8px 8px"}}>
        <div style={{width:36,height:36,borderRadius:9,background:company?.a||C.brand,color:"#fff",display:"flex",
          alignItems:"center",justifyContent:"center",fontWeight:730,fontSize:14,flexShrink:0}}>
          {company?.name?.charAt(0)||"P"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13.5,fontWeight:660,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{company?.name}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.55)",marginTop:1}}>Enterprise plan</div>
        </div></div>
    </div>
    <nav style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
      {visibleModules.map(m=>{const active=A.pg===m.k;
        return <button key={m.k} onClick={()=>{A.go(m.k); if(mob)setNavOpen(false);}} style={{width:"100%",display:"flex",gap:12,alignItems:"center",
          padding:"10px 14px",background:active?"rgba(106,172,255,.15)":"none",border:"none",cursor:"pointer",fontFamily:"inherit",
          textAlign:"left",borderRadius:9,margin:"1px 0",color:active?"#6AACFF":"rgba(255,255,255,.75)",
          fontSize:13.5,fontWeight:active?640:500,transition:"all .15s"}}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
          onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
          <I n={m.icon} s={17}/>{m.label}</button>;})}
    </nav>
    <div style={{padding:14,borderTop:"1px solid rgba(255,255,255,.08)"}}>
      <button onClick={()=>{A.hrLogout(); A.go("hrLogin");}} style={{width:"100%",display:"flex",gap:11,alignItems:"center",
        padding:"10px 14px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",
        borderRadius:9,color:"rgba(255,255,255,.75)",fontSize:13.5,fontWeight:520}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <I n="logout" s={17}/>Sign out</button>
    </div>
  </div>;

  const topbar=<div style={{background:"#fff",borderBottom:`1px solid ${C.line}`,padding:mob?"12px 16px":"14px 28px",
    display:"flex",gap:12,alignItems:"center",position:"sticky",top:0,zIndex:20}}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} style={{background:"none",border:"none",cursor:"pointer",padding:6,color:C.text,display:"flex"}}>
      <I n="menu" s={22}/></button>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:mob?15:16.5,fontWeight:670,color:C.text,letterSpacing:"-.02em"}}>
        {HR_MODULES.find(m=>m.k===A.pg)?.label||A.pageTitle||ROUTES[A.pg]?.title||"HR Suite"}</div>
      {!mob&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{company?.name} • {emp?.title}</div>}
    </div>
    <button onClick={()=>A.go("hrProfile")} style={{display:"flex",gap:10,alignItems:"center",background:C.bg,border:`1px solid ${C.line}`,
      borderRadius:99,padding:"5px 12px 5px 5px",cursor:"pointer",fontFamily:"inherit"}}>
      <SmartPortrait seed={emp.seed} size={32}/>
      {!mob&&<span style={{fontSize:13,fontWeight:640,color:C.text}}>{emp.name.split(" ")[0]}</span>}
      <Tag tone={emp.role==="owner"?"warn":emp.role==="admin"?"brand":emp.role==="hr"?"ok":emp.role==="finance"?"violet":"neutral"} sm>{emp.role}</Tag>
    </button>
  </div>;

  return <div style={{display:"flex",background:C.bg,minHeight:"100vh"}}>
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:800}}/>}
    {sidebar}
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
      {topbar}
      <main style={{flex:1,padding:mob?"18px 16px 40px":"28px 32px 60px"}}>{children}</main>
    </div>
  </div>;
}
