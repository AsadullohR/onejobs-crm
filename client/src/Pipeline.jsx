import { useState, useRef, useEffect } from "react";
import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { isOD, inp, I, Pill, Av, fmtD, dateRange } from "./helpers.jsx";
import { leadsAPI } from "./api.js";

// ─── PIPELINE ────────────────────────────────────────────────────────────────
function Pipeline({
  leads,
  setLeads,
  tasks,
  team,
  user,
  open,
  addLead,
  config,
  roles,
  stages,
  setStages,
  vacancies = [],
  candidates = [],
}) {
  const T = useT();
  const perm = roles[user.role] || {};
  const [search, setSearch] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fSector, setFSector] = useState("");
  const [fPosition, setFPosition] = useState("");
  const [fDate, setFDate] = useState("");
  const [fDateField, setFDateField] = useState("createdAt");
  const [fDateMode, setFDateMode] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fHasTasks, setFHasTasks] = useState(false);
  const [fSource, setFSource] = useState("");
  const [fGender, setFGender] = useState("");
  const [fVacancy, setFVacancy] = useState("");
  const [fQuality, setFQuality] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showLastCallReport, setShowLastCallReport] = useState(false);
  const [lcDateFrom, setLcDateFrom] = useState(() => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
  const [lcDateTo,   setLcDateTo]   = useState(() => new Date().toISOString().slice(0, 10));
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      // Ctrl+F or Cmd+F  →  focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      // Escape  →  clear search & blur
      if (e.key === "Escape") {
        setSearch("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Multi-select: Ctrl/Cmd+click toggles; dragging a selected card moves all.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setSelectedIds(new Set()); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Time-in-status color coding driven by the SAME norms (mez) as the
  // KPI / Vaqt Tahlili section — no separate configuration to maintain.
  // Norm days per status; card is green up to 50% of the norm, hits the
  // orange midpoint AT the norm, and is fully red at 1.5x the norm.
  // Per-stage rules in DAYS: { g: fully green until, r: fully red at, mez: norm }
  const mkRule = (g, r, mez) => ({ g, r, mez });
  const EARLY   = mkRule(1, 7, 1);      // Yangi / Qilindi / Bog'lanildi: green 24h, red at 7 days
  const SUHBAT_R = mkRule(2.5, 7.5, 5);
  const CONTRACT = mkRule(1.5, 4.5, 3);
  const HIREDOCS = mkRule(7, 21, 14);
  const INVITE   = mkRule(45, 135, 90);
  const VISA_R   = mkRule(15, 45, 30);
  const STALE = {
    "Yangi": EARLY, "Qilindi": EARLY, "Bog'landi": EARLY, "Boglanildi": EARLY,
    "Onlayn Suhbat Uchun": SUHBAT_R, "Onlayn Suhbat": SUHBAT_R, "Suhbat": SUHBAT_R,
    "Shartnoma qildi": CONTRACT, "XBA To'lov qildi": CONTRACT,
    "CV Topshirildi": HIREDOCS, "Interview ga qo'yildi": HIREDOCS, "Ishga qabul qilindi": HIREDOCS, "1 - Qism To'landi": HIREDOCS,
    "Hujjatlar Tayyorlanmoqda": HIREDOCS, "Hujjatlar Jonatilishga Tayyor": HIREDOCS, "Hujjatlar Jonatildi": HIREDOCS,
    "Ish shartnomasi keldi": HIREDOCS, "Ish shartnomasi imzolandi": HIREDOCS,
    "Taklifnoma keldi": INVITE, "Elchixonaga Hujjatlar Tayyor": INVITE,
    "Vizaga Topshirildi": VISA_R,
  };
  const STALE_DEFAULT = HIREDOCS;

  const staleColor = (lead) => {
    if (DONE.includes(lead.status) || LOST.includes(lead.status)) return null;
    // Anchor = LAST ACTIVITY, not just status entry: a lead stuck in a status
    // for 30 days but contacted yesterday is being worked — stays green.
    const now = Date.now();
    const anchor = [lead.statusSince, lead.lastCall, lead.onlaynSuhbat, lead.officeSuhbat,
                    lead.suhbatBelgilangan, lead.shartnomaSana, lead.xbaDate,
                    lead.q1Date, lead.q2Date, lead.q3Date]
      .map(d => d ? new Date(d).getTime() : NaN)
      .filter(t => t > 0 && t <= now + 864e5)   // ignore invalid; allow today's dates
      .reduce((a, b) => Math.max(a, b), 0);
    if (!anchor) return null;
    const days = Math.max(0, (now - anchor) / 864e5);
    const { g, r, mez } = STALE[lead.status] || STALE_DEFAULT;
    const ratio = Math.max(0, Math.min(1, (days - g) / (r - g)));
    const hue = 120 * (1 - ratio);
    return { bar: `hsl(${hue},72%,42%)`, bg: `hsla(${hue},72%,50%,0.08)`, hours: days * 24, mez };
  };

  const [dragStg, setDragStg] = useState(null);
  const [dragOverStg, setDragOverStg] = useState(null);
  const [dragLeadId, setDragLeadId] = useState(null);
  const [dragLeadOver, setDragLeadOver] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [stageEdit, setStageEdit] = useState({});
  const [newStageLabel, setNewStageLabel] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6366f1");
  const doAddStage = () => {
    const lbl = newStageLabel.trim();
    if (!lbl) return;
    const key = lbl.replace(/[^a-zA-Z0-9 ']/g, "").trim();
    if (stages.some((s) => s.key === key)) {
      alert("Bu nom allaqachon mavjud");
      return;
    }
    setStages((p) => [...p, { key: lbl, label: lbl, c: newStageColor }]);
    setNewStageLabel("");
    setNewStageColor("#6366f1");
  };

  const flt = leads.filter((l) => {
    if (
      search &&
      !l.name.toLowerCase().includes(search.toLowerCase()) &&
      !l.phone?.includes(search) &&
      !l.id.includes(search) &&
      !l.comment?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (fOwner) {
      const owners = [
        l.ownerSales,
        l.ownerConsult,
        l.ownerDocs,
        l.owner_sales,
        l.owner_consult,
        l.owner_docs,
      ]
        .filter((v) => v !== null && v !== undefined && v !== "")
        .map(String);

      if (!owners.includes(String(fOwner))) return false;
    }
    if (fCountry && !l.country?.includes(fCountry)) return false;
    if (fSector && l.sector !== fSector) return false;
    if (fPosition && l.position !== fPosition) return false;
    const leadDate = l[fDateField]?.slice(0, 10);

    if (fDate && !dateRange(leadDate, fDate)) return false;

    if (fDateFrom || fDateTo) {
      if (!leadDate) return false;
      if (fDateFrom && leadDate < fDateFrom) return false;
      if (fDateTo && leadDate > fDateTo) return false;
    }
    if (
      fHasTasks &&
      !tasks.some((t) => t.leadId === l.id && t.status !== "done")
    )
      return false;
    if (fSource && l.source !== fSource) return false;
    if (fGender && l.gender !== fGender) return false;
    if (fVacancy) {
      const vacLeadIds = new Set(candidates.filter(c => String(c.vacancyId) === String(fVacancy)).map(c => c.leadId));
      if (!vacLeadIds.has(l.id)) return false;
    }
    if (fQuality && l.quality !== fQuality) return false;
    return true;
  });

  const sorted = [...flt].sort((a, b) => {
    if (sortBy === "newest")   return (b.createdAt||"") > (a.createdAt||"") ? 1 : -1;
    if (sortBy === "oldest")   return (a.createdAt||"") > (b.createdAt||"") ? 1 : -1;
    if (sortBy === "name_az")  return (a.name||"").localeCompare(b.name||"");
    if (sortBy === "name_za")  return (b.name||"").localeCompare(a.name||"");
    if (sortBy === "lastcall") return (b.lastCall||"") > (a.lastCall||"") ? 1 : -1;
    return 0;
  });

  const grp = {};
  stages.forEach((s) => {
    grp[s.key] = sorted.filter((l) => l.status === s.key);
  });
  const inpS = inp(T);
  const exportPipelineCSV = () => {
    const byId = Object.fromEntries(team.map(u => [String(u.id), u.name]));
    const ownerName = (l) => {
      const names = [l.ownerSales, l.ownerConsult, l.ownerDocs]
        .filter(Boolean)
        .map(id => byId[String(id)] || id)
        .join(" / ");
      return names;
    };
    const cols = [
      "ID",
      "Ism",
      "Tel",
      "Holat",
      "Mamlakat",
      "Manba",
      "Masul",
      "Izoh",
    ];
    const rows = sorted.map((l) =>
      [
        l.id,
        l.name || "",
        l.phone || "",
        l.status || "",
        l.country || "",
        l.source || "",
        ownerName(l),
        String(l.comment || "").replace(/,/g, " "),
      ].join(","),
    );
    const txt =
      cols.join(",") +
      String.fromCharCode(10) +
      rows.join(String.fromCharCode(10));
    const blob = new Blob([txt], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pipeline.csv";
    a.click();
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const a = [...stages];
    [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
    setStages(a);
  };
  const moveDown = (idx) => {
    if (idx === stages.length - 1) return;
    const a = [...stages];
    [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]];
    setStages(a);
  };
  const onDragStart = (e, key) => {
    setDragStg(key);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, key) => {
    e.preventDefault();
    setDragOverStg(key);
  };
  const onDrop = (e, targetKey) => {
    e.preventDefault();
    if (!dragStg || dragStg === targetKey) return;
    const arr = [...stages];
    const fi = arr.findIndex((s) => s.key === dragStg);
    const ti = arr.findIndex((s) => s.key === targetKey);
    const [m] = arr.splice(fi, 1);
    arr.splice(ti, 0, m);
    setStages(arr);
    setDragStg(null);
    setDragOverStg(null);
  };

  const onLeadDragStart = (e, leadId) => {
    e.stopPropagation();
    setDragLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onLeadDragOver = (e, stageKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragLeadOver(stageKey);
  };
  const onLeadDrop = async (e, stageKey) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragLeadId) return;
    // Dragging a selected card moves the whole selection; otherwise just it.
    const ids = selectedIds.has(dragLeadId) && selectedIds.size > 1 ? [...selectedIds] : [dragLeadId];
    const moving = ids.map(id => leads.find(l => l.id === id)).filter(l => l && l.status !== stageKey);
    setDragLeadId(null);
    setDragLeadOver(null);
    if (!moving.length) return;
    const prevStatus = Object.fromEntries(moving.map(m => [m.id, m.status]));
    setLeads(p => p.map(l => prevStatus[l.id] !== undefined ? { ...l, status: stageKey, statusSince: new Date().toISOString() } : l));
    setSelectedIds(new Set());
    // Status-only endpoint: never touches the rest of the lead's fields
    const results = await Promise.allSettled(moving.map(m => leadsAPI.setStatus(m.id, stageKey)));
    const failed = moving.filter((m, i) => results[i].status === "rejected");
    if (failed.length) {
      setLeads(p => p.map(l => failed.some(f => f.id === l.id) ? { ...l, status: prevStatus[l.id] } : l));
      const reason = results.find(r => r.status === "rejected")?.reason?.message || "xatolik";
      alert(`${failed.length} ta lead ko'chirilmadi: ${reason}`);
    }
  };

  return (
    <div>
      {selectedIds.size > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 600, background: T.accent, color: "#fff", borderRadius: 22, padding: "8px 18px", fontSize: 12, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", display: "flex", gap: 10, alignItems: "center" }}>
          ✅ {selectedIds.size} ta tanlandi — bittasini sudrab, hammasini ko'chiring
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 10, padding: "2px 10px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>Esc · Bekor</button>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{ fontSize: 18, fontWeight: 900, color: T.text, margin: 0 }}
          >
            Pipeline
          </h1>
          <p style={{ color: T.muted, margin: "1px 0 0", fontSize: 10 }}>
            {flt.length < leads.length
              ? <><span style={{color:T.red,fontWeight:700}}>{flt.length}</span>/{leads.length} ta (filter) · </>
              : <>{flt.length} ta · </>
            }
            {stages.length} bosqich
          </p>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 7,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.muted,
              }}
            >
              {I.search}
            </span>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish... (Ctrl+A)"
              style={{ ...inpS, paddingLeft: 23, width: 150, fontSize: 11 }}
            />
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            style={{
              padding: "7px 11px",
              borderRadius: 7,
              border: `1px solid ${showFilters ? T.accent : T.border}`,
              background: showFilters ? `${T.accent}22` : "transparent",
              color: showFilters ? T.accent : T.muted,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: showFilters ? 700 : 400,
            }}
          >
            🔍 Filtr
          </button>
          {(perm.canCfg || perm.canEdit) && (
            <button
              onClick={() => setEditMode((e) => !e)}
              style={{
                padding: "7px 11px",
                borderRadius: 7,
                border: `1px solid ${editMode ? T.accent : T.border}`,
                background: editMode ? `${T.accent}22` : "transparent",
                color: editMode ? T.accent : T.muted,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: editMode ? 700 : 400,
              }}
            >
              ⚙️ Bosqichlar
            </button>
          )}
          <button
            onClick={() => setShowLastCallReport(v => !v)}
            style={{
              padding: "7px 11px",
              borderRadius: 7,
              border: `1px solid ${showLastCallReport ? "#0891b2" : T.border}`,
              background: showLastCallReport ? "#0891b222" : T.card,
              color: showLastCallReport ? "#0891b2" : T.muted,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: showLastCallReport ? 700 : 400,
            }}
          >
            📞 So'ngi aloqa
          </button>
          <button
            onClick={exportPipelineCSV}
            style={{
              padding: "7px 11px",
              borderRadius: 7,
              border: `1px solid ${T.border}`,
              background: T.card,
              color: T.muted,
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            📥 CSV
          </button>
          {perm.canEdit && (
            <button
              onClick={addLead}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "7px 12px",
                borderRadius: 7,
                background: T.accent,
                color: "#fff",
                fontWeight: 700,
                fontSize: 11,
                border: "none",
                cursor: "pointer",
              }}
            >
              {I.plus} Yangi
            </button>
          )}
        </div>
      </div>
      {showFilters && (
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            padding: "10px 12px",
            marginBottom: 10,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={fOwner}
            onChange={(e) => setFOwner(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Barcha mas'ul</option>
            {team
              .filter((t) => t.role !== "partner")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <select
            value={fCountry}
            onChange={(e) => setFCountry(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Mamlakat</option>
            {config.countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={fSector}
            onChange={(e) => setFSector(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Ish sektori</option>
            {config.sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={fPosition}
            onChange={(e) => setFPosition(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Lavozim</option>
            {config.positions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            value={fDateField}
            onChange={(e) => setFDateField(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="createdAt">📅 Qayd qilingan</option>
            <option value="lastCall">📞 So’ngi aloqa</option>
            <option value="officeSuhbat">🏢 Suhbatga kelgan</option>
            <option value="shartnomaSana">📄 Shartnoma qilgan</option>
            <option value="xbaDate">💰 XBA To’lov sana</option>
            <option value="q1Date">💳 1-Qism To’lov sana</option>
            <option value="q2Date">💳 2-Qism To’lov sana</option>
            <option value="q3Date">💳 3-Qism To’lov sana</option>
          </select>

          <input
            type="date"
            value={fDateFrom}
            onChange={(e) => {
              setFDateFrom(e.target.value);
              setFDate("");
            }}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          />

          <span style={{ fontSize: 11, color: T.muted }}>–</span>

          <input
            type="date"
            value={fDateTo}
            onChange={(e) => {
              setFDateTo(e.target.value);
              setFDate("");
            }}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          />

          <button
            onClick={() => {
              setFDate("");
              setFDateFrom("");
              setFDateTo("");
            }}
            style={{
              padding: "6px 9px",
              borderRadius: 6,
              background: `${T.red}22`,
              color: T.red,
              border: `1px solid ${T.red}44`,
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            ✕
          </button>

          {/* <select
            value={fDate}
            onChange={(e) => {
              setFDate(e.target.value);
              if (e.target.value) {
                setFDateMode("");
                setFDateFrom("");
                setFDateTo("");
              }
            }}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Barcha vaqt</option>
            <option value="today">Bugun</option>
            <option value="week">Bu hafta</option>
            <option value="month">Bu oy</option>
          </select>

          <select
            value={fDateMode}
            onChange={(e) => {
              setFDateMode(e.target.value);
              if (e.target.value) setFDate("");
            }}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Custom sana</option>
            <option value="is">Shu sana</option>
            <option value="before">Sanadan oldin</option>
            <option value="after">Sanadan keyin</option>
            <option value="range">Sana oralig‘i</option>
          </select>

          {fDateMode && (
            <input
              type="date"
              value={fDateFrom}
              onChange={(e) => setFDateFrom(e.target.value)}
              style={{ ...inpS, width: "auto", fontSize: 11 }}
            />
          )}

          {fDateMode === "range" && (
            <>
              <span style={{ fontSize: 11, color: T.muted }}>–</span>
              <input
                type="date"
                value={fDateTo}
                onChange={(e) => setFDateTo(e.target.value)}
                style={{ ...inpS, width: "auto", fontSize: 11 }}
              />
            </>
          )}
          <select
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Barcha vaqt</option>
            <option value="today">Bugun</option>
            <option value="week">Bu hafta</option>
            <option value="month">Bu oy</option>
          </select> */}
          <select
            value={fSource || ""}
            onChange={(e) => setFSource(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Barcha manba</option>
            {config.sources.map((s) => (
              <option key={s}>{s}</option>
            ))}
            {team.filter((t) => t.role === "partner").length > 0 && (
              <optgroup label="Hamkorlar">
                {team
                  .filter((t) => t.role === "partner")
                  .map((p) => (
                    <option key={`partner-${p.id}`} value={p.name}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
          <select
            value={fGender || ""}
            onChange={(e) => setFGender(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Jins</option>
            <option value="Erkak">Erkak</option>
            <option value="Ayol">Ayol</option>
          </select>
          {vacancies.length > 0 && (
            <select
              value={fVacancy}
              onChange={(e) => setFVacancy(e.target.value)}
              style={{ ...inpS, width: "auto", fontSize: 11 }}
            >
              <option value="">Vakansiya bo'yicha</option>
              {vacancies.map((v) => (
                <option key={v.id} value={v.id}>{v.title}{v.company ? ` — ${v.company}` : ""}</option>
              ))}
            </select>
          )}
          <select
            value={fQuality}
            onChange={(e) => setFQuality(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="">Barcha sifat</option>
            <option value="Sifatli">✅ Sifatli</option>
            <option value="O'rtacha">🟡 O'rtacha</option>
            <option value="Sifatsiz">🔴 Sifatsiz</option>
          </select>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: T.text,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={fHasTasks}
              onChange={(e) => setFHasTasks(e.target.checked)}
              style={{ accentColor: T.accent }}
            />
            Vazifalari bor
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ ...inpS, width: "auto", fontSize: 11 }}
          >
            <option value="newest">↓ Yangi avval</option>
            <option value="oldest">↑ Eski avval</option>
            <option value="name_az">A→Z Ism</option>
            <option value="name_za">Z→A Ism</option>
            <option value="lastcall">📞 So'ngi aloqa</option>
          </select>
          <button
            onClick={() => {
              setFOwner("");
              setFCountry("");
              setFSector("");
              setFPosition("");
              setFDate("");
              setFDateField("createdAt");
              setFDateMode("");
              setFDateFrom("");
              setFDateTo("");
              setFHasTasks(false);
              setFSource("");
              setFGender("");
              setFVacancy("");
              setFQuality("");
            }}
            style={{
              padding: "4px 9px",
              borderRadius: 5,
              background: `${T.red}22`,
              color: T.red,
              border: `1px solid ${T.red}44`,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            Tozalash
          </button>
        </div>
      )}
      {/* Stage CRUD panel - admin/manager only */}
      {editMode && (
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            padding: "12px 14px",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              marginBottom: 10,
            }}
          >
            ⚙️ Bosqichlarni boshqarish
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 10 }}>
            {stages.map((stage, idx) => (
              <div
                key={stage.key}
                draggable
                onDragStart={(e) => onDragStart(e, stage.key)}
                onDragOver={(e) => onDragOver(e, stage.key)}
                onDrop={(e) => onDrop(e, stage.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  marginBottom: 3,
                  background:
                    dragOverStg === stage.key ? `${T.accent}18` : T.card2,
                  border: `1px solid ${dragOverStg === stage.key ? T.accent : stage.c + "33"}`,
                  borderRadius: 6,
                  cursor: "grab",
                  borderLeft: `3px solid ${stage.c}`,
                }}
              >
                <span style={{ color: T.muted, fontSize: 11 }}>⠿</span>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: stage.c,
                    flexShrink: 0,
                  }}
                />
                {editingStage === stage.key ? (
                  <input
                    value={stageEdit.label || stage.label}
                    onChange={(e) =>
                      setStageEdit((p) => ({ ...p, label: e.target.value }))
                    }
                    style={{
                      ...inpS,
                      flex: 1,
                      padding: "2px 6px",
                      fontSize: 10,
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setStages((p) =>
                          p.map((s) =>
                            s.key === stage.key
                              ? {
                                  ...s,
                                  label: stageEdit.label || s.label,
                                  c: stageEdit.c || s.c,
                                }
                              : s,
                          ),
                        );
                        setEditingStage(null);
                      }
                      if (e.key === "Escape") setEditingStage(null);
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      fontSize: 10,
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stage.label}
                  </span>
                )}
                {editingStage === stage.key && (
                  <div style={{ display: "flex", gap: 2 }}>
                    {[
                      "#6366f1",
                      "#f59e0b",
                      "#22c55e",
                      "#ec4899",
                      "#3b82f6",
                      "#0891b2",
                      "#f97316",
                      "#ef4444",
                      "#8b5cf6",
                      "#10b981",
                    ].map((c) => (
                      <div
                        key={c}
                        onClick={() => setStageEdit((p) => ({ ...p, c }))}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: c,
                          cursor: "pointer",
                          border: `2px solid ${(stageEdit.c || stage.c) === c ? T.text : "transparent"}`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <span style={{ fontSize: 8, color: T.muted, flexShrink: 0 }}>
                  ({grp[stage.key]?.length || 0})
                </span>
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  style={{
                    padding: "1px 4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.muted,
                    fontSize: 10,
                    opacity: idx === 0 ? 0.2 : 1,
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === stages.length - 1}
                  style={{
                    padding: "1px 4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.muted,
                    fontSize: 10,
                    opacity: idx === stages.length - 1 ? 0.2 : 1,
                  }}
                >
                  ↓
                </button>
                {editingStage === stage.key ? (
                  <button
                    onClick={() => {
                      setStages((p) =>
                        p.map((s) =>
                          s.key === stage.key
                            ? {
                                ...s,
                                label: stageEdit.label || s.label,
                                c: stageEdit.c || s.c,
                              }
                            : s,
                        ),
                      );
                      setEditingStage(null);
                    }}
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: T.accent,
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingStage(stage.key);
                      setStageEdit({ label: stage.label, c: stage.c });
                    }}
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: `${T.accent}22`,
                      color: T.accent,
                      border: `1px solid ${T.accent}44`,
                      cursor: "pointer",
                      fontSize: 9,
                    }}
                  >
                    {I.edit}
                  </button>
                )}
                <button
                  onClick={() => {
                    const dcnt = grp[stage.key]?.length || 0;
                    if (dcnt > 0) {
                      alert(
                        "Bu bosqichda " +
                          dcnt +
                          " ta mijoz bor. Avval ularni otkazing.",
                      );
                      return;
                    }
                    if (window.confirm(stage.label + " ochirilsinmi?"))
                      setStages((p) => p.filter((s) => s.key !== stage.key));
                  }}
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: `${T.red}22`,
                    color: T.red,
                    border: `1px solid ${T.red}44`,
                    cursor: "pointer",
                    fontSize: 9,
                  }}
                >
                  {I.trash}
                </button>
              </div>
            ))}
          </div>
          {/* Add new stage */}
          <div
            style={{
              display: "flex",
              gap: 7,
              alignItems: "center",
              padding: "8px 10px",
              background: `${T.accent}08`,
              borderRadius: 7,
              border: `1px dashed ${T.accent}44`,
            }}
          >
            <input
              value={newStageLabel}
              onChange={(e) => setNewStageLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doAddStage()}
              placeholder="Yangi bosqich nomi..."
              style={{ ...inpS, flex: 1, fontSize: 10 }}
            />
            <div style={{ display: "flex", gap: 3 }}>
              {[
                "#6366f1",
                "#f59e0b",
                "#22c55e",
                "#ec4899",
                "#3b82f6",
                "#0891b2",
                "#f97316",
                "#ef4444",
              ].map((c) => (
                <div
                  key={c}
                  onClick={() => setNewStageColor(c)}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: c,
                    cursor: "pointer",
                    border: `2px solid ${newStageColor === c ? T.text : "transparent"}`,
                  }}
                />
              ))}
            </div>
            <button
              onClick={doAddStage}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                background: T.accent,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              + Qo'shish
            </button>
          </div>
        </div>
      )}
      {/* So'ngi aloqa report panel */}
      {showLastCallReport && (() => {
        const today = new Date().toISOString().slice(0, 10);
        const lcLeads = leads.filter(l => {
          if (!l.lastCall) return false;
          const d = l.lastCall.slice(0, 10);
          if (d < lcDateFrom || d > lcDateTo) return false;
          return true;
        }).sort((a, b) => (b.lastCall || "") > (a.lastCall || "") ? 1 : -1);
        const inpS2 = inp(T);
        return (
          <div style={{ background: T.card, border: `1px solid #0891b244`, borderRadius: 14, padding: 18, marginBottom: 14, borderTop: `3px solid #0891b2` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>📞 So'ngi aloqa hisoboti — {lcLeads.length} ta mijoz</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {[
                  { l: "Bugun", from: today, to: today },
                  { l: "Bu hafta", from: new Date(Date.now() - 6*86400000).toISOString().slice(0,10), to: today },
                  { l: "Bu oy", from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), to: today },
                ].map(q => (
                  <button key={q.l} onClick={() => { setLcDateFrom(q.from); setLcDateTo(q.to); }}
                    style={{ padding: "4px 10px", borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${T.border}`,
                      background: lcDateFrom === q.from && lcDateTo === q.to ? "#0891b2" : T.card2,
                      color:      lcDateFrom === q.from && lcDateTo === q.to ? "#fff"     : T.muted }}>
                    {q.l}
                  </button>
                ))}
                <input type="date" value={lcDateFrom} onChange={e => setLcDateFrom(e.target.value)} style={{ ...inpS2, width: "auto", fontSize: 10 }} />
                <span style={{ color: T.muted, fontSize: 10 }}>—</span>
                <input type="date" value={lcDateTo}   onChange={e => setLcDateTo(e.target.value)}   style={{ ...inpS2, width: "auto", fontSize: 10 }} />
                <button onClick={() => setShowLastCallReport(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            </div>
            {lcLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: T.muted, fontSize: 13 }}>Bu davrda so'ngi aloqa qilingan mijoz topilmadi</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: T.card2 }}>
                      {["Mijoz", "Telefon", "Holat", "So'ngi aloqa", "Mas'ul", "Mamlakat", "Lavozim"].map(h => (
                        <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lcLeads.map((l, i) => {
                      const stageObj = stages.find(s => s.key === l.status);
                      const stC = stageObj ? stageObj.c : "#6b7280";
                      const stLb = stageObj ? stageObj.label : (l.status || "—");
                      const owner = team.find(m => m.id === (l.ownerSales || l.ownerConsult || l.ownerDocs));
                      const isToday = l.lastCall?.slice(0,10) === today;
                      return (
                        <tr key={l.id} onClick={() => open(l)} style={{ borderBottom: `1px solid ${T.border}`, background: i%2===0?T.card:T.card2, cursor: "pointer" }}>
                          <td style={{ padding: "7px 12px", fontWeight: 700, color: T.text }}>{l.name}</td>
                          <td style={{ padding: "7px 12px", color: T.muted }}>{l.phone || "—"}</td>
                          <td style={{ padding: "7px 12px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${stC}22`, color: stC, border: `1px solid ${stC}44`, whiteSpace: "nowrap" }}>{stLb}</span>
                          </td>
                          <td style={{ padding: "7px 12px", color: isToday ? "#10b981" : T.muted, fontWeight: isToday ? 700 : 400 }}>
                            {l.lastCall?.slice(0,10) || "—"}{isToday ? " ✓" : ""}
                          </td>
                          <td style={{ padding: "7px 12px" }}>
                            {owner ? <div style={{ display:"flex", alignItems:"center", gap:5 }}><Av id={owner.id} team={[owner]} size={20}/><span style={{color:T.text}}>{owner.name}</span></div> : <span style={{color:T.muted}}>—</span>}
                          </td>
                          <td style={{ padding: "7px 12px", color: T.muted }}>{l.country || "—"}</td>
                          <td style={{ padding: "7px 12px", color: T.muted }}>{l.position || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 12,
          alignItems: "flex-start",
        }}
      >
        {stages.map((stage) => {
          const cards = grp[stage.key] || [];
          return (
            <div
              key={stage.key}
              draggable={editMode}
              onDragStart={(e) => editMode && onDragStart(e, stage.key)}
              onDragOver={(e) => { if (editMode) onDragOver(e, stage.key); else onLeadDragOver(e, stage.key); }}
              onDrop={(e) => { if (editMode) onDrop(e, stage.key); else onLeadDrop(e, stage.key); }}
              onDragLeave={() => { if (!editMode) setDragLeadOver(null); }}
              style={{
                minWidth: 210,
                maxWidth: 210,
                flexShrink: 0,
                opacity: dragStg === stage.key ? 0.5 : 1,
                border:
                  editMode && dragOverStg === stage.key
                    ? `2px dashed ${T.accent}`
                    : "none",
                borderRadius: 9,
              }}
            >
              <div
                style={{
                  background: `${stage.c}${T.dark ? "22" : "15"}`,
                  border: `1px solid ${stage.c}44`,
                  borderRadius: "8px 8px 0 0",
                  padding: "6px 8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: stage.c,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 155,
                  }}
                >
                  {stage.label}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    background: `${stage.c}22`,
                    color: stage.c,
                    borderRadius: 10,
                    padding: "0 5px",
                    border: `1px solid ${stage.c}44`,
                    flexShrink: 0,
                  }}
                >
                  {cards.length}
                </span>
              </div>
              <div
                style={{
                  background: dragLeadOver === stage.key ? `${stage.c}18` : (T.dark ? `${T.card}bb` : T.card2),
                  border: dragLeadOver === stage.key ? `2px dashed ${stage.c}88` : `1px solid ${stage.c}22`,
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  padding: 5,
                  minHeight: 30,
                  transition: "background 0.1s",
                }}
              >
                {cards.map((lead) => {
                  const lt = tasks.filter(
                    (t) => t.leadId === lead.id && t.status !== "done",
                  );
                  const od = lt.some((t) => isOD(t.due));
                  const owners = [
                    lead.ownerSales,
                    lead.ownerConsult,
                    lead.ownerDocs,
                  ]
                    .filter(Boolean)
                    .filter((v, i, a) => a.indexOf(v) === i);
                  const sc = staleColor(lead);
                  const isSel = selectedIds.has(lead.id);
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => onLeadDragStart(e, lead.id)}
                      onDragEnd={() => { setDragLeadId(null); setDragLeadOver(null); }}
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          e.preventDefault();
                          setSelectedIds(p => { const n = new Set(p); n.has(lead.id) ? n.delete(lead.id) : n.add(lead.id); return n; });
                        } else open(lead);
                      }}
                      title={sc ? `So'nggi harakat: ${sc.hours < 48 ? Math.round(sc.hours) + " soat" : Math.round(sc.hours / 24) + " kun"} oldin · mez: ${sc.mez} kun` : undefined}
                      style={{
                        background: isSel ? `${T.accent}15` : (sc ? sc.bg : T.card),
                        borderRadius: 7,
                        padding: "8px 9px",
                        marginBottom: 4,
                        cursor: dragLeadId ? "grabbing" : "pointer",
                        opacity: dragLeadId === lead.id ? 0.4 : 1,
                        border: isSel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                        borderLeft: `3px solid ${isSel ? T.accent : (sc ? sc.bar : stage.c + "66")}`,
                        transition: "box-shadow 0.15s, opacity 0.15s, background 0.3s, border-color 0.3s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.boxShadow = T.shadow)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.boxShadow = "none")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 4,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {lead.name}
                        </span>
                        <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                          {owners.map((id) => (
                            <Av key={id} id={id} team={team} size={14} />
                          ))}
                        </div>
                      </div>
                      {lead.phone && (
                        <div
                          style={{
                            fontSize: 9,
                            color: T.cyan,
                            marginBottom: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {I.phone} {lead.phone}
                        </div>
                      )}
                      {/* Payment tags: lit when paid, dim otherwise */}
                      <div style={{ display: "flex", gap: 2, marginBottom: 3 }}>
                        {[["XBA", lead.xba, "#f97316"], ["1-q", lead.q1, "#ec4899"], ["2-q", lead.q2, "#8b5cf6"], ["3-q", lead.q3, "#3b82f6"]].map(([lb, on, c]) => (
                          <span key={lb} style={{
                            fontSize: 7, fontWeight: 800, borderRadius: 3, padding: "1px 4px", lineHeight: 1.5,
                            background: on ? `${c}22` : "transparent",
                            color: on ? c : T.border,
                            border: `1px solid ${on ? c + "77" : T.border}`,
                          }}>{on ? "✓" : ""}{lb}</span>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 3,
                          flexWrap: "wrap",
                          marginBottom: 3,
                        }}
                      >
                        {lead.country && (
                          <span
                            style={{
                              fontSize: 8,
                              background: T.card2,
                              color: T.muted,
                              borderRadius: 3,
                              padding: "0 4px",
                              border: `1px solid ${T.border}`,
                            }}
                          >
                            🌍{lead.country}
                          </span>
                        )}
                        {lead.position && (
                          <span
                            style={{
                              fontSize: 8,
                              background: `${T.accent}22`,
                              color: T.accent,
                              borderRadius: 3,
                              padding: "0 4px",
                            }}
                          >
                            {lead.position}
                          </span>
                        )}
                        {lead.quality && (
                          <span
                            style={{
                              fontSize: 8,
                              borderRadius: 3,
                              padding: "0 4px",
                              fontWeight: 700,
                              background: lead.quality === "Sifatli" ? `${T.green}22` : lead.quality === "O'rtacha" ? `${T.yellow}22` : `${T.red}22`,
                              color: lead.quality === "Sifatli" ? T.green : lead.quality === "O'rtacha" ? T.yellow : T.red,
                            }}
                          >
                            {lead.quality === "Sifatli" ? "✅" : lead.quality === "O'rtacha" ? "🟡" : "🔴"} {lead.quality}
                          </span>
                        )}
                      </div>
                      {lead.comment && (
                        <div
                          style={{
                            fontSize: 9,
                            color: T.muted,
                            marginBottom: 3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          💬 {lead.comment}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 3,
                          alignItems: "center",
                        }}
                      >
                        {lt.length > 0 && (
                          <span
                            style={{
                              fontSize: 8,
                              color: od ? T.red : T.green,
                              fontWeight: 700,
                            }}
                          >
                            ✓{lt.length}
                            {od && "⚠"}
                          </span>
                        )}
                        {(lead.q1 || lead.q2 || lead.q3 || lead.xba) && (
                          <span style={{ fontSize: 8, color: T.yellow }}>
                            💳
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 8, color: T.muted, marginTop: 2 }}
                      >
                        #{lead.id} · {fmtD(lead.createdAt)}
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px 0",
                      color: T.border,
                      fontSize: 9,
                    }}
                  >
                    –
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { Pipeline };
