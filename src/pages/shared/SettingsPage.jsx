import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Switch, Field, Input, Empty, Banner, Lbl, Modal, Page, H1 } from "../../design/primitives.jsx";
import { DeniedPage } from "./DeniedPage.jsx";

export function SettingsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const u=A.user;
  if(!u) return <DeniedPage/>;
  const [confirm,setConfirm]=useState(false);
  const [show2FA,setShow2FA]=useState(false); const [tfaPhone,setTfaPhone]=useState(""); const [tfaResult,setTfaResult]=useState(null);
  const [showOutbox,setShowOutbox]=useState(false);
  const S=A.userSettings;
  const Row=({icon,title,sub,children})=><div style={{display:"flex",gap:14,alignItems:"center",padding:"16px 0",borderBottom:`1px solid ${C.lineSoft}`}}>
    <div style={{width:38,height:38,borderRadius:10,background:C.bg,color:C.text2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={icon} s={18}/></div>
    <div style={{flex:1,minWidth:0}}><div style={{fontSize:14.5,fontWeight:620,color:C.text}}>{title}</div>
      {sub&&<div style={{fontSize:13,color:C.text2,marginTop:3,lineHeight:1.5}}>{sub}</div>}</div>{children}</div>;
  return <Page narrow>
    <H1 sub="Account, notifications and privacy">Settings</H1>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>Notifications</Lbl>
      <Row icon="bell" title="New matching jobs" sub="A short digest, at most twice a week">
        <Switch on={S.matchAlerts} onChange={v=>A.setUserSetting("matchAlerts",v)}/></Row>
      <Row icon="activity" title="Application updates" sub="When an employer moves you to a new stage">
        <Switch on={S.appAlerts} onChange={v=>A.setUserSetting("appAlerts",v)}/></Row>
      <Row icon="mail" title="Product and career emails" sub="New articles, trainings and platform updates">
        <Switch on={S.marketing} onChange={v=>A.setUserSetting("marketing",v)}/></Row>
    </Card>
    {u.role==="seeker"&&<Card pad={mob?18:24} style={{marginBottom:16}}>
      <Lbl>Privacy</Lbl>
      <Row icon="eye" title="Let verified employers find my profile" sub="Only verified employers, and only for roles matching your preferences">
        <Switch on={S.discoverable} onChange={v=>A.setUserSetting("discoverable",v)}/></Row>
      <Row icon="lock" title="Hide my current employer" sub="Your work history still shows, without the company name">
        <Switch on={S.hideEmployer} onChange={v=>A.setUserSetting("hideEmployer",v)}/></Row>
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
      <Row icon="refresh" title="Reset all local data" sub="Wipes localStorage — sign-ins, saved jobs, drafts, everything. Reseeds with fresh demo data on reload.">
        <Btn kind="dangerSoft" size="sm" onClick={()=>{if(window.confirm("Wipe all local data? You will be signed out and everything reseeds."))A.clearAllData();}}>Reset</Btn></Row>
    </Card>

    {show2FA&&<Modal onClose={()=>setShow2FA(false)} title="Set up two-factor authentication">
      {tfaResult?<div>
        <Banner tone="ok" icon="check" title="Two-factor is now on">Save your backup codes somewhere safe — each one can be used once if you lose your phone.</Banner>
        <div style={{marginTop:16,padding:16,background:C.bg,borderRadius:12,fontFamily:"ui-monospace,monospace",fontSize:14}}>
          <div style={{fontSize:12,color:C.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:10,fontFamily:"inherit"}}>Backup codes</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {tfaResult.codes.map(c=><div key={c} style={{padding:"8px 10px",background:"#fff",border:`1px solid ${C.line}`,borderRadius:6,textAlign:"center"}}>{c}</div>)}</div></div>
        <Btn kind="primary" full style={{marginTop:16}} onClick={()=>{setShow2FA(false);setTfaResult(null);}}>Done</Btn>
      </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Banner tone="brand" icon="shield" title="Demo mode">Real 2FA would send an SMS code via Twilio. Here we just save your phone and issue backup codes.</Banner>
        <Field label="Phone number" hint="Where verification codes would be sent.">
          <Input icon="phone" value={tfaPhone} onChange={e=>setTfaPhone(e.target.value)} placeholder="416 555 0100"/></Field>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShow2FA(false)}>Cancel</Btn>
          <Btn kind="primary" icon="shield" disabled={tfaPhone.replace(/\D/g,"").length<10} onClick={()=>{const r=A.enable2FA(tfaPhone);if(r.ok)setTfaResult(r);}}>Enable 2FA</Btn></div></div>}</Modal>}

    {showOutbox&&<Modal onClose={()=>setShowOutbox(false)} title="Outbox — all sent messages">
      {A.outbox.length===0?<Empty icon="mail" title="Nothing sent" body="Password resets and notification emails would appear here."/>
        :<div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overflowY:"auto"}}>
          {A.outbox.map(m=><div key={m.id} style={{padding:14,background:C.bg,borderRadius:10,border:`1px solid ${C.line}`}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"baseline",marginBottom:6}}>
              <div style={{fontSize:14,fontWeight:640,color:C.text}}>{m.subject}</div>
              <div style={{fontSize:11.5,color:C.text3,flexShrink:0}}>{m.at}</div></div>
            <div style={{fontSize:12.5,color:C.text3,marginBottom:8}}>To: {m.to}</div>
            <div style={{fontSize:13.5,color:C.text2,lineHeight:1.55}}>{m.body}</div></div>)}</div>}</Modal>}
    <Modal open={confirm} onClose={()=>setConfirm(false)} title="Delete your account?" sub="This cannot be undone"
      footer={<div style={{display:"flex",gap:10}}><Btn kind="outline" full onClick={()=>setConfirm(false)}>Keep my account</Btn>
        <Btn kind="danger" full icon="trash" onClick={()=>{setConfirm(false);A.deleteAccount();}}>Delete permanently</Btn></div>}>
      <p style={{fontSize:15,color:C.text2,lineHeight:1.7,margin:0}}>
        Deleting removes your profile, your {A.cvs.length} saved {A.cvs.length===1?"CV":"CVs"}, your saved jobs and your notification history.
        Applications you have already sent remain with those employers, who become responsible for that copy under PIPEDA.</p></Modal>
  </Page>;
}
