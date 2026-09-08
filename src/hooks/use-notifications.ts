import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
  read: boolean;
  created_at: string;
}

const LIMIT = 40;
const clearedKey = (uid: string) => `kaizen_notif_cleared_${uid}`;

function getClearedAt(userId: string): string | null {
  return localStorage.getItem(clearedKey(userId));
}

function applyFilter(data: AppNotification[], userId: string): AppNotification[] {
  const clearedAt = getClearedAt(userId);
  if (!clearedAt) return data;
  return data.filter((n) => n.created_at > clearedAt);
}

export function useNotifications(userId: string | undefined, dnd = false) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || dnd) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, data, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIMIT);

      if (error) {
        console.error("[notifications] Failed to load:", error.message);
        return;
      }

      setNotifications(applyFilter((data as AppNotification[]) ?? [], userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();

    const handleCleared = () => setNotifications([]);
    window.addEventListener("kaizen:notifications-cleared", handleCleared);

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const notif = payload.new as AppNotification;
          const clearedAt = getClearedAt(userId);
          if (clearedAt && notif.created_at <= clearedAt) return;
          setNotifications((prev) => [notif, ...prev].slice(0, LIMIT));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as AppNotification;
          setNotifications((prev) => {
            const without = prev.filter((n) => n.id !== updated.id);
            return [updated, ...without].slice(0, LIMIT);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("kaizen:notifications-cleared", handleCleared);
    };
  }, [userId, refresh]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update first for instant feel
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) {
      console.error("[notifications] Failed to mark read:", error.message);
      // Revert on failure
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    // Instantly clear the panel — rewards user with clean slate immediately.
    setNotifications([]);
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) {
      console.error("[notifications] Failed to mark all read:", error.message);
      refresh();
    }
  }, [userId, refresh]);

  const clearAll = useCallback(async () => {
    if (!userId) return;
    localStorage.setItem(clearedKey(userId), new Date().toISOString());
    window.dispatchEvent(new Event("kaizen:notifications-cleared"));
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
    if (error) {
      console.error("[notifications] Failed to clear:", error.message);
    }
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, markRead, markAllRead, clearAll, refresh };
}
