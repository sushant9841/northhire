import { useEffect, useState } from "react";
import { use } from "../../store/context.js";
import { api } from "../../helpers/api.js";
import { Page, H1, Card, Btn, Banner } from "../../design/primitives.jsx";

/* The landing page for the unsubscribe link CASL requires on every commercial email. It has to
   work for someone who is not signed in and may never sign in again, so it takes the one-time
   token straight from the URL and calls the public endpoint - no auth, no account lookup shown
   back to the visitor (a wrong token gets the same confirmation, so the page can't be used to
   test whether an address has an account). */
export function UnsubscribePage(){
  const A=use();
  const [state,setState]=useState({loading:true,message:"",sender:null});

  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get("token")||"";
    if(!token){
      setState({loading:false,message:"This unsubscribe link is missing its token. Open the link straight from the email, or turn job-alert emails off in Settings.",sender:null});
      return;
    }
    api.get(`/consent/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(r=>setState({loading:false,message:r.message,sender:r.sender}))
      .catch(e=>setState({loading:false,message:`Couldn't process the unsubscribe: ${e.message}`,sender:null}));
  },[]);

  return <Page narrow>
    <H1 sub="Job-alert emails from NorthHire">Unsubscribe</H1>
    <Card pad={24}>
      {state.loading
        ? <div className="text-sm text-text-2">Processing your request…</div>
        : <>
          <Banner tone={state.sender?"ok":"warn"} icon={state.sender?"check":"alert"}>{state.message}</Banner>
          {state.sender&&<div className="text-sm text-text-2 mt-5 leading-relaxed">
            <div className="font-semibold text-text mb-1">{state.sender.legalName}</div>
            <div>{state.sender.address}</div>
            <div>{state.sender.email}</div>
          </div>}
          <div className="flex gap-2.5 mt-6 flex-wrap">
            <Btn kind="primary" onClick={()=>A.go("home")}>Back to NorthHire</Btn>
            {A.user&&<Btn kind="outline" onClick={()=>A.go("settings")}>Email settings</Btn>}
          </div>
        </>}
    </Card>
  </Page>;
}
