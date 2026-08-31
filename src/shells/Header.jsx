import { useState } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C, SH } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { Btn, SmartLogo, SmartPortrait } from "../design/primitives.jsx";
import { CATS } from "../store/seed/constants.js";
import { ROUTES, TABS_BY_ROLE } from "../routes.js";

export function Wordmark({light,size=20,onClick}){
  return <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:9,cursor:onClick?"pointer":"default",flexShrink:0}}>
    <div style={{width:size*1.5,height:size*1.5,borderRadius:size*0.42,background:C.brand,display:"flex",
      alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <svg width={size*0.86} height={size*0.86} viewBox="0 0 24 24" fill="none">
        <path d="M5 19V6.6a.5.5 0 0 1 .87-.34L18 18.1V5" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <span style={{fontWeight:740,fontSize:size,letterSpacing:"-.04em",color:light?"#fff":C.text}}>NorthHire</span></div>;
}

export function Header(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [menu,setMenu]=useState(false);
  const [browseOpen,setBrowseOpen]=useState(false);
  const r=ROUTES[A.pg]||ROUTES.home;
  const unread=A.notifications.filter(n=>!n.read&&(!n.for||n.for===A.user?.id||n.for===A.user?.role)).length;
  const isRoot=!!r.root;
  const showBackMob=mob&&!isRoot;
  const showBackDt=!mob&&!isRoot&&A.history?.length>0;
  const role=A.user?.role;
  /* Role-specific nav — hide "For employers" from seekers, show seeker-relevant links */
  const seekerLinks=[["search","Browse jobs","browse"],["trainings","Trainings"],["blogs","Resources"]];
  const guestLinks=[["search","Find jobs","browse"],["trainings","Trainings"],["blogs","Resources"],["forEmployers","For employers"]];
  const publicLinks=role==="seeker"?seekerLinks:guestLinks;
  /* Browse-jobs dropdown categories */
  const browseCats=[
    {h:"By sector",items:CATS.slice(0,6).map(c=>[c.label,()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");setBrowseOpen(false);}])},
    {h:"By location",items:[["Toronto, ON","Vancouver, BC","Calgary, AB","Montreal, QC","Edmonton, AB","Ottawa, ON"].map(l=>[l,()=>{A.setSearch({q:"",where:l,cats:[]});A.go("search");setBrowseOpen(false);}])].flat()},
    {h:"By employer",items:[["Browse all companies",()=>{A.go("employers");setBrowseOpen(false);}],["Verified employers only",()=>{A.go("employers");setBrowseOpen(false);}]]},
  ];

  return <header style={{height:60,background:"#fff",borderBottom:`1px solid ${C.line}`,display:"flex",alignItems:"center",
    gap:14,padding:mob?"0 14px":"0 24px",position:"sticky",top:0,zIndex:400,flexShrink:0}}>
    {showBackMob ? <>
      <button onClick={A.back} aria-label="Back" style={{background:C.bg,border:"none",width:38,height:38,borderRadius:11,
        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.text,flexShrink:0,
        transition:"transform .18s, background .16s"}}
        onMouseDown={e=>e.currentTarget.style.transform="scale(.94)"}
        onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}><I n="chevL" s={19} w={2.2}/></button>
      <div style={{fontSize:16.5,fontWeight:680,letterSpacing:"-.025em",color:C.text,overflow:"hidden",
        textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0,textAlign:"center"}}>{A.pageTitle||r.title}</div>
    </> : <>
      {showBackDt&&<button onClick={A.back} aria-label="Back" style={{background:"transparent",border:`1px solid ${C.line}`,
        height:36,padding:"0 12px 0 8px",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:4,
        color:C.text2,flexShrink:0,fontFamily:"inherit",fontSize:13.5,fontWeight:520,transition:"all .16s"}}
        onMouseEnter={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.color=C.text;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}>
        <I n="chevL" s={17} w={2}/>Back</button>}
      <Wordmark onClick={()=>A.go(A.homePg)} size={mob?18:20}/>
      {!mob&&<nav style={{display:"flex",gap:2,marginLeft:12,alignItems:"center"}}>
        {(role==="employer"||role==="admin"
          ? TABS_BY_ROLE[role].slice(0,4).map(t=>[t[0],t[1]])
          : publicLinks).map(item=>{
          const [p,l,kind]=item;
          const on=A.pg===p||(kind==="browse"&&A.pg==="search");
          if(kind==="browse")return <div key={p} style={{position:"relative"}}>
            <button onClick={()=>setBrowseOpen(v=>!v)} onBlur={()=>setTimeout(()=>setBrowseOpen(false),200)}
              style={{background:on||browseOpen?C.wash:"transparent",border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:14.5,fontWeight:on?640:520,color:on||browseOpen?C.brand:C.text2,padding:"9px 11px 9px 13px",
              borderRadius:10,transition:"all .16s",display:"flex",alignItems:"center",gap:4}}>{l}
              <I n="chevD" s={14} w={2}/></button>
            {browseOpen&&<div style={{position:"absolute",top:44,left:0,minWidth:520,background:"#fff",border:`1px solid ${C.line}`,
              borderRadius:14,boxShadow:SH.md,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,zIndex:600,
              animation:"pop .18s ease"}} onMouseDown={e=>e.preventDefault()}>
              {browseCats.map(col=><div key={col.h}>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8,padding:"0 8px"}}>{col.h}</div>
                {col.items.map(([lab,fn],i)=><button key={i} onClick={fn} style={{width:"100%",textAlign:"left",background:"none",border:"none",
                  padding:"6px 8px",fontFamily:"inherit",fontSize:13,color:C.text,cursor:"pointer",borderRadius:6,transition:"background .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{lab}</button>)}
              </div>)}
            </div>}
          </div>;
          return <button key={p} onClick={()=>A.go(p)} style={{background:on?C.wash:"transparent",border:"none",cursor:"pointer",
            fontFamily:"inherit",fontSize:14.5,fontWeight:on?640:520,color:on?C.brand:C.text2,padding:"9px 13px",
            borderRadius:10,transition:"all .16s"}}>{l}</button>;})}
      </nav>}
    </>}

    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:mob?6:10}}>
      {!mob&&!A.user&&<><Btn kind="ghost" size="sm" onClick={()=>A.go("login")}>Sign in</Btn>
        <Btn kind="primary" size="sm" onClick={()=>A.go("signup")}>Create account</Btn></>}
      {/* Guest mobile: single sign-in pill only. Desktop already shows the two buttons above. */}
      {A.user&&<button onClick={()=>A.go("alerts")} aria-label="Notifications" style={{position:"relative",background:C.bg,border:"none",
        width:38,height:38,borderRadius:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.text}}>
        <I n="bell" s={19}/>
        {unread>0&&<span style={{position:"absolute",top:6,right:6,minWidth:16,height:16,padding:"0 4px",borderRadius:99,
          background:C.brand,color:"#fff",fontSize:9.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",
          border:"2px solid #fff",animation:"pop .3s ease"}}>{unread}</span>}</button>}
      <div style={{position:"relative"}}>
        {A.user
          ? <button onClick={()=>setMenu(v=>!v)} aria-label="Account"
              style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",borderRadius:12,transition:"transform .18s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              {A.user.role==="employer"
                ? <SmartLogo e={A.company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={38} radius={11}/>
                : <SmartPortrait seed={A.user.seed??0} size={38} radius={11}/>}
            </button>
          : mob&&<button onClick={()=>A.go("login")} style={{background:C.brand,color:"#fff",border:"none",
              padding:"9px 14px",height:38,borderRadius:10,cursor:"pointer",fontFamily:"inherit",
              fontSize:13.5,fontWeight:640,letterSpacing:"-.01em",transition:"transform .18s, filter .16s",display:"flex",alignItems:"center",gap:6}}
              onMouseDown={e=>e.currentTarget.style.transform="scale(.96)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.filter="brightness(1)";}}
              onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.08)"}>
              Sign in</button>}
        {menu&&A.user&&<>
          <div onClick={()=>setMenu(false)} style={{position:"fixed",inset:0,zIndex:490}}/>
          <div style={{position:"absolute",top:48,right:0,width:252,background:"#fff",border:`1px solid ${C.line}`,
            borderRadius:14,boxShadow:SH.md,zIndex:500,overflow:"hidden",animation:"pop .16s ease"}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.lineSoft}`,display:"flex",gap:11,alignItems:"center"}}>
              {A.user.role==="employer"
                ? <SmartLogo e={A.company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
                : <SmartPortrait seed={A.user.seed??0} size={40} radius={11}/>}
              <div style={{minWidth:0}}>
                <div style={{fontSize:14,fontWeight:650,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{A.user.name}</div>
                <div style={{fontSize:12,color:C.text3}}>{A.user.role==="seeker"?"Job seeker":A.user.role==="employer"?"Employer":"Administrator"}</div></div></div>
            <div style={{padding:6}}>
              {(A.user.role==="seeker"?[["account","My account","user"],["profile","Edit profile","edit"],["cvs","My CVs","file"],["status","Applications","activity"],["saved","Saved jobs","bookmark"],["settings","Settings","gear"]]
                :A.user.role==="employer"?[["empHome","Dashboard","home"],["empPost","Post a job","plus"],["empPipeline","Candidates","users"],["empCompany","Company profile","building"],["empBilling","Billing","wallet"],["settings","Settings","gear"]]
                :[["admHome","Overview","home"],["admSettings","Platform settings","gear"],["admLog","Activity log","file"],["admStats","Statistics","trend"]]
              ).map(([p,l,ic])=>
                <button key={p} onClick={()=>{A.go(p);setMenu(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:11,
                  padding:"10px 11px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:14,
                  color:C.text,borderRadius:9,textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <I n={ic} s={17} c={C.text2}/>{l}</button>)}
              <div style={{height:1,background:C.lineSoft,margin:"6px 4px"}}/>
              <button onClick={()=>{A.logout();setMenu(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:11,
                padding:"10px 11px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:14,
                color:C.red,borderRadius:9,textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.redBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <I n="logout" s={17}/>Sign out</button></div></div></>}
      </div>
    </div>
  </header>;
}
