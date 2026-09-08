import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { signOutWithCleanup } from "@/lib/device-session";
import {
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Crown,
  Sparkles,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSubscription } from "@/hooks/use-subscription";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Download } from "lucide-react";
import { IOSInstallGuide } from "@/components/pwa/IOSInstallGuide";
import { ManualInstallGuide } from "@/components/pwa/ManualInstallGuide";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
}

const ProfileDrawer = ({ isOpen, onClose, profile }: ProfileDrawerProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const subscription = useSubscription();
  const { canInstall, install, showIOSGuide, setShowIOSGuide, showManualGuide, setShowManualGuide } = usePWAInstall();

  const handleSignOut = async () => {
    await signOutWithCleanup();
    navigate("/auth");
  };

  const menuItems = [
    { icon: CreditCard, label: t("profile.paymentsBilling"), path: "/profile/payments-billing" },
    { icon: Bell, label: t("profile.notifications"), path: "/profile/notifications" },
    { icon: Settings, label: t("profile.settings"), path: "/profile/settings" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="bg-black border-white/10 w-full sm:w-[320px]">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-white font-vollkorn">{t("profile.menu")}</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 mb-6">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-bronze text-white">
              {profile?.display_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-poppins text-sm font-semibold text-white truncate">
                {profile?.display_name || "User"}
              </p>
              {subscription.limits.hasVerifiedBadge && (
                <VerifiedBadge size="sm" />
              )}
            </div>
            <p className="text-xs text-white/50 truncate">{profile?.email}</p>
            <Badge
              variant="outline"
              className="mt-1.5 text-[10px] font-semibold border-bronze text-bronze bg-bronze/15 px-2 py-0.5"
            >
              {subscription.isFree ? "Free" : "Pro"}
            </Badge>
          </div>
        </div>

        {canInstall && (
          <button
            onClick={() => { install(); onClose(); }}
            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all w-full"
          >
            <Download className="h-5 w-5 text-bronze flex-shrink-0" />
            <div className="text-left">
              <p className="font-poppins text-sm font-semibold">Install Kaizen Afrika App</p>
              <p className="text-[11px] text-white/50">Add to home screen</p>
            </div>
          </button>
        )}

        {/* Upgrade / Manage subscription */}
        {subscription.isFree ? (
          <Link
            to="/pricing"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-gradient-to-r from-bronze to-bronze-dark text-white hover:opacity-90 transition-all"
          >
            <Crown className="h-5 w-5" />
            <span className="font-poppins text-sm font-semibold">Upgrade to Pro</span>
          </Link>
        ) : (
          <Link
            to="/profile/payments-billing"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-poppins text-sm font-semibold">Manage Subscription</span>
          </Link>
        )}

        <Separator className="bg-white/10 mb-4" />

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-bronze hover:bg-white/5 transition-all"
              >
                <Icon className="h-5 w-5" />
                <span className="font-poppins text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-white/10 my-4" />

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-white/80 hover:text-red-400 hover:bg-white/5"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-poppins text-sm font-medium">{t("profile.logout")}</span>
        </Button>
      </SheetContent>

      <IOSInstallGuide open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
      <ManualInstallGuide open={showManualGuide} onClose={() => setShowManualGuide(false)} />
    </Sheet>
  );
};

export default ProfileDrawer;
