import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Card, Tag, Bar, Stat, Tabs, Empty, H1, Page } from "../../design/primitives.jsx";
import { pay, payShort } from "../../helpers/utils.js";
import { STAGES } from "../../store/seed/constants.js";
import { EmpMark } from "../shared/cards.jsx";

/* ═══════════════ SEEKER: STATUS · ALERTS · PROFILE · SETTINGS ═══════════════ */
export function StatusPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("all");
  const mine=A.myApps;
  const counts=mine.reduce((m,a)=>({...m,[a.stage]:(m[a.stage]||0)+1}),{});
  const list=tab==="all"?mine:mine.filter(a=>a.stage===tab);
  const items=[{k:"all",label:"All",n:mine.length},...STAGES.map(s=>({k:s,label:s,n:counts[s]||0})),
    {k:"Withdrawn",label:"Withdrawn",n:counts.Withdrawn||0}];
  return <Page>
    <H1 sub="Live status pulled straight from each employer's pipeline"
      action={<Btn kind="outline" size="sm" icon="bookmark" onClick={()=>A.go("saved")}>Saved ({A.saved.size})</Btn>}>My status</H1>
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:160}px,1fr))`}}>
      <Stat icon="send" label="Applications" value={mine.length} tone={C.brand}/>
      <Stat icon="eye" label="Reviewed" value={(counts.Reviewed||0)+(counts.Shortlisted||0)+(counts.Interview||0)+(counts.Offer||0)}/>
      <Stat icon="calendar" label="Interviews" value={counts.Interview||0} tone={C.warn}/>
      <Stat icon="award" label="Offers" value={counts.Offer||0} tone={C.ok}/></div>
    <Tabs items={items} value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="activity" title={tab==="all"?"No applications yet":`Nothing at the ${tab} stage`}
      body={tab==="all"?"When you apply, every stage the employer moves you through shows up here in real time.":"Applications move through stages as employers review them."}
      action={<Btn kind="primary" onClick={()=>A.go("search")}>Browse jobs</Btn>}/>
      :<div className="flex flex-col gap-3">
        {list.map((a,i)=>{const j=A.job(a.job); if(!j) return null; const e=A.emp(j.e);
          const idx=STAGES.indexOf(a.stage); const pct=a.stage==="Withdrawn"?0:((idx+1)/STAGES.length)*100;
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
                <div className="text-xs text-text-3">Applied</div>
                <div className="text-sm font-semibold text-text mt-0.5">{a.at}</div></div>}</div>
            {a.stage!=="Withdrawn"&&<div className="py-3.5 px-5 bg-bg border-t border-line-soft">
              <Bar v={pct} tone={a.stage==="Offer"?C.ok:C.brand} h={6}/>
              <div className="flex justify-between mt-2.5">
                {STAGES.map((s,k)=><div key={s} className="text-center flex-1">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 transition-colors duration-500 ${k<=idx?(a.stage==="Offer"?"bg-ok":"bg-brand"):"bg-line"}`}/>
                  <div className={`text-xs ${k<=idx?"text-text-2":"text-text-3"} ${k===idx?"font-bold":"font-normal"}`}>{s}</div></div>)}</div></div>}
            <div className="py-3 px-5 border-t border-line-soft flex gap-2.5 flex-wrap">
              <Btn kind="outline" size="sm" iconR="chevR" onClick={()=>A.openJob(j.id)}>View job</Btn>
              {a.stage!=="Withdrawn"&&a.stage!=="Offer"&&<Btn kind="ghost" size="sm" onClick={()=>A.withdraw(a.id)}>Withdraw</Btn>}
              {a.stage==="Offer"&&<Btn kind="ok" size="sm" icon="check" onClick={()=>A.acceptOffer(a.id)}>Accept offer</Btn>}
            {a.stage==="Withdrawn"&&a.withdrawnAt&&(Date.now()-a.withdrawnAt<7*24*60*60*1000)&&
              <Btn kind="outline" size="sm" icon="refresh" onClick={()=>A.restoreApp(a.id)}>Restore</Btn>}</div></Card>;})}</div>}
  </Page>;
}
