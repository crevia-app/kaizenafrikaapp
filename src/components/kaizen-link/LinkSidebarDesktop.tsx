import { Link, useLocation } from "react-router-dom";
import { 
  User, 
  Link2, 
  Palette, 
  Settings,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkSidebarDesktopProps {
  userType: "creator" | "brand";
  onCollapsedChange?: (collapsed: boolean) => void;
}

const LinkSidebarDesktop = ({ userType, onCollapsedChange }: LinkSidebarDesktopProps) => {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab") || "profile";

  // Same items for both creators and brands for Kaizen Link
  const items = [
    { id: "profile", label: "Profile", icon: User },
    { id: "buttons", label: "Actions", icon: Link2 },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <aside className="hidden md:flex flex-col bg-background text-foreground border-r border-border/50 fixed left-[100px] top-14 bottom-0 z-20 w-[100px]">
      {/* Navigation - matching MainSidebar style */}
      <nav className="flex-1 py-4 space-y-2">
        {items.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={`/kaizen-link?tab=${item.id}`}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 px-3 py-3 transition-all duration-200",
                isActive
                  ? "text-bronze"
                  : "text-muted-foreground hover:text-bronze hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-xl transition-all",
                isActive && "bg-bronze/15"
              )}>
                <Icon 
                  className={cn(
                    "h-6 w-6 transition-all",
                    isActive && "drop-shadow-[0_0_10px_rgba(207,129,80,0.5)]"
                  )} 
                />
              </div>
              <span className="font-poppins text-[11px] font-medium text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default LinkSidebarDesktop;
