import { useState, useMemo } from "react";
import { useT } from "./theme.js";
import { useLang } from "./i18n.jsx";
import { inp } from "./helpers.jsx";
import { CandidateProfile, candStatusMap, normCandStatus, fmtDate } from "./EmployerPortal.jsx";

// ─── PARTNER PORTAL ───────────────────────────────────────────────────────────
// Nomad Cloud-style dashboard for partner accounts: overview stats,
// candidates-by-status breakdown, and a searchable candidates table.
// Read-only: partners see status of the candidates they referred.

const APPROVED_SET = new Set(["approved_final", "approved_client", "visa_received", "permit_received"]);
const PENDING_SET  = new Set(["added", "interview", "reserve"]);

function PartnerPortal({ leads, candidates, vacancies, user }) {
  const T = useT();
  const { t } = useLang();
  const CMAP = candStatusMap(t);
  const [tab, setTab] = useState("overview");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selCand, setSelCand] = useState(null);

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

  // Leads without any candidate still count as "referred" people.
  const candLeadIds = useMemo(() => new Set(myCands.map(c => c.leadId)), [myCands]);
  const leadsOnly = leads.filter(l => !candLeadIds.has(l.id));

  const totalPeople = myCands.length + leadsOnly.length;
  const approved = myCands.filter(c => APPROVED_SET.has(normCandStatus(c.status))).length;
  const pending  = myCands.filter(c => PENDING_SET.has(normCandStatus(c.status))).length + leadsOnly.length;
  const sent     = myCands.filter(c => normCandStatus(c.status) === "sent" || leadById[c.leadId]?.status === "Jo'nab ketdi").length
                 + leadsOnly.filter(l => l.status === "Jo'nab ketdi").length;
  const successRate = totalPeople ? Math.round((approved / totalPeople) * 100) : 0;

  // Status breakdown across candidates + candidate-less leads (by lead stage)
  const statusCounts = useMemo(() => {
    const m = {};
    myCands.forEach(c => {
      const k = normCandStatus(c.status);
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [myCands]);

  // Vacancy assignment counts
  const vacCounts = useMemo(() => {
    const m = {};
    myCands.forEach(c => { if (c.vacancyId) m[c.vacancyId] = (m[c.vacancyId] || 0) + 1; });
    return Object.entries(m)
      .map(([vid, n]) => ({ v: vacById[vid], n }))
      .filter(x => x.v)
      .sort((a, b) => b.n - a.n);
  }, [myCands, vacById]);

  // Table rows: every candidate + every candidate-less lead
  const rows = useMemo(() => {
    const candRows = myCands.map(c => {
      const lead = leadById[c.leadId] || {};
      return {
        key: `c-${c.id}`, cand: c, lead,
        name: lead.name || c.name || "", phone: lead.phone || c.phone || "",
        country: lead.country || "", position: lead.position || lead.sector || "",
        vacancy: vacById[c.vacancyId], leadStatus: lead.status || "",
        candStatus: normCandStatus(c.status),
        date: fmtDate(c.created_at || lead.createdAt),
      };
    });
    const leadRows = leadsOnly.map(l => ({
      key: `l-${l.id}`, cand: null, lead: l,
      name: l.name, phone: l.phone || "", country: l.country || "",
      position: l.position || l.sector || "", vacancy: null,
      leadStatus: l.status || "", candStatus: null,
      date: fmtDate(l.createdAt),
    }));
    let all = [...candRows, ...leadRows];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      all = all.filter(r => r.name.toLowerCase().includes(s) || r.phone.includes(s));
    }
    if (statusFilter !== "all") {
      all = all.filter(r => r.candStatus === statusFilter);
    }
    return all;
  }, [myCands, leadsOnly, leadById, vacById, q, statusFilter]);

  const usedStatuses = useMemo(() => [...new Set(myCands.map(c => normCandStatus(c.status)))], [myCands]);

  // ── UI helpers ──
  const Card = ({ label, value, sub, color, icon }) => (
    <div style={{ flex: "1 1 160px", minWidth: 150, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: T.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>{label}</span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || T.text }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const StatusBadge = ({ k }) => {
    const s = CMAP[k];
    if (!s) return <span style={{ color: T.muted, fontSize: 11 }}>–</span>;
    return <span style={{ fontSize: 10, fontWeight: 700, color: s.c, background: s.c + "18", border: `1px solid ${s.c}40`, borderRadius: 8, padding: "3px 8px", whiteSpace: "nowrap" }}>{s.label}</span>;
  };

  const th = { textAlign: "left", padding: "9px 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
  const td = { padding: "9px 10px", fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}` };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: T.text }}>{t("pp_title")}</h1>
        <div style={{ fontSize: 12, color: T.muted }}>{t("pp_subtitle")}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["overview", t("pp_tab_overview")], ["candidates", t("pp_tab_candidates")]].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid ${tab === k ? T.accent : T.border}`, background: tab === k ? T.accent : T.card, color: tab === k ? "#fff" : T.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "overview" && <>
        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
          <Card label={t("pp_total")}     value={totalPeople} icon="👥" color="#6366f1" />
          <Card label={t("pp_approved")}  value={approved}    icon="✅" color="#16a34a" />
          <Card label={t("pp_pending")}   value={pending}     icon="⏳" color="#d97706" />
          <Card label={t("pp_sent")}      value={sent}        icon="✈️" color="#0891b2" />
          <Card label={t("pp_success")}   value={successRate + "%"} icon="📈" color="#9333ea" sub={t("pp_success_sub")} />
        </div>

        {/* Candidates by status */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginBottom: 22, boxShadow: T.shadow }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12 }}>{t("pp_by_status")}</div>
          {statusCounts.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>{t("pp_no_candidates")}</div>}
          {statusCounts.map(([k, n]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <StatusBadge k={k} />
              <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{n}</span>
            </div>
          ))}
        </div>

        {/* Vacancy assignments */}
        {vacCounts.length > 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, boxShadow: T.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12 }}>{t("pp_by_vacancy")}</div>
            {vacCounts.map(({ v, n }) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{v.title}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{[v.company, v.country].filter(Boolean).join(" · ")}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.accent, background: T.accent + "15", borderRadius: 10, padding: "3px 12px" }}>{n}</span>
              </div>
            ))}
          </div>
        )}
      </>}

      {tab === "candidates" && <>
        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("pp_search")}
            style={{ ...inp(T), maxWidth: 260 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp(T), maxWidth: 220 }}>
            <option value="all">{t("pp_all_statuses")}</option>
            {usedStatuses.map(k => <option key={k} value={k}>{CMAP[k]?.label || k}</option>)}
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, color: T.muted, alignSelf: "center" }}>
            {rows.length} {t("pp_rows")}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "auto", boxShadow: T.shadow }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>{t("pp_col_name")}</th>
                <th style={th}>{t("pp_col_phone")}</th>
                <th style={th}>{t("pp_col_country")}</th>
                <th style={th}>{t("pp_col_position")}</th>
                <th style={th}>{t("pp_col_vacancy")}</th>
                <th style={th}>{t("pp_col_status")}</th>
                <th style={th}>{t("pp_col_date")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key}
                  onClick={() => r.cand && setSelCand(r)}
                  style={{ cursor: r.cand ? "pointer" : "default", background: i % 2 ? T.card2 : "transparent" }}>
                  <td style={{ ...td, color: T.muted }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.name}</td>
                  <td style={td}>{r.phone || "–"}</td>
                  <td style={td}>{r.country || "–"}</td>
                  <td style={td}>{r.position || "–"}</td>
                  <td style={td}>{r.vacancy?.title || "–"}</td>
                  <td style={td}>
                    {r.candStatus
                      ? <StatusBadge k={r.candStatus} />
                      : <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "3px 8px" }}>{r.leadStatus || "–"}</span>}
                  </td>
                  <td style={{ ...td, color: T.muted }}>{r.date || "–"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: T.muted, padding: 30 }}>{t("pp_no_candidates")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>}

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
