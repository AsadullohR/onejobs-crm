import { useState } from "react";
import { useT } from "./theme.js";
import { uid, fmtD, isOD, isSoon, inp, lab, I, Av, Modal, SearchSelect } from "./helpers.jsx";
import { tasksAPI } from "./api.js";

function Tasks({tasks, setTasks, leads, user, team, roles, addNotif, open}) {
  const T=useT();
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const [dragTaskId,setDragTaskId]=useState(null);
  const [dragTaskOver,setDragTaskOver]=useState(null);

  // ── Filters ──────────────────────────────────────────────
  const [fAssignee,setFAssignee]=useState("");
  const [fDateFrom,setFDateFrom]=useState("");
  const [fDateTo,setFDateTo]=useState("");
  const [fStatus,setFStatus]=useState("");
  const [fDatePreset,setFDatePreset]=useState("");   // today|week|month|custom|""

  const PC={high:T.red,medium:T.yellow,low:T.green};
  const COLS={
    todo:{l:"📋 Bajarilmagan",c:T.accent},
    inprogress:{l:"⚡ Jarayonda",c:T.blue},
    done:{l:"✅ Bajarildi",c:T.green}
  };

  // All tasks visible to everyone; filters applied on top
  const filtered = tasks.filter(t=>{
    if(fAssignee && String(t.assignee)!==String(fAssignee)) return false;
    if(fStatus && t.status!==fStatus) return false;
    if(fDateFrom && t.due && t.due < fDateFrom) return false;
    if(fDateTo   && t.due && t.due > fDateTo)   return false;
    return true;
  });

  // Resolve date preset to [from, to]
  const today = new Date().toISOString().slice(0,10);
  const weekAgo = new Date(Date.now()-6*86400000).toISOString().slice(0,10);
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01`;
  const applyPreset = (preset) => {
    setFDatePreset(preset);
    if(preset==="today") { setFDateFrom(today); setFDateTo(today); }
    else if(preset==="week") { setFDateFrom(weekAgo); setFDateTo(today); }
    else if(preset==="month") { setFDateFrom(monthStart); setFDateTo(today); }
    else if(preset==="custom") { /* keep existing */ }
    else { setFDateFrom(""); setFDateTo(""); }
  };

  const save = async () => {
    if(!form.title) return;
    // isNew: form.id must be a numeric DB id (not a temp uid) to be an update
    const isDBId = /^\d+$/.test(String(form.id||""));
    const isNew = !isDBId;
    const tempId = form.id && !isDBId ? form.id : uid(); // reuse temp id if retrying unsaved task
    const taskData = {...form, id: isDBId ? form.id : tempId, createdBy:user.id, at: form.at||new Date().toISOString()};

    // Optimistic update — replace temp-id task if retrying, otherwise add or update
    setTasks(p=>{
      const exists = p.some(t=>t.id===taskData.id);
      return exists ? p.map(t=>t.id===taskData.id?taskData:t) : [...p,taskData];
    });
    if(isNew && addNotif){
      const who = team.find(u=>u.id===taskData.assignee)?.name||'?';
      const supervisors = team.filter(u=>u.role==="admin"||u.role==="manager").map(u=>u.id);
      const recipients = [...new Set([taskData.assignee, ...supervisors])];
      addNotif(`📋 Yangi vazifa: ${taskData.title} → ${who}`, "info", recipients);
    }
    setModal(null);

    try {
      if(isNew){
        const saved = await tasksAPI.create({
          title:taskData.title, description:taskData.desc||'',
          assignee:taskData.assignee, leadId:taskData.leadId||null,
          priority:taskData.priority||'medium', status:taskData.status||'todo',
          dueDate:taskData.due||null,
        });
        setTasks(p=>p.map(t=>t.id===taskData.id?{...t,id:String(saved.id)}:t));
      } else {
        await tasksAPI.update(taskData.id,{
          title:taskData.title, description:taskData.desc||'',
          assignee:taskData.assignee, leadId:taskData.leadId||null,
          priority:taskData.priority||'medium', status:taskData.status||'todo',
          dueDate:taskData.due||null,
        });
      }
    } catch(err){ console.warn('Task sync failed:', err.message); }
  };

  const remove = async (id) => {
    setTasks(p=>p.filter(t=>t.id!==id));
    setModal(null);
    try { await tasksAPI.delete(id); } catch(err){ console.warn('Task delete failed:', err.message); }
  };

  const moveTask = async (taskId, newStatus) => {
    const task = tasks.find(t=>t.id===taskId);
    if (!task || task.status===newStatus) return;
    setTasks(p=>p.map(t=>t.id===taskId?{...t,status:newStatus}:t));
    try { await tasksAPI.update(taskId,{title:task.title,description:task.desc||'',assignee:task.assignee,leadId:task.leadId||null,priority:task.priority||'medium',status:newStatus,dueDate:task.due||null}); }
    catch(err){ console.warn('Task status update failed:',err.message); }
  };

  const inpS=inp(T); const labS=lab(T);
  const teamOpts=team.filter(t=>t.role!=="partner"&&t.active!==false).map(t=>({value:t.id,label:t.name,id:t.id,phone:t.phone}));

  return <div>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Vazifalar
        <span style={{fontSize:11,fontWeight:400,color:T.muted,marginLeft:8}}>{filtered.length} ta</span>
      </h1>
      <button onClick={()=>{setForm({title:"",desc:"",assignee:user.id,leadId:"",priority:"medium",status:"todo",due:""});setModal("form");}}
        style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>
        {I.plus} Qo'shish
      </button>
    </div>

    {/* Filters */}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,padding:"9px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8,alignItems:"center"}}>
      <span style={{fontSize:10,color:T.muted,fontWeight:600}}>Filter:</span>
      <select value={fAssignee} onChange={e=>setFAssignee(e.target.value)} style={{...inpS,width:140,fontSize:10}}>
        <option value="">👥 Barcha xodimlar</option>
        <option value={String(user.id)}>🙋 Mening vazifalarim</option>
        {teamOpts.filter(t=>String(t.id)!==String(user.id)).map(t=>(
          <option key={t.id} value={String(t.id)}>{t.label}</option>
        ))}
      </select>
      <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{...inpS,width:130,fontSize:10}}>
        <option value="">📊 Barcha holatlar</option>
        <option value="todo">📋 Bajarilmagan</option>
        <option value="inprogress">⚡ Jarayonda</option>
        <option value="done">✅ Bajarildi</option>
      </select>
      {/* Date quick-select */}
      <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
        {[["","Barchasi"],["today","Bugun"],["week","Bu hafta"],["month","Bu oy"],["custom","Sana"]].map(([p,l])=>(
          <button key={p} onClick={()=>applyPreset(p)}
            style={{padding:"4px 10px",borderRadius:14,fontSize:10,fontWeight:700,cursor:"pointer",
              border:`1px solid ${fDatePreset===p?T.accent:T.border}`,
              background:fDatePreset===p?`${T.accent}22`:T.card2,
              color:fDatePreset===p?T.accent:T.muted}}>
            {l}
          </button>
        ))}
      </div>
      {fDatePreset==="custom"&&(
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)} style={{...inpS,width:120,fontSize:10}}/>
          <span style={{color:T.muted,fontSize:10}}>—</span>
          <input type="date" value={fDateTo} onChange={e=>setFDateTo(e.target.value)} style={{...inpS,width:120,fontSize:10}}/>
        </div>
      )}
      {(fAssignee||fStatus||fDatePreset)&&
        <button onClick={()=>{setFAssignee("");setFStatus("");setFDateFrom("");setFDateTo("");setFDatePreset("");}}
          style={{padding:"4px 9px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>
          ✕ Tozalash
        </button>
      }
    </div>

    {/* Kanban columns */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      {Object.entries(COLS).map(([sk,sv])=>{
        const col=filtered.filter(t=>t.status===sk).sort((a,b)=>new Date(a.due||"9999")-new Date(b.due||"9999"));
        const isOver = dragTaskOver===sk;
        return <div key={sk}
          onDragOver={e=>{e.preventDefault();setDragTaskOver(sk);}}
          onDrop={e=>{e.preventDefault();if(dragTaskId){moveTask(dragTaskId,sk);setDragTaskId(null);setDragTaskOver(null);}}}
          onDragLeave={()=>setDragTaskOver(null)}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:`${sv.c}${T.dark?"22":"15"}`,border:`1px solid ${sv.c}44`,borderRadius:"8px 8px 0 0"}}>
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>{sv.l}</span>
            <span style={{fontSize:11,fontWeight:700,background:`${sv.c}22`,color:sv.c,borderRadius:10,padding:"0 6px",border:`1px solid ${sv.c}44`}}>{col.length}</span>
          </div>
          <div style={{background:isOver?`${sv.c}18`:T.card,border:isOver?`2px dashed ${sv.c}88`:`1px solid ${T.border}`,borderRadius:"0 0 8px 8px",padding:7,minHeight:130,transition:"background 0.1s"}}>
            {col.map(t=>{
              const od=isOD(t.due)&&t.status!=="done";
              const ds=isSoon(t.due)&&!od;
              const lead=leads.find(l=>l.id===t.leadId);
              const assigneeName=team.find(u=>u.id===t.assignee)?.name||'';
              return <div key={t.id}
                draggable
                onDragStart={e=>{e.stopPropagation();setDragTaskId(t.id);e.dataTransfer.effectAllowed="move";}}
                onDragEnd={()=>{setDragTaskId(null);setDragTaskOver(null);}}
                style={{background:T.card2,borderRadius:7,padding:8,marginBottom:5,border:`1px solid ${od?T.red+"44":ds?T.yellow+"44":T.border}`,borderLeft:`3px solid ${od?T.red:ds?T.yellow:PC[t.priority]||T.accent}`,cursor:dragTaskId?"grabbing":"pointer",opacity:dragTaskId===t.id?0.4:1,transition:"opacity 0.15s"}}
                onClick={()=>{setForm({...t});setModal("form");}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:3,marginBottom:2}}>
                  <span style={{fontSize:11,fontWeight:600,color:T.text,textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</span>
                  <Av id={t.assignee} team={team} size={16}/>
                </div>
                {assigneeName&&<div style={{fontSize:8,color:T.muted,marginBottom:2}}>👤 {assigneeName}</div>}
                {t.desc&&<div style={{fontSize:9,color:T.muted,marginBottom:3}}>{t.desc}</div>}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:8,color:PC[t.priority]||T.accent,fontWeight:700}}>{t.priority==="high"?"⚠️":t.priority==="low"?"📎":"📌"}</span>
                  {t.due&&<span style={{fontSize:8,color:od?T.red:ds?T.yellow:T.muted,fontWeight:od||ds?700:400}}>{fmtD(t.due)}{od?" ⚠️":ds?" ⏰":""}</span>}
                  {lead&&open?<button onClick={e=>{e.stopPropagation();open(lead);}} style={{fontSize:8,color:T.accent,background:`${T.accent}22`,borderRadius:3,padding:"0 3px",border:"none",cursor:"pointer",fontWeight:600}}>👤 {lead.name}</button>
                  :lead&&<span style={{fontSize:8,color:T.accent,background:`${T.accent}22`,borderRadius:3,padding:"0 3px"}}>{lead.name}</span>}
                </div>
              </div>;
            })}
            {col.length===0&&<div style={{color:T.border,fontSize:9,textAlign:"center",padding:12}}>–</div>}
          </div>
        </div>;
      })}
    </div>

    {/* Task modal */}
    {modal==="form"&&<Modal onClose={()=>setModal(null)} width={440}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Vazifa</h3>
          <button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button>
        </div>
        <div style={{display:"grid",gap:8}}>
          <div><label style={labS}>Nomi *</label><input value={form.title||""} onChange={e=>f("title",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Tavsif</label><textarea value={form.desc||""} onChange={e=>f("desc",e.target.value)} rows={2} style={{...inpS,resize:"vertical"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={labS}>Mas'ul</label>
              <SearchSelect items={teamOpts} value={form.assignee||user.id} onChange={v=>f("assignee",Number(v))} placeholder="Mas'ul"/>
            </div>
            <div><label style={labS}>Muhimlik</label>
              <select value={form.priority||"medium"} onChange={e=>f("priority",e.target.value)} style={inpS}>
                <option value="high">⚠️ Yuqori</option>
                <option value="medium">📌 O'rta</option>
                <option value="low">📎 Past</option>
              </select>
            </div>
            <div><label style={labS}>Holat</label>
              <select value={form.status||"todo"} onChange={e=>f("status",e.target.value)} style={inpS}>
                <option value="todo">Bajarilmagan</option>
                <option value="inprogress">Jarayonda</option>
                <option value="done">Bajarildi</option>
              </select>
            </div>
            <div><label style={labS}>Muddati</label>
              <input type="date" value={form.due||""} onChange={e=>f("due",e.target.value)} style={inpS}/>
            </div>
            <div style={{gridColumn:"1/-1"}}><label style={labS}>Bog'liq mijoz</label>
              <SearchSelect items={[{value:"",label:"Umumiy vazifa",id:"",phone:""},...leads.map(l=>({value:l.id,label:l.name,id:l.id,phone:l.phone}))]}
                value={form.leadId||""} onChange={v=>f("leadId",v)} placeholder="Umumiy vazifa"/>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:7,justifyContent:"flex-end",marginTop:12}}>
          {tasks.some(t=>t.id===form.id)&&
            <button onClick={()=>remove(form.id)}
              style={{padding:"7px 10px",borderRadius:6,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:11,fontWeight:600}}>
              O'chirish
            </button>
          }
          <button onClick={()=>setModal(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={save} style={{padding:"7px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

export { Tasks };