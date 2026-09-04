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
  return <svg width={size} height={size} viewBox="0 0 48 48" className="block shrink-0" style={{ borderRadius:radius }}>
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
    <svg width={size} height={size} viewBox="0 0 64 64" className="block shrink-0" style={{ borderRadius:radius, background:back }}>
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
    className="block" style={{ width:w, height:h, borderRadius:radius, ...style }}>{S(tone)}</svg>;
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
export function SmartImg({ src, alt, fallback, className, style, imgStyle }) {
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>{ setOk(true); setLoaded(false); }, [src]);
  /* overflow-hidden + centering here matters: several callers (SmartLogo especially) pass a
     className with its own padding/border while the fallback SVG renders at the box's full
     nominal size - without clipping and centering, that fixed-size SVG child overflows the
     padded/bordered box toward the bottom-right corner instead of sitting flush inside it. */
  if (!src || !ok) return <div className={`overflow-hidden flex items-center justify-center ${className||""}`} style={style}>{fallback}</div>;
  return <div className={`relative overflow-hidden ${className||""}`} style={style}>
    {!loaded && <div className="absolute inset-0">{fallback}</div>}
    <img src={src} alt={alt||""} onError={()=>setOk(false)} onLoad={()=>setLoaded(true)}
      className={`block w-full h-full object-cover transition-opacity duration-300 ${loaded?"opacity-100":"opacity-0"}`}
      style={imgStyle}/>
  </div>;
}

/* --- Public API: Mark, Portrait, Scene (drop-in replacements, real image first) --- */
export function Mark({ kind="hex", a="#005CCC", b="#FFFFFF", size=48, radius, name }) {
  const url = name ? empLogoUrl(name) : null;
  if (!url) return <MarkSvg kind={kind} a={a} b={b} size={size} radius={radius}/>;
  return <SmartImg src={url} alt={name}
    className="bg-white border border-line shrink-0"
    style={{ width:size, height:size, borderRadius:radius ?? 12 }}
    imgStyle={{ objectFit:"contain", padding:"14%" }}
    fallback={<MarkSvg kind={kind} a={a} b={b} size={size} radius={radius}/>}/>;
}
export function Portrait({ seed=0, size=48, radius=999, bg, usePhoto=true }) {
  const url = usePhoto ? portraitUrl(seed) : null;
  const fb = <PortraitSvg seed={seed} size={size} radius={radius} bg={bg}/>;
  if (!url) return fb;
  return <SmartImg src={url} alt="" className="shrink-0" style={{ width:size, height:size, borderRadius:radius }} fallback={fb}/>;
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
  /* Was a bare <img> with no onError handler — silently broken (no fallback) despite the PHOTOS
     comment above claiming a graceful SVG fallback. Delegates to Scene, which actually has one
     via SmartImg, instead of maintaining a second parallel (and broken) image path. */
  return <Scene kind={kind} tone={tone} w={w} h={h} radius={radius} style={style} seed={seed}/>;
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
      className="bg-white border border-line shrink-0 p-1"
      style={{ width: size, height: size, borderRadius: radius }}
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
  /* Was a bare <img> with no onError handler — silently broken (no fallback) despite this
     file's own comment claiming one. Delegates to Portrait, which actually has one via
     SmartImg, instead of maintaining a second parallel (and broken) image path. */
  return <Portrait seed={seed} size={size} radius={radius} bg={bg}/>;
}

/* ═══════════════ CORE UI ATOMS ═══════════════ */
export function Btn({children,onClick,kind="primary",size="md",full,disabled,loading,icon,iconR,style,title,type,"aria-label":ariaLabel}){
 const S={xs:"text-xs py-2 px-3 rounded-lg gap-1.5",sm:"text-sm py-2.5 px-4 rounded-xl gap-2",
   md:"text-sm py-3 px-5 rounded-xl gap-2",lg:"text-base py-4 px-7 rounded-xl gap-2.5"}[size];
 const I_SIZE={xs:14,sm:16,md:18,lg:19}[size];
 const K={primary:"bg-brand hover:bg-brand-dark text-white border border-transparent",
  dark:"bg-ink hover:bg-ink-2 text-white border border-transparent",
  soft:"bg-wash hover:bg-line-2 text-brand border border-line-2",
  outline:"bg-white hover:bg-bg text-text border border-line",
  ghost:"bg-transparent hover:bg-bg text-text-2 border border-transparent",
  ok:"bg-ok hover:bg-[#065C40] text-white border border-transparent",
  danger:"bg-red hover:bg-[#8E1A13] text-white border border-transparent",
  dangerSoft:"bg-red-bg hover:bg-red-ln text-red border border-red-ln",
  onDark:"bg-white/12 hover:bg-white/20 text-white border border-white/22"}[kind];
 const isDisabled=disabled||loading;
 return <button type={type||"button"} title={title} aria-label={ariaLabel||(!children&&(icon||iconR)?title:undefined)} aria-busy={loading||undefined} disabled={isDisabled} onClick={isDisabled?undefined:onClick}
  className={`inline-flex items-center justify-center font-semibold leading-tight whitespace-nowrap cursor-pointer
   transition duration-150 hover:-translate-y-px active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none
   ${full?"w-full":""} ${S} ${K}`}
  style={style}>
  {loading?<span className="inline-block rounded-full border-2 border-current border-t-transparent animate-spin" style={{width:I_SIZE,height:I_SIZE}}/>:icon&&<I n={icon} s={I_SIZE} w={2}/>}
  {children}{!loading&&iconR&&<I n={iconR} s={I_SIZE} w={2}/>}</button>;
}
/* Tag and Banner both render a soft-fill/border/text tone triad for the same 5 semantic tones
   (neutral/brand/ok/warn/danger) - previously each duplicated its own copy of those exact class
   strings. One shared map now backs both; Tag additionally supports violet/dark/onDark, which
   Banner has no use for. Btn keeps its own K map since interactive filled buttons need hover
   states and solid (not soft) fills - a genuinely different shape, not the same duplication. */
export const TONE_SOFT={neutral:"bg-bg text-text-2 border-line",brand:"bg-wash text-brand border-line-2",ok:"bg-ok-bg text-ok border-ok-ln",
  warn:"bg-warn-bg text-warn border-warn-ln",danger:"bg-red-bg text-red border-red-ln",violet:"bg-violet-bg text-violet border-violet-ln",
  dark:"bg-ink text-white border-ink",onDark:"bg-white/12 text-white/90 border-white/20"};
export function Tag({children,tone="neutral",icon,sm}){
 const T=TONE_SOFT[tone]||TONE_SOFT.neutral;
 return <span className={`inline-flex items-center gap-1.5 font-semibold border whitespace-nowrap leading-snug rounded-lg text-xs ${sm?"py-1 px-2":"py-1.5 px-2.5"} ${T}`}>
  {icon&&<I n={icon} s={sm?12:13} w={2}/>}{children}</span>;
}
/* Applied to any div that acts as a click target so it's also keyboard/screen-reader operable
   without changing it to a real <button> — several callers (JobCard, Stat) nest real buttons
   inside, which a <button> wrapper can't legally contain. */
function clickableA11y(onClick){
 if(!onClick)return{};
 return{role:"button",tabIndex:0,onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onClick(e);}}};
}
export function Card({children,style,onClick,hover,pad=24,delay=0}){
 return <div onClick={onClick} {...clickableA11y(onClick)}
  className={`bg-white border rounded-2xl transition-[border-color,box-shadow,transform] duration-200 ${onClick?"cursor-pointer":"cursor-default"} ${hover?"border-line hover:border-line-2 hover:shadow-md hover:-translate-y-1":"border-line"}`}
  style={{padding:pad,...style}}>{children}</div>;
}
export const inp = "w-full bg-white border border-line rounded-xl py-3.5 px-4 text-base text-text outline-none transition-[border-color,box-shadow] duration-150 disabled:bg-bg disabled:text-text-3 disabled:cursor-not-allowed disabled:opacity-70";
export function Input({icon,suffix,invalid,style,type,...r}){
 const [show,setShow]=useState(false);
 const isPw=type==="password";
 return <div className="relative flex items-center">
  {icon&&<span className="absolute left-3.5 text-text-3 pointer-events-none flex"><I n={icon} s={17}/></span>}
  <input {...r} type={isPw?(show?"text":"password"):type}
   className={`${inp} ${icon?"pl-10":""} ${suffix||isPw?"pr-12":""} ${invalid?"border-red ring-4 ring-red-bg":"focus:border-brand focus:ring-4 focus:ring-wash"}`}
   style={style}/>
  {isPw?<button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?"Hide password":"Show password"}
    className="absolute right-3.5 text-text-3 bg-transparent border-0 cursor-pointer flex p-0 hover:text-text-2">
    <I n={show?"eyeOff":"eye"} s={17}/></button>
   :suffix&&<span className="absolute right-3.5 text-text-3 text-sm font-medium">{suffix}</span>}</div>;}
export function Area({style,invalid,...r}){
 return <textarea {...r}
  className={`${inp} resize-none leading-relaxed ${invalid?"border-red":"focus:border-brand focus:ring-4 focus:ring-wash"}`}
  style={style}/>;}
export function Sel({children,style,invalid,...r}){
 return <select {...r} className={`${inp} appearance-none cursor-pointer ${invalid?"border-red ring-4 ring-red-bg":"focus:border-brand focus:ring-4 focus:ring-wash"}`}
  style={{paddingRight:38,
   backgroundImage:"linear-gradient(45deg,transparent 50%,#8493A9 50%),linear-gradient(135deg,#8493A9 50%,transparent 50%)",
   backgroundPosition:"calc(100% - 18px) center, calc(100% - 13px) center",backgroundSize:"5px 5px,5px 5px",
   backgroundRepeat:"no-repeat",...style}}>{children}</select>;}
export function Field({label,hint,error,required,children,style}){
 return <div style={style}>
  {label&&<label className="block text-sm font-semibold text-text mb-2">
   {label}{required&&<span className="text-red ml-1">*</span>}</label>}
  {children}
  {error?<div className="text-xs text-red mt-1.5 flex gap-1.5 items-center" style={{animation:"shake .3s"}}>
   <I n="alert" s={13}/>{error}</div>:hint?<div className="text-xs text-text-3 mt-1.5">{hint}</div>:null}</div>;}
export function Switch({on,onChange,disabled}){
 return <button type="button" role="switch" aria-checked={on} disabled={disabled}
  onClick={()=>onChange(!on)}
  className={`w-12 h-7 rounded-full flex items-center p-1 shrink-0 border-0 transition-colors duration-200 ${disabled?"cursor-not-allowed opacity-50":"cursor-pointer"} ${on?"bg-brand justify-end":"bg-line justify-start"}`}>
  <div className="w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all duration-200"/></button>;}
export function CheckRow({on,onChange,label,sub,disabled}){
 return <button type="button" role="checkbox" aria-checked={on} disabled={disabled} onClick={disabled?undefined:()=>onChange(!on)}
  className={`flex gap-3 items-start py-3 px-3.5 border rounded-xl transition-all duration-150 w-full text-left ${disabled?"cursor-not-allowed opacity-50":"cursor-pointer"} ${on?"border-brand bg-tint":"border-line bg-white"}`}>
  <span className={`w-5 h-5 rounded-md shrink-0 mt-px border-2 flex items-center justify-center transition-all duration-150 ${on?"border-brand bg-brand":"border-line bg-white"}`}>
   {on&&<I n="check" s={13} c="#fff" w={3}/>}</span>
  <span className="min-w-0"><span className="block text-sm font-semibold text-text">{label}</span>
   {sub&&<span className="block text-xs text-text-3 mt-0.5">{sub}</span>}</span></button>;}
export function Bar({v,tone=C.brand,h=6}){return <div className="bg-line-soft rounded-full overflow-hidden" style={{height:h}}>
 <div className="h-full rounded-full" style={{width:`${Math.min(100,Math.max(0,v))}%`,background:tone,transition:"width .7s cubic-bezier(.22,.68,.35,1)"}}/></div>;}
export function Ring({v,size=46,label}){
 const r=(size-6)/2,c=size/2,circ=2*Math.PI*r;const col=v>=85?C.ok:v>=65?C.brand:C.warn;
 return <div className="text-center shrink-0">
  <svg width={size} height={size} className="block">
   <circle cx={c} cy={c} r={r} fill="none" stroke={C.lineSoft} strokeWidth={3.4}/>
   <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={3.4} strokeDasharray={`${v/100*circ} ${circ}`}
    strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} style={{transition:"stroke-dasharray .8s cubic-bezier(.22,.68,.35,1)"}}/>
   <text x={c} y={c+size*.095} textAnchor="middle" fontSize={size*.28} fontWeight="700" fill={col}>{v}</text></svg>
  {label&&<div className="text-xs text-text-3 mt-1">{label}</div>}</div>;}
export function Empty({icon="search",title,body,action}){
 return <div className="text-center py-13 px-6 bg-white border border-dashed border-line rounded-2xl" style={{animation:"rise .34s ease both"}}>
  <div className="w-14 h-14 rounded-2xl bg-bg flex items-center justify-center mx-auto mb-4 text-text-3"><I n={icon} s={26}/></div>
  <div className="text-lg font-bold text-text mb-2 tracking-tight">{title}</div>
  <div className="text-sm text-text-2 leading-relaxed max-w-sm mx-auto">{body}</div>
  {action&&<div className="mt-5">{action}</div>}</div>;}
export function Banner({tone="brand",icon,title,children,action,onClose,style}){
 const T=TONE_SOFT[tone]||TONE_SOFT.brand;
 return <div className={`border rounded-xl py-3.5 px-4 flex gap-3 items-start ${T}`} style={{animation:"rise .3s ease both",...style}}>
  <span className="flex shrink-0 mt-px"><I n={icon||"info"} s={18}/></span>
  <div className="flex-1 min-w-0">
   {title&&<div className={`text-sm font-bold ${children?"mb-1":""}`}>{title}</div>}
   {children&&<div className="text-sm text-text-2 leading-relaxed">{children}</div>}</div>
  {action}
  {onClose&&<button onClick={onClose} className="border-0 cursor-pointer flex p-0 shrink-0"><I n="x" s={16}/></button>}</div>;}

/* Auto-dismissing toast stack, driven by A.toasts (see useStore's toast()/dismissToast()).
   Mount once at the app root — pass toasts/dismiss from the store, don't build a second one. */
export function ToastHost({toasts,dismiss}){
 if(!toasts?.length)return null;
 const T={brand:"bg-ink text-white",ok:"bg-ok text-white",warn:"bg-warn text-white",danger:"bg-red text-white"};
 return <div className="fixed left-1/2 z-[900] flex flex-col gap-2.5 items-center" style={{bottom:24,transform:"translateX(-50%)",width:"min(92vw,420px)"}}>
  {toasts.map(t=><div key={t.id} role="status"
    className={`w-full rounded-xl py-3 px-4 flex gap-3 items-center shadow-lg ${T[t.tone]||T.brand}`}
    style={{animation:"up .22s cubic-bezier(.22,.68,.35,1) both"}}>
   <span className="text-sm font-medium flex-1 min-w-0">{t.message}</span>
   <button onClick={()=>dismiss(t.id)} className="border-0 bg-transparent p-0 cursor-pointer flex shrink-0 opacity-70"><I n="x" s={15} c="#fff"/></button>
  </div>)}
 </div>;
}

export function H1({children,sub,action,style}){
 return <div className="flex items-end justify-between gap-5 flex-wrap mb-8" style={style}>
  <div><h1 className="text-4xl font-bold tracking-tight text-text m-0 leading-none">{children}</h1>
   {sub&&<div className="text-base text-text-2 mt-2.5 leading-normal max-w-xl">{sub}</div>}</div>{action}</div>;}
export function H2({children,sub,action,style}){
 return <div className="flex items-end justify-between gap-3.5 flex-wrap mb-6" style={style}>
  <div><div className="text-2xl font-bold tracking-tight text-text leading-tight">{children}</div>
   {sub&&<div className="text-sm text-text-2 mt-1.5">{sub}</div>}</div>{action}</div>;}
export function Lbl({children,style}){return <div className="text-xs font-bold text-text-3 uppercase tracking-widest mb-2.5" style={style}>{children}</div>;}

/* ═══════════════ MARKETING/PUBLIC-PAGE HEADING SCALE ═══════════════
   H1/H2 above are for internal dashboard pages (title + optional action button in a flex
   row). Public-facing pages (marketing, seeker, shared, auth) render centered/hero-style
   headings with no consistent shared source, each hand-picking font-weight/tracking/leading -
   the actual font-SIZE tier (mobile/desktop text-*xl pair) legitimately varies by context
   (a homepage hero vs. a job-detail-page title vs. a section header aren't the same size),
   so that stays a literal ternary at each call site for Tailwind's static scanner to see -
   only the weight/tracking/leading/color identity is shared here. */
export const HERO_TIGHT="font-extrabold tracking-tighter leading-none text-text"; /* standard + detail-page hero titles */
export const HERO_WIDE="font-extrabold tracking-tight leading-none text-text"; /* top-of-funnel "mega" hero titles (home, blogs, trainings) */
export const HERO_WRAP="font-extrabold tracking-tight text-text leading-tight"; /* hero titles holding dynamic content that may wrap to 2+ lines (article/training titles) - leading-tight not leading-none */
export const HERO_QUIET="font-bold tracking-tight text-text"; /* de-emphasized utility-page h1s (legal docs, confirmation screens) - no forced leading, callers keep their own */
export const SECTION_CLS="font-bold text-text tracking-tight"; /* in-page section headers on public pages - callers add their own leading-tight/-snug/-none */
export function Stat({label,value,tone=C.text,icon,delta,onClick}){
 return <div onClick={onClick} {...clickableA11y(onClick)}
  className={`bg-white border rounded-2xl py-6 px-6 transition-[border-color,transform] duration-150 ${onClick?"cursor-pointer border-line hover:border-line-2 hover:-translate-y-0.5":"cursor-default border-line"}`}>
  <div className="flex items-center gap-2.5 mb-3.5 text-text-3">
   {icon&&<I n={icon} s={16}/>}<span className="text-sm text-text-2 font-semibold">{label}</span></div>
  <div className="text-4xl font-extrabold leading-none tracking-tighter" style={{color:tone}}>{value}</div>
  {delta&&<div className="text-xs text-ok mt-2.5 font-semibold">{delta}</div>}</div>;}
export function Modal({open=true,onClose,title,sub,children,footer,width=520}){
 const mob=useMedia("(max-width: 820px)");
 const boxRef=useRef(null);
 useEffect(()=>{if(!open||typeof document==="undefined")return;const p=document.body.style.overflow;
  document.body.style.overflow="hidden";return()=>{document.body.style.overflow=p;};},[open]);
 useEffect(()=>{
  if(!open)return;
  boxRef.current?.focus();
  const onKey=e=>{
   if(e.key==="Escape"){onClose?.();return;}
   if(e.key==="Tab"&&boxRef.current){
    const focusables=boxRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener("keydown",onKey);
  return()=>document.removeEventListener("keydown",onKey);
 },[open,onClose]);
 if(!open)return null;
 return <div onClick={onClose} className={`fixed inset-0 bg-ink/50 z-[700] flex justify-center ${mob?"items-end p-0":"items-center p-6"}`}
  style={{animation:"fadeIn .16s ease"}}>
  <div onClick={e=>e.stopPropagation()} ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
   className={`bg-white w-full shadow-lg flex flex-col outline-none ${mob?"rounded-t-3xl max-h-[92vh]":"rounded-2xl max-h-[86vh]"}`}
   style={{maxWidth:mob?undefined:width, animation:mob?"up .26s cubic-bezier(.22,.68,.35,1)":"pop .2s cubic-bezier(.22,.68,.35,1)"}}>
   {mob&&<div className="w-10 h-1 bg-line rounded-full mt-2.5 mx-auto mb-0.5 shrink-0"/>}
   <div className="py-5 px-6 border-b border-line-soft flex justify-between gap-3.5 items-start shrink-0">
    <div><div className="text-lg font-bold tracking-tight text-text">{title}</div>
     {sub&&<div className="text-sm text-text-2 mt-1">{sub}</div>}</div>
    <button onClick={onClose} className="bg-bg border-0 w-9 h-9 rounded-full cursor-pointer text-text-2 flex items-center justify-center shrink-0"><I n="x" s={17}/></button></div>
   <div className="p-6 overflow-y-auto flex-1">{children}</div>
   {footer&&<div className={`py-4 px-6 border-t border-line-soft bg-bg shrink-0 ${mob?"":"rounded-b-2xl"}`}
     style={{paddingBottom: mob ? "calc(16px + env(safe-area-inset-bottom))" : undefined}}>{footer}</div>}</div></div>;}

/* Shared "are you sure?" dialog — replaces the native confirm()/window.confirm() calls scattered
   across destructive actions (offboard, wipe data, execute payroll, remove badge). Renders nothing
   when closed, so a caller can mount it unconditionally and just flip `open`. */
export function ConfirmDialog({open,onClose,onConfirm,title,children,confirmLabel="Confirm",kind="danger"}){
 if(!open)return null;
 return <Modal onClose={onClose} title={title} width={440}>
  <div className="flex flex-col gap-4">
   {children&&<div className="text-sm text-text-2 leading-relaxed">{children}</div>}
   <div className="flex gap-2.5 justify-end">
    <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
    <Btn kind={kind} onClick={()=>{onConfirm();onClose();}}>{confirmLabel}</Btn>
   </div>
  </div>
 </Modal>;
}

export function Tabs({items,value,onChange,style}){
 return <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={style}>
  {items.map(it=>{const on=value===it.k;
   return <button key={it.k} onClick={()=>onChange(it.k)}
    className={`flex items-center gap-2 py-2.5 px-4 rounded-full cursor-pointer text-sm whitespace-nowrap shrink-0 border transition-all duration-150 ${on?"border-brand bg-wash text-brand font-bold":"border-line bg-white text-text-2 font-medium"}`}>
    {it.icon&&<I n={it.icon} s={15} w={on?2.1:1.8}/>}{it.label}
    {it.n>0&&<span className={`text-xs font-bold min-w-5 h-5 rounded-full flex items-center justify-center px-1.5 ${on?"bg-brand text-white":"bg-line-soft text-text-2"}`}>{it.n}</span>}
   </button>;})}</div>;}

export function DatePicker({value,onChange,min,max}){
  /* Native <input type="date"> ignores the placeholder attribute in every major browser —
     don't forward one, it silently does nothing. */
  return <Input type="date" value={value||""} min={min} max={max}
    onChange={e=>onChange(e.target.value)} icon="calendar"/>;
}

/* ═══════════════ PAGE LAYOUT WRAPPER ═══════════════ */
export const MAXW={site:1240,narrow:820,wide:1360};
export const PADX={mob:"16px",dt:"32px"};
export const Page=({children,wide,narrow})=>{
  const mob=useMedia("(max-width: 900px)");
  return <div className={`w-full mx-auto ${narrow?"max-w-narrow":wide?"max-w-wide":"max-w-site"} ${mob?"pt-8 px-4 pb-12":"pt-14 px-8 pb-20"}`}>{children}</div>;
};

/* ═══════════════ RICH TEXT EDITOR — used across CV builder, job posting, articles ═══════════════ */
export function RichText({value,onChange,placeholder,rows=6,minHeight}){
  const ref=useRef(null);
  const fileRef=useRef(null);
  const savedRange=useRef(null);
  const [showing,setShowing]=useState(value||"");
  const [linkOpen,setLinkOpen]=useState(false);
  const [linkUrl,setLinkUrl]=useState("");
  const [imageOpen,setImageOpen]=useState(false);
  const [imageUrl,setImageUrl]=useState("");
  const [imageAlt,setImageAlt]=useState("");
  const [imageErr,setImageErr]=useState("");
  const [sourceMode,setSourceMode]=useState(false);
  useEffect(()=>{
    if(ref.current&&ref.current.innerHTML!==(value||"")){
      ref.current.innerHTML=value||"";
      setShowing(value||"");
    }
  },[value]);
  const cmd=(c,arg)=>{document.execCommand(c,false,arg); ref.current?.focus(); update();};
  const update=()=>{if(ref.current){const html=ref.current.innerHTML; setShowing(html); onChange(html);}};
  /* Opening a modal (link or image) moves focus off the editable div, which would normally
     collapse the text selection — so the selection is snapshotted here and restored right
     before the insert command runs. */
  const snapshotSelection=()=>{
    const sel=window.getSelection();
    if(sel&&sel.rangeCount>0)savedRange.current=sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection=()=>{
    ref.current?.focus();
    const sel=window.getSelection();
    if(savedRange.current){sel.removeAllRanges(); sel.addRange(savedRange.current);}
  };
  const addLink=()=>{snapshotSelection(); setLinkUrl("https://"); setLinkOpen(true);};
  const confirmLink=()=>{
    if(linkUrl.trim()&&linkUrl.trim()!=="https://"){restoreSelection(); cmd("createLink",linkUrl.trim());}
    setLinkOpen(false);
  };
  const addImage=()=>{snapshotSelection(); setImageUrl(""); setImageAlt(""); setImageErr(""); setImageOpen(true);};
  /* No backend/file-hosting exists, so a local upload embeds the image as a base64 data: URI
     directly in the stored HTML - the same "honest ceiling" the print-to-PDF helpers already
     settled on elsewhere in the app. Capped well under localStorage's practical per-key limits
     so one oversized photo can't silently corrupt the rest of a user's saved draft. */
  const MAX_IMAGE_BYTES=2*1024*1024;
  const handleFile=file=>{
    if(!file)return;
    if(!file.type.startsWith("image/")){setImageErr("Choose an image file.");return;}
    if(file.size>MAX_IMAGE_BYTES){setImageErr("Image is too large — please use one under 2 MB.");return;}
    setImageErr("");
    const reader=new FileReader();
    reader.onload=()=>setImageUrl(String(reader.result||""));
    reader.readAsDataURL(file);
  };
  const confirmImage=()=>{
    if(!imageUrl.trim()){setImageErr("Add an image URL or upload a file first.");return;}
    restoreSelection();
    document.execCommand("insertHTML",false,`<img src="${imageUrl.trim().replace(/"/g,"&quot;")}" alt="${imageAlt.trim().replace(/"/g,"&quot;")}">`);
    ref.current?.focus(); update();
    setImageOpen(false);
  };
  const toggleSource=()=>{
    if(!sourceMode){update();} /* capture any pending WYSIWYG edit before switching away from it */
    else if(ref.current){ref.current.innerHTML=showing; onChange(showing);} /* push edited source back into the editable div */
    setSourceMode(s=>!s);
  };
  const tools=[
    {ic:"B",act:()=>cmd("bold"),style:{fontWeight:800}},
    {ic:"I",act:()=>cmd("italic"),style:{fontStyle:"italic"}},
    {ic:"U",act:()=>cmd("underline"),style:{textDecoration:"underline"}},
    {sep:true},
    {label:"• List",act:()=>cmd("insertUnorderedList")},
    {label:"1. List",act:()=>cmd("insertOrderedList")},
    {sep:true},
    {label:"Link",act:addLink},
    {label:"Image",act:addImage},
    {label:"Clear",act:()=>cmd("removeFormat")},
  ];
  const isEmpty=!showing||showing==="<br>"||showing.trim()==="";
  return <div className="border-2 border-line has-focus:border-brand rounded-xl bg-white has-focus:ring-4 has-focus:ring-wash transition-[border-color,box-shadow] duration-150 overflow-hidden">
    <div className="flex flex-wrap gap-0.5 py-1.5 px-2 border-b border-line-soft bg-bg items-center">
      {!sourceMode&&tools.map((t,i)=>t.sep
        ? <div key={i} className="w-px bg-line m-1"/>
        : <button key={i} type="button" onMouseDown={e=>{e.preventDefault(); t.act();}}
            className="bg-transparent border-0 cursor-pointer py-1.5 px-2.5 rounded-md text-xs font-semibold text-text-2 transition-colors duration-100 hover:bg-wash"
            style={t.style}>{t.ic||t.label}</button>)}
      <div className="flex-1"/>
      <button type="button" onClick={toggleSource} title={sourceMode?"Back to formatted view":"View/edit raw HTML"}
        className={`border-0 cursor-pointer py-1.5 px-2.5 rounded-md text-xs font-semibold font-mono transition-colors duration-100 ${sourceMode?"bg-brand text-white":"bg-transparent text-text-2 hover:bg-wash"}`}>&lt;/&gt;</button>
    </div>
    {sourceMode
      ? <textarea value={showing} onChange={e=>{setShowing(e.target.value); onChange(e.target.value);}}
          className="w-full py-3 px-3.5 text-xs text-text font-mono leading-relaxed outline-none resize-y block"
          style={{minHeight:minHeight||`${rows*22}px`}} spellCheck={false}/>
      : <div className="relative">
          <div ref={ref} contentEditable suppressContentEditableWarning
            onInput={update}
            className="rich-content peer py-3 px-3.5 text-sm text-text leading-relaxed outline-none whitespace-pre-wrap"
            style={{minHeight:minHeight||`${rows*22}px`}}/>
          {isEmpty&&<div className="absolute top-3 left-3.5 text-text-3 text-sm pointer-events-none peer-focus:hidden">{placeholder}</div>}
        </div>}
    {linkOpen&&<Modal onClose={()=>setLinkOpen(false)} title="Add a link" width={420}>
      <div className="flex flex-col gap-3">
        <Field label="URL" hint="Applies to the currently selected text.">
          <Input autoFocus icon="externalLink" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)}
            placeholder="https://example.com" onKeyDown={e=>{if(e.key==="Enter")confirmLink();}}/>
        </Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setLinkOpen(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={confirmLink}>Insert link</Btn>
        </div>
      </div>
    </Modal>}
    {imageOpen&&<Modal onClose={()=>setImageOpen(false)} title="Add an image" width={440}>
      <div className="flex flex-col gap-3">
        <Field label="Upload from your device">
          <input ref={fileRef} type="file" accept="image/*" onChange={e=>handleFile(e.target.files?.[0])}
            className="text-sm text-text-2"/>
        </Field>
        <div className="text-xs text-text-3 text-center -my-1">or</div>
        <Field label="Image URL" hint="A direct link to an already-hosted image.">
          <Input icon="externalLink" value={imageUrl.startsWith("data:")?"":imageUrl}
            onChange={e=>{setImageUrl(e.target.value); setImageErr("");}} placeholder="https://example.com/photo.jpg"/>
        </Field>
        {imageUrl.startsWith("data:")&&<div className="text-xs text-ok font-semibold">Image loaded from your device — ready to insert.</div>}
        <Field label="Alt text" hint="Describes the image for screen readers.">
          <Input value={imageAlt} onChange={e=>setImageAlt(e.target.value)} placeholder="e.g. Team on a job site"/>
        </Field>
        {imageErr&&<div className="text-xs text-red font-semibold">{imageErr}</div>}
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setImageOpen(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={confirmImage}>Insert image</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ═══════════════ PAGINATION — the #1 repeated systemic finding (every list in every
   domain rendered unbounded). One hook computes the visible slice + page math; one
   component renders the standard "Showing X–Y of Z" + prev/next control. Adopting this
   in a list means: const pg=usePagination(filteredList); render pg.pageItems instead of
   filteredList; render <Pagination {...pg}/> once at the bottom. ═══════════════ */
export function usePagination(items,pageSize=20){
  const [page,setPage]=useState(1);
  const totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  const safePage=Math.min(page,totalPages);
  if(safePage!==page)setPage(safePage); /* clamp during render if the filtered set shrank - React supports adjusting state mid-render when the value actually changes */
  const start=(safePage-1)*pageSize;
  return {page:safePage,setPage,totalPages,pageSize,total:items.length,pageItems:items.slice(start,start+pageSize)};
}
export function Pagination({page,setPage,totalPages,total,pageSize}){
  if(totalPages<=1)return null;
  const from=total===0?0:(page-1)*pageSize+1; const to=Math.min(page*pageSize,total);
  const navBtn="w-8 h-8 rounded-lg border border-line bg-white text-text-2 flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:bg-bg";
  return <div className="flex items-center justify-between flex-wrap gap-3 pt-4 mt-1">
    <div className="text-sm text-text-3">Showing {from}–{to} of {total}</div>
    <div className="flex items-center gap-1.5">
      <button className={navBtn} disabled={page===1} onClick={()=>setPage(1)} aria-label="First page"><I n="arrowL" s={13} w={2.4}/><I n="arrowL" s={13} w={2.4} style={{marginLeft:-8}}/></button>
      <button className={navBtn} disabled={page===1} onClick={()=>setPage(page-1)} aria-label="Previous page"><I n="arrowL" s={14} w={2.4}/></button>
      <span className="text-sm text-text-2 px-2 font-medium">Page {page} of {totalPages}</span>
      <button className={navBtn} disabled={page===totalPages} onClick={()=>setPage(page+1)} aria-label="Next page"><I n="arrowR" s={14} w={2.4}/></button>
      <button className={navBtn} disabled={page===totalPages} onClick={()=>setPage(totalPages)} aria-label="Last page"><I n="arrowR" s={13} w={2.4}/><I n="arrowR" s={13} w={2.4} style={{marginLeft:-8}}/></button>
    </div>
  </div>;
}

/* ═══════════════ TABLE — shared header/cell classes so every hand-rolled <table> stops
   redefining slightly-different padding. Import TH_CLASS/TD_CLASS directly for tables with
   irregular structure (colSpan empty-states, mixed cell types); use <Table> for the common
   case of a plain columns-array + <tbody> body. ═══════════════ */
export const TH_CLASS="py-2.5 px-3 text-xs font-bold text-text-3 tracking-wide uppercase text-left";
export const TD_CLASS="py-3 px-3";
export function Table({columns,minWidth=640,children}){
  return <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth}}>
    <thead><tr className="border-b-2 border-line text-left">
      {columns.map(c=><th key={c} className={TH_CLASS}>{c}</th>)}
    </tr></thead>
    <tbody>{children}</tbody>
  </table></div>;
}
