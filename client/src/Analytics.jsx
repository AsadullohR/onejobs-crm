import { useState } from "react";
import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { fmtMs, isOD, inp, I, Av,fmtD } from "./helpers.jsx";

// ─── ANALYTICS PAGE (Employee Productivity + Time Analysis) ─────────────────
function Analytics({leads, tasks, team, txns, roles, user}) {
  const T=useT();
  const inpS=inp(T);
  const [tab,setTab]=useState("productivity");  // productivity | time | salary
  const [fEmp,setFEmp]=useState("all");
  const [fPeriod,setFPeriod]=useState("month"); // week | month | quarter | all
  const [fStage,setFStage]=useState("all");

  // ── Date helpers ──────────────────────────────────────────────────────────
  const now = new Date();
  const periodStart = {
    week:   new Date(now - 7*86400000),
    month:  new Date(now.getFullYear(), now.getMonth(), 1),
    quarter:new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1),
    all:    new Date("2020-01-01"),
  }[fPeriod];
  const inPeriod = d => d && new Date(d) >= periodStart;

  const daysBetween = (a,b) => {
    if(!a||!b) return null;
    const d = (new Date(b)-new Date(a))/86400000;
    return d>0 && d<1000 ? Math.round(d) : null;
  };
  const avg = arr => { const v=arr.filter(x=>x!=null); return v.length ? Math.round(v.reduce((s,x)=>s+x,0)/v.length) : null; };

  // ── STAGE GROUPS — pipeline stages mapped to workflow phases ─────────────
  // Each phase has: the statuses that belong to it, expected days, label
  const PHASE_MAP = [
    {key:"boglanish",  label:"Bog'landi",         icon:"📞", exp:1,
     statuses:["Yangi","Qilindi","Bog'landi","Boglanildi"]},
    {key:"suhbat",     label:"Suhbat",             icon:"💬", exp:5,
     statuses:["Onlayn Suhbat Uchun","Onlayn Suhbat","Suhbat"]},
    {key:"tolov",      label:"To'lov",             icon:"💳", exp:3,
     statuses:["Shartnoma qildi","XBA To'lov qildi"]},
    {key:"ishqabul",   label:"Ishga qabul",        icon:"✅", exp:14,
     statuses:["CV Topshirildi","Interview ga qo'yildi","Ishga qabul qilindi","1 - Qism To'landi"]},
    {key:"hujjatlar",  label:"Hujjatlar tayyorlanishi", icon:"📁", exp:14,
     statuses:["Hujjatlar Tayyorlanmoqda","Hujjatlar Jonatilishga Tayyor","Hujjatlar Jonatildi",
               "Ish shartnomasi keldi","Ish shartnomasi imzolandi"]},
    {key:"taklifnoma", label:"Taklifnoma kelishi", icon:"📨", exp:90,
     statuses:["Taklifnoma keldi","Elchixonaga Hujjatlar Tayyor"]},
    {key:"viza_tayyorlik",label:"Vizaga tayyorlik", icon:"🗂️", exp:3,
     statuses:["Vizaga Topshirildi"]},
    {key:"viza_chiqish",  label:"Viza chiqishi",   icon:"🛂", exp:30,
     statuses:["Viza Oldi"]},
    {key:"jonab",      label:"Jo'nab ketish",      icon:"✈️", exp:7,
     statuses:["Jo'nab ketdi"]},
  ];

  // Build a lookup: status → phase index (ordering)
  const STATUS_PHASE_IDX = {};
  PHASE_MAP.forEach((ph,i) => ph.statuses.forEach(s => { STATUS_PHASE_IDX[s] = i; }));

  // ── stageTimings: for each transition A→B, find leads that have PASSED through A
  // and are now in B or later. Days = createdAt to "now" minus weighted offset.
  // Since we don't have per-status timestamps, we use a smart approach:
  //   • leads currently IN phase X have been there since some time
  //   • leads that PASSED phase X: we know the pipeline order
  //   • Use createdAt + known ratio of total journey as proxy
  //
  // Better approach: count leads currently in each phase vs total, 
  // compute average "time stuck" using today - createdAt × fraction
  //
  // Most practical for real data: show counts per phase + how many are stuck (overdue)
  // For date-field-based calc: use the manual dates if set, otherwise show "–"

  const daysSince = d => d ? Math.round((new Date()-new Date(d))/86400000) : null;

  // For each phase: count leads in it, how long they've been there (days since createdAt)
  const phaseStats = PHASE_MAP.map((ph,idx) => {
    const inPhase = leads.filter(l => ph.statuses.includes(l.status) && inPeriod(l.createdAt));
    const daysInPhase = inPhase.map(l => daysSince(l.createdAt)).filter(Boolean);
    const avgDays = avg(daysInPhase);
    const overExpected = inPhase.filter(l => daysSince(l.createdAt) > ph.exp * 3).length;
    return {...ph, count: inPhase.length, avgDays, overExpected,
            completed: leads.filter(l => STATUS_PHASE_IDX[l.status] > idx && inPeriod(l.createdAt)).length };
  });

  // Date-field based timings (only for leads that actually have these fields filled)
  const EXPECTED = {
    "Lead → Bog'landi":       1,
    "Bog'landi → Suhbat":     5,
    "Suhbat → To'lov":        3,
    "To'lov → Ishga qabul":   14,
    "Ishga qabul → Hujjatlar": 14,
    "Hujjatlar → Taklifnoma": 90,
    "Taklifnoma → Viza tayyorlik": 3,
    "Vizaga topshirish → Viza chiqishi": 30,
    "Viza chiqishi → Jo'nab": 7,
  };

  // Manual date field based timings (for leads where dates are filled)
  const datedLeads = leads.filter(l => l.lastCall || l.onlaynSuhbat || l.officeSuhbat || l.shartnomaSana);
  const stageTimings = [
    {label:"📞 Lead → Bog'landi",          key:"Lead → Bog'landi",           exp:1,
     vals: datedLeads.map(l=>daysBetween(l.createdAt, l.lastCall))},
    {label:"💬 Bog'landi → Suhbat",         key:"Bog'landi → Suhbat",          exp:5,
     vals: datedLeads.map(l=>daysBetween(l.lastCall, l.onlaynSuhbat||l.officeSuhbat))},
    {label:"🏢 Suhbat → To'lov",            key:"Suhbat → To'lov",             exp:3,
     vals: datedLeads.map(l=>daysBetween(l.onlaynSuhbat||l.officeSuhbat, l.shartnomaSana))},
    {label:"📄 To'lov → Ishga qabul",       key:"To'lov → Ishga qabul",        exp:14,
     vals: leads.filter(l=>l.shartnomaSana&&["CV Topshirildi","Interview ga qo'yildi","Ishga qabul qilindi","1 - Qism To'landi","Hujjatlar Tayyorlanmoqda","Jo'nab ketdi"].includes(l.status)).map(l=>daysBetween(l.shartnomaSana,new Date().toISOString().slice(0,10)))},
    {label:"📁 Ishga qabul → Hujjatlar",    key:"Ishga qabul → Hujjatlar",     exp:14,
     vals: leads.filter(l=>["Hujjatlar Tayyorlanmoqda","Hujjatlar Jonatilishga Tayyor","Hujjatlar Jonatildi","Taklifnoma keldi","Vizaga Topshirildi","Viza Oldi","Jo'nab ketdi"].includes(l.status)&&inPeriod(l.createdAt)).map(l=>daysBetween(l.createdAt,new Date().toISOString().slice(0,10)))},
    {label:"📨 Hujjatlar → Taklifnoma",     key:"Hujjatlar → Taklifnoma",       exp:90,
     vals: leads.filter(l=>["Taklifnoma keldi","Elchixonaga Hujjatlar Tayyor","Vizaga Topshirildi","Viza Oldi","Jo'nab ketdi"].includes(l.status)&&inPeriod(l.createdAt)).map(l=>daysBetween(l.createdAt,new Date().toISOString().slice(0,10)))},
    {label:"🗂️ Taklifnoma → Vizaga topshirish", key:"Taklifnoma → Viza tayyorlik", exp:3,
     vals: leads.filter(l=>["Vizaga Topshirildi","Viza Oldi","Jo'nab ketdi"].includes(l.status)&&inPeriod(l.createdAt)).map(l=>daysSince(l.createdAt))},
    {label:"🛂 Vizaga topshirish → Viza chiqishi", key:"Vizaga topshirish → Viza chiqishi", exp:30,
     vals: leads.filter(l=>["Viza Oldi","Jo'nab ketdi"].includes(l.status)&&inPeriod(l.createdAt)).map(l=>daysSince(l.createdAt))},
    {label:"✈️ Viza → Jo'nab ketish",       key:"Viza chiqishi → Jo'nab",       exp:7,
     vals: leads.filter(l=>DONE.includes(l.status)&&inPeriod(l.createdAt)).map(l=>daysSince(l.createdAt))},
  ].map(s => {
    const a = avg(s.vals.filter(v=>v!=null&&v>=0&&v<1000));
    const cnt = s.vals.filter(v=>v!=null&&v>=0&&v<1000).length;
    const ok = a!=null ? a<=s.exp : null;
    const pct = a ? Math.min(200, Math.round((a/s.exp)*100)) : 0;
    return {...s, avg:a, cnt, ok, pct};
  });

  // ── EMPLOYEE PRODUCTIVITY SCORE ────────────────────────────────────────────
  // Formula: Score = (Tasks Done / Total Assigned) * 50 
  //                + (Overdue Done / Total Done) adjusted penalty * 20
  //                + (Contracts / Leads) conversion * 30
  // Normalized 0-100
  const empStats = team.filter(t=>t.role!=="partner" && t.active!==false).map(t => {
    const myTasks   = tasks.filter(x => x.assignee===t.id && inPeriod(x.createdAt||x.due));
    const doneTasks = myTasks.filter(x => x.status==="done");
    const lateDone  = doneTasks.filter(x => x.due && new Date(x.completedAt||x.due) > new Date(x.due));
    const overduePending = myTasks.filter(x => x.status!=="done" && isOD(x.due));

    // Speed score: avg days to complete tasks (lower=better, cap at 14 days)
    const completionDays = doneTasks.map(x => {
      if(!x.due||!x.completedAt) return null;
      return daysBetween(x.createdAt||x.due, x.completedAt);
    }).filter(x=>x!=null);
    const avgDays = avg(completionDays) || 0;
    const speedScore = Math.max(0, Math.min(100, 100 - (avgDays/14)*100));

    // Accuracy score: (done - late) / done
    const total = myTasks.length;
    const done  = doneTasks.length;
    const completionRate = total > 0 ? done/total : 0;
    const lateRate = done > 0 ? lateDone.length/done : 0;
    const accuracyScore = completionRate * (1 - lateRate*0.5) * 100;

    // Conversion: leads to contracts
    const myLeads = leads.filter(l =>
      (l.ownerSales===t.id||l.ownerConsult===t.id||l.ownerDocs===t.id) && inPeriod(l.createdAt)
    );
    const myContracts = myLeads.filter(l =>
      ["Shartnoma qildi","XBA To'lov qildi","CV Topshirildi","Ishga qabul qilindi",...DONE].some(s=>l.status.includes(s)||DONE.includes(l.status))
    );
    const myGone = myLeads.filter(l => DONE.includes(l.status));
    const convRate = myLeads.length > 0 ? myContracts.length/myLeads.length : 0;

    // Revenue generated
    const myRev = txns.filter(x=>x.type==="income"&&myLeads.some(l=>l.id===x.leadId)).reduce((s,x)=>s+x.amount,0);

    // Salary paid
    const mySal = txns.filter(x=>x.type==="expense"&&["Maosh","Avans","Bonus","KPI"].includes(x.cat)&&(x.empId===t.id||x.empName===t.name)).reduce((s,x)=>s+x.amount,0);

    // Productivity Score (0-100):
    // 40% speed, 35% accuracy/completion, 25% conversion
    const productivityScore = Math.round(speedScore*0.40 + accuracyScore*0.35 + convRate*100*0.25);

    return {
      t, total, done, lateDone:lateDone.length, overduePending:overduePending.length,
      avgDays, speedScore:Math.round(speedScore), accuracyScore:Math.round(accuracyScore),
      completionRate:Math.round(completionRate*100), convRate:Math.round(convRate*100),
      myLeads:myLeads.length, myContracts:myContracts.length, myGone:myGone.length,
      myRev, mySal, productivityScore: Math.min(100, Math.max(0, productivityScore)),
    };
  }).sort((a,b)=>b.productivityScore-a.productivityScore);

  const filteredEmp = fEmp==="all" ? empStats : empStats.filter(e=>String(e.t.id)===fEmp);
  const leadsInPeriod = leads.filter(l => inPeriod(l.createdAt));

  // Per-employee time for each stage
  const empTimeRows = team.filter(t=>t.role!=="partner"&&t.active!==false).map(t=>{
    const tLeads = leads.filter(l=>(l.ownerSales===t.id||l.ownerConsult===t.id||l.ownerDocs===t.id)&&inPeriod(l.createdAt));
    const toContract = avg(tLeads.map(l=>daysBetween(l.createdAt,l.shartnomaSana)));
    const gone = tLeads.filter(l=>DONE.includes(l.status)).length;
    const total = tLeads.length;
    return {t, total, gone, toContract};
  }).filter(e=>e.total>0);

  // Overall funnel
  const funnelSteps = [
    ["Yangi Leadlar", leadsInPeriod.length, "#6366f1"],
    ["Aloqa qilindi", leadsInPeriod.filter(l=>l.lastCall).length, "#f59e0b"],
    ["Onlayn Suhbat", leadsInPeriod.filter(l=>l.onlaynSuhbat).length, "#06b6d4"],
    ["Ofis Suhbat",   leadsInPeriod.filter(l=>l.officeSuhbat).length, "#8b5cf6"],
    ["Shartnoma",     leadsInPeriod.filter(l=>l.shartnomaSana).length, "#22c55e"],
    ["Jo'nab ketdi",  leadsInPeriod.filter(l=>DONE.includes(l.status)).length, "#166534"],
  ];
  const maxFunnel = funnelSteps[0][1]||1;

  // ── SALARY ANALYTICS ──────────────────────────────────────────────────────
  const salTxns = txns.filter(t=>t.type==="expense"&&["Maosh","Avans","Bonus","KPI"].includes(t.cat)&&inPeriod(t.date));
  const totalSal = salTxns.reduce((s,x)=>s+x.amount,0);
  const totalRev = txns.filter(t=>t.type==="income"&&inPeriod(t.date)).reduce((s,x)=>s+x.amount,0);
  const salByEmp = team.filter(t=>t.role!=="partner").map(t=>{
    const et = salTxns.filter(x=>x.empId===t.id||x.empName===t.name);
    return {t, total:et.reduce((s,x)=>s+x.amount,0), list:et, breakdown:{
      maosh: et.filter(x=>x.cat==="Maosh").reduce((s,x)=>s+x.amount,0),
      avans: et.filter(x=>x.cat==="Avans").reduce((s,x)=>s+x.amount,0),
      bonus: et.filter(x=>x.cat==="Bonus").reduce((s,x)=>s+x.amount,0),
      kpi:   et.filter(x=>x.cat==="KPI").reduce((s,x)=>s+x.amount,0),
    }};
  }).sort((a,b)=>b.total-a.total);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = [];
  stageTimings.filter(s=>s.avg!=null&&s.avg>s.exp).slice(0,3).forEach(s=>{ alerts.push({type:"time",msg:`${s.label}: ${s.avg} kun (mez: ${s.exp} kun)`,sev:s.avg>s.exp*1.5?"red":"yellow"}); });
  empStats.forEach(e=>{ if(e.overduePending>2) alerts.push({type:"emp",msg:`${e.t.name}: ${e.overduePending} ta muddati o'tgan vazifa`,sev:"yellow"}); });
  empStats.forEach(e=>{ if(e.productivityScore<40&&e.total>3) alerts.push({type:"emp",msg:`${e.t.name}: Samaradorlik past (${e.productivityScore}/100)`,sev:"red"}); });

  const SCORE_COLOR = s => s>=75?"#22c55e":s>=50?"#f59e0b":"#ef4444";
  const Bar = ({w,c,h=8})=><div style={{background:T.border,borderRadius:4,height:h,overflow:"hidden"}}><div style={{width:`${Math.max(1,w)}%`,height:"100%",background:c,borderRadius:4,transition:"width 0.4s"}}/></div>;

  return <div>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>📊 Tahlil Markazi</h1>
        <p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>Xodimlar samaradorligi · Vaqt tahlili · Maosh</p>
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
        <select value={fPeriod} onChange={e=>setFPeriod(e.target.value)} style={{...inpS,width:"auto"}}>
          <option value="week">Bu hafta</option>
          <option value="month">Bu oy</option>
          <option value="quarter">Bu chorak</option>
          <option value="all">Barcha vaqt</option>
        </select>
        <select value={fEmp} onChange={e=>setFEmp(e.target.value)} style={{...inpS,width:"auto"}}>
          <option value="all">Barcha xodimlar</option>
          {team.filter(t=>t.role!=="partner"&&t.active!==false).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
    </div>

    {/* Alerts */}
    {alerts.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {alerts.slice(0,4).map((a,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 11px",background:`${a.sev==="red"?T.red:T.yellow}12`,border:`1px solid ${a.sev==="red"?T.red:T.yellow}33`,borderRadius:7}}>
          <span style={{fontSize:14}}>{a.sev==="red"?"🔴":"🟡"}</span>
          <span style={{fontSize:10,color:T.text,fontWeight:600}}>{a.msg}</span>
        </div>
      ))}
    </div>}

    {/* Tabs */}
    <div style={{display:"flex",gap:0,marginBottom:16,background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:3,width:"fit-content"}}>
      {[["productivity","👔 Xodimlar Samaradorligi"],["time","⏱️ Vaqt Tahlili"],["salary","💰 Maosh Tahlili"]].map(([k,l])=>(
        <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 16px",borderRadius:6,border:"none",background:tab===k?T.accent:"transparent",color:tab===k?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:tab===k?700:400}}>{l}</button>
      ))}
    </div>

    {/* ══════ TAB 1: PRODUCTIVITY ══════════════════════════════════════════════ */}
    {tab==="productivity"&&<div>
      {/* Score cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:16}}>
        {filteredEmp.map(e=>(
          <div key={e.t.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"13px 14px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:SCORE_COLOR(e.productivityScore)}}/>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
              <Av id={e.t.id} team={[e.t]} size={34}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.t.name}</div>
                <div style={{fontSize:8,color:T.muted}}>{e.t.role}</div>
              </div>
              <div style={{fontSize:22,fontWeight:900,color:SCORE_COLOR(e.productivityScore),lineHeight:1}}>{e.productivityScore}</div>
            </div>

            {/* Score bar */}
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T.muted,marginBottom:3}}>
                <span>Samaradorlik</span><span style={{fontWeight:700,color:SCORE_COLOR(e.productivityScore)}}>{e.productivityScore}/100</span>
              </div>
              <Bar w={e.productivityScore} c={SCORE_COLOR(e.productivityScore)} h={6}/>
            </div>

            {/* Sub-scores */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
              {[["⚡ Tezlik",e.speedScore,T.accent],["✅ Sifat",e.accuracyScore,T.green],["🎯 Konversiya",e.convRate,T.yellow],["📋 Bajarildi",e.completionRate,T.cyan||"#06b6d4"]].map(([lb,val,c])=>(
                <div key={lb} style={{background:T.card2,borderRadius:6,padding:"5px 7px"}}>
                  <div style={{fontSize:7,color:T.muted,marginBottom:2}}>{lb}</div>
                  <div style={{fontSize:12,fontWeight:800,color:c}}>{val}%</div>
                  <Bar w={val} c={c} h={3}/>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,fontSize:8}}>
              <div style={{textAlign:"center",background:T.card2,borderRadius:4,padding:"3px 0"}}>
                <div style={{fontWeight:700,color:T.text}}>{e.done}/{e.total}</div>
                <div style={{color:T.muted}}>Vazifa</div>
              </div>
              <div style={{textAlign:"center",background:T.card2,borderRadius:4,padding:"3px 0"}}>
                <div style={{fontWeight:700,color:T.text}}>{e.myContracts}/{e.myLeads}</div>
                <div style={{color:T.muted}}>Lead→Shartnoma</div>
              </div>
              <div style={{textAlign:"center",background:`${T.red}15`,borderRadius:4,padding:"3px 0"}}>
                <div style={{fontWeight:700,color:e.overduePending>0?T.red:T.green}}>{e.overduePending}</div>
                <div style={{color:T.muted}}>Muddati o'tgan</div>
              </div>
            </div>

            {e.myRev>0&&<div style={{marginTop:6,padding:"4px 7px",background:`${T.green}12`,borderRadius:5,display:"flex",justifyContent:"space-between",fontSize:8}}>
              <span style={{color:T.muted}}>Daromad</span>
              <span style={{fontWeight:700,color:T.green}}>{fmtMs(e.myRev)} so'm</span>
            </div>}
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,overflow:"auto",marginBottom:14}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text}}>📋 Batafsil taqqoslash jadvali</div>
          <div style={{fontSize:9,color:T.muted}}>Formula: Samaradorlik = Tezlik(40%) + Sifat(35%) + Konversiya(25%)</div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
          <thead><tr style={{background:T.card2}}>
            {["Xodim","Roli","Vazifa (Bajarildi/Jami)","Muddati o'tgan","O'rt.Vaqt (kun)","Konversiya","Tezlik","Sifat","Jami Ball"].map(h=>(
              <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:8,fontWeight:600,color:T.muted,textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`1px solid ${T.border}`}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filteredEmp.map((e,i)=>(
              <tr key={e.t.id} style={{borderBottom:`1px solid ${T.border}22`,background:i===0?`${T.accent}06`:"transparent"}}>
                <td style={{padding:"8px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><Av id={e.t.id} team={[e.t]} size={22}/><span style={{fontWeight:600,color:T.text}}>{e.t.name}</span>{i===0&&<span style={{fontSize:8,background:`${T.accent}22`,color:T.accent,borderRadius:3,padding:"0 4px"}}>🏆 Top</span>}</div></td>
                <td style={{padding:"8px 10px",color:T.muted,fontSize:9}}>{e.t.role}</td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontWeight:700,color:T.text}}>{e.done}/{e.total}</span>
                    <div style={{flex:1,minWidth:50}}><Bar w={e.completionRate} c={T.accent} h={5}/></div>
                    <span style={{fontSize:8,color:T.muted}}>{e.completionRate}%</span>
                  </div>
                </td>
                <td style={{padding:"8px 10px",color:e.overduePending>0?T.red:T.green,fontWeight:700}}>{e.overduePending}</td>
                <td style={{padding:"8px 10px",color:T.text}}>{e.avgDays||"–"}</td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontWeight:700,color:T.yellow}}>{e.convRate}%</span>
                    <span style={{fontSize:8,color:T.muted}}>({e.myContracts}/{e.myLeads})</span>
                  </div>
                </td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <Bar w={e.speedScore} c={T.accent} h={6}/>
                    <span style={{fontSize:9,fontWeight:700,color:T.accent,minWidth:24}}>{e.speedScore}</span>
                  </div>
                </td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <Bar w={e.accuracyScore} c={T.green} h={6}/>
                    <span style={{fontSize:9,fontWeight:700,color:T.green,minWidth:24}}>{e.accuracyScore}</span>
                  </div>
                </td>
                <td style={{padding:"8px 10px"}}>
                  <span style={{fontSize:14,fontWeight:900,color:SCORE_COLOR(e.productivityScore)}}>{e.productivityScore}</span>
                  <span style={{fontSize:8,color:T.muted}}>/100</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formula explanation */}
      <div style={{background:`${T.accent}08`,border:`1px solid ${T.accent}22`,borderRadius:10,padding:"12px 14px"}}>
        <div style={{fontSize:11,fontWeight:700,color:T.accent,marginBottom:8}}>📐 Hisoblash formulasi</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,fontSize:9,color:T.sub}}>
          <div style={{background:T.card,borderRadius:7,padding:"8px 10px"}}>
            <div style={{fontWeight:700,color:T.accent,marginBottom:3}}>⚡ Tezlik Ball (40%)</div>
            <div style={{fontFamily:"monospace",background:T.card2,padding:"4px 7px",borderRadius:4,marginBottom:4,fontSize:8}}>{'max(0, 100 − (avgDays/14)×100)'}</div>
            <div style={{color:T.muted}}>Vazifani bajarish o'rtacha vaqti. 14 kundan kam = 100 ball. Har qo'shimcha kun uchun minus.</div>
          </div>
          <div style={{background:T.card,borderRadius:7,padding:"8px 10px"}}>
            <div style={{fontWeight:700,color:T.green,marginBottom:3}}>✅ Sifat Ball (35%)</div>
            <div style={{fontFamily:"monospace",background:T.card2,padding:"4px 7px",borderRadius:4,marginBottom:4,fontSize:8}}>{'(done/total) × (1 − lateRate×0.5) × 100'}</div>
            <div style={{color:T.muted}}>Bajarilgan/Jami nisbati. Kech bajarilganlar 50% jarima bilan hisoblanadi.</div>
          </div>
          <div style={{background:T.card,borderRadius:7,padding:"8px 10px"}}>
            <div style={{fontWeight:700,color:T.yellow,marginBottom:3}}>🎯 Konversiya (25%)</div>
            <div style={{fontFamily:"monospace",background:T.card2,padding:"4px 7px",borderRadius:4,marginBottom:4,fontSize:8}}>{'(shartnoma / lead) × 100'}</div>
            <div style={{color:T.muted}}>Unga biriktirilgan leadlardan shartnomaga o'tgan foizi.</div>
          </div>
        </div>
        <div style={{marginTop:8,padding:"6px 10px",background:T.card,borderRadius:6,fontSize:10,color:T.text}}>
          <b style={{color:T.accent}}>Jami Ball</b> = Tezlik×40% + Sifat×35% + Konversiya×25% → <b>0 dan 100 gacha</b>
          <span style={{marginLeft:12,color:T.green}}>75–100: A'lo</span>
          <span style={{marginLeft:8,color:T.yellow}}>50–74: Yaxshi</span>
          <span style={{marginLeft:8,color:T.red}}>0–49: Kam</span>
        </div>
      </div>
    </div>}

    {/* ══════ TAB 2: TIME ANALYSIS ════════════════════════════════════════════ */}
    {tab==="time"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {/* Stage timings + Phase pipeline */}
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:0}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
            <span>📊 Bosqichlar bo'yicha vaqt tahlili</span>
            <span style={{fontSize:9,color:T.muted}}>{leadsInPeriod.length} ta lead</span>
          </div>
          <div style={{fontSize:9,color:T.muted,marginBottom:12}}>Standart vaqt me'zonlari (OneJobs jarayoni)</div>

          {/* Phase pipeline view - shows current counts */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:T.muted,marginBottom:6,textTransform:"uppercase"}}>Hozirgi holat: Har bosqichdagi mijozlar</div>
            <div style={{display:"flex",gap:3,overflowX:"auto",paddingBottom:4}}>
              {phaseStats.map((ph,i)=>(
                <div key={ph.key} style={{minWidth:80,textAlign:"center",flex:"0 0 auto"}}>
                  <div style={{fontSize:14,marginBottom:2}}>{ph.icon}</div>
                  <div style={{background:ph.count>0?(ph.overExpected>0?`${T.red}22`:`${T.accent}22`):T.card2,border:`1px solid ${ph.count>0?(ph.overExpected>0?T.red:T.accent):T.border}`,borderRadius:7,padding:"5px 4px",marginBottom:3}}>
                    <div style={{fontSize:16,fontWeight:900,color:ph.count>0?(ph.overExpected>0?T.red:T.accent):T.muted}}>{ph.count}</div>
                    <div style={{fontSize:7,color:T.muted}}>ta mijoz</div>
                  </div>
                  <div style={{fontSize:7,color:T.sub,lineHeight:1.3,maxWidth:80}}>{ph.label}</div>
                  <div style={{fontSize:7,color:T.muted}}>≤{ph.exp>30?ph.exp+" k":ph.exp+" k"}</div>
                  {ph.overExpected>0&&<div style={{fontSize:7,color:T.red,fontWeight:700}}>{ph.overExpected} kechikmoqda</div>}
                  {i<phaseStats.length-1&&<div style={{fontSize:10,color:T.muted,marginTop:2}}>→</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Date-field based timings */}
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
            <div style={{fontSize:9,fontWeight:700,color:T.muted,marginBottom:6,textTransform:"uppercase"}}>O'rtacha kunlar (hozirgi holatga ko'ra)</div>
            {stageTimings.map(s=>(
              <div key={s.label} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontSize:9,color:T.text,flex:1}}>{s.label}</span>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                    <span style={{fontSize:7,color:T.muted}}>({s.cnt} ta)</span>
                    {s.avg!=null
                      ? <span style={{fontSize:11,fontWeight:800,color:s.avg<=s.exp?T.green:s.avg<=s.exp*1.5?T.yellow:T.red,minWidth:50,textAlign:"right"}}>{s.avg} kun</span>
                      : <span style={{fontSize:8,color:T.muted}}>–</span>}
                    <span style={{fontSize:7,color:T.muted,minWidth:48,textAlign:"right"}}>mez: {s.exp>30?`${s.exp}k`:s.exp+"k"}</span>
                    {s.avg!=null&&<span style={{fontSize:9}}>{s.avg<=s.exp?"✅":s.avg<=s.exp*1.5?"🟡":"🔴"}</span>}
                  </div>
                </div>
                {s.avg!=null&&<div style={{background:T.border,borderRadius:3,height:5,overflow:"hidden"}}>
                  <div style={{width:`${Math.min(100,Math.round((s.avg/(s.exp*2))*100))}%`,height:"100%",background:s.avg<=s.exp?T.green:s.avg<=s.exp*1.5?T.yellow:T.red,borderRadius:3}}/>
                </div>}
              </div>
            ))}
            {stageTimings.every(s=>s.avg==null)&&<div style={{textAlign:"center",padding:"12px 0",color:T.muted,fontSize:10}}>
              💡 Mijoz kartasidagi <b>"📅 Muhim sanalar"</b> bo'limini to'ldiring — sanalar kiritilgan sari bu jadval avtomatik to'ladi
            </div>}
          </div>
        </div>

        {/* Funnel */}
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:12}}>🔽 Funnel + Konversiya</div>
          {funnelSteps.map(([label,cnt,c],i)=>{
            const prev = i>0?funnelSteps[i-1][1]:cnt;
            const pctTotal = maxFunnel>0?Math.round((cnt/maxFunnel)*100):0;
            const pctPrev  = prev>0?Math.round((cnt/prev)*100):0;
            return <div key={label} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                <span style={{fontSize:10,color:T.text}}>{label}</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {i>0&&<span style={{fontSize:8,background:`${c}22`,color:c,borderRadius:3,padding:"0 4px",fontWeight:700}}>{pctPrev}% oldingi</span>}
                  <span style={{fontSize:11,fontWeight:800,color:T.text}}>{cnt}</span>
                  <span style={{fontSize:8,color:T.muted,minWidth:30}}>{pctTotal}%</span>
                </div>
              </div>
              <div style={{background:T.border,borderRadius:3,height:8}}><div style={{width:`${pctTotal}%`,height:"100%",background:c,borderRadius:3,transition:"width 0.4s"}}/></div>
            </div>;
          })}
        </div>
      </div>

      {/* Per-employee time breakdown */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,overflow:"auto",marginBottom:14}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text}}>👔 Xodim bo'yicha vaqt tahlili</div>
          <div style={{fontSize:9,color:T.muted}}>Lead biriktirilgan kundan shartnomaga o'rtacha kun</div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.card2}}>
            {["Xodim","Roli","Lead (jami)","Jo'nab ketdi","Lead→Shartnoma (o'rt. kun)","Natija"].map(h=>(
              <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:8,fontWeight:600,color:T.muted,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {empTimeRows.map(e=>(
              <tr key={e.t.id} style={{borderBottom:`1px solid ${T.border}22`}}>
                <td style={{padding:"7px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><Av id={e.t.id} team={[e.t]} size={20}/><span style={{fontWeight:600,color:T.text,fontSize:10}}>{e.t.name}</span></div></td>
                <td style={{padding:"7px 10px",color:T.muted,fontSize:9}}>{e.t.role}</td>
                <td style={{padding:"7px 10px",fontWeight:700,color:T.text}}>{e.total}</td>
                <td style={{padding:"7px 10px",fontWeight:700,color:T.green}}>{e.gone}</td>
                <td style={{padding:"7px 10px"}}>
                  {e.toContract
                    ? <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{flex:1}}><Bar w={Math.min(100,Math.round((e.toContract/30)*100))} c={e.toContract<=14?T.green:e.toContract<=21?T.yellow:T.red} h={6}/></div>
                        <span style={{fontWeight:800,fontSize:11,color:e.toContract<=14?T.green:e.toContract<=21?T.yellow:T.red,minWidth:40}}>{e.toContract} kun</span>
                      </div>
                    : <span style={{color:T.muted,fontSize:9}}>Ma'lumot yo'q</span>}
                </td>
                <td style={{padding:"7px 10px"}}>
                  {e.toContract
                    ? <span style={{fontSize:9,fontWeight:700,color:e.toContract<=14?T.green:e.toContract<=21?T.yellow:T.red}}>
                        {e.toContract<=14?"✅ A'lo":e.toContract<=21?"🟡 Yaxshi":"🔴 Kechikmoqda"}
                      </span>
                    : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {empTimeRows.length===0&&<div style={{textAlign:"center",padding:"24px 0",color:T.muted,fontSize:11}}>
          Hisoblash uchun mijoz kartasida sanalarni to'ldiring (📅 Muhim sanalar)
        </div>}
      </div>

      {/* Standard time reference */}
      <div style={{background:`${T.yellow}10`,border:`1px solid ${T.yellow}33`,borderRadius:9,padding:"10px 14px"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.yellow,marginBottom:6}}>⏱️ Standart vaqt mezonlari — OneJobs jarayoni</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {phaseStats.map(ph=>(
            <div key={ph.key} style={{background:T.card,borderRadius:6,padding:"7px 9px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:9,color:T.text,fontWeight:600,marginBottom:1}}>{ph.icon} {ph.label}</div>
                <div style={{fontSize:7,color:T.muted}}>Hozir: {ph.count} ta mijoz</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,color:T.yellow,fontSize:13}}>{ph.exp > 30 ? ph.exp+"k" : ph.exp+" kun"}</div>
                {ph.overExpected>0&&<div style={{fontSize:7,color:T.red,fontWeight:600}}>{ph.overExpected} kechikmoqda</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{fontSize:8,color:T.muted,marginTop:6}}>💡 Vaqt mezonlari hozirgi holatdagi (status) leadlar asosida hisoblanadi. Aniqroq tahlil uchun mijoz kartasidagi "📅 Muhim sanalar" to'ldiring.</div>
      </div>
    </div>}

    {/* ══════ TAB 3: SALARY ════════════════════════════════════════════════════ */}
    {tab==="salary"&&<div>
      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          ["💰 Jami Maosh",totalSal,T.red],
          ["💚 Jami Daromad",totalRev,T.green],
          ["📊 Maosh/Daromad",totalRev>0?Math.round((totalSal/totalRev)*100)+"%":"–",T.yellow],
          ["👥 Xodimlar",salByEmp.filter(e=>e.total>0).length+" ta",T.accent],
        ].map(([lb,val,c])=>(
          <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 13px",borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:8,color:T.muted,marginBottom:3,fontWeight:600}}>{lb}</div>
            <div style={{fontSize:18,fontWeight:900,color:c}}>{typeof val==="number"?fmtMs(val)+" so'm":val}</div>
          </div>
        ))}
      </div>

      {/* Per-employee salary breakdown */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10,marginBottom:14}}>
        {salByEmp.map(({t,total,list,breakdown})=>(
          <div key={t.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
              <Av id={t.id} team={[t]} size={32}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
                <div style={{fontSize:9,color:T.muted}}>{t.role} · {list.length} ta to'lov</div>
              </div>
              <div style={{fontSize:16,fontWeight:900,color:T.red}}>{fmtMs(total)}</div>
            </div>
            {/* Breakdown bars */}
            {Object.entries(breakdown).filter(([,v])=>v>0).map(([k,v])=>{
              const c={maosh:T.accent,avans:T.yellow,bonus:T.green,kpi:"#8b5cf6"}[k]||T.muted;
              return <div key={k} style={{marginBottom:5}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T.muted,marginBottom:2}}>
                  <span style={{textTransform:"capitalize"}}>{k}</span>
                  <span style={{fontWeight:700,color:c}}>{fmtMs(v)}</span>
                </div>
                <Bar w={total>0?Math.round((v/total)*100):0} c={c} h={4}/>
              </div>;
            })}
            {list.slice(0,3).map(x=>(
              <div key={x.id} style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T.muted,padding:"2px 0",borderTop:`1px solid ${T.border}22`}}>
                <span>{x.cat} · {x.date}</span>
                <span style={{color:T.red,fontWeight:600}}>{fmtMs(x.amount)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Monthly salary chart */}
      {(()=>{
        const months=["01","02","03","04","05","06","07","08","09","10","11","12"];
        const yr=now.getFullYear();
        const mData=months.map(m=>{
          const mSal=txns.filter(t=>t.type==="expense"&&["Maosh","Avans","Bonus","KPI"].includes(t.cat)&&t.date?.startsWith(`${yr}-${m}`)).reduce((s,x)=>s+x.amount,0);
          const mRev=txns.filter(t=>t.type==="income"&&t.date?.startsWith(`${yr}-${m}`)).reduce((s,x)=>s+x.amount,0);
          return {m,sal:mSal,rev:mRev};
        });
        const maxV=Math.max(...mData.map(d=>Math.max(d.sal,d.rev)),1);
        const MONTH_NAMES=["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
        return <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:14}}>{yr} yil oylik maosh vs daromad</div>
          <div style={{display:"flex",gap:4,alignItems:"flex-end",height:120,paddingBottom:20,position:"relative"}}>
            {mData.map(({m,sal,rev},i)=>(
              <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end"}}>
                <div style={{width:"100%",display:"flex",gap:1,alignItems:"flex-end",height:100}}>
                  <div title={`Daromad: ${fmtMs(rev)}`} style={{flex:1,background:`${T.green}99`,borderRadius:"2px 2px 0 0",height:`${(rev/maxV)*100}px`,minHeight:rev>0?2:0,transition:"height 0.3s"}}/>
                  <div title={`Maosh: ${fmtMs(sal)}`} style={{flex:1,background:`${T.red}99`,borderRadius:"2px 2px 0 0",height:`${(sal/maxV)*100}px`,minHeight:sal>0?2:0,transition:"height 0.3s"}}/>
                </div>
                <span style={{fontSize:7,color:T.muted,position:"absolute",bottom:2}}>{MONTH_NAMES[i]}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            {[[T.green,"Daromad"],[T.red,"Maosh+Xarajat"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:T.muted}}>
                <div style={{width:10,height:10,borderRadius:2,background:c}}/>{l}
              </div>
            ))}
          </div>
        </div>;
      })()}
    </div>}
  </div>;
}

export { Analytics };