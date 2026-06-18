import { useState, useMemo, useEffect } from "react";
import { useT } from "./theme.js";
import { inp, lab, I, Modal, SearchSelect, Av } from "./helpers.jsx";
import { vacanciesAPI, candidatesAPI } from "./api.js";
// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const V_STATUS = {
  active: { label: "Active", c: "#16a34a", bg: "#dcfce7" },
  waiting: { label: "Awaiting approval", c: "#d97706", bg: "#fef3c7" },
  revision: { label: "Awaiting revision", c: "#2563eb", bg: "#dbeafe" },
  inactive: { label: "Inactive", c: "#6b7280", bg: "#f3f4f6" },
  filled: { label: "Filled", c: "#9333ea", bg: "#f3e8ff" },
};

const CAND_STATUS = {
  submitted: { label: "Submitted", c: "#2563eb" },
  approved: { label: "Approved", c: "#16a34a" },
  rejected: { label: "Rejected", c: "#dc2626" },
  interview: { label: "Interview", c: "#d97706" },
  hired: { label: "Hired", c: "#9333ea" },
};

const CONTRACT_TYPES = [
  "erpr3",
  "erpr4",
  "B2B",
  "Full-time",
  "Part-time",
  "Seasonal",
  "Other",
];
const COUNTRIES = [
  "Bulgaria",
  "Germany",
  "Poland",
  "Czech Republic",
  "Slovakia",
  "Slovenia",
  "Serbia",
  "Croatia",
  "Montenegro",
  "Romania",
  "Hungary",
  "Austria",
  "Other",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── VACANCY CARD ─────────────────────────────────────────────────────────────
function VacancyCard({ v, leads, onClick, T }) {
  const st = V_STATUS[v.status] || V_STATUS.active;
  const filled = v.hiredCount || 0;
  const total = v.positions || 1;

  return (
    <div
      onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.18s, transform 0.18s",
        boxShadow: T.shadow,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.13)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = T.shadow;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Logo area */}
      <div
        style={{
          height: 90,
          background: `linear-gradient(135deg, ${T.accent}18, ${T.cyan}12)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: `1px solid ${T.border}`,
          position: "relative",
        }}
      >
        {v.logo ? (
          <img
            src={v.logo}
            alt=""
            style={{ maxHeight: 60, maxWidth: 140, objectFit: "contain" }}
          />
        ) : (
          <div style={{ fontSize: 32, opacity: 0.25 }}>🏢</div>
        )}
        {/* Status badge */}
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
            background: T.dark ? `${st.c}33` : st.bg,
            color: st.c,
            border: `1px solid ${st.c}44`,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {st.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: T.text,
            marginBottom: 2,
            lineHeight: 1.3,
          }}
        >
          {v.title || "Untitled"}
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 8 }}>
          {v.jobType || "–"}
        </div>

        {v.description && (
          <div
            style={{
              fontSize: 10,
              color: T.sub,
              marginBottom: 8,
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {v.description}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {v.country && (
            <span
              style={{
                fontSize: 9,
                color: T.cyan,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              📍{v.country}
            </span>
          )}
          {v.salary && (
            <span
              style={{
                fontSize: 9,
                color: T.green,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              €{v.salary}
            </span>
          )}
          {v.company && (
            <span
              style={{
                fontSize: 9,
                color: T.muted,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              🏢{v.company}
            </span>
          )}
        </div>

        {v.postedDate && (
          <div style={{ fontSize: 9, color: T.muted, marginBottom: 8 }}>
            📅 {fmtDate(v.postedDate)}
          </div>
        )}

        {/* Positions progress bar */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12 }}>👥</span>
              Filled
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: filled >= total ? "#16a34a" : T.text }}>
              {filled} / {total}
            </span>
          </div>
          {v.approvedCount > 0 && v.approvedCount !== v.hiredCount && (
            <div style={{ fontSize: 9, color: "#d97706", marginBottom: 2 }}>
              ⏳ {v.approvedCount} approved (in progress)
            </div>
          )}
        </div>
        <div
          style={{
            marginTop: 5,
            height: 4,
            borderRadius: 4,
            background: T.border,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 4,
              width: `${Math.min(100, (filled / total) * 100)}%`,
              background: filled >= total ? T.green : T.accent,
              transition: "width 0.4s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status, T }) {
  const st = V_STATUS[status] || V_STATUS.active;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 20,
        background: T.dark ? `${st.c}33` : st.bg,
        color: st.c,
        border: `1px solid ${st.c}44`,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {st.label}
    </span>
  );
}

// ─── VACANCY DETAIL MODAL ─────────────────────────────────────────────────────
function VacancyDetail({
  v,
  leads,
  team,
  user,
  roles,
  onClose,
  onSave,
  onDelete,
  T,
}) {
  const [tab, setTab] = useState("info");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...v });
  const f = (k, val) => setForm((p) => ({ ...p, [k]: val }));
  const perm = roles[user.role] || {};
  const canEdit = perm.canEdit || perm.canCfg;
  const inpS = inp(T);
  const labS = lab(T);

  // Candidate management — loaded from DB
  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [candModal, setCandModal] = useState(false);
  const [candForm, setCandForm] = useState({ leadId: "", status: "submitted", note: "" });
  const cf = (k, val) => setCandForm((p) => ({ ...p, [k]: val }));

  // Partner access management
  const [allowedPartners, setAllowedPartners] = useState(v.allowedPartners || []);
  const [savingPartners, setSavingPartners] = useState(false);
  const partners = (team || []).filter(t => t.role === "partner");
  const togglePartner = async (pid) => {
    const next = allowedPartners.includes(pid)
      ? allowedPartners.filter(id => id !== pid)
      : [...allowedPartners, pid];
    setSavingPartners(true);
    try {
      await vacanciesAPI.setPartners(v.id, next);
      setAllowedPartners(next);
    } catch (e) { alert("Xato: " + e.message); }
    finally { setSavingPartners(false); }
  };

  useEffect(() => {
    setCandLoading(true);
    vacanciesAPI.getCandidates(v.id)
      .then(r => { setCandidates(r || []); setCandLoading(false); })
      .catch(() => setCandLoading(false));
  }, [v.id]);

  const addCandidate = async () => {
    if (!candForm.leadId) return;
    const lead = leads.find((l) => l.id === candForm.leadId);
    try {
      const saved = await candidatesAPI.create({
        vacancy_id: v.id,
        lead_id: candForm.leadId,
        name: lead?.name || "Unknown",
        phone: lead?.phone || "",
        status: candForm.status || "submitted",
        note: candForm.note || "",
      });
      setCandidates(p => [saved, ...p]);
      setCandModal(false);
      setCandForm({ leadId: "", status: "submitted", note: "" });
    } catch (err) { alert("Xato: " + err.message); }
  };

  const updateCandStatus = async (cId, newStatus) => {
    const cand = candidates.find(c => c.id === cId);
    try {
      const saved = await candidatesAPI.update(cId, { ...cand, status: newStatus });
      setCandidates(p => p.map(c => c.id === cId ? { ...c, status: newStatus } : c));
    } catch (err) { alert("Xato: " + err.message); }
  };

  const removeCandidate = async (cId) => {
    if (!confirm("O'chirilsinmi?")) return;
    await candidatesAPI.delete(cId);
    setCandidates(p => p.filter(c => c.id !== cId));
  };

  const saveEdit = () => {
    onSave(form);
    setEditing(false);
  };

  const leadOpts = leads.map((l) => ({
    value: l.id,
    label: l.name,
    id: l.id,
    phone: l.phone,
  }));

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        padding: "10px 24px",
        fontWeight: 700,
        fontSize: 12,
        border: "none",
        cursor: "pointer",
        background: tab === key ? T.accent : "transparent",
        color: tab === key ? "#fff" : T.muted,
        borderRadius: tab === key ? 8 : 0,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <Modal onClose={onClose} width={820}>
      <div style={{ background: T.card, borderRadius: 12, overflow: "hidden" }}>
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            background: T.card2,
            borderBottom: `1px solid ${T.border}`,
            padding: "8px 8px 0",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, display: "flex" }}>
            {tabBtn("info", "📋 JOB POSTING INFORMATION")}
            {tabBtn("candidates", `👥 CANDIDATES (${candLoading ? "…" : candidates.length})`)}
            {(user.role === "admin" || user.role === "manager") && tabBtn("partners", `🤝 HAMKORLAR (${allowedPartners.length})`)}
          </div>
          <button
            onClick={onClose}
            style={{
              marginRight: 8,
              marginBottom: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.muted,
              fontSize: 18,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 24, maxHeight: "75vh", overflowY: "auto" }}>
          {/* ── INFO TAB ── */}
          {tab === "info" && (
            <>
              {/* Header card */}
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 20,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                {v.logo ? (
                  <img
                    src={v.logo}
                    alt=""
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: "contain",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      background: `${T.accent}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    🏢
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{ fontSize: 16, fontWeight: 900, color: T.text }}
                    >
                      {v.title || "–"}
                    </span>
                    <StatusBadge status={v.status} T={T} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginBottom: 4,
                    }}
                  >
                    {v.company && (
                      <span
                        style={{
                          fontSize: 10,
                          background: T.card2,
                          border: `1px solid ${T.border}`,
                          borderRadius: 4,
                          padding: "2px 7px",
                          color: T.text,
                        }}
                      >
                        🏢 {v.company}
                      </span>
                    )}
                    {v.country && (
                      <span
                        style={{
                          fontSize: 10,
                          background: `${T.cyan}15`,
                          border: `1px solid ${T.cyan}33`,
                          borderRadius: 4,
                          padding: "2px 7px",
                          color: T.cyan,
                        }}
                      >
                        📍 {v.country}
                      </span>
                    )}
                    {v.salary && (
                      <span
                        style={{
                          fontSize: 10,
                          background: `${T.green}15`,
                          border: `1px solid ${T.green}33`,
                          borderRadius: 4,
                          padding: "2px 7px",
                          color: T.green,
                        }}
                      >
                        € {v.salary}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted }}>
                    👥{" "}
                    {candidates.filter(c => ["approved","hired"].includes(c.status)).length}
                    {" "}/ {v.positions || 1} approved candidates
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {canEdit && !editing && (
                    <button
                      onClick={() => {
                        setForm({ ...v });
                        setEditing(true);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: `${T.accent}22`,
                        color: T.accent,
                        border: `1px solid ${T.accent}44`,
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                  {canEdit && editing && (
                    <>
                      <button
                        onClick={saveEdit}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: T.accent,
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: T.card2,
                          color: T.muted,
                          border: `1px solid ${T.border}`,
                          cursor: "pointer",
                          fontSize: 11,
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {canEdit && perm.canCfg && !editing && (
                    <button
                      onClick={() => onDelete(v.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: `${T.red}18`,
                        color: T.red,
                        border: `1px solid ${T.red}33`,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {editing ? (
                /* EDIT FORM */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labS}>Job Title *</label>
                    <input
                      value={form.title || ""}
                      onChange={(e) => f("title", e.target.value)}
                      style={inpS}
                    />
                  </div>
                  <div>
                    <label style={labS}>Company</label>
                    <input
                      value={form.company || ""}
                      onChange={(e) => f("company", e.target.value)}
                      style={inpS}
                    />
                  </div>
                  <div>
                    <label style={labS}>Country / City</label>
                    <select
                      value={form.country || ""}
                      onChange={(e) => f("country", e.target.value)}
                      style={inpS}
                    >
                      <option value="">Select...</option>
                      {COUNTRIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labS}>Job Type / Sector</label>
                    <input
                      value={form.jobType || ""}
                      onChange={(e) => f("jobType", e.target.value)}
                      style={inpS}
                    />
                  </div>
                  <div>
                    <label style={labS}>Contract Type</label>
                    <select
                      value={form.contractType || ""}
                      onChange={(e) => f("contractType", e.target.value)}
                      style={inpS}
                    >
                      <option value="">Select...</option>
                      {CONTRACT_TYPES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labS}>Salary (EUR)</label>
                    <input
                      value={form.salary || ""}
                      onChange={(e) => f("salary", e.target.value)}
                      style={inpS}
                      placeholder="e.g. 564"
                    />
                  </div>
                  <div>
                    <label style={labS}>Additional Pay</label>
                    <input
                      value={form.additionalPay || ""}
                      onChange={(e) => f("additionalPay", e.target.value)}
                      style={inpS}
                      placeholder="e.g. 7.57 EUR/hr night shift"
                    />
                  </div>
                  <div>
                    <label style={labS}>Working Hours</label>
                    <input
                      value={form.workingHours || ""}
                      onChange={(e) => f("workingHours", e.target.value)}
                      style={inpS}
                      placeholder="e.g. 08:00-20:00 shift"
                    />
                  </div>
                  <div>
                    <label style={labS}>Positions needed</label>
                    <input
                      type="number"
                      min="1"
                      value={form.positions || 1}
                      onChange={(e) => f("positions", Number(e.target.value))}
                      style={inpS}
                    />
                  </div>
                  <div>
                    <label style={labS}>Accommodation</label>
                    <select
                      value={form.accommodation || ""}
                      onChange={(e) => f("accommodation", e.target.value)}
                      style={inpS}
                    >
                      <option value="">–</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div>
                    <label style={labS}>Food Vouchers</label>
                    <input
                      value={form.foodVouchers || ""}
                      onChange={(e) => f("foodVouchers", e.target.value)}
                      style={inpS}
                      placeholder="e.g. Yes – €102.26"
                    />
                  </div>
                  <div>
                    <label style={labS}>Status</label>
                    <select
                      value={form.status || "active"}
                      onChange={(e) => f("status", e.target.value)}
                      style={inpS}
                    >
                      {Object.entries(V_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labS}>Posted Date</label>
                    <input
                      type="date"
                      value={form.postedDate || ""}
                      onChange={(e) => f("postedDate", e.target.value)}
                      style={inpS}
                    />
                  </div>
                  <div>
                    <label style={labS}>Logo URL</label>
                    <input
                      value={form.logo || ""}
                      onChange={(e) => f("logo", e.target.value)}
                      style={inpS}
                      placeholder="https://..."
                    />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labS}>Requirements for candidates</label>
                    <textarea
                      value={form.requirements || ""}
                      onChange={(e) => f("requirements", e.target.value)}
                      rows={3}
                      style={{ ...inpS, resize: "vertical" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labS}>Job description</label>
                    <textarea
                      value={form.description || ""}
                      onChange={(e) => f("description", e.target.value)}
                      rows={4}
                      style={{ ...inpS, resize: "vertical" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labS}>Other description</label>
                    <textarea
                      value={form.otherDesc || ""}
                      onChange={(e) => f("otherDesc", e.target.value)}
                      rows={2}
                      style={{ ...inpS, resize: "vertical" }}
                    />
                  </div>
                </div>
              ) : (
                /* VIEW MODE */
                <>
                  {/* Position details grid */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: T.text,
                        marginBottom: 10,
                      }}
                    >
                      Position details
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {[
                        ["📋", "REAL JOB TITLE", v.title],
                        ["🏢", "ELECTED POSITION", v.jobType],
                        ["📄", "CONTRACT TYPE", v.contractType],
                        ["€", "SALARY", v.salary ? `${v.salary} EUR` : null],
                        ["🕐", "WORKING HOURS", v.workingHours],
                        ["⏰", "ADDITIONAL WORK", v.additionalPay],
                        ["🏠", "ACCOMMODATION", v.accommodation],
                        ["🍽️", "FOOD VOUCHERS", v.foodVouchers],
                      ].map(([ic, lbl, val]) => (
                        <div
                          key={lbl}
                          style={{
                            background: T.card2,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: T.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: 4,
                              display: "flex",
                              gap: 5,
                              alignItems: "center",
                            }}
                          >
                            <span>{ic}</span>
                            {lbl}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: val ? T.text : T.border,
                              fontWeight: val ? 500 : 400,
                            }}
                          >
                            {val || "–"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description blocks */}
                  {v.requirements && (
                    <div
                      style={{
                        background: T.dark ? "#2d2000" : "#fffbeb",
                        border: `1px solid ${T.yellow}44`,
                        borderRadius: 8,
                        padding: "12px 14px",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: T.yellow,
                          marginBottom: 6,
                        }}
                      >
                        Requirements for candidates
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.text,
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {v.requirements}
                      </div>
                    </div>
                  )}
                  {v.description && (
                    <div
                      style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: T.accent,
                          marginBottom: 6,
                        }}
                      >
                        Job description
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.text,
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {v.description}
                      </div>
                    </div>
                  )}
                  {v.otherDesc && (
                    <div
                      style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: T.text,
                          marginBottom: 6,
                        }}
                      >
                        Other description
                      </div>
                      <div
                        style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}
                      >
                        {v.otherDesc}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── CANDIDATES TAB ── */}
          {tab === "candidates" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>
                    Candidates for this vacancy
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    Jami {candLoading ? "…" : candidates.length} ta nomzod
                  </div>
                </div>
                <button
                  onClick={() => setCandModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 13px",
                    borderRadius: 7,
                    background: T.accent,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 11,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  + Add Candidate
                </button>
              </div>

              {candidates.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: T.muted,
                    fontSize: 12,
                  }}
                >
                  No candidates yet. Add the first one ↗
                </div>
              )}

              {candidates.length > 0 && (
                <div
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 11,
                    }}
                  >
                    <thead>
                      <tr style={{ background: T.card2 }}>
                        {[
                          "Candidate",
                          "Company",
                          "Working position",
                          "Added by agent",
                          "Status",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 12px",
                              textAlign: "left",
                              fontWeight: 700,
                              color: T.muted,
                              fontSize: 10,
                              borderBottom: `1px solid ${T.border}`,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c, i) => {
                        const lead = leads.find((l) => l.id === c.leadId);
                        const cs =
                          CAND_STATUS[c.status] || CAND_STATUS.submitted;
                        return (
                          <tr
                            key={c.id}
                            style={{
                              borderBottom: `1px solid ${T.border}`,
                              background: i % 2 === 0 ? T.card : T.card2,
                            }}
                          >
                            <td
                              style={{
                                padding: "10px 12px",
                                color: T.text,
                                fontWeight: 600,
                              }}
                            >
                              {c.leadName || lead?.name || "–"}
                            </td>
                            <td
                              style={{ padding: "10px 12px", color: T.muted }}
                            >
                              {lead?.company || v.company || "–"}
                            </td>
                            <td
                              style={{ padding: "10px 12px", color: T.muted }}
                            >
                              {v.jobType || v.title || "–"}
                            </td>
                            <td
                              style={{ padding: "10px 12px", color: T.muted }}
                            >
                              {c.addedByName || "–"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {canEdit ? (
                                <select
                                  value={c.status}
                                  onChange={(e) =>
                                    updateCandStatus(c.id, e.target.value)
                                  }
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: cs.c,
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    outline: "none",
                                    padding: "2px 0",
                                  }}
                                >
                                  {Object.entries(CAND_STATUS).map(([k, v]) => (
                                    <option
                                      key={k}
                                      value={k}
                                      style={{ color: T.text }}
                                    >
                                      {v.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: cs.c,
                                  }}
                                >
                                  {cs.label}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {canEdit && (
                                <button
                                  onClick={() => removeCandidate(c.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: T.red,
                                    fontSize: 14,
                                    padding: 0,
                                  }}
                                  title="Remove"
                                >
                                  🗑️
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Candidate Modal */}
      {candModal && (
        <Modal onClose={() => setCandModal(false)} width={420}>
          <div style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  color: T.text,
                }}
              >
                Add Candidate
              </h3>
              <button
                onClick={() => setCandModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: T.muted,
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label style={lab(T)}>Select Lead / Candidate *</label>
                <SearchSelect
                  items={leadOpts}
                  value={candForm.leadId}
                  onChange={(v) => cf("leadId", v)}
                  placeholder="Search by name or phone..."
                />
              </div>
              <div>
                <label style={lab(T)}>Status</label>
                <select
                  value={candForm.status}
                  onChange={(e) => cf("status", e.target.value)}
                  style={inp(T)}
                >
                  {Object.entries(CAND_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lab(T)}>Note</label>
                <textarea
                  value={candForm.note}
                  onChange={(e) => cf("note", e.target.value)}
                  rows={2}
                  style={{ ...inp(T), resize: "vertical" }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 7,
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                onClick={() => setCandModal(false)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 6,
                  background: T.card2,
                  color: T.muted,
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Cancel
              </button>
              <button
                onClick={addCandidate}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  background: T.accent,
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── PARTNERS TAB ── */}
      {tab === "partners" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Hamkorlar kirishi</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>Qaysi hamkorlar bu vakansiyani ko'ra olishini belgilang</div>
            </div>
            {savingPartners && <span style={{ fontSize: 10, color: T.muted }}>Saqlanmoqda…</span>}
          </div>

          {partners.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: T.muted, fontSize: 12 }}>
              Hozircha hamkor foydalanuvchilar yo'q
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {partners.map(p => {
                const active = allowedPartners.includes(p.id);
                return (
                  <div key={p.id} onClick={() => togglePartner(p.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    borderRadius: 10, cursor: "pointer", userSelect: "none",
                    border: `2px solid ${active ? T.accent : T.border}`,
                    background: active ? `${T.accent}10` : T.card2,
                    transition: "all 0.15s",
                  }}>
                    <Av id={p.id} team={team} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>{p.phone || p.username}</div>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", border: `2px solid ${active ? T.accent : T.border}`,
                      background: active ? T.accent : "transparent", display: "flex", alignItems: "center",
                      justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0,
                    }}>
                      {active ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: `${T.accent}10`, border: `1px solid ${T.accent}22`, fontSize: 10, color: T.muted }}>
            💡 Belgilangan hamkorlar bu vakansiyani o'z panelidagi ko'ra oladi va nomzod qo'sha oladi.
            Belgilanmaganlar bu vakansiyani ko'ra olmaydi.
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── PARTNER VIEW ────────────────────────────────────────────────────────────
function PartnerVacanciesView({ user, leads, vacancies, T }) {
  const [ptab, setPtab] = useState("vacancies");
  const [selV, setSelV] = useState(null);
  const [candModal, setCandModal] = useState(false);
  const [candForm, setCandForm] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const inpS = inp(T);

  const activeVacs = vacancies.filter(v => v.status === "active");
  const myLeadIds = new Set(leads.map(l => l.id));

  useEffect(() => {
    if (!selV) return;
    setCandLoading(true);
    vacanciesAPI.getCandidates(selV.id)
      .then(r => setCandidates(r||[]))
      .catch(()=>setCandidates([]))
      .finally(()=>setCandLoading(false));
  }, [selV]);

  const myCands = candidates.filter(c => myLeadIds.has(c.leadId));

  const submitCandidate = async () => {
    if (!candForm.leadId || !selV) return;
    const lead = leads.find(l=>l.id===candForm.leadId);
    try {
      const saved = await candidatesAPI.create({
        vacancyId: selV.id,
        leadId: candForm.leadId,
        leadName: lead?.name||"",
        addedByName: user.name,
        status: "submitted",
        note: candForm.note||"",
      });
      setCandidates(p=>[...p,saved]);
      setCandModal(false);
      setCandForm({});
    } catch(e){ alert("Xatolik: "+e.message); }
  };

  return <div>
    <div style={{display:"flex",gap:6,marginBottom:16}}>
      {[["vacancies","Ochiq Vakansiyalar"],["mycands","Mening Nomzodlarim"]].map(([k,l])=>(
        <button key={k} onClick={()=>setPtab(k)} style={{padding:"7px 16px",borderRadius:7,border:`2px solid ${ptab===k?T.accent:T.border}`,background:ptab===k?`${T.accent}22`:"transparent",color:ptab===k?T.text:T.muted,fontWeight:ptab===k?700:400,cursor:"pointer",fontSize:11}}>{l}</button>
      ))}
    </div>

    {ptab==="vacancies"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {activeVacs.map(v=>(
          <div key={v.id} onClick={()=>{setSelV(v);setCandModal(true);setCandForm({});}}
            style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:14,cursor:"pointer",transition:"box-shadow 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 18px rgba(0,0,0,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:3}}>{v.title||"–"}</div>
            <div style={{fontSize:10,color:T.muted,marginBottom:7}}>{v.company||""} · {v.country||""}</div>
            {v.salary&&<div style={{fontSize:10,color:T.green,marginBottom:5}}>€{v.salary}/oy</div>}
            <div style={{fontSize:9,color:T.muted}}>O'rinlar: {v.positions||1} · Yollangan: {v.hiredCount||0}</div>
            <button style={{marginTop:9,width:"100%",padding:"5px",borderRadius:6,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:10,fontWeight:700}}>+ Nomzod yuborish</button>
          </div>
        ))}
        {activeVacs.length===0&&<div style={{color:T.muted,padding:30,fontSize:12}}>Ochiq vakansiyalar yo'q</div>}
      </div>
    </div>}

    {ptab==="mycands"&&<div>
      <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>Mening yuborishlarim</div>
      {myCands.length===0&&<div style={{color:T.muted,fontSize:12,padding:20}}>Hali nomzod yuborilmagan</div>}
      {myCands.map(c=>{
        const cs=CAND_STATUS[c.status]||CAND_STATUS.submitted;
        const lead=leads.find(l=>l.id===c.leadId);
        return <div key={c.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:T.text}}>{c.leadName||lead?.name||"–"}</div>
            <div style={{fontSize:9,color:T.muted}}>{c.vacancyTitle||"Vakansiya"} · {c.addedAt?.slice(0,10)||""}</div>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:cs.c,background:`${cs.c}18`,borderRadius:12,padding:"2px 9px"}}>{cs.label}</span>
        </div>;
      })}
    </div>}

    {candModal&&selV&&<Modal onClose={()=>setCandModal(false)} width={420}>
      <div style={{padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Nomzod yuborish — {selV.title}</h3>
          <button onClick={()=>setCandModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:18}}>✕</button>
        </div>
        <div style={{display:"grid",gap:9}}>
          <div><label style={{fontSize:10,color:T.muted,fontWeight:600,display:"block",marginBottom:3}}>Mijoz (nomzod) *</label>
            <select value={candForm.leadId||""} onChange={e=>setCandForm(p=>({...p,leadId:e.target.value}))} style={inpS}>
              <option value="">— Tanlang —</option>
              {leads.map(l=><option key={l.id} value={l.id}>{l.name} ({l.phone||l.id})</option>)}
            </select>
          </div>
          <div><label style={{fontSize:10,color:T.muted,fontWeight:600,display:"block",marginBottom:3}}>Izoh</label>
            <textarea value={candForm.note||""} onChange={e=>setCandForm(p=>({...p,note:e.target.value}))} rows={2} style={{...inpS,resize:"vertical"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:7,justifyContent:"flex-end",marginTop:14}}>
          <button onClick={()=>setCandModal(false)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11}}>Bekor</button>
          <button onClick={submitCandidate} style={{padding:"7px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>Yuborish</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

// ─── VACANCIES PAGE ───────────────────────────────────────────────────────────
function Vacancies({ leads, user, team, roles }) {
  const T = useT();
  const perm = roles[user.role] || {};
  const canEdit = perm.canEdit || perm.canCfg;

  const [vacancies, setVacancies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newForm, setNewForm] = useState({});

  useEffect(() => {
    vacanciesAPI
      .getAll()
      .then((data) => setVacancies(data || []))
      .catch((err) => console.error("Vacancies load error:", err));
  }, []);

  const nf = (k, v) => setNewForm((p) => ({ ...p, [k]: v }));

  // Filters
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fCountry, setFCountry] = useState("");
  const [view, setView] = useState("grid"); // grid | list

  const inpS = inp(T);

  const filtered = useMemo(
    () =>
      vacancies.filter((v) => {
        if (
          search &&
          !v.title?.toLowerCase().includes(search.toLowerCase()) &&
          !v.company?.toLowerCase().includes(search.toLowerCase()) &&
          !v.country?.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        if (fStatus !== "all" && v.status !== fStatus) return false;
        if (fCountry && v.country !== fCountry) return false;
        return true;
      }),
    [vacancies, search, fStatus, fCountry],
  );

  const saveVacancy = async (vac) => {
    try {
      const isExisting = vacancies.some(x => x.id === vac.id);
      const saved = isExisting
        ? await vacanciesAPI.update(vac.id, vac)
        : await vacanciesAPI.create(vac);

      setVacancies((p) =>
        p.some((x) => x.id === saved.id)
          ? p.map((x) => (x.id === saved.id ? saved : x))
          : [...p, saved],
      );
      setSelected(saved);
    } catch (err) {
      alert("Vakansiya saqlanmadi: " + err.message);
    }
  };

  const deleteVacancy = async (id) => {
    if (!window.confirm("Delete this vacancy?")) return;

    try {
      await vacanciesAPI.delete(id);
      setVacancies((p) => p.filter((v) => v.id !== id));
      setSelected(null);
    } catch (err) {
      alert("Vakansiya o‘chirilmadi: " + err.message);
    }
  };

  const createVacancy = async () => {
    if (!newForm.title) return;
    const vac = {
      ...newForm,
      postedDate: new Date().toISOString().slice(0, 10),
      status: newForm.status || "active",
    };
    await saveVacancy(vac);
    setShowForm(false);
    setNewForm({});
  };

  // Stats
  const stats = useMemo(
    () => ({
      total: vacancies.length,
      active: vacancies.filter((v) => v.status === "active").length,
      filled: vacancies.filter((v) => v.status === "filled").length,
      totalPos: vacancies.reduce((s, v) => s + (v.positions || 1), 0),
      hired: vacancies.reduce((s, v) => s + (v.hiredCount || 0), 0),
      submitted: vacancies.reduce((s, v) => s + (v.candidateCount || 0), 0),
    }),
    [vacancies],
  );

  const allCountries = [
    ...new Set(vacancies.map((v) => v.country).filter(Boolean)),
  ];

  // Partner view
  if (user.role === "partner") {
    return (
      <div style={{ minHeight: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: 0 }}>Vakansiyalar</h1>
            <p style={{ color: T.muted, margin: "2px 0 0", fontSize: 11 }}>Nomzodlaringizni yuboring</p>
          </div>
        </div>
        <PartnerVacanciesView user={user} leads={leads} vacancies={vacancies} T={T} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h1
            style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: 0 }}
          >
            Job ads
          </h1>
          <p style={{ color: T.muted, margin: "2px 0 0", fontSize: 11 }}>
            Management of all work positions
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setNewForm({ status: "active" });
              setShowForm(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 14px",
              borderRadius: 8,
              background: T.accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: 11,
              border: "none",
              cursor: "pointer",
              boxShadow: `0 2px 8px ${T.accent}44`,
            }}
          >
            + New Vacancy
          </button>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          [
            "POSITIONS",
            `${stats.totalPos} needed`,
            `${stats.hired} hired`,
            T.accent,
            "👷",
          ],
          [
            "CANDIDATES",
            `${stats.submitted} submitted`,
            `${stats.hired} approved`,
            T.blue,
            "👥",
          ],
          [
            "JOB ADS",
            `${stats.total} total`,
            `${stats.active} active · ${stats.filled} filled`,
            T.green,
            "📋",
          ],
        ].map(([label, main, sub, c, ic]) => (
          <div
            key={label}
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `${c}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {ic}
            </div>
            <div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 2,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>
                {main}
              </div>
              <div style={{ fontSize: 9, color: T.muted }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Status tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: 3,
          }}
        >
          {[
            ["all", "All"],
            ["active", "Active"],
            ["waiting", "Awaiting approval"],
            ["revision", "Awaiting revision"],
            ["inactive", "Inactive"],
            ["filled", "Filled"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFStatus(k)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: fStatus === k ? 700 : 400,
                background: fStatus === k ? T.accent : "transparent",
                color: fStatus === k ? "#fff" : T.muted,
                transition: "all 0.15s",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.muted,
                fontSize: 12,
              }}
            >
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by position..."
              style={{ ...inpS, paddingLeft: 26, width: 170, fontSize: 11 }}
            />
          </div>
          {/* Country */}
          <select
            value={fCountry}
            onChange={(e) => setFCountry(e.target.value)}
            style={{ ...inpS, width: 130, fontSize: 11 }}
          >
            <option value="">🌍 Country</option>
            {allCountries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {/* View toggle */}
          <div
            style={{
              display: "flex",
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setView("grid")}
              style={{
                padding: "6px 9px",
                border: "none",
                cursor: "pointer",
                background: view === "grid" ? T.accent : "transparent",
                color: view === "grid" ? "#fff" : T.muted,
                fontSize: 13,
              }}
            >
              ⊞
            </button>
            <button
              onClick={() => setView("list")}
              style={{
                padding: "6px 9px",
                border: "none",
                cursor: "pointer",
                background: view === "list" ? T.accent : "transparent",
                color: view === "list" ? "#fff" : T.muted,
                fontSize: 13,
              }}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {vacancies.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.text,
              marginBottom: 6,
            }}
          >
            No vacancies yet
          </div>
          <div style={{ fontSize: 11, marginBottom: 16 }}>
            Create your first job posting to get started
          </div>
          {canEdit && (
            <button
              onClick={() => {
                setNewForm({ status: "active" });
                setShowForm(true);
              }}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                background: T.accent,
                color: "#fff",
                fontWeight: 700,
                fontSize: 11,
                border: "none",
                cursor: "pointer",
              }}
            >
              + New Vacancy
            </button>
          )}
        </div>
      )}

      {/* ── Grid view ── */}
      {view === "grid" && filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))",
            gap: 14,
          }}
        >
          {filtered.map((v) => (
            <VacancyCard
              key={v.id}
              v={v}
              leads={leads}
              T={T}
              onClick={() => setSelected(v)}
            />
          ))}
        </div>
      )}

      {/* ── List view ── */}
      {view === "list" && filtered.length > 0 && (
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
          >
            <thead>
              <tr style={{ background: T.card2 }}>
                {[
                  "Position",
                  "Company",
                  "Country",
                  "Salary",
                  "Positions",
                  "Candidates",
                  "Status",
                  "Posted",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: T.muted,
                      fontSize: 10,
                      borderBottom: `1px solid ${T.border}`,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const st = V_STATUS[v.status] || V_STATUS.active;
                const hired = v.hiredCount || 0;
                return (
                  <tr
                    key={v.id}
                    onClick={() => setSelected(v)}
                    style={{
                      borderBottom: `1px solid ${T.border}`,
                      background: i % 2 === 0 ? T.card : T.card2,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = `${T.accent}0a`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        i % 2 === 0 ? T.card : T.card2)
                    }
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        color: T.text,
                        fontWeight: 700,
                      }}
                    >
                      {v.title || "–"}
                    </td>
                    <td style={{ padding: "10px 12px", color: T.muted }}>
                      {v.company || "–"}
                    </td>
                    <td style={{ padding: "10px 12px", color: T.cyan }}>
                      📍{v.country || "–"}
                    </td>
                    <td style={{ padding: "10px 12px", color: T.green }}>
                      {v.salary ? `€${v.salary}` : "–"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: T.text,
                        fontWeight: 700,
                      }}
                    >
                      {hired}/{v.positions || 1}
                    </td>
                    <td style={{ padding: "10px 12px", color: T.muted }}>
                      {v.candidateCount || 0}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusBadge status={v.status} T={T} />
                    </td>
                    <td style={{ padding: "10px 12px", color: T.muted }}>
                      {fmtDate(v.postedDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div
            style={{
              padding: "8px 12px",
              background: T.card2,
              borderTop: `1px solid ${T.border}`,
              fontSize: 10,
              color: T.muted,
            }}
          >
            Show {filtered.length} announced
          </div>
        </div>
      )}

      {/* ── Vacancy Detail ── */}
      {selected && (
        <VacancyDetail
          v={selected}
          leads={leads}
          team={team}
          user={user}
          roles={roles}
          T={T}
          onClose={() => setSelected(null)}
          onSave={saveVacancy}
          onDelete={deleteVacancy}
        />
      )}

      {/* ── New Vacancy Form ── */}
      {showForm && canEdit && (
        <Modal onClose={() => setShowForm(false)} width={640}>
          <div style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  color: T.text,
                }}
              >
                New Vacancy
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: T.muted,
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lab(T)}>Job Title *</label>
                <input
                  value={newForm.title || ""}
                  onChange={(e) => nf("title", e.target.value)}
                  style={inpS}
                  placeholder="e.g. Injection mold fitter"
                />
              </div>
              <div>
                <label style={lab(T)}>Company</label>
                <input
                  value={newForm.company || ""}
                  onChange={(e) => nf("company", e.target.value)}
                  style={inpS}
                />
              </div>
              <div>
                <label style={lab(T)}>Country</label>
                <select
                  value={newForm.country || ""}
                  onChange={(e) => nf("country", e.target.value)}
                  style={inpS}
                >
                  <option value="">Select...</option>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lab(T)}>Job Type / Sector</label>
                <input
                  value={newForm.jobType || ""}
                  onChange={(e) => nf("jobType", e.target.value)}
                  style={inpS}
                  placeholder="e.g. Auto mechanic"
                />
              </div>
              <div>
                <label style={lab(T)}>Contract Type</label>
                <select
                  value={newForm.contractType || ""}
                  onChange={(e) => nf("contractType", e.target.value)}
                  style={inpS}
                >
                  <option value="">Select...</option>
                  {CONTRACT_TYPES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lab(T)}>Salary (EUR)</label>
                <input
                  value={newForm.salary || ""}
                  onChange={(e) => nf("salary", e.target.value)}
                  style={inpS}
                  placeholder="564"
                />
              </div>
              <div>
                <label style={lab(T)}>Positions needed</label>
                <input
                  type="number"
                  min="1"
                  value={newForm.positions || 1}
                  onChange={(e) => nf("positions", Number(e.target.value))}
                  style={inpS}
                />
              </div>
              <div>
                <label style={lab(T)}>Status</label>
                <select
                  value={newForm.status || "active"}
                  onChange={(e) => nf("status", e.target.value)}
                  style={inpS}
                >
                  {Object.entries(V_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lab(T)}>Accommodation</label>
                <select
                  value={newForm.accommodation || ""}
                  onChange={(e) => nf("accommodation", e.target.value)}
                  style={inpS}
                >
                  <option value="">–</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label style={lab(T)}>Food Vouchers</label>
                <input
                  value={newForm.foodVouchers || ""}
                  onChange={(e) => nf("foodVouchers", e.target.value)}
                  style={inpS}
                />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lab(T)}>Logo URL</label>
                <input
                  value={newForm.logo || ""}
                  onChange={(e) => nf("logo", e.target.value)}
                  style={inpS}
                  placeholder="https://..."
                />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lab(T)}>Description</label>
                <textarea
                  value={newForm.description || ""}
                  onChange={(e) => nf("description", e.target.value)}
                  rows={3}
                  style={{ ...inpS, resize: "vertical" }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 7,
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 7,
                  background: T.card2,
                  color: T.muted,
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Cancel
              </button>
              <button
                onClick={createVacancy}
                style={{
                  padding: "8px 18px",
                  borderRadius: 7,
                  background: T.accent,
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Create Vacancy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export { Vacancies };
