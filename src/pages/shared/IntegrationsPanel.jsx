import { useState, useEffect } from "react";
import { Card, H2, Banner, Btn, Tag } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";
import { API_BASE } from "../../helpers/api.js";

/* Priority-4 #7 / Priority-5 item 2: integrations marketplace shell. One card per allowlisted
   provider (rendered even when not connected — the point of a marketplace is to show what's
   available, not hide it). Install/disconnect state persists to the `integrations` table
   server-side; real OAuth flows for each provider land later per-service. Shared across
   employer / hr / staffing scopes — each calls the same server endpoints keyed by owner scope. */
export function IntegrationsPanel({scope}){
  const {t}=useTranslation();
  const [items,setItems]=useState(null);
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(null);
  useEffect(()=>{
    let cancel=false;
    fetch(`${API_BASE}/integrations/${scope}`,{credentials:"include"}).then(r=>r.json()).then(d=>{
      if(cancel) return;
      if(d.error) setErr(d.error); else setItems(d.items||[]);
    }).catch(e=>{ if(!cancel) setErr(String(e.message||e)); });
    return()=>{cancel=true;};
  },[scope]);
  const toggle=async(prov)=>{
    setBusy(prov.provider);
    const method=prov.status==="connected"?"DELETE":"POST";
    try{
      const r=await fetch(`${API_BASE}/integrations/${scope}/${prov.provider}`,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:method==="POST"?JSON.stringify({config:{}}):undefined});
      if(!r.ok){ const d=await r.json().catch(()=>({})); setErr(d.error||`HTTP ${r.status}`); }
      else{
        const d2=await fetch(`${API_BASE}/integrations/${scope}`,{credentials:"include"}).then(x=>x.json());
        setItems(d2.items||[]);
      }
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setBusy(null); }
  };
  if(err) return <Card style={{marginTop:16}}><Banner tone="danger" icon="alert">{t("employer.integrations.loadError")}: {err}</Banner></Card>;
  if(!items) return null;
  return <Card style={{marginTop:16}}>
    <H2 sub={t("employer.integrations.sub")}>{t("employer.integrations.title")}</H2>
    <div className="grid gap-3 mt-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))"}}>
      {items.map(p=>{
        const on=p.status==="connected";
        return <div key={p.provider} className="border border-line-soft rounded-xl p-4 bg-white flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-text">{p.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{t(`employer.integrations.cat.${p.category}`)}</div>
            </div>
            <Tag tone={on?"ok":"neutral"} sm>{on?t("employer.integrations.statusConnected"):t("employer.integrations.statusNotConnected")}</Tag>
          </div>
          <div className="mt-1">
            <Btn kind={on?"outline":"primary"} size="sm" onClick={()=>toggle(p)} disabled={busy===p.provider}>
              {on?t("employer.integrations.disconnectBtn"):t("employer.integrations.connectBtn")}
            </Btn>
          </div>
        </div>;
      })}
    </div>
  </Card>;
}
