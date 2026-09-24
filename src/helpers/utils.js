import { currentMoney as _currentMoney } from "../i18n/format.js";

/* Scrolls to and focuses the first invalid field on a form after a failed submit, so a validation
   error above the fold (or off-screen on a long form) doesn't leave the visitor staring at a
   button that silently refused to submit. Wire it into a submit handler right after the errors
   object is computed: `const errs=validate(); if(Object.keys(errs).length){setErrors(errs);
   focusFirstError(errs); return;}`. Relies on each error-bearing field carrying
   `data-field-error="<key>"` on the input/select/textarea itself (or its wrapper, in which case
   the first focusable descendant is used) - errObj's key order (JS preserves insertion order for
   string keys) decides which field counts as "first" when a form defines errors out of visual
   order. */
export const focusFirstError=errObj=>{
  if(typeof document==="undefined"||!errObj)return;
  const keys=Object.keys(errObj).filter(k=>errObj[k]);
  for(const key of keys){
    const el=document.querySelector(`[data-field-error="${key}"]`);
    if(!el)continue;
    el.scrollIntoView({behavior:"smooth",block:"center"});
    const focusable=(el.matches("input,select,textarea,button")?el:el.querySelector("input,select,textarea,button"))||el;
    focusable.focus?.({preventScroll:true});
    return;
  }
};
export const uid=p=>p+Math.random().toString(36).slice(2,9);
// QA-r4 tail: was hardcoded en-CA ("$1,234"). Now delegates to the active i18n locale so
// fr-CA renders "1 234,00 $" (dollar sign after, space as thousands separator) — the format
// required by Bill 96 for Quebec employers. LocaleProvider syncs _currentLocale on every user
// locale change; callers don't need to pass the locale explicitly. Import at top so this file
// stays a pure-helpers module.
export const money=n=>_currentMoney(n);
// QA-r5 (user 2026-09-24): guard against $0k-$0k rendering when a yr-unit job carries hourly-
// scale numbers, and against "$0 – $0" for genuinely missing pay. A range that rounds to zero
// is data corruption; showing "Not specified" is honest, "$0k – $0k" is misleading.
export const pay=j=>{
  const lo=Number(j?.lo)||0, hi=Number(j?.hi)||0;
  if(!lo&&!hi) return "Pay not specified";
  if(j.unit==="yr"){
    const kLo=Math.round(lo/1000), kHi=Math.round(hi/1000);
    if(!kLo&&!kHi) return "Pay not specified"; // < $500/yr is corrupt data, not a real salary
    return kLo===kHi?`$${kLo}k`:`$${kLo}k – $${kHi}k`;
  }
  if(j.unit==="mi") return lo===hi?`$${lo.toFixed(2)}`:`$${lo.toFixed(2)} – $${hi.toFixed(2)}`;
  return lo===hi?`$${lo}`:`$${lo} – $${hi}`;
};
export const payUnit=j=>j.unit==="yr"?"per year":j.unit==="mi"?"per mile":"per hour";
export const payShort=j=>j.unit==="yr"?"/yr":j.unit==="mi"?"/mi":"/hr";
// QA-r5: shared rating formatter. NEVER render a raw rating float in JSX — the seed data can
// carry 15-decimal-place floats that show up as "4.913101164873179" if not formatted. Also
// gate on a real review count via ratingHasReviews() before rendering stars; a rating without
// reviews behind it is a fabricated number.
export const ratingLabel=r=>{const n=Number(r); return Number.isFinite(n)&&n>0?n.toFixed(1):"";};
export const ratingHasReviews=(rating,reviews)=>Number(rating)>0&&Array.isArray(reviews)&&reviews.length>0;
export const annual=j=>j.unit==="yr"?j.lo:j.unit==="hr"?Math.round(j.lo*2080):Math.round(j.lo*110000);
export const dlText=d=>d<=0?"Closed":d===1?"Closes today":d<=7?`${d} days left`:`${d} days left`;
export const _ago=ms=>Date.now()-ms;
export const _fmtDate=d=>d.toISOString().slice(0,10);
export const _weekAgo=(n)=>{const d=new Date(); d.setDate(d.getDate()-n*7); return _fmtDate(d);};
export const _dayAgo=(n)=>{const d=new Date(); d.setDate(d.getDate()-n); return _fmtDate(d);};
export const _dayFromNow=(n)=>{const d=new Date(); d.setDate(d.getDate()+n); return _fmtDate(d);};
export const _weekStart=(offsetWeeks=0)=>{const d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)-offsetWeeks*7); return _fmtDate(d);};
export const nowStamp=()=>{const d=new Date();return d.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit"});};
/* Multi-word-tolerant text search: every word in the query must appear somewhere across the
   given text fields, in any order - a plain single .includes() call fails on word order or
   extra whitespace ("electrician red seal" wouldn't match "Red Seal Electrician"). */
/* Every word must appear somewhere, in any order — so "seal red" still finds "Red Seal". */
export const matchesQuery=(query,...fields)=>{
  const q=query.trim().toLowerCase(); if(!q)return true;
  const haystack=fields.join(" ").toLowerCase();
  return q.split(/\s+/).every(word=>haystack.includes(word));
};

/* Boolean candidate search, for the case the plain matcher can't express: finding someone who has
   welding OR fabrication experience but is NOT an apprentice. Supports quoted phrases, AND/OR
   (AND implied), NOT / leading -, and parentheses.

   Deliberately a small recursive-descent parser rather than a regex pile: precedence between AND
   and OR is the entire point, and regexes can't express it. An unparseable query falls back to
   plain word matching instead of returning nothing, because a recruiter mid-typing shouldn't
   watch their result list empty out. */
export function matchesBooleanQuery(query,...fields){
  const raw=String(query||"").trim(); if(!raw)return true;
  const haystack=fields.join(" ").toLowerCase();
  try{
    // A bare \S+ would swallow the closing paren into the word before it ("fabrication)"),
    // silently breaking every grouped query - so a word is explicitly "not whitespace or parens".
    const tokens=raw.toLowerCase().match(/"[^"]*"|\(|\)|[^\s()]+/g)||[];
    let i=0;
    const peek=()=>tokens[i];
    const term=()=>{
      let t=peek();
      if(t==="("){i++;const v=orExpr();if(peek()===")")i++;return v;}
      if(t==="not"){i++;return !term();}
      if(t?.startsWith("-")&&t.length>1){i++;return !haystack.includes(t.slice(1));}
      i++;
      if(t===undefined)return true;
      return haystack.includes(t.replace(/^"|"$/g,""));
    };
    const andExpr=()=>{
      let v=term();
      while(peek()&&peek()!==")"&&peek()!=="or"){
        if(peek()==="and")i++;
        if(!peek()||peek()===")")break;
        const r=term(); v=v&&r;
      }
      return v;
    };
    const orExpr=()=>{
      let v=andExpr();
      while(peek()==="or"){i++;const r=andExpr();v=v||r;}
      return v;
    };
    const result=orExpr();
    return typeof result==="boolean"?result:matchesQuery(raw,...fields);
  }catch{
    return matchesQuery(raw,...fields);
  }
}
