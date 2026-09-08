import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LinkTabsMobileProps {
  userType: "creator" | "brand";
}

const LinkTabsMobile = ({ userType }: LinkTabsMobileProps) => {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab") || "profile";

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "buttons", label: "Actions" },
    { id: "appearance", label: "Appearance" },
    { id: "settings", label: "Settings" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="md:hidden sticky top-16 z-30 bg-background border-b border-border/40 mb-10">
      {/* Plain overflow-x-auto — no Radix ScrollArea so there is no extra
          vertical scrollbar track bleeding into the page's single scrollbar */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 px-6 py-3">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={`/kaizen-link?tab=${tab.id}`}
                className={cn(
                  "inline-flex items-center justify-center px-5 py-3 min-h-[44px] rounded-lg whitespace-nowrap font-poppins text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-bronze/10 text-bronze border border-bronze/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LinkTabsMobile;
