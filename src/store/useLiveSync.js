import { useEffect, useRef } from "react";
import { API_BASE } from "../helpers/api.js";

/* Client half of the SSE live-sync loop. Opens EventSource to /api/events for as long as a user
   is signed in, and translates server pushes into local store refreshes and toast notifications.

   The hook takes a `handlers` object rather than reaching into store internals directly - the
   store owns the mutations, this hook only routes events. Exponential backoff on unexpected
   drops (1s → 2s → 4s → … → 30s cap); a clean logout closes the stream and stops trying to
   reconnect. */
export function useLiveSync({ enabled, handlers }){
  const handlersRef=useRef(handlers);
  // Freshest handlers, without re-opening the socket on every render.
  useEffect(()=>{handlersRef.current=handlers;},[handlers]);

  useEffect(()=>{
    if(!enabled||typeof window==="undefined"||typeof EventSource==="undefined")return;
    let es=null; let cancelled=false; let retry=0; let timer=null;

    const dispatch=(type,data)=>{
      const h=handlersRef.current||{};
      try{
        const fn=h[type]||h.onAny;
        if(typeof fn==="function")fn(data,type);
      }catch(err){
        if(typeof console!=="undefined")console.warn(`[NorthHire] live-sync handler for ${type} threw:`, err);
      }
    };

    const open=()=>{
      if(cancelled)return;
      /* API_BASE ends in "/api" (see helpers/api.js) - the events router is mounted at
         /api/events, so append the path directly. `withCredentials` sends the session cookie
         with the initial handshake, same as fetch({credentials:"include"}). */
      try{
        es=new EventSource(`${API_BASE}/events`,{withCredentials:true});
      }catch(err){
        // Some environments (very old browsers, or when the URL is not http/https) throw here.
        if(typeof console!=="undefined")console.warn(`[NorthHire] live-sync could not open EventSource:`, err);
        return;
      }
      /* Every event type is registered explicitly rather than trusting `onmessage`, because
         EventSource dispatches typed events (`event: application:updated\ndata: ...`) to
         addEventListener("application:updated", ...) and NOT to onmessage. */
      const TYPES=["hello","application:new","application:updated","message:new","interview:scheduled","interview:updated","interview:cancelled","notification:new","job:published","hr:employee-created","payroll:run-updated","timesheet:updated","punch:new","leave:updated"];
      for(const t of TYPES){
        es.addEventListener(t,(ev)=>{
          let payload=null;
          try{payload=JSON.parse(ev.data||"null");}catch{/* ignore */}
          if(t==="hello")retry=0; // successful handshake resets the backoff
          else dispatch(t,payload);
        });
      }
      es.onerror=()=>{
        if(cancelled)return;
        // EventSource's built-in reconnect fires too fast against a truly-down server; take
        // over ourselves with exponential backoff so the log doesn't fill with retries.
        try{es.close();}catch{/* ignore */}
        const wait=Math.min(30000,1000*Math.pow(2,retry++));
        timer=setTimeout(open,wait);
      };
    };

    open();

    return ()=>{
      cancelled=true;
      if(timer)clearTimeout(timer);
      if(es)try{es.close();}catch{/* ignore */}
    };
  },[enabled]);
}
