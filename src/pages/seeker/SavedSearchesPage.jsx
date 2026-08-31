import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Tag, Switch, Empty } from "../../design/primitives.jsx";
import { CATM } from "../../store/seed/constants.js";

export function SavedSearchesPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const list=A.savedSearches.filter(s=>s.user===A.user?.id);
  const pad=mob?"44px 16px":"72px 32px";
  const runSearch=s=>{A.setSearch({q:s.q||"",where:s.where||"",cats:s.cats||[]});A.go("search");};
  const countFor=s=>{
    const terms=A.expandQuery(s.q);
    return A.jobs.filter(j=>{if(j.status!=="live")return false;
      if(s.q&&!terms.some(t=>j.t.toLowerCase().includes(t)||j.skills.some(k=>k.toLowerCase().includes(t))))return false;
      if(s.where&&!j.city.toLowerCase().includes(s.where.toLowerCase())&&j.prov.toLowerCase()!==s.where.toLowerCase())return false;
      if(s.cats?.length&&!s.cats.includes(j.cat))return false;
      return true;
    }).length;
  };
  return <div style={{background:"#fff",minHeight:"100%"}}>
    <section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <Tag tone="brand" icon="bookmark">Saved searches</Tag>
        <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 12px",lineHeight:1.08}}>
          Alerts on your searches.</h1>
        <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,margin:0,maxWidth:560}}>
          Save any search and we'll notify you the moment a matching job posts.</p></div>
    </section>
    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg,minHeight:400}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {list.length===0?<Empty icon="bookmark" title="No saved searches yet"
          body="Search for something you want, then tap 'Save this search' on the results page."
          action={<Btn kind="primary" onClick={()=>A.go("search")}>Search jobs</Btn>}/>
          :<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
            {list.map(s=>{const n=countFor(s);
              return <div key={s.id} style={{background:"#fff",borderRadius:20,padding:mob?22:26,border:`1px solid ${C.line}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:14}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:17,fontWeight:680,color:C.text,letterSpacing:"-.02em",marginBottom:6}}>{s.name}</div>
                    <div style={{fontSize:13,color:C.text2,lineHeight:1.5}}>
                      {s.q&&<>"{s.q}" • </>}{s.where&&<>{s.where} • </>}{s.cats?.length?s.cats.map(c=>CATM[c]?.label).join(", "):"All sectors"}</div></div>
                  <Switch on={s.alerts} onChange={()=>A.toggleSearchAlert(s.id)}/></div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14,borderTop:`1px solid ${C.lineSoft}`}}>
                  <div style={{fontSize:13,color:C.text3}}>
                    <strong style={{color:C.brand,fontSize:17,fontWeight:730}}>{n}</strong> match{n===1?"":"es"} right now
                    {s.alerts&&<span style={{color:C.ok,marginLeft:10}}>• Alerts on</span>}</div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn kind="outline" size="sm" onClick={()=>runSearch(s)}>Run search</Btn>
                    <Btn kind="ghost" size="sm" icon="trash" onClick={()=>A.deleteSavedSearch(s.id)}/></div></div></div>;})}</div>}
      </div>
    </section>
  </div>;
}
