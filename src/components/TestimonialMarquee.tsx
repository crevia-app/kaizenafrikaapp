import ScrollReveal from "@/components/ui/ScrollReveal";

const TESTIMONIALS = [
  {
    quote:
      "Dira gave me the vocabulary to walk into brand deals and actually justify my rates. First campaign after using it — $4,500, no apology for the number.",
    name: "Amara Osei",
    role: "Content Creator · Lagos",
    initials: "AO",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    quote:
      "I sent my first Kaizen Afrika invoice, got paid in 48 hours, and felt like a proper CEO. I'm 22 running a visual studio. That's not small — it changed my entire mindset.",
    name: "Leila Hassan",
    role: "Visual Artist · Nairobi",
    initials: "LH",
    gradient: "from-rose-500 to-pink-600",
  },
];

const TestimonialMarquee = () => {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-muted/20">
      <div className="container mx-auto max-w-5xl">

        {/* Header */}
        <ScrollReveal className="text-center mb-14 md:mb-20">
          <p className="text-bronze font-poppins font-semibold text-sm tracking-widest uppercase mb-4">
            Real Voices
          </p>
          <h2 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl font-bold">
            Trusted by creatives and businesses{" "}
            <span className="text-gradient-bronze">building something real.</span>
          </h2>
        </ScrollReveal>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {TESTIMONIALS.map((item, i) => (
            <ScrollReveal key={i} variant="fade-up" delay={i * 0.07}>
              <div className="flex flex-col gap-4 h-full">

                {/* Card */}
                <div className="flex-1 bg-card border border-border/50 rounded-2xl p-7 md:p-8 shadow-sm">
                  {/* Opening quote mark */}
                  <p className="font-vollkorn text-[42px] leading-none text-foreground/70 mb-3 select-none">
                    &ldquo;
                  </p>
                  {/* Quote text */}
                  <p className="font-poppins text-[15px] md:text-base leading-[1.75] text-foreground/85">
                    {item.quote}
                  </p>
                </div>

                {/* Author — below the card, not inside */}
                <div className="flex items-center gap-3 px-1">
                  <div
                    className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${item.gradient} text-white text-sm font-semibold font-poppins shadow-sm`}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <p className="font-poppins font-semibold text-sm text-foreground leading-tight">
                      {item.name}
                    </p>
                    <p className="font-poppins text-xs text-muted-foreground mt-0.5">
                      {item.role}
                    </p>
                  </div>
                </div>

              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
};

export default TestimonialMarquee;
