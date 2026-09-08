import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "kaizen_device_id";

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let os = "Unknown";
  let browser = "Unknown";

  if (/iPhone/.test(ua)) os = "iPhone";
  else if (/iPad/.test(ua)) os = "iPad";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac/.test(ua)) os = "Mac";
  else if (/Linux/.test(ua)) os = "Linux";

  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";

  return `${os} · ${browser}`;
}

export async function signOutWithCleanup(): Promise<void> {
  try {
    const deviceId = getOrCreateDeviceId();
    await supabase.rpc("remove_device_session", { p_device_id: deviceId });
  } catch {
    // Non-fatal — cleanup is best-effort
  }
  await supabase.auth.signOut();
}
