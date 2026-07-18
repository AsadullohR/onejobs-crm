import { useState, useEffect } from "react";
import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { fmtMs, isOD, inp, I, Av,fmtD } from "./helpers.jsx";
import { statsAPI, configAPI } from "./api.js";

// Default bonus scheme — every amount editable in the KPI tab (stored in config).
const DEFAULT_BONUS_CFG = {
  mgrFixed: 1000000, mgrXba: 50000, mgrQ1: 100000, mgrXbaPlan: 500000, mgrQ1Plan: 500000, mgrStatus: 500000, mgrTime: 500000,
  docFixed: 1000000, docPerVisa: 100000, docOnTime: 500000, docTime: 500000, docStatus: 400000,
  callFixed: 1000000, callPerSale: 100000, callPlan: 500000, callTime: 500000,
};

// ─── ANALYTICS PAGE (Employee Productivity + Time Analysis) ─────────────────
function Analytics({leads, tasks, team, txns, roles, user, initialTab}) {
  const T=useT();
  const inpS=inp(T);
  const [tab,setTab]=useState(initialTab||"productivity");  // productivity | time | salary
  const [fEmp,setFEmp]=useState("all");
  // Real timings from status_log (replaces created-date approximations
  // in the phase snapshot and transition rows once loaded)
  const [serverTiming,setServerTiming]=useState(null);
  const [kpiData,setKpiData]=useState(null);
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

  useEffect(() => {
    let alive = true;
    const fromStr = fPeriod === "all" ? null : periodStart.toISOString().slice(0, 10);
    const toStr = fPeriod === "all" ? null : new Date().toISOString().slice(0, 10);
    statsAPI.timing(fromStr, toStr)
      .then(r => { if (alive && r?.phases) setServerTiming(r); })
      .catch(() => { if (alive) setServerTiming(null); });
    statsAPI.kpi(fromStr, toStr)
      .then(r => { if (alive && r?.empFunnel) setKpiData(r); })
      .catch(() => { if (alive) setKpiData(null); });
    return () => { alive = false; };
  }, [fPeriod]);

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

  // ── Prefer real status_log timings from the server when available ─────────
  const TR_EMOJI = { "Lead → Bog'landi":"📞","Bog'landi → Suhbat":"💬","Suhbat → Shartnoma":"🏢","Shartnoma → XBA to'lov":"💳","XBA → Ishga qabul":"📄","Ishga qabul → Hujjatlar":"📁","Hujjatlar → Taklifnoma":"📨","Taklifnoma → Vizaga topshirish":"🗂️","Vizaga topshirish → Viza chiqishi":"🛂","Viza → Jo'nab ketish":"✈️" };
  const stageTimingsFinal = serverTiming
    ? serverTiming.transitions.map(tr => ({
        label: `${TR_EMOJI[tr.key]||"🕒"} ${tr.key}`, key: tr.key, exp: tr.exp,
        avg: tr.avg, cnt: tr.n,
        ok: tr.avg != null ? tr.avg <= tr.exp : null,
        pct: tr.avg ? Math.min(200, Math.round((tr.avg / tr.exp) * 100)) : 0,
      }))
    : stageTimings;
  const phaseStatsFinal = serverTiming
    ? phaseStats.map(ph => {
        const s = serverTiming.phases.find(x => x.key === ph.key);
        return s ? { ...ph, count: s.count, avgDays: s.avgDays, overExpected: s.over } : ph;
      })
    : phaseStats;

  // ── EMPLOYEE PRODUCTIVITY SCORE ────────────────────────────────────────────
  // Formula: Score = (Tasks Done / Total Assigned) * 50 
  //                + (Overdue Done / Total Done) adjusted penalty * 20
  //                + (Contracts / Leads) conversion * 30
  // Normalized 0-100
  // Scoreboard covers operational roles only — admin/finance have no leads or
  // tasks pipeline, so scoring them just produced meaningless floor values.
  const empStats = team.filter(t=>["sales","manager","docs","hujjatchi"].includes(t.role) && t.active!==false).map(t => {
    const myTasks   = tasks.filter(x => x.assignee===t.id && inPeriod(x.createdAt||x.due));
    const doneTasks = myTasks.filter(x => x.status==="done");
    const lateDone  = doneTasks.filter(x => x.due && new Date(x.completedAt||x.due) > new Date(x.due));
    const overduePending = myTasks.filter(x => x.status!=="done" && isOD(x.due));

    // Speed score: REAL reaction time from status_log — avg days from lead
    // creation to the first status change on leads they own as sales.
    // No measured data (e.g. docs-only employees) → neutral 50, never a free 100.
    const sp = serverTiming?.empSpeed?.find(x => String(x.id) === String(t.id));
    const avgDays = sp ? Math.round(sp.avgDays * 10) / 10 : null;
    const speedScore = sp
      ? Math.max(0, Math.min(100, 100 - (sp.avgDays / 14) * 100))
      : 50;

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
  const empTimeRows = team.filter(t=>!["partner","employer"].includes(t.role)&&t.active!==false).map(t=>{
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
  const salByEmp = team.filter(t=>!["partner","employer"].includes(t.role)).map(t=>{
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
  stageTimingsFinal.filter(s=>s.avg!=null&&s.avg>s.exp).slice(0,3).forEach(s=>{ alerts.push({type:"time",msg:`${s.label}: ${s.avg} kun (mez: ${s.exp} kun)`,sev:s.avg>s.exp*1.5?"red":"yellow"}); });
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
          {team.filter(t=>!["partner","employer"].includes(t.role)&&t.active!==false).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
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
      {[["productivity","👔 Xodimlar Samaradorligi"],["time","⏱️ Vaqt Tahlili"],["kpi","🎯 KPI Nazorat"],...(roles[user?.role]?.canSalary?[["salary","💰 Maosh Tahlili"]]:[])] .map(([k,l])=>(
        <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 16px",borderRadius:6,border:"none",background:tab===k?T.accent:"transparent",color:tab===k?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:tab===k?700:400}}>{l}</button>
      ))}
    </div>

    {/* ══════ KPI NAZORAT ══════════════════════════════════════════════════════ */}
    {tab==="kpi"&&<KpiTab team={team} T={T} periodStart={periodStart} canEditCfg={user?.role==="admin"}/>}

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
            <div style={{fontFamily:"monospace",background:T.card2,padding:"4px 7px",borderRadius:4,marginBottom:4,fontSize:8}}>{'max(0, 100 − (reaksiya kunlari/14)×100)'}</div>
            <div style={{color:T.muted}}>Lead kelgandan birinchi status o'zgarishigacha o'rtacha kun (status tarixidan, real o'lchov). Ma'lumot yo'q bo'lsa — neytral 50.</div>
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
              {phaseStatsFinal.map((ph,i)=>(
                <div key={ph.key} style={{minWidth:80,textAlign:"center",flex:"0 0 auto"}}>
                  <div style={{fontSize:14,marginBottom:2}}>{ph.icon}</div>
                  <div style={{background:ph.count>0?(ph.overExpected>0?`${T.red}22`:`${T.accent}22`):T.card2,border:`1px solid ${ph.count>0?(ph.overExpected>0?T.red:T.accent):T.border}`,borderRadius:7,padding:"5px 4px",marginBottom:3}}>
                    <div style={{fontSize:16,fontWeight:900,color:ph.count>0?(ph.overExpected>0?T.red:T.accent):T.muted}}>{ph.count}</div>
                    <div style={{fontSize:7,color:T.muted}}>ta mijoz</div>
                  </div>
                  <div style={{fontSize:7,color:T.sub,lineHeight:1.3,maxWidth:80}}>{ph.label}</div>
                  <div style={{fontSize:7,color:T.muted}}>≤{ph.exp>30?ph.exp+" k":ph.exp+" k"}</div>
                  {ph.overExpected>0&&<div style={{fontSize:7,color:T.red,fontWeight:700}}>{ph.overExpected} kechikmoqda</div>}
                  {i<phaseStatsFinal.length-1&&<div style={{fontSize:10,color:T.muted,marginTop:2}}>→</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Date-field based timings */}
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
            <div style={{fontSize:9,fontWeight:700,color:T.muted,marginBottom:6,textTransform:"uppercase"}}>O'rtacha kunlar (hozirgi holatga ko'ra)</div>
            {stageTimingsFinal.map(s=>(
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
            {stageTimingsFinal.every(s=>s.avg==null)&&<div style={{textAlign:"center",padding:"12px 0",color:T.muted,fontSize:10}}>
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
            {["Xodim","Roli","Lead (jami)","📞 Qo'ng'iroq","🏢 Ofis","💰 XBA","✈️ Jo'nab ketdi","Lead→Shartnoma (o'rt. kun)","Natija"].map(h=>(
              <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:8,fontWeight:600,color:T.muted,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {empTimeRows.map(e=>{
              const ef=kpiData?.empFunnel?.find(x=>String(x.id)===String(e.t.id));
              const pOff=ef&&ef.called>0?Math.round((ef.office/ef.called)*100):null;
              const pXba=ef&&ef.office>0?Math.round((ef.xba/ef.office)*100):null;
              return (
              <tr key={e.t.id} style={{borderBottom:`1px solid ${T.border}22`}}>
                <td style={{padding:"7px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><Av id={e.t.id} team={[e.t]} size={20}/><span style={{fontWeight:600,color:T.text,fontSize:10}}>{e.t.name}</span></div></td>
                <td style={{padding:"7px 10px",color:T.muted,fontSize:9}}>{e.t.role}</td>
                <td style={{padding:"7px 10px",fontWeight:700,color:T.text}}>{e.total}</td>
                <td style={{padding:"7px 10px",fontWeight:700,color:T.text}}>{ef?ef.called:"–"}</td>
                <td style={{padding:"7px 10px",whiteSpace:"nowrap"}}>
                  {ef?<><b style={{color:T.text}}>{ef.office}</b>{pOff!=null&&<span style={{fontSize:8,fontWeight:700,marginLeft:4,color:pOff>=30?T.green:pOff>=15?T.yellow:T.red}}>({pOff}%)</span>}</>:"–"}
                </td>
                <td style={{padding:"7px 10px",whiteSpace:"nowrap"}}>
                  {ef?<><b style={{color:T.text}}>{ef.xba}</b>{pXba!=null&&<span style={{fontSize:8,fontWeight:700,marginLeft:4,color:pXba>=40?T.green:pXba>=20?T.yellow:T.red}}>({pXba}%)</span>}</>:"–"}
                </td>
                <td style={{padding:"7px 10px",fontWeight:700,color:T.green}}>{ef?ef.departed:e.gone}</td>
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
            );})}
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
          {phaseStatsFinal.map(ph=>(
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

// ─── KPI NAZORAT TAB ─────────────────────────────────────────────────────────
// Role-based KPI tables (Hujjatchi / Call Center / Sales) with target vs
// actual, computed server-side from status_log + payment dates, plus the
// auto-computable bonus components per employee.
function KpiTab({ team, T, periodStart, canEditCfg }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [cfg, setCfg] = useState(DEFAULT_BONUS_CFG);
  const [editCfg, setEditCfg] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    configAPI.getAll().then(c => {
      let parsed = c?.bonusCfg;
      if (typeof parsed === "string") { try { parsed = JSON.parse(parsed); } catch { parsed = null; } }
      if (parsed && typeof parsed === "object") setCfg(p => ({ ...p, ...parsed }));
    }).catch(() => {});
  }, []);

  const saveCfg = async () => {
    setSavingCfg(true);
    try { await configAPI.set("bonusCfg", cfg); setEditCfg(false); }
    catch (e) { alert(e.message); }
    finally { setSavingCfg(false); }
  };
  const from = periodStart.toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let alive = true;
    statsAPI.kpi(from, to)
      .then(r => { if (alive) { setD(r); setErr(""); } })
      .catch(e => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [from, to]);

  if (err) return <div style={{ color: T.red, fontSize: 12, padding: 20 }}>KPI yuklanmadi: {err} — serverni yangilang</div>;
  if (!d) return <div style={{ color: T.muted, fontSize: 12, padding: 20 }}>Yuklanmoqda…</div>;

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);
  const visaTotal = d.visaOk + d.visaBad;
  const visaPct = pct(d.visaOk, visaTotal);
  const respPct = pct(d.respFast, d.respN);
  const convLS = pct(d.leadsReachedSuhbat, d.leadsCreated);
  const convSS = pct(d.shartnomaEntered, d.suhbatEntered);
  const cancelPct = pct(d.cancelled, d.contracts);
  const consultDaily = d.days > 0 ? (d.consultEntered / d.days).toFixed(1) : "–";

  // status: true=✅ green, false=❌ red, null=no data yet
  const Row = ({ kpi, target, actual, ok, manual }) => (
    <tr>
      <td style={{ padding: "8px 12px", fontSize: 11, color: T.text, borderBottom: `1px solid ${T.border}` }}>{kpi}</td>
      <td style={{ padding: "8px 12px", fontSize: 10, color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{target}</td>
      <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 800, color: T.text, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
        {manual ? <span style={{ fontSize: 9, color: T.muted, fontWeight: 400 }}>Qo'lda baholanadi</span> : (actual ?? "–")}
      </td>
      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, textAlign: "center" }}>
        {manual ? "📝" : ok == null ? <span style={{ color: T.muted }}>–</span> : ok ? "✅" : "❌"}
      </td>
    </tr>
  );

  const Card = ({ title, children }) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", fontSize: 12, fontWeight: 800, color: T.text, background: T.card2, borderBottom: `1px solid ${T.border}` }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          {["KPI", "Maqsad", "Haqiqiy", ""].map(h => <th key={h} style={{ textAlign: "left", padding: "7px 12px", fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", background: T.card2 }}>{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );

  const fmtSum = n => n.toLocaleString("uz-UZ") + " so'm";
  const nameOf = id => team.find(u => String(u.id) === String(id))?.name || `ID:${id}`;

  return (
    <div>
      <div style={{ fontSize: 10, color: T.muted, marginBottom: 12 }}>
        Davr: {from} — {to} · status o'zgarishi vaqtlari (status_log) asosida. Eslatma: log yozila boshlagandan keyingi davr aniqroq.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14, alignItems: "start" }}>
        <div>
          <Card title="📁 HUJJATCHI">
            <Row kpi="Faol hujjat soni" target="≥ 10 ta jarayonda" actual={`${d.docsActive} ta`} ok={d.docsActive >= 10} />
            <Row kpi="O'rtacha hujjat muddati (Ishga qabul → Jo'natildi)" target="≤ 15 kun" actual={d.avgDocsDays != null ? `${d.avgDocsDays} kun (${d.avgDocsN} ta)` : null} ok={d.avgDocsDays != null ? d.avgDocsDays <= 15 : null} />
            <Row kpi="Muddati o'tgan fayllar (14+ kun)" target="0 ta" actual={`${d.docsOverdue} ta`} ok={d.docsOverdue === 0} />
            <Row kpi="Viza muvaffaqiyati" target="≥ 95%" actual={visaPct != null ? `${visaPct}% (${d.visaOk}/${visaTotal})` : null} ok={visaPct != null ? visaPct >= 95 : null} />
            <Row kpi="Hujjat qaytarilish soni" target="≤ 2 ta/oy" manual />
          </Card>

          {/* Per-employee funnel: called → office → XBA */}
          <Card title="📈 XODIMLAR VORONKASI (qo'ng'iroq → ofis → XBA)">
            {(d.empFunnel || []).length === 0 && (
              <tr><td colSpan={4} style={{ padding: "10px 12px", fontSize: 10, color: T.muted }}>Bu davrda ma'lumot yo'q</td></tr>
            )}
            {(d.empFunnel || []).map(f => {
              const pOff = f.called > 0 ? Math.round((f.office / f.called) * 100) : 0;
              const pXba = f.office > 0 ? Math.round((f.xba / f.office) * 100) : (f.xba > 0 ? 100 : 0);
              return (
                <tr key={"ef" + f.id}>
                  <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.text, borderBottom: `1px solid ${T.border}` }}>{nameOf(f.id)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: T.text, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>📞 {f.called}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                    🏢 <b>{f.office}</b> <span style={{ fontSize: 9, fontWeight: 700, color: pOff >= 30 ? T.green : pOff >= 15 ? T.yellow : T.red }}>({pOff}%)</span>
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 11, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                    💰 <b>{f.xba}</b> <span style={{ fontSize: 9, fontWeight: 700, color: pXba >= 40 ? T.green : pXba >= 20 ? T.yellow : T.red }}>({pXba}%)</span>
                  </td>
                </tr>
              );
            })}
          </Card>

          {/* Suhbat → Ofis conversion per agent */}
          <Card title="🏢 SUHBAT → OFIS (agent bo'yicha)">
            {(d.officeConv || []).length === 0 && (
              <tr><td colSpan={4} style={{ padding: "10px 12px", fontSize: 10, color: T.muted }}>Bu davrda belgilangan ofis suhbatlari yo'q</td></tr>
            )}
            {(d.officeConv || []).map(o => {
              const p = o.booked > 0 ? Math.round((o.came / o.booked) * 100) : 0;
              return (
                <tr key={"oc" + o.id}>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: T.text, borderBottom: `1px solid ${T.border}` }}>{nameOf(o.id)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 10, color: T.muted, borderBottom: `1px solid ${T.border}` }}>belgilandi: {o.booked}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 800, borderBottom: `1px solid ${T.border}`, color: p >= 50 ? T.green : p >= 30 ? T.yellow : T.red }}>{o.came} ta · {p}%</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, textAlign: "center" }}>{p >= 35 ? "✅" : "❌"}</td>
                </tr>
              );
            })}
          </Card>

          {/* No-show list */}
          {(d.noShow || []).length > 0 && (
            <div style={{ background: `${T.red}08`, border: `1px solid ${T.red}33`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.red, marginBottom: 8 }}>⚠️ KELMAGANLAR (oxirgi 30 kun) — {d.noShow.length} ta</div>
              <div style={{ fontSize: 9, color: T.muted, marginBottom: 8 }}>Suhbat sanasi o'tgan, lekin ofisga kelmagan — qayta qo'ng'iroq qiling</div>
              {d.noShow.map(n => (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, padding: "4px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.text, fontWeight: 600 }}>{n.name} <span style={{ color: T.muted, fontWeight: 400 }}>{n.phone}</span></span>
                  <span style={{ color: T.muted, whiteSpace: "nowrap" }}>{String(n.date).slice(0, 10)} · {n.owner || "–"}</span>
                </div>
              ))}
            </div>
          )}

          <Card title="📞 SOTUV/CALL">
            <Row kpi="Arizaga javob vaqti (10 daqiqada)" target="100%" actual={respPct != null ? `${respPct}% (o'rt. ${d.respAvgMin} daq)` : null} ok={respPct != null ? respPct >= 100 : null} />
            <Row kpi="Konsultatsiyaga yozilganlar" target="≥ 10 ta/kun" actual={`${consultDaily} ta/kun (${d.consultEntered} ta)`} ok={Number(consultDaily) >= 10} />
            <Row kpi="Konversiya (lead → suhbat)" target="≥ 40%" actual={convLS != null ? `${convLS}% (${d.leadsReachedSuhbat}/${d.leadsCreated})` : null} ok={convLS != null ? convLS >= 40 : null} />
            <Row kpi="Yashirin mijoz bahosi" target="≥ 11/14 ball" manual />
          </Card>

          <Card title="💼 MENEJER (Sales/Ops)">
            <Row kpi="Suhbat → Shartnoma+XBA konversiyasi" target="≥ 60%" actual={convSS != null ? `${convSS}% (${d.shartnomaEntered}/${d.suhbatEntered})` : null} ok={convSS != null ? convSS >= 60 : null} />
            <Row kpi="Oylik XBA to'lovlar soni" target="60+ ta" actual={`${d.xbaCount} ta`} ok={d.xbaCount >= 60} />
            <Row kpi="Ishga qabul → hujjat jo'natish" target="≤ 15 kun" actual={d.avgDocsDays != null ? `${d.avgDocsDays} kun` : null} ok={d.avgDocsDays != null ? d.avgDocsDays <= 15 : null} />
            <Row kpi="Bekor qilingan shartnomalar" target="≤ 10%" actual={cancelPct != null ? `${cancelPct}% (${d.cancelled}/${d.contracts})` : null} ok={cancelPct != null ? cancelPct <= 10 : null} />
            <Row kpi="Mijoz mamnuniyati" target="≥ 4/5" manual />
            <Row kpi="Pipeline qiymat" target="Oylik pul target" manual />
            <Row kpi="Reanimatsiya qo'ng'iroqlari" target="10+/hafta" manual />
          </Card>
        </div>

        {/* Bonus calculator with editable scheme */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card2, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>💰 BONUS HISOBI</span>
            {canEditCfg && (editCfg
              ? <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={savingCfg} onClick={() => setEditCfg(false)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.muted, cursor: "pointer" }}>Bekor</button>
                  <button disabled={savingCfg} onClick={saveCfg} style={{ fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", cursor: "pointer" }}>{savingCfg ? "…" : "💾 Saqlash"}</button>
                </div>
              : <button onClick={() => setEditCfg(true)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.muted, cursor: "pointer" }}>⚙️ Summalar</button>)}
          </div>
          <div style={{ padding: 14 }}>
            {(() => {
              const C = (k) => editCfg
                ? <input type="number" value={cfg[k]} onChange={e => setCfg(p => ({ ...p, [k]: Number(e.target.value) || 0 }))}
                    style={{ width: 90, fontSize: 10, padding: "2px 5px", borderRadius: 4, border: `1px solid ${T.accent}66`, background: T.card, color: T.text }} />
                : <b>{fmtSum(cfg[k])}</b>;
              const manualRow = (label, k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.muted, padding: "3px 0 3px 10px" }}>
                  <span>📝 {label}</span><span>{C(k)}</span>
                </div>
              );
              const personRow = (key, name, detail, sum) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.text }}>{name} <span style={{ color: T.muted, fontSize: 9 }}>{detail}</span></span>
                  <b style={{ color: T.green }}>{fmtSum(sum)}</b>
                </div>
              );
              const managers = team.filter(u => u.role === "manager" && u.active !== false);
              const callers = team.filter(u => u.role === "sales" && u.active !== false);
              const docsPpl = team.filter(u => ["docs", "hujjatchi"].includes(u.role) && u.active !== false);
              const callN = Object.fromEntries(d.bonusCall.map(b => [String(b.id), b.n]));
              const docsN = Object.fromEntries(d.bonusDocs.map(b => [String(b.id), b.n]));
              return <>
                <div style={{ fontSize: 9, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
                  Avtomatik: to'lov sanalaridan. 📝 belgili qismlar oy oxirida qo'lda tasdiqlanadi. Barcha summalar ⚙️ orqali o'zgartiriladi.
                </div>

                <div style={{ fontSize: 10, fontWeight: 800, color: T.text, marginBottom: 4 }}>💼 MENEJER — oklad {C("mgrFixed")} + Call XBA × {C("mgrXba")} + 1-qism × {C("mgrQ1")}</div>
                {managers.map(m => personRow("m" + m.id, m.name,
                  `(oklad + ${d.mgrCallXba} XBA · ${d.mgrQ1Total} ta 1-qism)`,
                  cfg.mgrFixed + d.mgrCallXba * cfg.mgrXba + d.mgrQ1Total * cfg.mgrQ1))}
                {manualRow("XBA plan bajarildi", "mgrXbaPlan")}
                {manualRow("1-qism plan bajarildi", "mgrQ1Plan")}
                {manualRow("Statuslar/ma'lumotlar joyida", "mgrStatus")}
                {manualRow("Davomat (o'z vaqtida kelish)", "mgrTime")}

                <div style={{ fontSize: 10, fontWeight: 800, color: T.text, margin: "14px 0 4px" }}>📁 HUJJATCHI — oklad {C("docFixed")} + viza × {C("docPerVisa")}</div>
                {docsPpl.map(m => personRow("d" + m.id, m.name,
                  `(oklad + ${docsN[String(m.id)] || 0} ta viza)`,
                  cfg.docFixed + (docsN[String(m.id)] || 0) * cfg.docPerVisa))}
                {manualRow("Hujjatlar muddatida jo'natildi", "docOnTime")}
                {manualRow("Davomat (o'z vaqtida kelish)", "docTime")}
                {manualRow("Statuslar to'g'ri qo'yilgan", "docStatus")}

                <div style={{ fontSize: 10, fontWeight: 800, color: T.text, margin: "14px 0 4px" }}>📞 SOTUV/CALL — oklad {C("callFixed")} + shartnoma+XBA × {C("callPerSale")}</div>
                {callers.map(m => personRow("c" + m.id, m.name,
                  `(oklad + ${callN[String(m.id)] || 0} ta XBA)`,
                  cfg.callFixed + (callN[String(m.id)] || 0) * cfg.callPerSale))}
                {manualRow("Plan bajarildi", "callPlan")}
                {manualRow("Davomat (o'z vaqtida kelish)", "callTime")}
              </>;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Analytics };
