import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/use-notifications";
import { Bell, MessageSquare, FileText, Sparkles, Shield, BellOff, CheckCheck, Loader2, MessageCircle, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
const SETTINGS_KEY = "kaizen_notif_settings";

const notificationGroups = [
  {
    title: "Kaizen Studio",
    items: [
      { id: "chat",     icon: MessageSquare, label: "Chat Messages",        desc: "New messages in Kaizen Chat" },
      { id: "invoices", icon: FileText,      label: "Invoices", desc: "Status updates on invoices" },
    ],
  },
  {
    title: "Dira AI",
    items: [
      { id: "dira", icon: Sparkles, label: "Dira Suggestions", desc: "AI-powered tips and recommendations" },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "billing",  icon: Bell,       label: "Billing & Subscription", desc: "Payment confirmations and plan changes" },
      { id: "security", icon: Shield,     label: "Security Alerts",        desc: "Login activity and password changes" },
    ],
  },
];

const TYPE_CONFIG: Record<string, { icon: React.ElementType; nav: string }> = {
  message:  { icon: MessageCircle, nav: "/kaizen-studio?tab=chat" },
  invoice:  { icon: Receipt,       nav: "/kaizen-studio?tab=invoices" },
  campaign: { icon: Sparkles,      nav: "/kaizen-studio" },
  billing:  { icon: Bell,          nav: "/profile/payments-billing" },
  system:   { icon: Bell,          nav: "" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved) : { chat: true, invoices: true, dira: true, billing: true, security: true, muteAll: false };
    } catch {
      return { chat: true, invoices: true, dira: true, billing: true, security: true, muteAll: false };
    }
  });

  const { notifications, unreadCount, loading, markAllRead, markRead } = useNotifications(userId);

  useEffect(() => {
    // getSession for the immediate value, onAuthStateChange for reliability
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? "");
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggle = (id: string) => {
    setSettings(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6 text-bronze" />
          <h1 className="font-vollkorn text-3xl md:text-4xl font-bold">Notifications</h1>
        </div>
        <p className="text-muted-foreground mb-8 text-sm">Manage alerts and see recent activity</p>

        {/* Recent notifications — only shown when there are notifications */}
        {(loading || notifications.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-poppins text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-bronze/10 text-bronze text-[10px]">
                  {unreadCount} unread
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-bronze gap-1.5" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </Button>
            )}
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.slice(0, 10).map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                  const Icon = cfg.icon;
                  const isActive = activeId === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                        setActiveId(n.id);
                        let nav = cfg.nav;
                        if (n.type === "message" && n.data?.room_id) {
                          nav = `/kaizen-studio?tab=chat&roomId=${n.data.room_id}`;
                        }
                        if (nav) navigate(nav);
                      }}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors",
                        !n.read && "bg-bronze/5",
                        isActive && "bg-bronze/10 border-l-2 border-bronze"
                      )}
                    >
                      <div className={cn("mt-0.5 p-1.5 rounded-lg flex-shrink-0", !n.read || isActive ? "bg-bronze/10" : "bg-muted")}>
                        <Icon className={cn("w-3.5 h-3.5", !n.read || isActive ? "text-bronze" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm leading-snug", !n.read || isActive ? "font-semibold" : "font-medium text-foreground/80")}>
                            {n.title}
                          </p>
                          {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-bronze flex-shrink-0" />}
                        </div>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
        )}

        {/* Settings */}
        <h2 className="font-poppins text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Preferences
        </h2>

        {notificationGroups.map((group) => (
          <Card key={group.title} className="p-5 mb-4">
            <h3 className="font-vollkorn text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
              {group.title}
            </h3>
            <div className="space-y-4">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-bronze shrink-0" />
                      <div>
                        <Label htmlFor={item.id} className="font-medium text-sm">{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch
                      id={item.id}
                      checked={!settings.muteAll && settings[item.id]}
                      disabled={settings.muteAll}
                      onCheckedChange={() => toggle(item.id)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <Card className="p-5 border-destructive/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellOff className="w-4 h-4 text-destructive shrink-0" />
              <div>
                <Label htmlFor="muteAll" className="font-medium text-sm">Mute All Notifications</Label>
                <p className="text-xs text-muted-foreground">Temporarily disable all alerts</p>
              </div>
            </div>
            <Switch id="muteAll" checked={settings.muteAll} onCheckedChange={() => toggle("muteAll")} />
          </div>
        </Card>

      </div>
    </div>
  );
};

export default Notifications;
