import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { api } from "../../helpers/api.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Switch, Field, Input, Empty, Banner, Lbl, Modal, Page, H1 } from "../../design/primitives.jsx";
import { DeniedPage } from "./DeniedPage.jsx";

/* Email verification. The account keeps working while unverified — locking someone out of
   browsing jobs because a confirmation mail is slow helps nobody — but the state is real and
   shown, because a wrong address means job alerts and employer messages go to a stranger. */
function _EmailVerification({u}){
  const [sent,setSent]=useState(false); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [verified,setVerified]=useState(!!u.emailVerified);
  useEffect(()=>{
    const t=new URLSearchParams(window.location.search).get("token");
    if(!t||!window.location.pathname.includes("verify-email"))return;
    api.get(`/auth/verify-email?token=${encodeURIComponent(t)}`).then(()=>setVerified(true)).catch(()=>{});
  },[]);
  if(verified)return null;
  const send=async()=>{
    setErr("");setBusy(true);
    try{await api.post("/auth/send-verification");setSent(true);}
    catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };
  return <Banner tone={sent?"ok":"warn"} icon={sent?"check":"alert"} style={{marginBottom:16}}
    title={sent?"Confirmation sent":"Confirm your email address"}
    action={!sent&&<Btn kind="outline" size="sm" onClick={send} disabled={busy}>{busy?"Sending…":"Send link"}</Btn>}>
    {err||(sent
      ? `We sent a link to ${u.email}. Open it to confirm this is your address.`
      : "Until it's confirmed, we can't be sure job alerts and employer messages are reaching you rather than someone else.")}
  </Banner>;
}

/* Devices that skip the 2FA prompt. Revoking has to work from a DIFFERENT device — that's what
   someone reaches for after losing a laptop — so this lists them per account, not per cookie. */
function _TrustedDevices(){
  const [devices,setDevices]=useState([]);
  const load=()=>api.get("/auth/trusted-devices").then(r=>setDevices(r.devices)).catch(()=>{});
  useEffect(()=>{load();},[]);
  if(!devices.length)return null;
  return <Card pad={20} style={{marginBottom:16}}>
    <Lbl>Devices that skip two-factor</Lbl>
    <div className="text-sm text-text-2 mb-3.5">
      These browsers won't be asked for a sign-in code. Revoke any you don't recognise or no longer have.
    </div>
    <div className="flex flex-col gap-2">
      {devices.map(d=>
        <div key={d.id} className="flex justify-between items-center gap-3 border border-line rounded-xl py-2.5 px-3.5 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">{d.label}{d.current&&<span className="text-xs font-normal text-brand ml-2">this device</span>}</div>
            <div className="text-xs text-text-3 mt-0.5">
              {d.lastUsed?`Last used ${new Date(d.lastUsed.replace(" ","T")+"Z").toLocaleDateString("en-CA")}`:"Not used yet"}
              {" · expires "}{new Date(d.expiresAt).toLocaleDateString("en-CA")}</div>
          </div>
          <Btn kind="ghost" size="xs" onClick={async()=>{await api.del(`/auth/trusted-devices/${d.id}`).catch(()=>{});load();}}>Revoke</Btn>
        </div>)}
    </div>
  </Card>;
}

export function SettingsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const u=A.user;
  if(!u) return <DeniedPage/>;
  const [confirm,setConfirm]=useState(false);
  const [show2FA,setShow2FA]=useState(false); const [tfaPhone,setTfaPhone]=useState(""); const [tfaResult,setTfaResult]=useState(null);
  const [showOutbox,setShowOutbox]=useState(false);
  const S=A.userSettings;
  const Row=({icon,title,sub,children})=><div className="flex gap-3.5 items-center py-4 border-b border-line-soft">
    <div className="w-10 h-10 rounded-xl bg-bg text-text-2 flex items-center justify-center shrink-0"><I n={icon} s={18}/></div>
    <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-text">{title}</div>
      {sub&&<div className="text-sm text-text-2 mt-1 leading-normal">{sub}</div>}</div>{children}</div>;
  return <Page narrow>
    <H1 sub="Account, notifications and privacy">Settings</H1>
    <_EmailVerification u={u}/>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>Notifications</Lbl>
      {/* This switch IS the CASL consent record, not a cosmetic preference - the server refuses
          to send a job-alert email without it, and stores when and how it was given. */}
      <Row icon="bell" title="New matching jobs"
        sub={A.marketingConsent?.consent
          ? `Emailed by NorthHire Technologies Inc. when a saved search matches a new listing.${A.marketingConsent.at?` Consent recorded ${new Date(A.marketingConsent.at).toLocaleDateString()}.`:""}`
          : "Off — you'll still see matches in the app, but no email will be sent."}>
        <Switch on={!!A.marketingConsent?.consent} onChange={v=>A.setMarketingConsent(v)}/></Row>
      <Row icon="activity" title="Application updates" sub="When an employer moves you to a new stage">
        <Switch on={S.appAlerts} onChange={v=>A.setUserSetting("appAlerts",v)}/></Row>
      <Row icon="mail" title="Product and career emails" sub="New articles, trainings and platform updates">
        <Switch on={S.marketing} onChange={v=>A.setUserSetting("marketing",v)}/></Row>
    </Card>
    <_TrustedDevices/>
    {u.role==="seeker"&&<Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>Privacy</Lbl>
      <Row icon="eye" title="Let verified employers find my profile" sub="Only verified employers, and only for roles matching your preferences">
        <Switch on={S.discoverable} onChange={v=>A.setUserSetting("discoverable",v)}/></Row>
      <Row icon="lock" title="Hide my current employer" sub="Your work history still shows, without the company name">
        <Switch on={S.hideEmployer} onChange={v=>A.setUserSetting("hideEmployer",v)}/></Row>
      <Row icon="mail" title="Show my email to employers I apply to" sub="Turn off to keep your email private on every application">
        <Switch on={u.visibility?.email!==false} onChange={v=>A.saveProfile({...u,visibility:{...u.visibility,email:v}})}/></Row>
      <Row icon="phone" title="Show my phone number to employers I apply to" sub="Turn off to keep your phone number private on every application">
        <Switch on={u.visibility?.phone!==false} onChange={v=>A.saveProfile({...u,visibility:{...u.visibility,phone:v}})}/></Row>
    </Card>}
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>Your data</Lbl>
      <Row icon="download" title="Export my data" sub="A copy of your profile, CVs and applications">
        <Btn kind="outline" size="sm" onClick={A.exportData}>Export</Btn></Row>
      <Row icon="file" title="Privacy policy" sub="How we handle your personal information">
        <Btn kind="ghost" size="sm" iconR="chevR" onClick={()=>A.go("privacy")}>Read</Btn></Row>
    </Card>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>Security</Lbl>
      {(()=>{const tfa=A.twoFactor[u.id];
        return <Row icon="shield" title={tfa?.enabled?"Two-factor authentication enabled":"Two-factor authentication"}
          sub={tfa?.enabled?`Codes sent to ${tfa.phone}. Backup codes issued.`:"Add a second step at sign-in using your phone number."}>
          {tfa?.enabled?<Btn kind="outline" size="sm" onClick={()=>{A.disable2FA();}}>Disable</Btn>
            :<Btn kind="primary" size="sm" onClick={()=>setShow2FA(true)}>Set up</Btn>}
        </Row>;})()}
    </Card>

    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>Outbox</Lbl>
      <Row icon="mail" title="Sent messages" sub={`${A.outbox.length} email${A.outbox.length===1?"":"s"} sent from this account (password resets, notifications)`}>
        <Btn kind="ghost" size="sm" iconR="chevR" onClick={()=>setShowOutbox(true)}>View</Btn></Row>
    </Card>

    <Card pad={mob?18:24} style={{borderColor:C.redLn}}>
      <Lbl>Danger zone</Lbl>
      <Row icon="alert" title="Delete my account" sub="Removes your profile, CVs and saved jobs. Applications already sent stay with the employer.">
        <Btn kind="dangerSoft" size="sm" onClick={()=>setConfirm(true)}>Delete</Btn></Row>
    </Card>

    {show2FA&&<Modal onClose={()=>setShow2FA(false)} title="Set up two-factor authentication">
      {tfaResult?<div>
        <Banner tone="ok" icon="check" title="Two-factor is now on">Save your backup codes somewhere safe — each one can be used once if you lose your phone.</Banner>
        <div className="mt-4 p-4 bg-bg rounded-xl font-mono text-sm">
          <div className="text-xs text-text-3 font-semibold uppercase tracking-wide mb-2.5">Backup codes</div>
          <div className="grid grid-cols-2 gap-2">
            {tfaResult.codes.map(c=><div key={c} className="py-2 px-2.5 bg-white border border-line rounded-md text-center">{c}</div>)}</div></div>
        <Btn kind="primary" full style={{marginTop:16}} onClick={()=>{setShow2FA(false);setTfaResult(null);}}>Done</Btn>
      </div>:<div className="flex flex-col gap-3.5">
        <Banner tone="brand" icon="shield" title="Demo mode">Real 2FA would send an SMS code via Twilio. Here we just save your phone and issue backup codes.</Banner>
        <Field label="Phone number" hint="Where verification codes would be sent.">
          <Input icon="phone" value={tfaPhone} onChange={e=>setTfaPhone(e.target.value)} placeholder="416 555 0100"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShow2FA(false)}>Cancel</Btn>
          <Btn kind="primary" icon="shield" disabled={tfaPhone.replace(/\D/g,"").length<10} onClick={async()=>{const r=await A.enable2FA(tfaPhone);if(r.ok)setTfaResult(r);}}>Enable 2FA</Btn></div></div>}</Modal>}

    {showOutbox&&<Modal onClose={()=>setShowOutbox(false)} title="Outbox — all sent messages">
      {A.outbox.length===0?<Empty icon="mail" title="Nothing sent" body="Password resets and notification emails would appear here."/>
        :<div className="flex flex-col gap-2.5 max-h-100 overflow-y-auto">
          {A.outbox.map(m=><div key={m.id} className="p-3.5 bg-bg rounded-xl border border-line">
            <div className="flex justify-between gap-2.5 items-baseline mb-1.5">
              <div className="text-sm font-semibold text-text">{m.subject}</div>
              <div className="text-xs text-text-3 shrink-0">{m.at}</div></div>
            <div className="text-xs text-text-3 mb-2">To: {m.to}</div>
            <div className="text-sm text-text-2 leading-normal">{m.body}</div>
            {m.previewUrl&&<a href={m.previewUrl} target="_blank" rel="noreferrer" className="text-xs text-brand font-semibold mt-2 inline-block">View the actual sent email →</a>}</div>)}</div>}</Modal>}
    <Modal open={confirm} onClose={()=>setConfirm(false)} title="Delete your account?" sub="This cannot be undone"
      footer={<div className="flex gap-2.5"><Btn kind="outline" full onClick={()=>setConfirm(false)}>Keep my account</Btn>
        <Btn kind="danger" full icon="trash" onClick={()=>{setConfirm(false);A.deleteAccount();}}>Delete permanently</Btn></div>}>
      <p className="text-base text-text-2 leading-relaxed">
        Deleting removes your profile, your {A.cvs.length} saved {A.cvs.length===1?"CV":"CVs"}, your saved jobs and your notification history.
        Applications you have already sent remain with those employers, who become responsible for that copy under PIPEDA.</p></Modal>
  </Page>;
}
