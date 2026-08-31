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
          style={{display:"flex",gap:14,padding:"16px 18px",cursor:n.link?"pointer":"default",
            borderBottom:i<list.length-1?`1px solid ${C.lineSoft}`:"none",background:n.read?"#fff":C.tint,transition:"background .2s"}}>
          <div style={{width:40,height:40,borderRadius:11,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
            background:n.read?C.bg:C.wash,color:n.read?C.text3:C.brand}}><I n={n.icon||"bell"} s={18}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{flex:1,fontSize:14.5,fontWeight:650,color:C.text}}>{n.title}</div>
              {!n.read&&<div style={{width:8,height:8,borderRadius:99,background:C.brand,flexShrink:0,marginTop:5}}/>}</div>
            <div style={{fontSize:13.5,color:C.text2,marginTop:4,lineHeight:1.55}}>{n.body}</div>
            <div style={{fontSize:12,color:C.text3,marginTop:7}}>{n.at}</div></div></div>)}</Card>}
  </Page>;
}
