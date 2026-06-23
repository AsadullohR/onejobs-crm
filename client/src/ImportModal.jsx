import { useState, useRef } from "react";
import { useT } from "./theme.js";
import { importAPI } from "./api.js";

const STATUS_MAP = { progress: "Hujjat", finished: "Jo'nab ketdi" };

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { vals.push(cur); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  }).filter(r => r.name || r.uid);
}

function parseFbCSV(text) {
  // Facebook Lead Ads export format
  // Columns: id, created_time, ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name,
  //          form_id, form_name, is_organic, platform, ismingiz:, phone_typed, phone_number, full_name, lead_status
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { vals.push(cur); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur);
    const get = (col) => (vals[colIdx[col]] || "").trim();

    const leadStatus = get("lead_status");
    if (leadStatus === "test lead") continue;

    const fbId = get("id").replace(/^l:/, "");
    const name = get("ismingiz:") || get("full_name") || "";
    const rawPhone = get("phone_number").replace(/^p:/, "");
    const adName = get("ad_name");
    const createdTime = get("created_time");

    if (!name && !rawPhone) continue;

    results.push({
      name,
      phone: rawPhone,
      source: "Target",
      note: adName || "",
      createdAt: createdTime || null,
      status: "Yangi",
    });
  }
  return results;
}

export function ImportModal({ team, user, onClose, onDone }) {
  const T = useT();
  const fileRef = useRef();
  const fbFileRef = useRef();
  const [tab, setTab] = useState("regular"); // "regular" | "facebook"
  const [rows, setRows] = useState([]);
  const [previewCount, setPreviewCount] = useState(10);
  const [ownerSalesId, setOwnerSalesId] = useState("");
  const [skipDups, setSkipDups] = useState(true);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const salesTeam = team.filter(m => ["sales", "manager", "admin"].includes(m.role));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setRows(parsed);
        setError("");
        setResult(null);
      } catch (err) {
        setError("CSV o'qishda xatolik: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleFbFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseFbCSV(ev.target.result);
        setRows(parsed);
        setPreviewCount(parsed.length);
        setError("");
        setResult(null);
      } catch (err) {
        setError("CSV o'qishda xatolik: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setLoading(true);
    setError("");
    try {
      let res;
      if (tab === "facebook") {
        res = await importAPI.bulkFbLeads(rows, ownerSalesId || null);
      } else {
        res = await importAPI.bulkLeads(rows.slice(0, previewCount), ownerSalesId || null, skipDups);
      }
      setResult(res);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 };
  const inp = { background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", color: T.text, fontSize: 11, width: "100%", boxSizing: "border-box" };

  const switchTab = (t) => {
    setTab(t);
    setRows([]);
    setResult(null);
    setError("");
    setPreviewCount(10);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, width: 700, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>📥 Mijozlarni Import Qilish</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
          {[
            { id: "regular", label: "📋 Oddiy CSV" },
            { id: "facebook", label: "📘 Facebook Leads CSV" },
          ].map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)} style={{
              padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
              background: tab === t.id ? T.accent : T.card2,
              color: tab === t.id ? "#fff" : T.muted,
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "regular" && <>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 10 }}>Format: uid, clientId, name, dest, note, status, createdAt</div>

          {/* Step 1: File */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 8 }}>1. CSV Fayl</div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ fontSize: 11, color: T.text }} />
            {rows.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: T.green }}>✅ {rows.length} ta yozuv topildi</div>
            )}
          </div>

          {/* Step 2: Settings */}
          {rows.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 10 }}>2. Sozlamalar</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: T.muted, display: "block", marginBottom: 3 }}>Sotuvchi (Owner Sales)</label>
                  <select value={ownerSalesId} onChange={e => setOwnerSalesId(e.target.value)} style={inp}>
                    <option value="">— Tayinlanmagan —</option>
                    {salesTeam.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: T.muted, display: "block", marginBottom: 3 }}>Nechta import qilish</label>
                  <select value={previewCount} onChange={e => setPreviewCount(Number(e.target.value))} style={inp}>
                    <option value={10}>10 ta (test)</option>
                    <option value={25}>25 ta</option>
                    <option value={50}>50 ta</option>
                    <option value={rows.length}>Hammasi ({rows.length} ta)</option>
                  </select>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted, cursor: "pointer" }}>
                <input type="checkbox" checked={skipDups} onChange={e => setSkipDups(e.target.checked)} />
                Dublikatlarni o'tkazib yuborish (xuddi shu ism yoki NO-raqam mavjud bo'lsa)
              </label>
            </div>
          )}

          {/* Step 3: Preview */}
          {rows.length > 0 && (
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: T.text, borderBottom: `1px solid ${T.border}` }}>
                3. Ko'rinish (birinchi {Math.min(previewCount, rows.length)} ta)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: T.card2 }}>
                      {["#", "clientId", "Ism", "Yo'nalish", "Status", "Izoh"].map(h => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: T.muted, fontWeight: 700, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, previewCount).map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "5px 10px", color: T.muted }}>{i + 1}</td>
                        <td style={{ padding: "5px 10px", color: T.accent, fontWeight: 600 }}>{r.clientId || "—"}</td>
                        <td style={{ padding: "5px 10px", color: T.text, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: "5px 10px", color: T.muted }}>{r.dest}</td>
                        <td style={{ padding: "5px 10px" }}>
                          <span style={{ background: r.status === "progress" ? `${T.blue||T.accent}22` : `${T.green}22`, color: r.status === "progress" ? T.blue||T.accent : T.green, borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>
                            {STATUS_MAP[r.status] || r.status}
                          </span>
                        </td>
                        <td style={{ padding: "5px 10px", color: T.muted, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>}

        {tab === "facebook" && <>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 10 }}>
            Facebook Lead Ads eksportidan CSV yuklang. Telefon raqami bo'yicha dublikatlar avtomatik o'tkazib yuboriladi.
          </div>

          {/* Step 1: File */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 8 }}>1. Facebook CSV Fayl</div>
            <input ref={fbFileRef} type="file" accept=".csv" onChange={handleFbFile} style={{ fontSize: 11, color: T.text }} />
            {rows.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: T.green }}>✅ {rows.length} ta lead topildi (test leadlar filtrlangan)</div>
            )}
          </div>

          {/* Settings */}
          {rows.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 10 }}>2. Sozlamalar</div>
              <div>
                <label style={{ fontSize: 10, color: T.muted, display: "block", marginBottom: 3 }}>Sotuvchi (Owner Sales, ixtiyoriy)</label>
                <select value={ownerSalesId} onChange={e => setOwnerSalesId(e.target.value)} style={{ ...inp, width: "50%" }}>
                  <option value="">— Tayinlanmagan —</option>
                  {salesTeam.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: T.muted, background: `${T.accent}11`, border: `1px solid ${T.accent}33`, borderRadius: 6, padding: "6px 10px" }}>
                Manba: <b>Target</b> · Dublikat tekshiruvi: <b>telefon raqami bo'yicha</b> · Jami: <b>{rows.length} ta</b>
              </div>
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: T.text, borderBottom: `1px solid ${T.border}` }}>
                3. Ko'rinish (birinchi 10 ta)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: T.card2 }}>
                      {["#", "Ism", "Telefon", "Reklama", "Sana"].map(h => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: T.muted, fontWeight: 700, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "5px 10px", color: T.muted }}>{i + 1}</td>
                        <td style={{ padding: "5px 10px", color: T.text, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: "5px 10px", color: T.accent }}>{r.phone}</td>
                        <td style={{ padding: "5px 10px", color: T.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reklama_name || "—"}</td>
                        <td style={{ padding: "5px 10px", color: T.muted }}>{(r.createdAt || "").slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 10 && (
                <div style={{ padding: "6px 14px", fontSize: 10, color: T.muted, borderTop: `1px solid ${T.border}` }}>
                  ... va yana {rows.length - 10} ta
                </div>
              )}
            </div>
          )}
        </>}

        {/* Error */}
        {error && <div style={{ color: T.red, fontSize: 11, marginTop: 8 }}>❌ {error}</div>}

        {/* Result */}
        {result && (
          <div style={{ background: `${T.green}15`, border: `1px solid ${T.green}44`, borderRadius: 8, padding: "10px 14px", marginTop: 10, fontSize: 11 }}>
            <div style={{ color: T.green, fontWeight: 700, marginBottom: 4 }}>✅ Import muvaffaqiyatli!</div>
            <div style={{ color: T.text }}>Yangi qo'shildi: <b>{result.inserted}</b> · Yangilandi: <b>{result.updated}</b> · O'tkazib yuborildi (dublikat): <b>{result.skipped}</b></div>
            {result.skippedNames?.length > 0 && (
              <div style={{ color: T.muted, marginTop: 4 }}>O'tkazilganlar (birinchi 5): {result.skippedNames.slice(0, 5).join(", ")}{result.skippedNames.length > 5 ? ` va yana ${result.skippedNames.length - 5} ta` : ""}</div>
            )}
          </div>
        )}

        {/* Actions */}
        {rows.length > 0 && !result && (
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, background: T.card2, border: `1px solid ${T.border}`, color: T.muted, fontSize: 11, cursor: "pointer" }}>Bekor</button>
            <button onClick={handleImport} disabled={loading} style={{ padding: "8px 20px", borderRadius: 7, background: T.accent, color: "#fff", border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              {loading ? "Yuklanmoqda..." : tab === "facebook" ? `${rows.length} ta Facebook lead import qilish` : `${Math.min(previewCount, rows.length)} ta import qilish`}
            </button>
          </div>
        )}
        {result && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 7, background: T.accent, color: "#fff", border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Yopish</button>
          </div>
        )}
      </div>
    </div>
  );
}
