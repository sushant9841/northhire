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

  const pad=mob?"32px 16px":"48px 32px";
  /* When rendered inside a dashboard shell (employer/admin), skip the site hero and heavy padding — the shell owns the topbar */
  const inShell=A.user.role==="employer"||A.user.role==="admin";
  return <div style={{background:inShell?C.bg:"#fff",minHeight:"100%"}}>
    {!inShell&&<section style={{padding:mob?"36px 16px 20px":"56px 32px 32px",background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <Tag tone="brand" icon="mail">Messages</Tag>
        <h1 style={{fontSize:mob?32:44,fontWeight:770,letterSpacing:"-.04em",color:C.text,margin:"14px 0 10px",lineHeight:1.1}}>Inbox.</h1>
        <p style={{fontSize:mob?15.5:17,color:C.text2,margin:0}}>Messages between you and {A.user.role==="seeker"?"employers":"candidates"}.</p></div>
    </section>}
    <section style={{padding:inShell?(mob?"20px 16px":"24px 32px"):pad,background:C.bg,minHeight:400}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {inShell&&<div style={{marginBottom:20}}>
          <div style={{fontSize:mob?22:26,fontWeight:730,color:C.text,letterSpacing:"-.025em",margin:"0 0 4px"}}>Messages</div>
          <div style={{fontSize:13.5,color:C.text3}}>{threadList.length} {threadList.length===1?"conversation":"conversations"}{threadList.reduce((s,t)=>s+t.unread,0)>0?` · ${threadList.reduce((s,t)=>s+t.unread,0)} unread`:""}</div>
        </div>}
        {threadList.length===0
          ? <Empty icon="mail" title="No messages yet" body={A.user.role==="seeker"?"When an employer messages you about an application, it lands here.":"When you message a candidate from their profile, the conversation appears here."}/>
          : <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"320px 1fr",gap:16,alignItems:"start"}}>
              <Card pad={0} style={{borderRadius:16,overflow:"hidden"}}>
                {threadList.map((t,i)=>{const p=A.person(t.otherId)||A.people.find(x=>x.id===t.otherId)||{name:"Unknown",seed:0};
                  const active=t.otherId===openThread;
                  return <button key={t.otherId} onClick={()=>setOpenThread(t.otherId)} style={{width:"100%",display:"flex",gap:12,alignItems:"center",
                    padding:"14px 16px",background:active?C.tint:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                    borderBottom:i<threadList.length-1?`1px solid ${C.lineSoft}`:"none",transition:"background .15s"}}>
                    <SmartPortrait seed={p.seed} size={38}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline"}}>
                        <span style={{fontSize:13.5,fontWeight:t.unread?680:620,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                        <span style={{fontSize:11,color:C.text3,flexShrink:0}}>{new Date(t.last.at).toLocaleDateString("en-CA")}</span></div>
                      <div style={{fontSize:12.5,color:C.text2,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.4}}>{t.last.text}</div></div>
                    {t.unread>0&&<span style={{background:C.brand,color:"#fff",fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:99,flexShrink:0}}>{t.unread}</span>}
                  </button>;})}</Card>
              {openThread&&other&&<Card style={{borderRadius:16,display:"flex",flexDirection:"column",minHeight:400}}>
                <div style={{display:"flex",gap:12,alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.lineSoft}`}}>
                  <SmartPortrait seed={other.seed} size={40}/>
                  <div><div style={{fontSize:15,fontWeight:660,color:C.text}}>{other.name}</div>
                    <div style={{fontSize:12.5,color:C.text2,marginTop:2}}>{other.title||"Team member"}</div></div></div>
                <div style={{flex:1,padding:18,display:"flex",flexDirection:"column",gap:10,overflowY:"auto",maxHeight:420}}>
                  {thread.map(m=>{const mine=m.from===A.user.id;
                    return <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
                      <div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:12,fontSize:14,lineHeight:1.5,
                        background:mine?C.brand:C.bg,color:mine?"#fff":C.text,border:mine?"none":`1px solid ${C.line}`}}>
                        {m.text}
                        <div style={{fontSize:11,opacity:.7,marginTop:5}}>{new Date(m.at).toLocaleString("en-CA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div></div></div>;})}</div>
                <div style={{padding:14,borderTop:`1px solid ${C.lineSoft}`,display:"flex",gap:8}}>
                  <Input value={reply[openThread]||""} onChange={e=>setReply(r=>({...r,[openThread]:e.target.value}))}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Type a reply…"/>
                  <Btn kind="primary" icon="send" disabled={!(reply[openThread]||"").trim()} onClick={send}/></div></Card>}
            </div>}
      </div>
    </section>
  </div>;
}
