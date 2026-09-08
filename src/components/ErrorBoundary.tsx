import React from "react";
import { logError } from "@/lib/error-logger";

interface State {
  hasError: boolean;
  isChunkError: boolean;
  message: string;
  stack: string;
}

const RELOAD_KEY = "kaizen_chunk_reload";
const DEBOUNCE_MS = 30_000; // 30 s — long enough to avoid loops, short enough to recover

async function clearCachesAndReload() {
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* IAB */ }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // best-effort
  }
  window.location.reload();
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, isChunkError: false, message: "", stack: "" };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed") ||
      error.message.includes("Unable to preload CSS") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("ChunkLoadError") ||
      /Cannot access '.+' before initialization/.test(error.message);
    return { hasError: !isChunkError, isChunkError, message: error.message, stack: error.stack ?? "" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Kaizen Afrika] Unhandled error:", error, info.componentStack);
    logError(error.message, error.stack, "react_boundary", {
      componentStack: info.componentStack?.slice(0, 2000),
    });

    // Stale deployment: browser has old JS chunk URLs that no longer exist on
    // Vercel after a new deploy. Auto-reload once to pick up new index.html.
    const isChunkError =
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed") ||
      error.message.includes("Unable to preload CSS") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("ChunkLoadError") ||
      /Cannot access '.+' before initialization/.test(error.message);

    if (isChunkError) {
      let last: string | null = null;
      try { last = sessionStorage.getItem(RELOAD_KEY); } catch { /* IAB */ }
      const now = Date.now();
      if (!last || now - Number(last) > DEBOUNCE_MS) {
        clearCachesAndReload();
      }
    }
  }

  handleManualRefresh = () => {
    // Always do a full cache-clear refresh so the manual button recovers from
    // stale-chunk situations even when the auto-reload debounce is active.
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* IAB */ }
    clearCachesAndReload();
  };

  render() {
    if (this.state.isChunkError) return null;
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-white font-bold text-xl mb-2">Something went wrong</h1>
          <p className="text-white/50 text-sm mb-4 max-w-xs">
            An unexpected error occurred. Refreshing the page usually fixes this.
          </p>
          {/* Error details — visible so devs can diagnose without opening DevTools */}
          {this.state.message && (
            <pre className="mb-4 max-w-sm w-full text-left text-[11px] text-red-400 bg-white/5 rounded-xl px-4 py-3 overflow-x-auto whitespace-pre-wrap break-all">
              {this.state.message}
              {this.state.stack ? `\n\n${this.state.stack.slice(0, 600)}` : ""}
            </pre>
          )}
          <button
            onClick={this.handleManualRefresh}
            className="bg-[#C9A84C] text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
