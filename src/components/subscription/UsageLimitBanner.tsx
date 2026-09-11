import { Zap, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface UsageLimitBannerProps {
  current: number;
  limit: number;
  feature: string;
}

const UsageLimitBanner = ({ current, limit, feature }: UsageLimitBannerProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const percentage = (current / limit) * 100;
  const isAtLimit = current >= limit;
  const isNearLimit = percentage >= 80 && !isAtLimit;

  if ((!isAtLimit && !isNearLimit) || dismissed) return null;

  return (
    <AnimatePresence>
      {isAtLimit ? (
        <motion.div
          key="at-limit"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mx-2 mt-2 mb-0.5 sm:mx-3 sm:mt-3 sm:mb-1"
        >
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-bronze/25 bg-gradient-to-r from-bronze/10 via-background to-amber-500/5 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-bronze/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
              <div className="w-7 h-7 rounded-lg bg-bronze/15 flex items-center justify-center flex-shrink-0 sm:w-8 sm:h-8 sm:rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-bronze sm:w-4 sm:h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight sm:text-sm">Monthly limit reached</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 sm:text-xs">
                  {current}/{limit} Kira prompts used this month · Upgrade for more
                </p>
              </div>
              <button
                onClick={() => navigate("/profile/payments-billing")}
                className="flex-shrink-0 flex items-center gap-1 h-7 px-3 rounded-lg bg-bronze hover:bg-bronze/90 text-background text-[11px] font-semibold transition-all shadow-md shadow-bronze/20 hover:shadow-bronze/30 sm:gap-1.5 sm:h-8 sm:px-3.5 sm:rounded-xl sm:text-xs"
              >
                <Zap className="w-3 h-3" />
                Upgrade
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors sm:w-6 sm:h-6 sm:rounded-lg"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
            {/* Usage bar */}
            <div className="h-0.5 bg-muted/40 mx-3 mb-2 rounded-full overflow-hidden sm:mx-4 sm:mb-3">
              <div className="h-full bg-bronze rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="near-limit"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-amber-500/15 bg-amber-500/5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="flex-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{current}/{limit}</span> Kira prompts used this month
          </span>
          <button
            onClick={() => navigate("/profile/payments-billing")}
            className="flex-shrink-0 flex items-center gap-1 h-6 px-2.5 rounded-lg bg-bronze/15 hover:bg-bronze/25 text-bronze text-[11px] font-semibold transition-colors"
          >
            <Zap className="w-2.5 h-2.5" />
            Upgrade
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UsageLimitBanner;
