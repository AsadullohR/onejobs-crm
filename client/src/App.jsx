import { useState, useMemo, useRef, useCallback, createContext, useContext } from "react";
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
import { Finance } from "./Finance.jsx";
import { Visa, TeamPage, Settings } from "./Misc.jsx";
import { Sidebar, Login } from "./Sidebar.jsx"
import { DocsPipeline } from "./DocsPipeline.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { SalaryPage } from "./SalaryPage.jsx";
import { DebtsPage } from "./DebtsPage.jsx";
import { Analytics } from "./Analytics.jsx";


export default function App() {
  const [dark,setDark]=useState(false); const [col,setCol]=useState(false);
  const [team,setTeam]=useState(INIT_TEAM); const [roles,setRoles]=useState(INIT_ROLES);
  const [user,setUser]=useState(null); const [page,setPage]=useState("pipeline");
  const [leads,setLeads]=useState(INIT_LEADS); const [tasks,setTasks]=useState(INIT_TASKS);
  const [txns,setTxns]=useState(INIT_TXN); const [config,setConfig]=useState(INIT_CFG);
  const [drawer,setDrawer]=useState(null);
  const [notifs,setNotifs]=useState([]);
  const [debts,setDebts]=useState([]);
  const [stages,setStages]=useState(STAGES);
  const [showNotif,setShowNotif]=useState(false);
  const T=mkT(dark);

  const addNotif=useCallback((msg,type="info")=>setNotifs(p=>[{id:uid(),msg,type,at:new Date().toISOString()},...p].slice(0,50)),[]);
  const saveLead=useCallback(f=>{
    const isNew=!leads.some(l=>l.id===f.id);
    setLeads(p=>p.some(l=>l.id===f.id)?p.map(l=>l.id===f.id?f:l):[...p,f]);
    if(isNew){addNotif(`🆕 Yangi lead qo'shildi: ${f.name}`);}
    else {
      const old=leads.find(l=>l.id===f.id);
      if(old&&old.status!==f.status)addNotif(`📌 ${f.name}: ${old.status} → ${f.status}`);
    }
    setDrawer(null);
  },[leads,addNotif]);
  const addTask=useCallback(t=>{setTasks(p=>[...p,t]);addNotif(`📋 Yangi vazifa: ${t.title}`);},[addNotif]);
  const openLead=l=>setDrawer(l||{id:`NO-${Math.floor(Math.random()*9000)+1000}`,name:"",phone:"",telegram:"",status:"Yangi",country:"",sector:"",position:"",ownerSales:null,ownerConsult:null,ownerDocs:null,source:user?.role==="partner"?user.name:"",gender:"",comment:"",q1:false,q2:false,q3:false,xba:false,kpiSales:false,kpiConsult:false,kpiDocs:false,q1R:null,q2R:null,q3R:null,xbaR:null,cv:{},history:[],sofFoyda:null,docs:{},createdAt:new Date().toISOString().slice(0,10)});

  const myNotif=user?tasks.filter(t=>t.assignee===user.id&&t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).length:0;
  const newLeadNotifs=notifs.filter(n=>n.at>=(new Date(Date.now()-300000)).toISOString());
  const totalNotif=myNotif+newLeadNotifs.length;

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
      <Sidebar user={user} pg={page} go={setPage} logout={()=>setUser(null)} notif={totalNotif} roles={roles} dark={dark} setDark={setDark} col={col} setCol={setCol}/>
      <div style={{flex:1,overflow:"auto",minWidth:0,display:"flex",flexDirection:"column"}}>
        {/* Topbar */}
        <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"7px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:200,flexShrink:0}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{color:T.text,fontSize:12}}>Salom, <b>{user.name}</b></span>
            {perm.canFin&&(()=>{
              const tI=txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
              const tE=txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
              const sf=leads.filter(l=>DONE.includes(l.status)&&l.sofFoyda).reduce((s,l)=>s+(l.sofFoyda||0),0);
              return <div style={{display:"flex",gap:8,paddingLeft:10,borderLeft:`1px solid ${T.border}`,fontSize:10}}>
                {[["Kirim",`+${fmtMs(tI)}`,T.green],["Chiqim",`-${fmtMs(tE)}`,T.red],["Balans",fmtMs(tI-tE),(tI-tE)>=0?T.green:T.red],["Sof Foyda",fmtMs(sf),T.yellow]].map(([lb,val,c])=>(
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
              {showNotif&&<div style={{position:"absolute",top:"110%",right:0,width:290,background:T.card,border:`1px solid ${T.border}`,borderRadius:11,boxShadow:T.shadow,zIndex:500,padding:12,maxHeight:380,overflowY:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>🔔 Eslatmalar</span>
                  <button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button>
                </div>
                {newLeadNotifs.map(n=>(
                  <div key={n.id} style={{background:`${T.accent}15`,border:`1px solid ${T.accent}44`,borderRadius:6,padding:"7px 9px",marginBottom:5,borderLeft:`3px solid ${T.accent}`}}>
                    <div style={{fontSize:11,color:T.text}}>{n.msg}</div>
                    <div style={{fontSize:9,color:T.muted,marginTop:2}}>{fmtD(n.at)}</div>
                  </div>
                ))}
                {tasks.filter(t=>t.assignee===user.id&&t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).map(t=>{const od=isOD(t.due);const lead=leads.find(l=>l.id===t.leadId);return(
                  <div key={t.id} onClick={()=>{setPage("tasks");setShowNotif(false);}} style={{background:od?`${T.red}15`:`${T.yellow}15`,border:`1px solid ${od?T.red:T.yellow}44`,borderRadius:6,padding:"7px 9px",marginBottom:5,cursor:"pointer",borderLeft:`3px solid ${od?T.red:T.yellow}`}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.text}}>{t.title}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}><span style={{fontSize:9,color:od?T.red:T.yellow,fontWeight:700}}>{od?"⚠️ O'tdi":"⏰ "+fmtD(t.due)}</span>{lead&&<span style={{fontSize:9,color:T.accent}}>{lead.name}</span>}</div>
                  </div>
                );})}
                {totalNotif===0&&<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:12}}>Eslatma yo'q ✅</div>}
              </div>}
            </div>
          </div>
        </div>
        <div style={{flex:1,padding:(page==="finance"||page==="docspipe")?0:"14px 18px",overflow:(page==="finance"||page==="docspipe")?"hidden":"auto"}}>
          {page==="dashboard"  && <Dashboard leads={leads} tasks={tasks} user={user} team={team} txns={txns} roles={roles}/>}
          {page==="analytics"  && (user.role==="admin"||user.role==="manager") && <Analytics leads={leads} tasks={tasks} team={team} txns={txns} roles={roles} user={user}/>}
          {page==="pipeline"   && <Pipeline {...PROPS} tasks={tasks} addLead={()=>openLead(null)} stages={stages} setStages={setStages}/>}
          {page==="leads"      && <LeadsList {...PROPS} tasks={tasks} addLead={()=>openLead(null)} setLeads={setLeads} addNotif={addNotif}/>}
          {page==="tasks"      && <Tasks tasks={tasks} setTasks={setTasks} leads={leads} user={user} team={team} roles={roles}/>}
          {page==="finance"    && perm.canFin && <Finance leads={leads} setLeads={setLeads} team={team} user={user} txns={txns} setTxns={setTxns} config={config} addNotif={addNotif} debts={debts} setDebts={setDebts}/>}
          {page==="salary"     && user.role==="admin" && <SalaryPage team={team} txns={txns} setTxns={setTxns} user={user}/>}
          {page==="debts"      && perm.canFin && <DebtsPage debts={debts} setDebts={setDebts} user={user}/>}
          {page==="docspipe"  && <DocsPipeline leads={leads} tasks={tasks} team={team} user={user} open={openLead} config={config} roles={roles} setLeads={setLeads}/>}

          {page==="visa"       && <Visa user={user} roles={roles}/>}
          {page==="team"       && <TeamPage user={user} team={team} setTeam={setTeam} roles={roles}/>}
          {page==="settings"   && <Settings user={user} config={config} setConfig={setConfig} roles={roles} setRoles={setRoles}/>}
        </div>
      </div>
      {drawer&&<Drawer lead={drawer} user={user} team={team} leads={leads} tasks={tasks} onSave={saveLead} onClose={()=>setDrawer(null)} onAddTask={addTask} config={config} roles={roles} addNotif={addNotif}/>}
    </div>
  </ThemeCtx.Provider>;
}