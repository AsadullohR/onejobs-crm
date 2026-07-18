import { useState, useMemo, useEffect } from "react";
import { useT } from "./theme.js";
import { DONE, LOST } from "./constants.js";
import { fmtMs, fmtD, isOD, isSoon, I, Pill, Av, inp } from "./helpers.jsx";
import { Analytics } from "./Analytics.jsx";
import { reportsAPI, statsAPI } from "./api.js";

// ─── SUPER DASHBOARD v2 (Business KPI) ────────────────────────────────────────
function DashboardKPI({ leads, tasks, user, team, txns, roles }) {
  const T = useT();
  const inpS = inp(T);

  // ── Date range filter ──────────────────────────────────────────────────────
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);
  // Default view: current month (Bu oy)
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [preset, setPreset] = useState("month"); // all | month | year | custom

  const applyPreset = (p) => {
    setPreset(p);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    if (p === "month") {
      setDateFrom(`${y}-${m}-01`);
      setDateTo(today);
    } else if (p === "year") {
      setDateFrom(`${y}-01-01`);
      setDateTo(today);
    } else if (p === "last30") {
      const d = new Date(now - 30 * 864e5);
      setDateFrom(d.toISOString().slice(0, 10));
      setDateTo(today);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  };

  // Filter txns by date range
  const filteredTxns = txns.filter((t) => {
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });
  // Filter leads by createdAt
  const filteredLeads = leads.filter((l) => {
    if (!dateFrom && !dateTo) return true;
    const d = l.createdAt || "";
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  const total = filteredLeads.length;
  const gone = filteredLeads.filter((l) => DONE.includes(l.status)).length;
  const myT = tasks.filter(
    (t) => t.assignee === user.id && t.status !== "done",
  );
  const perm = roles[user.role] || {};
  const totalInc = filteredTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExp = filteredTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const sofF = filteredLeads
    .filter((l) => DONE.includes(l.status) && l.sofFoyda)
    .reduce((s, l) => s + Number(l.sofFoyda || 0), 0);
  // Funnel analytics with conversion %
  const funnelGroups = [
    ["Yangi",                ["Yangi", "Qilindi"]],
    ["Bog'lanildi",          ["Bog'landi", "Boglanildi"]],
    ["Suhbat",               ["Onlayn Suhbat Uchun", "Onlayn Suhbat", "Suhbat"]],
    ["Shartnoma qildi",      ["Shartnoma qildi", "CV Topshirildi", "Interview ga qo'yildi", "Ishga qabul qilindi", "1 - Qism To'landi"]],
    ["XBA to'lov",           ["XBA To'lov qildi"]],
    ["Hujjatlar jo'natildi", ["Hujjatlar Tayyorlanmoqda", "Hujjatlar Jonatilishga Tayyor", "Hujjatlar Jonatildi", "Ish shartnomasi keldi", "Ish shartnomasi imzolandi", "Elchixonaga Hujjatlar Tayyor"]],
    ["Taklifnoma keldi",     ["Taklifnoma keldi"]],
    ["Viza topshirdi",       ["Vizaga Topshirildi"]],
    ["Viza oldi",            ["Viza Oldi", "Jo'nab ketdi"]],
  ];
  // Local snapshot fallback (current status membership) — used until the
  // server's date-based cumulative funnel arrives or if the request fails.
  const fLocal = funnelGroups.map(([g, stages]) => ({
    g,
    n: filteredLeads.filter((l) => stages.includes(l.status)).length,
  }));

  // Server funnel: date-based + status_log timestamps, cumulative — a lead
  // counts in every stage it ENTERED during the period, so fast movers
  // (contacted the 4th, contracted the 6th) appear in both stages.
  const [serverFunnel, setServerFunnel] = useState(null);
  useEffect(() => {
    let alive = true;
    statsAPI.funnel(dateFrom || null, dateTo || null)
      .then((r) => { if (alive && r?.stages) setServerFunnel(r); })
      .catch(() => { if (alive) setServerFunnel(null); });
    return () => { alive = false; };
  }, [dateFrom, dateTo]);

  const fData = serverFunnel
    ? serverFunnel.stages.map((s) => ({ g: s.key, n: s.n }))
    : fLocal;
  const funnelTotal = serverFunnel ? Math.max(serverFunnel.total, 1) : total;

  // Source analytics with revenue
  const bySrc = Object.entries(
    filteredLeads.reduce((m, l) => {
      if (l.source) {
        m[l.source] = m[l.source] || {
          count: 0,
          contracts: 0,
          gone: 0,
          revenue: 0,
        };
        m[l.source].count++;
        if (["Shartnoma qildi", ...DONE].some((s) => l.status.includes(s)))
          m[l.source].contracts++;
        if (DONE.includes(l.status)) m[l.source].gone++;
        m[l.source].revenue += Number(l.sofFoyda) || 0;
      }
      return m;
    }, {}),
  )
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8);

  // Country analytics with revenue
  const byCon = Object.entries(
    filteredLeads.reduce((m, l) => {
      if (l.country) {
        const c = l.country.split(",")[0].trim();
        m[c] = m[c] || { count: 0, gone: 0, revenue: 0 };
        m[c].count++;
        if (DONE.includes(l.status)) m[c].gone++;
        m[c].revenue += l.totalIncome || 0;
      }
      return m;
    }, {}),
  )
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 6);

  // Team stats
  const teamStats = team
    .filter((t) => ["sales", "manager", "docs", "hujjatchi"].includes(t.role))
    .map((t) => {
      const myLeads = filteredLeads.filter(
        (l) =>
          l.ownerSales === t.id ||
          l.ownerConsult === t.id ||
          l.ownerDocs === t.id,
      );
      const myGone = myLeads.filter((l) => DONE.includes(l.status)).length;
      const conv =
        myLeads.length > 0 ? ((myGone / myLeads.length) * 100).toFixed(0) : 0;
      const kpi = filteredLeads.filter(
        (l) =>
          (l.ownerSales === t.id && l.kpiSales) ||
          (l.ownerConsult === t.id && l.kpiConsult) ||
          (l.ownerDocs === t.id && l.kpiDocs),
      ).length;
      const inc = filteredTxns
        .filter(
          (x) =>
            x.type === "income" &&
            filteredLeads.find(
              (l) =>
                l.id === x.leadId &&
                (l.ownerSales === t.id ||
                  l.ownerConsult === t.id ||
                  l.ownerDocs === t.id),
            ),
        )
        .reduce((s, x) => s + x.amount, 0);
      return { t, total: myLeads.length, gone: myGone, conv, kpi, inc };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.gone - a.gone);

  // Alerts (always unfiltered — these are current state, not date-range metrics)
  const overdueTask = tasks.filter(
    (t) => t.status !== "done" && isOD(t.due),
  ).length;
  const soonTask = tasks.filter(
    (t) => t.status !== "done" && isSoon(t.due),
  ).length;
  const contractLeads = filteredLeads.filter(
    (l) => l.status === "Shartnoma qildi",
  ).length;
  const visaLeads = filteredLeads.filter((l) =>
    ["Vizaga Topshirildi", "Elchixonaga Hujjatlar Tayyor"].includes(l.status),
  ).length;

  // KPIs
  const periodLabel = preset === "all" ? "barcha vaqt" : preset === "month" ? "bu oy" : preset === "last30" ? "so'ngi 30 kun" : preset === "year" ? "bu yil" : `${dateFrom}–${dateTo}`;
  const contactRate =
    total > 0
      ? (
          (filteredLeads.filter((l) => !["Yangi", "Qilindi"].includes(l.status))
            .length /
            total) *
          100
        ).toFixed(0)
      : 0;
  const contractRate =
    total > 0 ? ((contractLeads / total) * 100).toFixed(1) : 0;
  const deployRate = total > 0 ? ((gone / total) * 100).toFixed(1) : 0;
  const avgRev = gone > 0 ? Math.round(totalInc / gone) : 0;

  // Monthly chart
  const chartYear = now.getFullYear();
  const months = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  const monthLabels = [
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyun",
    "Iyul",
    "Avg",
    "Sen",
    "Okt",
    "Noy",
    "Dek",
  ];
  const mInc = months.map((m) =>
    txns
      .filter(
        (t) => t.type === "income" && t.date?.startsWith(`${chartYear}-${m}`),
      )
      .reduce((s, t) => s + t.amount, 0),
  );
  const mExp = months.map((m) =>
    txns
      .filter(
        (t) => t.type === "expense" && t.date?.startsWith(`${chartYear}-${m}`),
      )
      .reduce((s, t) => s + t.amount, 0),
  );
  const mProfit = months.map((_, i) => mInc[i] - mExp[i]);
  // Only show months that have data or up to current month
  const activeMonths = months.slice(0, now.getMonth() + 1);
  const maxB = Math.max(...mInc, ...mExp, 1);

  const FC = [
    "#6366f1",
    "#3b82f6",
    "#0891b2",
    "#f59e0b",
    "#ec4899",
    "#f97316",
    "#a855f7",
    "#7c3aed",
    "#0ea5e9",
    "#14b8a6",
    "#22c55e",
    "#166534",
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <h1
            style={{ fontSize: 18, fontWeight: 900, color: T.text, margin: 0 }}
          >
            Executive Dashboard
          </h1>
          <p style={{ color: T.muted, margin: "1px 0 0", fontSize: 10 }}>
            Biznes boshqaruv paneli · {new Date().toLocaleDateString("uz-UZ")}
          </p>
        </div>
        {/* Monthly report button */}
        {(user.role==="admin"||user.role==="manager")&&(
          <button onClick={()=>reportsAPI.openMonthly()} style={{padding:"6px 12px",borderRadius:7,background:`${T.accent}15`,color:T.accent,border:`1px solid ${T.accent}33`,cursor:"pointer",fontSize:10,fontWeight:700,flexShrink:0}}>
            📄 Oylik Hisobot
          </button>
        )}
        {/* Date range filter */}
        <div
          style={{
            display: "flex",
            gap: 5,
            alignItems: "center",
            marginLeft: "auto",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 2,
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 7,
              padding: 2,
            }}
          >
            {[
              ["all", "Barchasi"],
              ["month", "Bu oy"],
              ["last30", "30 kun"],
              ["year", "Bu yil"],
              ["custom", "Tanlash"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => applyPreset(k)}
                style={{
                  padding: "4px 9px",
                  borderRadius: 5,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: preset === k ? 700 : 400,
                  background: preset === k ? T.accent : "transparent",
                  color: preset === k ? "#fff" : T.muted,
                  transition: "all 0.15s",
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ ...inpS, width: 130, fontSize: 10 }}
              />
              <span style={{ color: T.muted, fontSize: 10 }}>–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ ...inpS, width: 130, fontSize: 10 }}
              />
            </>
          )}
          {(dateFrom || dateTo) && (
            <span
              style={{
                fontSize: 9,
                color: T.accent,
                fontWeight: 600,
                background: `${T.accent}15`,
                padding: "3px 8px",
                borderRadius: 10,
                border: `1px solid ${T.accent}33`,
              }}
            >
              {dateFrom || "..."} → {dateTo || "..."}
            </span>
          )}
        </div>
      </div>

      {/* Executive KPI Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          ["📥", preset === "all" ? "Jami Leadlar" : preset === "month" ? "Bu Oy Leadlar" : preset === "last30" ? "30 kun Leadlar" : preset === "year" ? "Bu Yil Leadlar" : "Leadlar", total, periodLabel, "#6366f1"],
          ["📞", "Aloqa %", `${contactRate}%`, "kontakt qilingan", "#f59e0b"],
          [
            "📄",
            "Shartnoma %",
            `${contractRate}%`,
            "bitim yopilgan",
            "#22c55e",
          ],
          ["✈️", "Jo'nab Ketdi", `${deployRate}%`, `${gone} ta`, T.green],
          perm.canFin
            ? ["💰", "O'rt. daromad", fmtMs(avgRev), "har mijoz", T.yellow]
            : ["⚠️", "Muddati O'tgan", overdueTask, "vazifa", T.red],
        ].map(([icon, lb, val, sub, c]) => (
          <div
            key={lb}
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "11px 13px",
              borderTop: `3px solid ${c}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {lb}
              </span>
              <span style={{ fontSize: 16 }}>{icon}</span>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: T.text,
                lineHeight: 1,
              }}
            >
              {val}
            </div>
            <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>
      {perm.canFin && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            [
              "💚",
              "Jami Kirim",
              `+${fmtMs(totalInc)} so'm`,
              periodLabel,
              T.green,
            ],
            [
              "🔴",
              "Jami Chiqim",
              `-${fmtMs(totalExp)} so'm`,
              periodLabel,
              T.red,
            ],
            [
              "⚖️",
              "Balans",
              fmtMs(totalInc - totalExp),
              totalInc - totalExp >= 0 ? "+" : "-",
              totalInc - totalExp >= 0 ? T.green : T.red,
            ],
            [
              "💰",
              "Sof Foyda",
              `${fmtMs(sofF)} so'm`,
              "tugagan jarayonlar",
              T.yellow,
            ],
            ["📊", "Jami Mijozlar", total, `${gone} muvaffaqiyatli`, T.accent],
          ].map(([icon, lb, val, sub, c]) => (
            <div
              key={lb}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "11px 13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: T.muted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  {lb}
                </span>
                <span>{icon}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: c }}>
                {val}
              </div>
              <div style={{ fontSize: 9, color: T.muted }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {(overdueTask > 0 || soonTask > 0 || visaLeads > 0 || contractLeads > 5) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {overdueTask > 0 && (
            <div
              style={{
                background: `${T.red}15`,
                border: `1px solid ${T.red}44`,
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span style={{ fontSize: 18 }}>🔴</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.red }}>
                  Muddati o'tgan: {overdueTask} ta vazifa
                </div>
                <div style={{ fontSize: 9, color: T.muted }}>
                  Tezkor chora ko'ring
                </div>
              </div>
            </div>
          )}
          {soonTask > 0 && (
            <div
              style={{
                background: `${T.yellow}15`,
                border: `1px solid ${T.yellow}44`,
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span style={{ fontSize: 18 }}>🟡</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.yellow }}>
                  Yaqinlashmoqda: {soonTask} ta
                </div>
                <div style={{ fontSize: 9, color: T.muted }}>
                  2 kun ichida muddat
                </div>
              </div>
            </div>
          )}
          {visaLeads > 0 && (
            <div
              style={{
                background: `${T.purple}15`,
                border: `1px solid ${T.purple}44`,
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span style={{ fontSize: 18 }}>📋</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.purple }}>
                  Viza jarayonida: {visaLeads} ta
                </div>
                <div style={{ fontSize: 9, color: T.muted }}>
                  Elchixona / kutish
                </div>
              </div>
            </div>
          )}
          {contractLeads > 5 && (
            <div
              style={{
                background: `${T.green}15`,
                border: `1px solid ${T.green}44`,
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span style={{ fontSize: 18 }}>🟢</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.green }}>
                  Shartnoma: {contractLeads} ta aktiv
                </div>
                <div style={{ fontSize: 9, color: T.muted }}>
                  To'lov kutilmoqda
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main 3-col grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Funnel with conversion */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                color: T.text,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              🔽 Funnel + Konversiya
            </h3>
          </div>
          {(() => {
            // Trapezoid funnel: each stage's width is proportional to its
            // count (relative to the largest stage), centered, with the
            // bottom edge tapering toward the next stage's width.
            const maxN = Math.max(...fData.map((d) => d.n), 1);
            const MIN_W = 16; // % — keep tiny stages visible and clickable
            const widthOf = (n) => Math.max((n / maxN) * 100, MIN_W);
            return fData.map(({ g, n }, i) => {
              const pct = funnelTotal > 0 ? ((n / funnelTotal) * 100).toFixed(0) : 0;
              const prevN = i > 0 ? fData[i - 1].n : null;
              const drop = prevN != null ? prevN - n : null;
              const convPct = prevN > 0 ? ((n / prevN) * 100).toFixed(0) : null;
              const wTop = widthOf(n);
              const wBot =
                i < fData.length - 1
                  ? (widthOf(n) + widthOf(fData[i + 1].n)) / 2
                  : widthOf(n) * 0.7;
              const tL = (100 - wTop) / 2;
              const bL = (100 - wBot) / 2;
              return (
                <div
                  key={g}
                  title={`${g}: ${n} ta · ${pct}% jami${drop != null && drop > 0 ? ` · −${drop} tushib qoldi` : ""}`}
                  style={{ position: "relative", height: 40, marginBottom: 2 }}
                >
                  {/* trapezoid body */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      clipPath: `polygon(${tL}% 0, ${100 - tL}% 0, ${100 - bL}% 100%, ${bL}% 100%)`,
                      background: `linear-gradient(180deg, ${FC[i]}, ${FC[i]}bb)`,
                      transition: "clip-path 0.3s",
                    }}
                  />
                  {/* centered label (not clipped, always readable) */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        textShadow: "0 1px 3px rgba(0,0,0,0.55)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: "#fff",
                        textShadow: "0 1px 3px rgba(0,0,0,0.55)",
                      }}
                    >
                      {n}
                    </span>
                  </div>
                  {/* right-side stats: % of total + drop-off from previous */}
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: T.sub }}>
                      {pct}% jami
                    </span>
                    {convPct != null && (
                      <span style={{ fontSize: 8, fontWeight: 800, color: Number(convPct) >= 50 ? T.green : FC[i] }}>
                        → {convPct}% o'tdi
                      </span>
                    )}
                    {drop != null && drop > 0 && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: T.red }}>
                        ↓ −{drop}
                      </span>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Team performance */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            👔 Xodimlar Samaradorligi
          </h3>
          {teamStats
            .slice(0, 5)
            .map(({ t, total: tot, gone: g, conv, kpi, inc }) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 0",
                  borderBottom: `1px solid ${T.border}22`,
                }}
              >
                <Av id={t.id} team={team} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      fontSize: 8,
                      color: T.muted,
                      marginTop: 1,
                    }}
                  >
                    <span>Lead:{tot}</span>
                    <span style={{ color: T.green }}>✓{g}</span>
                    <span style={{ color: T.accent }}>{conv}%</span>
                    <span style={{ color: T.cyan }}>KPI:{kpi}</span>
                  </div>
                </div>
                {perm.canFin && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: T.green,
                      flexShrink: 0,
                    }}
                  >
                    {fmtMs(inc)}
                  </span>
                )}
              </div>
            ))}
          {teamStats.length === 0 && (
            <div
              style={{
                color: T.muted,
                fontSize: 11,
                textAlign: "center",
                padding: 16,
              }}
            >
              Ma'lumot yo'q
            </div>
          )}
        </div>

        {/* Country analytics */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            🌍 Mamlakat Tahlili
          </h3>
          {byCon.map(([c, d], i) => {
            const maxC = Math.max(...byCon.map(([, x]) => x.count), 1);
            return (
              <div key={c} style={{ marginBottom: 7 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: T.sub,
                      fontSize: 10,
                      maxWidth: 70,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </span>
                  <div
                    style={{ display: "flex", gap: 7, alignItems: "center" }}
                  >
                    {d.gone > 0 && (
                      <span
                        style={{ fontSize: 8, color: T.green, fontWeight: 600 }}
                      >
                        ✓{d.gone}
                      </span>
                    )}
                    {perm.canFin && d.revenue > 0 && (
                      <span
                        style={{
                          fontSize: 8,
                          color: T.yellow,
                          fontWeight: 600,
                        }}
                      >
                        {fmtMs(d.revenue)}
                      </span>
                    )}
                    <span
                      style={{ fontSize: 10, fontWeight: 700, color: T.text }}
                    >
                      {d.count}
                    </span>
                  </div>
                </div>
                <div
                  style={{ background: T.border, borderRadius: 3, height: 4 }}
                >
                  <div
                    style={{
                      width: `${(d.count / maxC) * 100}%`,
                      background: T.accent,
                      borderRadius: 3,
                      height: 4,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Source analytics full table */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            📣 Manba Tahlili
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 10,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Manba", "Leadlar", "Shartnoma", "Jo'nab", "Daromad"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "4px 6px",
                          textAlign: "left",
                          fontSize: 8,
                          fontWeight: 600,
                          color: T.muted,
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {bySrc.map(([src, d]) => (
                  <tr
                    key={src}
                    style={{ borderBottom: `1px solid ${T.border}22` }}
                  >
                    <td
                      style={{
                        padding: "5px 6px",
                        color: T.text,
                        fontWeight: 600,
                      }}
                    >
                      {src}
                    </td>
                    <td style={{ padding: "5px 6px", color: T.text }}>
                      {d.count}
                    </td>
                    <td
                      style={{
                        padding: "5px 6px",
                        color: T.green,
                        fontWeight: 600,
                      }}
                    >
                      {d.contracts}
                    </td>
                    <td
                      style={{
                        padding: "5px 6px",
                        color: T.accent,
                        fontWeight: 600,
                      }}
                    >
                      {d.gone}
                    </td>
                    <td
                      style={{
                        padding: "5px 6px",
                        color: T.yellow,
                        fontWeight: 600,
                      }}
                    >
                      {perm.canFin ? fmtMs(d.revenue) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Finance chart */}
        {perm.canFin && (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <h3
              style={{
                margin: "0 0 10px",
                fontSize: 11,
                fontWeight: 700,
                color: T.text,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              📊 Oylik Moliya 2026
            </h3>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                height: 90,
                paddingBottom: 18,
                position: "relative",
              }}
            >
              {activeMonths.map((m, i) => (
                <div
                  key={m}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      gap: 2,
                      alignItems: "flex-end",
                      height: 72,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        background: `${T.green}88`,
                        borderRadius: "2px 2px 0 0",
                        height: `${(mInc[i] / maxB) * 72}px`,
                        minHeight: 2,
                        transition: "height 0.3s",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        background: `${T.red}88`,
                        borderRadius: "2px 2px 0 0",
                        height: `${(mExp[i] / maxB) * 72}px`,
                        minHeight: 2,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        background: `${T.yellow}88`,
                        borderRadius: "2px 2px 0 0",
                        height: `${Math.max(0, mProfit[i] / maxB) * 72}px`,
                        minHeight: 2,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 8,
                      color: T.muted,
                      position: "absolute",
                      bottom: 2,
                    }}
                  >
                    {"JFMAM"[i]}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {[
                [T.green, "Kirim"],
                [T.red, "Chiqim"],
                [T.yellow, "Foyda"],
              ].map(([c, l]) => (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 9,
                    color: T.muted,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: c,
                    }}
                  />
                  {l}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Time analytics + Due tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            ⏱️ Vaqt Tahlili
          </h3>
          {(() => {
            const daysBetween = (a, b) => {
              if (!a || !b) return null;
              const d = (new Date(b) - new Date(a)) / 86400000;
              return d > 0 && d < 1000 ? Math.round(d) : null;
            };
            const avg = (arr) => {
              const v = arr.filter((x) => x != null);
              return v.length
                ? Math.round(v.reduce((s, x) => s + x, 0) / v.length)
                : null;
            };
            const steps = [
              [
                "📅 Lead → Shartnoma",
                leads.map((l) => daysBetween(l.createdAt, l.shartnomaSana)),
                T.accent,
              ],
              [
                "📞 So'ngi aloqa → Shartnoma",
                leads.map((l) => daysBetween(l.lastCall, l.shartnomaSana)),
                T.blue || "#3b82f6",
              ],
              [
                "📄 Shartnoma → Hujjatlar",
                leads
                  .filter((l) =>
                    [
                      "Hujjatlar Tayyorlanmoqda",
                      "Hujjatlar Jonatildi",
                    ].includes(l.status),
                  )
                  .map((l) => daysBetween(l.shartnomaSana, l.officeSuhbat)),
                T.purple || "#8b5cf6",
              ],
              [
                "💻 Onlayn suhbat → Ofis",
                leads.map((l) => daysBetween(l.onlaynSuhbat, l.officeSuhbat)),
                T.cyan || "#06b6d4",
              ],
              [
                "🏢 Ofis → Shartnoma",
                leads.map((l) => daysBetween(l.officeSuhbat, l.shartnomaSana)),
                T.green,
              ],
            ];
            return steps.map(([label, arr, c]) => {
              const a = avg(arr);
              const cnt = arr.filter((x) => x != null).length;
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${T.border}22`,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 10, fontWeight: 600, color: T.text }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 8, color: T.muted }}>
                      {cnt} ta mijoz asosida
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: a ? c : T.muted,
                    }}
                  >
                    {a ? `~${a} kun` : "Ma'lumot yo'q"}
                  </span>
                </div>
              );
            });
          })()}
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              background: `${T.accent}12`,
              borderRadius: 7,
              fontSize: 9,
              color: T.muted,
            }}
          >
            💡 Sanalarni mijoz kartasidagi "📅 Muhim sanalar" bo'limida kiriting
          </div>
        </div>
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            ⚠️ Muddati Yaqin
          </h3>
          {tasks
            .filter(
              (t) => t.status !== "done" && (isOD(t.due) || isSoon(t.due)),
            )
            .slice(0, 5)
            .map((t) => {
              const od = isOD(t.due);
              const lead = leads.find((l) => l.id === t.leadId);
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${T.border}22`,
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 7, alignItems: "center" }}
                  >
                    <Av id={t.assignee} team={team} size={20} />
                    <div>
                      <div
                        style={{ fontSize: 10, fontWeight: 600, color: T.text }}
                      >
                        {t.title}
                      </div>
                      {lead && (
                        <div style={{ fontSize: 8, color: T.accent }}>
                          {lead.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      color: od ? T.red : T.yellow,
                      fontWeight: 700,
                    }}
                  >
                    {od ? "⚠️ O'tdi" : "⏰ " + fmtD(t.due)}
                  </span>
                </div>
              );
            })}
          {tasks.filter(
            (t) => t.status !== "done" && (isOD(t.due) || isSoon(t.due)),
          ).length === 0 && (
            <div
              style={{
                color: T.muted,
                fontSize: 11,
                textAlign: "center",
                padding: 16,
              }}
            >
              Muddati yaqin vazifa yo'q ✅
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UNIFIED DASHBOARD SHELL ─────────────────────────────────────────────────
function Dashboard({ leads, tasks, user, team, txns, roles }) {
  const T = useT();
  const perm = roles[user.role] || {};
  const [tab, setTab] = useState("kpi");

  const tabs = [
    { k: "kpi",    l: "📈 Biznes KPI" },
    { k: "calls",  l: "📞 Qo'ng'iroqlar" },
    { k: "team",   l: "📊 Tahlil Markazi" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 3, marginBottom: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: tab === t.k ? 700 : 400,
              background: tab === t.k ? T.accent : "transparent", color: tab === t.k ? "#fff" : T.muted, transition: "all 0.15s" }}>
            {t.l}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "kpi"    && <DashboardKPI leads={leads} tasks={tasks} user={user} team={team} txns={txns} roles={roles} />}
        {tab === "calls"  && <CallsDashboard leads={leads} team={team} user={user} roles={roles} />}
        {tab === "team"   && <Analytics leads={leads} tasks={tasks} team={team} txns={txns} roles={roles} user={user} initialTab="productivity" />}
      </div>
    </div>
  );
}

// ─── CALLS DASHBOARD ─────────────────────────────────────────────────────────
function CallsDashboard({ leads, team, user, roles }) {
  const T = useT();
  const inpS = inp(T);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const weekAgo   = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const perm = roles[user.role] || {};
  const seeAll = perm.seeAll;

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);
  const [selOwner, setSelOwner] = useState("all");

  const QUICK = [
    { l: "Bugun",     from: today,     to: today },
    { l: "Kecha",     from: yesterday, to: yesterday },
    { l: "Bu hafta",  from: weekAgo,   to: today },
    { l: "Bu oy",     from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), to: today },
  ];

  // leads called in range (lastCall within dateFrom–dateTo)
  const called = useMemo(() => leads.filter(l => {
    if (!l.lastCall) return false;
    if (l.lastCall < dateFrom || l.lastCall > dateTo) return false;
    return true;
  }), [leads, dateFrom, dateTo]);

  // per-employee stats
  const staffStats = useMemo(() => {
    const byId = {};
    const activeTeam = seeAll
      ? team.filter(m => m.active !== false && !["employer","partner"].includes(m.role))
      : team.filter(m => m.id === user.id);

    activeTeam.forEach(m => {
      byId[m.id] = { member: m, count: 0, leads: [] };
    });

    called.forEach(l => {
      const ownerId = l.ownerSales || l.ownerConsult || l.ownerDocs;
      if (ownerId && byId[ownerId]) {
        byId[ownerId].count++;
        byId[ownerId].leads.push(l);
      }
    });

    return Object.values(byId).sort((a, b) => b.count - a.count);
  }, [called, team, seeAll, user.id]);

  const totalCalls = staffStats.reduce((s, e) => s + e.count, 0);
  const topCaller  = staffStats[0];

  // Table rows: called leads filtered by selected owner
  const tableLeads = useMemo(() => {
    const base = selOwner === "all" ? called : called.filter(l => {
      const ownerId = l.ownerSales || l.ownerConsult || l.ownerDocs;
      return String(ownerId) === selOwner;
    });
    return [...base].sort((a, b) => (b.lastCall || "") > (a.lastCall || "") ? 1 : -1);
  }, [called, selOwner]);

  const STATUS_C = {
    "Yangi":"#6366f1","Boglanildi":"#0891b2","Onlayn Suhbat":"#0ea5e9","Suhbat":"#10b981",
    "Shartnoma qildi":"#22c55e","Hujjat":"#84cc16","XBA To'lov qildi":"#f97316",
    "Ishga qabul qilindi":"#16a34a","Jo'nab ketdi":"#15803d",
    "Rad etildi":"#ef4444","Bekor qildi":"#6b7280",
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Date controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {QUICK.map(q => (
          <button key={q.l} onClick={() => { setDateFrom(q.from); setDateTo(q.to); }}
            style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${T.border}`,
              background: dateFrom === q.from && dateTo === q.to ? T.accent : T.card,
              color:      dateFrom === q.from && dateTo === q.to ? "#fff"    : T.muted }}>
            {q.l}
          </button>
        ))}
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inpS, width: "auto", fontSize: 11 }} />
        <span style={{ color: T.muted }}>—</span>
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ ...inpS, width: "auto", fontSize: 11 }} />
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          ["📞", "JAMI QO'NG'IROQLAR", totalCalls + " ta", T.accent],
          ["🏆", "ENG KO'P QO'NGIRAGAN", topCaller ? `${topCaller.member.name} (${topCaller.count})` : "—", T.green],
          ["👥", "QILINGAN MIJOZLAR", tableLeads.length + " ta", T.text],
        ].map(([ic, lb, val, c]) => (
          <div key={lb} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", borderTop: `3px solid ${c}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>{ic} {lb}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Employee leaderboard */}
      {seeAll && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 14 }}>📊 Xodimlar reytingi</div>
          {staffStats.map((e, i) => {
            const pct = totalCalls > 0 ? Math.round((e.count / totalCalls) * 100) : 0;
            const barC = i === 0 ? T.green : i === 1 ? T.accent : i === 2 ? "#f59e0b" : T.muted;
            return (
              <div key={e.member.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}
                onClick={() => setSelOwner(selOwner === String(e.member.id) ? "all" : String(e.member.id))}>
                <div style={{ width: 24, fontWeight: 800, fontSize: 12, color: T.muted, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}`}
                </div>
                <Av id={e.member.id} team={[e.member]} size={28} />
                <div style={{ width: 110, fontSize: 11, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.member.name}</div>
                <div style={{ flex: 1, height: 8, background: T.card2, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: barC, borderRadius: 4, transition: "width 0.4s" }} />
                </div>
                <div style={{ width: 50, textAlign: "right", fontSize: 12, fontWeight: 800, color: barC }}>{e.count} ta</div>
                <div style={{ width: 36, textAlign: "right", fontSize: 10, color: T.muted }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Called leads table */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>
            📋 Qo'ng'iroq qilingan mijozlar
            {selOwner !== "all" && (
              <span style={{ fontSize: 10, color: T.accent, marginLeft: 8, fontWeight: 400 }}>
                — {team.find(m => String(m.id) === selOwner)?.name}
                <button onClick={() => setSelOwner("all")} style={{ marginLeft: 6, fontSize: 9, color: T.muted, background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </span>
            )}
          </div>
          <select value={selOwner} onChange={e => setSelOwner(e.target.value)} style={{ ...inpS, width: "auto", fontSize: 11 }}>
            <option value="all">Barcha xodimlar</option>
            {team.filter(m => m.active !== false && !["employer","partner"].includes(m.role)).map(m => (
              <option key={m.id} value={String(m.id)}>{m.name}</option>
            ))}
          </select>
        </div>
        {tableLeads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontSize: 13 }}>Bu davrda qo'ng'iroq qilingan mijoz topilmadi</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.card2 }}>
                {["Mijoz", "Telefon", "Holat", "So'ngi aloqa", "Mas'ul"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLeads.map((l, i) => {
                const stC = STATUS_C[l.status] || "#6b7280";
                const owner = team.find(m => m.id === (l.ownerSales || l.ownerConsult || l.ownerDocs));
                return (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.card : T.card2 }}>
                    <td style={{ padding: "9px 14px", fontSize: 11, fontWeight: 700, color: T.text }}>{l.name}</td>
                    <td style={{ padding: "9px 14px", fontSize: 11, color: T.muted }}>{l.phone || "—"}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10, background: `${stC}22`, color: stC, border: `1px solid ${stC}44`, whiteSpace: "nowrap" }}>
                        {l.status || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 14px", fontSize: 11, color: T.muted }}>{l.lastCall || "—"}</td>
                    <td style={{ padding: "9px 14px" }}>
                      {owner ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Av id={owner.id} team={[owner]} size={22}/><span style={{ fontSize: 10, color: T.text }}>{owner.name}</span></div> : <span style={{ color: T.muted, fontSize: 10 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export { Dashboard };
