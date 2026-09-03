import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Empty, SmartPortrait, Page, ConfirmDialog, Lbl } from "../../design/primitives.jsx";

export function AccountMenuPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const u=A.user;
  const [confirmHide,setConfirmHide]=useState(false);
  if(!u) return <Page><Empty title="Not signed in" body="Sign in to view your account."/></Page>;
  const seeking=u.actively_seeking!==false;
  /* 15 items in one flat list with no grouping - split into sections so "my activity" (things
     someone checks often) isn't visually identical to "legal & support" (things checked rarely). */
  const sections=[
    {label:"My activity",items:[
      {k:"status",l:"My applications",s:`${A.applications.filter(a=>a.user===u.id).length} sent`,ic:"activity"},
      {k:"saved",l:"Saved jobs",s:`${A.saved.size} saved`,ic:"bookmark"},
      {k:"savedSearches",l:"Saved searches",s:`${(A.savedSearches||[]).length} active`,ic:"search"},
      {k:"alerts",l:"Notifications",s:`${A.notifications.filter(n=>!n.read).length} unread`,ic:"bell"},
      {k:"messages",l:"Messages",s:`${(A.messages||[]).filter(m=>m.to===u.id).length} conversations`,ic:"mail"},
      {k:"interviews",l:"Interviews",s:`${(A.interviews||[]).filter(i=>i.user===u.id).length} scheduled`,ic:"calendar"},
      {k:"trainings",l:"My trainings",s:"Enrolled + completed",ic:"cap"},
    ]},
    {label:"Profile & account",items:[
      {k:"profile",l:"Edit my profile",s:"Contact details, work eligibility, headline",ic:"user"},
      {k:"cvs",l:"My CVs & profiles",s:`Manage up to 5 CVs — you have ${(A.cvs||[]).filter(c=>c.user===u.id).length}`,ic:"file"},
      {k:"settings",l:"Account settings",s:"Password, notifications, privacy",ic:"gear"},
    ]},
    {label:"Legal & support",items:[
      {k:"privacy",l:"Privacy policy",s:"How your data is handled",ic:"lock"},
      {k:"pipeda",l:"PIPEDA compliance",s:"Canadian privacy law",ic:"shield"},
      {k:"accessibility",l:"Accessibility (AODA)",s:"Our accessibility statement",ic:"heart"},
      {k:"terms",l:"Terms of service",s:"Read the full terms",ic:"file"},
      {k:"contact",l:"Contact support",s:"Get help from a real person",ic:"phone"},
    ]},
  ];
  return <Page narrow>
    <div className="flex gap-4 items-center mb-6">
      <SmartPortrait seed={u.seed??0} size={64} radius={16}/>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-text tracking-tight">{u.name}</div>
        <div className="text-sm text-text-2 mt-1">{u.city?`${u.city}, ${u.prov}`:"Add your location"}</div>
      </div>
    </div>

    <Card pad={mob?18:22} style={{marginBottom:16,borderRadius:14,background:seeking?C.okBg:C.bg,border:`1px solid ${seeking?C.okLn:C.line}`}}>
      <div className="flex justify-between items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-bold text-text">Actively seeking work</div>
          <div className="text-xs text-text-2 mt-1">{seeking?"Employers can find your profile when browsing candidates.":"Your profile is hidden from employer searches."}</div>
        </div>
        <button onClick={()=>seeking?setConfirmHide(true):A.updateProfile({actively_seeking:true})} className={`border-0 w-11 h-6 rounded-full cursor-pointer relative transition-colors duration-200 ${seeking?"bg-ok":"bg-text-3"}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-[left] duration-200 ${seeking?"left-6":"left-0.5"}`}/>
        </button>
      </div>
    </Card>
    <ConfirmDialog open={confirmHide} onClose={()=>setConfirmHide(false)} kind="primary" confirmLabel="Hide my profile"
      title="Hide your profile from employers?" onConfirm={()=>A.updateProfile({actively_seeking:false})}>
      Employers browsing candidates won't be able to find you. You can turn this back on any time from this same screen.
    </ConfirmDialog>

    {(()=>{const w=A.workerByPersonId?.(u.id);
      return <Card pad={mob?18:22} style={{marginBottom:16,borderRadius:14,background:C.ink,color:"#fff",cursor:"pointer"}} onClick={()=>A.go("workerDashboard")}>
        <div className="flex gap-3.5 items-center">
          <div className="w-11 h-11 rounded-xl bg-accent/20 border border-accent/35 flex items-center justify-center shrink-0"><I n="users" s={20} c="#6AACFF"/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">{w?"NorthHire Staffing worker":"Try NorthHire Staffing"}</div>
            <div className="text-xs text-white/65 mt-1 leading-normal">
              {w?`Assignments, timesheets, pay stubs. ${w.availability==="on-assignment"?"Currently on assignment.":"Available for work."}`:"Get placed on contract work. We pay you, we cover taxes, WSIB, and vacation."}</div>
          </div>
          <I n="chevR" s={17} c="rgba(255,255,255,.5)"/>
        </div>
      </Card>;
    })()}

    {sections.map(sec=><div key={sec.label} style={{marginBottom:16}}>
      <Lbl style={{marginBottom:8,marginLeft:2}}>{sec.label}</Lbl>
      <Card pad={0} style={{overflow:"hidden",borderRadius:14}}>
        {sec.items.map((it,i)=><button key={it.k} onClick={()=>A.go(it.k)}
          className={`flex items-center gap-3.5 w-full bg-transparent border-0 cursor-pointer text-left transition-colors duration-150 hover:bg-bg ${i>0?"border-t border-line-soft":""} ${mob?"py-3.5 px-4":"py-4 px-5"}`}>
          <div className="w-9 h-9 rounded-xl bg-wash text-brand flex items-center justify-center shrink-0"><I n={it.ic} s={17}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{it.l}</div>
            <div className="text-xs text-text-3 mt-0.5">{it.s}</div>
          </div>
          <I n="chevR" s={17} c={C.text3}/></button>)}
      </Card>
    </div>)}

    <div className="mt-4 text-center">
      <Btn kind="ghost" size="sm" onClick={()=>{A.logout(); A.go("home");}}>Sign out</Btn>
    </div>
  </Page>;
}
