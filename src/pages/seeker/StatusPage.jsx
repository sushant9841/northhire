import { useState, useEffect, useRef } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Card, Tag, Bar, Sel, Stat, Tabs, Empty, H1, Page, ConfirmDialog, Modal, Field, Area, Tooltip, Banner } from "../../design/primitives.jsx";
import { I } from "../../design/icons.jsx";
import { pay, payShort } from "../../helpers/utils.js";
import { STAGES } from "../../store/seed/constants.js";
import { EmpMark } from "../shared/cards.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";
import { applicationStageLabel } from "../../helpers/enumLabels.js";

/* Job Seeker Transformation Tranche 4 (JS-06): a short, honest "what this means for you" line
   per stage, shown as the row's next-expected-step microcopy. Custom employer stages (outside
   STAGES) fall back to a generic line rather than guessing. */
const NEXT_STEP_KEY={Applied:"seeker.status.nextStepApplied",Reviewed:"seeker.status.nextStepReviewed",
  Shortlisted:"seeker.status.nextStepShortlisted",Interview:"seeker.status.nextStepInterview",
  Offer:"seeker.status.nextStepOffer",Hired:"seeker.status.nextStepHired"};
const STAGE_TOOLTIP_KEY={Applied:"seeker.status.stageTooltipApplied",Reviewed:"seeker.status.stageTooltipReviewed",
  Shortlisted:"seeker.status.stageTooltipShortlisted",Interview:"seeker.status.stageTooltipInterview",
  Offer:"seeker.status.stageTooltipOffer",Hired:"seeker.status.stageTooltipHired",Withdrawn:"seeker.status.stageTooltipWithdrawn"};

function AnswersModal({app:a,job:j,onClose}){
  const {t}=useTranslation();
  const rows=[[t("seeker.status.availability"),a.avail],[t("seeker.status.payExpectation"),a.expect],[t("seeker.status.coverNote"),a.letter],[t("seeker.status.meetsRequirement"),a.meets]].filter(([,v])=>v);
  return <Modal onClose={onClose} title={t("seeker.status.answersModalTitle",{job:j.t})}>
    <div className="flex flex-col gap-4">
      {rows.length===0?<div className="text-sm text-text-3">{t("seeker.status.noAnswers")}</div>
        :rows.map(([label,v])=><div key={label}>
          <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1">{label}</div>
          <div className="text-sm text-text leading-relaxed">{v}</div></div>)}
    </div>
  </Modal>;
}

function HistoryModal({app:a,onClose}){
  const {t}=useTranslation();
  const hist=[...(a.history||[])].reverse();
  return <Modal onClose={onClose} title={t("seeker.status.timelineTitle")}>
    <div className="flex flex-col gap-3">
      {hist.length===0?<div className="text-sm text-text-3">{t("seeker.status.noHistory")}</div>
        :hist.map((h,i)=><div key={i} className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-brand shrink-0"/>
            {i<hist.length-1&&<div className="w-px flex-1 bg-line-soft mt-1"/>}</div>
          <div className="pb-3 min-w-0">
            <div className="text-sm font-semibold text-text">{h.stage}</div>
            <div className="text-xs text-text-3 mt-0.5">{h.at}</div>
            <div className="text-sm text-text-2 mt-1">{h.note}</div></div></div>)}
    </div>
  </Modal>;
}

/* ═══════════════ SEEKER: STATUS · ALERTS · PROFILE · SETTINGS ═══════════════ */
export function StatusPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  const [tab,setTab]=useState("all");
  const [withdrawing,setWithdrawing]=useState(null); const [withdrawReason,setWithdrawReason]=useState("");
  const [viewingAnswers,setViewingAnswers]=useState(null);
  const [viewingHistory,setViewingHistory]=useState(null);
  const [stageTip,setStageTip]=useState(null);
  /* The stat tiles were all-time counts with no way to ask "how did the last month go" - the
     usual question after a burst of applying. Applications carry a real createdAt, so a period
     filter is a genuine answer rather than the fabricated trend line the finding also asked for
     (there are no historical snapshots to compute a real week-over-week delta from). */
  const [period,setPeriod]=useState("all");
  const periodMs={"30d":30*86400000,"90d":90*86400000,"12m":365*86400000}[period];
  const since=periodMs?Date.now()-periodMs:null;
  const allMine=A.myApps;
  const mine=since?allMine.filter(a=>(a.createdAt||0)>=since):allMine;
  const activeCount=allMine.filter(a=>a.stage!=="Withdrawn").length;

  /* JS-10 / "Track application": a notification tap or the Apply success card's "Track
     application" button sets A.focusAppId. This page owns turning that into an actual scroll +
     brief highlight, then clears it so a later, unrelated visit doesn't re-trigger it. */
  const rowRefs=useRef({});
  const [highlightId,setHighlightId]=useState(null);
  useEffect(()=>{
    if(!A.focusAppId)return;
    if(!allMine.some(a=>a.id===A.focusAppId)){A.setFocusAppId(null);return;}
    if(tab!=="all")setTab("all");
    if(period!=="all")setPeriod("all");
  },[A.focusAppId]);
  useEffect(()=>{
    if(!A.focusAppId)return;
    // Rows mount a tick after the tab/period switch above resolves - poll briefly rather than
    // trying to sequence two separate effects against React's render timing.
    let tries=0;
    const iv=setInterval(()=>{
      tries++;
      const el=rowRefs.current[A.focusAppId];
      if(el){
        clearInterval(iv);
        el.scrollIntoView({behavior:"smooth",block:"center"});
        setHighlightId(A.focusAppId);
        setTimeout(()=>{A.setFocusAppId(null);setHighlightId(null);},2500);
      }else if(tries>20)clearInterval(iv);
    },50);
    return ()=>clearInterval(iv);
  },[A.focusAppId,tab,period]);
  const counts=mine.reduce((m,a)=>({...m,[a.stage]:(m[a.stage]||0)+1}),{});
  const list=tab==="all"?mine:mine.filter(a=>a.stage===tab);
  /* Employers can define their own pipeline stages, so a seeker's filter list is the union of
     the stages used by the companies they've actually applied to, in first-seen order - showing
     one company's custom stages over another's application would be simply wrong. */
  const stageUnion=[];
  for(const a of mine) for(const st of A.stagesForApp(a)) if(!stageUnion.includes(st)) stageUnion.push(st);
  const allStages=stageUnion.length?stageUnion:STAGES;
  const items=[{k:"all",label:t("seeker.status.allTab"),n:mine.length},...allStages.map(s=>({k:s,label:applicationStageLabel(s,t),n:counts[s]||0})),
    {k:"Withdrawn",label:t("seeker.status.withdrawnTab"),n:counts.Withdrawn||0}];
  return <Page>
    <H1 sub={t("seeker.status.pageSub")}
      action={<div className="flex gap-2.5 items-center flex-wrap">
        <Sel value={period} onChange={e=>setPeriod(e.target.value)} style={{width:160}} aria-label={t("seeker.status.timePeriodAria")}>
          <option value="all">{t("seeker.status.allTime")}</option>
          <option value="30d">{t("seeker.status.last30Days")}</option>
          <option value="90d">{t("seeker.status.last90Days")}</option>
          <option value="12m">{t("seeker.status.last12Months")}</option>
        </Sel>
        <Btn kind="outline" size="sm" icon="bookmark" onClick={()=>A.go("saved")}>{t("seeker.status.savedBtn",{count:A.saved.size})}</Btn>
      </div>}>{t("seeker.status.pageTitle")}</H1>
    {/* JS-06/status summary (Tranche 4): the one-glance answer to "where do I stand overall" -
        distinct from the "Applications" stat tile below, which is a period-scoped count rather
        than "still open right now" (Withdrawn excluded). */}
    <div className="text-base font-semibold text-text -mt-2 mb-4">
      {t(activeCount===1?"seeker.status.activeCountOne":"seeker.status.activeCountOther",{count:activeCount})}</div>
    {period!=="all"&&allMine.length!==mine.length&&
      <div className="text-sm text-text-2 -mt-3 mb-4">
        {t("seeker.status.showingOfApplications",{shown:mine.length,total:allMine.length})}{" "}
        <button onClick={()=>setPeriod("all")} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand underline">{t("seeker.status.showAllTime")}</button>
      </div>}
    <ProfileCompletionNudge/>
    <HrAccessBanner/>
    <UpcomingInterviewsCard/>
    <SilverMedalistCard/>
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:160}px,1fr))`}}>
      <Stat icon="send" label={t("seeker.status.statApplications")} value={mine.length} tone={C.brand}/>
      <Stat icon="eye" label={t("seeker.status.statReviewed")} value={(counts.Reviewed||0)+(counts.Shortlisted||0)+(counts.Interview||0)+(counts.Offer||0)}/>
      <Stat icon="calendar" label={t("seeker.status.statInterviews")} value={counts.Interview||0} tone={C.warn}/>
      <Stat icon="award" label={t("seeker.status.statOffers")} value={counts.Offer||0} tone={C.ok}/></div>
    <Tabs items={items} value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="activity" title={tab==="all"?t("seeker.status.noAppsYetTitle"):t("seeker.status.noAppsAtStageTitle",{stage:applicationStageLabel(tab,t)})}
      body={tab==="all"?t("seeker.status.noAppsYetBody"):t("seeker.status.noAppsAtStageBody")}
      action={<Btn kind="primary" onClick={()=>A.go("search")}>{t("seeker.status.browseJobsBtn")}</Btn>}/>
      :<div className="flex flex-col gap-3">
        {list.map((a,i)=>{const j=A.job(a.job); if(!j) return null; const e=A.emp(j.e);
          const cardStages=A.stagesForApp(a);
          const idx=cardStages.indexOf(a.stage); const pct=a.stage==="Withdrawn"?0:((idx+1)/cardStages.length)*100;
          const lastUpdate=a.history?.length?a.history[a.history.length-1].at:a.at;
          const nextStep=NEXT_STEP_KEY[a.stage]?t(NEXT_STEP_KEY[a.stage]):null;
          const highlighted=highlightId===a.id;
          return <div key={a.id} ref={el=>{rowRefs.current[a.id]=el;}}>
          <Card pad={0} delay={Math.min(i,6)*0.05}
            style={{overflow:"hidden",outline:highlighted?`2px solid ${C.brand}`:"none",transition:"outline-color .3s"}}>
            <div className={`flex gap-3.5 items-start ${mob?"p-4":"p-5"}`}>
              <EmpMark e={e} size={46}/>
              <div className="flex-1 min-w-0">
                <button onClick={()=>A.openJob(j.id)} className="bg-transparent border-0 p-0 cursor-pointer text-left text-base font-bold text-text tracking-tight">{j.t}</button>
                <div className="text-sm text-text-2 mt-1">{e.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div>
                <div className="flex gap-2.5 items-center mt-2.5 flex-wrap">
                  {/* Status pill tooltip (JS-06) - every stage shown gets a plain-language
                      explanation, not just a color-coded word. */}
                  <span className="relative inline-block"
                    onMouseEnter={ev=>{const r=ev.currentTarget.getBoundingClientRect();setStageTip({id:a.id,top:r.top+r.height/2,left:r.right+10});}}
                    onMouseLeave={()=>setStageTip(null)}>
                    <Tag tone={a.stage==="Offer"?"ok":a.stage==="Interview"?"warn":a.stage==="Withdrawn"?"neutral":"brand"} sm>{applicationStageLabel(a.stage,t)}</Tag>
                    <Tooltip show={stageTip?.id===a.id} top={stageTip?.top} left={stageTip?.left}>
                      {t(STAGE_TOOLTIP_KEY[a.stage]||"seeker.status.stageTooltipGeneric")}</Tooltip>
                  </span>
                  <span className={`text-sm ${a.stage==="Withdrawn"?"text-text-3":"text-text-2"}`}>{a.note}</span></div>
                <div className="text-xs text-text-3 mt-1.5">{t("seeker.status.lastUpdateLabel",{when:lastUpdate})}</div>
                {nextStep&&<div className="text-sm text-brand font-medium mt-1">{nextStep}</div>}</div>
              {!mob&&<div className="text-right shrink-0">
                <div className="text-xs text-text-3">{t("seeker.status.appliedLabel")}</div>
                <div className="text-sm font-semibold text-text mt-0.5">{a.at}</div></div>}</div>
            {a.stage!=="Withdrawn"&&<div className="py-3.5 px-5 bg-bg border-t border-line-soft">
              <Bar v={pct} tone={a.stage==="Offer"?C.ok:C.brand} h={6}/>
              <div className="flex justify-between mt-2.5">
                {cardStages.map((s,k)=><div key={s} className="text-center flex-1">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 transition-colors duration-500 ${k<=idx?(a.stage==="Offer"?"bg-ok":"bg-brand"):"bg-line"}`}/>
                  <div className={`text-xs ${k<=idx?"text-text-2":"text-text-3"} ${k===idx?"font-bold":"font-normal"}`}>{applicationStageLabel(s,t)}</div></div>)}</div></div>}
            {a.stage==="Withdrawn"&&<div className="py-3 px-5 bg-bg border-t border-line-soft flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm text-text-2">{t("seeker.status.withdrawnKindNote")}</span>
              <Btn kind="outline" size="sm" icon="search" onClick={()=>A.go("search")}>{t("seeker.status.similarRolesBtn")}</Btn></div>}
            <div className="py-3 px-5 border-t border-line-soft flex gap-2.5 flex-wrap">
              <Btn kind="outline" size="sm" iconR="chevR" onClick={()=>A.openJob(j.id)}>{t("seeker.status.viewJobBtn")}</Btn>
              {a.stage!=="Withdrawn"&&<Btn kind="ghost" size="sm" icon="mail" onClick={()=>A.go("messages")}>{t("seeker.status.messageHiringTeamBtn")}</Btn>}
              <Btn kind="ghost" size="sm" icon="file" onClick={()=>setViewingAnswers({app:a,job:j})}>{t("seeker.status.yourAnswersBtn")}</Btn>
              {(a.history?.length||0)>1&&<Btn kind="ghost" size="sm" icon="clock" onClick={()=>setViewingHistory(a)}>{t("seeker.status.timelineBtn")}</Btn>}
              {a.stage!=="Withdrawn"&&a.stage!=="Offer"&&<Btn kind="ghost" size="sm" onClick={()=>{setWithdrawing(a);setWithdrawReason("");}}>{t("seeker.status.withdrawBtn")}</Btn>}
              {a.stage==="Offer"&&<Btn kind="ok" size="sm" icon="check" onClick={()=>A.acceptOffer(a.id)}>{t("seeker.status.acceptOfferBtn")}</Btn>}
            {a.stage==="Withdrawn"&&a.withdrawnAt&&(Date.now()-a.withdrawnAt<7*24*60*60*1000)&&
              <Btn kind="outline" size="sm" icon="refresh" onClick={()=>A.restoreApp(a.id)}>{t("seeker.status.restoreBtn")}</Btn>}</div></Card></div>;})}</div>}
    <ConfirmDialog open={!!withdrawing} onClose={()=>setWithdrawing(null)} confirmLabel={t("seeker.status.withdrawBtn")}
      title={t("seeker.status.withdrawConfirmTitle")} onConfirm={()=>A.withdraw(withdrawing.id,withdrawReason.trim())}>
      <div className="flex flex-col gap-3">
        <div>{t("seeker.status.withdrawRestoreNote")}</div>
        <Field label={t("seeker.status.reasonOptionalLabel")} hint={t("seeker.status.reasonOptionalHint")}>
          <Area rows={2} value={withdrawReason} onChange={e=>setWithdrawReason(e.target.value)} placeholder={t("seeker.status.reasonPlaceholder")}/></Field>
      </div>
    </ConfirmDialog>
    {viewingAnswers&&<AnswersModal app={viewingAnswers.app} job={viewingAnswers.job} onClose={()=>setViewingAnswers(null)}/>}
    {viewingHistory&&<HistoryModal app={viewingHistory} onClose={()=>setViewingHistory(null)}/>}
  </Page>;
}

/* Job Seeker Transformation Tranche 4 - "Proactive nudges": incomplete profile. Dismissable, but
   (per the plan) reappears every 7 days until the profile reaches 80% - a per-viewer UI
   convenience (feedback_server_authoritative), not app data, so the dismiss timestamp is fine in
   localStorage: nothing about it needs to be shared across devices or survive a data export. */
const PROFILE_NUDGE_DISMISS_KEY="northhire.profileNudgeDismissedAt";
function ProfileCompletionNudge(){
  const A=use(); const {t}=useTranslation();
  const [dismissedAt,setDismissedAt]=useState(()=>{
    try{return Number(localStorage.getItem(PROFILE_NUDGE_DISMISS_KEY))||0;}catch{return 0;}
  });
  if(!A.user||A.user.role!=="seeker"||A.completeness>=80)return null;
  if(Date.now()-dismissedAt<7*24*60*60*1000)return null;
  const dismiss=()=>{const now=Date.now(); try{localStorage.setItem(PROFILE_NUDGE_DISMISS_KEY,String(now));}catch{/* best-effort */} setDismissedAt(now);};
  return <Banner tone="neutral" icon="sparkle" title={t("seeker.status.completeProfileNudgeTitle")} style={{marginBottom:20}}
    action={<div className="flex gap-2 flex-wrap">
      <Btn kind="outline" size="sm" onClick={()=>A.go("profile")}>{t("seeker.status.completeProfileBtn")}</Btn>
      <Btn kind="ghost" size="sm" onClick={dismiss}>{t("seeker.status.dismissNudgeBtn")}</Btn></div>}>
    {A.completenessHint}
  </Banner>;
}

/* HR Suite H1: durable (server-authoritative) banner once this seeker's email matches an active
   HR Suite employee record somewhere - "you now have access to your employer's HR portal".
   Tapping through prefills HrLoginPage with the company + login id rather than making them
   retype it. Dismissable per-viewer (a plain UI convenience, not app data - the HR account itself
   isn't affected by dismissing this), same pattern as ProfileCompletionNudge. */
const HR_ACCESS_DISMISS_KEY="northhire.hrAccessBannerDismissed";
function HrAccessBanner(){
  const A=use(); const {t}=useTranslation();
  const [dismissed,setDismissed]=useState(()=>{
    try{return localStorage.getItem(HR_ACCESS_DISMISS_KEY)==="1";}catch{return false;}
  });
  if(!A.hrAccess?.available||dismissed)return null;
  const dismiss=()=>{try{localStorage.setItem(HR_ACCESS_DISMISS_KEY,"1");}catch{/* best-effort */} setDismissed(true);};
  return <Banner tone="brand" icon="sparkle" title={t("seeker.status.hrAccessTitle",{company:A.hrAccess.companyName})} style={{marginBottom:20}}
    action={<div className="flex gap-2 flex-wrap">
      <Btn kind="outline" size="sm" onClick={()=>{A.setHrLoginPrefill({companyName:A.hrAccess.companyName,loginId:A.hrAccess.loginId});A.go("hrLogin");}}>
        {t("seeker.status.hrAccessSignInBtn")}</Btn>
      <Btn kind="ghost" size="sm" onClick={dismiss}>{t("seeker.status.dismissNudgeBtn")}</Btn></div>}>
    {t("seeker.status.hrAccessBody")}
  </Banner>;
}

/* Upcoming interviews summary card, rendered at the top of the seeker's Status page.
   The reported gap: once an employer scheduled an interview, the seeker "had nothing on
   their end" — the Interviews page existed but lived under a mobile account menu, so
   nothing on the home surface (Status is the seeker's dashboard) told them anything had
   happened. This card is the one-glance answer: title, time, mode, "Add to calendar"
   and "Message" quick actions. Hidden when there is nothing to show — no empty state
   here, because the whole page already has one for zero applications. */
function UpcomingInterviewsCard(){
  const A=use(); const {t}=useTranslation();
  if(!A.user)return null;
  const upcoming=(A.interviews||[])
    .filter(iv=>iv.candidate===A.user.id&&iv.status!=="cancelled")
    .sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  if(!upcoming.length)return null;
  const dl=(iv)=>{
    // Minimal iCal for the schedule the operator typed. `when_text` is free-form
    // (e.g. "Thursday 2pm"), so we can't compute an exact start; drop it into DESCRIPTION
    // and give the event a "today" date so most calendar clients accept the file. This is
    // strictly better than the pre-existing zero: the seeker can open the .ics, see the
    // details, and reschedule to the real slot themselves.
    const j=A.job(iv.job); const e=A.emp(iv.employer);
    const stamp=(d)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
    const now=new Date(); const end=new Date(now.getTime()+45*60000);
    const ics=[
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//NorthHire//EN","BEGIN:VEVENT",
      `UID:${iv.id}@northhire`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(now)}`,`DTEND:${stamp(end)}`,
      `SUMMARY:${(j?.t||"Interview").replace(/[,;\n]/g," ")} — ${e?.name||""}`,
      `DESCRIPTION:${(iv.when||"").replace(/[,;\n]/g," ")}${iv.notes?" — "+iv.notes.replace(/[,;\n]/g," "):""}`,
      "END:VEVENT","END:VCALENDAR",
    ].join("\r\n");
    const blob=new Blob([ics],{type:"text/calendar"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`interview-${iv.id}.ics`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="mb-5 border border-brand/25 bg-brand/5 rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center"><I n="calendar" s={16}/></span>
      <div className="font-bold text-text tracking-tight">{t("seeker.status.upcomingInterviewsTitle")}</div>
      <div className="ml-auto text-xs text-text-3">{t("seeker.status.upcomingInterviewsCount",{n:upcoming.length})}</div>
    </div>
    <div className="flex flex-col gap-2">
      {upcoming.slice(0,3).map(iv=>{const j=A.job(iv.job); const e=A.emp(iv.employer);
        return <div key={iv.id} className="bg-white border border-line rounded-xl px-3 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text truncate">{j?.t||t("interviews.interviewDefault")} — {e?.name||""}</div>
            <div className="text-xs text-text-2 mt-0.5">
              <strong>{iv.when||"—"}</strong> · {iv.mode==="video"?t("interviews.videoCall"):t("interviews.onSiteInterview")}
              {iv.notes?` · ${iv.notes}`:""}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Btn kind="ghost" size="xs" icon="download" onClick={()=>dl(iv)}>{t("seeker.status.addToCalendarBtn")}</Btn>
            <Btn kind="outline" size="xs" icon="mail" onClick={()=>A.go("messages")}>{t("seeker.status.messageHiringMgrBtn")}</Btn>
          </div>
        </div>;})}
      {upcoming.length>3&&<button onClick={()=>A.go("interviews")} className="self-start bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand underline">{t("seeker.status.viewAllInterviewsBtn",{n:upcoming.length})}</button>}
    </div>
  </div>;
}

/* Priority-4 #6: "You may also like" - live roles at an employer this seeker already reached a
   final pipeline stage with, surfaced from the server-computed silver_medalist_matches table
   (see server/lib/silverMedalist.js). Server-enforced: the GET only ever returns THIS seeker's
   own rows (seeker_id = req.user.id), never another seeker's. Loaded lazily on mount rather than
   joining the eager seed-load path, same reasoning as loadCandidateOutreach on the employer side -
   this is secondary content, not core page data. */
function SilverMedalistCard(){
  const A=use(); const {t}=useTranslation();
  useEffect(()=>{ if(A.user?.role==="seeker")A.loadSilverMatches(); /* eslint-disable-next-line react-hooks/exhaustive-deps */},[A.user?.id]);
  if(!A.user||A.user.role!=="seeker"||!A.silverMatches?.length)return null;
  return <div className="mb-5 border border-line rounded-2xl p-4 bg-white">
    <div className="flex items-center gap-2 mb-3">
      <span className="w-8 h-8 rounded-full bg-wash text-brand flex items-center justify-center"><I n="sparkle" s={16}/></span>
      <div className="font-bold text-text tracking-tight">{t("seeker.status.mayAlsoLikeTitle")}</div>
      <div className="ml-auto text-xs text-text-3">{t("seeker.status.mayAlsoLikeCount",{n:A.silverMatches.length})}</div>
    </div>
    <div className="flex flex-col gap-2">
      {A.silverMatches.map(m=>{
        const j=A.job(m.jobId); if(!j)return null; const e=A.emp(j.e);
        return <div key={m.id} className="bg-bg border border-line rounded-xl px-3 py-2.5 flex items-center gap-3 flex-wrap">
          <EmpMark e={e} size={38}/>
          <div className="flex-1 min-w-0">
            <button onClick={()=>A.openJob(j.id)} className="bg-transparent border-0 p-0 cursor-pointer text-left text-sm font-semibold text-text truncate">{j.t}</button>
            <div className="text-xs text-text-2 mt-0.5">{e?.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Btn kind="primary" size="xs" onClick={()=>A.openJob(j.id)}>{t("seeker.status.mayAlsoLikeViewBtn")}</Btn>
            <Btn kind="ghost" size="xs" icon="x" onClick={()=>A.dismissSilverMatch(m.id)}>{t("seeker.status.dismissNudgeBtn")}</Btn>
          </div>
        </div>;})}
    </div>
  </div>;
}
