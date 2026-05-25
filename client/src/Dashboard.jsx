import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { fmtMs, isOD, isSoon, I, Pill, Av,fmtD } from "./helpers.jsx";

// ─── SUPER DASHBOARD v2 (Business KPI) ────────────────────────────────────────
function Dashboard({leads, tasks, user, team, txns, roles}) {
  const T=useT();
  const total=leads.length;
  const gone=leads.filter(l=>DONE.includes(l.status)).length;
  const myT=tasks.filter(t=>t.assignee===user.id&&t.status!=="done");
  const perm=roles[user.role]||{};
  const totalInc=txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp=txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const sofF=leads.filter(l=>DONE.includes(l.status)&&l.sofFoyda).reduce((s,l)=>s+(l.sofFoyda||0),0);

  // Funnel analytics with conversion %
  const funnelGroups=[
    ["Yangi",["Yangi","Qilindi"]],
    ["Aloqa",["Bog'landi","Boglanildi","Onlayn Suhbat Uchun","Onlayn Suhbat","Suhbat"]],
    ["Bitim",["Shartnoma qildi","XBA To'lov qildi","CV Topshirildi","Interview ga qo'yildi","Ishga qabul qilindi"]],
    ["To'lov",["1 - Qism To'landi"]],
    ["Hujjatlar",["Hujjatlar Tayyorlanmoqda","Hujjatlar Jonatilishga Tayyor","Hujjatlar Jonatildi","Ish shartnomasi keldi","Ish shartnomasi imzolandi","Taklifnoma keldi"]],
    ["Viza",["Elchixonaga Hujjatlar Tayyor","Vizaga Topshirildi","Viza Oldi"]],
    ["Jo'nab ketdi",["Jo'nab ketdi"]],
  ];
  const fData=funnelGroups.map(([g,stages])=>({g,n:leads.filter(l=>stages.includes(l.status)).length}));

  // Source analytics with revenue
  const bySrc=Object.entries(leads.reduce((m,l)=>{if(l.source){m[l.source]=(m[l.source]||{count:0,contracts:0,gone:0,revenue:0});m[l.source].count++;if(["Shartnoma qildi",...DONE].some(s=>l.status.includes(s)))m[l.source].contracts++;if(DONE.includes(l.status))m[l.source].gone++;m[l.source].revenue+=(l.totalIncome||0);}return m;},{})).sort(([,a],[,b])=>b.count-a.count).slice(0,8);

  // Country analytics with revenue
  const byCon=Object.entries(leads.reduce((m,l)=>{if(l.country){const c=l.country.split(",")[0].trim();m[c]=(m[c]||{count:0,gone:0,revenue:0});m[c].count++;if(DONE.includes(l.status))m[c].gone++;m[c].revenue+=(l.totalIncome||0);}return m;},{})).sort(([,a],[,b])=>b.count-a.count).slice(0,6);

  // Team stats
  const teamStats=team.filter(t=>["sales","manager","docs"].includes(t.role)).map(t=>{
    const myLeads=leads.filter(l=>l.ownerSales===t.id||l.ownerConsult===t.id||l.ownerDocs===t.id);
    const myGone=myLeads.filter(l=>DONE.includes(l.status)).length;
    const conv=myLeads.length>0?((myGone/myLeads.length)*100).toFixed(0):0;
    const kpi=leads.filter(l=>(l.ownerSales===t.id&&l.kpiSales)||(l.ownerConsult===t.id&&l.kpiConsult)||(l.ownerDocs===t.id&&l.kpiDocs)).length;
    const inc=txns.filter(x=>x.type==="income"&&leads.find(l=>l.id===x.leadId&&(l.ownerSales===t.id||l.ownerConsult===t.id||l.ownerDocs===t.id))).reduce((s,x)=>s+x.amount,0);
    return {t,total:myLeads.length,gone:myGone,conv,kpi,inc};
  }).filter(x=>x.total>0).sort((a,b)=>b.gone-a.gone);

  // Alerts
  const overdueTask=tasks.filter(t=>t.status!=="done"&&isOD(t.due)).length;
  const soonTask=tasks.filter(t=>t.status!=="done"&&isSoon(t.due)).length;
  const lostLeads=leads.filter(l=>LOST.includes(l.status)).length;
  const activeLeads=leads.filter(l=>![...DONE,...LOST].includes(l.status)).length;
  const contractLeads=leads.filter(l=>l.status==="Shartnoma qildi").length;
  const visaLeads=leads.filter(l=>["Vizaga Topshirildi","Elchixonaga Hujjatlar Tayyor"].includes(l.status)).length;

  // KPIs
  const thisMonthLeads=leads.filter(l=>l.createdAt&&new Date(l.createdAt)>new Date(new Date().getFullYear(),new Date().getMonth(),1)).length;
  const contactRate=total>0?((leads.filter(l=>!["Yangi","Qilindi"].includes(l.status)).length/total)*100).toFixed(0):0;
  const contractRate=total>0?((contractLeads/total)*100).toFixed(1):0;
  const deployRate=total>0?((gone/total)*100).toFixed(1):0;
  const avgRev=gone>0?Math.round(totalInc/gone):0;

  // Monthly chart
  const months=["01","02","03","04","05"];
  const mInc=months.map(m=>txns.filter(t=>t.type==="income"&&t.date.startsWith(`2026-${m}`)).reduce((s,t)=>s+t.amount,0));
  const mExp=months.map(m=>txns.filter(t=>t.type==="expense"&&t.date.startsWith(`2026-${m}`)).reduce((s,t)=>s+t.amount,0));
  const mProfit=months.map((_,i)=>mInc[i]-mExp[i]);
  const maxB=Math.max(...mInc,...mExp,1);

  const FC=["#6366f1","#f59e0b","#22c55e","#ec4899","#3b82f6","#7c3aed","#166534"];

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      <div><h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Executive Dashboard</h1><p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>Biznes boshqaruv paneli · {new Date().toLocaleDateString("uz-UZ")}</p></div>
    </div>

    {/* Executive KPI Row */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
      {[
        ["📥","Bu Oy Leadlar",thisMonthLeads,"yangi","#6366f1"],
        ["📞","Aloqa %",`${contactRate}%`,"kontakt qilingan","#f59e0b"],
        ["📄","Shartnoma %",`${contractRate}%`,"bitim yopilgan","#22c55e"],
        ["✈️","Jo'nab Ketdi",`${deployRate}%`,`${gone} ta`,T.green],
        perm.canFin?["💰","O'rt. daromad",fmtMs(avgRev),"har mijoz",T.yellow]:["⚠️","Muddati O'tgan",overdueTask,"vazifa",T.red],
      ].map(([icon,lb,val,sub,c])=>(
        <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 13px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,flex:1}}>{lb}</span><span style={{fontSize:16}}>{icon}</span></div>
          <div style={{fontSize:20,fontWeight:900,color:T.text,lineHeight:1}}>{val}</div>
          <div style={{fontSize:9,color:T.muted,marginTop:2}}>{sub}</div>
        </div>
      ))}
    </div>
    {perm.canFin&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
      {[
        ["💚","Jami Kirim",`+${fmtMs(totalInc)} so'm`,"barcha vaqt",T.green],
        ["🔴","Jami Chiqim",`-${fmtMs(totalExp)} so'm`,"barcha vaqt",T.red],
        ["⚖️","Balans",fmtMs(totalInc-totalExp),(totalInc-totalExp)>=0?"+":"-",totalInc-totalExp>=0?T.green:T.red],
        ["💰","Sof Foyda",`${fmtMs(sofF)} so'm`,"tugagan jarayonlar",T.yellow],
        ["📊","Jami Mijozlar",total,`${gone} muvaffaqiyatli`,T.accent],
      ].map(([icon,lb,val,sub,c])=>(
        <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 13px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:9,color:T.muted,fontWeight:600,textTransform:"uppercase"}}>{lb}</span><span>{icon}</span></div>
          <div style={{fontSize:16,fontWeight:900,color:c}}>{val}</div>
          <div style={{fontSize:9,color:T.muted}}>{sub}</div>
        </div>
      ))}
    </div>}

    {/* Alerts */}
    {(overdueTask>0||soonTask>0||lostLeads>50)&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {overdueTask>0&&<div style={{background:`${T.red}15`,border:`1px solid ${T.red}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>🔴</span><div><div style={{fontSize:11,fontWeight:700,color:T.red}}>Muddati o'tgan: {overdueTask} ta vazifa</div><div style={{fontSize:9,color:T.muted}}>Tezkor chora ko'ring</div></div>
      </div>}
      {soonTask>0&&<div style={{background:`${T.yellow}15`,border:`1px solid ${T.yellow}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>🟡</span><div><div style={{fontSize:11,fontWeight:700,color:T.yellow}}>Yaqinlashmoqda: {soonTask} ta</div><div style={{fontSize:9,color:T.muted}}>2 kun ichida muddat</div></div>
      </div>}
      {visaLeads>0&&<div style={{background:`${T.purple}15`,border:`1px solid ${T.purple}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>📋</span><div><div style={{fontSize:11,fontWeight:700,color:T.purple}}>Viza jarayonida: {visaLeads} ta</div><div style={{fontSize:9,color:T.muted}}>Elchixona / kutish</div></div>
      </div>}
      {contractLeads>5&&<div style={{background:`${T.green}15`,border:`1px solid ${T.green}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>🟢</span><div><div style={{fontSize:11,fontWeight:700,color:T.green}}>Shartnoma: {contractLeads} ta aktiv</div><div style={{fontSize:9,color:T.muted}}>To'lov kutilmoqda</div></div>
      </div>}
    </div>}

    {/* Main 3-col grid */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
      {/* Funnel with conversion */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <h3 style={{margin:0,fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>🔽 Funnel + Konversiya</h3>
        </div>
        {fData.map(({g,n},i)=>{
          const pct=total>0?((n/total)*100).toFixed(0):0;
          const prevN=i>0?fData[i-1].n:total;
          const stagePct=prevN>0?((n/prevN)*100).toFixed(0):0;
          return <div key={g} style={{marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2,alignItems:"center"}}>
              <span style={{fontSize:10,color:T.sub}}>{g}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:9,color:T.muted}}>{pct}% jami</span>
                {i>0&&<span style={{fontSize:8,background:`${FC[i]}22`,color:FC[i],borderRadius:3,padding:"0 4px",fontWeight:700}}>{stagePct}%</span>}
                <span style={{fontSize:10,fontWeight:700,color:T.text}}>{n}</span>
              </div>
            </div>
            <div style={{background:T.border,borderRadius:3,height:5}}><div style={{width:`${(n/total)*100}%`,background:FC[i],borderRadius:3,height:5,transition:"width 0.3s"}}/></div>
          </div>;
        })}
      </div>

      {/* Team performance */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>👔 Xodimlar Samaradorligi</h3>
        {teamStats.slice(0,5).map(({t,total:tot,gone:g,conv,kpi,inc})=>(
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
            <Av id={t.id} team={team} size={22}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
              <div style={{display:"flex",gap:6,fontSize:8,color:T.muted,marginTop:1}}>
                <span>Lead:{tot}</span><span style={{color:T.green}}>✓{g}</span><span style={{color:T.accent}}>{conv}%</span><span style={{color:T.cyan}}>KPI:{kpi}</span>
              </div>
            </div>
            {perm.canFin&&<span style={{fontSize:9,fontWeight:700,color:T.green,flexShrink:0}}>{fmtMs(inc)}</span>}
          </div>
        ))}
        {teamStats.length===0&&<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:16}}>Ma'lumot yo'q</div>}
      </div>

      {/* Country analytics */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>🌍 Mamlakat Tahlili</h3>
        {byCon.map(([c,d],i)=>{
          const maxC=Math.max(...byCon.map(([,x])=>x.count),1);
          return <div key={c} style={{marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2,alignItems:"center"}}>
              <span style={{color:T.sub,fontSize:10,maxWidth:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c}</span>
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                {d.gone>0&&<span style={{fontSize:8,color:T.green,fontWeight:600}}>✓{d.gone}</span>}
                {perm.canFin&&d.revenue>0&&<span style={{fontSize:8,color:T.yellow,fontWeight:600}}>{fmtMs(d.revenue)}</span>}
                <span style={{fontSize:10,fontWeight:700,color:T.text}}>{d.count}</span>
              </div>
            </div>
            <div style={{background:T.border,borderRadius:3,height:4}}><div style={{width:`${(d.count/maxC)*100}%`,background:T.accent,borderRadius:3,height:4}}/></div>
          </div>;
        })}
      </div>
    </div>

    {/* Source analytics full table */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>📣 Manba Tahlili</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
              {["Manba","Leadlar","Shartnoma","Jo'nab","Daromad"].map(h=><th key={h} style={{padding:"4px 6px",textAlign:"left",fontSize:8,fontWeight:600,color:T.muted,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {bySrc.map(([src,d])=>(
                <tr key={src} style={{borderBottom:`1px solid ${T.border}22`}}>
                  <td style={{padding:"5px 6px",color:T.text,fontWeight:600}}>{src}</td>
                  <td style={{padding:"5px 6px",color:T.text}}>{d.count}</td>
                  <td style={{padding:"5px 6px",color:T.green,fontWeight:600}}>{d.contracts}</td>
                  <td style={{padding:"5px 6px",color:T.accent,fontWeight:600}}>{d.gone}</td>
                  <td style={{padding:"5px 6px",color:T.yellow,fontWeight:600}}>{perm.canFin?fmtMs(d.revenue):"–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finance chart */}
      {perm.canFin&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>📊 Oylik Moliya 2026</h3>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",height:90,paddingBottom:18,position:"relative"}}>
          {months.map((m,i)=>(
            <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:72}}>
                <div style={{flex:1,background:`${T.green}88`,borderRadius:"2px 2px 0 0",height:`${(mInc[i]/maxB)*72}px`,minHeight:2,transition:"height 0.3s"}}/>
                <div style={{flex:1,background:`${T.red}88`,borderRadius:"2px 2px 0 0",height:`${(mExp[i]/maxB)*72}px`,minHeight:2}}/>
                <div style={{flex:1,background:`${T.yellow}88`,borderRadius:"2px 2px 0 0",height:`${Math.max(0,mProfit[i]/maxB)*72}px`,minHeight:2}}/>
              </div>
              <span style={{fontSize:8,color:T.muted,position:"absolute",bottom:2}}>{"JFMAM"[i]}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          {[[T.green,"Kirim"],[T.red,"Chiqim"],[T.yellow,"Foyda"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:T.muted}}><div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>)}
        </div>
      </div>}
    </div>

    {/* Time analytics + Due tasks */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>⏱️ Vaqt Tahlili</h3>
        {(()=>{
          const daysBetween=(a,b)=>{if(!a||!b)return null;const d=(new Date(b)-new Date(a))/(86400000);return d>0&&d<1000?Math.round(d):null;};
          const avg=arr=>{const v=arr.filter(x=>x!=null);return v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length):null;};
          const steps=[
            ["📅 Lead → Shartnoma",leads.map(l=>daysBetween(l.createdAt,l.shartnomaSana)),T.accent],
            ["📞 So'ngi aloqa → Shartnoma",leads.map(l=>daysBetween(l.lastCall,l.shartnomaSana)),T.blue||"#3b82f6"],
            ["📄 Shartnoma → Hujjatlar",leads.filter(l=>["Hujjatlar Tayyorlanmoqda","Hujjatlar Jonatildi"].includes(l.status)).map(l=>daysBetween(l.shartnomaSana,l.officeSuhbat)),T.purple||"#8b5cf6"],
            ["💻 Onlayn suhbat → Ofis",leads.map(l=>daysBetween(l.onlaynSuhbat,l.officeSuhbat)),T.cyan||"#06b6d4"],
            ["🏢 Ofis → Shartnoma",leads.map(l=>daysBetween(l.officeSuhbat,l.shartnomaSana)),T.green],
          ];
          return steps.map(([label,arr,c])=>{
            const a=avg(arr); const cnt=arr.filter(x=>x!=null).length;
            return <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
              <div><div style={{fontSize:10,fontWeight:600,color:T.text}}>{label}</div><div style={{fontSize:8,color:T.muted}}>{cnt} ta mijoz asosida</div></div>
              <span style={{fontSize:12,fontWeight:800,color:a?c:T.muted}}>{a?`~${a} kun`:"Ma'lumot yo'q"}</span>
            </div>;
          });
        })()}
        <div style={{marginTop:8,padding:"8px 10px",background:`${T.accent}12`,borderRadius:7,fontSize:9,color:T.muted}}>
          💡 Sanalarni mijoz kartasidagi "📅 Muhim sanalar" bo'limida kiriting
        </div>
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>⚠️ Muddati Yaqin</h3>
        {tasks.filter(t=>t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).slice(0,5).map(t=>{const od=isOD(t.due);const lead=leads.find(l=>l.id===t.leadId);return(
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
            <div style={{display:"flex",gap:7,alignItems:"center"}}><Av id={t.assignee} team={team} size={20}/><div><div style={{fontSize:10,fontWeight:600,color:T.text}}>{t.title}</div>{lead&&<div style={{fontSize:8,color:T.accent}}>{lead.name}</div>}</div></div>
            <span style={{fontSize:9,color:od?T.red:T.yellow,fontWeight:700}}>{od?"⚠️ O'tdi":"⏰ "+fmtD(t.due)}</span>
          </div>
        );})}
        {tasks.filter(t=>t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).length===0&&<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:16}}>Muddati yaqin vazifa yo'q ✅</div>}
      </div>
    </div>
  </div>;
}

export { Dashboard };