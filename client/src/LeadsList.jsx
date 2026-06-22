import { useState, useRef } from "react";
import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { uid, fmtMs, isOD, inp, I, Pill, Av, fmtD } from "./helpers.jsx";
import { leadsAPI } from "./api.js";

// ─── LEADS LIST ─────────────────────────────────────────────────────────────
function LeadsList({leads, tasks, team, user, open, addLead, config, roles, setLeads, deleteLead, addNotif, vacancies=[], candidates=[]}) {
  const T=useT();
  const perm=roles[user.role]||{};
  const canBulk=user.role==="admin"||user.role==="manager";
  const [sel,setSel]=useState(new Set());
  const [q,setQ]=useState(""); const [fGroup,setFGroup]=useState("all");
  const [fC,setFC]=useState(""); const [fSrc,setFSrc]=useState(""); const [fOwn,setFOwn]=useState(""); const [fVacancy,setFVacancy]=useState("");
  const [fDateField,setFDateField]=useState("createdAt"); const [fDateFrom,setFDateFrom]=useState(""); const [fDateTo,setFDateTo]=useState("");
  const [showDateF,setShowDateF]=useState(false);
  const [pg,setPg]=useState(1); const [sort,setSort]=useState({col:"id",dir:"desc"});
  const [showImport,setShowImport]=useState(false); const [csvTxt,setCsvTxt]=useState(""); const [csvResult,setCsvResult]=useState(null);
  const csvRef=useRef(); const PER=50; const inpS=inp(T);

  const GROUPS={all:"Barchasi",new:"Yangi",contact:"Aloqa",deal:"Jarayon",payment:"To\'lov",docs:"Hujjatlar",visa:"Viza",done:"Tugagan",lost:"Bekor",hold:"Keyinchalik"};
  const S2G={"Yangi":"new","Qilindi":"new","Bog\'landi":"contact","Boglanildi":"contact","Onlayn Suhbat Uchun":"contact","Onlayn Suhbat":"contact","Suhbat":"contact","Shartnoma qildi":"deal","XBA To\'lov qildi":"deal","CV Topshirildi":"deal","Interview ga qo\'yildi":"deal","Ishga qabul qilindi":"deal","1 - Qism To\'landi":"payment","Hujjatlar Tayyorlanmoqda":"docs","Hujjatlar Jonatilishga Tayyor":"docs","Hujjatlar Jonatildi":"docs","Ish shartnomasi keldi":"docs","Ish shartnomasi imzolandi":"docs","Taklifnoma keldi":"docs","Elchixonaga Hujjatlar Tayyor":"visa","Vizaga Topshirildi":"visa","Viza Oldi":"done","Jo\'nab ketdi":"done","Viza Rad Etildi":"lost","Bekor qildi":"lost","Anchagacha Ko\'tarmadi":"lost","Keyinchalik":"hold"};

  const filtered=leads.filter(l=>{
    if(q&&!l.name?.toLowerCase().includes(q.toLowerCase())&&!l.phone?.includes(q)&&!l.id?.includes(q)&&!l.comment?.toLowerCase().includes(q.toLowerCase()))return false;
    if(fGroup!=="all"&&S2G[l.status]!==fGroup)return false;
    if(fC&&!l.country?.includes(fC))return false;
    if(fSrc&&l.source!==fSrc)return false;
    if(fOwn&&l.ownerSales!==parseInt(fOwn)&&l.ownerConsult!==parseInt(fOwn)&&l.ownerDocs!==parseInt(fOwn))return false;
    if(fDateFrom||fDateTo){const v=l[fDateField];if(!v)return false;if(fDateFrom&&v<fDateFrom)return false;if(fDateTo&&v>fDateTo)return false;}
    if(fVacancy){const vacLeadIds=new Set(candidates.filter(c=>String(c.vacancyId)===String(fVacancy)).map(c=>c.leadId));if(!vacLeadIds.has(l.id))return false;}
    return true;
  });

  const sorted=[...filtered].sort((a,b)=>{
    const v=(x)=>sort.col==="id"?x.id:sort.col==="name"?x.name||"":sort.col==="status"?x.status||"":x.createdAt||"";
    const r=v(a)<v(b)?-1:v(a)>v(b)?1:0; return sort.dir==="asc"?r:-r;
  });
  const totalPg=Math.max(1,Math.ceil(sorted.length/PER));
  const pageData=sorted.slice((pg-1)*PER,pg*PER);
  const Th=({c,label})=><th onClick={()=>setSort(s=>({col:c,dir:s.col===c&&s.dir==="asc"?"desc":"asc"}))} style={{padding:"8px 9px",textAlign:"left",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`,cursor:"pointer",whiteSpace:"nowrap",userSelect:"none"}}>{label}{sort.col===c?(sort.dir==="asc"?" ↑":" ↓"):""}</th>;

  const doCSV=()=>{
    const h="ID,Ism,Tel,Holat,Mamlakat,Manba,Izoh";
    const rows=filtered.map(l=>[l.id,l.name||"",l.phone||"",l.status||"",l.country||"",l.source||"",(l.comment||"").replace(/,/g," ")].join(","));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([h+"\n"+rows.join("\n")],{type:"text/csv"}));a.download="mijozlar.csv";a.click();
  };

  const importCSV = async () => {
  try {
    const rows = csvTxt.trim().split("\n").filter(Boolean);

    if (rows.length < 2) {
      setCsvResult("Kamida 2 qator kerak");
      return;
    }

    const headers = rows[0].split(",").map(h => h.trim().toLowerCase());

    const leadsToImport = rows.slice(1).map((row, index) => {
      const cols = row.split(",").map(c => c.trim().replace(/^"|"$/g, ""));

      const get = k => {
        const i = headers.indexOf(k);
        return i >= 0 ? cols[i] || "" : "";
      };

      const name = get("name") || get("ism");
      if (!name) return null;

      return {
        id: get("id") || `IMP-${Date.now()}-${index}`,
        name,
        phone: get("phone") || get("tel"),
        telegram: get("telegram"),
        status: get("status") || get("holat") || "Yangi",
        country: get("country") || get("mamlakat"),
        sector: get("sector") || get("soha"),
        position: get("position") || get("lavozim"),
        source: get("source") || get("manba") || "CSV Import",
        gender: get("gender") || get("jinsi"),
        comment: get("comment") || get("izoh"),
        note: get("note") || ""
      };
    }).filter(Boolean);

    const result = await leadsAPI.bulkImport(leadsToImport);

    setCsvResult(`✅ Import qilindi: ${result.inserted} yangi, ${result.updated} yangilandi`);

    const fresh = await leadsAPI.getAll({ limit: 10000 });
    setLeads(fresh.leads || fresh || []);

    addNotif && addNotif(`📥 Import: ${result.inserted} yangi, ${result.updated} yangilandi`);

    setTimeout(() => {
      setShowImport(false);
      setCsvTxt("");
      setCsvResult(null);
    }, 2000);

  } catch (err) {
    console.error(err);
    setCsvResult("❌ Import xatosi: " + err.message);
  }
};

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden"}}>
    {/* Toolbar */}
    <div style={{flexShrink:0,padding:"10px 14px",borderBottom:`1px solid ${T.border}`,background:T.card,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <div>
        <div style={{fontSize:16,fontWeight:900,color:T.text}}>Mijozlar</div>
        <div style={{fontSize:9,color:T.muted}}>{filtered.length} ta</div>
      </div>
      <div style={{position:"relative",flex:"1 1 160px",maxWidth:220}}><span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span><input value={q} onChange={e=>{setQ(e.target.value);setPg(1);}} placeholder="Ism, tel, ID..." style={{...inpS,paddingLeft:22,width:"100%"}}/></div>
      <select value={fC} onChange={e=>{setFC(e.target.value);setPg(1);}} style={{...inpS,width:"auto"}}><option value="">Mamlakat</option>{config.countries.map(c=><option key={c}>{c}</option>)}</select>
      <select value={fSrc} onChange={e=>{setFSrc(e.target.value);setPg(1);}} style={{...inpS,width:"auto"}}><option value="">Manba</option>{config.sources.map(s=><option key={s}>{s}</option>)}</select>
      <select value={fOwn} onChange={e=>{setFOwn(e.target.value);setPg(1);}} style={{...inpS,width:"auto"}}><option value="">Mas'ul</option>{team.filter(t=>t.role!=="partner").map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
      {vacancies.length>0&&<select value={fVacancy} onChange={e=>{setFVacancy(e.target.value);setPg(1);}} style={{...inpS,width:"auto"}}><option value="">Vakansiya</option>{vacancies.map(v=><option key={v.id} value={v.id}>{v.title}{v.company?` — ${v.company}`:""}</option>)}</select>}
      <div style={{marginLeft:"auto",display:"flex",gap:5}}>
        <button onClick={doCSV} style={{padding:"6px 10px",borderRadius:6,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:10}}>📥 CSV</button>
        <button onClick={()=>setShowDateF(s=>!s)} style={{padding:"6px 10px",borderRadius:6,background:showDateF?`${T.accent}22`:T.card2,color:showDateF?T.accent:T.muted,border:`1px solid ${showDateF?T.accent+"44":T.border}`,cursor:"pointer",fontSize:10}}>📅 Sana</button>
        <button onClick={()=>setShowImport(s=>!s)} style={{padding:"6px 10px",borderRadius:6,background:showImport?`${T.accent}22`:T.card2,color:showImport?T.accent:T.muted,border:`1px solid ${showImport?T.accent+"44":T.border}`,cursor:"pointer",fontSize:10}}>📤 Import</button>
        {perm.canEdit&&<button onClick={addLead} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Yangi</button>}
      </div>
    </div>
    {/* Import panel */}
    {showDateF&&<div style={{flexShrink:0,padding:"8px 14px",borderBottom:`1px solid ${T.border}`,background:T.card2,display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
      <select value={fDateField} onChange={e=>{setFDateField(e.target.value);setPg(1);}} style={{...inpS,width:"auto",fontSize:10}}>
        <option value="createdAt">📅 Qayd qilingan</option>
        <option value="lastCall">📞 So'ngi aloqa</option>
        <option value="onlaynSuhbat">💻 Onlayn suhbat</option>
        <option value="officeSuhbat">🏢 Suhbatga kelgan</option>
        <option value="shartnomaSana">📄 Shartnoma qilgan</option>
      </select>
      <input type="date" value={fDateFrom} onChange={e=>{setFDateFrom(e.target.value);setPg(1);}} style={{...inpS,width:"auto"}} placeholder="dan"/>
      <span style={{fontSize:10,color:T.muted}}>–</span>
      <input type="date" value={fDateTo} onChange={e=>{setFDateTo(e.target.value);setPg(1);}} style={{...inpS,width:"auto"}} placeholder="gacha"/>
      <button onClick={()=>{setFDateFrom("");setFDateTo("");}} style={{padding:"4px 8px",borderRadius:4,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9}}>✕</button>
    </div>}
    {showImport&&<div style={{flexShrink:0,padding:"8px 14px",borderBottom:`1px solid ${T.border}`,background:T.card2}}>
      <div style={{fontSize:9,fontWeight:600,color:T.text,marginBottom:4}}>CSV Import — sarlavha: id,name,phone,status,country,source,comment</div>
      <input type="file" ref={csvRef} accept=".csv" style={{display:"none"}} onChange={e=>{const r=new FileReader();r.onload=ev=>setCsvTxt(ev.target.result);r.readAsText(e.target.files[0]);}}/>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>csvRef.current.click()} style={{padding:"4px 9px",borderRadius:5,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:700}}>📁 Fayl</button>
        <textarea value={csvTxt} onChange={e=>setCsvTxt(e.target.value)} rows={2} placeholder="yoki CSV matnini shu yerga joylashtiring..." style={{...inpS,flex:1,fontSize:8,resize:"none"}}/>
        <button onClick={importCSV} style={{padding:"4px 12px",borderRadius:5,background:T.green,color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:700}}>✓ Import</button>
      </div>
      {csvResult&&<div style={{fontSize:9,color:T.green,marginTop:3,fontWeight:600}}>{csvResult}</div>}
    </div>}
    {/* Group tabs */}
    <div style={{flexShrink:0,display:"flex",gap:0,overflowX:"auto",borderBottom:`1px solid ${T.border}`,background:T.card}}>
      {Object.entries(GROUPS).map(([k,label])=>{
        const cnt=k==="all"?leads.length:leads.filter(l=>S2G[l.status]===k).length;
        return <button key={k} onClick={()=>{setFGroup(k);setPg(1);}} style={{padding:"7px 11px",border:"none",borderBottom:fGroup===k?`2px solid ${T.accent}`:"2px solid transparent",background:"none",cursor:"pointer",fontSize:9,fontWeight:fGroup===k?700:400,color:fGroup===k?T.accent:T.muted,whiteSpace:"nowrap"}}>
          {label} <span style={{fontSize:8,opacity:.7}}>({cnt})</span>
        </button>;
      })}
    </div>
    {/* Bulk bar */}
    {canBulk&&sel.size>0&&<div style={{flexShrink:0,display:"flex",gap:8,alignItems:"center",padding:"6px 14px",background:`${T.accent}15`,borderBottom:`1px solid ${T.accent}33`}}>
      <span style={{fontSize:11,fontWeight:700,color:T.accent}}>{sel.size} ta tanlandi</span>
      <button onClick={()=>{const ids=[...sel];const cnt=ids.length;if(!cnt)return;if(!window.confirm(cnt+" ta arxivlansinmi?"))return;setLeads(p=>p.map(l=>ids.includes(l.id)?{...l,archived:true}:l));setSel(new Set());addNotif&&addNotif("📦 "+cnt+" ta arxivlandi");}} style={{padding:"4px 10px",borderRadius:5,background:`${T.yellow}22`,color:T.yellow,border:`1px solid ${T.yellow}44`,cursor:"pointer",fontSize:9,fontWeight:600}}>📦 Arxivlash</button>
      <button onClick={async () => {
          const ids = [...sel];
          const cnt = ids.length;

          if (!cnt) return;

          if (!window.confirm(cnt + " ta o'chirilsinmi? Bu amalni qaytarib bo'lmaydi!")) return;

          try {
            for (const id of ids) {
              await deleteLead(id, false);
            }

            setSel(new Set());
            addNotif && addNotif("🗑️ " + cnt + " ta o'chirildi");
          } catch (err) {
            alert("O'chirishda xatolik: " + err.message);
          }
        }} style={{padding:"4px 10px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9,fontWeight:600}}>🗑️ O'chirish</button>
      <button onClick={()=>setSel(new Set())} style={{padding:"4px 8px",borderRadius:5,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:9}}>✕</button>
    </div>}
    {/* Table */}
    <div style={{flex:1,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>
          {canBulk&&<th style={{padding:"8px 9px",background:T.card2,borderBottom:`1px solid ${T.border}`,width:28}}><input type="checkbox" checked={pageData.length>0&&pageData.every(l=>sel.has(l.id))} onChange={e=>{if(e.target.checked)setSel(p=>{const n=new Set(p);pageData.forEach(l=>n.add(l.id));return n;});else setSel(p=>{const n=new Set(p);pageData.forEach(l=>n.delete(l.id));return n;});}} style={{accentColor:T.accent,cursor:"pointer"}}/></th>}
          <Th c="id" label="№ / ID"/><Th c="name" label="Ism"/><th style={{padding:"8px 9px",textAlign:"left",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`}}>Tel</th><th style={{padding:"8px 9px",textAlign:"left",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`}}>Mamlakat</th><Th c="status" label="Holat"/><th style={{padding:"8px 9px",textAlign:"left",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`}}>Mas'ul</th><th style={{padding:"8px 9px",textAlign:"left",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`}}>Manba</th><th style={{padding:"8px 9px",textAlign:"left",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`}}>Izoh</th><th style={{padding:"8px 9px",background:T.card2,borderBottom:`1px solid ${T.border}`}}/>
        </tr></thead>
        <tbody>
          {pageData.map((l,i)=>{
            const gone=DONE.includes(l.status); const lost=LOST.includes(l.status);
            const od=tasks.some(t=>t.leadId===l.id&&t.status!=="done"&&isOD(t.due));
            const owners=[l.ownerSales,l.ownerConsult,l.ownerDocs].filter(Boolean).filter((v,j,a)=>a.indexOf(v)===j);
            return <tr key={l.id} onClick={()=>open(l)} style={{cursor:"pointer",borderBottom:`1px solid ${T.border}22`,background:sel.has(l.id)?`${T.accent}12`:gone?`${T.green}08`:lost?`${T.red}08`:"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background=sel.has(l.id)?`${T.accent}18`:`${T.accent}08`}
              onMouseLeave={e=>e.currentTarget.style.background=sel.has(l.id)?`${T.accent}12`:gone?`${T.green}08`:lost?`${T.red}08`:"transparent"}>
              {canBulk&&<td style={{padding:"7px 9px"}} onClick={e=>{e.stopPropagation();setSel(p=>{const n=new Set(p);n.has(l.id)?n.delete(l.id):n.add(l.id);return n;})}}><input type="checkbox" checked={sel.has(l.id)} onChange={()=>{}} style={{accentColor:T.accent,cursor:"pointer"}}/></td>}
              <td style={{padding:"7px 9px",color:T.accent,fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{(pg-1)*PER+i+1} <span style={{color:T.muted,fontSize:8}}>#{l.id}</span></td>
              <td style={{padding:"7px 9px"}}><span style={{fontWeight:700,color:T.text}}>{l.name||"–"}</span>{od&&<span style={{color:T.red,marginLeft:4,fontSize:9}}>⚠️</span>}</td>
              <td style={{padding:"7px 9px",color:T.cyan,fontSize:10,whiteSpace:"nowrap"}}>{l.phone||"–"}</td>
              <td style={{padding:"7px 9px",color:T.sub,fontSize:10}}>{l.country||"–"}</td>
              <td style={{padding:"7px 9px"}}><Pill sk={l.status}/></td>
              <td style={{padding:"7px 9px"}}><div style={{display:"flex",gap:2}}>{owners.map(id=><Av key={id} id={id} team={team} size={18}/>)}</div></td>
              <td style={{padding:"7px 9px",color:T.muted,fontSize:9,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.source||"–"}</td>
              <td style={{padding:"7px 9px",color:T.muted,fontSize:9,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.comment||"–"}</td>
              <td style={{padding:"7px 9px"}} onClick={e=>e.stopPropagation()}>{perm.canEdit&&<button onClick={()=>open(l)} style={{padding:"2px 7px",borderRadius:4,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:9}}>{I.edit}</button>}</td>
            </tr>;
          })}
        </tbody>
      </table>
      {pageData.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:T.muted,fontSize:12}}>Mijoz topilmadi</div>}
    </div>
    {/* Pagination */}
    <div style={{flexShrink:0,padding:"7px 14px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.card}}>
      <span style={{fontSize:9,color:T.muted}}>{filtered.length} dan {Math.min((pg-1)*PER+1,filtered.length)}–{Math.min(pg*PER,filtered.length)}</span>
      <div style={{display:"flex",gap:3}}>
        <button onClick={()=>setPg(1)} disabled={pg===1} style={{padding:"3px 7px",borderRadius:4,border:`1px solid ${T.border}`,background:T.card2,color:pg===1?T.border:T.text,cursor:pg===1?"default":"pointer",fontSize:10}}>«</button>
        <button onClick={()=>setPg(p=>Math.max(1,p-1))} disabled={pg===1} style={{padding:"3px 7px",borderRadius:4,border:`1px solid ${T.border}`,background:T.card2,color:pg===1?T.border:T.text,cursor:pg===1?"default":"pointer",fontSize:10}}>‹</button>
        <span style={{padding:"3px 8px",fontSize:10,color:T.text}}>{pg} / {totalPg}</span>
        <button onClick={()=>setPg(p=>Math.min(totalPg,p+1))} disabled={pg===totalPg} style={{padding:"3px 7px",borderRadius:4,border:`1px solid ${T.border}`,background:T.card2,color:pg===totalPg?T.border:T.text,cursor:pg===totalPg?"default":"pointer",fontSize:10}}>›</button>
        <button onClick={()=>setPg(totalPg)} disabled={pg===totalPg} style={{padding:"3px 7px",borderRadius:4,border:`1px solid ${T.border}`,background:T.card2,color:pg===totalPg?T.border:T.text,cursor:pg===totalPg?"default":"pointer",fontSize:10}}>»</button>
      </div>
    </div>
  </div>;
}

export { LeadsList };
