import { useState } from "react";
import { useT } from "./theme.js";
import { uid, inp, Modal, I } from "./helpers.jsx";
import { configAPI } from "./api.js";
import { EDU_CONTENT } from "./educationContent.js";

// ─── EDUCATION / TA'LIM ───────────────────────────────────────────────────────
// Admin-editable knowledge base for employees: rules, etiquette, duties,
// roles, career path, training. Stored as config key "education" (array of
// topics). Only admin sees the edit controls; the server also gates the
// "education" config key to admin. Initial content (EDU_CONTENT) is extracted
// from the company documents and loaded via the admin "Load from documents"
// action; everything is editable in-app afterwards.
const SEED_TOPICS = EDU_CONTENT;

function Education({ user, config, setConfig }) {
  const T = useT();
  const inpS = inp(T);
  const isAdmin = user.role === "admin";

  const topics = Array.isArray(config?.education) ? config.education : [];
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [edit, setEdit] = useState(null); // null | {id?, category, title, body}
  const [saving, setSaving] = useState(false);

  const persist = async (next) => {
    setSaving(true);
    try {
      await configAPI.set("education", next);
      setConfig((p) => ({ ...p, education: next }));
    } catch (e) {
      alert("Saqlashda xatolik: " + e.message);
    }
    setSaving(false);
  };

  const seed = async () => {
    const msg = topics.length
      ? `Diqqat: barcha mavzular kompaniya hujjatlari matni bilan ALMASHTIRILADI (${SEED_TOPICS.length} ta). Mavjud tahrirlaringiz o'chadi. Davom etilsinmi?`
      : `Kompaniya hujjatlaridan ${SEED_TOPICS.length} ta mavzu yuklansinmi?`;
    if (!window.confirm(msg)) return;
    await persist(SEED_TOPICS.map((t, i) => ({ ...t, id: uid(), order: i })));
  };

  const saveEdit = async () => {
    if (!edit.title?.trim()) return;
    const clean = {
      id: edit.id || uid(),
      category: edit.category?.trim() || "Umumiy",
      title: edit.title.trim(),
      body: edit.body || "",
      order: edit.order ?? topics.length,
    };
    const next = edit.id
      ? topics.map((t) => (t.id === edit.id ? clean : t))
      : [...topics, clean];
    await persist(next);
    setEdit(null);
  };

  const del = async (id) => {
    if (!window.confirm("Bu mavzu o'chirilsinmi?")) return;
    await persist(topics.filter((t) => t.id !== id));
  };

  const move = async (id, dir) => {
    const ordered = [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const i = ordered.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    await persist(ordered.map((t, k) => ({ ...t, order: k })));
  };

  const q = search.toLowerCase();
  const visible = [...topics]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((t) => !q || `${t.title} ${t.category} ${t.body}`.toLowerCase().includes(q));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "4px 0 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: 0 }}>📚 Ta'lim</h1>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Xodimlar uchun qoidalar va o'quv materiallari</div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={seed} title="Kompaniya hujjatlaridan yuklash"
              style={{ padding: "8px 14px", borderRadius: 8, background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}44`, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              📥 Hujjatlardan yuklash
            </button>
            <button onClick={() => setEdit({ category: "", title: "", body: "" })}
              style={{ padding: "8px 16px", borderRadius: 8, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              + Yangi mavzu
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted }}>{I.search}</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..."
          style={{ ...inpS, paddingLeft: 30 }} />
      </div>

      {/* Empty state */}
      {topics.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: T.muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📚</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Hali material qo'shilmagan.</div>
          {isAdmin && (
            <button onClick={seed}
              style={{ padding: "9px 18px", borderRadius: 8, background: `${T.accent}18`, color: T.accent, border: `1px solid ${T.accent}44`, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              ✨ Boshlang'ich mavzularni qo'shish
            </button>
          )}
        </div>
      )}

      {/* Topics list (accordion) */}
      {visible.map((t) => {
        const open = openId === t.id;
        return (
          <div key={t.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: open ? T.shadow : "none" }}>
            <div onClick={() => setOpenId(open ? null : t.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.accent, background: `${T.accent}15`, borderRadius: 5, padding: "3px 8px", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {t.category}
              </span>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: T.text }}>{t.title}</div>
              {isAdmin && open && (
                <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button title="Yuqoriga" onClick={() => move(t.id, -1)} style={miniBtn(T)}>▲</button>
                  <button title="Pastga" onClick={() => move(t.id, 1)} style={miniBtn(T)}>▼</button>
                  <button title="Tahrirlash" onClick={() => setEdit({ ...t })} style={miniBtn(T)}>✏️</button>
                  <button title="O'chirish" onClick={() => del(t.id)} style={{ ...miniBtn(T), color: T.red, borderColor: `${T.red}44` }}>🗑</button>
                </div>
              )}
              <span style={{ fontSize: 12, color: T.muted, marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
            </div>
            {open && (
              <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap", paddingTop: 14 }}>
                  {t.body || "—"}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit / add modal (admin) */}
      {edit && (
        <Modal onClose={() => !saving && setEdit(null)} width={640}>
          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>{edit.id ? "Mavzuni tahrirlash" : "Yangi mavzu"}</h3>
              <button onClick={() => !saving && setEdit(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}>{I.x}</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <div>
                  <label style={labS(T)}>Kategoriya</label>
                  <input value={edit.category || ""} onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value }))} placeholder="Qoidalar" style={inpS} />
                </div>
                <div>
                  <label style={labS(T)}>Sarlavha *</label>
                  <input value={edit.title || ""} onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))} placeholder="Mavzu nomi" style={inpS} />
                </div>
              </div>
              <div>
                <label style={labS(T)}>Matn</label>
                <textarea value={edit.body || ""} onChange={(e) => setEdit((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Hujjat matnini shu yerga joylashtiring..."
                  rows={16} style={{ ...inpS, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button disabled={saving} onClick={() => setEdit(null)} style={{ padding: "8px 16px", borderRadius: 7, background: T.card2, color: T.text, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 12 }}>Bekor</button>
              <button disabled={saving} onClick={saveEdit} style={{ padding: "8px 20px", borderRadius: 7, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                {saving ? "⏳ Saqlanmoqda..." : "💾 Saqlash"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const miniBtn = (T) => ({ padding: "3px 8px", borderRadius: 5, background: T.card2, color: T.sub, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 11 });
const labS = (T) => ({ display: "block", fontSize: 10, fontWeight: 700, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" });

export { Education };
