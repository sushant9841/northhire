import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input, Empty, Lbl, Modal, Field, Area, CheckRow, Page, SmartPortrait } from "../../design/primitives.jsx";
import { EmpMark, JobCard } from "./cards.jsx";

export function EmployersPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const [q,setQ]=useState("");
  const [verifiedOnly,setVerifiedOnly]=useState(A.employersPrefill==="verified");
  useEffect(()=>{if(A.employersPrefill){setVerifiedOnly(A.employersPrefill==="verified");A.setEmployersPrefill(null);}},[]);
  const list=A.employers.filter(e=>(!q||e.name.toLowerCase().includes(q.toLowerCase())||e.industry.toLowerCase().includes(q.toLowerCase()))&&(!verifiedOnly||e.verified));
  const heroPad=mob?"py-14 px-4":"py-24 px-8";
  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white`}>
      <div className="max-w-5xl mx-auto text-center">
        <Tag tone="brand" icon="building">Employers</Tag>
        <h1 className={`font-extrabold tracking-tighter leading-none mt-6 mb-7 text-text mx-auto ${mob?"text-4xl":"text-7xl"}`}>
          Companies actively hiring across Canada</h1>
        <p className={`text-text-2 leading-normal mx-auto mb-8 max-w-xl ${mob?"text-lg":"text-xl"}`}>
          Every employer on NorthHire is verified, and every listing shows the wage. Browse by sector, size, or the province where you want to work.</p>
        <div className="max-w-lg mx-auto flex gap-2.5 items-center">
          <Input icon="search" placeholder="Search company or industry" value={q} onChange={e=>setQ(e.target.value)}/>
          <button onClick={()=>setVerifiedOnly(v=>!v)}
            className={`shrink-0 text-sm font-semibold py-3 px-4 rounded-xl border cursor-pointer transition-colors duration-150 ${verifiedOnly?"bg-brand text-white border-brand":"bg-white text-text-2 border-line"}`}>
            Verified only</button>
        </div>
      </div>
    </section>
    <section className={`bg-white ${mob?"px-4 pb-14":"px-8 pb-24"}`}>
      <div className="max-w-site mx-auto">
        {list.length===0?<Empty icon="building" title="No employers match" body="Try a different search, or turn off the verified-only filter."/>:
        <div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
          {list.map(e=>{const n=A.jobs.filter(j=>j.e===e.id&&j.status==="live").length;
            return <div key={e.id} onClick={()=>A.openEmployer(e.id)} role="button" tabIndex={0}
              onKeyDown={ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();A.openEmployer(e.id);}}}
              className="bg-white rounded-3xl p-6 border border-line cursor-pointer transition duration-200 hover:border-line-2 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <EmpMark e={e} size={56} radius={14}/>
                {e.verified&&<Tag tone="brand" sm icon="checkC2">Verified</Tag>}</div>
              <div className="text-lg font-bold text-text tracking-tight">{e.name}</div>
              <div className="text-sm text-text-2 mt-1.5">{e.industry} • {e.city}, {e.prov}</div>
              <div className="text-xs text-text-3 mt-2">{e.size} employees</div>
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-line-soft">
                <span className="text-sm text-warn font-bold flex items-center gap-1.5"><I n="star" s={13} fill={C.warn} w={0}/>{e.rating}</span>
                <span className="text-sm text-brand font-bold">{n} open {n===1?"role":"roles"}</span></div></div>;})}</div>}
      </div>
    </section>
  </div>;
}

export function EmployerPublicPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showRev,setShowRev]=useState(false); const [revD,setRevD]=useState({rating:0,text:"",anon:false});
  const e=A.emp(A.empId); if(!e) return <Page><Empty title="Employer not found" body="This company profile is unavailable."/></Page>;
  const jobs=A.jobs.filter(j=>j.e===e.id&&j.status==="live");
  const reviews=A.reviews.filter(r=>r.employer===e.id).sort((a,b)=>b.at-a.at);
  const userReview=reviews.find(r=>r.user===A.user?.id);
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  return <div className="bg-white min-h-full">

    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        {!mob&&<button onClick={A.back} className="inline-flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2 mb-6"><I n="arrowL" s={17}/>Back</button>}
        <div className={`grid items-center ${mob?"grid-cols-1 gap-5":"grid-cols-[auto_1fr_auto] gap-7"}`}>
          <EmpMark e={e} size={mob?72:96} radius={20}/>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
              <h1 className={`font-extrabold tracking-tighter m-0 text-text leading-none ${mob?"text-2xl":"text-4xl"}`}>{e.name}</h1>
              {e.verified&&<Tag tone="brand" icon="checkC2">Verified employer</Tag>}</div>
            <div className={`text-text-2 mb-2 ${mob?"text-sm":"text-base"}`}>
              {e.industry} • {e.city}, {e.prov} • {e.size} employees</div>
            <div className="flex gap-3.5 items-center flex-wrap text-sm">
              <span className="text-warn flex items-center gap-1.5 font-bold"><I n="star" s={14} fill={C.warn} w={0}/>{e.rating} rating</span>
              <span className="text-text-3">•</span>
              <span className="text-brand font-bold">{jobs.length} open {jobs.length===1?"role":"roles"}</span></div></div>
          <Btn kind="primary" size="lg" icon="bell" onClick={()=>A.followEmployer(e.id)}>{A.following.has(e.id)?"Following":"Follow"}</Btn></div>
      </div>
    </section>

    <section className={`bg-bg ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className={`max-w-6xl mx-auto grid items-start ${mob?"grid-cols-1 gap-6":"grid-cols-[1fr_340px] gap-8"}`}>
        <div>
          <div className={`bg-white rounded-3xl border border-line mb-6 ${mob?"p-7":"p-9"}`}>
            <Lbl>About {e.name}</Lbl>
            <p className="text-base text-text-2 leading-relaxed">{e.about}</p></div>

          {/* Reviews section */}
          <div className={`bg-white rounded-3xl border border-line mb-6 ${mob?"p-7":"p-9"}`}>
            <div className="flex justify-between items-center gap-3.5 mb-4 flex-wrap">
              <div>
                <Lbl style={{margin:0}}>Reviews from workers</Lbl>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="text-2xl font-bold text-text tracking-tight">{e.rating||"—"}</div>
                  <div className="text-warn flex gap-0.5">{[1,2,3,4,5].map(n=><I key={n} n="star" s={16} fill={n<=Math.round(e.rating||0)?C.warn:"none"} c={C.warn} w={1.5}/>)}</div>
                  <div className="text-sm text-text-3">from {reviews.length} review{reviews.length===1?"":"s"}</div>
                </div></div>
              {A.user?.role==="seeker"&&!userReview&&<Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowRev(true)}>Write a review</Btn>}
            </div>
            {reviews.length===0
              ? <p className="text-sm text-text-3 mt-3 italic">No reviews yet. Be the first to share your experience.</p>
              : <div className="flex flex-col gap-3.5">
                  {reviews.slice(0,3).map(rv=>{const author=A.person(rv.user);
                    return <div key={rv.id} className="p-4 bg-bg rounded-xl border border-line">
                      <div className="flex gap-3 items-center mb-2.5">
                        {!rv.anon&&author?<SmartPortrait seed={author.seed} size={36}/>:<div className="w-9 h-9 rounded-full bg-wash text-brand flex items-center justify-center"><I n="user" s={18}/></div>}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-text">{rv.anon?"Anonymous worker":author?.name||"Former employee"}</div>
                          <div className="text-xs text-text-3 mt-0.5">{new Date(rv.at).toLocaleDateString("en-CA",{year:"numeric",month:"long"})}</div></div>
                        <div className="text-warn flex gap-px">{[1,2,3,4,5].map(n=><I key={n} n="star" s={13} fill={n<=rv.rating?C.warn:"none"} c={C.warn} w={1.5}/>)}</div>
                      </div>
                      <p className="text-sm text-text-2 leading-relaxed whitespace-pre-wrap">{rv.text}</p>
                      {rv.user===A.user?.id&&<Btn kind="ghost" size="xs" icon="trash" style={{marginTop:8}} onClick={()=>A.deleteReview(rv.id)}>Delete my review</Btn>}
                    </div>;})}
                  {reviews.length>3&&<div className="text-sm text-text-3 text-center py-1.5">+ {reviews.length-3} more reviews</div>}
                </div>}
          </div>

          {showRev&&<Modal onClose={()=>setShowRev(false)} title={`Review ${e.name}`}>
            <div className="flex flex-col gap-3.5">
              <Field label="Your rating" required>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRevD({...revD,rating:n})} className={`bg-transparent border-0 cursor-pointer p-0.5 ${n<=revD.rating?"text-warn":"text-line"}`}>
                    <I n="star" s={30} fill={n<=revD.rating?C.warn:"none"} c={n<=revD.rating?C.warn:C.text3} w={1.5}/></button>)}
                </div></Field>
              <Field label="Your review" required hint="Share what you liked and what could be better. Please be constructive.">
                <Area rows={5} value={revD.text} onChange={e=>setRevD({...revD,text:e.target.value})} placeholder="Great crew, safety-focused site management, competitive pay. Overtime was frequent though."/></Field>
              <CheckRow on={revD.anon} onChange={v=>setRevD({...revD,anon:v})} label="Post anonymously" sub="Your name won't appear next to this review."/>
              <div className="flex gap-2.5 justify-end">
                <Btn kind="ghost" onClick={()=>setShowRev(false)}>Cancel</Btn>
                <Btn kind="primary" icon="check" disabled={!revD.rating||!revD.text.trim()} onClick={()=>{A.addReview(e.id,revD.rating,revD.text.trim(),revD.anon);setRevD({rating:0,text:"",anon:false});setShowRev(false);}}>Submit review</Btn></div>
            </div></Modal>}

          <div className="mb-5">
            <h2 className={`font-bold tracking-tight text-text mb-1.5 leading-tight ${mob?"text-2xl":"text-3xl"}`}>Current openings</h2>
            <p className="text-sm text-text-2">{jobs.length} open {jobs.length===1?"position":"positions"}</p></div>
          {jobs.length===0?<Empty icon="briefcase" title="No open roles right now" body={`Follow ${e.name} and we will alert you when they post.`}/>
            :<div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:290}px,1fr))`}}>
              {jobs.map(j=><JobCard key={j.id} job={j}/>)}</div>}</div>
        <div className={`bg-white rounded-3xl border border-line ${mob?"p-6":"p-7"}`}>
          <Lbl>Company details</Lbl>
          {[["Industry",e.industry],["Head office",`${e.city}, ${e.prov}`],["Company size",e.size],["Founded",e.founded],["Website",e.site]].map(([k,v],i,arr)=>
            <div key={k} className={`flex justify-between gap-3 py-3 text-sm ${i<arr.length-1?"border-b border-line-soft":""}`}>
              <span className="text-text-2">{k}</span><span className="font-semibold text-text text-right">{v}</span></div>)}</div>
      </div>
    </section>

  </div>;
}
