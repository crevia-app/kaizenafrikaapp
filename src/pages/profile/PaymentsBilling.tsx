import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  CreditCard, ArrowRight, Check, Sparkles,
  Receipt, Calendar, Smartphone, Users, AlertTriangle,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

const planLabel = (plan: string) => {
  if (plan === "business" || plan === "brand_workspace") return "Business";
  if (plan === "pro" || plan === "creative_pro") return "Pro";
  return "Free";
};

const planPrice = (plan: string) => {
  if (plan === "business" || plan === "brand_workspace") return "$74.99 / month";
  if (plan === "pro" || plan === "creative_pro") return "$14.99 / month";
  return "Free — no billing required";
};

const isPaidPlan = (plan: string) =>
  ["pro", "creative_pro", "brand_workspace", "business"].includes(plan);

// Payment method definitions — amount changes per target plan
const buildMethods = (planKey: "pro" | "business") => {
  const usdAmount = planKey === "business" ? 7499 : 1499;
  const kesAmount = planKey === "business" ? 974900 : 194900; // ~$74.99 ≈ KES 9,749
  const usdLabel  = planKey === "business" ? "$74.99" : "$14.99";
  const kesLabel  = planKey === "business" ? "KES 9,749" : "KES 1,949";
  return [
    {
      id: "card",
      label: "Credit / Debit Card",
      providers: "Visa · Mastercard · Verve",
      price: usdLabel,
      note: "Billed in USD",
      currency: "USD",
      amount: usdAmount,
      channels: ["card"],
      badge: null,
      icon: CreditCard,
    },
    {
      id: "mobile_money",
      label: "Mobile Money",
      providers: "M-Pesa · Airtel Money · MTN",
      price: kesLabel,
      note: "≈ " + usdLabel + " · Billed in KES",
      currency: "KES",
      amount: kesAmount,
      channels: ["mobile_money"],
      badge: "Popular in Kenya",
      icon: Smartphone,
    },
  ];
};

const PaymentsBilling = () => {
  const { t } = useLanguage();
  const [userId, setUserId]               = useState<string | null>(null);
  const [subscription, setSubscription]   = useState<string>("free");
  const [subStatus, setSubStatus]         = useState<string>("free");
  const [subExpiry, setSubExpiry]         = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [showDialog, setShowDialog]       = useState(false);
  const [targetPlan, setTargetPlan]       = useState<"pro" | "business">("pro");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling]       = useState(false);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("profile-subscription")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as { subscription_plan?: string; subscription_status?: string; subscription_expires_at?: string };
        setSubscription(updated.subscription_plan || "free");
        setSubStatus(updated.subscription_status || "free");
        setSubExpiry(updated.subscription_expires_at || null);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_status, subscription_expires_at")
      .eq("id", session.user.id)
      .single();
    setSubscription(profile?.subscription_plan || "free");
    setSubStatus(profile?.subscription_status || "free");
    setSubExpiry(profile?.subscription_expires_at || null);

    // Load billing history
    const { data: payments } = await supabase
      .from("subscription_payments" as any)
      .select("id, plan, amount, currency, reference, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setBillingHistory(payments || []);
    setHistoryLoading(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-subscription");
      if (error) throw error;
      setSubStatus("cancelled");
      setShowCancelDialog(false);
      toast.success("Subscription cancelled", {
        description: subExpiry
          ? `Your access continues until ${format(new Date(subExpiry), "dd MMM yyyy")}.`
          : "Your plan will revert to free at the end of the billing period.",
      });
    } catch (err: any) {
      toast.error("Could not cancel", { description: err.message });
    } finally {
      setCancelling(false);
    }
  };

  const openUpgrade = (plan: "pro" | "business") => {
    setTargetPlan(plan);
    setShowDialog(true);
  };

  const pay = async (method: ReturnType<typeof buildMethods>[number]) => {
    setShowDialog(false);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;
    if (!email) { setLoading(false); return; }

    const w = window as unknown as {
      PaystackPop: { setup: (opts: Record<string, unknown>) => { openIframe: () => void } }
    };
    const handler = w.PaystackPop.setup({
      key:      import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email,
      amount:   method.amount,
      currency: method.currency,
      channels: method.channels,
      metadata: { plan: targetPlan },
      callback: () => setLoading(false),
      onClose:  () => setLoading(false),
    });
    handler.openIframe();
  };

  const isBusiness = subscription === "business" || subscription === "brand_workspace";
  const isPro      = subscription === "pro" || subscription === "creative_pro";
  const isFree     = !isPaidPlan(subscription);

  const starterFeatures = [
    "5 Kira AI credits per day",
    "2 standard invoices per month",
    "Kaizen Link — core profile & basic templates",
    "Workspaces not included (Pro feature)",
  ];

  const proFeatures = [
    "Verified badge",
    "500 Kira AI credits per month",
    "Unlimited customized invoices — remove branding, add your logo",
    "10 collaborative workspaces per month",
    "Kaizen Link — premium themes, custom brand colors & advanced analytics",
  ];

  const businessFeatures = [
    "Verified badge",
    "3 seats included · +$19.99 per additional seat",
    "Unlimited Kira AI — priority processing",
    "Unlimited workspaces with RBAC",
    "Unlimited invoices — removed branding, add your logo & brand colors",
    "Kaizen Link — brand colors, logos & advanced visitor analytics",
    "Priority support",
  ];

  const methods = buildMethods(targetPlan);

  return (
    <div className="min-h-dvh bg-background">
      <div className="container mx-auto px-6 py-12 max-w-5xl">

        <div className="mb-10">
          <h1 className="font-vollkorn text-4xl font-bold mb-2">Payments & Billing</h1>
          <p className="text-muted-foreground">Manage your Kaizen Afrika subscription</p>
        </div>

        {/* Current Plan */}
        <Card className="p-6 mb-8 border-bronze/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-bronze/10 flex items-center justify-center">
                {isBusiness ? <Users className="h-6 w-6 text-bronze" /> : <Sparkles className="h-6 w-6 text-bronze" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-vollkorn text-xl font-bold">
                    {planLabel(subscription)} {isFree ? "Plan" : ""}
                  </h2>
                  <Badge variant="outline" className={subStatus === "cancelled" ? "text-muted-foreground border-border" : "text-bronze border-bronze/40"}>
                    {isFree ? "Free" : subStatus === "cancelled" ? "Cancelled" : "Active"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{planPrice(subscription)}</p>
                {subStatus === "cancelled" && subExpiry && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Access continues until {format(new Date(subExpiry), "dd MMM yyyy")}
                  </p>
                )}
                {subStatus === "active" && subExpiry && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Renews {format(new Date(subExpiry), "dd MMM yyyy")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isFree && (
                <Link to="/pricing">
                  <Button className="bg-bronze hover:bg-bronze/90 text-white">
                    Upgrade <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
              {!isFree && subStatus === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <CreditCard className="w-5 h-5 text-bronze" />
            <h2 className="font-vollkorn text-xl font-bold">Payment Method</h2>
          </div>
          <div className="p-4 border border-dashed border-border rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">No payment method on file</p>
              <p className="text-sm text-muted-foreground">
                Add a card or mobile money to subscribe
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openUpgrade("pro")}>
              Add Method
            </Button>
          </div>
        </Card>

        {/* Compare Plans */}
        <h2 className="font-vollkorn text-2xl font-bold mb-5">Compare Plans</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">

          {/* Free */}
          <Card className="p-6 border-border/40">
            <h3 className="font-vollkorn text-xl font-bold mb-1">Free</h3>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              {starterFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-bronze mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-auto" disabled={isFree}>
              {isFree ? "Current Plan" : "Downgrade"}
            </Button>
          </Card>

          {/* Pro */}
          <Card className="p-6 border-bronze/50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-bronze text-white border-0">Most Popular</Badge>
            </div>
            <h3 className="font-vollkorn text-xl font-bold mb-1">Pro</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">$14.99</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">≈ KES 1,949 via M-Pesa</p>
            <ul className="space-y-3 mb-6">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  {f === "Verified badge" ? (
                    <><VerifiedBadge size="sm" /><span className="text-sm font-semibold">Verified badge</span></>
                  ) : (
                    <><Check className="w-4 h-4 text-bronze shrink-0" /><span className="text-sm">{f}</span></>
                  )}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => openUpgrade("pro")}
              disabled={loading || isPro || isBusiness}
              className="w-full bg-bronze hover:bg-bronze/90 text-white"
            >
              {loading ? "Processing..." : isPro ? "Current Plan" : isBusiness ? "Downgrade" : "Upgrade to Pro"}
            </Button>
          </Card>

          {/* Business */}
          <Card className="p-6 border-border/40 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-foreground text-background border-0">For Teams</Badge>
            </div>
            <h3 className="font-vollkorn text-xl font-bold mb-1">Business</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">$74.99</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">3 seats · +$19.99/extra seat</p>
            <ul className="space-y-3 mb-6">
              {businessFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  {f === "Verified badge" ? (
                    <><VerifiedBadge size="sm" /><span className="text-sm font-semibold">Verified badge</span></>
                  ) : (
                    <><Check className="w-4 h-4 text-bronze shrink-0" /><span className="text-sm">{f}</span></>
                  )}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => openUpgrade("business")}
              disabled={loading || isBusiness}
              variant="outline"
              className="w-full"
            >
              {loading ? "Processing..." : isBusiness ? "Current Plan" : "Upgrade to Business"}
            </Button>
          </Card>
        </div>

        {/* Billing History */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <Receipt className="w-5 h-5 text-bronze" />
            <h2 className="font-vollkorn text-xl font-bold">Billing History</h2>
          </div>
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 rounded-full border-2 border-bronze border-t-transparent animate-spin" />
            </div>
          ) : billingHistory.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No billing history yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Payments will appear here once you subscribe
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {billingHistory.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-3.5 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-bronze/10 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4 text-bronze" />
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {(tx.plan || "subscription").replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "dd MMM yyyy")}
                        {tx.reference && (
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">#{tx.reference.slice(-8)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {tx.currency} {Number(tx.amount).toLocaleString()}
                    </p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      tx.status === "success"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle className="font-vollkorn text-xl">Cancel subscription?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <p className="text-sm text-muted-foreground">
              You'll keep full access to your{" "}
              <span className="font-semibold text-foreground">{planLabel(subscription)}</span> plan until{" "}
              {subExpiry ? (
                <span className="font-semibold text-foreground">{format(new Date(subExpiry), "dd MMM yyyy")}</span>
              ) : "the end of your billing period"}.
            </p>
            <p className="text-sm text-muted-foreground">
              After that your account moves to the free plan. You won't be charged again.
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelling}
            >
              Keep Plan
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-vollkorn text-xl">Choose Payment Method</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Upgrading to <span className="font-semibold capitalize">{targetPlan}</span> —{" "}
              {targetPlan === "business" ? "$74.99/mo · 3 seats" : "$14.99/mo · 1 seat"}
            </p>
          </DialogHeader>
          <div className="grid gap-3 mt-1">
            {methods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => pay(method)}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-border hover:border-bronze/60 hover:bg-bronze/5 transition-all text-left"
                >
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-bronze/10 transition-colors">
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-bronze transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{method.label}</p>
                      {method.badge && (
                        <span className="text-[10px] font-medium bg-bronze/10 text-bronze px-2 py-0.5 rounded-full">
                          {method.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{method.providers}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{method.price}</p>
                    <p className="text-[11px] text-muted-foreground">{method.note}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-bronze ml-1 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Secured by <span className="font-semibold">Paystack</span> · Cancel anytime
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsBilling;
