import { useState, useEffect, useMemo } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input, Sel, Empty, Lbl, Modal } from "../../design/primitives.jsx";
import { annual } from "../../helpers/utils.js";
import { CATS, CATM, PCODE, PROVS } from "../../store/seed/constants.js";
import { JobCard } from "../shared/cards.jsx";
import { matchJobsToFilters } from "../../helpers/jobSearch.js";

/* ═══════════════ SEARCH · MATCHED · SAVED · EMPLOYERS ═══════════════ */
function Filters({f,set,clear,n}){
  const A=use();
  const tog=(k,v)=>{const c=f[k]||[];set({...f,[k]:c.includes(v)?c.filter(x=>x!==v):[...c,v]});};
  const G=({t,children})=><div className="pb-6 mb-6 border-b border-line-soft"><Lbl>{t}</Lbl>{children}</div>;
  const R=({on,onClick,label,num})=><button onClick={onClick}
    className="flex items-center gap-3 w-full py-2.5 px-1.5 bg-transparent border-0 cursor-pointer text-left rounded-lg">
    <span className={`w-5 h-5 rounded-md shrink-0 border-2 flex items-center justify-center transition duration-150 ${on?"border-brand bg-brand":"border-line bg-white"}`}>{on&&<I n="check" s={12} c="#fff" w={3}/>}</span>
    <span className={`flex-1 text-sm text-text ${on?"font-semibold":"font-medium"}`}>{label}</span>
    {num!=null&&<span className="text-xs text-text-3">{num}</span>}</button>;
  return <div>
    <div className="flex justify-between items-center mb-6">
      <div className="text-base font-bold text-text tracking-tight">Filters</div>
      {n>0&&<button onClick={clear} className="bg-transparent border-0 cursor-pointer text-sm text-brand font-semibold p-0">Clear ({n})</button>}</div>
    <G t="Sector">{CATS.map(c=><R key={c.id} label={c.label} num={A.jobs.filter(j=>j.cat===c.id&&j.status==="live").length}
      on={(f.cats||[]).includes(c.id)} onClick={()=>tog("cats",c.id)}/>)}</G>
    <G t="Employment type">{["Full Time","Part Time","Contract","Seasonal","Apprenticeship"].map(t=>
      <R key={t} label={t} on={(f.types||[]).includes(t)} onClick={()=>tog("types",t)}/>)}</G>
    <G t="Work setting">{["On-site","Hybrid","Remote"].map(t=><R key={t} label={t} on={(f.modes||[]).includes(t)} onClick={()=>tog("modes",t)}/>)}</G>
    <G t="Province"><Sel value={f.prov||""} onChange={e=>set({...f,prov:e.target.value})}>
      <option value="">All provinces and territories</option>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></G>
    <G t="Experience">{["No experience required","Entry level welcome","1+ years","2+ years","3+ years","4+ years"].map(t=>
      <R key={t} label={t} on={(f.exps||[]).includes(t)} onClick={()=>tog("exps",t)}/>)}</G>
    <div><Lbl>Minimum pay (yearly equivalent)</Lbl>
      <Sel value={f.minPay||""} onChange={e=>set({...f,minPay:e.target.value})}>
        <option value="">Any pay</option>{[40000,50000,60000,75000,90000,110000].map(v=><option key={v} value={v}>${v/1000}k+ per year</option>)}</Sel></div>
  </div>;
}

export function SearchPage(){
  const A=use(); const mob=useMedia("(max-width: 960px)");
  const [q,setQ]=useState(A.search.q||""); const [where,setWhere]=useState(A.search.where||"");
  const [f,setF]=useState({cats:A.search.cats||[],types:A.search.types||[],modes:A.search.modes||[],
    exps:A.search.exps||[],prov:A.search.prov||"",minPay:A.search.minPay||""});
  const [sort,setSort]=useState(A.user?.role==="seeker"?"match":"recent");
  const [panel,setPanel]=useState(false);
  useEffect(()=>{setQ(A.search.q||"");setWhere(A.search.where||"");
    setF({cats:A.search.cats||[],types:A.search.types||[],modes:A.search.modes||[],
      exps:A.search.exps||[],prov:A.search.prov||"",minPay:A.search.minPay||""});},[A.search]);
  const n=(f.cats?.length||0)+(f.types?.length||0)+(f.modes?.length||0)+(f.exps?.length||0)+(f.prov?1:0)+(f.minPay?1:0);
  const clear=()=>setF({cats:[],types:[],modes:[],exps:[],prov:"",minPay:""});
  const res=useMemo(()=>{
    const o=matchJobsToFilters(A.jobs,{q,where,...f},{expandQuery:A.expandQuery,emp:A.emp});
    const c=[...o];
    if(sort==="match")c.sort((a,b)=>A.score(b)-A.score(a));
    if(sort==="pay")c.sort((a,b)=>annual(b)-annual(a));
    if(sort==="closing")c.sort((a,b)=>a.dl-b.dl);
    return c;
  },[q,where,f,sort,A.jobs,A.user]);

  return <div className="bg-white min-h-full">

    <section className={`bg-white border-b border-line-soft ${mob?"pt-10 px-4 pb-8":"pt-18 px-8 pb-12"}`}>
      <div className="max-w-6xl mx-auto text-center">
        <Tag tone="brand" icon="search">Search jobs</Tag>
        <h1 className={`font-extrabold tracking-tighter leading-none mt-5 mx-auto mb-5 max-w-3xl text-text ${mob?"text-3xl":"text-6xl"}`}>
          Find your next role.</h1>
        <p className={`text-text-2 leading-normal mx-auto mb-8 max-w-lg ${mob?"text-base":"text-lg"}`}>
          {A.jobs.filter(j=>j.status==="live").length.toLocaleString()} live openings across Canada. Every one shows the wage.</p>
        <div className={`bg-white rounded-2xl p-2 flex gap-2 shadow-md border border-line max-w-3xl mx-auto ${mob?"flex-wrap":"flex-nowrap"}`}>
          <div className="flex-[2_1_240px] min-w-0"><Input icon="search" placeholder="Job title, skill, trade or employer" value={q} onChange={e=>setQ(e.target.value)} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
          {!mob&&<div className="w-px bg-line my-2"/>}
          <div className="flex-[1_1_180px] min-w-0"><Input icon="pin" placeholder="City or province" value={where} onChange={e=>setWhere(e.target.value)} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
          {mob&&<Btn kind="outline" icon="sliders" onClick={()=>setPanel(true)} full>Filters{n?` (${n})`:""}</Btn>}
        </div>
      </div>
    </section>

    <section className={`bg-bg min-h-100 ${mob?"pt-5 px-4 pb-14":"pt-8 px-8 pb-24"}`}>
      <div className={`max-w-site mx-auto grid items-start ${mob?"grid-cols-1 gap-0":"grid-cols-[280px_1fr] gap-8"}`}>
        {!mob&&<div className="bg-white rounded-3xl p-6 border border-line sticky top-20">
          <Filters f={f} set={setF} clear={clear} n={n}/></div>}
        <div>
          <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
            <div className="text-base text-text-2"><strong className={`text-text font-bold tracking-tight ${mob?"text-lg":"text-2xl"}`}>{res.length}</strong> {res.length===1?"job":"jobs"}
              {q&&<> for "<strong className="text-text">{q}</strong>"</>}</div>
            {A.user?.role==="seeker"&&(q||where||f.cats?.length)&&<Btn kind="outline" size="sm" icon="bookmark"
              onClick={()=>{const nm=q||CATM[f.cats?.[0]]?.label||"Search";A.saveSearch(q,where,f.cats,nm,f);}}>Save this search</Btn>}
            <Sel value={sort} onChange={e=>setSort(e.target.value)} style={{width:mob?170:200,padding:"10px 14px",fontSize:14}}>
              {A.user?.role==="seeker"&&<option value="match">Best match</option>}
              <option value="recent">Most recent</option><option value="pay">Highest pay</option><option value="closing">Closing soon</option></Sel></div>
          {n>0&&<div className="flex gap-2 flex-wrap mb-5 items-center">
            {(f.cats||[]).map(c=><button key={c} onClick={()=>setF({...f,cats:f.cats.filter(x=>x!==c)})}
              className="flex items-center gap-1.5 bg-wash border border-line-2 text-brand text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer">{CATM[c].label}<I n="x" s={12} w={2.4}/></button>)}
            {[...(f.types||[]),...(f.modes||[]),...(f.exps||[])].map(t=><button key={t}
              onClick={()=>setF({...f,types:(f.types||[]).filter(x=>x!==t),modes:(f.modes||[]).filter(x=>x!==t),exps:(f.exps||[]).filter(x=>x!==t)})}
              className="flex items-center gap-1.5 bg-wash border border-line-2 text-brand text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer">{t}<I n="x" s={12} w={2.4}/></button>)}
            <button onClick={clear} className="bg-transparent border-0 text-text-2 text-sm cursor-pointer font-semibold">Clear all</button></div>}
          {res.length===0?<Empty icon="search" title="No jobs match those filters"
            body="Try removing a filter, searching a nearby city, or broadening the sector."
            action={<Btn kind="primary" onClick={()=>{clear();setQ("");setWhere("");}}>Reset search</Btn>}/>
            :<div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`}}>
              {res.map(j=><JobCard key={j.id} job={j}/>)}</div>}
        </div>
      </div>
    </section>

    {mob&&panel&&<Modal onClose={()=>setPanel(false)} title="Filters"><Filters f={f} set={setF} clear={clear} n={n}/>
      <Btn kind="primary" size="lg" full onClick={()=>setPanel(false)} style={{marginTop:14}}>Show {res.length} {res.length===1?"job":"jobs"}</Btn></Modal>}

  </div>;
}
