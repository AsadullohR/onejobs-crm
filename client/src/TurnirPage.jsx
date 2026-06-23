import { useState, useEffect, useCallback } from "react";
import { useT } from "./theme.js";
import { statsAPI } from "./api.js";
import { inp } from "./helpers.jsx";

const MEDALS = ["🥇", "🥈", "🥉"];

function getRange(preset) {
  const now = new Date();
  const pad = s => String(s).padStart(2, "0");
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (preset === "today") {
    const s = fmt(now);
    return { from: s + "T00:00:00", to: s + "T23:59:59" };
  }
  if (preset === "week") {
    const day = now.getDay() || 7;
    const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: fmt(mon) + "T00:00:00", to: fmt(sun) + "T23:59:59" };
  }
  if (preset === "month") {
    const s = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
    const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
    return { from: s + "T00:00:00", to: fmt(last) + "T23:59:59" };
  }
  return null;
}

const COLS = [
  { key: "qilindi",      label: "📞 Qilindi",      color: "#8b5cf6" },
  { key: "boglanildi",   label: "🔗 Bog'landi",    color: "#f59e0b" },
  { key: "onlayn_suhbat",label: "💻 Onlayn Suhbat",color: "#0ea5e9" },
  { key: "suhbat",       label: "🤝 Suhbat",       color: "#10b981" },
  { key: "shartnoma",    label: "📄 Shartnoma",    color: "#22c55e" },
  { key: "xba_tolov",   label: "💰 XBA To'lov",   color: "#f97316" },
  { key: "jonab_ketdi", label: "✈️ Jo'nab ketdi", color: "#166534" },
];

export function TurnirPage({ user }) {
  const T = useT();
  const inpS = inp(T);
  const [preset, setPreset] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sortCol, setSortCol] = useState("qilindi");

  const load = useCallback(async () => {
    let from, to;
    if (preset === "custom") {
      if (!customFrom || !customTo) return;
      from = customFrom + "T00:00:00";
      to = customTo + "T23:59:59";
    } else {
      const r = getRange(preset);
      from = r.from; to = r.to;
    }
    setLoading(true);
    try {
      const rows = await statsAPI.employees(from, to);
      setData(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...data].sort((a, b) => Number(b[sortCol] || 0) - Number(a[sortCol] || 0));
  const myRank = sorted.findIndex(r => String(r.id) === String(user?.id));

  const periodLabel = (() => {
    if (preset === "today") return "Bugun";
    if (preset === "week") return "Bu hafta";
    if (preset === "month") return "Bu oy";
    if (customFrom && customTo) return `${customFrom} – ${customTo}`;
    return "";
  })();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 4px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>🏆 Turnir & Reyting</div>
          <div style={{ fontSize: 12, color: T.muted }}>Sotuvchilar reytingi va raqobat</div>
        </div>
        {myRank >= 0 && (
          <div style={{ marginLeft: "auto", background: `${T.accent}18`, border: `1px solid ${T.accent}44`, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: T.muted }}>Sizning o'rningiz</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: T.accent }}>
              {myRank < 3 ? MEDALS[myRank] : `#${myRank + 1}`}
            </div>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {[["today","Bugun"],["week","Bu hafta"],["month","Bu oy"],["custom","Maxsus"]].map(([v,l]) => (
          <button key={v} onClick={() => setPreset(v)} style={{
            padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: preset === v ? T.accent : T.card2,
            color: preset === v ? "#fff" : T.text,
            border: `1px solid ${preset === v ? T.accent : T.border}`,
          }}>{l}</button>
        ))}
        {preset === "custom" && <>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...inpS, width: 140, fontSize: 12 }} />
          <span style={{ color: T.muted }}>–</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ ...inpS, width: 140, fontSize: 12 }} />
          <button onClick={load} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", background: T.accent, color: "#fff", border: "none" }}>Ko'rish</button>
        </>}
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.muted }}>{periodLabel}</span>
      </div>

      {/* Sort tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {COLS.map(c => (
          <button key={c.key} onClick={() => setSortCol(c.key)} style={{
            padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: sortCol === c.key ? 700 : 400,
            background: sortCol === c.key ? c.color + "22" : "transparent",
            color: sortCol === c.key ? c.color : T.muted,
            border: `1px solid ${sortCol === c.key ? c.color + "66" : T.border}`,
          }}>{c.label}</button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Yuklanmoqda...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: T.muted }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <div>Bu davrda ma'lumot yo'q</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Leads statusini o'zgartirganingizda statistika to'planadi</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((row, i) => {
            const isMe = String(row.id) === String(user?.id);
            const score = Number(row[sortCol] || 0);
            const maxScore = Number(sorted[0]?.[sortCol] || 1);
            const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
            return (
              <div key={row.id}
                onClick={() => setSelected(selected === row.id ? null : row.id)}
                style={{
                  background: isMe ? `${T.accent}12` : T.card,
                  border: `1px solid ${isMe ? T.accent + "44" : selected === row.id ? T.accent + "44" : T.border}`,
                  borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: selected === row.id ? T.shadow : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Rank */}
                  <div style={{ width: 36, textAlign: "center", fontSize: i < 3 ? 22 : 14, fontWeight: 700, color: i < 3 ? undefined : T.muted, flexShrink: 0 }}>
                    {i < 3 ? MEDALS[i] : `#${i+1}`}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: row.color || T.accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#fff",
                  }}>
                    {(row.name || "?")[0].toUpperCase()}
                  </div>

                  {/* Name + progress */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{row.name}</span>
                      {isMe && <span style={{ fontSize: 9, background: T.accent, color: "#fff", borderRadius: 4, padding: "1px 5px" }}>SIZ</span>}
                      <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: COLS.find(c=>c.key===sortCol)?.color || T.accent }}>
                        {score}
                      </span>
                    </div>
                    <div style={{ height: 5, background: T.card2, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: COLS.find(c=>c.key===sortCol)?.color || T.accent, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>
                </div>

                {/* Expanded stats */}
                {selected === row.id && (
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                    {COLS.map(c => (
                      <div key={c.key} style={{ background: T.card2, borderRadius: 7, padding: "8px 10px", textAlign: "center", border: `1px solid ${c.key === sortCol ? c.color + "44" : T.border}` }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{Number(row[c.key] || 0)}</div>
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
