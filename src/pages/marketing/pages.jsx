/* ═══════════════ HOME ═══════════════ */

import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Page, Btn, Tag, Card, Input, Tabs, Empty, Bar, Lbl, Field, Area, SmartScene, SmartPortrait, ConfirmDialog,
  usePagination, Pagination, HERO_WIDE, HERO_WRAP, HERO_QUIET, SECTION_CLS,
} from "../../design/primitives.jsx";
import { money, pay, payShort, matchesQuery } from "../../helpers/utils.js";
import { sanitizeHtml } from "../../helpers/sanitize.js";
import { CATS } from "../../store/seed/constants.js";
import { SEED_BLOGS } from "../../store/seed/blogs.js";
import { useTranslation } from "../../i18n/i18n.jsx";
import { JobCard, TrainingCard, BlogCard, EmpMark } from "../shared/cards.jsx";

export function HomePage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [q,setQ]=useState(""); const [where,setWhere]=useState("");
  const live=A.jobs.filter(j=>j.status==="live");
  const featured=live.filter(j=>j.featured).slice(0,6);
  const trending=[...live].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,6);
  const closingSoon=[...live].filter(j=>j.dl&&j.dl<=14).sort((a,b)=>(a.dl||99)-(b.dl||99)).slice(0,6);
  const blogs=A.blogs.filter(b=>b.status==="published").slice(0,3);
  const trainings=A.trainings.filter(t=>t.status==="published").slice(0,4);

  /* Personalization for logged-in seekers */
  const seekerLoggedIn=A.user?.role==="seeker";
  const myCvs=seekerLoggedIn?(A.cvs||[]).filter(c=>c.user===A.user.id):[];
  const mySkills=Array.from(new Set([...(A.user?.skills||[]),...myCvs.flatMap(c=>c.skills||[])]));
  const matchedForMe=seekerLoggedIn&&mySkills.length
    ? live.map(j=>({j,score:(j.skills||[]).filter(s=>mySkills.some(m=>m.toLowerCase()===s.toLowerCase())).length}))
        .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.j)
    : live.slice(0,6);

  /* Top industries hiring — count jobs per sector */
  const industryCounts=live.reduce((a,j)=>{a[j.cat]=(a[j.cat]||0)+1;return a;},{});
  const topIndustries=Object.entries(industryCounts).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([id,n])=>({...CATS.find(c=>c.id===id),n}));
  const hiringEmployerCount=new Set(live.map(j=>j.e)).size;

  const go=()=>{A.setSearch({q,where,cats:[]});A.go("search");};
  const pad=mob?"py-13 px-4":"py-20 px-8";
  const wrapCls="max-w-site mx-auto";

  const H=(title,sub,tag,action)=><div className={`flex justify-between items-end gap-5 flex-wrap ${mob?"mb-6":"mb-8"}`}>
    <div className="max-w-160">{tag&&<Tag tone="brand">{tag}</Tag>}
      <h2 className={`${SECTION_CLS} leading-tight ${tag?"mt-2.5 mb-2":"mt-0 mb-2"} ${mob?"text-2xl":"text-3xl"}`}>{title}</h2>
      {sub&&<p className={`text-text-2 leading-snug m-0 ${mob?"text-sm":"text-base"}`}>{sub}</p>}</div>
    {action}</div>;

  /* ─────────── Signed-in seeker: personalized view ─────────── */
  if(seekerLoggedIn){
    const first=A.user.name?.split(" ")[0]||"there";
    return <div className="bg-white">
      <section className={mob?"pt-8 px-4 pb-6":"pt-12 px-8 pb-6"}>
        <div className={wrapCls}>
          <div className={`font-bold tracking-tight text-text leading-tight mb-2.5 ${mob?"text-3xl":"text-4xl"}`}>
            {t("home.welcomeBack",{name:first})}</div>
          <div className={`text-text-2 leading-snug mb-6 max-w-160 ${mob?"text-base":"text-lg"}`}>
            {mySkills.length
              ? t("home.matchedOpportunitiesMsg",{count:matchedForMe.length})
              : t("home.addSkillsMsg")}</div>
          <div className={`bg-white rounded-2xl p-1.5 flex gap-1.5 shadow-md border border-line max-w-160 ${mob?"flex-wrap":"flex-nowrap"}`}>
            <div className="grow shrink basis-50 min-w-0">
              <Input icon="search" placeholder={t("home.jobSearchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:14.5}}/></div>
            {!mob&&<div className="w-px bg-line my-1.5"/>}
            <div className="grow shrink basis-35 min-w-0">
              <Input icon="pin" placeholder={t("home.locationSearchPlaceholder")} value={where} onChange={e=>setWhere(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:14.5}}/></div>
            <Btn kind="primary" size="md" full={mob} icon="search" onClick={go}>{t("home.searchBtn")}</Btn></div>
        </div>
      </section>

      {/* Job Seeker Transformation Tranche 1 (JS-01): a persistent completeness meter replaces the
          old up-front 6-step wizard as the mechanism for collecting the rest of the profile — it
          nudges without gating access to jobs. Reuses the same completeness()/completenessHint()
          selector ProfilePage already shows, so the two never drift out of sync. */}
      {A.completeness<100&&<section className={mob?"px-4 pt-5":"px-8 pt-6"}>
        <div className={wrapCls}>
          <div className={`bg-tint border border-line-2 rounded-2xl flex items-center gap-4 flex-wrap ${mob?"p-4":"p-5"}`}>
            <div className="flex-1 min-w-0" style={{minWidth:220}}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-bold text-text">{t("home.completenessTitle",{pct:A.completeness})}</span></div>
              <Bar v={A.completeness} tone={C.brand}/>
              <div className="text-xs text-text-2 mt-1.5 leading-normal">{A.completenessHint}</div></div>
            <Btn kind="outline" size="sm" onClick={()=>A.go(A.defaultCv?"profile":"cvs")}>{t("home.completenessCta")}</Btn></div>
        </div>
      </section>}

      <section className={`bg-white ${mob?"py-6 px-4":"py-8 px-8"}`}>
        <div className={wrapCls}>
          {H(t("home.matchedForYouTitle"),t("home.matchedForYouSub",{count:mySkills.length||"your"}),null,
            <Btn kind="outline" size="sm" iconR="arrowR" onClick={()=>A.go("matched")}>{t("home.seeAllMatchesBtn")}</Btn>)}
          <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
            {matchedForMe.map(j=><JobCard key={j.id} job={j}/>)}</div>
        </div>
      </section>

      <section className={`bg-bg ${mob?"py-6 px-4":"py-8 px-8"}`}>
        <div className={wrapCls}>
          {H(t("home.topIndustriesTitle"),t("home.topIndustriesSub"),null,
            <Btn kind="outline" size="sm" onClick={()=>A.go("search")}>{t("home.browseAllBtn")}</Btn>)}
          <div className={`grid gap-3 ${mob?"grid-cols-2":"grid-cols-3"}`}>
            {topIndustries.map(c=><button key={c.id} onClick={()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");}}
              data-card className={`flex gap-3.5 rounded-2xl cursor-pointer border border-line bg-white text-left items-center ${mob?"p-4":"p-5"}`}>
              <span className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center shrink-0"><I n={c.icon} s={22}/></span>
              <div className="flex-1 min-w-0"><div className="text-base font-bold text-text mb-0.5">{c.label}</div>
                <div className="text-xs text-text-3">{c.n} open position{c.n===1?"":"s"}</div></div>
              <I n="chevR" s={18} c={C.text3}/></button>)}
          </div>
        </div>
      </section>

      <section className={`bg-white ${mob?"py-6 px-4":"py-8 px-8"}`}>
        <div className={wrapCls}>
          {H(t("home.closingSoonTitle"),t("home.closingSoonSub"),null,
            <Btn kind="ghost" size="sm" onClick={()=>A.go("search")}>{t("home.allJobsBtn")}</Btn>)}
          <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
            {closingSoon.length?closingSoon.map(j=><JobCard key={j.id} job={j}/>):<div className="text-text-3 text-sm">{t("home.noClosingSoonMsg")}</div>}</div>
        </div>
      </section>

      <section className={`bg-bg ${mob?"py-6 px-4":"py-8 px-8"}`}>
        <div className={wrapCls}>
          {H(t("home.trendingTitle"),t("home.trendingSub"),null,null)}
          <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
            {trending.map(j=><JobCard key={j.id} job={j}/>)}</div>
        </div>
      </section>

      <section className={`bg-white ${mob?"py-6 px-4":"py-8 px-8"}`}>
        <div className={wrapCls}>
          {H(t("home.growCredentialsTitle"),t("home.growCredentialsSub"),null,
            <Btn kind="outline" size="sm" iconR="arrowR" onClick={()=>A.go("trainings")}>{t("home.allTrainingsBtn")}</Btn>)}
          <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`}}>
            {trainings.map(t=><TrainingCard key={t.id} t={t}/>)}</div>
        </div>
      </section>

      <section className={`bg-white ${mob?"pt-6 px-4 pb-10":"pt-8 px-8 pb-15"}`}>
        <div className={wrapCls}>
          {H(t("home.resourceCentreTitle"),t("home.resourceCentreSub"),null,
            <Btn kind="outline" size="sm" iconR="arrowR" onClick={()=>A.go("blogs")}>{t("home.allArticlesBtn")}</Btn>)}
          <div className={`grid gap-4 ${mob?"grid-cols-1":"grid-cols-3"}`}>
            {blogs.map(b=><BlogCard key={b.id} b={b}/>)}</div>
        </div>
      </section>
    </div>;
  }

  /* ─────────── Guest / non-seeker view ─────────── */
  return <div className="bg-white">

    <section className={`bg-white ${pad}`}>
      <div className={`${wrapCls} grid items-center ${mob?"grid-cols-1 gap-8":"gap-14"}`} style={{gridTemplateColumns:mob?undefined:"1.05fr .95fr"}}>
        <div>
          <Tag tone="brand" icon="pin">{t("home.hiringEverywhereTag")}</Tag>
          <h1 className={`${HERO_WIDE} my-6 ${mob?"text-4xl":"text-6xl"}`}>
            {t("home.heroTitle")}<br/><span className="text-brand">{t("home.heroTitleBrand")}</span></h1>
          <p className={`text-text-2 leading-snug mb-8 max-w-140 ${mob?"text-lg":"text-lg"}`}>
            {t("home.heroBody")}</p>
          <div className={`bg-white rounded-2xl p-2 flex gap-2 shadow-lg border border-line max-w-160 ${mob?"flex-wrap":"flex-nowrap"}`}>
            <div className="grow shrink basis-50 min-w-0">
              <Input icon="search" placeholder={t("home.jobSearchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
            {!mob&&<div className="w-px bg-line my-2"/>}
            <div className="grow shrink basis-40 min-w-0">
              <Input icon="pin" placeholder={t("home.locationSearchPlaceholder")} value={where} onChange={e=>setWhere(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
            <Btn kind="primary" size="lg" full={mob} icon="search" onClick={go}>{t("home.searchBtn")}</Btn></div>
          <div className="flex gap-2 flex-wrap mt-5 items-center">
            <span className="text-sm text-text-3">{t("home.popularSearchesLabel")}</span>
            {[t("home.searchJob1"),t("home.searchJob2"),t("home.searchJob3"),t("home.searchJob4"),t("home.searchJob5")].map(jobTitle=>
              <button key={jobTitle} onClick={()=>{A.setSearch({q:jobTitle,where:"",cats:[]});A.go("search");}}
                className="bg-white border border-line text-text-2 text-sm py-1.5 px-3.5 rounded-full cursor-pointer font-medium hover:border-brand hover:text-brand transition-colors duration-150">{jobTitle}</button>)}</div>
        </div>
        {!mob&&<div className="relative rounded-3xl overflow-hidden shadow-xl border border-line" style={{aspectRatio:"4/5"}}>
          <div className="absolute inset-0 bg-bg">
            <SmartScene kind="trades" tone={C.brand} w="100%" h="100%" seed={1}/></div>
          <div className="absolute left-6 bottom-8 bg-white rounded-2xl py-3.5 px-5 shadow-lg flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-ok-bg text-ok flex items-center justify-center"><I n="wallet" s={20}/></div>
            <div><div className="text-sm font-bold text-text">{t("home.wageOnEveryJobTitle")}</div>
              <div className="text-xs text-text-2 mt-0.5">{t("home.noCompetitiveSalary")}</div></div></div>
          <div className="absolute right-6 top-7 bg-white rounded-2xl py-3.5 px-5 shadow-lg flex items-center gap-3">
            <div className="flex">{[1,3,5].map((s,i)=><div key={s} className={`${i?"-ml-3":""} border-2 border-white rounded-full flex`}><SmartPortrait seed={s} size={32}/></div>)}</div>
            <div><div className="text-sm font-bold text-text">{t("home.hiredCountTitle")}</div>
              <div className="text-xs text-text-2 mt-0.5">{t("home.hiredCountSub")}</div></div></div>
        </div>}
      </div>
    </section>

    <section className={`bg-white border-y border-line-soft ${mob?"py-10 px-4":"py-14 px-8"}`}>
      <div className={wrapCls}>
        <div className={`grid text-center ${mob?"grid-cols-2 gap-6":"grid-cols-4 gap-8"}`}>
          {[[live.length.toLocaleString(),t("home.liveOpeningsLabel")],[hiringEmployerCount.toLocaleString(),t("home.employersHiringLabel")],["100%",t("home.wagesPublishedLabel")],["11 days",t("home.avgTimeToHireLabel")]].map(([v,l])=>
            <div key={l}><div className={`font-extrabold text-brand tracking-tight leading-none ${mob?"text-3xl":"text-5xl"}`}>{v}</div>
              <div className={`text-text-2 font-medium tracking-tight ${mob?"text-xs mt-2.5":"text-sm mt-3.5"}`}>{l}</div></div>)}</div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className={wrapCls}>
        {H(t("home.browseBySectorTitle"),t("home.browseBySectorSub"),t("home.sectorsTag"),
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("search")}>{t("home.allJobsBtn")}</Btn>)}
        <div className="grid gap-2.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?140:170}px,1fr))`}}>
          {CATS.map(c=><button key={c.id} onClick={()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");}}
            data-card className={`flex flex-col gap-2.5 rounded-xl cursor-pointer border border-line bg-white text-left hover:border-brand hover:bg-tint transition-colors duration-150 ${mob?"p-3.5":"p-4"}`}>
            <span className="w-9 h-9 rounded-lg bg-wash text-brand flex items-center justify-center shrink-0"><I n={c.icon} s={18}/></span>
            <div><div className="text-sm font-semibold text-text tracking-tight mb-0.5">{c.label}</div>
              <div className="text-xs text-text-3">{(industryCounts[c.id]||0).toLocaleString()} jobs</div></div></button>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className={wrapCls}>
        {H("Featured openings","Roles that employers are highlighting this week.","Featured this week",
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("search")}>{t("home.allJobsBtn")}</Btn>)}
        <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
          {featured.map(j=><JobCard key={j.id} job={j}/>)}</div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className={wrapCls}>
        {H(t("home.trendingTitle"),t("home.trendingSub"),"Trending",null)}
        <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
          {trending.map(j=><JobCard key={j.id} job={j}/>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className={wrapCls}>
        {H(t("home.closingSoonTitle"),t("home.closingSoonSub"),"Deadlines",null)}
        <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
          {closingSoon.length?closingSoon.map(j=><JobCard key={j.id} job={j}/>):<div className="text-text-3 text-sm text-center p-5" style={{gridColumn:"1/-1"}}>{t("home.noClosingSoonMsg")}</div>}</div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className={wrapCls}>
        {H(t("home.howItWorksTitle"),t("home.howItWorksSub"),t("home.howItWorksTag"))}
        <div className={`grid ${mob?"grid-cols-1 gap-3.5":"grid-cols-3 gap-5"}`}>
          {[[t("home.step1Icon"),t("home.step1Title"),t("home.step1Body")],
            [t("home.step2Icon"),t("home.step2Title"),t("home.step2Body")],
            [t("home.step3Icon"),t("home.step3Title"),t("home.step3Body")]].map(([ic,title,body],i)=>
            <div key={title} data-card className={`bg-bg rounded-3xl border border-line ${mob?"p-7":"p-9"}`}>
              <div className={`font-extrabold text-brand tracking-tight leading-none mb-5 ${mob?"text-4xl":"text-5xl"}`}>0{i+1}</div>
              <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center mb-5"><I n={ic} s={22}/></div>
              <div className={`font-bold text-text tracking-tight mb-2.5 leading-tight ${mob?"text-xl":"text-2xl"}`}>{title}</div>
              <p className={`text-text-2 leading-relaxed m-0 ${mob?"text-sm":"text-base"}`}>{body}</p></div>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className={wrapCls}>
        {H(t("home.certificationsTitle"),t("home.certificationsSub"),t("home.certificationsTag"),
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("trainings")}>{t("home.allTrainingsBtn")}</Btn>)}
        <div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`}}>
          {trainings.map(t=><TrainingCard key={t.id} t={t}/>)}</div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className={wrapCls}>
        {H(t("home.resourceCentreTitle"),t("home.resourceCentreSub"),undefined,
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("blogs")}>{t("home.allArticlesBtn")}</Btn>)}
        <div className={`grid ${mob?"grid-cols-1 gap-3.5":"grid-cols-3 gap-5"}`}>
          {blogs.map(b=><BlogCard key={b.id} b={b}/>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className={`${wrapCls} grid ${mob?"grid-cols-1":"grid-cols-2"} gap-4`}>
        <div className={`bg-brand rounded-3xl text-white ${mob?"p-8":"p-12"}`}>
          <Tag tone="onDark">{t("home.seekersAlwaysFreeLabel")}</Tag>
          <h3 className={`font-bold tracking-tight leading-tight my-5 ${mob?"text-2xl":"text-3xl"}`}>{t("home.seekersAlwaysFreeCta")}</h3>
          <p className={`text-white/85 leading-relaxed mb-7 ${mob?"text-sm":"text-base"}`}>
            {t("home.seekersFreeBody")}</p>
          <Btn kind="onDark" size="lg" iconR="arrowR" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>
            {A.user?.role==="seeker"?t("home.seekerCta"):t("home.seekerCta2")}</Btn></div>
        <div className={`bg-ink rounded-3xl text-white ${mob?"p-8":"p-12"}`}>
          <Tag tone="onDark">{t("home.employersFreeLabel")}</Tag>
          <h3 className={`font-bold tracking-tight leading-tight my-5 ${mob?"text-2xl":"text-3xl"}`}>{t("home.employersFreeCta")}</h3>
          <p className={`text-white/70 leading-relaxed mb-7 ${mob?"text-sm":"text-base"}`}>
            {t("home.employersBody")}</p>
          <Btn kind="primary" size="lg" iconR="arrowR" onClick={()=>A.go(A.user?.role==="employer"?"empPost":"forEmployers")}>{t("home.employerCta")}</Btn></div>
      </div>
    </section>

  </div>;
}

/* ═══════════════ BLOGS · TRAININGS · STATIC PAGES ═══════════════ */
export function BlogsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [cat,setCat]=useState("all"); const [q,setQ]=useState("");
  const [author,setAuthor]=useState(null);
  useEffect(()=>{if(A.blogAuthorFilter){setAuthor(A.blogAuthorFilter);A.setBlogAuthorFilter(null);}},[A.blogAuthorFilter]);
  const pub=A.blogs.filter(b=>b.status==="published");
  const cats=["all",...Array.from(new Set(pub.map(b=>b.cat)))];
  const list=pub.filter(b=>(cat==="all"||b.cat===cat)&&(!author||b.author===author)&&matchesQuery(q,b.title,b.excerpt));
  const lead=author?null:list[0];
  const gridList=lead&&!q&&cat==="all"?list.slice(1):list;
  const pg=usePagination(gridList,18);
  useEffect(()=>{pg.setPage(1);},[cat,q,author]);
  const pad=mob?"py-14 px-4":"py-24 px-8";
  return <div className="bg-white min-h-full">

    <section className={`bg-white ${pad}`}>
      <div className="max-w-240 mx-auto text-center">
        <Tag tone="brand" icon="book">{t("blogs.careerResourcesTag")}</Tag>
        <h1 className={`${HERO_WIDE} my-6 ${mob?"text-4xl":"text-7xl"}`}>
          {t("blogs.title")}</h1>
        <p className={`text-text-2 leading-snug mx-auto max-w-155 ${mob?"text-lg":"text-xl"}`}>
          {t("blogs.description")}</p>
      </div>
    </section>

    <section className={`bg-white ${mob?"px-4 pb-14":"px-8 pb-24"}`}>
      <div className="max-w-280 mx-auto">
        <div className="flex gap-3.5 mb-3.5 flex-wrap items-center">
          <div className="grow shrink basis-65 max-w-100"><Input icon="search" placeholder={t("blogs.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}/></div>
          <Tabs items={cats.map(c=>({k:c,label:c==="all"?t("blogs.allTopics"):c}))} value={cat} onChange={setCat}/>
          <a href="/api/content/blogs/rss.xml" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-2 hover:text-brand ml-auto">
            <I n="pulse" s={15}/>{t("blogs.rssLink")}</a></div>
        {author&&<div className="flex items-center gap-2 mb-9">
          <Tag tone="brand" icon="user">{t("blogs.byAuthor",{author})}</Tag>
          <button onClick={()=>setAuthor(null)} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2 hover:text-text underline">{t("blogs.clearFilter")}</button></div>}
        {list.length===0?<Empty icon="book" title={t("blogs.noArticlesFound")} body={t("blogs.noArticlesBody")}
          action={<Btn kind="primary" onClick={()=>{setQ("");setCat("all");setAuthor(null);}}>{t("blogs.resetBtn")}</Btn>}/>:<>
          {lead&&!q&&cat==="all"&&<div className="bg-white rounded-3xl overflow-hidden border border-line mb-8 shadow-md">
            <div onClick={()=>A.openBlog(lead.id)} className={`grid cursor-pointer transition-transform duration-200 hover:-translate-y-1 ${mob?"grid-cols-1":""}`} style={{gridTemplateColumns:mob?undefined:"1.1fr 1fr"}}>
              <div className={mob?"bg-bg":"bg-bg"} style={{aspectRatio:mob?"16/10":"auto",minHeight:mob?undefined:320}}>
                <SmartScene kind={lead.scene} tone={lead.tone} w="100%" h={mob?"100%":"100%"} seed={lead.id.length}/></div>
              <div className={`flex flex-col justify-center ${mob?"p-7":"p-11"}`}>
                <div className="flex gap-2 mb-4"><Tag tone="brand" sm>{lead.cat}</Tag><Tag tone="warn" sm>Featured</Tag></div>
                <div className={`font-bold text-text tracking-tight leading-tight mb-4 ${mob?"text-2xl":"text-3xl"}`}>{lead.title}</div>
                <p className={`text-text-2 leading-relaxed mb-6 ${mob?"text-base":"text-lg"}`}>{lead.excerpt}</p>
                <div className="flex items-center gap-3">
                  <button onClick={e=>{e.stopPropagation();A.filterBlogsByAuthor(lead.author);}}
                    className="flex items-center gap-3 bg-transparent border-0 p-0 cursor-pointer text-left hover:underline">
                    <SmartPortrait seed={lead.authorSeed} size={40}/>
                    <div><div className="text-sm font-bold text-text">{lead.author}</div>
                      <div className="text-xs text-text-3 mt-0.5 no-underline">{lead.date} • {lead.mins} min read</div></div></button></div></div></div></div>}
          <div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:340}px,1fr))`}}>
            {pg.pageItems.map(b=><BlogCard key={b.id} b={b}/>)}</div>
          <Pagination {...pg}/></>}
      </div>
    </section>

  </div>;
}

export function BlogPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {locale,t}=useTranslation();
  const b=A.blogs.find(x=>x.id===A.blogId);
  if(!b) return <Page><Empty icon="book" title={t("blogs.articleNotFound")} body={t("blogs.articleNotFoundBody")}
    action={<Btn kind="primary" onClick={()=>A.go("blogs")}>{t("blog.allArticlesBtn")}</Btn>}/></Page>;
  // Bill 96: render the employer/admin-authored French version when the reader's locale is
  // fr-CA and one was actually written in the Content Manager; otherwise fall back to English
  // rather than showing a half-French, half-English article.
  const useFr=locale==="fr-CA"&&(b.titleFr||b.excerptFr||b.bodyFr?.length);
  const bTitle=useFr&&b.titleFr?b.titleFr:b.title;
  const bExcerpt=useFr&&b.excerptFr?b.excerptFr:b.excerpt;
  const bBody=useFr&&b.bodyFr?.length?b.bodyFr:b.body;
  const more=A.blogs.filter(x=>x.status==="published"&&x.id!==b.id).slice(0,3);
  const pad=mob?"py-11 px-4":"py-18 px-8";
  return <div className="bg-white min-h-full">

    <section className={`bg-white ${pad}`}>
      <div className="max-w-190 mx-auto text-center">
        {!mob&&<button onClick={A.back} className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2 mb-7"><I n="arrowL" s={17}/>{t("blog.allArticlesBtn")}</button>}
        <Tag tone="brand" sm>{b.cat}</Tag>
        <h1 className={`${HERO_WRAP} my-5 ${mob?"text-3xl":"text-5xl"}`}>{bTitle}</h1>
        <p className={`text-text-2 leading-snug mx-auto mb-7 max-w-160 ${mob?"text-base":"text-xl"}`}>{bExcerpt}</p>
        <div className="inline-flex items-center gap-3 flex-wrap justify-center">
          <button onClick={()=>A.filterBlogsByAuthor(b.author)}
            className="inline-flex items-center gap-3 bg-transparent border-0 p-0 cursor-pointer hover:underline">
            <SmartPortrait seed={b.authorSeed} size={44}/>
            <div className="text-left"><div className="text-sm font-bold text-text">{b.author}</div>
              <div className="text-xs text-text-3 mt-0.5 no-underline">{b.date} • {b.mins} min read</div></div></button></div>
      </div>
    </section>

    <section className={`bg-white ${mob?"px-4 pb-11":"px-8 pb-18"}`}>
      <div className={`max-w-240 mx-auto ${mob?"rounded-2xl":"rounded-3xl"} overflow-hidden bg-bg shadow-md border border-line`} style={{aspectRatio:"16/8"}}>
        <SmartScene kind={b.scene} tone={b.tone} w="100%" h="100%" seed={b.id.length}/></div>
    </section>

    <section className={`bg-white ${mob?"px-4 pb-14":"px-8 pb-24"}`}>
      <div className="max-w-180 mx-auto">
        {bBody.map(([h,p],i)=>{
          const isHtml=/<[a-z][^>]*>/i.test(p);
          return <section key={i} className={i===bBody.length-1?"mb-0":"mb-9"}>
            {h&&<h2 className={`${SECTION_CLS} mb-4 leading-tight ${mob?"text-2xl":"text-3xl"}`}>{h}</h2>}
            {isHtml
              ? <div className={`blog-body rich-content text-text-2 leading-loose ${mob?"text-base":"text-lg"}`} dangerouslySetInnerHTML={{__html:sanitizeHtml(p)}}/>
              : <p className={`text-text-2 leading-loose m-0 ${mob?"text-base":"text-lg"}`}>{p}</p>}
          </section>;})}
        <div className="mt-14 pt-9 border-t border-line-soft flex gap-4 items-center flex-wrap">
          <SmartPortrait seed={b.authorSeed} size={64}/>
          <div className="grow shrink basis-50 min-w-0">
            <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1.5">Written by</div>
            <div className="text-lg font-bold text-text tracking-tight">{b.author}</div>
            <div className="text-sm text-text-2 mt-1.5 leading-snug">Contributor on the NorthHire careers desk, writing on {b.cat.toLowerCase()} in the Canadian labour market.</div></div>
          <Btn kind="outline" icon="share" onClick={()=>A.share(b)}>Share</Btn></div>
      </div>
    </section>

    <section className={`bg-bg border-t border-line ${pad}`}>
      <div className="max-w-280 mx-auto">
        <div className="mb-9">
          <Tag tone="brand">{t("blogs.keepReading")}</Tag>
          <h2 className={`${SECTION_CLS} leading-tight mt-3.5 ${mob?"text-2xl":"text-4xl"}`}>{t("blogs.moreFromDesk")}</h2></div>
        <div className={`grid ${mob?"grid-cols-1 gap-3.5":"grid-cols-3 gap-5"}`}>
          {more.map(x=><BlogCard key={x.id} b={x}/>)}</div>
      </div>
    </section>

  </div>;
}

export function TrainingsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [cat,setCat]=useState("all"); const [price,setPrice]=useState("all"); const [q,setQ]=useState("");
  const pub=A.trainings.filter(t=>t.status==="published");
  const cats=["all",...Array.from(new Set(pub.map(t=>t.cat)))];
  const list=pub.filter(t=>(cat==="all"||t.cat===cat)&&(price==="all"||(price==="free"?t.price===0:t.price>0))
    &&matchesQuery(q,t.title));
  const pg=usePagination(list,18);
  useEffect(()=>{pg.setPage(1);},[cat,price,q]);
  const pad=mob?"py-14 px-4":"py-24 px-8";
  return <div className="bg-white min-h-full">

    <section className={`bg-white ${pad}`}>
      <div className="max-w-240 mx-auto text-center">
        <Tag tone="brand" icon="cap">{t("trainings.certificationsTag")}</Tag>
        <h1 className={`${HERO_WIDE} my-6 ${mob?"text-4xl":"text-7xl"}`}>
          {t("trainings.title")}</h1>
        <p className={`text-text-2 leading-snug mx-auto mb-11 max-w-155 ${mob?"text-lg":"text-xl"}`}>
          {t("trainings.description")}</p>
        <div className={`grid grid-cols-3 mx-auto max-w-160 ${mob?"gap-5":"gap-11"}`}>
          {[[pub.filter(t=>t.price===0).length,t("trainings.freeCourses")],[pub.length,t("trainings.totalCourses")],
            [pub.reduce((s,t)=>s+t.enrolled,0).toLocaleString(),t("trainings.learnersEnrolled")]].map(([v,l])=>
            <div key={l}><div className={`font-extrabold text-brand tracking-tight leading-none ${mob?"text-3xl":"text-4xl"}`}>{v}</div>
              <div className={`text-text-2 font-semibold ${mob?"text-xs mt-2":"text-sm mt-3"}`}>{l}</div></div>)}</div>
      </div>
    </section>

    <section className={`bg-white ${mob?"px-4 pb-14":"px-8 pb-24"}`}>
      <div className="max-w-280 mx-auto">
        <div className="flex gap-3.5 mb-5 flex-wrap items-center">
          <div className="grow shrink basis-60 max-w-90"><Input icon="search" placeholder={t("trainings.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)}/></div>
          <Tabs items={[{k:"all",label:t("trainings.allPrices")},{k:"free",label:t("trainings.freePriceLabel")},{k:"paid",label:t("trainings.paidPriceLabel")}]} value={price} onChange={setPrice}/></div>
        <Tabs items={cats.map(c=>({k:c,label:c==="all"?t("trainings.allCategories"):c}))} value={cat} onChange={setCat} style={{marginBottom:36}}/>
        {list.length===0?<Empty icon="cap" title={t("trainings.noTrainingsFound")} body={t("trainings.noTrainingsBody")}
          action={<Btn kind="primary" onClick={()=>{setQ("");setCat("all");setPrice("all");}}>{t("trainings.resetBtn")}</Btn>}/>
          :<><div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`}}>
            {pg.pageItems.map(t=><TrainingCard key={t.id} t={t}/>)}</div>
            <Pagination {...pg}/></>}
      </div>
    </section>

  </div>;
}

export function TrainingPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  /* Hooks before conditional return - a useState after an early return is a Rules-of-Hooks
     violation and crashes the tab the moment a not-found training becomes findable. */
  const [payConfirm,setPayConfirm]=useState(null); /* {price,title} */
  const {locale,t}=useTranslation();
  const training=A.trainings.find(x=>x.id===A.trainingId);
  if(!training) return <Page><Empty icon="cap" title={t("training.notFound")} body={t("training.unpublishedBody")}
    action={<Btn kind="primary" onClick={()=>A.go("trainings")}>{t("training.allTrainingsBtn")}</Btn>}/></Page>;
  // Bill 96: same French-if-available, English-otherwise fallback as BlogPage.
  const useFr=locale==="fr-CA"&&(training.titleFr||training.aboutFr);
  const tTitle=useFr&&training.titleFr?training.titleFr:training.title;
  const tAbout=useFr&&training.aboutFr?training.aboutFr:training.about;
  const enrolled=A.enrolled.has(training.id);
  const prog=A.trainingProgress[training.id]||0;
  const pad=mob?"py-11 px-4":"py-18 px-8";
  const tryEnrol=()=>{
    const r=A.enrol(training.id);
    if(r&&r.needsPayment)setPayConfirm(r);
  };
  return <div className="bg-white min-h-full">

    <section className={`bg-white ${pad}`}>
      <div className="max-w-280 mx-auto">
        {!mob&&<button onClick={A.back} className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2 mb-8"><I n="arrowL" s={17}/>{t("training.allTrainingsBtn")}</button>}
        <div className={`grid items-start ${mob?"grid-cols-1 gap-7":"gap-11"}`} style={{gridTemplateColumns:mob?undefined:"1fr 380px"}}>
          <div>
            <div className="flex gap-2 flex-wrap mb-5">
              <Tag tone="brand">{training.cat}</Tag><Tag>{training.level}</Tag><Tag icon="clock">{t("training.hoursTag",{hours:training.hours})}</Tag>
              {training.price===0&&<Tag tone="ok">{t("trainings.freePriceLabel")}</Tag>}</div>
            <h1 className={`${HERO_WRAP} mb-5 ${mob?"text-3xl":"text-5xl"}`}>{tTitle}</h1>
            <p className={`text-text-2 leading-snug mb-6 ${mob?"text-base":"text-lg"}`}>{tAbout}</p>
            <div className="flex items-center gap-4 flex-wrap text-sm text-text-2 pt-6 border-t border-line-soft">
              <span className="flex items-center gap-2"><SmartPortrait seed={training.providerSeed} size={34}/><strong className="text-text font-semibold">{training.provider}</strong></span>
              <span className="text-warn flex items-center gap-1 font-semibold"><I n="star" s={14} fill={C.warn} w={0}/>{training.rating}</span>
              <span className="text-text-3">{t("training.enrolledLabel",{count:training.enrolled})}</span></div></div>
          <div className="bg-white rounded-2xl overflow-hidden border border-line shadow-md">
            <div className="bg-bg" style={{aspectRatio:"16/10"}}><SmartScene kind={training.scene} tone={training.tone} w="100%" h="100%" seed={training.id.length}/></div>
            <div className={mob?"p-6":"p-7"}>
              <div className={`font-extrabold text-text tracking-tight mb-1.5 leading-none ${mob?"text-4xl":"text-5xl"}`}>{training.price===0?t("trainings.freePriceLabel"):money(training.price)}</div>
              <div className="text-sm text-text-2 mb-6">{training.price===0?t("training.freePriceLabel"):t("training.paidPriceLabel")}</div>
              {enrolled?<>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-2">{t("training.yourProgress")}</span><span className="font-bold text-brand">{prog}%</span></div>
                  <Bar v={prog}/></div>
                <Btn kind="primary" size="lg" full icon="play" onClick={()=>A.advanceTraining(training.id)}>
                  {prog>=100?t("training.reviewCourseBtn"):t("training.continueLearnBtn")}</Btn>
                {prog>=100&&<Btn kind="outline" full icon="download" style={{marginTop:10}} onClick={()=>A.printCert(training)}>{t("training.downloadCertBtn")}</Btn>}
              </>:<Btn kind="primary" size="lg" full icon="cap" onClick={tryEnrol}>{t("training.enrolNowBtn")}</Btn>}
              <div className="mt-5 pt-5 border-t border-line-soft flex flex-col gap-2.5">
                {[[t("training.featureHours",{hours:training.hours}),"clock"],[t("training.featureCert"),"file"],[t("training.featureOnline"),"globe"],[t("training.featureAccess"),"refresh"]].map(([l,ic])=>
                  <div key={l} className="flex items-center gap-2.5 text-sm text-text-2"><I n={ic} s={16} c={C.brand}/>{l}</div>)}</div></div></div>
        </div>
      </div>
    </section>

    <section className={`bg-bg border-t border-line ${pad}`}>
      <div className={`max-w-280 mx-auto grid items-start ${mob?"grid-cols-1 gap-6":"gap-8"}`} style={{gridTemplateColumns:mob?undefined:"1fr 340px"}}>
        <div>
          <div className={`bg-white rounded-2xl border border-line mb-5 ${mob?"p-7":"p-9"}`}>
            <div className={`font-bold text-text tracking-tight mb-5 leading-tight ${mob?"text-2xl":"text-3xl"}`}>{t("training.whatYouLearn")}</div>
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              {training.outcomes.map(o=><div key={o} className="flex gap-3 items-start text-sm text-text-2 leading-snug">
                <span className="text-ok mt-0.5 shrink-0 flex"><I n="check" s={17} w={2.4}/></span>{o}</div>)}</div></div>
          <div className={`bg-white rounded-2xl border border-line ${mob?"p-7":"p-9"}`}>
            <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
              <div className={`font-bold text-text tracking-tight leading-tight ${mob?"text-2xl":"text-3xl"}`}>{t("training.courseContent")}</div>
              <div className="text-sm text-text-3">{t("training.moduleCount",{count:training.mods.length,hours:training.hours})}</div></div>
            {training.mods.map((m,i)=>{const done=enrolled&&prog>=Math.round(((i+1)/training.mods.length)*100);
              return <div key={m} className={`flex items-center gap-3.5 py-4 ${i<training.mods.length-1?"border-b border-line-soft":""}`}>
                <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold ${done?"bg-ok-bg text-ok":"bg-bg text-text-3"}`}>
                  {done?<I n="check" s={17} w={2.6}/>:i+1}</div>
                <div className="flex-1 min-w-0 text-base text-text font-medium">{m}</div>
                <span className="text-sm text-text-3 shrink-0">{Math.round(training.hours/training.mods.length*10)/10} h</span></div>;})}</div></div>
        <div className={`bg-white rounded-2xl border border-line ${mob?"p-6":"p-7"}`}>
          <Lbl>{t("training.relatedJobs")}</Lbl>
          {A.jobs.filter(j=>j.status==="live").slice(0,4).map((j,i,arr)=>{const e=A.emp(j.e);
            return <button key={j.id} onClick={()=>A.openJob(j.id)} className={`flex gap-3 items-center w-full py-3.5 bg-transparent border-0 cursor-pointer text-left ${i<arr.length-1?"border-b border-line-soft":""}`}>
              <EmpMark e={e} size={40} radius={10}/>
              <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
                <div className="text-xs text-text-3 mt-1">{pay(j)}{payShort(j)}</div></div>
              <I n="chevR" s={15} c={C.text3}/></button>;})}</div>
      </div>
    </section>

    <ConfirmDialog open={!!payConfirm} onClose={()=>setPayConfirm(null)} confirmLabel={payConfirm?t("training.payButtonLabel",{price:money(payConfirm.price)}):"Pay"}
      title={t("training.confirmPaymentTitle")} onConfirm={()=>A.confirmPaidEnrol(training.id)}>
      {payConfirm&&<>{t("training.paymentConfirmMsg",{price:money(payConfirm.price)})}</>}
    </ConfirmDialog>
  </div>;
}

/* ═══════════════ STATIC PAGES ═══════════════ */
export function AboutPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const team=[
    {seed:3,name:"Marcus Bediako",role:"Co-founder & CEO",from:"Journeyperson Electrician"},
    {seed:2,name:"Priya Raman",role:"Co-founder & COO",from:"Nurse Manager"},
    {seed:5,name:"Jomar Villanueva",role:"Head of Employer Partnerships",from:"Fleet Operations"},
    {seed:4,name:"Amelie Fortin",role:"Head of Product",from:"Product Lead, ex-Shopify"},
    {seed:6,name:"Daniel Kovacs",role:"Engineering Lead",from:"Warehouse Manager"},
    {seed:8,name:"Linda Osei",role:"Head of Support",from:"Restaurant GM"},
    {seed:9,name:"Omar Haddad",role:"Data Science",from:"Data Scientist, ex-Wealthsimple"},
    {seed:11,name:"Sofia Reyes",role:"Design",from:"Designer, ex-Loblaw Digital"},
  ];
  const offices=[
    {city:"Toronto",addr:"250 Front St W",kind:"office",role:"Head office",team:"42 people"},
    {city:"Calgary",addr:"525 8th Ave SW",kind:"trades",role:"Trades & West",team:"18 people"},
    {city:"Montreal",addr:"1250 René-Lévesque",kind:"office",role:"Product & French",team:"14 people"},
    {city:"Halifax",addr:"1959 Upper Water",kind:"care",role:"Healthcare & Atlantic",team:"9 people"},
  ];
  const press=["The Globe and Mail","Financial Post","CBC News","Toronto Star","BetaKit","Maclean's","La Presse","Canadian Business"];
  const investors=["Golden Ventures","Real Ventures","BDC Capital","Inovia","Version One","OMERS Ventures"];
  const values=[
    {ic:"wallet",t:"Real wages, always",b:"Every listing publishes a wage. If an employer will not state one, they cannot post."},
    {ic:"heart",t:"Every kind of work",b:"Trades, care, transport, kitchens, warehouses. Built for the ninety percent."},
    {ic:"shield",t:"Your data is yours",b:"No selling profiles. No advertising against searches. Export anything."},
    {ic:"users",t:"A real person answers",b:"Support you can actually reach. In Canada. Within one business day."},
  ];
  const history=[
    {y:"2023",t:"An idea",b:"Marcus applied to forty electrician jobs. Not one said what it paid."},
    {y:"2024",t:"First hundred",b:"A hundred employers agreed to publish real wages. Every one filled roles faster than they expected."},
    {y:"2025",t:"Coast to coast",b:"Every province and territory. Twelve industries. Fifty thousand hires."},
    {y:"2026",t:"Today",b:"Four thousand employers. Six hundred thousand job seekers. Still zero listings without a wage."},
  ];
  const whyus=[
    {ic:"target",t:"Applicants ranked for you",b:"Every application is scored the moment it lands, so the first CV you open is the best fit."},
    {ic:"sparkle",t:"AI that shows its work",b:"Every match score comes with reasons. No black box, no bias amplification, fully auditable."},
    {ic:"users",t:"The people you're missing",b:"Reach candidates on the platform who match but haven't applied yet. One tap to invite."},
    {ic:"activity",t:"Analytics you use",b:"Applications per day, drop-off between stages, source attribution. Not a vanity dashboard."},
    {ic:"globe",t:"Built for Canada",b:"French and English, every province, PIPEDA-native, wage transparency compliant from day one."},
    {ic:"download",t:"Nothing locked in",b:"No contracts. No per-applicant fees. Export everything. Leave any time."},
  ];
  const faq=[
    ["Is NorthHire free for job seekers?","Yes. Free forever. No premium tier."],
    ["Where do you operate?","Every province and territory in Canada, in English and French."],
    ["How do you make money?","Employer subscriptions, starting at $49 a month. Job seekers pay nothing."],
    ["How do you verify employers?","Business number, incorporation lookup, and a manual check by our Toronto team within one business day."],
    ["Do you use AI on my data?","We use scoring models on your application to match you to jobs. We do not sell your data or train external models on it."],
    ["Can I delete my account?","Yes, any time, from your settings page. Full deletion under PIPEDA within thirty days."],
  ];
  const [faqOpen,setFaqOpen]=useState(-1);
  const pad = mob ? "py-14 px-4" : "py-24 px-8";
  const padTight = mob ? "py-11 px-4" : "py-18 px-8";
  const H = (title,sub,tag)=><div className="text-center max-w-180 mx-auto mb-12">
    {tag&&<Tag tone="brand">{tag}</Tag>}
    <h2 className={`${SECTION_CLS} my-3.5 leading-snug ${mob?"text-3xl":"text-4xl"}`}>{title}</h2>
    {sub&&<p className={`text-text-2 leading-snug m-0 ${mob?"text-base":"text-lg"}`}>{sub}</p>}</div>;

  return <div className="bg-white min-h-full">

    <section className={`bg-white ${pad}`}>
      <div className="max-w-280 mx-auto text-center">
        <Tag tone="brand">About NorthHire</Tag>
        <h1 className={`${HERO_WIDE} my-6 mx-auto max-w-225 ${mob?"text-4xl":"text-8xl"}`}>
          The job platform Canada has been waiting for</h1>
        <p className={`text-text-2 leading-snug mx-auto mb-10 max-w-160 ${mob?"text-lg":"text-2xl"}`}>
          NorthHire was founded by a registered nurse, a Red Seal electrician and a long-haul driver who were tired of watching Canadian workers navigate job platforms built somewhere else, for someone else. We built NorthHire for the trades, the care workers, the drivers, the cooks and the warehouse crews who make this country run.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Btn kind="primary" size="lg" iconR="arrowR" onClick={()=>A.go("forEmployers")}>See how it works</Btn>
          <Btn kind="outline" size="lg" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>Create a free account</Btn></div>
        <div className={`mt-15 overflow-hidden shadow-xl border border-line ${mob?"rounded-2xl":"rounded-3xl"}`}>
          <div className="w-full bg-bg relative" style={{aspectRatio:mob?"16/11":"16/8"}}>
            <SmartScene kind="office" seed={7} w="100%" h="100%" style={{position:"absolute",inset:0}}/></div></div>
      </div>
    </section>

    <section className={`bg-white border-y border-line-soft ${padTight}`}>
      <div className="max-w-280 mx-auto text-center">
        <div className={`text-xs font-semibold text-text-3 tracking-widest uppercase ${mob?"mb-6":"mb-7"}`}>
          Featured in</div>
        <div className={`grid ${mob?"grid-cols-2 gap-5":"grid-cols-4 gap-8"} items-center justify-items-center`}>
          {press.map(p=><div key={p} className={`font-semibold text-text-3 tracking-tight opacity-75 ${mob?"text-base":"text-lg"}`}>{p}</div>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className="max-w-280 mx-auto">
        <div className={`grid items-center ${mob?"grid-cols-1 gap-9":"gap-16"}`} style={{gridTemplateColumns:mob?undefined:"1fr 1.15fr"}}>
          <div>
            <Tag tone="brand">Our mission</Tag>
            <h2 className={`${SECTION_CLS} my-3.5 leading-snug ${mob?"text-3xl":"text-4xl"}`}>
              Every job posting should tell you what it pays.</h2>
            <p className={`text-text-2 leading-loose mb-4 ${mob?"text-base":"text-lg"}`}>
              For decades, Canadians have applied to jobs blind. No wage. No requirements clearly stated. No idea whether they even qualified.</p>
            <p className={`text-text-2 leading-loose mb-6 ${mob?"text-base":"text-lg"}`}>
              We're building a platform where every listing is honest, every applicant is scored, and every hire is made on facts — not luck.</p>
            <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("blogs")}>Read our manifesto</Btn></div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-line" style={{aspectRatio:"4/3"}}>
            <SmartScene kind="trades" seed={3} w="100%" h="100%"/></div>
        </div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className="max-w-280 mx-auto">
        {H("The numbers so far.","Three years, one promise kept.","By the numbers")}
        <div className={`grid ${mob?"grid-cols-2 gap-3":"grid-cols-4"} rounded-3xl overflow-hidden`} style={{border:mob?"none":`1px solid ${C.line}`}}>
          {[["612k+","Job seekers"],["4,180","Employers"],["21,340","Live jobs"],["50k+","Hires made"]].map(([v,l],i)=>
            <div key={l} className={`bg-white text-center ${mob?"py-7 px-5 rounded-2xl border border-line":"py-11 px-8"}`} style={!mob&&i<3?{borderRight:`1px solid ${C.line}`}:undefined}>
              <div className={`font-extrabold text-brand tracking-tight leading-none ${mob?"text-4xl":"text-6xl"}`}>{v}</div>
              <div className={`text-text-2 font-semibold mt-3 ${mob?"text-sm":"text-sm"}`}>{l}</div></div>)}</div>
        <div className={`grid gap-3 mt-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          {[["11 days","Median time to hire"],["13/13","Provinces and territories"],["EN + FR","Fully bilingual"]].map(([v,l])=>
            <div key={l} className={`bg-bg rounded-2xl text-center ${mob?"py-6 px-5":"py-8 px-7"}`}>
              <div className={`font-bold text-text tracking-tight leading-none ${mob?"text-3xl":"text-4xl"}`}>{v}</div>
              <div className="text-sm text-text-2 mt-2.5">{l}</div></div>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className="max-w-280 mx-auto">
        {H("What we believe.","Four promises. We will not compromise on them.","Values")}
        <div className={`grid ${mob?"grid-cols-1 gap-3":"grid-cols-2 gap-4"}`}>
          {values.map(v=><div key={v.t} className={`bg-white rounded-3xl border border-line ${mob?"p-7":"p-9"}`}>
            <div className="w-13 h-13 rounded-2xl bg-wash text-brand flex items-center justify-center mb-6">
              <I n={v.ic} s={26}/></div>
            <div className={`font-bold text-text tracking-tight mb-2.5 leading-tight ${mob?"text-xl":"text-2xl"}`}>{v.t}</div>
            <p className={`text-text-2 leading-relaxed m-0 ${mob?"text-sm":"text-base"}`}>{v.b}</p></div>)}</div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className="max-w-280 mx-auto">
        {H("Why teams choose us.","Same platform, whether you hire two or two hundred.","Why NorthHire")}
        <div className={`grid ${mob?"grid-cols-1 gap-3.5":"grid-cols-3 gap-5"}`}>
          {whyus.map(w=><div key={w.t} className={mob?"py-6 px-1":"py-7 px-2"}>
            <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center mb-5">
              <I n={w.ic} s={22}/></div>
            <div className={`font-bold text-text tracking-tight mb-2 ${mob?"text-lg":"text-xl"}`}>{w.t}</div>
            <p className={`text-text-2 leading-relaxed m-0 ${mob?"text-sm":"text-sm"}`}>{w.b}</p></div>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className="max-w-280 mx-auto">
        {H("Our history.","Three years. Four moments.","The journey")}
        <div className="relative">
          {!mob&&<div className="absolute left-1/2 top-2 bottom-2 w-0.5 bg-line" style={{transform:"translateX(-1px)"}}/>}
          {history.map((h,i)=>{const left=i%2===0;
            return <div key={h.y} className={`grid items-center ${mob?"grid-cols-1 mb-6":"mb-11"}`} style={{gridTemplateColumns:mob?undefined:"1fr 60px 1fr",gap:mob?0:20}}>
              <div className={mob?"text-left":left?"text-right px-2":"text-left px-2"} style={{gridColumn:mob?"1":left?"1":"3"}}>
                <div className={`font-bold text-brand tracking-wide uppercase ${mob?"text-xs mb-1.5":"text-sm mb-2.5"}`}>{h.y}</div>
                <div className={`font-bold text-text tracking-tight mb-2.5 leading-snug ${mob?"text-xl":"text-2xl"}`}>{h.t}</div>
                <p className={`text-text-2 leading-relaxed m-0 ${mob?"text-sm":"text-base"}`}>{h.b}</p></div>
              {!mob&&<div className="flex justify-center" style={{gridColumn:"2"}}>
                <div className="w-4 h-4 rounded-full bg-brand border-4 border-white" style={{boxShadow:`0 0 0 2px ${C.brand}`}}/></div>}
            </div>;})}</div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className="max-w-300 mx-auto">
        {H("The people behind it.","Half the team has worked in the industries we serve.","Team")}
        <div className={`grid ${mob?"gap-3":"gap-5"}`} style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?150:220}px,1fr))`}}>
          {team.map(p=><div key={p.name}>
            <div className="rounded-2xl overflow-hidden bg-bg mb-3.5" style={{aspectRatio:"1"}}>
              <SmartPortrait seed={p.seed} size="100%" radius={0}/></div>
            <div className={`font-bold text-text tracking-tight ${mob?"text-base":"text-lg"}`}>{p.name}</div>
            <div className={`text-brand font-semibold mt-1 ${mob?"text-sm":"text-sm"}`}>{p.role}</div>
            <div className="text-xs text-text-3 mt-1.5 leading-snug">Before: {p.from}</div></div>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className="max-w-280 mx-auto">
        {H("Where you'll find us.","Four offices. One country.","Offices")}
        <div className={`grid ${mob?"grid-cols-1 gap-3.5":"grid-cols-2 gap-5"}`}>
          {offices.map(o=><div key={o.city} className="bg-white rounded-3xl overflow-hidden border border-line">
            <div className="bg-bg" style={{aspectRatio:"16/9"}}><SmartScene kind={o.kind} seed={o.city.length} w="100%" h="100%"/></div>
            <div className={mob?"p-6":"p-7"}>
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{o.city}</div>
                <Tag tone="brand" sm>{o.team}</Tag></div>
              <div className="text-sm text-text font-semibold">{o.role}</div>
              <div className="text-sm text-text-2 mt-1.5 flex items-center gap-1.5">
                <I n="pin" s={13} c={C.text3}/>{o.addr}</div></div></div>)}</div>
      </div>
    </section>

    <section className={`bg-white border-y border-line-soft ${padTight}`}>
      <div className="max-w-280 mx-auto text-center">
        <div className={`text-xs font-semibold text-text-3 tracking-widest uppercase ${mob?"mb-6":"mb-7"}`}>
          Backed by</div>
        <div className={`grid ${mob?"grid-cols-2 gap-5":"grid-cols-3 gap-7"} items-center justify-items-center`}>
          {investors.map(v=><div key={v} className={`font-semibold text-text-3 tracking-tight opacity-75 ${mob?"text-base":"text-lg"}`}>{v}</div>)}</div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className="max-w-280 mx-auto">
        {H("Fresh from the blog.","Career tips, hiring data, sector deep dives.","Latest updates")}
        <div className={`grid ${mob?"grid-cols-1 gap-3.5":"grid-cols-3 gap-5"}`}>
          {(SEED_BLOGS||[]).slice(0,3).map(b=><div key={b.id} onClick={()=>{A.setBlog(b.id);A.go("blog");}}
            className="bg-white rounded-3xl overflow-hidden border border-line cursor-pointer transition-transform duration-200 hover:-translate-y-1">
            <div className="bg-bg" style={{aspectRatio:"16/10"}}><SmartScene kind={b.kind||"office"} seed={b.id.length} w="100%" h="100%"/></div>
            <div className={mob?"p-6":"p-7"}>
              <Tag tone="brand" sm>{b.tag||"Insight"}</Tag>
              <div className={`font-bold text-text tracking-tight leading-snug my-3 ${mob?"text-lg":"text-lg"}`}>{b.title}</div>
              <div className="text-sm text-text-3">{b.readMin||5} min read</div></div></div>)}</div>
        <div className="text-center mt-8">
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("blogs")}>All posts</Btn></div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className={`max-w-280 mx-auto grid items-center ${mob?"grid-cols-1 gap-9":"gap-16"}`} style={{gridTemplateColumns:mob?undefined:"1.1fr 1fr"}}>
        <div className="rounded-2xl overflow-hidden shadow-lg border border-line" style={{aspectRatio:"4/3"}}>
          <SmartScene kind="office" seed={2} w="100%" h="100%"/></div>
        <div>
          <Tag tone="brand">We're hiring</Tag>
          <h2 className={`${SECTION_CLS} my-3.5 leading-snug ${mob?"text-3xl":"text-4xl"}`}>
            Come build with us.</h2>
          <p className={`text-text-2 leading-loose mb-7 ${mob?"text-base":"text-lg"}`}>
            Engineers, designers, employer partnerships, support. Remote across Canada. Real ownership from day one.</p>
          <div className="flex flex-col gap-2.5 mb-7">
            {[["Senior Product Engineer","Remote · Full-time"],["Employer Success Manager","Toronto · Full-time"],["Designer, Growth","Remote · Full-time"]].map(([r,l])=>
              <button key={r} onClick={()=>{A.setContactPrefill({topic:"General",msg:`I'm interested in applying for: ${r}.`});A.go("contact");}}
                className="flex justify-between items-center py-3.5 px-5 bg-bg rounded-xl border border-line cursor-pointer text-left w-full hover:border-brand hover:bg-tint transition-colors duration-150">
                <div><div className="text-sm font-semibold text-text">{r}</div>
                  <div className="text-xs text-text-3 mt-1">{l}</div></div>
                <I n="chevR" s={16} c={C.text3}/></button>)}</div>
          <Btn kind="primary" iconR="arrowR" onClick={()=>A.go("contact")}>See all openings</Btn></div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className="max-w-narrow mx-auto">
        {H("Common questions.","Short answers. No sales speak.","FAQ")}
        <div className="bg-white rounded-3xl border border-line overflow-hidden">
          {faq.map(([q,a],i)=><div key={q} className={i<faq.length-1?"border-b border-line-soft":""}>
            <button onClick={()=>setFaqOpen(faqOpen===i?-1:i)} className={`w-full flex justify-between items-center gap-3.5 bg-transparent border-0 cursor-pointer text-left ${mob?"py-5 px-6":"py-6 px-7"}`}>
              <span className={`font-semibold text-text leading-snug tracking-tight ${mob?"text-base":"text-lg"}`}>{q}</span>
              <span className={`text-brand shrink-0 transition-transform duration-200 ${faqOpen===i?"rotate-180":""}`}><I n="chevD" s={19} w={2.2}/></span></button>
            {faqOpen===i&&<div className={`text-text-2 leading-loose ${mob?"pt-0 px-6 pb-6 text-sm":"pt-0 px-7 pb-7 text-base"}`}>{a}</div>}</div>)}</div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className={`max-w-280 mx-auto bg-ink rounded-3xl text-center text-white relative overflow-hidden ${mob?"py-12 px-6":"py-20 px-15"}`}>
        <h2 className={`font-extrabold tracking-tight mb-5 leading-tight ${mob?"text-3xl":"text-5xl"}`}>
          Say hello.</h2>
        <p className={`text-white/70 mx-auto mb-9 max-w-130 leading-snug ${mob?"text-base":"text-lg"}`}>
          A real person, within one business day. From <span className="text-accent font-semibold">support@northhire.ca</span>.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Btn kind="primary" size="lg" icon="mail" onClick={()=>A.go("contact")}>Contact us</Btn>
          <Btn kind="onDark" size="lg" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>Create an account</Btn></div>
      </div>
    </section>
  </div>;
}
export function ContactPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [f,setF]=useState({name:A.user?.name||"",email:A.user?.email||"",
    topic:A.contactPrefill?.topic||"General",msg:A.contactPrefill?.msg||""});
  useEffect(()=>{if(A.contactPrefill)A.setContactPrefill(null);},[]);
  const [err,setErr]=useState({}); const [sent,setSent]=useState(false); const [ticket,setTicket]=useState(null); const [busy,setBusy]=useState(false);
  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const submit=async()=>{const e={};
    if(!f.name.trim())e.name="Required";
    if(!f.email.includes("@"))e.email="Enter a valid email";
    if(f.msg.trim().length<10)e.msg="A bit more, please";
    setErr(e); if(Object.keys(e).length)return;
    setBusy(true);
    const r=await A.submitContact({...f,msg:f.msg.trim()});
    setBusy(false);
    if(!r.ok){setErr({msg:r.msg});return;}
    setTicket(r.ticket); setSent(true);};
  const pad=mob?"py-14 px-4":"py-24 px-8";

  if(sent) return <div className={`bg-white ${pad}`}>
    <div className="max-w-140 mx-auto text-center">
      <div className="w-22 h-22 rounded-full bg-ok-bg border-2 border-ok-ln flex items-center justify-center mx-auto mb-8">
        <I n="check" s={44} c={C.ok} w={2.6}/></div>
      <h1 className={`${HERO_QUIET} mb-5 leading-snug ${mob?"text-3xl":"text-4xl"}`}>Message received.</h1>
      <p className={`text-text-2 leading-snug mx-auto mb-3 max-w-110 ${mob?"text-base":"text-lg"}`}>
        Thanks {f.name.split(" ")[0]}. We'll reply to <strong className="text-text">{f.email}</strong> by end of the next business day.</p>
      {ticket&&<p className="text-sm text-text-3 mx-auto mb-9">Reference this ticket if you follow up: <strong className="text-text font-mono">{ticket}</strong></p>}
      <Btn kind="primary" size="lg" onClick={()=>A.go("home")}>Back to home</Btn></div></div>;

  const topics=[["General","Something else"],["Job seeker","Help with my account"],["Hiring","Sales or demo"],["Report","Suspicious posting"]];
  const offices=[{city:"Toronto",addr:"250 Front St W",phone:"1 888 555 0142"},
    {city:"Calgary",addr:"525 8th Ave SW",phone:"1 888 555 0187"},
    {city:"Montreal",addr:"1250 René-Lévesque",phone:"1 888 555 0219"},
    {city:"Halifax",addr:"1959 Upper Water",phone:"1 888 555 0264"}];

  return <div className="bg-white min-h-full">

    <section className={`bg-white ${pad}`}>
      <div className="max-w-230 mx-auto text-center">
        <Tag tone="brand">Contact us</Tag>
        <h1 className={`${HERO_WIDE} my-6 ${mob?"text-4xl":"text-7xl"}`}>
          Talk to a real person</h1>
        <p className={`text-text-2 leading-snug mx-auto max-w-140 ${mob?"text-lg":"text-xl"}`}>
          Our support team is based in Canada and responds to every message within one business day. Most people hear back the same day.</p>
      </div>
    </section>

    <section className={`bg-white ${mob?"px-4 pb-14":"px-8 pb-24"}`}>
      <div className={`max-w-280 mx-auto grid items-start ${mob?"grid-cols-1 gap-6":"gap-8"}`} style={{gridTemplateColumns:mob?undefined:"1.3fr 1fr"}}>
        <div className={`bg-white border border-line rounded-3xl ${mob?"p-7":"p-11"}`}>
          <div className="mb-7">
            <Lbl>What is this about?</Lbl>
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              {topics.map(([k,label])=>{const on=f.topic===k;
                return <button key={k} onClick={()=>set("topic",k)} className={`${mob?"py-3.5 px-3.5":"py-4 px-5"} rounded-2xl cursor-pointer text-left leading-snug transition-all duration-150 border-2 ${on?"border-brand bg-wash":"border-line bg-white"}`}>
                  <div className={`text-sm ${on?"font-bold text-brand":"font-semibold text-text"}`}>{k}</div>
                  <div className="text-xs text-text-3 font-normal mt-1">{label}</div></button>;})}</div></div>
          <div className="flex flex-col gap-5">
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label="Name" required error={err.name}><Input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Your name" invalid={!!err.name}/></Field>
              <Field label="Email" required error={err.email}><Input icon="mail" type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="you@example.ca" invalid={!!err.email}/></Field></div>
            <Field label="Message" required error={err.msg}>
              <Area rows={7} value={f.msg} onChange={e=>set("msg",e.target.value)} invalid={!!err.msg} placeholder="Tell us what's going on."/></Field>
            <Btn kind="primary" size="lg" icon="send" onClick={submit} disabled={busy}>{busy?"Sending…":"Send message"}</Btn></div>
        </div>

        <div className="flex flex-col gap-4">
          <div className={`bg-bg rounded-2xl border border-line ${mob?"p-6":"p-7"}`}>
            <div className="flex gap-3.5 items-center mb-5">
              <SmartPortrait seed={2} size={56}/>
              <div><div className="text-base font-bold text-text">Priya answers most days</div>
                <div className="text-sm text-text-2 mt-1">Head of Support</div></div></div>
            <div className="text-sm text-text-2 leading-snug mb-5 pb-5 border-b border-line-soft">
              Six of us on the desk. Mon–Fri, 8am–8pm ET. Weekends we check on Monday.</div>
            <div className="flex flex-col gap-3">
              {[["mail","Email","support@northhire.ca"],["phone","Phone","1 888 555 0142"]].map(([ic,k,v])=>
                <div key={v} className="flex gap-3 items-center">
                  <div className="w-9 h-9 rounded-lg bg-white text-brand flex items-center justify-center border border-line"><I n={ic} s={16}/></div>
                  <div><div className="text-xs text-text-3">{k}</div>
                    <div className="text-sm text-text font-semibold mt-px">{v}</div></div></div>)}</div></div>
          <div className={`bg-white rounded-2xl border border-line ${mob?"p-6":"p-7"}`}>
            <Lbl>Looking for help?</Lbl>
            <div className="flex flex-col mt-1.5">
              {[["book","Career resources","blogs"],["cap","Free trainings","trainings"],["building","For employers","forEmployers"],["wallet","Pricing","pricing"]].map(([ic,l,p])=>
                <button key={l} onClick={()=>A.go(p)} className="flex items-center gap-3 justify-between bg-transparent border-0 py-3 cursor-pointer text-sm text-text font-medium border-b border-line-soft">
                  <span className="flex items-center gap-2.5"><I n={ic} s={15} c={C.brand}/>{l}</span>
                  <I n="chevR" s={14} c={C.text3}/></button>)}</div></div>
        </div>
      </div>
    </section>

    <section className={`bg-bg ${pad}`}>
      <div className="max-w-280 mx-auto">
        <div className="text-center max-w-160 mx-auto mb-12">
          <Tag tone="brand">Our offices</Tag>
          <h2 className={`${SECTION_CLS} my-3.5 leading-snug ${mob?"text-3xl":"text-4xl"}`}>
            Or visit us in person.</h2>
          <p className={`text-text-2 leading-snug m-0 ${mob?"text-base":"text-lg"}`}>Four cities. Coffee on us.</p></div>
        <div className={`grid ${mob?"grid-cols-1 gap-3.5":"grid-cols-2 gap-5"}`}>
          {offices.map(o=><div key={o.city} className="bg-white rounded-3xl overflow-hidden border border-line">
            <div className="bg-bg" style={{aspectRatio:"16/9"}}><SmartScene kind={["office","trades","office","care"][offices.indexOf(o)]} seed={o.city.length} w="100%" h="100%"/></div>
            <div className={mob?"p-6":"p-7"}>
              <div className={`font-bold text-text tracking-tight mb-3.5 ${mob?"text-2xl":"text-2xl"}`}>{o.city}</div>
              <div className="flex flex-col gap-2">
                <div className="text-sm text-text-2 flex items-center gap-2"><I n="pin" s={14} c={C.brand}/>{o.addr}</div>
                <div className="text-sm text-text-2 flex items-center gap-2"><I n="phone" s={14} c={C.brand}/>{o.phone}</div></div></div></div>)}</div>
      </div>
    </section>
  </div>;
}
export function LegalPage({kind}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t,locale}=useTranslation();
  const isFr=locale==="fr-CA";
  /* Bill 96 (Loi 96): the Quebec French versions of these two documents. Also published as
     static files at public/legal/{tos,privacy}-fr.md alongside the English -en.md baseline, for
     anyone who wants the raw legal text outside the app (e.g. attached to an email, or reviewed
     by counsel) rather than only reachable through this component. */
  const privacyFr=[["Qui nous sommes","NorthHire Technologies Inc. est une entreprise canadienne dont le siège social est à Toronto, en Ontario. Nous exploitons la plateforme d'emploi NorthHire. La présente politique explique quels renseignements personnels nous recueillons, pourquoi, et ce que vous pouvez faire à ce sujet. Elle est rédigée pour respecter les exigences de la LPRPDE et de la législation provinciale applicable en matière de protection de la vie privée, y compris la Loi 25 du Québec."],
    ["Ce que nous recueillons","Pour les chercheurs d'emploi : votre nom, vos coordonnées, votre statut d'admissibilité au travail, vos antécédents professionnels, vos compétences et certifications, les CV que vous créez, les emplois que vous sauvegardez et les candidatures que vous envoyez. Pour les employeurs : les coordonnées professionnelles, les renseignements sur l'entreprise et les détails de facturation. Pour tous : des données techniques de base telles que le type d'appareil et les pages visitées, utilisées pour assurer le bon fonctionnement du service."],
    ["Pourquoi nous les recueillons","Nous utilisons vos renseignements pour vous jumeler à des postes pertinents, pour transmettre votre candidature à un employeur lorsque vous choisissez de postuler, pour vous informer de l'état de vos candidatures et pour assurer la sécurité de la plateforme. Nous n'utilisons pas votre profil pour entraîner des modèles publicitaires et nous ne vendons pas vos données à des tiers."],
    ["Qui voit vos renseignements","Un employeur ne reçoit votre profil, votre CV et vos réponses que lorsque vous soumettez activement une candidature à son offre. Les employeurs ne peuvent pas consulter votre profil sans votre consentement, à moins que vous n'ayez activé la visibilité du profil dans les Paramètres. Notre propre personnel n'accède aux renseignements personnels que lorsque cela est nécessaire pour le soutien ou la modération, et cet accès est consigné."],
    ["Vos droits","Vous pouvez accéder à vos renseignements personnels, les corriger, les exporter (dans un format lisible par machine) ou les supprimer en tout temps depuis les Paramètres, ou en écrivant à notre responsable de la protection de la vie privée à privacy@northhire.ca. Nous répondons aux demandes d'accès dans un délai de trente jours, sans frais. Les résident·e·s du Québec bénéficient des mêmes droits en vertu de la Loi 25, y compris le droit à la portabilité des données. La suppression de votre compte retire votre profil, vos CV et vos emplois sauvegardés; les candidatures déjà envoyées demeurent chez l'employeur, qui devient responsable de cette copie."],
    ["Responsable de la protection de la vie privée","Conformément à la LPRPDE (fédérale) et à la Loi 25 (Québec), nous avons désigné un responsable de la protection de la vie privée. Contactez-le à privacy@northhire.ca ou par écrit à Responsable de la protection de la vie privée, NorthHire Technologies Inc., 250, rue Front Ouest, Toronto (Ontario) M5V 3G5. Pour les résident·e·s du Québec, il s'agit également de la personne responsable de la protection des renseignements personnels exigée par l'article 3.1 de la Loi 25."],
    ["Où sont stockées vos données","Les renseignements personnels sont stockés dans des centres de données canadiens (AWS ca-central-1, Montréal). Nous ne transférons pas de renseignements personnels à l'extérieur du Canada sans votre consentement explicite. Le traitement des paiements passe par Stripe, qui peut traiter des métadonnées de transaction aux États-Unis dans le cadre d'une entente de traitement des données signée avec eux; les numéros de carte ne touchent jamais nos serveurs."],
    ["Conservation","Les comptes actifs sont conservés tant qu'ils sont utilisés. Les comptes inactifs depuis 36 mois sont supprimés automatiquement après deux avis envoyés à votre courriel enregistré. Les dossiers de candidature sont conservés pendant 24 mois pour appuyer la résolution de différends, puis supprimés."],
    ["Témoins (cookies)","Nous utilisons des témoins strictement nécessaires pour la connexion et la sécurité, ainsi qu'un petit nombre de témoins analytiques pour comprendre quelles parties du produit sont utilisées. Vous pouvez refuser les témoins analytiques sans perdre aucune fonctionnalité."],
    ["Modifications et contact","Nous informerons les utilisateurs enregistrés par courriel au moins quatorze jours avant toute modification importante de cette politique. Les questions ou plaintes peuvent être adressées à privacy@northhire.ca, et vous pouvez également contacter le Commissariat à la protection de la vie privée du Canada."]];
  const termsFr=[["Acceptation","En créant un compte ou en utilisant NorthHire, vous acceptez les présentes conditions. Si vous utilisez la plateforme pour le compte d'un employeur, vous confirmez être autorisé·e à engager cette organisation."],
    ["Comptes des chercheurs d'emploi","Les comptes sont gratuits et personnels. Vous êtes responsable de l'exactitude des renseignements sur votre profil, y compris toute certification que vous prétendez détenir. Le fait de déformer un permis, une carte de compétence ou une inscription entraîne un retrait immédiat."],
    ["Comptes des employeurs","Les employeurs doivent publier des offres réelles avec une fourchette salariale véritable, ne doivent exiger aucuns frais des candidat·e·s, et doivent se conformer à toute la législation applicable en matière de droits de la personne et de normes d'emploi. Les offres qui demandent un paiement, exigent des renseignements financiers personnels ou font preuve de discrimination fondée sur un motif protégé sont retirées et le compte est suspendu."],
    ["Contenu que vous fournissez","Vous conservez la propriété de tout ce que vous téléversez, y compris vos CV et le contenu de votre profil. Vous nous accordez une licence limitée pour afficher ce contenu aux employeurs auprès desquels vous postulez et pour exploiter le service. Vous pouvez le retirer en tout temps en le supprimant."],
    ["Contenu que nous fournissons","Les articles, formations et autres documents publiés sur NorthHire sont à titre informatif général. Ils ne constituent pas des conseils juridiques, financiers, d'immigration ou médicaux, et les exigences de certification varient selon la province — vérifiez toujours auprès de l'organisme de réglementation concerné."],
    ["Disponibilité","Nous visons une disponibilité continue mais ne la garantissons pas. Nous pouvons suspendre le service à des fins de maintenance, et nous donnerons un avis lorsqu'une interruption planifiée devrait être importante."],
    ["Responsabilité","Dans la mesure permise par la loi, NorthHire n'est pas responsable des décisions d'embauche prises par les employeurs, de l'exactitude du contenu des offres fourni par les employeurs, ni des pertes indirectes découlant de l'utilisation de la plateforme."],
    ["Client·e·s agence de placement","Lorsque NorthHire est utilisé par une agence de placement, une agence de placement temporaire ou un·e recruteur·euse, ce·tte client·e est seul·e responsable de détenir le·s permis exigé·s par la province où il·elle exerce — notamment le permis d'agence de placement temporaire et de recrutement de l'Ontario, le permis d'agence de placement de personnel de la CNESST au Québec, le permis d'agence de placement de la Colombie-Britannique, le permis d'agence de placement de l'Alberta, l'enregistrement d'agence de placement du Manitoba ou son permis de recrutement de travailleur·euse·s étranger·ère·s, le permis de recrutement de travailleur·euse·s étranger·ère·s de la Nouvelle-Écosse, ainsi que toute exigence équivalente dans d'autres provinces. NorthHire fournit le logiciel, non le service de placement licencié, et ne garantit pas le statut du permis d'un·e client·e."],
    ["Renouvellement automatique","Les abonnements payants se renouvellent automatiquement à la fin de chaque terme (mensuel ou annuel) au tarif alors en vigueur. Nous enverrons un avis écrit par courriel au moins 30 jours avant tout renouvellement qui modifie le prix ou le terme. Vous pouvez annuler en tout temps depuis Facturation; l'annulation empêche le renouvellement suivant et ne rembourse pas le terme en cours à moins que la loi provinciale applicable en matière de protection du consommateur ne l'exige."],
    ["Loi applicable","Les présentes conditions sont régies par les lois de la province de l'Ontario et les lois fédérales du Canada qui s'y appliquent."]];
  const privacy=[["Who we are","NorthHire Technologies Inc. is a Canadian company headquartered in Toronto, Ontario. We operate the NorthHire job platform. This policy explains what personal information we collect, why, and what you can do about it. It is written to meet the requirements of PIPEDA and applicable provincial privacy legislation."],
    ["What we collect","For job seekers: your name, contact details, work eligibility status, employment history, skills and certifications, the CVs you build, the jobs you save and the applications you send. For employers: business contact details, company information and billing details. For everyone: basic technical data such as device type and pages visited, used to keep the service working."],
    ["Why we collect it","We use your information to match you to relevant openings, to send your application to an employer when you choose to apply, to notify you about your applications, and to keep the platform secure. We do not use your profile to train advertising models and we do not sell your data to third parties."],
    ["Who sees your information","An employer only receives your profile, CV and answers when you actively submit an application to their posting. Employers cannot browse your profile without your consent unless you have switched profile visibility on in Settings. Our own staff access personal data only where necessary for support or moderation, and that access is logged."],
    ["Your rights","You may access, correct, export (in a machine-readable format) or delete your personal information at any time from Settings, or by writing to our Privacy Officer at privacy@northhire.ca. We respond to access requests within thirty days at no cost. Quebec residents have the same rights under Law 25, including data portability. Deleting your account removes your profile, CVs and saved jobs; applications already sent remain with the employer, who becomes the controller of that copy."],
    ["Privacy Officer","Under PIPEDA (federal) and Law 25 (Quebec), we have named a Privacy Officer accountable for our privacy practices. Contact them at privacy@northhire.ca or in writing at Privacy Officer, NorthHire Technologies Inc., 250 Front Street West, Toronto, ON M5V 3G5. For Quebec residents, this is also the person in charge of the protection of personal information required by Law 25 section 3.1."],
    ["Where your data lives","Personal information is stored in Canadian data centres (AWS ca-central-1, Montreal). We do not transfer personal information outside Canada without your explicit consent. Payment processing runs through Stripe, which may process transaction metadata in the United States under a data-processing agreement we have signed with them; card numbers themselves never touch our servers."],
    ["Retention","Active accounts are retained while in use. Accounts inactive for 36 months are deleted automatically after two notices to your registered email. Application records are retained for 24 months to support dispute resolution, then removed."],
    ["Cookies","We use strictly necessary cookies for sign-in and security, and a small number of analytics cookies to understand which parts of the product are used. You can decline analytics cookies without losing any functionality."],
    ["Changes and contact","We will notify registered users by email at least fourteen days before any material change to this policy. Questions or complaints can be directed to privacy@northhire.ca, and you may also contact the Office of the Privacy Commissioner of Canada."]];
  const terms=[["Acceptance","By creating an account or using NorthHire you agree to these terms. If you are using the platform on behalf of an employer, you confirm you are authorised to bind that organisation."],
    ["Job seeker accounts","Accounts are free and personal to you. You are responsible for the accuracy of the information on your profile, including any certification you claim to hold. Misrepresenting a licence, ticket or registration is grounds for immediate removal."],
    ["Employer accounts","Employers must post genuine openings with a real pay range, must not charge applicants any fee, and must comply with all applicable human rights and employment standards legislation. Postings that request payment, require personal financial information, or discriminate on a protected ground are removed and the account is suspended."],
    ["Content you provide","You keep ownership of everything you upload, including your CVs and profile content. You grant us a limited licence to display that content to employers you apply to and to operate the service. You may withdraw it at any time by deleting it."],
    ["Content we provide","Articles, trainings and other material published on NorthHire are for general information. They are not legal, financial, immigration or medical advice, and certification requirements change by province — always confirm with the relevant regulator."],
    ["Availability","We aim for continuous availability but do not guarantee it. We may suspend the service for maintenance, and we will give notice where a planned interruption is expected to be significant."],
    ["Liability","To the extent permitted by law, NorthHire is not liable for hiring decisions made by employers, for the accuracy of employer-supplied listing content, or for indirect losses arising from use of the platform."],
    ["Staffing-agency customers","Where NorthHire is used by a staffing agency, temporary help agency, or recruiter, that customer is solely responsible for holding whatever licence(s) their operating province requires — including Ontario's Temporary Help Agency and Recruiter licence, Quebec's CNESST personnel-placement-agency licence, BC's Employment Agency Licence, Alberta's Employment Agency Licence, Manitoba's employment-agency-business registration or foreign-worker-recruitment licence, Nova Scotia's foreign-worker recruiter licence, and any equivalent requirement in other provinces. NorthHire provides the software, not the licensed placement service, and does not warrant a customer's own licensing status."],
    ["Auto-renewal","Paid subscriptions renew automatically at the end of each term (monthly or annual) at the then-current price. We will send a written notice by email at least 30 days before any renewal that changes the price or term. You can cancel at any time from Billing; cancellation stops the next renewal and does not refund the current term unless required by applicable consumer-protection law in your province."],
    ["Governing law","These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable there."]];
  const data=kind==="privacy"?(isFr?privacyFr:privacy):(isFr?termsFr:terms);
  const titleEn=kind==="privacy"?"Privacy policy":"Terms of service";
  const titleFr=kind==="privacy"?"Politique de confidentialité":"Conditions d'utilisation";
  return <div className="bg-bg min-h-full">
    <div className="bg-white border-b border-line">
      <div className={`max-w-200 mx-auto ${mob?"pt-5 px-4 pb-6":"pt-9 px-6 pb-8"}`}>
        <Tag tone="brand" sm icon={kind==="privacy"?"lock":"file"}>{isFr?(kind==="privacy"?"Confidentialité":"Légal"):(kind==="privacy"?"Privacy":"Legal")}</Tag>
        <h1 className={`${HERO_QUIET} mt-3.5 mb-2.5 ${mob?"text-3xl":"text-4xl"}`}>
          {isFr?titleFr:titleEn}</h1>
        <p className="text-sm text-text-2 m-0">{isFr?`${t("legal.lastUpdated")} : 1 août 2026 • En vigueur pour tous les utilisateurs au Canada`:"Last updated 1 August 2026 • Effective for all users in Canada"}</p></div></div>
    <div className={`max-w-200 mx-auto ${mob?"pt-4 px-4 pb-8":"pt-7 px-6 pb-12"}`}>
      <Card pad={mob?20:32}>
        <div className="mb-7 pb-5 border-b border-line-soft">
          <Lbl>{isFr?"Sur cette page":"On this page"}</Lbl>
          <div className="flex flex-wrap gap-2">
            {data.map(([h])=><Tag key={h} sm>{h}</Tag>)}</div></div>
        {data.map(([h,p],i)=><section key={h} className={i===data.length-1?"mb-0":"mb-7"}>
          <h2 className={`font-bold tracking-tight text-text mb-2.5 ${mob?"text-lg":"text-xl"}`}>{i+1}. {h}</h2>
          <p className="text-base text-text-2 leading-loose m-0">{p}</p></section>)}
        <div className="mt-8 pt-6 border-t border-line-soft flex gap-2.5 flex-wrap">
          <Btn kind="outline" onClick={()=>A.go(kind==="privacy"?"terms":"privacy")}>
            {isFr
              ? `Lire ${kind==="privacy"?"les conditions d'utilisation":"la politique de confidentialité"}`
              : `Read the ${kind==="privacy"?"terms of service":"privacy policy"}`}</Btn>
          <Btn kind="ghost" onClick={()=>A.go("contact")}>{isFr?"Nous contacter à ce sujet":"Contact us about this"}</Btn></div></Card></div></div>;
}

export function PricingPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const plansData=[
    {name:"Free",tag:"planFreeTag",summary:"planFreeSummary",features:["1 active job posting","Applicant pipeline with match scoring","Basic analytics","Verified employer badge","Email support"]},
    {name:"Growth",tag:"planGrowthTag",summary:"planGrowthSummary",features:["10 active job postings","Unlimited applications","Direct candidate messaging","Interview scheduling","Talent pool (reverse match)","CSV bulk job import","Full analytics dashboard","2 featured job upgrades per month","Employer branded page","5 recruiter seats","Priority support"]},
    {name:"Enterprise",tag:"planEnterpriseTag",summary:"planEnterpriseSummary",features:["Unlimited job postings & applications","Unlimited featured upgrades","Unlimited recruiter seats","Full analytics with trend history","Custom employer branding (colors, hero)","API access","Single Sign-On (OIDC)","Dedicated account manager","","NorthHire HR Suite included:","• Employee directory & profiles","• Attendance & punch-in/out","• Leave management & approvals","• Tasks, calendar, events & trainings","• Internal chat (1:1 & groups)","• Invoices, salary, notifications","• Role management (Admin/HR/Finance/Employee)","• Feature toggles per module","• Sync with public NorthHire profiles"]}
  ];
  const plans=plansData.map(pd=>({n:pd.name,p:A.PLANS[pd.name].price,best:pd.name==="Growth",tag:t(`pricing.${pd.tag}`),summary:t(`pricing.${pd.summary}`),f:pd.features}));
  const faqKeys=["faq1","faq2","faq3","faq4","faq5","faq6","faq7"];
  const faq=faqKeys.map(k=>[t(`pricing.${k}Q`),t(`pricing.${k}A`)]);
  const [open,setOpen]=useState(-1);
  // Annual billing gets 15% off. When the toggle is on `choosePlan` passes billingCycle="annual"
  // to startCheckout which passes it through to the server, so Stripe issues a real annual
  // subscription at the discounted rate (server/stripe.js:createCheckoutSession is the authority
  // on the discount %; keep this constant in sync if the server changes it).
  const [billing,setBilling]=useState("monthly");
  const annualPct=0.15;
  const pad=mob?"py-14 px-4":"py-24 px-8";
  const currentPlan=A.company?.plan||null;

  return <div className="bg-white min-h-full">

    <section className={`bg-white ${pad}`}>
      <div className="max-w-240 mx-auto text-center">
        <Tag tone="brand">{t("pricing.tag")}</Tag>
        <h1 className={`${HERO_WIDE} my-6 mx-auto max-w-narrow ${mob?"text-4xl":"text-7xl"}`}>
          {t("pricing.title")}</h1>
        <p className={`text-text-2 leading-snug mx-auto max-w-150 ${mob?"text-lg":"text-xl"}`}>
          {t("pricing.subtitle")}</p>
      </div>
    </section>

    <section className={`bg-white ${mob?"px-4 pb-14":"px-8 pb-24"}`}>
      <div className="max-w-300 mx-auto">
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-bg border border-line rounded-full p-1">
            {[["monthly",t("pricing.billingMonthly")],["annual",t("pricing.billingAnnual")]].map(([v,l])=>
              <button key={v} onClick={()=>setBilling(v)}
                className={`text-sm font-semibold py-2 px-5 rounded-full transition-colors duration-150 ${billing===v?"bg-white text-brand shadow-sm":"text-text-2 bg-transparent"}`}>{l}</button>)}
          </div>
        </div>
        <div className={`grid items-stretch ${mob?"grid-cols-1 gap-3.5":"grid-cols-3 gap-5"}`}>
          {plans.map(p=>{const isCurrent=currentPlan===p.n;
          return <div key={p.n} className="bg-white rounded-3xl overflow-hidden relative flex flex-col" style={{border:`${p.best?2:1}px solid ${p.best?C.brand:C.line}`,boxShadow:p.best?SH.lg:"none"}}>
            {p.best&&<div className="bg-brand text-white text-center text-xs font-bold py-2.5 px-3 tracking-wide uppercase">{p.tag}</div>}
            <div className={`flex-1 flex flex-col ${mob?"p-7":"p-9"}`}>
              {!p.best&&<div className="text-xs font-semibold text-text-3 tracking-wide uppercase mb-3.5">{p.tag}</div>}
              <div className={`font-bold text-text tracking-tight mb-2 ${mob?"text-2xl":"text-3xl"}`}>{p.n}</div>
              <div className={`text-sm text-text-2 leading-snug mb-5 ${mob?"":"min-h-11"}`}>{p.summary}</div>
              <div className="flex items-baseline gap-1.5 mb-6 pb-6 border-b border-line-soft flex-wrap">
                <span className={`font-extrabold text-text tracking-tight leading-none ${mob?"text-5xl":"text-6xl"}`}>${billing==="annual"&&p.p>0?Math.round(p.p*(1-annualPct)):p.p}</span>
                <span className="text-base text-text-3">{p.p===0?t("pricing.forever"):t("pricing.perMonth")}</span>
                {billing==="annual"&&p.p>0&&<span className="text-xs text-text-3 basis-full mt-1">{t("pricing.billedAnnually",{price:Math.round(p.p*(1-annualPct)*12).toLocaleString(),savings:Math.round(p.p*annualPct*12).toLocaleString()})}</span>}
              </div>
              <div className="flex flex-col gap-3 mb-7 flex-1">
                {p.f.map((x,i)=>{if(!x)return <div key={i} className="h-2"/>;
                  const isHeader=x.endsWith(":");
                  if(isHeader)return <div key={x} className="text-xs font-bold text-brand tracking-wide uppercase mt-1.5">{x.slice(0,-1)}</div>;
                  const isSubItem=x.startsWith("• ");
                  return <div key={x} className={`flex gap-2.5 text-sm leading-snug ${isSubItem?"text-text-2 pl-1":"text-text pl-0"}`}>
                    {!isSubItem&&<span className="text-ok shrink-0 flex mt-0.5"><I n="check" s={16} w={2.6}/></span>}
                    <span>{isSubItem?x.slice(2):x}</span></div>;})}</div>
              <Btn kind={isCurrent?"outline":p.best?"primary":"outline"} size="lg" full disabled={isCurrent} onClick={()=>A.choosePlan(p.n,billing)}>
                {isCurrent?t("pricing.currentPlan"):p.p===0?t("pricing.startFreeBtn"):t("pricing.chooseBtn",{plan:p.n})}</Btn></div></div>;})}</div>
      </div>
    </section>

    <section className={`bg-bg border-t border-line ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-280 mx-auto">
        <div className={`text-center ${mob?"mb-7":"mb-11"}`}>
          <h2 className={`${SECTION_CLS} mb-3.5 leading-snug ${mob?"text-2xl":"text-4xl"}`}>
            {t("pricing.compareFeaturesTitle")}</h2>
          <p className={`text-text-2 leading-snug m-0 ${mob?"text-base":"text-lg"}`}>{t("pricing.compareFeaturesDesc")}</p></div>
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{minWidth:mob?540:720}}>
              <thead><tr className="bg-bg border-b border-line">
                <th className={`text-left text-xs font-bold text-text-3 tracking-wide uppercase ${mob?"py-3.5 px-4":"py-5 px-6"}`}>{t("pricing.featureColumn")}</th>
                {plans.map(p=><th key={p.n} className={`text-center text-sm font-bold ${mob?"py-3.5 px-3":"py-5 px-5"} ${p.best?"text-brand":"text-text"}`}>{p.n}</th>)}
              </tr></thead>
              <tbody>
                {[["Live job postings","1","10","Unlimited"],
                  ["Applications","30/mo","Unlimited","Unlimited"],
                  ["Applicant pipeline","✓","✓","✓"],
                  ["AI match scoring","✓","✓","✓"],
                  ["Analytics","Basic","Full","Full + trends"],
                  ["Recruiter seats","1","5","Unlimited"],
                  ["Direct candidate messaging","—","✓","✓"],
                  ["Interview scheduling","—","✓","✓"],
                  ["Talent pool (reverse match)","—","✓","✓"],
                  ["CSV bulk job import","—","✓","✓"],
                  ["Featured job upgrades","—","2/mo","Unlimited"],
                  ["Branded employer page","—","✓","✓ + custom colors"],
                  ["API access","—","—","✓"],
                  ["Single Sign-On (OIDC)","—","—","✓"],
                  ["Dedicated account manager","—","—","✓"],
                  ["NorthHire HR Suite","—","—","✓ Full"]].map((row,i)=>
                  <tr key={row[0]} className={i<15?"border-b border-line-soft":""}>
                    <td className={`text-sm text-text font-medium ${mob?"py-3 px-4":"py-3.5 px-6"}`}>{row[0]}</td>
                    {row.slice(1).map((v,k)=><td key={k} className={`text-center text-sm ${mob?"py-3 px-3":"py-3.5 px-5"} ${v==="—"?"text-text-3 font-normal":"text-text font-semibold"}`}>{v==="✓"?<span className="text-ok inline-flex"><I n="check" s={16} w={2.8}/></span>:v}</td>)}
                  </tr>)}
              </tbody></table></div></div>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className={`max-w-narrow mx-auto bg-ink text-white rounded-3xl text-center ${mob?"py-9 px-6":"py-14 px-15"}`}>
        <Tag tone="onDark">{t("pricing.hrSuiteTag")}</Tag>
        <h2 className={`font-bold tracking-tight my-3.5 leading-snug ${mob?"text-2xl":"text-3xl"}`}>
          {t("pricing.hrSuiteTitle")}</h2>
        <p className={`text-white/70 leading-relaxed mx-auto mb-7 max-w-130 ${mob?"text-base":"text-lg"}`}>
          {t("pricing.hrSuiteDesc")}</p>
        <Btn kind="onDark" size="lg" onClick={()=>A.choosePlan("Enterprise")}>{t("pricing.hrSuiteBtn")}</Btn>
      </div>
    </section>

    <section className={`bg-bg border-t border-line ${pad}`}>
      <div className={`max-w-narrow mx-auto bg-white rounded-3xl text-center border border-line ${mob?"py-10 px-7":"py-14 px-15"}`}>
        <div className="w-16 h-16 rounded-full bg-ok-bg text-ok flex items-center justify-center mx-auto mb-6">
          <I n="heart" s={30}/></div>
        <h2 className={`${SECTION_CLS} mb-3.5 leading-snug ${mob?"text-2xl":"text-4xl"}`}>
          {t("pricing.seekersTitle")}</h2>
        <p className={`text-text-2 leading-relaxed mx-auto mb-8 max-w-120 ${mob?"text-base":"text-lg"}`}>
          {t("pricing.seekersDesc")}</p>
        <Btn kind="primary" size="lg" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>{t("pricing.seekersBtn")}</Btn>
      </div>
    </section>

    <section className={`bg-white ${pad}`}>
      <div className="max-w-narrow mx-auto">
        <div className="text-center mb-9">
          <Tag tone="brand">{t("pricing.faqTag")}</Tag>
          <h2 className={`${SECTION_CLS} mt-3.5 leading-snug ${mob?"text-2xl":"text-4xl"}`}>
            {t("pricing.faqTitle")}</h2></div>
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          {faq.map(([q,a],i)=><div key={q} className={i<faq.length-1?"border-b border-line-soft":""}>
            <button onClick={()=>setOpen(open===i?-1:i)} className={`w-full flex justify-between items-center gap-3.5 bg-transparent border-0 cursor-pointer text-left ${mob?"py-5 px-6":"py-6 px-7"}`}>
              <span className={`font-semibold text-text leading-snug tracking-tight ${mob?"text-base":"text-lg"}`}>{q}</span>
              <span className={`text-brand shrink-0 transition-transform duration-200 ${open===i?"rotate-180":""}`}><I n="chevD" s={19} w={2.2}/></span></button>
            {open===i&&<div className={`text-text-2 leading-loose ${mob?"pt-0 px-6 pb-6 text-sm":"pt-0 px-7 pb-7 text-base"}`}>{a}</div>}</div>)}</div>
      </div>
    </section>

  </div>;
}


export function AccessibilityPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const secs=[
    ["Our commitment","NorthHire is committed to providing an accessible, inclusive experience for every person in Canada. We aim to meet or exceed WCAG 2.1 Level AA and comply with the Accessibility for Ontarians with Disabilities Act (AODA), the Accessible Canada Act (ACA), and provincial accessibility legislation across Canada."],
    ["Conformance status","NorthHire has been evaluated against Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. Our design system enforces keyboard-visible focus rings on every interactive element (via :focus-visible, so the ring appears on Tab but not on click), a skip-to-main-content link on every page reachable by pressing Tab from a cold load, semantic landmark regions (header, nav, main, footer), meaningful heading order, and text contrast ratios of at least 4.5:1 for body text and 3:1 for large text against the palette tokens defined in the design system."],
    ["Known gaps","We do not claim full conformance. Areas we continue to work on: a formal component-library conformance report per primitive; an independent third-party audit; automated axe-core regression checks in CI. We treat every accessibility issue reported by a user as a real bug on the same track as any other product bug."],
    ["What we do","Every new feature we ship goes through an accessibility review. Colours meet contrast ratios. Interactive elements are reachable by keyboard. Media includes captions or transcripts. Forms surface errors clearly with instructions on how to fix them. Alternative text is provided for meaningful images."],
    ["Assistive technology","NorthHire is tested with screen readers (NVDA, JAWS, VoiceOver), voice control (Voice Access, Dragon), and screen magnifiers (ZoomText, macOS Zoom). Text can be resized up to 200 percent without loss of function."],
    ["Documents and content","Blog articles, job postings and training materials are structured with semantic headings and reading order. Downloadable documents are provided in accessible PDF or HTML formats where possible."],
    ["Feedback","If you encounter an accessibility barrier or need content in an alternate format, please reach us at accessibility@northhire.ca or call 1-800-555-2626 (toll-free, TTY available). We aim to respond within two business days."],
    ["Multi-year plan","Our accessibility plan is reviewed annually and is available on request. Progress reports are published each October."],
  ];
  return <Page>
    <div className="max-w-narrow mx-auto">
      <Tag tone="brand" icon="shield">Accessibility</Tag>
      <h1 className={`${HERO_QUIET} mt-5 mb-3 ${mob?"text-3xl":"text-4xl"}`}>Accessibility statement (AODA)</h1>
      <p className="text-base text-text-3 mb-9">Last reviewed: August 2026</p>
      {secs.map(([h,b])=><div key={h} className="mb-7">
        <h2 className="text-xl font-bold text-text tracking-tight mb-2.5">{h}</h2>
        <p className="text-base text-text-2 leading-loose m-0">{b}</p>
      </div>)}
    </div>
  </Page>;
}

export function PipedaPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const secs=[
    ["What PIPEDA is","The Personal Information Protection and Electronic Documents Act (PIPEDA) is Canada's federal private-sector privacy law. It sets ground rules for how organisations handle personal information in the course of commercial activity."],
    ["How NorthHire complies","NorthHire is subject to PIPEDA and provincial equivalents (Quebec's Law 25, Alberta's PIPA, BC's PIPA). We collect only what we need to run the platform, we tell you why, we ask before we use your information for anything else, and we let you access, correct or delete what we hold."],
    ["Your rights","You can request a copy of everything we hold about you, ask us to correct anything that is wrong, withdraw consent for optional processing, and request deletion of your account. Requests are handled within thirty days at no cost."],
    ["Data storage","NorthHire data is stored in Canadian data centres operated by AWS in ca-central-1 (Montreal). We do not transfer personal information outside Canada without your explicit consent."],
    ["Sharing","Employer accounts see the information you choose to include in applications you send them. That copy becomes theirs under PIPEDA and their own privacy policies apply. We do not sell personal information. We do not use it for advertising."],
    ["Breach notification","If we discover a breach that poses a real risk of significant harm, we will notify affected users and the Office of the Privacy Commissioner of Canada as required by PIPEDA."],
    ["Contact","Privacy questions or requests: privacy@northhire.ca or write to Privacy Officer, NorthHire Technologies Inc., 250 Front Street West, Toronto, ON M5V 3G5."],
  ];
  return <Page>
    <div className="max-w-narrow mx-auto">
      <Tag tone="brand" icon="lock">Privacy law</Tag>
      <h1 className={`${HERO_QUIET} mt-5 mb-3 ${mob?"text-3xl":"text-4xl"}`}>PIPEDA compliance</h1>
      <p className="text-base text-text-3 mb-9">Last reviewed: August 2026</p>
      {secs.map(([h,b])=><div key={h} className="mb-7">
        <h2 className="text-xl font-bold text-text tracking-tight mb-2.5">{h}</h2>
        <p className="text-base text-text-2 leading-loose m-0">{b}</p>
      </div>)}
      <div className="bg-bg border border-line rounded-xl p-5 mt-8">
        <div className="text-sm font-bold text-text mb-1.5">Full privacy policy</div>
        <p className="text-sm text-text-2 mb-3 leading-snug">Detailed disclosures on collection, use, retention and third-party processors are in our full policy.</p>
        <Btn kind="outline" size="sm" onClick={()=>A.go("privacy")}>Read the full privacy policy</Btn>
      </div>
    </div>
  </Page>;
}

const OSS_CREDITS=[
  {name:"OpenStreetMap",role:"Map data & tiles",url:"openstreetmap.org",
   note:"Powers job-search radius search and the map view. Free and open, no account or key required. The standard tile server has a fair-use policy for light traffic like this — a high-traffic production deployment should switch to a dedicated tile provider or self-host, not because of any cost, but as good etiquette to a free public service.",
   unlimited:false},
  {name:"Nominatim",role:"Geocoding (place name → coordinates)",url:"nominatim.org",
   note:"Turns \"Toronto, ON\" into real coordinates for both new job listings and radius search. Free, no key. Its usage policy caps requests at roughly one per second — NorthHire's server enforces that limit itself and caches every result, so it's never actually hit in normal use.",
   unlimited:false},
  {name:"Leaflet",role:"Interactive map rendering",url:"leafletjs.com",
   note:"The map-view library itself — MIT licensed, runs entirely in the browser, no service calls, no limits of any kind.",
   unlimited:true},
  {name:"Nodemailer + Ethereal Email",role:"Email delivery",url:"nodemailer.com / ethereal.email",
   note:"Sends every real email this app sends (password resets, sign-in codes, invites, HR/staffing notifications) to a free sandboxed test inbox — genuinely transmitted over SMTP, never to a real recipient, which is also the responsible choice for a demo with no verified sending domain. Free and unlimited by design.",
   unlimited:true},
  {name:"@dnd-kit",role:"Drag-and-drop (kanban boards)",url:"dndkit.com",
   note:"Powers the draggable hiring-pipeline and task boards. MIT licensed, runs entirely in the browser, no limits.",
   unlimited:true},
  {name:"pdf-parse & mammoth",role:"Resume text extraction",url:"npm",
   note:"Read the text out of an uploaded PDF or Word résumé for the CV builder's import feature. Open-source libraries, run entirely on our own server, no external service call and no limits.",
   unlimited:true},
];
export function CreditsPage(){
  const mob=useMedia("(max-width: 900px)");
  return <Page>
    <div className="max-w-narrow mx-auto">
      <Tag tone="brand" icon="heart">Open source</Tag>
      <h1 className={`${HERO_QUIET} mt-5 mb-3 ${mob?"text-3xl":"text-4xl"}`}>Built with open source</h1>
      <p className="text-base text-text-2 leading-loose mb-9">NorthHire runs on a foundation of free, open-source software. In the spirit of the licences and services below, here's what we use and how — including where a service's fair-use policy shapes how we call it, not just whether it's free.</p>
      <div className="flex flex-col gap-4">
        {OSS_CREDITS.map(c=><div key={c.name} className="border border-line rounded-xl p-5">
          <div className="flex justify-between items-start gap-3 flex-wrap mb-1.5">
            <div className="text-base font-bold text-text">{c.name}</div>
            <Tag tone={c.unlimited?"ok":"warn"} sm>{c.unlimited?"No usage limits":"Free, fair-use policy"}</Tag>
          </div>
          <div className="text-sm text-text-3 mb-2">{c.role} · {c.url}</div>
          <p className="text-sm text-text-2 leading-relaxed m-0">{c.note}</p>
        </div>)}
      </div>
      <div className="bg-bg border border-line rounded-xl p-5 mt-8">
        <div className="text-sm font-bold text-text mb-1.5">Map data attribution</div>
        <p className="text-sm text-text-2 leading-snug m-0">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-brand font-semibold">OpenStreetMap</a> contributors, available under the Open Database Licence.</p>
      </div>
    </div>
  </Page>;
}

/* /security — vulnerability disclosure policy (Compliance Register sec4). A short, standard
   safe-harbour + reporting page so security researchers know exactly where to send a finding
   and that we won't pursue legal action for good-faith reports. */
export function SecurityPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t,locale}=useTranslation();
  const isFr=locale==="fr-CA";
  const secsEn=[
    ["Reporting a vulnerability","If you believe you have found a security vulnerability in NorthHire, please email security@northhire.ca with a description of the issue and steps to reproduce. If you would like to encrypt your report, request our PGP public key and we will send it before you share details. We aim to acknowledge every report within two business days and to update you on our progress at least every seven days until it is resolved."],
    ["Safe harbour","We will not pursue legal action against a researcher for good-faith security research that: (a) sticks to a single test account you own; (b) does not intentionally access, modify, or exfiltrate other users' data; (c) does not degrade or interrupt the service for other users; (d) gives us a reasonable amount of time to fix the issue before public disclosure. Automated scans that generate significant traffic must be coordinated with us in advance."],
    ["Scope","In scope: the northhire.ca web application, its authenticated APIs, and the staffing-agency portal. Out of scope: reports about the absence of security headers on marketing/static pages where they have no security impact; social-engineering of NorthHire staff or customers; physical attacks; denial-of-service; findings requiring already-compromised accounts or physical device access; and findings on third-party services we depend on (Stripe, our email provider) — please report those directly to the vendor."],
    ["What we do not offer","We do not currently run a paid bug-bounty program. We do publicly credit researchers who submit valid, previously-unknown reports if they wish to be named, once the issue is fixed."],
    ["PGP / signed correspondence","Available on request. Ask for it in your first email if you would like your follow-up messages to us signed and encrypted."],
  ];
  const secsFr=[
    ["Signaler une vulnérabilité","Si vous croyez avoir trouvé une vulnérabilité de sécurité dans NorthHire, veuillez écrire à security@northhire.ca avec une description du problème et les étapes pour le reproduire. Si vous souhaitez chiffrer votre rapport, demandez notre clé publique PGP et nous vous l'enverrons avant que vous ne partagiez les détails. Nous visons à accuser réception de chaque rapport dans les deux jours ouvrables et à vous tenir informé·e de nos progrès au moins tous les sept jours jusqu'à sa résolution."],
    ["Zone de sécurité","Nous n'intenterons pas de poursuites contre un·e chercheur·euse pour de la recherche de sécurité de bonne foi qui : (a) reste confinée à un seul compte de test que vous possédez; (b) n'accède pas intentionnellement aux données d'autres utilisateur·trice·s, ne les modifie pas et ne les exfiltre pas; (c) ne dégrade pas et n'interrompt pas le service pour les autres utilisateur·trice·s; (d) nous accorde un délai raisonnable pour corriger le problème avant toute divulgation publique. Les analyses automatisées qui génèrent un trafic important doivent être coordonnées avec nous à l'avance."],
    ["Portée","Sont dans le périmètre : l'application web northhire.ca, ses API authentifiées et le portail d'agence de placement. Hors périmètre : les rapports sur l'absence d'en-têtes de sécurité sur les pages marketing/statiques où ils n'ont aucun impact de sécurité; l'ingénierie sociale du personnel ou de la clientèle de NorthHire; les attaques physiques; les dénis de service; les constats qui nécessitent des comptes déjà compromis ou un accès physique à un appareil; et les constats sur des services tiers dont nous dépendons (Stripe, notre fournisseur de courriel) — veuillez signaler ceux-ci directement au fournisseur."],
    ["Ce que nous n'offrons pas","Nous n'exploitons pas actuellement de programme rémunéré de prime aux bogues. Nous créditons publiquement les chercheur·euse·s qui soumettent des rapports valides et jusque-là inconnus, s'ils·elles souhaitent être nommé·e·s, une fois le problème corrigé."],
    ["PGP / correspondance signée","Disponible sur demande. Demandez-la dans votre premier courriel si vous souhaitez que nos messages de suivi soient signés et chiffrés."],
  ];
  const secs=isFr?secsFr:secsEn;
  return <Page>
    <div className="max-w-narrow mx-auto">
      <Tag tone="brand" icon="shield">{isFr?"Sécurité":"Security"}</Tag>
      <h1 className={`${HERO_QUIET} mt-5 mb-3 ${mob?"text-3xl":"text-4xl"}`}>{isFr?"Divulgation responsable des vulnérabilités":"Responsible vulnerability disclosure"}</h1>
      <p className="text-base text-text-3 mb-9">{isFr?"Dernière révision : septembre 2026":"Last reviewed: September 2026"}</p>
      {secs.map(([h,b])=><div key={h} className="mb-7">
        <h2 className="text-xl font-bold text-text tracking-tight mb-2.5">{h}</h2>
        <p className="text-base text-text-2 leading-loose m-0">{b}</p>
      </div>)}
      <div className="bg-bg border border-line rounded-xl p-5 mt-8">
        <div className="text-sm font-bold text-text mb-1.5">{isFr?"Contact":"Contact"}</div>
        <p className="text-sm text-text-2 mb-0 leading-snug">security@northhire.ca</p>
      </div>
    </div>
  </Page>;
}
