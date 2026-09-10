import { useState, useMemo } from "react";
import { use } from "../../store/context.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Empty, H1, Page, Tag } from "../../design/primitives.jsx";

const PAGE_SIZE=20;

/* Groups a list of notifications by icon-kind so N stage-change or application updates from the
   same source collapse into one clickable row instead of scrolling as a wall of near-duplicates.
   The heuristic is conservative on purpose: same icon + same title prefix (first 32 chars) forms
   a cluster only when they land back-to-back in the reverse-chronological list and the newest
   group member is younger than the window. That keeps distinct events distinct: unrelated
   notifications with the same icon (a very old and a very new "Application update") don't fold
   together, and clicking the group's newest link still opens the most recent one. */
function groupAlerts(list, windowMs = 6 * 60 * 60 * 1000) {
  const groups = [];
  const now = Date.now();
  for (const n of list) {
    const prefix = String(n.title || "").slice(0, 32);
    const at = n.atMs || now; // atMs is the numeric timestamp; falls through when older writes only carried a display string
    const last = groups[groups.length - 1];
    if (last && last.icon === (n.icon || "bell") && last.prefix === prefix && Math.abs(last.newestAt - at) <= windowMs) {
      last.members.push(n);
      last.unread = last.unread || !n.read;
      // newestAt tracks the earliest-in-time (list is reverse-chronological, so later members are older)
    } else {
      groups.push({ icon: n.icon || "bell", prefix, newestAt: at, unread: !n.read, members: [n] });
    }
  }
  return groups;
}

export function AlertsPage(){
  const A=use();
  const [unreadOnly,setUnreadOnly]=useState(false);
  const [typeFilter,setTypeFilter]=useState("all"); // "all" | icon-kind
  const [shown,setShown]=useState(PAGE_SIZE);
  const [expanded,setExpanded]=useState({}); // group index -> boolean
  const all=A.myNotifications;
  const unread=all.filter(n=>!n.read).length;
  // Type filter surfaces the icons actually used, not a static enum - so a new notification kind
  // added later automatically shows up as a filter option without needing to touch this list.
  const kinds=useMemo(()=>{
    const map=new Map(); for(const n of all){const k=n.icon||"bell"; map.set(k,(map.get(k)||0)+1);} return [...map.entries()];
  },[all]);
  const filtered=all
    .filter(n=>unreadOnly?!n.read:true)
    .filter(n=>typeFilter==="all"||(n.icon||"bell")===typeFilter);
  const groups=useMemo(()=>groupAlerts(filtered),[filtered]);
  const visibleGroups=groups.slice(0,shown);
  const totalHidden=filtered.length-visibleGroups.reduce((s,g)=>s+g.members.length,0);

  const openGroup=(idx,g)=>{
    if(g.members.length===1){A.readNotif(g.members[0].id,g.members[0].link); return;}
    setExpanded(e=>({...e,[idx]:!e[idx]}));
  };

  return <Page narrow>
    <H1 sub={unread?`${unread} unread`:"You are all caught up"}
      action={unread>0?<Btn kind="outline" size="sm" onClick={A.markAllRead}>Mark all read</Btn>:null}>Notifications</H1>
    {all.length>0&&<div className="flex gap-2 flex-wrap mb-4">
      <button onClick={()=>{setUnreadOnly(v=>!v);setShown(PAGE_SIZE);}}
        className={`text-sm font-semibold py-2.5 px-4 rounded-xl border cursor-pointer transition-colors duration-150 ${unreadOnly?"bg-brand text-white border-brand":"bg-white text-text-2 border-line"}`}>
        Unread only</button>
      {/* Type filter chips - only render when there is more than one kind, otherwise they add
          noise without carrying information. */}
      {kinds.length>1&&<>
        <button onClick={()=>{setTypeFilter("all");setShown(PAGE_SIZE);}}
          className={`text-sm font-semibold py-2.5 px-4 rounded-xl border cursor-pointer transition-colors duration-150 ${typeFilter==="all"?"bg-brand text-white border-brand":"bg-white text-text-2 border-line"}`}>All types</button>
        {kinds.map(([k,n])=><button key={k} onClick={()=>{setTypeFilter(k);setShown(PAGE_SIZE);}}
          className={`text-sm font-semibold py-2.5 px-4 rounded-xl border cursor-pointer transition-colors duration-150 flex items-center gap-1.5 ${typeFilter===k?"bg-brand text-white border-brand":"bg-white text-text-2 border-line"}`}>
          <I n={k} s={13}/>{k} <span className="text-xs opacity-70">·{n}</span></button>)}
      </>}
    </div>}
    {all.length===0?<Empty icon="bell" title="Nothing yet"
      body="Updates about your applications, matches and trainings appear here."/>
      :filtered.length===0?<Empty icon="bell" title="No notifications match" body="Change or clear the filters above to see everything."/>
      :<>
      <Card pad={0} style={{overflow:"hidden"}}>
        {visibleGroups.map((g,i)=>{
          const first=g.members[0];
          const collapsed=g.members.length>1 && !expanded[i];
          return <div key={i} className={`${i<visibleGroups.length-1?"border-b border-line-soft":""}`}>
            <div onClick={()=>openGroup(i,g)}
              className={`flex gap-3.5 py-4 px-5 transition-colors duration-200 cursor-pointer ${g.unread?"bg-tint":"bg-white"}`}>
              <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${g.unread?"bg-wash text-brand":"bg-bg text-text-3"}`}><I n={g.icon} s={18}/></div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2.5 items-start">
                  <div className="flex-1 text-sm font-bold text-text">{first.title}
                    {g.members.length>1&&<Tag tone="neutral" sm style={{marginLeft:8}}>+{g.members.length-1} more</Tag>}
                  </div>
                  {g.unread&&<div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5"/>}</div>
                <div className="text-sm text-text-2 mt-1 leading-normal">{first.body}</div>
                <div className="text-xs text-text-3 mt-2">{first.at}{g.members.length>1?` — click to ${collapsed?"expand":"collapse"} ${g.members.length-1} more like this`:""}</div>
              </div>
            </div>
            {!collapsed&&g.members.slice(1).map(n=><div key={n.id} onClick={e=>{e.stopPropagation();A.readNotif(n.id,n.link);}}
              className={`flex gap-3.5 py-3 pl-14 pr-5 transition-colors duration-200 ${n.link?"cursor-pointer":"cursor-default"} border-t border-line-soft ${n.read?"bg-white":"bg-tint"}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text">{n.title}</div>
                <div className="text-sm text-text-2 mt-1 leading-normal">{n.body}</div>
                <div className="text-xs text-text-3 mt-1.5">{n.at}</div>
              </div>
              {!n.read&&<div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-2"/>}
            </div>)}
          </div>;})}
      </Card>
      {groups.length>shown&&<Btn kind="outline" full style={{marginTop:14}} onClick={()=>setShown(s=>s+PAGE_SIZE)}>
        Show more ({groups.length-shown} more groups, {totalHidden} items)</Btn>}
      </>}
  </Page>;
}
