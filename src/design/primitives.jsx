import { useState, useEffect, useRef } from "react";
import { C, SH } from "./tokens.js";
import { I } from "./icons.jsx";
import { useMedia } from "../helpers/hooks.js";

/* ═══════════════ VECTOR ART + SMART IMAGE (real URL first, SVG fallback) ═══════════════
   Every visual has a real-image URL AND an SVG fallback. The <SmartImg> component
   tries the URL first — if it 404s, times out, or the network blocks it, it swaps
   to the SVG art so the UI never shows a broken-image icon. In this preview sandbox
   image hosts are blocked, so you see the SVG art; in a real environment (CodeSandbox,
   StackBlitz, local Vite, production) the real photos and logos load automatically.  */

/* --- Company logo marks: distinct geometric mark per brand (SVG fallback) --- */
export const MARKS = {
  bolt:   (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M27 10 16 26h7l-2 12 11-16h-7z" fill={b}/></g>,
  arc:    (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M13 33a11 11 0 0 1 22 0" stroke={b} strokeWidth="4.5" fill="none" strokeLinecap="round"/><circle cx="24" cy="33" r="3.4" fill={b}/></g>,
  cross:  (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><rect x="20.5" y="12" width="7" height="24" rx="2" fill={b}/><rect x="12" y="20.5" width="24" height="7" rx="2" fill={b}/></g>,
  road:   (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M18 36 22 12h4l4 24z" fill={b} opacity=".95"/><rect x="22.6" y="18" width="2.8" height="5" rx="1.2" fill={a}/><rect x="22.6" y="27" width="2.8" height="5" rx="1.2" fill={a}/></g>,
  basket: (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M14 20h20l-2.6 14a2 2 0 0 1-2 1.7H18.6a2 2 0 0 1-2-1.7z" fill={b}/><path d="M19 20a5 5 0 0 1 10 0" stroke={b} strokeWidth="3" fill="none" strokeLinecap="round"/></g>,
  flame:  (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M24 11c6 6 9 9.5 9 15a9 9 0 1 1-18 0c0-3 1.6-5.5 4-8 .6 2 1.8 3 3 3 0-4 .8-7 2-10z" fill={b}/></g>,
  gear:   (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><circle cx="24" cy="24" r="9" stroke={b} strokeWidth="4" fill="none"/><circle cx="24" cy="24" r="2.6" fill={b}/><rect x="22" y="8" width="4" height="6" rx="1.6" fill={b}/><rect x="22" y="34" width="4" height="6" rx="1.6" fill={b}/></g>,
  shield: (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M24 11 34 15v9c0 7-10 13-10 13s-10-6-10-13v-9z" fill={b}/></g>,
  leafm:  (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M33 13c0 12-5.5 21-13 21a7.5 7.5 0 0 1 0-15c6 0 9-3 13-6z" fill={b}/><path d="M15 37c4-8 9-12 15-14" stroke={a} strokeWidth="2.4" fill="none" strokeLinecap="round"/></g>,
  book:   (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="M13 14h9a4 4 0 0 1 4 4v18a3.4 3.4 0 0 0-3.4-3.4H13z" fill={b}/><path d="M35 14h-6.6a4 4 0 0 0-4 4v18a3.4 3.4 0 0 1 3.4-3.4H35z" fill={b} opacity=".62"/></g>,
  chart:  (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><rect x="13" y="26" width="6" height="11" rx="2" fill={b}/><rect x="21" y="19" width="6" height="18" rx="2" fill={b}/><rect x="29" y="12" width="6" height="25" rx="2" fill={b}/></g>,
  hex:    (a,b)=><g><rect width="48" height="48" rx="12" fill={a}/><path d="m24 11 10 6v14l-10 6-10-6V17z" fill={b}/><path d="m24 19 5 3v6l-5 3-5-3v-6z" fill={a}/></g>,
};
export function MarkSvg({ kind="hex", a="#005CCC", b="#FFFFFF", size=48, radius }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" style={{ display:"block", flexShrink:0, borderRadius:radius }}>
    {(MARKS[kind]||MARKS.hex)(a,b)}</svg>;
}

/* --- Illustrated portrait, deterministic per seed (SVG fallback) --- */
export const SKIN=["#F0C49B","#DDA679","#C08552","#8E5B3A","#6B4028","#F5D6BC"];
export const HAIR=["#2B2118","#4A3524","#7A4B22","#1A1A1A","#5C5C5C","#8C6239","#3A2D1F"];
export const TOP=["#005CCC","#0B7A4B","#2A3852","#8F5B05","#5B3BC4","#AE2119","#0E6B8C","#2F5233"];
export function PortraitSvg({ seed=0, size=48, radius=999, bg }) {
  const s=SKIN[seed%SKIN.length], h=HAIR[(seed*3)%HAIR.length], t=TOP[(seed*5)%TOP.length];
  const style=seed%4, glasses=seed%5===0, beard=seed%3===1;
  const back=bg||["#EDF4FF","#E9F7F1","#FDF5E6","#F1EDFD","#FDF0EF"][seed%5];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display:"block", flexShrink:0, borderRadius:radius, background:back }}>
      <circle cx="32" cy="32" r="32" fill={back}/>
      <path d="M8 64c0-12.5 10.7-19 24-19s24 6.5 24 19z" fill={t}/>
      <path d="M26 45.5c1.9 2.6 8.2 2.6 12 0l-2 5.5h-8z" fill="#fff" opacity=".9"/>
      <path d="M27 38h10v8c0 2-10 2-10 0z" fill={s}/>
      <ellipse cx="32" cy="27" rx="12.4" ry="13.6" fill={s}/>
      <circle cx="19.8" cy="28" r="2.4" fill={s}/><circle cx="44.2" cy="28" r="2.4" fill={s}/>
      {style===0 && <path d="M19.4 26c0-8 5.6-12.6 12.6-12.6S44.6 18 44.6 26c0-3.6-3.4-5-6-5.6-3.4-.8-9.4-.8-13 1.6-2.6 1.8-3.4 3.4-3.4 4z" fill={h}/>}
      {style===1 && <path d="M19.4 27.6c-.6-9 5-14.2 12.6-14.2s13.2 5.2 12.6 14.2c-.8-4.6-1.6-8-4.4-8.6-2 2.4-11 3.4-15.4 1-1.8 1.4-4.4 3.4-5.4 7.6z" fill={h}/>}
      {style===2 && <path d="M20 25.4c0-7.6 5.4-12 12-12s12 4.4 12 12c0 1.6-.4 2.6-.4 2.6-.8-4-2.4-6-4.6-6.6-4 1.6-10.6 1.6-14.6-.4-2.2 1.6-3.6 3.6-4 7-.2-.6-.4-1.6-.4-2.6z" fill={h}/>}
      {style===3 && <path d="M19.6 28c-1-9.4 4.8-14.6 12.4-14.6S45.4 18.6 44.4 28c-1.2-5-2.6-7-4.4-7.8-2 3-13.4 3.4-16.4.4-2.2 1.4-3.4 3.8-4 7.4z" fill={h}/>}
      {beard && <path d="M21.6 30c1 6.6 5 10.6 10.4 10.6S41.4 36.6 42.4 30c-1.4 4.4-5.6 6.2-10.4 6.2S23 34.4 21.6 30z" fill={h} opacity=".92"/>}
      <circle cx="27" cy="27.4" r="1.6" fill="#1B2430"/><circle cx="37" cy="27.4" r="1.6" fill="#1B2430"/>
      <path d="M24.4 23.6c1.6-1 3.6-1 5.2 0" stroke={h} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M34.4 23.6c1.6-1 3.6-1 5.2 0" stroke={h} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M28.4 32.6c1.8 1.8 5.4 1.8 7.2 0" stroke="#8A5A44" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {glasses && <g stroke="#2A3852" strokeWidth="1.4" fill="none">
        <circle cx="27" cy="27.4" r="4.2"/><circle cx="37" cy="27.4" r="4.2"/><path d="M31.2 27.4h1.6"/></g>}
    </svg>
  );
}

/* --- Scene illustrations for blogs / trainings / categories (SVG fallback) --- */
export const SCENES = {
  trades:(p)=><g>
    <rect width="320" height="180" fill="#EDF4FF"/><rect x="0" y="132" width="320" height="48" fill="#D8E6FA"/>
    <rect x="34" y="66" width="70" height="66" fill={p}/><rect x="46" y="80" width="18" height="18" fill="#fff"/><rect x="74" y="80" width="18" height="18" fill="#fff"/>
    <rect x="120" y="44" width="56" height="88" fill="#2A3852"/><rect x="132" y="58" width="14" height="14" fill="#EDF4FF"/><rect x="152" y="58" width="14" height="14" fill="#EDF4FF"/><rect x="132" y="82" width="14" height="14" fill="#EDF4FF"/><rect x="152" y="82" width="14" height="14" fill="#EDF4FF"/>
    <path d="M206 132V72l40-18v78z" fill={p} opacity=".8"/><circle cx="266" cy="52" r="16" fill="#FFC94D"/>
    <path d="M196 132c0-14 8-22 20-22s20 8 20 22z" fill="#2A3852"/><rect x="204" y="96" width="24" height="10" rx="5" fill="#FFC94D"/></g>,
  care:(p)=><g>
    <rect width="320" height="180" fill="#E9F7F1"/><rect x="0" y="140" width="320" height="40" fill="#D2EFE3"/>
    <rect x="40" y="46" width="110" height="94" rx="8" fill="#fff"/><path d="M84 70h22v14h14v22h-14v14H84v-14H70V84h14z" fill="#07724F"/>
    <circle cx="216" cy="70" r="22" fill="#F0C49B"/><path d="M198 62a18 18 0 0 1 36 0c0-8-8-11-18-11s-18 3-18 11z" fill="#2B2118"/>
    <path d="M182 140c0-20 15-32 34-32s34 12 34 32z" fill={p}/><path d="M206 108c4 5 16 5 20 0l-4 12h-12z" fill="#fff"/></g>,
  road:(p)=><g>
    <rect width="320" height="180" fill="#EEF1F6"/><rect x="0" y="118" width="320" height="62" fill="#3B4A63"/>
    <rect x="0" y="146" width="320" height="4" fill="#EEF1F6" opacity=".35"/>
    {[20,80,140,200,260].map(x=><rect key={x} x={x} y="146" width="34" height="4" fill="#FFC94D"/>)}
    <rect x="54" y="56" width="112" height="62" rx="6" fill={p}/><rect x="166" y="76" width="58" height="42" rx="6" fill="#2A3852"/>
    <rect x="176" y="86" width="26" height="18" rx="3" fill="#BBD6F7"/>
    <circle cx="92" cy="126" r="14" fill="#1B2430"/><circle cx="92" cy="126" r="6" fill="#8493A9"/>
    <circle cx="196" cy="126" r="14" fill="#1B2430"/><circle cx="196" cy="126" r="6" fill="#8493A9"/>
    <circle cx="268" cy="46" r="14" fill="#FFC94D"/></g>,
  office:(p)=><g>
    <rect width="320" height="180" fill="#F6FAFF"/><rect x="0" y="138" width="320" height="42" fill="#E3E8EF"/>
    <rect x="52" y="52" width="128" height="86" rx="8" fill="#2A3852"/><rect x="62" y="62" width="108" height="60" rx="4" fill={p}/>
    <rect x="72" y="74" width="52" height="7" rx="3.5" fill="#fff" opacity=".85"/>
    <rect x="72" y="88" width="80" height="7" rx="3.5" fill="#fff" opacity=".5"/>
    <rect x="72" y="102" width="64" height="7" rx="3.5" fill="#fff" opacity=".5"/>
    <rect x="196" y="86" width="72" height="52" rx="6" fill="#fff" stroke="#E3E8EF" strokeWidth="2"/>
    <rect x="208" y="98" width="48" height="6" rx="3" fill="#C9DEFF"/><rect x="208" y="110" width="34" height="6" rx="3" fill="#E3E8EF"/>
    <circle cx="244" cy="52" r="18" fill="#FFC94D" opacity=".9"/></g>,
  kitchen:(p)=><g>
    <rect width="320" height="180" fill="#FDF5E6"/><rect x="0" y="132" width="320" height="48" fill="#F0DDB0"/>
    <ellipse cx="120" cy="118" rx="58" ry="16" fill="#2A3852"/><path d="M62 118c0-22 26-34 58-34s58 12 58 34z" fill={p}/>
    <rect x="112" y="60" width="16" height="26" rx="6" fill="#8493A9"/>
    <path d="M212 132V78a16 16 0 0 1 32 0v54z" fill="#C9DEFF"/><rect x="220" y="94" width="16" height="6" rx="3" fill="#fff"/>
    <circle cx="266" cy="56" r="14" fill="#AE2119" opacity=".85"/></g>,
  warehouse:(p)=><g>
    <rect width="320" height="180" fill="#EEF1F6"/><rect x="0" y="136" width="320" height="44" fill="#DCE3EC"/>
    <rect x="30" y="88" width="52" height="48" fill={p}/><rect x="30" y="60" width="52" height="26" fill="#2A3852"/>
    <rect x="88" y="100" width="52" height="36" fill="#2A3852"/><rect x="146" y="76" width="52" height="60" fill={p} opacity=".78"/>
    <rect x="204" y="94" width="86" height="42" rx="4" fill="#FFC94D"/><rect x="216" y="106" width="26" height="18" rx="2" fill="#2A3852"/>
    <circle cx="226" cy="142" r="10" fill="#1B2430"/><circle cx="272" cy="142" r="10" fill="#1B2430"/></g>,
  learn:(p)=><g>
    <rect width="320" height="180" fill="#F1EDFD"/><rect x="0" y="140" width="320" height="40" fill="#DFD6FA"/>
    <path d="m160 42 68 26-68 26-68-26z" fill={p}/>
    <path d="M112 82v26c0 10 21 17 48 17s48-7 48-17V82l-48 18z" fill="#5B3BC4" opacity=".8"/>
    <rect x="222" y="76" width="6" height="42" rx="3" fill="#2A3852"/><circle cx="225" cy="122" r="7" fill="#FFC94D"/>
    <rect x="44" y="98" width="46" height="42" rx="5" fill="#fff"/><rect x="54" y="110" width="26" height="5" rx="2.5" fill="#C9DEFF"/><rect x="54" y="120" width="18" height="5" rx="2.5" fill="#E3E8EF"/></g>,
  money:(p)=><g>
    <rect width="320" height="180" fill="#E9F7F1"/><rect x="0" y="142" width="320" height="38" fill="#D2EFE3"/>
    <rect x="56" y="104" width="42" height="38" rx="4" fill={p} opacity=".55"/>
    <rect x="110" y="76" width="42" height="66" rx="4" fill={p} opacity=".78"/>
    <rect x="164" y="52" width="42" height="90" rx="4" fill={p}/>
    <circle cx="248" cy="76" r="30" fill="#FFC94D"/>
    <path d="M248 60v32M240 68h13a5 5 0 0 1 0 10h-10a5 5 0 0 0 0 10h13" stroke="#8F5B05" strokeWidth="3.4" fill="none" strokeLinecap="round"/></g>,
  resume:(p)=><g>
    <rect width="320" height="180" fill="#F6FAFF"/><rect x="98" y="24" width="124" height="140" rx="8" fill="#fff" stroke="#E3E8EF" strokeWidth="2"/>
    <circle cx="130" cy="56" r="14" fill={p}/><rect x="152" y="46" width="54" height="8" rx="4" fill="#2A3852"/>
    <rect x="152" y="60" width="38" height="6" rx="3" fill="#C9DEFF"/>
    {[84,100,116,132].map((y,i)=><g key={y}><rect x="114" y={y} width="92" height="6" rx="3" fill="#E3E8EF"/><rect x="114" y={y+9} width={68-i*8} height="6" rx="3" fill="#EEF1F6"/></g>)}
    <circle cx="252" cy="132" r="22" fill={p}/><path d="m243 132 6 6 12-13" stroke="#fff" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></g>,
  safety:(p)=><g>
    <rect width="320" height="180" fill="#FDF5E6"/><rect x="0" y="140" width="320" height="40" fill="#F0DDB0"/>
    <path d="M160 40 216 62v34c0 30-56 46-56 46s-56-16-56-46V62z" fill={p}/>
    <path d="m140 96 14 14 28-30" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="36" y="108" width="34" height="32" rx="4" fill="#FFC94D"/><rect x="250" y="108" width="34" height="32" rx="4" fill="#FFC94D"/></g>,
};
export function SceneSvg({ kind="office", tone="#005CCC", w="100%", h=180, radius=0, style }) {
  const S = SCENES[kind] || SCENES.office;
  return <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"
    style={{ width:w, height:h, display:"block", borderRadius:radius, ...style }}>{S(tone)}</svg>;
}

/* --- Real-image URL catalogues, matched to each fallback --- */
/* Unsplash: hotlinkable, no key needed, images.unsplash.com */
export const SCENE_URLS = {
  trades:    ["photo-1581094794329-c8112a89af12","photo-1504328345606-18bbc8c9d7d1","photo-1541888946425-d81bb19240f5","photo-1521737604893-d14cc237f11d"],
  care:      ["photo-1584515933487-779824d29309","photo-1576091160399-112ba8d25d1d","photo-1631815589968-fdb09a223b1e","photo-1666214280391-8ff5bd3c0bf0"],
  road:      ["photo-1601584115197-04ecc0da31d7","photo-1519003722824-194d4455a60c","photo-1586523731000-5b3540beb37c","photo-1586190848861-99aa4a171e90"],
  office:    ["photo-1497366216548-37526070297c","photo-1541746972996-4e0b0f43e02a","photo-1497366754035-f200968a6e72","photo-1600880292203-757bb62b4baf"],
  kitchen:   ["photo-1556909114-f6e7ad7d3136","photo-1577219491135-ce391730fb2c","photo-1466637574441-749b8f19452f","photo-1414235077428-338989a2e8c0"],
  warehouse: ["photo-1553413077-190dd305871c","photo-1601598851547-4302969d0614","photo-1586528116311-ad8dd3c8310d","photo-1494412651409-8963ce7935a7"],
  learn:     ["photo-1523240795612-9a054b0db644","photo-1509062522246-3755977927d7","photo-1513258496099-48168024aec0","photo-1503676260728-1c00da094a0b"],
  money:     ["photo-1554224155-6726b3ff858f","photo-1579621970563-ebec7560ff3e","photo-1560472354-b33ff0c44a43","photo-1554224154-26032ffc0d07"],
  resume:    ["photo-1586281380349-632531db7ed4","photo-1450101499163-c8848c66ca85","photo-1517245386807-bb43f82c33c4","photo-1434030216411-0b793f4b4173"],
  safety:    ["photo-1503387762-592deb58ef4e","photo-1517502884422-41eaead166d4","photo-1541888946425-d81bb19240f5","photo-1581092160607-ee22621dd758"],
};
export function sceneUrl(kind, seed=0, w=640) {
  const list = SCENE_URLS[kind] || SCENE_URLS.office;
  const id = list[Math.abs(seed) % list.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
}

/* Employer logos: real company logos from Wikimedia Commons where possible */
export const EMPLOYER_LOGOS = {
  "PCL Construction":    "https://upload.wikimedia.org/wikipedia/en/thumb/8/85/PCL_Construction_logo.svg/320px-PCL_Construction_logo.svg.png",
  "Sinai Health":        "https://upload.wikimedia.org/wikipedia/en/thumb/e/ec/Sinai_Health_System_logo.svg/320px-Sinai_Health_System_logo.svg.png",
  "Day & Ross":          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Day_%26_Ross_logo.svg/320px-Day_%26_Ross_logo.svg.png",
  "Loblaw Companies":    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Loblaw_Companies_logo.svg/320px-Loblaw_Companies_logo.svg.png",
  "Cactus Restaurants":  "https://upload.wikimedia.org/wikipedia/en/thumb/6/60/Cactus_Club_Cafe_logo.svg/240px-Cactus_Club_Cafe_logo.svg.png",
  "Linamar":             "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Linamar_logo.svg/320px-Linamar_logo.svg.png",
  "Sun Life":            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Sun_Life_Financial_logo.svg/320px-Sun_Life_Financial_logo.svg.png",
  "Toronto DSB":         "https://upload.wikimedia.org/wikipedia/en/thumb/2/24/Toronto_District_School_Board_Logo.svg/240px-Toronto_District_School_Board_Logo.svg.png",
  "Cavendish Farms":     "https://upload.wikimedia.org/wikipedia/en/thumb/f/f7/Cavendish_Farms_logo.svg/320px-Cavendish_Farms_logo.svg.png",
  "GardaWorld":          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/GardaWorld_logo.svg/320px-GardaWorld_logo.svg.png",
  "Bird Construction":   "https://upload.wikimedia.org/wikipedia/en/thumb/d/da/Bird_Construction_logo.svg/320px-Bird_Construction_logo.svg.png",
};
export const empLogoUrl = name => EMPLOYER_LOGOS[name] || null;

/* Portraits: randomuser.me hosts real portrait photos, no API key */
export const portraitUrl = seed => {
  const gender = seed % 2 ? "men" : "women";
  const n = ((seed * 7) % 99) + 1;
  return `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
};

/* --- SmartImg: shows real image, swaps in the SVG fallback on error --- */
export function SmartImg({ src, alt, fallback, style, imgStyle }) {
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>{ setOk(true); setLoaded(false); }, [src]);
  if (!src || !ok) return <div style={{ display:"block", ...style }}>{fallback}</div>;
  return <div style={{ position:"relative", display:"block", overflow:"hidden", ...style }}>
    {!loaded && <div style={{ position:"absolute", inset:0 }}>{fallback}</div>}
    <img src={src} alt={alt||""} onError={()=>setOk(false)} onLoad={()=>setLoaded(true)}
      style={{ display:"block", width:"100%", height:"100%", objectFit:"cover",
        opacity: loaded ? 1 : 0, transition:"opacity .3s ease", ...imgStyle }}/>
  </div>;
}

/* --- Public API: Mark, Portrait, Scene (drop-in replacements, real image first) --- */
export function Mark({ kind="hex", a="#005CCC", b="#FFFFFF", size=48, radius, name }) {
  const url = name ? empLogoUrl(name) : null;
  if (!url) return <MarkSvg kind={kind} a={a} b={b} size={size} radius={radius}/>;
  return <SmartImg src={url} alt={name}
    style={{ width:size, height:size, borderRadius:radius ?? 12, background:"#fff",
      border:`1px solid ${C.line}`, flexShrink:0 }}
    imgStyle={{ objectFit:"contain", padding:"14%" }}
    fallback={<MarkSvg kind={kind} a={a} b={b} size={size} radius={radius}/>}/>;
}
export function Portrait({ seed=0, size=48, radius=999, bg, usePhoto=true }) {
  const url = usePhoto ? portraitUrl(seed) : null;
  const fb = <PortraitSvg seed={seed} size={size} radius={radius} bg={bg}/>;
  if (!url) return fb;
  return <SmartImg src={url} alt="" style={{ width:size, height:size, borderRadius:radius, flexShrink:0 }} fallback={fb}/>;
}
export function Scene({ kind="office", tone="#005CCC", w="100%", h=180, radius=0, style, seed=0, usePhoto=true }) {
  const url = usePhoto ? sceneUrl(kind, seed, h > 220 ? 1000 : 640) : null;
  const fb = <SceneSvg kind={kind} tone={tone} w={w} h={h} radius={radius} style={style}/>;
  if (!url) return fb;
  return <SmartImg src={url} alt=""
    style={{ width:w, height:h, borderRadius:radius, ...style }}
    fallback={fb}/>;
}


/* --- Curated real photos per scene kind (Unsplash) ---
   These load in any environment with network access to images.unsplash.com.
   In restricted sandboxes they fail silently and the SVG scene renders in place. */
export const PHOTOS = {
  trades:    ["photo-1581092160607-ee22621dd758","photo-1504328345606-18bbc8c9d7d1","photo-1621905251189-08b45d6a269e"],
  care:      ["photo-1584515933487-779824d29309","photo-1576091160399-112ba8d25d1d","photo-1631815589968-fdb09a223b1e"],
  road:      ["photo-1601584115197-04ecc0da31d7","photo-1519003722824-194d4455a60c","photo-1586191582056-b7f0abd0c3d4"],
  office:    ["photo-1497215728101-856f4ea42174","photo-1600880292203-757bb62b4baf","photo-1552664730-d307ca884978"],
  kitchen:   ["photo-1556910103-1c02745aae4d","photo-1466637574441-749b8f19452f","photo-1414235077428-338989a2e8c0"],
  warehouse: ["photo-1553413077-190dd305871c","photo-1580674285054-bed31e145f59","photo-1601598851547-4302969d0614"],
  learn:     ["photo-1522202176988-66273c2fd55f","photo-1516321318423-f06f85e504b3","photo-1523240795612-9a054b0db644"],
  money:     ["photo-1554224155-8d04cb21cd6c","photo-1579621970563-ebec7560ff3e","photo-1553729459-efe14ef6055d"],
  resume:    ["photo-1586281380349-632531db7ed4","photo-1454165804606-c3d57bc86b40","photo-1568992687947-868a62a9f521"],
  safety:    ["photo-1590959651373-a3db0f38a961","photo-1503387762-592deb58ef4e","photo-1541888946425-d81bb19240f5"],
};
export function scenePhotoUrl(kind, seed = 0, w = 640) {
  const arr = PHOTOS[kind] || PHOTOS.office;
  const id = arr[Math.abs(seed) % arr.length];
  return `https://images.unsplash.com/${id}?w=${w}&auto=format&fit=crop&q=80`;
}
export function SmartScene({ kind = "office", tone = C.brand, w = "100%", h = 180, radius = 0, style, seed = 0 }) {
  return (
    <img src={scenePhotoUrl(kind, seed, 1200)} alt=""
      style={{ width: w, height: h, objectFit: "cover", display: "block", borderRadius: radius, background: C.bg, ...style }}/>
  );
}

/* --- Company logo URLs via Clearbit's free logo API. Falls back to Mark SVG on error
   (also covers ad blockers, which commonly block logo.clearbit.com). --- */
export function SmartLogo({ e, size = 46, radius = 12 }) {
  const domain = (e.site || "").replace(/^www\./, "").trim();
  const url = domain
    ? `https://logo.clearbit.com/${domain}?size=${size * 2}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name || "?")}&size=${size * 2}&background=E8F1FF&color=005CCC&bold=true&format=png`;
  return (
    <SmartImg src={url} alt={e.name || ""}
      style={{ width: size, height: size, borderRadius: radius, background: "#fff",
        border: `1px solid ${C.line}`, padding: 4, boxSizing: "border-box", flexShrink: 0 }}
      imgStyle={{ objectFit: "contain" }}
      fallback={<MarkSvg kind={e.mark || "hex"} a={e.a || C.brand} b={e.b || "#FFFFFF"} size={size} radius={radius}/>}/>
  );
}

/* --- Real person portraits via randomuser.me. Falls back to SVG Portrait on error. --- */
export const PORTRAIT_SEEDS = {
  1: "https://randomuser.me/api/portraits/women/44.jpg",
  2: "https://randomuser.me/api/portraits/women/68.jpg",
  3: "https://randomuser.me/api/portraits/men/32.jpg",
  4: "https://randomuser.me/api/portraits/women/79.jpg",
  5: "https://randomuser.me/api/portraits/men/45.jpg",
  6: "https://randomuser.me/api/portraits/men/22.jpg",
  7: "https://randomuser.me/api/portraits/men/76.jpg",
  8: "https://randomuser.me/api/portraits/women/12.jpg",
  9: "https://randomuser.me/api/portraits/men/60.jpg",
  11:"https://randomuser.me/api/portraits/women/33.jpg",
  0: "https://randomuser.me/api/portraits/men/1.jpg",
};
export function SmartPortrait({ seed = 0, size = 48, radius = 999, bg }) {
  const url = PORTRAIT_SEEDS[seed] || PORTRAIT_SEEDS[(seed % 8) + 1] || PORTRAIT_SEEDS[0];
  return (
    <img src={url} alt=""
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", background: bg || C.bg,
        display: "block", flexShrink: 0 }}/>
  );
}

/* ═══════════════ CORE UI ATOMS ═══════════════ */
export function Btn({children,onClick,kind="primary",size="md",full,disabled,icon,iconR,style,title,type}){
 const[h,setH]=useState(false),[press,setP]=useState(false);
 const S={xs:{f:12.5,p:"7px 12px",r:8,g:6,i:14},sm:{f:13.5,p:"9px 15px",r:10,g:7,i:16},
   md:{f:14.5,p:"12px 20px",r:11,g:8,i:18},lg:{f:15.5,p:"15px 26px",r:12,g:9,i:19}}[size];
 const K={primary:{background:h&&!disabled?C.brandDark:C.brand,color:"#fff",border:"1px solid transparent"},
  dark:{background:h&&!disabled?C.ink2:C.ink,color:"#fff",border:"1px solid transparent"},
  soft:{background:C.wash,color:C.brand,border:`1px solid ${C.line2}`},
  outline:{background:h?C.bg:"#fff",color:C.text,border:`1px solid ${C.line}`},
  ghost:{background:h?C.bg:"transparent",color:C.text2,border:"1px solid transparent"},
  ok:{background:h&&!disabled?"#065C40":C.ok,color:"#fff",border:"1px solid transparent"},
  danger:{background:h&&!disabled?"#8E1A13":C.red,color:"#fff",border:"1px solid transparent"},
  dangerSoft:{background:C.redBg,color:C.red,border:`1px solid ${C.redLn}`},
  onDark:{background:h?"rgba(255,255,255,.2)":"rgba(255,255,255,.12)",color:"#fff",border:"1px solid rgba(255,255,255,.22)"}}[kind];
 return <button type={type||"button"} title={title} disabled={disabled} onClick={disabled?undefined:onClick}
  onMouseEnter={()=>setH(true)} onMouseLeave={()=>{setH(false);setP(false);}}
  onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)}
  style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:S.g,fontFamily:"inherit",fontWeight:600,
   fontSize:S.f,padding:S.p,borderRadius:S.r,letterSpacing:"-.01em",lineHeight:1.2,whiteSpace:"nowrap",
   cursor:disabled?"not-allowed":"pointer",opacity:disabled?.45:1,width:full?"100%":undefined,
   transition:"background .16s,transform .1s,box-shadow .16s",
   transform:press&&!disabled?"scale(.975)":h&&!disabled?"translateY(-1px)":"none",...K,...style}}>
  {icon&&<I n={icon} s={S.i} w={2}/>}{children}{iconR&&<I n={iconR} s={S.i} w={2}/>}</button>;
}
export function Tag({children,tone="neutral",icon,sm}){
 const T={neutral:{b:C.bg,f:C.text2,l:C.line},brand:{b:C.wash,f:C.brand,l:C.line2},ok:{b:C.okBg,f:C.ok,l:C.okLn},
  warn:{b:C.warnBg,f:C.warn,l:C.warnLn},danger:{b:C.redBg,f:C.red,l:C.redLn},violet:{b:C.violetBg,f:C.violet,l:C.violetLn},
  dark:{b:C.ink,f:"#fff",l:C.ink},onDark:{b:"rgba(255,255,255,.12)",f:"rgba(255,255,255,.9)",l:"rgba(255,255,255,.2)"}}[tone];
 return <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:sm?11.5:12.5,fontWeight:600,
  padding:sm?"3px 8px":"5px 10px",borderRadius:7,background:T.b,color:T.f,border:`1px solid ${T.l}`,whiteSpace:"nowrap",lineHeight:1.35}}>
  {icon&&<I n={icon} s={sm?12:13} w={2}/>}{children}</span>;
}
export function Card({children,style,onClick,hover,pad=24,delay=0}){
 const[h,setH]=useState(false);
 return <div onClick={onClick} onMouseEnter={()=>hover&&setH(true)} onMouseLeave={()=>hover&&setH(false)}
  style={{background:"#fff",border:`1px solid ${h?C.line2:C.line}`,borderRadius:18,padding:pad,
   boxShadow:h?SH.md:"none",transition:"border-color .18s,box-shadow .18s,transform .18s",
   transform:h?"translateY(-3px)":"none",cursor:onClick?"pointer":"default",...style}}>{children}</div>;
}
export const inp={width:"100%",background:"#fff",border:`1px solid ${C.line}`,borderRadius:12,padding:"14px 16px",
 fontSize:15,color:C.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color .16s,box-shadow .16s"};
export function Input({icon,suffix,invalid,style,...r}){const[f,setF]=useState(false);
 return <div style={{position:"relative",display:"flex",alignItems:"center"}}>
  {icon&&<span style={{position:"absolute",left:13,color:C.text3,pointerEvents:"none",display:"flex"}}><I n={icon} s={17}/></span>}
  <input {...r} onFocus={e=>{setF(true);r.onFocus?.(e);}} onBlur={e=>{setF(false);r.onBlur?.(e);}}
   style={{...inp,...(icon?{paddingLeft:40}:{}),...(suffix?{paddingRight:46}:{}),
   ...(invalid?{borderColor:C.red,boxShadow:`0 0 0 3px ${C.redBg}`}:f?{borderColor:C.brand,boxShadow:`0 0 0 3px ${C.wash}`}:{}),...style}}/>
  {suffix&&<span style={{position:"absolute",right:13,color:C.text3,fontSize:13,fontWeight:500}}>{suffix}</span>}</div>;}
export function Area({style,invalid,...r}){const[f,setF]=useState(false);
 return <textarea {...r} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
  style={{...inp,resize:"none",lineHeight:1.65,...(invalid?{borderColor:C.red}:f?{borderColor:C.brand,boxShadow:`0 0 0 3px ${C.wash}`}:{}),...style}}/>;}
export function Sel({children,style,invalid,...r}){
 return <select {...r} style={{...inp,appearance:"none",cursor:"pointer",paddingRight:38,
  backgroundImage:"linear-gradient(45deg,transparent 50%,#8493A9 50%),linear-gradient(135deg,#8493A9 50%,transparent 50%)",
  backgroundPosition:"calc(100% - 18px) center, calc(100% - 13px) center",backgroundSize:"5px 5px,5px 5px",
  backgroundRepeat:"no-repeat",...(invalid?{borderColor:C.red}:{}),...style}}>{children}</select>;}
export function Field({label,hint,error,required,children,style}){
 return <div style={style}>
  {label&&<label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:7}}>
   {label}{required&&<span style={{color:C.red,marginLeft:3}}>*</span>}</label>}
  {children}
  {error?<div style={{fontSize:12.5,color:C.red,marginTop:6,display:"flex",gap:5,alignItems:"center",animation:"shake .3s"}}>
   <I n="alert" s={13}/>{error}</div>:hint?<div style={{fontSize:12.5,color:C.text3,marginTop:6}}>{hint}</div>:null}</div>;}
export function Switch({on,onChange,disabled}){
 return <div onClick={()=>!disabled&&onChange(!on)} style={{width:46,height:26,borderRadius:99,
  background:on?C.brand:C.line,display:"flex",alignItems:"center",padding:3,cursor:disabled?"not-allowed":"pointer",
  justifyContent:on?"flex-end":"flex-start",transition:"background .22s",flexShrink:0,opacity:disabled?.5:1}}>
  <div style={{width:20,height:20,borderRadius:99,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.25)",transition:"all .22s"}}/></div>;}
export function CheckRow({on,onChange,label,sub}){
 return <div onClick={()=>onChange(!on)} style={{display:"flex",gap:11,alignItems:"flex-start",cursor:"pointer",
  padding:"12px 14px",border:`1px solid ${on?C.brand:C.line}`,background:on?C.tint:"#fff",borderRadius:11,transition:"all .16s"}}>
  <span style={{width:20,height:20,borderRadius:6,flexShrink:0,marginTop:1,border:`1.5px solid ${on?C.brand:C.line}`,
   background:on?C.brand:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .16s"}}>
   {on&&<I n="check" s={13} c="#fff" w={3}/>}</span>
  <span style={{minWidth:0}}><span style={{display:"block",fontSize:14,fontWeight:550,color:C.text}}>{label}</span>
   {sub&&<span style={{display:"block",fontSize:12.5,color:C.text3,marginTop:2}}>{sub}</span>}</span></div>;}
export function Bar({v,tone=C.brand,h=6}){return <div style={{height:h,background:C.lineSoft,borderRadius:99,overflow:"hidden"}}>
 <div style={{height:"100%",width:`${Math.min(100,Math.max(0,v))}%`,background:tone,borderRadius:99,transition:"width .7s cubic-bezier(.22,.68,.35,1)"}}/></div>;}
export function Ring({v,size=46,label}){
 const r=(size-6)/2,c=size/2,circ=2*Math.PI*r;const col=v>=85?C.ok:v>=65?C.brand:C.warn;
 return <div style={{textAlign:"center",flexShrink:0}}>
  <svg width={size} height={size} style={{display:"block"}}>
   <circle cx={c} cy={c} r={r} fill="none" stroke={C.lineSoft} strokeWidth={3.4}/>
   <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={3.4} strokeDasharray={`${v/100*circ} ${circ}`}
    strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} style={{transition:"stroke-dasharray .8s cubic-bezier(.22,.68,.35,1)"}}/>
   <text x={c} y={c+size*.095} textAnchor="middle" fontSize={size*.28} fontWeight="700" fill={col}>{v}</text></svg>
  {label&&<div style={{fontSize:10.5,color:C.text3,marginTop:3}}>{label}</div>}</div>;}
export function Empty({icon="search",title,body,action}){
 return <div style={{textAlign:"center",padding:"52px 22px",background:"#fff",border:`1px dashed ${C.line}`,borderRadius:16,animation:"rise .34s ease both"}}>
  <div style={{width:56,height:56,borderRadius:16,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",
   margin:"0 auto 16px",color:C.text3}}><I n={icon} s={26}/></div>
  <div style={{fontSize:17,fontWeight:650,color:C.text,marginBottom:7,letterSpacing:"-.02em"}}>{title}</div>
  <div style={{fontSize:14,color:C.text2,lineHeight:1.6,maxWidth:400,margin:"0 auto"}}>{body}</div>
  {action&&<div style={{marginTop:20}}>{action}</div>}</div>;}
export function Banner({tone="brand",icon,title,children,action,onClose,style}){
 const T={brand:{b:C.wash,f:C.brand,l:C.line2},ok:{b:C.okBg,f:C.ok,l:C.okLn},warn:{b:C.warnBg,f:C.warn,l:C.warnLn},
  danger:{b:C.redBg,f:C.red,l:C.redLn},neutral:{b:C.bg,f:C.text2,l:C.line}}[tone];
 return <div style={{background:T.b,border:`1px solid ${T.l}`,borderRadius:12,padding:"14px 16px",display:"flex",
  gap:12,alignItems:"flex-start",animation:"rise .3s ease both",...style}}>
  <span style={{color:T.f,display:"flex",flexShrink:0,marginTop:1}}><I n={icon||"info"} s={18}/></span>
  <div style={{flex:1,minWidth:0}}>
   {title&&<div style={{fontSize:14,fontWeight:650,color:T.f,marginBottom:children?4:0}}>{title}</div>}
   {children&&<div style={{fontSize:13.5,color:C.text2,lineHeight:1.6}}>{children}</div>}</div>
  {action}
  {onClose&&<button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.f,display:"flex",padding:0,flexShrink:0}}><I n="x" s={16}/></button>}</div>;}
export function H1({children,sub,action,style}){
 return <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:20,flexWrap:"wrap",marginBottom:32,...style}}>
  <div><h1 style={{fontSize:38,fontWeight:760,letterSpacing:"-.04em",color:C.text,margin:0,lineHeight:1.1}}>{children}</h1>
   {sub&&<div style={{fontSize:16.5,color:C.text2,marginTop:10,lineHeight:1.55,maxWidth:600}}>{sub}</div>}</div>{action}</div>;}
export function H2({children,sub,action,style}){
 return <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:14,flexWrap:"wrap",marginBottom:22,...style}}>
  <div><div style={{fontSize:24,fontWeight:720,letterSpacing:"-.03em",color:C.text,lineHeight:1.2}}>{children}</div>
   {sub&&<div style={{fontSize:14.5,color:C.text2,marginTop:6}}>{sub}</div>}</div>{action}</div>;}
export function Lbl({children,style}){return <div style={{fontSize:11.5,fontWeight:700,color:C.text3,textTransform:"uppercase",
 letterSpacing:".075em",marginBottom:10,...style}}>{children}</div>;}
export function Stat({label,value,tone=C.text,icon,delta,onClick}){
 return <div onClick={onClick} style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:18,padding:"22px 24px",
  cursor:onClick?"pointer":"default",transition:"border-color .16s,transform .16s"}}
  onMouseEnter={e=>{if(onClick){e.currentTarget.style.borderColor=C.line2;e.currentTarget.style.transform="translateY(-2px)";}}}
  onMouseLeave={e=>{if(onClick){e.currentTarget.style.borderColor=C.line;e.currentTarget.style.transform="none";}}}>
  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,color:C.text3}}>
   {icon&&<I n={icon} s={16}/>}<span style={{fontSize:13,color:C.text2,fontWeight:550}}>{label}</span></div>
  <div style={{fontSize:36,fontWeight:760,color:tone,lineHeight:1,letterSpacing:"-.045em"}}>{value}</div>
  {delta&&<div style={{fontSize:12.5,color:C.ok,marginTop:9,fontWeight:600}}>{delta}</div>}</div>;}
export function Modal({open,onClose,title,sub,children,footer,width=520}){
 const mob=useMedia("(max-width: 820px)");
 useEffect(()=>{if(!open||typeof document==="undefined")return;const p=document.body.style.overflow;
  document.body.style.overflow="hidden";return()=>{document.body.style.overflow=p;};},[open]);
 if(!open)return null;
 return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(11,18,32,.5)",zIndex:700,display:"flex",
  alignItems:mob?"flex-end":"center",justifyContent:"center",padding:mob?0:24,animation:"fadeIn .16s ease"}}>
  <div onClick={e=>e.stopPropagation()} style={{background:"#fff",width:"100%",maxWidth:mob?"100%":width,
   borderRadius:mob?"20px 20px 0 0":18,boxShadow:SH.lg,maxHeight:mob?"92vh":"86vh",display:"flex",flexDirection:"column",
   animation:mob?"up .26s cubic-bezier(.22,.68,.35,1)":"pop .2s cubic-bezier(.22,.68,.35,1)"}}>
   {mob&&<div style={{width:40,height:4,background:C.line,borderRadius:99,margin:"10px auto 2px",flexShrink:0}}/>}
   <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.lineSoft}`,display:"flex",justifyContent:"space-between",gap:14,alignItems:"flex-start",flexShrink:0}}>
    <div><div style={{fontSize:17.5,fontWeight:690,letterSpacing:"-.025em",color:C.text}}>{title}</div>
     {sub&&<div style={{fontSize:13.5,color:C.text2,marginTop:3}}>{sub}</div>}</div>
    <button onClick={onClose} style={{background:C.bg,border:"none",width:34,height:34,borderRadius:99,cursor:"pointer",
     color:C.text2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="x" s={17}/></button></div>
   <div style={{padding:22,overflowY:"auto",flex:1}}>{children}</div>
   {footer&&<div style={{padding:"16px 22px",borderTop:`1px solid ${C.lineSoft}`,background:C.bg,flexShrink:0,
    borderRadius:mob?0:"0 0 18px 18px",paddingBottom:mob?"calc(16px + env(safe-area-inset-bottom))":16}}>{footer}</div>}</div></div>;}
export function Tabs({items,value,onChange,style}){
 return <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2,...style}}>
  {items.map(it=>{const on=value===it.k;
   return <button key={it.k} onClick={()=>onChange(it.k)} style={{display:"flex",alignItems:"center",gap:7,
    padding:"9px 15px",borderRadius:99,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,whiteSpace:"nowrap",flexShrink:0,
    border:`1px solid ${on?C.brand:C.line}`,background:on?C.wash:"#fff",color:on?C.brand:C.text2,
    fontWeight:on?650:520,transition:"all .16s"}}>
    {it.icon&&<I n={it.icon} s={15} w={on?2.1:1.8}/>}{it.label}
    {it.n>0&&<span style={{background:on?C.brand:C.lineSoft,color:on?"#fff":C.text2,fontSize:11,fontWeight:700,
     minWidth:19,height:19,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{it.n}</span>}
   </button>;})}</div>;}

export function DatePicker({value,onChange,min,max,placeholder="Select date"}){
  return <Input type="date" value={value||""} min={min} max={max}
    onChange={e=>onChange(e.target.value)} placeholder={placeholder} icon="calendar"/>;
}

/* ═══════════════ PAGE LAYOUT WRAPPER ═══════════════ */
export const MAXW={site:1240,narrow:820,wide:1360};
export const PADX={mob:"16px",dt:"32px"};
export const Page=({children,wide,narrow})=>{
  const mob=useMedia("(max-width: 900px)");
  return <div style={{width:"100%",maxWidth:narrow?MAXW.narrow:wide?MAXW.wide:MAXW.site,margin:"0 auto",
    padding:mob?`32px ${PADX.mob} 48px`:`56px ${PADX.dt} 80px`}}>{children}</div>;
};

/* ═══════════════ RICH TEXT EDITOR — used across CV builder, job posting, articles ═══════════════ */
export function RichText({value,onChange,placeholder,rows=6,minHeight}){
  const ref=useRef(null);
  const [focus,setFocus]=useState(false);
  const [showing,setShowing]=useState(value||"");
  useEffect(()=>{
    if(ref.current&&ref.current.innerHTML!==(value||"")){
      ref.current.innerHTML=value||"";
      setShowing(value||"");
    }
  },[value]);
  const cmd=(c,arg)=>{document.execCommand(c,false,arg); ref.current?.focus(); update();};
  const update=()=>{if(ref.current){const html=ref.current.innerHTML; setShowing(html); onChange(html);}};
  const addLink=()=>{const u=prompt("Enter URL:","https://"); if(u&&u!=="https://")cmd("createLink",u);};
  const tools=[
    {ic:"B",act:()=>cmd("bold"),style:{fontWeight:800}},
    {ic:"I",act:()=>cmd("italic"),style:{fontStyle:"italic"}},
    {ic:"U",act:()=>cmd("underline"),style:{textDecoration:"underline"}},
    {sep:true},
    {label:"• List",act:()=>cmd("insertUnorderedList")},
    {label:"1. List",act:()=>cmd("insertOrderedList")},
    {sep:true},
    {label:"Link",act:addLink},
    {label:"Clear",act:()=>cmd("removeFormat")},
  ];
  const isEmpty=!showing||showing==="<br>"||showing.trim()==="";
  return <div style={{border:`1.5px solid ${focus?C.brand:C.line}`,borderRadius:12,background:"#fff",
    boxShadow:focus?`0 0 0 3px ${C.wash}`:"none",transition:"border-color .16s,box-shadow .16s",overflow:"hidden"}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:2,padding:"6px 8px",borderBottom:`1px solid ${C.lineSoft}`,background:C.bg}}>
      {tools.map((t,i)=>t.sep
        ? <div key={i} style={{width:1,background:C.line,margin:"4px 4px"}}/>
        : <button key={i} type="button" onMouseDown={e=>{e.preventDefault(); t.act();}}
            style={{background:"transparent",border:"none",cursor:"pointer",padding:"5px 9px",borderRadius:6,
              fontFamily:"inherit",fontSize:12.5,fontWeight:600,color:C.text2,transition:"background .12s",...(t.style||{})}}
            onMouseEnter={e=>e.currentTarget.style.background=C.wash}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{t.ic||t.label}</button>)}
    </div>
    <div style={{position:"relative"}}>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={update} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{padding:"12px 14px",fontSize:14.5,color:C.text,lineHeight:1.65,outline:"none",fontFamily:"inherit",
          minHeight:minHeight||`${rows*22}px`,whiteSpace:"pre-wrap"}}/>
      {isEmpty&&!focus&&<div style={{position:"absolute",top:12,left:14,color:C.text3,fontSize:14.5,pointerEvents:"none"}}>{placeholder}</div>}
    </div>
  </div>;
}
