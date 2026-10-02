import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Empty, H2, Page, HERO_TIGHT, Banner } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

/* Roadmap B2-05: template-driven interview prep. The ask was LLM-generated — this ships the
   deterministic version that covers 70% of the value without LLM infra: five common questions
   per role category, plus the seeker's skill-match breakdown against the specific job (what to
   emphasize, what gaps to be ready to address). Can be swapped later for a prompt-against-JD
   generator without changing the UI surface. */
const PREP_QUESTIONS_BY_CAT = {
  trades: ["prepQTradesSafety","prepQTradesTicket","prepQTradesExperience","prepQTradesTools","prepQTradesTeam"],
  healthcare: ["prepQCareScope","prepQCareDifficult","prepQCareShift","prepQCareDocumentation","prepQCareLearning"],
  tech: ["prepQTechStack","prepQTechProject","prepQTechDebug","prepQTechLearning","prepQTechCollab"],
  office: ["prepQOfficeOrganize","prepQOfficeTools","prepQOfficeConflict","prepQOfficeImprovement","prepQOfficeTime"],
  default: ["prepQGenRole","prepQGenStrength","prepQGenGrowth","prepQGenCulture","prepQGenQuestions"],
};
function prepCategoryKey(cat) {
  const c = (cat||"").toLowerCase();
  if (c.includes("trade")||c.includes("construction")) return "trades";
  if (c.includes("care")||c.includes("health")) return "healthcare";
  if (c.includes("tech")||c.includes("software")||c.includes("it ")) return "tech";
  if (c.includes("office")||c.includes("admin")||c.includes("finance")) return "office";
  return "default";
}

function PrepPackPanel({A, iv, job, t}) {
  const [open,setOpen] = useState(false);
  const user = A.user;
  const userSkills = (user?.skills||[]).map(s=>s.toLowerCase());
  const jobSkills = (job?.skills||[]).map(s=>s);
  const haveSkills = jobSkills.filter(s=>userSkills.includes(s.toLowerCase()));
  const gapSkills = jobSkills.filter(s=>!userSkills.includes(s.toLowerCase()));
  const catKey = prepCategoryKey(job?.cat);
  const questions = PREP_QUESTIONS_BY_CAT[catKey] || PREP_QUESTIONS_BY_CAT.default;
  const salary = job ? A.salaryInsight(job.t, job.prov) : null;
  return <div className="mt-3 border border-brand-line rounded-xl overflow-hidden">
    <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center gap-2.5 py-2.5 px-3.5 bg-wash text-left cursor-pointer border-0 hover:bg-brand-wash">
      <I n="sparkle" s={16} c={C.brand}/>
      <span className="flex-1 text-sm font-bold text-brand">{t("interviews.prepPackTitle")}</span>
      <I n={open?"chevU":"chevD"} s={14} c={C.brand}/>
    </button>
    {open && <div className="p-4 bg-white flex flex-col gap-4">
      <div>
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide mb-2">{t("interviews.prepLikelyQuestions")}</div>
        <ol className="list-decimal pl-5 flex flex-col gap-1.5 text-sm text-text-2 m-0">
          {questions.map(k=><li key={k}>{t("interviews."+k)}</li>)}
        </ol>
      </div>
      {haveSkills.length>0 && <div>
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide mb-2">{t("interviews.prepEmphasize")}</div>
        <div className="flex flex-wrap gap-1.5">{haveSkills.map(s=><span key={s} className="text-xs font-semibold bg-ok-bg text-ok border border-ok-ln rounded-full py-0.5 px-2.5">{s}</span>)}</div>
      </div>}
      {gapSkills.length>0 && <div>
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide mb-2">{t("interviews.prepBeReady")}</div>
        <div className="flex flex-wrap gap-1.5 mb-1.5">{gapSkills.map(s=><span key={s} className="text-xs font-semibold bg-warn-bg text-warn border border-warn-ln rounded-full py-0.5 px-2.5">{s}</span>)}</div>
        <div className="text-xs text-text-3">{t("interviews.prepGapHint")}</div>
      </div>}
      {salary && <div className="bg-bg rounded-lg p-3">
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide mb-1">{t("interviews.prepSalaryBand")}</div>
        <div className="text-sm text-text-2">{t("interviews.prepSalaryLine",{p25:Math.round(salary.p25/1000),median:Math.round(salary.median/1000),p75:Math.round(salary.p75/1000)})}</div>
      </div>}
    </div>}
  </div>;
}

export function InterviewsPage(){
  const A=use(); const { t } = useTranslation(); const mob=useMedia("(max-width: 900px)");
  if(!A.user) return <Page><Empty icon="calendar" title={t("interviews.signInTitle")} body={t("interviews.signInBody")}/></Page>;
  const list=A.interviews.filter(iv=>iv.candidate===A.user.id||iv.employer===A.company?.id).sort((a,b)=>b.createdAt-a.createdAt);
  const upcoming=list.filter(iv=>iv.status==="scheduled");
  const past=list.filter(iv=>iv.status!=="scheduled");
  const heroPad=mob?"pt-11 px-4":"pt-18 px-8";
  const IvCard=({iv})=>{const j=A.job(iv.job); const e=A.emp(iv.employer); const cand=A.person(iv.candidate)||{name:"Candidate",seed:0};
    const forSeeker=A.user.role==="seeker";
    const awaiting=iv.awaitingCandidate||(iv.proposedSlots?.length>0&&!iv.when);
    return <Card style={{padding:mob?22:26,borderRadius:16,marginBottom:12}}>
      <div className="flex gap-3.5 items-start flex-wrap">
        <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${iv.status==="cancelled"?"bg-bg text-text-3":awaiting?"bg-warn-bg text-warn":"bg-wash text-brand"}`}><I n="calendar" s={24}/></div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-text tracking-tight">
            {j?.t||t("interviews.interviewDefault")} — {forSeeker?e?.name:cand.name}</div>
          {!awaiting&&<div className="text-sm text-text-2 mt-1.5">
            <strong>{iv.when}</strong> • {iv.mode==="video"?t("interviews.videoCall"):t("interviews.onSiteInterview")}</div>}
          {/* B2-09: the slot picker only renders for seekers on an interview whose employer
              proposed multiple times and no pick has happened yet. Clicking a slot calls
              /accept and promotes it into when_text server-side. Employers see a read-only
              hint listing the slots they offered. */}
          {awaiting&&forSeeker&&<div className="mt-2">
            <div className="text-sm font-semibold text-warn mb-2">{t("interviews.pickASlotTitle")}</div>
            <div className="text-xs text-text-3 mb-2.5">{t("interviews.pickASlotBody",{mode:iv.mode==="video"?t("interviews.videoCall"):t("interviews.onSiteInterview")})}</div>
            <div className="flex flex-col gap-2">{iv.proposedSlots.map(s=>
              <button key={s} onClick={()=>A.acceptInterviewSlot(iv.id,s)}
                className="text-left py-2.5 px-3.5 bg-white border-2 border-line rounded-xl cursor-pointer text-sm font-semibold text-text hover:border-brand hover:bg-wash">
                {s}</button>)}
            </div>
          </div>}
          {awaiting&&!forSeeker&&<div className="mt-2 py-2.5 px-3 bg-warn-bg rounded-lg">
            <div className="text-xs font-bold text-warn uppercase tracking-wide mb-1">{t("interviews.awaitingPickTitle")}</div>
            <div className="text-sm text-text-2">{iv.proposedSlots.join(" · ")}</div>
          </div>}
          {iv.notes&&<div className="text-sm text-text-2 mt-2 py-2.5 px-3 bg-bg rounded-lg leading-relaxed">{iv.notes}</div>}
          {/* B2-05: prep pack appears for seekers on upcoming interviews with a confirmed time. */}
          {forSeeker&&iv.status==="scheduled"&&!awaiting&&j&&<PrepPackPanel A={A} iv={iv} job={j} t={t}/>}
        </div>
        {iv.status==="cancelled"?<Tag tone="danger" sm>{t("interviews.cancelled")}</Tag>
          :<div className="flex gap-2 flex-col">
            <Tag tone={awaiting?"warn":"warn"} sm>{awaiting?t("interviews.awaitingTag"):t("interviews.scheduled")}</Tag>
            {A.user.role==="employer"&&<Btn kind="ghost" size="xs" icon="x" onClick={()=>A.cancelInterview(iv.id)}>{t("interviews.cancelBtn")}</Btn>}</div>}
      </div></Card>;};
  const inShell=A.user.role==="employer"||A.user.role==="admin";
  return <div className={`${inShell?"bg-bg":"bg-white"} min-h-full`}>
    {!inShell&&<section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <Tag tone="brand" icon="calendar">{t("interviews.pageTag")}</Tag>
        <h1 className={`${HERO_TIGHT} mt-5 mb-3 ${mob?"text-3xl":"text-5xl"}`}>{t("interviews.pageTitle")}</h1>
        <p className={`text-text-2 leading-normal ${mob?"text-base":"text-lg"}`}>{t("interviews.upcomingPastSub",{upcoming:upcoming.length,past:past.length})}</p></div>
    </section>}
    <section className={`bg-bg min-h-100 ${inShell?(mob?"py-5 px-4":"py-6 px-8"):(mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24")}`}>
      <div className="max-w-4xl mx-auto">
        {inShell&&<div className="mb-5">
          <div className="text-2xl font-bold text-text tracking-tight mb-1">{t("interviews.pageTag")}</div>
          <div className="text-sm text-text-3">{t("interviews.upcomingPastSub",{upcoming:upcoming.length,past:past.length})}</div>
        </div>}
        {/* E6 contextual gate: a Free employer can still land here via a direct/deep link (the
           sidebar itself already blocks navigation with a lock icon) - this banner is the
           "opened the page anyway" contextual moment the plan calls for, not a page-load popup
           blocking the rest of the (empty) page. */}
        {A.user.role==="employer"&&A.company&&!A.can("interviews")&&<Banner tone="neutral" icon="calendar" style={{marginBottom:16}}
          title={t("interviews.lockedBannerTitle")}
          action={<Btn kind="primary" size="sm" onClick={()=>A.requestUpgrade("interviews",t("interviews.lockedBannerTitle"),"calendar")}>{t("interviews.lockedBannerCta")}</Btn>}>
          {t("interviews.lockedBannerBody")}</Banner>}
        {list.length===0?<Empty icon="calendar" title={t("interviews.noInterviews")} body={A.user.role==="employer"?t("interviews.noInterviewsEmployer"):t("interviews.noInterviewsSeeker")}/>:<>
          {upcoming.length>0&&<><H2>{t("interviews.upcomingHead")}</H2>{upcoming.map(iv=><IvCard key={iv.id} iv={iv}/>)}</>}
          {past.length>0&&<><H2 style={{marginTop:24}}>{t("interviews.pastHead")}</H2>{past.map(iv=><IvCard key={iv.id} iv={iv}/>)}</>}
        </>}
      </div>
    </section>
  </div>;
}
