import { useState } from "react";
import { ThemeCtx, useT, mkT } from "./theme.js";
import { inp, I, Av } from "./helpers.jsx";
import { authAPI, setToken, getToken } from "./api.js";

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({user, pg, go, logout, notif, roles, dark, setDark, col, setCol}) {
  const T=useT();
  const NAV=[
    {k:"dashboard", l:"Dashboard",           ic:I.dash},
    {k:"analytics", l:"Tahlil Markazi",      ic:"📊"},
    {k:"pipeline",  l:"Pipeline",            ic:I.pipe},
    {k:"leads",     l:"Mijozlar",            ic:I.list},
    {k:"tasks",     l:"Vazifalar",           ic:I.task},
    {k:"finance",   l:"Moliya",              ic:I.money},
    {k:"salary",    l:"Xodim Xarajatlari",   ic:I.salary},
    {k:"docspipe",  l:"Konsultant Pipeline", ic:I.flag},
    {k:"debts",     l:"Qarzlar",             ic:I.money},
    {k:"visa",      l:"Viza",                ic:I.flag},
    {k:"team",      l:"Jamoa",               ic:I.team},
    {k:"settings",  l:"Sozlamalar",          ic:I.gear},
  ];
  const allowed={
    admin:  NAV.map(n=>n.k),
    manager:["dashboard","pipeline","leads","tasks","finance","debts","visa","team","settings","docspipe","analytics"],
    sales:  ["dashboard","pipeline","leads","tasks"],
    docs:   ["dashboard","pipeline","leads","tasks","docspipe","visa"],
    partner:["leads","pipeline"],
  };
  const perm=roles[user.role]||{};
  let vis=NAV.filter(n=>(allowed[user.role]||[]).includes(n.k));
  const W=col?46:192;
  const btnStyle=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:col?0:7,padding:col?"8px 0":"6px 9px",borderRadius:6,marginBottom:1,cursor:"pointer",border:"none",textAlign:"left",background:active?`${T.accent}22`:"transparent",color:active?T.accent:T.muted,fontWeight:active?700:400,fontSize:11,justifyContent:col?"center":"flex-start",position:"relative",transition:"background 0.15s"});
  return <div style={{width:W,background:T.card,borderRight:`1px solid ${T.border}`,height:"100vh",display:"flex",flexDirection:"column",flexShrink:0,transition:"width 0.2s ease",overflow:"hidden",position:"sticky",top:0}}>
    {/* Logo */}
    <div style={{padding:col?"10px 0":"11px 10px 9px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",gap:4,flexShrink:0}}>
      {!col&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>✈️</span><div><div style={{color:T.text,fontWeight:900,fontSize:12}}>OneJobs</div><div style={{color:T.accent,fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>CRM v10</div></div></div>}
      {col&&<span style={{fontSize:18}}>✈️</span>}
      <button onClick={()=>setCol(c=>!c)} title={col?"Kengaytirish":"Yig'ish"} style={{width:20,height:20,borderRadius:5,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,flexShrink:0,padding:0}}>
        <span style={{display:"inline-block",transform:col?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",fontSize:9}}>{I.chev}</span>
      </button>
    </div>
    {/* Nav (scrollable) */}
    <nav style={{padding:col?"4px 3px":"5px 6px",flex:1,overflowY:"auto",overflowX:"hidden"}}>
      {vis.map(({k,l,ic})=>(
        <button key={k} onClick={()=>go(k)} title={col?l:""} style={btnStyle(pg===k)}>
          <span style={{color:pg===k?T.accent:T.muted,flexShrink:0,fontSize:14}}>{ic}</span>
          {!col&&<span style={{color:pg===k?T.text:T.muted,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l}</span>}
          {k==="tasks"&&notif>0&&<span style={{position:col?"absolute":undefined,top:col?1:undefined,right:col?1:undefined,marginLeft:col?0:"auto",background:T.red,color:"#fff",borderRadius:10,fontSize:7,fontWeight:700,padding:"0 3px",minWidth:13,textAlign:"center",flexShrink:0}}>{notif}</span>}
        </button>
      ))}
    </nav>
    {/* Footer (always visible, never scrolls away) */}
    <div style={{borderTop:`1px solid ${T.border}`,padding:col?"6px 3px":"7px 6px",flexShrink:0,background:T.card}}>
      {/* User info */}
      {col
        ?<div style={{display:"flex",justifyContent:"center",marginBottom:5}}><Av id={user.id} team={[user]} size={26}/></div>
        :<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,padding:"3px 4px"}}>
           <Av id={user.id} team={[user]} size={24}/>
           <div style={{minWidth:0,flex:1}}>
             <div style={{color:T.text,fontSize:10,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
             <div style={{color:roles[user.role]?.color||T.muted,fontSize:8,fontWeight:600}}>{roles[user.role]?.label}</div>
           </div>
         </div>}
      {/* Theme toggle + Logout row */}
      <div style={{display:"flex",gap:4}}>
        <button onClick={()=>setDark(d=>!d)} title={dark?"Light mode":"Dark mode"} style={{flex:col?1:0,width:col?"100%":28,height:28,borderRadius:6,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,fontSize:14,padding:0}}>
          {dark?I.sun:I.moon}
        </button>
        {!col&&<button onClick={logout} style={{flex:1,height:28,borderRadius:6,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          {I.logout} Chiqish
        </button>}
        {col&&<button onClick={logout} title="Chiqish" style={{flex:1,height:28,borderRadius:6,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
          {I.logout}
        </button>}
      </div>
    </div>
  </div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin, team, roles}) {
  const T=mkT(true);
  const [u,su]=useState(""); const [p,sp]=useState(""); const [e,se]=useState("");
  const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!u||!p) return;
    setLoading(true); se("");
    try {
      const data = await authAPI.login(u, p);
      setToken(data.token);
      onLogin({...data.user, token: data.token});
    } catch(err) {
        se(err.message || "Login yoki parol noto'g'ri");
    } finally { setLoading(false); }
};
  const inpS={...inp(T),marginBottom:0};
  return <ThemeCtx.Provider value={T}>
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,width:400,padding:36,boxShadow:"0 0 60px rgba(99,102,241,.15)"}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:38,marginBottom:8}}>✈️</div>
          <h1 style={{fontSize:22,fontWeight:900,color:"#fff",margin:0,letterSpacing:"-0.04em"}}>OneJobs CRM</h1>
          <p style={{color:T.muted,margin:"4px 0 0",fontSize:11}}>Xalqaro mehnat agentligi · v7</p>
        </div>
        <div style={{marginBottom:11}}><label style={{color:T.muted,fontSize:10,fontWeight:600,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Login</label><input value={u} onChange={ev=>su(ev.target.value)} onKeyDown={ev=>ev.key==="Enter"&&go()} style={inpS} placeholder="username"/></div>
        <div style={{marginBottom:14}}><label style={{color:T.muted,fontSize:10,fontWeight:600,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Parol</label><input value={p} onChange={ev=>sp(ev.target.value)} type="password" onKeyDown={ev=>ev.key==="Enter"&&go()} style={inpS} placeholder="••••••••"/></div>
        {e&&<p style={{color:T.red,fontSize:11,marginBottom:10,textAlign:"center"}}>{e}</p>}
        <button onClick={go} disabled={loading} style={{width:"100%",padding:"10px",borderRadius:8,background:T.accent,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",marginBottom:18}}>{loading?"Yuklanmoqda...":"Kirish"}</button>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
          <p style={{color:T.muted,fontSize:9,textAlign:"center",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tez kirish</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            {team.map(x=>(
              <div key={x.id} onClick={()=>{su(x.username);sp(x.password);}} style={{cursor:"pointer",padding:"6px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:T.card2,display:"flex",alignItems:"center",gap:6}}>
                <Av id={x.id} team={team} size={18}/>
                <div><div style={{fontSize:10,fontWeight:600,color:T.text}}>{x.name}</div><div style={{fontSize:8,color:roles[x.role]?.color||T.muted,fontWeight:600}}>{roles[x.role]?.label||x.role}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </ThemeCtx.Provider>;
}

export { Sidebar, Login };