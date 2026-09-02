import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Card, Tag, Input, Empty, SmartPortrait, Page } from "../../design/primitives.jsx";

export function MessagesPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [reply,setReply]=useState({}); // keyed by other party's id
  if(!A.user) return <Page><Empty icon="mail" title="Sign in to see messages" body="Your inbox lives on your account."/></Page>;
  const myMessages=A.messages.filter(m=>m.from===A.user.id||m.to===A.user.id);
  const threads={};
  myMessages.forEach(m=>{const other=m.from===A.user.id?m.to:m.from;
    if(!threads[other])threads[other]=[]; threads[other].push(m);});
  const threadList=Object.entries(threads).map(([otherId,msgs])=>{
    const sorted=msgs.slice().sort((a,b)=>b.at-a.at);
    return {otherId,msgs:sorted.reverse(),last:sorted[0],unread:msgs.filter(m=>m.to===A.user.id&&!m.read).length};
  }).sort((a,b)=>b.last.at-a.last.at);
  const [openThread,setOpenThread]=useState(threadList[0]?.otherId||null);
  const other=A.person(openThread)||A.people.find(p=>p.id===openThread);
  const thread=threads[openThread]?.slice().sort((a,b)=>a.at-b.at)||[];
  const send=()=>{const t=(reply[openThread]||"").trim(); if(!t)return;
    A.sendMessage(openThread,thread[0]?.job||null,t); setReply(r=>({...r,[openThread]:""}));};
  const markRead=id=>{if(!id)return; threads[id]?.forEach(m=>{if(m.to===A.user.id&&!m.read)A.markMessageRead(m.id);});};
  useEffect(()=>{markRead(openThread);/* eslint-disable-next-line*/},[openThread]);

  /* When rendered inside a dashboard shell (employer/admin), skip the site hero and heavy padding — the shell owns the topbar */
  const inShell=A.user.role==="employer"||A.user.role==="admin";
  return <div className={`${inShell?"bg-bg":"bg-white"} min-h-full`}>
    {!inShell&&<section className={`bg-white border-b border-line-soft ${mob?"pt-9 px-4 pb-5":"pt-14 px-8 pb-8"}`}>
      <div className="max-w-6xl mx-auto">
        <Tag tone="brand" icon="mail">Messages</Tag>
        <h1 className={`font-extrabold tracking-tighter text-text mt-3.5 mb-2.5 leading-none ${mob?"text-3xl":"text-5xl"}`}>Inbox.</h1>
        <p className={`text-text-2 ${mob?"text-base":"text-lg"}`}>Messages between you and {A.user.role==="seeker"?"employers":"candidates"}.</p></div>
    </section>}
    <section className={`bg-bg min-h-100 ${inShell?(mob?"py-5 px-4":"py-6 px-8"):(mob?"py-8 px-4":"py-12 px-8")}`}>
      <div className="max-w-6xl mx-auto">
        {inShell&&<div className="mb-5">
          <div className="text-2xl font-bold text-text tracking-tight mb-1">Messages</div>
          <div className="text-sm text-text-3">{threadList.length} {threadList.length===1?"conversation":"conversations"}{threadList.reduce((s,t)=>s+t.unread,0)>0?` · ${threadList.reduce((s,t)=>s+t.unread,0)} unread`:""}</div>
        </div>}
        {threadList.length===0
          ? <Empty icon="mail" title="No messages yet" body={A.user.role==="seeker"?"When an employer messages you about an application, it lands here.":"When you message a candidate from their profile, the conversation appears here."}/>
          : <div className={`grid gap-4 items-start ${mob?"grid-cols-1":"grid-cols-[320px_1fr]"}`}>
              <Card pad={0} style={{borderRadius:16,overflow:"hidden"}}>
                {threadList.map((t,i)=>{const p=A.person(t.otherId)||A.people.find(x=>x.id===t.otherId)||{name:"Unknown",seed:0};
                  const active=t.otherId===openThread;
                  return <button key={t.otherId} onClick={()=>setOpenThread(t.otherId)}
                    className={`w-full flex gap-3 items-center py-3.5 px-4 border-0 cursor-pointer text-left transition-colors duration-150 ${active?"bg-tint":"bg-transparent"} ${i<threadList.length-1?"border-b border-line-soft":""}`}>
                    <SmartPortrait seed={p.seed} size={38}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 items-baseline">
                        <span className={`text-sm text-text overflow-hidden text-ellipsis whitespace-nowrap ${t.unread?"font-bold":"font-semibold"}`}>{p.name}</span>
                        <span className="text-xs text-text-3 shrink-0">{new Date(t.last.at).toLocaleDateString("en-CA")}</span></div>
                      <div className="text-xs text-text-2 mt-1 overflow-hidden text-ellipsis whitespace-nowrap leading-snug">{t.last.text}</div></div>
                    {t.unread>0&&<span className="bg-brand text-white text-xs font-bold py-0.5 px-2 rounded-full shrink-0">{t.unread}</span>}
                  </button>;})}</Card>
              {openThread&&other&&<Card style={{borderRadius:16,display:"flex",flexDirection:"column",minHeight:400}}>
                <div className="flex gap-3 items-center py-3.5 px-5 border-b border-line-soft">
                  <SmartPortrait seed={other.seed} size={40}/>
                  <div><div className="text-base font-bold text-text">{other.name}</div>
                    <div className="text-xs text-text-2 mt-0.5">{other.title||"Team member"}</div></div></div>
                <div className="flex-1 p-5 flex flex-col gap-2.5 overflow-y-auto max-h-105">
                  {thread.map(m=>{const mine=m.from===A.user.id;
                    return <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
                      <div className={`max-w-3/4 py-2.5 px-3.5 rounded-xl text-sm leading-normal ${mine?"bg-brand text-white border-0":"bg-bg text-text border border-line"}`}>
                        {m.text}
                        <div className="text-xs opacity-70 mt-1.5">{new Date(m.at).toLocaleString("en-CA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div></div></div>;})}</div>
                <div className="p-3.5 border-t border-line-soft flex gap-2">
                  <Input value={reply[openThread]||""} onChange={e=>setReply(r=>({...r,[openThread]:e.target.value}))}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Type a reply…"/>
                  <Btn kind="primary" icon="send" disabled={!(reply[openThread]||"").trim()} onClick={send}/></div></Card>}
            </div>}
      </div>
    </section>
  </div>;
}
