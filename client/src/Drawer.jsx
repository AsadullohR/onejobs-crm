import { useState, useRef, useEffect } from "react";
import { useT } from "./theme.js";
import { STAGES, DONE, LOST } from "./constants.js";
import { uid, fmtM, fmtMs, fmtD, isOD, inp, lab, I, Pill, Av, Modal, SearchSelect, gS } from "./helpers.jsx";
import { candidatesAPI, leadDocsAPI } from "./api.js";

// ─── LEAD DRAWER ──────────────────────────────────────────────────────────────
function Drawer({lead, user, team, leads, tasks, onSave, onClose, onAddTask, config, roles, addNotif}) {
const T=useT();
const isNew=!lead.id||String(lead.id).startsWith("tmp-");
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

  ...lead,

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
  const addTask=()=>{if(!tTitle.trim()||isNew)return;onAddTask({id:uid(),title:tTitle,assignee:Number(tAsgn),leadId:form.id,priority:"medium",status:"todo",due:tDue,createdBy:user.id,at:new Date().toISOString(),desc:""});setTTitle("");setTDue("");};
  const teamOpts=team.filter(t=>t.active!==false&&t.role!=="partner").map(t=>({value:t.id,label:t.name,id:t.id,phone:t.phone}));

  const [vacCands, setVacCands] = useState([]);
  useEffect(() => {
    if (!lead.id) return;
    candidatesAPI.getByLead(lead.id).then(setVacCands).catch(() => {});
  }, [lead.id]);

  // When full lead data arrives (after initial list-data open), patch history/cv into form
  useEffect(() => {
    if (lead._listOnly === false) {
      setForm(p => ({
        ...p,
        history: lead.history?.length ? lead.history : p.history,
        cv: Object.keys(lead.cv || {}).length ? lead.cv : p.cv,
        dest: lead.dest || p.dest,
      }));
    }
  }, [lead._listOnly]);

  // Document checklist — from config (customizable by admin), fallback to defaults
  const DEFAULT_DOC_TYPES = [
    { key:"passport",   label:"📘 Pasport",                  desc:"Pasport nusxasi va asl" },
    { key:"photo",      label:"📸 Rasm",                      desc:"3×4 rasm (6 dona)" },
    { key:"medical",    label:"🏥 Tibbiy Guvohnoma",          desc:"Tibbiy tekshiruv natijasi" },
    { key:"police",     label:"👮 Politsiya Ma'lumotnomasi",  desc:"Sudlanmaganlik haqida" },
    { key:"diploma",    label:"🎓 Diplom/Attestat",           desc:"Ta'lim hujjati" },
    { key:"contract",   label:"📄 Shartnoma",                 desc:"Ish shartnomasi imzolandi" },
    { key:"visa_apply", label:"🛂 Vizaga Topshirildi",        desc:"Elchixonaga topshirilgan sana" },
    { key:"visa_got",   label:"✈️ Viza Olindi",               desc:"Viza qo'lga tegdi" },
    { key:"ticket",     label:"🎫 Aviachipta",                desc:"Aviachiptа band qilindi" },
    { key:"departure",  label:"🛫 Jo'nab Ketdi",              desc:"Jo'nab ketish tasdiqlandi" },
  ];
  const DOC_TYPES = config?.checklistItems?.length ? config.checklistItems : DEFAULT_DOC_TYPES;
  const DOC_STATUSES = {
    pending: { label:"Kutilmoqda", next:"done" },
    done:    { label:"✅ Tayyor",  next:"na" },
    na:      { label:"— N/A",      next:"pending" },
  };
  const [leadDocs, setLeadDocs] = useState({});
  useEffect(() => {
    if (!lead.id) return;
    leadDocsAPI.getByLead(lead.id)
      .then(docs => {
        const map = {};
        docs.forEach(d => { map[d.docType] = d; });
        setLeadDocs(map);
      })
      .catch(() => {});
  }, [lead.id]);
  const updateDoc = async (docType, status, notes) => {
    if (!lead.id) return;
    try {
      const saved = await leadDocsAPI.upsert(lead.id, docType, { status, notes });
      setLeadDocs(p => ({ ...p, [docType]: saved }));
    } catch (e) { console.error(e); }
  };
  const doneCount = DOC_TYPES.filter(dt => leadDocs[dt.key]?.status === 'done').length;

  const TABS=[
    {k:"info",l:"Ma'lumot"},
    {k:"owners",l:"Mas'ullar"},
    {k:"kpi",l:"KPI"},
    {k:"pay",l:"To'lovlar"},
    {k:"docs",l:"Hujjatlar"},
    {k:"checklist",l:`✅ Tekshiruv(${doneCount}/${DOC_TYPES.length})`},
    {k:"cv",l:"CV"},
    {k:"vacancies",l:`Vakansiyalar(${vacCands.length})`},
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
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
              <span style={{fontSize:10,color:T.accent,fontWeight:700,letterSpacing:"0.08em"}}>{isNew?"Yangi mijoz":form.id}</span>
              {!isNew&&<button onClick={()=>{const url=`${window.location.origin}${window.location.pathname}?track=${form.id}`;navigator.clipboard.writeText(url).then(()=>{alert("✅ Tracking havola nusxalandi:\n"+url);});}} title="Klientga tracking havolasini yuboring" style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:`${T.accent}18`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontWeight:600,lineHeight:1.4}}>🔗 Havola</button>}
            </div>
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
          <div><label style={labS}>Lead sifati</label><select value={form.quality||""} onChange={e=>f("quality",e.target.value)} disabled={!canEdit&&!isNew} style={{...inpS,color:form.quality==="Sifatli"?T.green:form.quality==="O'rtacha"?T.yellow:form.quality==="Sifatsiz"?T.red:T.text,fontWeight:form.quality?700:400}}><option value="">– Sifatsiz baholanmagan</option><option value="Sifatli">✅ Sifatli</option><option value="O'rtacha">🟡 O'rtacha</option><option value="Sifatsiz">🔴 Sifatsiz</option></select></div>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Sifat izohi</label><input value={form.qualityNote||""} onChange={e=>f("qualityNote",e.target.value)} disabled={!canEdit&&!isNew} style={inpS} placeholder="Sifat haqida qisqacha izoh..."/></div>
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
          {[["q1","1-Qism","q1R","#ec4899","q1Receipt"],["q2","2-Qism","q2R","#8b5cf6","q2Receipt"],["q3","3-Qism","q3R","#3b82f6","q3Receipt"],["xba","XBA","xbaR","#f97316","xbaReceipt"]].map(([k,lb,rk,c,rcp])=>(
            <div key={k} style={{background:form[k]?`${c}15`:T.card2,border:`1px solid ${form[k]?c+"44":T.border}`,borderRadius:9,padding:"12px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:700,color:form[k]?c:T.sub}}>
                  <input type="checkbox" checked={form[k]||false} onChange={e=>f(k,e.target.checked)} style={{width:16,height:16,accentColor:c}}/>{lb}
                </label>
                <span style={{fontSize:16}}>{form[k]?"✅":"⬜"}</span>
              </div>
              {/* Receipt upload */}
              <div style={{marginTop:4}}>
                {form[rcp]?(
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <button onClick={()=>{
                      const url=form[rcp];
                      if(!url)return;
                      if(url.startsWith("data:")){
                        const [header,b64]=url.split(",");
                        const mime=header.match(/:(.*?);/)?.[1]||"application/octet-stream";
                        const bytes=atob(b64);
                        const arr=new Uint8Array(bytes.length);
                        for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
                        const blob=new Blob([arr],{type:mime});
                        window.open(URL.createObjectURL(blob),"_blank");
                      } else {
                        window.open(url,"_blank");
                      }
                    }} style={{fontSize:9,color:c,textDecoration:"none",background:`${c}15`,border:`1px solid ${c}44`,borderRadius:4,padding:"2px 7px",cursor:"pointer"}}>📎 Chek ko'rish</button>
                    <button onClick={()=>f(rcp,null)} style={{fontSize:9,color:T.red,background:"none",border:"none",cursor:"pointer"}}>✕</button>
                  </div>
                ):(
                  <label style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9,color:T.muted,cursor:"pointer",background:T.card,border:`1px dashed ${T.border}`,borderRadius:4,padding:"3px 8px"}}>
                    📎 Chek yuklash
                    <input type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>{
                      const file=e.target.files[0];if(!file)return;
                      const reader=new FileReader();
                      reader.onload=ev=>f(rcp,ev.target.result);
                      reader.readAsDataURL(file);
                      e.target.value="";
                    }}/>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>}

        {/* PARTNER DOCS */}
        {tab==="docs"&&<div>
          <div style={{fontSize:11,color:T.muted,marginBottom:12}}>Hujjatlar yuklash (Hamkor uchun ham mavjud)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["passport","Pasport"],["cv_file","CV (fayl)"],["photo","Rasm (3x4)"],["id_card","ID karta"],["diploma","Diplom"],["doc1","Qo'shimcha 1"],["doc2","Qo'shimcha 2"],["doc3","Qo'shimcha 3"]].map(([k,lb])=>{
              const docEntry = leadDocs[k]||{};
              const hasFile = !!docEntry.fileData;
              const openFile = () => {
                const w = window.open();
                if(docEntry.fileData.startsWith("data:application/pdf")){
                  w.document.write(`<iframe src="${docEntry.fileData}" style="width:100%;height:100%;border:none"></iframe>`);
                } else {
                  w.document.write(`<img src="${docEntry.fileData}" style="max-width:100%"/>`);
                }
              };
              const downloadFile = () => {
                const a = document.createElement("a");
                a.href = docEntry.fileData;
                a.download = docEntry.fileName || k;
                a.click();
              };
              return (
                <div key={k} style={{background:T.card,border:`1px solid ${hasFile?T.accent+"66":T.border}`,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:6}}>{lb}</div>
                  {hasFile ? (
                    <div>
                      <div style={{fontSize:9,color:T.muted,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{docEntry.fileName||k}</div>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={openFile} style={{flex:1,padding:"4px 0",fontSize:10,borderRadius:5,border:`1px solid ${T.accent}`,background:`${T.accent}22`,color:T.accent,cursor:"pointer",fontWeight:700}}>👁 Ko'rish</button>
                        <button onClick={downloadFile} style={{flex:1,padding:"4px 0",fontSize:10,borderRadius:5,border:`1px solid ${T.green}`,background:`${T.green}22`,color:T.green,cursor:"pointer",fontWeight:700}}>⬇ Yuklab</button>
                        <label style={{flex:1,padding:"4px 0",fontSize:10,borderRadius:5,border:`1px solid ${T.border}`,background:T.card2,color:T.muted,cursor:"pointer",fontWeight:700,textAlign:"center",display:"block"}}>
                          ✏️
                          <input type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>{
                            const file=e.target.files[0];if(!file)return;
                            const reader=new FileReader();
                            reader.onload=async ev=>{
                              const saved=await leadDocsAPI.upsert(lead.id,k,{status:docEntry.status||"pending",notes:docEntry.notes||null,fileData:ev.target.result,fileName:file.name});
                              setLeadDocs(p=>({...p,[k]:{...p[k],...saved,fileData:ev.target.result,fileName:file.name}}));
                            };
                            reader.readAsDataURL(file);e.target.value="";
                          }}/>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label style={{display:"block",textAlign:"center",padding:"8px 0",fontSize:10,color:T.muted,border:`1px dashed ${T.border}`,borderRadius:6,cursor:"pointer"}}>
                      📎 Fayl yuklash
                      <input type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>{
                        const file=e.target.files[0];if(!file)return;
                        const reader=new FileReader();
                        reader.onload=async ev=>{
                          const saved=await leadDocsAPI.upsert(lead.id,k,{status:docEntry.status||"pending",notes:docEntry.notes||null,fileData:ev.target.result,fileName:file.name});
                          setLeadDocs(p=>({...p,[k]:{...p[k],...saved,fileData:ev.target.result,fileName:file.name}}));
                        };
                        reader.readAsDataURL(file);e.target.value="";
                      }}/>
                    </label>
                  )}
                </div>
              );
            })}
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

        {/* DOCUMENT CHECKLIST */}
        {tab==="checklist"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,color:T.muted}}>Hujjatlar holati — Bosib holatni o'zgartiring</div>
            <div style={{fontSize:10,fontWeight:700,color:doneCount===DOC_TYPES.length?T.green:T.muted}}>{doneCount}/{DOC_TYPES.length} tayyor</div>
          </div>
          <div style={{height:4,background:T.card2,borderRadius:2,overflow:"hidden",marginBottom:14}}>
            <div style={{height:"100%",width:`${(doneCount/DOC_TYPES.length)*100}%`,background:doneCount===DOC_TYPES.length?T.green:T.accent,borderRadius:2,transition:"width 0.3s"}}/>
          </div>
          {DOC_TYPES.map(dt=>{
            const doc=leadDocs[dt.key]||{status:"pending",notes:""};
            const st=DOC_STATUSES[doc.status]||DOC_STATUSES.pending;
            const bgColor=doc.status==="done"?`${T.green}12`:doc.status==="na"?T.card2:T.card;
            const borderColor=doc.status==="done"?`${T.green}44`:T.border;
            return (
              <div key={dt.key} style={{background:bgColor,border:`1px solid ${borderColor}`,borderRadius:8,padding:"10px 12px",marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{dt.label}</div>
                    <div style={{fontSize:9,color:T.muted}}>{dt.desc}</div>
                  </div>
                  <button
                    onClick={()=>updateDoc(dt.key,st.next,doc.notes)}
                    style={{padding:"4px 12px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,
                      background:doc.status==="done"?`${T.green}22`:doc.status==="na"?T.card2:T.card,
                      color:doc.status==="done"?T.green:doc.status==="na"?T.muted:T.muted,
                      border:`1px solid ${doc.status==="done"?T.green+"44":T.border}`}}
                  >{st.label}</button>
                </div>
                {doc.status!=="pending"&&<input
                  placeholder="Izoh (sana, raqam...)"
                  value={doc.notes||""}
                  onChange={e=>setLeadDocs(p=>({...p,[dt.key]:{...doc,notes:e.target.value}}))}
                  onBlur={e=>updateDoc(dt.key,doc.status,e.target.value)}
                  style={{...inpS,marginTop:6,fontSize:10}}
                />}
              </div>
            );
          })}
        </div>}

        {/* VACANCIES */}
        {tab==="vacancies"&&<div>
          <div style={{fontSize:11,color:T.muted,marginBottom:12}}>Bu mijoz qo'shilgan vakansiyalar</div>
          {vacCands.length===0?(
            <div style={{textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12}}>Hech qanday vakansiyaga qo'shilmagan</div>
          ):vacCands.map(c=>{
            const CAND_COLORS={added:"#3b82f6",interview:"#d97706",approved_final:"#16a34a",rejected_final:"#dc2626",reserve:"#6b7280",rejected_recruiter:"#ea580c",approved_client:"#9333ea",docs_prep:"#0891b2",filed_migration:"#7c3aed",permit_received:"#059669",scheduled_visa:"#b45309",visa_docs_sent:"#0369a1",submitted_embassy:"#1d4ed8",visa_received:"#15803d",submitted:"#3b82f6",approved:"#16a34a",rejected:"#dc2626",hired:"#9333ea"};
            const CAND_LABELS={added:"Добавен кандидат",interview:"За интервю",approved_final:"Одобрен финально",rejected_final:"Отказан финально",reserve:"Резерва",rejected_recruiter:"Отказан от Рекрутер",approved_client:"Одобрен от Клиент",docs_prep:"Подготовка документов",filed_migration:"Filed with Migration / A3",permit_received:"Permit received",scheduled_visa:"Scheduled for visa",visa_docs_sent:"Visa documents sent",submitted_embassy:"Submitted at the embassy",visa_received:"Visa received ✅",submitted:"Добавен кандидат",approved:"Одобрен финально",rejected:"Отказан финально",hired:"Одобрен от Клиент"};
            const sc=CAND_COLORS[c.status]||"#6b7280";
            return(
              <div key={c.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",marginBottom:8,borderLeft:`3px solid ${sc}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{c.vacancy_title||c.vacancy_id}</div>
                    <div style={{fontSize:9,color:T.muted}}>{c.company||""}{c.country?" · "+c.country:""}</div>
                    {c.note&&<div style={{fontSize:9,color:T.muted,marginTop:2}}>{c.note}</div>}
                  </div>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${sc}22`,color:sc,border:`1px solid ${sc}44`,flexShrink:0}}>
                    {CAND_LABELS[c.status]||c.status}
                  </span>
                </div>
              </div>
            );
          })}
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
