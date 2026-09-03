import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C, SH } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { Btn, SmartLogo, SmartPortrait } from "../design/primitives.jsx";
import { CATS } from "../store/seed/constants.js";
import { ROUTES, TABS_BY_ROLE } from "../routes.js";

export function Wordmark({light,size=20,onClick}){
  return <div onClick={onClick} className={`flex items-center gap-2.5 shrink-0 ${onClick?"cursor-pointer":"cursor-default"}`}>
    <div className="bg-brand flex items-center justify-center shrink-0" style={{width:size*1.5,height:size*1.5,borderRadius:size*0.42}}>
      <svg width={size*0.86} height={size*0.86} viewBox="0 0 24 24" fill="none">
        <path d="M5 19V6.6a.5.5 0 0 1 .87-.34L18 18.1V5" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <span className={`font-bold tracking-tighter ${light?"text-white":"text-text"}`} style={{fontSize:size}}>NorthHire</span></div>;
}

export function Header(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [menu,setMenu]=useState(false);
  const [browseOpen,setBrowseOpen]=useState(false);
  /* Both dropdowns previously closed only via a click-catcher (menu) or a fragile
     onBlur+setTimeout hack (browseOpen) - neither responded to Escape. */
  useEffect(()=>{
    if(!menu&&!browseOpen)return;
    const onKey=e=>{if(e.key==="Escape"){setMenu(false);setBrowseOpen(false);}};
    document.addEventListener("keydown",onKey);
    return ()=>document.removeEventListener("keydown",onKey);
  },[menu,browseOpen]);
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
    {h:"By employer",items:[["Browse all companies",()=>{A.go("employers");setBrowseOpen(false);}],
      ["Verified employers only",()=>{A.setEmployersPrefill("verified");A.go("employers");setBrowseOpen(false);}]]},
  ];

  return <header className={`h-15 bg-white border-b border-line flex items-center gap-3.5 sticky top-0 z-400 shrink-0 ${mob?"px-3.5":"px-6"}`}>
    {showBackMob ? <>
      <button onClick={A.back} aria-label="Back" className="bg-bg border-0 w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center text-text shrink-0 transition duration-150 active:scale-95"><I n="chevL" s={19} w={2.2}/></button>
      <div className="text-lg font-bold tracking-tight text-text overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 text-center">{A.pageTitle||r.title}</div>
    </> : <>
      {showBackDt&&<button onClick={A.back} aria-label="Back" className="bg-transparent border border-line h-9 pr-3 pl-2 rounded-lg cursor-pointer flex items-center gap-1 text-text-2 shrink-0 text-sm font-medium transition duration-150 hover:bg-bg hover:text-text">
        <I n="chevL" s={17} w={2}/>Back</button>}
      <Wordmark onClick={()=>A.go(A.homePg)} size={mob?18:20}/>
      {!mob&&<nav className="flex gap-0.5 ml-3 items-center">
        {(role==="employer"||role==="admin"
          ? TABS_BY_ROLE[role].slice(0,4).map(t=>[t[0],t[1]])
          : publicLinks).map(item=>{
          const [p,l,kind]=item;
          const on=A.pg===p||(kind==="browse"&&A.pg==="search");
          if(kind==="browse")return <div key={p} className="relative">
            <button onClick={()=>setBrowseOpen(v=>!v)}
              className={`border-0 cursor-pointer text-sm py-2.5 pr-3 pl-3.5 rounded-xl transition-all duration-150 flex items-center gap-1 ${on?"font-semibold":"font-medium"} ${on||browseOpen?"bg-wash text-brand":"bg-transparent text-text-2"}`}>{l}
              <I n="chevD" s={14} w={2}/></button>
            {browseOpen&&<>
              <div onClick={()=>setBrowseOpen(false)} className="fixed inset-0 z-590"/>
              <div className="absolute top-11 left-0 min-w-130 bg-white border border-line rounded-2xl shadow-md p-4 grid grid-cols-3 gap-3.5 z-600" style={{animation:"pop .18s ease"}}>
                {browseCats.map(col=><div key={col.h}>
                  <div className="text-xs font-bold text-text-3 tracking-wider uppercase mb-2 px-2">{col.h}</div>
                  {col.items.map(([lab,fn],i)=><button key={i} onClick={fn} className="w-full text-left bg-transparent border-0 py-1.5 px-2 text-sm text-text cursor-pointer rounded-md transition-colors duration-100 hover:bg-bg">{lab}</button>)}
                </div>)}
              </div>
            </>}
          </div>;
          return <button key={p} onClick={()=>A.go(p)} className={`border-0 cursor-pointer text-sm py-2.5 px-3.5 rounded-xl transition-all duration-150 ${on?"bg-wash text-brand font-semibold":"bg-transparent text-text-2 font-medium"}`}>{l}</button>;})}
      </nav>}
    </>}

    <div className={`ml-auto flex items-center ${mob?"gap-1.5":"gap-2.5"}`}>
      {!mob&&!A.user&&<><Btn kind="ghost" size="sm" onClick={()=>A.go("login")}>Sign in</Btn>
        <Btn kind="primary" size="sm" onClick={()=>A.go("signup")}>Create account</Btn></>}
      {/* Guest mobile: single sign-in pill only. Desktop already shows the two buttons above. */}
      {A.user&&<button onClick={()=>A.go("alerts")} aria-label="Notifications" className="relative bg-bg border-0 w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center text-text">
        <I n="bell" s={19}/>
        {unread>0&&<span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center border-2 border-white" style={{animation:"pop .3s ease"}}>{unread}</span>}</button>}
      <div className="relative">
        {A.user
          ? <button onClick={()=>setMenu(v=>!v)} aria-label="Account"
              className="bg-transparent border-0 p-0 cursor-pointer flex rounded-xl transition duration-200 hover:scale-105">
              {A.user.role==="employer"
                ? <SmartLogo e={A.company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={38} radius={11}/>
                : <SmartPortrait seed={A.user.seed??0} size={38} radius={11}/>}
            </button>
          : mob&&<button onClick={()=>A.go("login")} className="bg-brand text-white border-0 py-2.5 px-3.5 h-10 rounded-xl cursor-pointer text-sm font-semibold flex items-center gap-1.5 transition duration-150 hover:brightness-110 active:scale-95">
              Sign in</button>}
        {menu&&A.user&&<>
          <div onClick={()=>setMenu(false)} className="fixed inset-0 z-490"/>
          <div className="absolute top-12 right-0 w-64 bg-white border border-line rounded-2xl shadow-md z-500 overflow-hidden" style={{animation:"pop .16s ease"}}>
            <div className="py-3.5 px-4 border-b border-line-soft flex gap-3 items-center">
              {A.user.role==="employer"
                ? <SmartLogo e={A.company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
                : <SmartPortrait seed={A.user.seed??0} size={40} radius={11}/>}
              <div className="min-w-0">
                <div className="text-sm font-bold text-text overflow-hidden text-ellipsis whitespace-nowrap">{A.user.name}</div>
                <div className="text-xs text-text-3">{A.user.role==="seeker"?"Job seeker":A.user.role==="employer"?"Employer":"Administrator"}</div></div></div>
            <div className="p-1.5">
              {(A.user.role==="seeker"?[["account","My account","user"],["profile","Edit profile","edit"],["cvs","My CVs","file"],["status","Applications","activity"],["saved","Saved jobs","bookmark"],["settings","Settings","gear"]]
                :A.user.role==="employer"?[["empHome","Dashboard","home"],["empPost","Post a job","plus"],["empPipeline","Candidates","users"],["empCompany","Company profile","building"],["empBilling","Billing","wallet"],["settings","Settings","gear"]]
                :[["admHome","Overview","home"],["admSettings","Platform settings","gear"],["admLog","Activity log","file"],["admStats","Statistics","trend"]]
              ).map(([p,l,ic])=>
                <button key={p} onClick={()=>{A.go(p);setMenu(false);}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-text rounded-xl text-left hover:bg-bg">
                  <I n={ic} s={17} c={C.text2}/>{l}</button>)}
              <div className="h-px bg-line-soft my-1.5 mx-1"/>
              <button onClick={()=>{A.logout();setMenu(false);}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-red rounded-xl text-left hover:bg-red-bg">
                <I n="logout" s={17}/>Sign out</button></div></div></>}
      </div>
    </div>
  </header>;
}
