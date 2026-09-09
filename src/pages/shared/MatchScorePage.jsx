import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { I } from "../../design/icons.jsx";
import { Page, H1, H2, Card, Btn, Banner, Bar, Lbl } from "../../design/primitives.jsx";

/* A plain-language account of what the match score actually computes. Two reasons this page
   exists rather than being a tooltip:

   - Ontario's Bill 149 makes a posting disclose that AI is used to screen applicants, and a
     disclosure that can't be explained is worth very little to the person reading it.
   - The Ontario Human Rights Commission's guidance is explicit that an employer stays liable for
     a discriminatory hiring outcome even when a vendor built the scoring algorithm. Publishing
     exactly which inputs the score uses - and which it refuses to look at - is what lets an
     employer using NorthHire actually answer that question about their own process.

   The weights below are the real ones from scoreBreakdown() in useStore. If that formula
   changes, this page has to change with it. */

const WEIGHTS = [
  { label: "Skills match", weight: 54,
    what: "How many of the posting's required skills are on the candidate's profile, as a proportion of the skills the employer listed.",
    note: "A posting that lists no required skills scores every candidate at the midpoint here rather than penalising anyone." },
  { label: "Experience", weight: 16,
    what: "Years of experience on the profile, scaled up to a cap of 8 years.",
    note: "Capped deliberately: beyond 8 years more experience stops raising the score, so a 25-year veteran and a 9-year one rank the same on this component." },
  { label: "Category fit", weight: 16,
    what: "Whether the candidate's stated sector matches the posting's sector.",
    note: "A different sector scores lower but never zero — people do change trades." },
  { label: "Location fit", weight: 14,
    what: "Same province as the posting, or the role is remote.",
    note: "A remote posting scores nearly the same as a local candidate. A different province on an on-site role scores lowest." },
];

const NEVER_USED = [
  "Age or date of birth",
  "Sex, gender, or gender identity",
  "Race, ethnicity, ancestry, or place of origin",
  "Citizenship or immigration status",
  "Family or marital status",
  "Disability",
  "Religion or creed",
  "Sexual orientation",
  "Name, photo, or anything inferred from them",
  "Whether the experience was gained in Canada or elsewhere",
];

export function MatchScorePage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  return <Page narrow>
    <H1 sub="Exactly what the number means, and what it refuses to look at">How the match score works</H1>

    <Banner tone="brand" icon="sparkle" style={{marginBottom:18}}>
      Every application is scored out of 100 against the posting it was submitted to. The score
      orders an employer's pipeline — it never rejects anyone on its own, and an employer can open
      and advance any applicant at any score.
    </Banner>

    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>What goes into the score</Lbl>
      <div className="flex flex-col gap-5 mt-3">
        {WEIGHTS.map(w=>
          <div key={w.label}>
            <div className="flex justify-between items-baseline gap-3 mb-1.5">
              <span className="text-sm font-semibold text-text">{w.label}</span>
              <span className="text-sm font-bold text-brand tabular-nums">{w.weight}%</span>
            </div>
            <Bar v={w.weight}/>
            <div className="text-sm text-text-2 mt-2 leading-relaxed">{w.what}</div>
            <div className="text-xs text-text-3 mt-1 leading-relaxed">{w.note}</div>
          </div>)}
      </div>
    </Card>

    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>What the score never looks at</Lbl>
      <p className="text-sm text-text-2 mt-2 mb-3.5 leading-relaxed">
        None of the following is an input to the score, and none of it is available to the scoring
        code. These are protected grounds under the Canadian Human Rights Act and the provincial
        human rights codes.
      </p>
      <div className={`grid gap-2 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        {NEVER_USED.map(x=>
          <div key={x} className="flex gap-2.5 items-center bg-bg border border-line rounded-xl py-2.5 px-3">
            <span className="text-text-3 flex shrink-0"><I n="close" s={14} w={2.5}/></span>
            <span className="text-sm text-text-2">{x}</span>
          </div>)}
      </div>
    </Card>

    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>If you're an employer</Lbl>
      <div className="text-sm text-text-2 mt-2.5 leading-relaxed flex flex-col gap-2.5">
        <p className="m-0">
          You remain responsible for your own hiring decisions and for their outcomes, including
          where a tool contributed to them. That responsibility isn't transferred to NorthHire by
          using this score — the Ontario Human Rights Commission's guidance on AI in hiring is
          explicit on the point.
        </p>
        <p className="m-0">
          Practically: treat the score as a sort order, not a filter. Read applications below your
          usual threshold periodically, and keep your own record of why each candidate advanced or
          didn't. If your posting is covered by Ontario's Bill 149, the posting itself already
          carries the required disclosure that AI is used in screening.
        </p>
      </div>
    </Card>

    <Card pad={mob?18:24}>
      <Lbl>If you're a job seeker</Lbl>
      <div className="text-sm text-text-2 mt-2.5 leading-relaxed flex flex-col gap-2.5">
        <p className="m-0">
          The single biggest lever is the skills list on your profile — it's over half the score.
          Adding a skill you genuinely have, that a posting lists as required, moves your score
          more than anything else on this page.
        </p>
        <p className="m-0">
          A low score doesn't remove you from an employer's pipeline. Every application is visible
          to the employer regardless of score.
        </p>
      </div>
      <div className="flex gap-2.5 mt-4 flex-wrap">
        {A.user?.role==="seeker"&&<Btn kind="primary" onClick={()=>A.go("profile")}>Update my skills</Btn>}
        <Btn kind="outline" onClick={()=>A.go("search")}>Browse jobs</Btn>
      </div>
    </Card>
  </Page>;
}
