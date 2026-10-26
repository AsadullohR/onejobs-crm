import { useState, useMemo, useEffect } from "react";
import { useT } from "./theme.js";
import { isPayrollTxn } from "./constants.js";
import { fmtMs, inp } from "./helpers.jsx";

const ORIGINS = {
  client:   { label: "Mijoz",   c: "#2563eb" },
  staff:    { label: "Xodim",   c: "#7c3aed" },
  external: { label: "Tashqi",  c: "#d97706" },
  other:    { label: "Boshqa",  c: "#64748b" },
};
const PAGE = 200;
const todayISO = () => new Date().toISOString().slice(0, 10);

function useNarrow() {
  const [n, setN] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const f = () => setN(window.innerWidth < 768);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return n;
}

function AllTransactions({ txns, extExps, leads }) {
  const T = useT();
  const narrow = useNarrow();
  txns = txns || [];
  extExps = extExps || [];
  leads = leads || [];
  const inpS = inp(T);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [allTime, setAllTime] = useState(false);
  const [kind, setKind] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [method, setMethod] = useState("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const leadName = new Map(leads.map((l) => [l.id, l.name]));
    const out = [];
    for (const t of txns) {
      out.push({
        key: "t" + t.id,
        date: t.date || "",
        kind: t.type === "income" ? "income" : "expense",
        origin: t.leadId ? "client" : isPayrollTxn(t) ? "staff" : "other",
        who: t.leadId ? (leadName.get(t.leadId) || t.leadId) : (t.empName || ""),
        leadId: t.leadId || "",
        cat: t.cat || "",
        desc: t.desc || "",
        amount: Number(t.amount) || 0,
        method: t.paymentMethod || "cash",
      });
    }
    for (const e of extExps) {
      out.push({
        key: "e" + e.id,
        date: String(e.date || "").slice(0, 10),
        kind: e.type === "income" ? "income" : "expense",
        origin: "external",
        who: "",
        leadId: "",
        cat: e.category || "",
        desc: e.description || "",
        amount: Number(e.amount) || 0,
        method: e.paymentMethod || e.payment_method || "cash",
      });
    }
    return out.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [txns, extExps, leads]);

  const cats = useMemo(() => [...new Set(rows.map((r) => r.cat).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!allTime && month && !r.date.startsWith(month)) return false;
      if (kind !== "all" && r.kind !== kind) return false;
      if (origin !== "all" && r.origin !== origin) return false;
      if (method !== "all" && r.method !== method) return false;
      if (cat !== "all" && r.cat !== cat) return false;
      if (needle && !`${r.who} ${r.leadId} ${r.cat} ${r.desc}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, month, allTime, kind, origin, method, cat, q]);

  const inc = filtered.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
  const exp = filtered.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);

  const byOrigin = useMemo(() => {
    const m = {};
    for (const r of filtered) {
      const o = (m[r.origin] ||= { inc: 0, exp: 0 });
      if (r.kind === "income") o.inc += r.amount; else o.exp += r.amount;
    }
    return m;
  }, [filtered]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Sana", "Tur", "Manba", "Kim / Mijoz", "ID", "Kategoriya", "Izoh", "Summa", "To'lov usuli"];
    const lines = filtered.map((r) =>
      [r.date, r.kind === "income" ? "Kirim" : "Chiqim", ORIGINS[r.origin].label, r.who, r.leadId, r.cat, r.desc, r.amount, r.method === "bank" ? "Bank" : "Naqd"].map(esc).join(","));
    const blob = new Blob(["﻿" + head.map(esc).join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `operatsiyalar-${allTime ? "hammasi" : month}.csv`;
    a.click();
  };

  const chip = (active, color) => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${active ? color : T.border}`, background: active ? `${color}18` : "transparent",
    color: active ? color : T.muted,
  });
  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" };
  const th = { textAlign: "left", fontSize: 10, color: T.muted, fontWeight: 700, padding: "8px 10px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
  const td = { fontSize: 12, padding: "8px 10px", borderBottom: `1px solid ${T.border}`, color: T.text, verticalAlign: "top" };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 14 }}>
        {[
          ["💰 KIRIM", inc, T.green],
          ["💸 CHIQIM", exp, T.red],
          ["⚖️ FARQ", inc - exp, inc - exp >= 0 ? T.green : T.red],
        ].map(([lb, v, c]) => (
          <div key={lb} style={card}>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{lb}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{fmtMs(v)} <span style={{ fontSize: 11 }}>so'm</span></div>
          </div>
        ))}
        <div style={card}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>OPERATSIYALAR</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{filtered.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {Object.entries(ORIGINS).map(([k, o]) => byOrigin[k] && (
          <button key={k} onClick={() => setOrigin(origin === k ? "all" : k)} style={chip(origin === k, o.c)}>
            {o.label}: +{fmtMs(byOrigin[k].inc)} / −{fmtMs(byOrigin[k].exp)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input type="month" value={month} disabled={allTime} onChange={(e) => { setMonth(e.target.value); setShown(PAGE); }} style={{ ...inpS, width: 150 }} />
        <button onClick={() => { setAllTime(!allTime); setShown(PAGE); }} style={chip(allTime, T.accent)}>Barcha vaqt</button>
        {[["all", "Hammasi", T.accent], ["income", "Kirim", T.green], ["expense", "Chiqim", T.red]].map(([k, lb, c]) => (
          <button key={k} onClick={() => { setKind(k); setShown(PAGE); }} style={chip(kind === k, c)}>{lb}</button>
        ))}
        <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ ...inpS, width: 110 }}>
          <option value="all">Barcha usul</option><option value="cash">Naqd</option><option value="bank">Bank</option>
        </select>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setShown(PAGE); }} style={{ ...inpS, width: 160 }}>
          <option value="all">Barcha kategoriya</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Qidirish: mijoz, ID, izoh…" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} style={{ ...inpS, flex: 1, minWidth: 180 }} />
        <button onClick={exportCsv} style={chip(false, T.muted)}>⬇ CSV</button>
      </div>

      {narrow ? (
        <div>
          {filtered.slice(0, shown).map((r) => (
            <div key={r.key} style={{ ...card, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.who || r.desc || r.cat || "—"}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                  <span style={{ fontWeight: 700, color: ORIGINS[r.origin].c }}>{ORIGINS[r.origin].label}</span> · {r.cat || "—"} · {r.date}{r.leadId ? ` · ${r.leadId}` : ""}
                </div>
                {r.who && r.desc && <div style={{ fontSize: 10, color: T.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.desc}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: r.kind === "income" ? T.green : T.red }}>{r.kind === "income" ? "+" : "−"}{fmtMs(r.amount)}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: r.method === "bank" ? "#2563eb" : "#059669" }}>{r.method === "bank" ? "BANK" : "NAQD"}</div>
              </div>
            </div>
          ))}
          {!filtered.length && <div style={{ textAlign: "center", color: T.muted, fontSize: 12, padding: 24 }}>Operatsiya topilmadi</div>}
        </div>
      ) : (
      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>Sana</th><th style={th}>Manba</th><th style={th}>Kim / Mijoz</th>
              <th style={th}>Kategoriya</th><th style={th}>Izoh</th><th style={{ ...th, textAlign: "right" }}>Summa</th><th style={th}>Usul</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, shown).map((r) => (
              <tr key={r.key}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{r.date}</td>
                <td style={td}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${ORIGINS[r.origin].c}22`, color: ORIGINS[r.origin].c }}>{ORIGINS[r.origin].label}</span>
                </td>
                <td style={td}>{r.who || "—"}{r.leadId && <div style={{ fontSize: 10, color: T.muted }}>{r.leadId}</div>}</td>
                <td style={td}>{r.cat || "—"}</td>
                <td style={{ ...td, color: T.muted, maxWidth: 280 }}>{r.desc}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: r.kind === "income" ? T.green : T.red }}>
                  {r.kind === "income" ? "+" : "−"}{fmtMs(r.amount)}
                </td>
                <td style={{ ...td, fontSize: 10, fontWeight: 700, color: r.method === "bank" ? "#2563eb" : "#059669" }}>{r.method === "bank" ? "BANK" : "NAQD"}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: T.muted, padding: 28 }}>Operatsiya topilmadi</td></tr>}
          </tbody>
        </table>
      </div>
      )}
      {filtered.length > shown && (
        <button onClick={() => setShown(shown + PAGE)} style={{ ...chip(false, T.accent), marginTop: 10 }}>
          Yana {Math.min(PAGE, filtered.length - shown)} ta ko'rsatish ({filtered.length - shown} qoldi)
        </button>
      )}
    </div>
  );
}

export { AllTransactions };
