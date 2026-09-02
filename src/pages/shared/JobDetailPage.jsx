import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Ring, Empty, Lbl, Banner, Page } from "../../design/primitives.jsx";
import { pay, payUnit, annual, dlText, money } from "../../helpers/utils.js";
import { EmpMark, HiringTypeBadge } from "./cards.jsx";

export function JobDetailPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const job=A.job(A.jobId); if(!job) return <Page><Empty icon="briefcase" title="Job not found" body="This listing may have been closed or removed."
    action={<Btn kind="primary" onClick={()=>A.go("search")}>Browse jobs</Btn>}/></Page>;
  const e=A.emp(job.e); const applied=A.appliedJobIds.has(job.id); const score=A.score(job);
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
        {!mob&&<button onClick={A.back} className="inline-flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2 mb-6"><I n="arrowL" s={17}/>Back</button>}
        <div className={`grid ${mob?"grid-cols-1 gap-5 items-start":"grid-cols-[auto_1fr_auto] gap-6 items-center"}`}>
          <EmpMark e={e} size={mob?64:84} radius={18}/>
          <div className="min-w-0">
            <h1 className={`font-extrabold tracking-tighter text-text m-0 leading-none ${mob?"text-2xl":"text-4xl"}`}>{job.t}</h1>
            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap text-base text-text-2">
              <button onClick={()=>A.openEmployer(e.id)} className="bg-transparent border-0 p-0 cursor-pointer text-base font-bold text-brand">{e.name}</button>
              {e.verified&&<Tag tone="brand" sm icon="checkC2">Verified</Tag>}
              <span className="text-text-3">•</span><span>{job.city}, {job.prov}</span></div>
            <div className="flex gap-2 flex-wrap mt-3.5">
              <HiringTypeBadge jobId={job.id}/>
              <Tag icon="clock">{job.type}</Tag>
              {job.mode!=="On-site"&&<Tag tone="ok" icon="globe">{job.mode}</Tag>}
              {job.urgent&&<Tag tone="warn" icon="alert">Urgent hiring</Tag>}
              <Tag tone={job.dl<=7?"danger":"neutral"} icon="calendar">{dlText(job.dl)}</Tag></div></div>
          {A.user?.role==="seeker"&&!mob&&<Ring v={score} size={72} label="Your match"/>}
        </div>
      </div>
    </section>

    <section className={`bg-bg ${mob?"pt-6 px-4 pb-25":"pt-10 px-8 pb-24"}`}>
      <div className={`max-w-6xl mx-auto grid items-start ${mob?"grid-cols-1 gap-5":"grid-cols-[1fr_340px] gap-8"}`}>
        <div className={`bg-white rounded-3xl border border-line ${mob?"p-6":"p-9"}`}>
          <div className={`bg-tint border border-line-2 rounded-2xl mb-8 ${mob?"py-5 px-6":"py-7 px-7"}`}>
            <div className="text-xs text-brand font-bold tracking-widest uppercase mb-2">Offered salary</div>
            <div className={`font-extrabold text-brand tracking-tighter leading-none ${mob?"text-3xl":"text-5xl"}`}>
              {pay(job)} <span className={`font-semibold opacity-75 ${mob?"text-lg":"text-xl"}`}>{payUnit(job)}</span></div>
            {job.unit!=="yr"&&<div className="text-sm text-text-2 mt-2.5">
              Roughly {money(annual(job))} per year at full-time hours</div>}</div>
          <div className="grid gap-6 mb-9" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?150:200}px,1fr))`}}>
            <Meta icon="users" k="Vacancies" v={`${job.vac} ${job.vac===1?"position":"positions"}`}/>
            <Meta icon="pin" k="Location" v={`${job.city}, ${job.prov}`}/>
            <Meta icon="award" k="Experience" v={job.exp}/>
            <Meta icon="cap" k="Education" v={job.edu}/>
            <Meta icon="briefcase" k="Employment" v={job.type}/>
            <Meta icon="calendar" k="Apply before" v={dlText(job.dl)}/></div>
          {A.jobHiringType(job.id)==="agency-perm"&&<Banner tone="brand" icon="award" title="Recruiter search — NorthHire Staffing" style={{marginBottom:24}}>
            NorthHire Staffing is sourcing candidates for {e.name}. If hired, you'll be on {e.name}'s payroll directly. We take a placement fee <em>from the client</em>, never from you. 90-day replacement guarantee applies to us.
          </Banner>}
          <Sec title="About this role"><p className="text-base text-text-2 leading-relaxed">{job.desc}</p></Sec>
          <Sec title="What you will be doing"><Bul items={job.duties}/></Sec>
          <Sec title="What we are looking for"><Bul items={job.reqs}/></Sec>
          <Sec title="Skills and certifications">
            <div className="flex flex-wrap gap-2">
              {job.skills.map(s=>{const mine=A.user?.role==="seeker"&&(A.user.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
                return <Tag key={s} tone={mine?"ok":"neutral"} icon={mine?"check":undefined}>{s}</Tag>;})}</div>
            {A.user?.role==="seeker"&&<div className="text-sm text-text-3 mt-3">Highlighted skills are already on your profile.</div>}</Sec>
          <Sec title="Benefits offered">
            <div className="grid gap-2.5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?220:260}px,1fr))`}}>
              {job.perks.map(p=><div key={p} className="flex gap-3 items-center bg-ok-bg border border-ok-ln rounded-xl py-3.5 px-4">
                <span className="text-ok flex shrink-0"><I n="check" s={16} w={2.4}/></span>
                <span className="text-sm text-text font-medium">{p}</span></div>)}</div></Sec>
          <Sec title="How to apply"><p className="text-base text-text-2 leading-relaxed">{job.how}</p></Sec>
        </div>

        {!mob&&<div className="sticky top-20 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-line">
            {A.user?.role==="seeker"&&<div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-line-soft">
              <Ring v={score} size={56}/><div><div className="text-sm font-bold text-text">Your match score</div>
                <div className="text-sm text-text-2 mt-1">From your skills and preferences</div></div></div>}
            <Btn kind={applied?"soft":"primary"} size="lg" full disabled={applied} icon={applied?"check":"send"} onClick={apply}>
              {applied?"Application sent":"Apply for this job"}</Btn>
            <div className="flex gap-2.5 mt-3">
              <Btn kind="outline" full onClick={()=>A.toggleSave(job.id)} icon="bookmark">{A.saved.has(job.id)?"Saved":"Save"}</Btn>
              <Btn kind="outline" full icon="share" onClick={()=>A.share(job)}>Share</Btn></div>
            <div className="flex justify-between text-xs text-text-3 mt-5 pt-4 border-t border-line-soft">
              <span>{job.views.toLocaleString()} views</span><span>Posted {job.posted}</span></div></div>
          <div className="bg-white rounded-3xl p-6 border border-line">
            <Lbl>About the employer</Lbl>
            <div className="flex gap-3.5 items-center mb-3.5">
              <EmpMark e={e} size={48} radius={12}/>
              <div className="min-w-0"><div className="text-base font-bold text-text">{e.name}</div>
                <div className="text-sm text-text-2 mt-0.5">{e.industry} • {e.size} staff</div></div></div>
            <p className="text-sm text-text-2 leading-relaxed mb-4">{e.about}</p>
            <Btn kind="outline" size="sm" full iconR="chevR" onClick={()=>A.openEmployer(e.id)}>All openings</Btn></div>
          {A.user?.role==="seeker"&&(()=>{const g=A.skillsGap(job);
            if(!g.missing.length)return null;
            return <div className="bg-white rounded-3xl p-6 border border-line">
              <div className="flex justify-between items-center mb-3">
                <Lbl style={{margin:0}}>Skills gap</Lbl>
                <Tag tone="brand" sm>{g.current} → {g.potential}</Tag></div>
              <p className="text-sm text-text-2 mb-3 leading-normal">
                Add these skills to your profile to raise your match by <strong className="text-brand">{g.potential-g.current} points</strong>:</p>
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {g.missing.map(s=><Tag key={s} sm icon="plus">{s}</Tag>)}</div>
              <Btn kind="outline" size="sm" full onClick={()=>A.go("profile")}>Update my skills</Btn></div>;})()}
          {(()=>{const s=A.salaryInsight(job.t,job.prov);
            if(!s)return null;
            return <div className="bg-white rounded-3xl p-6 border border-line">
              <Lbl>Salary insight</Lbl>
              <p className="text-sm text-text-2 mb-3.5 leading-normal">
                Based on {s.count} similar {job.prov} listings on NorthHire.</p>
              <div className="grid grid-cols-3 gap-2 mb-3.5">
                {[["Low",s.p25],["Median",s.median],["High",s.p75]].map(([l,v],i)=>
                  <div key={l} className={`text-center py-3 px-1.5 rounded-xl border ${i===1?"bg-tint border-line-2":"bg-bg border-line"}`}>
                    <div className="text-xs text-text-3 font-semibold tracking-wide uppercase">{l}</div>
                    <div className={`text-base font-bold mt-1 tracking-tight ${i===1?"text-brand":"text-text"}`}>${Math.round(v/1000)}k</div></div>)}</div>
              <div className="text-xs text-text-3 text-center">Estimated annualized totals</div></div>;})()}
        </div>}
      </div>

      {/* Page-bottom Apply CTA */}
      <div className={`max-w-site ${mob?"mx-auto pt-6 px-4 pb-8":"mt-8 mx-auto px-8 pb-10"}`}>
        <div className={`bg-[linear-gradient(135deg,var(--color-tint)_0%,#F0F7FF_100%)] border border-line-2 rounded-3xl text-center ${mob?"p-6":"p-9"}`}>
          <div className={`font-bold text-text tracking-tight mb-2 ${mob?"text-lg":"text-2xl"}`}>Ready to apply for this role?</div>
          <div className="text-sm text-text-2 max-w-lg mx-auto mb-5 leading-relaxed">{applied?"Your application has been sent. Track its progress in My Status.":`Takes about 2 minutes. Your profile and CV go straight to ${e.name}.`}</div>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Btn kind={applied?"soft":"primary"} size="lg" iconR={applied?"check":"arrowR"} disabled={applied} onClick={apply}>
              {applied?"Application sent":"Apply for this role"}</Btn>
            <Btn kind="outline" size="lg" onClick={()=>A.toggleSave(job.id)} icon="bookmark">{A.saved.has(job.id)?"Saved":"Save for later"}</Btn>
          </div>
        </div>
      </div>
    </section>

    {mob&&<div className="sticky bottom-0 bg-white/97 backdrop-blur-md border-t border-line py-3 px-4 flex gap-2.5 z-300">
      <Btn kind="outline" onClick={()=>A.toggleSave(job.id)} icon="bookmark" style={{flexShrink:0}}>{A.saved.has(job.id)?"Saved":"Save"}</Btn>
      <Btn kind={applied?"soft":"primary"} full disabled={applied} icon={applied?"check":"send"} onClick={apply}>{applied?"Applied":"Apply now"}</Btn></div>}
  </div>;
}
