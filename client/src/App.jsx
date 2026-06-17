import { useState, useMemo, useRef, useCallback, createContext, useContext, useEffect } from "react";
import { ThemeCtx, mkT, useT } from "./theme.js";
import {
STAGES, DONE, LOST, gS,
INIT_LEADS, INIT_TASKS, INIT_TXN,
INIT_CFG, INIT_TEAM, INIT_ROLES
} from "./constants.js";
import {
uid, fmtM, fmtMs, fmtD, isOD, isSoon, dateRange, inp, lab,
I, Pill, Av, Modal, SearchSelect
} from "./helpers.jsx";
import { Drawer } from "./Drawer.jsx";
import { Pipeline } from "./Pipeline.jsx";
import { LeadsList } from "./LeadsList.jsx";
import { Tasks } from "./Tasks.jsx";
import { FinanceHub } from "./FinanceHub.jsx";
import { Visa, TeamPage, Settings } from "./Misc.jsx";
import { Sidebar, Login } from "./Sidebar.jsx"
import { DocsPipeline } from "./DocsPipeline.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { DebtsPage } from "./DebtsPage.jsx";
import { Analytics } from "./Analytics.jsx";
import { leadsAPI, tasksAPI, txnAPI, usersAPI, notifAPI, extExpAPI, getToken, clearToken } from "./api.js";
import { Vacancies } from "./Vacancies.jsx";
import { EmployerPortal } from "./EmployerPortal.jsx";

export default function App() {
  const [dark,setDark]=useState(false); 
  const [col,setCol]=useState(false);
  const [team,setTeam]=useState(INIT_TEAM); 
  const [roles,setRoles]=useState(INIT_ROLES);
  const [user,setUser]=useState(null); 
  const [page,setPage]=useState("pipeline");
  const [leads,setLeads]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [txns,setTxns]=useState([]);
  const [extExps,setExtExps]=useState([]);
  const [appLoading,setAppLoading]=useState(false);
  const lastPollRef=useRef(new Date().toISOString());
  const [loading,setLoading]=useState(false);
  const [apiError,setApiError]=useState(null);
  const [config,setConfig]=useState(INIT_CFG);
  const [drawer,setDrawer]=useState(null);
  const [notifs,setNotifs]=useState([]);
  const [debts,setDebts]=useState([]);
  const [stages,setStages]=useState(STAGES);
  const [showNotif,setShowNotif]=useState(false);
  const T=mkT(dark);

const addNotif=useCallback((msg,type="info")=>{
  const local={id:uid(),msg,type,at:new Date().toISOString(),read:false};
  setNotifs(p=>[local,...p].slice(0,100));
  // persist to DB if user is logged in
  notifAPI.create(msg,type).then(saved=>{
    setNotifs(p=>p.map(n=>n.id===local.id?{...n,id:saved.id}:n));
  }).catch(()=>{});
},[]);
const markRead=(id)=>{
  setNotifs(p=>p.map(n=>n.id===id?{...n,read:true}:n));
  notifAPI.markRead(id).catch(()=>{});
};
const dismissNotif=(id)=>{
  setNotifs(p=>p.filter(n=>n.id!==id));
  notifAPI.delete(id).catch(()=>{});
};
const markAllRead=()=>{
  setNotifs(p=>p.map(n=>({...n,read:true})));
  notifAPI.markAllRead().catch(()=>{});
};
const clearReadNotifs=()=>{
  setNotifs(p=>p.filter(n=>!n.read));
  notifAPI.clearRead().catch(()=>{});
}; 
const saveLead = useCallback(async f => {
    try {

      await leadsAPI.save({
        id:f.id,
        name:f.name,
        phone:f.phone,
        telegram:f.telegram,
        status:f.status,
        country:f.country,
        sector:f.sector,
        position:f.position,
        source:f.source,
        gender:f.gender,
        comment:f.comment,
        note:f.note,

        ownerSales:f.ownerSales || null,
        ownerConsult:f.ownerConsult || null,
        ownerDocs:f.ownerDocs || null,

        q1:f.q1,
        q2:f.q2,
        q3:f.q3,
        xba:f.xba,

        kpiSales:f.kpiSales,
        kpiConsult:f.kpiConsult,
        kpiDocs:f.kpiDocs,

        cv:f.cv,
        docs:f.docs,
        history:f.history,

        sofFoyda:f.sofFoyda || null,

        lastContact:f.lastCall || null,
        contractDate:f.shartnomaSana || null,
        interviewDate:f.officeSuhbat || null,
      });

      const isNew = !leads.some(l => l.id === f.id);

      setLeads(p =>
        p.some(l => l.id === f.id)
          ? p.map(l => l.id === f.id ? f : l)
          : [...p, f]
      );

      if(isNew) addNotif(`🆕 Yangi lead: ${f.name}`);

      setDrawer(null);

    } catch(err) {
      console.error(err);
      alert("Lead saqlanmadi!");
    }
}, [leads, addNotif]);
const deleteLead = useCallback(async (id) => {
  if (!confirm("Bu leadni o‘chirishni xohlaysizmi?")) return;

  try {
    await leadsAPI.delete(id);

    setLeads(prev => prev.filter(l => l.id !== id));

    if (drawer?.id === id) {
      setDrawer(null);
    }

    addNotif("🗑 Lead o‘chirildi");
  } catch (err) {
    console.error(err);
    alert("Lead o‘chirilmadi: " + err.message);
  }
}, [drawer, addNotif]);

  const addTask=useCallback(async t=>{
    // Optimistically add to local state
    setTasks(p=>[...p,t]);
    addNotif(`📋 Yangi vazifa: ${t.title} → ${team.find(u=>u.id===t.assignee)?.name||'?'}`);
    try {
      const saved = await tasksAPI.create({
        title:t.title, description:t.desc||'',
        assignee:t.assignee, leadId:t.leadId||null,
        priority:t.priority||'medium', status:t.status||'todo',
        dueDate:t.due||null,
      });
      // Replace temp task with real DB id
      setTasks(p=>p.map(x=>x.id===t.id ? {
        ...x,
        id:String(saved.id),
      } : x));
    } catch(err){ console.warn('Task save failed:', err.message); }
  },[addNotif, team]);
  const openLead=l=>setDrawer(l||{id:`NO-${Math.floor(Math.random()*9000)+1000}`,name:"",phone:"",telegram:"",status:"Yangi",country:"",sector:"",position:"",ownerSales:null,ownerConsult:null,ownerDocs:null,source:user?.role==="partner"?user.name:"",gender:"",comment:"",q1:false,q2:false,q3:false,xba:false,kpiSales:false,kpiConsult:false,kpiDocs:false,q1R:null,q2R:null,q3R:null,xbaR:null,cv:{},history:[],sofFoyda:null,docs:{},createdAt:new Date().toISOString().slice(0,10)});

  const myNotif=user?tasks.filter(t=>t.assignee===user.id&&t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).length:0;
  const totalNotif=myNotif+notifs.filter(n=>!n.read).length;

// ── Restore session on page refresh ────────────────────────────────────────
  useEffect(()=>{
  const tok = getToken();
  if(!tok || user) return;

  // base64url → base64 (replace URL-safe chars before atob)
  const decodeJWT = (token) => {
    try {
      const base64url = token.split('.')[1];
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch { return null; }
  };

  const payload = decodeJWT(tok);
  if (!payload) { clearToken(); return; }

  fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
  headers: {
    Authorization: `Bearer ${tok}`
  }
})
.then(r=>r.json())
.then(users=>{
    const me = users.find(u=>u.id===payload.id);
    if(me) setUser({...me, token:tok, password:me.username});
    else clearToken();
  }).catch((err)=>{
  console.error("Session restore failed:", err.message);
  clearToken();
  });
}, []);

  // ── Load all data when user is set ─────────────────────────────────────────
  useEffect(()=>{
    if(!user) return;

    const mapLead = l => ({
      id:l.id, name:l.name||"", phone:l.phone||"", telegram:l.telegram||"",
      status:l.status||"Yangi", country:l.country||"", sector:l.sector||"",
      position:l.position||"", source:l.source||"", gender:l.gender||"",
      comment:l.comment||"", note:l.note||"",
      ownerSales:l.owner_sales, ownerConsult:l.owner_consult, ownerDocs:l.owner_docs,
      q1:l.q1||false, q2:l.q2||false, q3:l.q3||false, xba:l.xba||false,
      kpiSales:l.kpi_sales||false, kpiConsult:l.kpi_consult||false, kpiDocs:l.kpi_docs||false,
      sofFoyda:l.sof_foyda||null, docs:l.docs||{}, cv:l.cv||{}, history:l.history||[],
      createdAt:l.created_at?.slice(0,10)||"",
      lastCall:l.last_contact?.slice(0,10)||"",
      shartnomaSana:l.contract_date?.slice(0,10)||"",
      officeSuhbat:l.interview_date?.slice(0,10)||"",
      docsStage:l.docs_stage||null, archived:l.archived||false,
      reklamaName:l.reklama_name||"",
    });

    const loadAll = async () => {
      setAppLoading(true);
      try {
        const [leadsRes, tasksRes, txnsRes, usersRes, notifsRes, extExpsRes] = await Promise.all([
          leadsAPI.getAll({ limit: 10000 }),
          tasksAPI.getAll(),
          txnAPI.getAll(),
          usersAPI.getAll(),
          notifAPI.getAll().catch(()=>[]),
          extExpAPI.getAll().catch(()=>[]),
        ]);
        setLeads((leadsRes.leads||leadsRes||[]).map(mapLead));
        setTasks((tasksRes||[]).map(t=>({
          id:String(t.id), title:t.title, desc:t.description||"",
          assignee:t.assignee, leadId:t.lead_id,
          priority:t.priority||"medium", status:t.status||"todo",
          due:t.due_date?.slice(0,10)||"",
        })));
        setTxns((txnsRes||[]).map(t=>({
          id:String(t.id), leadId:t.lead_id, type:t.type,
          cat:t.category||"", desc:t.description||"",
          amount:Number(t.amount)||0, date:t.date?.slice(0,10)||"",
          empId:t.emp_id||null, empName:t.emp_name||"", by:t.created_by,
        })));
        if(extExpsRes?.length) setExtExps(extExpsRes);
        if(notifsRes?.length) setNotifs(notifsRes);
        if(usersRes?.length) setTeam(usersRes.map(u=>({
          id:u.id, username:u.username, name:u.name, role:u.role,
          avatar:u.avatar||"", color:u.color||"#6366f1",
          phone:u.phone||"", active:u.active!==false, password:u.username,
        })));
      } catch(err){
        console.error("Load failed:", err.message);
        // Fallback to hardcoded data if API unreachable
        console.error(err);
        setApiError(err.message);   
        setTasks(INIT_TASKS);   
        setTxns(INIT_TXN);
      } finally { setAppLoading(false); }
    };

    loadAll();

    // Poll every 30s for new leads from Tally/Meta
    const poll = setInterval(async ()=>{
  try {
    const since = lastPollRef.current;
    const r = await leadsAPI.getAll({ since, limit: 50 });
    const fresh = (r.leads||r||[]).map(mapLead);
    const newOnes = fresh.filter(l => new Date(l.createdAt) >= new Date(since));
    if(newOnes.length){
      setLeads(p=>{
        const ids=new Set(p.map(x=>x.id));
        const brandNew=newOnes.filter(l=>!ids.has(l.id));
        return brandNew.length ? [...brandNew,...p] : p;
      });
      addNotif(`📥 ${newOnes.length} ta yangi lead!`);
      lastPollRef.current=new Date().toISOString();
    }
  } catch(e){}
}, 30000);

    return ()=>clearInterval(poll);
  }, [user?.id]);

  if(!user)return <Login onLogin={u=>{setUser(u);setPage("pipeline");}} team={team} roles={roles}/>;
  const perm=roles[user.role]||{};
  // Partner: filter leads to only their own + those with their source/name
  const partnerName = user.role==="partner" ? user.name : null;
  const visibleLeads = user.role==="partner"
    ? leads.filter(l=>
        l.ownerSales===user.id || l.ownerConsult===user.id || l.ownerDocs===user.id ||
        (l.source && (l.source===user.name || l.source.includes(user.name) || l.source===user.username))
      )
    : leads;
  const PROPS={leads:visibleLeads,tasks,team,user,open:openLead,config,roles};

  return <ThemeCtx.Provider value={T}>
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:T.text}}>
      <Sidebar user={user} pg={page} go={setPage} 
      logout={()=>{ clearToken(); setUser(null); setLeads([]); setTasks([]); setTxns([]); }}
      notif={totalNotif} 
      roles={roles} dark={dark} setDark={setDark} col={col} setCol={setCol}/>
      <div style={{flex:1,overflow:"auto",minWidth:0,display:"flex",flexDirection:"column"}}>
        {/* Topbar */}
        <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"7px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:200,flexShrink:0}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{color:T.text,fontSize:12}}>Salom, <b>{user.name}</b></span>
            {perm.canFin&&(()=>{
              const tI=txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
              const tE=txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
              const tExtExp=extExps.reduce((s,e)=>s+Number(e.amount||0),0);
              const totalE=tE+tExtExp;
              const sf=leads.filter(l=>DONE.includes(l.status)&&l.sofFoyda).reduce((s,l)=>s+(l.sofFoyda||0),0);
              return <div style={{display:"flex",gap:8,paddingLeft:10,borderLeft:`1px solid ${T.border}`,fontSize:10}}>
                {[["Kirim",`+${fmtMs(tI)}`,T.green],["Chiqim",`-${fmtMs(totalE)}`,T.red],["Balans",fmtMs(tI-totalE),(tI-totalE)>=0?T.green:T.red],["Sof Foyda",fmtMs(sf),T.yellow]].map(([lb,val,c])=>(
                  <div key={lb}><span style={{color:T.muted}}>{lb}: </span><b style={{color:c}}>{val}</b></div>
                ))}
              </div>;
            })()}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{background:`${roles[user.role]?.color||T.accent}22`,color:roles[user.role]?.color||T.accent,fontSize:8,fontWeight:700,padding:"2px 7px",borderRadius:20,textTransform:"uppercase"}}>{roles[user.role]?.label}</span>
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowNotif(p=>!p)} style={{position:"relative",background:showNotif?`${T.accent}22`:T.card2,border:`1px solid ${showNotif?T.accent+"66":T.border}`,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:showNotif?T.accent:T.muted}}>
                {I.bell}
                {totalNotif>0&&<span style={{position:"absolute",top:-3,right:-3,background:T.red,color:"#fff",borderRadius:10,fontSize:7,fontWeight:700,padding:"0 3px",minWidth:13,textAlign:"center"}}>{totalNotif}</span>}
              </button>
            {showNotif&&(()=>{
              const overdueTaskNotifs=tasks.filter(t=>t.assignee===user.id&&t.status!=="done"&&(isOD(t.due)||isSoon(t.due)));
              const unreadNotifs=notifs.filter(n=>!n.read);
              const hasRead=notifs.some(n=>n.read);
              return <div style={{position:"absolute",top:"110%",right:0,width:330,background:T.card,border:`1px solid ${T.border}`,borderRadius:11,boxShadow:T.shadow,zIndex:500,display:"flex",flexDirection:"column",maxHeight:480}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px 8px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>🔔 Eslatmalar</span>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {unreadNotifs.length>0&&<button onClick={markAllRead} style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontWeight:600}}>Hammasi o'qildi</button>}
                    {hasRead&&<button onClick={clearReadNotifs} style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:`${T.red}15`,color:T.red,border:`1px solid ${T.red}33`,cursor:"pointer",fontWeight:600}}>O'chirilganlarni tozalash</button>}
                    <button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:16,lineHeight:1,padding:0}}>{I.x}</button>
                  </div>
                </div>
                {/* List */}
                <div style={{overflowY:"auto",flex:1,padding:"8px 10px"}}>
                  {notifs.map(n=>(
                    <div key={n.id} style={{background:n.read?T.card2:`${T.accent}12`,border:`1px solid ${n.read?T.border:T.accent+"44"}`,borderRadius:7,padding:"7px 9px",marginBottom:5,borderLeft:`3px solid ${n.read?T.border:T.accent}`,display:"flex",alignItems:"flex-start",gap:6}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,color:n.read?T.muted:T.text,fontWeight:n.read?400:600}}>{n.msg}</div>
                        <div style={{fontSize:9,color:T.muted,marginTop:2}}>{fmtD(n.at)}</div>
                      </div>
                      <div style={{display:"flex",gap:3,flexShrink:0}}>
                        {!n.read&&<button onClick={()=>markRead(n.id)} title="O'qildi" style={{background:"none",border:"none",cursor:"pointer",color:T.green,fontSize:14,lineHeight:1,padding:0}}>✓</button>}
                        <button onClick={()=>dismissNotif(n.id)} title="O'chirish" style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:13,lineHeight:1,padding:0}}>{I.x}</button>
                      </div>
                    </div>
                  ))}
                  {overdueTaskNotifs.map(t=>{const od=isOD(t.due);const lead=leads.find(l=>l.id===t.leadId);return(
                    <div key={t.id} onClick={()=>{setPage("tasks");setShowNotif(false);}} style={{background:od?`${T.red}15`:`${T.yellow}15`,border:`1px solid ${od?T.red:T.yellow}44`,borderRadius:6,padding:"7px 9px",marginBottom:5,cursor:"pointer",borderLeft:`3px solid ${od?T.red:T.yellow}`}}>
                      <div style={{fontSize:11,fontWeight:600,color:T.text}}>{t.title}</div>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}><span style={{fontSize:9,color:od?T.red:T.yellow,fontWeight:700}}>{od?"⚠️ O'tdi":"⏰ "+fmtD(t.due)}</span>{lead&&<span style={{fontSize:9,color:T.accent}}>{lead.name}</span>}</div>
                    </div>
                  );})}
                  {notifs.length===0&&overdueTaskNotifs.length===0&&<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:20}}>Eslatma yo'q ✅</div>}
                </div>
              </div>;
            })()}
            </div>
          </div>
        </div>
        <div style={{flex:1,padding:(page==="finance"||page==="docspipe")?0:"14px 18px",overflow:(page==="finance"||page==="docspipe")?"hidden":"auto",display:"flex",flexDirection:"column",minHeight:0}}>
          {page==="dashboard"  && <Dashboard leads={leads} tasks={tasks} user={user} team={team} txns={txns} roles={roles}/>}
          {page==="analytics"  && (user.role==="admin"||user.role==="manager") && <Analytics leads={leads} tasks={tasks} team={team} txns={txns} roles={roles} user={user}/>}
          {page==="pipeline"   && <Pipeline {...PROPS} tasks={tasks} addLead={()=>openLead(null)} stages={stages} setStages={setStages}/>}
          {page==="leads"      && <LeadsList
            {...PROPS}
            tasks={tasks}
            addLead={() => openLead(null)}
            setLeads={setLeads}
            deleteLead={deleteLead}
            addNotif={addNotif}
          />}
          {page==="tasks"      && <Tasks tasks={tasks} setTasks={setTasks} leads={leads} user={user} team={team} roles={roles} addNotif={addNotif}/>}
          {page==="debts"     && <DebtsPage debts={debts} setDebts={setDebts} user={user} leads={leads}/>}
          {page==="docspipe"  && <DocsPipeline leads={leads} tasks={tasks} team={team} user={user} open={openLead} config={config} roles={roles} setLeads={setLeads}/>}
          {page==="vacancies" && <Vacancies leads={visibleLeads} user={user} team={team} roles={roles}/>}
          {page==="visa"       && <Visa user={user} roles={roles}/>}
          {page==="team"       && <TeamPage user={user} team={team} setTeam={setTeam} roles={roles}/>}
          {page==="settings"   && <Settings user={user} config={config} setConfig={setConfig} roles={roles} setRoles={setRoles}/>}
          {page==="finance"    && <FinanceHub leads={leads} setLeads={setLeads} team={team} user={user} txns={txns} setTxns={setTxns} config={config} addNotif={addNotif} debts={debts} setDebts={setDebts} roles={roles} extExps={extExps} setExtExps={setExtExps}/>}
          {page==="employer"   && user.role==="employer" && <EmployerPortal user={user} leads={leads} team={team}/>}
        </div>
      </div>
      {drawer&&<Drawer lead={drawer} user={user} team={team} leads={leads} tasks={tasks} onSave={saveLead} onClose={()=>setDrawer(null)} onAddTask={addTask} config={config} roles={roles} addNotif={addNotif}/>}
    </div>
  </ThemeCtx.Provider>;
}