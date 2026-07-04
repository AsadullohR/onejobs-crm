import { useState, useEffect } from "react";
import { InstallPrompt } from "./InstallPrompt.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Stages grouped into phases for the progress bar ──────────────────────────
const PHASES = [
  {
    key: "boshlangich", label: "Boshlang'ich", emoji: "📋",
    statuses: ["Yangi", "Qilindi", "Boglanildi"],
  },
  {
    key: "suhbat", label: "Suhbat", emoji: "🎙️",
    statuses: ["Onlayn Suhbat Uchun", "Onlayn Suhbat", "Suhbat"],
  },
  {
    key: "shartnoma", label: "Shartnoma", emoji: "📝",
    statuses: ["Shartnoma qildi", "XBA To'lov qildi", "CV Topshirildi",
               "Interview ga qo'yildi", "Ishga qabul qilindi", "1 - Qism To'landi"],
  },
  {
    key: "hujjatlar", label: "Hujjatlar", emoji: "📂",
    statuses: ["Hujjatlar Tayyorlanmoqda", "Hujjatlar Jonatilishga Tayyor",
               "Hujjatlar Jonatildi", "Ish shartnomasi keldi", "Ish shartnomasi imzolandi",
               "Taklifnoma keldi", "Elchixonaga Hujjatlar Tayyor"],
  },
  {
    key: "viza", label: "Viza", emoji: "🛂",
    statuses: ["Vizaga Topshirildi", "Viza Oldi"],
  },
  {
    key: "done", label: "Jo'nab ketdi", emoji: "✈️",
    statuses: ["Jo'nab ketdi"],
  },
];

const LOST_STATUSES = ["Viza Rad Etildi", "Rad etildi", "Bekor qildi", "Anchagacha ko'tarmadi"];

const NEXT_STEPS = {
  "Yangi":                          "Arizangiz qabul qilindi. Mutaxassisimiz tez orada siz bilan bog'lanadi.",
  "Qilindi":                        "Arizangiz ko'rib chiqilmoqda. Mutaxassisimiz siz bilan bog'lanadi.",
  "Boglanildi":                     "Mutaxassisimiz siz bilan bog'landi. Keyingi qadamlar haqida ma'lumot beriladi.",
  "Onlayn Suhbat Uchun":            "Online suhbatga tayyorlanishingizni so'raymiz. Sana va vaqt haqida xabar beramiz.",
  "Onlayn Suhbat":                  "Online suhbat o'tkazilmoqda. Natijalar haqida tez orada ma'lumot beramiz.",
  "Suhbat":                         "Ofis suhbatiga tayyorlanishingizni so'raymiz. Hujjatlarni tayyor tutib keling.",
  "Shartnoma qildi":                "Shartnoma imzolandi! Hujjatlarni to'plash bosqichi boshlanmoqda.",
  "XBA To'lov qildi":               "To'lov qabul qilindi. Hujjatlar tayyorlash bosqichi boshlandi.",
  "CV Topshirildi":                 "CV ish beruvchiga topshirildi. Natija kutilmoqda.",
  "Interview ga qo'yildi":          "Ish beruvchi bilan suhbatga qo'yildingiz. Sanani kuting.",
  "Ishga qabul qilindi":            "Tabriklaymiz! Ish beruvchi sizi qabul qildi. Hujjatlar tayyorlanmoqda.",
  "1 - Qism To'landi":              "1-qism to'lovi qabul qilindi. Hujjatlar tayyorlanmoqda.",
  "Hujjatlar Tayyorlanmoqda":       "Hujjatlaringiz tayyorlanmoqda. Tayyor bo'lgach xabar beramiz.",
  "Hujjatlar Jonatilishga Tayyor":  "Hujjatlaringiz tayyor! Yuborishga tayyorlanmoqda.",
  "Hujjatlar Jonatildi":            "Hujjatlaringiz yuborildi. Elchixona jarayoni boshlanmoqda.",
  "Ish shartnomasi keldi":          "Ish shartnomasi keldi! Imzolash uchun ofisga tashrif buyuring.",
  "Ish shartnomasi imzolandi":      "Ish shartnomasi imzolandi. Taklifnoma kutilmoqda.",
  "Taklifnoma keldi":               "Taklifnoma keldi! Elchixonaga hujjatlar tayyorlanmoqda.",
  "Elchixonaga Hujjatlar Tayyor":   "Hujjatlar elchixonaga topshirishga tayyor. Randevu kuting.",
  "Vizaga Topshirildi":             "Hujjatlaringiz vizaga topshirildi. Ko'rib chiqish 2-4 hafta davom etishi mumkin.",
  "Viza Oldi":                      "Tabriklaymiz! Viza olindi. Jo'nash sanangiz haqida xabar beramiz. ✅",
  "Jo'nab ketdi":                   "Tabriklaymiz! Siz muvaffaqiyatli jo'nab ketdingiz. Omad! ✈️",
  "Viza Rad Etildi":                "Afsuski, vizangiz rad etildi. Mutaxassisimiz siz bilan bog'lanadi.",
  "Rad etildi":                     "Jarayon bekor qilindi. Batafsil ma'lumot uchun mutaxassisimiz bilan bog'laning.",
  "Bekor qildi":                    "Ariza bekor qilindi. Savollaringiz bo'lsa, mutaxassisimiz bilan bog'laning.",
  "Anchagacha ko'tarmadi":          "Siz bilan bog'lanishda muammo bo'ldi. Iltimos, +998 90 123 45 67 raqamiga qo'ng'iroq qiling.",
  "Keyinchalik":                    "Arizangiz keyinroq ko'rib chiqiladi. Mutaxassisimiz siz bilan bog'lanadi.",
};

const STATUS_COLORS = {
  done:    { bg: "#dcfce7", border: "#16a34a", text: "#15803d" },
  lost:    { bg: "#fee2e2", border: "#dc2626", text: "#dc2626" },
  active:  { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
};

function getPhaseIndex(status) {
  for (let i = 0; i < PHASES.length; i++) {
    if (PHASES[i].statuses.includes(status)) return i;
  }
  return -1;
}

// Flat ordered list of every pipeline status, for the full timeline view
const ALL_STATUSES = PHASES.flatMap(ph =>
  ph.statuses.map(s => ({ status: s, phase: ph }))
);
const statusIndex = status => ALL_STATUSES.findIndex(x => x.status === status);

export function TrackPage({ leadId: initialId }) {
  const [id, setId] = useState(initialId || "");
  const [input, setInput] = useState(initialId || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (initialId) fetchStatus(initialId);
  }, [initialId]);

  const fetchStatus = async (trackId) => {
    const clean = trackId.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`${API}/api/track/${encodeURIComponent(clean)}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error || "Topilmadi");
        setLoading(false);
        return;
      }
      const d = await res.json();
      setData(d);
      setId(clean);
      // Update URL without reload
      const url = new URL(window.location.href);
      url.searchParams.set("track", clean);
      window.history.replaceState({}, "", url.toString());
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const trackingUrl = `${window.location.origin}${window.location.pathname}?track=${id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(trackingUrl)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isLost   = data && LOST_STATUSES.includes(data.status);
  const isDone   = data && (data.status === "Jo'nab ketdi" || data.status === "Viza Oldi");
  const phaseIdx = data ? getPhaseIndex(data.status) : -1;
  const statusStyle = isDone ? STATUS_COLORS.done : isLost ? STATUS_COLORS.lost : STATUS_COLORS.active;

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "24px 16px", fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      {/* Header with logo */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          width: 88, height: 88, margin: "0 auto 12px", borderRadius: 22,
          background: "#fff", boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        }}>
          <img
            src="/logo.png" alt="OneJobs"
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
          <div style={{
            display: "none", width: "100%", height: "100%",
            background: "linear-gradient(135deg,#38b6ff,#0066d8)",
            alignItems: "center", justifyContent: "center",
            fontSize: 34, fontWeight: 900, color: "#fff",
          }}>OJ</div>
        </div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: "0.02em" }}>OneJobs</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: "4px 0 0" }}>
          Ariza holati tekshirish
        </p>
      </div>

      {/* Search box */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: 24, width: "100%",
        maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", marginBottom: 20,
      }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>
          Mijoz ID raqamingizni kiriting
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchStatus(input)}
            placeholder="NO-10100"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1.5px solid #e5e7eb", fontSize: 15, fontWeight: 600,
              outline: "none", letterSpacing: "0.05em",
            }}
          />
          <button
            onClick={() => fetchStatus(input)}
            disabled={loading}
            style={{
              padding: "10px 20px", borderRadius: 10, background: "#6366f1",
              color: "#fff", fontWeight: 700, fontSize: 14, border: "none",
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." : "Tekshirish"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#fee2e2", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
            ⚠️ {error} — ID raqamingizni tekshirib, qayta urinib ko'ring.
          </div>
        )}
      </div>

      {/* Result card */}
      {data && (
        <div style={{
          background: "#fff", borderRadius: 16, padding: 24, width: "100%",
          maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}>
          {/* Identity */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {data.id}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#111827", marginTop: 2 }}>{data.name}</div>
              {(data.country || data.position) && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, display: "flex", gap: 10 }}>
                  {data.country && <span>🌍 {data.country}</span>}
                  {data.position && <span>💼 {data.position}</span>}
                </div>
              )}
            </div>
            <div style={{
              padding: "6px 14px", borderRadius: 20,
              background: statusStyle.bg, border: `1.5px solid ${statusStyle.border}`,
              color: statusStyle.text, fontSize: 12, fontWeight: 700, textAlign: "center",
              maxWidth: 160, lineHeight: 1.3,
            }}>
              {data.status}
            </div>
          </div>

          {/* Phase progress bar */}
          {!isLost && phaseIdx >= 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
                {PHASES.map((ph, i) => {
                  const done = i < phaseIdx;
                  const current = i === phaseIdx;
                  return (
                    <div key={ph.key} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{
                        height: 6, borderRadius: 3,
                        background: done ? "#6366f1" : current ? "#818cf8" : "#e5e7eb",
                        marginBottom: 4, transition: "background 0.3s",
                        boxShadow: current ? "0 0 0 2px #c7d2fe" : "none",
                      }}/>
                      <div style={{ fontSize: 9, color: current ? "#6366f1" : done ? "#6b7280" : "#d1d5db", fontWeight: current ? 700 : 400 }}>
                        {ph.emoji}
                      </div>
                      {current && (
                        <div style={{ fontSize: 8, color: "#6366f1", fontWeight: 700, marginTop: 2, lineHeight: 1.2 }}>
                          {ph.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full status timeline — every step, grouped by phase */}
          {!isLost && (() => {
            const curIdx = statusIndex(data.status);
            return (
              <div style={{ marginBottom: 20, border: "1px solid #f3f4f6", borderRadius: 12, padding: "14px 16px", maxHeight: 340, overflowY: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Barcha bosqichlar
                </div>
                {PHASES.map(ph => (
                  <div key={ph.key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#6366f1", marginBottom: 6 }}>
                      {ph.emoji} {ph.label}
                    </div>
                    {ph.statuses.map(s => {
                      const i = statusIndex(s);
                      const done = curIdx >= 0 && i < curIdx;
                      const current = i === curIdx;
                      return (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0 5px 8px" }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 800,
                            background: current ? "#6366f1" : done ? "#dcfce7" : "#f3f4f6",
                            color: current ? "#fff" : done ? "#16a34a" : "#d1d5db",
                            border: current ? "2px solid #c7d2fe" : "none",
                          }}>
                            {done ? "✓" : current ? "●" : ""}
                          </div>
                          <span style={{
                            fontSize: 12,
                            fontWeight: current ? 800 : done ? 600 : 400,
                            color: current ? "#4f46e5" : done ? "#374151" : "#9ca3af",
                          }}>
                            {s}
                          </span>
                          {current && (
                            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: "#6366f1", background: "#eef2ff", borderRadius: 8, padding: "2px 8px", whiteSpace: "nowrap" }}>
                              HOZIRGI BOSQICH
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Next steps message */}
          <div style={{
            background: isDone ? "#f0fdf4" : isLost ? "#fef2f2" : "#f0f9ff",
            border: `1px solid ${isDone ? "#bbf7d0" : isLost ? "#fecaca" : "#bae6fd"}`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
              {isDone ? "🎉 Natija" : isLost ? "ℹ️ Ma'lumot" : "📌 Keyingi qadam"}
            </div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
              {NEXT_STEPS[data.status] || "Mutaxassisimiz siz bilan tez orada bog'lanadi."}
            </div>
          </div>

          {/* Share section */}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Havolani ulashing
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyLink} style={{
                flex: 1, padding: "9px 12px", borderRadius: 9,
                background: copied ? "#f0fdf4" : "#f3f4f6",
                border: `1.5px solid ${copied ? "#86efac" : "#e5e7eb"}`,
                color: copied ? "#16a34a" : "#374151",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {copied ? "✅ Nusxalandi!" : "🔗 Havolani nusxalash"}
              </button>
              <button onClick={() => setShowQR(p => !p)} style={{
                padding: "9px 14px", borderRadius: 9,
                background: showQR ? "#eef2ff" : "#f3f4f6",
                border: `1.5px solid ${showQR ? "#a5b4fc" : "#e5e7eb"}`,
                color: showQR ? "#6366f1" : "#374151",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                📱 QR
              </button>
            </div>

            {showQR && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <img src={qrUrl} alt="QR code" style={{ borderRadius: 10, border: "1px solid #e5e7eb" }}/>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  QR kodni skanerlang yoki havolani ulashing
                </div>
                <div style={{
                  fontSize: 10, color: "#6b7280", marginTop: 4, wordBreak: "break-all",
                  background: "#f9fafb", borderRadius: 6, padding: "6px 10px",
                }}>
                  {trackingUrl}
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div style={{ marginTop: 16, fontSize: 11, color: "#d1d5db", textAlign: "center" }}>
            Savollar uchun: <strong style={{ color: "#6b7280" }}>+998 90 123 45 67</strong>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <InstallPrompt />
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 24 }}>
        OneJobs CRM © 2026
      </div>
    </div>
  );
}
