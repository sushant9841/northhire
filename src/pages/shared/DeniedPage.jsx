import { use } from "../../store/context.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Page, HERO_QUIET } from "../../design/primitives.jsx";

export function DeniedPage(){
  const A=use();
  const role=A.user?.role;
  return <Page narrow>
    <Card pad={34} style={{textAlign:"center"}}>
      <div className="w-17 h-17 rounded-full bg-warn-bg border-2 border-warn-ln flex items-center justify-center mx-auto mb-5"><I n="lock" s={30} c={C.warn}/></div>
      <h1 className={`${HERO_QUIET} text-2xl mb-2.5`}>Not available on this account</h1>
      <p className="text-base text-text-2 leading-relaxed mx-auto mb-6 max-w-md">
        {!role?"You need to sign in to open this page."
         :role==="seeker"?"That area belongs to employer and administrator accounts. Your job seeker account has its own dashboard, applications and CV tools."
         :role==="employer"?"That area is for job seeker or administrator accounts. Your employer account covers listings, candidates and content."
         :"That area is not part of the administrator console."}</p>
      <div className="flex gap-2.5 justify-center flex-wrap">
        <Btn kind="primary" onClick={()=>A.go(A.homePg)}>Go to my dashboard</Btn>
        {!role&&<Btn kind="outline" onClick={()=>A.go("login")}>Sign in</Btn>}</div></Card></Page>;
}
