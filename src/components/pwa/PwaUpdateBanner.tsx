import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

// Background poll interval — detects new deploys within 2 minutes
// without requiring a navigation event or tab refresh.
const POLL_INTERVAL_MS = 2 * 60 * 1000;

export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;
      // Poll in the background so new versions are detected immediately
      setInterval(() => r.update(), POLL_INTERVAL_MS);
    },
  });

  // Safety: clear the flag if the component unmounts mid-session
  useEffect(() => {
    return () => setNeedRefresh(false);
  }, [setNeedRefresh]);

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[9999] w-[calc(100vw-32px)] sm:w-auto sm:max-w-sm"
        >
          <div
            className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            style={{ background: "#1A1A1A", backdropFilter: "blur(16px)" }}
          >
            {/* Brand orange top-glow */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F0782F] to-transparent opacity-70 pointer-events-none" />

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight">
                Update available
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                A new version of Kaizen Afrika is ready.
              </p>
            </div>

            {/* Dismiss — hides the banner without reloading */}
            <button
              onClick={() => setNeedRefresh(false)}
              aria-label="Dismiss update"
              className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Update — triple-layer reload guarantee:
                1. updateServiceWorker(true) posts SKIP_WAITING via the hook
                2. Direct SW message as fallback if hook reference is stale
                3. Hard reload after 800ms if neither triggered controllerchange */}
            <button
              onClick={async () => {
                await updateServiceWorker(true);
                const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
                if (reg?.waiting) {
                  reg.waiting.postMessage({ type: "SKIP_WAITING" });
                }
                setTimeout(() => window.location.reload(), 800);
              }}
              className="flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#F0782F] hover:bg-[#F0782F]/90 active:scale-95 transition-all text-[12px] font-bold text-white"
            >
              <RefreshCw className="h-3 w-3" />
              Update
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
