import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { api } from "../../helpers/api.js";
import { I } from "../../design/icons.jsx";
import { Page, Card, Btn, Banner, Input, Field, Area, CheckRow, Tag, HERO_QUIET } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";
import { formatDate } from "../../i18n/format.js";

/* Where a candidate actually reads and signs an offer.

   Deliberately reachable without an account: the person receiving an offer may not have signed
   in for weeks, and making them remember a password before they can accept a job is exactly the
   friction that pushes this back onto email attachments. The unguessable token in the URL is what
   authorises it.

   Signing is click-wrap: an explicit acknowledgement plus the candidate typing their own legal
   name. Both are required — a single "Accept" button is a click, not a signature. */
export function OfferPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
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

  if(offer===undefined) return <Page narrow><Card pad={26}><div className="text-sm text-text-2">{t("shared.offer.loading")}</div></Card></Page>;
  if(offer===null) return <Page narrow>
    <Card pad={26}>
      <h1 className={`${HERO_QUIET} text-2xl mb-2`}>{t("shared.offer.invalidLinkTitle")}</h1>
      <p className="text-base text-text-2 mb-5">{t("shared.offer.invalidLinkBody")}</p>
      <Btn kind="primary" onClick={()=>A.go("home")}>{t("shared.offer.goToNorthHireBtn")}</Btn>
    </Card>
  </Page>;

  const settled=offer.status!=="sent";
  const rows=[[t("shared.offer.positionLabel"),offer.position],[t("shared.offer.compensationLabel"),offer.compensation],
    [t("shared.offer.startDateLabel"),offer.startDate],[t("shared.offer.reportingToLabel"),offer.reportingTo]].filter(([,v])=>v);

  return <Page narrow>
    <div className="flex items-center gap-2.5 mb-4">
      <Tag tone={offer.status==="accepted"?"ok":offer.status==="declined"?"neutral":offer.status==="withdrawn"?"warn":"brand"}>
        {offer.status==="sent"?t("shared.offer.statusAwaiting"):offer.status==="accepted"?t("shared.offer.statusAccepted"):offer.status==="declined"?t("shared.offer.statusDeclined"):t("shared.offer.statusWithdrawn")}</Tag>
      {offer.employer&&<span className="text-sm text-text-2">{t("shared.offer.fromEmployer",{employer:offer.employer})}</span>}
    </div>
    <h1 className={`${HERO_QUIET} ${mob?"text-2xl":"text-3xl"} mb-5`}>
      {offer.status==="accepted"?t("shared.offer.acceptedTitle"):t("shared.offer.yourOfferTitle")}</h1>

    {offer.status==="accepted"&&
      <Banner tone="ok" icon="check" style={{marginBottom:18}} title={t("shared.offer.signedAndRecordedTitle")}>
        {t("shared.offer.signedByOn",{name:offer.signedName,date:offer.signedAt?formatDate(offer.signedAt.replace(" ","T")+"Z",locale,{year:"numeric",month:"long",day:"numeric"}):"—"})}
        {" "}{t("shared.offer.companyNotifiedBody")}
      </Banner>}
    {offer.status==="declined"&&<Banner tone="neutral" icon="info" style={{marginBottom:18}}>{t("shared.offer.youDeclinedBody")}</Banner>}
    {offer.status==="withdrawn"&&<Banner tone="warn" icon="alert" style={{marginBottom:18}}>{t("shared.offer.withdrawnBody")}</Banner>}
    {offer.expired&&offer.status==="sent"&&<Banner tone="warn" icon="clock" style={{marginBottom:18}}>{t("shared.offer.expiredBody")}</Banner>}

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
        <div className="text-xs text-text-3 mt-4 pt-3 border-t border-line-soft">{t("shared.offer.pleaseRespondBy",{date:offer.expiresAt})}</div>}
    </Card>

    {!settled&&!offer.expired&&<Card pad={mob?18:22}>
      {err&&<Banner tone="danger" icon="alert" style={{marginBottom:14}}>{err}</Banner>}
      {declining
        ? <>
            <Field label={t("shared.offer.declineReasonLabel")}>
              <Area rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder={t("shared.offer.declineReasonPlaceholder")}/></Field>
            <div className="flex gap-2.5 justify-end mt-4">
              <Btn kind="ghost" onClick={()=>setDeclining(false)}>{t("nav.back")}</Btn>
              <Btn kind="danger" onClick={decline} disabled={busy}>{busy?t("shared.offer.sendingBtn"):t("shared.offer.declineOfferBtn")}</Btn>
            </div>
          </>
        : <>
            <div className="text-sm font-semibold text-text mb-3">{t("shared.offer.signToAcceptLabel")}</div>
            <CheckRow on={agreed} onChange={setAgreed}
              label={t("shared.offer.agreeCheckboxLabel")}
              sub={t("shared.offer.agreeCheckboxSub")}/>
            <div className="mt-3">
              <Field label={t("shared.offer.legalNameLabel")}>
                <Input value={name} onChange={e=>setName(e.target.value)} placeholder={t("shared.offer.legalNamePlaceholder")}/></Field>
            </div>
            <div className="text-xs text-text-3 mt-2.5 leading-relaxed flex gap-2 items-start">
              <span className="shrink-0 mt-0.5"><I n="shield" s={13}/></span>
              <span>{t("shared.offer.ipHashDisclosure")}</span>
            </div>
            <div className="flex gap-2.5 justify-end mt-5 flex-wrap">
              <Btn kind="ghost" onClick={()=>setDeclining(true)} disabled={busy}>{t("shared.offer.declineBtn")}</Btn>
              <Btn kind="ok" icon="check" onClick={sign} disabled={busy||!agreed||name.trim().length<2}>
                {busy?t("shared.offer.signingBtn"):t("shared.offer.signAndAcceptBtn")}</Btn>
            </div>
          </>}
    </Card>}
  </Page>;
}
