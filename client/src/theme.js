import { createContext, useContext } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({});
const useT = () => useContext(ThemeCtx);
function mkT(dark) {
  return dark
    ? { dark, bg:"#0a0a0f", card:"#111120", card2:"#161625", border:"#1e1e35",
        text:"#e2e8f0", muted:"#64748b", sub:"#94a3b8",
        accent:"#6366f1", green:"#22c55e", red:"#ef4444", yellow:"#f59e0b",
        blue:"#3b82f6", purple:"#a855f7", cyan:"#06b6d4",
        inp:"#161625", shadow:"0 4px 24px rgba(0,0,0,.5)" }
    : { dark, bg:"#f1f5f9", card:"#ffffff", card2:"#f8fafc", border:"#e2e8f0",
        text:"#1e293b", muted:"#64748b", sub:"#94a3b8",
        accent:"#6366f1", green:"#16a34a", red:"#dc2626", yellow:"#d97706",
        blue:"#2563eb", purple:"#9333ea", cyan:"#0891b2",
        inp:"#ffffff", shadow:"0 4px 24px rgba(0,0,0,.08)" };
}

export { ThemeCtx, mkT, useT };