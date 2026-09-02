import { use } from "../../store/context.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Empty, H1, Page } from "../../design/primitives.jsx";

export function AlertsPage(){
  const A=use();
  const list=A.myNotifications;
  const unread=list.filter(n=>!n.read).length;
  return <Page narrow>
    <H1 sub={unread?`${unread} unread`:"You are all caught up"}
      action={unread>0?<Btn kind="outline" size="sm" onClick={A.markAllRead}>Mark all read</Btn>:null}>Notifications</H1>
    {list.length===0?<Empty icon="bell" title="Nothing yet"
      body="Updates about your applications, matches and trainings appear here."/>
      :<Card pad={0} style={{overflow:"hidden"}}>
        {list.map((n,i)=><div key={n.id} onClick={()=>A.readNotif(n.id,n.link)}
          className={`flex gap-3.5 py-4 px-5 transition-colors duration-200 ${n.link?"cursor-pointer":"cursor-default"} ${i<list.length-1?"border-b border-line-soft":""} ${n.read?"bg-white":"bg-tint"}`}>
          <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${n.read?"bg-bg text-text-3":"bg-wash text-brand"}`}><I n={n.icon||"bell"} s={18}/></div>
          <div className="flex-1 min-w-0">
            <div className="flex gap-2.5 items-start">
              <div className="flex-1 text-sm font-bold text-text">{n.title}</div>
              {!n.read&&<div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5"/>}</div>
            <div className="text-sm text-text-2 mt-1 leading-normal">{n.body}</div>
            <div className="text-xs text-text-3 mt-2">{n.at}</div></div></div>)}</Card>}
  </Page>;
}
