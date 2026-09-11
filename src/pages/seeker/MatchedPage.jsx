import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Ring, Empty, usePagination, Pagination, HERO_TIGHT } from "../../design/primitives.jsx";
import { pay, payUnit } from "../../helpers/utils.js";
import { CATS } from "../../store/seed/constants.js";
import { EmpMark } from "../shared/cards.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

export function MatchedPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  const list=A.jobs.filter(j=>j.status==="live").map(j=>({j,s:A.score(j)})).filter(x=>x.s>=50).sort((a,b)=>b.s-a.s);
  const strong=list.filter(x=>x.s>=75); const good=list.filter(x=>x.s>=50&&x.s<75);
  /* "Add more skills" was generic filler copy naming nothing specific - tally which missing
     skills show up most often across near-miss (50-74) matches, so the CTA can name the exact
     skills that would move the needle instead of a vague suggestion. */
  const missingTally={};
  good.forEach(({j})=>{A.skillsGap(j).missing.forEach(s=>{missingTally[s]=(missingTally[s]||0)+1;});});
  const topMissing=Object.entries(missingTally).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s])=>s);
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  const G=({title,sub,items})=>{
    const pg=usePagination(items,10);
    if(items.length===0)return null;
    return <section className="mb-9">
    <div className="flex justify-between items-end mb-5 gap-3 flex-wrap">
      <div><h2 className="text-2xl font-bold tracking-tight text-text mb-1 leading-tight">{title}</h2>
        <p className="text-sm text-text-2">{sub}</p></div>
      <Tag tone="brand">{items.length} {items.length===1?t("seeker.matched.jobOne"):t("seeker.matched.jobOther")}</Tag></div>
    <div className={`grid gap-4 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {pg.pageItems.map(({j,s})=>{const e=A.emp(j.e);
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
                {A.matchReasons(j).map(r=><Tag key={r} tone="ok" sm icon="check">{r}</Tag>)}</div></div>
            <Ring v={s} size={mob?48:60} label={t("seeker.matched.matchLabel")}/></div></div>;})}</div>
    <Pagination {...pg}/></section>;};

  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end gap-5 flex-wrap">
          <div>
            <Tag tone="brand" icon="target">{t("seeker.matched.matchedTag")}</Tag>
            <h1 className={`${HERO_TIGHT} mt-5 mb-3 ${mob?"text-3xl":"text-5xl"}`}>
              {t("seeker.matched.heroTitle")}</h1>
            <p className={`text-text-2 leading-normal max-w-xl ${mob?"text-base":"text-lg"}`}>
              {t("seeker.matched.heroSub")}</p></div>
          <Btn kind="outline" icon="gear" onClick={()=>A.go("profile")}>{t("seeker.matched.tunePreferences")}</Btn></div>
      </div>
    </section>

    <section className={`bg-bg min-h-100 ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-6xl mx-auto">
        <div className={`bg-white rounded-3xl border border-line mb-8 flex gap-4 items-center flex-wrap ${mob?"p-6":"p-7"}`}>
          <div className="w-13 h-13 rounded-2xl bg-wash text-brand flex items-center justify-center shrink-0"><I n="sparkle" s={24}/></div>
          <div className="flex-[1_1_260px] min-w-0">
            <div className="text-base font-bold text-text tracking-tight mb-1">{t("seeker.matched.strongMatchesCount",{count:strong.length})}</div>
            <div className="text-sm text-text-2 leading-normal">
              {topMissing.length>0
                ? t("seeker.matched.addingWouldTurn",{skills:topMissing.join(", ")})
                : t("seeker.matched.addSkillsWiden",{count:CATS.length})}
            </div></div>
          <Btn kind="primary" onClick={()=>A.go("profile")}>{t("seeker.matched.addSkillsBtn")}</Btn></div>
        <G title={t("seeker.matched.strongMatchesTitle")} sub={t("seeker.matched.strongMatchesSub")} items={strong}/>
        <G title={t("seeker.matched.worthLookTitle")} sub={t("seeker.matched.worthLookSub")} items={good}/>
        {strong.length+good.length===0&&<Empty icon="target" title={t("seeker.matched.noMatchesTitle")}
          body={t("seeker.matched.noMatchesBody")}
          action={<Btn kind="primary" onClick={()=>A.go("profile")}>{t("seeker.matched.updateProfileBtn")}</Btn>}/>}
      </div>
    </section>
  </div>;
}
