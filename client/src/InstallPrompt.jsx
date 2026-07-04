import { useEffect, useState } from "react";

// Captures the browser's beforeinstallprompt event (Android/Chrome) and shows
// a small install button. On iOS Safari there is no prompt API, so we show a
// one-line "Share → Add to Home Screen" hint instead (only when not installed).
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new Event("oj-install-ready"));
});

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallPrompt({ label = "📲 Ilovani o'rnatish", style = {} }) {
  const [ready, setReady] = useState(!!deferredPrompt);
  const [dismissed, setDismissed] = useState(localStorage.getItem("oj_install_dismissed") === "1");

  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener("oj-install-ready", on);
    return () => window.removeEventListener("oj-install-ready", on);
  }, []);

  if (isStandalone() || dismissed) return null;

  const dismiss = () => { localStorage.setItem("oj_install_dismissed", "1"); setDismissed(true); };

  if (ready) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", ...style }}>
        <button
          onClick={async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice.catch(() => {});
            deferredPrompt = null;
            setReady(false);
          }}
          style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#0066d8", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,102,216,.3)" }}>
          {label}
        </button>
        <button onClick={dismiss} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
    );
  }

  if (isIos()) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 10, padding: "7px 12px", ...style }}>
        <span>📲 O'rnatish: Safari'da <b>Ulashish</b> → <b>Bosh ekranga qo'shish</b></span>
        <button onClick={dismiss} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 13 }}>✕</button>
      </div>
    );
  }

  return null;
}
