import { Link, useLocation, useNavigate } from "react-router-dom";
import { Crown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { signOutWithCleanup } from "@/lib/device-session";
import { useState, useEffect, useLayoutEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBottomNavVisibility } from "@/hooks/use-bottom-nav-visibility";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { IOSInstallGuide } from "@/components/pwa/IOSInstallGuide";
import { ManualInstallGuide } from "@/components/pwa/ManualInstallGuide";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useSubscription } from "@/hooks/use-subscription";

// ── Custom Icons ──────────────────────────────────────────────────────────────

/**
 * 4-pointed diamond star — Dira
 * Mirrors the Apple Intelligence / SF Symbols "sparkle" shape:
 * outer points at cardinal directions (r=10), concave waist at 45° (r≈4√2).
 */
const DiraIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    aria-hidden="true"
    fill={active ? "currentColor" : "none"}
    stroke={active ? "none" : "currentColor"}
    strokeWidth={1.65}
    strokeLinejoin="round"
  >
    <path d="M12 2 L14.83 9.17 L22 12 L14.83 14.83 L12 22 L9.17 14.83 L2 12 L9.17 9.17 Z" />
  </svg>
);

/**
 * 2×2 rounded-square grid — Studio
 * Each tile is 8×8 with 2.5 px corner radius; gap between tiles is 2 px.
 */
const StudioIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    {([
      [3, 3],
      [13, 3],
      [3, 13],
      [13, 13],
    ] as [number, number][]).map(([x, y], i) => (
      <rect
        key={i}
        x={x} y={y} width={8} height={8} rx={2.5}
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        strokeWidth={1.65}
        strokeLinejoin="round"
      />
    ))}
  </svg>
);

/**
 * Person silhouette — More / Profile
 * Circle head + rounded shoulder arc (open arc for inactive, closed body for active).
 */
const PersonIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    {active ? (
      <>
        {/* Filled head */}
        <circle cx="12" cy="7.5" r="3.75" fill="currentColor" />
        {/* Filled body — closed quadratic path */}
        <path
          d="M4.5 20.5 C4.5 16.2 7.9 13.75 12 13.75 C16.1 13.75 19.5 16.2 19.5 20.5 Z"
          fill="currentColor"
        />
      </>
    ) : (
      <>
        {/* Outlined head */}
        <circle
          cx="12" cy="7.5" r="3.75"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.65}
        />
        {/* Open shoulder arc */}
        <path
          d="M4.5 20.5 C4.5 16.2 7.9 13.75 12 13.75 C16.1 13.75 19.5 16.2 19.5 20.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.65}
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

const MobileBottomNav = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { t }     = useLanguage();
  const [profile, setProfile]     = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { visible }               = useBottomNavVisibility();
  const subscription              = useSubscription();
  const { canInstall, isIOS, install, showIOSGuide, setShowIOSGuide, showManualGuide, setShowManualGuide } = usePWAInstall();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(profileData);
      }
    };
    fetchProfile();
  }, []);

  // ── Sync <main> bottom padding via CSS variable ──────────────────────────
  // useLayoutEffect fires synchronously BEFORE the browser paints, in the same
  // frame as the translate-y transform class change. This eliminates the
  // one-frame delay that useEffect would cause (where the nav starts moving
  // but the page padding hasn't contracted yet), preventing any visual stutter.
  useLayoutEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    document.documentElement.style.setProperty(
      "--nav-bottom-offset",
      visible
        ? "calc(44px + env(safe-area-inset-bottom, 0px))"
        : "0px"
    );
  }, [visible]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const handleSignOut = async () => {
    await signOutWithCleanup();
    navigate("/auth");
    setSheetOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setSheetOpen(false);
  };

  const navItems = [
    {
      id: "dira",
      label: "Dira",
      path: "/dira",
      prefetch: () => import("@/pages/Dira"),
      Icon: DiraIcon,
    },
    {
      id: "studio",
      label: "Studio",
      path: "/kaizen-studio",
      prefetch: () => import("@/pages/KaizenStudio"),
      Icon: StudioIcon,
    },
  ];

  return (
    <>
    {/* ── Transform-only hide/show — NO conditional rendering ──────────────── */}
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-background/85 backdrop-blur-2xl border-t border-bronze/[0.10] safe-area-pb",
        "transition-transform duration-300 ease-in-out will-change-transform",
        visible ? "translate-y-0" : "translate-y-[150%]"
      )}
    >
      <div className="grid grid-cols-3 h-[44px]">

        {/* ── Primary nav items (Dira, Studio) ──────────────────────────── */}
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              onTouchStart={item.prefetch}
              onMouseEnter={item.prefetch}
              className="flex items-center justify-center"
            >
              <div className={cn(
                "flex items-center justify-center",
                "w-14 h-10 rounded-2xl transition-all duration-300 ease-out",
                active ? "bg-bronze/15 scale-100" : "bg-transparent scale-95 hover:scale-100"
              )}>
                <span className={cn(
                  "transition-all duration-300 ease-out",
                  active
                    ? "text-bronze drop-shadow-[0_0_10px_rgba(207,129,80,0.45)]"
                    : "text-foreground/42"
                )}>
                  <item.Icon active={active} />
                </span>
              </div>
            </Link>
          );
        })}

        {/* ── More sheet (Profile / Settings) ───────────────────────────── */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex items-center justify-center" aria-label="More options">
              <div className={cn(
                "flex items-center justify-center",
                "w-14 h-10 rounded-2xl transition-all duration-300 ease-out",
                sheetOpen ? "bg-bronze/15 scale-100" : "bg-transparent scale-95 hover:scale-100"
              )}>
                <span className={cn(
                  "transition-all duration-300 ease-out",
                  sheetOpen
                    ? "text-bronze drop-shadow-[0_0_10px_rgba(207,129,80,0.45)]"
                    : "text-foreground/42"
                )}>
                  <PersonIcon active={sheetOpen} />
                </span>
              </div>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="bg-background border-border h-[85dvh] max-h-[85dvh] flex flex-col p-0"
          >
            <SheetHeader className="px-4 pt-4 pb-2 flex-shrink-0">
              <SheetTitle className="text-foreground font-vollkorn text-lg">
                {t("nav.moreOptions")}
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4">
              {/* Profile card */}
              {profile && (
                <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border mb-4">
                  <Avatar className="h-11 w-11 sm:h-12 sm:w-12 ring-2 ring-bronze/30 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-bronze to-bronze-dark text-white font-semibold text-sm">
                      {profile?.display_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-poppins text-sm font-semibold text-foreground truncate">
                        {profile?.display_name || "User"}
                      </p>
                      {subscription.limits.hasVerifiedBadge && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 pb-8">
                {/* Upgrade CTA — hidden for Business (top tier) */}
                {!subscription.isBusiness && (
                  <Link
                    to="/pricing"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-bronze to-bronze-dark text-white hover:opacity-90 transition-all w-full"
                  >
                    <Crown className="h-5 w-5 flex-shrink-0" />
                    <span className="font-poppins text-sm font-semibold">
                      {subscription.isPro ? "Upgrade to Business" : "Upgrade to Pro"}
                    </span>
                  </Link>
                )}

                {/* Install Kaizen Afrika — hidden once app is installed or prompt unavailable */}
                {canInstall && (
                  <button
                    onClick={() => {
                      if (isIOS) {
                        // Close the More sheet first, then show iOS guide
                        setSheetOpen(false);
                        setTimeout(() => install(), 320);
                      } else {
                        install(); // Android / desktop: native browser install prompt
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-muted/60 border border-border text-foreground hover:bg-muted transition-all w-full"
                  >
                    <div className="w-9 h-9 rounded-xl bg-bronze/15 flex items-center justify-center flex-shrink-0">
                      <Download className="h-4 w-4 text-bronze" />
                    </div>
                    <div className="text-left">
                      <p className="font-poppins text-sm font-semibold">Install Kaizen Afrika</p>
                      <p className="text-xs text-muted-foreground leading-snug">Add to your home screen</p>
                    </div>
                  </button>
                )}

                <Separator className="bg-border" />

                {/* Account */}
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    {t("nav.account")}
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-foreground/90 hover:text-bronze hover:bg-muted/50 h-11 text-sm font-medium rounded-xl"
                    onClick={() => handleNavigation("/profile/settings")}
                  >
                    {t("profile.settings")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-foreground/90 hover:text-bronze hover:bg-muted/50 h-11 text-sm font-medium rounded-xl"
                    onClick={() => handleNavigation("/profile/payments-billing")}
                  >
                    {t("profile.paymentsBilling")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-foreground/90 hover:text-bronze hover:bg-muted/50 h-11 text-sm font-medium rounded-xl"
                    onClick={() => handleNavigation("/profile/feedback")}
                  >
                    {t("nav.feedback")}
                  </Button>
                </div>

                <Separator className="bg-border" />

                {/* Support */}
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    {t("nav.support")}
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-foreground/90 hover:text-bronze hover:bg-muted/50 h-11 text-sm font-medium rounded-xl"
                    onClick={() => handleNavigation("/profile/help")}
                  >
                    {t("nav.helpSupport")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-foreground/90 hover:text-bronze hover:bg-muted/50 h-11 text-sm font-medium rounded-xl"
                    onClick={() => handleNavigation("/app/about")}
                  >
                    {t("nav.aboutCrevia")}
                  </Button>
                </div>

                <Separator className="bg-border" />

                {/* Legal */}
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    {t("nav.legal")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1 text-muted-foreground hover:text-bronze hover:bg-muted/50 h-11 text-xs font-medium rounded-xl"
                      onClick={() => handleNavigation("/privacy-policy")}
                    >
                      {t("nav.privacy")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 text-muted-foreground hover:text-bronze hover:bg-muted/50 h-11 text-xs font-medium rounded-xl"
                      onClick={() => handleNavigation("/terms-of-service")}
                    >
                      {t("nav.terms")}
                    </Button>
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Sign out */}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-11 text-sm font-medium rounded-xl"
                  onClick={handleSignOut}
                >
                  {t("nav.logOut")}
                </Button>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>

    {/* iOS step-by-step install guide — rendered outside the nav so it can
        stack above everything without z-index conflicts */}
    <IOSInstallGuide open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
    <ManualInstallGuide open={showManualGuide} onClose={() => setShowManualGuide(false)} />
    </>
  );
};

export default MobileBottomNav;
