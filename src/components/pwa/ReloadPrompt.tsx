import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import { useVersionCheck } from "@/hooks/use-version-check";

/**
 * ReloadPrompt
 *
 * Listens for `navigator.serviceWorker.controllerchange` — the native event
 * that fires the instant a new Service Worker takes control of the page.
 * With registerType:'autoUpdate' + skipWaiting:true in vite.config.ts, this
 * fires automatically on every new Vercel deploy without any user action.
 *
 * When detected, shows a Dark Luxury snackbar at the bottom of the screen.
 * Tapping "Update" reloads the page so the user lands on the new bundle.
 *
 * Drop this into <App /> once — it is self-contained and renders nothing
 * until an update is available.
 */
export function ReloadPrompt() {
  const [swReady, setSwReady]     = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { needsReload }           = useVersionCheck();

  // Trigger 1: new Service Worker took control (PWA bundle update)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handleControllerChange = () => setSwReady(true);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  const handleUpdate  = () => window.location.reload();
  const handleDismiss = () => setDismissed(true);

  // Show when either trigger fires and the user hasn't dismissed
  const visible = (swReady || needsReload) && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-32px)] max-w-sm"
        >
          <div className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            style={{ background: "rgba(9,9,11,0.96)", backdropFilter: "blur(16px)" }}
          >
            {/* Subtle bronze glow bar across the top */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F0782F] to-transparent opacity-70" />

            <div className="h-8 w-8 rounded-xl bg-[#F0782F]/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-[#F0782F]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight">
                New version available
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                Kaizen Afrika has been updated.
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none flex-shrink-0 px-1"
              aria-label="Dismiss"
            >
              ×
            </button>

            <button
              onClick={handleUpdate}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#F0782F] hover:bg-[#F0782F]/90 active:scale-95 transition-all text-[12px] font-bold text-white flex-shrink-0"
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
