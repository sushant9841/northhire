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
  const pending=A.employers.filter(e=>!e.verified);
  const flagged=A.jobs.filter(j=>j.flagged);
  const drafts=[...A.blogs,...A.trainings].filter(x=>x.status==="draft");
  const mrr=A.employers.length*149;
  return <Page wide>
    <H1 sub="Everything happening across NorthHire right now"
      action={<div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <Btn kind="outline" icon="gear" onClick={()=>A.go("admSettings")}>Settings</Btn>
        <Btn kind="primary" icon="trend" onClick={()=>A.go("admStats")}>Statistics</Btn></div>}>Platform overview</H1>
    {(pending.length>0||flagged.length>0)&&<Banner tone="warn" icon="alert" title="Items need your attention" style={{marginBottom:18}}
      action={<Btn kind="primary" size="sm" onClick={()=>A.go(pending.length?"admEmployers":"admJobs")}>Review</Btn>}>
      {pending.length>0&&`${pending.length} employer${pending.length===1?"":"s"} awaiting verification`}
      {pending.length>0&&flagged.length>0&&" • "}
      {flagged.length>0&&`${flagged.length} flagged listing${flagged.length===1?"":"s"}`}</Banner>}
    <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`,gap:12,marginBottom:20}}>
      <Stat icon="users" label="Job seekers" value={A.people.length.toLocaleString()} tone={C.brand} onClick={()=>A.go("admUsers")}/>
      <Stat icon="building" label="Employers" value={A.employers.length} delta={`${pending.length} pending`} onClick={()=>A.go("admEmployers")}/>
      <Stat icon="briefcase" label="Live listings" value={A.jobs.filter(j=>j.status==="live").length} tone={C.violet} onClick={()=>A.go("admJobs")}/>
      <Stat icon="wallet" label="Monthly revenue" value={`$${(mrr/1000).toFixed(1)}k`} tone={C.ok} delta="+22% MoM"/></div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.3fr 1fr",gap:16}}>
      <Card><H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("admEmployers")}>Review all</Btn>}>Employers awaiting verification</H2>
        {pending.length===0?<div style={{fontSize:14,color:C.text3,padding:"18px 0",textAlign:"center"}}>Every employer is verified.</div>
          :pending.map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 0",borderBottom:`1px solid ${C.lineSoft}`,flexWrap:"wrap"}}>
            <EmpMark e={e} size={40} radius={10}/>
            <div style={{flex:"1 1 140px",minWidth:0}}>
              <div style={{fontSize:14.5,fontWeight:640,color:C.text}}>{e.name}</div>
              <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{e.industry} • {e.owner}</div></div>
            <div style={{display:"flex",gap:7}}>
              <Btn kind="ok" size="xs" icon="check" onClick={()=>A.verifyEmployer(e.id,true)}>Approve</Btn>
              <Btn kind="outline" size="xs" onClick={()=>A.holdEmployer(e.id)}>Hold</Btn></div></div>)}</Card>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card><H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("admJobs")}>Open</Btn>}>Moderation queue</H2>
          {flagged.length===0?<div style={{fontSize:14,color:C.text3,padding:"14px 0",textAlign:"center"}}>No listings flagged.</div>
            :flagged.map(j=><div key={j.id} style={{padding:"11px 0",borderBottom:`1px solid ${C.lineSoft}`}}>
              <div style={{fontSize:14,fontWeight:640,color:C.text}}>{j.t}</div>
              <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{A.emp(j.e).name}</div></div>)}
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.lineSoft}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13.5,color:C.text2}}>
              <span>Content drafts awaiting review</span><strong style={{color:C.text}}>{drafts.length}</strong></div></div></Card>
        <Card><H2>Feature switches</H2>
          {[["employerBlogs","Employer articles"],["employerTrainings","Employer trainings"],["publicSignup","Public sign-up"]].map(([k,l])=>
            <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"11px 0",borderBottom:`1px solid ${C.lineSoft}`}}>
              <span style={{fontSize:14,color:C.text}}>{l}</span>
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
    <div style={{maxWidth:420,marginBottom:16}}><Input icon="search" placeholder="Search by name, email or title" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <Card pad={0} style={{overflow:"hidden"}}>
      {list.map((u,i)=>{const apps=A.applications.filter(a=>a.user===u.id).length; const sus=A.suspended.has(u.id);
        return <div key={u.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",flexWrap:"wrap",
          borderBottom:i<list.length-1?`1px solid ${C.lineSoft}`:"none",background:sus?C.redBg:"#fff"}}>
          <SmartPortrait seed={u.seed} size={40}/>
          <div style={{flex:"1 1 170px",minWidth:0}}>
            <div style={{fontSize:14.5,fontWeight:640,color:C.text}}>{u.name}</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div></div>
          {!mob&&<div style={{width:160,fontSize:13,color:C.text2}}>{u.title}</div>}
          {!mob&&<div style={{width:110,fontSize:13,color:C.text2}}>{u.city}, {u.prov}</div>}
          <div style={{width:78,fontSize:13,color:C.text2}}>{apps} apps</div>
          <Tag tone={sus?"danger":"ok"} sm>{sus?"Suspended":"Active"}</Tag>
          <Btn kind="ghost" size="xs" icon="eye" onClick={()=>A.impersonate(u.id)}>View as</Btn>
          <Btn kind={sus?"outline":"ghost"} size="xs" onClick={()=>A.toggleSuspend(u.id)}>{sus?"Restore":"Suspend"}</Btn></div>;})}
      {list.length===0&&<div style={{padding:34,textAlign:"center",fontSize:14,color:C.text3}}>No users match that search.</div>}</Card>
  </Page>;
}

export function AdmEmployers(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("pending");
  const pending=A.employers.filter(e=>!e.verified), verified=A.employers.filter(e=>e.verified);
  const list=tab==="pending"?pending:verified;
  return <Page wide>
    <H1 sub="Approve companies before their listings carry a verified badge">Employers</H1>
    <Tabs items={[{k:"pending",label:"Awaiting review",n:pending.length},{k:"verified",label:"Verified",n:verified.length}]}
      value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="checkC2" title="Nothing to review" body="All employer accounts in this bucket are handled."/>
      :<div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`,gap:14}}>
        {list.map((e,i)=>{const jobs=A.jobs.filter(j=>j.e===e.id).length;
          const apps=A.applications.filter(a=>A.jobs.find(j=>j.id===a.job)?.e===e.id).length;
          return <Card key={e.id} delay={Math.min(i,6)*0.04}>
            <div style={{display:"flex",gap:13,alignItems:"center",marginBottom:14}}>
              <EmpMark e={e} size={48}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15.5,fontWeight:660,color:C.text,letterSpacing:"-.02em"}}>{e.name}</div>
                <div style={{fontSize:13,color:C.text2,marginTop:2}}>{e.industry} • {e.city}, {e.prov}</div></div>
              {e.verified&&<Tag tone="ok" sm icon="checkC2">Verified</Tag>}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["Contact",e.owner],["Size",e.size],["Listings",jobs],["Applicants",apps]].map(([k,v])=>
                <div key={k} style={{background:C.bg,borderRadius:10,padding:"9px 11px",minWidth:0}}>
                  <div style={{fontSize:11,color:C.text3}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div></div>)}</div>
            <div style={{display:"flex",gap:8,paddingTop:13,borderTop:`1px solid ${C.lineSoft}`,flexWrap:"wrap"}}>
              <Btn kind="ghost" size="sm" onClick={()=>A.openEmployer(e.id)}>View page</Btn>
              <div style={{flex:1}}/>
              {e.verified?<Btn kind="outline" size="sm" onClick={()=>A.verifyEmployer(e.id,false)}>Revoke</Btn>
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
    <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{flex:"1 1 240px",maxWidth:360}}><Input icon="search" placeholder="Search listings or employers" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Tabs items={[{k:"all",label:"All",n:A.jobs.length},{k:"flagged",label:"Flagged",n:A.jobs.filter(j=>j.flagged).length},
        {k:"paused",label:"Not live",n:A.jobs.filter(j=>j.status!=="live").length}]} value={tab} onChange={setTab}/></div>
    <Card pad={0} style={{overflow:"hidden"}}>
      {list.map((j,i)=>{const e=A.emp(j.e); const n=A.applications.filter(a=>a.job===j.id).length;
        return <div key={j.id} style={{display:"flex",alignItems:"center",gap:13,padding:"14px 18px",flexWrap:"wrap",
          borderBottom:i<list.length-1?`1px solid ${C.lineSoft}`:"none",background:j.flagged?C.warnBg:"#fff"}}>
          <EmpMark e={e} size={38} radius={10}/>
          <div style={{flex:"1 1 200px",minWidth:0}}>
            <div style={{fontSize:14.5,fontWeight:640,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.t}</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{e.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div></div>
          {!mob&&<div style={{width:86,fontSize:13,color:C.text2}}>{n} applicant{n===1?"":"s"}</div>}
          <Tag tone={j.status==="live"?"ok":"warn"} sm>{j.status==="live"?"Live":j.status==="paused"?"Paused":"Closed"}</Tag>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            <Btn kind="ghost" size="xs" icon="eye" title="Preview" onClick={()=>A.openJob(j.id)}/>
            <Btn kind="outline" size="xs" onClick={()=>A.toggleJobStatus(j.id)}>{j.status==="live"?"Pause":"Restore"}</Btn>
            <Btn kind={j.flagged?"dangerSoft":"ghost"} size="xs" onClick={()=>A.flagJob(j.id)}>{j.flagged?"Unflag":"Flag"}</Btn></div></div>;})}
      {list.length===0&&<div style={{padding:34,textAlign:"center",fontSize:14,color:C.text3}}>Nothing matches that filter.</div>}</Card>
  </Page>;
}

export function AdmSettings(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const S=A.settings;
  const Group=({title,sub,rows})=><Card pad={mob?18:24} style={{marginBottom:16}}>
    <H2 sub={sub}>{title}</H2>
    {rows.map(([k,label,desc,danger])=>
      <div key={k} style={{display:"flex",gap:14,alignItems:"center",padding:"15px 0",borderBottom:`1px solid ${C.lineSoft}`}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14.5,fontWeight:620,color:danger?C.red:C.text}}>{label}</div>
          <div style={{fontSize:13,color:C.text2,marginTop:3,lineHeight:1.55}}>{desc}</div></div>
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
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        {[["Employer-published articles",A.blogs.filter(b=>b.owner!=="admin").length],
          ["Employer-published trainings",A.trainings.filter(t=>t.owner!=="admin").length],
          ["Featured listings",A.jobs.filter(j=>j.featured).length],
          ["Listings awaiting approval",A.jobs.filter(j=>j.status==="review").length]].map(([k,v])=>
          <div key={k} style={{background:C.bg,borderRadius:11,padding:"13px 15px"}}>
            <div style={{fontSize:12.5,color:C.text2}}>{k}</div>
            <div style={{fontSize:22,fontWeight:730,color:C.text,marginTop:5,letterSpacing:"-.03em"}}>{v}</div></div>)}</div></Card>
  </Page>;
}

export function AdmLog(){
  const A=use();
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
      action={<Btn kind="outline" size="sm" icon="download" onClick={A.exportLog}>Export CSV</Btn>}>Activity log</H1>
    <Card pad={mob=>20} style={{marginBottom:14,borderRadius:16}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <Input icon="search" placeholder="Search text or actor" value={q} onChange={e=>setQ(e.target.value)}/>
        <Sel value={cat} onChange={e=>setCat(e.target.value)}>{[...new Map(categories.map(c=>[c[0],c])).values()].map(([k,l])=><option key={k} value={k}>{l}</option>)}</Sel>
      </div>
      {(q||cat!=="all")&&<div style={{marginTop:12,fontSize:13,color:C.text2}}>
        Showing <strong style={{color:C.text}}>{list.length}</strong> of {A.activity.length} entries
        <button onClick={()=>{setQ("");setCat("all");}} style={{background:"none",border:"none",padding:0,marginLeft:10,cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.brand,fontWeight:640}}>Clear</button>
      </div>}
    </Card>
    {list.length===0?<Empty icon="file" title={A.activity.length===0?"No activity yet":"Nothing matches"} body="Every publish, approval, moderation action and setting change is recorded here."/>
      :<Card pad={0} style={{overflow:"hidden",borderRadius:16}}>
        {list.map((e,i)=><div key={e.id} style={{display:"flex",gap:14,padding:"14px 18px",
          borderBottom:i<list.length-1?`1px solid ${C.lineSoft}`:"none"}}>
          <div style={{width:34,height:34,borderRadius:9,background:C.bg,color:C.text2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <I n={e.icon||"file"} s={16}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.text}</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>{e.actor} • {e.action} • {e.at}</div></div></div>)}</Card>}
  </Page>;
}

export function AdmStats(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const byCat=CATS.map(c=>({...c,n:A.jobs.filter(j=>j.cat===c.id).length})).sort((a,b)=>b.n-a.n);
  const max=Math.max(1,...byCat.map(c=>c.n));
  const byStage=STAGES.map(s=>[s,A.applications.filter(a=>a.stage===s).length]);
  const months=[["Mar",58],["Apr",64],["May",71],["Jun",78],["Jul",86],["Aug",94]];
  const BarRow=({label,value,max,tone=C.brand})=><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
    <div style={{width:mob?110:170,fontSize:13.5,color:C.text,fontWeight:520,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
    <div style={{flex:1,minWidth:30}}><Bar v={max?(value/max)*100:0} tone={tone} h={9}/></div>
    <div style={{width:40,textAlign:"right",fontSize:13.5,fontWeight:700,color:C.text,flexShrink:0}}>{value}</div></div>;
  return <Page wide>
    <H1 sub="Marketplace health across the whole platform">Platform statistics</H1>
    <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`,gap:12,marginBottom:20}}>
      <Stat icon="briefcase" label="Total listings" value={A.jobs.length} tone={C.brand}/>
      <Stat icon="send" label="Applications" value={A.applications.length} tone={C.violet}/>
      <Stat icon="book" label="Published content" value={A.blogs.filter(b=>b.status==="published").length+A.trainings.filter(t=>t.status==="published").length}/>
      <Stat icon="award" label="Offers extended" value={A.applications.filter(a=>a.stage==="Offer").length} tone={C.ok}/></div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>
      <Card><H2>Listings by sector</H2>{byCat.map(c=><BarRow key={c.id} label={c.label} value={c.n} max={max}/>)}</Card>
      <Card><H2>Applications by stage</H2>
        {byStage.map(([s,n])=><BarRow key={s} label={s} value={n} max={Math.max(1,A.applications.length)} tone={C.violet}/>)}
        <div style={{marginTop:18,paddingTop:16,borderTop:`1px solid ${C.lineSoft}`,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[["Verified employers",A.employers.filter(e=>e.verified).length],["Flagged listings",A.jobs.filter(j=>j.flagged).length],
            ["Suspended users",A.suspended.size],["Training enrolments",A.trainings.reduce((s,t)=>s+t.enrolled,0).toLocaleString()]].map(([k,v])=>
            <div key={k} style={{background:C.bg,borderRadius:11,padding:"12px 14px"}}>
              <div style={{fontSize:12,color:C.text3}}>{k}</div>
              <div style={{fontSize:21,fontWeight:730,color:C.text,marginTop:4,letterSpacing:"-.03em"}}>{v}</div></div>)}</div></Card></div>
    <Card><H2 sub="Subscription revenue, thousands CAD">Revenue trend</H2>
      <div style={{display:"flex",alignItems:"flex-end",gap:mob?10:20,height:190,padding:"10px 0"}}>
        {months.map(([m,v],i)=><div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text}}>${v}k</div>
          <div style={{width:"100%",height:`${v}%`,background:C.brand,borderRadius:"8px 8px 3px 3px",minHeight:8,
            animation:`grow .6s cubic-bezier(.22,.68,.35,1) ${i*0.07}s both`}}/>
          <div style={{fontSize:12,color:C.text3}}>{m}</div></div>)}</div></Card>
  </Page>;
}
