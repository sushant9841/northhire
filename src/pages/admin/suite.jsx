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
import { useTranslation } from "../../i18n/i18n.jsx";
import { formatNumber, formatDateTime } from "../../i18n/format.js";

export function AdmHome(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const pending=A.employers.filter(e=>!e.verified&&!e.hold);
  const flagged=A.jobs.filter(j=>j.flagged);
  const drafts=[...A.blogs,...A.trainings].filter(x=>x.status==="draft");
  const mrr=A.employers.reduce((s,e)=>s+(A.PLANS[e.plan]?.price||0),0);
  return <Page wide>
    <H1 sub={t("admin.home.subtitle")}
      action={<div className="flex gap-2.5 flex-wrap">
        <Btn kind="outline" icon="gear" onClick={()=>A.go("admSettings")}>{t("admin.home.settings")}</Btn>
        <Btn kind="primary" icon="trend" onClick={()=>A.go("admStats")}>{t("admin.home.statistics")}</Btn></div>}>{t("admin.home.title")}</H1>
    {/* Escalation thresholds - once a queue crosses its configured "high" number the banner
        goes red (danger) instead of yellow (warn). Numbers come from platform_config.adminAlerts
        so an operator can retune "backlog vs queue" without a redeploy. */}
    {(()=>{const th=A.platformConfig?.adminAlerts||{};
      const escalated=pending.length>=th.pendingEmployersHigh||flagged.length>=th.flaggedJobsHigh||drafts.length>=th.contentDraftsHigh;
      if(!pending.length&&!flagged.length)return null;
      return <Banner tone={escalated?"danger":"warn"} icon={escalated?"alert":"alert"}
        title={escalated?t("admin.home.escalatedTitle"):t("admin.home.attentionTitle")}
        style={{marginBottom:18}}
        action={<Btn kind="primary" size="sm" onClick={()=>A.go(pending.length?"admEmployers":"admJobs")}>{t("admin.home.review")}</Btn>}>
        {pending.length>0&&<>{t(pending.length===1?"admin.home.employerAwaitingOne":"admin.home.employerAwaitingOther",{n:pending.length})}{th.pendingEmployersHigh&&pending.length>=th.pendingEmployersHigh?<Tag tone="danger" sm style={{marginLeft:6}}>≥ {th.pendingEmployersHigh}</Tag>:null}</>}
        {pending.length>0&&flagged.length>0&&" • "}
        {flagged.length>0&&<>{t(flagged.length===1?"admin.home.flaggedListingOne":"admin.home.flaggedListingOther",{n:flagged.length})}{th.flaggedJobsHigh&&flagged.length>=th.flaggedJobsHigh?<Tag tone="danger" sm style={{marginLeft:6}}>≥ {th.flaggedJobsHigh}</Tag>:null}</>}
      </Banner>;})()}
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`}}>
      <Stat icon="users" label={t("admin.home.jobSeekers")} value={formatNumber(A.people.length,locale)} tone={C.brand} onClick={()=>A.go("admUsers")}/>
      <Stat icon="building" label={t("admin.home.employers")} value={A.employers.length} delta={t("admin.home.employersPending",{n:pending.length})} onClick={()=>A.go("admEmployers")}/>
      <Stat icon="briefcase" label={t("admin.home.liveListings")} value={A.jobs.filter(j=>j.status==="live").length} tone={C.violet} onClick={()=>A.go("admJobs")}/>
      <Stat icon="wallet" label={t("admin.home.monthlyRevenue")} value={`$${(mrr/1000).toFixed(1)}k`} tone={C.ok}/></div>
    <div className="grid gap-4" style={{gridTemplateColumns:mob?"1fr":"1.3fr 1fr"}}>
      <Card><H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("admEmployers")}>{t("admin.home.reviewAll")}</Btn>}>{t("admin.home.employersAwaitingVerification")}</H2>
        {pending.length===0?<div className="text-sm text-text-3 py-5 text-center">{t("admin.home.everyEmployerVerified")}</div>
          :pending.map(e=><div key={e.id} className="flex items-center gap-3 py-3 border-b border-line-soft flex-wrap">
            <EmpMark e={e} size={40} radius={10}/>
            <div className="grow shrink basis-35 min-w-0">
              <div className="text-sm font-semibold text-text">{e.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{e.industry} • {e.owner}</div></div>
            <div className="flex gap-2">
              <Btn kind="ok" size="xs" icon="check" onClick={()=>{A.verifyEmployer(e.id,true);A.toast(t("admin.home.employerApprovedToast",{name:e.name}),"ok");}}>{t("admin.home.approve")}</Btn>
              <Btn kind="outline" size="xs" onClick={()=>{A.holdEmployer(e.id);A.toast(t("admin.home.employerHoldToast",{name:e.name}));}}>{t("admin.home.hold")}</Btn></div></div>)}</Card>
      <div className="flex flex-col gap-4">
        <Card><H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("admJobs")}>{t("admin.home.open")}</Btn>}>{t("admin.home.moderationQueue")}</H2>
          {flagged.length===0?<div className="text-sm text-text-3 py-3.5 text-center">{t("admin.home.noListingsFlagged")}</div>
            :flagged.map(j=><div key={j.id} className="py-3 border-b border-line-soft">
              <div className="text-sm font-semibold text-text">{j.t}</div>
              <div className="text-xs text-text-3 mt-0.5">{A.emp(j.e).name}</div></div>)}
          <div className="mt-3.5 pt-3.5 border-t border-line-soft">
            <div className="flex justify-between text-sm text-text-2">
              <span>{t("admin.home.contentDraftsAwaiting")}</span><strong className="text-text">{drafts.length}</strong></div></div></Card>
        <Card><H2 sub={t("admin.home.featureSwitchesSub")}>{t("admin.home.featureSwitches")}</H2>
          {[["employerBlogs",t("admin.home.employerArticles")],["employerTrainings",t("admin.home.employerTrainings")],["publicSignup",t("admin.home.publicSignup")]].map(([k,l])=>
            <div key={k} className="flex items-center justify-between gap-3 py-3 border-b border-line-soft">
              <span className="text-sm text-text">{l}</span>
              <Switch on={A.settings[k]} onChange={v=>A.setSetting(k,v)}/></div>)}
          <Btn kind="ghost" size="sm" full style={{marginTop:12}} iconR="chevR" onClick={()=>A.go("admSettings")}>{t("admin.home.allPlatformSettings")}</Btn></Card>
        {A.securitySignals&&(()=>{const sig=A.securitySignals;
          const hasSignal=sig.failedLogins24h>0||sig.spamDomains.length>0||sig.floodingApplicants.length>0;
          return <Card><H2 sub={t("admin.home.securitySignalsSub")}>{t("admin.home.securitySignals")}</H2>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{sig.failedLogins24h}</div>
                <div className="text-xs text-text-3 mt-1">{t("admin.home.failedLogins")}</div></div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{sig.signups24h}</div>
                <div className="text-xs text-text-3 mt-1">{t("admin.home.newSignups")}</div></div>
            </div>
            {!hasSignal?<div className="text-sm text-text-3 py-2 text-center">{t("admin.home.nothingUnusual")}</div>:<div className="flex flex-col gap-1.5">
              {sig.topOffenders.slice(0,3).map(o=><div key={o.email} className="flex justify-between text-xs py-1.5 px-2.5 bg-warn-bg rounded-lg">
                <span className="text-text-2">{o.email}</span><span className="font-bold text-warn">{t("admin.home.failedAttempts",{n:o.attempts})}</span></div>)}
              {sig.spamDomains.map(d=><div key={d.domain} className="flex justify-between text-xs py-1.5 px-2.5 bg-warn-bg rounded-lg">
                <span className="text-text-2">{t("admin.home.signupsFromDomain",{n:d.n,domain:d.domain})}</span><span className="font-bold text-warn">{t("admin.home.sameDay")}</span></div>)}
              {sig.floodingApplicants.map(f=><div key={f.user_id} className="flex justify-between text-xs py-1.5 px-2.5 bg-warn-bg rounded-lg">
                <span className="text-text-2">{t("admin.home.userLabel",{id:f.user_id})}</span><span className="font-bold text-warn">{t("admin.home.applicationsCount",{n:f.n})}</span></div>)}
            </div>}
          </Card>;})()}
        {A.opsHealth&&(()=>{const h=A.opsHealth;
          const fmtUptime=s=>{const d=Math.floor(s/86400),hr=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);
            return d>0?`${d}d ${hr}h`:hr>0?`${hr}h ${m}m`:`${m}m`;};
          return <Card><H2 sub={t("admin.home.systemHealthSub")}>{t("admin.home.systemHealth")}</H2>
            <div className="grid grid-cols-3 gap-2.5 mb-3.5">
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className={`text-lg font-bold ${h.errors24h>0?"text-red":"text-text"}`}>{h.errors24h}</div>
                <div className="text-xs text-text-3 mt-1">{t("admin.home.serverErrors24h")}</div></div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{fmtUptime(h.uptimeSeconds)}</div>
                <div className="text-xs text-text-3 mt-1">{t("admin.home.apiUptime")}</div></div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <div className="text-lg font-bold text-text">{h.dbSizeBytes?`${(h.dbSizeBytes/1024/1024).toFixed(1)} MB`:"—"}</div>
                <div className="text-xs text-text-3 mt-1">{t("admin.home.dbSize")}</div></div>
            </div>
            {h.errors24h===0?<div className="text-sm text-text-3 py-2 text-center">{t("admin.home.noServerErrors")}</div>
              :<div className="flex flex-col gap-1.5">
                {h.topErrorPaths.map((e,i)=><div key={i} className="flex justify-between text-xs py-1.5 px-2.5 bg-red-bg rounded-lg">
                  <span className="text-text-2">{e.method} {e.path} · {e.status}</span><span className="font-bold text-red">{e.n}×</span></div>)}
              </div>}
          </Card>;})()}
        </div></div>
  </Page>;
}

export function AdmUsers(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
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
    <H1 sub={t("admin.users.subtitle",{n:A.people.length})}
      action={<Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportUsers(list)}>{list.length<A.people.length?t("admin.users.exportFiltered",{n:list.length}):t("admin.users.exportCsv")}</Btn>}>{t("admin.users.title")}</H1>
    <div className="flex gap-3 mb-4 flex-wrap items-center">
      <div className="grow shrink basis-60 max-w-90"><Input icon="search" placeholder={t("admin.users.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Sel value={status} onChange={e=>setStatus(e.target.value)} style={{width:150}}>
        <option value="all">{t("admin.users.allStatuses")}</option><option value="active">{t("admin.users.activeOnly")}</option><option value="suspended">{t("admin.users.suspendedOnly")}</option></Sel>
      <Sel value={sort} onChange={e=>setSort(e.target.value)} style={{width:170}}>
        <option value="name">{t("admin.users.sortName")}</option><option value="apps">{t("admin.users.sortApps")}</option><option value="city">{t("admin.users.sortCity")}</option><option value="joined">{t("admin.users.sortJoined")}</option></Sel>
    </div>
    <Card pad={0} style={{overflow:"hidden"}}>
      {pg.pageItems.map((u,i)=>{const apps=u._apps; const sus=u._sus; const susInfo=A.suspensionInfo?.[u.id];
        return <div key={u.id} className={`flex items-center gap-3.5 py-3.5 px-5 flex-wrap ${i<pg.pageItems.length-1?"border-b border-line-soft":""} ${sus?"bg-red-bg":"bg-white"}`}>
          <SmartPortrait seed={u.seed} size={40}/>
          <div className="grow shrink basis-43 min-w-0">
            <div className="text-sm font-semibold text-text">{u.name}</div>
            <div className="text-xs text-text-3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</div>
            {sus&&susInfo&&<div className="text-xs text-red mt-0.5">{t("admin.users.suspendedInfo",{at:susInfo.at,reason:susInfo.reason})}</div>}</div>
          {!mob&&<div className="w-40 text-sm text-text-2">{u.title}</div>}
          {!mob&&<div className="w-28 text-sm text-text-2">{u.city}, {u.prov}</div>}
          {!mob&&<div className="w-24 text-xs text-text-3">{u.joined?t("admin.users.joined",{date:u.joined}):"—"}</div>}
          <div className="w-20 text-sm text-text-2">{t("admin.users.appsCount",{n:apps})}</div>
          <Tag tone={sus?"danger":"ok"} sm>{sus?t("admin.users.suspended"):t("admin.users.active")}</Tag>
          <Btn kind="ghost" size="xs" onClick={()=>setViewing(u)}>{t("admin.users.details")}</Btn>
          <Btn kind="ghost" size="xs" icon="eye" onClick={()=>A.impersonate(u.id)}>{t("admin.users.viewAs")}</Btn>
          <Btn kind={sus?"outline":"ghost"} size="xs" onClick={()=>{
            if(sus){A.toggleSuspend(u.id);A.toast(t("admin.users.restoredToast",{name:u.name}),"ok");}
            else{setSuspending(u);setReason("");}
          }}>{sus?t("admin.users.restore"):t("admin.users.suspend")}</Btn>
          <Btn kind="dangerSoft" size="xs" icon="trash" onClick={()=>setErasing(u)}>{t("admin.users.erase")}</Btn></div>;})}
      {list.length===0&&<div className="p-5"><Empty icon="search" title={t("admin.users.noUsersMatch")} body={t("admin.users.tryDifferentSearch")}/></div>}</Card>
    <Pagination {...pg}/>
    {suspending&&<Modal onClose={()=>setSuspending(null)} title={t("admin.users.suspendTitle",{name:suspending.name})}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("admin.users.reason")} required hint={t("admin.users.suspendHint")}>
          <Area rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder={t("admin.users.suspendPlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setSuspending(null)}>{t("admin.users.cancel")}</Btn>
          <Btn kind="danger" disabled={!reason.trim()} onClick={()=>{A.toggleSuspend(suspending.id,reason.trim());A.toast(t("admin.users.suspendedToast",{name:suspending.name}),"danger");setSuspending(null);}}>{t("admin.users.suspend")}</Btn>
        </div>
      </div>
    </Modal>}
    <ConfirmDialog open={!!erasing} onClose={()=>setErasing(null)} confirmLabel={t("admin.users.erasePermanently")}
      title={t("admin.users.eraseTitle",{name:erasing?.name})}
      onConfirm={async()=>{const name=erasing.name;const id=erasing.id;setErasing(null);
        const r=await A.eraseUser(id); A.toast(r.ok?t("admin.users.erasedToast",{name}):r.msg,r.ok?"danger":"warn");}}>
      {t("admin.users.eraseBody")}</ConfirmDialog>
    {viewing&&<Modal onClose={()=>setViewing(null)} title={viewing.name} wide>
      <div className="flex gap-3.5 items-center mb-4">
        <SmartPortrait seed={viewing.seed} size={52}/>
        <div className="min-w-0">
          <div className="text-base font-bold text-text">{viewing.name}</div>
          <div className="text-sm text-text-2">{viewing.email}</div>
        </div>
        <Tag tone={A.suspended.has(viewing.id)?"danger":"ok"} sm style={{marginLeft:"auto"}}>{A.suspended.has(viewing.id)?t("admin.users.suspended"):t("admin.users.active")}</Tag>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[[t("admin.users.fieldTitle"),viewing.title||"—"],[t("admin.users.fieldCategory"),viewing.cat||"—"],[t("admin.users.fieldLocation"),`${viewing.city||"—"}, ${viewing.prov||""}`],
          [t("admin.users.fieldYears"),viewing.years??"—"],[t("admin.users.fieldPhone"),viewing.phone||"—"],[t("admin.users.fieldJoined"),viewing.joined||"—"]].map(([l,v])=>
          <div key={l} className="bg-bg rounded-xl py-2.5 px-3">
            <div className="text-xs text-text-3">{l}</div>
            <div className="text-sm font-semibold text-text mt-0.5">{v}</div></div>)}
      </div>
      {A.suspended.has(viewing.id)&&A.suspensionInfo?.[viewing.id]&&<Banner tone="danger" icon="alert" title={t("admin.users.suspended")} style={{marginBottom:16}}>
        {A.suspensionInfo[viewing.id].at}: {A.suspensionInfo[viewing.id].reason}</Banner>}
      <Lbl>{t("admin.users.applicationsN",{n:A.applications.filter(a=>a.user===viewing.id).length})}</Lbl>
      <div className="flex flex-col gap-2 mb-2" style={{maxHeight:260,overflowY:"auto"}}>
        {A.applications.filter(a=>a.user===viewing.id).map(a=>{const j=A.job(a.job); const e=j?A.emp(j.e):null;
          return <div key={a.id} className="flex justify-between items-center py-2.5 px-3 bg-bg rounded-lg">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j?.t||"—"}</div>
              <div className="text-xs text-text-3">{e?.name||"—"} · {a.at}</div>
            </div>
            <Tag tone={a.stage==="Hired"?"ok":a.stage==="Withdrawn"?"neutral":"brand"} sm>{a.stage}</Tag>
          </div>;})}
        {A.applications.filter(a=>a.user===viewing.id).length===0&&<div className="text-sm text-text-3 py-3">{t("admin.users.noApplicationsOnFile")}</div>}
      </div>
      <div className="flex gap-2.5 justify-end pt-3 border-t border-line">
        <Btn kind="ghost" onClick={()=>setViewing(null)}>{t("admin.users.close")}</Btn>
        <Btn kind="outline" icon="eye" onClick={()=>{A.impersonate(viewing.id);setViewing(null);}}>{t("admin.users.viewAs")}</Btn>
      </div>
    </Modal>}
  </Page>;
}

export function AdmEmployers(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [tab,setTab]=useState("pending"); const [q,setQ]=useState("");
  const [holding,setHolding]=useState(null); const [holdReason,setHoldReason]=useState("");
  const [viewing,setViewing]=useState(null);
  const match=e=>!q||e.name.toLowerCase().includes(q.toLowerCase())||e.industry.toLowerCase().includes(q.toLowerCase())||(e.owner||"").toLowerCase().includes(q.toLowerCase());
  const pending=A.employers.filter(e=>!e.verified&&!e.hold&&match(e)), held=A.employers.filter(e=>!e.verified&&e.hold&&match(e)), verified=A.employers.filter(e=>e.verified&&match(e));
  const list=tab==="pending"?pending:tab==="held"?held:verified;
  const pg=usePagination(list,24);
  return <Page wide>
    <H1 sub={t("admin.employers.subtitle")}
      action={<Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportEmployers(list)}>{list.length<A.employers.length?t("admin.users.exportFiltered",{n:list.length}):t("admin.users.exportCsv")}</Btn>}>{t("admin.employers.title")}</H1>
    <div className="max-w-105 mb-4"><Input icon="search" placeholder={t("admin.employers.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}/></div>
    <Tabs items={[{k:"pending",label:t("admin.employers.tabPending"),n:pending.length},{k:"held",label:t("admin.employers.tabHeld"),n:held.length},{k:"verified",label:t("admin.employers.tabVerified"),n:verified.length}]}
      value={tab} onChange={setTab} style={{marginBottom:18}}/>
    {list.length===0?<Empty icon="checkC2" title={t("admin.employers.nothingToReview")} body={t("admin.employers.allHandled")}/>
      :<div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`}}>
        {pg.pageItems.map((e,i)=>{const jobs=A.jobs.filter(j=>j.e===e.id).length;
          const apps=A.applications.filter(a=>A.jobs.find(j=>j.id===a.job)?.e===e.id).length;
          return <Card key={e.id} delay={Math.min(i,6)*0.04}>
            <div className="flex gap-3 items-center mb-3.5">
              <EmpMark e={e} size={48}/>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-text tracking-tight">{e.name}</div>
                <div className="text-sm text-text-2 mt-0.5">{e.industry} • {e.city}, {e.prov}</div></div>
              {e.verified&&<Tag tone="ok" sm icon="checkC2">{t("admin.employers.verified")}</Tag>}</div>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              {[[t("admin.employers.contact"),e.owner],[t("admin.employers.size"),e.size],[t("admin.employers.listings"),jobs],[t("admin.employers.applicants"),apps]].map(([k,v])=>
                <div key={k} className="bg-bg rounded-xl py-2.5 px-3 min-w-0">
                  <div className="text-xs text-text-3">{k}</div>
                  <div className="text-sm font-semibold text-text mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{v}</div></div>)}</div>
            {!e.verified&&<div className="bg-bg rounded-xl py-2.5 px-3 mb-3.5">
              <div className="text-xs text-text-3 mb-1.5">{t("admin.employers.verificationEvidence")}</div>
              <div className="text-xs text-text-2 leading-relaxed">
                <div>{t("admin.employers.website")} {e.site?<a href={`https://${e.site}`} target="_blank" rel="noreferrer" className="text-brand font-semibold">{e.site}</a>:<span className="text-text-3">{t("admin.employers.notProvided")}</span>}</div>
                <div>{t("admin.employers.businessNumber")} {e.businessNumber||<span className="text-text-3">{t("admin.employers.notProvided")}</span>}</div>
                <div>{t("admin.employers.founded")} {e.founded||"—"}</div>
                {e.about&&<div className="mt-1 italic">"{e.about}"</div>}
              </div></div>}
            <div className="flex gap-2 pt-3 border-t border-line-soft flex-wrap">
              <Btn kind="ghost" size="sm" onClick={()=>A.openEmployer(e.id)}>{t("admin.employers.viewPage")}</Btn>
              <Btn kind="ghost" size="sm" onClick={()=>setViewing(e)}>{t("admin.employers.details")}</Btn>
              <div className="flex-1"/>
              {e.verified?<Btn kind="outline" size="sm" onClick={()=>{A.verifyEmployer(e.id,false);A.toast(t("admin.employers.revokedToast",{name:e.name}),"danger");}}>{t("admin.employers.revoke")}</Btn>
                :e.hold?<><Btn kind="ok" size="sm" icon="check" onClick={()=>{A.verifyEmployer(e.id,true);A.toast(t("admin.employers.approvedToast",{name:e.name}),"ok");}}>{t("admin.employers.approve")}</Btn>
                  <Btn kind="outline" size="sm" onClick={()=>{A.holdEmployer(e.id);A.toast(t("admin.employers.releasedToast",{name:e.name}));}}>{t("admin.employers.releaseHold")}</Btn></>
                :<><Btn kind="ok" size="sm" icon="check" onClick={()=>{A.verifyEmployer(e.id,true);A.toast(t("admin.employers.approvedToast",{name:e.name}),"ok");}}>{t("admin.employers.approve")}</Btn>
                  <Btn kind="dangerSoft" size="sm" onClick={()=>{setHolding(e);setHoldReason("");}}>{t("admin.employers.hold")}</Btn></>}</div></Card>;})}</div>}
    <Pagination {...pg}/>
    {holding&&<Modal onClose={()=>setHolding(null)} title={t("admin.employers.holdTitle",{name:holding.name})}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("admin.employers.reason")} required hint={t("admin.employers.holdHint")}>
          <Area rows={3} value={holdReason} onChange={e=>setHoldReason(e.target.value)} placeholder={t("admin.employers.holdPlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setHolding(null)}>{t("admin.employers.cancel")}</Btn>
          <Btn kind="danger" disabled={!holdReason.trim()} onClick={()=>{A.holdEmployer(holding.id,holdReason.trim());A.toast(t("admin.employers.heldToast",{name:holding.name}));setHolding(null);}}>{t("admin.employers.hold")}</Btn>
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
        <Tag tone={viewing.verified?"ok":viewing.hold?"warn":"neutral"} sm style={{marginLeft:"auto"}}>{viewing.verified?t("admin.employers.verified"):viewing.hold?t("admin.employers.onHold"):t("admin.employers.pending")}</Tag>
      </div>
      <Lbl>{t("admin.employers.jobListingsN",{n:A.jobs.filter(j=>j.e===viewing.id).length})}</Lbl>
      <div className="flex flex-col gap-2 mb-4" style={{maxHeight:220,overflowY:"auto"}}>
        {A.jobs.filter(j=>j.e===viewing.id).map(j=>{const n=A.applications.filter(a=>a.job===j.id).length;
          return <div key={j.id} className="flex justify-between items-center py-2.5 px-3 bg-bg rounded-lg">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
              <div className="text-xs text-text-3">{j.city}, {j.prov} · {t("admin.employers.viewsN",{n:j.views})} · {t(n===1?"admin.employers.applicantN":"admin.employers.applicantsN",{n})}</div>
            </div>
            <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status)}</Tag>
          </div>;})}
        {A.jobs.filter(j=>j.e===viewing.id).length===0&&<div className="text-sm text-text-3 py-3">{t("admin.employers.noListingsYet")}</div>}
      </div>
      <Lbl>{t("admin.employers.recentActivity")}</Lbl>
      <div className="flex flex-col gap-2" style={{maxHeight:180,overflowY:"auto"}}>
        {A.activity.filter(a=>a.text.includes(viewing.name)).slice(0,20).map(a=>
          <div key={a.id} className="py-2 px-3 bg-bg rounded-lg text-xs">
            <span className="text-text-3">{a.at}</span> — <span className="text-text-2">{a.text}</span></div>)}
        {A.activity.filter(a=>a.text.includes(viewing.name)).length===0&&<div className="text-sm text-text-3 py-3">{t("admin.employers.nothingRecorded")}</div>}
      </div>
      <div className="flex gap-2.5 justify-end pt-3 mt-3 border-t border-line">
        <Btn kind="ghost" onClick={()=>setViewing(null)}>{t("admin.employers.close")}</Btn>
        <Btn kind="outline" onClick={()=>{A.openEmployer(viewing.id);setViewing(null);}}>{t("admin.employers.viewPublicPage")}</Btn>
      </div>
    </Modal>}
  </Page>;
}

export function AdmJobs(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
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
  const bulkFlag=(on,reason)=>{selJobs.forEach(j=>{if(!!j.flagged!==on)A.flagJob(j.id,reason);}); A.toast(t(selJobs.length===1?(on?"admin.jobs.bulkFlaggedOne":"admin.jobs.bulkUnflaggedOne"):(on?"admin.jobs.bulkFlaggedOther":"admin.jobs.bulkUnflaggedOther"),{n:selJobs.length})); setSel(new Set());};
  const bulkPause=()=>{selJobs.filter(j=>j.status==="live").forEach(j=>A.toggleJobStatus(j.id)); A.toast(t(selJobs.length===1?"admin.jobs.bulkPausedOne":"admin.jobs.bulkPausedOther",{n:selJobs.length})); setSel(new Set());};
  const bulkApprove=()=>{selJobs.filter(j=>j.status!=="live").forEach(j=>A.toggleJobStatus(j.id)); A.toast(t(selJobs.length===1?"admin.jobs.bulkApprovedOne":"admin.jobs.bulkApprovedOther",{n:selJobs.length}),"ok"); setSel(new Set());};
  return <Page wide>
    <H1 sub={t("admin.jobs.subtitle")}>{t("admin.jobs.title")}</H1>
    <div className="flex gap-3 mb-5 flex-wrap items-center">
      <div className="grow shrink basis-60 max-w-90"><Input icon="search" placeholder={t("admin.jobs.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Tabs items={[{k:"all",label:t("admin.jobs.tabAll"),n:A.jobs.length},{k:"flagged",label:t("admin.jobs.tabFlagged"),n:A.jobs.filter(j=>j.flagged).length},
        {k:"review",label:t("admin.jobs.tabReview"),n:A.jobs.filter(j=>j.status==="review").length},
        {k:"paused",label:t("admin.jobs.tabPaused"),n:A.jobs.filter(j=>j.status==="paused").length}]} value={tab} onChange={tb=>{setTab(tb);setSel(new Set());}}/></div>
    {sel.size>0&&<Banner tone="brand" icon="check" style={{marginBottom:14}}
      action={<div className="flex gap-2 flex-wrap">
        <Btn kind="ok" size="xs" onClick={bulkApprove}>{t("admin.jobs.approveRestore")}</Btn>
        <Btn kind="outline" size="xs" onClick={bulkPause}>{t("admin.jobs.pause")}</Btn>
        <Btn kind="dangerSoft" size="xs" onClick={()=>{setBulkFlagging(true);setFlagReason("");}}>{t("admin.jobs.flag")}</Btn>
        <Btn kind="ghost" size="xs" onClick={()=>bulkFlag(false)}>{t("admin.jobs.unflag")}</Btn></div>}>
      {t(sel.size===1?"admin.jobs.selectedOne":"admin.jobs.selectedOther",{n:sel.size})}</Banner>}
    <Card pad={0} style={{overflow:"hidden"}}>
      {pg.pageItems.length>0&&<div className="flex items-center gap-3 py-2.5 px-5 border-b border-line-soft bg-bg">
        <input type="checkbox" checked={allSelected} onChange={e=>setSel(e.target.checked?new Set(pg.pageItems.map(j=>j.id)):new Set())}/>
        <span className="text-xs font-semibold text-text-3 uppercase tracking-wide">{t("admin.jobs.selectAllOnPage")}</span></div>}
      {pg.pageItems.map((j,i)=>{const e=A.emp(j.e); const n=A.applications.filter(a=>a.job===j.id).length;
        return <div key={j.id} className={`flex items-center gap-3 py-3.5 px-5 flex-wrap ${i<pg.pageItems.length-1?"border-b border-line-soft":""} ${j.flagged?"bg-warn-bg":"bg-white"}`}>
          <input type="checkbox" checked={sel.has(j.id)} onChange={()=>toggleSel(j.id)}/>
          <EmpMark e={e} size={38} radius={10}/>
          <div className="grow shrink basis-50 min-w-0">
            <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
            <div className="text-xs text-text-3 mt-0.5">{e.name} • {j.city}, {j.prov} • {pay(j)}{payShort(j)}</div></div>
          {!mob&&<div className="w-22 text-sm text-text-2">{t(n===1?"admin.jobs.applicantOne":"admin.jobs.applicantOther",{n})}</div>}
          <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status)}</Tag>
          <div className="flex gap-2 flex-wrap">
            <Btn kind="ghost" size="xs" icon="eye" title={t("admin.jobs.preview")} onClick={()=>A.openJob(j.id,{preview:true})}/>
            <Btn kind="outline" size="xs" onClick={()=>{const label=j.status==="live"?t("admin.jobs.statusPaused"):j.status==="review"?t("admin.jobs.statusApproved"):t("admin.jobs.statusRestored");A.toggleJobStatus(j.id);A.toast(t("admin.jobs.toastStatusChanged",{title:j.t,label}),j.status==="live"?"warn":"ok");}}>{j.status==="live"?t("admin.jobs.actionPause"):j.status==="review"?t("admin.jobs.actionApprove"):t("admin.jobs.actionRestore")}</Btn>
            <Btn kind={j.flagged?"dangerSoft":"ghost"} size="xs" onClick={()=>{
              if(j.flagged){A.flagJob(j.id);A.toast(t("admin.jobs.toastUnflagged",{title:j.t}),"brand");}
              else{setFlagging(j);setFlagReason("");}
            }}>{j.flagged?t("admin.jobs.unflag"):t("admin.jobs.flag")}</Btn></div></div>;})}
      {list.length===0&&<div className="p-5"><Empty icon="search" title={t("admin.jobs.nothingMatchesFilter")} body={t("admin.jobs.tryDifferentFilter")}/></div>}</Card>
    <Pagination {...pg}/>

    <Card style={{marginTop:20}}>
      <H2 sub={t("admin.jobs.reportsOpenSub",{n:openReports.length})}>{t("admin.jobs.reportsTitle")}</H2>
      {A.jobReports.length===0?<div className="text-sm text-text-3 py-3 text-center">{t("admin.jobs.noReports")}</div>
        :<div className="flex flex-col gap-2">
          {A.jobReports.slice(0,20).map(r=><div key={r.id} className="flex gap-3 items-start py-3 border-b border-line-soft flex-wrap">
            <div className="grow shrink basis-60 min-w-0">
              <div className="text-sm font-semibold text-text">{r.jobTitle}</div>
              <div className="text-xs text-text-3 mt-0.5">{t("admin.jobs.reportedBy",{name:r.reporterName,reason:r.reason})}</div>
            </div>
            <Tag tone={r.status==="open"?"warn":r.status==="actioned"?"danger":"neutral"} sm>{r.status}</Tag>
            {r.status==="open"&&<div className="flex gap-1.5">
              <Btn kind="outline" size="xs" onClick={()=>A.decideJobReport(r.id,"dismissed")}>{t("admin.jobs.dismiss")}</Btn>
              <Btn kind="dangerSoft" size="xs" onClick={()=>{const j=A.jobs.find(x=>x.id===r.job); if(j&&!j.flagged){setFlagging(j);setFlagReason(r.reason);} A.decideJobReport(r.id,"actioned");}}>{t("admin.jobs.flagListing")}</Btn>
            </div>}
          </div>)}
        </div>}
    </Card>

    {flagging&&<Modal onClose={()=>setFlagging(null)} title={t("admin.jobs.flagTitle",{title:flagging.t})}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("admin.jobs.reason")} required hint={t("admin.jobs.flagHint")}>
          <Area rows={3} value={flagReason} onChange={e=>setFlagReason(e.target.value)} placeholder={t("admin.jobs.flagPlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setFlagging(null)}>{t("admin.jobs.cancel")}</Btn>
          <Btn kind="danger" disabled={!flagReason.trim()} onClick={()=>{A.flagJob(flagging.id,flagReason.trim());A.toast(t("admin.jobs.flaggedToast",{title:flagging.t}),"danger");setFlagging(null);}}>{t("admin.jobs.flag")}</Btn>
        </div>
      </div>
    </Modal>}
    {bulkFlagging&&<Modal onClose={()=>setBulkFlagging(false)} title={t(selJobs.length===1?"admin.jobs.flagBulkTitleOne":"admin.jobs.flagBulkTitleOther",{n:selJobs.length})}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("admin.jobs.reason")} required hint={t("admin.jobs.flagHint")}>
          <Area rows={3} value={flagReason} onChange={e=>setFlagReason(e.target.value)} placeholder={t("admin.jobs.flagBulkPlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setBulkFlagging(false)}>{t("admin.jobs.cancel")}</Btn>
          <Btn kind="danger" disabled={!flagReason.trim()} onClick={()=>{bulkFlag(true,flagReason.trim());setBulkFlagging(false);}}>{t("admin.jobs.flagAll")}</Btn>
        </div>
      </div>
    </Modal>}
  </Page>;
}

export function AdmSettings(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const S=A.settings;
  const [inbox,setInbox]=useState([]); const [inboxTab,setInboxTab]=useState("open");
  useEffect(()=>{A.loadContactInbox().then(setInbox);},[]);
  const resolveMsg=async(id)=>{const r=await A.resolveContactMessage(id);
    if(r.ok){setInbox(l=>l.map(m=>m.id===id?{...m,status:"resolved"}:m));A.toast(t("admin.settings.resolvedToast"),"ok");}};
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
          {lc&&<div className="text-xs text-text-3 mt-1.5">{t("admin.settings.lastChangedBy",{actor:lc.actor,at:lc.at})}</div>}</div>
        <Switch on={S[k]} onChange={v=>A.setSetting(k,v)}/></div>;})}</Card>;
  return <Page narrow>
    <H1 sub={t("admin.settings.subtitle")}
      action={<Btn kind="outline" size="sm" icon="file" onClick={()=>A.go("admLog")}>{t("admin.settings.activityLog")}</Btn>}>{t("admin.settings.title")}</H1>
    <Group title={t("admin.settings.groupEmployerTitle")} sub={t("admin.settings.groupEmployerSub")}
      rows={[["employerBlogs",t("admin.settings.rowEmployerBlogsLabel"),t("admin.settings.rowEmployerBlogsDesc")],
        ["employerTrainings",t("admin.settings.rowEmployerTrainingsLabel"),t("admin.settings.rowEmployerTrainingsDesc")],
        ["employerFeature",t("admin.settings.rowEmployerFeatureLabel"),t("admin.settings.rowEmployerFeatureDesc")],
        ["autoApproveJobs",t("admin.settings.rowAutoApproveLabel"),t("admin.settings.rowAutoApproveDesc")]]}/>
    <Group title={t("admin.settings.groupSeekerTitle")} sub={t("admin.settings.groupSeekerSub")}
      rows={[["publicSignup",t("admin.settings.rowPublicSignupLabel"),t("admin.settings.rowPublicSignupDesc")],
        ["cvBuilder",t("admin.settings.rowCvBuilderLabel"),t("admin.settings.rowCvBuilderDesc")],
        ["matching",t("admin.settings.rowMatchingLabel"),t("admin.settings.rowMatchingDesc")],
        ["enrolments",t("admin.settings.rowEnrolmentsLabel"),t("admin.settings.rowEnrolmentsDesc")]]}/>
    <Group title={t("admin.settings.groupPlatformTitle")} sub={t("admin.settings.groupPlatformSub")}
      rows={[["payTransparency",t("admin.settings.rowPayTransparencyLabel"),t("admin.settings.rowPayTransparencyDesc")],
        ["maintenance",t("admin.settings.rowMaintenanceLabel"),t("admin.settings.rowMaintenanceDesc"),true]]}/>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div className="flex justify-between items-center mb-1">
        <H2 sub={t("admin.settings.contactInboxSub")}>{t("admin.settings.contactInbox")}</H2>
        <Tag tone={inbox.filter(m=>m.status==="open").length>0?"warn":"ok"} sm>{t("admin.settings.openN",{n:inbox.filter(m=>m.status==="open").length})}</Tag>
      </div>
      <Tabs items={[{k:"open",label:t("admin.settings.tabOpen",{n:inbox.filter(m=>m.status==="open").length})},{k:"resolved",label:t("admin.settings.tabResolved")}]} value={inboxTab} onChange={setInboxTab}/>
      <div className="flex flex-col gap-2 mt-3" style={{maxHeight:320,overflowY:"auto"}}>
        {inbox.filter(m=>m.status===inboxTab).map(m=>
          <div key={m.id} className="py-3 px-3.5 bg-bg rounded-xl border border-line">
            <div className="flex justify-between items-start gap-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">{m.name||"—"} · <span className="text-text-3 font-normal">{m.email}</span></div>
                <div className="text-xs text-text-3 mt-0.5">{m.topic||t("admin.settings.generalTopic")} · {formatDateTime(m.at,locale)} · <span className="font-mono">{m.id}</span></div>
              </div>
              {m.status==="open"&&<Btn kind="outline" size="xs" onClick={()=>resolveMsg(m.id)}>{t("admin.settings.markResolved")}</Btn>}
            </div>
            <div className="text-sm text-text-2 mt-2 leading-relaxed whitespace-pre-wrap">{m.message}</div>
          </div>)}
        {inbox.filter(m=>m.status===inboxTab).length===0&&<div className="text-sm text-text-3 py-4">{t("admin.settings.nothingHere")}</div>}
      </div>
    </Card>
    <Card pad={mob?18:24}>
      <H2 sub={t("admin.settings.currentImpactSub")}>{t("admin.settings.currentImpact")}</H2>
      <div className={`grid ${mob?"grid-cols-1":"grid-cols-2"} gap-3`}>
        {[[t("admin.settings.statArticles"),A.blogs.filter(b=>b.owner!=="admin").length],
          [t("admin.settings.statTrainings"),A.trainings.filter(tr=>tr.owner!=="admin").length],
          [t("admin.settings.statFeatured"),A.jobs.filter(j=>j.featured).length],
          [t("admin.settings.statAwaitingApproval"),A.jobs.filter(j=>j.status==="review").length]].map(([k,v])=>
          <div key={k} className="bg-bg rounded-xl py-3 px-4">
            <div className="text-xs text-text-2">{k}</div>
            <div className="text-2xl font-bold text-text mt-2 tracking-tight">{v}</div></div>)}</div></Card>
  </Page>;
}

export function AdmLog(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [q,setQ]=useState(""); const [cat,setCat]=useState("all"); const [actor,setActor]=useState("all");
  const categories=[["all",t("admin.log.catAll")],["auth",t("admin.log.catAuth")],["job",t("admin.log.catJobs")],["application",t("admin.log.catApplications")],["pipeline",t("admin.log.catPipeline")],
    ["employer",t("admin.log.catEmployers")],["blog",t("admin.log.catContent")],["training",t("admin.log.catContent")],["billing",t("admin.log.catBilling")],["settings",t("admin.log.catSettings")],["admin",t("admin.log.catAdmin")]];
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
      ? t("admin.log.emptySub")
      : t(A.activity.length===1?"admin.log.recordedEventsOne":"admin.log.recordedEventsOther",{n:formatNumber(A.activity.length,locale)})}
      action={<Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportLog(list)}>{list.length<A.activity.length?t("admin.users.exportFiltered",{n:list.length}):t("admin.users.exportCsv")}</Btn>}>{t("admin.log.title")}</H1>
    <Card pad={mob?16:20} style={{marginBottom:14,borderRadius:16}}>
      <div className={`grid gap-3 ${mob?"grid-cols-1":""}`} style={{gridTemplateColumns:mob?undefined:"2fr 1fr 1fr"}}>
        <Input icon="search" placeholder={t("admin.log.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}/>
        <Sel value={cat} onChange={e=>setCat(e.target.value)}>{[...new Map(categories.map(c=>[c[0],c])).values()].map(([k,l])=><option key={k} value={k}>{l}</option>)}</Sel>
        <Sel value={actor} onChange={e=>setActor(e.target.value)}>
          <option value="all">{t("admin.log.allActors")}</option>{actors.map(a=><option key={a} value={a}>{a}</option>)}</Sel>
      </div>
      {(q||cat!=="all"||actor!=="all")&&<div className="mt-3 text-sm text-text-2">
        {t("admin.log.showingOf",{n:list.length,total:A.activity.length})}
        <button onClick={()=>{setQ("");setCat("all");setActor("all");}} className="bg-transparent border-0 p-0 ml-2.5 cursor-pointer text-sm text-brand font-semibold">{t("admin.log.clear")}</button>
      </div>}
    </Card>
    {list.length===0?<Empty icon="file" title={A.activity.length===0?t("admin.log.noActivityYet"):t("admin.log.nothingMatches")} body={t("admin.log.emptyBody")}/>
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
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
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
    <H1 sub={t("admin.stats.subtitle")}>{t("admin.stats.title")}</H1>
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`}}>
      <Stat icon="briefcase" label={t("admin.stats.totalListings")} value={A.jobs.length} tone={C.brand}/>
      <Stat icon="send" label={t("admin.stats.applications")} value={A.applications.length} tone={C.violet}/>
      <Stat icon="book" label={t("admin.stats.publishedContent")} value={A.blogs.filter(b=>b.status==="published").length+A.trainings.filter(tr=>tr.status==="published").length}/>
      <Stat icon="award" label={t("admin.stats.offersExtended")} value={A.applications.filter(a=>a.stage==="Offer").length} tone={C.ok}/></div>
    <div className={`grid ${mob?"grid-cols-1":"grid-cols-2"} gap-4 mb-4`}>
      <Card><H2>{t("admin.stats.listingsBySector")}</H2>{byCat.map(c=><BarRow key={c.id} label={c.label} value={c.n} max={max} total={A.jobs.length}/>)}</Card>
      <Card><H2>{t("admin.stats.applicationsByStage")}</H2>
        {byStage.map(([s,n])=><BarRow key={s} label={s} value={n} max={Math.max(1,A.applications.length)} tone={C.violet} total={A.applications.length}/>)}
        <div className="mt-5 pt-4 border-t border-line-soft grid grid-cols-2 gap-3">
          {[[t("admin.stats.verifiedEmployers"),A.employers.filter(e=>e.verified).length],[t("admin.stats.flaggedListings"),A.jobs.filter(j=>j.flagged).length],
            [t("admin.stats.suspendedUsers"),A.suspended.size],[t("admin.stats.trainingEnrolments"),formatNumber(A.trainings.reduce((s,tr)=>s+tr.enrolled,0),locale)]].map(([k,v])=>
            <div key={k} className="bg-bg rounded-xl py-3 px-3.5">
              <div className="text-xs text-text-3">{k}</div>
              <div className="text-xl font-bold text-text mt-1 tracking-tight">{v}</div></div>)}</div></Card></div>
    <Card><H2 sub={t("admin.stats.revenueByPlanSub",{revenue:`$${formatNumber(totalRevenue,locale)}`,n:A.employers.length})}>{t("admin.stats.revenueByPlan")}</H2>
      {byPlan.map(p=><BarRow key={p.name} label={`${p.name} (${p.n})`} value={p.revenue} max={Math.max(1,totalRevenue)} tone={p.name==="Enterprise"?C.violet:p.name==="Growth"?C.brand:C.text3} total={totalRevenue}/>)}
    </Card>
  </Page>;
}

const adminScopeInfo=t=>({
  full:{label:t("admin.admins.scopeFullLabel"),desc:t("admin.admins.scopeFullDesc")},
  support:{label:t("admin.admins.scopeSupportLabel"),desc:t("admin.admins.scopeSupportDesc")},
  moderator:{label:t("admin.admins.scopeModeratorLabel"),desc:t("admin.admins.scopeModeratorDesc")},
  finance:{label:t("admin.admins.scopeFinanceLabel"),desc:t("admin.admins.scopeFinanceDesc")},
  readonly:{label:t("admin.admins.scopeReadonlyLabel"),desc:t("admin.admins.scopeReadonlyDesc")},
});
/* Only a full admin can reach this page at all (server-enforced by requireAdminScope() with no
   scopes listed) - scoping who can grant scopes is what keeps a support/moderator/finance account
   from ever escalating itself or another account. */
export function AdmAdmins(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const ADMIN_SCOPE_INFO=adminScopeInfo(t);
  const [admins,setAdmins]=useState([]); const [loading,setLoading]=useState(true);
  const load=()=>A.listAdmins().then(l=>{setAdmins(l);setLoading(false);});
  useEffect(()=>{load();},[]);
  const change=async(id,scope)=>{
    const r=await A.setAdminScope(id,scope);
    if(r.ok){A.toast(t("admin.admins.scopeUpdatedToast"),"ok");load();}else A.toast(r.msg,"danger");
  };
  return <Page narrow>
    <H1 sub={t("admin.admins.subtitle")}>{t("admin.admins.title")}</H1>
    {loading?<div className="text-sm text-text-3">{t("admin.admins.loading")}</div>
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
        {a.id===A.user?.id&&<div className="text-xs text-warn mt-1.5">{t("admin.admins.cantChangeOwnScope")}</div>}
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
  const {t}=useTranslation();
  return <Card pad={20} style={{marginBottom:16}}>
    <div className="flex justify-between items-start gap-3 mb-3.5">
      <div><H2 sub={desc} style={{margin:0}}>{title}</H2></div>
      <Btn kind="primary" size="sm" disabled={!dirty||saving} onClick={onSave}>{saving?t("admin.config.saving"):t("admin.config.save")}</Btn>
    </div>
    {children}
    {error&&<Banner tone="danger" icon="alert" style={{marginTop:10}}>{error}</Banner>}
  </Card>;
}
function PlansEditor({value,onSave}){
  const A=use(); const {t}=useTranslation();
  const [plans,setPlans]=useState(value);
  const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const dirty=JSON.stringify(plans)!==JSON.stringify(value);
  const FIELDS=[
    ["price",t("admin.config.fieldPrice"),"number"],["jobs",t("admin.config.fieldJobs"),"limit"],["seats",t("admin.config.fieldSeats"),"limit"],
    ["featured",t("admin.config.fieldFeatured"),"limit"],["messagesPerMonth",t("admin.config.fieldMessagesPerMonth"),"limit"],
    ["messages",t("admin.config.fieldMessaging"),["true","false","limited"]],["analytics",t("admin.config.fieldAnalytics"),["basic","full"]],
    ["interviews",t("admin.config.fieldInterviews"),"bool"],["talentPool",t("admin.config.fieldTalentPool"),"bool"],["csvImport",t("admin.config.fieldCsvImport"),"bool"],
    ["branded",t("admin.config.fieldBranded"),"bool"],["articles",t("admin.config.fieldArticles"),"bool"],["trainings",t("admin.config.fieldTrainings"),"bool"],
    ["hrSuite",t("admin.config.fieldHrSuite"),"bool"],["api",t("admin.config.fieldApi"),"bool"],["sso",t("admin.config.fieldSso"),"bool"],["manager",t("admin.config.fieldManager"),"bool"],
    ["customStages",t("admin.config.fieldCustomStages"),"bool"],["bulkActions",t("admin.config.fieldBulkActions"),"bool"],
  ];
  const setField=(planName,key,v)=>setPlans(p=>({...p,[planName]:{...p[planName],[key]:v}}));
  const save=async()=>{setSaving(true); setError("");
    const r=await onSave("plans",plans); setSaving(false);
    if(!r.ok)setError(r.msg||t("admin.config.saveFailed")); else A.toast(t("admin.config.plansUpdatedToast"),"ok");};
  return <ConfigCard title={t("admin.config.plansTitle")} desc={t("admin.config.plansDesc")} dirty={dirty} saving={saving} error={error} onSave={save}>
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
  const A=use(); const {t}=useTranslation();
  const [d,setD]=useState(value);
  const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const dirty=JSON.stringify(d)!==JSON.stringify(value);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const save=async()=>{setSaving(true); setError("");
    const r=await onSave("staffingAgency",d); setSaving(false);
    if(!r.ok)setError(r.msg||t("admin.config.saveFailed")); else A.toast(t("admin.config.staffingUpdatedToast"),"ok");};
  const FIELDS=[["name",t("admin.config.fieldAgencyName"),"text"],["tagline",t("admin.config.fieldTagline"),"text"],["license",t("admin.config.fieldLicense"),"text"],
    ["licenseExpiry",t("admin.config.fieldLicenseExpiry"),"date"],["licenseLocAmount",t("admin.config.fieldLicenseLocAmount"),"number"],
    ["wsibRateGroup",t("admin.config.fieldWsibRateGroup"),"text"],["markupFloor",t("admin.config.fieldMarkupFloor"),"number"],
    ["markupTarget",t("admin.config.fieldMarkupTarget"),"number"],["markupCeiling",t("admin.config.fieldMarkupCeiling"),"number"],
    ["payPeriodDays",t("admin.config.fieldPayPeriodDays"),"number"],["invoiceCycleDays",t("admin.config.fieldInvoiceCycleDays"),"number"],
    ["paymentTermsDefaultDays",t("admin.config.fieldPaymentTermsDefaultDays"),"number"],
    ["recruiterCommissionPct",t("admin.config.fieldRecruiterCommission"),"number"],
    /* Burden knobs previously hardcoded in the JS formula are editable here now - so retuning
       them for a Quebec-QPIP account or a bigger admin overhead never needs a redeploy. */
    ["eiEmployerMultiplier",t("admin.config.fieldEiMultiplier"),"number"],
    ["adminFeePerHour",t("admin.config.fieldAdminFeePerHour"),"number"]];
  return <ConfigCard title={t("admin.config.staffingTitle")} desc={t("admin.config.staffingDesc")} dirty={dirty} saving={saving} error={error} onSave={save}>
    <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))"}}>
      {FIELDS.map(([key,label,kind])=><div key={key}>
        <div className="text-xs text-text-3 mb-1">{label}</div>
        <Input type={kind} value={d[key]} onChange={e=>set(key,kind==="number"?Number(e.target.value)||0:e.target.value)}/>
      </div>)}
      <div><div className="text-xs text-text-3 mb-1">{t("admin.config.provincesServed")}</div>
        <Input value={(d.provinces||[]).join(", ")} onChange={e=>set("provinces",e.target.value.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean))}/></div>
      <div><div className="text-xs text-text-3 mb-1">{t("admin.config.wsibProvinces")}</div>
        <Input value={(d.wsibProvinces||[]).join(", ")} onChange={e=>set("wsibProvinces",e.target.value.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean))}/></div>
      {/* Vacation pay mode is a real policy switch that changes what the payroll run does with
          the 4% accrual: "accrue" leaves it on vac_balance to be paid out later; "payout" adds
          it straight to each cheque. Kept as a select rather than a number because the choice is
          discrete and mis-typing either literal silently disables one branch. */}
      <div><div className="text-xs text-text-3 mb-1">{t("admin.config.vacationPayMode")}</div>
        <select value={d.vacationPayMode||"accrue"} onChange={e=>set("vacationPayMode",e.target.value)}
          className="w-full py-2 px-2.5 border border-line rounded-lg bg-white text-sm text-text">
          <option value="accrue">{t("admin.config.vacationAccrue")}</option>
          <option value="payout">{t("admin.config.vacationPayout")}</option>
        </select></div>
    </div>
  </ConfigCard>;
}
function JsonConfigEditor({title,desc,configKey,value,onSave}){
  const A=use(); const {t}=useTranslation();
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
    if(!keys.length) return t("admin.config.summaryEmpty");
    return t(keys.length===1?"admin.config.summaryKeysOne":"admin.config.summaryKeysOther",{n:keys.length,list:keys.slice(0,3).join(", ")})+(keys.length>3?t("admin.config.summaryMore",{n:keys.length-3}):"");
  })();
  const save=async()=>{
    let parsed;
    try{parsed=JSON.parse(text);}catch{setError(t("admin.config.notValidJson"));return;}
    setError(""); setSaving(true);
    const r=await onSave(configKey,parsed);
    setSaving(false);
    if(!r.ok)setError(r.msg||t("admin.config.saveFailed"));
    else {A.toast(t("admin.config.configUpdatedToast",{title}),"ok"); setEditing(false);}
  };
  return <Card pad={20} style={{marginBottom:16}}>
    <div className="flex justify-between items-start gap-3 mb-2.5">
      <div><H2 sub={desc} style={{margin:0}}>{title}</H2></div>
      {editing
        ?<div className="flex gap-2">
          <Btn kind="ghost" size="sm" onClick={()=>{setText(JSON.stringify(value,null,2));setEditing(false);setError("");}}>{t("admin.config.cancel")}</Btn>
          <Btn kind="primary" size="sm" disabled={!dirty||saving} onClick={save}>{saving?t("admin.config.saving"):t("admin.config.save")}</Btn>
        </div>
        :<div className="flex gap-2">
          <Btn kind="ghost" size="sm" onClick={()=>setExpanded(v=>!v)}>{expanded?t("admin.config.hideDetails"):t("admin.config.showDetails")}</Btn>
          <Btn kind="outline" size="sm" icon="edit" onClick={()=>{setEditing(true); setExpanded(true);}}>{t("admin.config.editAsJson")}</Btn>
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
  const A=use(); const {t}=useTranslation();
  const cfg=A.platformConfig;
  if(!cfg)return <Page narrow><div className="text-sm text-text-3">{t("admin.admins.loading")}</div></Page>;
  return <Page narrow>
    <H1 sub={t("admin.config.subtitle")}>{t("admin.config.title")}</H1>
    <PlansEditor value={cfg.plans} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title={t("admin.config.payrollTaxTitle")} desc={t("admin.config.payrollTaxDesc")} configKey="payrollTax" value={cfg.payrollTax} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title={t("admin.config.staffingRatesTitle")} desc={t("admin.config.staffingRatesDesc")} configKey="staffingRates" value={cfg.staffingRates} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title={t("admin.config.overtimeTitle")} desc={t("admin.config.overtimeDesc")} configKey="overtimePolicy" value={cfg.overtimePolicy} onSave={A.updatePlatformConfig}/>
    <StaffingAgencyEditor value={cfg.staffingAgency} onSave={A.updatePlatformConfig}/>
    <JsonConfigEditor title={t("admin.config.alertsTitle")} desc={t("admin.config.alertsDesc")} configKey="adminAlerts" value={cfg.adminAlerts} onSave={A.updatePlatformConfig}/>
  </Page>;
}
