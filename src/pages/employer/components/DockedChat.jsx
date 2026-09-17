import { useState, useEffect, useRef, useMemo } from "react";
import { use } from "../../../store/context.js";
import { useMedia } from "../../../helpers/hooks.js";
import { I } from "../../../design/icons.jsx";
import { SmartPortrait, Area, Input } from "../../../design/primitives.jsx";
import { useTranslation } from "../../../i18n/i18n.jsx";
import { formatDate, formatDateTime } from "../../../i18n/format.js";
import { defaultMessageTemplates } from "../../../helpers/messageTemplates.js";

const COLLAPSE_KEY = "northhire.empChatCollapsed";
// Per-thread draft persistence (E4 polish): an in-progress message survives a refresh or the
// employer switching threads and coming back. This is exactly the class of per-viewer UI
// convenience feedback_server_authoritative carves out for sessionStorage (an unsent draft) -
// the message itself is still only real once actually sent through A.sendMessage.
const DRAFTS_KEY = "northhire.empChatDrafts";
const _loadDrafts = () => { try { return JSON.parse(sessionStorage.getItem(DRAFTS_KEY) || "{}"); } catch { return {}; } };

/* Docked employer chat drawer — "for the message the flow doesn't seem good, there is a lot of
   back and forth, add a chat box on right hand for easy communication on emp suite" (verbatim
   user report). Mounted once in DashShell for role==="employer" so it persists across every
   employer route rather than living on its own page; a candidate conversation now opens inline
   without navigating away from the pipeline, job, or wherever the employer already is.

   Reuses the same `messages` domain and A.sendMessage/A.markMessageRead as MessagesPage - this
   is a second surface onto the same data, not a parallel inbox. */
export function DockedChat(){
  const A=use(); const { t, locale } = useTranslation();
  const mob=useMedia("(max-width: 900px)");
  // Starts collapsed (the rail) for anyone who hasn't set a preference yet - a brand-new
  // employer landing on their dashboard for the first time shouldn't be greeted by a 360px
  // panel already covering part of the screen. Only an explicit "0" in storage (they opened
  // and left it open) starts it expanded.
  const [collapsed,setCollapsed]=useState(()=>{
    try{ return localStorage.getItem(COLLAPSE_KEY)!=="0"; }catch{ return true; }
  });
  const [openThread,setOpenThread]=useState(null);
  const [draft,setDraft]=useState(_loadDrafts);
  const [q,setQ]=useState("");
  const [showTemplates,setShowTemplates]=useState(false);
  const lastCandidateRef=useRef(null);
  const scrollRef=useRef(null);

  const user=A.user;
  const myMessages=useMemo(()=>user?A.messages.filter(m=>m.from===user.id||m.to===user.id):[],[A.messages,user]);
  const threads=useMemo(()=>{
    const map={};
    myMessages.forEach(m=>{
      const other=m.from===user.id?m.to:m.from;
      if(!map[other])map[other]=[];
      map[other].push(m);
    });
    return Object.entries(map).map(([otherId,msgs])=>{
      const sorted=msgs.slice().sort((a,b)=>a.at-b.at);
      const last=sorted[sorted.length-1];
      const unread=msgs.filter(m=>m.to===user.id&&!m.read).length;
      // Role the candidate applied for at this company, if we can find it - shown under their
      // name so "who is this and why are they messaging me" never requires leaving the drawer.
      const app=A.applications.find(a=>a.user===otherId&&A.jobs.some(j=>j.id===a.job&&j.e===A.company?.id));
      const role=app?A.job(app.job)?.t:null;
      return {otherId,msgs:sorted,last,unread,role};
    }).sort((a,b)=>b.last.at-a.last.at);
  },[myMessages,user,A.applications,A.jobs,A.company]);
  const filteredThreads=useMemo(()=>{
    if(!q.trim())return threads;
    const s=q.toLowerCase();
    return threads.filter(th=>{
      const p=A.person(th.otherId);
      return (p?.name||"").toLowerCase().includes(s)||(th.role||"").toLowerCase().includes(s);
    });
  },[threads,q,A]);
  const totalUnread=useMemo(()=>threads.reduce((s,th)=>s+th.unread,0),[threads]);

  // Auto-focus the candidate's thread when the employer opens their profile from the pipeline -
  // the explicit spec: "When on EmpCandidate for candidate X, the drawer auto-focuses X's thread."
  // Also expands the drawer, since navigating to one candidate's profile is a deliberate enough
  // context switch to warrant it - but only on that transition, so it never fights a manual
  // collapse the rest of the time.
  useEffect(()=>{
    if(A.pg!=="empCandidate"||!A.candidateId)return;
    if(lastCandidateRef.current===A.candidateId)return;
    // A.candidateId is the APPLICATION id (see openCandidate() in useStore.js), not the
    // candidate's user id - resolve it to the actual person before using it as a thread key,
    // otherwise this would try to open a "conversation" keyed by an application id that never
    // matches any message's from/to.
    const app=A.applications.find(a=>a.id===A.candidateId);
    if(!app)return;
    lastCandidateRef.current=A.candidateId;
    setOpenThread(app.user);
    setCollapsed(false);
  },[A.pg,A.candidateId,A.applications]);

  // Report focus state up to the store so the "new message" toast (useStore.js SSE handler)
  // can suppress itself when this exact thread is already open and visible.
  useEffect(()=>{
    A.setChatDock({open:!collapsed,thread:!collapsed?openThread:null});
  },[collapsed,openThread]);

  useEffect(()=>{
    try{ localStorage.setItem(COLLAPSE_KEY, collapsed?"1":"0"); }catch{/* private mode etc - non-fatal */}
  },[collapsed]);

  // Persist drafts (debounced) - drop empty ones so this doesn't grow forever with cleared threads.
  useEffect(()=>{
    const id=setTimeout(()=>{
      try{
        const nonEmpty=Object.fromEntries(Object.entries(draft).filter(([,v])=>(v||"").trim()));
        sessionStorage.setItem(DRAFTS_KEY,JSON.stringify(nonEmpty));
      }catch{/* private mode etc - non-fatal */}
    },400);
    return ()=>clearTimeout(id);
  },[draft]);

  // Mark the active thread's incoming messages read as soon as it's actually visible.
  useEffect(()=>{
    if(collapsed||!openThread)return;
    const th=threads.find(t=>t.otherId===openThread);
    th?.msgs.forEach(m=>{ if(m.to===user.id&&!m.read)A.markMessageRead(m.id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[collapsed,openThread,threads.length]);

  useEffect(()=>{
    if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
  },[openThread,threads]);
  useEffect(()=>{ setShowTemplates(false); },[openThread]);

  // "/" opens the drawer (unless a text field has focus), Esc closes it.
  useEffect(()=>{
    const isTyping=el=>el&&(el.tagName==="INPUT"||el.tagName==="TEXTAREA"||el.isContentEditable);
    const onKey=e=>{
      if(e.key==="/"&&!isTyping(document.activeElement)){ e.preventDefault(); setCollapsed(false); }
      else if(e.key==="Escape"&&!collapsed){ setCollapsed(true); }
    };
    document.addEventListener("keydown",onKey);
    return ()=>document.removeEventListener("keydown",onKey);
  },[collapsed]);

  if(mob||!user||user.role!=="employer")return null;

  const active=threads.find(th=>th.otherId===openThread)||filteredThreads[0]||null;
  const activePerson=active?A.person(active.otherId):null;

  const send=()=>{
    if(!active)return;
    const text=(draft[active.otherId]||"").trim();
    if(!text)return;
    A.sendMessage(active.otherId,active.msgs[active.msgs.length-1]?.job||null,text);
    setDraft(d=>({...d,[active.otherId]:""}));
  };

  if(collapsed){
    return <button onClick={()=>setCollapsed(false)} aria-label={t("dockedChat.expandAria")}
      className="fixed top-1/2 -translate-y-1/2 right-0 z-40 w-11 bg-ink text-white border-0 rounded-l-2xl cursor-pointer flex flex-col items-center gap-2 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <I n="mail" s={19}/>
      {totalUnread>0&&<span className="bg-brand text-white text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{totalUnread>99?"99+":totalUnread}</span>}
      <span className="text-xs font-semibold" style={{writingMode:"vertical-rl",textOrientation:"mixed"}}>{t("dockedChat.title")}</span>
    </button>;
  }

  {/* top is offset below DashShell's topbar (sticky, z-20) rather than the viewport edge, and
      the drawer's own z-index sits below it - otherwise an open drawer overlaps the top-right
      notification bell and account menu and silently eats their clicks. */}
  return <div className="fixed right-0 bottom-0 bg-white border-l border-line shadow-[-8px_0_24px_rgba(15,23,42,0.08)] flex flex-col" style={{width:360,top:64,zIndex:15}}>
    <div className="flex items-center justify-between gap-2 py-3.5 px-4 border-b border-line-soft shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <I n="mail" s={17}/>
        <span className="text-sm font-bold text-text">{t("dockedChat.title")}</span>
        {totalUnread>0&&<span className="bg-brand text-white text-xs font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">{totalUnread}</span>}
      </div>
      <button onClick={()=>setCollapsed(true)} aria-label={t("dockedChat.collapseAria")} className="bg-transparent border-0 cursor-pointer p-1 text-text-3 flex hover:text-text">
        <I n="chevD" s={17} style={{transform:"rotate(-90deg)"}}/>
      </button>
    </div>

    {!active&&threads.length===0
      ? <div className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <div className="text-sm font-semibold text-text mb-1">{t("dockedChat.emptyTitle")}</div>
            <div className="text-xs text-text-3 leading-relaxed">{t("dockedChat.emptyBody")}</div>
          </div>
        </div>
      : <div className="flex-1 flex min-h-0">
          {/* Thread list */}
          <div className={`flex flex-col border-r border-line-soft ${active?"w-32 shrink-0":"flex-1"}`}>
            {!active&&<div className="p-2.5 border-b border-line-soft">
              <Input icon="search" placeholder={t("dockedChat.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)} style={{fontSize:13,height:34}}/>
            </div>}
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.map(th=>{
                const p=A.person(th.otherId);
                const isActive=th.otherId===openThread||(!openThread&&th===filteredThreads[0]);
                return <button key={th.otherId} onClick={()=>setOpenThread(th.otherId)}
                  className={`w-full flex gap-2.5 items-center text-left border-0 cursor-pointer py-2.5 px-3 border-b border-line-soft ${isActive?"bg-tint":"bg-transparent hover:bg-bg"}`}>
                  <SmartPortrait seed={p?.seed} size={active?30:36}/>
                  {!active&&<div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 items-baseline">
                      <span className={`text-sm text-text overflow-hidden text-ellipsis whitespace-nowrap ${th.unread?"font-bold":"font-semibold"}`}>{p?.name}</span>
                      <span className="text-xs text-text-3 shrink-0">{formatDate(th.last.at,locale)}</span>
                    </div>
                    {th.role&&<div className="text-xs text-brand mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{th.role}</div>}
                    <div className="text-xs text-text-2 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{th.last.from===user.id?`${t("dockedChat.youPrefix")} `:""}{th.last.text}</div>
                  </div>}
                  {th.unread>0&&<span className="bg-brand text-white text-xs font-bold min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center shrink-0">{th.unread}</span>}
                </button>;
              })}
            </div>
            {active&&<button onClick={()=>setOpenThread(null)} className="py-2.5 border-0 border-t border-line-soft bg-bg cursor-pointer text-xs font-semibold text-text-2 hover:text-text">
              {t("dockedChat.allThreadsBtn")}
            </button>}
          </div>

          {/* Active conversation */}
          {active&&<div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2.5 py-3 px-3.5 border-b border-line-soft">
              <SmartPortrait seed={activePerson?.seed} size={32}/>
              <div className="min-w-0">
                <div className="text-sm font-bold text-text overflow-hidden text-ellipsis whitespace-nowrap">{activePerson?.name}</div>
                {active.role&&<div className="text-xs text-text-3 overflow-hidden text-ellipsis whitespace-nowrap">{active.role}</div>}
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2">
              {active.msgs.map(m=>{
                const mine=m.from===user.id;
                return <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
                  <div className={`max-w-[85%] py-2 px-3 rounded-xl text-sm leading-normal ${mine?"bg-brand text-white":"bg-bg text-text border border-line"}`}>
                    {m.text}
                    <div className="text-xs opacity-70 mt-1">{formatDateTime(m.at,locale,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>;
              })}
            </div>
            <div className="p-2.5 border-t border-line-soft flex flex-col gap-1.5">
              {/* E4 polish: canned messages for common scenarios (shortlist ping / interview
                 invite / offer follow-up / rejection), reusing the same A.messageTemplates the
                 EmpCandidate message modal already writes to - one template library either
                 surface can draw from. */}
              {(()=>{const allTemplates=[...defaultMessageTemplates(t),...A.messageTemplates]; return allTemplates.length>0&&<div className="relative">
                <button type="button" onClick={()=>setShowTemplates(s=>!s)}
                  className="bg-transparent border-0 p-0 cursor-pointer text-xs font-semibold text-brand flex items-center gap-1">
                  <I n="file" s={12}/>{t("employer.candidate.templatesLabel")}
                </button>
                {showTemplates&&<div className="absolute bottom-full left-0 mb-1.5 bg-white border border-line rounded-xl shadow-lg p-1.5 z-20" style={{minWidth:220,maxHeight:200,overflowY:"auto"}}>
                  {allTemplates.map(tm=><button key={tm.id} onClick={()=>{
                    const firstName=(activePerson?.name||"").split(" ")[0]||"";
                    const text=tm.body.replace(/\{\{name\}\}/gi,firstName).replace(/\{\{job\}\}/gi,active.role||"").replace(/\{\{company\}\}/gi,A.company?.name||"");
                    setDraft(d=>({...d,[active.otherId]:text})); setShowTemplates(false);
                  }} className="block w-full text-left py-2 px-2.5 bg-transparent border-0 cursor-pointer text-xs text-text rounded-lg hover:bg-bg">{tm.name}</button>)}
                </div>}
              </div>;})()}
              <div className="flex gap-2 items-end">
                <Area rows={1} value={draft[active.otherId]||""} placeholder={t("dockedChat.typePlaceholder")}
                  onChange={e=>setDraft(d=>({...d,[active.otherId]:e.target.value}))}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }}
                  style={{minHeight:38,maxHeight:90,fontSize:13.5,padding:"9px 12px"}}/>
                <button onClick={send} disabled={!(draft[active.otherId]||"").trim()} aria-label={t("common.send")}
                  className={`shrink-0 w-9 h-9 rounded-lg border-0 flex items-center justify-center ${(draft[active.otherId]||"").trim()?"bg-brand text-white cursor-pointer":"bg-line text-text-3 cursor-not-allowed"}`}>
                  <I n="send" s={15}/>
                </button>
              </div>
            </div>
          </div>}
        </div>}
  </div>;
}
