import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Pre-React crash shield ────────────────────────────────────────────────────
// Module-level errors (TDZ in vendor chunks, circular dep crashes) happen before
// React mounts. They bypass the ErrorBoundary entirely, leaving #root-shell
// spinning forever. This handler kills the spinner and shows a fallback UI.

const PRE_REACT_RELOAD_KEY = "kaizen_pre_react_reload";

function injectFallbackUI() {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100dvh;background:#09090b;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,-apple-system,sans-serif;">
      <p style="color:#fff;font-size:20px;font-weight:700;margin:0 0 24px 0;">Kaizen Afrika</p>
      <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px 0;">System error</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 24px 0;max-width:300px;line-height:1.6;">
        Kaizen Afrika encountered an unexpected error. A quick refresh usually resolves this.
      </p>
      <button
        onclick="sessionStorage.removeItem('${PRE_REACT_RELOAD_KEY}');if('caches' in window){caches.keys().then(function(k){return Promise.all(k.map(function(c){return caches.delete(c)}))}).finally(function(){location.reload()})}else{location.reload()}"
        style="background:#c9a84c;color:#000;font-weight:600;font-size:14px;padding:11px 22px;border-radius:12px;border:none;cursor:pointer;"
      >Refresh page</button>
    </div>`;
}

// Auto-clear SW registrations + caches and reload once; if that already
// failed within the last 30s (still stuck after a clean retry), give up and
// show a human-readable error instead of silently looping forever.
function recoverOrFallback() {
  let last: string | null = null;
  try { last = sessionStorage.getItem(PRE_REACT_RELOAD_KEY); } catch { /**/ }
  if (!last || Date.now() - Number(last) > 30_000) {
    try { sessionStorage.setItem(PRE_REACT_RELOAD_KEY, String(Date.now())); } catch { /**/ }
    (async () => {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys().catch(() => [] as string[]);
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      window.location.reload();
    })();
    return;
  }
  injectFallbackUI();
}

// capture: true is required here — a failed <script>/<img>/<link> load (the
// exact case of a stale cached index.html pointing at a JS chunk hash that no
// longer exists after a new deploy) fires a *non-bubbling* error event that a
// normal bubbling-phase window listener would never see, leaving the splash
// spinning forever with this handler none the wiser.
window.addEventListener(
  "error",
  (e) => {
    // Only intercept while React hasn't mounted yet (#root-shell still present)
    if (!document.getElementById("root-shell")) return;

    const msg = e.message ?? "";
    const isResourceLoadFailure = e.target instanceof Element && e.target !== (window as unknown as Element);
    const isChunkRelated =
      isResourceLoadFailure ||
      /Cannot access '.+' before initialization/.test(msg) ||
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed");

    if (isChunkRelated) {
      recoverOrFallback();
      return;
    }

    // Fallback: replace the infinite spinner with a human-readable error UI
    injectFallbackUI();
  },
  { capture: true },
);

// Promise-based dynamic-import failures (some browsers reject rather than
// throw) can slip past both the error listener above and React's own
// boundaries if they happen before React has mounted anything to catch them.
window.addEventListener("unhandledrejection", (e) => {
  if (!document.getElementById("root-shell")) return;
  const msg = String(e.reason?.message ?? e.reason ?? "");
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  ) {
    recoverOrFallback();
  }
});

// When a lazy chunk 404s (deploy hash mismatch) reload to fetch fresh index.html
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

// Watchdog: if React still hasn't replaced the static splash after a generous
// window, something hung silently (no error/rejection event fired at all —
// e.g. the entry script itself never loaded because a stale service worker
// served a cached index.html referencing a deleted build hash). Don't leave
// the user staring at a spinner forever; run the same recovery path.
window.setTimeout(() => {
  if (document.getElementById("root-shell")) {
    recoverOrFallback();
  }
}, 10_000);

createRoot(document.getElementById("root")!).render(<App />);
