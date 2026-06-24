import { useState } from "react";
import { useT } from "./theme.js";
import { uid, inp, lab, I, Av, Modal, fmtMs, fmtD} from "./helpers.jsx";
import { INIT_VISA } from "./constants.js";
import { usersAPI } from "./api.js";

// ─── VISA, TEAM, SETTINGS (compact) ──────────────────────────────────────────
function Visa({user, roles, config, setConfig}) {
  const T=useT();
  const visas = config?.visas?.length ? config.visas : INIT_VISA;
  const setVisas = (updater) => {
    setConfig(p => {
      const prev = p.visas?.length ? p.visas : INIT_VISA;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return {...p, visas: next};
    });
  };
  const [sel,setSel]=useState(visas[0]?.id ?? 1); const [edit,setEdit]=useState(false); const [form,setForm]=useState(null);
  const canEdit=roles[user.role]?.canCfg; const cur=visas.find(v=>v.id===sel);
  const save=()=>{if(!form.country)return;const u={...form,docs:form.docsText.split("\n").map(s=>s.trim()).filter(Boolean)};delete u.docsText;setVisas(p=>p.some(v=>v.id===u.id)?p.map(v=>v.id===u.id?u:v):[...p,u]);setSel(u.id);setEdit(false);};
  const inpS=inp(T); const labS=lab(T);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Viza Ma'lumotlari</h1>
      {canEdit&&<button onClick={()=>{setForm({id:uid(),country:"",flag:"🌍",type:"",duration:"",docs:[],docsText:"",notes:""});setEdit(true);}} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Qo'shish</button>}
    </div>
    <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
      {visas.map(v=><button key={v.id} onClick={()=>setSel(v.id)} style={{padding:"5px 12px",borderRadius:7,border:`2px solid ${sel===v.id?T.accent:T.border}`,background:sel===v.id?`${T.accent}22`:"transparent",color:sel===v.id?T.text:T.muted,fontWeight:600,cursor:"pointer",fontSize:11}}>{v.flag} {v.country}</button>)}
    </div>
    {cur&&!edit&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>{cur.flag} {cur.country}</h3>
          {canEdit&&<div style={{display:"flex",gap:5}}>
            <button onClick={()=>{setForm({...cur,docsText:cur.docs.join("\n")});setEdit(true);}} style={{padding:"3px 8px",borderRadius:5,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>Tahrir</button>
            <button onClick={()=>setVisas(p=>p.filter(v=>v.id!==cur.id))} style={{padding:"3px 8px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:10}}>✕</button>
          </div>}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          {[["Viza turi",cur.type,T.accent],["Muddati",cur.duration,T.green]].map(([lb,val,c])=>(
            <div key={lb} style={{flex:1,background:`${c}22`,border:`1px solid ${c}44`,borderRadius:6,padding:"7px 9px",textAlign:"center"}}><div style={{fontSize:9,color:T.muted}}>{lb}</div><div style={{fontSize:11,fontWeight:700,color:c,marginTop:2}}>{val}</div></div>
          ))}
        </div>
        {cur.docs.map((d,i)=><div key={i} style={{display:"flex",gap:6,padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}><span style={{color:T.green,fontWeight:700}}>✓</span><span style={{color:T.text,fontSize:11}}>{d}</span></div>)}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
        {cur.notes&&<div style={{background:`${T.yellow}15`,border:`1px solid ${T.yellow}33`,borderRadius:7,padding:"9px 11px",marginBottom:10}}><div style={{fontSize:10,fontWeight:700,color:T.yellow,marginBottom:3}}>⚠️ Eslatma</div><p style={{color:T.text,fontSize:11,margin:0,lineHeight:1.6}}>{cur.notes}</p></div>}
        <h3 style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:T.text}}>📋 Bosqichlar</h3>
        {["Hujjatlar yig'ish","Shartnoma imzolash","XBA to'lovi","CV topshirish","Interview","Elchixona","Viza","Jo'nab ketish"].map((st,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:`${T.accent}22`,color:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,border:`1px solid ${T.accent}44`,flexShrink:0}}>{i+1}</div>
            <span style={{color:T.text,fontSize:11}}>{st}</span>
          </div>
        ))}
      </div>
    </div>}
    {edit&&form&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:18,maxWidth:540}}>
      <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:T.text}}>{visas.some(v=>v.id===form.id)?"Tahrirlash":"Yangi"}</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div><label style={labS}>Bayroq</label><input value={form.flag||""} onChange={e=>setForm(p=>({...p,flag:e.target.value}))} style={inpS} placeholder="🇺🇿"/></div>
        <div><label style={labS}>Mamlakat *</label><input value={form.country||""} onChange={e=>setForm(p=>({...p,country:e.target.value}))} style={inpS}/></div>
        <div><label style={labS}>Viza turi</label><input value={form.type||""} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inpS}/></div>
        <div><label style={labS}>Muddati</label><input value={form.duration||""} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} style={inpS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={labS}>Hujjatlar (satr-satr)</label><textarea value={form.docsText||""} onChange={e=>setForm(p=>({...p,docsText:e.target.value}))} rows={4} style={{...inpS,resize:"vertical"}}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={labS}>Izohlar</label><textarea value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...inpS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",gap:7,marginTop:12}}>
        <button onClick={()=>setEdit(false)} style={{padding:"7px 13px",borderRadius:7,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
        <button onClick={save} style={{padding:"7px 16px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>💾 Saqlash</button>
      </div>
    </div>}
  </div>;
}

function TeamPage({user, team, setTeam, roles}) {
  const T=useT();
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [activeTab,setActiveTab]=useState("staff");
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const COLORS=["#6366f1","#22c55e","#f97316","#eab308","#ef4444","#06b6d4","#a855f7","#10b981","#3b82f6"];

  const STAFF_ROLES=["admin","manager","sales","docs","finance_manager"];
  const TAB_ROLES={staff:STAFF_ROLES, partner:["partner"], employer:["employer"]};
  const TAB_DEFAULT={staff:"sales", partner:"partner", employer:"employer"};

  const save = async () => {
    if (!form.name || !form.username) return;
    try {
      const payload = {
        username: form.username,
        password: form.password,
        name: form.name,
        role: form.role,
        avatar: form.av || form.avatar || "",
        color: form.color,
        phone: form.phone,
        email: form.email || "",
        active: form.active !== false,
        salary: Number(form.salary || 0),
        salary_type: form.salType || form.salary_type || "fixed",
        salary_pct: Number(form.pct || form.salary_pct || 0),
      };
      let saved;
      if (form.id) {
        saved = await usersAPI.update(form.id, payload);
      } else {
        saved = await usersAPI.save(payload);
      }
      setTeam(p =>
        p.some(t => t.id === saved.id)
          ? p.map(t => t.id === saved.id ? saved : t)
          : [...p, saved]
      );
      setModal(null);
    } catch (err) {
      alert("Xodim saqlanmadi: " + err.message);
    }
  };

  const inpS=inp(T); const labS=lab(T);
  const allowedRoles = TAB_ROLES[activeTab]||STAFF_ROLES;
  const visTeam = team.filter(m=>allowedRoles.includes(m.role));

  const openAdd = () => {
    const defRole = TAB_DEFAULT[activeTab]||"sales";
    setForm({name:"",username:"",role:defRole,password:"",av:"",color:COLORS[0],phone:"",email:"",active:true,salary:0,salType:"fixed",pct:5,salItems:[]});
    setModal("form");
  };

  const TABS_DEF=[
    {k:"staff",    l:"Xodimlar"},
    {k:"partner",  l:"Hamkorlar"},
    {k:"employer", l:"Ish Beruvchilar"},
  ];

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Jamoa</h1>
      {user.role==="admin"&&<button onClick={openAdd} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Qo'shish</button>}
    </div>
    {/* Tabs */}
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {TABS_DEF.map(({k,l})=>(
        <button key={k} onClick={()=>setActiveTab(k)} style={{padding:"6px 16px",borderRadius:7,border:`2px solid ${activeTab===k?T.accent:T.border}`,background:activeTab===k?`${T.accent}22`:"transparent",color:activeTab===k?T.text:T.muted,fontWeight:activeTab===k?700:400,cursor:"pointer",fontSize:11}}>{l} <span style={{fontSize:9,color:T.muted}}>({team.filter(m=>(TAB_ROLES[k]||[]).includes(m.role)).length})</span></button>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
      {visTeam.map(m=>(
        <div key={m.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:13,display:"flex",gap:10,alignItems:"flex-start",opacity:m.active===false?.5:1}}>
          <Av id={m.id} team={team} size={34}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>{m.name}</span>
              {m.id===user.id&&<span style={{fontSize:8,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,borderRadius:3,padding:"0 4px",fontWeight:600}}>Siz</span>}
            </div>
            <div style={{fontSize:10,color:T.muted,marginBottom:4}}>@{m.username}{m.phone&&` · ${m.phone}`}</div>
            {activeTab==="partner"&&<div style={{fontSize:9,color:T.muted,marginBottom:3}}>Komissiya: {m.pct||0}%</div>}
            {activeTab==="employer"&&<div style={{fontSize:9,color:T.muted,marginBottom:3}}>Kompaniya: {m.name}</div>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{background:`${roles[m.role]?.color||T.accent}22`,color:roles[m.role]?.color||T.accent,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20}}>{roles[m.role]?.label||m.role}</span>
              {(user.role==="admin"||user.role==="manager")&&activeTab==="staff"&&<select value={m.role} onChange={async e=>{
                const role=e.target.value;
                try {
                  const updated=await usersAPI.update(m.id,{...m,role});
                  setTeam(p=>p.map(t=>t.id===m.id?updated:t));
                } catch(err){alert("Rol saqlanmadi: "+err.message);}
              }} style={{...inpS,width:"auto",fontSize:9,padding:"2px 5px"}}>{STAFF_ROLES.map(r=><option key={r} value={r}>{roles[r]?.label||r}</option>)}</select>}
            </div>
            {activeTab==="staff"&&roles[user.role]?.canSalary&&<div style={{fontSize:9,color:T.muted,marginTop:3}}>{m.salType==="fixed"?`Maosh: ${fmtMs(m.salary||0)} so'm`:`${m.pct||0}% komissiya`}</div>}
          </div>
          {user.role==="admin"&&<div style={{display:"flex",gap:4,flexShrink:0}}>
            <button onClick={()=>{setForm({...m});setModal("form");}} style={{padding:"3px 6px",borderRadius:4,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:10}}>{I.edit}</button>
            {m.id!==user.id&&<button onClick={async()=>{
              try {
                const updated=await usersAPI.update(m.id,{...m,active:m.active===false});
                setTeam(p=>p.map(t=>t.id===m.id?updated:t));
              } catch(err){alert("Status saqlanmadi: "+err.message);}
            }} style={{padding:"3px 6px",borderRadius:4,background:m.active===false?`${T.green}22`:`${T.yellow}22`,color:m.active===false?T.green:T.yellow,border:`1px solid ${m.active===false?T.green:T.yellow}44`,cursor:"pointer",fontSize:9}}>{m.active===false?"Faol":"To'xtat"}</button>}
          </div>}
        </div>
      ))}
      {visTeam.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12}}>Bu bo'limda hech kim yo'q</div>}
    </div>
    {modal==="form"&&<Modal onClose={()=>setModal(null)} width={500}>
      <div style={{padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>
            {activeTab==="partner"?"Hamkor":activeTab==="employer"?"Ish Beruvchi":"Xodim"}
          </h3>
          <button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>{activeTab==="employer"?"Kompaniya nomi *":"To'liq ismi *"}</label><input value={form.name||""} onChange={e=>f("name",e.target.value)} style={inpS}/></div>
          {activeTab==="employer"&&<div style={{gridColumn:"1/-1"}}><label style={labS}>Kontakt shaxs</label><input value={form.contactPerson||""} onChange={e=>f("contactPerson",e.target.value)} style={inpS} placeholder="Direktor ismi"/></div>}
          <div><label style={labS}>Username *</label><input value={form.username||""} onChange={e=>f("username",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Parol</label><input value={form.password||""} onChange={e=>f("password",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Telefon</label><input value={form.phone||""} onChange={e=>f("phone",e.target.value)} style={inpS}/></div>
          {activeTab==="staff"&&<div><label style={labS}>Rol</label><select value={form.role||"sales"} onChange={e=>f("role",e.target.value)} style={inpS}>{STAFF_ROLES.map(r=><option key={r} value={r}>{roles[r]?.label||r}</option>)}</select></div>}
          <div><label style={labS}>Avatar (2 harf)</label><input value={form.av||""} onChange={e=>f("av",e.target.value.toUpperCase().slice(0,2))} maxLength={2} style={inpS} placeholder="AS"/></div>
          {activeTab==="staff"&&roles[user.role]?.canSalary&&<>
            <div><label style={labS}>Maosh turi</label><select value={form.salType||"fixed"} onChange={e=>f("salType",e.target.value)} style={inpS}><option value="fixed">Fiksed</option><option value="percent">Foiz %</option></select></div>
            {form.salType==="fixed"?<div><label style={labS}>Oylik maosh</label><input type="number" value={form.salary||0} onChange={e=>f("salary",Number(e.target.value))} style={inpS}/></div>:<div><label style={labS}>Foiz %</label><input type="number" value={form.pct||5} onChange={e=>f("pct",Number(e.target.value))} style={inpS}/></div>}
          </>}
          {activeTab==="partner"&&<div><label style={labS}>Komissiya %</label><input type="number" value={form.pct||0} onChange={e=>f("pct",Number(e.target.value))} style={inpS}/></div>}
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Rang</label><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:2}}>{COLORS.map(c=><div key={c} onClick={()=>f("color",c)} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${form.color===c?T.text:"transparent"}`}}/>)}</div></div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:12,justifyContent:"flex-end"}}>
          <button onClick={()=>setModal(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={save} style={{padding:"7px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>💾 Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

const ROLE_CAPS=[{key:"canOwner",label:"Mas'ulni o'zgartirish"},{key:"canFin",label:"Moliya bo'limi"},{key:"canEdit",label:"Lead tahrirlash"},{key:"canCfg",label:"Sozlamalar"},{key:"canTeam",label:"Jamoa boshqaruvi"},{key:"seeAll",label:"Barcha leadlarni ko'rish"},{key:"canTakeUnassigned",label:"Bo'sh leadni olish"}];

function Settings({user, config, setConfig, roles, setRoles}) {
  const T=useT(); const [tab,setTab]=useState("lists"); const [lt,setLt]=useState("countries"); const [ni,setNi]=useState(""); const [rf,setRf]=useState(null); const [rfm,setRfm]=useState({});
  const [clEdit,setClEdit]=useState(null); // checklist item being edited
  const [clForm,setClForm]=useState({key:"",label:"",desc:""});
  const rfu=(k,v)=>setRfm(p=>({...p,[k]:v}));
  const ce=roles[user.role]?.canCfg; const isAdmin=user.role==="admin";
  const secs={countries:"Mamlakatlar",sectors:"Sohalar",sources:"Manbalar",positions:"Lavozimlar",txnInc:"Kirim kat.",txnExp:"Chiqim kat."};
  const addItem=(k)=>{if(!ni.trim())return;setConfig(p=>({...p,[k]:[...p[k],ni.trim()]}));setNi("");};
  const rmItem=(k,item)=>setConfig(p=>({...p,[k]:p[k].filter(x=>x!==item)}));
  const DEFAULT_CL=[
    {key:"passport",label:"📘 Pasport",desc:"Pasport nusxasi va asl"},
    {key:"photo",label:"📸 Rasm",desc:"3×4 rasm (6 dona)"},
    {key:"medical",label:"🏥 Tibbiy Guvohnoma",desc:"Tibbiy tekshiruv natijasi"},
    {key:"police",label:"👮 Politsiya Ma'lumotnomasi",desc:"Sudlanmaganlik haqida"},
    {key:"diploma",label:"🎓 Diplom/Attestat",desc:"Ta'lim hujjati"},
    {key:"contract",label:"📄 Shartnoma",desc:"Ish shartnomasi imzolandi"},
    {key:"visa_apply",label:"🛂 Vizaga Topshirildi",desc:"Elchixonaga topshirilgan sana"},
    {key:"visa_got",label:"✈️ Viza Olindi",desc:"Viza qo'lga tegdi"},
    {key:"ticket",label:"🎫 Aviachipta",desc:"Aviachipta band qilindi"},
    {key:"departure",label:"🛫 Jo'nab Ketdi",desc:"Jo'nab ketish tasdiqlandi"},
  ];
  const checklistItems = config?.checklistItems?.length ? config.checklistItems : DEFAULT_CL;
  const saveClItem=()=>{
    if(!clForm.key||!clForm.label)return;
    const items=checklistItems.filter(x=>x.key!==clForm.key);
    setConfig(p=>({...p,checklistItems:[...items,{key:clForm.key,label:clForm.label,desc:clForm.desc}]}));
    setClEdit(null);setClForm({key:"",label:"",desc:""});
  };
  const removeClItem=(key)=>setConfig(p=>({...p,checklistItems:checklistItems.filter(x=>x.key!==key)}));
  const saveRole=()=>{if(!rfm.key||!rfm.label)return;setRoles(p=>({...p,[rfm.key]:{label:rfm.label,color:rfm.color||T.accent,...Object.fromEntries(ROLE_CAPS.map(c=>[c.key,!!rfm[c.key]]))}}));setRf(null);};
  const inpS=inp(T); const labS=lab(T);
  const RCOLS=["#6366f1","#22c55e","#f97316","#eab308","#ef4444","#06b6d4","#a855f7","#10b981"];
  return <div>
    <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:"0 0 12px"}}>Sozlamalar</h1>
    <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
      {[["lists","📋 Ro'yxatlar"],["checklist","✅ Tekshiruv"],["roles","🔐 Rollar"],["integrations","🔗 Integratsiyalar"]].map(([k,l])=>(
        <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 12px",borderRadius:7,border:`2px solid ${tab===k?T.accent:T.border}`,background:tab===k?`${T.accent}22`:"transparent",color:tab===k?T.text:T.muted,fontWeight:tab===k?700:400,cursor:"pointer",fontSize:11}}>{l}</button>
      ))}
    </div>
    {tab==="lists"&&ce&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {Object.entries(secs).map(([k,l])=><button key={k} onClick={()=>setLt(k)} style={{padding:"4px 10px",borderRadius:6,border:`2px solid ${lt===k?T.accent:T.border}`,background:lt===k?`${T.accent}22`:"transparent",color:lt===k?T.text:T.muted,fontWeight:lt===k?700:400,cursor:"pointer",fontSize:10}}>{l}</button>)}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:10}}>
        <input value={ni} onChange={e=>setNi(e.target.value)} placeholder={`Yangi ${secs[lt]}...`} style={{...inpS,flex:1}} onKeyDown={e=>e.key==="Enter"&&addItem(lt)}/>
        <button onClick={()=>addItem(lt)} style={{padding:"7px 14px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>+</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {(config[lt]||[]).map(item=>(
          <div key={item} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:20,background:T.card2,border:`1px solid ${T.border}`,fontSize:11,color:T.text}}>
            {item}<button onClick={()=>rmItem(lt,item)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:13,lineHeight:1,padding:0,marginLeft:2}}>{I.x}</button>
          </div>
        ))}
      </div>
    </div>}
    {tab==="checklist"&&isAdmin&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{margin:0,fontSize:12,fontWeight:700,color:T.text}}>Tekshiruv ro'yxati (Checklist)</h3>
        <button onClick={()=>{setClForm({key:`item_${Date.now()}`,label:"",desc:""});setClEdit("new");}} style={{padding:"5px 10px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,fontSize:10,border:"none",cursor:"pointer"}}>+ Yangi</button>
      </div>
      {clEdit&&<div style={{background:T.card2,border:`1px solid ${T.accent}44`,borderRadius:8,padding:12,marginBottom:12,display:"grid",gridTemplateColumns:"1fr 2fr 2fr",gap:8,alignItems:"end"}}>
        <div><label style={{fontSize:9,color:T.muted,display:"block",marginBottom:2}}>Kalit (key)</label><input value={clForm.key} onChange={e=>setClForm(p=>({...p,key:e.target.value.replace(/\s/g,"_")}))} style={{...inp(T),fontSize:10}} placeholder="passport"/></div>
        <div><label style={{fontSize:9,color:T.muted,display:"block",marginBottom:2}}>Nomi (emoji + matn)</label><input value={clForm.label} onChange={e=>setClForm(p=>({...p,label:e.target.value}))} style={{...inp(T),fontSize:10}} placeholder="📘 Pasport"/></div>
        <div><label style={{fontSize:9,color:T.muted,display:"block",marginBottom:2}}>Tavsif</label><input value={clForm.desc} onChange={e=>setClForm(p=>({...p,desc:e.target.value}))} style={{...inp(T),fontSize:10}} placeholder="Pasport nusxasi va asl"/></div>
        <div style={{gridColumn:"1/-1",display:"flex",gap:7,justifyContent:"flex-end"}}>
          <button onClick={()=>setClEdit(null)} style={{padding:"5px 12px",borderRadius:6,background:T.card,border:`1px solid ${T.border}`,color:T.muted,fontSize:10,cursor:"pointer"}}>Bekor</button>
          <button onClick={saveClItem} style={{padding:"5px 14px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,fontSize:10,border:"none",cursor:"pointer"}}>Saqlash</button>
        </div>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {checklistItems.map((item,i)=>(
          <div key={item.key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:T.card2,border:`1px solid ${T.border}`}}>
            <span style={{fontSize:16,width:24,textAlign:"center"}}>{item.label.match(/^\p{Emoji}/u)?.[0]||"📄"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:T.text}}>{item.label}</div>
              <div style={{fontSize:9,color:T.muted}}>{item.desc}</div>
            </div>
            <span style={{fontSize:9,color:T.muted,fontFamily:"monospace",marginRight:4}}>{item.key}</span>
            <button onClick={()=>{setClForm({...item});setClEdit(item.key);}} style={{padding:"3px 8px",borderRadius:5,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:9}}>{I.edit}</button>
            <button onClick={()=>removeClItem(item.key)} style={{padding:"3px 8px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9}}>{I.trash}</button>
          </div>
        ))}
      </div>
      <button onClick={()=>setConfig(p=>({...p,checklistItems:DEFAULT_CL}))} style={{marginTop:10,padding:"5px 12px",borderRadius:6,background:T.card2,border:`1px solid ${T.border}`,color:T.muted,fontSize:9,cursor:"pointer"}}>↺ Standartga qaytarish</button>
    </div>}
    {tab==="roles"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <h3 style={{margin:0,fontSize:12,fontWeight:700,color:T.text}}>Rollar</h3>
        {isAdmin&&<button onClick={()=>{setRfm({key:"",label:"",color:T.accent,...Object.fromEntries(ROLE_CAPS.map(c=>[c.key,false]))});setRf("form");}} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,fontSize:10,border:"none",cursor:"pointer"}}>{I.plus} Yangi rol</button>}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{borderBottom:`1px solid ${T.border}`,background:T.card2}}>
            <th style={{textAlign:"left",padding:"8px 10px",color:T.muted,fontSize:9,textTransform:"uppercase",fontWeight:600}}>Rol</th>
            {ROLE_CAPS.map(c=><th key={c.key} style={{textAlign:"center",padding:"8px 5px",color:T.muted,fontSize:9,textTransform:"uppercase",fontWeight:600,maxWidth:70}}>{c.label}</th>)}
            <th style={{padding:"8px 10px",color:T.muted,fontSize:9}}></th>
          </tr></thead>
          <tbody>
            {Object.entries(roles).map(([key,role])=>(
              <tr key={key} style={{borderBottom:`1px solid ${T.border}22`}}>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:role.color}}/><span style={{fontSize:11,fontWeight:600,color:T.text}}>{role.label}</span><span style={{fontSize:8,color:T.muted,fontFamily:"monospace"}}>{key}</span></div>
                </td>
                {ROLE_CAPS.map(c=>(
                  <td key={c.key} style={{textAlign:"center",padding:"8px 5px"}}>
                    {isAdmin?<input type="checkbox" checked={!!role[c.key]} onChange={e=>setRoles(p=>({...p,[key]:{...p[key],[c.key]:e.target.checked}}))} style={{accentColor:role.color,width:13,height:13}}/>
                    :<span style={{color:role[c.key]?T.green:T.border,fontSize:12}}>{role[c.key]?"✓":"–"}</span>}
                  </td>
                ))}
                <td style={{padding:"8px 10px"}}>
                  {isAdmin&&<div style={{display:"flex",gap:3}}>
                    <button onClick={()=>{setRfm({key,label:role.label,color:role.color,...Object.fromEntries(ROLE_CAPS.map(c=>[c.key,!!role[c.key]]))});setRf("form");}} style={{padding:"2px 6px",borderRadius:4,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:9}}>{I.edit}</button>
                    {!["admin","manager","sales","partner"].includes(key)&&<button onClick={()=>{const r={...roles};delete r[key];setRoles(r);}} style={{padding:"2px 6px",borderRadius:4,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9}}>{I.trash}</button>}
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>}
    {tab==="integrations"&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        {[["Tally Forms","tally.so → Make → Webhook","Yangi arizalar avtomatik","#6366f1"],["Meta Leads","Facebook Lead Ads → Make","Reklama leadlari","#1d4ed8"],["MicroSIP","tel: link → SIP qo'ng'iroq","Telefon tugmasiga bosing","#22c55e"],["Make / Zapier","Webhook: POST /api/leads","Barcha integratsiyalar","#f97316"],["Google Sheets","CSV export","Hisobotlar uchun","#16a34a"],["WhatsApp","+wa link","Tezkor muloqot","#25D366"]].map(([t,api,d,c])=>(
          <div key={t} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:10,borderLeft:`3px solid ${c}`}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:2}}>{t}</div>
            <div style={{fontSize:9,color:c,marginBottom:3,fontFamily:"monospace"}}>{api}</div>
            <div style={{fontSize:9,color:T.muted}}>{d}</div>
          </div>
        ))}
      </div>
    </div>}
    {rf==="form"&&<Modal onClose={()=>setRf(null)} width={480}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Rol</h3><button onClick={()=>setRf(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
          <div><label style={labS}>Kalit</label><input value={rfm.key||""} onChange={e=>rfu("key",e.target.value.toLowerCase().replace(/\s/g,"_"))} style={inpS} placeholder="my_role"/></div>
          <div><label style={labS}>Nom</label><input value={rfm.label||""} onChange={e=>rfu("label",e.target.value)} style={inpS}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Rang</label><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:2}}>{RCOLS.map(c=><div key={c} onClick={()=>rfu("color",c)} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${rfm.color===c?T.text:"transparent"}`}}/>)}</div></div>
        </div>
        <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:11,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:8}}>Ruxsatlar</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {ROLE_CAPS.map(cap=>(
              <label key={cap.key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:T.text}}>
                <input type="checkbox" checked={!!rfm[cap.key]} onChange={e=>rfu(cap.key,e.target.checked)} style={{width:14,height:14,accentColor:rfm.color||T.accent}}/>{cap.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
          <button onClick={()=>setRf(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={saveRole} style={{padding:"7px 15px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>💾 Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

export { Visa, TeamPage, Settings };