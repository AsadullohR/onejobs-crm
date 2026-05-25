import { useState, useRef } from "react";
import { useT } from "./theme.js";
import { STAGES, DONE, LOST } from "./constants.js";
import { uid, fmtM, fmtMs, fmtD, isOD, inp, lab, I, Pill, Av, Modal, SearchSelect, gS } from "./helpers.jsx";

// ─── LEAD DRAWER ──────────────────────────────────────────────────────────────
function Drawer({lead, user, team, leads, tasks, onSave, onClose, onAddTask, config, roles, addNotif}) {
  const T=useT();
  const isNew=!lead.id;
  const [form,setForm]=useState({
  cv:{},
  history:[],
  q1:false,
  q2:false,
  q3:false,
  xba:false,
  kpiSales:false,
  kpiConsult:false,
  kpiDocs:false,
  q1R:null,
  q2R:null,
  q3R:null,
  xbaR:null,
  sofFoyda:null,
  docs: {
  ownerSales: null,
  ownerConsult: null,
  ownerDocs: null,
  ...(lead.docs || {})
},
});
  const [tab,setTab]=useState("info");
  const [note,setNote]=useState("");
  const [tTitle,setTTitle]=useState(""); const [tDue,setTDue]=useState(""); const [tAsgn,setTAsgn]=useState(user.id);
  const [showCV,setShowCV]=useState(false);
  const photoRef=useRef();
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const cv=(k,v)=>setForm(p=>({...p,cv:{...(p.cv||{}),[k]:v}}));
  const d=(k,v)=>setForm(p=>({...p,docs:{...(p.docs||{}),[k]:v}}));
  const perm=roles[user.role]||{};
  const canOwner=perm.canOwner;
  const canEdit=perm.canEdit;
  const isPartner=user.role==="partner";
  const s=gS(form.status);
  const isDone=DONE.includes(form.status);
  const leadTasks=tasks.filter(t=>t.leadId===lead.id);
  const addNote=()=>{if(!note.trim())return;f("history",[...(form.history||[]),{text:note,by:user.id,at:new Date().toISOString()}]);setNote("");};
  const addTask=()=>{if(!tTitle.trim())return;onAddTask({id:uid(),title:tTitle,assignee:Number(tAsgn),leadId:form.id,priority:"medium",status:"todo",due:tDue,createdBy:user.id,at:new Date().toISOString(),desc:""});setTTitle("");setTDue("");};
  const teamOpts=team.filter(t=>t.active!==false&&t.role!=="partner").map(t=>({value:t.id,label:t.name,id:t.id,phone:t.phone}));

  const TABS=[
    {k:"info",l:"Ma'lumot"},
    {k:"owners",l:"Mas'ullar"},
    {k:"kpi",l:"KPI"},
    {k:"pay",l:"To'lovlar"},
    {k:"docs",l:"Hujjatlar"},
    {k:"cv",l:"CV"},
    {k:"tasks",l:`Vazifalar(${leadTasks.length})`},
    {k:"notes",l:`Izohlar(${(form.history||[]).length})`},
  ];
  const inpS=inp(T); const labS=lab(T);

  return <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
    
    <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,.5)"}}/>
    <div style={{width:530,background:T.bg,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",boxShadow:T.shadow}}>
      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.card,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:T.accent,fontWeight:700,letterSpacing:"0.08em",marginBottom:2}}>{form.id||"Yangi"}</div>
            <div style={{fontSize:16,fontWeight:900,color:T.text,marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.name||"Yangi mijoz"}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}><Pill sk={form.status}/>{form.country&&<span style={{fontSize:10,color:T.muted}}>🌍 {form.country}</span>}</div>
          </div>
          <button onClick={onClose} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.muted,marginLeft:8}}>{I.x}</button>
        </div>
        {!isPartner&&<div>
          <label style={labS}>Holat</label>
          <select value={form.status} onChange={e=>f("status",e.target.value)} style={{...inpS,fontWeight:700,color:s.c}}>
            {STAGES.map(st=><option key={st.key} value={st.key}>{st.label}</option>)}
          </select>
          {isDone&&<div style={{marginTop:8,background:`${T.green}15`,border:`1px solid ${T.green}44`,borderRadius:7,padding:"8px 10px"}}>
            <label style={{...labS,color:T.green}}>💰 Sof Foyda (Jo'nab ketganda)</label>
            <input type="number" value={form.sofFoyda||""} onChange={e=>f("sofFoyda",Number(e.target.value)||null)} style={inpS} placeholder="0"/>
          </div>}
        </div>}
      </div>
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,background:T.card,overflowX:"auto",flexShrink:0}}>
        {TABS.filter(t=>!isPartner||["docs","cv","info"].includes(t.k)).map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 10px",border:"none",borderBottom:tab===k?`2px solid ${T.accent}`:"2px solid transparent",background:"none",cursor:"pointer",fontSize:10,fontWeight:tab===k?700:400,color:tab===k?T.text:T.muted,whiteSpace:"nowrap"}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"14px 16px",flex:1,overflowY:"auto"}}>
        {/* INFO */}
        {tab==="info"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Ism Familiya *</label><input value={form.name||""} onChange={e=>f("name",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
          <div><label style={labS}>Telefon</label>
            <div style={{display:"flex",gap:5}}>
              <input value={form.phone||""} onChange={e=>f("phone",e.target.value)} disabled={!canEdit&&!isNew} style={{...inpS,flex:1}}/>
              {form.phone&&<a href={`tel:${form.phone}`} style={{padding:"7px 8px",borderRadius:6,background:`${T.green}22`,color:T.green,border:`1px solid ${T.green}44`,fontSize:11,textDecoration:"none",display:"flex",alignItems:"center",flexShrink:0}}>{I.phone}</a>}
            </div></div>
          <div><label style={labS}>Telegram</label><input value={form.telegram||""} onChange={e=>f("telegram",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
          <div><label style={labS}>Jinsi</label><select value={form.gender||""} onChange={e=>f("gender",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option><option>Erkak</option><option>Ayol</option></select></div>
          <div><label style={labS}>Mamlakat</label><select value={form.country||""} onChange={e=>f("country",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.countries.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={labS}>Soha</label><select value={form.sector||""} onChange={e=>f("sector",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.sectors.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={labS}>Lavozim</label><select value={form.position||""} onChange={e=>f("position",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.positions.map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label style={labS}>Manba</label><select value={form.source||""} onChange={e=>f("source",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.sources.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Izoh</label><textarea value={form.comment||""} onChange={e=>f("comment",e.target.value)} disabled={!canEdit&&!isNew} rows={2} style={{...inpS,resize:"vertical"}}/></div>
          <div><label style={labS}>Reklama nomi (Meta/Target)</label><input value={form.reklamaName||""} onChange={e=>f("reklamaName",e.target.value)} disabled={!canEdit&&!isNew} style={inpS} placeholder="Reklama kampaniyasi..."/></div>
          <div style={{gridColumn:"1/-1",borderTop:`1px solid ${T.border}`,paddingTop:9,marginTop:4}}>
            <div style={{fontSize:9,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>📅 Muhim sanalar</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={labS}>📅 Qayd qilingan sana</label><input type="date" value={form.createdAt||""} onChange={e=>f("createdAt",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
              <div><label style={labS}>📞 So'ngi aloqa vaqti</label><input type="date" value={form.lastCall||""} onChange={e=>f("lastCall",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
              <div><label style={labS}>💻 Onlayn suhbat sanasi</label><input type="date" value={form.onlaynSuhbat||""} onChange={e=>f("onlaynSuhbat",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
              <div><label style={labS}>🏢 Suhbatga kelgan sana</label><input type="date" value={form.officeSuhbat||""} onChange={e=>f("officeSuhbat",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
              <div><label style={labS}>📄 Shartnoma qilgan sana</label><input type="date" value={form.shartnomaSana||""} onChange={e=>f("shartnomaSana",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
            </div>
          </div>
        </div>}

        {/* OWNERS */}
        {tab==="owners"&&<div>
          <div style={{background:`${T.yellow}15`,border:`1px solid ${T.yellow}33`,borderRadius:8,padding:"9px 12px",marginBottom:14,fontSize:11,color:T.text}}>
            💡 Har bir lead uchun: <b>Mas'ul Sotuvchi</b>, <b>Mas'ul Konsultant</b>, <b>Mas'ul Hujjatchi</b> alohida belgilanadi
          </div>
          {[["ownerSales","💼 Mas'ul Sotuvchi","sales"],["ownerConsult","🎓 Mas'ul Konsultant","docs"],["ownerDocs","📁 Mas'ul Hujjatchi","docs"]].map(([k,label])=>(
            <div key={k} style={{marginBottom:16}}>
              <label style={labS}>{label}</label>
              {canOwner
                ?<SearchSelect items={[{value:null,label:"– Belgilanmagan",id:"",phone:""},...teamOpts]} value={form[k]} onChange={v=>f(k,v)} placeholder="Tanlang"/>
                :<div style={{...inpS,color:T.muted}}>{team.find(t=>t.id===form[k])?.name||"Belgilanmagan"}</div>
              }
              {/* Allow sales to take unassigned */}
              {!form[k]&&roles[user.role]?.canTakeUnassigned&&!canOwner&&(
                <button onClick={()=>f(k,user.id)} style={{marginTop:5,padding:"4px 10px",borderRadius:5,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>Menga olish</button>
              )}
            </div>
          ))}
        </div>}

        {/* KPI */}
        {tab==="kpi"&&<div>
          <div style={{fontSize:11,color:T.muted,marginBottom:14}}>KPI belgilar mas'ul shaxs ishini tasdiqlaydi</div>
          {[["kpiSales","💼 Sotuv KPI","ownerSales","#f97316"],["kpiConsult","🎓 Konsultant KPI","ownerConsult","#22c55e"],["kpiDocs","📁 Hujjatchi KPI","ownerDocs","#06b6d4"]].map(([k,label,ownerKey,c])=>{
            const owner=team.find(t=>t.id===form[ownerKey]);
            return <div key={k} style={{background:form[k]?`${c}15`:T.card2,border:`1px solid ${form[k]?c+"44":T.border}`,borderRadius:9,padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:canOwner||(user.id===form[ownerKey])?"pointer":"default",fontSize:13,fontWeight:700,color:form[k]?c:T.sub}}>
                  <input type="checkbox" checked={form[k]||false} onChange={e=>f(k,e.target.checked)} disabled={!canOwner&&user.id!==form[ownerKey]} style={{width:16,height:16,accentColor:c}}/>{label}
                </label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {owner&&<Av id={owner.id} team={team} size={22}/>}
                  <span style={{fontSize:20}}>{form[k]?"✅":"⬜"}</span>
                </div>
              </div>
              {owner&&<div style={{fontSize:10,color:T.muted,marginTop:4}}>Mas'ul: {owner.name}</div>}
            </div>;
          })}
        </div>}

        {/* PAYMENTS */}
        {tab==="pay"&&!isPartner&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["q1","1-Qism","q1R","#ec4899"],["q2","2-Qism","q2R","#8b5cf6"],["q3","3-Qism","q3R","#3b82f6"],["xba","XBA","xbaR","#f97316"]].map(([k,lb,rk,c])=>(
            <div key={k} style={{background:form[k]?`${c}15`:T.card2,border:`1px solid ${form[k]?c+"44":T.border}`,borderRadius:9,padding:"12px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:form[form[rk]]?6:0}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:700,color:form[k]?c:T.sub}}>
                  <input type="checkbox" checked={form[k]||false} onChange={e=>f(k,e.target.checked)} style={{width:16,height:16,accentColor:c}}/>{lb}
                </label>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  <span style={{fontSize:16}}>{form[k]?"✅":"⬜"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>}

        {/* PARTNER DOCS */}
        {tab==="docs"&&<div>
          <div style={{fontSize:11,color:T.muted,marginBottom:12}}>Hujjatlar yuklash (Hamkor uchun ham mavjud)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["passport","Pasport"],["cv_file","CV (fayl)"],["photo","Rasm (3x4)"],["id_card","ID karta"],["diploma","Diplom"],["doc1","Qo'shimcha 1"],["doc2","Qo'shimcha 2"],["doc3","Qo'shimcha 3"]].map(([k,lb])=>(
              <input type="file" key={k} label={lb} value={(form.docs||{})[k]} onChange={v=>d(k,v)}/>
            ))}
          </div>
        </div>}

        {/* CV */}
        {tab==="cv"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>CV Ma'lumotlari</span>
            <div style={{display:"flex",gap:6}}>
              <a href="https://tally.so/r/Np7BZN" target="_blank" rel="noopener" style={{fontSize:10,color:T.accent,textDecoration:"none",background:`${T.accent}22`,border:`1px solid ${T.accent}44`,borderRadius:5,padding:"3px 8px"}}>🔗 Tally</a>
              <button onClick={()=>setShowCV(true)} style={{fontSize:10,color:"#fff",background:T.purple,border:"none",borderRadius:5,padding:"4px 10px",cursor:"pointer",fontWeight:700}}>📄 CV Ko'rish</button>
            </div>
          </div>
          <input type="file" accept="image/*" ref={photoRef} style={{display:"none"}} onChange={e=>{const fi=e.target.files[0];if(!fi)return;const r=new FileReader();r.onload=ev=>cv("photoData",ev.target.result);r.readAsDataURL(fi);}}/>
          <div onClick={()=>photoRef.current.click()} style={{width:70,height:70,borderRadius:7,border:`2px dashed ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:T.card2,marginBottom:12}}>
            {(form.cv||{}).photoData?<img src={form.cv.photoData} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><span style={{color:T.muted}}>{I.up}</span><div style={{fontSize:9,color:T.muted,marginTop:2}}>Rasm</div></div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["name","Ism"],["surname","Familiya"],["motherName","Onasining ismi"],["fatherName","Otasining ismi"],["birthplace","Tug'ilgan joy"],["birthdate","Tug'ilgan sana"],["nationality","Fuqarolik"],["gender","Jinsi"],["maritalStatus","Oilaviy holat"],["partnerName","Juftining ismi"],["children","Farzandlar soni"],["heightWeight","Bo'y va vazn"],["address","Manzil"],["motherTongue","Ona tili"],["languages","Bilgan tillar (vergul)"],["education","Ta'lim"],["position","Ishlashi mumkin"],["salary","Istanilgan maosh"],["email","Email"]].map(([k,lb])=>(
              <div key={k} style={["motherName","address","motherTongue","languages","education"].includes(k)?{gridColumn:"1/-1"}:{}}>
                <label style={labS}>{lb}</label>
                <input value={(form.cv||{})[k]||""} onChange={e=>cv(k,e.target.value)} style={inpS}/>
              </div>
            ))}
            {[["experience1","Ish tajribasi 1"],["experience2","Ish tajribasi 2"],["skills","Ko'nikmalar"],["notes","Qo'shimcha"]].map(([k,lb])=>(
              <div key={k} style={{gridColumn:"1/-1"}}><label style={labS}>{lb}</label><textarea value={(form.cv||{})[k]||""} onChange={e=>cv(k,e.target.value)} rows={2} style={{...inpS,resize:"vertical"}}/></div>
            ))}
          </div>
        </div>}

        {/* TASKS */}
        {tab==="tasks"&&!isPartner&&<div>
          <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:12}}>
            <input value={tTitle} onChange={e=>setTTitle(e.target.value)} placeholder="Vazifa nomi..." style={{...inpS,marginBottom:6}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6}}>
              <input type="date" value={tDue} onChange={e=>setTDue(e.target.value)} style={inpS}/>
              <select value={tAsgn} onChange={e=>setTAsgn(e.target.value)} style={inpS}>{team.filter(t=>t.role!=="partner"&&t.active!==false).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <button onClick={addTask} style={{padding:"8px 11px",borderRadius:6,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>+</button>
            </div>
          </div>
          {leadTasks.map(t=>{const od=isOD(t.due)&&t.status!=="done"; return(
            <div key={t.id} style={{background:T.card2,borderRadius:7,padding:"9px 10px",marginBottom:5,border:`1px solid ${T.border}`,borderLeft:`3px solid ${od?T.red:T.accent}`}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text,marginBottom:2}}>{t.title}</div>
              <div style={{display:"flex",gap:7,alignItems:"center"}}><Av id={t.assignee} team={team} size={15}/><span style={{fontSize:9,color:od?T.red:T.muted}}>{I.clock} {fmtD(t.due)}{od?" ⚠️":""}</span></div>
            </div>
          );})}
        </div>}

        {/* NOTES */}
        {tab==="notes"&&!isPartner&&<div>
          <div style={{display:"flex",gap:7,marginBottom:12}}>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Izoh yozing..." rows={2} style={{...inpS,flex:1,resize:"none"}}/>
            <button onClick={addNote} style={{padding:"0 13px",borderRadius:7,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>+</button>
          </div>
          {[...(form.history||[])].reverse().map((item,i)=>{const u=team.find(t=>t.id===item.by); return(
            <div key={i} style={{display:"flex",gap:7,marginBottom:8}}>
              <Av id={item.by} team={team} size={22}/>
              <div style={{flex:1}}><div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 10px",fontSize:12,color:T.text,lineHeight:1.5}}>{item.text}</div>
                <div style={{fontSize:9,color:T.muted,marginTop:2}}>{u?.name} · {fmtD(item.at)}</div></div>
            </div>
          );})}
        </div>}
      </div>
      {/* Footer */}
      <div style={{padding:"10px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:7,background:T.card,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:12,fontWeight:600}}>Bekor</button>
        <button onClick={()=>onSave(form)} style={{flex:2,padding:"9px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:12}}>💾 Saqlash</button>
      </div>
    </div>
  </div>;
}

export { Drawer };
