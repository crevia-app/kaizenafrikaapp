import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { BackButton } from "@/components/BackButton";
import HeroPattern from "@/components/HeroPattern";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentMethodModal } from "@/components/subscription/PaymentMethodModal";

const fmt = (n: number) => n === 0 ? "$0" : `$${n % 1 === 0 ? n.toLocaleString() : n.toFixed(2)}`;

const DEFAULT_BUSINESS_PRICE = 74.99;

type PlanFeature = {
  product: string;
  detail: string;
  note?: string;
  lockNote?: string;
};

const PLANS = (billingCycle: "monthly" | "yearly", proPrice: number, businessPrice: number) => {
  const proYearly      = parseFloat((proPrice * 10).toFixed(2));
  const businessYearly = parseFloat((businessPrice * 10).toFixed(2));
  return [
    {
      name: "Free",
      badge: null,
      priceMonthly: "$0",
      priceYearly: "$0",
      period: "",
      seatNote: null,
      description: "Start building your professional footprint.",
      features: [
        { product: "Kira AI", detail: "5 Daily Credits", note: "Refreshed daily" },
        { product: "Kaizen Invoice", detail: "2 standard invoices / month", lockNote: "Customization excluded" },
        { product: "Kaizen Link", detail: "Core profile engine & basic themes", lockNote: "Analytics excluded" },
      ] as PlanFeature[],
      cta: "Get Started",
      highlighted: false,
      planKey: null as "pro" | "business" | null,
      monthlyAmount: 0,
      yearlyAmount: 0,
    },
    {
      name: "Pro",
      badge: billingCycle === "yearly" ? "2 Months Free" : "Most Popular",
      priceMonthly: fmt(proPrice),
      priceYearly: fmt(proYearly),
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      seatNote: null,
      description: "Scale your operations with an elite toolkit.",
      features: [
        { product: "Verified badge", detail: "" },
        { product: "Kira AI", detail: "500 Monthly Credits" },
        { product: "Kaizen Invoice", detail: "Unlimited customized invoices", note: "Remove branding, add your logo, add brand colors" },
        { product: "Kaizen Link", detail: "Premium themes, custom brand colors, and advanced visitor analytics" },
      ] as PlanFeature[],
      cta: "Go Pro",
      highlighted: true,
      planKey: "pro" as const,
      monthlyAmount: proPrice,
      yearlyAmount: proYearly,
    },
    {
      name: "Business",
      badge: billingCycle === "yearly" ? "2 Months Free" : "For Teams",
      priceMonthly: fmt(businessPrice),
      priceYearly: fmt(businessYearly),
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      seatNote: "+ $19.99 per additional seat",
      description: "Centralize your external team and client roster.",
      features: [
        { product: "Verified badge", detail: "" },
        { product: "Kira AI", detail: "Unlimited priority processing" },
        { product: "Kaizen Invoice", detail: "Unlimited invoices", note: "Removed branding, add your brand colors and logo" },
        { product: "Kaizen Link", detail: "Brand colors, logos, and advanced visitor analytics" },
        { product: "Support", detail: "Priority support" },
      ] as PlanFeature[],
      cta: "Get Business",
      highlighted: false,
      planKey: "business" as const,
      monthlyAmount: businessPrice,
      yearlyAmount: businessYearly,
    },
  ];
};

const Pricing = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPaystackLoading, setIsPaystackLoading] = useState<string | null>(null);
  const { isPro, isBusiness } = useSubscription();
  const [paymentModal, setPaymentModal] = useState<{
    planKey: "pro" | "business";
    monthlyAmount: number;
    yearlyAmount: number;
  } | null>(null);
  const [proPrice, setProPrice]               = useState(14.99);
  const [businessPrice, setBusinessPrice]     = useState(DEFAULT_BUSINESS_PRICE);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
    (supabase.from("app_settings" as any) as any)
      .select("key, value")
      .in("key", ["plan_price_pro", "plan_price_business"])
      .then(({ data }: { data: any[] | null }) => {
        if (!data) return;
        data.forEach(row => {
          const n = parseFloat(row.value);
          if (!isNaN(n) && n > 0 && n < 999) {
            if (row.key === "plan_price_pro")      setProPrice(n);
            if (row.key === "plan_price_business") setBusinessPrice(n);
          }
        });
      });
  }, []);

  const handleUpgrade = (planKey: "pro" | "business", monthlyAmount: number, yearlyAmount: number) => {
    if (!isLoggedIn) { navigate("/auth"); return; }
    setPaymentModal({ planKey, monthlyAmount, yearlyAmount });
  };

  const handlePaymentMethodSelect = async (method: "card" | "mobile_money") => {
    if (!paymentModal) return;
    const { planKey, monthlyAmount, yearlyAmount } = paymentModal;
    setPaymentModal(null);
    setIsPaystackLoading(planKey);
    const amount = billingCycle === "yearly" ? yearlyAmount : monthlyAmount;
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;
    if (!email) { setIsPaystackLoading(null); return; }
    const w = window as unknown as {
      PaystackPop: { setup: (opts: Record<string, unknown>) => { openIframe: () => void } }
    };
    const handler = w.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email,
      amount: amount * 100,
      currency: method === "card" ? "USD" : "KES",
      channels: method === "card" ? ["card"] : ["mobile_money"],
      metadata: { plan: planKey, billing_cycle: billingCycle },
      callback: () => { navigate("/profile/payments-billing"); setIsPaystackLoading(null); },
      onClose: () => setIsPaystackLoading(null),
    });
    handler.openIframe();
  };

  const plans = PLANS(billingCycle, proPrice, businessPrice);

  return (
    <div className="min-h-dvh bg-background page-bg-warm overflow-x-clip">
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for businesses and brands. Free plan forever. Kaizen Afrika Pro from $14.99/month — unlimited invoices, 500 Kira AI credits, premium analytics. Business from $74.99/month."
        keywords="Kaizen Afrika pricing, invoicing software price, AI business tool cost, Kaizen Afrika Pro plan, Kaizen Afrika Business plan, affordable invoicing Kenya"
        url="/pricing"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Is Kaizen Afrika free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Kaizen Afrika has a permanent Free plan that includes 5 Kira AI credits per day, 2 invoices per month, and a basic Kaizen Link profile — no credit card required."
              }
            },
            {
              "@type": "Question",
              "name": "How much does Kaizen Afrika Pro cost?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Kaizen Afrika Pro starts at $14.99 per month. It includes 500 Kira AI credits per month, unlimited invoices, and premium Kaizen Link analytics."
              }
            },
            {
              "@type": "Question",
              "name": "What is the Business plan?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "The Business plan is $74.99 per month and includes 3 seats, unlimited Kira AI, and unlimited invoices. Additional seats are $19.99 each."
              }
            },
            {
              "@type": "Question",
              "name": "Can I cancel my subscription anytime?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. You can cancel your Kaizen Afrika subscription at any time. Your plan remains active until the end of the billing period."
              }
            },
            {
              "@type": "Question",
              "name": "What is Kira AI?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Kira is Kaizen Afrika's built-in AI business intelligence assistant. It helps with invoice drafting, deal structuring, business strategy, and operational advice — directly inside your Kaizen Afrika workspace."
              }
            }
          ]
        }}
      />
      <Header />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-8 md:pb-12 px-4 md:px-6 overflow-hidden">
        <HeroPattern />
        <div className="container mx-auto max-w-5xl relative z-10 mb-4">
          <BackButton fallback="/" />
        </div>
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <ScrollReveal>
            <p className="text-bronze font-poppins font-semibold text-sm tracking-widest uppercase mb-4">
              Pricing
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Simple pricing.{" "}
              <span className="text-gradient-bronze">Serious tools.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Pay for what moves your business forward. Nothing else.
            </p>
          </ScrollReveal>

          {/* Monthly / Yearly Toggle */}
          <ScrollReveal delay={0.22}>
            <div className="inline-flex items-center p-1 bg-secondary rounded-full">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 md:px-8 py-2.5 rounded-full font-poppins font-semibold text-xs sm:text-sm transition-all duration-300 ${
                  billingCycle === "monthly"
                    ? "bg-foreground text-background shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 md:px-8 py-2.5 rounded-full font-poppins font-semibold text-xs sm:text-sm transition-all duration-300 ${
                  billingCycle === "yearly"
                    ? "bg-foreground text-background shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
              </button>
            </div>
            {billingCycle === "yearly" && (
              <p className="text-xs text-bronze font-poppins font-semibold mt-3">
                Save 2 months with yearly billing
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 md:pb-28 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={billingCycle}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
            >
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className={`relative flex flex-col rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-xl ${
                    plan.highlighted
                      ? "border-gradient-bronze bg-gradient-to-br from-bronze/8 to-background shadow-lg shadow-bronze/10"
                      : plan.name === "Business"
                        ? "border-gradient-bronze bg-card"
                        : "border border-border bg-card"
                  }`}
                >
                  {plan.badge && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-poppins font-semibold mb-5 uppercase tracking-wider w-fit ${
                      plan.highlighted
                        ? "bg-bronze text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {plan.highlighted && <Sparkles className="w-3 h-3" />}
                      {plan.badge}
                    </span>
                  )}

                  {!plan.badge && <div className="mb-8" />}

                  <h3 className="font-vollkorn text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{plan.description}</p>

                  <div className="mb-1">
                    <span className="font-vollkorn text-4xl md:text-5xl font-bold">
                      {billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground text-base ml-1">{plan.period}</span>
                    )}
                  </div>

                  {plan.name === "Business" && (
                    <p className="text-xs text-muted-foreground font-poppins mb-0.5">Includes 3 seats</p>
                  )}
                  {plan.seatNote && (
                    <p className="text-xs text-muted-foreground font-poppins mb-1">{plan.seatNote}</p>
                  )}

                  <div className="mb-6 h-5">
                    {billingCycle === "yearly" && (plan.planKey === "pro" || plan.planKey === "business") && (
                      <p className="text-xs text-bronze font-poppins font-semibold">
                        2 months free vs monthly
                      </p>
                    )}
                    {billingCycle === "monthly" && (plan.planKey === "pro" || plan.planKey === "business") && (
                      <p className="text-xs text-muted-foreground font-poppins">
                        Switch to yearly and save 2 months
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, fi) => (
                      <motion.li
                        key={f.product}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 + fi * 0.04 }}
                        className="flex items-center gap-2.5"
                      >
                        {f.product === "Verified badge" ? (
                          <>
                            <VerifiedBadge size="sm" />
                            <span className="text-sm font-semibold text-foreground">Verified badge</span>
                          </>
                        ) : (
                          <>
                            <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-bronze" : "text-muted-foreground"}`} />
                            <span className="text-sm leading-relaxed">
                              <span className="font-medium text-foreground">{f.product}{f.detail ? ":" : ""}</span>{" "}
                              {f.detail}
                              {f.note && <span className="text-muted-foreground text-xs"> · {f.note}</span>}
                              {f.lockNote && <span className="text-muted-foreground/70 text-xs italic"> ({f.lockNote})</span>}
                            </span>
                          </>
                        )}
                      </motion.li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {plan.planKey ? (
                    <Button
                      onClick={() => handleUpgrade(plan.planKey!, plan.monthlyAmount, plan.yearlyAmount)}
                      disabled={
                        isPaystackLoading !== null ||
                        (plan.planKey === "pro" && isPro) ||
                        (plan.planKey === "business" && isBusiness)
                      }
                      className={`w-full font-poppins font-semibold ${
                        plan.highlighted
                          ? "bg-bronze hover:bg-bronze-dark text-white"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                      size="lg"
                    >
                      {(plan.planKey === "pro" && isPro) || (plan.planKey === "business" && isBusiness)
                        ? "Current Plan"
                        : isPaystackLoading === plan.planKey
                          ? "Processing..."
                          : <>{plan.cta} <ArrowRight className="ml-2 w-4 h-4" /></>
                      }
                    </Button>
                  ) : (
                    <Link to={isLoggedIn ? "/kira" : "/auth?mode=signup"}>
                      <Button
                        className="w-full font-poppins font-semibold bg-secondary hover:bg-secondary/80 text-foreground"
                        size="lg"
                      >
                        {plan.cta} <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-secondary/30 section-tint-warm">
        <div className="container mx-auto max-w-3xl">
          <ScrollReveal>
            <h2 className="font-vollkorn text-3xl md:text-4xl font-bold text-center mb-12">
              Questions? <span className="text-gradient-bronze">Answers.</span>
            </h2>
          </ScrollReveal>
          <div className="space-y-6">
            {[
              {
                q: "What's included in the free plan?",
                a: "Kaizen Link with basic templates, 5 Kira AI actions per day, and 2 invoices per month. No credit card required.",
              },
              {
                q: "Can I switch plans anytime?",
                a: "Yes. Upgrade, downgrade, or cancel at any time. Changes take effect on your next billing cycle.",
              },
              {
                q: "What payment methods do you accept?",
                a: "All major credit and debit cards, and M-Pesa for local payments across Africa.",
              },
            ].map(({ q, a }, i) => (
              <ScrollReveal key={q} delay={i * 0.06}>
                <div className="p-5 md:p-8 rounded-xl border border-border bg-card">
                  <h3 className="font-vollkorn text-lg md:text-xl font-bold mb-2">{q}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-28 px-4 md:px-6 overflow-hidden">
        <HeroPattern />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <ScrollReveal variant="blur">
            <h2 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Ready to <span className="text-gradient-bronze">progress, every day?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Start free today. No credit card. No friction.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15} variant="scale">
            <Link to={isLoggedIn ? "/kira" : "/auth?mode=signup"}>
              <Button
                size="lg"
                className="bg-bronze hover:bg-bronze-dark text-lg px-12 py-7 font-poppins font-semibold shadow-lg hover-scale"
              >
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <Footer />

      {paymentModal && (
        <PaymentMethodModal
          planKey={paymentModal.planKey}
          amount={billingCycle === "yearly" ? paymentModal.yearlyAmount : paymentModal.monthlyAmount}
          billingCycle={billingCycle}
          onSelect={handlePaymentMethodSelect}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </div>
  );
};

export default Pricing;
