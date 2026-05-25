import { useState } from "react";
import { useT } from "./theme.js";
import { uid, fmtMs, inp, I, Av, fmtD } from "./helpers.jsx";

// ─── SALARY PAGE ─────────────────────────────────────────────────────────────
function SalaryPage({team, txns, setTxns, user}) {
  const T=useT();
  const inpS=inp(T);
  const todayStr = new Date().toISOString().slice(0,7);
  const [selMonth,setSelMonth]=useState(todayStr);
  const [expanded,setExpanded]=useState({}); // empId → bool (open by default for first)
  const [editId,setEditId]=useState(null);
  const [editVal,setEditVal]=useState({});
  const [newRow,setNewRow]=useState({}); // empId → {cat,desc,amount,date}

  const SAL_CATS=["Oylik maosh","Avans","Bonus","KPI","Jarima","Boshqa"];
  const DOT={
    "Oylik maosh":"#ef4444","Maosh":"#ef4444",
    "Avans":"#f59e0b","Bonus":"#22c55e","KPI":"#8b5cf6",
    "Jarima":"#ec4899","Boshqa":"#94a3b8"
  };
  const ROLE_LABEL={admin:"Admin",manager:"Menejer",sales:"Sotuv/Call",docs:"Hujjatchi",partner:"Hamkor"};

  const allSal=txns.filter(t=>t.type==="expense"&&(SAL_CATS.includes(t.cat)||["Maosh","Avans","Bonus","KPI"].includes(t.cat)));
  const monthSal=selMonth?allSal.filter(t=>t.date?.startsWith(selMonth)):allSal;
  const thisMonthTotal=monthSal.reduce((s,t)=>s+t.amount,0);
  const allTimeTotal=allSal.reduce((s,t)=>s+t.amount,0);
  const emps=team.filter(t=>t.role!=="partner");
  const avgPerEmp=emps.length>0?Math.round(thisMonthTotal/emps.length):0;

  const exportCSV=()=>{
    const h="Xodim,Kategoriya,Miqdor,Sana,Izoh";
    const rows=monthSal.map(t=>{const e=team.find(x=>x.id===t.empId)||{name:t.empName||""};return[e.name,t.cat,t.amount,t.date,t.desc||""].join(",");});
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([h+"\n"+rows.join("\n")],{type:"text/csv"}));a.download=`maosh_${selMonth}.csv`;a.click();
  };

  const addTxn=(empId)=>{
    const r=newRow[empId]||{};
    if(!r.amount||Number(r.amount)<=0)return;
    const emp=team.find(t=>t.id===empId);
    setTxns(p=>[...p,{id:uid(),leadId:null,empId,empName:emp?.name||"",type:"expense",
      cat:r.cat||"Oylik maosh",desc:r.desc||r.cat||"Oylik maosh",
      amount:Number(r.amount),date:r.date||selMonth+"-01",by:user.id}]);
    setNewRow(p=>({...p,[empId]:{}}));
  };

  const saveEdit=(txnId)=>{
    setTxns(p=>p.map(t=>t.id===txnId?{...t,desc:editVal.desc??t.desc,amount:Number(editVal.amount)||t.amount,date:editVal.date||t.date,cat:editVal.cat||t.cat}:t));
    setEditId(null);setEditVal({});
  };

  const delTxn=(txnId)=>{if(!window.confirm("O'chirilsinmi?"))return;setTxns(p=>p.filter(t=>t.id!==txnId));};
  const delAllMonth=(empId,empTxns)=>{if(!window.confirm("Bu xodimning bu oydagi barcha to'lovlari o'chirilsinmi?"))return;const ids=empTxns.map(x=>x.id);setTxns(p=>p.filter(t=>!ids.includes(t.id)));};

  return <div style={{maxWidth:960,margin:"0 auto"}}>
    {/* ── HEADER ── */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <h1 style={{fontSize:20,fontWeight:900,color:T.text,margin:0}}>Xodimlar Xarajatlari</h1>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <input type="month" value={selMonth} onChange={e=>setSelMonth(e.target.value)}
          style={{...inpS,width:"auto",fontSize:11,padding:"5px 10px"}}/>
        <button onClick={exportCSV}
          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.card,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:11,fontWeight:700}}>
          ⬇ CSV
        </button>
      </div>
    </div>

    {/* ── KPI CARDS ── */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
      {[
        ["⚙️","BU OY XARAJAT",   fmtMs(thisMonthTotal)+" so'm", T.red],
        ["📅","BARCHA VAQT",      fmtMs(allTimeTotal)+" so'm",   T.red],
        ["👥","XODIMLAR SONI",    emps.length+" ta",              T.text],
        ["📊","O'RTACHA (BU OY)", fmtMs(avgPerEmp)+" so'm",      T.text],
      ].map(([ic,lb,val,c])=>(
        <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <span style={{fontSize:8,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",lineHeight:1.4}}>{lb}</span>
            <span style={{fontSize:18,opacity:.5}}>{ic}</span>
          </div>
          <div style={{fontSize:20,fontWeight:900,color:c,lineHeight:1}}>{val}</div>
        </div>
      ))}
    </div>

    {/* ── EMPLOYEE ROWS ── */}
    {emps.map(t=>{
      const empTxns=monthSal.filter(x=>x.empId===t.id||x.empName===t.name);
      const monthTotal=empTxns.reduce((s,x)=>s+x.amount,0);
      const open=expanded[t.id]!==false; // open by default
      const nr=newRow[t.id]||{};

      return <div key={t.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:10,overflow:"hidden",boxShadow:open?T.shadow:"none"}}>

        {/* Employee header — click to toggle */}
        <div onClick={()=>setExpanded(p=>({...p,[t.id]:!open}))} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",cursor:"pointer",userSelect:"none",borderBottom:open?`1px solid ${T.border}`:"none"}}>
          <Av id={t.id} team={[t]} size={42}/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:T.text}}>{t.name}</div>
            <div style={{fontSize:11,color:T.muted}}>{ROLE_LABEL[t.role]||t.role}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:T.muted,marginBottom:2}}>Bu oy</div>
            <div style={{fontSize:16,fontWeight:900,color:monthTotal>0?T.red:T.muted}}>{monthTotal>0?`-${fmtMs(monthTotal)} so'm`:"—"}</div>
          </div>
          <span style={{fontSize:11,color:T.muted,marginLeft:6}}>{open?"▲":"▼"}</span>
        </div>

        {/* Expanded content */}
        {open&&<div style={{padding:"16px 20px"}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:12}}>Maosh elementlari</div>

          {/* Existing transaction rows */}
          {empTxns.map(x=>(
            <div key={x.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",marginBottom:5,background:T.card2,borderRadius:8,border:`1px solid ${T.border}`}}>
              <span style={{width:9,height:9,borderRadius:"50%",background:DOT[x.cat]||T.muted,flexShrink:0}}/>
              {editId===x.id
                ? <input value={editVal.desc??x.desc??x.cat} onChange={e=>setEditVal(p=>({...p,desc:e.target.value}))}
                    style={{...inpS,flex:1,padding:"4px 8px",fontSize:11}} autoFocus
                    onKeyDown={e=>{if(e.key==="Enter")saveEdit(x.id);if(e.key==="Escape"){setEditId(null);setEditVal({});}}}/>
                : <span style={{flex:1,fontSize:11,color:T.text}}>{x.desc||x.cat}</span>}
              {editId===x.id
                ? <input type="number" value={editVal.amount??x.amount}
                    onChange={e=>setEditVal(p=>({...p,amount:e.target.value}))}
                    style={{...inpS,width:120,padding:"4px 8px",fontSize:11,textAlign:"right"}}
                    onKeyDown={e=>{if(e.key==="Enter")saveEdit(x.id);}}/>
                : <span style={{fontSize:11,color:T.muted,minWidth:100,textAlign:"right"}}>{x.amount.toLocaleString()}</span>}
              <span style={{fontSize:10,color:T.muted,minWidth:82,textAlign:"center",flexShrink:0}}>{x.date}</span>
              <span style={{fontSize:12,fontWeight:800,color:T.red,minWidth:100,textAlign:"right",flexShrink:0}}>-{fmtMs(x.amount)} so'm</span>
              {editId===x.id
                ? <div style={{display:"flex",gap:4,flexShrink:0}}>
                    <button onClick={()=>saveEdit(x.id)} style={{padding:"4px 11px",borderRadius:5,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:10,fontWeight:700}}>✓</button>
                    <button onClick={()=>{setEditId(null);setEditVal({});}} style={{padding:"4px 9px",borderRadius:5,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:10}}>✕</button>
                  </div>
                : <button onClick={e=>{e.stopPropagation();delTxn(x.id);}}
                    style={{padding:"4px 12px",borderRadius:6,background:`${T.red}15`,color:T.red,border:`1px solid ${T.red}33`,cursor:"pointer",fontSize:10,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
                    🗑 O'chirish
                  </button>}
            </div>
          ))}

          {/* Inline add row  */}
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:10,padding:"8px 12px",background:`${T.accent}08`,borderRadius:8,border:`1px dashed ${T.accent}44`}}>
            <input value={nr.desc||""} onChange={e=>setNewRow(p=>({...p,[t.id]:{...nr,desc:e.target.value}}))}
              placeholder="Xarajat nomi (Maosh, Bonus ...)"
              style={{...inpS,flex:1,padding:"5px 9px",fontSize:11}}
              onKeyDown={e=>e.key==="Enter"&&addTxn(t.id)}/>
            <input type="number" value={nr.amount||""} onChange={e=>setNewRow(p=>({...p,[t.id]:{...nr,amount:e.target.value}}))}
              placeholder="Miqdor"
              style={{...inpS,width:130,padding:"5px 9px",fontSize:11,textAlign:"right"}}
              onKeyDown={e=>e.key==="Enter"&&addTxn(t.id)}/>
            <button onClick={()=>addTxn(t.id)}
              style={{padding:"5px 14px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11,whiteSpace:"nowrap",flexShrink:0}}>
              + Qo'shish
            </button>
          </div>

          {/* Footer actions */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
            <div style={{display:"flex",gap:7}}>
              <button
                onClick={()=>{
                  if(empTxns.length===0){
                    // No items yet — focus the add row
                    setNewRow(p=>({...p,[t.id]:{cat:"Oylik maosh",...(p[t.id]||{})}}));
                  } else {
                    // Edit first item
                    const first=empTxns[0];
                    setEditId(first.id);setEditVal({desc:first.desc,amount:first.amount,date:first.date,cat:first.cat});
                  }
                }}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:`${T.accent}15`,color:T.accent,border:`1px solid ${T.accent}33`,cursor:"pointer",fontSize:11,fontWeight:700}}>
                ✏️ Tahrirlash
              </button>
              <button onClick={()=>delAllMonth(t.id,empTxns)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:`${T.red}15`,color:T.red,border:`1px solid ${T.red}33`,cursor:"pointer",fontSize:11,fontWeight:700}}>
                🗑 O'chirish
              </button>
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{fontSize:10,color:T.muted,marginRight:10}}>Bu oy jami:</span>
              <span style={{fontSize:16,fontWeight:900,color:T.red}}>{fmtMs(monthTotal)} so'm</span>
            </div>
          </div>
        </div>}
      </div>;
    })}
  </div>;
}

export { SalaryPage };