import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { api } from "../../helpers/api.js";
import { I } from "../../design/icons.jsx";
import { Page, Card, Btn, Banner, Input, Field, Area, CheckRow, Tag, HERO_QUIET } from "../../design/primitives.jsx";

/* Where a candidate actually reads and signs an offer.

   Deliberately reachable without an account: the person receiving an offer may not have signed
   in for weeks, and making them remember a password before they can accept a job is exactly the
   friction that pushes this back onto email attachments. The unguessable token in the URL is what
   authorises it.

   Signing is click-wrap: an explicit acknowledgement plus the candidate typing their own legal
   name. Both are required — a single "Accept" button is a click, not a signature. */
export function OfferPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [offer,setOffer]=useState(undefined);   // undefined = loading, null = invalid
  const [name,setName]=useState(""); const [agreed,setAgreed]=useState(false);
  const [declining,setDeclining]=useState(false); const [reason,setReason]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);

  const token=A.offerToken||(typeof window!=="undefined"?window.location.pathname.split("/offer/")[1]:"");

  const load=()=>api.get(`/offers/token/${encodeURIComponent(token)}`)
    .then(r=>setOffer(r.offer)).catch(()=>setOffer(null));
  useEffect(()=>{if(token)load();else setOffer(null);},[token]);

  const sign=async()=>{
    setErr("");setBusy(true);
    try{
      await api.post(`/offers/token/${encodeURIComponent(token)}/sign`,{signedName:name.trim(),agreed});
      load();
    }catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };
  const decline=async()=>{
    setErr("");setBusy(true);
    try{
      await api.post(`/offers/token/${encodeURIComponent(token)}/decline`,{reason:reason.trim()});
      setDeclining(false); load();
    }catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };

  if(offer===undefined) return <Page narrow><Card pad={26}><div className="text-sm text-text-2">Loading your offer…</div></Card></Page>;
  if(offer===null) return <Page narrow>
    <Card pad={26}>
      <h1 className={`${HERO_QUIET} text-2xl mb-2`}>This offer link isn't valid</h1>
      <p className="text-base text-text-2 mb-5">It may have been replaced by a newer offer, or the link was mistyped. Ask your contact at the company to resend it.</p>
      <Btn kind="primary" onClick={()=>A.go("home")}>Go to NorthHire</Btn>
    </Card>
  </Page>;

  const settled=offer.status!=="sent";
  const rows=[["Position",offer.position],["Compensation",offer.compensation],
    ["Start date",offer.startDate],["Reporting to",offer.reportingTo]].filter(([,v])=>v);

  return <Page narrow>
    <div className="flex items-center gap-2.5 mb-4">
      <Tag tone={offer.status==="accepted"?"ok":offer.status==="declined"?"neutral":offer.status==="withdrawn"?"warn":"brand"}>
        {offer.status==="sent"?"Awaiting your response":offer.status==="accepted"?"Accepted":offer.status==="declined"?"Declined":"Withdrawn"}</Tag>
      {offer.employer&&<span className="text-sm text-text-2">from {offer.employer}</span>}
    </div>
    <h1 className={`${HERO_QUIET} ${mob?"text-2xl":"text-3xl"} mb-5`}>
      {offer.status==="accepted"?"You accepted this offer":"Your offer"}</h1>

    {offer.status==="accepted"&&
      <Banner tone="ok" icon="check" style={{marginBottom:18}} title="Signed and recorded">
        Signed by {offer.signedName} on {offer.signedAt?new Date(offer.signedAt.replace(" ","T")+"Z").toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"}):"—"}.
        The company has been notified. Keep this page for your records.
      </Banner>}
    {offer.status==="declined"&&<Banner tone="neutral" icon="info" style={{marginBottom:18}}>You declined this offer.</Banner>}
    {offer.status==="withdrawn"&&<Banner tone="warn" icon="alert" style={{marginBottom:18}}>This offer was withdrawn or replaced by a newer one.</Banner>}
    {offer.expired&&offer.status==="sent"&&<Banner tone="warn" icon="clock" style={{marginBottom:18}}>This offer's response date has passed — ask your contact whether it still stands.</Banner>}

    {rows.length>0&&<Card pad={mob?18:22} style={{marginBottom:16}}>
      <div className="grid gap-3.5" style={{gridTemplateColumns:mob?"1fr":"1fr 1fr"}}>
        {rows.map(([l,v])=><div key={l}>
          <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1">{l}</div>
          <div className="text-sm text-text font-medium">{v}</div></div>)}
      </div>
    </Card>}

    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">{offer.body}</div>
      {offer.expiresAt&&offer.status==="sent"&&
        <div className="text-xs text-text-3 mt-4 pt-3 border-t border-line-soft">Please respond by {offer.expiresAt}.</div>}
    </Card>

    {!settled&&!offer.expired&&<Card pad={mob?18:22}>
      {err&&<Banner tone="danger" icon="alert" style={{marginBottom:14}}>{err}</Banner>}
      {declining
        ? <>
            <Field label="Anything you'd like them to know? (optional)">
              <Area rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Optional — this is shared with the employer."/></Field>
            <div className="flex gap-2.5 justify-end mt-4">
              <Btn kind="ghost" onClick={()=>setDeclining(false)}>Back</Btn>
              <Btn kind="danger" onClick={decline} disabled={busy}>{busy?"Sending…":"Decline offer"}</Btn>
            </div>
          </>
        : <>
            <div className="text-sm font-semibold text-text mb-3">Sign to accept</div>
            <CheckRow on={agreed} onChange={setAgreed}
              label="I have read and accept the terms of this offer"
              sub="Ticking this and typing your name below forms your electronic signature."/>
            <div className="mt-3">
              <Field label="Type your full legal name">
                <Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah Chen"/></Field>
            </div>
            <div className="text-xs text-text-3 mt-2.5 leading-relaxed flex gap-2 items-start">
              <span className="shrink-0 mt-0.5"><I n="shield" s={13}/></span>
              <span>We record the exact text you're agreeing to, the date and time, and a one-way
              hash of your IP address — never the address itself.</span>
            </div>
            <div className="flex gap-2.5 justify-end mt-5 flex-wrap">
              <Btn kind="ghost" onClick={()=>setDeclining(true)} disabled={busy}>Decline</Btn>
              <Btn kind="ok" icon="check" onClick={sign} disabled={busy||!agreed||name.trim().length<2}>
                {busy?"Signing…":"Sign and accept"}</Btn>
            </div>
          </>}
    </Card>}
  </Page>;
}
