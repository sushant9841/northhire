import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Empty, H2, Page } from "../../design/primitives.jsx";

export function InterviewsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  if(!A.user) return <Page><Empty icon="calendar" title="Sign in" body="Interview schedule lives on your account."/></Page>;
  const list=A.interviews.filter(iv=>iv.candidate===A.user.id||iv.employer===A.company?.id).sort((a,b)=>b.createdAt-a.createdAt);
  const upcoming=list.filter(iv=>iv.status==="scheduled");
  const past=list.filter(iv=>iv.status!=="scheduled");
  const pad=mob?"44px 16px":"72px 32px";
  const IvCard=({iv})=>{const j=A.job(iv.job); const e=A.emp(iv.employer); const cand=A.person(iv.candidate)||{name:"Candidate",seed:0};
    const forSeeker=A.user.role==="seeker";
    return <Card style={{padding:mob?22:26,borderRadius:16,marginBottom:12}}>
      <div style={{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div style={{width:52,height:52,borderRadius:14,background:iv.status==="cancelled"?C.bg:C.wash,color:iv.status==="cancelled"?C.text3:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="calendar" s={24}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:680,color:C.text,letterSpacing:"-.02em"}}>
            {j?.t||"Interview"} — {forSeeker?e?.name:cand.name}</div>
          <div style={{fontSize:13.5,color:C.text2,marginTop:5}}>
            <strong>{iv.when}</strong> • {iv.mode==="video"?"Video call":"On-site interview"}</div>
          {iv.notes&&<div style={{fontSize:13,color:C.text2,marginTop:8,padding:"10px 12px",background:C.bg,borderRadius:8,lineHeight:1.6}}>{iv.notes}</div>}</div>
        {iv.status==="cancelled"?<Tag tone="danger" sm>Cancelled</Tag>
          :<div style={{display:"flex",gap:8,flexDirection:"column"}}>
            <Tag tone="warn" sm>Scheduled</Tag>
            {A.user.role==="employer"&&<Btn kind="ghost" size="xs" icon="x" onClick={()=>A.cancelInterview(iv.id)}>Cancel</Btn>}</div>}
      </div></Card>;};
  const inShell=A.user.role==="employer"||A.user.role==="admin";
  return <div style={{background:inShell?C.bg:"#fff",minHeight:"100%"}}>
    {!inShell&&<section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <Tag tone="brand" icon="calendar">Interviews</Tag>
        <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 12px",lineHeight:1.08}}>Your schedule.</h1>
        <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,margin:0}}>{upcoming.length} upcoming, {past.length} past.</p></div>
    </section>}
    <section style={{padding:inShell?(mob?"20px 16px":"24px 32px"):(mob?"32px 16px 56px":"48px 32px 96px"),background:C.bg,minHeight:400}}>
      <div style={{maxWidth:880,margin:"0 auto"}}>
        {inShell&&<div style={{marginBottom:20}}>
          <div style={{fontSize:mob?22:26,fontWeight:730,color:C.text,letterSpacing:"-.025em",margin:"0 0 4px"}}>Interviews</div>
          <div style={{fontSize:13.5,color:C.text3}}>{upcoming.length} upcoming, {past.length} past.</div>
        </div>}
        {list.length===0?<Empty icon="calendar" title="No interviews scheduled" body={A.user.role==="employer"?"Schedule one from a candidate's profile.":"When an employer schedules an interview, it appears here."}/>:<>
          {upcoming.length>0&&<><H2>Upcoming</H2>{upcoming.map(iv=><IvCard key={iv.id} iv={iv}/>)}</>}
          {past.length>0&&<><H2 style={{marginTop:24}}>Past</H2>{past.map(iv=><IvCard key={iv.id} iv={iv}/>)}</>}
        </>}
      </div>
    </section>
  </div>;
}
