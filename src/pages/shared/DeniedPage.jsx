import { use } from "../../store/context.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Page } from "../../design/primitives.jsx";

export function DeniedPage(){
  const A=use();
  const role=A.user?.role;
  return <Page narrow>
    <Card pad={34} style={{textAlign:"center"}}>
      <div style={{width:66,height:66,borderRadius:99,background:C.warnBg,border:`2px solid ${C.warnLn}`,display:"flex",
        alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}><I n="lock" s={30} c={C.warn}/></div>
      <h1 style={{fontSize:23,fontWeight:730,letterSpacing:"-.03em",color:C.text,margin:"0 0 10px"}}>Not available on this account</h1>
      <p style={{fontSize:15,color:C.text2,lineHeight:1.65,margin:"0 auto 24px",maxWidth:430}}>
        {!role?"You need to sign in to open this page."
         :role==="seeker"?"That area belongs to employer and administrator accounts. Your job seeker account has its own dashboard, applications and CV tools."
         :role==="employer"?"That area is for job seeker or administrator accounts. Your employer account covers listings, candidates and content."
         :"That area is not part of the administrator console."}</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <Btn kind="primary" onClick={()=>A.go(A.homePg)}>Go to my dashboard</Btn>
        {!role&&<Btn kind="outline" onClick={()=>A.go("login")}>Sign in</Btn>}</div></Card></Page>;
}
