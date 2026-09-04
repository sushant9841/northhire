import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Tag, Switch, Empty, HERO_TIGHT, Modal, Field, Input, Sel } from "../../design/primitives.jsx";
import { CATM } from "../../store/seed/constants.js";
import { matchJobsToFilters } from "../../helpers/jobSearch.js";

const FREQ_LABEL={instant:"Instantly",daily:"Daily digest",weekly:"Weekly digest"};

export function SavedSearchesPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const list=A.savedSearches.filter(s=>s.user===A.user?.id);
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  const [editing,setEditing]=useState(null); // the saved-search object currently open in the edit modal
  const [ed,setEd]=useState({name:"",frequency:"instant"});
  const runSearch=s=>{A.setSearch({q:s.q||"",where:s.where||"",cats:s.cats||[],
    types:s.types||[],modes:s.modes||[],exps:s.exps||[],prov:s.prov||"",minPay:s.minPay||""});A.go("search");};
  const editFilters=s=>{A.setEditingSavedSearchId(s.id);runSearch(s);};
  const openEdit=s=>{setEditing(s);setEd({name:s.name,frequency:s.frequency||"instant"});};
  const saveEdit=async()=>{await A.updateSavedSearch(editing.id,{name:ed.name.trim()||editing.name,frequency:ed.frequency});setEditing(null);};
  /* Same matching function SearchPage's real results use — this used to be a thinner,
     independently-written reimplementation that could disagree with actual search results. */
  const countFor=s=>matchJobsToFilters(A.jobs,s,{expandQuery:A.expandQuery,emp:A.emp}).length;
  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <Tag tone="brand" icon="bookmark">Saved searches</Tag>
        <h1 className={`${HERO_TIGHT} mt-5 mb-3 ${mob?"text-3xl":"text-5xl"}`}>
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
                    {s.alerts&&<span className="text-ok ml-2.5">• {FREQ_LABEL[s.frequency||"instant"]}</span>}</div>
                  <div className="flex gap-2">
                    <Btn kind="ghost" size="sm" icon="edit" onClick={()=>openEdit(s)}/>
                    <Btn kind="outline" size="sm" onClick={()=>editFilters(s)}>Edit filters</Btn>
                    <Btn kind="outline" size="sm" onClick={()=>runSearch(s)}>Run search</Btn>
                    <Btn kind="ghost" size="sm" icon="trash" onClick={()=>A.deleteSavedSearch(s.id)}/></div></div></div>;})}</div>}
      </div>
    </section>
    {editing&&<Modal onClose={()=>setEditing(null)} title="Edit saved search">
      <Field label="Name"><Input value={ed.name} onChange={e=>setEd(p=>({...p,name:e.target.value}))}/></Field>
      <Field label="Alert frequency" style={{marginTop:14}} hint="How often we notify you about new matches.">
        <Sel value={ed.frequency} onChange={e=>setEd(p=>({...p,frequency:e.target.value}))}>
          <option value="instant">Instantly</option><option value="daily">Daily digest</option><option value="weekly">Weekly digest</option></Sel></Field>
      <Btn kind="primary" full size="lg" style={{marginTop:18}} onClick={saveEdit}>Save changes</Btn></Modal>}
  </div>;
}
