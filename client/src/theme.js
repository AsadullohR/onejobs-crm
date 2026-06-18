import { createContext, useContext } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({});
const useT = () => useContext(ThemeCtx);
function mkT(dark) {
  return dark
    ? { dark,
        bg:"#0a0e1a", card:"#111827", card2:"#1a2236", border:"#1e2d45",
        text:"#f1f5f9", muted:"#64748b", sub:"#475569",
        accent:"#2563eb", green:"#059669", red:"#dc2626", yellow:"#d97706",
        blue:"#3b82f6", purple:"#7c3aed", cyan:"#0891b2",
        inp:"#1a2236", shadow:"0 1px 3px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3)",
        sidebarBg:"#0f172a", sidebarBorder:"#1e293b",
        navActive:"#1e3a6e", navActiveTxt:"#60a5fa", navHover:"#1a2d4a" }
    : { dark,
        bg:"#f8fafc", card:"#ffffff", card2:"#f1f5f9", border:"#e2e8f0",
        text:"#0f172a", muted:"#64748b", sub:"#94a3b8",
        accent:"#2563eb", green:"#059669", red:"#dc2626", yellow:"#d97706",
        blue:"#2563eb", purple:"#7c3aed", cyan:"#0891b2",
        inp:"#ffffff", shadow:"0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
        sidebarBg:"#0f172a", sidebarBorder:"#1e293b",
        navActive:"#1e3a6e", navActiveTxt:"#93c5fd", navHover:"#1a2d4a" };
}

export { ThemeCtx, mkT, useT };