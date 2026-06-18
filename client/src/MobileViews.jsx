import { useState, useMemo } from "react";
import { useT } from "./theme.js";
import { STAGES, DONE, LOST, gS } from "./constants.js";
import { uid, fmtMs, fmtD, isOD, isSoon, inp, lab, I, Av } from "./helpers.jsx";
import { txnAPI, tasksAPI } from "./api.js";

// ─── MOBILE FINANCE ───────────────────────────────────────────────────────────
export function MobileFinance({ txns, setTxns, leads, extExps, user, config, addNotif }) {
  const T = useT();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const cashIncome = txns.filter(t => t.type === "income" && (t.paymentMethod || "cash") === "cash").reduce((s, t) => s + t.amount, 0);
  const bankIncome = txns.filter(t => t.type === "income" && (t.paymentMethod || "cash") === "bank").reduce((s, t) => s + t.amount, 0);
  const cashExp = txns.filter(t => t.type === "expense" && (t.paymentMethod || "cash") === "cash").reduce((s, t) => s + t.amount, 0);
  const bankExp = txns.filter(t => t.type === "expense" && (t.paymentMethod || "cash") === "bank").reduce((s, t) => s + t.amount, 0);
  const cashBalance = cashIncome - cashExp;
  const bankBalance = bankIncome - bankExp;

  const recent = [...txns].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 20);

  const openForm = (type) => {
    const cats = type === "income"
      ? (config?.txnInc || ["XBA To'lov","1-Qism","2-Qism","3-Qism","Bonus","Boshqa"])
      : (config?.txnExp || ["Maosh","Avans","Bonus","Reklama","Transport","Boshqa"]);
    setForm({
      id: uid(),
      type,
      leadId: "",
      date: new Date().toISOString().slice(0, 10),
      cat: cats[0] || "",
      desc: "",
      amount: "",
      paymentMethod: "cash",
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
      paymentMethod: form.paymentMethod || "cash",
    };
    try {
      const saved = await txnAPI.create(payload);
      setTxns(p => [...p, {
        id: String(saved.id), leadId: saved.lead_id, type: saved.type,
        cat: saved.category || "", desc: saved.description || "",
        amount: Number(saved.amount), date: saved.date?.slice(0, 10) || payload.date,
        by: saved.created_by, paymentMethod: saved.payment_method || "cash",
      }]);
      addNotif && addNotif("Tranzaksiya saqlandi");
      setModal(null);
    } catch (err) { alert("Saqlanmadi: " + err.message); }
  };

  const summaryPills = [
    { label: "Kirim", val: fmtMs(income), c: T.green },
    { label: "Chiqim", val: fmtMs(expense), c: T.red },
    { label: "Balans", val: fmtMs(balance), c: balance >= 0 ? T.green : T.red },
    { label: "Naqd", val: fmtMs(cashBalance), c: cashBalance >= 0 ? T.green : T.red },
    { label: "Bank", val: fmtMs(bankBalance), c: bankBalance >= 0 ? T.green : T.red },
  ];

  const inpS = inp(T);
  const labS = { fontSize: 10, color: T.muted, fontWeight: 600, marginBottom: 3, display: "block", textTransform: "uppercase" };

  return (
    <div style={{ background: T.bg, minHeight: "100%", fontFamily: "Inter,sans-serif" }}>
      {/* Summary pills horizontal scroll */}
      <div style={{ overflowX: "auto", display: "flex", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
        {summaryPills.map(p => (
          <div key={p.label} style={{ flexShrink: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 12px", minWidth: 90 }}>
            <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, textTransform: "uppercase" }}>{p.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: p.c, marginTop: 2 }}>{p.val}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, padding: "12px 14px" }}>
        <button onClick={() => openForm("income")}
          style={{ flex: 1, height: 44, borderRadius: 10, background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}44`, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          + Kirim
        </button>
        <button onClick={() => openForm("expense")}
          style={{ flex: 1, height: 44, borderRadius: 10, background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}44`, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          + Chiqim
        </button>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: "0 14px 80px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase" }}>So'nggi tranzaksiyalar</div>
        {recent.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 12, padding: 24 }}>Tranzaksiyalar yo'q</div>
        )}
        {recent.map(t => {
          const lead = leads.find(l => l.id === t.leadId);
          const isIncome = t.type === "income";
          const pm = t.paymentMethod || "cash";
          return (
            <div key={t.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc || t.cat || "—"}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{t.cat} · {lead?.name || "—"} · {t.date}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: isIncome ? T.green : T.red }}>
                  {isIncome ? "+" : "-"}{fmtMs(t.amount)}
                </div>
                <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: pm === "bank" ? "#2563eb22" : "#05966922", color: pm === "bank" ? "#2563eb" : "#059669", fontWeight: 700 }}>
                  {pm === "bank" ? "BANK" : "NAQD"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add form modal */}
      {modal === "form" && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: T.bg, borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>
                {form.type === "income" ? "💚 Kirim qo'shish" : "🔴 Chiqim qo'shish"}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.muted }}>{I.x}</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={labS}>Tur</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["income", "expense"].map(ty => (
                    <button key={ty} onClick={() => setForm(p => ({ ...p, type: ty }))}
                      style={{ flex: 1, height: 40, borderRadius: 8, border: `1px solid ${form.type === ty ? T.accent : T.border}`, background: form.type === ty ? `${T.accent}18` : "transparent", color: form.type === ty ? T.accent : T.muted, fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                      {ty === "income" ? "💚 Kirim" : "🔴 Chiqim"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labS}>Kategoriya</label>
                <select value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value }))} style={{ ...inpS, height: 44 }}>
                  {(form.type === "income" ? (config?.txnInc || ["XBA To'lov","1-Qism","2-Qism","Boshqa"]) : (config?.txnExp || ["Maosh","Avans","Reklama","Boshqa"])).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labS}>Summa (so'm) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ ...inpS, height: 44, textAlign: "right", fontSize: 16, fontWeight: 800 }} placeholder="0" />
              </div>
              <div>
                <label style={labS}>To'lov usuli</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["cash", "bank"].map(m => (
                    <button key={m} onClick={() => setForm(p => ({ ...p, paymentMethod: m }))}
                      style={{ flex: 1, height: 44, borderRadius: 8, border: `1px solid ${form.paymentMethod === m ? T.accent : T.border}`, background: form.paymentMethod === m ? `${T.accent}18` : "transparent", color: form.paymentMethod === m ? T.accent : T.muted, fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                      {m === "cash" ? "💵 Naqd" : "🏦 Bank"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labS}>Mijoz</label>
                <select value={form.leadId || ""} onChange={e => setForm(p => ({ ...p, leadId: e.target.value || null }))} style={{ ...inpS, height: 44 }}>
                  <option value="">— Ixtiyoriy —</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labS}>Sana</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ ...inpS, height: 44 }} />
              </div>
              <div>
                <label style={labS}>Izoh</label>
                <input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} style={{ ...inpS, height: 44 }} placeholder="Ixtiyoriy" />
              </div>
              <button onClick={save}
                style={{ height: 48, borderRadius: 10, background: form.type === "income" ? T.green : T.red, color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}>
                💾 Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MOBILE TASKS ─────────────────────────────────────────────────────────────
export function MobileTasks({ tasks, setTasks, leads, user, team, roles, addNotif }) {
  const T = useT();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const todoCount = tasks.filter(t => t.status === "todo").length;
  const overdueCount = tasks.filter(t => t.status !== "done" && isOD(t.due)).length;
  const doneCount = tasks.filter(t => t.status === "done").length;

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aOD = a.status !== "done" && isOD(a.due);
      const bOD = b.status !== "done" && isOD(b.due);
      if (aOD && !bOD) return -1;
      if (!aOD && bOD) return 1;
      return (a.due || "9").localeCompare(b.due || "9");
    });
  }, [tasks]);

  const statusNext = { todo: "inprogress", inprogress: "done", done: "todo" };
  const statusLabel = { todo: "Kutilmoqda", inprogress: "Jarayonda", done: "Bajarildi" };
  const statusColor = { todo: T.yellow, inprogress: T.accent, done: T.green };

  const toggleStatus = async (task) => {
    const next = statusNext[task.status] || "todo";
    try {
      await tasksAPI.update(task.id, { ...task, status: next });
      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: next } : t));
    } catch (e) {}
  };

  const openAdd = () => {
    setForm({ title: "", desc: "", assignee: user?.id || "", leadId: "", priority: "medium", due: "", status: "todo" });
    setModal("form");
  };

  const saveTask = async () => {
    if (!form.title.trim()) return;
    const payload = { title: form.title, description: form.desc || "", assignee: form.assignee || null, leadId: form.leadId || null, priority: form.priority || "medium", due: form.due || null, status: "todo" };
    try {
      const saved = await tasksAPI.create(payload);
      setTasks(p => [...p, {
        id: String(saved.id), title: saved.title, desc: saved.description || "",
        assignee: saved.assignee, leadId: saved.lead_id,
        priority: saved.priority || "medium", status: saved.status || "todo",
        due: saved.due_date?.slice(0, 10) || "",
      }]);
      addNotif && addNotif("Vazifa qo'shildi");
      setModal(null);
    } catch (err) { alert("Saqlanmadi: " + err.message); }
  };

  const inpS = inp(T);
  const labS = { fontSize: 10, color: T.muted, fontWeight: 600, marginBottom: 3, display: "block", textTransform: "uppercase" };

  return (
    <div style={{ background: T.bg, minHeight: "100%", fontFamily: "Inter,sans-serif" }}>
      {/* Stats + add button */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {[
            { label: "Kutilmoqda", val: todoCount, c: T.yellow },
            { label: "Muddati o'tgan", val: overdueCount, c: T.red },
            { label: "Bajarildi", val: doneCount, c: T.green },
          ].map(s => (
            <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: s.c }}>{s.val}</div>
              <div style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button onClick={openAdd}
          style={{ height: 44, padding: "0 14px", borderRadius: 10, background: T.accent, color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          + Yangi
        </button>
      </div>

      {/* Task list */}
      <div style={{ padding: "12px 14px 80px" }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 12, padding: 24 }}>Vazifalar yo'q</div>
        )}
        {sorted.map(task => {
          const lead = leads.find(l => l.id === task.leadId);
          const assigneeUser = team.find(u => String(u.id) === String(task.assignee));
          const od = task.status !== "done" && isOD(task.due);
          const soon = task.status !== "done" && isSoon(task.due);
          return (
            <div key={task.id} style={{ background: T.card, border: `1px solid ${od ? T.red : T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: task.status === "done" ? T.muted : T.text, textDecoration: task.status === "done" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {task.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                    {assigneeUser && (
                      <span style={{ fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 3 }}>
                        <Av u={assigneeUser} size={14} /> {assigneeUser.name}
                      </span>
                    )}
                    {lead && <span style={{ fontSize: 10, color: T.accent }}>{lead.name}</span>}
                    {task.due && (
                      <span style={{ fontSize: 10, color: od ? T.red : soon ? T.yellow : T.muted, fontWeight: od ? 700 : 400 }}>
                        {od ? "⚠️ " : ""}{fmtD(task.due)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggleStatus(task)}
                  style={{ flexShrink: 0, padding: "4px 8px", borderRadius: 6, border: `1px solid ${statusColor[task.status] || T.border}`, background: `${statusColor[task.status] || T.border}20`, color: statusColor[task.status] || T.muted, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {statusLabel[task.status] || task.status}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add task modal */}
      {modal === "form" && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: T.bg, borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>Yangi vazifa</h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.muted }}>{I.x}</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={labS}>Sarlavha *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  style={{ ...inpS, height: 44 }} placeholder="Vazifa nomi" />
              </div>
              <div>
                <label style={labS}>Mas'ul xodim</label>
                <select value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} style={{ ...inpS, height: 44 }}>
                  <option value="">— Tanlang —</option>
                  {team.filter(u => u.active !== false).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labS}>Mijoz</label>
                <select value={form.leadId || ""} onChange={e => setForm(p => ({ ...p, leadId: e.target.value || null }))} style={{ ...inpS, height: 44 }}>
                  <option value="">— Ixtiyoriy —</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labS}>Muddat</label>
                <input type="date" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))} style={{ ...inpS, height: 44 }} />
              </div>
              <div>
                <label style={labS}>Ustuvorlik</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["low", "medium", "high"].map(pr => (
                    <button key={pr} onClick={() => setForm(p => ({ ...p, priority: pr }))}
                      style={{ flex: 1, height: 40, borderRadius: 8, border: `1px solid ${form.priority === pr ? T.accent : T.border}`, background: form.priority === pr ? `${T.accent}18` : "transparent", color: form.priority === pr ? T.accent : T.muted, fontWeight: 700, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                      {pr === "low" ? "Past" : pr === "medium" ? "O'rta" : "Yuqori"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labS}>Izoh</label>
                <input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} style={{ ...inpS, height: 44 }} placeholder="Ixtiyoriy" />
              </div>
              <button onClick={saveTask}
                style={{ height: 48, borderRadius: 10, background: T.accent, color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}>
                💾 Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MOBILE DASHBOARD ─────────────────────────────────────────────────────────
export function MobileDashboard({ leads, tasks, user, team, txns, roles }) {
  const T = useT();

  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => !DONE.includes(l.status) && !["Viza Rad Etildi","Rad etildi","Bekor qildi","Anchagacha ko'tarmadi"].includes(l.status)).length;
  const doneLeads = leads.filter(l => DONE.includes(l.status)).length;
  const myTasks = tasks.filter(t => String(t.assignee) === String(user?.id) && t.status !== "done");
  const recentLeads = [...leads].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Xayrli tong" : now.getHours() < 18 ? "Xayrli kun" : "Xayrli kech";
  const dateStr = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div style={{ background: T.bg, minHeight: "100%", fontFamily: "Inter,sans-serif", padding: "16px 14px 80px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{greeting}, {user?.name?.split(" ")[0] || "Siz"}!</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{dateStr}</div>
      </div>

      {/* Stats 2x2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Jami Mijozlar", val: totalLeads, c: T.accent, ic: "👥" },
          { label: "Faol", val: activeLeads, c: T.green, ic: "✅" },
          { label: "Jo'nab ketdi", val: doneLeads, c: T.yellow, ic: "✈️" },
          { label: "Vazifalar", val: myTasks.length, c: myTasks.some(t => isOD(t.due)) ? T.red : T.text, ic: "📋" },
        ].map(card => (
          <div key={card.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 12px" }}>
            <div style={{ fontSize: 20 }}>{card.ic}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: card.c, marginTop: 4 }}>{card.val}</div>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase" }}>So'nggi mijozlar</div>
        {recentLeads.map(lead => {
          const stage = gS(lead.status);
          return (
            <div key={lead.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{lead.country || "—"} · {lead.phone || "—"}</div>
              </div>
              <span style={{ flexShrink: 0, fontSize: 9, padding: "3px 7px", borderRadius: 6, background: `${stage.c}22`, color: stage.c, fontWeight: 700, marginLeft: 8 }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* My tasks */}
      {myTasks.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase" }}>Mening vazifalarim</div>
          {[...myTasks].sort((a, b) => isOD(a.due) ? -1 : 1).slice(0, 5).map(task => {
            const od = isOD(task.due);
            return (
              <div key={task.id} style={{ background: T.card, border: `1px solid ${od ? T.red : T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                  {task.due && <div style={{ fontSize: 10, color: od ? T.red : T.muted, marginTop: 1, fontWeight: od ? 700 : 400 }}>{od ? "⚠️ " : ""}{fmtD(task.due)}</div>}
                </div>
                <span style={{ flexShrink: 0, fontSize: 9, padding: "3px 7px", borderRadius: 6, background: od ? `${T.red}22` : `${T.yellow}22`, color: od ? T.red : T.yellow, fontWeight: 700, marginLeft: 8 }}>
                  {od ? "Kechikdi" : "Kutilmoqda"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MOBILE LEADS ─────────────────────────────────────────────────────────────
export function MobileLeads({ leads, user, team, roles, open, config }) {
  const T = useT();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const KEY_STAGES = ["Yangi", "Boglanildi", "Onlayn Suhbat", "Shartnoma qildi", "Jo'nab ketdi", "Rad etildi"];

  const filtered = useMemo(() => {
    let list = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => (l.name || "").toLowerCase().includes(q) || (l.phone || "").includes(q));
    }
    if (filterStatus) {
      list = list.filter(l => l.status === filterStatus);
    }
    return list;
  }, [leads, search, filterStatus]);

  const inpS = inp(T);

  return (
    <div style={{ background: T.bg, minHeight: "100%", fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Search */}
      <div style={{ padding: "10px 14px 0" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted }}>{I.search}</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inpS, height: 44, paddingLeft: 30, width: "100%", boxSizing: "border-box" }}
            placeholder="Ism yoki telefon..." />
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ overflowX: "auto", display: "flex", gap: 6, padding: "8px 14px", borderBottom: `1px solid ${T.border}` }}>
        <button onClick={() => setFilterStatus("")}
          style={{ flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${!filterStatus ? T.accent : T.border}`, background: !filterStatus ? `${T.accent}18` : "transparent", color: !filterStatus ? T.accent : T.muted, fontWeight: 600, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
          Barchasi ({leads.length})
        </button>
        {KEY_STAGES.map(s => {
          const stage = gS(s);
          const count = leads.filter(l => l.status === s).length;
          if (!count) return null;
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              style={{ flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${filterStatus === s ? stage.c : T.border}`, background: filterStatus === s ? `${stage.c}22` : "transparent", color: filterStatus === s ? stage.c : T.muted, fontWeight: 600, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Lead list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 80px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 12, padding: 24 }}>Mijozlar topilmadi</div>
        )}
        {filtered.map(lead => {
          const stage = gS(lead.status);
          return (
            <div key={lead.id} onClick={() => open && open(lead)}
              style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11, color: T.accent, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                      {I.phone} {lead.phone}
                    </a>
                  )}
                  {lead.country && <span style={{ fontSize: 10, color: T.muted }}>{lead.country}</span>}
                </div>
              </div>
              <span style={{ flexShrink: 0, fontSize: 9, padding: "3px 7px", borderRadius: 6, background: `${stage.c}22`, color: stage.c, fontWeight: 700, marginLeft: 8, textAlign: "center", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
