import { useState, useEffect } from "react";

export function useMedia(q){const[m,s]=useState(()=>typeof window!=="undefined"&&window.matchMedia?window.matchMedia(q).matches:false);
 useEffect(()=>{if(typeof window==="undefined"||!window.matchMedia)return;const x=window.matchMedia(q),h=e=>s(e.matches);s(x.matches);
 x.addEventListener?x.addEventListener("change",h):x.addListener(h);
 return()=>{x.removeEventListener?x.removeEventListener("change",h):x.removeListener(h);};},[q]);return m;}
