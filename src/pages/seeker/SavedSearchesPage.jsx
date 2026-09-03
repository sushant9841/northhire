import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Tag, Switch, Empty } from "../../design/primitives.jsx";
import { CATM } from "../../store/seed/constants.js";
import { matchJobsToFilters } from "../../helpers/jobSearch.js";

export function SavedSearchesPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const list=A.savedSearches.filter(s=>s.user===A.user?.id);
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  const runSearch=s=>{A.setSearch({q:s.q||"",where:s.where||"",cats:s.cats||[],
    types:s.types||[],modes:s.modes||[],exps:s.exps||[],prov:s.prov||"",minPay:s.minPay||""});A.go("search");};
  /* Same matching function SearchPage's real results use — this used to be a thinner,
     independently-written reimplementation that could disagree with actual search results. */
  const countFor=s=>matchJobsToFilters(A.jobs,s,{expandQuery:A.expandQuery,emp:A.emp}).length;
  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <Tag tone="brand" icon="bookmark">Saved searches</Tag>
        <h1 className={`font-extrabold tracking-tighter text-text mt-5 mb-3 leading-none ${mob?"text-3xl":"text-5xl"}`}>
          Alerts on your searches.</h1>
        <p className={`text-text-2 leading-normal max-w-xl ${mob?"text-base":"text-lg"}`}>
          Save any search and we'll notify you the moment a matching job posts.</p></div>
    </section>
    <section className={`bg-bg min-h-100 ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-6xl mx-auto">
        {list.length===0?<Empty icon="bookmark" title="No saved searches yet"
          body="Search for something you want, then tap 'Save this search' on the results page."
          action={<Btn kind="primary" onClick={()=>A.go("search")}>Search jobs</Btn>}/>
          :<div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            {list.map(s=>{const n=countFor(s);
              return <div key={s.id} className={`bg-white rounded-3xl border border-line ${mob?"p-6":"p-7"}`}>
                <div className="flex justify-between items-start gap-3.5 mb-3.5">
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-text tracking-tight mb-1.5">{s.name}</div>
                    <div className="text-sm text-text-2 leading-normal">
                      {s.q&&<>"{s.q}" • </>}{s.where&&<>{s.where} • </>}{s.cats?.length?s.cats.map(c=>CATM[c]?.label).join(", "):"All sectors"}</div></div>
                  <Switch on={s.alerts} onChange={()=>A.toggleSearchAlert(s.id)}/></div>
                <div className="flex justify-between items-center pt-3.5 border-t border-line-soft">
                  <div className="text-sm text-text-3">
                    <strong className="text-brand text-lg font-bold">{n}</strong> match{n===1?"":"es"} right now
                    {s.alerts&&<span className="text-ok ml-2.5">• Alerts on</span>}</div>
                  <div className="flex gap-2">
                    <Btn kind="outline" size="sm" onClick={()=>runSearch(s)}>Run search</Btn>
                    <Btn kind="ghost" size="sm" icon="trash" onClick={()=>A.deleteSavedSearch(s.id)}/></div></div></div>;})}</div>}
      </div>
    </section>
  </div>;
}
