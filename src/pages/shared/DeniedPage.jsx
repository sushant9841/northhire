import { use } from "../../store/context.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Page, HERO_QUIET } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

export function DeniedPage(){
  const A=use();
  const { t } = useTranslation();
  const role=A.user?.role;
  return <Page narrow>
    <Card pad={34} style={{textAlign:"center"}}>
      <div className="w-17 h-17 rounded-full bg-warn-bg border-2 border-warn-ln flex items-center justify-center mx-auto mb-5"><I n="lock" s={30} c={C.warn}/></div>
      <h1 className={`${HERO_QUIET} text-2xl mb-2.5`}>{t("denied.title")}</h1>
      <p className="text-base text-text-2 leading-relaxed mx-auto mb-6 max-w-md">
        {!role?t("denied.noRoleBody")
         :role==="seeker"?t("denied.seekerBody")
         :role==="employer"?t("denied.employerBody")
         :t("denied.adminBody")}</p>
      <div className="flex gap-2.5 justify-center flex-wrap">
        <Btn kind="primary" onClick={()=>A.go(A.homePg)}>{t("denied.goToDashboard")}</Btn>
        {!role&&<Btn kind="outline" onClick={()=>A.go("login")}>{t("denied.signIn")}</Btn>}</div></Card></Page>;
}
