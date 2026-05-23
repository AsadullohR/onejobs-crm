import { useState } from "react";
import { useT } from "./theme.js";
import { uid, fmtD, isOD, isSoon, inp, lab, I, Av, Modal } from "./helpers.jsx";

// ─── TASKS PAGE ───────────────────────────────────────────────────────────────
function Tasks({tasks, setTasks, leads, user, team, roles}) {
  const T=useT();
  const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const PC={high:T.red,medium:T.yellow,low:T.green};
  const COLS={todo:{l:"📋 Bajarilmagan",c:T.accent},inprogress:{l:"⚡ Jarayonda",c:T.blue},done:{l:"✅ Bajarildi",c:T.green}};
  const perm=roles[user.role]||{};
  const mine=perm.canCfg?tasks:tasks.filter(t=>t.assignee===user.id||t.createdBy===user.id);
  const save=()=>{if(!form.title)return;setTasks(p=>p.some(t=>t.id===form.id)?p.map(t=>t.id===form.id?form:t):[...p,{...form,id:uid(),createdBy:user.id,at:new Date().toISOString()}]);setModal(null);};
  const inpS=inp(T); const labS=lab(T);
  const leadOpts=leads.map(l=>({value:l.id,label:l.name,id:l.id,phone:l.phone}));
  const teamOpts=team.filter(t=>t.role!=="partner"&&t.active!==false).map(t=>({value:t.id,label:t.name,id:t.id,phone:t.phone}));
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Vazifalar</h1>
      <button onClick={()=>{setForm({title:"",desc:"",assignee:user.id,leadId:"",priority:"medium",status:"todo",due:""});setModal("form");}} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Qo'shish</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      {Object.entries(COLS).map(([sk,sv])=>{
        const col=mine.filter(t=>t.status===sk).sort((a,b)=>new Date(a.due||"9999")-new Date(b.due||"9999"));
        return <div key={sk}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:`${sv.c}${T.dark?"22":"15"}`,border:`1px solid ${sv.c}44`,borderRadius:"8px 8px 0 0"}}>
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>{sv.l}</span>
            <span style={{fontSize:11,fontWeight:700,background:`${sv.c}22`,color:sv.c,borderRadius:10,padding:"0 6px",border:`1px solid ${sv.c}44`}}>{col.length}</span>
          </div>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"0 0 8px 8px",padding:7,minHeight:130}}>
            {col.map(t=>{const od=isOD(t.due)&&t.status!=="done"; const ds=isSoon(t.due)&&!od; const lead=leads.find(l=>l.id===t.leadId);
              return <div key={t.id} style={{background:T.card2,borderRadius:7,padding:8,marginBottom:5,border:`1px solid ${od?T.red+"44":ds?T.yellow+"44":T.border}`,borderLeft:`3px solid ${od?T.red:ds?T.yellow:PC[t.priority]||T.accent}`,cursor:"pointer"}} onClick={()=>{setForm({...t});setModal("form");}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:3,marginBottom:2}}><span style={{fontSize:11,fontWeight:600,color:T.text,textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</span><Av id={t.assignee} team={team} size={16}/></div>
                {t.desc&&<div style={{fontSize:9,color:T.muted,marginBottom:3}}>{t.desc}</div>}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:8,color:PC[t.priority]||T.accent,fontWeight:700}}>{t.priority==="high"?"⚠️":t.priority==="low"?"📎":"📌"}</span>
                  {t.due&&<span style={{fontSize:8,color:od?T.red:ds?T.yellow:T.muted,fontWeight:od||ds?700:400}}>{fmtD(t.due)}{od?" ⚠️":ds?" ⏰":""}</span>}
                  {lead&&<span style={{fontSize:8,color:T.accent,background:`${T.accent}22`,borderRadius:3,padding:"0 3px"}}>{lead.name}</span>}
                </div>
              </div>;
            })}
            {col.length===0&&<div style={{color:T.border,fontSize:9,textAlign:"center",padding:12}}>–</div>}
          </div>
        </div>;
      })}
    </div>
    {modal==="form"&&<Modal onClose={()=>setModal(null)} width={440}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Vazifa</h3><button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button></div>
        <div style={{display:"grid",gap:8}}>
          <div><label style={labS}>Nomi *</label><input value={form.title||""} onChange={e=>f("title",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Tavsif</label><textarea value={form.desc||""} onChange={e=>f("desc",e.target.value)} rows={2} style={{...inpS,resize:"vertical"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={labS}>Mas'ul</label><SearchSelect items={teamOpts} value={form.assignee||user.id} onChange={v=>f("assignee",Number(v))} placeholder="Mas'ul"/></div>
            <div><label style={labS}>Muhimlik</label><select value={form.priority||"medium"} onChange={e=>f("priority",e.target.value)} style={inpS}><option value="high">⚠️ Yuqori</option><option value="medium">📌 O'rta</option><option value="low">📎 Past</option></select></div>
            <div><label style={labS}>Holat</label><select value={form.status||"todo"} onChange={e=>f("status",e.target.value)} style={inpS}><option value="todo">Bajarilmagan</option><option value="inprogress">Jarayonda</option><option value="done">Bajarildi</option></select></div>
            <div><label style={labS}>Muddati</label><input type="date" value={form.due||""} onChange={e=>f("due",e.target.value)} style={inpS}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={labS}>Bog'liq mijoz</label><SearchSelect items={[{value:"",label:"Umumiy vazifa",id:"",phone:""},...leads.map(l=>({value:l.id,label:l.name,id:l.id,phone:l.phone}))]} value={form.leadId||""} onChange={v=>f("leadId",v)} placeholder="Umumiy vazifa"/></div>
          </div>
        </div>
        <div style={{display:"flex",gap:7,justifyContent:"flex-end",marginTop:12}}>
          {tasks.some(t=>t.id===form.id)&&<button onClick={()=>{setTasks(p=>p.filter(t=>t.id!==form.id));setModal(null);}} style={{padding:"7px 10px",borderRadius:6,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:11,fontWeight:600}}>O'chirish</button>}
          <button onClick={()=>setModal(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={save} style={{padding:"7px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

export { Tasks };
