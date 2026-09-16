import { useState, useEffect, useMemo, useRef } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input, Sel, Empty, Lbl, Modal, usePagination, Pagination, HERO_TIGHT } from "../../design/primitives.jsx";
import { annual } from "../../helpers/utils.js";
import { CATS, CATM, PCODE, PROVS } from "../../store/seed/constants.js";
import { JobCard } from "../shared/cards.jsx";
import { matchJobsToFilters } from "../../helpers/jobSearch.js";
import { JobsMap } from "./components/JobsMap.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

/* ═══════════════ SEARCH · MATCHED · SAVED · EMPLOYERS ═══════════════ */
/* Job Seeker Transformation Tranche 2 — "Recent searches" list. This is pure UI convenience (what
   did I search recently), never a substitute for server-held saved searches (those already exist
   via A.saveSearch/savedSearches) - fine to keep per-device in localStorage. */
const RECENT_SEARCHES_KEY="northhire.recentSearches";
/* Employment type / work setting / experience filter values are stored and matched against job
   data as canonical English strings (see the STANDING RULE not to touch stored enum values) -
   these maps translate only the label shown to the user. */
const EMP_TYPE_KEY={"Full Time":"auth.fullTime","Part Time":"auth.partTime","Contract":"auth.contract",
  "Seasonal":"auth.seasonal","Apprenticeship":"auth.apprenticeship"};
const MODE_KEY={"On-site":"auth.onSite","Hybrid":"auth.hybrid","Remote":"auth.remote"};
const EXP_KEY={"No experience required":"seeker.search.expNoneRequired","Entry level welcome":"seeker.search.expEntryLevel",
  "1+ years":"seeker.search.exp1Plus","2+ years":"seeker.search.exp2Plus","3+ years":"seeker.search.exp3Plus","4+ years":"seeker.search.exp4Plus"};

function Filters({f,set,clear,n,q,where}){
  const A=use(); const {t}=useTranslation();
  const tog=(k,v)=>{const c=f[k]||[];set({...f,[k]:c.includes(v)?c.filter(x=>x!==v):[...c,v]});};
  const G=({t,children})=><div className="pb-6 mb-6 border-b border-line-soft"><Lbl>{t}</Lbl>{children}</div>;
  /* role/aria-checked so a screen reader announces these as checkboxes with real on/off state -
     as plain buttons they read as "Full Time, button" with no indication of whether the filter
     is currently applied, which is the entire information the control carries. */
  const R=({on,onClick,label,num})=><button onClick={onClick} role="checkbox" aria-checked={!!on}
    aria-label={num!=null?t(num===1?"seeker.search.ariaJobCountOne":"seeker.search.ariaJobCountOther",{label,count:num}):label}
    className="flex items-center gap-3 w-full py-2.5 px-1.5 bg-transparent border-0 cursor-pointer text-left rounded-lg focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2">
    <span className={`w-5 h-5 rounded-md shrink-0 border-2 flex items-center justify-center transition duration-150 ${on?"border-brand bg-brand":"border-line bg-white"}`}>{on&&<I n="check" s={12} c="#fff" w={3}/>}</span>
    <span className={`flex-1 text-sm text-text ${on?"font-semibold":"font-medium"}`}>{label}</span>
    {num!=null&&<span className="text-xs text-text-3">{num}</span>}</button>;
  /* Sector counts previously ignored every OTHER active filter (type/mode/experience/province/pay/
     search text), so a count could look wrong relative to what the page was actually showing.
     Compute each sector's count against the same result set the page uses, minus the sector filter
     itself - the standard faceted-search pattern. */
  const withoutCats=matchJobsToFilters(A.jobs,{q,where,...f,cats:[]},{expandQuery:A.expandQuery,emp:A.emp});
  return <div>
    <div className="flex justify-between items-center mb-6">
      <div className="text-base font-bold text-text tracking-tight">{t("seeker.search.filtersTitle")}</div>
      {n>0&&<button onClick={clear} className="bg-transparent border-0 cursor-pointer text-sm text-brand font-semibold p-0">{t("seeker.search.clearCount",{count:n})}</button>}</div>
    <G t={t("seeker.search.sectorLabel")}>{CATS.map(c=><R key={c.id} label={c.label} num={withoutCats.filter(j=>j.cat===c.id).length}
      on={(f.cats||[]).includes(c.id)} onClick={()=>tog("cats",c.id)}/>)}</G>
    <G t={t("seeker.search.employmentTypeLabel")}>{["Full Time","Part Time","Contract","Seasonal","Apprenticeship"].map(ty=>
      <R key={ty} label={t(EMP_TYPE_KEY[ty])} on={(f.types||[]).includes(ty)} onClick={()=>tog("types",ty)}/>)}</G>
    <G t={t("seeker.search.workSettingLabel")}>{["On-site","Hybrid","Remote"].map(ty=><R key={ty} label={t(MODE_KEY[ty])} on={(f.modes||[]).includes(ty)} onClick={()=>tog("modes",ty)}/>)}</G>
    <G t={t("seeker.search.provinceLabel")}><Sel value={f.prov||""} onChange={e=>set({...f,prov:e.target.value})}>
      <option value="">{t("seeker.search.allProvinces")}</option>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></G>
    <G t={t("seeker.search.experienceLabel")}>{["No experience required","Entry level welcome","1+ years","2+ years","3+ years","4+ years"].map(ty=>
      <R key={ty} label={t(EXP_KEY[ty])} on={(f.exps||[]).includes(ty)} onClick={()=>tog("exps",ty)}/>)}</G>
    <div><Lbl>{t("seeker.search.minPayLabel")}</Lbl>
      <Sel value={f.minPay||""} onChange={e=>set({...f,minPay:e.target.value})}>
        <option value="">{t("seeker.search.anyPay")}</option>{[40000,50000,60000,75000,90000,110000].map(v=><option key={v} value={v}>{t("seeker.search.payKPlusPerYear",{amount:v/1000})}</option>)}</Sel></div>
  </div>;
}

export function SearchPage(){
  const A=use(); const mob=useMedia("(max-width: 960px)");
  const {t}=useTranslation();
  const filterChipLabel=ty=>t(EMP_TYPE_KEY[ty]||MODE_KEY[ty]||EXP_KEY[ty]||ty);
  const [q,setQ]=useState(A.search.q||""); const [where,setWhere]=useState(A.search.where||"");
  const [f,setF]=useState({cats:A.search.cats||[],types:A.search.types||[],modes:A.search.modes||[],
    exps:A.search.exps||[],prov:A.search.prov||"",minPay:A.search.minPay||""});
  const [sort,setSort]=useState(A.user?.role==="seeker"?"match":"recent");
  const [panel,setPanel]=useState(false);
  const [showSuggest,setShowSuggest]=useState(false);
  const [radiusKm,setRadiusKm]=useState(0);
  const [origin,setOrigin]=useState(null);
  const [geocoding,setGeocoding]=useState(false);
  const [mapView,setMapView]=useState(false);
  /* Radius search needs the typed location resolved to real coordinates - only looked up when a
     radius is actually selected (an "Exact match" radius stays plain text substring matching, no
     network call needed) and re-resolved whenever the location text changes while a radius is active. */
  useEffect(()=>{
    if(!radiusKm||!where.trim()){setOrigin(null);return;}
    let cancelled=false;
    setGeocoding(true);
    A.geocode(`${where}, Canada`).then(r=>{if(!cancelled){setOrigin(r);setGeocoding(false);}});
    return ()=>{cancelled=true;};
  },[radiusKm,where]);
  /* Typeahead - drawn from real live job titles rather than a canned list, so suggestions never
     name a role that doesn't actually exist on the platform right now. */
  const titleSuggestions=useMemo(()=>{
    const query=q.trim().toLowerCase(); if(!query)return [];
    const seen=new Set(); const out=[];
    for(const j of A.jobs){if(j.status!=="live")continue;
      if(j.t.toLowerCase().includes(query)&&!seen.has(j.t)){seen.add(j.t);out.push(j.t);}
      if(out.length>=6)break;}
    return out;
  },[q,A.jobs]);
  useEffect(()=>{setQ(A.search.q||"");setWhere(A.search.where||"");
    setF({cats:A.search.cats||[],types:A.search.types||[],modes:A.search.modes||[],
      exps:A.search.exps||[],prov:A.search.prov||"",minPay:A.search.minPay||""});},[A.search]);
  /* Filters lived only in this component's local state - opening a job and pressing Back
     re-mounted the page seeded from the stale global A.search, silently dropping every filter
     except whatever q/where/cats the ORIGINAL entry point had set. Write the live filter state
     back to the shared store on unmount (not on every keystroke, to avoid ping-ponging against
     the read-effect above) so returning to this page restores exactly where the user left off. */
  const latestFilters=useRef();
  latestFilters.current={q,where,...f};
  useEffect(()=>()=>{A.setSearch(latestFilters.current);},[]);
  const [recent]=useState(()=>{try{return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)||"[]");}catch{return [];}});
  /* Record on unmount (leaving the page), same trigger as the filter-memory effect above, so a
     search only lands in "recent" once the seeker has actually moved on from it, not on every
     keystroke. */
  useEffect(()=>()=>{
    const {q:lq,where:lw}=latestFilters.current;
    if(!lq.trim()&&!lw.trim())return;
    const id=`${lq.trim()}|${lw.trim()}`;
    let prev; try{prev=JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)||"[]");}catch{prev=[];}
    const next=[{q:lq.trim(),where:lw.trim()},...prev.filter(r=>`${r.q}|${r.where}`!==id)].slice(0,5);
    try{localStorage.setItem(RECENT_SEARCHES_KEY,JSON.stringify(next));}catch{}
  },[]);
  const applyRecent=r=>{setQ(r.q);setWhere(r.where);};
  const n=(f.cats?.length||0)+(f.types?.length||0)+(f.modes?.length||0)+(f.exps?.length||0)+(f.prov?1:0)+(f.minPay?1:0);
  const clear=()=>setF({cats:[],types:[],modes:[],exps:[],prov:"",minPay:""});
  const res=useMemo(()=>{
    const o=matchJobsToFilters(A.jobs,{q,where,...f,origin,radiusKm},{expandQuery:A.expandQuery,emp:A.emp});
    const c=[...o];
    if(sort==="match")c.sort((a,b)=>A.score(b)-A.score(a));
    if(sort==="pay")c.sort((a,b)=>annual(b)-annual(a));
    if(sort==="closing")c.sort((a,b)=>a.dl-b.dl);
    return c;
  },[q,where,f,sort,A.jobs,A.user]);
  const pg=usePagination(res,20);
  useEffect(()=>{pg.setPage(1);},[q,where,f,sort]);

  return <div className="bg-white min-h-full">

    <section className={`bg-white border-b border-line-soft ${mob?"pt-10 px-4 pb-8":"pt-18 px-8 pb-12"}`}>
      <div className="max-w-6xl mx-auto text-center">
        <Tag tone="brand" icon="search">{t("seeker.search.searchJobsTag")}</Tag>
        <h1 className={`${HERO_TIGHT} mt-5 mx-auto mb-5 max-w-3xl ${mob?"text-3xl":"text-6xl"}`}>
          {t("seeker.search.heroTitle")}</h1>
        <p className={`text-text-2 leading-normal mx-auto mb-8 max-w-lg ${mob?"text-base":"text-lg"}`}>
          {(()=>{const c=A.jobs.filter(j=>j.status==="live").length;
            return t(c===1?"seeker.search.heroSubOne":"seeker.search.heroSubOther",{count:c.toLocaleString()});})()}</p>
        <div className={`bg-white rounded-2xl p-2 flex gap-2 shadow-md border border-line max-w-3xl mx-auto ${mob?"flex-wrap":"flex-nowrap"}`}>
          <div className="flex-[2_1_240px] min-w-0 relative">
            <Input icon="search" placeholder={t("seeker.search.searchPlaceholder")} value={q}
              onChange={e=>{setQ(e.target.value);setShowSuggest(true);}}
              onFocus={()=>setShowSuggest(true)} onBlur={()=>setTimeout(()=>setShowSuggest(false),150)}
              style={{border:"none",boxShadow:"none",fontSize:15}}/>
            {showSuggest&&titleSuggestions.length>0&&<div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-line shadow-lg z-10 overflow-hidden text-left">
              {titleSuggestions.map(sug=><button key={sug} onMouseDown={e=>{e.preventDefault();setQ(sug);setShowSuggest(false);}}
                className="block w-full text-left py-2.5 px-4 bg-transparent border-0 cursor-pointer text-sm text-text hover:bg-bg">
                <I n="search" s={13} c={C.text3}/> <span className="ml-1.5">{sug}</span></button>)}</div>}</div>
          {!mob&&<div className="w-px bg-line my-2"/>}
          <div className="flex-[1_1_180px] min-w-0"><Input icon="pin" placeholder={t("formControls.locationPlaceholder")} value={where} onChange={e=>setWhere(e.target.value)} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
          {!mob&&<div className="w-px bg-line my-2"/>}
          <div className="flex-[0_0_150px] min-w-0">
            <Sel value={radiusKm} onChange={e=>setRadiusKm(Number(e.target.value))} style={{border:"none",boxShadow:"none",fontSize:15}}>
              <option value={0}>{t("seeker.search.exactMatch")}</option>
              <option value={10}>{t("seeker.search.withinKm",{km:10})}</option>
              <option value={25}>{t("seeker.search.withinKm",{km:25})}</option>
              <option value={50}>{t("seeker.search.withinKm",{km:50})}</option>
              <option value={100}>{t("seeker.search.withinKm",{km:100})}</option>
            </Sel>
          </div>
          {mob&&<Btn kind="outline" icon="sliders" onClick={()=>setPanel(true)} full>{t("seeker.search.filtersTitle")}{n?` (${n})`:""}</Btn>}
        </div>
        {radiusKm>0&&<div className="text-xs mt-2 max-w-3xl mx-auto text-center" style={{color:geocoding?C.text3:origin?C.ok:C.warn}}>
          {geocoding?t("seeker.search.locating"):origin?t("seeker.search.searchingWithin",{km:radiusKm,place:origin.displayName?.split(",").slice(0,2).join(", ")||where}):where.trim()?t("seeker.search.couldntFindLocation"):t("seeker.search.typeCityRadius")}</div>}
        <div className="text-xs text-text-3 mt-2 max-w-3xl mx-auto text-center">{t("seeker.search.excludeTipPrefix")} <strong>{t("seeker.search.excludeTipWord")}</strong> {t("seeker.search.excludeTipSuffix")}</div>
        {recent.length>0&&<div className="flex items-center gap-2 flex-wrap justify-center mt-4 max-w-3xl mx-auto">
          <span className="text-xs text-text-3 font-semibold">{t("seeker.search.recentSearchesLabel")}</span>
          {recent.map((r,i)=><button key={i} onClick={()=>applyRecent(r)}
            className="bg-white border border-line rounded-lg py-1.5 px-3 text-xs font-medium text-text cursor-pointer">
            {r.q||t("seeker.search.anyTitleChip")}{r.where?` • ${r.where}`:""}</button>)}</div>}
      </div>
    </section>

    <section className={`bg-bg min-h-100 ${mob?"pt-5 px-4 pb-14":"pt-8 px-8 pb-24"}`}>
      <div className={`max-w-site mx-auto grid items-start ${mob?"grid-cols-1 gap-0":"grid-cols-[280px_1fr] gap-8"}`}>
        {!mob&&<div className="bg-white rounded-3xl p-6 border border-line sticky top-20">
          <Filters f={f} set={setF} clear={clear} n={n} q={q} where={where}/></div>}
        <div>
          <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
            <div className="text-base text-text-2"><strong className={`text-text font-bold tracking-tight ${mob?"text-lg":"text-2xl"}`}>{res.length}</strong> {res.length===1?t("seeker.matched.jobOne"):t("seeker.matched.jobOther")}
              {q&&<> for "<strong className="text-text">{q}</strong>"</>}</div>
            {A.user?.role==="seeker"&&(q||where||f.cats?.length)&&(A.editingSavedSearchId
              ?<Btn kind="outline" size="sm" icon="check" onClick={async()=>{
                  await A.updateSavedSearch(A.editingSavedSearchId,{q,where,cats:f.cats,types:f.types,modes:f.modes,exps:f.exps,prov:f.prov,minPay:f.minPay});
                  A.setEditingSavedSearchId(null); A.toast(t("seeker.search.savedSearchUpdatedToast"),"ok"); A.go("savedSearches");}}>{t("seeker.search.updateSavedSearchBtn")}</Btn>
              :<Btn kind="outline" size="sm" icon="bookmark"
                onClick={()=>{const nm=q||CATM[f.cats?.[0]]?.label||t("seeker.search.defaultSearchName");A.saveSearch(q,where,f.cats,nm,f);}}>{t("seeker.search.saveThisSearchBtn")}</Btn>)}
            <div className="flex gap-2">
              <Btn kind={mapView?"primary":"outline"} size="sm" icon="pin" onClick={()=>setMapView(v=>!v)}>{mapView?t("seeker.search.listViewBtn"):t("seeker.search.mapViewBtn")}</Btn>
              <Sel value={sort} onChange={e=>setSort(e.target.value)} style={{width:mob?150:180,padding:"10px 14px",fontSize:14}}>
                {A.user?.role==="seeker"&&<option value="match">{t("seeker.search.bestMatchOption")}</option>}
                <option value="recent">{t("seeker.search.mostRecentOption")}</option><option value="pay">{t("seeker.search.highestPayOption")}</option><option value="closing">{t("seeker.search.closingSoonOption")}</option></Sel>
            </div></div>
          {/* Sticky filter-chip strip (Tranche 2): the active-filter chips stay visible while
              scrolling the results list, so clearing/adjusting a filter never requires scrolling
              back up. */}
          {n>0&&<div className="sticky top-0 z-10 bg-bg pt-1 pb-1 flex gap-2 flex-wrap mb-5 items-center">
            {(f.cats||[]).map(c=><button key={c} onClick={()=>setF({...f,cats:f.cats.filter(x=>x!==c)})}
              className="flex items-center gap-1.5 bg-wash border border-line-2 text-brand text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer">{CATM[c].label}<I n="x" s={12} w={2.4}/></button>)}
            {[...(f.types||[]),...(f.modes||[]),...(f.exps||[])].map(ty=><button key={ty}
              onClick={()=>setF({...f,types:(f.types||[]).filter(x=>x!==ty),modes:(f.modes||[]).filter(x=>x!==ty),exps:(f.exps||[]).filter(x=>x!==ty)})}
              className="flex items-center gap-1.5 bg-wash border border-line-2 text-brand text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer">{filterChipLabel(ty)}<I n="x" s={12} w={2.4}/></button>)}
            <button onClick={clear} className="bg-transparent border-0 text-text-2 text-sm cursor-pointer font-semibold">{t("seeker.search.clearAllBtn")}</button></div>}
          {res.length===0?<Empty icon="search" title={t("seeker.search.noJobsMatchTitle")}
            body={t("seeker.search.noJobsMatchBody")}
            action={<Btn kind="primary" onClick={()=>{clear();setQ("");setWhere("");}}>{t("seeker.search.resetSearchBtn")}</Btn>}/>
            :mapView?<div style={{height:560}}><JobsMap jobs={res} center={origin} onSelect={j=>A.openJob(j.id)}/></div>
            :<><div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`}}>
              {pg.pageItems.map(j=><JobCard key={j.id} job={j}/>)}</div>
              <Pagination {...pg}/></>}
        </div>
      </div>
    </section>

    {mob&&panel&&<Modal onClose={()=>setPanel(false)} title={t("seeker.search.filtersTitle")}><Filters f={f} set={setF} clear={clear} n={n} q={q} where={where}/>
      <Btn kind="primary" size="lg" full onClick={()=>setPanel(false)} style={{marginTop:14}}>{t(res.length===1?"seeker.search.showJobsOne":"seeker.search.showJobsOther",{count:res.length})}</Btn></Modal>}

  </div>;
}
