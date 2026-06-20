import { useState, useRef, useEffect } from "react";
import { useT } from "./theme.js";
import { DONE } from "./constants.js";
import { isOD, inp, I, Pill, Av, fmtD, dateRange } from "./helpers.jsx";

// ─── PIPELINE ────────────────────────────────────────────────────────────────
function Pipeline({
  leads,
  tasks,
  team,
  user,
  open,
  addLead,
  config,
  roles,
  stages,
  setStages,
}) {
  const T = useT();
  const perm = roles[user.role] || {};
  const [search, setSearch] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fPosition, setFPosition] = useState("");
  const [fDate, setFDate] = useState("");
  const [fDateField, setFDateField] = useState("createdAt");
  const [fDateMode, setFDateMode] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fHasTasks, setFHasTasks] = useState(false);
  const [fSource, setFSource] = useState("");
  const [fGender, setFGender] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(true);
  const [editMode, setEditMode] = useState(false);
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

  const [dragStg, setDragStg] = useState(null);
  const [dragOverStg, setDragOverStg] = useState(null);
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

  return (
    <div>
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
            {flt.length} ta · {stages.length} bosqich
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
            <option value="lastCall">📞 So‘ngi aloqa</option>
            <option value="officeSuhbat">🏢 Suhbatga kelgan</option>
            <option value="shartnomaSana">📄 Shartnoma qilgan</option>
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
              setFPosition("");
              setFDate("");
              setFDateField("createdAt");
              setFDateMode("");
              setFDateFrom("");
              setFDateTo("");
              setFHasTasks(false);
              setFSource("");
              setFGender("");
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
              onDragOver={(e) => editMode && onDragOver(e, stage.key)}
              onDrop={(e) => editMode && onDrop(e, stage.key)}
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
                  background: T.dark ? `${T.card}bb` : T.card2,
                  border: `1px solid ${stage.c}22`,
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  padding: 5,
                  minHeight: 30,
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
                  return (
                    <div
                      key={lead.id}
                      onClick={() => open(lead)}
                      style={{
                        background: T.card,
                        borderRadius: 7,
                        padding: "8px 9px",
                        marginBottom: 4,
                        cursor: "pointer",
                        border: `1px solid ${T.border}`,
                        borderLeft: `3px solid ${stage.c}66`,
                        transition: "box-shadow 0.15s",
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
