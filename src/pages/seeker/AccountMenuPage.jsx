import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Empty, SmartPortrait, Page } from "../../design/primitives.jsx";

export function AccountMenuPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const u=A.user;
  if(!u) return <Page><Empty title="Not signed in" body="Sign in to view your account."/></Page>;
  const seeking=u.actively_seeking!==false;
  const items=[
    {k:"profile",l:"Edit my profile",s:"Contact details, work eligibility, headline",ic:"user"},
    {k:"cvs",l:"My CVs & profiles",s:`Manage up to 5 CVs — you have ${(A.cvs||[]).filter(c=>c.user===u.id).length}`,ic:"file"},
    {k:"status",l:"My applications",s:`${A.applications.filter(a=>a.user===u.id).length} sent`,ic:"activity"},
    {k:"saved",l:"Saved jobs",s:`${A.saved.size} saved`,ic:"bookmark"},
    {k:"alerts",l:"Notifications",s:`${A.notifications.filter(n=>!n.read).length} unread`,ic:"bell"},
    {k:"savedSearches",l:"Saved searches",s:`${(A.savedSearches||[]).length} active`,ic:"search"},
    {k:"messages",l:"Messages",s:`${(A.messages||[]).filter(m=>m.to===u.id).length} conversations`,ic:"mail"},
    {k:"interviews",l:"Interviews",s:`${(A.interviews||[]).filter(i=>i.user===u.id).length} scheduled`,ic:"calendar"},
    {k:"trainings",l:"My trainings",s:"Enrolled + completed",ic:"cap"},
    {k:"settings",l:"Account settings",s:"Password, notifications, privacy",ic:"gear"},
    {k:"privacy",l:"Privacy policy",s:"How your data is handled",ic:"lock"},
    {k:"pipeda",l:"PIPEDA compliance",s:"Canadian privacy law",ic:"shield"},
    {k:"accessibility",l:"Accessibility (AODA)",s:"Our accessibility statement",ic:"heart"},
    {k:"terms",l:"Terms of service",s:"Read the full terms",ic:"file"},
    {k:"contact",l:"Contact support",s:"Get help from a real person",ic:"phone"},
  ];
  return <Page narrow>
    <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:24}}>
      <SmartPortrait seed={u.seed??0} size={64} radius={16}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:mob?22:26,fontWeight:730,color:C.text,letterSpacing:"-.025em"}}>{u.name}</div>
        <div style={{fontSize:14,color:C.text2,marginTop:4}}>{u.city?`${u.city}, ${u.prov}`:"Add your location"}</div>
      </div>
    </div>

    <Card pad={mob?18:22} style={{marginBottom:16,borderRadius:14,background:seeking?C.okBg:C.bg,border:`1px solid ${seeking?C.okLn:C.line}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:660,color:C.text}}>Actively seeking work</div>
          <div style={{fontSize:12.5,color:C.text2,marginTop:3}}>{seeking?"Employers can find your profile when browsing candidates.":"Your profile is hidden from employer searches."}</div>
        </div>
        <button onClick={()=>A.updateProfile({actively_seeking:!seeking})} style={{background:seeking?C.ok:C.text3,border:"none",width:44,height:24,borderRadius:99,cursor:"pointer",position:"relative",transition:"background .2s"}}>
          <span style={{position:"absolute",top:2,left:seeking?22:2,width:20,height:20,background:"#fff",borderRadius:99,transition:"left .2s"}}/>
        </button>
      </div>
    </Card>

    {(()=>{const w=A.workerByPersonId?.(u.id);
      return <Card pad={mob?18:22} style={{marginBottom:16,borderRadius:14,background:C.ink,color:"#fff",cursor:"pointer"}} onClick={()=>A.go("workerDashboard")}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{width:44,height:44,borderRadius:11,background:"rgba(106,172,255,.2)",border:"1px solid rgba(106,172,255,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="users" s={20} c="#6AACFF"/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14.5,fontWeight:660,color:"#fff"}}>{w?"NorthHire Staffing worker":"Try NorthHire Staffing"}</div>
            <div style={{fontSize:12.5,color:"rgba(255,255,255,.65)",marginTop:3,lineHeight:1.5}}>
              {w?`Assignments, timesheets, pay stubs. ${w.availability==="on-assignment"?"Currently on assignment.":"Available for work."}`:"Get placed on contract work. We pay you, we cover taxes, WSIB, and vacation."}</div>
          </div>
          <I n="chevR" s={17} c="rgba(255,255,255,.5)"/>
        </div>
      </Card>;
    })()}

    <Card pad={0} style={{overflow:"hidden",borderRadius:14}}>
      {items.map((it,i)=><button key={it.k} onClick={()=>A.go(it.k)} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:mob?"14px 16px":"16px 20px",background:"transparent",border:"none",borderTop:i>0?`1px solid ${C.lineSoft}`:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"background .16s"}}
        onMouseEnter={e=>e.currentTarget.style.background=C.bg}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <div style={{width:36,height:36,borderRadius:10,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={it.ic} s={17}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14.5,fontWeight:600,color:C.text}}>{it.l}</div>
          <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{it.s}</div>
        </div>
        <I n="chevR" s={17} c={C.text3}/></button>)}
    </Card>

    <div style={{marginTop:16,textAlign:"center"}}>
      <Btn kind="ghost" size="sm" onClick={()=>{A.logout(); A.go("home");}}>Sign out</Btn>
    </div>
  </Page>;
}
