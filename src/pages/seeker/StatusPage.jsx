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
    <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:160}px,1fr))`,gap:12,marginBottom:20}}>
      <Stat icon="send" label="Applications" value={mine.length} tone={C.brand}/>
      <Stat icon="eye" label="Reviewed" value={(counts.Reviewed||0)+(counts.Shortlisted||0)+(counts.Interview||0)+(counts.Offer||0)}/>
      <Stat icon="calendar" label="Interviews" value={counts.Interview||0} tone={C.warn}/>
      <Stat icon="award" label="Offers" value={counts.Offer||0} tone={C.ok}/></div>
    <Tabs items={items} value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="activity" title={tab==="all"?"No applications yet":`Nothing at the ${tab} stage`}
      body={tab==="all"?"When you apply, every stage the employer moves you through shows up here in real time.":"Applications move through stages as employers review them."}
      action={<Btn kind="primary" onClick={()=>A.go("search")}>Browse jobs</Btn>}/>
      :<div style={{display:"flex",flexDirection:"column",gap:12}}>
        {list.map((a,i)=>{const j=A.job(a.job); if(!j) return null; const e=A.emp(j.e);
          const idx=STAGES.indexOf(a.stage); const pct=a.stage==="Withdrawn"?0:((idx+1)/STAGES.length)*100;
          return <Card key={a.id} pad={0} delay={Math.min(i,6)*0.05} style={{overflow:"hidden"}}>
            <div style={{padding:mob?16:18,display:"flex",gap:14,alignItems:"flex-start"}}>
              <EmpMark e={e} size={46}/>
              <div style={{flex:1,minWidth:0}}>
                <button onClick={()=>A.openJob(j.id)} style={{background:"none",border:"none",padding:0,cursor:"pointer",
                  fontFamily:"inherit",textAlign:"left",fontSize:16,fontWeight:660,color:C.text,letterSpacing:"-.02em"}}>{j.t}</button>
                <div style={{fontSize:13.5,color:C.text2,marginTop:4}}>{e.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div>
                <div style={{display:"flex",gap:9,alignItems:"center",marginTop:10,flexWrap:"wrap"}}>
                  <Tag tone={a.stage==="Offer"?"ok":a.stage==="Interview"?"warn":a.stage==="Withdrawn"?"neutral":"brand"} sm>{a.stage}</Tag>
                  <span style={{fontSize:13,color:a.stage==="Withdrawn"?C.text3:C.text2}}>{a.note}</span></div></div>
              {!mob&&<div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:12.5,color:C.text3}}>Applied</div>
                <div style={{fontSize:13.5,fontWeight:600,color:C.text,marginTop:2}}>{a.at}</div></div>}</div>
            {a.stage!=="Withdrawn"&&<div style={{padding:"13px 18px",background:C.bg,borderTop:`1px solid ${C.lineSoft}`}}>
              <Bar v={pct} tone={a.stage==="Offer"?C.ok:C.brand} h={6}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:9}}>
                {STAGES.map((s,k)=><div key={s} style={{textAlign:"center",flex:1}}>
                  <div style={{width:8,height:8,borderRadius:99,margin:"0 auto 4px",transition:"background .4s",
                    background:k<=idx?(a.stage==="Offer"?C.ok:C.brand):C.line}}/>
                  <div style={{fontSize:10.5,color:k<=idx?C.text2:C.text3,fontWeight:k===idx?650:400}}>{s}</div></div>)}</div></div>}
            <div style={{padding:"12px 18px",borderTop:`1px solid ${C.lineSoft}`,display:"flex",gap:9,flexWrap:"wrap"}}>
              <Btn kind="outline" size="sm" iconR="chevR" onClick={()=>A.openJob(j.id)}>View job</Btn>
              {a.stage!=="Withdrawn"&&a.stage!=="Offer"&&<Btn kind="ghost" size="sm" onClick={()=>A.withdraw(a.id)}>Withdraw</Btn>}
              {a.stage==="Offer"&&<Btn kind="ok" size="sm" icon="check" onClick={()=>A.acceptOffer(a.id)}>Accept offer</Btn>}
            {a.stage==="Withdrawn"&&a.withdrawnAt&&(Date.now()-a.withdrawnAt<7*24*60*60*1000)&&
              <Btn kind="outline" size="sm" icon="refresh" onClick={()=>A.restoreApp(a.id)}>Restore</Btn>}</div></Card>;})}</div>}
  </Page>;
}
