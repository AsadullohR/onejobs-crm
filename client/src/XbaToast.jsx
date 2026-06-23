import { useState, useEffect, useRef } from "react";
import { useT } from "./theme.js";

// Confetti particle
function Particle({ x, y, color, angle, speed, size }) {
  const style = {
    position: "absolute",
    left: x, top: y,
    width: size, height: size,
    background: color,
    borderRadius: Math.random() > 0.5 ? "50%" : "2px",
    transform: `rotate(${angle}deg)`,
    animation: `confetti-fall 1.4s ease-out forwards`,
    "--tx": `${Math.cos(angle * Math.PI / 180) * speed * 60}px`,
    "--ty": `${Math.sin(angle * Math.PI / 180) * speed * 60 + 80}px`,
  };
  return <div style={style} />;
}

const COLORS = ["#f59e0b", "#10b981", "#6366f1", "#f97316", "#ec4899", "#22c55e", "#0ea5e9"];

function makeParticles(n = 30) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: `${20 + Math.random() * 60}%`,
    y: `${10 + Math.random() * 30}%`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    angle: -120 + Math.random() * 240,
    speed: 0.5 + Math.random() * 1.5,
    size: 6 + Math.random() * 8,
  }));
}

export function XbaToast({ toasts, onDismiss }) {
  const T = useT();

  if (!toasts || toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(360deg) scale(0); opacity: 0; }
        }
        @keyframes xba-slide-in {
          0%   { transform: translateX(120%); opacity: 0; }
          60%  { transform: translateX(-8px); }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes xba-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          50%       { box-shadow: 0 0 0 12px rgba(249,115,22,0); }
        }
        @keyframes xba-bounce {
          0%, 100% { transform: scale(1); }
          30%       { transform: scale(1.15); }
          60%       { transform: scale(0.95); }
        }
      `}</style>
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 12, pointerEvents: "none" }}>
        {toasts.map(toast => (
          <XbaToastItem key={toast.id} toast={toast} onDismiss={onDismiss} T={T} />
        ))}
      </div>
    </>
  );
}

function XbaToastItem({ toast, onDismiss, T }) {
  const [particles] = useState(() => makeParticles(24));
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 400);
    }, 6000);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onDismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
      style={{
        position: "relative",
        pointerEvents: "auto",
        cursor: "pointer",
        width: 320,
        background: "linear-gradient(135deg, #1a0a00 0%, #2d1200 50%, #1a0a00 100%)",
        border: "2px solid #f97316",
        borderRadius: 16,
        padding: "16px 20px",
        overflow: "hidden",
        animation: "xba-slide-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards, xba-pulse 2s ease-in-out 0.5s infinite",
      }}
    >
      {/* Confetti */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </div>

      {/* Glow background */}
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 36, animation: "xba-bounce 0.6s ease-in-out 0.3s 3", flexShrink: 0 }}>💰</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f97316", marginBottom: 3 }}>XBA TO'LOV! 🎉</div>
            <div style={{ fontSize: 12, color: "#fed7aa", lineHeight: 1.4 }}>{toast.message.replace("💰 XBA To'lov! ", "").replace(" 🎉", "")}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 12, height: 3, background: "rgba(249,115,22,0.2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: "#f97316", borderRadius: 2,
            animation: "xba-progress 6s linear forwards",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes xba-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
