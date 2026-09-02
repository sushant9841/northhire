import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Ring, Empty } from "../../design/primitives.jsx";
import { pay, payUnit } from "../../helpers/utils.js";
import { CATS } from "../../store/seed/constants.js";
import { EmpMark } from "../shared/cards.jsx";

export function MatchedPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const list=A.jobs.filter(j=>j.status==="live").map(j=>({j,s:A.score(j)})).filter(x=>x.s>=50).sort((a,b)=>b.s-a.s);
  const strong=list.filter(x=>x.s>=75); const good=list.filter(x=>x.s>=50&&x.s<75);
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  const G=({title,sub,items})=>items.length===0?null:<section className="mb-9">
    <div className="flex justify-between items-end mb-5 gap-3 flex-wrap">
      <div><h2 className="text-2xl font-bold tracking-tight text-text mb-1 leading-tight">{title}</h2>
        <p className="text-sm text-text-2">{sub}</p></div>
      <Tag tone="brand">{items.length} {items.length===1?"job":"jobs"}</Tag></div>
    <div className={`grid gap-4 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {items.map(({j,s})=>{const e=A.emp(j.e);
        return <div key={j.id} onClick={()=>A.openJob(j.id)} className={`bg-white rounded-3xl border border-line cursor-pointer transition duration-200 hover:border-line-2 hover:-translate-y-1 ${mob?"p-5":"p-7"}`}>
          <div className="flex gap-4 items-start">
            <EmpMark e={e} size={52}/>
            <div className="flex-1 min-w-0">
              <div className={`font-bold text-text tracking-tight leading-tight ${mob?"text-base":"text-lg"}`}>{j.t}</div>
              <div className="text-sm text-text-2 mt-1.5">{e.name} • {j.city}, {j.prov}</div>
              <div className="flex items-baseline gap-1.5 mt-3">
                <span className={`font-bold text-brand tracking-tight ${mob?"text-lg":"text-xl"}`}>{pay(j)}</span>
                <span className="text-sm text-text-2">{payUnit(j)}</span></div>
              <div className="flex flex-wrap gap-2 mt-3.5">
                {A.matchReasons(j).slice(0,3).map(r=><Tag key={r} tone="ok" sm icon="check">{r}</Tag>)}</div></div>
            <Ring v={s} size={mob?48:60} label="Match"/></div></div>;})}</div></section>;

  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end gap-5 flex-wrap">
          <div>
            <Tag tone="brand" icon="target">Matched for you</Tag>
            <h1 className={`font-extrabold tracking-tighter text-text mt-5 mb-3 leading-none ${mob?"text-3xl":"text-5xl"}`}>
              Scored against your profile.</h1>
            <p className={`text-text-2 leading-normal max-w-xl ${mob?"text-base":"text-lg"}`}>
              Ranked by skills, tickets, location and pay expectation.</p></div>
          <Btn kind="outline" icon="gear" onClick={()=>A.go("profile")}>Tune preferences</Btn></div>
      </div>
    </section>

    <section className={`bg-bg min-h-100 ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-6xl mx-auto">
        <div className={`bg-white rounded-3xl border border-line mb-8 flex gap-4 items-center flex-wrap ${mob?"p-6":"p-7"}`}>
          <div className="w-13 h-13 rounded-2xl bg-wash text-brand flex items-center justify-center shrink-0"><I n="sparkle" s={24}/></div>
          <div className="flex-[1_1_260px] min-w-0">
            <div className="text-base font-bold text-text tracking-tight mb-1">{strong.length} strong matches this week</div>
            <div className="text-sm text-text-2 leading-normal">Add more skills and tickets to widen matches across all {CATS.length} sectors.</div></div>
          <Btn kind="primary" onClick={()=>A.go("profile")}>Add skills</Btn></div>
        <G title="Strong matches" sub="You meet most of what these employers asked for" items={strong}/>
        <G title="Worth a look" sub="Close on skills, or a small stretch on experience" items={good}/>
        {strong.length+good.length===0&&<Empty icon="target" title="No matches yet"
          body="Add a few skills to your profile and matches appear immediately."
          action={<Btn kind="primary" onClick={()=>A.go("profile")}>Update profile</Btn>}/>}
      </div>
    </section>
  </div>;
}
