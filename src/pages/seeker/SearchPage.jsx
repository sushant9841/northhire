import { useState, useEffect, useMemo } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input, Sel, Empty, Lbl, Modal } from "../../design/primitives.jsx";
import { annual } from "../../helpers/utils.js";
import { CATS, CATM, PCODE, PROVS } from "../../store/seed/constants.js";
import { JobCard } from "../shared/cards.jsx";

/* ═══════════════ SEARCH · MATCHED · SAVED · EMPLOYERS ═══════════════ */
function Filters({f,set,clear,n}){
  const A=use();
  const tog=(k,v)=>{const c=f[k]||[];set({...f,[k]:c.includes(v)?c.filter(x=>x!==v):[...c,v]});};
  const G=({t,children})=><div style={{paddingBottom:22,marginBottom:22,borderBottom:`1px solid ${C.lineSoft}`}}><Lbl>{t}</Lbl>{children}</div>;
  const R=({on,onClick,label,num})=><button onClick={onClick} style={{display:"flex",alignItems:"center",gap:11,width:"100%",
    padding:"9px 6px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",borderRadius:8}}>
    <span style={{width:20,height:20,borderRadius:6,flexShrink:0,border:`1.5px solid ${on?C.brand:C.line}`,background:on?C.brand:"#fff",
      display:"flex",alignItems:"center",justifyContent:"center",transition:"all .16s"}}>{on&&<I n="check" s={12} c="#fff" w={3}/>}</span>
    <span style={{flex:1,fontSize:14,color:C.text,fontWeight:on?600:450}}>{label}</span>
    {num!=null&&<span style={{fontSize:12.5,color:C.text3}}>{num}</span>}</button>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <div style={{fontSize:16,fontWeight:700,color:C.text,letterSpacing:"-.02em"}}>Filters</div>
      {n>0&&<button onClick={clear} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
        fontSize:13.5,color:C.brand,fontWeight:640,padding:0}}>Clear ({n})</button>}</div>
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
  const [f,setF]=useState({cats:A.search.cats||[],types:[],modes:[],exps:[],prov:"",minPay:""});
  const [sort,setSort]=useState(A.user?.role==="seeker"?"match":"recent");
  const [panel,setPanel]=useState(false);
  useEffect(()=>{setQ(A.search.q||"");setWhere(A.search.where||"");setF(p=>({...p,cats:A.search.cats||[]}));},[A.search]);
  const n=(f.cats?.length||0)+(f.types?.length||0)+(f.modes?.length||0)+(f.exps?.length||0)+(f.prov?1:0)+(f.minPay?1:0);
  const clear=()=>setF({cats:[],types:[],modes:[],exps:[],prov:"",minPay:""});
  const res=useMemo(()=>{
    let o=A.jobs.filter(j=>j.status==="live");
    const s=q.trim().toLowerCase(),w=where.trim().toLowerCase();
    if(s){const terms=A.expandQuery(s);
      o=o.filter(j=>terms.some(t=>j.t.toLowerCase().includes(t)||A.emp(j.e).name.toLowerCase().includes(t)
        ||j.skills.some(k=>k.toLowerCase().includes(t))||CATM[j.cat].label.toLowerCase().includes(t)));}
    if(w)o=o.filter(j=>j.city.toLowerCase().includes(w)||j.prov.toLowerCase()===w||(PCODE[where.trim()]&&j.prov===PCODE[where.trim()])||j.mode.toLowerCase().includes(w));
    if(f.cats?.length)o=o.filter(j=>f.cats.includes(j.cat));
    if(f.types?.length)o=o.filter(j=>f.types.includes(j.type));
    if(f.modes?.length)o=o.filter(j=>f.modes.includes(j.mode));
    if(f.exps?.length)o=o.filter(j=>f.exps.includes(j.exp));
    if(f.prov)o=o.filter(j=>j.prov===PCODE[f.prov]);
    if(f.minPay)o=o.filter(j=>annual(j)>=Number(f.minPay));
    const c=[...o];
    if(sort==="match")c.sort((a,b)=>A.score(b)-A.score(a));
    if(sort==="pay")c.sort((a,b)=>annual(b)-annual(a));
    if(sort==="closing")c.sort((a,b)=>a.dl-b.dl);
    return c;
  },[q,where,f,sort,A.jobs,A.user]);

  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:mob?"40px 16px 32px":"72px 32px 48px",background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto",textAlign:"center"}}>
        <Tag tone="brand" icon="search">Search jobs</Tag>
        <h1 style={{fontSize:mob?32:56,fontWeight:770,letterSpacing:"-.05em",lineHeight:1.05,margin:"18px auto 20px",maxWidth:760,color:C.text}}>
          Find your next role.</h1>
        <p style={{fontSize:mob?15.5:18,color:C.text2,lineHeight:1.55,margin:"0 auto 32px",maxWidth:520}}>
          {A.jobs.filter(j=>j.status==="live").length.toLocaleString()} live openings across Canada. Every one shows the wage.</p>
        <div style={{background:"#fff",borderRadius:16,padding:8,display:"flex",gap:8,flexWrap:mob?"wrap":"nowrap",boxShadow:SH.md,border:`1px solid ${C.line}`,maxWidth:760,margin:"0 auto"}}>
          <div style={{flex:"2 1 240px",minWidth:0}}><Input icon="search" placeholder="Job title, skill, trade or employer" value={q} onChange={e=>setQ(e.target.value)} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
          {!mob&&<div style={{width:1,background:C.line,margin:"8px 0"}}/>}
          <div style={{flex:"1 1 180px",minWidth:0}}><Input icon="pin" placeholder="City or province" value={where} onChange={e=>setWhere(e.target.value)} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
          {mob&&<Btn kind="outline" icon="sliders" onClick={()=>setPanel(true)} full>Filters{n?` (${n})`:""}</Btn>}
        </div>
      </div>
    </section>

    <section style={{padding:mob?"20px 16px 56px":"32px 32px 96px",background:C.bg,minHeight:400}}>
      <div style={{maxWidth:1240,margin:"0 auto",display:"grid",gridTemplateColumns:mob?"1fr":"280px 1fr",gap:mob?0:32,alignItems:"start"}}>
        {!mob&&<div style={{background:"#fff",borderRadius:20,padding:24,border:`1px solid ${C.line}`,position:"sticky",top:80}}>
          <Filters f={f} set={setF} clear={clear} n={n}/></div>}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,gap:12,flexWrap:"wrap"}}>
            <div style={{fontSize:15.5,color:C.text2}}><strong style={{color:C.text,fontWeight:720,fontSize:mob?18:22,letterSpacing:"-.025em"}}>{res.length}</strong> {res.length===1?"job":"jobs"}
              {q&&<> for "<strong style={{color:C.text}}>{q}</strong>"</>}</div>
            {A.user?.role==="seeker"&&(q||where||f.cats?.length)&&<Btn kind="outline" size="sm" icon="bookmark"
              onClick={()=>{const nm=q||CATM[f.cats?.[0]]?.label||"Search";A.saveSearch(q,where,f.cats,nm);}}>Save this search</Btn>}
            <Sel value={sort} onChange={e=>setSort(e.target.value)} style={{width:mob?170:200,padding:"10px 14px",fontSize:14}}>
              {A.user?.role==="seeker"&&<option value="match">Best match</option>}
              <option value="recent">Most recent</option><option value="pay">Highest pay</option><option value="closing">Closing soon</option></Sel></div>
          {n>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
            {(f.cats||[]).map(c=><button key={c} onClick={()=>setF({...f,cats:f.cats.filter(x=>x!==c)})}
              style={{display:"flex",alignItems:"center",gap:6,background:C.wash,border:`1px solid ${C.line2}`,color:C.brand,
                fontSize:12.5,fontWeight:640,padding:"6px 11px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>{CATM[c].label}<I n="x" s={12} w={2.4}/></button>)}
            {[...(f.types||[]),...(f.modes||[]),...(f.exps||[])].map(t=><button key={t}
              onClick={()=>setF({...f,types:(f.types||[]).filter(x=>x!==t),modes:(f.modes||[]).filter(x=>x!==t),exps:(f.exps||[]).filter(x=>x!==t)})}
              style={{display:"flex",alignItems:"center",gap:6,background:C.wash,border:`1px solid ${C.line2}`,color:C.brand,
                fontSize:12.5,fontWeight:640,padding:"6px 11px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>{t}<I n="x" s={12} w={2.4}/></button>)}
            <button onClick={clear} style={{background:"none",border:"none",color:C.text2,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:620}}>Clear all</button></div>}
          {res.length===0?<Empty icon="search" title="No jobs match those filters"
            body="Try removing a filter, searching a nearby city, or broadening the sector."
            action={<Btn kind="primary" onClick={()=>{clear();setQ("");setWhere("");}}>Reset search</Btn>}/>
            :<div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`,gap:16}}>
              {res.map(j=><JobCard key={j.id} job={j}/>)}</div>}
        </div>
      </div>
    </section>

    {mob&&panel&&<Modal onClose={()=>setPanel(false)} title="Filters"><Filters f={f} set={setF} clear={clear} n={n}/>
      <Btn kind="primary" size="lg" full onClick={()=>setPanel(false)} style={{marginTop:14}}>Show {res.length} {res.length===1?"job":"jobs"}</Btn></Modal>}

  </div>;
}
