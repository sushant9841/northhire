import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { api } from "../../helpers/api.js";
import {
  Page, H1, Card, Btn, Banner, Lbl, Input, Field, Tag, Empty, ConfirmDialog, CheckRow,
} from "../../design/primitives.jsx";

/* Enterprise API keys and outbound webhooks. "API access" and "API + Zapier" sat on the pricing
   page with nothing implementing them; this is the surface behind them.

   Both a key and a webhook secret are shown exactly once, at creation. Neither is retrievable
   afterwards — a long-lived credential that a list endpoint hands back on every page load is a
   credential that leaks the first time someone shares their screen. */
export function EmpApiPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [data,setData]=useState({keys:[],webhooks:[],enabled:false,events:[]});
  const [keyName,setKeyName]=useState("");
  const [issuedKey,setIssuedKey]=useState(null);
  const [hookUrl,setHookUrl]=useState(""); const [hookEvents,setHookEvents]=useState([]);
  const [issuedHook,setIssuedHook]=useState(null);
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [revokeKey,setRevokeKey]=useState(null); const [removeHook,setRemoveHook]=useState(null);
  const isOwner=A.user?.employerRole==="owner";

  const load=()=>api.get("/api-keys/").then(setData).catch(()=>{});
  useEffect(()=>{load();},[]);

  const createKey=async()=>{
    setErr(""); setBusy(true);
    try{
      const r=await api.post("/api-keys/keys",{name:keyName.trim()});
      setIssuedKey(r.secret); setKeyName(""); load();
    }catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };
  const createHook=async()=>{
    setErr(""); setBusy(true);
    try{
      const r=await api.post("/api-keys/webhooks",{url:hookUrl.trim(),events:hookEvents});
      setIssuedHook(r.secret); setHookUrl(""); setHookEvents([]); load();
    }catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };

  const copy=v=>{navigator.clipboard?.writeText(v);};

  if(!data.enabled) return <Page narrow>
    <H1 sub="Programmatic access to your own jobs and applications">API &amp; webhooks</H1>
    <Card pad={mob?20:26}>
      <Empty icon="lock" title="Available on Enterprise"
        body="API keys and webhooks let your own systems — or a tool like Zapier — read your jobs and applications and react to new candidates without anyone logging in."
        action={<Btn kind="primary" onClick={()=>A.go("pricing")}>See plans</Btn>}/>
    </Card>
  </Page>;

  return <Page narrow>
    <H1 sub="Programmatic access to your own jobs and applications">API &amp; webhooks</H1>
    {err&&<Banner tone="danger" icon="alert" style={{marginBottom:16}}>{err}</Banner>}

    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <Lbl>API keys</Lbl>
      <div className="text-sm text-text-2 mb-4 leading-relaxed">
        Send a key as <code className="text-xs bg-bg border border-line rounded px-1.5 py-0.5">Authorization: Bearer …</code> to{" "}
        <code className="text-xs bg-bg border border-line rounded px-1.5 py-0.5">{`${window.location.protocol}//${window.location.hostname}:8787/api/v1`}</code>.
        A key only ever reaches your own company's data.
      </div>

      {issuedKey&&<Banner tone="ok" icon="check" style={{marginBottom:14}} title="Copy this key now — it isn't shown again">
        <div className="flex gap-2 items-center flex-wrap mt-1">
          <code className="text-xs bg-white border border-line rounded-lg px-2.5 py-1.5 break-all flex-1 min-w-0">{issuedKey}</code>
          <Btn kind="outline" size="sm" onClick={()=>copy(issuedKey)}>Copy</Btn>
          <Btn kind="ghost" size="sm" onClick={()=>setIssuedKey(null)}>Done</Btn>
        </div>
      </Banner>}

      {isOwner&&<div className={`grid gap-2.5 mb-3.5 ${mob?"grid-cols-1":"grid-cols-[1fr_auto]"}`}>
        <Field label="Key name"><Input value={keyName} onChange={e=>setKeyName(e.target.value)} placeholder="e.g. Zapier integration"/></Field>
        <div className="flex items-end"><Btn kind="primary" icon="plus" onClick={createKey} disabled={busy||!keyName.trim()}>Create key</Btn></div>
      </div>}

      {data.keys.length===0
        ? <div className="text-sm text-text-3">No keys yet.</div>
        : <div className="flex flex-col gap-2">
            {data.keys.map(k=>
              <div key={k.id} className="flex justify-between items-center gap-3 border border-line rounded-xl py-2.5 px-3.5 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text">{k.name}</div>
                  <div className="text-xs text-text-3 mt-0.5 font-mono">{k.prefix}… · {k.lastUsed?`last used ${k.lastUsed}`:"never used"}</div>
                </div>
                {isOwner&&<Btn kind="ghost" size="xs" onClick={()=>setRevokeKey(k)}>Revoke</Btn>}
              </div>)}
          </div>}
    </Card>

    <Card pad={mob?20:26}>
      <Lbl>Webhooks</Lbl>
      <div className="text-sm text-text-2 mb-4 leading-relaxed">
        We POST to your HTTPS endpoint when something happens, so you don't have to poll. Every
        delivery carries <code className="text-xs bg-bg border border-line rounded px-1.5 py-0.5">X-NorthHire-Signature</code>{" "}
        (<code className="text-xs">t=…,v1=…</code>) — an HMAC-SHA256 of <code className="text-xs">timestamp.body</code> using
        that endpoint's secret. Verify it before trusting a delivery, and reject old timestamps.
      </div>

      {issuedHook&&<Banner tone="ok" icon="check" style={{marginBottom:14}} title="Copy this signing secret now — it isn't shown again">
        <div className="flex gap-2 items-center flex-wrap mt-1">
          <code className="text-xs bg-white border border-line rounded-lg px-2.5 py-1.5 break-all flex-1 min-w-0">{issuedHook}</code>
          <Btn kind="outline" size="sm" onClick={()=>copy(issuedHook)}>Copy</Btn>
          <Btn kind="ghost" size="sm" onClick={()=>setIssuedHook(null)}>Done</Btn>
        </div>
      </Banner>}

      {isOwner&&<>
        <Field label="Endpoint URL (HTTPS)">
          <Input value={hookUrl} onChange={e=>setHookUrl(e.target.value)} placeholder="https://hooks.zapier.com/…"/></Field>
        <div className="mt-3 mb-3.5">
          <div className="text-xs font-semibold text-text-2 mb-2">Events (leave all unchecked to receive every event)</div>
          <div className="flex flex-col gap-1.5">
            {data.events.map(ev=>
              <CheckRow key={ev} on={hookEvents.includes(ev)} label={ev}
                onChange={v=>setHookEvents(s=>v?[...s,ev]:s.filter(x=>x!==ev))}/>)}
          </div>
        </div>
        <Btn kind="primary" icon="plus" onClick={createHook} disabled={busy||!hookUrl.trim()}>Add webhook</Btn>
      </>}

      <div className="flex flex-col gap-2 mt-4">
        {data.webhooks.length===0
          ? <div className="text-sm text-text-3">No webhooks yet.</div>
          : data.webhooks.map(w=>
            <div key={w.id} className="flex justify-between items-start gap-3 border border-line rounded-xl py-2.5 px-3.5 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text break-all">{w.url}</div>
                <div className="text-xs text-text-3 mt-1">
                  {w.events.length?w.events.join(", "):"all events"}
                  {w.lastAt&&<> · last delivery {w.lastAt}</>}
                </div>
                {w.lastStatus!==null&&w.lastStatus!==undefined&&
                  <div className="mt-1.5">
                    {w.lastStatus>=200&&w.lastStatus<300
                      ? <Tag tone="ok" sm>{w.lastStatus}</Tag>
                      : <Tag tone="danger" sm>{w.lastStatus===0?`failed — ${w.lastError||"no response"}`:`HTTP ${w.lastStatus}`}</Tag>}
                  </div>}
              </div>
              {isOwner&&<Btn kind="ghost" size="xs" onClick={()=>setRemoveHook(w)}>Remove</Btn>}
            </div>)}
      </div>
    </Card>

    <ConfirmDialog open={!!revokeKey} onClose={()=>setRevokeKey(null)} confirmLabel="Revoke key" danger
      title={`Revoke "${revokeKey?.name}"?`}
      onConfirm={async()=>{await api.del(`/api-keys/keys/${revokeKey.id}`).catch(()=>{});setRevokeKey(null);load();}}>
      Anything using this key stops working immediately. This can't be undone — issue a new key instead.
    </ConfirmDialog>
    <ConfirmDialog open={!!removeHook} onClose={()=>setRemoveHook(null)} confirmLabel="Remove webhook" danger
      title="Remove this webhook?"
      onConfirm={async()=>{await api.del(`/api-keys/webhooks/${removeHook.id}`).catch(()=>{});setRemoveHook(null);load();}}>
      We'll stop sending deliveries to {removeHook?.url}.
    </ConfirmDialog>
  </Page>;
}
