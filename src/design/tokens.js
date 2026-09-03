/* ═══════════════ TOKENS · 60 neutral / 30 ink / 10 brand ═══════════════ */
export const C = {
  brand:"#005CCC", brandDark:"#004AA6", brandDeep:"#003B85",
  wash:"#EDF4FF", line2:"#C9DEFF", tint:"#F6FAFF",
  ink:"#0B1220", ink2:"#151F31", ink3:"#2A3852",
  text:"#0E1727", text2:"#4A5A73", text3:"#8493A9",
  line:"#E3E8EF", lineSoft:"#EEF1F6",
  bg:"#F7F9FC", surface:"#FFFFFF",
  ok:"#07724F", okBg:"#E9F7F1", okLn:"#B3E3D1",
  warn:"#8F5B05", warnBg:"#FDF5E6", warnLn:"#F0DDB0",
  red:"#AE2119", redBg:"#FDF0EF", redLn:"#F5CDC9",
  violet:"#5B3BC4", violetBg:"#F1EDFD", violetLn:"#D9CFFA",
};
export const FONT="'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
export const SH={ xs:"0 1px 2px rgba(11,18,32,.05)", sm:"0 2px 8px rgba(11,18,32,.07)",
  md:"0 8px 26px rgba(11,18,32,.10)", lg:"0 20px 56px rgba(11,18,32,.18)" };

/* These colors are hand-duplicated into index.css's @theme block (Tailwind needs the literal
   values there to generate bg-brand/text-text-3/etc. utility classes at build time - it can't
   import a JS object). This file stays the source of truth for both; this dev-only check catches
   the moment someone edits one side and forgets the other, instead of the drift surfacing later
   as a silent visual mismatch between a `style={{color:C.x}}` usage and a `text-x` className one. */
if(import.meta.env.DEV&&typeof document!=="undefined"){
  const toVarName=k=>"--color-"+k.replace(/([a-z])([A-Z])/g,"$1-$2").replace(/([a-z])([0-9])/g,"$1-$2").toLowerCase();
  queueMicrotask(()=>{
    const cs=getComputedStyle(document.documentElement);
    const mismatches=Object.entries(C).filter(([k,v])=>{
      const cssVal=cs.getPropertyValue(toVarName(k)).trim();
      return cssVal&&cssVal.toLowerCase()!==v.toLowerCase();
    });
    if(mismatches.length)console.warn("[tokens] C is out of sync with index.css's @theme block:",
      mismatches.map(([k,v])=>`${k}: js=${v} css=${cs.getPropertyValue(toVarName(k)).trim()}`));
  });
}
