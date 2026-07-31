import { useState, useEffect, useCallback } from "react";
import { useT } from "./theme.js";
import { inp, I, Av } from "./helpers.jsx";
import { attendanceAPI, configAPI } from "./api.js";

// ─── ATTENDANCE / DAVOMAT ─────────────────────────────────────────────────────
// Arrival is recorded automatically on login; departure on explicit "Ketdim"
// or from the last heartbeat. Anti-abuse is advisory, not absolute: an account
// handed to a colleague still authenticates, so the goal is to make sharing
// visible (different network, second device, two IPs in one day) rather than
// to claim it is impossible.

const FLAG_META = {
  late:          { label: "Kechikdi",        color: "#f59e0b", tip: "Ish boshlanish vaqtidan kech kirgan" },
  off_network:   { label: "Ofis tarmog'i emas", color: "#ef4444", tip: "Kirish ofis IP manzilidan bo'lmagan" },
  multi_ip:      { label: "2+ IP",           color: "#ef4444", tip: "Bir kunda turli tarmoqlardan kirilgan — akkaunt bo'lishilgan bo'lishi mumkin" },
  multi_device:  { label: "2+ qurilma",      color: "#f97316", tip: "Bir kunda turli qurilma/brauzerdan kirilgan" },
  no_checkout:   { label: "Chiqmagan",       color: "#94a3b8", tip: "Ketish qayd etilmagan" },
};

function Attendance({ user, config, setConfig }) {
  const T = useT();
  const inpS = inp(T);
  const isBoss = ["admin", "manager"].includes(user.role);
  const isAdmin = user.role === "admin";

  const monthStart = new Date().toISOString().slice(0, 8) + "01";
  const todayStr = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayStr);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ officeIps: [], workStart: "09:00", today: todayStr });
  const [loading, setLoading] = useState(false);
  const [ipDraft, setIpDraft] = useState("");
  const [startDraft, setStartDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await attendanceAPI.list(from, to);
      setRows(r.data || []);
      setMeta({ officeIps: r.officeIps || [], workStart: r.workStart || "09:00", today: r.today });
      setIpDraft((r.officeIps || []).join(", "));
      setStartDraft(r.workStart || "09:00");
    } catch (e) { /* surfaced by the empty state */ }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const saveCfg = async () => {
    const officeIps = ipDraft.split(",").map((s) => s.trim()).filter(Boolean);
    const next = { officeIps, workStart: startDraft || "09:00" };
    try {
      await configAPI.set("attendanceCfg", next);
      setConfig && setConfig((p) => ({ ...p, attendanceCfg: next }));
      await load();
    } catch (e) { alert("Saqlanmadi: " + e.message); }
  };

  const goHome = async () => {
    if (!window.confirm("Ish kunini yakunlaysizmi? (Ketdim)")) return;
    try { await attendanceAPI.checkout(); await load(); }
    catch (e) { alert("Xatolik: " + e.message); }
  };

  // Summary across the visible range
  const totalHours = rows.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const lateCount = rows.filter((r) => r.flags.includes("late")).length;
  const suspCount = rows.filter((r) => r.flags.some((f) => ["off_network", "multi_ip", "multi_device"].includes(f))).length;
  const myToday = rows.find((r) => r.user_id === user.id && r.work_date === meta.today);

  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "4px 0 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: 0 }}>🕒 Davomat</h1>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            Kelish tizimga kirganda, ketish "Ketdim" tugmasi orqali qayd etiladi
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inpS, width: "auto", fontSize: 11, padding: "5px 9px" }} />
          <span style={{ color: T.muted, fontSize: 11 }}>—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inpS, width: "auto", fontSize: 11, padding: "5px 9px" }} />
          <button onClick={goHome}
            style={{ padding: "7px 15px", borderRadius: 8, background: myToday?.out_time ? T.card2 : T.accent, color: myToday?.out_time ? T.muted : "#fff", border: myToday?.out_time ? `1px solid ${T.border}` : "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            {myToday?.out_time ? `✔ Ketdim ${myToday.out_time}` : "🏠 Ketdim"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          ["📋", "YOZUVLAR", rows.length + " ta", T.text],
          ["⏱", "JAMI SOAT", totalHours.toFixed(1), T.text],
          ["🕘", "KECHIKISH", lateCount + " ta", lateCount ? "#f59e0b" : T.text],
          ["⚠️", "SHUBHALI", suspCount + " ta", suspCount ? T.red : T.text],
        ].map(([ic, lb, val, c]) => (
          <div key={lb} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: T.muted, letterSpacing: "0.08em" }}>{lb}</span>
              <span style={{ fontSize: 15, opacity: 0.5 }}>{ic}</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Admin: office IP + work start */}
      {isAdmin && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.text, marginBottom: 4 }}>⚙️ Sozlamalar (faqat admin)</div>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>
            Ofis IP manzillari — vergul bilan ajrating. To'ldirilsa, boshqa tarmoqdan kirish "Ofis tarmog'i emas" deb belgilanadi.
            Ofisingiz statik IP'ini bilish uchun ofis kompyuterida <b>2ip.uz</b> saytini oching.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>Ofis IP manzillari</label>
              <input value={ipDraft} onChange={(e) => setIpDraft(e.target.value)} placeholder="84.54.x.x, 213.xxx.x.x" style={{ ...inpS, fontSize: 11 }} />
            </div>
            <div style={{ width: 130 }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>Ish boshlanishi</label>
              <input type="time" value={startDraft} onChange={(e) => setStartDraft(e.target.value)} style={{ ...inpS, fontSize: 11 }} />
            </div>
            <button onClick={saveCfg} style={{ padding: "8px 16px", borderRadius: 7, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              💾 Saqlash
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {loading && <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 12 }}>Yuklanmoqda...</div>}
        {!loading && rows.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🕒</div>
            <div style={{ fontSize: 13 }}>Bu davr uchun yozuv yo'q.</div>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.card2 }}>
                  {["Sana", isBoss ? "Xodim" : "", "Keldi", "Ketdi", "Soat", "Kirish", "Belgilar"].filter(Boolean).map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "9px 12px", color: T.sub, whiteSpace: "nowrap" }}>{r.work_date}</td>
                    {isBoss && (
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Av id={r.user_id} team={[{ id: r.user_id, name: r.name }]} size={20} />
                          <span style={{ color: T.text, fontWeight: 600 }}>{r.name}</span>
                        </span>
                      </td>
                    )}
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: r.flags.includes("late") ? "#f59e0b" : T.green }}>{r.in_time || "—"}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: r.out_time ? T.text : T.muted }}>
                      {r.out_time || (r.seen_time ? `~${r.seen_time}` : "—")}
                    </td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{r.hours != null ? Number(r.hours).toFixed(1) : "—"}</td>
                    <td style={{ padding: "9px 12px", color: T.muted, fontSize: 10 }} title={r.ips.join(", ")}>
                      {r.logins}× · {r.ips.length} IP
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {r.flags.length === 0 && <span style={{ color: T.green, fontSize: 10 }}>✓</span>}
                        {r.flags.map((f) => {
                          const m = FLAG_META[f] || { label: f, color: T.muted, tip: "" };
                          return (
                            <span key={f} title={m.tip}
                              style={{ fontSize: 8, fontWeight: 700, color: m.color, background: `${m.color}18`, border: `1px solid ${m.color}44`, borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap", cursor: "help" }}>
                              {m.label}
                            </span>
                          );
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, color: T.muted, marginTop: 12, lineHeight: 1.7 }}>
        <b>Eslatma:</b> "2+ IP" va "2+ qurilma" belgilari akkaunt boshqa odam bilan bo'lishilgan bo'lishi mumkinligini
        bildiradi — lekin bu dalil emas (mobil internet, Wi-Fi almashuvi ham shunday ko'rinadi). Belgilangan holatlarni
        qo'lda tekshiring.
      </div>
    </div>
  );
}

export { Attendance };
