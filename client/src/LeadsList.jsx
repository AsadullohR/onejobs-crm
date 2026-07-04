import { useState, useRef } from "react";
import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { uid, fmtMs, isOD, inp, I, Pill, Av, fmtD } from "./helpers.jsx";
import { leadsAPI } from "./api.js";

// ─── ROW COLOR BY STATUS ─────────────────────────────────────────────────────
const ROW_BG = (status, T) => {
  const s = status || "";
  if (["Jo'nab ketdi","Viza Oldi","Viza Olidi"].includes(s))        return T.dark ? "#0d2818" : "#e8f5e9";
  if (["Shartnoma qildi","XBA To'lov qildi","1 - Qism To'landi","Ishga qabul qilindi"].includes(s))
    return T.dark ? "#2d1200" : "#fff3e0";
  if (["Suhbat","Onlayn Suhbat","Onlayn Suhbat Uchun"].includes(s)) return T.dark ? "#1a1a2e" : "#fce4ec";
  if (["Hujjatlar Tayyorlanmoqda","Hujjatlar Jonatildi","Hujjatlar Jonatilishga Tayyor","Vizaga Topshirildi"].includes(s))
    return T.dark ? "#1a2036" : "#e3f2fd";
  if (LOST.includes(s))  return T.dark ? "#1c1010" : "#fafafa";
  if (DONE.includes(s))  return T.dark ? "#0d2020" : "#f1fdf4";
  return "transparent";
};

const STATUS_LEGEND = [
  { color: "#e8f5e9", dark: "#0d2818", label: "Jo'nab ketdi / Viza" },
  { color: "#fff3e0", dark: "#2d1200", label: "To'lov / Shartnoma" },
  { color: "#fce4ec", dark: "#1a1a2e", label: "Suhbat" },
  { color: "#e3f2fd", dark: "#1a2036", label: "Hujjatlar / Viza jarayoni" },
];

// ─── LEADS LIST ──────────────────────────────────────────────────────────────
function LeadsList({leads, tasks, team, user, open, addLead, config, roles, setLeads, deleteLead, addNotif, vacancies=[], candidates=[]}) {
  const T = useT();
  const perm = roles[user.role] || {};
  const canBulk = user.role === "admin" || user.role === "manager";
  const [sel, setSel] = useState(new Set());
  const [q, setQ] = useState(""); const [fGroup, setFGroup] = useState("all");
  const [fC, setFC] = useState(""); const [fSrc, setFSrc] = useState(""); const [fOwn, setFOwn] = useState(""); const [fVacancy, setFVacancy] = useState("");
  const [fDateField, setFDateField] = useState("createdAt"); const [fDateFrom, setFDateFrom] = useState(""); const [fDateTo, setFDateTo] = useState("");
  const [showDateF, setShowDateF] = useState(false);
  const [pg, setPg] = useState(1); const [sort, setSort] = useState({ col: "id", dir: "desc" });
  const [showImport, setShowImport] = useState(false); const [csvTxt, setCsvTxt] = useState(""); const [csvResult, setCsvResult] = useState(null);
  const csvRef = useRef(); const PER = 50; const inpS = inp(T);

  const GROUPS = { all: "Barchasi", new: "Yangi", contact: "Aloqa", deal: "Jarayon", payment: "To'lov", docs: "Hujjatlar", visa: "Viza", done: "Tugagan", lost: "Bekor", hold: "Keyinchalik" };
  const S2G = { "Yangi": "new", "Qilindi": "new", "Bog'landi": "contact", "Boglanildi": "contact", "Onlayn Suhbat Uchun": "contact", "Onlayn Suhbat": "contact", "Suhbat": "contact", "Shartnoma qildi": "deal", "XBA To'lov qildi": "deal", "CV Topshirildi": "deal", "Interview ga qo'yildi": "deal", "Ishga qabul qilindi": "deal", "1 - Qism To'landi": "payment", "Hujjatlar Tayyorlanmoqda": "docs", "Hujjatlar Jonatilishga Tayyor": "docs", "Hujjatlar Jonatildi": "docs", "Ish shartnomasi keldi": "docs", "Ish shartnomasi imzolandi": "docs", "Taklifnoma keldi": "docs", "Elchixonaga Hujjatlar Tayyor": "visa", "Vizaga Topshirildi": "visa", "Viza Oldi": "done", "Viza Olidi": "done", "Jo'nab ketdi": "done", "Viza Rad Etildi": "lost", "Bekor qildi": "lost", "Anchagacha Ko'tarmadi": "lost", "Keyinchalik": "hold" };

  const filtered = leads.filter(l => {
    if (q && !l.name?.toLowerCase().includes(q.toLowerCase()) && !l.phone?.includes(q) && !l.id?.includes(q) && !l.comment?.toLowerCase().includes(q.toLowerCase())) return false;
    if (fGroup !== "all" && S2G[l.status] !== fGroup) return false;
    if (fC && !l.country?.includes(fC)) return false;
    if (fSrc && l.source !== fSrc) return false;
    if (fOwn && l.ownerSales !== parseInt(fOwn) && l.ownerConsult !== parseInt(fOwn) && l.ownerDocs !== parseInt(fOwn)) return false;
    if (fDateFrom || fDateTo) { const v = l[fDateField]; if (!v) return false; if (fDateFrom && v < fDateFrom) return false; if (fDateTo && v > fDateTo) return false; }
    if (fVacancy) { const vacLeadIds = new Set(candidates.filter(c => String(c.vacancyId) === String(fVacancy)).map(c => c.leadId)); if (!vacLeadIds.has(l.id)) return false; }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const v = (x) => sort.col === "id" ? x.id : sort.col === "name" ? x.name || "" : sort.col === "status" ? x.status || "" : x.createdAt || "";
    const r = v(a) < v(b) ? -1 : v(a) > v(b) ? 1 : 0; return sort.dir === "asc" ? r : -r;
  });
  const totalPg = Math.max(1, Math.ceil(sorted.length / PER));
  const pageData = sorted.slice((pg - 1) * PER, pg * PER);

  const Th = ({ c, label }) => (
    <th onClick={() => setSort(s => ({ col: c, dir: s.col === c && s.dir === "asc" ? "desc" : "asc" }))}
      style={{ padding: "8px 9px", textAlign: "left", fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", background: T.card2, borderBottom: `1px solid ${T.border}`, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", letterSpacing: "0.04em" }}>
      {label}{sort.col === c ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );
  const Thp = ({ label }) => (
    <th style={{ padding: "8px 9px", textAlign: "left", fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", background: T.card2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>{label}</th>
  );

  const doCSV = () => {
    const h = "ID,Ism,Tel,Holat,Mamlakat,Manba,Izoh";
    const rows = filtered.map(l => [l.id, l.name || "", l.phone || "", l.status || "", l.country || "", l.source || "", (l.comment || "").replace(/,/g, " ")].join(","));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([h + "\n" + rows.join("\n")], { type: "text/csv" })); a.download = "mijozlar.csv"; a.click();
  };

  const importCSV = async () => {
    try {
      const rows = csvTxt.trim().split("\n").filter(Boolean);
      if (rows.length < 2) { setCsvResult("Kamida 2 qator kerak"); return; }
      const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
      const leadsToImport = rows.slice(1).map((row, index) => {
        const cols = row.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const get = k => { const i = headers.indexOf(k); return i >= 0 ? cols[i] || "" : ""; };
        const name = get("name") || get("ism");
        if (!name) return null;
        return { id: get("id") || `IMP-${Date.now()}-${index}`, name, phone: get("phone") || get("tel"), telegram: get("telegram"), status: get("status") || get("holat") || "Yangi", country: get("country") || get("mamlakat"), sector: get("sector") || get("soha"), position: get("position") || get("lavozim"), source: get("source") || get("manba") || "CSV Import", gender: get("gender") || get("jinsi"), comment: get("comment") || get("izoh"), note: get("note") || "" };
      }).filter(Boolean);
      const result = await leadsAPI.bulkImport(leadsToImport);
      setCsvResult(`✅ Import qilindi: ${result.inserted} yangi, ${result.updated} yangilandi`);
      const fresh = await leadsAPI.getAll({ limit: 10000 });
      setLeads(fresh.leads || fresh || []);
      addNotif && addNotif(`📥 Import: ${result.inserted} yangi, ${result.updated} yangilandi`);
      setTimeout(() => { setShowImport(false); setCsvTxt(""); setCsvResult(null); }, 2000);
    } catch (err) { setCsvResult("❌ Import xatosi: " + err.message); }
  };

  // Build lead→vacancy lookup
  const leadVacMap = {};
  candidates.forEach(c => {
    if (!leadVacMap[c.leadId]) leadVacMap[c.leadId] = [];
    const vac = vacancies.find(v => v.id === c.vacancyId);
    if (vac) leadVacMap[c.leadId].push({ vac, cand: c });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ flexShrink: 0, padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: T.card, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>Mijozlar ro'yxati</div>
          <div style={{ fontSize: 9, color: T.muted }}>{filtered.length} ta qayd</div>
        </div>
        <div style={{ position: "relative", flex: "1 1 160px", maxWidth: 220 }}>
          <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", color: T.muted }}>{I.search}</span>
          <input value={q} onChange={e => { setQ(e.target.value); setPg(1); }} placeholder="Ism, tel, ID..." style={{ ...inpS, paddingLeft: 22, width: "100%" }} />
        </div>
        <select value={fC} onChange={e => { setFC(e.target.value); setPg(1); }} style={{ ...inpS, width: "auto" }}>
          <option value="">🌍 Mamlakat</option>
          {config.countries.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={fSrc} onChange={e => { setFSrc(e.target.value); setPg(1); }} style={{ ...inpS, width: "auto" }}>
          <option value="">📋 Manba</option>
          {config.sources.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={fOwn} onChange={e => { setFOwn(e.target.value); setPg(1); }} style={{ ...inpS, width: "auto" }}>
          <option value="">👤 Mas'ul</option>
          {team.filter(t => !["partner","employer"].includes(t.role)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {vacancies.length > 0 && (
          <select value={fVacancy} onChange={e => { setFVacancy(e.target.value); setPg(1); }} style={{ ...inpS, width: "auto" }}>
            <option value="">💼 Vakansiya</option>
            {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}{v.company ? ` — ${v.company}` : ""}</option>)}
          </select>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <button onClick={doCSV} style={{ padding: "6px 10px", borderRadius: 6, background: T.card2, color: T.muted, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 10 }}>📥 CSV</button>
          <button onClick={() => setShowDateF(s => !s)} style={{ padding: "6px 10px", borderRadius: 6, background: showDateF ? `${T.accent}22` : T.card2, color: showDateF ? T.accent : T.muted, border: `1px solid ${showDateF ? T.accent + "44" : T.border}`, cursor: "pointer", fontSize: 10 }}>📅 Sana</button>
          <button onClick={() => setShowImport(s => !s)} style={{ padding: "6px 10px", borderRadius: 6, background: showImport ? `${T.accent}22` : T.card2, color: showImport ? T.accent : T.muted, border: `1px solid ${showImport ? T.accent + "44" : T.border}`, cursor: "pointer", fontSize: 10 }}>📤 Import</button>
          {perm.canEdit && <button onClick={addLead} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 6, background: T.accent, color: "#fff", fontWeight: 700, fontSize: 11, border: "none", cursor: "pointer" }}>{I.plus} Yangi</button>}
        </div>
      </div>

      {/* Date filter panel */}
      {showDateF && (
        <div style={{ flexShrink: 0, padding: "8px 14px", borderBottom: `1px solid ${T.border}`, background: T.card2, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <select value={fDateField} onChange={e => { setFDateField(e.target.value); setPg(1); }} style={{ ...inpS, width: "auto", fontSize: 10 }}>
            <option value="createdAt">📅 Qayd qilingan</option>
            <option value="lastCall">📞 So'ngi aloqa</option>
            <option value="officeSuhbat">🏢 Suhbatga kelgan</option>
            <option value="shartnomaSana">📄 Shartnoma qilgan</option>
          </select>
          <input type="date" value={fDateFrom} onChange={e => { setFDateFrom(e.target.value); setPg(1); }} style={{ ...inpS, width: "auto" }} />
          <span style={{ fontSize: 10, color: T.muted }}>–</span>
          <input type="date" value={fDateTo} onChange={e => { setFDateTo(e.target.value); setPg(1); }} style={{ ...inpS, width: "auto" }} />
          <button onClick={() => { setFDateFrom(""); setFDateTo(""); }} style={{ padding: "4px 8px", borderRadius: 4, background: `${T.red}22`, color: T.red, border: `1px solid ${T.red}44`, cursor: "pointer", fontSize: 9 }}>✕</button>
        </div>
      )}

      {/* Import panel */}
      {showImport && (
        <div style={{ flexShrink: 0, padding: "8px 14px", borderBottom: `1px solid ${T.border}`, background: T.card2 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: T.text, marginBottom: 4 }}>CSV Import — sarlavha: id,name,phone,status,country,source,comment</div>
          <input type="file" ref={csvRef} accept=".csv" style={{ display: "none" }} onChange={e => { const r = new FileReader(); r.onload = ev => setCsvTxt(ev.target.result); r.readAsText(e.target.files[0]); }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => csvRef.current.click()} style={{ padding: "4px 9px", borderRadius: 5, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>📁 Fayl</button>
            <textarea value={csvTxt} onChange={e => setCsvTxt(e.target.value)} rows={2} placeholder="yoki CSV matnini shu yerga joylashtiring..." style={{ ...inpS, flex: 1, fontSize: 8, resize: "none" }} />
            <button onClick={importCSV} style={{ padding: "4px 12px", borderRadius: 5, background: T.green, color: "#fff", border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>✓ Import</button>
          </div>
          {csvResult && <div style={{ fontSize: 9, color: T.green, marginTop: 3, fontWeight: 600 }}>{csvResult}</div>}
        </div>
      )}

      {/* Group tabs */}
      <div style={{ flexShrink: 0, display: "flex", gap: 0, overflowX: "auto", borderBottom: `1px solid ${T.border}`, background: T.card }}>
        {Object.entries(GROUPS).map(([k, label]) => {
          const cnt = k === "all" ? leads.length : leads.filter(l => S2G[l.status] === k).length;
          return (
            <button key={k} onClick={() => { setFGroup(k); setPg(1); }}
              style={{ padding: "7px 11px", border: "none", borderBottom: fGroup === k ? `2px solid ${T.accent}` : "2px solid transparent", background: "none", cursor: "pointer", fontSize: 9, fontWeight: fGroup === k ? 700 : 400, color: fGroup === k ? T.accent : T.muted, whiteSpace: "nowrap" }}>
              {label} <span style={{ fontSize: 8, opacity: .7 }}>({cnt})</span>
            </button>
          );
        })}
      </div>

      {/* Status legend */}
      <div style={{ flexShrink: 0, display: "flex", gap: 14, padding: "5px 14px", background: T.card, borderBottom: `1px solid ${T.border}`, flexWrap: "wrap", alignItems: "center" }}>
        {STATUS_LEGEND.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: T.dark ? s.dark : s.color, border: `1px solid ${T.border}` }} />
            <span style={{ fontSize: 9, color: T.muted }}>{s.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "transparent", border: `1px solid ${T.border}` }} />
          <span style={{ fontSize: 9, color: T.muted }}>Boshqa</span>
        </div>
      </div>

      {/* Bulk bar */}
      {canBulk && sel.size > 0 && (
        <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center", padding: "6px 14px", background: `${T.accent}15`, borderBottom: `1px solid ${T.accent}33` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{sel.size} ta tanlandi</span>
          <button onClick={() => { const ids = [...sel]; if (!ids.length || !window.confirm(ids.length + " ta arxivlansinmi?")) return; setLeads(p => p.map(l => ids.includes(l.id) ? { ...l, archived: true } : l)); setSel(new Set()); addNotif && addNotif("📦 " + ids.length + " ta arxivlandi"); }}
            style={{ padding: "4px 10px", borderRadius: 5, background: `${T.yellow}22`, color: T.yellow, border: `1px solid ${T.yellow}44`, cursor: "pointer", fontSize: 9, fontWeight: 600 }}>📦 Arxivlash</button>
          <button onClick={async () => {
            const ids = [...sel]; if (!ids.length || !window.confirm(ids.length + " ta o'chirilsinmi?")) return;
            try { for (const id of ids) await deleteLead(id, false); setSel(new Set()); addNotif && addNotif("🗑️ " + ids.length + " ta o'chirildi"); }
            catch (err) { alert("O'chirishda xatolik: " + err.message); }
          }} style={{ padding: "4px 10px", borderRadius: 5, background: `${T.red}22`, color: T.red, border: `1px solid ${T.red}44`, cursor: "pointer", fontSize: 9, fontWeight: 600 }}>🗑️ O'chirish</button>
          <button onClick={() => setSel(new Set())} style={{ padding: "4px 8px", borderRadius: 5, background: T.card2, color: T.muted, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 9 }}>✕</button>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {canBulk && (
                <th style={{ padding: "8px 9px", background: T.card2, borderBottom: `1px solid ${T.border}`, width: 28 }}>
                  <input type="checkbox" checked={pageData.length > 0 && pageData.every(l => sel.has(l.id))}
                    onChange={e => { if (e.target.checked) setSel(p => { const n = new Set(p); pageData.forEach(l => n.add(l.id)); return n; }); else setSel(p => { const n = new Set(p); pageData.forEach(l => n.delete(l.id)); return n; }); }}
                    style={{ accentColor: T.accent, cursor: "pointer" }} />
                </th>
              )}
              <Th c="id" label="№ заявки" />
              <Th c="name" label="Ism / Familiya" />
              <Thp label="Туғ. сана / Паспорт" />
              <Thp label="Консалтинг" />
              <Thp label="Тел" />
              <Thp label="Мамлакат" />
              <Th c="status" label="Ҳолат" />
              <Thp label="Лавозим" />
              <Thp label="То'лов" />
              <Thp label="Ҳужжатлар" />
              <Thp label="Меҳмонхона / Курорт" />
              <Thp label="Давр" />
              <Thp label="Масъул" />
              <th style={{ padding: "8px 9px", background: T.card2, borderBottom: `1px solid ${T.border}` }} />
            </tr>
          </thead>
          <tbody>
            {pageData.map((l, i) => {
              const od = tasks.some(t => t.leadId === l.id && t.status !== "done" && isOD(t.due));
              const owners = [l.ownerSales, l.ownerConsult, l.ownerDocs].filter(Boolean).filter((v, j, a) => a.indexOf(v) === j);
              const rowBg = ROW_BG(l.status, T);
              const vacLinks = leadVacMap[l.id] || [];
              const firstVac = vacLinks[0]?.vac;
              const cv = l.cv || {};
              const docs = l.docs || {};
              const hasPassport = !!(cv.passport || cv.dob);
              // Payment status
              const pays = [
                { k: "xba", label: "XBA", c: "#f97316", v: l.xba },
                { k: "q1",  label: "1-Q",  c: "#ec4899", v: l.q1 },
                { k: "q2",  label: "2-Q",  c: "#8b5cf6", v: l.q2 },
                { k: "q3",  label: "3-Q",  c: "#3b82f6", v: l.q3 },
              ];
              // Doc status
              const docCount = Object.values(docs).filter(Boolean).length;

              return (
                <tr key={l.id} onClick={() => open(l)}
                  style={{ cursor: "pointer", borderBottom: `1px solid ${T.border}33`, background: sel.has(l.id) ? `${T.accent}18` : rowBg, transition: "filter 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.96)"}
                  onMouseLeave={e => e.currentTarget.style.filter = "none"}>
                  {canBulk && (
                    <td style={{ padding: "7px 9px" }} onClick={e => { e.stopPropagation(); setSel(p => { const n = new Set(p); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; }) }}>
                      <input type="checkbox" checked={sel.has(l.id)} onChange={() => {}} style={{ accentColor: T.accent, cursor: "pointer" }} />
                    </td>
                  )}
                  {/* № заявки */}
                  <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.accent }}>{l.id}</div>
                    {od && <span style={{ color: T.red, fontSize: 8 }}>⚠️ muddati</span>}
                  </td>
                  {/* Ism */}
                  <td style={{ padding: "7px 9px", minWidth: 130 }}>
                    <div style={{ fontWeight: 700, color: T.text, fontSize: 11 }}>{l.name || "–"}</div>
                    {l.gender && <div style={{ fontSize: 8, color: T.muted }}>{l.gender === "male" ? "♂" : l.gender === "female" ? "♀" : ""} {l.sector || ""}</div>}
                  </td>
                  {/* DOB / Passport */}
                  <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>
                    {cv.dob && <div style={{ fontSize: 9, color: T.text }}>{cv.dob}</div>}
                    {cv.passport && <div style={{ fontSize: 9, color: T.muted, fontFamily: "monospace" }}>{cv.passport}</div>}
                    {!hasPassport && <span style={{ color: T.border, fontSize: 9 }}>–</span>}
                  </td>
                  {/* Consulting */}
                  <td style={{ padding: "7px 9px", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 9, color: T.text }}>{l.source || "–"}</span>
                  </td>
                  {/* Tel */}
                  <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 10, color: T.cyan || T.accent }}>{l.phone || "–"}</span>
                  </td>
                  {/* Mamlakat */}
                  <td style={{ padding: "7px 9px" }}>
                    <span style={{ fontSize: 9, color: T.sub || T.muted }}>{l.country || "–"}</span>
                  </td>
                  {/* Status */}
                  <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>
                    <Pill sk={l.status} />
                  </td>
                  {/* Lavozim */}
                  <td style={{ padding: "7px 9px", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 9, color: T.muted }}>{l.position || "–"}</span>
                  </td>
                  {/* To'lov */}
                  <td style={{ padding: "7px 9px" }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      {pays.map(p => (
                        <span key={p.k} title={p.label} style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 8,
                          background: p.v ? `${p.c}22` : T.card2,
                          color: p.v ? p.c : T.border,
                          border: `1px solid ${p.v ? p.c + "44" : T.border}`,
                          opacity: p.v ? 1 : 0.4 }}>
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Docs */}
                  <td style={{ padding: "7px 9px", textAlign: "center" }}>
                    {docCount > 0
                      ? <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: `${T.green}18`, padding: "1px 7px", borderRadius: 8, border: `1px solid ${T.green}33` }}>📄 {docCount}</span>
                      : <span style={{ color: T.border, fontSize: 9 }}>–</span>}
                  </td>
                  {/* Hotel / Resort */}
                  <td style={{ padding: "7px 9px", minWidth: 110 }}>
                    {firstVac ? (
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.text }}>{firstVac.company || firstVac.title || "–"}</div>
                        <div style={{ fontSize: 8, color: T.muted }}>{firstVac.city || firstVac.country || ""}</div>
                      </div>
                    ) : <span style={{ color: T.border, fontSize: 9 }}>–</span>}
                  </td>
                  {/* Period */}
                  <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>
                    {firstVac?.periodStart && firstVac?.periodEnd ? (
                      <div style={{ fontSize: 8, color: T.muted }}>
                        <div>{firstVac.periodStart}</div>
                        <div>{firstVac.periodEnd}</div>
                      </div>
                    ) : l.shartnomaSana ? (
                      <div style={{ fontSize: 8, color: T.muted }}>{l.shartnomaSana}</div>
                    ) : <span style={{ color: T.border, fontSize: 9 }}>–</span>}
                  </td>
                  {/* Owner */}
                  <td style={{ padding: "7px 9px" }}>
                    <div style={{ display: "flex", gap: 2 }}>{owners.map(id => <Av key={id} id={id} team={team} size={18} />)}</div>
                  </td>
                  {/* Edit */}
                  <td style={{ padding: "7px 9px" }} onClick={e => e.stopPropagation()}>
                    {perm.canEdit && (
                      <button onClick={() => open(l)} style={{ padding: "2px 7px", borderRadius: 4, background: `${T.accent}22`, color: T.accent, border: `1px solid ${T.accent}44`, cursor: "pointer", fontSize: 9 }}>{I.edit}</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pageData.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontSize: 12 }}>Mijoz topilmadi</div>}
      </div>

      {/* Pagination */}
      <div style={{ flexShrink: 0, padding: "7px 14px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card }}>
        <span style={{ fontSize: 9, color: T.muted }}>{filtered.length} dan {Math.min((pg - 1) * PER + 1, filtered.length)}–{Math.min(pg * PER, filtered.length)}</span>
        <div style={{ display: "flex", gap: 3 }}>
          {[["«", 1], ["‹", Math.max(1, pg - 1)], null, ["›", Math.min(totalPg, pg + 1)], ["»", totalPg]].map((item, i) =>
            item === null
              ? <span key={i} style={{ padding: "3px 8px", fontSize: 10, color: T.text }}>{pg} / {totalPg}</span>
              : <button key={i} onClick={() => setPg(item[1])} disabled={pg === item[1] && (item[0] === "«" || item[0] === "‹") || pg === item[1] && (item[0] === "»" || item[0] === "›")}
                  style={{ padding: "3px 7px", borderRadius: 4, border: `1px solid ${T.border}`, background: T.card2, color: T.text, cursor: "pointer", fontSize: 10 }}>{item[0]}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export { LeadsList };
