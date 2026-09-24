import { useState } from "react";
import { use } from "../../store/context.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Tag, Card, SmartLogo, SmartScene, SmartPortrait } from "../../design/primitives.jsx";
import { pay, payUnit, dlText, money } from "../../helpers/utils.js";
import { useTranslation } from "../../i18n/i18n.jsx";

export function EmpMark({e,size=46,radius=12}){return <SmartLogo e={e} size={size} radius={radius}/>;}

export function SaveBtn({id,size=20}){
  const A=use(); const { t } = useTranslation(); const on=A.saved.has(id);
  const [pulse,setPulse]=useState(false);
  return <button aria-label={on?t("cards.saved"):t("cards.saveJob")} title={on?t("cards.saved"):t("cards.saveJob")}
    onClick={e=>{e.stopPropagation();A.toggleSave(id);setPulse(true);setTimeout(()=>setPulse(false),320);}}
    className={`bg-transparent border-0 cursor-pointer p-1 flex transition-[color,transform] duration-200 ${on?"text-brand":"text-text-3"}`}
    style={{transform:pulse?"scale(1.22)":"scale(1)"}}>
    <I n="bookmark" s={size} w={on?0:1.8} fill={on?C.brand:"none"}/></button>;
}

/* ─── Hiring-type badge: flags agency-perm listings on public views ─── */
export function HiringTypeBadge({jobId,size="sm"}){
  const A=use(); const { t } = useTranslation(); const type=A.jobHiringType(jobId);
  /* Direct hires are the default — no badge needed, less visual noise */
  if(type==="direct")return null;
  /* Only agency-perm shows a badge on public listings */
  const configs={
    "agency-perm":{tone:"violet",icon:"award",label:t("cards.recruiterSearch"),tip:t("cards.recruiterSearchTip")}
  };
  const cfg=configs[type]; if(!cfg)return null;
  return <span className="relative inline-flex group">
    <Tag tone={cfg.tone} sm={size==="sm"} icon={cfg.icon}>{cfg.label}</Tag>
    <div className="hidden group-hover:block absolute bottom-full left-0 mb-1.5 bg-ink text-white text-xs py-2.5 px-3 rounded-xl w-65 z-600 shadow-md leading-normal pointer-events-none">
      {cfg.tip}
      <div className="absolute top-full left-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-ink"/>
    </div>
  </span>;
}

export function JobCard({job,delay=0}){
  const A=use(); const { t } = useTranslation(); const e=A.emp(job.e);
  const applied=A.appliedJobIds.has(job.id);
  return <Card hover delay={delay} onClick={()=>A.openJob(job.id)} pad={18}>
    <div className="flex gap-3.5 items-start mb-3">
      <EmpMark e={e}/>
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-text leading-snug tracking-tight">{job.t}</div>
        <div className="text-sm text-text-2 mt-1 flex items-center gap-1.5">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{e.name}</span>
          {e.verified&&<span className="text-brand flex shrink-0" title={t("cards.verifiedEmployer")}><I n="checkC2" s={14} w={2}/></span>}</div>
      </div>
      <SaveBtn id={job.id}/>
    </div>
    <div className="flex items-baseline gap-2 bg-tint border border-line-2 rounded-xl py-2.5 px-3 mb-3">
      <span className="text-lg font-bold text-brand tracking-tight">{pay(job)}</span>
      <span className="text-xs text-brand opacity-75 font-medium">{payUnit(job)}</span></div>
    <div className="flex gap-3.5 flex-wrap text-sm text-text-2 mb-3">
      <span className="flex items-center gap-1.5"><I n="pin" s={14} c={C.text3}/>{job.city}, {job.prov}</span>
      <span className="flex items-center gap-1.5"><I n="clock" s={14} c={C.text3}/>{job.type}</span>
      <span className="flex items-center gap-1.5"><I n="users" s={14} c={C.text3}/>{job.vac} {job.vac===1?t("cards.openingOne"):t("cards.openingOther")}</span></div>
    <div className="flex gap-2 flex-wrap items-center">
      <HiringTypeBadge jobId={job.id}/>
      {job.mode!=="On-site"&&<Tag tone="ok" sm>{job.mode}</Tag>}
      {job.urgent&&<Tag tone="warn" sm icon="alert">{t("cards.urgent")}</Tag>}
      {/* Roadmap B1-03: badge listings <48h old so early applicants can see they're early.
          Real ATS data: applicants in the first 48h convert 4× more often than later ones. */}
      {job.createdAt&&(Date.now()-job.createdAt)<48*3600000&&!applied&&
        <Tag tone="ok" sm icon="sparkle">{t("cards.newBadge")}</Tag>}
      {applied&&<Tag tone="brand" sm icon="check">{t("cards.applied")}</Tag>}
      <span className={`ml-auto text-xs font-medium ${job.dl<=7?"text-red":"text-text-3"}`}>{dlText(job.dl)}</span></div>
  </Card>;
}

export function BlogCard({b,delay=0,compact}){
  const A=use(); const { t } = useTranslation();
  const openBlog=()=>A.openBlog(b.id);
  return <div onClick={openBlog} role="button" tabIndex={0}
    onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openBlog();}}}
    className="bg-white rounded-3xl overflow-hidden border border-line cursor-pointer transition duration-200 hover:border-line-2 hover:-translate-y-1">
    <div className="aspect-[16/10] bg-bg"><SmartScene kind={b.scene} tone={b.tone} w="100%" h="100%" seed={b.id.length}/></div>
    <div className="p-6">
      <Tag tone="brand" sm>{b.cat}</Tag>
      <div className="text-lg font-bold text-text leading-snug tracking-tight mt-3 mb-2.5">{b.title}</div>
      {!compact&&<p className="text-sm text-text-2 leading-relaxed mb-4">{b.excerpt}</p>}
      <div className="flex items-center gap-2.5 pt-3.5 border-t border-line-soft">
        <button onClick={e=>{e.stopPropagation();A.filterBlogsByAuthor(b.author);}}
          className="flex items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer text-left hover:underline">
          <SmartPortrait seed={b.authorSeed} size={30}/>
          <span className="text-sm text-text-2 font-medium">{b.author}</span></button>
        <span className="ml-auto text-sm text-text-3">{t("cards.minRead",{mins:b.mins})}</span></div></div></div>;
}
export function TrainingCard({t,delay=0}){
  const A=use(); const { t: translate } = useTranslation(); const enrolled=A.enrolled.has(t.id);
  const openTraining=()=>A.openTraining(t.id);
  return <div onClick={openTraining} role="button" tabIndex={0}
    onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openTraining();}}}
    className="bg-white rounded-3xl overflow-hidden border border-line cursor-pointer transition duration-200 hover:border-line-2 hover:-translate-y-1">
    <div className="relative aspect-[16/10] bg-bg">
      <SmartScene kind={t.scene} tone={t.tone} w="100%" h="100%" seed={t.id.length}/>
      <div className="absolute top-3.5 left-3.5">
        <Tag tone={t.price===0?"ok":"dark"} sm>{t.price===0?translate("cards.free"):money(t.price)}</Tag></div>
      {enrolled&&<div className="absolute top-3.5 right-3.5"><Tag tone="brand" sm icon="check">{translate("cards.enrolled")}</Tag></div>}</div>
    <div className="p-6">
      <div className="flex gap-2 mb-3"><Tag sm>{t.level}</Tag><Tag sm icon="clock">{t.hours} h</Tag></div>
      <div className="text-lg font-bold text-text leading-snug tracking-tight mb-3">{t.title}</div>
      <div className="flex items-center gap-2.5 text-sm text-text-2 pt-3.5 border-t border-line-soft">
        {Number(t.rating)>0&&Number(t.enrolled)>0&&<>
          <span className="text-warn flex items-center gap-1 font-bold">
            <I n="star" s={13} fill={C.warn} w={0}/>{Number(t.rating).toFixed(1)}</span>
          <span className="text-text-3">•</span></>}
        <span>{translate("cards.enrolledCount",{count:t.enrolled.toLocaleString()})}</span></div></div></div>;
}
