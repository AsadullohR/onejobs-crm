import { useState, useMemo } from "react";
import { useT } from "./theme.js";
import { useLang, vTitle, vDesc } from "./i18n.jsx";
import { inp, lab, Modal } from "./helpers.jsx";
import { partnerAPI } from "./api.js";
import { CandidateProfile, candStatusMap, normCandStatus, CAND_STATUS_KEYS, fmtDate } from "./EmployerPortal.jsx";
import { InstallPrompt } from "./InstallPrompt.jsx";

// ─── PARTNER PORTAL ───────────────────────────────────────────────────────────
// Nomad Cloud-style dashboard for partner accounts:
//  • Overview  — stat cards, candidates-by-status table, ads-assigned table
//  • Candidates — rich filterable table with avatars and pagination
//  • Job ads   — card grid of vacancies shared with this partner
// Read-only: partners see status of the candidates they referred.

const APPROVED_SET = new Set(["approved_final", "approved_client", "visa_received", "permit_received"]);
const PENDING_SET  = new Set(["added", "interview", "reserve"]);
const PAGE_SIZE = 10;

const initials = name => (name || "?").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const AV_COLORS = ["#6366f1", "#0891b2", "#d97706", "#16a34a", "#9333ea", "#dc2626", "#0369a1", "#ea580c"];
const avColor = name => AV_COLORS[(name || "").length % AV_COLORS.length];

function PartnerPortal({ leads, candidates, vacancies, user }) {
  const T = useT();
  const { t, lang } = useLang();
  const CMAP = candStatusMap(t);
  const [tab, setTab] = useState("overview");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vacFilter, setVacFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selCand, setSelCand] = useState(null);
  const [selVac, setSelVac] = useState(null);
  const [vacTab, setVacTab] = useState("info");
  const [addForm, setAddForm] = useState(null);   // null = closed, object = form values
  const [submitting, setSubmitting] = useState(false);
  const af = (k, v) => setAddForm(p => ({ ...p, [k]: v }));

  const submitCandidate = async () => {
    if (submitting || !addForm) return;
    if (!addForm.name?.trim() || !addForm.phone?.trim()) { alert(t("pp_required_fields")); return; }
    setSubmitting(true);
    try {
      await partnerAPI.addCandidate({
        vacancyId: addForm.vacancyId,
        name: addForm.name, phone: addForm.phone,
        country: addForm.country || "", dob: addForm.dob || "",
        passport: addForm.passport || "", gender: addForm.gender || "",
        comment: addForm.comment || "",
      });
      setAddForm(null);
      alert(t("pp_add_success"));
      window._crmRefresh?.();   // silent reload so the new candidate appears
    } catch (e) {
      alert(e.message);
    } finally { setSubmitting(false); }
  };

  const leadById = useMemo(() => {
    const m = {};
    leads.forEach(l => { m[l.id] = l; });
    return m;
  }, [leads]);

  const vacById = useMemo(() => {
    const m = {};
    (vacancies || []).forEach(v => { m[v.id] = v; });
    return m;
  }, [vacancies]);

  // Partner's candidates = candidates whose lead is one of the partner's leads.
  const myCands = useMemo(() =>
    (candidates || [])
      .filter(c => leadById[c.lead_id || c.leadId])
      .map(c => ({ ...c, leadId: c.lead_id || c.leadId, vacancyId: c.vacancy_id || c.vacancyId })),
    [candidates, leadById]);

  const candLeadIds = useMemo(() => new Set(myCands.map(c => c.leadId)), [myCands]);
  const leadsOnly = leads.filter(l => !candLeadIds.has(l.id));

  const totalPeople = myCands.length + leadsOnly.length;
  const approved = myCands.filter(c => APPROVED_SET.has(normCandStatus(c.status))).length;
  const pending  = myCands.filter(c => PENDING_SET.has(normCandStatus(c.status))).length + leadsOnly.length;
  const departed = myCands.filter(c => leadById[c.leadId]?.status === "Jo'nab ketdi").length
                 + leadsOnly.filter(l => l.status === "Jo'nab ketdi").length;
  const successRate = totalPeople ? Math.round((approved / totalPeople) * 100) : 0;
  const activeVacs = (vacancies || []).filter(v => (v.status || "active") === "active").length;

  // Status breakdown — only statuses that occur, sorted by count (Nomad style)
  const statusCounts = useMemo(() => {
    const m = {};
    myCands.forEach(c => { const k = normCandStatus(c.status); m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [myCands]);

  // Per-vacancy candidate counts for the "ads assigned" table
  const vacCandCounts = useMemo(() => {
    const m = {};
    myCands.forEach(c => { if (c.vacancyId) m[c.vacancyId] = (m[c.vacancyId] || 0) + 1; });
    return m;
  }, [myCands]);

  // ── Candidates table rows ──
  const allRows = useMemo(() => {
    const candRows = myCands.map(c => {
      const lead = leadById[c.leadId] || {};
      const v = vacById[c.vacancyId];
      return {
        key: `c-${c.id}`, cand: c, lead, vacancy: v,
        name: lead.name || c.name || "", phone: lead.phone || c.phone || "",
        country: lead.country || "", company: v?.company || "",
        position: (v && vTitle(v, lang)) || lead.position || lead.sector || "",
        pay: v?.salary || "", leadStatus: lead.status || "",
        candStatus: normCandStatus(c.status),
        date: fmtDate(c.created_at || lead.createdAt),
      };
    });
    const leadRows = leadsOnly.map(l => ({
      key: `l-${l.id}`, cand: null, lead: l, vacancy: null,
      name: l.name, phone: l.phone || "", country: l.country || "",
      company: "", position: l.position || l.sector || "", pay: "",
      leadStatus: l.status || "", candStatus: null,
      date: fmtDate(l.createdAt),
    }));
    return [...candRows, ...leadRows];
  }, [myCands, leadsOnly, leadById, vacById]);

  const filteredRows = useMemo(() => {
    let all = allRows;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      all = all.filter(r => r.name.toLowerCase().includes(s) || r.phone.includes(s));
    }
    if (statusFilter !== "all") all = all.filter(r => r.candStatus === statusFilter);
    if (vacFilter !== "all") all = all.filter(r => r.cand && String(r.cand.vacancyId) === vacFilter);
    return all;
  }, [allRows, q, statusFilter, vacFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const usedStatuses = useMemo(() => [...new Set(myCands.map(c => normCandStatus(c.status)))], [myCands]);

  const setF = fn => v => { fn(v); setPage(0); };

  // ── UI atoms ──
  const StatusBadge = ({ k, fallback }) => {
    const s = CMAP[k];
    if (!s) return fallback
      ? <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "3px 8px", whiteSpace: "nowrap" }}>{fallback}</span>
      : <span style={{ color: T.muted, fontSize: 11 }}>–</span>;
    return <span style={{ fontSize: 10, fontWeight: 700, color: s.c, background: s.c + "18", border: `1px solid ${s.c}40`, borderRadius: 8, padding: "3px 8px", whiteSpace: "nowrap" }}>{s.label}</span>;
  };

  const ActiveBadge = ({ status }) => {
    const active = (status || "active") === "active";
    const c = active ? "#16a34a" : "#9ca3af";
    return <span style={{ fontSize: 10, fontWeight: 700, color: c, background: c + "18", border: `1px solid ${c}40`, borderRadius: 10, padding: "3px 10px" }}>{active ? t("pp_active") : t("pp_inactive")}</span>;
  };

  const Card = ({ label, value, sub, color, icon }) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: T.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>{label}</span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || T.text }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const Panel = ({ title, children }) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.shadow, marginBottom: 22, overflow: "hidden" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.text, padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.card2 }}>{title}</div>
      {children}
    </div>
  );

  const th = { textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", background: T.card2 };
  const td = { padding: "10px 14px", fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}` };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      {/* Branded header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fff", border: `1px solid ${T.border}`, boxShadow: T.shadow, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
          <img src="/logo.png" alt="OneJobs" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
            onError={e => { e.target.style.display = "none"; e.target.parentNode.style.background = "linear-gradient(135deg,#38b6ff,#0066d8)"; e.target.parentNode.innerHTML = '<span style="color:#fff;font-weight:900;font-size:20px">OJ</span>'; }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 21, fontWeight: 900, color: T.text, margin: 0 }}>OneJobs</h1>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("pp_title")}</span>
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>{user?.name} · {t("pp_subtitle")}</div>
        </div>
        <InstallPrompt />
      </div>

      {/* Tabs */}
      {!selVac && <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["overview", "📊 " + t("pp_tab_overview")], ["candidates", "👥 " + t("pp_tab_candidates")], ["jobs", "💼 " + t("pp_tab_jobs")]].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${tab === k ? T.accent : T.border}`, background: tab === k ? T.accent : T.card, color: tab === k ? "#fff" : T.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {lbl}
          </button>
        ))}
      </div>}

      {/* ── VACANCY DETAIL ── */}
      {selVac && (() => {
        const v = selVac;
        const vCands = myCands
          .filter(c => String(c.vacancyId) === String(v.id))
          .map(c => ({ c, lead: leadById[c.leadId] || {} }));
        const filled = v.hiredCount || 0;
        const total = Number(v.positions) || 0;
        const pct = total ? Math.min(100, Math.round((filled / total) * 100)) : 0;
        const InfoField = ({ icon, label, value }) => !value ? null : (
          <div style={{ background: T.card2, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{icon} {label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{value}</div>
          </div>
        );
        return (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setSelVac(null)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ← {t("pp_back")}
              </button>
              <button onClick={() => setAddForm({ vacancyId: v.id, name: "", phone: "", country: "", dob: "", passport: "", gender: "", comment: "" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: T.shadow }}>
                ➕ {t("pp_add_candidate")}
              </button>
            </div>

            {/* Vacancy header */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.shadow, padding: 18, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: T.card2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {v.logo
                    ? <img src={v.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; e.target.parentNode.textContent = "💼"; }} />
                    : <span style={{ fontSize: 24 }}>💼</span>}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: 17, fontWeight: 900, color: T.text, margin: 0 }}>{vTitle(v, lang)}</h2>
                    <ActiveBadge status={v.status} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {v.company && <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, background: T.accent + "15", border: `1px solid ${T.accent}40`, borderRadius: 8, padding: "3px 10px" }}>🏢 {v.company}</span>}
                    {v.country && <span style={{ fontSize: 11, fontWeight: 700, color: "#9333ea", background: "#9333ea15", border: "1px solid #9333ea40", borderRadius: 8, padding: "3px 10px" }}>📍 {v.country}</span>}
                    {v.salary && <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#16a34a15", border: "1px solid #16a34a40", borderRadius: 8, padding: "3px 10px" }}>💶 {v.salary}</span>}
                  </div>
                  {total > 0 && <div style={{ marginTop: 12, maxWidth: 420 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted, marginBottom: 4 }}>
                      <span>👥 {t("pp_positions")}</span><span style={{ fontWeight: 700, color: T.text }}>{filled}/{total}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: T.card2, overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", background: pct >= 100 ? "#16a34a" : T.accent }} />
                    </div>
                  </div>}
                </div>
              </div>
            </div>

            {/* Detail tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["info", "📄 " + t("pp_job_info")], ["cands", `👥 ${t("pp_tab_candidates")} (${vCands.length})`]].map(([k, lbl]) => (
                <button key={k} onClick={() => setVacTab(k)}
                  style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid ${vacTab === k ? T.accent : T.border}`, background: vacTab === k ? T.accent : T.card, color: vacTab === k ? "#fff" : T.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {lbl}
                </button>
              ))}
            </div>

            {vacTab === "info" && <>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.shadow, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12 }}>{t("pp_job_info")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
                  <InfoField icon="💼" label={t("pp_col_position")} value={vTitle(v, lang)} />
                  <InfoField icon="🏢" label={t("pp_col_company")} value={v.company} />
                  <InfoField icon="🌍" label={t("pp_col_country")} value={v.country} />
                  <InfoField icon="💶" label={t("pp_col_pay")} value={v.salary} />
                  <InfoField icon="📄" label={t("pp_contract_type")} value={v.contractType || v.jobType} />
                  <InfoField icon="⏰" label={t("pp_working_hours")} value={v.workingHours} />
                  <InfoField icon="🏠" label={t("pp_accommodation")} value={v.accommodation} />
                  <InfoField icon="🍽" label={t("pp_food")} value={v.foodVouchers} />
                  <InfoField icon="💰" label={t("pp_additional_pay")} value={v.additionalPay} />
                  <InfoField icon="📅" label={t("pp_posted")} value={fmtDate(v.postedDate)} />
                </div>
              </div>
              {v.requirements && <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 14, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e", marginBottom: 8 }}>📋 {t("pp_requirements")}</div>
                <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v.requirements}</div>
              </div>}
              {v.description && <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1e40af", marginBottom: 8 }}>📝 {t("pp_job_desc")}</div>
                <div style={{ fontSize: 12, color: "#1e3a8a", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{vDesc(v, lang)}</div>
              </div>}
              {v.otherDesc && <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }}>ℹ️ {t("pp_other_desc")}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v.otherDesc}</div>
              </div>}
            </>}

            {vacTab === "cands" && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "auto", boxShadow: T.shadow }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                  <thead><tr>
                    <th style={th}>{t("pp_col_name")}</th>
                    <th style={th}>{t("pp_col_phone")}</th>
                    <th style={th}>{t("pp_col_country")}</th>
                    <th style={th}>{t("pp_col_status")}</th>
                    <th style={th}>{t("pp_col_date")}</th>
                  </tr></thead>
                  <tbody>
                    {vCands.map(({ c, lead }, i) => (
                      <tr key={c.id}
                        onClick={() => setSelCand({ cand: c, lead, vacancy: v })}
                        style={{ cursor: "pointer", background: i % 2 ? T.card2 : "transparent" }}>
                        <td style={{ ...td, fontWeight: 700 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: avColor(lead.name || c.name) + "22", color: avColor(lead.name || c.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{initials(lead.name || c.name)}</span>
                            {lead.name || c.name || "–"}
                          </div>
                        </td>
                        <td style={td}>{lead.phone || c.phone || "–"}</td>
                        <td style={td}>{lead.country || "–"}</td>
                        <td style={td}><StatusBadge k={normCandStatus(c.status)} /></td>
                        <td style={{ ...td, color: T.muted }}>{fmtDate(c.created_at || lead.createdAt) || "–"}</td>
                      </tr>
                    ))}
                    {vCands.length === 0 && (
                      <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: T.muted, padding: 30 }}>{t("pp_no_candidates")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── OVERVIEW ── */}
      {!selVac && tab === "overview" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 22 }}>
          <Card label={t("pp_total")}    value={totalPeople} icon="👥" color="#6366f1" />
          <Card label={t("pp_approved")} value={approved}    icon="✅" color="#16a34a" />
          <Card label={t("pp_pending")}  value={pending}     icon="⏳" color="#d97706" />
          <Card label={t("pp_sent")}     value={departed}    icon="✈️" color="#0891b2" />
          <Card label={t("pp_tab_jobs")} value={(vacancies || []).length} sub={`${activeVacs} ${t("pp_active").toLowerCase()}`} icon="💼" color="#7c3aed" />
          <Card label={t("pp_success")}  value={successRate + "%"} sub={t("pp_success_sub")} icon="📈" color="#9333ea" />
        </div>

        <Panel title={t("pp_by_status")}>
          {statusCounts.length === 0
            ? <div style={{ fontSize: 12, color: T.muted, padding: 18 }}>{t("pp_no_candidates")}</div>
            : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>{t("pp_col_status")}</th><th style={{ ...th, textAlign: "right" }}>#</th></tr></thead>
                <tbody>
                  {statusCounts.map(([k, n]) => (
                    <tr key={k}>
                      <td style={td}><StatusBadge k={k} /></td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 800, fontSize: 14 }}>{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Panel>

        <Panel title={t("pp_ads_assigned")}>
          {(vacancies || []).length === 0
            ? <div style={{ fontSize: 12, color: T.muted, padding: 18 }}>{t("pp_no_vacancies")}</div>
            : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>{t("pp_col_position")}</th>
                  <th style={{ ...th, textAlign: "center" }}>{t("pp_tab_candidates")}</th>
                  <th style={{ ...th, textAlign: "right" }}>{t("pp_col_status")}</th>
                </tr></thead>
                <tbody>
                  {(vacancies || []).map(v => (
                    <tr key={v.id} onClick={() => { setSelVac(v); setVacTab("info"); }} style={{ cursor: "pointer" }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{vTitle(v, lang)}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>{[v.company, v.country].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={{ display: "inline-block", minWidth: 26, fontSize: 12, fontWeight: 800, color: T.accent, background: T.accent + "15", borderRadius: 12, padding: "3px 10px" }}>{vacCandCounts[v.id] || 0}</span>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}><ActiveBadge status={v.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Panel>
      </>}

      {/* ── CANDIDATES ── */}
      {!selVac && tab === "candidates" && <>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={q} onChange={e => setF(setQ)(e.target.value)} placeholder={t("pp_search")} style={{ ...inp(T), maxWidth: 240 }} />
          <select value={statusFilter} onChange={e => setF(setStatusFilter)(e.target.value)} style={{ ...inp(T), maxWidth: 200 }}>
            <option value="all">{t("pp_all_statuses")}</option>
            {usedStatuses.map(k => <option key={k} value={k}>{CMAP[k]?.label || k}</option>)}
          </select>
          <select value={vacFilter} onChange={e => setF(setVacFilter)(e.target.value)} style={{ ...inp(T), maxWidth: 220 }}>
            <option value="all">{t("pp_all_vacancies")}</option>
            {(vacancies || []).map(v => <option key={v.id} value={String(v.id)}>{vTitle(v, lang)}</option>)}
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, color: T.muted, alignSelf: "center" }}>{filteredRows.length} {t("pp_rows")}</div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "auto", boxShadow: T.shadow }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead><tr>
              <th style={th}>{t("pp_col_name")}</th>
              <th style={th}>{t("pp_col_phone")}</th>
              <th style={th}>{t("pp_col_country")}</th>
              <th style={th}>{t("pp_col_company")}</th>
              <th style={th}>{t("pp_col_position")}</th>
              <th style={th}>{t("pp_col_pay")}</th>
              <th style={th}>{t("pp_col_status")}</th>
              <th style={th}>{t("pp_col_date")}</th>
            </tr></thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={r.key} onClick={() => r.cand && setSelCand(r)}
                  style={{ cursor: r.cand ? "pointer" : "default", background: i % 2 ? T.card2 : "transparent" }}>
                  <td style={{ ...td, fontWeight: 700 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: avColor(r.name) + "22", color: avColor(r.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{initials(r.name)}</span>
                      {r.name}
                    </div>
                  </td>
                  <td style={td}>{r.phone || "–"}</td>
                  <td style={td}>{r.country || "–"}</td>
                  <td style={td}>{r.company || "–"}</td>
                  <td style={td}>{r.position || "–"}</td>
                  <td style={td}>{r.pay ? <span style={{ fontWeight: 700, color: "#16a34a" }}>{r.pay}</span> : "–"}</td>
                  <td style={td}><StatusBadge k={r.candStatus} fallback={r.leadStatus} /></td>
                  <td style={{ ...td, color: T.muted }}>{r.date || "–"}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: T.muted, padding: 30 }}>{t("pp_no_candidates")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: page === 0 ? T.muted : T.text, cursor: page === 0 ? "default" : "pointer", fontSize: 12 }}>«</button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${i === page ? T.accent : T.border}`, background: i === page ? T.accent : T.card, color: i === page ? "#fff" : T.text, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>{i + 1}</button>
            ))}
            <button disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: page >= pageCount - 1 ? T.muted : T.text, cursor: page >= pageCount - 1 ? "default" : "pointer", fontSize: 12 }}>»</button>
          </div>
        )}
      </>}

      {/* ── JOB ADS ── */}
      {!selVac && tab === "jobs" && (
        (vacancies || []).length === 0
          ? <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 50, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14 }}>{t("pp_no_vacancies")}</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14 }}>
              {(vacancies || []).map(v => {
                const filled = v.hiredCount || 0;
                const total = Number(v.positions) || 0;
                const pct = total ? Math.min(100, Math.round((filled / total) * 100)) : 0;
                return (
                  <div key={v.id} onClick={() => { setSelVac(v); setVacTab("info"); }}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.shadow, padding: 16, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: T.card2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {v.logo
                          ? <img src={v.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; e.target.parentNode.textContent = "💼"; }} />
                          : <span style={{ fontSize: 18 }}>💼</span>}
                      </div>
                      <ActiveBadge status={v.status} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{vTitle(v, lang)}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{[v.company, v.country].filter(Boolean).join(" · ")}</div>
                    </div>
                    {v.salary && <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 800, color: "#16a34a", background: "#16a34a15", border: "1px solid #16a34a40", borderRadius: 8, padding: "3px 10px" }}>💶 {v.salary}</span>}
                    {v.description && <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{vDesc(v, lang)}</div>}
                    {v.requirements && (
                      <div style={{ background: T.card2, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{t("pp_requirements")}</div>
                        <div style={{ fontSize: 10, color: T.text, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.requirements}</div>
                      </div>
                    )}
                    <div style={{ marginTop: "auto" }}>
                      {total > 0 && <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted, marginBottom: 4 }}>
                          <span>👥 {t("pp_positions")}</span><span style={{ fontWeight: 700, color: T.text }}>{filled}/{total}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: T.card2, overflow: "hidden" }}>
                          <div style={{ width: pct + "%", height: "100%", background: pct >= 100 ? "#16a34a" : T.accent, transition: "width .3s" }} />
                        </div>
                      </>}
                      {v.postedDate && <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>📅 {fmtDate(v.postedDate)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {/* Add candidate modal */}
      {addForm && (
        <Modal onClose={() => !submitting && setAddForm(null)} width={460}>
          <div style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 900, color: T.text }}>➕ {t("pp_add_candidate")}</h3>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 14 }}>
              {(vacById[addForm.vacancyId] && vTitle(vacById[addForm.vacancyId], lang)) || ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lab(T)}>{t("pp_col_name")} *</label>
                <input value={addForm.name} onChange={e => af("name", e.target.value)} style={inp(T)} placeholder="Ism Familiya" />
              </div>
              <div>
                <label style={lab(T)}>{t("pp_col_phone")} *</label>
                <input value={addForm.phone} onChange={e => af("phone", e.target.value)} style={inp(T)} placeholder="+998 90 123 45 67" />
              </div>
              <div>
                <label style={lab(T)}>{t("pp_col_country")}</label>
                <input value={addForm.country} onChange={e => af("country", e.target.value)} style={inp(T)} />
              </div>
              <div>
                <label style={lab(T)}>{t("pp_field_dob")}</label>
                <input type="date" value={addForm.dob} onChange={e => af("dob", e.target.value)} style={inp(T)} />
              </div>
              <div>
                <label style={lab(T)}>{t("pp_field_passport")}</label>
                <input value={addForm.passport} onChange={e => af("passport", e.target.value)} style={inp(T)} placeholder="AA1234567" />
              </div>
              <div>
                <label style={lab(T)}>{t("cprof_gender") || "Jins"}</label>
                <select value={addForm.gender} onChange={e => af("gender", e.target.value)} style={inp(T)}>
                  <option value="">–</option>
                  <option value="Erkak">{t("cprof_gender_male")}</option>
                  <option value="Ayol">{t("cprof_gender_female")}</option>
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lab(T)}>{t("pp_field_comment")}</label>
                <textarea value={addForm.comment} onChange={e => af("comment", e.target.value)} rows={3} style={{ ...inp(T), resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button disabled={submitting} onClick={() => setAddForm(null)}
                style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {t("cprof_cancel")}
              </button>
              <button disabled={submitting} onClick={submitCandidate}
                style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 800, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "⏳..." : t("pp_submit")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selCand && (
        <CandidateProfile
          candidate={selCand.cand}
          vacancy={selCand.vacancy}
          lead={selCand.lead}
          onClose={() => setSelCand(null)}
          T={T} t={t}
          editable={false}
        />
      )}
    </div>
  );
}

export { PartnerPortal };
