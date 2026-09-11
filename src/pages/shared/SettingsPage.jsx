import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { api } from "../../helpers/api.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Switch, Field, Input, Empty, Banner, Lbl, Modal, Page, H1 } from "../../design/primitives.jsx";
import { DeniedPage } from "./DeniedPage.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";
import { formatDate } from "../../i18n/format.js";

/* Email verification. The account keeps working while unverified — locking someone out of
   browsing jobs because a confirmation mail is slow helps nobody — but the state is real and
   shown, because a wrong address means job alerts and employer messages go to a stranger. */
function _EmailVerification({u,t}){
  const [sent,setSent]=useState(false); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [verified,setVerified]=useState(!!u.emailVerified);
  useEffect(()=>{
    const tok=new URLSearchParams(window.location.search).get("token");
    if(!tok||!window.location.pathname.includes("verify-email"))return;
    api.get(`/auth/verify-email?token=${encodeURIComponent(tok)}`).then(()=>setVerified(true)).catch(()=>{});
  },[]);
  if(verified)return null;
  const send=async()=>{
    setErr("");setBusy(true);
    try{await api.post("/auth/send-verification");setSent(true);}
    catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };
  return <Banner tone={sent?"ok":"warn"} icon={sent?"check":"alert"} style={{marginBottom:16}}
    title={sent?t("settings.emailVerifySent"):t("settings.emailVerifyTitle")}
    action={!sent&&<Btn kind="outline" size="sm" onClick={send} disabled={busy}>{busy?t("settings.emailVerifySending"):t("settings.emailVerifySendBtn")}</Btn>}>
    {err||(sent
      ? t("settings.emailVerifySentBody",{email:u.email})
      : t("settings.emailVerifyBody"))}
  </Banner>;
}

/* Devices that skip the 2FA prompt. Revoking has to work from a DIFFERENT device — that's what
   someone reaches for after losing a laptop — so this lists them per account, not per cookie. */
function _TrustedDevices({t,locale}){
  const [devices,setDevices]=useState([]);
  const load=()=>api.get("/auth/trusted-devices").then(r=>setDevices(r.devices)).catch(()=>{});
  useEffect(()=>{load();},[]);
  if(!devices.length)return null;
  return <Card pad={20} style={{marginBottom:16}}>
    <Lbl>{t("settings.devicesLabel")}</Lbl>
    <div className="text-sm text-text-2 mb-3.5">
      {t("settings.devicesDesc")}
    </div>
    <div className="flex flex-col gap-2">
      {devices.map(d=>
        <div key={d.id} className="flex justify-between items-center gap-3 border border-line rounded-xl py-2.5 px-3.5 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">{d.label}{d.current&&<span className="text-xs font-normal text-brand ml-2">{t("settings.thisDevice")}</span>}</div>
            <div className="text-xs text-text-3 mt-0.5">
              {d.lastUsed?t("settings.lastUsed",{date:formatDate(d.lastUsed.replace(" ","T")+"Z",locale)}):t("settings.notUsedYet")}
              {" · "}{t("settings.expires")} {formatDate(d.expiresAt,locale)}</div>
          </div>
          <Btn kind="ghost" size="xs" onClick={async()=>{await api.del(`/auth/trusted-devices/${d.id}`).catch(()=>{});load();}}>{t("settings.revokeBtn")}</Btn>
        </div>)}
    </div>
  </Card>;
}

export function SettingsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t,locale,setLocale}=useTranslation();
  const chooseLocale=next=>{setLocale(next); A.setUserLocale(next);};
  const u=A.user;
  /* Hooks before any early return - a conditional useState is a Rules-of-Hooks violation that
     crashes with "Rendered more hooks than during the previous render" the moment u goes from
     null (guest) to a real user without a route change. */
  const [confirm,setConfirm]=useState(false);
  const [show2FA,setShow2FA]=useState(false); const [tfaPhone,setTfaPhone]=useState(""); const [tfaResult,setTfaResult]=useState(null);
  const [showOutbox,setShowOutbox]=useState(false);
  if(!u) return <DeniedPage/>;
  const S=A.userSettings;
  const Row=({icon,title,sub,children})=><div className="flex gap-3.5 items-center py-4 border-b border-line-soft">
    <div className="w-10 h-10 rounded-xl bg-bg text-text-2 flex items-center justify-center shrink-0"><I n={icon} s={18}/></div>
    <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-text">{title}</div>
      {sub&&<div className="text-sm text-text-2 mt-1 leading-normal">{sub}</div>}</div>{children}</div>;
  return <Page narrow>
    <H1 sub={t("settings.sub")}>{t("settings.title")}</H1>
    <_EmailVerification u={u} t={t}/>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>{t("settings.language")}</Lbl>
      <Row icon="globe" title={t("account.language")} sub={t("settings.languageSub")}>
        <div className="flex gap-1.5 bg-bg rounded-xl p-1">
          <button onClick={()=>chooseLocale("en-CA")} className={`border-0 py-1.5 px-3 rounded-lg cursor-pointer text-sm font-semibold transition-colors duration-150 ${locale==="en-CA"?"bg-white text-brand shadow-sm":"bg-transparent text-text-2"}`}>{t("account.languageEnglish")}</button>
          <button onClick={()=>chooseLocale("fr-CA")} className={`border-0 py-1.5 px-3 rounded-lg cursor-pointer text-sm font-semibold transition-colors duration-150 ${locale==="fr-CA"?"bg-white text-brand shadow-sm":"bg-transparent text-text-2"}`}>{t("account.languageFrench")}</button>
        </div>
      </Row>
    </Card>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>{t("settings.notifications")}</Lbl>
      {/* This switch IS the CASL consent record, not a cosmetic preference - the server refuses
          to send a job-alert email without it, and stores when and how it was given. */}
      <Row icon="bell" title={t("settings.newJobsTitle")}
        sub={A.marketingConsent?.consent
          ? `${t("settings.newJobsBody")}${A.marketingConsent.at?` ${t("settings.emailVerifyConsentRecorded",{date:formatDate(A.marketingConsent.at,locale)})}`:""}`
          : t("settings.jobAlertsOff")}>
        <Switch on={!!A.marketingConsent?.consent} onChange={v=>A.setMarketingConsent(v)}/></Row>
      <Row icon="activity" title={t("settings.jobAlertsTitle")} sub={t("settings.jobAlertsSub")}>
        <Switch on={S.appAlerts} onChange={v=>A.setUserSetting("appAlerts",v)}/></Row>
      <Row icon="mail" title={t("settings.marketingTitle")} sub={t("settings.marketingSub")}>
        <Switch on={S.marketing} onChange={v=>A.setUserSetting("marketing",v)}/></Row>
    </Card>
    <_TrustedDevices t={t} locale={locale}/>
    {u.role==="seeker"&&<Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>{t("settings.privacy")}</Lbl>
      <Row icon="eye" title={t("settings.privacyProfileTitle")} sub={t("settings.privacyProfileSub")}>
        <Switch on={S.discoverable} onChange={v=>A.setUserSetting("discoverable",v)}/></Row>
      <Row icon="lock" title={t("settings.privacyEmployerTitle")} sub={t("settings.privacyEmployerSub")}>
        <Switch on={S.hideEmployer} onChange={v=>A.setUserSetting("hideEmployer",v)}/></Row>
      <Row icon="mail" title={t("settings.privacyEmailTitle")} sub={t("settings.privacyEmailSub")}>
        <Switch on={u.visibility?.email!==false} onChange={v=>A.saveProfile({...u,visibility:{...u.visibility,email:v}})}/></Row>
      <Row icon="phone" title={t("settings.privacyPhoneTitle")} sub={t("settings.privacyPhoneSub")}>
        <Switch on={u.visibility?.phone!==false} onChange={v=>A.saveProfile({...u,visibility:{...u.visibility,phone:v}})}/></Row>
    </Card>}
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>{t("settings.yourData")}</Lbl>
      <Row icon="download" title={t("settings.dataExportTitle")} sub={t("settings.dataExportSub")}>
        <Btn kind="outline" size="sm" onClick={A.exportData}>{t("settings.exportBtn")}</Btn></Row>
      <Row icon="file" title={t("settings.privacyPolicyTitle")} sub={t("settings.privacyPolicySub")}>
        <Btn kind="ghost" size="sm" iconR="chevR" onClick={()=>A.go("privacy")}>{t("settings.readBtn")}</Btn></Row>
    </Card>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>{t("settings.security")}</Lbl>
      {(()=>{const tfa=A.twoFactor[u.id];
        return <Row icon="shield" title={tfa?.enabled?t("settings.tfa2FAEnabledTitle"):t("settings.tfa2FATitle")}
          sub={tfa?.enabled?t("settings.tfa2FAEnabledSub",{phone:tfa.phone}):t("settings.tfa2FASub")}>
          {tfa?.enabled?<Btn kind="outline" size="sm" onClick={()=>{A.disable2FA();}}>{t("settings.disableBtn")}</Btn>
            :<Btn kind="primary" size="sm" onClick={()=>setShow2FA(true)}>{t("settings.setupBtn")}</Btn>}
        </Row>;})()}
    </Card>

    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>{t("settings.outbox")}</Lbl>
      <Row icon="mail" title={t("settings.outboxEmailsTitle")} sub={`${A.outbox.length} ${A.outbox.length===1?t("settings.outboxEmailsSub"):t("settings.outboxEmailsSubPlural")} ${t("settings.outboxEmailsTitle").toLowerCase()} (password resets, notifications)`}>
        <Btn kind="ghost" size="sm" iconR="chevR" onClick={()=>setShowOutbox(true)}>{t("settings.outboxViewBtn")}</Btn></Row>
    </Card>

    <Card pad={mob?18:24} style={{borderColor:C.redLn}}>
      <Lbl>{t("settings.dangerZone")}</Lbl>
      <Row icon="alert" title={t("settings.deleteAccountTitle")} sub={t("settings.deleteAccountSub")}>
        <Btn kind="dangerSoft" size="sm" onClick={()=>setConfirm(true)}>{t("settings.deleteAccountBtn")}</Btn></Row>
    </Card>

    {show2FA&&<Modal onClose={()=>setShow2FA(false)} title={t("settings.setupTFATitle")}>
      {tfaResult?<div>
        <Banner tone="ok" icon="check" title={t("settings.tfaEnabledTitle")}>{t("settings.tfaEnabledBody")}</Banner>
        <div className="mt-4 p-4 bg-bg rounded-xl font-mono text-sm">
          <div className="text-xs text-text-3 font-semibold uppercase tracking-wide mb-2.5">{t("settings.tfaBackupCodes")}</div>
          <div className="grid grid-cols-2 gap-2">
            {tfaResult.codes.map(c=><div key={c} className="py-2 px-2.5 bg-white border border-line rounded-md text-center">{c}</div>)}</div></div>
        <Btn kind="primary" full style={{marginTop:16}} onClick={()=>{setShow2FA(false);setTfaResult(null);}}>{t("settings.doneBtn")}</Btn>
      </div>:<div className="flex flex-col gap-3.5">
        <Banner tone="brand" icon="shield" title={t("settings.tfaDemoTitle")}>{t("settings.tfaDemoBody")}</Banner>
        <Field label={t("settings.tfaPhoneLabel")} hint={t("settings.tfaPhoneHint")}>
          <Input icon="phone" value={tfaPhone} onChange={e=>setTfaPhone(e.target.value)} placeholder={t("settings.tfaPhonePlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShow2FA(false)}>{t("settings.cancelBtn")}</Btn>
          <Btn kind="primary" icon="shield" disabled={tfaPhone.replace(/\D/g,"").length<10} onClick={async()=>{const r=await A.enable2FA(tfaPhone);if(r.ok)setTfaResult(r);}}>{t("settings.enableBtn")}</Btn></div></div>}</Modal>}

    {showOutbox&&<Modal onClose={()=>setShowOutbox(false)} title={`${t("settings.outbox")} — ${t("settings.outboxEmailsTitle").toLowerCase()}`}>
      {A.outbox.length===0?<Empty icon="mail" title={t("settings.outboxNothing")} body={t("settings.outboxBody")}/>
        :<div className="flex flex-col gap-2.5 max-h-100 overflow-y-auto">
          {A.outbox.map(m=><div key={m.id} className="p-3.5 bg-bg rounded-xl border border-line">
            <div className="flex justify-between gap-2.5 items-baseline mb-1.5">
              <div className="text-sm font-semibold text-text">{m.subject}</div>
              <div className="text-xs text-text-3 shrink-0">{m.at}</div></div>
            <div className="text-xs text-text-3 mb-2">To: {m.to}</div>
            <div className="text-sm text-text-2 leading-normal">{m.body}</div>
            {m.previewUrl&&<a href={m.previewUrl} target="_blank" rel="noreferrer" className="text-xs text-brand font-semibold mt-2 inline-block">View the actual sent email →</a>}</div>)}</div>}</Modal>}
    <Modal open={confirm} onClose={()=>setConfirm(false)} title={t("settings.deleteModalTitle")} sub={t("settings.deleteModalSub")}
      footer={<div className="flex gap-2.5"><Btn kind="outline" full onClick={()=>setConfirm(false)}>{t("settings.keepAccountBtn")}</Btn>
        <Btn kind="danger" full icon="trash" onClick={()=>{setConfirm(false);A.deleteAccount();}}>{t("settings.deletePermanentlyBtn")}</Btn></div>}>
      <p className="text-base text-text-2 leading-relaxed">
        {t("settings.deleteModalBody",{count:A.cvs.length,cvLabel:A.cvs.length===1?"CV":"CVs"})}</p></Modal>
  </Page>;
}
