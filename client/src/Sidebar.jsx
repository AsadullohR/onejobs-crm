import { useState } from "react";
import { ThemeCtx, useT, mkT } from "./theme.js";
import { inp, I, Av, fmtD } from "./helpers.jsx";
import { authAPI, setToken, getToken } from "./api.js";
import { useLang } from "./i18n.js";

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({user, pg, go, logout, notif, roles, dark, setDark, col, setCol}) {
  const T=useT();
  const { t, lang, setLang } = useLang();
  const NAV=[
    {k:"dashboard", lk:"nav_dashboard", ic:I.dash,  group:"main"},
    {k:"pipeline",  lk:"nav_pipeline",  ic:I.pipe,  group:"main"},
    {k:"leads",     lk:"nav_leads",     ic:I.list,  group:"main"},
    {k:"tasks",     lk:"nav_tasks",     ic:I.task,  group:"main"},
    {k:"vacancies", lk:"nav_vacancies", ic:"💼",     group:"work"},
    {k:"finance",   lk:"nav_finance",   ic:I.money, group:"work"},
    {k:"visa",      lk:"nav_visa",      ic:I.flag,  group:"info"},
    {k:"team",      lk:"nav_team",      ic:I.team,  group:"admin"},
    {k:"turnir",    lk:"nav_turnir",    ic:"🏆",     group:"main"},
    {k:"settings",  lk:"nav_settings",  ic:I.gear,  group:"admin"},
    {k:"employer",  lk:"nav_employer",  ic:"🏢",     group:"main"},
  ];
  const allowed={
    admin:   NAV.map(n=>n.k),
    manager: ["dashboard","pipeline","leads","tasks","finance","team","settings","visa","vacancies","turnir"],
    sales:   ["dashboard","pipeline","leads","tasks","vacancies","visa","turnir"],
    docs:    ["dashboard","pipeline","leads","tasks","vacancies","visa","turnir"],
    partner: ["leads","pipeline","vacancies"],
    employer:["employer"],
    finance_manager:["dashboard","finance","vacancies"],
  };
  const vis = NAV.filter(n=>(allowed[user.role]||[]).includes(n.k));
  const W = col ? 52 : 200;

  const SB = "#0f172a";
  const SBorder = "#1e293b";
  const activeC = "#2563eb";
  const activeBg = "rgba(37,99,235,0.15)";
  const hoverBg = "rgba(255,255,255,0.05)";
  const mutedC = "#64748b";
  const txtC = "#cbd5e1";

  const btn = (active) => ({
    width:"100%", display:"flex", alignItems:"center",
    gap: col?0:9, padding: col?"10px 0":"7px 12px",
    borderRadius:8, marginBottom:2, cursor:"pointer", border:"none",
    textAlign:"left", fontFamily:"inherit",
    background: active ? activeBg : "transparent",
    borderLeft: active ? `3px solid ${activeC}` : "3px solid transparent",
    transition:"all 0.15s ease",
    justifyContent: col?"center":"flex-start",
    position:"relative",
  });

  const GROUPS = [
    {id:"main",  lk:"nav_group_main"},
    {id:"work",  lk:"nav_group_work"},
    {id:"info",  lk:"nav_group_info"},
    {id:"admin", lk:"nav_group_admin"},
  ];

  const LANG_FLAGS = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

  return (
    <div style={{width:W, background:SB, borderRight:`1px solid ${SBorder}`,
      height:"100vh", display:"flex", flexDirection:"column", flexShrink:0,
      transition:"width 0.2s ease", overflow:"hidden", position:"sticky", top:0}}>

      {/* Logo */}
      <div style={{padding: col?"14px 0":"16px 14px 12px", borderBottom:`1px solid ${SBorder}`,
        display:"flex", alignItems:"center", justifyContent:col?"center":"space-between",
        flexShrink:0}}>
        {!col && (
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✈️</div>
            <div>
              <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,letterSpacing:"-0.02em"}}>OneJobs</div>
              <div style={{color:"#3b82f6",fontSize:9,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>CRM · Pro</div>
            </div>
          </div>
        )}
        {col && <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>✈️</div>}
        <button onClick={()=>setCol(c=>!c)} title={col?"Kengaytirish":"Yig'ish"}
          style={{width:22,height:22,borderRadius:6,background:"rgba(255,255,255,0.06)",
            border:`1px solid ${SBorder}`,cursor:"pointer",display:"flex",alignItems:"center",
            justifyContent:"center",color:mutedC,flexShrink:0,padding:0}}>
          <span style={{display:"inline-block",transform:col?"rotate(180deg)":"rotate(0deg)",
            transition:"transform 0.2s",fontSize:9,color:"#94a3b8"}}>{I.chev}</span>
        </button>
      </div>

      {/* Nav */}
      <nav style={{padding: col?"6px 4px":"8px 8px", flex:1, overflowY:"auto", overflowX:"hidden"}}>
        {GROUPS.map(group => {
          const items = vis.filter(n=>n.group===group.id);
          if (!items.length) return null;
          return (
            <div key={group.id} style={{marginBottom:4}}>
              {!col && <div style={{color:"#334155",fontSize:8,fontWeight:700,letterSpacing:"0.1em",
                padding:"8px 12px 4px",textTransform:"uppercase"}}>{t(group.lk)}</div>}
              {items.map(({k,lk,ic})=>(
                <button key={k} onClick={()=>go(k)} title={col?t(lk):""} style={btn(pg===k)}>
                  <span style={{fontSize:15, color:pg===k?"#60a5fa":mutedC, flexShrink:0,
                    transition:"color 0.15s"}}>{ic}</span>
                  {!col && <span style={{color:pg===k?"#e2e8f0":txtC, fontSize:12, fontWeight:pg===k?600:400,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                    transition:"color 0.15s", flex:1}}>{t(lk)}</span>}
                  {k==="tasks" && notif>0 && (
                    <span style={{position:col?"absolute":undefined, top:col?2:undefined,
                      right:col?2:undefined, marginLeft:col?0:"auto",
                      background:"#dc2626", color:"#fff", borderRadius:10,
                      fontSize:8,fontWeight:700,padding:"1px 5px",minWidth:16,
                      textAlign:"center",flexShrink:0,lineHeight:"14px"}}>{notif}</span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{borderTop:`1px solid ${SBorder}`,padding:col?"8px 4px":"10px 8px",
        flexShrink:0, background:"#0a0f1e"}}>
        {!col ? (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
            padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,0.04)",
            border:`1px solid ${SBorder}`}}>
            <Av id={user.id} team={[user]} size={28}/>
            <div style={{minWidth:0,flex:1}}>
              <div style={{color:"#e2e8f0",fontSize:11,fontWeight:600,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
              <div style={{color:roles[user.role]?.color||"#3b82f6",fontSize:9,fontWeight:600,
                textTransform:"uppercase",letterSpacing:"0.04em"}}>{roles[user.role]?.label}</div>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
            <Av id={user.id} team={[user]} size={28}/>
          </div>
        )}

        {/* Language switcher */}
        {!col && (
          <div style={{display:"flex",gap:3,marginBottom:6}}>
            {["uz","ru","en"].map(l=>(
              <button key={l} onClick={()=>setLang(l)}
                style={{flex:1,height:24,borderRadius:6,fontSize:9,fontWeight:700,cursor:"pointer",
                  fontFamily:"inherit",border:`1px solid ${lang===l?"#2563eb":"#1e293b"}`,
                  background:lang===l?"rgba(37,99,235,0.2)":"rgba(255,255,255,0.03)",
                  color:lang===l?"#60a5fa":"#64748b",letterSpacing:"0.03em"}}>
                {LANG_FLAGS[l]} {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        {col && (
          <div style={{marginBottom:6}}>
            <select value={lang} onChange={e=>setLang(e.target.value)}
              style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${SBorder}`,
                borderRadius:6,color:"#94a3b8",fontSize:9,padding:"2px 0",textAlign:"center",cursor:"pointer"}}>
              {["uz","ru","en"].map(l=><option key={l} value={l}>{LANG_FLAGS[l]}</option>)}
            </select>
          </div>
        )}

        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setDark(d=>!d)} title={dark?"Light mode":"Dark mode"}
            style={{width:32,height:30,borderRadius:7,background:"rgba(255,255,255,0.06)",
              border:`1px solid ${SBorder}`,cursor:"pointer",display:"flex",
              alignItems:"center",justifyContent:"center",color:"#64748b",fontSize:13,
              padding:0,flexShrink:0}}>
            {dark?I.sun:I.moon}
          </button>
          {!col && (
            <button onClick={logout}
              style={{flex:1,height:30,borderRadius:7,background:"rgba(220,38,38,0.1)",
                color:"#f87171",border:"1px solid rgba(220,38,38,0.2)",cursor:"pointer",
                fontSize:11,fontWeight:600,display:"flex",alignItems:"center",
                justifyContent:"center",gap:5, fontFamily:"inherit"}}>
              {I.logout} {lang==="ru"?"Выйти":lang==="en"?"Logout":"Chiqish"}
            </button>
          )}
          {col && (
            <button onClick={logout} title="Logout"
              style={{flex:1,height:30,borderRadius:7,background:"rgba(220,38,38,0.1)",
                color:"#f87171",border:"1px solid rgba(220,38,38,0.2)",
                cursor:"pointer",display:"flex",alignItems:"center",
                justifyContent:"center",padding:0}}>
              {I.logout}
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',system-ui,sans-serif",
      backgroundImage:"radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.12) 0%, transparent 70%)"}}>
      <div style={{background:"#111827",border:"1px solid #1e2d45",borderRadius:20,width:420,padding:44,boxShadow:"0 25px 60px rgba(0,0,0,.5),0 0 0 1px rgba(37,99,235,.08)"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:54,height:54,borderRadius:14,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 16px",
            boxShadow:"0 8px 24px rgba(37,99,235,.35)"}}>✈️</div>
          <h1 style={{fontSize:24,fontWeight:800,color:"#f1f5f9",margin:0,letterSpacing:"-0.03em"}}>OneJobs CRM</h1>
          <p style={{color:"#475569",margin:"6px 0 0",fontSize:12,fontWeight:500}}>Xalqaro mehnat agentligi</p>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{color:"#64748b",fontSize:10,fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Login</label>
          <input value={u} onChange={ev=>su(ev.target.value)} onKeyDown={ev=>ev.key==="Enter"&&go()} style={{...inpS,fontFamily:"'Inter',system-ui,sans-serif",height:42,fontSize:13}} placeholder="username"/>
        </div>
        <div style={{marginBottom:22}}>
          <label style={{color:"#64748b",fontSize:10,fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Parol</label>
          <input value={p} onChange={ev=>sp(ev.target.value)} type="password" onKeyDown={ev=>ev.key==="Enter"&&go()} style={{...inpS,fontFamily:"'Inter',system-ui,sans-serif",height:42,fontSize:13}} placeholder="••••••••"/>
        </div>
        {e&&<p style={{color:"#f87171",fontSize:12,marginBottom:14,textAlign:"center",background:"rgba(220,38,38,0.08)",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(220,38,38,0.2)"}}>{e}</p>}
        <button onClick={go} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:10,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer",fontFamily:"'Inter',system-ui,sans-serif",boxShadow:"0 4px 14px rgba(37,99,235,.4)",letterSpacing:"-0.01em",marginBottom:18}}>{loading?"Yuklanmoqda...":"Kirish →"}</button>
      </div>
    </div>
  </ThemeCtx.Provider>;
}

export { Sidebar, Login };
