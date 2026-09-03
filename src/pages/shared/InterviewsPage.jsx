import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Empty, H2, Page, HERO_TIGHT } from "../../design/primitives.jsx";

export function InterviewsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  if(!A.user) return <Page><Empty icon="calendar" title="Sign in" body="Interview schedule lives on your account."/></Page>;
  const list=A.interviews.filter(iv=>iv.candidate===A.user.id||iv.employer===A.company?.id).sort((a,b)=>b.createdAt-a.createdAt);
  const upcoming=list.filter(iv=>iv.status==="scheduled");
  const past=list.filter(iv=>iv.status!=="scheduled");
  const heroPad=mob?"pt-11 px-4":"pt-18 px-8";
  const IvCard=({iv})=>{const j=A.job(iv.job); const e=A.emp(iv.employer); const cand=A.person(iv.candidate)||{name:"Candidate",seed:0};
    const forSeeker=A.user.role==="seeker";
    return <Card style={{padding:mob?22:26,borderRadius:16,marginBottom:12}}>
      <div className="flex gap-3.5 items-start flex-wrap">
        <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${iv.status==="cancelled"?"bg-bg text-text-3":"bg-wash text-brand"}`}><I n="calendar" s={24}/></div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-text tracking-tight">
            {j?.t||"Interview"} — {forSeeker?e?.name:cand.name}</div>
          <div className="text-sm text-text-2 mt-1.5">
            <strong>{iv.when}</strong> • {iv.mode==="video"?"Video call":"On-site interview"}</div>
          {iv.notes&&<div className="text-sm text-text-2 mt-2 py-2.5 px-3 bg-bg rounded-lg leading-relaxed">{iv.notes}</div>}</div>
        {iv.status==="cancelled"?<Tag tone="danger" sm>Cancelled</Tag>
          :<div className="flex gap-2 flex-col">
            <Tag tone="warn" sm>Scheduled</Tag>
            {A.user.role==="employer"&&<Btn kind="ghost" size="xs" icon="x" onClick={()=>A.cancelInterview(iv.id)}>Cancel</Btn>}</div>}
      </div></Card>;};
  const inShell=A.user.role==="employer"||A.user.role==="admin";
  return <div className={`${inShell?"bg-bg":"bg-white"} min-h-full`}>
    {!inShell&&<section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <Tag tone="brand" icon="calendar">Interviews</Tag>
        <h1 className={`${HERO_TIGHT} mt-5 mb-3 ${mob?"text-3xl":"text-5xl"}`}>Your schedule.</h1>
        <p className={`text-text-2 leading-normal ${mob?"text-base":"text-lg"}`}>{upcoming.length} upcoming, {past.length} past.</p></div>
    </section>}
    <section className={`bg-bg min-h-100 ${inShell?(mob?"py-5 px-4":"py-6 px-8"):(mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24")}`}>
      <div className="max-w-4xl mx-auto">
        {inShell&&<div className="mb-5">
          <div className="text-2xl font-bold text-text tracking-tight mb-1">Interviews</div>
          <div className="text-sm text-text-3">{upcoming.length} upcoming, {past.length} past.</div>
        </div>}
        {list.length===0?<Empty icon="calendar" title="No interviews scheduled" body={A.user.role==="employer"?"Schedule one from a candidate's profile.":"When an employer schedules an interview, it appears here."}/>:<>
          {upcoming.length>0&&<><H2>Upcoming</H2>{upcoming.map(iv=><IvCard key={iv.id} iv={iv}/>)}</>}
          {past.length>0&&<><H2 style={{marginTop:24}}>Past</H2>{past.map(iv=><IvCard key={iv.id} iv={iv}/>)}</>}
        </>}
      </div>
    </section>
  </div>;
}
