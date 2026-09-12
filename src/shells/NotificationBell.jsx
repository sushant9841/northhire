import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { I } from "../design/icons.jsx";
import { useTranslation } from "../i18n/i18n.jsx";

/* Real notification center, shared by Header (seeker/guest) and DashShell (employer/admin) -
   previously both just navigated to the /notifications page on click, with no preview and no
   "mark all read" without a full page load. Content is A.myNotifications, which is now backed by
   persisted, live-pushed rows (see server/lib/notify.js) rather than the old client-only
   notify() calls that never reached the other party. */
export function NotificationBell(){
  const A=use(); const {t}=useTranslation();
  const [open,setOpen]=useState(false);
  const list=A.myNotifications||[];
  const unread=list.filter(n=>!n.read).length;
  useEffect(()=>{
    if(!open)return;
    const onKey=e=>{if(e.key==="Escape")setOpen(false);};
    document.addEventListener("keydown",onKey);
    return ()=>document.removeEventListener("keydown",onKey);
  },[open]);
  const recent=list.slice(0,12);
  return <div className="relative">
    <button onClick={()=>setOpen(v=>!v)} aria-label={t("nav.notificationsAria")} aria-haspopup="menu" aria-expanded={open}
      className="relative bg-bg border-0 w-9 h-9 rounded-lg cursor-pointer flex items-center justify-center text-text">
      <I n="bell" s={17}/>
      {unread>0&&<span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-1 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center border-2 border-white">{unread>9?"9+":unread}</span>}
    </button>
    {open&&<>
      <div onClick={()=>setOpen(false)} className="fixed inset-0 z-490"/>
      <div className="absolute top-11 right-0 w-84 max-w-[92vw] bg-white border border-line rounded-2xl shadow-md z-500 overflow-hidden" style={{animation:"pop .16s ease"}}>
        <div className="flex items-center justify-between py-3 px-4 border-b border-line-soft">
          <span className="text-sm font-bold text-text">{t("alerts.title")}</span>
          {unread>0&&<button onClick={()=>A.markAllRead()} className="text-xs font-semibold text-brand bg-transparent border-0 cursor-pointer">{t("alerts.markAllRead")}</button>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recent.length===0
            ? <div className="py-8 px-4 text-center">
                <div className="text-sm font-semibold text-text mb-1">{t("alerts.nothingYetTitle")}</div>
                <div className="text-xs text-text-3">{t("alerts.nothingYetBody")}</div>
              </div>
            : recent.map(n=>
              <button key={n.id} onClick={()=>{setOpen(false); A.readNotif(n.id,n.link);}}
                className={`w-full flex gap-3 items-start text-left py-3 px-4 border-0 cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-bg ${n.read?"bg-transparent":"bg-tint"}`}>
                <div className="w-8 h-8 rounded-full bg-white border border-line-2 flex items-center justify-center shrink-0 text-brand"><I n={n.icon||"bell"} s={15}/></div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm text-text leading-snug ${n.read?"font-medium":"font-bold"}`}>{n.title}</div>
                  {n.body&&<div className="text-xs text-text-3 mt-0.5 leading-snug overflow-hidden text-ellipsis" style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{n.body}</div>}
                  <div className="text-xs text-text-3 mt-1">{n.at}</div>
                </div>
                {!n.read&&<span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5"/>}
              </button>)}
        </div>
        <button onClick={()=>{setOpen(false); A.go("alerts");}} className="w-full text-center py-2.5 border-0 border-t border-line-soft bg-bg cursor-pointer text-xs font-semibold text-text-2 hover:text-text">
          {t("alerts.title")}
        </button>
      </div>
    </>}
  </div>;
}
