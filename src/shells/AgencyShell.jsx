import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { SmartPortrait } from "../design/primitives.jsx";
import { AGENCY_MODULES, SEED_AGENCY_LICENSE } from "../store/seed/agency.js";
import { ROUTES } from "../routes.js";

export function AgencyShell({children}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [navOpen,setNavOpen]=useState(!mob);
  const staff=A.agencyCurrentStaff();
  useEffect(()=>{setNavOpen(!mob);},[mob]);

  if(!staff){
    useEffect(()=>{A.go("agencyLogin");},[]);
    return null;
  }

  const kpi=A.agencyKPIs();
  const badges={openOrders:kpi.openOrdersCount,
    submittedTimesheets:kpi.pendingTimesheets,
    overdueInvoices:A.staffingInvoices.filter(i=>i.status==="overdue").length};

  const sections=[
    {k:"main",label:"Operations"},
    {k:"ops",label:"Payroll & Billing"},
    {k:"insights",label:"Insights"},
  ];

  const sidebar=<aside style={{width:260,background:C.ink,color:"#fff",display:"flex",flexDirection:"column",
    borderRight:"1px solid rgba(255,255,255,.08)",minHeight:"100vh",position:mob?"fixed":"sticky",top:0,left:0,
    zIndex:mob?900:10,transform:navOpen?"translateX(0)":"translateX(-100%)",transition:"transform .28s ease",flexShrink:0}}>
    <div style={{padding:"20px 22px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <button onClick={()=>A.go("home")} style={{display:"flex",alignItems:"center",gap:10,background:"none",
        border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",padding:0}}>
        <div style={{width:32,height:32,borderRadius:9,background:"rgba(245,165,36,.18)",border:"1px solid rgba(245,165,36,.4)",
          display:"flex",alignItems:"center",justifyContent:"center"}}><I n="hex" s={16} c="#F5A524"/></div>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:14,fontWeight:720,letterSpacing:"-.02em"}}>NorthHire</div>
          <div style={{fontSize:10.5,color:"#F5A524",fontWeight:640,marginTop:1,letterSpacing:".04em"}}>STAFFING</div>
        </div>
      </button>
    </div>
    <div style={{padding:"14px 14px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <div style={{display:"flex",gap:10,alignItems:"center",padding:"6px 6px"}}>
        <SmartPortrait seed={staff.seed} size={34} radius={9}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:660,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{staff.name}</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,.55)",marginTop:1,textTransform:"capitalize"}}>{staff.role} · {staff.title.split(" ").slice(0,2).join(" ")}</div>
        </div>
      </div>
    </div>
    <nav style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
      {sections.map(sec=>{const items=AGENCY_MODULES.filter(m=>m.section===sec.k);
        return <div key={sec.k} style={{marginBottom:6}}>
          <div style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".08em",textTransform:"uppercase",padding:"12px 14px 6px"}}>{sec.label}</div>
          {items.map(m=>{const active=A.pg===m.k; const badge=m.badge?badges[m.badge]:0;
            return <button key={m.k} onClick={()=>{A.go(m.k); if(mob)setNavOpen(false);}}
              style={{width:"100%",display:"flex",gap:12,alignItems:"center",padding:"9px 13px",
                background:active?"rgba(245,165,36,.15)":"none",border:"none",cursor:"pointer",fontFamily:"inherit",
                textAlign:"left",borderRadius:9,margin:"1px 0",color:active?"#F5A524":"rgba(255,255,255,.75)",
                fontSize:13.5,fontWeight:active?640:500,transition:"all .15s"}}
              onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
              onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
              <I n={m.icon} s={16.5}/>
              <span style={{flex:1}}>{m.label}</span>
              {badge>0&&<span style={{background:active?C.brand:"#F5A524",color:"#fff",borderRadius:99,fontSize:10.5,fontWeight:700,padding:"1px 7px",minWidth:16,textAlign:"center"}}>{badge}</span>}
            </button>;})}
        </div>;})}
    </nav>
    <div style={{padding:12,borderTop:"1px solid rgba(255,255,255,.08)"}}>
      <div style={{padding:"8px 12px",fontSize:11,color:"rgba(255,255,255,.4)",lineHeight:1.5,marginBottom:6}}>
        <div style={{fontWeight:640,color:"rgba(255,255,255,.55)"}}>License</div>
        <div style={{fontFamily:"ui-monospace,monospace",marginTop:2}}>{SEED_AGENCY_LICENSE}</div>
      </div>
      <button onClick={()=>{A.agencyLogout(); A.go("home");}} style={{width:"100%",display:"flex",gap:11,alignItems:"center",padding:"9px 13px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",borderRadius:9,color:"rgba(255,255,255,.75)",fontSize:13,fontWeight:520,transition:"all .15s"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <I n="logout" s={16}/>Sign out</button>
    </div>
  </aside>;

  const currentModule=AGENCY_MODULES.find(m=>m.k===A.pg);
  const topbar=<div style={{background:"#fff",borderBottom:`1px solid ${C.line}`,padding:mob?"10px 14px":"14px 28px",
    display:"flex",gap:10,alignItems:"center",position:"sticky",top:0,zIndex:20}}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} aria-label="Menu" style={{background:"none",border:"none",cursor:"pointer",padding:6,color:C.text,display:"flex"}}>
      <I n="menu" s={22}/></button>}
    {A.history?.length>0&&A.pg!=="agencyDashboard"&&<button onClick={A.back} aria-label="Back" style={{background:"transparent",border:`1px solid ${C.line}`,height:34,padding:mob?"0 8px":"0 11px 0 8px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:C.text2,fontFamily:"inherit",fontSize:13,fontWeight:520,transition:"all .16s"}}
      onMouseEnter={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.color=C.text;}}
      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}>
      <I n="chevL" s={16} w={2}/>{!mob&&"Back"}</button>}
    <div style={{flex:1,minWidth:0,textAlign:mob?"center":"left"}}>
      <div style={{fontSize:mob?15:16.5,fontWeight:670,color:C.text,letterSpacing:"-.02em"}}>
        {currentModule?.label||A.pageTitle||ROUTES[A.pg]?.title||"Agency console"}</div>
      {!mob&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{A.STAFFING_AGENCY.name} · {staff.title}</div>}
    </div>
    <button onClick={()=>A.go("agencyDashboard")} style={{display:"flex",gap:10,alignItems:"center",background:C.bg,border:`1px solid ${C.line}`,
      borderRadius:99,padding:"5px 12px 5px 5px",cursor:"pointer",fontFamily:"inherit"}}>
      <SmartPortrait seed={staff.seed} size={30} radius={99}/>
      {!mob&&<span style={{fontSize:13,fontWeight:640,color:C.text}}>{staff.name.split(" ")[0]}</span>}
    </button>
  </div>;

  return <div style={{display:"flex",background:C.bg,minHeight:"100vh"}}>
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:800}}/>}
    {sidebar}
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
      {topbar}
      <main style={{flex:1,minWidth:0,overflow:"auto",padding:mob?"18px 16px 40px":"28px 32px 60px"}}>{children}</main>
    </div>
  </div>;
}
