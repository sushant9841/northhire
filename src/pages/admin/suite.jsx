import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Page, Btn, Banner, Stat, Card, Switch, Input, Sel, SmartPortrait, Tag, Tabs, Empty, Bar, H1, H2 } from "../../design/primitives.jsx";
import { pay, payShort } from "../../helpers/utils.js";
import { CATS, STAGES } from "../../store/seed/constants.js";
import { EmpMark } from "../shared/cards.jsx";

export function AdmHome(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const pending=A.employers.filter(e=>!e.verified&&!e.hold);
  const flagged=A.jobs.filter(j=>j.flagged);
  const drafts=[...A.blogs,...A.trainings].filter(x=>x.status==="draft");
  const mrr=A.employers.reduce((s,e)=>s+(A.PLANS[e.plan]?.price||0),0);
  return <Page wide>
    <H1 sub="Everything happening across NorthHire right now"
      action={<div className="flex gap-2.5 flex-wrap">
        <Btn kind="outline" icon="gear" onClick={()=>A.go("admSettings")}>Settings</Btn>
        <Btn kind="primary" icon="trend" onClick={()=>A.go("admStats")}>Statistics</Btn></div>}>Platform overview</H1>
    {(pending.length>0||flagged.length>0)&&<Banner tone="warn" icon="alert" title="Items need your attention" style={{marginBottom:18}}
      action={<Btn kind="primary" size="sm" onClick={()=>A.go(pending.length?"admEmployers":"admJobs")}>Review</Btn>}>
      {pending.length>0&&`${pending.length} employer${pending.length===1?"":"s"} awaiting verification`}
      {pending.length>0&&flagged.length>0&&" • "}
      {flagged.length>0&&`${flagged.length} flagged listing${flagged.length===1?"":"s"}`}</Banner>}
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`}}>
      <Stat icon="users" label="Job seekers" value={A.people.length.toLocaleString()} tone={C.brand} onClick={()=>A.go("admUsers")}/>
      <Stat icon="building" label="Employers" value={A.employers.length} delta={`${pending.length} pending`} onClick={()=>A.go("admEmployers")}/>
      <Stat icon="briefcase" label="Live listings" value={A.jobs.filter(j=>j.status==="live").length} tone={C.violet} onClick={()=>A.go("admJobs")}/>
      <Stat icon="wallet" label="Monthly revenue" value={`$${(mrr/1000).toFixed(1)}k`} tone={C.ok}/></div>
    <div className="grid gap-4" style={{gridTemplateColumns:mob?"1fr":"1.3fr 1fr"}}>
      <Card><H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("admEmployers")}>Review all</Btn>}>Employers awaiting verification</H2>
        {pending.length===0?<div className="text-sm text-text-3 py-5 text-center">Every employer is verified.</div>
          :pending.map(e=><div key={e.id} className="flex items-center gap-3 py-3 border-b border-line-soft flex-wrap">
            <EmpMark e={e} size={40} radius={10}/>
            <div className="grow shrink basis-35 min-w-0">
              <div className="text-sm font-semibold text-text">{e.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{e.industry} • {e.owner}</div></div>
            <div className="flex gap-2">
              <Btn kind="ok" size="xs" icon="check" onClick={()=>A.verifyEmployer(e.id,true)}>Approve</Btn>
              <Btn kind="outline" size="xs" onClick={()=>A.holdEmployer(e.id)}>Hold</Btn></div></div>)}</Card>
      <div className="flex flex-col gap-4">
        <Card><H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("admJobs")}>Open</Btn>}>Moderation queue</H2>
          {flagged.length===0?<div className="text-sm text-text-3 py-3.5 text-center">No listings flagged.</div>
            :flagged.map(j=><div key={j.id} className="py-3 border-b border-line-soft">
              <div className="text-sm font-semibold text-text">{j.t}</div>
              <div className="text-xs text-text-3 mt-0.5">{A.emp(j.e).name}</div></div>)}
          <div className="mt-3.5 pt-3.5 border-t border-line-soft">
            <div className="flex justify-between text-sm text-text-2">
              <span>Content drafts awaiting review</span><strong className="text-text">{drafts.length}</strong></div></div></Card>
        <Card><H2>Feature switches</H2>
          {[["employerBlogs","Employer articles"],["employerTrainings","Employer trainings"],["publicSignup","Public sign-up"]].map(([k,l])=>
            <div key={k} className="flex items-center justify-between gap-3 py-3 border-b border-line-soft">
              <span className="text-sm text-text">{l}</span>
              <Switch on={A.settings[k]} onChange={v=>A.setSetting(k,v)}/></div>)}
          <Btn kind="ghost" size="sm" full style={{marginTop:12}} iconR="chevR" onClick={()=>A.go("admSettings")}>All platform settings</Btn></Card></div></div>
  </Page>;
}

export function AdmUsers(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [q,setQ]=useState("");
  const list=A.people.filter(u=>!q||u.name.toLowerCase().includes(q.toLowerCase())||u.email.toLowerCase().includes(q.toLowerCase())||u.title.toLowerCase().includes(q.toLowerCase()));
  return <Page wide>
    <H1 sub={`${A.people.length} registered job seekers`}>Users</H1>
    <div className="max-w-105 mb-4"><Input icon="search" placeholder="Search by name, email or title" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <Card pad={0} style={{overflow:"hidden"}}>
      {list.map((u,i)=>{const apps=A.applications.filter(a=>a.user===u.id).length; const sus=A.suspended.has(u.id);
        return <div key={u.id} className={`flex items-center gap-3.5 py-3.5 px-5 flex-wrap ${i<list.length-1?"border-b border-line-soft":""} ${sus?"bg-red-bg":"bg-white"}`}>
          <SmartPortrait seed={u.seed} size={40}/>
          <div className="grow shrink basis-43 min-w-0">
            <div className="text-sm font-semibold text-text">{u.name}</div>
            <div className="text-xs text-text-3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</div></div>
          {!mob&&<div className="w-40 text-sm text-text-2">{u.title}</div>}
          {!mob&&<div className="w-28 text-sm text-text-2">{u.city}, {u.prov}</div>}
          <div className="w-20 text-sm text-text-2">{apps} apps</div>
          <Tag tone={sus?"danger":"ok"} sm>{sus?"Suspended":"Active"}</Tag>
          <Btn kind="ghost" size="xs" icon="eye" onClick={()=>A.impersonate(u.id)}>View as</Btn>
          <Btn kind={sus?"outline":"ghost"} size="xs" onClick={()=>A.toggleSuspend(u.id)}>{sus?"Restore":"Suspend"}</Btn></div>;})}
      {list.length===0&&<div className="p-9 text-center text-sm text-text-3">No users match that search.</div>}</Card>
  </Page>;
}

export function AdmEmployers(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("pending"); const [q,setQ]=useState("");
  const match=e=>!q||e.name.toLowerCase().includes(q.toLowerCase())||e.industry.toLowerCase().includes(q.toLowerCase())||(e.owner||"").toLowerCase().includes(q.toLowerCase());
  const pending=A.employers.filter(e=>!e.verified&&!e.hold&&match(e)), held=A.employers.filter(e=>!e.verified&&e.hold&&match(e)), verified=A.employers.filter(e=>e.verified&&match(e));
  const list=tab==="pending"?pending:tab==="held"?held:verified;
  return <Page wide>
    <H1 sub="Approve companies before their listings carry a verified badge">Employers</H1>
    <div className="max-w-105 mb-4"><Input icon="search" placeholder="Search by name, industry or contact" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <Tabs items={[{k:"pending",label:"Awaiting review",n:pending.length},{k:"held",label:"On hold",n:held.length},{k:"verified",label:"Verified",n:verified.length}]}
      value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="checkC2" title="Nothing to review" body="All employer accounts in this bucket are handled."/>
      :<div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`}}>
        {list.map((e,i)=>{const jobs=A.jobs.filter(j=>j.e===e.id).length;
          const apps=A.applications.filter(a=>A.jobs.find(j=>j.id===a.job)?.e===e.id).length;
          return <Card key={e.id} delay={Math.min(i,6)*0.04}>
            <div className="flex gap-3 items-center mb-3.5">
              <EmpMark e={e} size={48}/>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-text tracking-tight">{e.name}</div>
                <div className="text-sm text-text-2 mt-0.5">{e.industry} • {e.city}, {e.prov}</div></div>
              {e.verified&&<Tag tone="ok" sm icon="checkC2">Verified</Tag>}</div>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              {[["Contact",e.owner],["Size",e.size],["Listings",jobs],["Applicants",apps]].map(([k,v])=>
                <div key={k} className="bg-bg rounded-xl py-2.5 px-3 min-w-0">
                  <div className="text-xs text-text-3">{k}</div>
                  <div className="text-sm font-semibold text-text mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{v}</div></div>)}</div>
            <div className="flex gap-2 pt-3 border-t border-line-soft flex-wrap">
              <Btn kind="ghost" size="sm" onClick={()=>A.openEmployer(e.id)}>View page</Btn>
              <div className="flex-1"/>
              {e.verified?<Btn kind="outline" size="sm" onClick={()=>A.verifyEmployer(e.id,false)}>Revoke</Btn>
                :e.hold?<><Btn kind="ok" size="sm" icon="check" onClick={()=>A.verifyEmployer(e.id,true)}>Approve</Btn>
                  <Btn kind="outline" size="sm" onClick={()=>A.holdEmployer(e.id)}>Release hold</Btn></>
                :<><Btn kind="ok" size="sm" icon="check" onClick={()=>A.verifyEmployer(e.id,true)}>Approve</Btn>
                  <Btn kind="dangerSoft" size="sm" onClick={()=>A.holdEmployer(e.id)}>Hold</Btn></>}</div></Card>;})}</div>}
  </Page>;
}

export function AdmJobs(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("all"); const [q,setQ]=useState("");
  const base=tab==="flagged"?A.jobs.filter(j=>j.flagged):tab==="paused"?A.jobs.filter(j=>j.status!=="live"):A.jobs;
  const list=base.filter(j=>!q||j.t.toLowerCase().includes(q.toLowerCase())||A.emp(j.e).name.toLowerCase().includes(q.toLowerCase()));
  return <Page wide>
    <H1 sub="Review, pause or flag any listing on the platform">Job moderation</H1>
    <div className="flex gap-3 mb-5 flex-wrap items-center">
      <div className="grow shrink basis-60 max-w-90"><Input icon="search" placeholder="Search listings or employers" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Tabs items={[{k:"all",label:"All",n:A.jobs.length},{k:"flagged",label:"Flagged",n:A.jobs.filter(j=>j.flagged).length},
        {k:"paused",label:"Not live",n:A.jobs.filter(j=>j.status!=="live").length}]} value={tab} onChange={setTab}/></div>
    <Card pad={0} style={{overflow:"hidden"}}>
      {list.map((j,i)=>{const e=A.emp(j.e); const n=A.applications.filter(a=>a.job===j.id).length;
        return <div key={j.id} className={`flex items-center gap-3 py-3.5 px-5 flex-wrap ${i<list.length-1?"border-b border-line-soft":""} ${j.flagged?"bg-warn-bg":"bg-white"}`}>
          <EmpMark e={e} size={38} radius={10}/>
          <div className="grow shrink basis-50 min-w-0">
            <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
            <div className="text-xs text-text-3 mt-0.5">{e.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div></div>
          {!mob&&<div className="w-22 text-sm text-text-2">{n} applicant{n===1?"":"s"}</div>}
          <Tag tone={j.status==="live"?"ok":j.status==="review"?"violet":"warn"} sm>{j.status==="live"?"Live":j.status==="paused"?"Paused":j.status==="review"?"Pending review":"Closed"}</Tag>
          <div className="flex gap-2 flex-wrap">
            <Btn kind="ghost" size="xs" icon="eye" title="Preview" onClick={()=>A.openJob(j.id)}/>
            <Btn kind="outline" size="xs" onClick={()=>A.toggleJobStatus(j.id)}>{j.status==="live"?"Pause":"Restore"}</Btn>
            <Btn kind={j.flagged?"dangerSoft":"ghost"} size="xs" onClick={()=>A.flagJob(j.id)}>{j.flagged?"Unflag":"Flag"}</Btn></div></div>;})}
      {list.length===0&&<div className="p-9 text-center text-sm text-text-3">Nothing matches that filter.</div>}</Card>
  </Page>;
}

export function AdmSettings(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const S=A.settings;
  const Group=({title,sub,rows})=><Card pad={mob?18:24} style={{marginBottom:16}}>
    <H2 sub={sub}>{title}</H2>
    {rows.map(([k,label,desc,danger])=>
      <div key={k} className="flex gap-3.5 items-center py-4 border-b border-line-soft">
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${danger?"text-red":"text-text"}`}>{label}</div>
          <div className="text-sm text-text-2 mt-1 leading-normal">{desc}</div></div>
        <Switch on={S[k]} onChange={v=>A.setSetting(k,v)}/></div>)}</Card>;
  return <Page narrow>
    <H1 sub="Platform-wide switches. Changes apply immediately for every account."
      action={<Btn kind="outline" size="sm" icon="file" onClick={()=>A.go("admLog")}>Activity log</Btn>}>Platform settings</H1>
    <Group title="Employer permissions" sub="Control what employer accounts are allowed to do"
      rows={[["employerBlogs","Employers can publish articles","When off, employers cannot create or edit articles. Already-published articles stay visible."],
        ["employerTrainings","Employers can publish trainings","When off, employers cannot create or edit training courses."],
        ["employerFeature","Employers can feature their own listings","When off, only administrators can place a listing on the home page."],
        ["autoApproveJobs","New listings go live without review","When off, every new listing is held for moderator approval."]]}/>
    <Group title="Job seeker experience" sub="What is available to job seeker accounts"
      rows={[["publicSignup","Public sign-up is open","When off, new job seeker registration is closed."],
        ["cvBuilder","CV builder enabled","Turns the multi-template CV builder on or off for all job seekers."],
        ["matching","AI matching enabled","When off, match scores are hidden and jobs are sorted by date only."],
        ["enrolments","Training enrolment enabled","When off, learners can browse trainings but not enrol."]]}/>
    <Group title="Platform" sub="Global controls"
      rows={[["payTransparency","Require a pay range on every listing","Strongly recommended. Employers cannot publish without stating pay."],
        ["maintenance","Maintenance mode","Shows a maintenance notice to everyone except administrators.",true]]}/>
    <Card pad={mob?18:24}>
      <H2 sub="A snapshot of what these switches currently affect">Current impact</H2>
      <div className={`grid ${mob?"grid-cols-1":"grid-cols-2"} gap-3`}>
        {[["Employer-published articles",A.blogs.filter(b=>b.owner!=="admin").length],
          ["Employer-published trainings",A.trainings.filter(t=>t.owner!=="admin").length],
          ["Featured listings",A.jobs.filter(j=>j.featured).length],
          ["Listings awaiting approval",A.jobs.filter(j=>j.status==="review").length]].map(([k,v])=>
          <div key={k} className="bg-bg rounded-xl py-3 px-4">
            <div className="text-xs text-text-2">{k}</div>
            <div className="text-2xl font-bold text-text mt-2 tracking-tight">{v}</div></div>)}</div></Card>
  </Page>;
}

export function AdmLog(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [q,setQ]=useState(""); const [cat,setCat]=useState("all");
  const categories=[["all","All actions"],["auth","Auth"],["job","Jobs"],["application","Applications"],["pipeline","Pipeline"],
    ["employer","Employers"],["blog","Content"],["training","Content"],["billing","Billing"],["settings","Settings"],["admin","Admin"]];
  const list=A.activity.filter(e=>{
    if(cat!=="all"&&!e.action.startsWith(cat))return false;
    if(q&&!(e.text.toLowerCase().includes(q.toLowerCase())||e.actor.toLowerCase().includes(q.toLowerCase())))return false;
    return true;
  });
  return <Page narrow>
    <H1 sub={`${A.activity.length} recorded event${A.activity.length===1?"":"s"} in this session`}
      action={<Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportLog(list)}>Export {list.length<A.activity.length?`filtered (${list.length})`:"CSV"}</Btn>}>Activity log</H1>
    <Card pad={mob?16:20} style={{marginBottom:14,borderRadius:16}}>
      <div className="grid gap-3" style={{gridTemplateColumns:"2fr 1fr"}}>
        <Input icon="search" placeholder="Search text or actor" value={q} onChange={e=>setQ(e.target.value)}/>
        <Sel value={cat} onChange={e=>setCat(e.target.value)}>{[...new Map(categories.map(c=>[c[0],c])).values()].map(([k,l])=><option key={k} value={k}>{l}</option>)}</Sel>
      </div>
      {(q||cat!=="all")&&<div className="mt-3 text-sm text-text-2">
        Showing <strong className="text-text">{list.length}</strong> of {A.activity.length} entries
        <button onClick={()=>{setQ("");setCat("all");}} className="bg-transparent border-0 p-0 ml-2.5 cursor-pointer text-sm text-brand font-semibold">Clear</button>
      </div>}
    </Card>
    {list.length===0?<Empty icon="file" title={A.activity.length===0?"No activity yet":"Nothing matches"} body="Every publish, approval, moderation action and setting change is recorded here."/>
      :<Card pad={0} style={{overflow:"hidden",borderRadius:16}}>
        {list.map((e,i)=><div key={e.id} className={`flex gap-3.5 py-3.5 px-5 ${i<list.length-1?"border-b border-line-soft":""}`}>
          <div className="w-9 h-9 rounded-lg bg-bg text-text-2 flex items-center justify-center shrink-0">
            <I n={e.icon||"file"} s={16}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{e.text}</div>
            <div className="text-xs text-text-3 mt-1">{e.actor} • {e.action} • {e.at}</div></div></div>)}</Card>}
  </Page>;
}

export function AdmStats(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const byCat=CATS.map(c=>({...c,n:A.jobs.filter(j=>j.cat===c.id).length})).sort((a,b)=>b.n-a.n);
  const max=Math.max(1,...byCat.map(c=>c.n));
  const byStage=STAGES.map(s=>[s,A.applications.filter(a=>a.stage===s).length]);
  const byPlan=A.PLAN_ORDER.map(p=>({name:p,n:A.employers.filter(e=>e.plan===p).length,revenue:A.employers.filter(e=>e.plan===p).length*(A.PLANS[p]?.price||0)}));
  const totalRevenue=byPlan.reduce((s,p)=>s+p.revenue,0);
  const BarRow=({label,value,max,tone=C.brand})=><div className="flex items-center gap-3 mb-3">
    <div className={`${mob?"w-28":"w-43"} text-sm text-text font-medium shrink-0 overflow-hidden text-ellipsis whitespace-nowrap`}>{label}</div>
    <div className="flex-1 min-w-8"><Bar v={max?(value/max)*100:0} tone={tone} h={9}/></div>
    <div className="w-10 text-right text-sm font-bold text-text shrink-0">{value}</div></div>;
  return <Page wide>
    <H1 sub="Marketplace health across the whole platform">Platform statistics</H1>
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`}}>
      <Stat icon="briefcase" label="Total listings" value={A.jobs.length} tone={C.brand}/>
      <Stat icon="send" label="Applications" value={A.applications.length} tone={C.violet}/>
      <Stat icon="book" label="Published content" value={A.blogs.filter(b=>b.status==="published").length+A.trainings.filter(t=>t.status==="published").length}/>
      <Stat icon="award" label="Offers extended" value={A.applications.filter(a=>a.stage==="Offer").length} tone={C.ok}/></div>
    <div className={`grid ${mob?"grid-cols-1":"grid-cols-2"} gap-4 mb-4`}>
      <Card><H2>Listings by sector</H2>{byCat.map(c=><BarRow key={c.id} label={c.label} value={c.n} max={max}/>)}</Card>
      <Card><H2>Applications by stage</H2>
        {byStage.map(([s,n])=><BarRow key={s} label={s} value={n} max={Math.max(1,A.applications.length)} tone={C.violet}/>)}
        <div className="mt-5 pt-4 border-t border-line-soft grid grid-cols-2 gap-3">
          {[["Verified employers",A.employers.filter(e=>e.verified).length],["Flagged listings",A.jobs.filter(j=>j.flagged).length],
            ["Suspended users",A.suspended.size],["Training enrolments",A.trainings.reduce((s,t)=>s+t.enrolled,0).toLocaleString()]].map(([k,v])=>
            <div key={k} className="bg-bg rounded-xl py-3 px-3.5">
              <div className="text-xs text-text-3">{k}</div>
              <div className="text-xl font-bold text-text mt-1 tracking-tight">{v}</div></div>)}</div></Card></div>
    <Card><H2 sub={`$${totalRevenue.toLocaleString()}/mo across ${A.employers.length} employer accounts`}>Revenue by plan</H2>
      {byPlan.map(p=><BarRow key={p.name} label={`${p.name} (${p.n})`} value={p.revenue} max={Math.max(1,totalRevenue)} tone={p.name==="Enterprise"?C.violet:p.name==="Growth"?C.brand:C.text3}/>)}
    </Card>
  </Page>;
}
