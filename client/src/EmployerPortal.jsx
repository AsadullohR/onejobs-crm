import { useState, useEffect } from "react";
import { useT } from "./theme.js";
import { useLang } from "./i18n.jsx";
import { fmtMs, inp, lab, I } from "./helpers.jsx";
import { vacanciesAPI, candidatesAPI, employerAPI } from "./api.js";

// ─── CANDIDATE STATUS MAP ─────────────────────────────────────────────────────
const CAND_STATUS_KEYS = ["added","interview","approved_final","rejected_final","reserve","rejected_recruiter","approved_client","docs_prep","filed_migration","permit_received","scheduled_visa","visa_docs_sent","submitted_embassy","visa_received"];

function candStatusMap(t) {
  return {
    added:              { label: t("cand_added"),              c: "#3b82f6" },
    interview:          { label: t("cand_interview"),          c: "#d97706" },
    approved_final:     { label: t("cand_approved_final"),     c: "#16a34a" },
    rejected_final:     { label: t("cand_rejected_final"),     c: "#dc2626" },
    reserve:            { label: t("cand_reserve"),            c: "#6b7280" },
    rejected_recruiter: { label: t("cand_rejected_recruiter"), c: "#ea580c" },
    approved_client:    { label: t("cand_approved_client"),    c: "#9333ea" },
    docs_prep:          { label: t("cand_docs_prep"),          c: "#0891b2" },
    filed_migration:    { label: t("cand_filed_migration"),    c: "#7c3aed" },
    permit_received:    { label: t("cand_permit_received"),    c: "#059669" },
    scheduled_visa:     { label: t("cand_scheduled_visa"),     c: "#b45309" },
    visa_docs_sent:     { label: t("cand_visa_docs_sent"),     c: "#0369a1" },
    submitted_embassy:  { label: t("cand_submitted_embassy"),  c: "#1d4ed8" },
    visa_received:      { label: t("cand_visa_received"),      c: "#15803d" },
    submitted:          { label: t("cand_added"),              c: "#3b82f6" },
    applied:            { label: t("cand_added"),              c: "#3b82f6" },
  };
}

// Old/legacy DB status values (pre-dating the current pipeline enum) collapsed
// onto their closest current key, so filters and badges bucket them correctly
// instead of silently falling outside every filter option.
const LEGACY_STATUS_ALIAS = {
  applied: "added", submitted: "added",
  screening: "interview",
  offer: "approved_final",
  hired: "approved_client",
  rejected: "rejected_final",
};
const normCandStatus = s => LEGACY_STATUS_ALIAS[s] || s;

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

// ─── CANDIDATE FULL PROFILE ───────────────────────────────────────────────────
function CandidateProfile({ candidate, vacancy, lead, onClose, T, t }) {
  const CMAP = candStatusMap(t);
  const cs = CMAP[normCandStatus(candidate.status)] || CMAP.added;
  const cv = lead?.cv || {};
  const docs = lead?.docs || {};

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.text, borderBottom: `2px solid ${T.accent}`, paddingBottom: 6, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>
      {children}
    </div>
  );
  const Field = ({ label, value, span = false }) => (
    <div style={{ gridColumn: span ? "1/-1" : undefined }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, color: T.text, padding: "7px 10px", background: T.card2, borderRadius: 6, border: `1px solid ${T.border}`, minHeight: 32 }}>{value || "–"}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "rgba(0,0,0,0.55)", overflowY: "auto", paddingTop: 20, paddingBottom: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 780, margin: "0 14px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${T.accent}, #7c3aed)`, padding: "20px 24px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t("emp_candidate_list")} — {vacancy?.title || "–"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{lead?.name || candidate.leadName || "–"}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, background: `${cs.c}33`, color: "#fff", border: `1px solid ${cs.c}88`, borderRadius: 12, padding: "3px 10px", fontWeight: 700 }}>{cs.label}</span>
                {lead?.phone && <span style={{ fontSize: 11, opacity: 0.85 }}>📞 {lead.phone}</span>}
                {lead?.country && <span style={{ fontSize: 11, opacity: 0.85 }}>🌍 {lead.country}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, color: "#fff", width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Basic data */}
          <Section title="Asosiy ma'lumotlar">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Arizaning №" value={lead?.id || "–"} />
              <Field label="Pasport №" value={cv.passport} />
              <Field label="Tug'ilgan sana" value={cv.dob} />
              <Field label="Fuqarolik" value={lead?.country} />
              <Field label="Telefon" value={lead?.phone} />
              <Field label="Konsalting / Manba" value={lead?.source} />
              <Field label="Jinsi" value={lead?.gender === "male" ? "Erkak" : lead?.gender === "female" ? "Ayol" : lead?.gender} />
              <Field label="Lavozim / Soha" value={lead?.position || lead?.sector} />
              <Field label="Holat (Pipeline)" value={lead?.status} />
            </div>
          </Section>

          {/* Vacancy & logistics */}
          <Section title="Vakansiya va Logistika">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Vakansiya" value={vacancy?.title} />
              <Field label="Kompaniya / Mehmonxona" value={vacancy?.company} />
              <Field label="Mamlakat" value={vacancy?.country} />
              <Field label="Shahar / Kurort" value={vacancy?.city} />
              <Field label="Maosh" value={vacancy?.salary ? `€${vacancy.salary}/oy` : undefined} />
              <Field label="Ish turi" value={vacancy?.jobType} />
              <Field label="Boshlash sanasi" value={vacancy?.periodStart} />
              <Field label="Tugash sanasi" value={vacancy?.periodEnd} />
            </div>
          </Section>

          {/* Pipeline status */}
          <Section title="Pipeline holati">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Vakansiya holati" value={cs.label} />
              <Field label="Qo'shilgan sana" value={candidate.addedAt?.slice(0, 10)} />
              <Field label="Qo'shgan xodim" value={candidate.addedByName} />
            </div>
            {candidate.note && (
              <div style={{ marginTop: 10 }}>
                <Field label="Izoh" value={candidate.note} span />
              </div>
            )}
          </Section>

          {/* Education & Languages */}
          {(cv.edu || cv.languages?.length) && (
            <Section title="Ta'lim va Tillar">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Ta'lim" value={cv.edu} />
                <Field label="Tillar" value={Array.isArray(cv.languages) ? cv.languages.join(", ") : cv.languages} />
              </div>
            </Section>
          )}

          {/* Payments */}
          <Section title="To'lov holati">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "XBA To'lov", v: lead?.xba, date: lead?.xbaDate, c: "#f97316" },
                { label: "1-Qism", v: lead?.q1, date: lead?.q1Date, c: "#ec4899" },
                { label: "2-Qism", v: lead?.q2, date: lead?.q2Date, c: "#8b5cf6" },
                { label: "3-Qism", v: lead?.q3, date: lead?.q3Date, c: "#3b82f6" },
              ].map(p => (
                <div key={p.label} style={{ padding: "10px 12px", borderRadius: 8, background: p.v ? `${p.c}15` : T.card2, border: `1px solid ${p.v ? p.c + "44" : T.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 18 }}>{p.v ? "✅" : "⬜"}</div>
                  {p.date && <div style={{ fontSize: 8, color: p.c, marginTop: 3, fontWeight: 600 }}>{p.date}</div>}
                </div>
              ))}
            </div>
          </Section>

          {/* Documents */}
          {Object.keys(docs).length > 0 && (
            <Section title="Hujjatlar">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(docs).map(([k, v]) => (
                  v ? (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: `${T.green}12`, border: `1px solid ${T.green}33`, borderRadius: 8 }}>
                      <span style={{ fontSize: 10, color: T.text, fontWeight: 600 }}>📄 {k}</span>
                      <span style={{ fontSize: 10, color: T.green, fontWeight: 700 }}>✓ Yuklangan</span>
                    </div>
                  ) : null
                ))}
              </div>
            </Section>
          )}

          {/* Notes */}
          {(lead?.comment || lead?.note) && (
            <Section title="Izohlar">
              {lead.comment && <Field label="Izoh" value={lead.comment} span />}
              {lead.note && <div style={{ marginTop: 8 }}><Field label="Qaydlar" value={lead.note} span /></div>}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VACANCIES TAB ────────────────────────────────────────────────────────────
function VacanciesTab({ vacancies, loading, leads, t, T }) {
  const [selVac, setSelVac] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [selCand, setSelCand] = useState(null);
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
            const cs = CMAP[normCandStatus(c.status)] || CMAP.added;
            const lead = leads?.find(l => l.id === c.leadId);
            return (
              <div key={c.id} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.accent + "88"}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setSelCand(c)}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 1 }}>{c.leadName || "–"}</div>
                  <div style={{ fontSize: 9, color: T.muted }}>{t("emp_added_by")}: {c.addedByName || "–"} · {c.addedAt?.slice(0, 10) || ""}</div>
                  {c.note && <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{c.note}</div>}
                  {lead && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {lead.country && <span style={{ fontSize: 8, color: T.muted }}>🌍 {lead.country}</span>}
                      {lead.phone && <span style={{ fontSize: 8, color: T.muted }}>📞 {lead.phone}</span>}
                      {lead.position && <span style={{ fontSize: 8, color: T.muted }}>💼 {lead.position}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <select value={normCandStatus(c.status)} onChange={e => { e.stopPropagation(); updateStatus(c.id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 10, fontWeight: 700, color: cs.c, background: `${cs.c}18`,
                      border: `1px solid ${cs.c}44`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                    {CAND_STATUS_KEYS.map(k => (
                      <option key={k} value={k}>{(CMAP[k] || { label: k }).label}</option>
                    ))}
                  </select>
                  <button onClick={() => setSelCand(c)}
                    style={{ fontSize: 9, color: T.accent, background: `${T.accent}15`, border: `1px solid ${T.accent}44`, borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontWeight: 600 }}>
                    👁 Profil
                  </button>
                </div>
              </div>
            );
          })}
          {selCand && (
            <CandidateProfile
              candidate={selCand}
              vacancy={selVac}
              lead={leads?.find(l => l.id === selCand.leadId)}
              onClose={() => setSelCand(null)}
              T={T} t={t}
            />
          )}
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
  const [selWorker, setSelWorker] = useState(null);
  const CMAP = candStatusMap(t);

  useEffect(() => {
    employerAPI.getWorkers()
      .then(r => setWorkers(r || []))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: T.muted, textAlign: "center", padding: 40, fontSize: 12 }}>{t("loading")}</div>;

  const CAND_STATUS_KEYS_ALL = ["all","added","interview","approved_final","rejected_final","reserve","rejected_recruiter","approved_client","docs_prep","filed_migration","permit_received","scheduled_visa","visa_docs_sent","submitted_embassy","visa_received"];
  const filtered = filter === "all" ? workers : workers.filter(w => normCandStatus(w.status) === filter);

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
          const count = k === "all" ? workers.length : workers.filter(w => normCandStatus(w.status) === k).length;
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
              const cs = CMAP[normCandStatus(w.status)] || CMAP.added;
              const stageColor = STAGE_COLORS[w.leadStatus] || T.muted;
              return (
                <tr key={w.id} onClick={() => setSelWorker(w)}
                  style={{ borderBottom: `1px solid ${T.border}22`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.card2}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
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

      {selWorker && (
        <CandidateProfile
          candidate={{ ...selWorker, leadName: selWorker.name, addedAt: selWorker.appliedAt }}
          vacancy={{
            title: selWorker.vacancyTitle, company: selWorker.vacancyCompany,
            country: selWorker.vacancyCountry, salary: selWorker.vacancySalary, jobType: selWorker.vacancyJobType,
          }}
          lead={{
            id: selWorker.leadId, name: selWorker.name, phone: selWorker.phone,
            country: selWorker.leadCountry, status: selWorker.leadStatus,
            source: selWorker.leadSource, gender: selWorker.leadGender,
            position: selWorker.leadPosition, sector: selWorker.leadSector,
            cv: selWorker.leadCv, docs: selWorker.leadDocs,
            comment: selWorker.leadComment, note: selWorker.leadNote,
            xba: selWorker.leadXba, q1: selWorker.leadQ1, q2: selWorker.leadQ2, q3: selWorker.leadQ3,
            xbaDate: selWorker.leadXbaDate, q1Date: selWorker.leadQ1Date, q2Date: selWorker.leadQ2Date, q3Date: selWorker.leadQ3Date,
          }}
          onClose={() => setSelWorker(null)}
          T={T} t={t}
        />
      )}
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
      {tab === "vacancies" && <VacanciesTab vacancies={vacancies} loading={loading} leads={leads} t={t} T={T} />}
      {tab === "workers"   && <WorkersTab t={t} T={T} />}
      {tab === "request"   && <RequestTab t={t} T={T} addNotif={addNotif} />}
    </div>
  );
}

export { EmployerPortal };
