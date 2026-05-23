import { useState, useRef } from "react";
import { useT } from "./theme.js";
import { STAGES, gS } from "./constants.js";


// ─── HELPERS ──────────────────────────────────────────────────────────────────
const NOW = new Date();
const isOD = d => d && new Date(d) < NOW;
const isSoon = d => { if(!d)return false; const v=(new Date(d)-NOW)/864e5; return v>=0&&v<=2; };
const fmtD = d => { try{return new Date(d).toLocaleDateString("uz-UZ",{day:"2-digit",month:"short"});}catch{return d||"–";} };
const fmtM = n => !n?0: n>=1000000?`${(n/1000000).toFixed(2)} mln`:n>=1000?`${(n/1000).toFixed(0)}K`:n;
const fmtMs = n => !n?0: n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(0)}K`:n;
const uid = () => Date.now()+Math.floor(Math.random()*1000);
const dateRange = (d, range) => {
  const n = new Date(); const dt = new Date(d);
  if(range==="today") { const s=new Date(n); s.setHours(0,0,0,0); return dt>=s; }
  if(range==="week")  { const s=new Date(n-7*864e5); return dt>=s; }
  if(range==="month") { const s=new Date(n.getFullYear(),n.getMonth(),1); return dt>=s; }
  return true;
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = {
  dash:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  pipe:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="11" width="4" height="10" rx="1"/></svg>,
  list:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>,
  task:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  money: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  team:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  flag:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  chart: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  gear:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  logout:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  plus:  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x:     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bell:  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search:<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit:  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  sun:   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  chev:  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  phone: <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  up:    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  salary:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  report:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  clock: <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Pill({sk}) {
  const T=useT(); const s=gS(sk);
  return <span style={{background:`${s.c}${T.dark?"33":"18"}`,color:s.c,border:`1px solid ${s.c}${T.dark?"55":"33"}`,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}}>{s.label}</span>;
}
function Av({id,team,size=26}) {
  const T=useT(); const u=team?.find(t=>t.id===id);
  if(!u) return null;
  return <div title={u.name} style={{width:size,height:size,borderRadius:"50%",background:`${u.color}22`,border:`1.5px solid ${u.color}88`,color:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:800,flexShrink:0}}>{u.av}</div>;
}
function StatCard({icon,label,value,sub,color}) {
  const T=useT(); const c=color||T.accent;
  return <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:600}}>{label}</span><span style={{fontSize:18}}>{icon}</span></div>
    <div style={{fontSize:22,fontWeight:800,color:T.text,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:T.muted,marginTop:2}}>{sub}</div>}
  </div>;
}
function Modal({children,onClose,width=480}) {
  const T=useT();
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}>
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,width:"100%",maxWidth:width,maxHeight:"92vh",overflowY:"auto",boxShadow:T.shadow}}>{children}</div>
  </div>;
}
// Searchable select for leads/team
function SearchSelect({items,value,onChange,placeholder}) {
  const T=useT(); const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const ref=useRef();
  const fil=items.filter(it=>!q||it.label.toLowerCase().includes(q.toLowerCase())||it.id?.toString().includes(q)||it.phone?.includes(q));
  const sel=items.find(it=>it.value===value);
  return <div ref={ref} style={{position:"relative"}}>
    <div onClick={()=>setOpen(o=>!o)} style={{padding:"8px 10px",borderRadius:7,border:`1px solid ${T.border}`,background:T.inp,color:sel?T.text:T.muted,fontSize:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",userSelect:"none"}}>
      <span>{sel?sel.label:placeholder||"Tanlang"}</span>
      <span style={{color:T.muted,fontSize:10}}>▼</span>
    </div>
    {open&&<div style={{position:"absolute",top:"105%",left:0,right:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,boxShadow:T.shadow,zIndex:200,maxHeight:240,overflowY:"auto"}}>
      <div style={{padding:"6px 8px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{position:"relative"}}><span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Qidirish (ID, Ism, Tel)..." style={{width:"100%",padding:"6px 8px 6px 24px",borderRadius:5,border:`1px solid ${T.border}`,background:T.inp,color:T.text,fontSize:11,outline:"none",boxSizing:"border-box"}} autoFocus/></div>
      </div>
      {fil.map(it=><div key={it.value} onClick={()=>{onChange(it.value);setOpen(false);setQ("");}} style={{padding:"8px 10px",cursor:"pointer",fontSize:12,color:T.text,background:it.value===value?`${T.accent}22`:"transparent",borderBottom:`1px solid ${T.border}22`}}
        onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}15`} onMouseLeave={e=>e.currentTarget.style.background=it.value===value?`${T.accent}22`:"transparent"}>
        <div style={{fontWeight:600}}>{it.label}</div>
        {(it.id||it.phone)&&<div style={{fontSize:9,color:T.muted}}>{[it.id,it.phone].filter(Boolean).join(" · ")}</div>}
      </div>)}
      {fil.length===0&&<div style={{padding:12,color:T.muted,fontSize:11,textAlign:"center"}}>Topilmadi</div>}
    </div>}
  </div>;
}
function inp(T) { return {width:"100%",padding:"8px 10px",borderRadius:7,border:`1px solid ${T.border}`,background:T.inp,color:T.text,fontSize:12,outline:"none",boxSizing:"border-box"}; }
function lab(T) { return {fontSize:10,fontWeight:600,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}; }

export {
uid, fmtM, fmtMs, fmtD,
isOD, isSoon, dateRange,
inp, lab, gS,
I, Pill, Av, StatCard, Modal, SearchSelect
};