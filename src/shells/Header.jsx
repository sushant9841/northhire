import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C, SH } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { Btn, SmartLogo, SmartPortrait } from "../design/primitives.jsx";
import { CATS } from "../store/seed/constants.js";
import { ROUTES, TABS_BY_ROLE } from "../routes.js";
import { useTranslation } from "../i18n/i18n.jsx";

export function Wordmark({light,size=20,onClick}){
  return <div onClick={onClick} className={`flex items-center gap-2.5 shrink-0 ${onClick?"cursor-pointer":"cursor-default"}`}>
    <div className="bg-brand flex items-center justify-center shrink-0" style={{width:size*1.5,height:size*1.5,borderRadius:size*0.42}}>
      <svg width={size*0.86} height={size*0.86} viewBox="0 0 24 24" fill="none">
        <path d="M5 19V6.6a.5.5 0 0 1 .87-.34L18 18.1V5" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <span className={`font-bold tracking-tighter ${light?"text-white":"text-text"}`} style={{fontSize:size}}>NorthHire</span></div>;
}

export function Header(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t,locale,setLocale}=useTranslation();
  const [menu,setMenu]=useState(false);
  const [browseOpen,setBrowseOpen]=useState(false);
  const [langOpen,setLangOpen]=useState(false);
  const chooseLocale=next=>{setLocale(next); if(A.setUserLocale)A.setUserLocale(next); setLangOpen(false);};
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
  const seekerLinks=[["search",t("nav.browseJobs"),"browse"],["trainings",t("nav.trainings")],["blogs",t("nav.resources")]];
  const guestLinks=[["search",t("nav.findJobs"),"browse"],["trainings",t("nav.trainings")],["blogs",t("nav.resources")],["forEmployers",t("nav.forEmployers")]];
  const publicLinks=role==="seeker"?seekerLinks:guestLinks;
  /* Browse-jobs dropdown categories */
  const browseCats=[
    {h:t("nav.bySector"),items:CATS.slice(0,6).map(c=>[c.label,()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");setBrowseOpen(false);}])},
    {h:t("nav.byLocation"),items:[["Toronto, ON","Vancouver, BC","Calgary, AB","Montreal, QC","Edmonton, AB","Ottawa, ON"].map(l=>[l,()=>{A.setSearch({q:"",where:l,cats:[]});A.go("search");setBrowseOpen(false);}])].flat()},
    {h:t("nav.byEmployer"),items:[[t("nav.browseAllCompanies"),()=>{A.go("employers");setBrowseOpen(false);}],
      [t("nav.verifiedOnly"),()=>{A.setEmployersPrefill("verified");A.go("employers");setBrowseOpen(false);}]]},
  ];

  return <header className="h-15 bg-white border-b border-line sticky top-0 z-400 shrink-0">
  <div className={`h-full max-w-site mx-auto flex items-center gap-3.5 ${mob?"px-3.5":"px-6"}`}>
    {showBackMob ? <>
      <button onClick={A.back} aria-label={t("nav.back")} className="bg-bg border-0 w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center text-text shrink-0 transition duration-150 active:scale-95"><I n="chevL" s={19} w={2.2}/></button>
      <div className="text-lg font-bold tracking-tight text-text overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 text-center">{A.pageTitle||r.title}</div>
    </> : <>
      {showBackDt&&<button onClick={A.back} aria-label={t("nav.back")} className="bg-transparent border border-line h-9 pr-3 pl-2 rounded-lg cursor-pointer flex items-center gap-1 text-text-2 shrink-0 text-sm font-medium transition duration-150 hover:bg-bg hover:text-text">
        <I n="chevL" s={17} w={2}/>{t("nav.back")}</button>}
      <Wordmark onClick={()=>A.go(A.homePg)} size={mob?18:20}/>
      {!mob&&<nav className="flex gap-0.5 ml-3 items-center">
        {(role==="employer"||role==="admin"
          ? TABS_BY_ROLE[role].slice(0,4).map(tab=>[tab[0],t(tab[1])])
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
      {!mob&&!A.user&&<><Btn kind="ghost" size="sm" onClick={()=>A.go("login")}>{t("common.signIn")}</Btn>
        <Btn kind="primary" size="sm" onClick={()=>A.go("signup")}>{t("common.createAccount")}</Btn></>}
      {/* Guest mobile: single sign-in pill only. Desktop already shows the two buttons above. */}
      {A.user&&<button onClick={()=>A.go("alerts")} aria-label={t("nav.notificationsAria")} className="relative bg-bg border-0 w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center text-text">
        <I n="bell" s={19}/>
        {unread>0&&<span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center border-2 border-white" style={{animation:"pop .3s ease"}}>{unread}</span>}</button>}
      <div className="relative">
        {A.user
          ? <button onClick={()=>setMenu(v=>!v)} aria-label={t("nav.accountAria")} aria-haspopup="menu" aria-expanded={menu}
              className="bg-transparent border-0 p-0 cursor-pointer flex rounded-xl transition duration-200 hover:scale-105">
              {A.user.role==="employer"
                ? <SmartLogo e={A.company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={38} radius={11}/>
                : <SmartPortrait seed={A.user.seed??0} size={38} radius={11}/>}
            </button>
          : mob&&<button onClick={()=>A.go("login")} className="bg-brand text-white border-0 py-2.5 px-3.5 h-10 rounded-xl cursor-pointer text-sm font-semibold flex items-center gap-1.5 transition duration-150 hover:brightness-110 active:scale-95">
              {t("common.signIn")}</button>}
        {menu&&A.user&&<>
          <div onClick={()=>setMenu(false)} className="fixed inset-0 z-490"/>
          <div className="absolute top-12 right-0 w-64 bg-white border border-line rounded-2xl shadow-md z-500 overflow-hidden" style={{animation:"pop .16s ease"}}>
            <div className="py-3.5 px-4 border-b border-line-soft flex gap-3 items-center">
              {A.user.role==="employer"
                ? <SmartLogo e={A.company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
                : <SmartPortrait seed={A.user.seed??0} size={40} radius={11}/>}
              <div className="min-w-0">
                <div className="text-sm font-bold text-text overflow-hidden text-ellipsis whitespace-nowrap">{A.user.name}</div>
                <div className="text-xs text-text-3">{A.user.role==="seeker"?t("account.jobSeeker"):A.user.role==="employer"?t("account.employer"):t("account.administrator")}</div></div></div>
            <div className="p-1.5">
              {(A.user.role==="seeker"?[["account",t("account.myAccount"),"user"],["profile",t("account.editProfile"),"edit"],["cvs",t("account.myCvs"),"file"],["status",t("account.applications"),"activity"],["saved",t("account.savedJobs"),"bookmark"],["settings",t("account.settings"),"gear"]]
                :A.user.role==="employer"?[["empHome",t("account.dashboard"),"home"],["empPost",t("account.postAJob"),"plus"],["empPipeline",t("account.candidates"),"users"],["empCompany",t("account.companyProfile"),"building"],["empTeam",t("account.team"),"users"],["empBilling",t("account.billing"),"wallet"],["settings",t("account.settings"),"gear"]]
                :[["admHome",t("account.overview"),"home"],["admSettings",t("account.platformSettings"),"gear"],["admLog",t("account.activityLog"),"file"],["admStats",t("account.statistics"),"trend"]]
              ).map(([p,l,ic])=>
                <button key={p} onClick={()=>{A.go(p);setMenu(false);}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-text rounded-xl text-left hover:bg-bg">
                  <I n={ic} s={17} c={C.text2}/>{l}</button>)}
              <div className="h-px bg-line-soft my-1.5 mx-1"/>
              {/* Bill 96: language toggle in the top-right account menu, alongside the same
                  control in Settings. Own click-catcher + Escape (via the effect above) rather
                  than nesting inside the account dropdown's existing outside-click handler, so
                  picking a language doesn't also close the account menu underneath it. */}
              <div className="relative">
                <button onClick={()=>setLangOpen(v=>!v)} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-text rounded-xl text-left hover:bg-bg">
                  <I n="globe" s={17} c={C.text2}/>{t("account.language")}
                  <span className="ml-auto text-xs text-text-3">{locale==="fr-CA"?t("account.languageFrench"):t("account.languageEnglish")}</span></button>
                {langOpen&&<>
                  <div onClick={()=>setLangOpen(false)} className="fixed inset-0 z-590"/>
                  <div className="absolute top-full left-2 right-2 bg-white border border-line rounded-xl shadow-md z-600 overflow-hidden" style={{animation:"pop .16s ease"}}>
                    <button onClick={()=>chooseLocale("en-CA")} className={`w-full text-left py-2 px-3 border-0 cursor-pointer text-sm hover:bg-bg ${locale==="en-CA"?"font-semibold text-brand":"text-text"}`}>{t("account.languageEnglish")}</button>
                    <button onClick={()=>chooseLocale("fr-CA")} className={`w-full text-left py-2 px-3 border-0 cursor-pointer text-sm hover:bg-bg ${locale==="fr-CA"?"font-semibold text-brand":"text-text"}`}>{t("account.languageFrench")}</button>
                  </div></>}
              </div>
              <button onClick={()=>{A.logout();setMenu(false);}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-red rounded-xl text-left hover:bg-red-bg">
                <I n="logout" s={17}/>{t("common.signOut")}</button></div></div></>}
      </div>
    </div>
  </div>
  </header>;
}
