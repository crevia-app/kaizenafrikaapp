import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";

const STORAGE_KEY = "kaizen_pro_notified";

const ProUpgradeToast = ({ plan }: { plan?: string }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (plan === "pro" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, [plan]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="relative rounded-2xl border border-[#F0782F]/30 bg-[#0A0A0A] px-5 py-4 shadow-[0_0_32px_rgba(240,120,47,0.10)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-7 w-7 rounded-full bg-[#F0782F]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-[#F0782F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">Kaizen Afrika Pro Unlocked.</p>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">Full access to the infrastructure is now live.</p>
          </div>
          <button
            onClick={dismiss}
            className="text-white/20 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#F0782F]/40 to-transparent rounded-full" />
      </div>
    </div>
  );
};

export default ProUpgradeToast;
