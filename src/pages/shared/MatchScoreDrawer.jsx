import { use } from "../../store/context.js";
import { BottomSheet, Btn, Bar, Ring, Tag } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

/* Job Seeker Transformation Tranche 2 (JS-03) — the match-score explanation drawer. Tapping a
   job's match Ring opens this instead of leaving the score as a bare, unexplained number: skills
   matched/missing, experience, location and education fit, plus a plain-language summary line.
   Built on scoreBreakdown()/skillsGap() — both already existed in useStore with the exact
   per-factor shape this needs, so no scoring logic changes here, only its presentation. */
export function MatchScoreDrawer({job,open,onClose}){
  const A=use(); const {t}=useTranslation();
  if(!job)return null;
  const u=A.user;
  const factors=A.scoreBreakdown(u,job);
  const gap=A.skillsGap(job);
  const score=A.score(job);

  /* A natural-language summary line beats a bare percentage — name the strongest concrete reason
     rather than repeat the number the Ring already shows. */
  const summary=(()=>{
    const bits=[];
    if(gap.have?.length)bits.push(t("shared.matchDrawer.summaryYourSkill",{skill:gap.have[0]}));
    if(typeof u?.years==="number"&&u.years>0)bits.push(t("shared.matchDrawer.summaryYears",{years:u.years}));
    if(!bits.length)return t("shared.matchDrawer.summaryGeneric");
    return score>=75?t("shared.matchDrawer.summaryStrong",{reasons:bits.join(t("shared.matchDrawer.summaryJoin"))})
      :t("shared.matchDrawer.summaryModerate",{reasons:bits.join(t("shared.matchDrawer.summaryJoin"))});
  })();

  return <BottomSheet open={open} onClose={onClose} title={t("shared.matchDrawer.title")} width={440}>
    <div className="flex items-center gap-4 mb-5">
      <Ring v={score} size={64}/>
      <div className="text-sm text-text-2 leading-relaxed">{summary}</div>
    </div>
    <div className="flex flex-col gap-4 mb-5">
      {factors.map(f=><div key={f.label}>
        <div className="flex justify-between items-baseline gap-3 mb-1.5">
          <span className="text-sm font-semibold text-text">{f.label}</span>
          <span className="text-xs text-text-3">{t("shared.matchDrawer.weightPct",{pct:f.weight})}</span></div>
        <Bar v={f.pct}/>
        <div className="text-xs text-text-2 mt-1.5">{f.detail}</div></div>)}
    </div>
    {(gap.have?.length>0||gap.missing?.length>0)&&<div className="pt-4 border-t border-line-soft">
      {gap.have?.length>0&&<div className="mb-3">
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide mb-2">{t("shared.matchDrawer.skillsMatched")}</div>
        <div className="flex flex-wrap gap-1.5">{gap.have.map(s=><Tag key={s} tone="ok" sm icon="check">{s}</Tag>)}</div></div>}
      {gap.missing?.length>0&&<div>
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide mb-2">{t("shared.matchDrawer.skillsMissing")}</div>
        <div className="flex flex-wrap gap-1.5">{gap.missing.map(s=><Tag key={s} sm icon="plus">{s}</Tag>)}</div>
        <Btn kind="outline" size="sm" style={{marginTop:12}} onClick={()=>{onClose();A.go("profile");}}>{t("shared.jobDetail.updateSkills")}</Btn></div>}
    </div>}
  </BottomSheet>;
}
