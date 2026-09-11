import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Card, Tag, Bar, Sel, Stat, Tabs, Empty, H1, Page, ConfirmDialog, Modal, Field, Area } from "../../design/primitives.jsx";
import { pay, payShort } from "../../helpers/utils.js";
import { STAGES } from "../../store/seed/constants.js";
import { EmpMark } from "../shared/cards.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

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
  /* The stat tiles were all-time counts with no way to ask "how did the last month go" - the
     usual question after a burst of applying. Applications carry a real createdAt, so a period
     filter is a genuine answer rather than the fabricated trend line the finding also asked for
     (there are no historical snapshots to compute a real week-over-week delta from). */
  const [period,setPeriod]=useState("all");
  const periodMs={"30d":30*86400000,"90d":90*86400000,"12m":365*86400000}[period];
  const since=periodMs?Date.now()-periodMs:null;
  const allMine=A.myApps;
  const mine=since?allMine.filter(a=>(a.createdAt||0)>=since):allMine;
  const counts=mine.reduce((m,a)=>({...m,[a.stage]:(m[a.stage]||0)+1}),{});
  const list=tab==="all"?mine:mine.filter(a=>a.stage===tab);
  /* Employers can define their own pipeline stages, so a seeker's filter list is the union of
     the stages used by the companies they've actually applied to, in first-seen order - showing
     one company's custom stages over another's application would be simply wrong. */
  const stageUnion=[];
  for(const a of mine) for(const st of A.stagesForApp(a)) if(!stageUnion.includes(st)) stageUnion.push(st);
  const allStages=stageUnion.length?stageUnion:STAGES;
  const items=[{k:"all",label:t("seeker.status.allTab"),n:mine.length},...allStages.map(s=>({k:s,label:s,n:counts[s]||0})),
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
    {period!=="all"&&allMine.length!==mine.length&&
      <div className="text-sm text-text-2 -mt-3 mb-4">
        {t("seeker.status.showingOfApplications",{shown:mine.length,total:allMine.length})}{" "}
        <button onClick={()=>setPeriod("all")} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand underline">{t("seeker.status.showAllTime")}</button>
      </div>}
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:160}px,1fr))`}}>
      <Stat icon="send" label={t("seeker.status.statApplications")} value={mine.length} tone={C.brand}/>
      <Stat icon="eye" label={t("seeker.status.statReviewed")} value={(counts.Reviewed||0)+(counts.Shortlisted||0)+(counts.Interview||0)+(counts.Offer||0)}/>
      <Stat icon="calendar" label={t("seeker.status.statInterviews")} value={counts.Interview||0} tone={C.warn}/>
      <Stat icon="award" label={t("seeker.status.statOffers")} value={counts.Offer||0} tone={C.ok}/></div>
    <Tabs items={items} value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="activity" title={tab==="all"?t("seeker.status.noAppsYetTitle"):t("seeker.status.noAppsAtStageTitle",{stage:tab})}
      body={tab==="all"?t("seeker.status.noAppsYetBody"):t("seeker.status.noAppsAtStageBody")}
      action={<Btn kind="primary" onClick={()=>A.go("search")}>{t("seeker.status.browseJobsBtn")}</Btn>}/>
      :<div className="flex flex-col gap-3">
        {list.map((a,i)=>{const j=A.job(a.job); if(!j) return null; const e=A.emp(j.e);
          const cardStages=A.stagesForApp(a);
          const idx=cardStages.indexOf(a.stage); const pct=a.stage==="Withdrawn"?0:((idx+1)/cardStages.length)*100;
          return <Card key={a.id} pad={0} delay={Math.min(i,6)*0.05} style={{overflow:"hidden"}}>
            <div className={`flex gap-3.5 items-start ${mob?"p-4":"p-5"}`}>
              <EmpMark e={e} size={46}/>
              <div className="flex-1 min-w-0">
                <button onClick={()=>A.openJob(j.id)} className="bg-transparent border-0 p-0 cursor-pointer text-left text-base font-bold text-text tracking-tight">{j.t}</button>
                <div className="text-sm text-text-2 mt-1">{e.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div>
                <div className="flex gap-2.5 items-center mt-2.5 flex-wrap">
                  <Tag tone={a.stage==="Offer"?"ok":a.stage==="Interview"?"warn":a.stage==="Withdrawn"?"neutral":"brand"} sm>{a.stage}</Tag>
                  <span className={`text-sm ${a.stage==="Withdrawn"?"text-text-3":"text-text-2"}`}>{a.note}</span></div></div>
              {!mob&&<div className="text-right shrink-0">
                <div className="text-xs text-text-3">{t("seeker.status.appliedLabel")}</div>
                <div className="text-sm font-semibold text-text mt-0.5">{a.at}</div></div>}</div>
            {a.stage!=="Withdrawn"&&<div className="py-3.5 px-5 bg-bg border-t border-line-soft">
              <Bar v={pct} tone={a.stage==="Offer"?C.ok:C.brand} h={6}/>
              <div className="flex justify-between mt-2.5">
                {cardStages.map((s,k)=><div key={s} className="text-center flex-1">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 transition-colors duration-500 ${k<=idx?(a.stage==="Offer"?"bg-ok":"bg-brand"):"bg-line"}`}/>
                  <div className={`text-xs ${k<=idx?"text-text-2":"text-text-3"} ${k===idx?"font-bold":"font-normal"}`}>{s}</div></div>)}</div></div>}
            <div className="py-3 px-5 border-t border-line-soft flex gap-2.5 flex-wrap">
              <Btn kind="outline" size="sm" iconR="chevR" onClick={()=>A.openJob(j.id)}>{t("seeker.status.viewJobBtn")}</Btn>
              <Btn kind="ghost" size="sm" icon="file" onClick={()=>setViewingAnswers({app:a,job:j})}>{t("seeker.status.yourAnswersBtn")}</Btn>
              {(a.history?.length||0)>1&&<Btn kind="ghost" size="sm" icon="clock" onClick={()=>setViewingHistory(a)}>{t("seeker.status.timelineBtn")}</Btn>}
              {a.stage!=="Withdrawn"&&a.stage!=="Offer"&&<Btn kind="ghost" size="sm" onClick={()=>{setWithdrawing(a);setWithdrawReason("");}}>{t("seeker.status.withdrawBtn")}</Btn>}
              {a.stage==="Offer"&&<Btn kind="ok" size="sm" icon="check" onClick={()=>A.acceptOffer(a.id)}>{t("seeker.status.acceptOfferBtn")}</Btn>}
            {a.stage==="Withdrawn"&&a.withdrawnAt&&(Date.now()-a.withdrawnAt<7*24*60*60*1000)&&
              <Btn kind="outline" size="sm" icon="refresh" onClick={()=>A.restoreApp(a.id)}>{t("seeker.status.restoreBtn")}</Btn>}</div></Card>;})}</div>}
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
