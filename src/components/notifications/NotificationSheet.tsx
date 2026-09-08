import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, MessageSquare, Receipt, Sparkles, CreditCard, CheckCheck, Loader2, Trash2, AlertTriangle, CheckCircle2, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface NotificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll?: () => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  message:  { icon: MessageSquare,  color: "text-blue-500"            },
  invoice:  { icon: Receipt,        color: "text-green-500"           },
  campaign: { icon: Sparkles,       color: "text-purple-500"          },
  billing:  { icon: CreditCard,     color: "text-orange-500"          },
  system:   { icon: Bell,           color: "text-muted-foreground"    },
};

/** Build the deep-link URL for a notification */
function buildNavUrl(n: AppNotification): string {
  switch (n.type) {
    case "message":
      return n.data?.room_id
        ? `/kaizen-studio?tab=chat&roomId=${n.data.room_id}`
        : "/kaizen-studio?tab=chat";
    case "invoice":
      return n.data?.invoice_id
        ? `/kaizen-studio?tab=invoices&invoiceId=${n.data.invoice_id}`
        : "/kaizen-studio?tab=invoices";
    case "campaign":
      return "/kaizen-studio";
    case "billing":
      return "/profile/payments-billing";
    default:
      return "";
  }
}

export default function NotificationSheet({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: NotificationSheetProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    setDeletingSelected(true);
    try {
      await supabase.from("notifications").delete().in("id", selectedIds);
      setSelectedIds([]);
      setIsEditing(false);
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    } finally {
      setDeletingSelected(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await onClearAll?.();
      setClearDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to clear notifications", description: err.message, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const handleClick = (n: AppNotification) => {
    if (!n.read) onMarkRead(n.id);
    const nav = buildNavUrl(n);
    if (nav) {
      navigate(nav);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[80vw] max-w-sm sm:w-[380px] p-0 flex flex-col bg-background border-border [&>button:last-child]:hidden">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between w-full gap-2">
            {/* Edit on the far left */}
            <div className="w-16 flex-shrink-0">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground px-2"
                  onClick={() => { setIsEditing(e => !e); setSelectedIds([]); }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              )}
            </div>
            {/* Title centred */}
            <SheetTitle className="font-vollkorn text-lg flex-1 text-center">Notifications</SheetTitle>
            {/* Mark all read + close on the far right */}
            <div className="flex-shrink-0 flex items-center gap-1">
              {!isEditing && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-bronze hover:text-bronze/80 gap-1 px-2"
                  onClick={onMarkAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="font-poppins text-sm font-medium text-foreground mb-1">All caught up</p>
              <p className="text-xs text-muted-foreground">New messages and updates will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => {
                const cfg  = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                const Icon = cfg.icon;
                const nav  = buildNavUrl(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => isEditing ? toggleSelect(n.id) : handleClick(n)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors",
                      isEditing ? "cursor-pointer hover:bg-muted/50" : nav ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
                      !n.read && "bg-bronze/5",
                      isEditing && selectedIds.includes(n.id) && "bg-muted/60"
                    )}
                  >
                    <div className={cn("transition-all duration-200 ease-in-out flex-shrink-0 mt-0.5", isEditing ? "w-5 flex items-center justify-center" : "p-2 rounded-lg", !isEditing && (!n.read ? "bg-bronze/10" : "bg-muted"))}>
                      {isEditing ? (
                        selectedIds.includes(n.id)
                          ? <CheckCircle2 className="w-5 h-5 text-bronze" />
                          : <Circle className="w-5 h-5 text-muted-foreground/40" />
                      ) : (
                        <Icon className={cn("w-3.5 h-3.5", !n.read ? cfg.color : "text-muted-foreground")} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1 w-2 h-2 rounded-full bg-bronze flex-shrink-0" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body === "🔒 Encrypted message" ? "Tap to open conversation" : n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-3 border-t border-border flex-shrink-0 space-y-1">
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => { navigate("/profile/notifications"); onOpenChange(false); }}
            >
              Notification settings
            </Button>
          )}
          {notifications.length > 0 && (
            isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full text-xs gap-1.5 transition-colors",
                  selectedIds.length > 0
                    ? "text-red-500 hover:bg-red-500/10 font-semibold"
                    : "text-muted-foreground"
                )}
                onClick={selectedIds.length > 0 ? handleDeleteSelected : undefined}
                disabled={deletingSelected}
              >
                {deletingSelected
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
                {selectedIds.length > 0
                  ? `Delete Selected (${selectedIds.length})`
                  : "Select items to delete"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                onClick={() => setClearDialogOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Notifications
              </Button>
            )
          )}
        </div>
      </SheetContent>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Clear All Notifications?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove all your notifications. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll} disabled={clearing}>
              {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {clearing ? "Clearing..." : "Clear All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
