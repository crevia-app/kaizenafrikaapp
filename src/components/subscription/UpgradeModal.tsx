import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Zap, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/use-subscription";

// ── Context ──────────────────────────────────────────────────────────────────

interface UpgradeModalState {
  open: boolean;
  feature: string;
  requiredPlan: "pro" | "business";
}

interface UpgradeModalContextType {
  openUpgradeModal: (feature: string, requiredPlan?: "pro" | "business") => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType>({
  openUpgradeModal: () => {},
});

// ── Provider ─────────────────────────────────────────────────────────────────

export const UpgradeModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<UpgradeModalState>({
    open: false,
    feature: "",
    requiredPlan: "pro",
  });

  const openUpgradeModal = useCallback((feature: string, requiredPlan: "pro" | "business" = "pro") => {
    setState({ open: true, feature, requiredPlan });
  }, []);

  const close = () => setState((s) => ({ ...s, open: false }));

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal }}>
      {children}
      <UpgradeModalDialog state={state} onClose={close} />
    </UpgradeModalContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useUpgradeModal = () => useContext(UpgradeModalContext);

/**
 * useFeatureGate — returns whether the feature is allowed for the current plan,
 * and a triggerUpgrade() function that opens the intercept modal when it isn't.
 *
 * Usage:
 *   const { allowed, triggerUpgrade } = useFeatureGate("E-Signatures");
 *   <Button onClick={allowed ? handleSign : triggerUpgrade}>Sign</Button>
 */
export const useFeatureGate = (feature: string, requiredPlan: "pro" | "business" = "pro") => {
  const { isPro, isBusiness } = useSubscription();
  const { openUpgradeModal } = useUpgradeModal();

  const allowed = requiredPlan === "business" ? isBusiness : (isPro || isBusiness);

  return {
    allowed,
    triggerUpgrade: () => openUpgradeModal(feature, requiredPlan),
  };
};

// ── The Dialog ────────────────────────────────────────────────────────────────

const PRO_HIGHLIGHTS = [
  "500 Monthly Power Credits for Kira AI",
  "Unlimited customized invoices — no Kaizen Afrika branding",
  "10 Collaborative Workspaces",
  "Premium themes, custom brand colors & analytics",
];

const BUSINESS_HIGHLIGHTS = [
  "Unlimited Kira AI — priority processing",
  "Unlimited Workspaces with full RBAC",
  "3 seats included · add more at $19.99/seat",
  "Priority support escalation",
];

interface UpgradeModalDialogProps {
  state: UpgradeModalState;
  onClose: () => void;
}

const UpgradeModalDialog = ({ state, onClose }: UpgradeModalDialogProps) => {
  const navigate = useNavigate();
  const isPro = state.requiredPlan === "pro";
  const highlights = isPro ? PRO_HIGHLIGHTS : BUSINESS_HIGHLIGHTS;
  const planLabel = isPro ? "Pro" : "Business";
  const price = isPro ? "$14.99" : "$74.99";

  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state every time the modal opens — component is always
  // mounted so useState persists between opens without this guard
  useEffect(() => {
    if (state.open) setIsLoading(false);
  }, [state.open]);

  const handleUpgrade = () => {
    if (isLoading) return;
    setIsLoading(true);
    onClose();
    navigate("/profile/payments-billing");
  };

  return (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100vw-16px)] max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-border/60 [&>button]:hidden">
        <DialogTitle className="sr-only">{planLabel} Feature — {state.feature} is locked</DialogTitle>

        {/* Accent bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-bronze/60 via-bronze to-bronze/60" />

        <div className="p-6 sm:p-8">
          {/* Icon + header + close */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-bronze/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-bronze" />
              </div>
              <div>
                <p className="text-xs font-semibold text-bronze uppercase tracking-widest">
                  {planLabel} Feature
                </p>
                <h3 className="font-vollkorn text-lg font-bold leading-tight">
                  {state.feature} is locked
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Upgrade to <strong className="text-foreground">{planLabel}</strong> to unlock{" "}
            <strong className="text-foreground">{state.feature}</strong> and the full Kaizen Afrika toolkit.
          </p>

          {/* Highlights */}
          <ul className="space-y-2 mb-6">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm">
                <Check className="w-4 h-4 text-bronze flex-shrink-0 mt-0.5" />
                <span className="text-foreground/80">{h}</span>
              </li>
            ))}
          </ul>

          {/* Price */}
          <div className="flex items-baseline gap-1 mb-6 px-4 py-3 rounded-xl bg-bronze/5 border border-bronze/15">
            <span className="font-vollkorn text-3xl font-bold text-foreground">{price}</span>
            <span className="text-muted-foreground text-sm">/month</span>
            {!isPro && (
              <span className="ml-auto text-xs text-muted-foreground">Includes 3 seats</span>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-bronze hover:bg-bronze/90 text-white gap-2 font-semibold h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading checkout…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Upgrade to Pro
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModalProvider;
