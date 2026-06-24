import { useState, useRef } from "react";
import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { txnAPI, leadsAPI } from "./api.js";
import {
  uid,
  fmtM,
  fmtMs,
  fmtD,
  isOD,
  inp,
  lab,
  I,
  Pill,
  Av,
  Modal,
  SearchSelect,
} from "./helpers.jsx";

// ─── FINANCE ─────────────────────────────────────────────────────────────────
function Finance({
  leads,
  setLeads,
  team,
  user,
  txns,
  setTxns,
  config,
  addNotif,
  debts,
  setDebts,
  extExps,
}) {
  const T = useT();
  const [selLead, setSelLead] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [fView, setFView] = useState("all");
  const [finTab, setFinTab] = useState("txns"); // txns | debts
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [colMap, setColMap] = useState({});
  const fileRef = useRef();
  const csvRef = useRef();
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [debtForm, setDebtForm] = useState({
    amt: "",
    due: "",
    cat: "1-Qism",
    desc: "",
  });
  const df = (k, v) => setDebtForm((p) => ({ ...p, [k]: v }));

  const lf = (id) => ({
    inc: txns
      .filter((t) => t.leadId === id && t.type === "income")
      .reduce((s, t) => s + t.amount, 0),
    exp: txns
      .filter((t) => t.leadId === id && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0),
    txns: txns.filter((t) => t.leadId === id),
  });
  const totalInc = txns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const extTotal = (extExps||[]).reduce((s,e)=>s+Number(e.amount||0), 0);
  const totalExp = txns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0) + extTotal;
  const tasdFoyda = leads.filter(l=>DONE.includes(l.status)&&l.sofFoyda).reduce((s,l)=>s+Number(l.sofFoyda||0),0);
  const staffExp = txns.filter(t=>t.type==="expense"&&!t.leadId).reduce((s,t)=>s+t.amount,0);
  const sofFoyda = tasdFoyda - extTotal - staffExp;
  const visLeads = leads
    .filter((l) => {
      if (fView === "jarayon")
        return !DONE.includes(l.status) && !LOST.includes(l.status);
      if (fView === "tugatilgan") return DONE.includes(l.status);
      if (fView === "yoqotilgan") return LOST.includes(l.status);
      return true;
    })
    .filter(
      (l) =>
        !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.id.includes(search),
    );

  const cur = selLead ? leads.find((l) => l.id === selLead) : null;
  const cf = cur ? lf(cur.id) : { inc: 0, exp: 0, txns: [] };
  const curDebts = cur ? debts.filter((d) => d.leadId === cur.id) : [];

  const markTugagan = async (lead) => {
    const cf = lf(lead.id);
    const netProfit = cf.inc - cf.exp;
    if (!window.confirm(`"${lead.name}" uchun Tugagan belgilansinmi?\nTasdiqlangan foyda: ${fmtM(netProfit)} so'm`)) return;
    const updated = { ...lead, status: "Jo'nab ketdi", sofFoyda: netProfit };
    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
    try {
      await leadsAPI.save({ ...updated, ownerSales: updated.ownerSales||null, ownerConsult: updated.ownerConsult||null, ownerDocs: updated.ownerDocs||null });
      addNotif && addNotif(`✅ ${lead.name} — Tugagan. Tasdiqlangan foyda: ${fmtMs(netProfit)} so'm`);
    } catch(e) {
      addNotif && addNotif(`❌ Saqlashda xato: ${e.message}`, "error");
    }
  };

  const markQaytarish = async (lead) => {
    if (!window.confirm(`"${lead.name}" ni faol holatga qaytarasizmi?\nTasdiqlangan foyda o'chadi.`)) return;
    const updated = { ...lead, status: "Shartnoma qildi", sofFoyda: null };
    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
    try {
      await leadsAPI.save({ ...updated, ownerSales: updated.ownerSales||null, ownerConsult: updated.ownerConsult||null, ownerDocs: updated.ownerDocs||null });
      addNotif && addNotif(`↩️ ${lead.name} — faol holatga qaytarildi`);
    } catch(e) {
      addNotif && addNotif(`❌ Saqlashda xato: ${e.message}`, "error");
    }
  };
  const openAdd = (type = "income", leadId = "") => {
    const incomeCats = config?.txnInc || [
      "Asosiy kirim",
      "XBA",
      "Shartnoma",
      "Boshqa",
    ];

    const expenseCats = config?.txnExp || [
      "Xizmat",
      "Transport",
      "Hujjat",
      "Maosh",
      "Boshqa",
    ];

    const cats = type === "income" ? incomeCats : expenseCats;

    setForm({
      id: uid(),
      leadId: leadId || "",
      date: new Date().toISOString().slice(0, 10),
      type,
      cat: cats[0] || "",
      desc: "",
      amount: "",
      receipt: null,
      paymentMethod: 'cash',
    });

    setModal("form");
  };
  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    const payload = {
      leadId: form.leadId || null,
      date: form.date || new Date().toISOString().slice(0, 10),
      type: form.type,
      category: form.cat || "",
      description: form.desc || "",
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod || 'cash',
    };
    try {
      const isEdit = txns.some((t) => t.id === form.id);
      if (isEdit) {
        const saved = await txnAPI.update(form.id, payload);
        setTxns((p) => p.map((t) => t.id === form.id
          ? { ...t, ...payload, id: form.id, cat: payload.category, desc: payload.description }
          : t));
      } else {
        const saved = await txnAPI.create(payload);
        setTxns((p) => [...p, {
          id: String(saved.id), leadId: saved.lead_id, type: saved.type,
          cat: saved.category || "", desc: saved.description || "",
          amount: Number(saved.amount), date: saved.date?.slice(0, 10) || payload.date,
          by: saved.created_by,
        }]);
      }
      setModal(null);
    } catch (err) { alert("Saqlanmadi: " + err.message); }
  };

  const deleteTxn = async (id) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
      await txnAPI.delete(id);
      setTxns((p) => p.filter((t) => t.id !== id));
    } catch (err) { alert("O'chirishda xatolik: " + err.message); }
  };

  // CSV EXPORT – transactions
  const exportCSV = () => {
    const h = ["ID", "Sana", "Tur", "Kat", "Tavsif", "Summa", "Mijoz"];
    const r = txns.map((t) => {
      const l = leads.find((x) => x.id === t.leadId);
      return [t.id, t.date, t.type, t.cat, t.desc, t.amount, l?.name || "–"];
    });
    const csv = [h, ...r].map((x) => x.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "moliya_tranzaksiyalar.csv";
    a.click();
  };
  // CSV EXPORT – lead balances (matches uploaded format)
  const exportLeadsCSV = () => {
    const h = [
      "uid",
      "id",
      "name",
      "dest",
      "note",
      "status",
      "createdAt",
      "totalIncome",
      "totalExpense",
      "netBalance",
    ];
    const r = leads.map((l) => {
      const fi = lf(l.id);
      return [
        l.uid || l.id,
        l.id,
        l.name,
        l.dest || l.country || "",
        l.note || "",
        DONE.includes(l.status) ? "finished" : "progress",
        l.createdAt || "",
        fi.inc,
        fi.exp,
        fi.inc - fi.exp,
      ];
    });
    const csv = [h, ...r].map((x) => x.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "moliya_mijozlar.csv";
    a.click();
  };

  // CSV IMPORT – parse and show column mapper
  const parseImportCSV = (text) => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      setImportResult({ error: "Kamida 2 qator kerak (sarlavha + ma'lumot)" });
      return;
    }
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    setCsvHeaders(headers);
    // Auto-detect column mapping
    const autoMap = {};
    const fieldMap = {
      id: ["id", "uid", "ID", "code"],
      name: ["name", "ism", "nom", "mijoz"],
      totalIncome: ["totalIncome", "total_income", "kirim", "income"],
      totalExpense: ["totalExpense", "total_expense", "chiqim", "expense"],
      netBalance: ["netBalance", "net_balance", "balans", "balance"],
      dest: ["dest", "destination", "yo'nalish", "yonalish"],
      note: ["note", "izoh", "comment"],
      status: ["status", "holat"],
      createdAt: ["createdAt", "created_at", "sana", "date"],
    };
    headers.forEach((h, i) => {
      Object.entries(fieldMap).forEach(([field, aliases]) => {
        if (aliases.some((a) => h.toLowerCase().includes(a.toLowerCase())))
          autoMap[field] = i;
      });
    });
    setColMap(autoMap);
    setImportResult({
      headers,
      rows: lines.slice(1).map((l) => {
        // handle quoted commas
        const parts = [];
        let cur = "";
        let inQ = false;
        for (const ch of l) {
          if (ch === '"') inQ = !inQ;
          else if (ch === "," && !inQ) {
            parts.push(cur);
            cur = "";
          } else cur += ch;
        }
        parts.push(cur);
        return parts.map((p) => p.trim().replace(/^"|"$/g, ""));
      }),
      parsed: true,
    });
  };

  const applyImport = () => {
    if (!importResult?.rows) return;
    let imported = 0;
    let updated = 0;
    const newTxns = [...txns];
    importResult.rows.forEach((row) => {
      const get = (field) =>
        colMap[field] != null ? row[colMap[field]] || "" : "";
      const leadId = get("id") || get("name");
      const name = get("name");
      const inc = parseFloat(get("totalIncome")) || 0;
      const exp = parseFloat(get("totalExpense")) || 0;
      const dest = get("dest");
      const note = get("note");
      if (!leadId && !name) return;
      // Find existing lead by id or name
      const existing = leads.find((l) => l.id === leadId || l.name === name);
      if (existing) {
        // Update lead dest/note if provided
        if (dest || note) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === existing.id
                ? { ...l, dest: dest || l.dest, note: note || l.note }
                : l,
            ),
          );
        }
        // Add finance summary as transactions if they don't already match
        const fi = lf(existing.id);
        if (Math.abs(fi.inc - inc) > 100 && inc > 0) {
          newTxns.push({
            id: uid(),
            leadId: existing.id,
            type: "income",
            cat: "Import",
            desc: "CSV import",
            amount: inc,
            date: new Date().toISOString().slice(0, 10),
            by: user.id,
          });
        }
        if (Math.abs(fi.exp - exp) > 100 && exp > 0) {
          newTxns.push({
            id: uid(),
            leadId: existing.id,
            type: "expense",
            cat: "Import",
            desc: "CSV import",
            amount: exp,
            date: new Date().toISOString().slice(0, 10),
            by: user.id,
          });
        }
        updated++;
      } else if (name) {
        // Create new minimal lead
        const newId = leadId || `IMP-${Date.now()}`;
        setLeads((prev) => [
          ...prev,
          {
            id: newId,
            name,
            phone: "",
            status: "Yangi",
            country: "",
            sector: "",
            source: "Import",
            gender: "",
            ownerSales: null,
            ownerConsult: null,
            ownerDocs: null,
            comment: "",
            q1: false,
            q2: false,
            q3: false,
            xba: false,
            kpiSales: false,
            kpiConsult: false,
            kpiDocs: false,
            dest,
            note,
            history: [],
            sofFoyda: null,
            docs: {},
            createdAt: new Date().toISOString().slice(0, 10),
          },
        ]);
        if (inc > 0)
          newTxns.push({
            id: uid(),
            leadId: newId,
            type: "income",
            cat: "Import",
            desc: "CSV import",
            amount: inc,
            date: new Date().toISOString().slice(0, 10),
            by: user.id,
          });
        if (exp > 0)
          newTxns.push({
            id: uid(),
            leadId: newId,
            type: "expense",
            cat: "Import",
            desc: "CSV import",
            amount: exp,
            date: new Date().toISOString().slice(0, 10),
            by: user.id,
          });
        imported++;
      }
    });
    setTxns(newTxns);
    setImportResult({ done: true, imported, updated });
    setShowImport(false);
    setImportText("");
    setCsvHeaders([]);
    setColMap({});
    addNotif && addNotif(`📥 Import: ${imported} yangi, ${updated} yangilandi`);
  };

  // Debts for current lead
  const addDebt = () => {
    if (!cur) return;
    setDebts((p) => [
      ...p,
      {
        id: uid(),
        leadId: cur.id,
        name: cur.name,
        type: "client",
        category: "",
        dueDate: "",
        desc: "",
        amount: 0,
        paid: false,
        createdAt: new Date().toISOString().slice(0, 10),
        by: user.id,
      },
    ]);
  };
  const toggleDebt = (id) =>
    setDebts((p) => p.map((d) => (d.id === id ? { ...d, paid: !d.paid } : d)));
  const deleteDebt = (id) => setDebts((p) => p.filter((d) => d.id !== id));
  const updateDebt = (id, k, v) =>
    setDebts((p) => p.map((d) => (d.id === id ? { ...d, [k]: v } : d)));

  const inpS = inp(T);
  const labS = lab(T);
  const FIELD_NAMES = {
    id: "ID (No)",
    name: "Ism",
    totalIncome: "Kirim",
    totalExpense: "Chiqim",
    netBalance: "Balans",
    dest: "Yo'nalish",
    note: "Izoh",
    status: "Holat",
    createdAt: "Sana",
  };

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: "calc(100vh - 52px)",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* ── Left panel ── */}
      <div
        style={{
          width: 260,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          background: T.card,
        }}
      >
        {/* KPI header */}
        <div
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 5,
              marginBottom: 7,
            }}
          >
            {[
              ["Jami Kirim", totalInc, T.green, "+"],
              [" Jami Chiqim", totalExp, T.red, "-"],
              [
                "Joriy Balans",
                totalInc - totalExp,
                totalInc - totalExp >= 0 ? T.green : T.red,
                totalInc - totalExp >= 0 ? "+" : "-",
              ],
              ["Tasdiqlangan Foyda", tasdFoyda, T.yellow, "💰"],
              ["Sof Foyda", sofFoyda, sofFoyda>=0?"#a78bfa":T.red, "✨"],
            ].map(([lb, val, c, sign]) => (
              <div
                key={lb}
                style={{
                  background: `${c}12`,
                  border: `1px solid ${c}33`,
                  borderRadius: 6,
                  padding: "5px 7px",
                }}
              >
                <div
                  style={{
                    fontSize: 7,
                    color: T.muted,
                    marginBottom: 1,
                    fontWeight: 600,
                  }}
                >
                  {lb}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: c }}>
                  {sign === "💰"
                    ? `${fmtMs(val)} so'm`
                    : `${sign}${fmtMs(Math.abs(val))}`}
                </div>
              </div>
            ))}
          </div>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
            <button
              onClick={exportLeadsCSV}
              style={{
                flex: 1,
                padding: "3px",
                borderRadius: 4,
                background: T.card2,
                color: T.muted,
                border: `1px solid ${T.border}`,
                cursor: "pointer",
                fontSize: 7,
                fontWeight: 600,
              }}
            >
              📊 Mijoz CSV
            </button>
            <button
              onClick={exportCSV}
              style={{
                flex: 1,
                padding: "3px",
                borderRadius: 4,
                background: T.card2,
                color: T.muted,
                border: `1px solid ${T.border}`,
                cursor: "pointer",
                fontSize: 7,
                fontWeight: 600,
              }}
            >
              📋 Tranzaksiya
            </button>
          </div>
          <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
            <button
              onClick={() => setShowImport((s) => !s)}
              style={{
                flex: 1,
                padding: "3px",
                borderRadius: 4,
                background: showImport ? `${T.accent}22` : T.card2,
                color: showImport ? T.accent : T.muted,
                border: `1px solid ${showImport ? T.accent + "44" : T.border}`,
                cursor: "pointer",
                fontSize: 7,
                fontWeight: 600,
              }}
            >
              📥 Import CSV
            </button>
            <button
              onClick={() => openAdd("income", null)}
              style={{
                flex: 1,
                padding: "3px",
                borderRadius: 4,
                background: `${T.green}22`,
                color: T.green,
                border: `1px solid ${T.green}44`,
                cursor: "pointer",
                fontSize: 7,
                fontWeight: 700,
              }}
            >
              +Kirim
            </button>
            <button
              onClick={() => openAdd("expense", null)}
              style={{
                flex: 1,
                padding: "3px",
                borderRadius: 4,
                background: `${T.red}22`,
                color: T.red,
                border: `1px solid ${T.red}44`,
                cursor: "pointer",
                fontSize: 7,
                fontWeight: 700,
              }}
            >
              +Chiqim
            </button>
          </div>
          {/* CSV Import panel */}
          {showImport && (
            <div
              style={{
                background: T.card2,
                border: `1px solid ${T.border}`,
                borderRadius: 7,
                padding: "8px 9px",
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: T.text,
                  marginBottom: 5,
                }}
              >
                📥 CSV Import (mijoz moliyasi)
              </div>
              <div style={{ fontSize: 8, color: T.muted, marginBottom: 4 }}>
                Sarlavhalar:
                uid,id,name,dest,note,status,createdAt,totalIncome,totalExpense,netBalance
              </div>
              <input
                type="file"
                ref={csvRef}
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const r = new FileReader();
                  r.onload = (ev) => {
                    setImportText(ev.target.result);
                    parseImportCSV(ev.target.result);
                  };
                  r.readAsText(e.target.files[0]);
                }}
              />
              <button
                onClick={() => csvRef.current.click()}
                style={{
                  width: "100%",
                  padding: "4px",
                  borderRadius: 5,
                  background: T.accent,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 8,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                📁 CSV fayl tanlash
              </button>
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  if (e.target.value.trim()) parseImportCSV(e.target.value);
                }}
                placeholder={"uid,id,name,dest...\ndata1,data2,..."}
                rows={3}
                style={{
                  ...inpS,
                  width: "100%",
                  fontSize: 8,
                  resize: "vertical",
                  marginBottom: 4,
                }}
              />
              {/* Column mapper */}
              {csvHeaders.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    Ustunlarni moslashtirish:
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 3,
                      marginBottom: 6,
                    }}
                  >
                    {Object.entries(FIELD_NAMES).map(([field, label]) => (
                      <div
                        key={field}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 7,
                            color: T.muted,
                            fontWeight: 600,
                          }}
                        >
                          {label}
                        </span>
                        <select
                          value={colMap[field] ?? ""}
                          onChange={(e) =>
                            setColMap((p) => ({
                              ...p,
                              [field]:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            }))
                          }
                          style={{ ...inpS, padding: "2px 4px", fontSize: 7 }}
                        >
                          <option value="">– yo'q –</option>
                          {csvHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {importResult?.rows && (
                    <div
                      style={{ fontSize: 8, color: T.muted, marginBottom: 4 }}
                    >
                      {importResult.rows.length} ta qator topildi
                    </div>
                  )}
                  <button
                    onClick={applyImport}
                    style={{
                      width: "100%",
                      padding: "5px",
                      borderRadius: 5,
                      background: T.green,
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 8,
                      fontWeight: 700,
                    }}
                  >
                    ✓ Import qilish ({importResult?.rows?.length || 0} ta)
                  </button>
                </div>
              )}
              {importResult?.done && (
                <div
                  style={{
                    fontSize: 9,
                    color: T.green,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  ✅ Yangi: {importResult.imported}, Yangilandi:{" "}
                  {importResult.updated}
                </div>
              )}
              {importResult?.error && (
                <div style={{ fontSize: 9, color: T.red, marginTop: 4 }}>
                  ❌ {importResult.error}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Filter tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
          {[
            ["all", "Barchasi"],
            ["jarayon", "Jarayon"],
            ["tugatilgan", "Tugagan"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFView(k)}
              style={{
                flex: 1,
                padding: "5px 2px",
                border: "none",
                borderBottom:
                  fView === k
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                fontSize: 8,
                fontWeight: fView === k ? 700 : 400,
                color: fView === k ? T.text : T.muted,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div style={{ padding: "4px 6px" }}>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 5,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.muted,
                fontSize: 10,
              }}
            >
              {I.search}
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              style={{
                ...inpS,
                paddingLeft: 18,
                fontSize: 9,
                padding: "4px 4px 4px 18px",
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {visLeads.map((l) => {
            const f2 = lf(l.id);
            const bal = f2.inc - f2.exp;
            const sel = selLead === l.id;
            const hasDebt = debts.some((d) => d.leadId === l.id && !d.paid);
            return (
              <div
                key={l.id}
                onClick={() => setSelLead(l.id)}
                style={{
                  padding: "6px 9px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${T.border}22`,
                  background: sel ? `${T.accent}22` : "transparent",
                  borderLeft: sel
                    ? `3px solid ${T.accent}`
                    : "3px solid transparent",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.text,
                    marginBottom: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {l.name}
                  {hasDebt && (
                    <span
                      style={{
                        fontSize: 7,
                        background: `${T.red}22`,
                        color: T.red,
                        borderRadius: 3,
                        padding: "0 3px",
                        fontWeight: 700,
                      }}
                    >
                      QARZ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 7, color: T.muted, marginBottom: 2 }}>
                  {l.id} · {l.country || "–"}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      color: bal >= 0 ? T.green : T.red,
                    }}
                  >
                    {bal >= 0 ? "+" : ""}
                    {fmtMs(bal)}
                  </span>
                  {l.sofFoyda && (
                    <span style={{ fontSize: 7, color: T.yellow }}>
                      💰{fmtMs(l.sofFoyda)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        {!cur && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: T.muted,
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>
              💰
            </div>
            <div style={{ fontSize: 13, color: T.text }}>Mijozni tanlang</div>
          </div>
        )}
        {cur && (
          <div style={{ padding: "16px 20px" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: T.accent, fontWeight: 700 }}>
                  {cur.id}
                </div>
                <h1
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    color: T.text,
                    margin: "2px 0 4px",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {cur.name}
                </h1>
                <div style={{ display: "flex", gap: 6 }}>
                  {cur.country && (
                    <span
                      style={{
                        background: T.card2,
                        color: T.sub,
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 5,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      ✈️ {cur.country}
                    </span>
                  )}
                  <Pill sk={cur.status} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <button
                  onClick={() => openAdd("income", cur.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: `${T.green}22`,
                    color: T.green,
                    border: `1px solid ${T.green}44`,
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  + Kirim
                </button>
                <button
                  onClick={() => openAdd("expense", cur.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: `${T.red}22`,
                    color: T.red,
                    border: `1px solid ${T.red}44`,
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  + Chiqim
                </button>
                <button
                  onClick={() => markTugagan(cur)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: "#166534",
                    color: "#86EFAC",
                    border: "1px solid #166534",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  ✈️ Tugagan
                </button>
                {DONE.includes(cur.status) && (
                  <button
                    onClick={() => markQaytarish(cur)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      background: `${T.yellow}22`,
                      color: T.yellow,
                      border: `1px solid ${T.yellow}44`,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    ↩️ Qaytarish
                  </button>
                )}
                {cur.sofFoyda && (
                  <span
                    style={{
                      padding: "5px 8px",
                      borderRadius: 6,
                      background: `${T.yellow}22`,
                      color: T.yellow,
                      border: `1px solid ${T.yellow}44`,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    💰{fmtMs(cur.sofFoyda)}
                  </span>
                )}
              </div>
            </div>
            {/* KPIs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {[
                ["💚 Kirim", cf.inc, T.green],
                ["🔴 Chiqim", cf.exp, T.red],
                [
                  "⚖️ Balans",
                  cf.inc - cf.exp,
                  cf.inc - cf.exp >= 0 ? T.green : T.red,
                ],
                ["💰 Sof Foyda", cur.sofFoyda, T.yellow],
              ].map(([lb, val, c]) => (
                <div
                  key={lb}
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "9px 11px",
                    borderTop: `3px solid ${c}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      color: T.muted,
                      marginBottom: 3,
                      fontWeight: 600,
                    }}
                  >
                    {lb}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: c }}>
                    {val == null ? "–" : `${fmtM(Math.abs(val))} so'm`}
                  </div>
                </div>
              ))}
            </div>
            {/* Tabs: Tranzaksiyalar | Maosh */}
            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: 12,
                background: T.card2,
                border: `1px solid ${T.border}`,
                borderRadius: 7,
                padding: 2,
                width: "fit-content",
              }}
            >
              {[
                ["txns", `💳 Tranzaksiyalar (${cf.txns.length})`],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFinTab(k)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 5,
                    border: "none",
                    background: finTab === k ? T.accent : "transparent",
                    color: finTab === k ? "#fff" : T.muted,
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: finTab === k ? 700 : 400,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Transactions tab */}
            {finTab === "txns" &&
              [
                ["income", "💚 KIRIMLAR", T.green],
                ["expense", "🔴 CHIQIMLAR", T.red],
              ].map(([type, title, c]) => {
                const items = cf.txns.filter((t) => t.type === type);
                return (
                  <div key={type} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 7,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: c }}>
                        {title} ({items.length})
                      </span>
                      <button
                        onClick={() => openAdd(type, cur.id)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: `${c}22`,
                          color: c,
                          border: `1px solid ${c}44`,
                          cursor: "pointer",
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      >
                        + Qo'shish
                      </button>
                    </div>
                    {items.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setForm({ ...t, amount: String(t.amount) });
                          setModal("form");
                        }}
                        style={{
                          background: T.card,
                          border: `1px solid ${T.border}`,
                          borderRadius: 7,
                          padding: "8px 11px",
                          marginBottom: 3,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderLeft: `3px solid ${c}44`,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderLeft = `3px solid ${c}`)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderLeft = `3px solid ${c}44`)
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 7,
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: c,
                            }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: T.text,
                              }}
                            >
                              {t.desc || t.cat}
                            </div>
                            <div style={{ fontSize: 8, color: T.muted }}>
                              {t.cat} · {t.date}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 6 }}>
                          <div>
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: c }}
                            >
                              {type === "income" ? "+" : "-"}
                              {t.amount.toLocaleString()} so'm
                              <span style={{fontSize:8,padding:"1px 5px",borderRadius:4,background:(t.paymentMethod||'cash')==="bank"?"#2563eb22":"#05966922",color:(t.paymentMethod||'cash')==="bank"?"#2563eb":"#059669",fontWeight:700,marginLeft:4}}>{(t.paymentMethod||'cash')==="bank"?"BANK":"NAQD"}</span>
                            </div>
                            {t.receipt && (
                              <span style={{ fontSize: 8, color: T.green }}>
                                📎
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTxn(t.id); }}
                            style={{ padding: "3px 7px", borderRadius: 4, background: `${T.red}15`, color: T.red, border: `1px solid ${T.red}33`, cursor: "pointer", fontSize: 10, flexShrink: 0 }}
                          >🗑</button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => openAdd(type, cur.id)}
                      style={{
                        width: "100%",
                        padding: "6px",
                        borderRadius: 5,
                        background: "transparent",
                        color: T.muted,
                        border: `1px dashed ${T.border}`,
                        cursor: "pointer",
                        fontSize: 9,
                      }}
                    >
                      + {type === "income" ? "Kirim" : "Chiqim"} qo'shish
                    </button>
                  </div>
                );
              })}

            {/* Debts tab */}
            {finTab === "salary" && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text,
                    marginBottom: 10,
                  }}
                >
                  💰 Xodimlar maosh xarajatlari
                </div>
                {(() => {
                  const salTxns = txns.filter(
                    (t) =>
                      t.type === "expense" &&
                      [
                        "Oylik maosh",
                        "Maosh",
                        "Avans",
                        "Bonus",
                        "KPI",
                        "Jarima",
                        "Boshqa",
                      ].includes(t.cat),
                  );
                  const totalSal = salTxns.reduce((s, t) => s + t.amount, 0);
                  const byEmp = team
                    .filter((t) => t.role !== "partner")
                    .map((t) => {
                      const et = salTxns.filter(
                        (x) => x.empId === t.id || x.empName === t.name,
                      );
                      return {
                        t,
                        total: et.reduce((s, x) => s + x.amount, 0),
                        list: et,
                      };
                    })
                    .filter((e) => e.total > 0)
                    .sort((a, b) => b.total - a.total);
                  return (
                    <div>
                      <div
                        style={{
                          padding: "8px 12px",
                          background: `${T.red}12`,
                          border: `1px solid ${T.red}33`,
                          borderRadius: 8,
                          marginBottom: 12,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontSize: 11, color: T.muted }}>
                          Jami xodim xarajatlari
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: T.red,
                          }}
                        >
                          {fmtMs(totalSal)} so'm
                        </span>
                      </div>
                      {byEmp.map(({ t, total, list }) => (
                        <div
                          key={t.id}
                          style={{
                            marginBottom: 8,
                            background: T.card2,
                            borderRadius: 8,
                            padding: "10px 12px",
                            border: `1px solid ${T.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: list.length ? 6 : 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 7,
                                alignItems: "center",
                              }}
                            >
                              <Av id={t.id} team={[t]} size={24} />
                              <div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: T.text,
                                  }}
                                >
                                  {t.name}
                                </div>
                                <div style={{ fontSize: 8, color: T.muted }}>
                                  {t.role}
                                </div>
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 900,
                                color: T.red,
                              }}
                            >
                              {fmtMs(total)} so'm
                            </span>
                          </div>
                          {list.slice(0, 3).map((x) => (
                            <div
                              key={x.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 9,
                                color: T.muted,
                                padding: "2px 0",
                                borderTop: `1px solid ${T.border}22`,
                              }}
                            >
                              <span>
                                {x.cat} · {x.date}
                              </span>
                              <span style={{ color: T.red, fontWeight: 600 }}>
                                {fmtMs(x.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {byEmp.length === 0 && (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "20px 0",
                            color: T.muted,
                            fontSize: 11,
                          }}
                        >
                          Xodim xarajatlari yo'q
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {finTab === "debts" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 11, fontWeight: 700, color: T.text }}
                    >
                      ⚠️ Mijoz Qarzlari
                    </div>
                    <div style={{ fontSize: 9, color: T.muted }}>
                      Jami:{" "}
                      {fmtM(curDebts.reduce((s, d) => s + (d.amount || 0), 0))}{" "}
                      so'm · To'lanmagan:{" "}
                      {fmtM(
                        curDebts
                          .filter((d) => !d.paid)
                          .reduce((s, d) => s + (d.amount || 0), 0),
                      )}{" "}
                      so'm
                    </div>
                  </div>
                  <button
                    onClick={() => setModal("debt")}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 6,
                      background: T.accent,
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    + Qarz qo'shish
                  </button>
                </div>
                {curDebts.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px 0",
                      color: T.muted,
                      fontSize: 12,
                    }}
                  >
                    Qarz yo'q ✅
                  </div>
                )}
                {curDebts
                  .sort((a, b) =>
                    !a.paid && b.paid ? -1 : a.paid && !b.paid ? 1 : 0,
                  )
                  .map((d) => (
                    <div
                      key={d.id}
                      style={{
                        background: T.card,
                        border: `1px solid ${d.paid ? T.green + "33" : T.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 6,
                        borderLeft: `3px solid ${d.paid ? T.green : T.red}`,
                        opacity: d.paid ? 0.7 : 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: T.text,
                              }}
                            >
                              {d.category || "Qarz"}
                            </span>
                            {d.paid && (
                              <span
                                style={{
                                  fontSize: 8,
                                  background: `${T.green}22`,
                                  color: T.green,
                                  border: `1px solid ${T.green}44`,
                                  borderRadius: 10,
                                  padding: "0 5px",
                                  fontWeight: 700,
                                }}
                              >
                                ✓ To'langan
                              </span>
                            )}
                            {!d.paid && d.dueDate && isOD(d.dueDate) && (
                              <span
                                style={{
                                  fontSize: 8,
                                  background: `${T.red}22`,
                                  color: T.red,
                                  borderRadius: 10,
                                  padding: "0 5px",
                                  fontWeight: 700,
                                }}
                              >
                                ⚠️ Muddati o'tgan
                              </span>
                            )}
                          </div>
                          {d.desc && (
                            <div
                              style={{
                                fontSize: 9,
                                color: T.muted,
                                marginBottom: 2,
                              }}
                            >
                              {d.desc}
                            </div>
                          )}
                          {d.dueDate && (
                            <div
                              style={{
                                fontSize: 8,
                                color: isOD(d.dueDate) ? T.red : T.muted,
                              }}
                            >
                              📅 {fmtD(d.dueDate)}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: d.paid ? T.green : T.red,
                              marginBottom: 4,
                            }}
                          >
                            {fmtM(d.amount)} so'm
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              onClick={() => toggleDebt(d.id)}
                              style={{
                                padding: "3px 8px",
                                borderRadius: 4,
                                background: d.paid
                                  ? `${T.yellow}22`
                                  : `${T.green}22`,
                                color: d.paid ? T.yellow : T.green,
                                border: `1px solid ${d.paid ? T.yellow + "44" : T.green + "44"}`,
                                cursor: "pointer",
                                fontSize: 8,
                                fontWeight: 600,
                              }}
                            >
                              {d.paid ? "Qaytarish" : "✓ To'landi"}
                            </button>
                            <button
                              onClick={() => deleteDebt(d.id)}
                              style={{
                                padding: "3px 6px",
                                borderRadius: 4,
                                background: `${T.red}22`,
                                color: T.red,
                                border: `1px solid ${T.red}44`,
                                cursor: "pointer",
                                fontSize: 8,
                              }}
                            >
                              {I.trash}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction form modal */}
      {modal === "form" && (
        <Modal onClose={() => setModal(null)} width={420}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>
                {form.type === "income" ? "💚 Kirim qo'shish" : "🔴 Chiqim qo'shish"}
                {form.leadId && cur ? ` — ${cur.name}` : ""}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}>{I.x}</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labS}>Tur</label>
                  <select value={form.type} onChange={e => {
                    const t2 = e.target.value;
                    const cats2 = t2 === "income" ? (config?.txnInc || ["Asosiy kirim","XBA","Shartnoma","Boshqa"]) : (config?.txnExp || ["Xizmat","Transport","Hujjat","Maosh","Boshqa"]);
                    setForm(p => ({ ...p, type: t2, cat: cats2[0] || "" }));
                  }} style={inpS}>
                    <option value="income">Kirim</option>
                    <option value="expense">Chiqim</option>
                  </select>
                </div>
                <div>
                  <label style={labS}>Sana</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inpS} />
                </div>
              </div>
              <div>
                <label style={labS}>Kategoriya</label>
                <select value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value }))} style={inpS}>
                  {(form.type === "income" ? (config?.txnInc || ["Asosiy kirim","XBA","Shartnoma","Boshqa"]) : (config?.txnExp || ["Xizmat","Transport","Hujjat","Maosh","Boshqa"])).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labS}>Tavsif</label>
                <input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} style={inpS} placeholder="Izoh (ixtiyoriy)" />
              </div>
              <div>
                <label style={labS}>Mijoz</label>
                <select value={form.leadId || ""} onChange={e => setForm(p => ({ ...p, leadId: e.target.value || null }))} style={inpS}>
                  <option value="">— Mijoz tanlang —</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labS}>Summa (so'm) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={{ ...inpS, textAlign: "right", fontSize: 16, fontWeight: 800 }} placeholder="0" onKeyDown={e => e.key === "Enter" && save()} />
              </div>
              <div style={{marginBottom:10}}>
                <label style={labS}>To'lov usuli</label>
                <div style={{display:"flex",gap:6,marginTop:4}}>
                  {["cash","bank"].map(m=>(
                    <button key={m} onClick={()=>setForm(p=>({...p,paymentMethod:m}))}
                      style={{flex:1,padding:"7px",borderRadius:7,border:`1px solid ${form.paymentMethod===m?T.accent:T.border}`,
                        background:form.paymentMethod===m?`${T.accent}18`:"transparent",
                        color:form.paymentMethod===m?T.accent:T.muted,fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
                      {m==="cash"?"💵 Naqd":"🏦 Bank"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setModal(null)} style={{ padding: "6px 14px", borderRadius: 6, background: T.card2, color: T.text, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 11 }}>Bekor</button>
              <button onClick={save} style={{ padding: "6px 18px", borderRadius: 6, background: form.type === "income" ? T.green : T.red, color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                💾 Saqlash
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Debt modal */}
      {modal === "debt" && (
        <Modal onClose={() => setModal(null)} width={400}>
          <div style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  color: T.text,
                }}
              >
                ⚠️ Qarz qo'shish — {cur?.name}
              </h3>
              <button
                onClick={() => setModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: T.muted,
                }}
              >
                {I.x}
              </button>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 7,
                }}
              >
                <div>
                  <label style={labS}>Summa (so'm) *</label>
                  <input
                    type="number"
                    value={debtForm.amt}
                    onChange={(e) => df("amt", e.target.value)}
                    style={inpS}
                    placeholder="1000000"
                  />
                </div>
                <div>
                  <label style={labS}>Muddat</label>
                  <input
                    type="date"
                    value={debtForm.due}
                    onChange={(e) => df("due", e.target.value)}
                    style={inpS}
                  />
                </div>
              </div>
              <div>
                <label style={labS}>Kategoriya</label>
                <select
                  value={debtForm.cat}
                  onChange={(e) => df("cat", e.target.value)}
                  style={inpS}
                >
                  {[
                    "1-Qism",
                    "2-Qism",
                    "3-Qism",
                    "XBA To'lov",
                    "Konsultatsiya",
                    "Hujjat xizmati",
                    "Boshqa",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labS}>Tavsif</label>
                <input
                  value={debtForm.desc}
                  onChange={(e) => df("desc", e.target.value)}
                  style={inpS}
                  placeholder="Qarz sababi..."
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 5,
                  background: T.card2,
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                Bekor
              </button>
              <button
                onClick={() => {
                  const amt = parseFloat(debtForm.amt) || 0;
                  if (!amt) return;
                  setDebts((p) => [
                    ...p,
                    {
                      id: uid(),
                      leadId: cur.id,
                      name: cur.name,
                      type: "client",
                      category: debtForm.cat,
                      dueDate: debtForm.due,
                      desc: debtForm.desc,
                      amount: amt,
                      paid: false,
                      createdAt: new Date().toISOString().slice(0, 10),
                      by: user.id,
                    },
                  ]);
                  setDebtForm({ amt: "", due: "", cat: "1-Qism", desc: "" });
                  setModal(null);
                }}
                style={{
                  padding: "5px 14px",
                  borderRadius: 5,
                  background: T.accent,
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                💾 Saqlash
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export { Finance };
