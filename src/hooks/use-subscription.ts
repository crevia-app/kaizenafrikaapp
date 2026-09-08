import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionPlan = "free" | "pro" | "creative_pro" | "brand_workspace" | "business";

export interface SubscriptionLimits {
  // Dira AI
  diraActionsPerMonth: number;      // Infinity = unlimited (Business)
  diraActionsPerDay: number;        // 5 for free (daily reset), Infinity for paid
  isDailyCredit: boolean;           // true = free daily model; false = monthly pool
  // Content
  invoicesPerMonth: number;
  hasInvoiceCustomization: boolean; // false for free (no logo/color/method)
  // Themes / appearance
  hasPremiumThemes: boolean;
  freeThemesOnly: boolean;          // true = only 4 base themes allowed
  freeFontsOnly: boolean;           // true = only 2 fonts allowed
  hasColorOverride: boolean;        // false for free
  layoutLocked: "sharp" | null;     // "sharp" = curved layout is Pro-only
  hasFullAnalytics: boolean;
  // Workspace
  maxWorkspaces: number;
  canCreateWorkspace: boolean;
  canJoinWorkspace: boolean;        // false for free — cannot create OR join
  hasRBAC: boolean;
  // Invoice
  hasUnlimitedInvoices: boolean;
  hasInvoiceWatermark: boolean;
  // Account
  hasClientPortal: boolean;
  hasVerifiedBadge: boolean;
  hasMultiSeat: boolean;
  prioritySupport: boolean;
  // UI
  showDiraCounter: boolean;         // true only for free; hidden for Pro/Business per spec
  baseSeats: number;
}

export interface SubscriptionState {
  plan: SubscriptionPlan;
  status: string;
  isLoading: boolean;
  isPro: boolean;
  isBusiness: boolean;
  isBrandWorkspace: boolean;
  isFree: boolean;
  limits: SubscriptionLimits;
  diraActionsToday: number;         // daily usage (free) or monthly usage (pro)
  diraActionsLimit: number;         // 5 daily (free) or 500 monthly (pro) or Infinity (business)
  diraDailyUsed: number;            // free tier: actions used today
  diraDailyResetAt: string | null;  // free tier: ISO timestamp of last daily reset
  invoicesUsedThisMonth: number;
  showDiraCounter: boolean;
  canCreateWorkspace: boolean;
  canJoinWorkspace: boolean;
}

// ── Plan limit constants ──────────────────────────────────────────────────

const PRO_LIMITS: SubscriptionLimits = {
  diraActionsPerMonth: 500,
  diraActionsPerDay: Infinity,
  isDailyCredit: false,
  invoicesPerMonth: Infinity,
  hasInvoiceCustomization: true,
  hasPremiumThemes: true,
  freeThemesOnly: false,
  freeFontsOnly: false,
  hasColorOverride: true,
  layoutLocked: null,
  hasFullAnalytics: true,
  maxWorkspaces: 10,
  canCreateWorkspace: true,
  canJoinWorkspace: true,
  hasRBAC: false,
  hasUnlimitedInvoices: true,
  hasInvoiceWatermark: false,
  hasClientPortal: true,
  hasVerifiedBadge: true,
  hasMultiSeat: false,
  prioritySupport: true,
  showDiraCounter: false,
  baseSeats: 1,
};

const BUSINESS_LIMITS: SubscriptionLimits = {
  diraActionsPerMonth: Infinity,
  diraActionsPerDay: Infinity,
  isDailyCredit: false,
  invoicesPerMonth: Infinity,
  hasInvoiceCustomization: true,
  hasPremiumThemes: true,
  freeThemesOnly: false,
  freeFontsOnly: false,
  hasColorOverride: true,
  layoutLocked: null,
  hasFullAnalytics: true,
  maxWorkspaces: Infinity,
  canCreateWorkspace: true,
  canJoinWorkspace: true,
  hasRBAC: true,
  hasUnlimitedInvoices: true,
  hasInvoiceWatermark: false,
  hasClientPortal: true,
  hasVerifiedBadge: true,
  hasMultiSeat: true,
  prioritySupport: true,
  showDiraCounter: false,
  baseSeats: 3,
};

const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  free: {
    // Dira — 5 daily credits with daily reset
    diraActionsPerMonth: Infinity,  // daily cap is what enforces the limit
    diraActionsPerDay: 5,
    isDailyCredit: true,
    // Invoice — 2/month, no customization, forced Kaizen Afrika watermark
    invoicesPerMonth: 2,
    hasUnlimitedInvoices: false,
    hasInvoiceWatermark: true,
    hasInvoiceCustomization: false,
    // Workspace — cannot create OR join
    maxWorkspaces: 0,
    canCreateWorkspace: false,
    canJoinWorkspace: false,
    hasRBAC: false,
    // Kaizen Link — 4 themes, 2 fonts, sharp layout only, no color override, no analytics
    hasPremiumThemes: false,
    freeThemesOnly: true,
    freeFontsOnly: true,
    hasColorOverride: false,
    layoutLocked: "sharp",
    hasFullAnalytics: false,
    // Account
    hasClientPortal: false,
    hasVerifiedBadge: false,
    hasMultiSeat: false,
    prioritySupport: false,
    showDiraCounter: true,
    baseSeats: 1,
  },
  pro:              PRO_LIMITS,
  creative_pro:     PRO_LIMITS,
  business:         BUSINESS_LIMITS,
  brand_workspace:  BUSINESS_LIMITS,
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export const useSubscription = (): SubscriptionState => {
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [status, setStatus] = useState("inactive");
  const [isLoading, setIsLoading] = useState(true);
  const [diraActionsToday, setDiraActionsToday] = useState(0);
  const [diraActionsLimit, setDiraActionsLimit] = useState(5);
  const [diraDailyUsed, setDiraDailyUsed] = useState(0);
  const [diraDailyResetAt, setDiraDailyResetAt] = useState<string | null>(null);
  const [invoicesUsedThisMonth, setInvoicesUsedThisMonth] = useState(0);

  const applyProfile = (profile: Record<string, unknown>) => {
    setPlan((profile.subscription_plan as SubscriptionPlan) || "free");
    setStatus((profile.subscription_status as string) || "inactive");
    setDiraActionsToday((profile.dira_actions_used as number) || 0);
    // NULL dira_actions_limit = unlimited (Business). Use Infinity so comparisons work.
    const rawLimit = profile.dira_actions_limit;
    setDiraActionsLimit(rawLimit == null ? Infinity : (rawLimit as number));
    // Daily credit fields — new columns (null-safe for existing rows)
    setDiraDailyUsed((profile.dira_daily_used as number) || 0);
    setDiraDailyResetAt((profile.dira_daily_reset_at as string) || null);
    setInvoicesUsedThisMonth((profile.invoices_used_this_month as number) || 0);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "subscription_plan, subscription_status, dira_actions_used, dira_actions_limit, " +
          "invoices_used_this_month, " +
          "dira_daily_used, dira_daily_reset_at"
        )
        .eq("id", user.id)
        .single();

      if (profile) applyProfile(profile as Record<string, unknown>);
      setIsLoading(false);

      channel = supabase
        .channel(`subscription:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            applyProfile(payload.new as Record<string, unknown>);
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const currentPlan = plan || "free";
  const limits = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS["free"];
  const isActiveStatus = ACTIVE_STATUSES.has(status);
  const isPro = (currentPlan === "pro" || currentPlan === "creative_pro") && isActiveStatus;
  const isBusiness = (currentPlan === "business" || currentPlan === "brand_workspace") && isActiveStatus;
  const isFree = currentPlan === "free" || !isActiveStatus;

  return {
    plan: currentPlan,
    status,
    isLoading,
    isPro,
    isBusiness,
    isBrandWorkspace: isBusiness,
    isFree,
    limits,
    diraActionsToday,
    diraActionsLimit,
    diraDailyUsed,
    diraDailyResetAt,
    invoicesUsedThisMonth,
    showDiraCounter: isFree,
    canCreateWorkspace: limits.canCreateWorkspace,
    canJoinWorkspace: limits.canJoinWorkspace,
  };
};
