import { useEffect, useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Ring, Empty, Lbl, Banner, Page, Modal, Field, Area, HERO_TIGHT } from "../../design/primitives.jsx";
import { pay, payUnit, annual, dlText, money } from "../../helpers/utils.js";
import { EmpMark, HiringTypeBadge, JobCard } from "./cards.jsx";
import { AI_DISCLOSURE_TEXT, VACANCY_CONFIRMED_TEXT } from "../../helpers/jobPostingLaw.js";
import { useTranslation } from "../../i18n/i18n.jsx";

export function JobDetailPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const { t } = useTranslation();
  /* All hooks before any early return - a conditional useEffect is a Rules-of-Hooks violation
     that crashes when the job goes from initial-null to loaded (or the other way). */
  const [reporting,setReporting]=useState(false); const [reportReason,setReportReason]=useState(""); const [reportSent,setReportSent]=useState(false);
  const job=A.job(A.jobId);
  const e=job?A.emp(job.e):null;
  useEffect(()=>{ if(e?.id) A.loadEmployerReviews(e.id); },[e?.id]);
  if(!job) return <Page><Empty icon="briefcase" title={t("shared.jobDetail.notFound")} body={t("shared.jobDetail.notFoundBody")}
    action={<Btn kind="primary" onClick={()=>A.go("search")}>{t("shared.jobDetail.browseJobs")}</Btn>}/></Page>;
  const applied=A.appliedJobIds.has(job.id); const score=A.score(job);
  const relatedJobs=A.jobs.filter(j=>j.id!==job.id&&j.status==="live"&&(j.cat===job.cat||(j.city===job.city&&j.prov===job.prov))).slice(0,3);
  const employerReviews=A.reviews.filter(r=>r.employer===e.id);
  const Meta=({icon,k,v})=><div className="flex gap-3 items-start">
    <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-brand shrink-0"><I n={icon} s={17}/></div>
    <div className="min-w-0"><div className="text-xs text-text-3 mb-1 font-medium tracking-wide">{k}</div>
      <div className="text-sm font-semibold text-text leading-snug">{v}</div></div></div>;
  const Sec=({title,children})=><section className="mb-8">
    <div className={`font-bold text-text tracking-tight mb-3.5 ${mob?"text-lg":"text-xl"}`}>{title}</div>{children}</section>;
  const Bul=({items})=><ul className="m-0 p-0 list-none flex flex-col gap-3">
    {items.map(x=><li key={x} className="flex gap-3 text-base text-text-2 leading-relaxed">
      <span className="text-brand mt-1 shrink-0 flex"><I n="check" s={16} w={2.4}/></span>{x}</li>)}</ul>;

  const apply=()=>{ if(!A.user) return A.go("login"); if(A.user.role!=="seeker") return A.go("denied"); A.beginApply(job.id); };

  return <div className="bg-white min-h-full">

    <section className={`bg-white border-b border-line-soft ${mob?"pt-5 px-4 pb-8":"pt-9 px-8 pb-11"}`}>
      <div className="max-w-6xl mx-auto">
        {!mob&&<button onClick={A.back} className="inline-flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2 mb-6"><I n="arrowL" s={17}/>{t("shared.jobDetail.back")}</button>}
        <div className={`grid ${mob?"grid-cols-1 gap-5 items-start":"grid-cols-[auto_1fr_auto] gap-6 items-center"}`}>
          <EmpMark e={e} size={mob?64:84} radius={18}/>
          <div className="min-w-0">
            <h1 className={`${HERO_TIGHT} m-0 ${mob?"text-2xl":"text-4xl"}`}>{job.t}</h1>
            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap text-base text-text-2">
              <button onClick={()=>A.openEmployer(e.id)} className="bg-transparent border-0 p-0 cursor-pointer text-base font-bold text-brand">{e.name}</button>
              {e.verified&&<Tag tone="brand" sm icon="checkC2">{t("shared.jobDetail.verified")}</Tag>}
              {e.rating>0&&<button onClick={()=>A.openEmployer(e.id)} className="bg-transparent border-0 p-0 cursor-pointer flex items-center gap-1 text-sm text-warn font-semibold">
                <I n="star" s={14} fill={C.warn} w={0}/>{e.rating}<span className="text-text-3 font-normal">({employerReviews.length} {employerReviews.length===1?t("shared.jobDetail.review"):t("shared.jobDetail.reviews")})</span></button>}
              <span className="text-text-3">•</span><span>{job.city}, {job.prov}</span></div>
            <div className="flex gap-2 flex-wrap mt-3.5">
              <HiringTypeBadge jobId={job.id}/>
              <Tag icon="clock">{job.type}</Tag>
              {job.mode!=="On-site"&&<Tag tone="ok" icon="globe">{job.mode}</Tag>}
              {job.urgent&&<Tag tone="warn" icon="alert">{t("shared.jobDetail.urgentHiring")}</Tag>}
              <Tag tone={job.dl<=7?"danger":"neutral"} icon="calendar">{dlText(job.dl)}</Tag></div></div>
          {A.user?.role==="seeker"&&!mob&&<Ring v={score} size={72} label={t("shared.jobDetail.yourMatch")}/>}
        </div>
      </div>
    </section>

    <section className={`bg-bg ${mob?"pt-6 px-4 pb-25":"pt-10 px-8 pb-24"}`}>
      <div className={`max-w-6xl mx-auto grid items-start ${mob?"grid-cols-1 gap-5":"grid-cols-[1fr_340px] gap-8"}`}>
        <div className={`bg-white rounded-3xl border border-line ${mob?"p-6":"p-9"}`}>
          <div className={`bg-tint border border-line-2 rounded-2xl mb-8 ${mob?"py-5 px-6":"py-7 px-7"}`}>
            <div className="text-xs text-brand font-bold tracking-widest uppercase mb-2">{t("shared.jobDetail.offeredSalary")}</div>
            <div className={`font-extrabold text-brand tracking-tighter leading-none ${mob?"text-3xl":"text-5xl"}`}>
              {pay(job)} <span className={`font-semibold opacity-75 ${mob?"text-lg":"text-xl"}`}>{payUnit(job)}</span></div>
            {job.unit!=="yr"&&<div className="text-sm text-text-2 mt-2.5">
              {t("shared.jobDetail.annualizedNote",{annual:money(annual(job))})}</div>}</div>
          <div className="grid gap-6 mb-9" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?150:200}px,1fr))`}}>
            <Meta icon="users" k={t("shared.jobDetail.vacancies")} v={`${job.vac} ${job.vac===1?t("shared.jobDetail.position"):t("shared.jobDetail.positions")}`}/>
            <Meta icon="pin" k={t("shared.jobDetail.location")} v={`${job.city}, ${job.prov}`}/>
            <Meta icon="award" k={t("shared.jobDetail.experience")} v={job.exp}/>
            <Meta icon="cap" k={t("shared.jobDetail.education")} v={job.edu}/>
            <Meta icon="briefcase" k={t("shared.jobDetail.employment")} v={job.type}/>
            <Meta icon="calendar" k={t("shared.jobDetail.applyBefore")} v={dlText(job.dl)}/></div>
          {A.jobHiringType(job.id)==="agency-perm"&&<Banner tone="brand" icon="award" title={t("shared.jobDetail.recruiterSearch")} style={{marginBottom:24}}>
            {t("shared.jobDetail.recruiterSearchBody",{company:e.name})}
          </Banner>}
          <Sec title={t("shared.jobDetail.aboutRole")}><p className="text-base text-text-2 leading-relaxed">{job.desc}</p></Sec>
          <Sec title={t("shared.jobDetail.whatYouWillDo")}><Bul items={job.duties}/></Sec>
          <Sec title={t("shared.jobDetail.whatWeLookFor")}><Bul items={job.reqs}/></Sec>
          <Sec title={t("shared.jobDetail.skillsCerts")}>
            <div className="flex flex-wrap gap-2">
              {job.skills.map(s=>{const mine=A.user?.role==="seeker"&&(A.user.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
                return <Tag key={s} tone={mine?"ok":"neutral"} icon={mine?"check":undefined}>{s}</Tag>;})}</div>
            {A.user?.role==="seeker"&&<div className="text-sm text-text-3 mt-3">{t("shared.jobDetail.highlightedSkills")}</div>}</Sec>
          <Sec title={t("shared.jobDetail.benefitsOffered")}>
            <div className="grid gap-2.5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?220:260}px,1fr))`}}>
              {job.perks.map(p=><div key={p} className="flex gap-3 items-center bg-ok-bg border border-ok-ln rounded-xl py-3.5 px-4">
                <span className="text-ok flex shrink-0"><I n="check" s={16} w={2.4}/></span>
                <span className="text-sm text-text font-medium">{p}</span></div>)}</div></Sec>
          <Sec title={t("shared.jobDetail.howToApply")}><p className="text-base text-text-2 leading-relaxed">{job.how}</p></Sec>
          {/* Ontario Bill 149 requires these disclosures to appear on the posting itself, not
              just be collected from the employer. See helpers/jobPostingLaw.js. */}
          {(job.aiScreening||job.vacancyConfirmed)&&<Sec title={t("shared.jobDetail.transparency")}>
            <div className="flex flex-col gap-2.5">
              {job.aiScreening&&<div className="flex gap-3 items-start bg-bg border border-line rounded-xl py-3.5 px-4">
                <span className="text-text-3 flex shrink-0 mt-0.5"><I n="sparkle" s={16}/></span>
                <span className="text-sm text-text-2 leading-relaxed">{AI_DISCLOSURE_TEXT}{" "}
                  <button onClick={()=>A.go("matchScore")} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand underline">{t("shared.jobDetail.seeExactly")}</button>
                </span></div>}
              {job.vacancyConfirmed&&<div className="flex gap-3 items-start bg-bg border border-line rounded-xl py-3.5 px-4">
                <span className="text-ok flex shrink-0 mt-0.5"><I n="check" s={16} w={2.4}/></span>
                <span className="text-sm text-text-2 leading-relaxed">{VACANCY_CONFIRMED_TEXT}</span></div>}
            </div></Sec>}
        </div>

        {!mob&&<div className="sticky top-20 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-line">
            {A.user?.role==="seeker"&&<div className="pb-5 mb-5 border-b border-line-soft">
              <div className="flex items-center gap-3.5">
                <Ring v={score} size={56}/><div><div className="text-sm font-bold text-text">{t("shared.jobDetail.matchScore")}</div>
                  <div className="text-sm text-text-2 mt-1">{t("shared.jobDetail.fromSkills")}</div>
                  <button onClick={()=>A.go("matchScore")} className="bg-transparent border-0 p-0 mt-1 cursor-pointer text-xs font-semibold text-brand underline">{t("shared.jobDetail.howCalculated")}</button></div></div>
              {A.matchReasons(job).length>0&&<div className="flex flex-wrap gap-1.5 mt-3.5">
                {A.matchReasons(job).map(r=><Tag key={r} tone="ok" sm icon="check">{r}</Tag>)}</div>}</div>}
            <Btn kind={applied?"soft":"primary"} size="lg" full disabled={applied} icon={applied?"check":"send"} onClick={apply}>
              {applied?t("shared.jobDetail.applicationSent"):t("shared.jobDetail.applyJob")}</Btn>
            <div className="flex gap-2.5 mt-3">
              <Btn kind="outline" full onClick={()=>A.toggleSave(job.id)} icon="bookmark">{A.saved.has(job.id)?t("shared.jobDetail.saved"):t("shared.jobDetail.save")}</Btn>
              <Btn kind="outline" full icon="share" onClick={()=>A.share(job)}>{t("shared.jobDetail.share")}</Btn></div>
            <div className="flex justify-between text-xs text-text-3 mt-5 pt-4 border-t border-line-soft">
              <span>{job.views.toLocaleString()} {t("shared.jobDetail.views")}</span><span>{t("shared.jobDetail.posted")} {job.posted}</span></div></div>
          <div className="bg-white rounded-3xl p-6 border border-line">
            <Lbl>{t("shared.jobDetail.aboutEmployer")}</Lbl>
            <div className="flex gap-3.5 items-center mb-3.5">
              <EmpMark e={e} size={48} radius={12}/>
              <div className="min-w-0"><div className="text-base font-bold text-text">{e.name}</div>
                <div className="text-sm text-text-2 mt-0.5">{e.industry} • {e.size} {t("shared.jobDetail.staff")}</div></div></div>
            <p className="text-sm text-text-2 leading-relaxed mb-4">{e.about}</p>
            <Btn kind="outline" size="sm" full iconR="chevR" onClick={()=>A.openEmployer(e.id)}>{t("shared.jobDetail.allOpenings")}</Btn></div>
          {A.user?.role==="seeker"&&(()=>{const g=A.skillsGap(job);
            if(!g.missing.length)return null;
            return <div className="bg-white rounded-3xl p-6 border border-line">
              <div className="flex justify-between items-center mb-3">
                <Lbl style={{margin:0}}>{t("shared.jobDetail.skillsGap")}</Lbl>
                <Tag tone="brand" sm>{g.current} → {g.potential}</Tag></div>
              <p className="text-sm text-text-2 mb-3 leading-normal"
                dangerouslySetInnerHTML={{__html:t("shared.jobDetail.addSkills",{gap:g.potential-g.current})}}></p>
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {g.missing.map(s=><Tag key={s} sm icon="plus">{s}</Tag>)}</div>
              <Btn kind="outline" size="sm" full onClick={()=>A.go("profile")}>{t("shared.jobDetail.updateSkills")}</Btn></div>;})()}
          {(()=>{const s=A.salaryInsight(job.t,job.prov);
            if(!s)return null;
            /* salaryInsight always computes in annualized terms internally (the only way to
               compare an hourly trades job against a salaried office job on one scale) - but
               showing ONLY that figure for an hourly/per-mile posting, with no link back to the
               job's own $/hr or $/mi terms, forced the reader to mentally convert. Show both. */
            const perUnit=job.unit==="hr"?v=>v/2080:job.unit==="mi"?v=>v/110000:null;
            const unitLabel=job.unit==="hr"?"/hr":job.unit==="mi"?"/mi":null;
            return <div className="bg-white rounded-3xl p-6 border border-line">
              <Lbl>{t("shared.jobDetail.salaryInsight")}</Lbl>
              <p className="text-sm text-text-2 mb-3.5 leading-normal">
                {t("shared.jobDetail.basedOn",{count:s.count,prov:job.prov})}</p>
              <div className="grid grid-cols-3 gap-2 mb-3.5">
                {[[t("shared.jobDetail.low"),s.p25],[t("shared.jobDetail.median"),s.median],[t("shared.jobDetail.high"),s.p75]].map(([lbl,v],i)=>
                  <div key={lbl} className={`text-center py-3 px-1.5 rounded-xl border ${i===1?"bg-tint border-line-2":"bg-bg border-line"}`}>
                    <div className="text-xs text-text-3 font-semibold tracking-wide uppercase">{lbl}</div>
                    <div className={`text-base font-bold mt-1 tracking-tight ${i===1?"text-brand":"text-text"}`}>${Math.round(v/1000)}k</div>
                    {perUnit&&<div className="text-xs text-text-3 mt-0.5">${perUnit(v).toFixed(2)}{unitLabel}</div>}</div>)}</div>
              <div className="text-xs text-text-3 text-center">{perUnit?t(job.unit==="hr"?"shared.jobDetail.annualizedHourly":"shared.jobDetail.annualizedMiles",{unit:unitLabel}):t("shared.jobDetail.annualizedFull")}</div></div>;})()}
        </div>}
      </div>

      {/* Page-bottom Apply CTA */}
      <div className={`max-w-site ${mob?"mx-auto pt-6 px-4 pb-8":"mt-8 mx-auto px-8 pb-10"}`}>
        <div className={`bg-[linear-gradient(135deg,var(--color-tint)_0%,#F0F7FF_100%)] border border-line-2 rounded-3xl text-center ${mob?"p-6":"p-9"}`}>
          <div className={`font-bold text-text tracking-tight mb-2 ${mob?"text-lg":"text-2xl"}`}>{t("shared.jobDetail.readyToApply")}</div>
          <div className="text-sm text-text-2 max-w-lg mx-auto mb-5 leading-relaxed">{applied?t("shared.jobDetail.appliedMsg"):t("shared.jobDetail.notAppliedMsg",{company:e.name})}</div>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Btn kind={applied?"soft":"primary"} size="lg" iconR={applied?"check":"arrowR"} disabled={applied} onClick={apply}>
              {applied?t("shared.jobDetail.applicationSent"):t("shared.jobDetail.applyRole")}</Btn>
            <Btn kind="outline" size="lg" onClick={()=>A.toggleSave(job.id)} icon="bookmark">{A.saved.has(job.id)?t("shared.jobDetail.saved"):t("shared.jobDetail.saveForLater")}</Btn>
          </div>
          {A.user?.role==="seeker"&&<button type="button" onClick={()=>{setReportReason("");setReportSent(false);setReporting(true);}}
            className="bg-transparent border-0 p-0 mt-4 text-xs text-text-3 cursor-pointer underline">{t("shared.jobDetail.reportListing")}</button>}
        </div>
      </div>

      {relatedJobs.length>0&&<div className={`max-w-site mx-auto ${mob?"px-4 pb-8":"px-8 pb-10"}`}>
        <Lbl>{t("shared.jobDetail.similarRoles")}</Lbl>
        <div className="grid gap-3.5 mt-2" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(280px,1fr))"}}>
          {relatedJobs.map(j=><JobCard key={j.id} job={j}/>)}
        </div>
      </div>}
    </section>

    {A.noCvGateJobId===job.id&&<Modal onClose={A.closeNoCvGate} title={t("shared.jobDetail.noCvGateTitle")}>
      <p className="text-sm text-text-2 leading-relaxed mb-4">{t("shared.jobDetail.noCvGateBody")}</p>
      <div className="flex gap-2.5 justify-end flex-wrap">
        <Btn kind="ghost" onClick={A.closeNoCvGate}>{t("shared.jobDetail.noCvGateNotNow")}</Btn>
        <Btn kind="primary" icon="plus" onClick={()=>{A.closeNoCvGate();A.go("cvs");}}>{t("shared.jobDetail.noCvGateCreate")}</Btn>
      </div>
    </Modal>}

    {reporting&&<Modal onClose={()=>setReporting(false)} title={t("shared.jobDetail.reportTitle")}>
      {reportSent?<div className="text-center py-4">
        <div className="text-2xl mb-2">✓</div>
        <div className="text-sm text-text-2">Thanks — an administrator will review this listing.</div>
      </div>:<div className="flex flex-col gap-3.5">
        <Field label={t("shared.jobDetail.whatsWrong")} required>
          <Area rows={3} value={reportReason} onChange={e=>setReportReason(e.target.value)} placeholder={t("shared.jobDetail.reportPlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setReporting(false)}>{t("shared.jobDetail.cancel")}</Btn>
          <Btn kind="danger" disabled={!reportReason.trim()} onClick={async()=>{
            const r=await A.reportJob(job.id,reportReason.trim());
            if(r.ok)setReportSent(true); else A.toast(r.msg,"danger");
          }}>{t("shared.jobDetail.submitReport")}</Btn>
        </div>
      </div>}
    </Modal>}

    {mob&&<div className="sticky bottom-0 bg-white/97 backdrop-blur-md border-t border-line py-3 px-4 flex gap-2.5 z-300">
      <Btn kind="outline" onClick={()=>A.toggleSave(job.id)} icon="bookmark" style={{flexShrink:0}}>{A.saved.has(job.id)?t("shared.jobDetail.saved"):t("shared.jobDetail.save")}</Btn>
      <Btn kind={applied?"soft":"primary"} full disabled={applied} icon={applied?"check":"send"} onClick={apply}>{applied?t("shared.jobDetail.applied"):t("shared.jobDetail.applyNow")}</Btn></div>}
  </div>;
}
