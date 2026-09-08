import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Strategy ─────────────────────────────────────────────────────────────────
//
// Vercel injects VITE_APP_VERSION (Git SHA) at build time.
// The CI/CD pipeline writes that same SHA to app_settings (key = "app_version")
// immediately after deploying.
//
// This hook:
//   1. Subscribes to app_settings via Supabase Realtime.
//   2. When app_version changes, compares it to the running build's SHA.
//   3. If they differ:
//        - "soft" mismatch → fires window event so QueryClient can invalidate.
//        - "hard" mismatch (major) → sets needsReload = true → ReloadPrompt shows.
//
// The hook never touches components — it only emits events and flips a flag.

const CLIENT_VERSION = import.meta.env.VITE_APP_VERSION as string | undefined;

/** Fired on every detected version change — listeners can re-fetch their data. */
export const VERSION_CHANGED_EVENT = "kaizen:version-changed";

export interface VersionCheckResult {
  /** True when the client bundle is stale and a page reload is recommended. */
  needsReload: boolean;
  /** The version string currently live on the server. */
  serverVersion: string | null;
}

export function useVersionCheck(): VersionCheckResult {
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [needsReload, setNeedsReload]     = useState(false);
  const hasHandledRef = useRef(false);

  const handleVersionRow = (value: string) => {
    setServerVersion(value);

    // Skip when no client version is injected (local dev without env var)
    if (!CLIENT_VERSION || CLIENT_VERSION === "dev") return;
    // Already handled this session
    if (hasHandledRef.current) return;
    // Versions match — nothing to do
    if (value === CLIENT_VERSION) return;

    hasHandledRef.current = true;

    // Emit a global event — any React Query or SWR subscriber can invalidate
    window.dispatchEvent(new CustomEvent(VERSION_CHANGED_EVENT, { detail: { serverVersion: value, clientVersion: CLIENT_VERSION } }));

    // Signal that a reload is recommended (drives ReloadPrompt or similar UI)
    setNeedsReload(true);
    console.info(`[useVersionCheck] Version mismatch — server: ${value}, client: ${CLIENT_VERSION}`);
  };

  useEffect(() => {
    // ── Initial fetch ──────────────────────────────────────────────────────────
    (async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", "app_version")
        .single();

      if (data?.value) handleVersionRow(data.value);
    })();

    // ── Realtime subscription ─────────────────────────────────────────────────
    // Listens for UPDATE on app_settings where key = 'app_version'.
    // Fires instantly when CI/CD stamps the new SHA after a deploy.
    const channel = supabase
      .channel("app-version-check")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings", filter: "key=eq.app_version" },
        (payload) => {
          const value = (payload.new as any)?.value;
          if (value) handleVersionRow(value);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { needsReload, serverVersion };
}
