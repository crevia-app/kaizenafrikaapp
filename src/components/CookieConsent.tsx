import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "kaizen_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4 sm:px-6 sm:pb-6 animate-fade-in">
      <div className="mx-auto max-w-3xl bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-bronze to-transparent" />

        <div className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-bold text-foreground font-poppins">We value your privacy</p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We use cookies to improve your browsing experience, serve personalized content for creators and brands, and analyze how our platform is used. By clicking "Accept All", you consent to our use of cookies.{" "}
              <Link
                to="/cookie-policy"
                className="text-bronze hover:underline underline-offset-2 transition-colors font-medium"
              >
                Read More
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={decline}
              className="px-4 py-2 rounded-xl border border-border/60 hover:bg-muted active:scale-95 text-muted-foreground text-sm font-medium font-poppins transition-all duration-150 whitespace-nowrap"
            >
              Reject Non-Necessary
            </button>
            <button
              onClick={accept}
              className="px-5 py-2 rounded-xl bg-bronze hover:bg-bronze/90 active:scale-95 text-white text-sm font-semibold font-poppins transition-all duration-150 shadow-sm whitespace-nowrap"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
