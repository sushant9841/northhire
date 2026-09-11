import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { useTranslation } from "../../i18n/i18n.jsx";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input, Empty, Lbl, Modal, Field, Area, CheckRow, Page, SmartPortrait, HERO_WIDE, HERO_TIGHT, SECTION_CLS } from "../../design/primitives.jsx";
import { EmpMark, JobCard } from "./cards.jsx";

export function EmployersPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const [q,setQ]=useState("");
  const {t}=useTranslation();
  const [verifiedOnly,setVerifiedOnly]=useState(A.employersPrefill==="verified");
  useEffect(()=>{if(A.employersPrefill){setVerifiedOnly(A.employersPrefill==="verified");A.setEmployersPrefill(null);}},[]);
  const list=A.employers.filter(e=>(!q||e.name.toLowerCase().includes(q.toLowerCase())||e.industry.toLowerCase().includes(q.toLowerCase()))&&(!verifiedOnly||e.verified));
  const heroPad=mob?"py-14 px-4":"py-24 px-8";
  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white`}>
      <div className="max-w-5xl mx-auto text-center">
        <Tag tone="brand" icon="building">{t("shared.employers.pageTag")}</Tag>
        <h1 className={`${HERO_TIGHT} mt-6 mb-7 mx-auto ${mob?"text-4xl":"text-7xl"}`}>
          {t("shared.employers.heroTitle")}</h1>
        <p className={`text-text-2 leading-normal mx-auto mb-8 max-w-xl ${mob?"text-lg":"text-xl"}`}>
          {t("shared.employers.heroBody")}</p>
        <div className="max-w-lg mx-auto flex gap-2.5 items-center">
          <Input icon="search" placeholder={t("shared.employers.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}/>
          <button onClick={()=>setVerifiedOnly(v=>!v)}
            className={`shrink-0 text-sm font-semibold py-3 px-4 rounded-xl border cursor-pointer transition-colors duration-150 ${verifiedOnly?"bg-brand text-white border-brand":"bg-white text-text-2 border-line"}`}>
            {t("shared.employers.verifiedOnlyBtn")}</button>
        </div>
      </div>
    </section>
    <section className={`bg-white ${mob?"px-4 pb-14":"px-8 pb-24"}`}>
      <div className="max-w-site mx-auto">
        {list.length===0?<Empty icon="building" title={t("shared.employers.noMatchTitle")} body={t("shared.employers.noMatchBody")}/>:
        <div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
          {list.map(e=>{const n=A.jobs.filter(j=>j.e===e.id&&j.status==="live").length;
            return <div key={e.id} onClick={()=>A.openEmployer(e.id)} role="button" tabIndex={0}
              onKeyDown={ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();A.openEmployer(e.id);}}}
              className="bg-white rounded-3xl p-6 border border-line cursor-pointer transition duration-200 hover:border-line-2 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <EmpMark e={e} size={56} radius={14}/>
                {e.verified&&<Tag tone="brand" sm icon="checkC2">{t("shared.employers.verifiedTag")}</Tag>}</div>
              <div className="text-lg font-bold text-text tracking-tight">{e.name}</div>
              <div className="text-sm text-text-2 mt-1.5">{e.industry} • {e.city}, {e.prov}</div>
              <div className="text-xs text-text-3 mt-2">{e.size} {e.size===1?t("common.employee"):t("common.employees")}</div>
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-line-soft">
                <span className="text-sm text-warn font-bold flex items-center gap-1.5"><I n="star" s={13} fill={C.warn} w={0}/>{e.rating}</span>
                <span className="text-sm text-brand font-bold">{n} open {n===1?t("shared.employers.openRole"):t("shared.employers.openRoles")}</span></div></div>;})}</div>}
      </div>
    </section>
  </div>;
}

export function EmployerPublicPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  /* Hooks before conditional return - conditionally-called hooks crash the tab. */
  const [showRev,setShowRev]=useState(false); const [revD,setRevD]=useState({rating:0,text:"",anon:false});
  const e=A.emp(A.empId);
  useEffect(()=>{ if(e?.id) A.loadEmployerReviews(e.id); },[e?.id]);
  if(!e) return <Page><Empty title={t("shared.employers.notFound")} body={t("shared.employers.notFoundBody")}/></Page>;
  const jobs=A.jobs.filter(j=>j.e===e.id&&j.status==="live");
  const reviews=A.reviews.filter(r=>r.employer===e.id).sort((a,b)=>b.at-a.at);
  const userReview=reviews.find(r=>r.user===A.user?.id);
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  return <div className="bg-white min-h-full">

    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        {!mob&&<button onClick={A.back} className="inline-flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2 mb-6"><I n="arrowL" s={17}/>{t("common.back")}</button>}
        <div className={`grid items-center ${mob?"grid-cols-1 gap-5":"grid-cols-[auto_1fr_auto] gap-7"}`}>
          <EmpMark e={e} size={mob?72:96} radius={20}/>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
              <h1 className={`${HERO_TIGHT} m-0 ${mob?"text-2xl":"text-4xl"}`}>{e.name}</h1>
              {e.verified&&<Tag tone="brand" icon="checkC2">{t("shared.employers.verifiedEmployer")}</Tag>}</div>
            <div className={`text-text-2 mb-2 ${mob?"text-sm":"text-base"}`}>
              {e.industry} • {e.city}, {e.prov} • {e.size} {e.size===1?t("common.employee"):t("common.employees")}</div>
            <div className="flex gap-3.5 items-center flex-wrap text-sm">
              <span className="text-warn flex items-center gap-1.5 font-bold"><I n="star" s={14} fill={C.warn} w={0}/>{e.rating} {t("shared.employers.rating")}</span>
              <span className="text-text-3">•</span>
              <span className="text-brand font-bold">{jobs.length} open {jobs.length===1?t("shared.employers.openRole"):t("shared.employers.openRoles")}</span></div></div>
          <Btn kind="primary" size="lg" icon="bell" onClick={()=>A.followEmployer(e.id)}>{A.following.has(e.id)?t("shared.employers.followingBtn"):t("shared.employers.followBtn")}</Btn></div>
      </div>
    </section>

    <section className={`bg-bg ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className={`max-w-6xl mx-auto grid items-start ${mob?"grid-cols-1 gap-6":"grid-cols-[1fr_340px] gap-8"}`}>
        <div>
          <div className={`bg-white rounded-3xl border border-line mb-6 ${mob?"p-7":"p-9"}`}>
            <Lbl>{t("shared.employers.aboutCompany",{company:e.name})}</Lbl>
            <p className="text-base text-text-2 leading-relaxed">{e.about}</p></div>

          {/* Reviews section */}
          <div className={`bg-white rounded-3xl border border-line mb-6 ${mob?"p-7":"p-9"}`}>
            <div className="flex justify-between items-center gap-3.5 mb-4 flex-wrap">
              <div>
                <Lbl style={{margin:0}}>{t("shared.employers.reviewsHeading")}</Lbl>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="text-2xl font-bold text-text tracking-tight">{e.rating||"—"}</div>
                  <div className="text-warn flex gap-0.5">{[1,2,3,4,5].map(n=><I key={n} n="star" s={16} fill={n<=Math.round(e.rating||0)?C.warn:"none"} c={C.warn} w={1.5}/>)}</div>
                  <div className="text-sm text-text-3">{t("shared.employers.reviewFrom")} {reviews.length} {reviews.length===1?t("shared.employers.review"):t("shared.employers.reviews")}</div>
                </div></div>
              {A.user?.role==="seeker"&&!userReview&&<Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowRev(true)}>{t("shared.employers.writeReview")}</Btn>}
            </div>
            {reviews.length===0
              ? <p className="text-sm text-text-3 mt-3 italic">{t("shared.employers.noReviewsYet")}</p>
              : <div className="flex flex-col gap-3.5">
                  {reviews.slice(0,3).map(rv=>{const author=A.person(rv.user);
                    return <div key={rv.id} className="p-4 bg-bg rounded-xl border border-line">
                      <div className="flex gap-3 items-center mb-2.5">
                        {!rv.anon&&author?<SmartPortrait seed={author.seed} size={36}/>:<div className="w-9 h-9 rounded-full bg-wash text-brand flex items-center justify-center"><I n="user" s={18}/></div>}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-text">{rv.anon?t("shared.employers.anonymousWorker"):author?.name||t("shared.employers.formerEmployee")}</div>
                          <div className="text-xs text-text-3 mt-0.5">{new Date(rv.at).toLocaleDateString("en-CA",{year:"numeric",month:"long"})}</div></div>
                        <div className="text-warn flex gap-px">{[1,2,3,4,5].map(n=><I key={n} n="star" s={13} fill={n<=rv.rating?C.warn:"none"} c={C.warn} w={1.5}/>)}</div>
                      </div>
                      <p className="text-sm text-text-2 leading-relaxed whitespace-pre-wrap">{rv.text}</p>
                      {rv.user===A.user?.id&&<Btn kind="ghost" size="xs" icon="trash" style={{marginTop:8}} onClick={()=>A.deleteReview(rv.id)}>{t("shared.employers.deleteMyReview")}</Btn>}
                    </div>;})}
                  {reviews.length>3&&<div className="text-sm text-text-3 text-center py-1.5">{t("shared.employers.moreReviews",{count:reviews.length-3})}</div>}
                </div>}
          </div>

          {showRev&&<Modal onClose={()=>setShowRev(false)} title={t("shared.employers.reviewModalTitle",{company:e.name})}>
            <div className="flex flex-col gap-3.5">
              <Field label={t("shared.employers.yourRating")} required>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRevD({...revD,rating:n})} className={`bg-transparent border-0 cursor-pointer p-0.5 ${n<=revD.rating?"text-warn":"text-line"}`}>
                    <I n="star" s={30} fill={n<=revD.rating?C.warn:"none"} c={n<=revD.rating?C.warn:C.text3} w={1.5}/></button>)}
                </div></Field>
              <Field label={t("shared.employers.yourReview")} required hint={t("shared.employers.reviewHint")}>
                <Area rows={5} value={revD.text} onChange={e=>setRevD({...revD,text:e.target.value})} placeholder={t("shared.employers.reviewPlaceholder")}/></Field>
              <CheckRow on={revD.anon} onChange={v=>setRevD({...revD,anon:v})} label={t("shared.employers.postAnonymously")} sub={t("shared.employers.anonSub")}/>
              <div className="flex gap-2.5 justify-end">
                <Btn kind="ghost" onClick={()=>setShowRev(false)}>{t("common.cancel")}</Btn>
                <Btn kind="primary" icon="check" disabled={!revD.rating||!revD.text.trim()} onClick={()=>{A.addReview(e.id,revD.rating,revD.text.trim(),revD.anon);setRevD({rating:0,text:"",anon:false});setShowRev(false);}}>{t("shared.employers.submitReview")}</Btn></div>
            </div></Modal>}

          <div className="mb-5">
            <h2 className={`${SECTION_CLS} mb-1.5 leading-tight ${mob?"text-2xl":"text-3xl"}`}>{t("shared.employers.currentOpenings")}</h2>
            <p className="text-sm text-text-2">{jobs.length} open {jobs.length===1?t("shared.employers.openPosition"):t("shared.employers.openPositions")}</p></div>
          {jobs.length===0?<Empty icon="briefcase" title={t("shared.employers.noOpenRoles")} body={t("shared.employers.followAlert",{company:e.name})}/>
            :<div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:290}px,1fr))`}}>
              {jobs.map(j=><JobCard key={j.id} job={j}/>)}</div>}</div>
        <div className={`bg-white rounded-3xl border border-line ${mob?"p-6":"p-7"}`}>
          <Lbl>{t("shared.employers.companyDetails")}</Lbl>
          {[[t("shared.employers.industry"),e.industry],[t("shared.employers.headOffice"),`${e.city}, ${e.prov}`],[t("shared.employers.companySize"),e.size],[t("shared.employers.founded"),e.founded],[t("shared.employers.website"),e.site]].map(([k,v],i,arr)=>
            <div key={k} className={`flex justify-between gap-3 py-3 text-sm ${i<arr.length-1?"border-b border-line-soft":""}`}>
              <span className="text-text-2">{k}</span><span className="font-semibold text-text text-right">{v}</span></div>)}</div>
      </div>
    </section>

  </div>;
}
