import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Empty, SmartPortrait, Page, ConfirmDialog, Lbl } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

export function AccountMenuPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  const u=A.user;
  const [confirmHide,setConfirmHide]=useState(false);
  if(!u) return <Page><Empty title={t("seeker.accountMenu.notSignedIn")} body={t("seeker.accountMenu.signInBody")}/></Page>;
  const seeking=u.actively_seeking!==false;
  /* 15 items in one flat list with no grouping - split into sections so "my activity" (things
     someone checks often) isn't visually identical to "legal & support" (things checked rarely). */
  const sections=[
    {label:t("seeker.accountMenu.activityHead"),items:[
      {k:"status",l:t("seeker.accountMenu.myApplications"),s:t("seeker.accountMenu.sentCount",{count:A.applications.filter(a=>a.user===u.id).length}),ic:"activity"},
      {k:"saved",l:t("seeker.accountMenu.savedJobs"),s:t("seeker.accountMenu.savedCount",{count:A.saved.size}),ic:"bookmark"},
      {k:"savedSearches",l:t("seeker.accountMenu.savedSearches"),s:t("seeker.accountMenu.activeCount",{count:(A.savedSearches||[]).length}),ic:"search"},
      {k:"alerts",l:t("seeker.accountMenu.notifications"),s:t("seeker.accountMenu.unreadCount",{count:A.notifications.filter(n=>!n.read).length}),ic:"bell"},
      {k:"messages",l:t("seeker.accountMenu.messages"),s:t("seeker.accountMenu.conversationsCount",{count:(A.messages||[]).filter(m=>m.to===u.id).length}),ic:"mail"},
      {k:"interviews",l:t("seeker.accountMenu.interviews"),s:t("seeker.accountMenu.scheduledCount",{count:(A.interviews||[]).filter(i=>i.user===u.id).length}),ic:"calendar"},
      {k:"trainings",l:t("seeker.accountMenu.myTrainings"),s:t("seeker.accountMenu.enrolledCompleted"),ic:"cap"},
    ]},
    {label:t("seeker.accountMenu.profileHead"),items:[
      {k:"profile",l:t("seeker.accountMenu.editProfile"),s:t("seeker.accountMenu.editProfileSub"),ic:"user"},
      {k:"cvs",l:t("seeker.accountMenu.myCvs"),s:t("seeker.accountMenu.myCvsSub",{count:(A.cvs||[]).filter(c=>c.user===u.id).length}),ic:"file"},
      {k:"settings",l:t("seeker.accountMenu.accountSettings"),s:t("seeker.accountMenu.accountSettingsSub"),ic:"gear"},
    ]},
    {label:t("seeker.accountMenu.legalHead"),items:[
      {k:"privacy",l:t("seeker.accountMenu.privacyPolicy"),s:t("seeker.accountMenu.privacyPolicySub"),ic:"lock"},
      {k:"pipeda",l:t("seeker.accountMenu.pipeda"),s:t("seeker.accountMenu.pipedaSub"),ic:"shield"},
      {k:"accessibility",l:t("seeker.accountMenu.accessibility"),s:t("seeker.accountMenu.accessibilitySub"),ic:"heart"},
      {k:"terms",l:t("seeker.accountMenu.termsOfService"),s:t("seeker.accountMenu.termsOfServiceSub"),ic:"file"},
      {k:"contact",l:t("seeker.accountMenu.contactSupport"),s:t("seeker.accountMenu.contactSupportSub"),ic:"phone"},
    ]},
  ];
  return <Page narrow>
    <div className="flex gap-4 items-center mb-6">
      <SmartPortrait seed={u.seed??0} size={64} radius={16}/>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-text tracking-tight">{u.name}</div>
        <div className="text-sm text-text-2 mt-1">{u.city?`${u.city}, ${u.prov}`:t("seeker.accountMenu.addLocation")}</div>
      </div>
    </div>

    <Card pad={mob?18:22} style={{marginBottom:16,borderRadius:14,background:seeking?C.okBg:C.bg,border:`1px solid ${seeking?C.okLn:C.line}`}}>
      <div className="flex justify-between items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-bold text-text">{t("seeker.accountMenu.activelySeeking")}</div>
          <div className="text-xs text-text-2 mt-1">{seeking?t("seeker.accountMenu.seekingOnBody"):t("seeker.accountMenu.seekingOffBody")}</div>
        </div>
        <button onClick={()=>seeking?setConfirmHide(true):A.updateProfile({actively_seeking:true})} className={`border-0 w-11 h-6 rounded-full cursor-pointer relative transition-colors duration-200 ${seeking?"bg-ok":"bg-text-3"}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-[left] duration-200 ${seeking?"left-6":"left-0.5"}`}/>
        </button>
      </div>
    </Card>
    <ConfirmDialog open={confirmHide} onClose={()=>setConfirmHide(false)} kind="primary" confirmLabel={t("seeker.accountMenu.hideProfileBtn")}
      title={t("seeker.accountMenu.hideProfileTitle")} onConfirm={()=>A.updateProfile({actively_seeking:false})}>
      {t("seeker.accountMenu.hideProfileBody")}
    </ConfirmDialog>

    {(()=>{const w=A.workerByPersonId?.(u.id);
      return <Card pad={mob?18:22} style={{marginBottom:16,borderRadius:14,background:C.ink,color:"#fff",cursor:"pointer"}} onClick={()=>A.go("workerDashboard")}>
        <div className="flex gap-3.5 items-center">
          <div className="w-11 h-11 rounded-xl bg-accent/20 border border-accent/35 flex items-center justify-center shrink-0"><I n="users" s={20} c="#6AACFF"/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">{w?t("seeker.accountMenu.staffingWorker"):t("seeker.accountMenu.tryStaffing")}</div>
            <div className="text-xs text-white/65 mt-1 leading-normal">
              {w?t("seeker.accountMenu.staffingWorkerBody",{status:w.availability==="on-assignment"?t("seeker.accountMenu.onAssignment"):t("seeker.accountMenu.availableForWork")}):t("seeker.accountMenu.tryStaffingBody")}</div>
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
      <Btn kind="ghost" size="sm" onClick={()=>{A.logout(); A.go("home");}}>{t("seeker.accountMenu.signOut")}</Btn>
    </div>
  </Page>;
}
