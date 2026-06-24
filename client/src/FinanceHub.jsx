import { useState, useEffect, useMemo } from "react";
import { useT } from "./theme.js";
import { DONE } from "./constants.js";
import { uid, fmtMs, fmtD, inp, I } from "./helpers.jsx";
import { Finance } from "./Finance.jsx";
import { SalaryPage } from "./SalaryPage.jsx";
import { DebtsPage } from "./DebtsPage.jsx";
import { extExpAPI } from "./api.js";

// ─── EXTERNAL EXPENSES TAB ────────────────────────────────────────────────────
const EXT_CATS = ["Ofis ijara", "Kommunal", "Marketing", "Reklama", "Transport", "Jihozlar", "Soliq", "Boshqa"];

function ExternalExpenses({ user, addNotif }) {
  const T = useT();
  const inpS = inp(T);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), category: "Ofis ijara", description: "", amount: "", recurring: false });
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState({});
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0,7));
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    extExpAPI.getAll().then(r => { setItems(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => items.filter(i => {
    const monthMatch = filterMonth ? i.date?.startsWith(filterMonth) : true;
    const catMatch = filterCat === "all" || i.category === filterCat;
    return monthMatch && catMatch;
  }), [items, filterMonth, filterCat]);

  const total = filtered.reduce((s, i) => s + Number(i.amount), 0);
  const allTotal = items.reduce((s, i) => s + Number(i.amount), 0);

  const add = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    try {
      const saved = await extExpAPI.create({ ...form, amount: Number(form.amount) });
      setItems(p => [saved, ...p]);
      setForm(p => ({ ...p, description: "", amount: "", recurring: false }));
      addNotif(`💸 Xarajat qo'shildi: ${saved.category}`);
    } catch (e) { alert(e.message); }
  };

  const del = async (id) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
      await extExpAPI.delete(id);
      setItems(p => p.filter(i => i.id !== id));
    } catch (e) { alert("O'chirishda xatolik: " + e.message); }
  };

  const saveEdit = async (id) => {
    try {
      const saved = await extExpAPI.update(id, { ...items.find(i => i.id === id), ...editVal, amount: Number(editVal.amount) });
      setItems(p => p.map(i => i.id === id ? saved : i));
      setEditId(null); setEditVal({});
    } catch (e) { alert("Saqlashda xatolik: " + e.message); }
  };

  if (loading) return <div style={{ color: T.muted, padding: 40, textAlign: "center" }}>Yuklanmoqda...</div>;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          ["💸", "BU OY", fmtMs(total) + " so'm", T.red],
          ["📅", "JAMI BARCHA VAQT", fmtMs(allTotal) + " so'm", T.red],
          ["📦", "YOZUVLAR SONI", filtered.length + " ta", T.text],
        ].map(([ic, lb, val, c]) => (
          <div key={lb} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{ic} {lb}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ ...inpS, width: "auto", fontSize: 11, padding: "5px 10px" }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ ...inpS, width: "auto", fontSize: 11, padding: "5px 10px" }}>
          <option value="all">Barcha kategoriyalar</option>
          {EXT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Add form */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 12 }}>+ Yangi xarajat</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="date" value={form.date} onChange={e => f("date", e.target.value)}
            style={{ ...inpS, flex: "0 0 auto", fontSize: 11 }} />
          <select value={form.category} onChange={e => f("category", e.target.value)}
            style={{ ...inpS, flex: "1 1 140px", fontSize: 11 }}>
            {EXT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="Izoh (ixtiyoriy)" value={form.description} onChange={e => f("description", e.target.value)}
            style={{ ...inpS, flex: "2 1 200px", fontSize: 11 }}
            onKeyDown={e => e.key === "Enter" && add()} />
          <input type="number" placeholder="Miqdor (so'm)" value={form.amount} onChange={e => f("amount", e.target.value)}
            style={{ ...inpS, flex: "0 0 160px", fontSize: 11, textAlign: "right" }}
            onKeyDown={e => e.key === "Enter" && add()} />
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.muted, cursor: "pointer" }}>
            <input type="checkbox" checked={form.recurring} onChange={e => f("recurring", e.target.checked)} />
            Oylik
          </label>
          <button onClick={add}
            style={{ padding: "6px 18px", borderRadius: 7, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            + Qo'shish
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        {filtered.length === 0
          ? <div style={{ color: T.muted, textAlign: "center", padding: 40, fontSize: 12 }}>Xarajat yo'q</div>
          : filtered.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
              {editId === item.id ? (
                <>
                  <input type="date" value={editVal.date ?? item.date} onChange={e => setEditVal(p => ({ ...p, date: e.target.value }))}
                    style={{ ...inpS, width: 130, fontSize: 11 }} />
                  <select value={editVal.category ?? item.category} onChange={e => setEditVal(p => ({ ...p, category: e.target.value }))}
                    style={{ ...inpS, flex: 1, fontSize: 11 }}>
                    {EXT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={editVal.description ?? item.description ?? ""} onChange={e => setEditVal(p => ({ ...p, description: e.target.value }))}
                    style={{ ...inpS, flex: 2, fontSize: 11 }} />
                  <input type="number" value={editVal.amount ?? item.amount} onChange={e => setEditVal(p => ({ ...p, amount: e.target.value }))}
                    style={{ ...inpS, width: 130, fontSize: 11, textAlign: "right" }} />
                  <button onClick={() => saveEdit(item.id)} style={{ padding: "4px 11px", borderRadius: 5, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>✓</button>
                  <button onClick={() => { setEditId(null); setEditVal({}); }} style={{ padding: "4px 9px", borderRadius: 5, background: T.card2, color: T.muted, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 10 }}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 10, color: T.muted, minWidth: 80 }}>{item.date}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, minWidth: 110 }}>{item.category}</span>
                  <span style={{ fontSize: 11, color: T.muted, flex: 1 }}>{item.description || "—"}</span>
                  {item.recurring && <span style={{ fontSize: 9, background: `${T.accent}22`, color: T.accent, borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>oylik</span>}
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.red, minWidth: 120, textAlign: "right" }}>-{fmtMs(item.amount)} so'm</span>
                  <button onClick={() => { setEditId(item.id); setEditVal({ date: item.date, category: item.category, description: item.description, amount: item.amount }); }}
                    style={{ padding: "4px 10px", borderRadius: 6, background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}33`, cursor: "pointer", fontSize: 10 }}>✏️</button>
                  <button onClick={() => del(item.id)}
                    style={{ padding: "4px 10px", borderRadius: 6, background: `${T.red}15`, color: T.red, border: `1px solid ${T.red}33`, cursor: "pointer", fontSize: 10 }}>🗑</button>
                </>
              )}
            </div>
          ))}
        {filtered.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 11, color: T.muted, marginRight: 10 }}>Jami:</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: T.red }}>-{fmtMs(total)} so'm</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RECENT PAYERS ───────────────────────────────────────────────────────────
function RecentPayers({ filtTxns, leads, T }) {
  const [showAll, setShowAll] = useState(false);

  const payers = useMemo(() => {
    // Group income txns by leadId
    const byLead = {};
    filtTxns.filter(t => t.type === "income" && t.leadId).forEach(t => {
      if (!byLead[t.leadId]) byLead[t.leadId] = { totalInc: 0, lastDate: "", txnCount: 0 };
      byLead[t.leadId].totalInc += t.amount;
      byLead[t.leadId].txnCount += 1;
      if (!byLead[t.leadId].lastDate || t.date > byLead[t.leadId].lastDate) byLead[t.leadId].lastDate = t.date;
    });
    // Also sum expenses per lead
    const expByLead = {};
    filtTxns.filter(t => t.type === "expense" && t.leadId).forEach(t => {
      expByLead[t.leadId] = (expByLead[t.leadId] || 0) + t.amount;
    });
    return Object.entries(byLead)
      .map(([id, data]) => {
        const lead = leads.find(l => l.id === id);
        return { id, name: lead?.name || id, status: lead?.status || "—", totalInc: data.totalInc, totalExp: expByLead[id] || 0, lastDate: data.lastDate, txnCount: data.txnCount };
      })
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [filtTxns, leads]);

  const visible = showAll ? payers : payers.slice(0, 10);

  if (payers.length === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>💳 To'lov qilgan mijozlar <span style={{ fontSize: 10, color: T.muted, fontWeight: 400 }}>({payers.length} ta)</span></div>
        {payers.length > 10 && (
          <button onClick={() => setShowAll(s => !s)} style={{ fontSize: 10, color: T.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            {showAll ? "Kamroq ko'rish" : `Barchasini ko'rish (${payers.length})`}
          </button>
        )}
      </div>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 90px 80px", gap: 0, padding: "7px 20px", background: T.card2, fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>
        <span>Mijoz</span>
        <span style={{ textAlign: "right" }}>Kirim</span>
        <span style={{ textAlign: "right" }}>Chiqim</span>
        <span style={{ textAlign: "right" }}>Balans</span>
        <span style={{ textAlign: "right" }}>Oxirgi to'lov</span>
        <span style={{ textAlign: "center" }}>To'lovlar</span>
      </div>
      {visible.map((p, i) => {
        const net = p.totalInc - p.totalExp;
        return (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 90px 80px", gap: 0, padding: "10px 20px", borderTop: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : `${T.border}30`, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{p.name}</div>
              <div style={{ fontSize: 9, color: T.muted }}>{p.id} · {p.status}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.green, textAlign: "right" }}>{fmtMs(p.totalInc)}</div>
            <div style={{ fontSize: 11, color: T.red, textAlign: "right" }}>{p.totalExp > 0 ? `-${fmtMs(p.totalExp)}` : "—"}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: net >= 0 ? T.green : T.red, textAlign: "right" }}>{net >= 0 ? "+" : ""}{fmtMs(net)}</div>
            <div style={{ fontSize: 10, color: T.muted, textAlign: "right" }}>{p.lastDate}</div>
            <div style={{ fontSize: 10, color: T.muted, textAlign: "center" }}>{p.txnCount} ta</div>
          </div>
        );
      })}
      {/* Total row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 90px 80px", gap: 0, padding: "10px 20px", borderTop: `2px solid ${T.border}`, background: T.card2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>JAMI ({payers.length} mijoz)</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.green, textAlign: "right" }}>{fmtMs(payers.reduce((s, p) => s + p.totalInc, 0))}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.red, textAlign: "right" }}>-{fmtMs(payers.reduce((s, p) => s + p.totalExp, 0))}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.text, textAlign: "right" }}>{fmtMs(payers.reduce((s, p) => s + p.totalInc - p.totalExp, 0))}</div>
        <div />
        <div style={{ fontSize: 10, color: T.muted, textAlign: "center" }}>{payers.reduce((s,p)=>s+p.txnCount,0)} ta</div>
      </div>
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function FinanceDashboard({ txns, leads, extExps }) {
  const T = useT();
  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const inpS = inp(T);

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (range === "week") { const s = new Date(now - 7 * 864e5); return d >= s; }
    if (range === "month") { return d >= new Date(now.getFullYear(), now.getMonth(), 1); }
    if (range === "quarter") { const q = Math.floor(now.getMonth() / 3); return d >= new Date(now.getFullYear(), q * 3, 1); }
    if (range === "year") { return d.getFullYear() === now.getFullYear(); }
    if (range === "custom" && customFrom && customTo) { return d >= new Date(customFrom) && d <= new Date(customTo + "T23:59:59"); }
    return true;
  };

  const filtTxns = txns.filter(t => inRange(t.date));
  const filtExt  = extExps.filter(e => inRange(e.date));

  const income  = filtTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const salaries = filtTxns.filter(t => t.type === "expense" &&
    ["Oylik maosh","Avans","Bonus","KPI","Jarima","Maosh"].includes(t.cat)).reduce((s, t) => s + t.amount, 0);
  const clientExp = filtTxns.filter(t => t.type === "expense" &&
    !["Oylik maosh","Avans","Bonus","KPI","Jarima","Maosh"].includes(t.cat)).reduce((s, t) => s + t.amount, 0);
  const extTotal  = filtExt.reduce((s, e) => s + Number(e.amount), 0);
  const totalExp  = salaries + clientExp + extTotal;
  const profit    = income - totalExp;
  const outstanding = leads.filter(l => l.sofFoyda).reduce((s, l) => s + Number(l.sofFoyda || 0), 0);

  const RANGES = [
    { k: "week",    l: "Hafta" },
    { k: "month",   l: "Oy" },
    { k: "quarter", l: "Kvartal" },
    { k: "year",    l: "Yil" },
    { k: "custom",  l: "Sana" },
  ];

  const cashIncome = filtTxns.filter(t=>t.type==="income"&&(t.paymentMethod||t.payment_method)==="cash").reduce((s,t)=>s+t.amount,0);
  const bankIncome = filtTxns.filter(t=>t.type==="income"&&(t.paymentMethod||t.payment_method)==="bank").reduce((s,t)=>s+t.amount,0);
  const cashExp = filtTxns.filter(t=>t.type==="expense"&&(t.paymentMethod||t.payment_method)==="cash").reduce((s,t)=>s+t.amount,0);
  const bankExp = filtTxns.filter(t=>t.type==="expense"&&(t.paymentMethod||t.payment_method)==="bank").reduce((s,t)=>s+t.amount,0);
  const cashBalance = cashIncome - cashExp;
  const bankBalance = bankIncome - bankExp;

  const cards = [
    { ic: "📥", lb: "OLINGAN TO'LOVLAR",     val: fmtMs(income) + " so'm",      c: T.green,  sub: "Mijozlardan qabul qilingan pul" },
    { ic: "💰", lb: "UMUMIY TASDIQLANGAN FOYDA", val: fmtMs(outstanding) + " so'm", c: T.yellow, sub: "Barcha vaqt: Jo'nab ketdi holatidagi sof foyda (filtrga bog'liq emas)" },
    { ic: "⚖️", lb: "JORIY BALANS HISOBI",   val: fmtMs(profit) + " so'm",      c: profit >= 0 ? T.green : T.red, sub: "Kirim − Barcha xarajatlar (joriy P&L)" },
    { ic: "📤", lb: "XARAJAT JAMI",          val: fmtMs(totalExp) + " so'm",    c: T.red,    sub: `Maosh ${fmtMs(salaries)} · Mijoz ${fmtMs(clientExp)} · Tashqi ${fmtMs(extTotal)}` },
    { ic: "👷", lb: "MAOSH XARAJATI",        val: fmtMs(salaries) + " so'm",    c: T.red,    sub: "Xodimlar maoshi va bonuslari" },
    { ic: "🏢", lb: "TASHQI XARAJAT",        val: fmtMs(extTotal) + " so'm",    c: T.red,    sub: "Ijara, kommunal, marketing..." },
    { ic: "💵", lb: "NAQD PUL BALANSI",      val: fmtMs(cashBalance) + " so'm", c: cashBalance>=0?T.green:T.red, sub: `Kirim: ${fmtMs(cashIncome)} · Chiqim: ${fmtMs(cashExp)}` },
    { ic: "🏦", lb: "BANK BALANSI",          val: fmtMs(bankBalance) + " so'm", c: bankBalance>=0?T.green:T.red, sub: `Kirim: ${fmtMs(bankIncome)} · Chiqim: ${fmtMs(bankExp)}` },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Range picker */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {RANGES.map(r => (
          <button key={r.k} onClick={() => setRange(r.k)}
            style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: range === r.k ? T.accent : T.card, color: range === r.k ? "#fff" : T.muted,
              border: `1px solid ${range === r.k ? T.accent : T.border}` }}>
            {r.l}
          </button>
        ))}
        {range === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...inpS, width: "auto", fontSize: 11 }} />
            <span style={{ color: T.muted, fontSize: 11 }}>—</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ ...inpS, width: "auto", fontSize: 11 }} />
          </>
        )}
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {cards.map(({ ic, lb, val, c, sub }) => (
          <div key={lb} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.5 }}>{lb}</span>
              <span style={{ fontSize: 20, opacity: 0.5 }}>{ic}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: c, lineHeight: 1, marginBottom: 6 }}>{val}</div>
            <div style={{ fontSize: 9, color: T.muted }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, marginBottom: 16 }}>
        {/* Bar chart — last 6 months income vs expenses */}
        <BarChart txns={txns} extExps={extExps} T={T} />
        {/* Donut chart — expense breakdown */}
        <DonutChart salaries={salaries} clientExp={clientExp} extTotal={extTotal} T={T} />
      </div>

      {/* Expense breakdown bars */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 14 }}>Xarajat taqsimoti</div>
        {totalExp === 0
          ? <div style={{ color: T.muted, fontSize: 11 }}>Bu davrda xarajat yo'q</div>
          : [
              { lb: "Maosh va bonus", val: salaries, c: "#ef4444" },
              { lb: "Mijoz xarajatlari", val: clientExp, c: "#f59e0b" },
              { lb: "Tashqi xarajatlar", val: extTotal, c: "#8b5cf6" },
            ].map(({ lb, val, c }) => {
              const pct = totalExp > 0 ? Math.round((val / totalExp) * 100) : 0;
              return (
                <div key={lb} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: T.text }}>{lb}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{fmtMs(val)} so'm ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: T.card2, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
      </div>

      {/* Recent paid customers */}
      <RecentPayers filtTxns={filtTxns} leads={leads} T={T} />
    </div>
  );
}

// ─── BAR CHART: last 6 months income vs total expenses ───────────────────────
function BarChart({ txns, extExps, T }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, label: d.toLocaleString("uz", { month: "short" }) };
    });
  }, []);

  const SALARY_CATS = ["Oylik maosh","Avans","Bonus","KPI","Jarima","Maosh"];
  const data = useMemo(() => months.map(({ key }) => {
    const inc = txns.filter(t => t.type==="income" && t.date?.startsWith(key)).reduce((s,t)=>s+t.amount,0);
    const sal = txns.filter(t => t.type==="expense" && SALARY_CATS.includes(t.cat) && t.date?.startsWith(key)).reduce((s,t)=>s+t.amount,0);
    const cl  = txns.filter(t => t.type==="expense" && !SALARY_CATS.includes(t.cat) && t.date?.startsWith(key)).reduce((s,t)=>s+t.amount,0);
    const ext = extExps.filter(e => e.date?.startsWith(key)).reduce((s,e)=>s+Number(e.amount),0);
    return { inc, exp: sal+cl+ext };
  }), [txns, extExps, months]);

  const maxVal = Math.max(...data.flatMap(d => [d.inc, d.exp]), 1);
  const W=480, H=160, PL=8, PR=8, PT=16, PB=30, bw=26, gap=16;
  const grpW = bw*2+4;
  const totalW = months.length*(grpW+gap)-gap;
  const startX = PL + (W-PL-PR-totalW)/2;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 4 }}>Oylik Kirim / Chiqim</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 9, color: T.muted }}>
        <span><span style={{ display:"inline-block", width:8, height:8, borderRadius:2, background:"#22c55e", marginRight:4 }}/>Kirim</span>
        <span><span style={{ display:"inline-block", width:8, height:8, borderRadius:2, background:"#ef4444", marginRight:4 }}/>Chiqim</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", overflow:"visible" }}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map(f => {
          const y = PT + (H-PT-PB)*(1-f);
          return <line key={f} x1={PL} x2={W-PR} y1={y} y2={y} stroke={T.border} strokeWidth="0.5" />;
        })}
        {data.map((d, i) => {
          const gx = startX + i*(grpW+gap);
          const chartH = H-PT-PB;
          const incH = maxVal > 0 ? (d.inc/maxVal)*chartH : 0;
          const expH = maxVal > 0 ? (d.exp/maxVal)*chartH : 0;
          return (
            <g key={i}>
              {/* Income bar */}
              <rect x={gx} y={PT+chartH-incH} width={bw} height={incH} rx={3} fill="#22c55e" opacity="0.85" />
              {/* Expense bar */}
              <rect x={gx+bw+4} y={PT+chartH-expH} width={bw} height={expH} rx={3} fill="#ef4444" opacity="0.85" />
              {/* Month label */}
              <text x={gx+grpW/2} y={H-4} textAnchor="middle" fontSize="8" fill={T.muted}>{months[i].label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── DONUT CHART: expense category breakdown ──────────────────────────────────
function DonutChart({ salaries, clientExp, extTotal, T }) {
  const total = salaries + clientExp + extTotal;
  const segs = [
    { lb: "Maosh", val: salaries, c: "#ef4444" },
    { lb: "Mijoz", val: clientExp, c: "#f59e0b" },
    { lb: "Tashqi", val: extTotal, c: "#8b5cf6" },
  ];
  const R=60, r=36, cx=80, cy=80;

  const paths = useMemo(() => {
    if (total === 0) return [];
    let angle = -Math.PI/2;
    return segs.map(s => {
      const sweep = (s.val/total)*2*Math.PI;
      const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
      angle += sweep;
      const x2=cx+R*Math.cos(angle), y2=cy+R*Math.sin(angle);
      const xi=cx+r*Math.cos(angle-sweep), yi=cy+r*Math.sin(angle-sweep);
      const xj=cx+r*Math.cos(angle), yj=cy+r*Math.sin(angle);
      const lg = sweep > Math.PI ? 1 : 0;
      return { d: `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${xj} ${yj} A ${r} ${r} 0 ${lg} 0 ${xi} ${yi} Z`, c: s.c, val: s.val, lb: s.lb };
    });
  }, [salaries, clientExp, extTotal]);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }}>Xarajat Ulushi</div>
      {total === 0
        ? <div style={{ color: T.muted, fontSize: 11, padding: "20px 0" }}>Ma'lumot yo'q</div>
        : <>
            <svg viewBox="0 0 160 160" style={{ width: "100%", maxWidth: 160, display: "block", margin: "0 auto" }}>
              {paths.map((p,i) => <path key={i} d={p.d} fill={p.c} opacity="0.9" />)}
              <text x={cx} y={cy-6} textAnchor="middle" fontSize="9" fill={T.muted}>Jami</text>
              <text x={cx} y={cy+8} textAnchor="middle" fontSize="11" fontWeight="bold" fill={T.text}>{Math.round(total/1e6)}M</text>
            </svg>
            <div style={{ marginTop: 10 }}>
              {segs.map(s => {
                const pct = total > 0 ? Math.round((s.val/total)*100) : 0;
                return (
                  <div key={s.lb} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5, fontSize:10 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:s.c, flexShrink:0, display:"inline-block" }}/>
                    <span style={{ color:T.muted, flex:1 }}>{s.lb}</span>
                    <span style={{ color:T.text, fontWeight:700 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
      }
    </div>
  );
}

// ─── FINANCE HUB ─────────────────────────────────────────────────────────────
function FinanceHub({ leads, setLeads, team, user, txns, setTxns, config, addNotif, debts, setDebts, roles, extExps=[], setExtExps }) {
  const T = useT();
  const [tab, setTab] = useState("dashboard");
  const canSalary = roles[user?.role]?.canSalary;
  const TABS = [
    { k: "dashboard", l: "📊 Dashboard" },
    { k: "clients",   l: "💼 Mijozlar Moliyasi" },
    ...(canSalary ? [{ k: "salary", l: "👷 Xodim Xarajatlari" }] : []),
    { k: "external",  l: "🏢 Tashqi Xarajatlar" },
    { k: "debts",     l: "⚠️ Qarzlar" },
  ];

  const tabStyle = (k) => ({
    padding: "9px 18px", borderRadius: "8px 8px 0 0", fontSize: 12, fontWeight: 700,
    cursor: "pointer", border: `1px solid ${T.border}`, borderBottom: "none",
    background: tab === k ? T.bg : T.card2,
    color: tab === k ? T.accent : T.muted,
    borderColor: tab === k ? T.border : "transparent",
    marginRight: 3,
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", padding: "12px 18px 0", background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={tabStyle(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 18px" }}>
        {tab === "dashboard" && (
          <FinanceDashboard txns={txns} leads={leads} extExps={extExps} />
        )}
        {tab === "clients" && (
          <Finance leads={leads} setLeads={setLeads} team={team} user={user}
            txns={txns} setTxns={setTxns} config={config} addNotif={addNotif}
            debts={debts} setDebts={setDebts} extExps={extExps} />
        )}
        {tab === "salary" && (
          <SalaryPage team={team} txns={txns} setTxns={setTxns} user={user} />
        )}
        {tab === "external" && (
          <ExternalExpenses user={user} addNotif={addNotif} />
        )}
        {tab === "debts" && (
          <DebtsPage debts={debts} setDebts={setDebts} user={user} leads={leads} />
        )}
      </div>
    </div>
  );
}

export { FinanceHub };
