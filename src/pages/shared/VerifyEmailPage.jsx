import { useEffect, useState } from "react";
import { use } from "../../store/context.js";
import { api } from "../../helpers/api.js";
import { Page, Card, Btn, Banner, HERO_QUIET } from "../../design/primitives.jsx";

/* Where the emailed confirmation link lands. Works signed-out: the token is what proves the
   person can read that inbox, which is the entire question being asked — requiring them to sign
   in first would just add a step without adding any assurance. */
export function VerifyEmailPage(){
  const A=use();
  const [state,setState]=useState({loading:true,ok:false,message:""});

  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get("token")||"";
    if(!token){
      setState({loading:false,ok:false,message:"This confirmation link is missing its token. Open the link directly from the email."});
      return;
    }
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r=>setState({loading:false,ok:true,message:`${r.email} is confirmed. Job alerts and employer messages will reach you here.`}))
      .catch(e=>setState({loading:false,ok:false,message:e.message}));
  },[]);

  return <Page narrow>
    <h1 className={`${HERO_QUIET} text-3xl mb-5`}>Confirm your email</h1>
    <Card pad={26}>
      {state.loading
        ? <div className="text-sm text-text-2">Checking your link…</div>
        : <>
            <Banner tone={state.ok?"ok":"warn"} icon={state.ok?"check":"alert"}>{state.message}</Banner>
            <div className="flex gap-2.5 mt-5 flex-wrap">
              <Btn kind="primary" onClick={()=>A.go(A.user?"settings":"home")}>{A.user?"Back to settings":"Go to NorthHire"}</Btn>
              {!state.ok&&A.user&&<Btn kind="outline" onClick={()=>A.go("settings")}>Send a new link</Btn>}
            </div>
          </>}
    </Card>
  </Page>;
}
