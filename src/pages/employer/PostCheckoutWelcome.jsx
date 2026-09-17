import { useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Page, HERO_QUIET } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

/* Employer Transformation E6: post-checkout welcome screen. Lands right after a Stripe checkout
   redirect (see EmpBilling's checkoutResult handling in suite.jsx), which now routes here instead
   of only showing a small confirmation banner - "Welcome to Growth/Enterprise, here's what you
   unlocked" plus 4 tiles of the plan's real new features and a choice between a guided tour
   (reuses the existing WelcomeTourPage carousel) or going straight to the dashboard. One-shot per
   plan: server records welcomeSeenPlan (see markWelcomeSeen()/employers.js), so a returning visit
   on the same plan never re-shows this, but a later plan change does. */
const TILES_BY_PLAN={
  Growth:[
    ["mail","employer.postCheckoutWelcome.tileMessagingTitle","employer.postCheckoutWelcome.tileMessagingBody"],
    ["calendar","employer.postCheckoutWelcome.tileInterviewsTitle","employer.postCheckoutWelcome.tileInterviewsBody"],
    ["target","employer.postCheckoutWelcome.tileTalentPoolTitle","employer.postCheckoutWelcome.tileTalentPoolBody"],
    ["award","employer.postCheckoutWelcome.tileFeaturedTitle","employer.postCheckoutWelcome.tileFeaturedBody"],
  ],
  Enterprise:[
    ["users","employer.postCheckoutWelcome.tileHrSuiteTitle","employer.postCheckoutWelcome.tileHrSuiteBody"],
    ["externalLink","employer.postCheckoutWelcome.tileApiTitle","employer.postCheckoutWelcome.tileApiBody"],
    ["shield","employer.postCheckoutWelcome.tileSsoTitle","employer.postCheckoutWelcome.tileSsoBody"],
    ["award","employer.postCheckoutWelcome.tileUnlimitedFeaturedTitle","employer.postCheckoutWelcome.tileUnlimitedFeaturedBody"],
  ],
};
export function EmpPostCheckoutWelcome(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const plan=A.company?.plan||"Free";
  const tiles=TILES_BY_PLAN[plan]||TILES_BY_PLAN.Growth;
  useEffect(()=>{ if(A.company?.id)A.markWelcomeSeen?.(); },[A.company?.id]); // stamp seen the moment this screen renders, not only on a button click
  useEffect(()=>{ if(!A.company)return; if(plan==="Free")A.go("empHome"); },[A.company,plan]);
  if(!A.company)return null;
  return <Page narrow>
    <div className="text-center pt-4 pb-6" style={{animation:"rise .4s ease both"}}>
      <div className="w-19 h-19 rounded-full bg-ok-bg border-2 border-ok-ln flex items-center justify-center mx-auto mb-5" style={{animation:"pop .45s cubic-bezier(.22,.68,.35,1) both"}}>
        <I n="sparkle" s={36} c={C.ok} w={2.6}/></div>
      <h1 className={`${HERO_QUIET} text-3xl mb-2.5`}>{t("employer.postCheckoutWelcome.title",{plan})}</h1>
      <p className="text-base text-text-2 max-w-lg mx-auto leading-relaxed">{t("employer.postCheckoutWelcome.subtitle")}</p>
    </div>
    <div className={`grid gap-3.5 mb-8 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {tiles.map(([icon,titleKey,bodyKey])=><Card key={titleKey} pad={22} style={{borderRadius:16}}>
        <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center mb-3.5"><I n={icon} s={21}/></div>
        <div className="text-base font-bold text-text mb-1.5">{t(titleKey)}</div>
        <div className="text-sm text-text-2 leading-snug">{t(bodyKey)}</div>
      </Card>)}
    </div>
    <div className="flex gap-2.5 justify-center flex-wrap">
      <Btn kind="primary" size="lg" icon="sparkle" onClick={()=>A.go("welcomeEmp")}>{t("employer.postCheckoutWelcome.takeTour")}</Btn>
      <Btn kind="outline" size="lg" onClick={()=>A.go("empHome")}>{t("employer.postCheckoutWelcome.skipToDashboard")}</Btn>
    </div>
  </Page>;
}
