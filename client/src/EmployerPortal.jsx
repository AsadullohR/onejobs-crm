import { useState, useEffect } from "react";
import { useT } from "./theme.js";
import { fmtMs, I } from "./helpers.jsx";
import { vacanciesAPI, candidatesAPI } from "./api.js";

const CAND_STATUS = {
  submitted: { label: "Yuborildi",   c: "#2563eb" },
  approved:  { label: "Tasdiqlandi", c: "#16a34a" },
  rejected:  { label: "Rad etildi",  c: "#dc2626" },
  interview: { label: "Intervyu",    c: "#d97706" },
  hired:     { label: "Yollandi",    c: "#9333ea" },
};

function EmployerPortal({ user, leads, team }) {
  const T = useT();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selVac, setSelVac] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);

  useEffect(() => {
    vacanciesAPI.getAll()
      .then(all => {
        const mine = (all || []).filter(v =>
          v.company && (
            v.company.toLowerCase() === user.name.toLowerCase() ||
            v.company.toLowerCase() === user.username?.toLowerCase()
          )
        );
        setVacancies(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.name, user.username]);

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
      const saved = await candidatesAPI.update(candId, { status });
      setCandidates(p => p.map(c => c.id === candId ? { ...c, status } : c));
    } catch (e) { alert("Xatolik: " + e.message); }
  };

  const totalPositions = vacancies.reduce((s, v) => s + (v.positions || 1), 0);
  const totalCands = vacancies.reduce((s, v) => s + (v.candidateCount || 0), 0);
  const totalHired = vacancies.reduce((s, v) => s + (v.hiredCount || 0), 0);

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: "0 0 4px" }}>
          Xush kelibsiz, {user.name}! 👋
        </h1>
        <p style={{ color: T.muted, margin: 0, fontSize: 11 }}>
          Sizning vakansiyalaringiz va nomzodlaringiz
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          ["💼", "VAKANSIYALAR", vacancies.length + " ta", T.accent],
          ["👷", "O'RINLAR", totalPositions + " ta", T.text],
          ["👥", "NOMZODLAR", totalCands + " ta", T.blue || T.accent],
          ["✅", "YOLLANGAN", totalHired + " ta", T.green],
        ].map(([ic, lb, val, c]) => (
          <div key={lb} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{ic} {lb}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ color: T.muted, textAlign: "center", padding: 40, fontSize: 12 }}>Yuklanmoqda...</div>
      )}

      {!loading && vacancies.length === 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>💼</div>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 4 }}>Hali vakansiya yo'q</div>
          <div style={{ fontSize: 11, color: T.muted }}>Administrator kompaniyangiz nomida vakansiya qo'shganda bu yerda ko'rinadi</div>
        </div>
      )}

      {!loading && vacancies.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: selVac ? "340px 1fr" : "1fr", gap: 14 }}>
          {/* Vacancy cards */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>Vakansiyalar</div>
            {vacancies.map(v => {
              const hired = v.hiredCount || 0;
              const total = v.positions || 1;
              const cands = v.candidateCount || 0;
              const isSelected = selVac?.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelVac(isSelected ? null : v)}
                  style={{
                    background: isSelected ? `${T.accent}12` : T.card,
                    border: `1px solid ${isSelected ? T.accent : T.border}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    marginBottom: 8,
                    cursor: "pointer",
                    borderLeft: `3px solid ${isSelected ? T.accent : T.border}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>
                    {v.title || "–"}
                  </div>
                  <div style={{ fontSize: 9, color: T.muted, marginBottom: 7 }}>
                    {v.country || ""}{v.jobType ? " · " + v.jobType : ""}
                    {v.salary ? ` · €${v.salary}/oy` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 9 }}>
                    <span style={{ color: T.muted }}>👥 {cands} nomzod</span>
                    <span style={{ color: T.green }}>✅ {hired}/{total} yollandi</span>
                    <span style={{
                      background: v.status === "active" ? `${T.green}22` : `${T.muted}22`,
                      color: v.status === "active" ? T.green : T.muted,
                      borderRadius: 10, padding: "1px 7px", fontWeight: 700,
                    }}>
                      {v.status === "active" ? "Faol" : v.status === "filled" ? "To'ldi" : v.status}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: 8, height: 3, borderRadius: 3, background: T.border, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, total > 0 ? (hired / total) * 100 : 0)}%`, background: hired >= total ? T.green : T.accent, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Candidate panel */}
          {selVac && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, height: "fit-content" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>{selVac.title}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>Nomzodlar ro'yxati</div>
                </div>
                <button onClick={() => setSelVac(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18 }}>✕</button>
              </div>

              {candLoading && <div style={{ color: T.muted, textAlign: "center", padding: 20, fontSize: 11 }}>Yuklanmoqda...</div>}

              {!candLoading && candidates.length === 0 && (
                <div style={{ color: T.muted, textAlign: "center", padding: 30, fontSize: 12 }}>Hali nomzod yo'q</div>
              )}

              {!candLoading && candidates.length > 0 && (
                <div>
                  {candidates.map(c => {
                    const cs = CAND_STATUS[c.status] || CAND_STATUS.submitted;
                    return (
                      <div key={c.id} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 1 }}>{c.leadName || "–"}</div>
                          <div style={{ fontSize: 9, color: T.muted }}>Yuborgan: {c.addedByName || "–"} · {c.addedAt?.slice(0, 10) || ""}</div>
                          {c.note && <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{c.note}</div>}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <select
                            value={c.status}
                            onChange={e => updateStatus(c.id, e.target.value)}
                            style={{
                              fontSize: 10, fontWeight: 700, color: cs.c,
                              background: `${cs.c}18`, border: `1px solid ${cs.c}44`,
                              borderRadius: 6, padding: "4px 8px", cursor: "pointer", outline: "none",
                            }}
                          >
                            {Object.entries(CAND_STATUS).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { EmployerPortal };
