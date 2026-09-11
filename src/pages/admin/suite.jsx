import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Page, Btn, Banner, Stat, Card, Switch, Input, Sel, SmartPortrait, Tag, Tabs, Empty, Bar, H1, H2, Modal, ConfirmDialog, Field, Area, usePagination, Pagination } from "../../design/primitives.jsx";
import { pay, payShort } from "../../helpers/utils.js";
import { CATS, STAGES } from "../../store/seed/constants.js";
import { jobTone, jobStatusLabel } from "../../helpers/statusTone.js";
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
    {/* Escalation thresholds - once a queue crosses its configured "high" number the banner
        goes red (danger) instead of yellow (warn). Numbers come from platform_config.adminAlerts
        so an operator can retune "backlog vs queue" without a redeploy. */}
    {(()=>{const t=A.platformConfig?.adminAlerts||{};
      const escalated=pending.length>=t.pendingEmployersHigh||flagged.length>=t.flaggedJobsHigh||drafts.length>=t.contentDraftsHigh;
      if(!pending.length&&!flagged.length)return null;
      return <Banner tone={escalated?"danger":"warn"} icon={escalated?"alert":"alert"}
        title={escalated?"Backlog above threshold — needs immediate attention":"Items need your attention"}
        style={{marginBottom:18}}
        action={<Btn kind="primary" size="sm" onClick={()=>A.go(pending.length?"admEmployers":"admJobs")}>Review</Btn>}>
        {pending.length>0&&<>{pending.length} employer{pending.length===1?"":"s"} awaiting verification{t.pendingEmployersHigh&&pending.length>=t.pendingEmployersHigh?<Tag tone="danger" sm style={{marginLeft:6}}>≥ {t.pendingEmployersHigh}</Tag>:null}</>}
        {pending.length>0&&flagged.length>0&&" • "}
        {flagged.length>0&&<>{flagged.length} flagged listing{flagged.length===1?"":"s"}{t.flaggedJobsHigh&&flagged.length>=t.flaggedJobsHigh?<Tag tone="danger" sm style={{marginLeft:6}}>≥ {t.flaggedJobsHigh}</Tag>:null}</>}
      </Banner>;})()}
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
              <Btn kind="ok" size="xs" icon="check" onClick={()=>{A.verifyEmployer(e.id,true);A.toast(`${e.name} approved`,"ok");}}>Approve</Btn>
              <Btn kind="outline" size="xs" onClick={()=>{A.holdEmployer(e.id);A.toast(`${e.name} put on hold`);}}>Hold</Btn></div></div>)}</Card>
      <div className="flex flex-col gap-4">
        <Card><H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("admJobs")}>Open</Btn>}>Moderation queue</H2>
          {flagged.length===0?<div className="text-sm text-text-3 py-3.5 text-center">No listings flagged.</div>
            :flagged.map(j=><div key={j.id} className="py-3 border-b border-line-soft">
              <div className="text-sm font-semibold text-text">{j.t}</div>
              <div className="text-xs text-text-3 mt-0.5">{A.emp(j.e).name}</div></div>)}
          <div className="mt-3.5 pt-3.5 border-t border-line-soft">
            <div className="flex justify-between text-sm text-text-2">
              <span>Content drafts awaiting review</span><strong className="text-text">{drafts.length}</strong></div></div></Card>
        <Card><H2 sub="Shortcuts to 3 of the switches in Platform settings — changing one changes the other.">Feature switches</H2>
          {[["employerBlogs","Employer articles"],["employerTrainings","Employer trainings"],["publicSignup","Public sign-up"]].map(([k,l])=>
            <div key={k} className="flex items-center justify-between gap-3 py-3 border-b border-line-soft">
              <span className="text-sm text-text">{l}</span>
              <Switch on={A.settings[k]} onChange={v=>A.setSetting(k,v)}/></div>)}
          <Btn kind="ghost" size="sm" full style={{marginTop:12}} iconR="chevR" onClick={()=>A.go("admSettings")}>All platform settings</Btn></Card>
        {A.securitySignals&&(()=>{const sig=A.securitySignals;
          const hasSignal=sig.failedLogins24h>0||sig.spamDomains.length>0||sig.floodingApplicants.length>0;
          return <Card><H2 sub="Last 24 hours — a lightweight abuse check, not a full security dashboard.">Security signals</H2>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{sig.failedLogins24h}</div>
                <div className="text-xs text-text-3 mt-1">Failed logins</div></div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{sig.signups24h}</div>
                <div className="text-xs text-text-3 mt-1">New signups</div></div>
            </div>
            {!hasSignal?<div className="text-sm text-text-3 py-2 text-center">Nothing unusual in the last 24h.</div>:<div className="flex flex-col gap-1.5">
              {sig.topOffenders.slice(0,3).map(o=><div key={o.email} className="flex justify-between text-xs py-1.5 px-2.5 bg-warn-bg rounded-lg">
                <span className="text-text-2">{o.email}</span><span className="font-bold text-warn">{o.attempts} failed attempts</span></div>)}
              {sig.spamDomains.map(d=><div key={d.domain} className="flex justify-between text-xs py-1.5 px-2.5 bg-warn-bg rounded-lg">
                <span className="text-text-2">{d.n} signups from @{d.domain}</span><span className="font-bold text-warn">same day</span></div>)}
              {sig.floodingApplicants.map(f=><div key={f.user_id} className="flex justify-between text-xs py-1.5 px-2.5 bg-warn-bg rounded-lg">
                <span className="text-text-2">User {f.user_id}</span><span className="font-bold text-warn">{f.n} applications</span></div>)}
            </div>}
          </Card>;})()}
        {A.opsHealth&&(()=>{const h=A.opsHealth;
          const fmtUptime=s=>{const d=Math.floor(s/86400),hr=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);
            return d>0?`${d}d ${hr}h`:hr>0?`${hr}h ${m}m`:`${m}m`;};
          return <Card><H2 sub="Real signals from this API process — error rate is measured, not simulated. No background job queue exists in this app, so there's nothing to report there.">System health</H2>
            <div className="grid grid-cols-3 gap-2.5 mb-3.5">
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className={`text-lg font-bold ${h.errors24h>0?"text-red":"text-text"}`}>{h.errors24h}</div>
                <div className="text-xs text-text-3 mt-1">Server errors (24h)</div></div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{fmtUptime(h.uptimeSeconds)}</div>
                <div className="text-xs text-text-3 mt-1">API process uptime</div></div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{h.dbSizeBytes?`${(h.dbSizeBytes/1024/1024).toFixed(1)} MB`:"—"}</div>
                <div className="text-xs text-text-3 mt-1">Database size</div></div>
            </div>
            {h.errors24h===0?<div className="text-sm text-text-3 py-2 text-center">No server errors in the last 24h.</div>
              :<div className="flex flex-col gap-1.5">
                {h.topErrorPaths.map((e,i)=><div key={i} className="flex justify-between text-xs py-1.5 px-2.5 bg-red-bg rounded-lg">
                  <span className="text-text-2">{e.method} {e.path} · {e.status}</span><span className="font-bold text-red">{e.n}×</span></div>)}
              </div>}
          </Card>;})()}
        </div></div>
  </Page>;
}

export function AdmUsers(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [q,setQ]=useState(""); const [status,setStatus]=useState("all"); const [sort,setSort]=useState("name");
  const [suspending,setSuspending]=useState(null); const [reason,setReason]=useState("");
  const [erasing,setErasing]=useState(null); const [viewing,setViewing]=useState(null);
  const withApps=A.people.map(u=>({...u,_apps:A.applications.filter(a=>a.user===u.id).length,_sus:A.suspended.has(u.id)}));
  const filtered=withApps.filter(u=>
    (!q||u.name.toLowerCase().includes(q.toLowerCase())||u.email.toLowerCase().includes(q.toLowerCase())||u.title.toLowerCase().includes(q.toLowerCase()))
    &&(status==="all"||(status==="suspended"?u._sus:!u._sus)));
  const list=[...filtered].sort((a,b)=>
    sort==="apps"?b._apps-a._apps:sort==="city"?a.city.localeCompare(b.city):sort==="joined"?(b.joined||"").localeCompare(a.joined||""):a.name.localeCompare(b.name));
  const pg=usePagination(list,20);
  return <Page wide>
    <H1 sub={`${A.people.length} registered job seekers`}
      action={<Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportUsers(list)}>Export {list.length<A.people.length?`filtered (${list.length})`:"CSV"}</Btn>}>Users</H1>
    <div className="flex gap-3 mb-4 flex-wrap items-center">
      <div className="grow shrink basis-60 max-w-90"><Input icon="search" placeholder="Search by name, email or title" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Sel value={status} onChange={e=>setStatus(e.target.value)} style={{width:150}}>
        <option value="all">All statuses</option><option value="active">Active only</option><option value="suspended">Suspended only</option></Sel>
      <Sel value={sort} onChange={e=>setSort(e.target.value)} style={{width:170}}>
        <option value="name">Sort: Name</option><option value="apps">Sort: Most applications</option><option value="city">Sort: City</option><option value="joined">Sort: Newest</option></Sel>
    </div>
    <Card pad={0} style={{overflow:"hidden"}}>
      {pg.pageItems.map((u,i)=>{const apps=u._apps; const sus=u._sus; const susInfo=A.suspensionInfo?.[u.id];
        return <div key={u.id} className={`flex items-center gap-3.5 py-3.5 px-5 flex-wrap ${i<pg.pageItems.length-1?"border-b border-line-soft":""} ${sus?"bg-red-bg":"bg-white"}`}>
          <SmartPortrait seed={u.seed} size={40}/>
          <div className="grow shrink basis-43 min-w-0">
            <div className="text-sm font-semibold text-text">{u.name}</div>
            <div className="text-xs text-text-3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</div>
            {sus&&susInfo&&<div className="text-xs text-red mt-0.5">Suspended {susInfo.at}: {susInfo.reason}</div>}</div>
          {!mob&&<div className="w-40 text-sm text-text-2">{u.title}</div>}
          {!mob&&<div className="w-28 text-sm text-text-2">{u.city}, {u.prov}</div>}
          {!mob&&<div className="w-24 text-xs text-text-3">{u.joined?`Joined ${u.joined}`:"—"}</div>}
          <div className="w-20 text-sm text-text-2">{apps} apps</div>
          <Tag tone={sus?"danger":"ok"} sm>{sus?"Suspended":"Active"}</Tag>
          <Btn kind="ghost" size="xs" onClick={()=>setViewing(u)}>Details</Btn>
          <Btn kind="ghost" size="xs" icon="eye" onClick={()=>A.impersonate(u.id)}>View as</Btn>
          <Btn kind={sus?"outline":"ghost"} size="xs" onClick={()=>{
            if(sus){A.toggleSuspend(u.id);A.toast(`${u.name} restored`,"ok");}
            else{setSuspending(u);setReason("");}
          }}>{sus?"Restore":"Suspend"}</Btn>
          <Btn kind="dangerSoft" size="xs" icon="trash" onClick={()=>setErasing(u)}>Erase</Btn></div>;})}
      {list.length===0&&<div className="p-5"><Empty icon="search" title="No users match that search" body="Try a different name, email, or title."/></div>}</Card>
    <Pagination {...pg}/>
    {suspending&&<Modal onClose={()=>setSuspending(null)} title={`Suspend ${suspending.name}?`}>
      <div className="flex flex-col gap-3.5">
        <Field label="Reason" required hint="Recorded on their account and in the activity log.">
          <Area rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Reported for fraudulent job applications"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setSuspending(null)}>Cancel</Btn>
          <Btn kind="danger" disabled={!reason.trim()} onClick={()=>{A.toggleSuspend(suspending.id,reason.trim());A.toast(`${suspending.name} suspended`,"danger");setSuspending(null);}}>Suspend</Btn>
        </div>
      </div>
    </Modal>}
    <ConfirmDialog open={!!erasing} onClose={()=>setErasing(null)} confirmLabel="Erase permanently"
      title={`Erase ${erasing?.name}'s account?`}
      onConfirm={async()=>{const name=erasing.name;const id=erasing.id;setErasing(null);
        const r=await A.eraseUser(id); A.toast(r.ok?`${name}'s account and personal data erased`:r.msg,r.ok?"danger":"warn");}}>
      Permanently removes their CVs, saved searches, messages, reviews, references, payment methods, and saved/followed data.
      Their name and email are replaced so the account can't be recovered. Applications they already sent stay on file
      for the employers who received them. This cannot be undone.</ConfirmDialog>
    {viewing&&<Modal onClose={()=>setViewing(null)} title={viewing.name} wide>
      <div className="flex gap-3.5 items-center mb-4">
        <SmartPortrait seed={viewing.seed} size={52}/>
        <div className="min-w-0">
          <div className="text-base font-bold text-text">{viewing.name}</div>
          <div className="text-sm text-text-2">{viewing.email}</div>
        </div>
        <Tag tone={A.suspended.has(viewing.id)?"danger":"ok"} sm style={{marginLeft:"auto"}}>{A.suspended.has(viewing.id)?"Suspended":"Active"}</Tag>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[["Title",viewing.title||"—"],["Category",viewing.cat||"—"],["Location",`${viewing.city||"—"}, ${viewing.prov||""}`],
          ["Years experience",viewing.years??"—"],["Phone",viewing.phone||"—"],["Joined",viewing.joined||"—"]].map(([l,v])=>
          <div key={l} className="bg-bg rounded-xl py-2.5 px-3">
            <div className="text-xs text-text-3">{l}</div>
            <div className="text-sm font-semibold text-text mt-0.5">{v}</div></div>)}
      </div>
      {A.suspended.has(viewing.id)&&A.suspensionInfo?.[viewing.id]&&<Banner tone="danger" icon="alert" title="Suspended" style={{marginBottom:16}}>
        {A.suspensionInfo[viewing.id].at}: {A.suspensionInfo[viewing.id].reason}</Banner>}
      <Lbl>Applications ({A.applications.filter(a=>a.user===viewing.id).length})</Lbl>
      <div className="flex flex-col gap-2 mb-2" style={{maxHeight:260,overflowY:"auto"}}>
        {A.applications.filter(a=>a.user===viewing.id).map(a=>{const j=A.job(a.job); const e=j?A.emp(j.e):null;
          return <div key={a.id} className="flex justify-between items-center py-2.5 px-3 bg-bg rounded-lg">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j?.t||"—"}</div>
              <div className="text-xs text-text-3">{e?.name||"—"} · {a.at}</div>
            </div>
            <Tag tone={a.stage==="Hired"?"ok":a.stage==="Withdrawn"?"neutral":"brand"} sm>{a.stage}</Tag>
          </div>;})}
        {A.applications.filter(a=>a.user===viewing.id).length===0&&<div className="text-sm text-text-3 py-3">No applications on file.</div>}
      </div>
      <div className="flex gap-2.5 justify-end pt-3 border-t border-line">
        <Btn kind="ghost" onClick={()=>setViewing(null)}>Close</Btn>
        <Btn kind="outline" icon="eye" onClick={()=>{A.impersonate(viewing.id);setViewing(null);}}>View as</Btn>
      </div>
    </Modal>}
  </Page>;
}

export function AdmEmployers(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("pending"); const [q,setQ]=useState("");
  const [holding,setHolding]=useState(null); const [holdReason,setHoldReason]=useState("");
  const [viewing,setViewing]=useState(null);
  const match=e=>!q||e.name.toLowerCase().includes(q.toLowerCase())||e.industry.toLowerCase().includes(q.toLowerCase())||(e.owner||"").toLowerCase().includes(q.toLowerCase());
  const pending=A.employers.filter(e=>!e.verified&&!e.hold&&match(e)), held=A.employers.filter(e=>!e.verified&&e.hold&&match(e)), verified=A.employers.filter(e=>e.verified&&match(e));
  const list=tab==="pending"?pending:tab==="held"?held:verified;
  const pg=usePagination(list,24);
  return <Page wide>
    <H1 sub="Approve companies before their listings carry a verified badge"
      action={<Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportEmployers(list)}>Export {list.length<A.employers.length?`filtered (${list.length})`:"CSV"}</Btn>}>Employers</H1>
    <div className="max-w-105 mb-4"><Input icon="search" placeholder="Search by name, industry or contact" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <Tabs items={[{k:"pending",label:"Awaiting review",n:pending.length},{k:"held",label:"On hold",n:held.length},{k:"verified",label:"Verified",n:verified.length}]}
      value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="checkC2" title="Nothing to review" body="All employer accounts in this bucket are handled."/>
      :<div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`}}>
        {pg.pageItems.map((e,i)=>{const jobs=A.jobs.filter(j=>j.e===e.id).length;
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
            {!e.verified&&<div className="bg-bg rounded-xl py-2.5 px-3 mb-3.5">
              <div className="text-xs text-text-3 mb-1.5">Verification evidence</div>
              <div className="text-xs text-text-2 leading-relaxed">
                <div>Website: {e.site?<a href={`https://${e.site}`} target="_blank" rel="noreferrer" className="text-brand font-semibold">{e.site}</a>:<span className="text-text-3">Not provided</span>}</div>
                <div>Business number: {e.businessNumber||<span className="text-text-3">Not provided</span>}</div>
                <div>Founded: {e.founded||"—"}</div>
                {e.about&&<div className="mt-1 italic">"{e.about}"</div>}
              </div></div>}
            <div className="flex gap-2 pt-3 border-t border-line-soft flex-wrap">
              <Btn kind="ghost" size="sm" onClick={()=>A.openEmployer(e.id)}>View page</Btn>
              <Btn kind="ghost" size="sm" onClick={()=>setViewing(e)}>Details</Btn>
              <div className="flex-1"/>
              {e.verified?<Btn kind="outline" size="sm" onClick={()=>{A.verifyEmployer(e.id,false);A.toast(`${e.name}'s verification revoked`,"danger");}}>Revoke</Btn>
                :e.hold?<><Btn kind="ok" size="sm" icon="check" onClick={()=>{A.verifyEmployer(e.id,true);A.toast(`${e.name} approved`,"ok");}}>Approve</Btn>
                  <Btn kind="outline" size="sm" onClick={()=>{A.holdEmployer(e.id);A.toast(`${e.name}'s hold released`);}}>Release hold</Btn></>
                :<><Btn kind="ok" size="sm" icon="check" onClick={()=>{A.verifyEmployer(e.id,true);A.toast(`${e.name} approved`,"ok");}}>Approve</Btn>
                  <Btn kind="dangerSoft" size="sm" onClick={()=>{setHolding(e);setHoldReason("");}}>Hold</Btn></>}</div></Card>;})}</div>}
    <Pagination {...pg}/>
    {holding&&<Modal onClose={()=>setHolding(null)} title={`Put ${holding.name} on hold?`}>
      <div className="flex flex-col gap-3.5">
        <Field label="Reason" required hint="Recorded in the activity log for accountability.">
          <Area rows={3} value={holdReason} onChange={e=>setHoldReason(e.target.value)} placeholder="e.g. Unresponsive to a candidate complaint"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setHolding(null)}>Cancel</Btn>
          <Btn kind="danger" disabled={!holdReason.trim()} onClick={()=>{A.holdEmployer(holding.id,holdReason.trim());A.toast(`${holding.name} put on hold`);setHolding(null);}}>Hold</Btn>
        </div>
      </div>
    </Modal>}
    {viewing&&<Modal onClose={()=>setViewing(null)} title={viewing.name} wide>
      <div className="flex gap-3.5 items-center mb-4">
        <EmpMark e={viewing} size={52}/>
        <div className="min-w-0">
          <div className="text-base font-bold text-text">{viewing.name}</div>
          <div className="text-sm text-text-2">{viewing.industry} · {viewing.city}, {viewing.prov} · {viewing.owner}</div>
        </div>
        <Tag tone={viewing.verified?"ok":viewing.hold?"warn":"neutral"} sm style={{marginLeft:"auto"}}>{viewing.verified?"Verified":viewing.hold?"On hold":"Pending"}</Tag>
      </div>
      <Lbl>Job listings ({A.jobs.filter(j=>j.e===viewing.id).length})</Lbl>
      <div className="flex flex-col gap-2 mb-4" style={{maxHeight:220,overflowY:"auto"}}>
        {A.jobs.filter(j=>j.e===viewing.id).map(j=>{const n=A.applications.filter(a=>a.job===j.id).length;
          return <div key={j.id} className="flex justify-between items-center py-2.5 px-3 bg-bg rounded-lg">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
              <div className="text-xs text-text-3">{j.city}, {j.prov} · {j.views} views · {n} applicant{n===1?"":"s"}</div>
            </div>
            <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status)}</Tag>
          </div>;})}
        {A.jobs.filter(j=>j.e===viewing.id).length===0&&<div className="text-sm text-text-3 py-3">No listings yet.</div>}
      </div>
      <Lbl>Recent activity mentioning this company</Lbl>
      <div className="flex flex-col gap-2" style={{maxHeight:180,overflowY:"auto"}}>
        {A.activity.filter(a=>a.text.includes(viewing.name)).slice(0,20).map(a=>
          <div key={a.id} className="py-2 px-3 bg-bg rounded-lg text-xs">
            <span className="text-text-3">{a.at}</span> — <span className="text-text-2">{a.text}</span></div>)}
        {A.activity.filter(a=>a.text.includes(viewing.name)).length===0&&<div className="text-sm text-text-3 py-3">Nothing recorded yet.</div>}
      </div>
      <div className="flex gap-2.5 justify-end pt-3 mt-3 border-t border-line">
        <Btn kind="ghost" onClick={()=>setViewing(null)}>Close</Btn>
        <Btn kind="outline" onClick={()=>{A.openEmployer(viewing.id);setViewing(null);}}>View public page</Btn>
      </div>
    </Modal>}
  </Page>;
}

export function AdmJobs(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("all"); const [q,setQ]=useState(""); const [sel,setSel]=useState(new Set());
  const [flagging,setFlagging]=useState(null); const [flagReason,setFlagReason]=useState(""); const [bulkFlagging,setBulkFlagging]=useState(false);
  useEffect(()=>{A.loadJobReports();},[]);
  const openReports=A.jobReports.filter(r=>r.status==="open");
  const base=tab==="flagged"?A.jobs.filter(j=>j.flagged):tab==="review"?A.jobs.filter(j=>j.status==="review"):tab==="paused"?A.jobs.filter(j=>j.status==="paused"):A.jobs;
  const list=base.filter(j=>!q||j.t.toLowerCase().includes(q.toLowerCase())||A.emp(j.e).name.toLowerCase().includes(q.toLowerCase()));
  const pg=usePagination(list,20);
  const toggleSel=id=>setSel(s=>{const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n;});
  const allSelected=pg.pageItems.length>0&&pg.pageItems.every(j=>sel.has(j.id));
  const selJobs=list.filter(j=>sel.has(j.id));
  const bulkFlag=(on,reason)=>{selJobs.forEach(j=>{if(!!j.flagged!==on)A.flagJob(j.id,reason);}); A.toast(`${selJobs.length} listing${selJobs.length===1?"":"s"} ${on?"flagged":"unflagged"}`); setSel(new Set());};
  const bulkPause=()=>{selJobs.filter(j=>j.status==="live").forEach(j=>A.toggleJobStatus(j.id)); A.toast(`${selJobs.length} listing${selJobs.length===1?"":"s"} paused`); setSel(new Set());};
  const bulkApprove=()=>{selJobs.filter(j=>j.status!=="live").forEach(j=>A.toggleJobStatus(j.id)); A.toast(`${selJobs.length} listing${selJobs.length===1?"":"s"} approved`,"ok"); setSel(new Set());};
  return <Page wide>
    <H1 sub="Review, pause or flag any listing on the platform">Job moderation</H1>
    <div className="flex gap-3 mb-5 flex-wrap items-center">
      <div className="grow shrink basis-60 max-w-90"><Input icon="search" placeholder="Search listings or employers" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Tabs items={[{k:"all",label:"All",n:A.jobs.length},{k:"flagged",label:"Flagged",n:A.jobs.filter(j=>j.flagged).length},
        {k:"review",label:"Pending review",n:A.jobs.filter(j=>j.status==="review").length},
        {k:"paused",label:"Paused",n:A.jobs.filter(j=>j.status==="paused").length}]} value={tab} onChange={t=>{setTab(t);setSel(new Set());}}/></div>
    {sel.size>0&&<Banner tone="brand" icon="check" style={{marginBottom:14}}
      action={<div className="flex gap-2 flex-wrap">
        <Btn kind="ok" size="xs" onClick={bulkApprove}>Approve/restore</Btn>
        <Btn kind="outline" size="xs" onClick={bulkPause}>Pause</Btn>
        <Btn kind="dangerSoft" size="xs" onClick={()=>{setBulkFlagging(true);setFlagReason("");}}>Flag</Btn>
        <Btn kind="ghost" size="xs" onClick={()=>bulkFlag(false)}>Unflag</Btn></div>}>
      {sel.size} listing{sel.size===1?"":"s"} selected</Banner>}
    <Card pad={0} style={{overflow:"hidden"}}>
      {pg.pageItems.length>0&&<div className="flex items-center gap-3 py-2.5 px-5 border-b border-line-soft bg-bg">
        <input type="checkbox" checked={allSelected} onChange={e=>setSel(e.target.checked?new Set(pg.pageItems.map(j=>j.id)):new Set())}/>
        <span className="text-xs font-semibold text-text-3 uppercase tracking-wide">Select all on page</span></div>}
      {pg.pageItems.map((j,i)=>{const e=A.emp(j.e); const n=A.applications.filter(a=>a.job===j.id).length;
        return <div key={j.id} className={`flex items-center gap-3 py-3.5 px-5 flex-wrap ${i<pg.pageItems.length-1?"border-b border-line-soft":""} ${j.flagged?"bg-warn-bg":"bg-white"}`}>
          <input type="checkbox" checked={sel.has(j.id)} onChange={()=>toggleSel(j.id)}/>
          <EmpMark e={e} size={38} radius={10}/>
          <div className="grow shrink basis-50 min-w-0">
            <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
            <div className="text-xs text-text-3 mt-0.5">{e.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div></div>
          {!mob&&<div className="w-22 text-sm text-text-2">{n} applicant{n===1?"":"s"}</div>}
          <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status)}</Tag>
          <div className="flex gap-2 flex-wrap">
            <Btn kind="ghost" size="xs" icon="eye" title="Preview" onClick={()=>A.openJob(j.id,{preview:true})}/>
            <Btn kind="outline" size="xs" onClick={()=>{const label=j.status==="live"?"paused":j.status==="review"?"approved":"restored";A.toggleJobStatus(j.id);A.toast(`"${j.t}" ${label}`,label==="paused"?"warn":"ok");}}>{j.status==="live"?"Pause":j.status==="review"?"Approve":"Restore"}</Btn>
            <Btn kind={j.flagged?"dangerSoft":"ghost"} size="xs" onClick={()=>{
              if(j.flagged){A.flagJob(j.id);A.toast(`"${j.t}" unflagged`,"brand");}
              else{setFlagging(j);setFlagReason("");}
            }}>{j.flagged?"Unflag":"Flag"}</Btn></div></div>;})}
      {list.length===0&&<div className="p-5"><Empty icon="search" title="Nothing matches that filter" body="Try a different search term or switch tabs."/></div>}</Card>
    <Pagination {...pg}/>

    <Card style={{marginTop:20}}>
      <H2 sub={`${openReports.length} open`}>Seeker-submitted reports</H2>
      {A.jobReports.length===0?<div className="text-sm text-text-3 py-3 text-center">No reports submitted yet.</div>
        :<div className="flex flex-col gap-2">
          {A.jobReports.slice(0,20).map(r=><div key={r.id} className="flex gap-3 items-start py-3 border-b border-line-soft flex-wrap">
            <div className="grow shrink basis-60 min-w-0">
              <div className="text-sm font-semibold text-text">{r.jobTitle}</div>
              <div className="text-xs text-text-3 mt-0.5">Reported by {r.reporterName} • {r.reason}</div>
            </div>
            <Tag tone={r.status==="open"?"warn":r.status==="actioned"?"danger":"neutral"} sm>{r.status}</Tag>
            {r.status==="open"&&<div className="flex gap-1.5">
              <Btn kind="outline" size="xs" onClick={()=>A.decideJobReport(r.id,"dismissed")}>Dismiss</Btn>
              <Btn kind="dangerSoft" size="xs" onClick={()=>{const j=A.jobs.find(x=>x.id===r.job); if(j&&!j.flagged){setFlagging(j);setFlagReason(r.reason);} A.decideJobReport(r.id,"actioned");}}>Flag listing</Btn>
            </div>}
          </div>)}
        </div>}
    </Card>

    {flagging&&<Modal onClose={()=>setFlagging(null)} title={`Flag "${flagging.t}"?`}>
      <div className="flex flex-col gap-3.5">
        <Field label="Reason" required hint="Recorded in the activity log for accountability.">
          <Area rows={3} value={flagReason} onChange={e=>setFlagReason(e.target.value)} placeholder="e.g. Reported as a possible scam by 3 applicants"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setFlagging(null)}>Cancel</Btn>
          <Btn kind="danger" disabled={!flagReason.trim()} onClick={()=>{A.flagJob(flagging.id,flagReason.trim());A.toast(`"${flagging.t}" flagged`,"danger");setFlagging(null);}}>Flag</Btn>
        </div>
      </div>
    </Modal>}
    {bulkFlagging&&<Modal onClose={()=>setBulkFlagging(false)} title={`Flag ${selJobs.length} listing${selJobs.length===1?"":"s"}?`}>
      <div className="flex flex-col gap-3.5">
        <Field label="Reason" required hint="Recorded in the activity log for accountability.">
          <Area rows={3} value={flagReason} onChange={e=>setFlagReason(e.target.value)} placeholder="e.g. Batch review found duplicate postings"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setBulkFlagging(false)}>Cancel</Btn>
          <Btn kind="danger" disabled={!flagReason.trim()} onClick={()=>{bulkFlag(true,flagReason.trim());setBulkFlagging(false);}}>Flag all</Btn>
        </div>
      </div>
    </Modal>}
  </Page>;
}

export function AdmSettings(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const S=A.settings;
  const [inbox,setInbox]=useState([]); const [inboxTab,setInboxTab]=useState("open");
  useEffect(()=>{A.loadContactInbox().then(setInbox);},[]);
  const resolveMsg=async(id)=>{const r=await A.resolveContactMessage(id);
    if(r.ok){setInbox(l=>l.map(m=>m.id===id?{...m,status:"resolved"}:m));A.toast("Marked resolved","ok");}};
  /* setSetting logs "Enabled {k}"/"Disabled {k}" to the activity feed - surface the most recent
     one inline instead of forcing a cross-reference to the separate activity log. */
  const lastChange=k=>A.activity.find(a=>a.action==="settings.change"&&(a.text===`Enabled ${k}`||a.text===`Disabled ${k}`));
  const Group=({title,sub,rows})=><Card pad={mob?18:24} style={{marginBottom:16}}>
    <H2 sub={sub}>{title}</H2>
    {rows.map(([k,label,desc,danger])=>{const lc=lastChange(k);
      return <div key={k} className="flex gap-3.5 items-center py-4 border-b border-line-soft">
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${danger?"text-red":"text-text"}`}>{label}</div>
          <div className="text-sm text-text-2 mt-1 leading-normal">{desc}</div>
          {lc&&<div className="text-xs text-text-3 mt-1.5">Last changed by {lc.actor} · {lc.at}</div>}</div>
        <Switch on={S[k]} onChange={v=>A.setSetting(k,v)}/></div>;})}</Card>;
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
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div className="flex justify-between items-center mb-1">
        <H2 sub="Every contact-form submission, with the full message — not just a topic string">Contact inbox</H2>
        <Tag tone={inbox.filter(m=>m.status==="open").length>0?"warn":"ok"} sm>{inbox.filter(m=>m.status==="open").length} open</Tag>
      </div>
      <Tabs items={[{k:"open",label:`Open (${inbox.filter(m=>m.status==="open").length})`},{k:"resolved",label:"Resolved"}]} value={inboxTab} onChange={setInboxTab}/>
      <div className="flex flex-col gap-2 mt-3" style={{maxHeight:320,overflowY:"auto"}}>
        {inbox.filter(m=>m.status===inboxTab).map(m=>
          <div key={m.id} className="py-3 px-3.5 bg-bg rounded-xl border border-line">
            <div className="flex justify-between items-start gap-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">{m.name||"—"} · <span className="text-text-3 font-normal">{m.email}</span></div>
                <div className="text-xs text-text-3 mt-0.5">{m.topic||"General"} · {new Date(m.at).toLocaleString("en-CA")} · <span className="font-mono">{m.id}</span></div>
              </div>
              {m.status==="open"&&<Btn kind="outline" size="xs" onClick={()=>resolveMsg(m.id)}>Mark resolved</Btn>}
            </div>
            <div className="text-sm text-text-2 mt-2 leading-relaxed whitespace-pre-wrap">{m.message}</div>
          </div>)}
        {inbox.filter(m=>m.status===inboxTab).length===0&&<div className="text-sm text-text-3 py-4">Nothing here.</div>}
      </div>
    </Card>
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
  const [q,setQ]=useState(""); const [cat,setCat]=useState("all"); const [actor,setActor]=useState("all");
  const categories=[["all","All actions"],["auth","Auth"],["job","Jobs"],["application","Applications"],["pipeline","Pipeline"],
    ["employer","Employers"],["blog","Content"],["training","Content"],["billing","Billing"],["settings","Settings"],["admin","Admin"]];
  const actors=[...new Set(A.activity.map(e=>e.actor))].sort();
  const list=A.activity.filter(e=>{
    if(cat!=="all"&&!e.action.startsWith(cat))return false;
    if(actor!=="all"&&e.actor!==actor)return false;
    if(q&&!(e.text.toLowerCase().includes(q.toLowerCase())||e.actor.toLowerCase().includes(q.toLowerCase())))return false;
    return true;
  });
  const pg=usePagination(list,30);
  return <Page narrow>
    <H1 sub={A.activity.length===0
      ? "No activity yet. Every publish, approval, moderation action and setting change is recorded here."
      : `${A.activity.length.toLocaleString()} recorded event${A.activity.length===1?"":"s"}`}
      action={<Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportLog(list)}>Export {list.length<A.activity.length?`filtered (${list.length})`:"CSV"}</Btn>}>Activity log</H1>
    <Card pad={mob?16:20} style={{marginBottom:14,borderRadius:16}}>
      <div className={`grid gap-3 ${mob?"grid-cols-1":""}`} style={{gridTemplateColumns:mob?undefined:"2fr 1fr 1fr"}}>
        <Input icon="search" placeholder="Search text or actor" value={q} onChange={e=>setQ(e.target.value)}/>
        <Sel value={cat} onChange={e=>setCat(e.target.value)}>{[...new Map(categories.map(c=>[c[0],c])).values()].map(([k,l])=><option key={k} value={k}>{l}</option>)}</Sel>
        <Sel value={actor} onChange={e=>setActor(e.target.value)}>
          <option value="all">All actors</option>{actors.map(a=><option key={a} value={a}>{a}</option>)}</Sel>
      </div>
      {(q||cat!=="all"||actor!=="all")&&<div className="mt-3 text-sm text-text-2">
        Showing <strong className="text-text">{list.length}</strong> of {A.activity.length} entries
        <button onClick={()=>{setQ("");setCat("all");setActor("all");}} className="bg-transparent border-0 p-0 ml-2.5 cursor-pointer text-sm text-brand font-semibold">Clear</button>
      </div>}
    </Card>
    {list.length===0?<Empty icon="file" title={A.activity.length===0?"No activity yet":"Nothing matches"} body="Every publish, approval, moderation action and setting change is recorded here."/>
      :<><Card pad={0} style={{overflow:"hidden",borderRadius:16}}>
        {pg.pageItems.map((e,i)=><div key={e.id} className={`flex gap-3.5 py-3.5 px-5 ${i<pg.pageItems.length-1?"border-b border-line-soft":""}`}>
          <div className="w-9 h-9 rounded-lg bg-bg text-text-2 flex items-center justify-center shrink-0">
            <I n={e.icon||"file"} s={16}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{e.text}</div>
            <div className="text-xs text-text-3 mt-1">{e.actor} • {e.action} • {e.at}</div></div></div>)}</Card>
      <Pagination {...pg}/></>}
  </Page>;
}

export function AdmStats(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const byCat=CATS.map(c=>({...c,n:A.jobs.filter(j=>j.cat===c.id).length})).sort((a,b)=>b.n-a.n);
  const max=Math.max(1,...byCat.map(c=>c.n));
  const byStage=STAGES.map(s=>[s,A.applications.filter(a=>a.stage===s).length]);
  const byPlan=A.PLAN_ORDER.map(p=>({name:p,n:A.employers.filter(e=>e.plan===p).length,revenue:A.employers.filter(e=>e.plan===p).length*(A.PLANS[p]?.price||0)}));
  const totalRevenue=byPlan.reduce((s,p)=>s+p.revenue,0);
  const BarRow=({label,value,max,tone=C.brand,total})=><div className="flex items-center gap-3 mb-3">
    <div className={`${mob?"w-28":"w-43"} text-sm text-text font-medium shrink-0 overflow-hidden text-ellipsis whitespace-nowrap`}>{label}</div>
    <div className="flex-1 min-w-8"><Bar v={max?(value/max)*100:0} tone={tone} h={9}/></div>
    <div className={`text-right text-sm font-bold text-text shrink-0 ${total?"w-20":"w-10"}`}>{value}{total?<span className="text-xs text-text-3 font-medium ml-1">({total?Math.round((value/total)*100):0}%)</span>:null}</div></div>;
  return <Page wide>
    <H1 sub="Marketplace health across the whole platform">Platform statistics</H1>
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`}}>
      <Stat icon="briefcase" label="Total listings" value={A.jobs.length} tone={C.brand}/>
      <Stat icon="send" label="Applications" value={A.applications.length} tone={C.violet}/>
      <Stat icon="book" label="Published content" value={A.blogs.filter(b=>b.status==="published").length+A.trainings.filter(t=>t.status==="published").length}/>
      <Stat icon="award" label="Offers extended" value={A.applications.filter(a=>a.stage==="Offer").length} tone={C.ok}/></div>
    <div className={`grid ${mob?"grid-cols-1":"grid-cols-2"} gap-4 mb-4`}>
      <Card><H2>Listings by sector</H2>{byCat.map(c=><BarRow key={c.id} label={c.label} value={c.n} max={max} total={A.jobs.length}/>)}</Card>
      <Card><H2>Applications by stage</H2>
        {byStage.map(([s,n])=><BarRow key={s} label={s} value={n} max={Math.max(1,A.applications.length)} tone={C.violet} total={A.applications.length}/>)}
        <div className="mt-5 pt-4 border-t border-line-soft grid grid-cols-2 gap-3">
          {[["Verified employers",A.employers.filter(e=>e.verified).length],["Flagged listings",A.jobs.filter(j=>j.flagged).length],
            ["Suspended users",A.suspended.size],["Training enrolments",A.trainings.reduce((s,t)=>s+t.enrolled,0).toLocaleString()]].map(([k,v])=>
            <div key={k} className="bg-bg rounded-xl py-3 px-3.5">
              <div className="text-xs text-text-3">{k}</div>
              <div className="text-xl font-bold text-text mt-1 tracking-tight">{v}</div></div>)}</div></Card></div>
    <Card><H2 sub={`$${totalRevenue.toLocaleString()}/mo across ${A.employers.length} employer accounts`}>Revenue by plan</H2>
      {byPlan.map(p=><BarRow key={p.name} label={`${p.name} (${p.n})`} value={p.revenue} max={Math.max(1,totalRevenue)} tone={p.name==="Enterprise"?C.violet:p.name==="Growth"?C.brand:C.text3} total={totalRevenue}/>)}
    </Card>
  </Page>;
}

const ADMIN_SCOPE_INFO={
  full:{label:"Full",desc:"Sees and can change everything."},
  support:{label:"Support",desc:"Users, suspensions, contact inbox."},
  moderator:{label:"Moderator",desc:"Employer verification, job moderation, content."},
  finance:{label:"Finance",desc:"Plan limits, payroll tax brackets, staffing rates."},
  readonly:{label:"Read-only",desc:"Sees every section, can't change anything."},
};
/* Only a full admin can reach this page at all (server-enforced by requireAdminScope() with no
   scopes listed) - scoping who can grant scopes is what keeps a support/moderator/finance account
   from ever escalating itself or another account. */
export function AdmAdmins(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [admins,setAdmins]=useState([]); const [loading,setLoading]=useState(true);
  const load=()=>A.listAdmins().then(l=>{setAdmins(l);setLoading(false);});
  useEffect(()=>{load();},[]);
  const change=async(id,scope)=>{
    const r=await A.setAdminScope(id,scope);
    if(r.ok){A.toast("Admin scope updated","ok");load();}else A.toast(r.msg,"danger");
  };
  return <Page narrow>
    <H1 sub="Every admin account and what section of the console it can reach. Scope changes take effect immediately.">Admin accounts</H1>
    {loading?<div className="text-sm text-text-3">Loading…</div>
    :<div className="flex flex-col gap-2.5">
      {admins.map(a=><Card key={a.id} pad={mob?16:20} style={{borderRadius:14}}>
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-bold text-text">{a.name}</div>
            <div className="text-xs text-text-3 mt-0.5">{a.email}</div>
          </div>
          <div className="flex items-center gap-2.5">
            <Sel value={a.adminScope} onChange={e=>change(a.id,e.target.value)} disabled={a.id===A.user?.id}>
              {Object.entries(ADMIN_SCOPE_INFO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </Sel>
            <Tag tone={a.adminScope==="full"?"brand":a.adminScope==="readonly"?"neutral":"ok"} sm>{ADMIN_SCOPE_INFO[a.adminScope]?.label}</Tag>
          </div>
        </div>
        <div className="text-xs text-text-3 mt-2 pt-2 border-t border-line-soft">{ADMIN_SCOPE_INFO[a.adminScope]?.desc}</div>
        {a.id===A.user?.id&&<div className="text-xs text-warn mt-1.5">You can't change your own scope — ask another full admin.</div>}
      </Card>)}
    </div>}
  </Page>;
}

/* Business config used to be hardcoded JS constants (plan limits, payroll tax brackets, staffing
   burden rates/agency policy); now it lives in the backend, editable here, gated to the finance
   scope server-side. Two editing shapes, picked per section by how the data is shaped: PLANS and
   STAFFING AGENCY are a handful of flat named fields, so they get a real labeled form (a Switch
   for booleans, a number input with an "Unlimited" checkbox for anything that supports Infinity).
   PAYROLL TAX and STAFFING RATES are inherently tabular/nested (a bracket table per province) - a
   bespoke form for those would be its own large build, so they get a read-only, colour-highlighted,
   properly indented JSON view by default (genuinely readable, not a flat grey blob) with an
   explicit "Edit as JSON" escape hatch for the rare case someone needs to change bracket structure
   itself rather than just a rate. */
const UNLIMITED_SENTINEL = Infinity;
function jsonHighlight(text){
  // Small regex-based colourizer, not a full tokenizer - good enough for config JSON's shape
  // (no strings containing the characters that would confuse these patterns in this dataset).
  const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return esc(text)
    .replace(/"([^"]+)":/g,'<span style="color:#8250df;font-weight:600">"$1"</span>:')
    .replace(/: "([^"]*)"/g,': <span style="color:#0a7a3d">"$1"</span>')
    .replace(/: (-?\d+\.?\d*)/g,': <span style="color:#c2410c">$1</span>')
    .replace(/: (true|false|null)/g,': <span style="color:#1d4ed8">$1</span>');
}
function ReadOnlyJson({value}){
  return <pre style={{fontFamily:"monospace",fontSize:12.5,lineHeight:1.6,background:C.bg,border:`1px solid ${C.line}`,borderRadius:10,padding:14,overflowX:"auto",margin:0}}
    dangerouslySetInnerHTML={{__html:jsonHighlight(JSON.stringify(value,null,2))}}/>;
}
function ConfigCard({title,desc,dirty,saving,error,onSave,children}){
  return <Card pad={20} style={{marginBottom:16}}>
    <div className="flex justify-between items-start gap-3 mb-3.5">
      <div><H2 sub={desc} style={{margin:0}}>{title}</H2></div>
      <Btn kind="primary" size="sm" disabled={!dirty||saving} onClick={onSave}>{saving?"Saving…":"Save"}</Btn>
    </div>
    {children}
    {error&&<Banner tone="danger" icon="alert" style={{marginTop:10}}>{error}</Banner>}
  </Card>;
}
function PlansEditor({value,onSave}){
  const A=use();
  const [plans,setPlans]=useState(value);
  const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const dirty=JSON.stringify(plans)!==JSON.stringify(value);
  const FIELDS=[
    ["price","Price ($/mo)","number"],["jobs","Live job slots","limit"],["seats","Team seats","limit"],
    ["featured","Featured slots/mo","limit"],["messagesPerMonth","Messages/mo","limit"],
    ["messages","Messaging",["true","false","limited"]],["analytics","Analytics",["basic","full"]],
    ["interviews","In-app interviews","bool"],["talentPool","Talent pool search","bool"],["csvImport","CSV import","bool"],
    ["branded","Branded page","bool"],["articles","Publish articles","bool"],["trainings","Publish trainings","bool"],
    ["hrSuite","HR Suite","bool"],["api","API access","bool"],["sso","SSO","bool"],["manager","Dedicated manager","bool"],
    ["customStages","Custom pipeline stages","bool"],["bulkActions","Bulk actions","bool"],
  ];
  const setField=(planName,key,v)=>setPlans(p=>({...p,[planName]:{...p[planName],[key]:v}}));
  const save=async()=>{setSaving(true); setError("");
    const r=await onSave("plans",plans); setSaving(false);
    if(!r.ok)setError(r.msg||"Save failed."); else A.toast("Plan limits updated","ok");};
  return <ConfigCard title="Plan limits" desc="Free / Growth / Enterprise feature gates and quotas — what each plan actually unlocks." dirty={dirty} saving={saving} error={error} onSave={save}>
    <div className="grid gap-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))"}}>
      {Object.keys(plans).map(planName=><div key={planName} className="border border-line rounded-xl p-3.5">
        <div className="text-sm font-bold text-text mb-2.5">{planName}</div>
        <div className="flex flex-col gap-2.5">
          {FIELDS.map(([key,label,kind])=>{const v=plans[planName][key];
            if(kind==="bool")return <div key={key} className="flex justify-between items-center gap-2">
              <span className="text-xs text-text-2">{label}</span><Switch on={!!v} onChange={val=>setField(planName,key,val)}/></div>;
            if(kind==="number")return <div key={key}><div className="text-xs text-text-3 mb-1">{label}</div>
              <Input type="number" value={v} onChange={e=>setField(planName,key,Number(e.target.value)||0)} style={{padding:"6px 10px",fontSize:13}}/></div>;
            if(kind==="limit"){const unlimited=v===UNLIMITED_SENTINEL;
              return <div key={key}><div className="text-xs text-text-3 mb-1">{label}</div>
                <div className="flex gap-1.5 items-center">
                  <Input type="number" disabled={unlimited} value={unlimited?"":v} onChange={e=>setField(planName,key,Number(e.target.value)||0)} style={{padding:"6px 10px",fontSize:13}}/>
                  <label className="flex items-center gap-1 text-xs text-text-3 whitespace-nowrap"><input type="checkbox" checked={unlimited} onChange={e=>setField(planName,key,e.target.checked?UNLIMITED_SENTINEL:0)}/> ∞</label>
                </div></div>;}
            return <div key={key}><div className="text-xs text-text-3 mb-1">{label}</div>
              <Sel value={String(v)} onChange={e=>setField(planName,key,e.target.value==="true"?true:e.target.value==="false"?false:e.target.value)} style={{padding:"6px 10px",fontSize:13}}>
                {kind.map(o=><option key={o} value={o}>{o}</option>)}</Sel></div>;
          })}
        </div>
      </div>)}
    </div>
  </ConfigCard>;
}
function StaffingAgencyEditor({value,onSave}){
  const A=use();
  const [d,setD]=useState(value);
  const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const dirty=JSON.stringify(d)!==JSON.stringify(value);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const save=async()=>{setSaving(true); setError("");
    const r=await onSave("staffingAgency",d); setSaving(false);
    if(!r.ok)setError(r.msg||"Save failed."); else A.toast("Staffing agency policy updated","ok");};
  const FIELDS=[["name","Agency name","text"],["tagline","Tagline","text"],["license","License number","text"],
    ["licenseExpiry","License expiry","date"],["licenseLocAmount","License LOC amount ($)","number"],
    ["wsibRateGroup","WSIB rate group","text"],["markupFloor","Markup floor (%)","number"],
    ["markupTarget","Markup target (%)","number"],["markupCeiling","Markup ceiling (%)","number"],
    ["payPeriodDays","Pay period (days)","number"],["invoiceCycleDays","Invoice cycle (days)","number"],
    ["paymentTermsDefaultDays","Default payment terms (days)","number"],
    ["recruiterCommissionPct","Recruiter commission (% of placement fee)","number"],
    /* Burden knobs previously hardcoded in the JS formula are editable here now - so retuning
       them for a Quebec-QPIP account or a bigger admin overhead never needs a redeploy. */
    ["eiEmployerMultiplier","EI employer multiplier (× employee premium)","number"],
    ["adminFeePerHour","Admin fee per placed hour ($)","number"]];
  return <ConfigCard title="Staffing agency policy" desc="Markup floor/target/ceiling, pay period length, invoice cycle, licensing." dirty={dirty} saving={saving} error={error} onSave={save}>
    <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))"}}>
      {FIELDS.map(([key,label,kind])=><div key={key}>
        <div className="text-xs text-text-3 mb-1">{label}</div>
        <Input type={kind} value={d[key]} onChange={e=>set(key,kind==="number"?Number(e.target.value)||0:e.target.value)}/>
      </div>)}
      <div><div className="text-xs text-text-3 mb-1">Provinces served (comma-separated)</div>
        <Input value={(d.provinces||[]).join(", ")} onChange={e=>set("provinces",e.target.value.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean))}/></div>
      <div><div className="text-xs text-text-3 mb-1">WSIB provinces (comma-separated)</div>
        <Input value={(d.wsibProvinces||[]).join(", ")} onChange={e=>set("wsibProvinces",e.target.value.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean))}/></div>
      {/* Vacation pay mode is a real policy switch that changes what the payroll run does with
          the 4% accrual: "accrue" leaves it on vac_balance to be paid out later; "payout" adds
          it straight to each cheque. Kept as a select rather than a number because the choice is
          discrete and mis-typing either literal silently disables one branch. */}
      <div><div className="text-xs text-text-3 mb-1">Vacation pay mode</div>
        <select value={d.vacationPayMode||"accrue"} onChange={e=>set("vacationPayMode",e.target.value)}
          className="w-full py-2 px-2.5 border border-line rounded-lg bg-white text-sm text-text">
          <option value="accrue">Accrue into worker balance (paid out separately)</option>
          <option value="payout">Pay out on each cheque</option>
        </select></div>
    </div>
  </ConfigCard>;
}
function JsonConfigEditor({title,desc,configKey,value,onSave}){
  const A=use();
  const [editing,setEditing]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [text,setText]=useState(()=>JSON.stringify(value,null,2));
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const dirty=text!==JSON.stringify(value,null,2);
  /* Rough summary of the config for the collapsed rest state, so a reader can tell what's in the
     card without opening a 7000px JSON dump. Number-of-top-level-keys + first three key names is
     specific enough to give the shape at a glance while staying compact. */
  const summary=(()=>{
    if(!value||typeof value!=="object") return "";
    const keys=Object.keys(value);
    if(!keys.length) return "empty";
    return `${keys.length} top-level ${keys.length===1?"key":"keys"}: ${keys.slice(0,3).join(", ")}${keys.length>3?`, +${keys.length-3} more`:""}`;
  })();
  const save=async()=>{
    let parsed;
    try{parsed=JSON.parse(text);}catch{setError("Not valid JSON.");return;}
    setError(""); setSaving(true);
    const r=await onSave(configKey,parsed);
    setSaving(false);
    if(!r.ok)setError(r.msg||"Save failed.");
    else {A.toast(`${title} updated`,"ok"); setEditing(false);}
  };
  return <Card pad={20} style={{marginBottom:16}}>
    <div className="flex justify-between items-start gap-3 mb-2.5">
      <div><H2 sub={desc} style={{margin:0}}>{title}</H2></div>
      {editing
        ?<div className="flex gap-2">
          <Btn kind="ghost" size="sm" onClick={()=>{setText(JSON.stringify(value,null,2));setEditing(false);setError("");}}>Cancel</Btn>
          <Btn kind="primary" size="sm" disabled={!dirty||saving} onClick={save}>{saving?"Saving…":"Save"}</Btn>
        </div>
        :<div className="flex gap-2">
          <Btn kind="ghost" size="sm" onClick={()=>setExpanded(v=>!v)}>{expanded?"Hide details":"Show details"}</Btn>
          <Btn kind="outline" size="sm" icon="edit" onClick={()=>{setEditing(true); setExpanded(true);}}>Edit as JSON</Btn>
        </div>}
    </div>
    {editing
      ?<Area rows={16} value={text} onChange={e=>setText(e.target.value)} style={{fontFamily:"monospace",fontSize:12.5,whiteSpace:"pre"}}/>
      :expanded
        ?<ReadOnlyJson value={value}/>
        :<div className="text-xs text-text-3 py-1 font-mono">{summary}</div>}
    {error&&<Banner tone="danger" icon="alert" style={{marginTop:10}}>{error}</Banner>}
  </Card>;
}
export function AdmConfig(){
  const A=use();
  const cfg=A.platformConfig;
  if(!cfg)return <Page narrow><div className="text-sm text-text-3">Loading…</div></Page>;
  return <Page narrow>
    <H1 sub="The real numbers behind pricing, payroll withholding, and staffing burden math — changing these takes effect immediately for every account, no deploy.">Business config</H1>
    <PlansEditor value={cfg.plans} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title="Payroll tax brackets" desc="Federal + provincial income tax brackets, basic personal amounts, CPP/EI rates." configKey="payrollTax" value={cfg.payrollTax} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title="Staffing burden rates" desc="Per-province CPP/EI/EHT/WSIB/vacation/stat-holiday rates used in placement margin math." configKey="staffingRates" value={cfg.staffingRates} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title="Overtime & holiday pay policy" desc="Weekly overtime threshold/multiplier, statutory holiday dates and pay multiplier, and night-shift differential — applied to every HR Suite employee set to hourly pay." configKey="overtimePolicy" value={cfg.overtimePolicy} onSave={A.updatePlatformConfig}/>
    <StaffingAgencyEditor value={cfg.staffingAgency} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title="Admin alerting thresholds" desc="Once a queue crosses its 'high' number, the admin dashboard's warning banner escalates from yellow to red. Numbers apply platform-wide." configKey="adminAlerts" value={cfg.adminAlerts} onSave={A.updatePlatformConfig}/>
  </Page>;
}
