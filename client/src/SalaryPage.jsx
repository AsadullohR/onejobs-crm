import { useState } from "react";
import { useT } from "./theme.js";
import { uid, fmtMs, inp, I, Av, fmtD, MoneyInput } from "./helpers.jsx";
import { txnAPI } from "./api.js";
import { isPayrollTxn } from "./constants.js";

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

  // What counts as payroll:
  //  • never tied to a client lead (that excludes client-side costs), AND
  //  • either explicitly attached to an employee, or carrying a real salary
  //    reason. "Boshqa" is a catch-all, so a general company expense (rent,
  //    marketing) recorded as "Boshqa" with nobody attached is NOT payroll —
  //    it only counts once someone assigns it to an employee.
  const allSal=txns.filter(isPayrollTxn);
  const monthSal=selMonth?allSal.filter(t=>t.date?.startsWith(selMonth)):allSal;
  const thisMonthTotal=monthSal.reduce((s,t)=>s+Number(t.amount||0),0);
  const allTimeTotal=allSal.reduce((s,t)=>s+Number(t.amount||0),0);
  const emps=team.filter(t=>!["partner","employer"].includes(t.role));
  const avgPerEmp=emps.length>0?Math.round(thisMonthTotal/emps.length):0;

  const exportCSV=()=>{
    const h="Xodim,Kategoriya,Miqdor,Sana,Izoh";
    const rows=monthSal.map(t=>{const e=team.find(x=>x.id===t.empId)||{name:t.empName||""};return[e.name,t.cat,t.amount,t.date,t.desc||""].join(",");});
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([h+"\n"+rows.join("\n")],{type:"text/csv"}));a.download=`maosh_${selMonth}.csv`;a.click();
  };

  const addTxn=async(empId)=>{
    const r=newRow[empId]||{};
    if(!r.amount||Number(r.amount)<=0){alert("Miqdorni kiriting (0 dan katta).");return;}
    const emp=team.find(t=>t.id===empId);
    const payload={leadId:null,empId,empName:emp?.name||"",type:"expense",
      category:r.cat||"Oylik maosh",description:r.desc||r.cat||"Oylik maosh",
      amount:Number(r.amount),date:r.date||selMonth+"-01",createdBy:user.id,
      paymentMethod:r.paymentMethod||"cash", source:r.source||"balance"};
    try {
      const saved=await txnAPI.create(payload);
      // Fall back to what we sent: if the API build in front of us is older and
      // doesn't return emp_id yet, the row would otherwise appear under nobody.
      // Postgres returns NUMERIC as a STRING via node-postgres. Spreading the
      // raw response left amount as a string, so every total did string
      // concatenation instead of addition ("8850000"+"2200000" reading as
      // 88,500,002,200,000). Always normalise at this boundary.
      setTxns(p=>[...p,{...saved,id:String(saved.id),amount:Number(saved.amount)||0,
        cat:saved.category,desc:saved.description,by:saved.created_by,leadId:saved.lead_id,
        empId:saved.emp_id??empId, empName:saved.emp_name??(emp?.name||"")}]);
    } catch(e){ alert("Saqlashda xatolik: "+e.message); return; }
    setNewRow(p=>({...p,[empId]:{}}));
  };

  // Salary rows that match no employee — money counted in the totals but shown
  // under nobody. Usually payments saved before emp_id was persisted.
  const assignTxnTo=async(txnId,empId)=>{
    const emp=team.find(t=>t.id===Number(empId));
    const x=txns.find(t=>t.id===txnId);
    if(!emp||!x)return;
    try {
      const saved=await txnAPI.update(txnId,{leadId:x.leadId||null,date:x.date,type:x.type,
        category:x.cat,description:x.desc,amount:x.amount,paymentMethod:x.paymentMethod||"cash",
        empId:emp.id,empName:emp.name});
      setTxns(p=>p.map(t=>t.id===txnId?{...t,empId:saved?.emp_id??emp.id,empName:saved?.emp_name??emp.name}:t));
    } catch(e){ alert("Xatolik: "+e.message); }
  };

  const saveEdit=async(txnId)=>{
    const t=txns.find(x=>x.id===txnId);
    const payload={...t,category:editVal.cat||t.cat,description:editVal.desc??t.desc,amount:Number(editVal.amount)||t.amount,date:editVal.date||t.date};
    try {
      const saved=await txnAPI.update(txnId,payload);
      setTxns(p=>p.map(x=>x.id===txnId?{...saved,id:String(saved.id),amount:Number(saved.amount)||0,
        cat:saved.category,desc:saved.description,by:saved.created_by,leadId:saved.lead_id}:x));
    } catch(e){ alert("Xatolik: "+e.message); return; }
    setEditId(null);setEditVal({});
  };

  const delTxn=async(txnId)=>{
    if(!window.confirm("O'chirilsinmi?"))return;
    try { await txnAPI.delete(txnId); } catch(e){ alert("Xatolik: "+e.message); return; }
    setTxns(p=>p.filter(t=>t.id!==txnId));
  };
  const delAllMonth=async(empId,empTxns)=>{
    if(!window.confirm("Bu xodimning bu oydagi barcha to'lovlari o'chirilsinmi?"))return;
    for(const t of empTxns){ try{ await txnAPI.delete(t.id); }catch(e){} }
    const ids=empTxns.map(x=>x.id);setTxns(p=>p.filter(t=>!ids.includes(t.id)));
  };

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

    {/* ── UNASSIGNED SALARY ROWS ──
        Without this the page silently disagrees with itself: the totals above
        include these amounts while every employee card shows 0. */}
    {(()=>{
      const idSet=new Set(emps.map(e=>e.id)), nameSet=new Set(emps.map(e=>e.name));
      const orphans=monthSal.filter(x=>!(x.empId&&idSet.has(x.empId))&&!(x.empName&&nameSet.has(x.empName)));
      if(!orphans.length)return null;
      const oTotal=orphans.reduce((s,x)=>s+Number(x.amount||0),0);
      return <div style={{background:T.card,border:`1px solid ${T.yellow}55`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,color:T.text}}>Xodimga biriktirilmagan to'lovlar</div>
            <div style={{fontSize:10,color:T.muted,marginTop:2}}>
              Bu summalar yuqoridagi umumiy xarajatga kiradi, lekin hech bir xodimga bog'lanmagan.
              Ro'yxatdan xodimni tanlang — to'lov o'sha xodimga o'tadi.
            </div>
          </div>
          <div style={{fontSize:15,fontWeight:900,color:T.yellow}}>{fmtMs(oTotal)} so'm</div>
        </div>
        <div style={{padding:"12px 20px"}}>
          {orphans.map(x=>(
            <div key={x.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",marginBottom:5,background:T.card2,borderRadius:8,border:`1px solid ${T.border}`,flexWrap:"wrap"}}>
              <span style={{width:9,height:9,borderRadius:"50%",background:DOT[x.cat]||T.muted,flexShrink:0}}/>
              <span style={{fontSize:9,fontWeight:700,color:DOT[x.cat]||T.muted,background:`${DOT[x.cat]||T.muted}18`,
                border:`1px solid ${DOT[x.cat]||T.muted}44`,borderRadius:4,padding:"2px 6px",whiteSpace:"nowrap"}}>{x.cat||"—"}</span>
              <span style={{flex:1,minWidth:100,fontSize:11,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.desc||"—"}</span>
              <span style={{fontSize:10,color:T.muted,minWidth:82,textAlign:"center"}}>{x.date}</span>
              <span style={{fontSize:12,fontWeight:800,color:T.red,minWidth:100,textAlign:"right"}}>-{fmtMs(x.amount)} so'm</span>
              <select defaultValue="" onChange={e=>e.target.value&&assignTxnTo(x.id,e.target.value)}
                style={{...inpS,width:150,padding:"4px 8px",fontSize:10,flexShrink:0}}>
                <option value="">→ Xodimni tanlang</option>
                {emps.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button onClick={()=>delTxn(x.id)}
                style={{padding:"4px 10px",borderRadius:6,background:`${T.red}15`,color:T.red,border:`1px solid ${T.red}33`,cursor:"pointer",fontSize:10,fontWeight:600,flexShrink:0}}>🗑</button>
            </div>
          ))}
        </div>
      </div>;
    })()}

    {/* ── EMPLOYEE ROWS ── */}
    {emps.map(t=>{
      const empTxns=monthSal.filter(x=>x.empId===t.id||x.empName===t.name);
      const monthTotal=empTxns.reduce((s,x)=>s+Number(x.amount||0),0);
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
              {/* Reason of payment, visible on every row */}
              {editId===x.id
                ? <select value={editVal.cat??x.cat} onChange={e=>setEditVal(p=>({...p,cat:e.target.value}))}
                    style={{...inpS,width:120,padding:"4px 6px",fontSize:10,flexShrink:0}}>
                    {SAL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                : <span style={{fontSize:9,fontWeight:700,color:DOT[x.cat]||T.muted,background:`${DOT[x.cat]||T.muted}18`,
                    border:`1px solid ${DOT[x.cat]||T.muted}44`,borderRadius:4,padding:"2px 6px",whiteSpace:"nowrap",flexShrink:0}}>
                    {x.cat||"—"}
                  </span>}
              {editId===x.id
                ? <input value={editVal.desc??x.desc??""} onChange={e=>setEditVal(p=>({...p,desc:e.target.value}))}
                    style={{...inpS,flex:1,padding:"4px 8px",fontSize:11}} autoFocus placeholder="Izoh"
                    onKeyDown={e=>{if(e.key==="Enter")saveEdit(x.id);if(e.key==="Escape"){setEditId(null);setEditVal({});}}}/>
                : <span style={{flex:1,fontSize:11,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.desc||"—"}</span>}
              {editId===x.id
                ? <MoneyInput value={editVal.amount??x.amount}
                    onChange={v=>setEditVal(p=>({...p,amount:v}))}
                    style={{...inpS,width:120,padding:"4px 8px",fontSize:11,textAlign:"right"}}
                    onKeyDown={e=>{if(e.key==="Enter")saveEdit(x.id);}}/>
                : <span style={{fontSize:11,color:T.muted,minWidth:100,textAlign:"right"}}>{x.amount.toLocaleString()}</span>}
              <span style={{fontSize:9,color:T.muted,flexShrink:0,whiteSpace:"nowrap"}}
                title={x.source==="confirmed"?"Tasdiqlangan foydadan":"Balansdan"}>
                {(x.paymentMethod||x.payment_method)==="bank"?"🏦":"💵"}{x.source==="confirmed"?"💰":""}
              </span>
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
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:10,padding:"8px 12px",background:`${T.accent}08`,borderRadius:8,border:`1px dashed ${T.accent}44`,flexWrap:"wrap"}}>
            {/* Reason of payment — without this every row silently defaulted
                to "Oylik maosh" and Bonus/KPI/Jarima could never be recorded. */}
            <select value={nr.cat||"Oylik maosh"} onChange={e=>setNewRow(p=>({...p,[t.id]:{...nr,cat:e.target.value}}))}
              style={{...inpS,width:130,padding:"5px 9px",fontSize:11,flexShrink:0}}>
              {SAL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <input value={nr.desc||""} onChange={e=>setNewRow(p=>({...p,[t.id]:{...nr,desc:e.target.value}}))}
              placeholder="Izoh (ixtiyoriy)"
              style={{...inpS,flex:1,minWidth:120,padding:"5px 9px",fontSize:11}}
              onKeyDown={e=>e.key==="Enter"&&addTxn(t.id)}/>
            <input type="date" value={nr.date||selMonth+"-01"} onChange={e=>setNewRow(p=>({...p,[t.id]:{...nr,date:e.target.value}}))}
              style={{...inpS,width:135,padding:"5px 9px",fontSize:11,flexShrink:0}}/>
            <select value={nr.source||"balance"} onChange={e=>setNewRow(p=>({...p,[t.id]:{...nr,source:e.target.value}}))}
              title="Qaysi hisobdan"
              style={{...inpS,width:110,padding:"5px 6px",fontSize:10,flexShrink:0}}>
              <option value="balance">⚖️ Balans</option>
              <option value="confirmed">💰 Tasdiq.</option>
            </select>
            <select value={nr.paymentMethod||"cash"} onChange={e=>setNewRow(p=>({...p,[t.id]:{...nr,paymentMethod:e.target.value}}))}
              style={{...inpS,width:95,padding:"5px 6px",fontSize:10,flexShrink:0}}>
              <option value="cash">💵 Naqd</option>
              <option value="bank">🏦 Bank</option>
            </select>
            <MoneyInput value={nr.amount||""} onChange={v=>setNewRow(p=>({...p,[t.id]:{...nr,amount:v}}))}
              placeholder="Miqdor"
              style={{...inpS,width:120,padding:"5px 9px",fontSize:11,textAlign:"right",flexShrink:0}}
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
              {empTxns.length>0&&(
                <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginBottom:4,flexWrap:"wrap"}}>
                  {Object.entries(empTxns.reduce((a,x)=>{a[x.cat]=(a[x.cat]||0)+Number(x.amount||0);return a;},{}))
                    .map(([c,v])=>(
                      <span key={c} style={{fontSize:9,color:DOT[c]||T.muted,background:`${DOT[c]||T.muted}15`,
                        border:`1px solid ${DOT[c]||T.muted}33`,borderRadius:4,padding:"1px 5px",whiteSpace:"nowrap"}}>
                        {c}: {fmtMs(v)}
                      </span>
                    ))}
                </div>
              )}
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