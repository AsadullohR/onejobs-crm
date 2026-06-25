import { useState, useEffect } from "react";
import { useT } from "./theme.js";
import { useLang } from "./i18n.jsx";
import { fmtMs, inp, lab, I } from "./helpers.jsx";
import { vacanciesAPI, candidatesAPI, employerAPI } from "./api.js";

// ─── CANDIDATE STATUS MAP ─────────────────────────────────────────────────────
const CAND_STATUS_KEYS = ["submitted", "approved", "rejected", "interview", "hired"];

function candStatusMap(t) {
  return {
    submitted: { label: t("emp_cand_submitted"), c: "#2563eb" },
    applied:   { label: t("emp_cand_submitted"), c: "#2563eb" },
    approved:  { label: t("emp_cand_approved"),  c: "#16a34a" },
    rejected:  { label: t("emp_cand_rejected"),  c: "#dc2626" },
    interview: { label: t("emp_cand_interview"), c: "#d97706" },
    hired:     { label: t("emp_cand_hired"),     c: "#9333ea" },
  };
}

// Lead pipeline stage colors
const STAGE_COLORS = {
  "Yangi":                  "#2563eb",
  "Boglanildi":             "#0891b2",
  "Onlayn Suhbat Uchun":    "#d97706",
  "Onlayn Suhbat":          "#d97706",
  "Suhbat":                 "#7c3aed",
  "Shartnoma qildi":        "#059669",
  "XBA To'lov qildi":       "#16a34a",
  "Jo'nab ketdi":           "#15803d",
  "Viza Olidi":             "#166534",
  "Viza Rad Etildi":        "#dc2626",
  "Rad etildi":             "#dc2626",
  "Bekor qildi":            "#6b7280",
};

// ─── VACANCIES TAB ────────────────────────────────────────────────────────────
function VacanciesTab({ vacancies, loading, t, T }) {
  const [selVac, setSelVac] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const CMAP = candStatusMap(t);

  useEffect(() => {
    if (!selVac) return;
    setCandLoading(true);
    vacanciesAPI.getCandidates(selVac.id)
      .then(r => setCandidates(r || []))
      .catch(() => setCandidates([]))
      .finally(() => setCandLoading(false));
  }, [selVac]);

  const updateStatus = async (candId, status) => {
    try {
      await candidatesAPI.update(candId, { status });
      setCandidates(p => p.map(c => c.id === candId ? { ...c, status } : c));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div style={{ color: T.muted, textAlign: "center", padding: 40, fontSize: 12 }}>{t("loading")}</div>;

  if (vacancies.length === 0) return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>💼</div>
      <div style={{ fontSize: 13, color: T.text, marginBottom: 4 }}>{t("emp_no_vacancies")}</div>
      <div style={{ fontSize: 11, color: T.muted }}>{t("emp_no_vacancies_sub")}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: selVac ? "320px 1fr" : "1fr", gap: 14 }}>
      {/* Vacancy cards */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>{t("emp_vacancy_list")}</div>
        {vacancies.map(v => {
          const hired = v.hiredCount || 0;
          const total = v.positions || 1;
          const cands = v.candidateCount || 0;
          const isSelected = selVac?.id === v.id;
          const statusLabel = v.status === "active" ? t("emp_active") : v.status === "filled" ? t("emp_filled") : v.status === "pending" ? t("emp_pending") : v.status;
          const statusColor = v.status === "active" ? T.green : v.status === "pending" ? T.yellow : T.muted;
          return (
            <div key={v.id} onClick={() => setSelVac(isSelected ? null : v)}
              style={{ background: isSelected ? `${T.accent}12` : T.card, border: `1px solid ${isSelected ? T.accent : T.border}`,
                borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                borderLeft: `3px solid ${isSelected ? T.accent : T.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>{v.title || "–"}</div>
              <div style={{ fontSize: 9, color: T.muted, marginBottom: 7 }}>
                {v.country || ""}{v.jobType ? " · " + v.jobType : ""}{v.salary ? ` · €${v.salary}${t("emp_per_month")}` : ""}
              </div>
              <div style={{ display: "flex", gap: 8, fontSize: 9, flexWrap: "wrap" }}>
                <span style={{ color: T.muted }}>👥 {cands} {t("emp_candidates").toLowerCase()}</span>
                <span style={{ color: T.green }}>✅ {hired}/{total} {t("emp_hired").toLowerCase()}</span>
                <span style={{ background: `${statusColor}22`, color: statusColor, borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>
                  {statusLabel}
                </span>
              </div>
              <div style={{ marginTop: 8, height: 3, borderRadius: 3, background: T.border, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, total > 0 ? (hired / total) * 100 : 0)}%`,
                  background: hired >= total ? T.green : T.accent, transition: "width 0.4s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate panel */}
      {selVac && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>{selVac.title}</div>
              <div style={{ fontSize: 10, color: T.muted }}>{t("emp_candidate_list")}</div>
            </div>
            <button onClick={() => setSelVac(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18 }}>✕</button>
          </div>

          {candLoading && <div style={{ color: T.muted, textAlign: "center", padding: 20, fontSize: 11 }}>{t("loading")}</div>}
          {!candLoading && candidates.length === 0 && (
            <div style={{ color: T.muted, textAlign: "center", padding: 30, fontSize: 12 }}>{t("emp_no_candidates")}</div>
          )}
          {!candLoading && candidates.map(c => {
            const cs = CMAP[c.status] || CMAP.submitted;
            return (
              <div key={c.id} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 1 }}>{c.leadName || "–"}</div>
                  <div style={{ fontSize: 9, color: T.muted }}>{t("emp_added_by")}: {c.addedByName || "–"} · {c.addedAt?.slice(0, 10) || ""}</div>
                  {c.note && <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{c.note}</div>}
                </div>
                <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                  style={{ fontSize: 10, fontWeight: 700, color: cs.c, background: `${cs.c}18`,
                    border: `1px solid ${cs.c}44`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                  {CAND_STATUS_KEYS.map(k => (
                    <option key={k} value={k}>{(CMAP[k] || { label: k }).label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── WORKERS TAB ─────────────────────────────────────────────────────────────
function WorkersTab({ t, T }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const CMAP = candStatusMap(t);

  useEffect(() => {
    employerAPI.getWorkers()
      .then(r => setWorkers(r || []))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: T.muted, textAlign: "center", padding: 40, fontSize: 12 }}>{t("loading")}</div>;

  const CAND_STATUS_KEYS_ALL = ["all", "submitted", "approved", "interview", "hired", "rejected"];
  const filtered = filter === "all" ? workers : workers.filter(w => w.status === filter);

  if (workers.length === 0) return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>👷</div>
      <div style={{ fontSize: 13, color: T.text }}>{t("emp_no_workers")}</div>
    </div>
  );

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {CAND_STATUS_KEYS_ALL.map(k => {
          const label = k === "all" ? t("all") : (CMAP[k]?.label || k);
          const count = k === "all" ? workers.length : workers.filter(w => w.status === k).length;
          return (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: "5px 12px", borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", border: `1px solid ${filter === k ? T.accent : T.border}`,
                background: filter === k ? `${T.accent}18` : "transparent",
                color: filter === k ? T.accent : T.muted }}>
              {label} <span style={{ fontSize: 9 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Workers table */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: T.card2, borderBottom: `1px solid ${T.border}` }}>
              {[t("emp_worker_name"), t("emp_worker_vacancy"), t("emp_worker_country"), t("emp_worker_stage"), t("emp_worker_status"), t("emp_worker_date")].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "9px 12px", color: T.muted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(w => {
              const cs = CMAP[w.status] || CMAP.submitted;
              const stageColor = STAGE_COLORS[w.leadStatus] || T.muted;
              return (
                <tr key={w.id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, color: T.text }}>{w.name || "–"}</div>
                    {w.phone && <div style={{ fontSize: 9, color: T.muted }}>{w.phone}</div>}
                  </td>
                  <td style={{ padding: "10px 12px", color: T.text, fontSize: 10 }}>{w.vacancyTitle || "–"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 10, color: T.text }}>{w.leadCountry || w.vacancyCountry || "–"}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {w.leadStatus && w.leadStatus !== "–" ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: stageColor, background: `${stageColor}18`,
                        border: `1px solid ${stageColor}33`, borderRadius: 10, padding: "2px 8px" }}>
                        {w.leadStatus}
                      </span>
                    ) : <span style={{ color: T.muted, fontSize: 10 }}>–</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: cs.c, background: `${cs.c}18`,
                      border: `1px solid ${cs.c}33`, borderRadius: 10, padding: "2px 8px" }}>
                      {cs.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: T.muted, fontSize: 9 }}>
                    {(w.updatedAt || w.appliedAt)?.slice(0, 10) || "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px", color: T.muted, fontSize: 12 }}>{t("emp_no_workers")}</div>
        )}
      </div>
    </div>
  );
}

// ─── REQUEST TAB ─────────────────────────────────────────────────────────────
function RequestTab({ t, T, addNotif }) {
  const inpS = inp(T);
  const labS = lab(T);
  const [form, setForm] = useState({ title: "", country: "", jobType: "", positions: 1, salary: "", description: "" });
  const [sending, setSending] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const send = async () => {
    if (!form.title.trim()) return;
    setSending(true);
    try {
      await employerAPI.requestVacancy({ ...form, positions: Number(form.positions) || 1, salary: Number(form.salary) || null });
      addNotif?.(t("emp_req_success"), "success");
      setForm({ title: "", country: "", jobType: "", positions: 1, salary: "", description: "" });
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 16 }}>
          📋 {t("emp_request")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labS}>{t("emp_req_title")}</label>
            <input value={form.title} onChange={e => f("title", e.target.value)} style={inpS} placeholder={t("emp_req_placeholder_title")} />
          </div>
          <div>
            <label style={labS}>{t("emp_req_country")}</label>
            <input value={form.country} onChange={e => f("country", e.target.value)} style={inpS} placeholder="Germaniya, Polsha..." />
          </div>
          <div>
            <label style={labS}>{t("emp_req_jobtype")}</label>
            <input value={form.jobType} onChange={e => f("jobType", e.target.value)} style={inpS} placeholder="Full-time, Part-time..." />
          </div>
          <div>
            <label style={labS}>{t("emp_req_positions")}</label>
            <input type="number" min={1} value={form.positions} onChange={e => f("positions", e.target.value)} style={inpS} />
          </div>
          <div>
            <label style={labS}>{t("emp_req_salary")}</label>
            <input type="number" value={form.salary} onChange={e => f("salary", e.target.value)} style={inpS} placeholder="2000" />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labS}>{t("emp_req_desc")}</label>
            <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={4}
              style={{ ...inpS, resize: "vertical" }} placeholder={t("emp_req_placeholder_desc")} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button onClick={send} disabled={sending || !form.title.trim()}
            style={{ padding: "9px 20px", borderRadius: 8, background: T.accent, color: "#fff",
              fontWeight: 700, border: "none", cursor: form.title.trim() ? "pointer" : "not-allowed",
              fontSize: 12, fontFamily: "inherit", opacity: form.title.trim() ? 1 : 0.5 }}>
            {sending ? t("loading") : `📤 ${t("emp_req_send")}`}
          </button>
        </div>
      </div>
      <div style={{ marginTop: 14, background: `${T.yellow}12`, border: `1px solid ${T.yellow}33`,
        borderRadius: 10, padding: "10px 14px", fontSize: 10, color: T.muted }}>
        ⚠️ {t("emp_req_success")}
      </div>
    </div>
  );
}

// ─── EMPLOYER PORTAL ─────────────────────────────────────────────────────────
function EmployerPortal({ user, leads, team, addNotif }) {
  const T = useT();
  const { t, lang, setLang } = useLang();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("vacancies");

  useEffect(() => {
    vacanciesAPI.getAll()
      .then(all => setVacancies(all || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPositions = vacancies.reduce((s, v) => s + (v.positions || 1), 0);
  const totalCands = vacancies.reduce((s, v) => s + (v.candidateCount || 0), 0);
  const totalHired = vacancies.reduce((s, v) => s + (v.hiredCount || 0), 0);

  const TABS = [
    { k: "vacancies", label: `💼 ${t("emp_vacancies")}` },
    { k: "workers",   label: `👷 ${t("emp_workers")}` },
    { k: "request",   label: `📋 ${t("emp_request")}` },
  ];

  const LANG_FLAGS = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: "0 0 4px" }}>
            {t("emp_welcome")}, {user.name}! 👋
          </h1>
          <p style={{ color: T.muted, margin: 0, fontSize: 11 }}>
            {user.company ? `🏢 ${user.company} · ` : ""}{t("emp_subtitle")}
          </p>
        </div>
        {/* Language switcher in header */}
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          {["uz", "ru", "en"].map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                border: `2px solid ${lang === l ? T.accent : T.border}`,
                background: lang === l ? T.accent : T.card,
                color: lang === l ? "#fff" : T.muted }}>
              {LANG_FLAGS[l]} {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          ["💼", t("emp_stat_vacancies"), vacancies.length, T.accent],
          ["👷", t("emp_stat_positions"), totalPositions,   T.text],
          ["👥", t("emp_stat_candidates"), totalCands,      T.blue || T.accent],
          ["✅", t("emp_stat_hired"),      totalHired,      T.green],
        ].map(([ic, lb, val, c]) => (
          <div key={lb} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{ic} {lb}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs — pill style, always visible */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, background: T.card2, borderRadius: 12, padding: 6, border: `1px solid ${T.border}` }}>
        {TABS.map(tb => (
          <button key={tb.k} onClick={() => setTab(tb.k)}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: "pointer", border: "none", fontFamily: "inherit",
              background: tab === tb.k ? T.accent : "transparent",
              color: tab === tb.k ? "#fff" : T.muted,
              boxShadow: tab === tb.k ? "0 2px 8px rgba(37,99,235,0.25)" : "none",
              transition: "all 0.15s" }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "vacancies" && <VacanciesTab vacancies={vacancies} loading={loading} t={t} T={T} />}
      {tab === "workers"   && <WorkersTab t={t} T={T} />}
      {tab === "request"   && <RequestTab t={t} T={T} addNotif={addNotif} />}
    </div>
  );
}

export { EmployerPortal };
