import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-vollkorn text-xl font-bold text-foreground">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const Table = ({ rows }: { rows: { name: string; type: string; purpose: string; duration: string }[] }) => (
  <div className="overflow-x-auto rounded-xl border border-border/50 mt-3">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-muted/50 border-b border-border/50">
          {["Cookie Name", "Type", "Purpose", "Duration"].map(h => (
            <th key={h} className="text-left px-4 py-3 font-semibold text-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border/30 last:border-0">
            <td className="px-4 py-3 font-mono text-bronze">{r.name}</td>
            <td className="px-4 py-3">{r.type}</td>
            <td className="px-4 py-3 text-muted-foreground">{r.purpose}</td>
            <td className="px-4 py-3 whitespace-nowrap">{r.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CookiePolicy = () => {
  const navigate = useNavigate();
  return (
  <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
    <SEO title="Cookie Policy" description="Read Kaizen Afrika's Cookie Policy. Learn how we use cookies to improve your experience on the platform." url="/cookie-policy" />
    {/* Back button */}
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      Back
    </button>

    {/* Header */}
    <div className="mb-10 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Legal</p>
      <h1 className="font-vollkorn text-4xl font-bold">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
    </div>

    <div className="space-y-10">
      <Section title="What are cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a website. They help the
          site remember information about your visit — like keeping you signed in or saving your
          preferences — so you don't have to re-enter them every time.
        </p>
      </Section>

      <Section title="How Kaizen Afrika uses cookies">
        <p>
          Kaizen Afrika uses cookies strictly to operate the platform securely and provide you with the best
          experience. We do <strong className="text-foreground">not</strong> use advertising cookies,
          third-party tracking pixels, or sell your data to anyone.
        </p>
        <p>We use three categories of cookies:</p>
      </Section>

      <Section title="1. Essential cookies">
        <p>
          These are required for the platform to function. Without them you cannot log in, make
          payments, or use any part of Kaizen Afrika. You cannot opt out of essential cookies.
        </p>
        <Table rows={[
          { name: "sb-*", type: "Essential", purpose: "Supabase auth session — keeps you securely signed in", duration: "Session / 1 year" },
          { name: "kaizen_cookie_consent", type: "Essential", purpose: "Remembers your cookie consent choice", duration: "1 year" },
          { name: "kaizen-e2ee_*", type: "Essential", purpose: "Encrypted key backup for secure messaging", duration: "Local storage" },
        ]} />
      </Section>

      <Section title="2. Functional cookies">
        <p>
          These remember your preferences and settings so you don't have to reconfigure them on every
          visit. They are enabled by default but you can clear them at any time via your browser.
        </p>
        <Table rows={[
          { name: "kaizen_theme", type: "Functional", purpose: "Remembers your light/dark mode preference", duration: "1 year" },
          { name: "kaizen_notif_cleared_*", type: "Functional", purpose: "Tracks which notifications you have cleared", duration: "Local storage" },
          { name: "kaizen_chunk_reload", type: "Functional", purpose: "Prevents reload loops after app updates", duration: "Session" },
        ]} />
      </Section>

      <Section title="3. Analytics cookies">
        <p>
          Kaizen Afrika uses minimal, privacy-friendly analytics to understand how the platform is used and
          improve it. No personally identifiable information is collected or shared.
        </p>
        <Table rows={[
          { name: "link_visits / button_clicks", type: "Analytics", purpose: "Counts visits and clicks on your Kaizen Link page (stored in your own database)", duration: "Persistent" },
        ]} />
      </Section>

      <Section title="What we don't use">
        <p>Kaizen Afrika does <strong className="text-foreground">not</strong> use:</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Google Analytics or similar third-party trackers</li>
          <li>Facebook Pixel or any social media tracking</li>
          <li>Advertising or retargeting cookies</li>
          <li>Cross-site tracking of any kind</li>
        </ul>
      </Section>

      <Section title="Managing your cookies">
        <p>
          You can control or delete cookies through your browser settings. Note that disabling
          essential cookies will prevent you from logging in and using Kaizen Afrika.
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-bronze hover:underline">Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-bronze hover:underline">Firefox</a></li>
          <li><a href="https://support.apple.com/en-us/105082" target="_blank" rel="noopener noreferrer" className="text-bronze hover:underline">Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-bronze hover:underline">Edge</a></li>
        </ul>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this Cookie Policy from time to time. When we do, we'll update the "Last
          updated" date at the top of this page. Continued use of Kaizen Afrika after changes means you
          accept the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about how we use cookies? Email us at{" "}
          <a href="mailto:hi@kaizenafrika.app" className="text-bronze hover:underline">hi@kaizenafrika.app</a>.
        </p>
      </Section>

      <div className="pt-6 border-t border-border/40 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Link to="/privacy-policy" className="hover:text-bronze transition-colors">Privacy Policy</Link>
        <Link to="/terms-of-service" className="hover:text-bronze transition-colors">Terms of Service</Link>
      </div>
    </div>
  </div>
  );
};

export default CookiePolicy;
