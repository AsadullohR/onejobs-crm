import { useState, useEffect, useCallback, useMemo } from "react";
import { useT } from "./theme.js";
import { inp, I, Av } from "./helpers.jsx";
import { attendanceAPI, configAPI, getLocation } from "./api.js";

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
  multi_device:  { label: "2+ qurilma",      color: "#f97316", tip: "Bir kunda turli kompyuterdan kirilgan" },
  new_device:    { label: "Yangi qurilma",   color: "#ef4444", tip: "Bu akkaunt ilgari ishlatilmagan kompyuterdan kirilgan — boshqa xodimning kompyuteri bo'lishi mumkin" },
  off_site:      { label: "Ofisdan tashqarida", color: "#ef4444", tip: "Kelish joylashuvi ofisdan belgilangan masofadan uzoq" },
  no_location:   { label: "Joylashuv yo'q",  color: "#f59e0b", tip: "Telefon joylashuvga ruxsat bermagan yoki aniqlanmagan" },
  no_checkout:   { label: "Chiqmagan",       color: "#94a3b8", tip: "Ketish qayd etilmagan" },
};

const LEVEL = {
  ok:     { label: "Vaqtida",       c: "#16a34a" },
  yellow: { label: "Kechikdi",      c: "#eab308" },
  red:    { label: "Qattiq kechikdi", c: "#dc2626" },
  absent: { label: "Kelmadi",       c: "#94a3b8" },
};
const toMin = (hhmm) => (hhmm ? Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) : null);
const WD = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Juma", "Shan"];
const pctColor = (p) => (p >= 90 ? "#16a34a" : p >= 75 ? "#eab308" : "#dc2626");
// Sunday is the day off; every other day counts as a working day.
const workDaysBetween = (from, to) => {
  const out = [];
  for (let d = new Date(from + "T00:00:00Z"); d <= new Date(to + "T00:00:00Z"); d = new Date(d.getTime() + 864e5)) {
    if (d.getUTCDay() !== 0) out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

function Attendance({ user, team = [], config, setConfig }) {
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
  const [latDraft, setLatDraft] = useState("");
  const [lngDraft, setLngDraft] = useState("");
  const [radDraft, setRadDraft] = useState("200");
  const [locBusy, setLocBusy] = useState(false);
  const [workerId, setWorkerId] = useState("all");
  const [graceDraft, setGraceDraft] = useState("10");
  const [redDraft, setRedDraft] = useState("30");
  const grace = Number(config?.attendanceCfg?.graceMin ?? 10);
  const redMin = Number(config?.attendanceCfg?.redLateMin ?? 30);
  useEffect(() => {
    setGraceDraft(String(config?.attendanceCfg?.graceMin ?? 10));
    setRedDraft(String(config?.attendanceCfg?.redLateMin ?? 30));
  }, [config?.attendanceCfg]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await attendanceAPI.list(from, to);
      setRows(r.data || []);
      setMeta({ officeIps: r.officeIps || [], workStart: r.workStart || "09:00", today: r.today,
                officeLat: r.officeLat, officeLng: r.officeLng, radiusM: r.radiusM });
      setLatDraft(r.officeLat != null ? String(r.officeLat) : "");
      setLngDraft(r.officeLng != null ? String(r.officeLng) : "");
      setRadDraft(String(r.radiusM || 200));
      setIpDraft((r.officeIps || []).join(", "));
      setStartDraft(r.workStart || "09:00");
    } catch (e) { /* surfaced by the empty state */ }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const saveCfg = async () => {
    const officeIps = ipDraft.split(",").map((s) => s.trim()).filter(Boolean);
    const next = {
      officeIps, workStart: startDraft || "09:00",
      officeLat: latDraft ? Number(latDraft) : null,
      officeLng: lngDraft ? Number(lngDraft) : null,
      radiusM: Number(radDraft) || 200,
      graceMin: Math.max(0, Number(graceDraft) || 0),
      redLateMin: Math.max(1, Number(redDraft) || 30),
    };
    try {
      await configAPI.set("attendanceCfg", next);
      setConfig && setConfig((p) => ({ ...p, attendanceCfg: next }));
      await load();
    } catch (e) { alert("Saqlanmadi: " + e.message); }
  };

  const goHome = async () => {
    if (!window.confirm("Ish kunini yakunlaysizmi? (Ketdim)")) return;
    try { setLocBusy(true); await attendanceAPI.checkout(await getLocation()); setLocBusy(false); await load(); }
    catch (e) { setLocBusy(false); alert("Xatolik: " + e.message); }
  };

  // Summary across the visible range
  const totalHours = rows.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const levelOf = (r) => {
    if (!r || !r.in_time) return "absent";
    const late = toMin(r.in_time) - toMin(meta.workStart || "09:00");
    return late <= grace ? "ok" : late <= redMin ? "yellow" : "red";
  };
  const lateBy = (r) => toMin(r.in_time) - toMin(meta.workStart || "09:00");

  // Who is on the roster: staff who can have attendance (not partners/employers),
  // plus anyone who has a record in the range.
  const roster = useMemo(() => {
    const m = new Map();
    team.filter((t) => t.active !== false && !["partner", "employer"].includes(t.role)).forEach((t) => m.set(t.id, t.name));
    rows.forEach((r) => m.set(r.user_id, r.name));
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [team, rows]);

  const selId = isBoss ? workerId : String(user.id);
  const single = selId !== "all";
  const viewRows = single ? rows.filter((r) => String(r.user_id) === selId) : rows;

  // Per-worker numbers: working days up to today (today only counts once they have arrived).
  const stats = useMemo(() => {
    const today = meta.today || todayStr;
    const end = to < today ? to : today;
    const days = from <= end ? workDaysBetween(from, end) : [];
    const byUser = new Map();
    rows.forEach((r) => { (byUser.get(r.user_id) || byUser.set(r.user_id, new Map()).get(r.user_id)).set(r.work_date, r); });
    const wanted = isBoss ? roster : roster.filter((w) => w.id === user.id);
    return wanted.map((w) => {
      const recs = byUser.get(w.id) || new Map();
      const own = days.filter((d) => d < today || recs.has(d));
      let ok = 0, yellow = 0, red = 0;
      own.forEach((d) => { const r = recs.get(d); if (!r || !r.in_time) return; const l = toMin(r.in_time) - toMin(meta.workStart || "09:00"); if (l <= grace) ok++; else if (l <= redMin) yellow++; else red++; });
      const present = ok + yellow + red;
      const n = own.length;
      return { ...w, days: own, recs, n, present, ok, yellow, red, absent: n - present,
               attPct: n ? Math.round((present / n) * 100) : 0, punctPct: n ? Math.round((ok / n) * 100) : 0 };
    });
  }, [rows, roster, from, to, meta, grace, redMin, isBoss, user.id, todayStr]);

  const sel = single ? stats.find((s) => String(s.id) === selId) : null;
  const lateCount = viewRows.filter((r) => ["yellow", "red"].includes(levelOf(r))).length;
  const suspCount = rows.filter((r) => r.flags.some((f) => ["off_network", "multi_ip", "multi_device", "new_device", "off_site"].includes(f))).length;
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
          {isBoss && (
            <select value={workerId} onChange={(e) => setWorkerId(e.target.value)} style={{ ...inpS, width: "auto", fontSize: 11, padding: "5px 9px" }}>
              <option value="all">👥 Barcha xodimlar</option>
              {roster.map((w) => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
            </select>
          )}
          <button onClick={goHome}
            style={{ padding: "7px 15px", borderRadius: 8, background: myToday?.out_time ? T.card2 : T.accent, color: myToday?.out_time ? T.muted : "#fff", border: myToday?.out_time ? `1px solid ${T.border}` : "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            {myToday?.out_time ? `✔ Ketdim ${myToday.out_time}` : "🏠 Ketdim"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
        {(sel ? [
          ["📊", "DAVOMAT", sel.attPct + "%", pctColor(sel.attPct)],
          ["✅", "VAQTIDA KELGAN", sel.punctPct + "%", pctColor(sel.punctPct)],
          ["🟡", "KECHIKDI", sel.yellow + " kun", sel.yellow ? LEVEL.yellow.c : T.text],
          ["🔴", "QATTIQ KECHIKDI", sel.red + " kun", sel.red ? LEVEL.red.c : T.text],
          ["⚪", "KELMAGAN", sel.absent + " kun", sel.absent ? LEVEL.absent.c : T.text],
        ] : [
          ["📋", "YOZUVLAR", viewRows.length + " ta", T.text],
          ["⏱", "JAMI SOAT", viewRows.reduce((s, r) => s + (Number(r.hours) || 0), 0).toFixed(1), T.text],
          ["🕘", "KECHIKISH", lateCount + " ta", lateCount ? "#eab308" : T.text],
          ["⚠️", "SHUBHALI", viewRows.filter((r) => r.flags.some((f) => ["off_network", "multi_ip", "multi_device", "new_device", "off_site"].includes(f))).length + " ta", suspCount ? T.red : T.text],
        ]).map(([ic, lb, val, c]) => (
          <div key={lb} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: T.muted, letterSpacing: "0.08em" }}>{lb}</span>
              <span style={{ fontSize: 15, opacity: 0.5 }}>{ic}</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12, fontSize: 10, color: T.muted }}>
        <span><b style={{ color: LEVEL.ok.c }}>■</b> Vaqtida (≤ {meta.workStart} + {grace} daq)</span>
        <span><b style={{ color: LEVEL.yellow.c }}>■</b> Kechikdi ({grace + 1}–{redMin} daq)</span>
        <span><b style={{ color: LEVEL.red.c }}>■</b> Qattiq kechikdi ({redMin}+ daq)</span>
        <span><b style={{ color: LEVEL.absent.c }}>■</b> Kelmadi (ish kuni, yakshanba hisobga olinmaydi)</span>
      </div>

      {/* All workers: one line each, click to drill down */}
      {isBoss && !single && stats.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.card2 }}>
                  {["Xodim", "Ish kunlari", "Kelgan", "Vaqtida", "Kechikdi", "Qattiq", "Kelmadi", "Davomat"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...stats].sort((a, b) => a.attPct - b.attPct).map((s) => (
                  <tr key={s.id} onClick={() => setWorkerId(String(s.id))} style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>{s.name}</td>
                    <td style={{ padding: "9px 12px", color: T.sub }}>{s.n}</td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{s.present}</td>
                    <td style={{ padding: "9px 12px", color: LEVEL.ok.c, fontWeight: 700 }}>{s.ok}</td>
                    <td style={{ padding: "9px 12px" }}><span style={{ color: s.yellow ? LEVEL.yellow.c : T.muted, fontWeight: 700, background: s.yellow ? `${LEVEL.yellow.c}22` : "transparent", borderRadius: 4, padding: "1px 7px" }}>{s.yellow}</span></td>
                    <td style={{ padding: "9px 12px" }}><span style={{ color: s.red ? LEVEL.red.c : T.muted, fontWeight: 700, background: s.red ? `${LEVEL.red.c}22` : "transparent", borderRadius: 4, padding: "1px 7px" }}>{s.red}</span></td>
                    <td style={{ padding: "9px 12px", color: s.absent ? LEVEL.absent.c : T.muted, fontWeight: 700 }}>{s.absent}</td>
                    <td style={{ padding: "9px 12px", minWidth: 150 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ flex: 1, height: 7, borderRadius: 4, background: T.card2, overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: s.attPct + "%", background: pctColor(s.attPct) }} />
                        </span>
                        <b style={{ color: pctColor(s.attPct), width: 38, textAlign: "right" }}>{s.attPct}%</b>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* One worker: a coloured square per working day */}
      {sel && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.text, marginBottom: 10 }}>
            {sel.name} — kunlar bo'yicha
            {isBoss && <button onClick={() => setWorkerId("all")} style={{ marginLeft: 10, fontSize: 10, background: "none", border: "none", color: T.accent, cursor: "pointer", fontWeight: 700 }}>← barcha xodimlar</button>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sel.days.map((d) => {
              const r = sel.recs.get(d);
              const lv = levelOf(r);
              const c = LEVEL[lv].c;
              const dt = new Date(d + "T00:00:00Z");
              return (
                <div key={d} title={`${d} — ${r?.in_time ? `${r.in_time}${lv !== "ok" ? ` (+${lateBy(r)} daq)` : ""}` : "kelmagan"}`}
                  style={{ width: 52, padding: "5px 0", textAlign: "center", borderRadius: 7, background: `${c}${lv === "absent" ? "22" : "30"}`, border: `1px solid ${c}`, color: T.text }}>
                  <div style={{ fontSize: 8, color: T.muted }}>{WD[dt.getUTCDay()]}</div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{d.slice(8)}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: lv === "absent" ? T.muted : c }}>{r?.in_time || "—"}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <div style={{ width: 120 }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>Imtiyoz (daq)</label>
              <input type="number" min="0" value={graceDraft} onChange={(e) => setGraceDraft(e.target.value)} style={{ ...inpS, fontSize: 11 }} />
            </div>
            <div style={{ width: 150 }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>Qizil chegara (daq)</label>
              <input type="number" min="1" value={redDraft} onChange={(e) => setRedDraft(e.target.value)} style={{ ...inpS, fontSize: 11 }} />
            </div>
          </div>
          {/* Office location — the check that actually works when everyone
              shares one router and staff log in from personal phones. */}
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: T.muted, marginBottom: 8, lineHeight: 1.6 }}>
              📍 <b>Ofis joylashuvi.</b> Ofisda turib "Hozirgi joylashuvni olish" tugmasini bosing. Xodim telefonidan
              kirganda joylashuvi shu nuqtadan radiusdan uzoq bo'lsa — "Ofisdan tashqarida" belgisi chiqadi.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ width: 140 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>Kenglik (lat)</label>
                <input value={latDraft} onChange={(e) => setLatDraft(e.target.value)} placeholder="41.31" style={{ ...inpS, fontSize: 11 }} />
              </div>
              <div style={{ width: 140 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>Uzunlik (lng)</label>
                <input value={lngDraft} onChange={(e) => setLngDraft(e.target.value)} placeholder="69.24" style={{ ...inpS, fontSize: 11 }} />
              </div>
              <div style={{ width: 110 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>Radius (m)</label>
                <input type="number" value={radDraft} onChange={(e) => setRadDraft(e.target.value)} style={{ ...inpS, fontSize: 11 }} />
              </div>
              <button disabled={locBusy}
                onClick={async () => {
                  setLocBusy(true);
                  const l = await getLocation();
                  setLocBusy(false);
                  if (!l) return alert("Joylashuv aniqlanmadi. Brauzerda ruxsat bering.");
                  setLatDraft(String(l.lat.toFixed(6)));
                  setLngDraft(String(l.lng.toFixed(6)));
                }}
                style={{ padding: "8px 14px", borderRadius: 7, background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}44`, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                {locBusy ? "⏳..." : "📍 Hozirgi joylashuvni olish"}
              </button>
              <button onClick={saveCfg} style={{ padding: "8px 16px", borderRadius: 7, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                💾 Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {loading && <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 12 }}>Yuklanmoqda...</div>}
        {!loading && viewRows.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🕒</div>
            <div style={{ fontSize: 13 }}>Bu davr uchun yozuv yo'q.</div>
          </div>
        )}
        {!loading && viewRows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.card2 }}>
                  {["Sana", isBoss ? "Xodim" : "", "Keldi", "Ketdi", "Soat", "Masofa", "Kirish", "Belgilar"].filter(Boolean).map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewRows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${T.border}`, background: levelOf(r) === "red" ? `${LEVEL.red.c}14` : levelOf(r) === "yellow" ? `${LEVEL.yellow.c}18` : "transparent" }}>
                    <td style={{ padding: "9px 12px", color: T.sub, whiteSpace: "nowrap" }}>{r.work_date}</td>
                    {isBoss && (
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Av id={r.user_id} team={[{ id: r.user_id, name: r.name }]} size={20} />
                          <span style={{ color: T.text, fontWeight: 600 }}>{r.name}</span>
                        </span>
                      </td>
                    )}
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: LEVEL[levelOf(r)].c, whiteSpace: "nowrap" }}>
                      {r.in_time || "—"}
                      {["yellow", "red"].includes(levelOf(r)) && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700 }}>+{lateBy(r)} daq</span>}
                    </td>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: r.out_time ? T.text : T.muted }}>
                      {r.out_time || (r.seen_time ? `~${r.seen_time}` : "—")}
                    </td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{r.hours != null ? Number(r.hours).toFixed(1) : "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 10, color: r.flags.includes("off_site") ? T.red : T.muted }}>
                      {r.distance == null ? "—" : r.distance < 1000 ? `${r.distance} m` : `${(r.distance/1000).toFixed(1)} km`}
                    </td>
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
        <b>Eslatma:</b> butun ofis bitta routerga ulangani uchun IP hamma xodimda bir xil — shuning uchun ofis ichida
        asosiy signal <b>"Yangi qurilma"</b> (akkaunt ilgari ishlatilmagan kompyuterdan kirgan). "Ofis tarmog'i emas"
        esa tashqaridan (uydan) kirishni ko'rsatadi. Bu belgilar dalil emas, tekshirish uchun ishora: xodim brauzerni
        almashtirsa yoki keshni tozalasa ham "Yangi qurilma" chiqadi.
      </div>
    </div>
  );
}

export { Attendance };
