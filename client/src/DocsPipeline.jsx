import { useState } from "react";
import { useT } from "./theme.js";
import { inp, I, lab, Pill, Av, Modal } from "./helpers.jsx";

// ─── DOCS PIPELINE ───────────────────────────────────────────────────────────
function DocsPipeline({leads, tasks, team, user, open, config, roles, setLeads}) {
  const T=useT();
  const perm=roles[user.role]||{};
  const [pickModal,setPickModal]=useState(false);
  const [pickSearch,setPickSearch]=useState("");
  const [pickStage,setPickStage]=useState(null);
  const INIT_DOC_STAGES = [
    {id:"ds1",label:"Hujjatlar Yig'ilmoqda",c:"#3b82f6"},
    {id:"ds2",label:"Pasport Olinmoqda",c:"#6366f1"},
    {id:"ds3",label:"CV Tayyorlanmoqda",c:"#8b5cf6"},
    {id:"ds4",label:"Diplom Tasdiqlanmoqda",c:"#a855f7"},
    {id:"ds5",label:"Tibbiy Tekshiruv",c:"#0891b2"},
    {id:"ds6",label:"Elchixona Uchun Tayyor",c:"#d97706"},
    {id:"ds7",label:"Vizaga Topshirildi",c:"#7c3aed"},
    {id:"ds8",label:"Viza Kutilmoqda",c:"#4f46e5"},
    {id:"ds9",label:"Viza Oldi",c:"#15803d"},
    {id:"ds10",label:"Jo'nab Ketdi",c:"#166534"},
  ];
  const [docStages,setDocStages] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("onejobs_doc_stages"))||INIT_DOC_STAGES;}
    catch{return INIT_DOC_STAGES;}
  });
  const saveStages = (s) => {
    setDocStages(s);
    try{localStorage.setItem("onejobs_doc_stages",JSON.stringify(s));}catch{}
  };
  const [search,setSearch]=useState("");
  const [editStages,setEditStages]=useState(false);
  const [stageForm,setStageForm]=useState({});
  const [editingId,setEditingId]=useState(null);
  const [dragStage,setDragStage]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const inpS=inp(T); const labS=lab(T);

  // Leads in docs stages (filter by status containing doc-related or use custom stage mapping)
  const DOC_STATUS_MAP = {
    "Hujjatlar Tayyorlanmoqda":"ds1",
    "Hujjatlar Jonatilishga Tayyor":"ds6",
    "Hujjatlar Jonatildi":"ds6",
    "Ish shartnomasi keldi":"ds5",
    "Ish shartnomasi imzolandi":"ds5",
    "Taklifnoma keldi":"ds8",
    "Elchixonaga Hujjatlar Tayyor":"ds6",
    "Vizaga Topshirildi":"ds7",
    "Viza Oldi":"ds9",
    "Jo'nab ketdi":"ds10",
  };
  const flt=leads.filter(l=>{
    const inDocStage = Object.keys(DOC_STATUS_MAP).includes(l.status);
    const hasDocsOwner = l.ownerDocs != null;
    const hasDocStage = l.docsStage != null;
    if(!inDocStage && !hasDocsOwner && !hasDocStage) return false;
    if(search&&!l.name.toLowerCase().includes(search.toLowerCase())&&!l.phone?.includes(search)&&!l.id.includes(search))return false;
    return true;
  });
  const grp={};
  docStages.forEach(s=>{
    grp[s.id]=flt.filter(l=>{
      const mapped = DOC_STATUS_MAP[l.status];
      return mapped===s.id||(l.docsStage===s.id);
    });
  });

  const addStage=()=>{
    if(!stageForm.label)return;
    const ns={id:"ds"+Date.now(),label:stageForm.label,c:stageForm.c||"#3b82f6"};
    saveStages([...docStages,ns]);
    setStageForm({});
  };
  const deleteStage=(id)=>{if(window.confirm("O'chirilsinmi?"))saveStages(docStages.filter(s=>s.id!==id));};
  const updateStage=(id,k,v)=>saveStages(docStages.map(s=>s.id===id?{...s,[k]:v}:s));
  const moveStageUp=(idx)=>{if(idx===0)return;const a=[...docStages];[a[idx-1],a[idx]]=[a[idx],a[idx-1]];saveStages(a);};
  const moveStageDown=(idx)=>{if(idx===docStages.length-1)return;const a=[...docStages];[a[idx+1],a[idx]]=[a[idx],a[idx+1]];saveStages(a);};

  // Drag-drop for stage reorder
  const handleDragStart=(e,id)=>{setDragStage(id);e.dataTransfer.effectAllowed="move";};
  const handleDragOver=(e,id)=>{e.preventDefault();setDragOver(id);};
  const handleDrop=(e,targetId)=>{
    e.preventDefault();
    if(!dragStage||dragStage===targetId)return;
    const arr=[...docStages];
    const fromIdx=arr.findIndex(s=>s.id===dragStage);
    const toIdx=arr.findIndex(s=>s.id===targetId);
    const [moved]=arr.splice(fromIdx,1);arr.splice(toIdx,0,moved);
    saveStages(arr);setDragStage(null);setDragOver(null);
  };
  const COLORS=["#3b82f6","#6366f1","#8b5cf6","#a855f7","#06b6d4","#10b981","#22c55e","#f59e0b","#f97316","#ef4444","#0d9488","#7c3aed","#d97706","#15803d","#166534"];

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden"}}>
    {/* Header */}
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.card,flexShrink:0,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <div>
        <h1 style={{fontSize:17,fontWeight:900,color:T.text,margin:0}}>📁 Hujjatchi Pipeline</h1>
        <p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>{flt.length} ta mijoz · {docStages.length} ta bosqich</p>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:7,alignItems:"center"}}>
        <div style={{position:"relative"}}><span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish..." style={{...inpS,paddingLeft:23,width:150,fontSize:11}}/></div>
        <button onClick={()=>{setPickStage(docStages[0]?.id||null);setPickModal(true);}} style={{padding:"7px 12px",borderRadius:7,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>+ Mijoz qo'shish</button>
        <button onClick={()=>setEditStages(e=>!e)} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${editStages?T.accent:T.border}`,background:editStages?`${T.accent}22`:"transparent",color:editStages?T.accent:T.muted,cursor:"pointer",fontSize:11,fontWeight:editStages?700:400}}>⚙️ Bosqichlar</button>
      </div>
    </div>

    {/* Stage editor */}
    {editStages&&<div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.card2,flexShrink:0,maxHeight:280,overflowY:"auto"}}>
      <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:8}}>Bosqichlarni boshqarish (tortib o'rin almashtiring)</div>
      {docStages.map((s,idx)=>(
        <div key={s.id} draggable onDragStart={e=>handleDragStart(e,s.id)} onDragOver={e=>handleDragOver(e,s.id)} onDrop={e=>handleDrop(e,s.id)}
          style={{display:"flex",gap:6,alignItems:"center",padding:"6px 8px",marginBottom:4,background:dragOver===s.id?`${T.accent}22`:T.card,border:`1px solid ${dragOver===s.id?T.accent:T.border}`,borderRadius:7,cursor:"grab",borderLeft:`3px solid ${s.c}`}}>
          <span style={{color:T.muted,fontSize:11,cursor:"grab"}}>⠿</span>
          <span style={{width:12,height:12,borderRadius:"50%",background:s.c,flexShrink:0}}/>
          {editingId===s.id && <input value={s.label} onChange={e=>updateStage(s.id,"label",e.target.value)} style={{...inpS,flex:1,padding:"3px 6px",fontSize:11}} autoFocus/>}
          {editingId===s.id && <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{COLORS.map(c=><div key={c} onClick={()=>updateStage(s.id,"c",c)} style={{width:14,height:14,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${s.c===c?T.text:"transparent"}`}}/>)}</div>}
          {editingId===s.id && <button onClick={()=>setEditingId(null)} style={{padding:"2px 7px",borderRadius:4,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:700}}>✓</button>}
          {editingId!==s.id && <span style={{flex:1,fontSize:11,color:T.text}}>{s.label}</span>}
          {editingId!==s.id && <span style={{fontSize:9,color:T.muted}}>{grp[s.id]?.length||0} ta</span>}
          <button onClick={()=>moveStageUp(idx)} disabled={idx===0} style={{padding:"1px 5px",borderRadius:3,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:9,opacity:idx===0?0.3:1}}>↑</button>
          <button onClick={()=>moveStageDown(idx)} disabled={idx===docStages.length-1} style={{padding:"1px 5px",borderRadius:3,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:9,opacity:idx===docStages.length-1?0.3:1}}>↓</button>
          <button onClick={()=>setEditingId(editingId===s.id?null:s.id)} style={{padding:"2px 5px",borderRadius:3,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:9}}>{I.edit}</button>
          <button onClick={()=>deleteStage(s.id)} style={{padding:"2px 5px",borderRadius:3,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9}}>{I.trash}</button>
        </div>
      ))}
      {/* Add new stage */}
      <div style={{display:"flex",gap:6,alignItems:"center",marginTop:8,padding:"6px 8px",background:`${T.accent}11`,borderRadius:7,border:`1px dashed ${T.accent}44`}}>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {COLORS.slice(0,8).map(c=><div key={c} onClick={()=>setStageForm(p=>({...p,c}))} style={{width:14,height:14,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${stageForm.c===c?T.text:"transparent"}`}}/>)}
        </div>
        <input value={stageForm.label||""} onChange={e=>setStageForm(p=>({...p,label:e.target.value}))} placeholder="Yangi bosqich nomi..." style={{...inpS,flex:1,padding:"5px 8px",fontSize:11}} onKeyDown={e=>e.key==="Enter"&&addStage()}/>
        <button onClick={addStage} style={{padding:"5px 12px",borderRadius:6,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>+ Qo'shish</button>
      </div>
    </div>}

    {/* Kanban board */}
    <div style={{flex:1,overflowX:"auto",overflowY:"hidden",padding:"12px 16px"}}>
      <div style={{display:"flex",gap:8,height:"100%",alignItems:"flex-start"}}>
        {docStages.map(stage=>{
          const cards=grp[stage.id]||[];
          return <div key={stage.id} style={{minWidth:200,maxWidth:200,flexShrink:0,height:"calc(100vh - 200px)",display:"flex",flexDirection:"column"}}>
            <div style={{background:`${stage.c}${T.dark?"22":"15"}`,border:`1px solid ${stage.c}44`,borderRadius:"8px 8px 0 0",padding:"6px 8px",display:"flex",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:10,fontWeight:700,color:stage.c,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{stage.label}</span>
              <span style={{fontSize:9,fontWeight:800,background:`${stage.c}22`,color:stage.c,borderRadius:10,padding:"0 5px",border:`1px solid ${stage.c}44`,flexShrink:0}}>{cards.length}</span>
            </div>
            <div style={{background:T.dark?`${T.card}bb`:T.card2,border:`1px solid ${stage.c}22`,borderTop:"none",borderRadius:"0 0 8px 8px",padding:5,flex:1,overflowY:"auto"}}>
              {cards.map(lead=>{
                const lt=tasks.filter(t=>t.leadId===lead.id&&t.status!=="done"); const od=lt.some(t=>isOD(t.due));
                const hasDocs=lead.docs&&Object.values(lead.docs).some(v=>v);
                return <div key={lead.id} onClick={()=>open(lead)} style={{background:T.card,borderRadius:7,padding:"8px 9px",marginBottom:4,cursor:"pointer",border:`1px solid ${T.border}`,borderLeft:`3px solid ${stage.c}66`}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadow} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.name}</div>
                  {lead.phone&&<div style={{fontSize:9,color:T.cyan,marginBottom:2,display:"flex",alignItems:"center",gap:3}}>{I.phone} {lead.phone}</div>}
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:3}}>
                    {lead.country&&<span style={{fontSize:8,background:T.card2,color:T.muted,borderRadius:3,padding:"0 4px",border:`1px solid ${T.border}`}}>🌍{lead.country}</span>}
                    {hasDocs&&<span style={{fontSize:8,background:`${T.green}22`,color:T.green,borderRadius:3,padding:"0 3px"}}>📎 hujjatlar</span>}
                    {lead.kpiDocs&&<span style={{fontSize:8,background:`${T.cyan}22`,color:T.cyan,borderRadius:3,padding:"0 3px",fontWeight:700}}>KPI₃</span>}
                  </div>
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {lt.length>0&&<span style={{fontSize:8,color:od?T.red:T.green,fontWeight:700}}>✓{lt.length}{od&&"⚠"}</span>}
                    <Pill sk={lead.status}/>
                  </div>
                  <div style={{fontSize:8,color:T.muted,marginTop:2}}>#{lead.id}</div>
                </div>;
              })}
              {cards.length===0&&<div style={{textAlign:"center",padding:"10px 0",color:T.border,fontSize:9}}>–</div>}
            </div>
          </div>;
        })}
      </div>
    </div>
    {/* Lead picker modal */}
    {pickModal&&<Modal onClose={()=>{setPickModal(false);setPickSearch("");}} width={540}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Mijoz tanlash — Konsultant Pipeline ga qo'shish</h3>
          <button onClick={()=>setPickModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:18}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <input value={pickSearch} onChange={e=>setPickSearch(e.target.value)} placeholder="Ism, telefon, ID..." style={{...inpS,flex:1}} autoFocus/>
          <select value={pickStage||""} onChange={e=>setPickStage(e.target.value)} style={{...inpS,width:"auto"}}>
            {docStages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div style={{maxHeight:380,overflowY:"auto"}}>
          {leads
            .filter(l=>{
              if(flt.some(fl=>fl.id===l.id)) return false; // already in docs pipeline
              const q=pickSearch.toLowerCase();
              if(q && !l.name?.toLowerCase().includes(q) && !l.phone?.includes(q) && !l.id?.includes(q)) return false;
              return true;
            })
            .slice(0,80)
            .map(l=>{
              const sg=gS(l.status);
              return <div key={l.id} onClick={()=>{
                setLeads(p=>p.map(x=>x.id===l.id?{...x,docsStage:pickStage||docStages[0]?.id}:x));
                setPickModal(false);setPickSearch("");
              }} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:7,marginBottom:3,cursor:"pointer",background:T.card2,border:`1px solid ${T.border}`}}
                onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}15`}
                onMouseLeave={e=>e.currentTarget.style.background=T.card2}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:T.text}}>{l.name}</div>
                  <div style={{fontSize:9,color:T.muted}}>{l.id} · {l.phone} · {l.country||"–"}</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <Pill sk={l.status}/>
                  <span style={{fontSize:9,color:T.accent,fontWeight:700}}>+</span>
                </div>
              </div>;
            })}
          {leads.filter(l=>!flt.some(fl=>fl.id===l.id)&&(!pickSearch||l.name?.toLowerCase().includes(pickSearch.toLowerCase())||l.phone?.includes(pickSearch)||l.id?.includes(pickSearch))).length===0&&
            <div style={{textAlign:"center",padding:24,color:T.muted}}>Hech qanday mijoz topilmadi</div>}
        </div>
      </div>
    </Modal>}
  </div>;
}

export { DocsPipeline };