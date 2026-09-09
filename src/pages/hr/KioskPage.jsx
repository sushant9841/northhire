import { useState, useEffect } from "react";
import { api } from "../../helpers/api.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Input, Field, Banner } from "../../design/primitives.jsx";

/* The shared time clock: a tablet mounted by the site entrance. Deliberately its own full-screen
   surface with no navigation — whoever walks up to it is punching in, not browsing the HR Suite,
   and the device must never become a way into anyone's account.

   Two secrets, held in different places: the DEVICE stores a pairing token (in localStorage on
   that tablet, set once by an administrator), and the PERSON keys in a short PIN. The PIN alone
   is useless on any other device, and can't sign anyone in anywhere.

   This is what the company setting "remote punch-in disabled — use the office time clock"
   actually points at; before this it pointed at nothing. */

const TOKEN_KEY = "northhire_kiosk_token";

const KEYS = ["1","2","3","4","5","6","7","8","9","clear","0","enter"];

export function KioskPage(){
  const [token,setToken]=useState(()=>{try{return localStorage.getItem(TOKEN_KEY)||"";}catch{return "";}});
  const [pairInput,setPairInput]=useState("");
  const [pin,setPin]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState(null);   // {action,name,time,...}
  const [err,setErr]=useState("");
  const [clock,setClock]=useState(new Date());

  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t);},[]);
  // Clear the confirmation after a few seconds so the next person doesn't see a colleague's name.
  useEffect(()=>{
    if(!result&&!err)return;
    const t=setTimeout(()=>{setResult(null);setErr("");},6000);
    return()=>clearTimeout(t);
  },[result,err]);

  const pair=()=>{
    const t=pairInput.trim();
    if(!t)return;
    try{localStorage.setItem(TOKEN_KEY,t);}catch{}
    setToken(t); setPairInput(""); setErr("");
  };
  const unpair=()=>{
    try{localStorage.removeItem(TOKEN_KEY);}catch{}
    setToken(""); setResult(null); setErr("");
  };

  const submit=async(value)=>{
    const code=value??pin;
    if(code.length<4){setErr("Enter your 4–6 digit PIN.");setPin("");return;}
    setBusy(true); setErr(""); setResult(null);
    try{
      const r=await api.post("/hr/kiosk/punch",{pin:code,deviceToken:token});
      setResult(r);
    }catch(e){
      setErr(e.message);
    }finally{
      setBusy(false); setPin("");
    }
  };

  const press=k=>{
    if(busy)return;
    if(k==="clear"){setPin("");setErr("");return;}
    if(k==="enter"){submit();return;}
    setPin(p=>{
      const next=(p+k).slice(0,6);
      if(next.length===6)submit(next);   // auto-submit at max length
      return next;
    });
  };

  const hhmm=clock.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit",hour12:false});
  const dateStr=clock.toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"});

  if(!token) return <div className="min-h-screen bg-ink flex items-center justify-center p-6">
    <Card pad={30} style={{maxWidth:460,width:"100%"}}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center"><I n="clock" s={20}/></div>
        <div>
          <div className="text-base font-bold text-text">Pair this time clock</div>
          <div className="text-xs text-text-2 mt-0.5">One-time setup for this device</div>
        </div>
      </div>
      <p className="text-sm text-text-2 leading-relaxed mb-4">
        An administrator creates a terminal under <strong className="text-text">HR Suite → Settings → Time clocks</strong> and
        gets a pairing code. Paste it here once; this tablet remembers it.
      </p>
      <Field label="Pairing code">
        <Input value={pairInput} onChange={e=>setPairInput(e.target.value)} placeholder="kiosk_…" autoFocus/>
      </Field>
      <Btn kind="primary" full size="lg" style={{marginTop:14}} onClick={pair} disabled={!pairInput.trim()}>Pair terminal</Btn>
    </Card>
  </div>;

  return <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6 select-none">
    <div className="text-center mb-6">
      <div className="text-white font-bold tabular-nums" style={{fontSize:64,lineHeight:1}}>{hhmm}</div>
      <div className="text-white/55 text-sm mt-1.5">{dateStr}</div>
    </div>

    <Card pad={26} style={{maxWidth:400,width:"100%"}}>
      {result
        ? <div className="text-center py-2">
            <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${result.action==="in"?"bg-ok":"bg-brand"}`}>
              <I n="check" s={26} c="#fff" w={3}/></div>
            <div className="text-lg font-bold text-text mt-3.5">{result.name}</div>
            <div className="text-sm text-text-2 mt-1">
              {result.action==="in"
                ? `Punched in at ${result.time}${result.late?" — marked late":""}`
                : `Punched out at ${result.time} — ${result.hours} hours`}
            </div>
            {result.site&&<div className="text-xs text-text-3 mt-1">{result.site}</div>}
          </div>
        : <>
          <div className="text-center mb-4">
            <div className="text-sm font-semibold text-text">Enter your PIN to punch in or out</div>
            <div className="flex justify-center gap-2 mt-3.5" aria-live="polite" aria-label={`${pin.length} digits entered`}>
              {[0,1,2,3,4,5].map(i=>
                <span key={i} className={`w-3 h-3 rounded-full transition-colors duration-150 ${i<pin.length?"bg-brand":"bg-line"}`}/>)}
            </div>
          </div>
          {err&&<Banner tone="danger" icon="alert" style={{marginBottom:12}}>{err}</Banner>}
          <div className="grid grid-cols-3 gap-2.5">
            {KEYS.map(k=>
              <button key={k} type="button" disabled={busy} onClick={()=>press(k)}
                aria-label={k==="clear"?"Clear":k==="enter"?"Submit PIN":`Digit ${k}`}
                className={`h-16 rounded-xl text-xl font-semibold cursor-pointer transition-colors duration-100 border
                  ${k==="enter"?"bg-brand text-white border-brand hover:bg-brand-dark"
                    :k==="clear"?"bg-bg text-text-2 border-line hover:bg-line-soft"
                    :"bg-white text-text border-line hover:bg-bg"} disabled:opacity-50`}>
                {k==="clear"?"Clear":k==="enter"?(busy?"…":"Enter"):k}
              </button>)}
          </div>
        </>}
    </Card>

    <button onClick={unpair} className="mt-5 bg-transparent border-0 cursor-pointer text-xs text-white/35 hover:text-white/70">
      Unpair this terminal
    </button>
  </div>;
}
