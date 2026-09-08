import { Link, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, FileText, Link2, MessageCircle, Receipt } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroPattern from "@/components/HeroPattern";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";

const OPS_CARDS = [
  { icon: Link2,         label: "Kaizen Link",         path: "/kaizen-studio" },
  { icon: MessageCircle, label: "Kaizen Chat",          path: "/kaizen-studio" },
  { icon: Receipt,       label: "Invoices & Receipts",  path: "/kaizen-invoice" },
];

const Home = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setIsLoggedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const handleOpsClick = async (path: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    navigate(session ? path : `/auth?mode=signup&redirect=${encodeURIComponent(path)}`);
  };

  return (
    <div className="min-h-dvh bg-background page-bg-warm overflow-x-clip">
      <SEO
        url="/"
        title="Kaizen Afrika — Invoice, Collaborate & Grow Your Business with AI"
        description="Kaizen Afrika is the all-in-one business platform for businesses and brands. Send professional invoices, build your link-in-bio page, and unlock Dira AI — your always-on business intelligence. Free to start."
        keywords="invoicing software Kenya, online invoice generator, freelance invoice maker, business management platform, AI business assistant, Dira AI, link in bio tool, client workspace, business operations, Kaizen Afrika app"
      />
      <Header />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-28 md:pt-40 pb-20 md:pb-32 px-4 md:px-6 min-h-[90vh] flex items-center overflow-hidden">
        <HeroPattern />
        <div className="hero-radial-glow" aria-hidden="true" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="max-w-3xl space-y-6 md:space-y-8">
            <ScrollReveal delay={0}>
              <p className="text-bronze font-poppins font-semibold text-sm md:text-base tracking-widest uppercase">
                Progress, Every Day
              </p>
            </ScrollReveal>
            {/* variant="hero" — larger 40px travel, no blur, clean typographic entrance */}
            <ScrollReveal delay={0.12} variant="hero" duration={0.8}>
              <h1 className="font-vollkorn text-[2rem] sm:text-[2.5rem] md:text-[2.75rem] lg:text-[4rem] font-bold leading-[1.08]">
                The infrastructure to scale your{" "}
                <span className="text-gradient-h1">business operations.</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.26}>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-poppins leading-relaxed max-w-2xl">
                Build a business that runs as well as it creates.
                Dira brings the intelligence. Kaizen Studio handles the operations.
                Kaizen Afrika is the infrastructure where both happen — without the chaos.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.38}>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to={isLoggedIn ? "/dira" : "/auth?mode=signup"} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-bronze hover:bg-bronze-dark text-sm sm:text-base md:text-lg px-6 sm:px-10 py-5 sm:py-7 font-poppins font-semibold shadow-lg hover-scale"
                  >
                    {isLoggedIn ? "Open Kaizen Afrika" : "Start free"} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>

      </section>


      {/* ═══════════════ THE PROBLEM ═══════════════ */}
      {/* Full-bleed cinematic photo section — photo is SHARP, clearly visible,
          text sits over a dark overlay (like the Espa reference).
          min-h-[65vh] gives it the tall, immersive feel.
          Two overlay layers:
            1. rgba(0,0,0,0.48) — dark wash that makes white text crisp
               and works identically in light + dark mode.
            2. Radial gradient — centre brighter so the image peaks through,
               edges darker for depth and to bleed into surrounding sections. */}
      <section className="relative min-h-[65vh] flex items-center px-4 md:px-6 overflow-hidden">

        {/* ── Photo layer (no blur — sharp like the reference) ─────────── */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* The image — light blur so photo reads clearly but text stays crisp */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:    "url(/workspace-bg.jpg)",
              backgroundSize:     "cover",
              backgroundPosition: "center 40%",
              filter:             "blur(2px)",
              transform:          "scale(1.01)",
            }}
          />
          {/* Dark wash — makes text readable regardless of light/dark mode */}
          <div className="absolute inset-0 bg-black" style={{ opacity: 0.52 }} />
          {/* Vignette — edges fade darker, centre stays brighter so photo shines */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          {/* Top & bottom dark vignette — pure black so it works in both light + dark mode.
              Never uses hsl(var(--background)) which is white in light mode and would
              create a jarring white smear against the dark photo overlay. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.55) 100%)",
            }}
          />
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="container mx-auto max-w-4xl text-center relative z-10 py-24 md:py-32">
          <ScrollReveal variant="hero">
            <h2 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
              Talent is not the problem.{" "}
              <span className="text-gradient-bronze">Infrastructure is.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <p className="text-lg md:text-xl text-white leading-relaxed max-w-3xl mx-auto">
              Talent is everywhere. What most businesses lack is the
              infrastructure to convert it into structured, scalable revenue.
              Kaizen Afrika closes that gap.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════ TWO LAYERS ═══════════════ */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-secondary/30 section-tint-warm">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 md:mb-20">
            <ScrollReveal>
              <p className="text-bronze font-poppins font-semibold text-sm tracking-widest uppercase mb-4">
                How It Works
              </p>
              <h2 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl font-bold">
                Two layers. <span className="text-gradient-bronze">One system.</span>
              </h2>
            </ScrollReveal>
          </div>

          {/* DIRA */}
          <ScrollReveal variant="fade-up" className="mb-20 md:mb-28">
            <div className="border-gradient-bronze bg-gradient-to-br from-bronze/8 to-background shadow-lg shadow-bronze/10 rounded-2xl p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="space-y-6 lg:col-span-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bronze/10 border border-bronze/20">
                  <Brain className="w-4 h-4 text-bronze" />
                  <span className="text-bronze font-poppins font-semibold text-sm">
                    The Intelligence Layer
                  </span>
                </div>
                <h3 className="font-vollkorn text-3xl md:text-4xl font-bold leading-tight">
                  Meet Dira.{" "}
                  <span className="text-gradient-bronze">Your AI Chief of Staff.</span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Whether you're a business scaling your operations or a brand building
                  your empire — Dira is the intelligent partner in your corner.
                  Strategy, scoping, and guidance, exactly when you need it.
                </p>
              </div>
            </div>
            </div>
          </ScrollReveal>

          {/* STUDIO */}
          <ScrollReveal variant="fade-up">
            <div className="border-gradient-bronze bg-gradient-to-br from-bronze/8 to-background shadow-lg shadow-bronze/10 rounded-2xl p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="space-y-6 lg:col-span-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bronze/10 border border-bronze/20">
                  <FileText className="w-4 h-4 text-bronze" />
                  <span className="text-bronze font-poppins font-semibold text-sm">
                    The Operations Layer
                  </span>
                </div>
                <h3 className="font-vollkorn text-3xl md:text-4xl font-bold leading-tight">
                  Kaizen Studio.{" "}
                  <span className="text-gradient-bronze">The complete operations layer.</span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Kaizen Invoice closes the books. Kaizen Chat keeps conversations flowing.
                  Kaizen Link puts your brand in front of clients. Every workflow. One system.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-md">
                  {OPS_CARDS.map(({ icon: Icon, label, path }, i) => (
                    <ScrollReveal key={label} delay={0.06 * i} variant="scale">
                      <button
                        onClick={() => handleOpsClick(path)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-bronze/5 card-bronze-glow text-left cursor-pointer"
                      >
                        <Icon className="w-5 h-5 text-bronze flex-shrink-0" />
                        <span className="font-poppins text-sm font-medium">{label}</span>
                      </button>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════ FOR WHO ═══════════════ */}
      <section className="py-20 md:py-28 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal className="text-center mb-14 md:mb-20">
            <h2 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl font-bold">
              Built for those who run{" "}
              <span className="text-gradient-bronze">a real business.</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0} variant="fade-up">
            <div className="p-8 sm:p-10 md:p-12 rounded-2xl border-gradient-bronze bg-gradient-to-br from-bronze/8 to-background shadow-lg shadow-bronze/10 card-interactive">
              <div className="max-w-3xl space-y-6">
                <p className="text-bronze font-poppins font-semibold text-sm tracking-widest uppercase">
                  Built for both sides of the table
                </p>
                <h3 className="font-vollkorn text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                  Every deal deserves{" "}
                  <span className="text-gradient-bronze">a foundation.</span>
                </h3>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  Businesses use Kaizen Afrika to brief, align, and deliver at scale — structured workflows,
                  clean invoices, and a vendor experience that kills the back-and-forth that costs
                  momentum. Proposals and invoices that command respect. One platform. No chaos.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="relative py-20 md:py-32 px-4 md:px-6 overflow-hidden">
        <HeroPattern />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <ScrollReveal variant="blur">
            <h2 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Your story deserves{" "}
              <span className="text-gradient-bronze">better infrastructure.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The infrastructure is ready. Your move.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.24} variant="scale">
            <Link to={isLoggedIn ? "/dira" : "/auth?mode=signup"} className="w-full sm:w-auto inline-block">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-bronze hover:bg-bronze-dark text-sm sm:text-base md:text-lg px-6 sm:px-10 md:px-12 py-5 sm:py-7 font-poppins font-semibold shadow-lg hover-scale"
              >
                {isLoggedIn ? "Open Kaizen Afrika" : "Progress, Every Day"} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
