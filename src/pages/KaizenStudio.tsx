import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Link2, Receipt,
  User, MousePointerClick, Palette, BarChart2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
// Tab content
import KaizenLink         from "./KaizenLink";
import SmartInvoicesTab   from "@/components/studio/SmartInvoicesTab";

/* ─────────────────────────────────────────────────────────────────────────────
   TAB DEFINITIONS
───────────────────────────────────────────────────────────────────────────── */
const STUDIO_TABS = [
  {
    id:          "link",
    shortLabel:  "Link",
    fullLabel:   "Kaizen Link",
    description: "Your public profile page",
    labelKey:    "studio.tab.link",
    icon:        Link2,
    color:       "#CF8150",   // bronze
  },
  {
    id:          "invoices",
    shortLabel:  "Invoice",
    fullLabel:   "Kaizen Invoice",
    description: "Smart billing system",
    labelKey:    "studio.tab.invoice",
    icon:        Receipt,
    color:       "#2BA577",   // emerald accent
  },
] as const;

const LINK_SECTIONS = [
  { id: "profile",    label: "Profile",    icon: User },
  { id: "buttons",    label: "Buttons",    icon: MousePointerClick },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "analytics",  label: "Analytics",  icon: BarChart2 },
] as const;

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const KaizenStudio = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t }                           = useLanguage();
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const activeTab          = searchParams.get("tab")        || "link";
  const activeLinkSection  = searchParams.get("section")   || "profile";
  const activeInvoiceId    = searchParams.get("invoiceId") || undefined;

  const activeTabDef = STUDIO_TABS.find(t => t.id === activeTab) ?? STUDIO_TABS[0];

  // Listen for TopBar's sidebar-toggle event (same pattern as Kira)
  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener("studio:toggle-sidebar", handler);
    return () => window.removeEventListener("studio:toggle-sidebar", handler);
  }, []);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
    setSidebarOpen(false);
  };

  const handleLinkSectionChange = (sectionId: string) => {
    setSearchParams({ tab: "link", section: sectionId });
  };

  // Redirect to "link" tab if trying to access removed "chat" tab
  useEffect(() => {
    if (activeTab === "chat") {
      setSearchParams({ tab: "link" });
    }
  }, [activeTab, setSearchParams]);

  return (
    <div className="h-full flex flex-col bg-background">

      {/* ═══════════════════════════════════════════════════════════════════
          SUB-HEADER
          Desktop: horizontal tab bar
          Mobile:  Link sub-sections row (only on Link tab)
          Breadcrumb lives in TopBar — no duplicate row here.
      ═══════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "bg-background z-30 flex-shrink-0 border-b border-border",
        activeTab !== "link" && "hidden md:block"
      )}>
        <div className="mx-auto w-full max-w-7xl">

          {/* ── Desktop: main tab bar ─────────────────────────────────────── */}
          <div className="hidden md:block pt-1">
            <div className="flex items-stretch justify-evenly -mb-px">
              {STUDIO_TABS.map((tab) => {
                const Icon     = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-t-lg font-poppins",
                      "transition-all duration-200 active:scale-[0.97] select-none whitespace-nowrap",
                      isActive
                        ? "text-bronze bg-bronze/10 border-b-2 border-bronze font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{t(tab.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Desktop: Link sub-sections (shown below main tabs when Link active) ── */}
          {activeTab === "link" && (
            <div className="hidden md:flex items-center py-2 border-t border-border/40">
              {LINK_SECTIONS.map((section) => {
                const Icon     = section.icon;
                const isActive = activeLinkSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleLinkSectionChange(section.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-poppins font-medium",
                      "transition-all duration-150 select-none",
                      isActive
                        ? "bg-bronze/10 text-bronze"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Mobile: Link sub-sections (compact icon + label row) ──────── */}
          {activeTab === "link" && (
            <div className="md:hidden border-t border-border/40">
              <div className="flex w-full px-2 py-1">
                {LINK_SECTIONS.map((section) => {
                  const Icon     = section.icon;
                  const isActive = activeLinkSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleLinkSectionChange(section.id)}
                      title={section.label}
                      className={cn(
                        "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl",
                        "transition-all duration-200 active:scale-95 select-none relative"
                      )}
                    >
                      {isActive && (
                        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-bronze" />
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                        isActive ? "bg-bronze/15 text-bronze" : "text-muted-foreground"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium font-poppins",
                        isActive ? "text-bronze" : "text-muted-foreground"
                      )}>
                        {section.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB CONTENT
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto min-w-0 pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {activeTab === "link"     && <KaizenLink isEmbedded />}
            {activeTab === "invoices" && <SmartInvoicesTab initialInvoiceId={activeInvoiceId} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PREMIUM MOBILE SIDEBAR
          – Backdrop blur overlay (tap to close)
          – Left-sliding panel (spring physics)
          – Each feature: icon chip + name + description + active indicator
          – Only rendered on mobile (md:hidden on the container)
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar panel */}
            <motion.aside
              key="sidebar-panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className={cn(
                "fixed left-0 top-0 bottom-0 z-50 md:hidden",
                "w-[300px] max-w-[85vw]",
                "bg-background border-r border-border/80",
                "flex flex-col shadow-2xl",
                "safe-area-pt"
              )}
            >
              {/* ── Sidebar header ── */}
              <div className="flex items-center justify-between px-5 pt-6 pb-5">
                <div>
                  <h2 className="font-vollkorn text-xl font-bold text-foreground">
                    Studio
                  </h2>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4 text-foreground/70" />
                </button>
              </div>

              {/* ── Divider ── */}
              <div className="h-px bg-border/60 mx-5" />

              {/* ── Section label ── */}
              <p className="px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 font-poppins">
                Features
              </p>

              {/* ── Nav items ── */}
              <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-6">
                {STUDIO_TABS.map((tab, index) => {
                  const Icon     = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 + index * 0.05, duration: 0.22 }}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-2xl text-left",
                        "transition-all duration-200 active:scale-[0.97] select-none",
                        isActive
                          ? "bg-bronze/10 border border-bronze/20"
                          : "hover:bg-muted/60 border border-transparent"
                      )}
                    >
                      {/* Icon chip */}
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200",
                          isActive ? "shadow-sm" : "bg-muted/60"
                        )}
                        style={isActive ? { background: `${tab.color}22` } : undefined}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: isActive ? tab.color : undefined }}
                        />
                      </div>

                      {/* Label */}
                      <p className={cn(
                        "flex-1 min-w-0 text-sm font-semibold font-poppins leading-tight",
                        isActive ? "text-foreground" : "text-foreground/80"
                      )}>
                        {tab.fullLabel}
                      </p>

                      {/* Active dot */}
                      {isActive && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: tab.color }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </nav>

              {/* ── Sidebar footer ── */}
              <div className="px-5 py-4 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground/50 font-poppins text-center">
                  Studio · All features
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KaizenStudio;
