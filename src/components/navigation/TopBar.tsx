import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Bell, Monitor, Sun, Moon, PanelLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import NotificationSheet from "@/components/notifications/NotificationSheet";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

interface TopBarProps {
  profile: any;
  onProfileClick: () => void;
  hideRightElements?: boolean;
}

const themeOptions = [
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const STUDIO_TAB_META: Record<string, { shortLabel: string; color: string }> = {
  link:     { shortLabel: "Link",      color: "#CF8150" },

  invoices: { shortLabel: "Invoice",   color: "#2BA577" },
};

const DiraMenuIcon = () => (
  <div className="flex flex-col gap-[5px]">
    <span className="block h-[1.5px] w-[18px] rounded-full bg-current" />
    <span className="block h-[1.5px] w-[12px] rounded-full bg-current" />
    <span className="block h-[1.5px] w-[18px] rounded-full bg-current" />
  </div>
);

/**
 * Premium Studio hamburger icon
 * — Three asymmetric lines (full / short / full)
 * — Bottom line is always bronze: a silent brand signature
 * — Top two lines brighten + extend 2 px on hover
 */
const StudioMenuIcon = () => (
  <div className="flex flex-col gap-[5.5px]">
    <span
      className="block h-[1.5px] rounded-full transition-all duration-300 ease-out"
      style={{ width: 18, background: "#ffffff" }}
    />
    <span
      className="block h-[1.5px] rounded-full transition-all duration-300 ease-out"
      style={{ width: 11, background: "#ffffff", opacity: 0.6 }}
    />
    <span
      className="block h-[1.5px] rounded-full transition-all duration-300 ease-out"
      style={{ width: 18, background: "#ffffff" }}
    />
  </div>
);


const TopBar = ({ profile, hideRightElements = false }: TopBarProps) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isDira   = location.pathname === "/dira";
  const isStudio = location.pathname.startsWith("/kaizen-studio");
  const studioTab     = isStudio ? (searchParams.get("tab") || "link") : "link";
  const studioTabMeta = STUDIO_TAB_META[studioTab] ?? STUDIO_TAB_META.link;
  const [sheetOpen, setSheetOpen] = useState(false);
  const { notifications, unreadCount, loading, markRead, markAllRead, clearAll } =
    useNotifications(profile?.id, !!profile?.do_not_disturb);

  const { setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [selected, setSelected] = useState("light");
  const [mounted, setMounted] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setSelected(localStorage.getItem("theme") || "system");
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    if (themeOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [themeOpen]);

  const handleThemeSelect = (value: string) => {
    setTheme(value);
    setSelected(value);
    setThemeOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-bronze/[0.10] safe-area-pt safe-area-pl safe-area-pr">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {isDira ? (
            /* Dira: sidebar toggle + wordmark */
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("dira:toggle-sidebar"))}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors flex-shrink-0"
                aria-label="Toggle sidebar"
                style={{ touchAction: "manipulation" }}
              >
                <PanelLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("dira:new-chat"))}
                className="font-vollkorn text-xl font-bold text-foreground tracking-tight hover:opacity-70 transition-opacity cursor-pointer"
                aria-label="New Dira chat"
              >Dira</button>
            </div>
          ) : isStudio ? (
            /* Studio: premium sidebar toggle + breadcrumb */
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("studio:toggle-sidebar"))}
                aria-label="Open Studio navigation"
                style={{ touchAction: "manipulation", background: "rgba(30,30,30,0.72)", backdropFilter: "blur(8px)" }}
                className={[
                  "group relative flex items-center justify-center md:hidden",
                  "w-10 h-10 rounded-xl flex-shrink-0",
                  "border border-white/20",
                  "hover:border-[rgba(207,129,80,0.5)]",
                  "hover:shadow-[0_0_0_1px_rgba(207,129,80,0.15),0_4px_14px_rgba(207,129,80,0.10)]",
                  "active:scale-[0.91]",
                  "transition-all duration-200 ease-out",
                ].join(" ")}
              >
                <StudioMenuIcon />
              </button>
              <div className="flex items-center gap-1.5 min-w-0">
                <Link
                  to="/kaizen-studio"
                  className="font-vollkorn text-base font-semibold text-foreground hover:text-bronze transition-colors duration-200"
                >
                  Studio
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                <span
                  className="text-sm font-semibold font-poppins"
                  style={{ color: studioTabMeta.color }}
                >
                  {studioTabMeta.shortLabel}
                </span>
              </div>
            </div>
          ) : (
            /* All other pages: Kaizen Afrika wordmark */
            <Link
              to="/dashboard"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <span className="font-vollkorn text-lg md:text-xl font-bold">Kaizen Afrika</span>
            </Link>
          )}
        </div>

        {/* Right side */}
        {!hideRightElements && (
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            {mounted && (
              <div ref={themeRef} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setThemeOpen((v) => !v)}
                  className="h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  aria-label="Toggle theme"
                >
                  {(() => { const Icon = themeOptions.find(o => o.value === selected)?.icon ?? Monitor; return <Icon className="h-5 w-5" />; })()}
                </Button>

                <AnimatePresence>
                  {themeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-11 w-36 rounded-xl bg-background/95 backdrop-blur-md border border-border/50 shadow-xl overflow-hidden py-1 z-50"
                    >
                      {themeOptions.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => handleThemeSelect(value)}
                          className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1 text-left">{label}</span>
                          {selected === value && (
                            <span className="w-2 h-2 rounded-full bg-bronze flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSheetOpen(true)}
              className="relative h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-bronze text-[9px] font-bold text-white leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      <NotificationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
      />
    </header>
  );
};

export default TopBar;
