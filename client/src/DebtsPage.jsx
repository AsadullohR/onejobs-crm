import { useState } from "react";
import { useT } from "./theme.js";
import { uid, fmtMs, fmtD, isOD, inp, lab, I, Modal, SearchSelect} from "./helpers.jsx";

// ─── DEBTS PAGE ───────────────────────────────────────────────────────────────
function DebtsPage({debts, setDebts, user, leads}) {
  const T=useT();
  const [tab,setTab]=useState("client");
  const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const inpS=inp(T); const labS=lab(T);
  const clientDebts=debts.filter(d=>d.type==="client"&&!d.leadId);
  const companyDebts=debts.filter(d=>d.type==="company");
  const allDebts=[...clientDebts,...companyDebts];
  const addDebt=()=>{
    if(!form.name||!form.amount)return;
    setDebts(p=>[...p,{...form,id:uid(),amount:Number(form.amount),paid:false,createdAt:new Date().toISOString().slice(0,10),by:user.id}]);
    setModal(null);setForm({});
  };
  const togglePaid=id=>setDebts(p=>p.map(d=>d.id===id?{...d,paid:!d.paid}:d));
  const del=id=>setDebts(p=>p.filter(d=>d.id!==id));
  const list=tab==="client"?clientDebts:companyDebts;
  const totalU=list.filter(d=>!d.paid).reduce((s,d)=>s+(d.amount||0),0);
  const totalP=list.filter(d=>d.paid).reduce((s,d)=>s+(d.amount||0),0);
  const overdue=allDebts.filter(d=>!d.paid&&d.dueDate&&isOD(d.dueDate)).reduce((s,d)=>s+(d.amount||0),0);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div><h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Qarzlar Boshqaruvi</h1><p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>Mijoz qarzlari va kompaniya majburiyatlari</p></div>
      <button onClick={()=>{setForm({type:tab,dueDate:"",category:"",desc:""});setModal("add");}} style={{padding:"7px 14px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>+ Qarz qo'shish</button>
    </div>
    {overdue>0&&<div style={{background:`${T.red}12`,border:`1px solid ${T.red}33`,borderRadius:8,padding:"8px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16}}>⚠️</span>
      <div><div style={{fontSize:11,fontWeight:700,color:T.red}}>Muddati o'tgan qarzlar: {fmtMs(overdue)} so'm</div><div style={{fontSize:9,color:T.muted}}>Tezkor chora ko'ring</div></div>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {[[`⚠️ To'lanmagan`,totalU,T.red],[`✓ To'langan`,totalP,T.green]].map(([lb,val,c])=>(
        <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 13px",borderTop:`3px solid ${c}`}}>
          <div style={{fontSize:9,color:T.muted,marginBottom:3,fontWeight:600}}>{lb}</div>
          <div style={{fontSize:17,fontWeight:900,color:c}}>{fmtMs(val)} so'm</div>
        </div>
      ))}
    </div>
    <div style={{display:"flex",gap:0,marginBottom:12,background:T.card2,border:`1px solid ${T.border}`,borderRadius:7,padding:3,width:"fit-content"}}>
      {[["client","👤 Mijoz qarzlari",clientDebts.length],["company","🏢 Kompaniya qarzi",companyDebts.length]].map(([k,l,n])=>(
        <button key={k} onClick={()=>setTab(k)} style={{padding:"5px 14px",borderRadius:5,border:"none",background:tab===k?T.accent:"transparent",color:tab===k?"#fff":T.muted,cursor:"pointer",fontSize:10,fontWeight:tab===k?700:400}}>{l} ({n})</button>
      ))}
    </div>
    {list.sort((a,b)=>(!a.paid&&b.paid)?-1:(a.paid&&!b.paid)?1:0).map(d=>(
      <div key={d.id} style={{background:T.card,border:`1px solid ${d.paid?T.green+"33":T.border}`,borderRadius:8,padding:"10px 13px",marginBottom:6,borderLeft:`3px solid ${d.paid?T.green:T.red}`,opacity:d.paid?0.75:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
              <span style={{fontSize:12,fontWeight:700,color:T.text}}>{d.name}</span>
              {d.paid&&<span style={{fontSize:8,background:`${T.green}22`,color:T.green,border:`1px solid ${T.green}44`,borderRadius:10,padding:"0 5px",fontWeight:700}}>✓ To'langan</span>}
              {!d.paid&&d.dueDate&&isOD(d.dueDate)&&<span style={{fontSize:8,background:`${T.red}22`,color:T.red,borderRadius:10,padding:"0 5px",fontWeight:700}}>⚠️ Muddati o'tgan</span>}
            </div>
            {d.desc&&<div style={{fontSize:9,color:T.muted,marginBottom:2}}>{d.desc}</div>}
            <div style={{display:"flex",gap:8}}>
              {d.category&&<span style={{fontSize:8,background:T.card2,color:T.sub,border:`1px solid ${T.border}`,borderRadius:3,padding:"1px 5px"}}>{d.category}</span>}
              {d.dueDate&&<span style={{fontSize:8,color:isOD(d.dueDate)?T.red:T.muted}}>📅 {fmtD(d.dueDate)}</span>}
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
            <div style={{fontSize:15,fontWeight:900,color:d.paid?T.green:T.red,marginBottom:4}}>{fmtMs(d.amount)} so'm</div>
            <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
              <button onClick={()=>togglePaid(d.id)} style={{padding:"3px 8px",borderRadius:4,background:d.paid?`${T.yellow}22`:`${T.green}22`,color:d.paid?T.yellow:T.green,border:`1px solid ${d.paid?T.yellow+"44":T.green+"44"}`,cursor:"pointer",fontSize:8,fontWeight:600}}>{d.paid?"↩ Qaytarish":"✓ To'landi"}</button>
              <button onClick={()=>del(d.id)} style={{padding:"3px 7px",borderRadius:4,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:8}}>{I.trash}</button>
            </div>
          </div>
        </div>
      </div>
    ))}
    {list.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:T.muted,fontSize:12}}>Qarz yo'q ✅</div>}
    {modal==="add"&&<Modal onClose={()=>setModal(null)} width={420}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Yangi qarz</h3><button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:18}}>✕</button></div>
        <div style={{display:"grid",gap:8}}>
          <div><label style={labS}>Tur</label><select value={form.type||"client"} onChange={e=>f("type",e.target.value)} style={inpS}><option value="client">👤 Mijoz qarzi (bizga qarzdor)</option><option value="company">🏢 Kompaniya qarzi (biz qarzdormiz)</option></select></div>
          <div>
            <label style={labS}>Mijozdan tanlang</label>
            <SearchSelect
              items={[{value:"",label:"– Mavjud mijoz emas",id:"",phone:""},...leads.map(l=>({value:l.id,label:l.name,id:l.id,phone:l.phone}))]}
              value={form.leadId||""}
              onChange={v=>{
                const lead=leads.find(l=>l.id===v);
                setForm(p=>({...p,leadId:v,name:lead?lead.name:p.name}));
              }}
              placeholder="Mijozni qidiring..."
            />
          </div>
          <div><label style={labS}>Ism / Kompaniya *</label>
            <input value={form.name||""} onChange={e=>f("name",e.target.value)} style={inpS} placeholder="Yoki qo'lda kiriting..."/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            <div><label style={labS}>Miqdor *</label><input type="number" value={form.amount||""} onChange={e=>f("amount",e.target.value)} style={inpS} placeholder="1000000"/></div>
            <div><label style={labS}>Muddat</label><input type="date" value={form.dueDate||""} onChange={e=>f("dueDate",e.target.value)} style={inpS}/></div>
          </div>
          <div><label style={labS}>Kategoriya</label><select value={form.category||""} onChange={e=>f("category",e.target.value)} style={inpS}><option value="">– Tanlang</option>{(form.type==="client"?["1-Qism","2-Qism","3-Qism","XBA To'lov","Konsultatsiya","Boshqa"]:["Hamkor to'lovi","Hujjat xizmati","Elchixona","Tarjimon","Tibbiy","Reklama","Ofis ijara","Boshqa"]).map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={labS}>Tavsif</label><textarea value={form.desc||""} onChange={e=>f("desc",e.target.value)} rows={2} style={{...inpS,resize:"vertical"}} placeholder="Qarz sababi..."/></div>
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:12}}>
          <button onClick={()=>setModal(null)} style={{padding:"6px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:10}}>Bekor</button>
          <button onClick={addDebt} style={{padding:"6px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:10}}>💾 Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

export { DebtsPage };