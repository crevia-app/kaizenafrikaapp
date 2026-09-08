import { useState, useEffect, useRef, useCallback } from "react";
import { loadGoogleFont, KAIZEN_LINK_FONTS } from "@/lib/loadFont";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link2, Plus, Eye, Sparkles, Type, Palette, Layout, Copy, Check, Globe, Shield, Bell, BarChart3, TrendingUp, MousePointer, ExternalLink, Camera, AlertCircle, Users, Star, ArrowUp, ArrowDown, ChevronUp, ChevronDown, ChevronRight, Image as ImageIcon, User, MousePointerClick, SlidersHorizontal, BarChart2, Trash2, Share2, Lock, Mail, Phone, Youtube, Linkedin, Music, ShoppingBag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LinkIconPicker, { renderLinkIcon } from "@/components/kaizen-link/LinkIconPicker";
import ThemeSelector from "@/components/kaizen-link/ThemeSelector";
import { PRO_THEME_IDS } from "@/lib/linkThemes";
import { AdvancedColorSelector } from "@/components/ui/AdvancedColorSelector";
import LinkSidebarDesktop from "@/components/kaizen-link/LinkSidebarDesktop";
import LinkTabsMobile from "@/components/kaizen-link/LinkTabsMobile";
import LivePreview from "@/components/kaizen-link/LivePreview";
import { SocialBadgeRow, getSocialSvg } from "@/components/kaizen-link/SocialBrandIcons";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSubscription } from "@/hooks/use-subscription";
import { useUpgradeModal } from "@/components/subscription/UpgradeModal";

interface KaizenLinkProps {
  isEmbedded?: boolean;
}

// Username validation
const validateUsername = (username: string): string | null => {
  if (!username) return "Username is required";
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 30) return "Username must be under 30 characters";
  if (/^[._-]/.test(username)) return "Username cannot start with a dot, underscore, or hyphen";
  if (/[._-]$/.test(username)) return "Username cannot end with a dot, underscore, or hyphen";
  if (/[._-]{2,}/.test(username)) return "Username cannot have consecutive special characters";
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) return "Only letters, numbers, dots, underscores, and hyphens allowed";
  if (/^\d+$/.test(username)) return "Username cannot be only numbers";
  const reserved = ["admin", "support", "help", "about", "pricing", "auth", "dashboard", "api", "kaizen", "kaizenafrika", "dira", "settings", "profile", "signup", "login"];
  if (reserved.includes(username.toLowerCase())) return "This username is reserved";
  return null;
};

const PREMIUM_THEMES = PRO_THEME_IDS;

const FIELD_LABELS: Record<string, string> = {
  username:                    "Username",
  display_name:                "Display Name",
  bio:                         "Bio",
  profile_picture:             "Profile Picture",
  show_verified_badge:         "Verified Badge",
  show_crevia_branding:        "Branding",
  contact_enabled:             "Contact",
  contact_email:               "Contact Email",
  seo_title:                   "SEO Title",
  seo_description:             "SEO Description",
  layout:                      "Layout",
  theme:                       "Theme",
  "background.font_family":    "Typography",
  "background.button_style":   "Button Style",
  "background.button_spacing": "Button Spacing",
  "background.hover_effects":  "Hover Effects",
  "background.fade_animation": "Animations",
  "background.smooth_scroll":  "Smooth Scroll",
  "background.page_width":     "Page Width",
  "background.custom_color":   "Custom Color",
  "background.custom_bg_url":  "Background Image",
  "background.style":          "Background Style",
};

const BG_KEYS = ["font_family","button_style","button_spacing","hover_effects","fade_animation","smooth_scroll","page_width","custom_color","custom_bg_url","style"] as const;
const TOP_KEYS = ["username","display_name","bio","profile_picture","show_verified_badge","show_crevia_branding","contact_enabled","contact_email","seo_title","seo_description","layout","theme"] as const;

function diffLinkProfile(saved: any, current: any): string[] {
  const labels = new Set<string>();
  for (const key of TOP_KEYS) {
    if (JSON.stringify(saved?.[key]) !== JSON.stringify(current?.[key]))
      labels.add(FIELD_LABELS[key] ?? key);
  }
  for (const key of BG_KEYS) {
    if (JSON.stringify(saved?.background?.[key]) !== JSON.stringify(current?.background?.[key]))
      labels.add(FIELD_LABELS[`background.${key}`] ?? key);
  }
  return [...labels];
}

const SOCIAL_PLATFORMS = [
  // Core social
  { value: "instagram",   label: "Instagram",   placeholder: "https://instagram.com/yourhandle" },
  { value: "twitter",     label: "Twitter / X", placeholder: "https://x.com/yourhandle" },
  { value: "tiktok",      label: "TikTok",      placeholder: "https://tiktok.com/@yourhandle" },
  { value: "youtube",     label: "YouTube",     placeholder: "https://youtube.com/@yourchannel" },
  { value: "linkedin",    label: "LinkedIn",    placeholder: "https://linkedin.com/in/yourprofile" },
  { value: "facebook",    label: "Facebook",    placeholder: "https://facebook.com/yourpage" },
  { value: "threads",     label: "Threads",     placeholder: "https://threads.net/@yourhandle" },
  { value: "github",      label: "GitHub",      placeholder: "https://github.com/yourusername" },
  { value: "twitch",      label: "Twitch",      placeholder: "https://twitch.tv/yourchannel" },
  { value: "discord",     label: "Discord",     placeholder: "https://discord.gg/yourserver" },
  { value: "reddit",      label: "Reddit",      placeholder: "https://reddit.com/u/yourusername" },
  { value: "pinterest",   label: "Pinterest",   placeholder: "https://pinterest.com/yourprofile" },
  { value: "snapchat",    label: "Snapchat",    placeholder: "https://snapchat.com/add/yourusername" },
  // Messaging
  { value: "whatsapp",    label: "WhatsApp",    placeholder: "+1 234 567 8900" },
  { value: "telegram",    label: "Telegram",    placeholder: "https://t.me/yourhandle" },
  { value: "signal",      label: "Signal",      placeholder: "+1 234 567 8900" },
  // Music & Content
  { value: "spotify",     label: "Spotify",     placeholder: "https://open.spotify.com/artist/..." },
  { value: "apple-music", label: "Apple Music", placeholder: "https://music.apple.com/artist/..." },
  { value: "soundcloud",  label: "SoundCloud",  placeholder: "https://soundcloud.com/yourprofile" },
  // General
  { value: "email",       label: "Email",       placeholder: "you@example.com" },
  { value: "phone",       label: "Phone",       placeholder: "+1 234 567 8900" },
  { value: "website",     label: "Website",     placeholder: "https://yourwebsite.com" },
];

const KaizenLink = ({ isEmbedded = false }: KaizenLinkProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isPro, isBusiness, isBrandWorkspace, limits } = useSubscription();
  const isProUser = isPro || isBusiness || isBrandWorkspace;
  const { openUpgradeModal } = useUpgradeModal();
  const PRO_FONTS = ["playfair", "dm-serif", "outfit", "syne"];
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [linkProfile, setLinkProfile] = useState<any>(null);
  const [buttons, setButtons] = useState<any[]>([]);
  const [socialIcons, setSocialIcons] = useState<any[]>([]);
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [addingSocial, setAddingSocial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingLive, setViewingLive] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkIcon, setNewLinkIcon] = useState("");
  const [iconPickerFor, setIconPickerFor] = useState<string | null>(null); // "new" | buttonId | null
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteSocialId, setPendingDeleteSocialId] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [showMobileProfileSheet, setShowMobileProfileSheet] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedProfileRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageRefEmb = useRef<HTMLInputElement>(null);
  const bgImageRefStandalone = useRef<HTMLInputElement>(null);


  const currentTab = new URLSearchParams(location.search).get("tab") || "profile";
  const hasCustomBg    = linkProfile?.theme === "custom_image" && !!linkProfile?.background?.custom_bg_url;
  const hasCustomColor = !!linkProfile?.background?.custom_color;

  const handleBgImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast({ title: "Please upload an image file", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "Max file size is 10 MB", variant: "destructive" }); return; }
    setUploadingBg(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploadingBg(false); return; }
    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/bg-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingBg(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setLinkProfile((prev: any) => ({
      ...prev,
      theme: "custom_image",
      background: { ...prev?.background, style: "custom_image", custom_bg_url: urlData.publicUrl },
    }));
    setUploadingBg(false);
    toast({ title: "Background image uploaded!" });
  };

  const handleRemoveBgImage = () => {
    setLinkProfile((prev: any) => ({
      ...prev,
      theme: "elite_obsidian",
      background: { ...prev?.background, custom_bg_url: null, style: "solid" },
    }));
  };

  useEffect(() => { loadGoogleFont(KAIZEN_LINK_FONTS); }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Run both queries in parallel instead of sequentially
    const [{ data: userProfile }, { data: existingLink }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("link_profiles").select("*").eq("user_id", session.user.id).limit(1).maybeSingle(),
    ]);

    setProfile(userProfile);

    if (existingLink) {
      setLinkProfile(existingLink);
      savedProfileRef.current = existingLink;
    } else {
      const { data: newLink } = await supabase
        .from("link_profiles")
        .insert({
          user_id: session.user.id,
          username: userProfile?.handle || "",
          display_name: userProfile?.display_name || "",
          bio: userProfile?.bio || "",
          profile_picture: userProfile?.avatar_url || "",
        })
        .select()
        .single();
      setLinkProfile(newLink);
      savedProfileRef.current = newLink;
    }

    setLoading(false);
  };

  const fetchButtons = async () => {
    if (!linkProfile?.id) return;

    const [{ data: buttonData }, { data: socialData }] = await Promise.all([
      supabase.from("link_buttons").select("*").eq("profile_id", linkProfile.id).order("order_index"),
      supabase.from("link_social_icons").select("*").eq("profile_id", linkProfile.id).order("order_index"),
    ]);

    setButtons(buttonData || []);
    setSocialIcons(socialData || []);
  };

  useEffect(() => {
    if (linkProfile?.id) {
      fetchButtons();
    }
  // Only re-fetch when the profile ID changes (initial load / profile switch),
  // NOT on every object-identity change caused by spread-update setLinkProfile calls.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkProfile?.id]);

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().trim();
    setLinkProfile({ ...linkProfile, username: sanitized });
    setUsernameError(validateUsername(sanitized));
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 50MB allowed.", variant: "destructive" });
      return;
    }

    setUploadingPicture(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${session.user.id}/link-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      // .from("chat-files")//->wrong bucket
      .from("avatars") //->correct bucket
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingPicture(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("link_profiles")
      .update({ profile_picture: publicUrl })
      .eq("id", linkProfile.id);

    if (updateError) {
      toast({ title: "Failed to update", description: updateError.message, variant: "destructive" });
    } else {
      setLinkProfile({ ...linkProfile, profile_picture: publicUrl });
      toast({ title: "Profile picture updated!" });
    }

    setUploadingPicture(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim() || !linkProfile?.id) return;
    setAddingLink(true);
    const maxOrder = buttons.length > 0 ? Math.max(...buttons.map(b => b.order_index)) : -1;
    const { data, error } = await supabase
      .from("link_buttons")
      .insert({ profile_id: linkProfile.id, title: newLinkTitle.trim(), url: newLinkUrl.trim(), icon: newLinkIcon || "link", style: "filled", visible: true, order_index: maxOrder + 1 })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setButtons(prev => [...prev, data]);
      setNewLinkTitle("");
      setNewLinkUrl("");
      setNewLinkIcon("");
      toast({ title: "Link added!" });
    }
    setAddingLink(false);
  };

  const handleLinkIconSelect = async (iconValue: string, target: string) => {
    if (target === "new") {
      setNewLinkIcon(iconValue);
    } else {
      await supabase.from("link_buttons").update({ icon: iconValue }).eq("id", target);
      setButtons(prev => prev.map(b => b.id === target ? { ...b, icon: iconValue } : b));
    }
    setIconPickerFor(null);
  };

  const handleDeleteButton = (id: string) => setPendingDeleteId(id);

  const executeDeleteButton = async (id: string) => {
    // Optimistic removal — UI updates instantly, no waiting for the DB round-trip.
    setPendingDeleteId(null);
    setButtons(prev => prev.filter(b => b.id !== id));
    const { error } = await supabase.from("link_buttons").delete().eq("id", id);
    if (error) {
      // Restore on failure by re-fetching the real DB state.
      fetchButtons();
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Link deleted" });
    }
  };

  const handleAddSocialIcon = async () => {
    if (!newSocialPlatform || !newSocialUrl.trim() || !linkProfile?.id) return;
    setAddingSocial(true);
    const maxOrder = socialIcons.length > 0 ? Math.max(...socialIcons.map((s) => s.order_index)) : -1;
    const { data, error } = await supabase
      .from("link_social_icons")
      .insert({ profile_id: linkProfile.id, platform: newSocialPlatform, url: newSocialUrl.trim(), order_index: maxOrder + 1 })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSocialIcons([...socialIcons, data]);
      setNewSocialPlatform("");
      setNewSocialUrl("");
      toast({ title: "Social link added!" });
    }
    setAddingSocial(false);
  };

  const handleDeleteSocialIcon = (id: string) => setPendingDeleteSocialId(id);

  const executeDeleteSocialIcon = async (id: string) => {
    const { error } = await supabase.from("link_social_icons").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSocialIcons(prev => prev.filter((s) => s.id !== id));
    }
    setPendingDeleteSocialId(null);
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    const { error} = await supabase
      .from("link_buttons")
      .update({ visible })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setButtons(buttons.map(b => 
        b.id === id ? { ...b, visible } : b
      ));
    }
  };

  const handleMoveButton = async (id: string, direction: "up" | "down") => {
    const idx = buttons.findIndex(b => b.id === id);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= buttons.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newButtons = [...buttons];
    [newButtons[idx], newButtons[swapIdx]] = [newButtons[swapIdx], newButtons[idx]];
    
    // Update order_index for both
    const updates = newButtons.map((b, i) => ({ ...b, order_index: i }));
    setButtons(updates);

    // Persist both
    await Promise.all([
      supabase.from("link_buttons").update({ order_index: updates[idx].order_index }).eq("id", updates[idx].id),
      supabase.from("link_buttons").update({ order_index: updates[swapIdx].order_index }).eq("id", updates[swapIdx].id),
    ]);
  };

  const handleSave = async () => {
    // Validate username before saving
    const error = validateUsername(linkProfile?.username || "");
    if (error) {
      setUsernameError(error);
      toast({ title: "Invalid username", description: error, variant: "destructive" });
      return;
    }

    const changedFields = diffLinkProfile(savedProfileRef.current, linkProfile);
    if (changedFields.length === 0) {
      toast({ title: "No changes to save.", description: "Your profile is already up to date." });
      return;
    }

    setSaving(true);
    const { error: saveError } = await supabase
      .from("link_profiles")
      .update({
        username: linkProfile.username,
        display_name: linkProfile.display_name,
        bio: linkProfile.bio,
        theme: linkProfile.theme,
        layout: linkProfile.layout,
        show_verified_badge: linkProfile.show_verified_badge,
        show_crevia_branding: linkProfile.show_crevia_branding,
        contact_enabled: linkProfile.contact_enabled,
        contact_email: linkProfile.contact_email,
        background: linkProfile.background,
        profile_picture: linkProfile.profile_picture,
        seo_title: linkProfile.seo_title,
        seo_description: linkProfile.seo_description,
      })
      .eq("id", linkProfile.id);

    if (saveError) {
      toast({
        title: "Error saving",
        description: saveError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saved!",
        description: `Changes saved: ${changedFields.join(", ")}.`,
      });
      savedProfileRef.current = { ...linkProfile };
    }
    setSaving(false);
  };

  // Silent background save — no toast, no spinner. Used for appearance/font changes
  // so the public page always reflects the latest state without user action.
  const silentSave = useCallback(async (profile: any) => {
    if (!profile?.id) return;
    await supabase.from("link_profiles").update({
      display_name:         profile.display_name,
      bio:                  profile.bio,
      theme:                profile.theme,
      layout:               profile.layout,
      show_verified_badge:  profile.show_verified_badge,
      show_crevia_branding: profile.show_crevia_branding,
      contact_enabled:      profile.contact_enabled,
      contact_email:        profile.contact_email,
      background:           profile.background,
      profile_picture:      profile.profile_picture,
      seo_title:            profile.seo_title,
      seo_description:      profile.seo_description,
    }).eq("id", profile.id);
  }, []);

  const scheduleAutoSave = useCallback((updatedProfile: any) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => silentSave(updatedProfile), 1200);
  }, [silentSave]);

  // Auto-save ANY appearance change (theme, colors, buttons, layout, font, bg image…)
  // without requiring the user to click Save. The public page reflects changes
  // within ~1.2 seconds of the user touching any appearance control.
  const appearanceInitRef = useRef(false);
  const lastAppearanceKeyRef = useRef("");
  useEffect(() => {
    if (!linkProfile) return;
    const key = JSON.stringify({
      theme:                linkProfile.theme,
      background:           linkProfile.background,
      layout:               linkProfile.layout,
      display_name:         linkProfile.display_name,
      bio:                  linkProfile.bio,
      profile_picture:      linkProfile.profile_picture,
      show_verified_badge:  linkProfile.show_verified_badge,
      show_crevia_branding: linkProfile.show_crevia_branding,
      contact_enabled:      linkProfile.contact_enabled,
      contact_email:        linkProfile.contact_email,
      seo_title:            linkProfile.seo_title,
      seo_description:      linkProfile.seo_description,
    });
    if (!appearanceInitRef.current) {
      appearanceInitRef.current = true;
      lastAppearanceKeyRef.current = key;
      return;
    }
    if (key !== lastAppearanceKeyRef.current) {
      lastAppearanceKeyRef.current = key;
      scheduleAutoSave(linkProfile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkProfile?.theme, linkProfile?.background, linkProfile?.layout,
      linkProfile?.display_name, linkProfile?.bio, linkProfile?.profile_picture,
      linkProfile?.show_verified_badge, linkProfile?.show_crevia_branding,
      linkProfile?.contact_enabled, linkProfile?.contact_email,
      linkProfile?.seo_title, linkProfile?.seo_description]);

  const handleViewLivePage = async () => {
    if (!linkProfile?.id || !linkProfile?.username) {
      toast({ title: "No username set", description: "Set a username in your Profile tab first.", variant: "destructive" });
      return;
    }
    setViewingLive(true);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const liveUrl = `${"https://kaizenafrika.app"}/${linkProfile.username}`;
    try {
      await supabase.from("link_profiles").update({
        username:             linkProfile.username,
        display_name:         linkProfile.display_name,
        bio:                  linkProfile.bio,
        theme:                linkProfile.theme,
        layout:               linkProfile.layout,
        show_verified_badge:  linkProfile.show_verified_badge,
        show_crevia_branding: linkProfile.show_crevia_branding,
        contact_enabled:      linkProfile.contact_enabled,
        contact_email:        linkProfile.contact_email,
        background:           linkProfile.background,
        profile_picture:      linkProfile.profile_picture,
        seo_title:            linkProfile.seo_title,
        seo_description:      linkProfile.seo_description,
      }).eq("id", linkProfile.id);
    } catch {
      // Non-fatal — still navigate so user can see the page
    }
    const win = window.open(liveUrl, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = liveUrl;
    setViewingLive(false);
  };

  const handleCopyLink = async () => {
    const link = `${"https://kaizenafrika.app"}/${linkProfile?.username}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Your Kaizen Link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Refresh analytics from DB when the analytics tab is opened
  useEffect(() => {
    const isAnalyticsTab = currentTab === "analytics" ||
      new URLSearchParams(location.search).get("section") === "analytics";
    if (!isAnalyticsTab || !linkProfile?.id) return;

    const refresh = async () => {
      const [{ data: freshProfile }, { data: freshButtons }] = await Promise.all([
        supabase.from("link_profiles").select("total_visits").eq("id", linkProfile.id).single(),
        supabase.from("link_buttons").select("id, clicks").eq("profile_id", linkProfile.id),
      ]);
      if (freshProfile) setLinkProfile((prev: any) => ({ ...prev, total_visits: freshProfile.total_visits }));
      if (freshButtons) setButtons((prev: any[]) => prev.map(b => {
        const fresh = (freshButtons as any[]).find((f: any) => f.id === b.id);
        return fresh ? { ...b, clicks: fresh.clicks } : b;
      }));
    };
    refresh();
  }, [currentTab, location.search, linkProfile?.id]);

  // Computed analytics
  const totalClicks = buttons.reduce((sum, btn) => sum + (btn.clicks || 0), 0);
  const totalViews = linkProfile?.total_visits || 0;
  const clickRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const topLink = buttons.length > 0
    ? [...buttons].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0]
    : null;
  const activeLinks = buttons.filter(b => b.visible !== false).length;

  // Profile picture section shared between standalone and embedded
  const renderProfilePicture = () => (
    <div className="flex flex-col items-center gap-4 mb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProfilePictureUpload}
      />
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <Avatar className="h-24 w-24 ring-4 ring-bronze/20">
          <AvatarImage src={linkProfile?.profile_picture} />
          <AvatarFallback className="bg-bronze/10 text-bronze text-2xl font-bold">
            {linkProfile?.display_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-6 w-6 text-white" />
        </div>
        {uploadingPicture && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Click to change profile picture</p>
    </div>
  );

  // Username field shared
  const renderUsernameField = (idPrefix: string = "") => (
    <div>
      <Label className="text-sm font-medium mb-2 block">Username</Label>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm whitespace-nowrap">kaizenafrika.app/</span>
        <Input
          value={linkProfile?.username || ""}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="yourusername"
          className={cn("flex-1 h-11", usernameError && "border-destructive")}
        />
      </div>
      {usernameError && (
        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {usernameError}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">3-30 chars. Letters, numbers, dots, underscores, hyphens. Cannot start/end with special chars.</p>
    </div>
  );

  const renderLinksCard = (compact = false) => (
    <Card className={cn("border-border/50", compact ? "min-w-0 p-6" : "p-6 md:p-8")}>
      <div className="flex items-center gap-3 mb-6">
        <Link2 className={cn("text-bronze flex-shrink-0", compact ? "w-5 h-5" : "w-6 h-6")} />
        <h3 className={cn("font-vollkorn font-bold", compact ? "text-xl" : "text-xl md:text-2xl")}>Action Links</h3>
      </div>

      {buttons.length > 0 ? (
        <div className="space-y-2 mb-6">
          {buttons.map((button, idx) => (
            <div key={button.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex flex-col flex-shrink-0">
                <button
                  onClick={() => handleMoveButton(button.id, "up")}
                  disabled={idx === 0}
                  className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMoveButton(button.id, "down")}
                  disabled={idx === buttons.length - 1}
                  className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <Switch
                checked={button.visible !== false}
                onCheckedChange={(v) => handleToggleVisibility(button.id, v)}
                className="flex-shrink-0"
              />
              {/* Icon — click to open picker */}
              <Popover open={iconPickerFor === button.id} onOpenChange={(o) => setIconPickerFor(o ? button.id : null)}>
                <PopoverTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/40 hover:opacity-75 transition-opacity"
                    title="Change icon"
                  >
                    {button.icon && button.icon !== "link"
                      ? <span className="text-foreground/80">{renderLinkIcon(button.icon, 18)}</span>
                      : (() => { try { return <img src={`https://www.google.com/s2/favicons?domain=${new URL(button.url).hostname}&sz=64`} alt="" className="w-5 h-5 object-contain" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display="none"}} />; } catch { return <Link2 className="w-4 h-4 text-muted-foreground" />; } })()
                    }
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" side="right" align="start">
                  <LinkIconPicker
                    onSelect={(v) => handleLinkIconSelect(v, button.id)}
                    currentIcon={button.icon}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{button.title}</p>
                <p className="text-xs text-muted-foreground truncate">{button.url}</p>
              </div>
              <button
                onClick={() => handleDeleteButton(button.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors flex-shrink-0"
                aria-label={`Remove ${button.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground mb-6">
          <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No links yet. Add one below.</p>
        </div>
      )}

      <div className="space-y-3 pt-2 border-t border-border/30">
        <p className="text-sm font-medium pt-3">Add a link</p>
        {/* Icon selector trigger + title input on same row */}
        <div className="flex items-center gap-2">
          <Popover open={iconPickerFor === "new"} onOpenChange={(o) => setIconPickerFor(o ? "new" : null)}>
            <PopoverTrigger asChild>
              <button
                className="w-11 h-11 rounded-lg bg-muted border border-border/50 flex items-center justify-center flex-shrink-0 hover:opacity-75 transition-opacity"
                title="Choose icon"
              >
                <span className="text-muted-foreground">
                  {newLinkIcon ? renderLinkIcon(newLinkIcon, 18) : <Link2 className="w-4 h-4" />}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" side="top" align="start">
              <LinkIconPicker
                onSelect={(v) => handleLinkIconSelect(v, "new")}
                currentIcon={newLinkIcon || undefined}
              />
            </PopoverContent>
          </Popover>
          <Input
            className="h-11 text-sm flex-1"
            value={newLinkTitle}
            onChange={(e) => setNewLinkTitle(e.target.value)}
            placeholder="Button title (e.g. My Portfolio)"
          />
        </div>
        <Input
          className="h-11 text-sm"
          value={newLinkUrl}
          onChange={(e) => setNewLinkUrl(e.target.value)}
          placeholder="https://example.com"
          onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
        />
        <Button
          onClick={handleAddLink}
          disabled={!newLinkTitle.trim() || !newLinkUrl.trim() || addingLink}
          className="w-full bg-bronze hover:bg-bronze-dark h-11"
        >
          <Plus className="w-4 h-4 mr-2" />
          {addingLink ? "Adding..." : "Add Link"}
        </Button>
      </div>
    </Card>
  );

  const renderSocialLinksCard = (compact = false) => (
    <Card className={cn("border-border/50", compact ? "min-w-0 p-6" : "p-6 md:p-8")}>
      <div className="flex items-center gap-3 mb-6">
        <Share2 className={cn("text-bronze flex-shrink-0", compact ? "w-5 h-5" : "w-6 h-6")} />
        <h3 className={cn("font-vollkorn font-bold", compact ? "text-xl" : "text-xl md:text-2xl")}>Social Links</h3>
      </div>

      {/* Live badge preview */}
      {socialIcons.length > 0 && (
        <div className="mb-5 p-4 rounded-xl bg-muted/40 flex justify-center">
          <SocialBadgeRow icons={socialIcons} />
        </div>
      )}

      {/* Existing icons list */}
      {socialIcons.length > 0 ? (
        <div className="space-y-2 mb-6">
          {socialIcons.map((icon) => (
            <div key={icon.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                <span className="w-5 h-5 flex items-center justify-center">{getSocialSvg(icon.platform)}</span>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">{icon.platform}</p>
                <p className="text-xs text-muted-foreground truncate">{icon.url}</p>
              </div>
              <button
                onClick={() => handleDeleteSocialIcon(icon.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors flex-shrink-0"
                aria-label={`Remove ${icon.platform}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground mb-6">
          <Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No social links added yet.</p>
        </div>
      )}

      {/* Add form */}
      <div className="space-y-3 pt-2 border-t border-border/30">
        <p className="text-sm font-medium pt-3">Add a social link</p>
        <div className="flex gap-2">
          <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
            <SelectTrigger className="w-[148px] flex-shrink-0 h-11">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">{getSocialSvg(p.value)}</span>
                    </span>
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="flex-1 h-11 text-sm"
            value={newSocialUrl}
            onChange={(e) => setNewSocialUrl(e.target.value)}
            placeholder={SOCIAL_PLATFORMS.find((p) => p.value === newSocialPlatform)?.placeholder || "URL or handle"}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSocialIcon(); }}
          />
        </div>
        <Button
          onClick={handleAddSocialIcon}
          disabled={!newSocialPlatform || !newSocialUrl.trim() || addingSocial}
          className="w-full bg-bronze hover:bg-bronze-dark h-11"
        >
          <Plus className="w-4 h-4 mr-2" />
          {addingSocial ? "Adding..." : "Add Social Link"}
        </Button>
      </div>
    </Card>
  );

  // Analytics section shared
  const renderAnalyticsGate = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-bronze/10 flex items-center justify-center mb-4">
        <BarChart3 className="w-7 h-7 text-bronze" />
      </div>
      <h3 className="font-vollkorn text-xl font-bold mb-2">Analytics is a Pro feature</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">Unlock visitor stats, click-through rates, and detailed link performance. Upgrade to Pro to see your audience.</p>
      <button
        onClick={() => openUpgradeModal("Visitor Analytics")}
        className="px-6 py-2.5 rounded-xl bg-bronze hover:bg-bronze/90 text-white font-semibold text-sm transition-colors"
      >
        Upgrade to Pro
      </button>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-5 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-bronze/10">
              <Eye className="w-5 h-5 text-bronze" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalViews}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Views</p>
        </Card>
        <Card className="p-5 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MousePointer className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalClicks}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Clicks</p>
        </Card>
        <Card className="p-5 border-border/50 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{clickRate}%</p>
          <p className="text-sm text-muted-foreground mt-1">Click-Through Rate</p>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Link2 className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{activeLinks}</p>
          <p className="text-sm text-muted-foreground mt-1">Active Links</p>
        </Card>
        <Card className="p-5 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground truncate">{topLink?.title || "—"}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Top Link {topLink ? `(${topLink.clicks || 0} clicks)` : ""}
          </p>
        </Card>
      </div>

      {/* Link Performance */}
      <Card className="p-6 border-border/50">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-bronze" />
          <h3 className="font-vollkorn text-xl sm:text-2xl font-bold">Link Performance</h3>
        </div>
        <div className="space-y-3">
          {buttons.length > 0 ? (
            buttons
              .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
              .map((button) => {
                const percentage = totalClicks > 0 ? ((button.clicks || 0) / totalClicks * 100).toFixed(0) : 0;
                return (
                  <div key={button.id} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{button.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{button.url}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-bronze">{button.clicks || 0}</p>
                        <p className="text-xs text-muted-foreground">{percentage}% of clicks</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-bronze rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No links yet. Add buttons to see analytics.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // When embedded in Kaizen Studio, use a cleaner layout without the sidebar
  if (isEmbedded) {
    const embeddedTab = new URLSearchParams(location.search).get("section") || "profile";
    
    return (
      <>
      <div className="bg-background">
        {/* Embedded Content with Preview */}
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 md:py-8 xl:flex-row xl:items-start">
          {/* Main Content */}
          <div className="min-w-0 flex-1 xl:max-w-[54rem]">
            {embeddedTab === "profile" && (
              <>
                {/* Mobile: preview widget + premium edit button */}
                <div className="md:hidden space-y-4">
                  <div>
                    <p className="text-xs font-poppins font-medium text-center text-muted-foreground mb-3 tracking-widest uppercase">Live Preview</p>
                    <LivePreview key={linkProfile?.id || 'preview'} linkProfile={linkProfile} buttons={buttons} isPro={isProUser} socialIcons={socialIcons} />
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="flex-1 bg-bronze hover:bg-bronze-dark text-white gap-1.5 text-sm h-11"
                        onClick={() => { navigator.clipboard.writeText(`${"https://kaizenafrika.app"}/${linkProfile?.username}`); toast({ title: "Link copied!" }); }}
                        style={{ touchAction: "manipulation" }}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5 text-sm h-11"
                        onClick={handleViewLivePage}
                        disabled={viewingLive}
                        style={{ touchAction: "manipulation" }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> {viewingLive ? "Opening..." : "View Live"}
                      </Button>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMobileProfileSheet(true)}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 active:bg-muted/60 transition-all group"
                    style={{ touchAction: "manipulation" }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-bronze/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-bronze" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-poppins text-sm font-semibold text-foreground">Profile Information</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Name, username, bio & photo</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </button>
                </div>

                {/* Desktop: existing card, untouched */}
                <Card className="hidden md:block min-w-0 p-6 border-border/50">
                  <h3 className="font-vollkorn text-2xl font-bold mb-6">Profile Information</h3>
                  <div className="space-y-5">
                    {renderProfilePicture()}
                    {renderUsernameField("embedded-")}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Display Name</Label>
                      <Input
                        value={linkProfile?.display_name || ""}
                        onChange={(e) => setLinkProfile({ ...linkProfile, display_name: e.target.value })}
                        placeholder="Your Name"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Bio</Label>
                      <Textarea
                        value={linkProfile?.bio || ""}
                        onChange={(e) => setLinkProfile({ ...linkProfile, bio: e.target.value.slice(0, 150) })}
                        placeholder="Tell people about yourself..."
                        className="min-h-[100px] resize-none text-base"
                        maxLength={150}
                      />
                      <p className="text-xs text-muted-foreground mt-1">{linkProfile?.bio?.length || 0}/150</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSave} disabled={saving} className="bg-bronze hover:bg-bronze-dark">
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowPreviewModal(true)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {embeddedTab === "buttons" && (
              <div className="space-y-6">
                {renderLinksCard(true)}
                {renderSocialLinksCard(true)}
              </div>
            )}

            {embeddedTab === "appearance" && (
              <div className="space-y-6">
                {/* Theme & Colors (includes background style) */}
                <Card className="min-w-0 p-6 border-border/50">
                  <div className="flex items-center gap-3 mb-6">
                    <Palette className="w-6 h-6 text-bronze" />
                    <h3 className="font-vollkorn text-2xl font-bold">Theme & Colors</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium mb-4 block">Color Scheme</Label>
                      <div className={cn("relative", (hasCustomBg || hasCustomColor) && "pointer-events-none select-none")}>
                        {hasCustomBg && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
                            <p className="text-xs text-muted-foreground text-center px-3">Remove background image to change colour scheme</p>
                          </div>
                        )}
                        {!hasCustomBg && hasCustomColor && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
                            <p className="text-xs text-muted-foreground text-center px-3">Reset custom color to use a colour scheme</p>
                          </div>
                        )}
                        <ThemeSelector
                          value={hasCustomColor ? "" : (linkProfile?.theme || "elite_obsidian")}
                          onChange={(themeId, fontKey) =>
                            setLinkProfile({ ...linkProfile, theme: themeId, background: { ...linkProfile?.background, style: "solid", font_family: fontKey, custom_bg_url: null, custom_color: undefined } })
                          }
                          isProUser={isProUser}
                          onUpgrade={() => navigate("/profile/payments-billing")}
                        />
                      </div>
                    </div>

                    {/* Custom Accent Color */}
                    {!hasCustomBg && (
                      <div className="pt-4 border-t border-border/40">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm font-medium">Custom Color Override</Label>
                          {!isProUser && (
                            <span className="text-[10px] font-semibold text-bronze uppercase tracking-wider border border-bronze/40 rounded-full px-2 py-0.5">Pro</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Override the theme background with a solid color or gradient.</p>
                        <div className={cn("relative rounded-2xl bg-[#0A0A0A] border border-white/10 p-4", !isProUser && "pointer-events-none select-none")}>
                          {!isProUser && (
                            <button
                              type="button"
                              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-black/60 backdrop-blur-sm"
                              onClick={() => navigate("/profile/payments-billing")}
                            >
                              <Lock className="w-4 h-4 text-bronze" />
                              <span className="text-xs font-semibold text-bronze">Upgrade to Pro to unlock</span>
                            </button>
                          )}
                          <AdvancedColorSelector
                            variant="link"
                            value={linkProfile?.background?.custom_color || ""}
                            onChange={(val) =>
                              setLinkProfile({ ...linkProfile, background: { ...linkProfile?.background, custom_color: val } })
                            }
                          />
                        </div>
                        {isProUser && linkProfile?.background?.custom_color && (
                          <button
                            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                            onClick={() =>
                              setLinkProfile({ ...linkProfile, background: { ...linkProfile?.background, custom_color: undefined } })
                            }
                          >
                            Reset to theme color
                          </button>
                        )}
                      </div>
                    )}

                    {/* Custom Background Image */}
                    <div className={cn("pt-4 border-t border-border/40", !hasCustomBg && linkProfile?.theme && linkProfile.theme !== "custom_image" && "")}>
                      <Label className="text-sm font-medium mb-2 block">Custom Background Image</Label>
                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground block">
                          {hasCustomBg ? "Active — remove to switch back to a colour scheme" : "Upload your own background image"}
                        </Label>
                        {linkProfile?.background?.custom_bg_url && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                            <img src={linkProfile.background.custom_bg_url} alt="Background" className="w-full h-full object-cover" />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 h-7 text-xs"
                              onClick={handleRemoveBgImage}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                        {!hasCustomBg && (
                          <div>
                            <input
                              ref={bgImageRefEmb}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgImageUpload(f); e.target.value = ""; }}
                            />
                            <Button
                              variant="outline"
                              className="w-full border-dashed border-2 border-bronze/40 hover:border-bronze"
                              onClick={() => bgImageRefEmb.current?.click()}
                              disabled={uploadingBg}
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              {uploadingBg ? "Uploading…" : "Choose Image"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Typography */}
                <Card className="min-w-0 p-6 border-border/50">
                  <div className="flex items-center gap-3 mb-6">
                    <Type className="w-6 h-6 text-bronze" />
                    <h3 className="font-vollkorn text-2xl font-bold">Typography</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Font Family</Label>
                      <Select
                        value={linkProfile?.background?.font_family || "plus-jakarta"}
                        onValueChange={(value) => {
                          if (limits.freeFontsOnly && PRO_FONTS.includes(value)) {
                            openUpgradeModal("Premium Fonts");
                            return;
                          }
                          const updated = { ...linkProfile, background: { ...linkProfile?.background, font_family: value } };
                          setLinkProfile(updated);
                          scheduleAutoSave(updated);
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cormorant" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Cormorant · Luxury Serif</SelectItem>
                          <SelectItem value="plus-jakarta" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Jakarta Sans · Modern</SelectItem>
                          <SelectItem value="playfair" style={{ fontFamily: "'Playfair Display', serif" }}>{!isProUser && "🔒 "}Playfair · Editorial{!isProUser && " · Pro"}</SelectItem>
                          <SelectItem value="dm-serif" style={{ fontFamily: "'DM Serif Display', serif" }}>{!isProUser && "🔒 "}DM Serif · Bold & Clean{!isProUser && " · Pro"}</SelectItem>
                          <SelectItem value="outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>{!isProUser && "🔒 "}Outfit · Contemporary{!isProUser && " · Pro"}</SelectItem>
                          <SelectItem value="syne" style={{ fontFamily: "'Syne', sans-serif" }}>{!isProUser && "🔒 "}Syne · Fashion{!isProUser && " · Pro"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                {/* Layout */}
                <Card className="min-w-0 p-6 border-border/50">
                  <div className="flex items-center gap-3 mb-6">
                    <Layout className="w-6 h-6 text-bronze" />
                    <h3 className="font-vollkorn text-2xl font-bold">Layout</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Button Style</Label>
                      <RadioGroup
                        value={linkProfile?.background?.button_style || "rounded"}
                        onValueChange={(value) => setLinkProfile({ 
                          ...linkProfile, 
                          background: { ...linkProfile?.background, button_style: value }
                        })}
                        className="grid grid-cols-2 gap-3"
                      >
                        {[
                          { value: "rounded", label: "Rounded", class: "rounded-full" },
                          { value: "sharp", label: "Sharp", class: "" },
                          { value: "soft", label: "Soft", class: "rounded-lg" },
                        ].map((style) => {
                          const isLockedStyle = limits.layoutLocked === "sharp" && style.value !== "sharp";
                          return (
                            <div key={style.value} className="relative">
                              <RadioGroupItem value={style.value} id={`emb-btn-${style.value}`} className="peer sr-only" disabled={isLockedStyle} />
                              <Label
                                htmlFor={`emb-btn-${style.value}`}
                                onClick={isLockedStyle ? (e) => { e.preventDefault(); openUpgradeModal("Custom Layout Styles"); } : undefined}
                                className={cn("flex flex-col items-center p-4 rounded-xl border-2 border-muted peer-data-[state=checked]:border-bronze cursor-pointer", isLockedStyle && "opacity-50")}
                              >
                                <div className={cn("w-full h-10 mb-2", `${style.class} bg-bronze/20 border-2 border-bronze`)} />
                                <span className="text-sm font-medium">{style.label}</span>
                                {isLockedStyle && <span className="text-[10px] text-bronze font-semibold mt-0.5">Pro</span>}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  </div>
                </Card>

                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={saving} className="flex-1 bg-bronze hover:bg-bronze-dark h-12">
                    {saving ? "Saving..." : "Save Appearance"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPreviewModal(true)}
                    className="h-12 lg:hidden"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            )}

            {embeddedTab === "analytics" && (limits.hasFullAnalytics ? renderAnalytics() : renderAnalyticsGate())}
          </div>

          {/* Live Preview - Desktop Only */}
          <div className="hidden xl:block xl:w-[300px] xl:flex-shrink-0 2xl:w-[340px]">
            <div className="sticky top-24">
              <p className="text-sm font-medium text-center text-muted-foreground mb-4">Live Preview</p>
              <LivePreview key={linkProfile?.id || 'preview'} linkProfile={linkProfile} buttons={buttons} isPro={isProUser} socialIcons={socialIcons} />
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1 bg-bronze hover:bg-bronze-dark text-white gap-1.5 text-xs h-9"
                  onClick={() => { navigator.clipboard.writeText(`${"https://kaizenafrika.app"}/${linkProfile?.username}`); toast({ title: "Link copied!" }); }}
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs h-9"
                  onClick={handleViewLivePage}
                  disabled={viewingLive}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> {viewingLive ? "Opening..." : "View Page"}
                </Button>
              </div>
            </div>
          </div>
        </div>


        {/* Mobile profile info bottom sheet — portal to document.body */}
        {showMobileProfileSheet && createPortal(
          <div
            className="fixed inset-0 z-[500] flex items-end justify-center"
            style={{ WebkitTransform: "translateZ(0)" }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMobileProfileSheet(false)}
            />
            <div
              className="relative w-full bg-background flex flex-col rounded-t-3xl border border-border/40 overflow-hidden max-h-[92dvh]"
              style={{ boxShadow: "0 -12px 48px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.04)" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
                <div className="w-10 h-[3px] rounded-full bg-border/70" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-bronze/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-bronze" />
                  </div>
                  <h3 className="font-vollkorn text-xl font-bold">Profile Information</h3>
                </div>
                <button
                  onClick={() => setShowMobileProfileSheet(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  style={{ touchAction: "manipulation" }}
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Scrollable form */}
              <div
                className="overflow-y-auto flex-1 px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-5"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {renderProfilePicture()}
                {renderUsernameField("mobile-sheet-")}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Display Name</Label>
                  <Input
                    value={linkProfile?.display_name || ""}
                    onChange={(e) => setLinkProfile({ ...linkProfile, display_name: e.target.value })}
                    placeholder="Your Name"
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Bio</Label>
                  <Textarea
                    value={linkProfile?.bio || ""}
                    onChange={(e) => setLinkProfile({ ...linkProfile, bio: e.target.value.slice(0, 150) })}
                    placeholder="Tell people about yourself..."
                    className="min-h-[100px] resize-none text-base"
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{linkProfile?.bio?.length || 0}/150</p>
                </div>
                <div className="flex gap-3 pt-2 pb-2">
                  <Button
                    onClick={() => { handleSave(); setShowMobileProfileSheet(false); }}
                    disabled={saving}
                    className="flex-1 bg-bronze hover:bg-bronze-dark h-12 font-poppins font-semibold"
                    style={{ touchAction: "manipulation" }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 px-5"
                    onClick={() => setShowMobileProfileSheet(false)}
                    style={{ touchAction: "manipulation" }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Preview modal — portal to document.body */}
        {showPreviewModal && createPortal(
          <div
            className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center"
            style={{ WebkitTransform: "translateZ(0)" }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPreviewModal(false)}
            />

            {/* Sheet */}
            <div className="relative w-full sm:w-[440px] bg-background flex flex-col rounded-t-3xl sm:rounded-2xl border border-border/40 overflow-hidden max-h-[95dvh] sm:max-h-[90vh]"
              style={{ boxShadow: '0 -12px 48px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.04)' }}
            >
              {/* Drag handle — mobile only */}
              <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
                <div className="w-10 h-[3px] rounded-full bg-border/70" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-bronze/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 text-bronze" />
                  </div>
                  <div>
                    <p className="font-poppins text-sm font-semibold text-foreground leading-tight">Your Kaizen Link</p>
                    <p className="text-[10px] text-amber-500 font-medium leading-tight">Unsaved changes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  style={{ touchAction: 'manipulation' }}
                  aria-label="Close preview"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Phone mockup — scrollable */}
              <div className="overflow-y-auto flex flex-col items-center px-6 pt-3 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
                <LivePreview key={linkProfile?.id || 'preview'} linkProfile={linkProfile} buttons={buttons} isPro={isProUser} socialIcons={socialIcons} />
              </div>

              {/* Footer — pinned */}
              <div
                className="flex-shrink-0 px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-border/40 bg-background space-y-2.5"
              >
                {/* URL bar — tap to copy */}
                <button
                  onClick={() => { navigator.clipboard.writeText(`${"https://kaizenafrika.app"}/${linkProfile?.username}`); toast({ title: "Link copied!", description: `${"https://kaizenafrika.app"}/${linkProfile?.username}` }); }}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full flex items-center gap-2.5 px-4 h-11 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted/80 active:bg-muted/90 transition-colors group"
                >
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-left text-xs text-muted-foreground truncate font-mono tracking-tight">
                    {"https://kaizenafrika.app".replace(/^https?:\/\//, '')}/{linkProfile?.username}
                  </span>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </button>

                {/* View Live Page */}
                <button
                  onClick={handleViewLivePage}
                  disabled={viewingLive}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border/60 bg-background hover:bg-muted/40 active:bg-muted/60 text-foreground text-sm font-semibold font-poppins transition-colors disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Live Page
                </button>

                {/* Keep Editing + Save */}
                <div className="flex gap-2.5">
                  <Button
                    variant="ghost"
                    className="flex-1 h-11 text-sm font-poppins font-medium text-muted-foreground hover:text-foreground rounded-xl"
                    onClick={() => setShowPreviewModal(false)}
                    style={{ touchAction: 'manipulation' }}
                  >
                    Keep Editing
                  </Button>
                  <Button
                    className="flex-1 h-11 text-sm font-poppins font-semibold bg-bronze hover:bg-bronze/90 active:bg-bronze/80 text-white rounded-xl shadow-sm shadow-bronze/25 transition-all"
                    onClick={() => { handleSave(); setShowPreviewModal(false); }}
                    disabled={saving}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Delete action link confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this link?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDeleteId && executeDeleteButton(pendingDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete social link confirmation */}
      <AlertDialog open={!!pendingDeleteSocialId} onOpenChange={(o) => { if (!o) setPendingDeleteSocialId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove social link?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDeleteSocialId && executeDeleteSocialIcon(pendingDeleteSocialId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  // Standalone view with sidebar
  return (
    <>
    <div className="flex flex-col bg-background">
      <LinkTabsMobile userType={profile?.user_type || "creator"} />

      {/* Mobile-only preview shortcut — xl+ has the sidebar preview */}
      <div className="xl:hidden flex items-center justify-end px-5 sm:px-6 py-2 border-b border-border/30 bg-background flex-shrink-0">
        <button
          onClick={() => setShowPreviewModal(true)}
          className="flex items-center gap-1.5 text-sm font-poppins font-medium text-bronze hover:text-bronze/80 active:opacity-70 transition-colors py-1 min-h-[36px]"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      <div className="flex w-full">
        <LinkSidebarDesktop userType={profile?.user_type || "creator"} />

        {/* Main Content Area */}
        <main className="flex-1 bg-background md:ml-[100px] flex">
          {/* Content container */}
          <div className="flex-1 max-w-3xl px-5 sm:px-6 md:px-8 pt-2 pb-10 md:pt-10 md:pb-14">
            <div className="w-full space-y-8 md:space-y-10">

          {/* ===== PROFILE TAB ===== */}
          {currentTab === "profile" && (
            <div className="space-y-8 md:space-y-10">
              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                <Button
                  size="lg"
                  onClick={() => setShowPreviewModal(true)}
                  className="w-full bg-bronze hover:bg-bronze-dark font-poppins font-semibold h-14 md:h-16 text-base md:text-lg"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Preview Your Page
                </Button>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleSave}
                    disabled={saving}
                    className="font-poppins font-semibold h-14 md:h-16 text-base md:text-lg"
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="font-poppins font-semibold h-14 md:h-16 text-base md:text-lg"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-2" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            
              {/* Profile Information Card */}
              <Card className="p-6 md:p-8 border-border/50">
                <h3 className="font-vollkorn text-2xl md:text-3xl font-bold mb-6 md:mb-7">Profile Information</h3>
                
                <div className="space-y-6">
                  {renderProfilePicture()}

                  <div>
                    <Label htmlFor="username" className="text-base font-medium mb-3 block">Username</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm whitespace-nowrap">kaizenafrika.app/</span>
                      <Input
                        id="username"
                        value={linkProfile?.username || ""}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        placeholder="yourusername"
                        className={cn("flex-1 h-12 text-base", usernameError && "border-destructive")}
                      />
                    </div>
                    {usernameError && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {usernameError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">3-30 chars. Letters, numbers, dots, underscores, hyphens.</p>
                  </div>

                  <div>
                    <Label htmlFor="displayName" className="text-base font-medium mb-3 block">Display Name</Label>
                    <Input
                      id="displayName"
                      value={linkProfile?.display_name || ""}
                      onChange={(e) => setLinkProfile({ ...linkProfile, display_name: e.target.value })}
                      placeholder="Your Name"
                      className="h-12 text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-base font-medium mb-3 block">Bio (max 150 characters)</Label>
                    <Textarea
                      id="bio"
                      value={linkProfile?.bio || ""}
                      onChange={(e) => setLinkProfile({ ...linkProfile, bio: e.target.value.slice(0, 150) })}
                      placeholder="Tell people about yourself..."
                      className="min-h-[120px] resize-none text-base"
                      maxLength={150}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {linkProfile?.bio?.length || 0}/150
                    </p>
                  </div>

                  {profile?.is_verified && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showBadge">Show Verified Badge</Label>
                      <Switch
                        id="showBadge"
                        checked={linkProfile?.show_verified_badge || false}
                        onCheckedChange={(checked) => 
                          setLinkProfile({ ...linkProfile, show_verified_badge: checked })
                        }
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ===== LINKS TAB ===== */}
          {currentTab === "buttons" && (
            <div className="space-y-8 md:space-y-10">
              {renderLinksCard()}
              {renderSocialLinksCard()}
            </div>
          )}

          {/* ===== APPEARANCE TAB ===== */}
          {currentTab === "appearance" && (
            <div className="space-y-6 md:space-y-10">
              {/* Save Buttons */}
              <div className="flex gap-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-bronze hover:bg-bronze-dark h-14 md:h-16 text-base md:text-lg font-poppins font-semibold">
                  {saving ? "Saving..." : "Save Appearance"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewModal(true)}
                  className="h-14 md:h-16"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Preview
                </Button>
              </div>

              {/* Typography Section */}
              <Card className="p-4 sm:p-6 md:p-9 border-border/50">
                <div className="flex items-center gap-3 mb-6 md:mb-10">
                  <Type className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-bronze flex-shrink-0" />
                  <h3 className="font-vollkorn text-xl sm:text-2xl md:text-4xl font-bold">Typography</h3>
                </div>
                
                <div className="space-y-6 md:space-y-10">
                  <div>
                    <Label htmlFor="fontFamily" className="text-sm sm:text-base md:text-lg font-medium mb-2 md:mb-4 block">Font Family</Label>
                    <Select
                      value={linkProfile?.background?.font_family || "plus-jakarta"}
                      onValueChange={(value) => {
                        const updated = { ...linkProfile, background: { ...linkProfile?.background, font_family: value } };
                        setLinkProfile(updated);
                        scheduleAutoSave(updated);
                      }}
                    >
                      <SelectTrigger className="mt-2 h-10 sm:h-11 md:h-12 text-sm sm:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cormorant" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Cormorant · Luxury Serif</SelectItem>
                        <SelectItem value="playfair" style={{ fontFamily: "'Playfair Display', serif" }}>Playfair · Editorial</SelectItem>
                        <SelectItem value="dm-serif" style={{ fontFamily: "'DM Serif Display', serif" }}>DM Serif · Bold & Clean</SelectItem>
                        <SelectItem value="plus-jakarta" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Jakarta Sans · Modern</SelectItem>
                        <SelectItem value="outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>Outfit · Contemporary</SelectItem>
                        <SelectItem value="syne" style={{ fontFamily: "'Syne', sans-serif" }}>Syne · Fashion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Theme & Colors Section */}
              <Card className="p-4 sm:p-6 md:p-9 border-border/50">
                <div className="flex items-center gap-3 mb-6 md:mb-10">
                  <Palette className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-bronze flex-shrink-0" />
                  <h3 className="font-vollkorn text-xl sm:text-2xl md:text-4xl font-bold">Theme & Colors</h3>
                </div>
                
                <div className="space-y-6 md:space-y-10">
                  <div>
                    <Label className="text-sm sm:text-base md:text-lg font-medium mb-3 md:mb-6 block">Color Scheme</Label>
                    <div className={cn("relative", (hasCustomBg || hasCustomColor) && "pointer-events-none select-none")}>
                      {hasCustomBg && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
                          <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">Remove background image to change colour scheme</p>
                        </div>
                      )}
                      {!hasCustomBg && hasCustomColor && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
                          <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">Reset custom color to use a colour scheme</p>
                        </div>
                      )}
                      <ThemeSelector
                        value={hasCustomColor ? "" : (linkProfile?.theme || "elite_obsidian")}
                        onChange={(themeId, fontKey) =>
                          setLinkProfile({ ...linkProfile, theme: themeId, background: { ...linkProfile?.background, style: "solid", font_family: fontKey, custom_bg_url: null, custom_color: undefined } })
                        }
                        isProUser={isProUser}
                        onUpgrade={() => navigate("/profile/payments-billing")}
                      />
                    </div>
                  </div>

                  {/* Custom Accent Color */}
                  {!hasCustomBg && (
                    <div className="pt-6 border-t border-border/40">
                      <Label className="text-sm sm:text-base md:text-lg font-medium mb-2 md:mb-4 block">Custom Color Override</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">Override the theme background with a solid color or gradient.</p>
                      <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-4 md:p-5">
                        <AdvancedColorSelector
                          variant="link"
                          value={linkProfile?.background?.custom_color || ""}
                          onChange={(val) =>
                            setLinkProfile({ ...linkProfile, background: { ...linkProfile?.background, custom_color: val } })
                          }
                        />
                      </div>
                      {linkProfile?.background?.custom_color && (
                        <button
                          className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                          onClick={() =>
                            setLinkProfile({ ...linkProfile, background: { ...linkProfile?.background, custom_color: undefined } })
                          }
                        >
                          Reset to theme color
                        </button>
                      )}
                    </div>
                  )}

                  {/* Custom Background Image */}
                  <div className="pt-4 border-t border-border/40">
                    <Label className="text-sm sm:text-base font-medium mb-2 block">Custom Background Image</Label>
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground block">
                        {hasCustomBg ? "Active — remove to switch back to a colour scheme" : "Upload your own background image"}
                      </Label>
                      {linkProfile?.background?.custom_bg_url && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                          <img src={linkProfile.background.custom_bg_url} alt="Background" className="w-full h-full object-cover" />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 h-7 text-xs"
                            onClick={handleRemoveBgImage}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      {!hasCustomBg && (
                        <div>
                          <input
                            ref={bgImageRefStandalone}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgImageUpload(f); e.target.value = ""; }}
                          />
                          <Button
                            variant="outline"
                            className="w-full border-dashed border-2 border-bronze/40 hover:border-bronze"
                            onClick={() => bgImageRefStandalone.current?.click()}
                            disabled={uploadingBg}
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            {uploadingBg ? "Uploading…" : "Choose Image"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Layout & Spacing Section */}
              <Card className="p-4 sm:p-6 md:p-9 border-border/50">
                <div className="flex items-center gap-3 mb-6 md:mb-10">
                  <Layout className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-bronze flex-shrink-0" />
                  <h3 className="font-vollkorn text-xl sm:text-2xl md:text-4xl font-bold">Layout & Spacing</h3>
                </div>
                
                <div className="space-y-6 md:space-y-10">
                  <div>
                    <Label htmlFor="layout" className="text-sm sm:text-base md:text-lg font-medium mb-2 md:mb-4 block">Page Layout</Label>
                    <Select
                      value={linkProfile?.layout || "centered"}
                      onValueChange={(value) => setLinkProfile({ ...linkProfile, layout: value })}
                    >
                      <SelectTrigger className="mt-2 h-10 sm:h-11 md:h-12 text-sm sm:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="centered">Centered Classic</SelectItem>
                        <SelectItem value="left">Left Aligned</SelectItem>
                        <SelectItem value="full">Full Width</SelectItem>
                        <SelectItem value="card">Card Style</SelectItem>
                        <SelectItem value="split">Split Screen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm sm:text-base md:text-lg font-medium mb-3 md:mb-6 block">Button Style</Label>
                    <RadioGroup
                      value={linkProfile?.background?.button_style || "rounded"}
                      onValueChange={(value) => setLinkProfile({ 
                        ...linkProfile, 
                        background: { ...linkProfile?.background, button_style: value }
                      })}
                      className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6"
                    >
                      {[
                        { value: "rounded", label: "Rounded", class: "rounded-full" },
                        { value: "sharp", label: "Sharp", class: "" },
                        { value: "soft", label: "Soft", class: "rounded-lg" },
                      ].map((style) => (
                        <div key={style.value} className="relative">
                          <RadioGroupItem value={style.value} id={`standalone-btn-${style.value}`} className="peer sr-only" />
                          <Label
                            htmlFor={`standalone-btn-${style.value}`}
                            className="flex flex-col items-center justify-center rounded-lg md:rounded-xl border-2 border-muted p-3 sm:p-4 md:p-6 hover:bg-muted peer-data-[state=checked]:border-bronze peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-bronze/20 cursor-pointer transition-all"
                          >
                            <div className={cn(
                              "w-full h-10 sm:h-12 md:h-16 mb-2 sm:mb-2.5 md:mb-3 shadow-sm",
                              `${style.class} bg-bronze/20 border-2 border-bronze`
                            )}></div>
                            <span className="text-xs sm:text-sm md:text-base font-medium">{style.label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-sm sm:text-base font-medium mb-2 md:mb-4 block">Button Spacing</Label>
                    <div className="mt-3 md:mt-4">
                      <Slider
                        value={[linkProfile?.background?.button_spacing || 12]}
                        onValueChange={(value) => setLinkProfile({ 
                          ...linkProfile, 
                          background: { ...linkProfile?.background, button_spacing: value[0] }
                        })}
                        min={4}
                        max={32}
                        step={4}
                        className="w-full"
                      />
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 md:mt-3">
                        {linkProfile?.background?.button_spacing || 12}px between buttons
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm sm:text-base font-medium mb-2 block">Page Width</Label>
                    <Select
                      value={linkProfile?.background?.page_width || "medium"}
                      onValueChange={(value) => setLinkProfile({ 
                        ...linkProfile, 
                        background: { ...linkProfile?.background, page_width: value }
                      })}
                    >
                      <SelectTrigger className="mt-2 h-10 sm:h-11 md:h-12 text-sm sm:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="narrow">Narrow (480px)</SelectItem>
                        <SelectItem value="medium">Medium (640px)</SelectItem>
                        <SelectItem value="wide">Wide (800px)</SelectItem>
                        <SelectItem value="full">Full Width</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Effects & Animations */}
              <Card className="p-6 md:p-9 border-border/50">
                <div className="flex items-center gap-3 mb-8">
                  <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-bronze" />
                  <h3 className="font-vollkorn text-2xl md:text-4xl font-bold">Effects & Animations</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Button Hover Effects</Label>
                      <p className="text-sm text-muted-foreground mt-1">Subtle animations on hover</p>
                    </div>
                    <Switch
                      checked={linkProfile?.background?.hover_effects !== false}
                      onCheckedChange={(checked) => setLinkProfile({ 
                        ...linkProfile, 
                        background: { ...linkProfile?.background, hover_effects: checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Smooth Scrolling</Label>
                      <p className="text-sm text-muted-foreground mt-1">Enhanced scroll experience</p>
                    </div>
                    <Switch
                      checked={linkProfile?.background?.smooth_scroll !== false}
                      onCheckedChange={(checked) => setLinkProfile({ 
                        ...linkProfile, 
                        background: { ...linkProfile?.background, smooth_scroll: checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Fade-in Animation</Label>
                      <p className="text-sm text-muted-foreground mt-1">Elements fade in on load</p>
                    </div>
                    <Switch
                      checked={linkProfile?.background?.fade_animation !== false}
                      onCheckedChange={(checked) => setLinkProfile({ 
                        ...linkProfile, 
                        background: { ...linkProfile?.background, fade_animation: checked }
                      })}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}


          {/* ===== ANALYTICS TAB ===== */}
          {currentTab === "analytics" && (limits.hasFullAnalytics ? renderAnalytics() : renderAnalyticsGate())}
        </div>
          </div>

          {/* Live Preview - Desktop Only (Standalone) */}
          <div className="hidden lg:block w-[340px] flex-shrink-0 py-8 pr-6">
            <div className="sticky top-24">
              <p className="text-sm font-medium text-center text-muted-foreground mb-4">Live Preview</p>
              <LivePreview key={linkProfile?.id || 'preview'} linkProfile={linkProfile} buttons={buttons} isPro={isProUser} socialIcons={socialIcons} />
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1 bg-bronze hover:bg-bronze-dark text-white gap-1.5 text-xs h-9"
                  onClick={() => { navigator.clipboard.writeText(`${"https://kaizenafrika.app"}/${linkProfile?.username}`); toast({ title: "Link copied!" }); }}
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs h-9"
                  onClick={handleViewLivePage}
                  disabled={viewingLive}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> {viewingLive ? "Opening..." : "View Page"}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>


      {/* Live preview modal — rendered via portal to escape overflow/flex context on iOS */}
      {showPreviewModal && createPortal(
        <div
          className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-black/70"
          style={{ WebkitTransform: "translateZ(0)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreviewModal(false); }}
        >
          <div className="w-full sm:w-[420px] bg-background flex flex-col rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95dvh] sm:max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <p className="font-poppins text-sm font-semibold text-foreground">Preview</p>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Unsaved changes
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Close preview"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview content */}
            <div className="overflow-y-auto flex flex-col items-center pt-7 pb-8 px-6 gap-5" style={{ WebkitOverflowScrolling: "touch" }}>
              <LivePreview key={linkProfile?.id || 'preview'} linkProfile={linkProfile} buttons={buttons} isPro={isProUser} socialIcons={socialIcons} />
              <p className="text-[11px] text-muted-foreground text-center max-w-[240px] leading-relaxed">
                Preview of your current changes. Save to make them live.
              </p>
              <div className="flex gap-3 w-full max-w-[280px]">
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-sm"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Keep Editing
                </Button>
                <Button
                  className="flex-1 h-11 text-sm bg-bronze hover:bg-bronze/90 text-white"
                  onClick={() => { handleSave(); setShowPreviewModal(false); }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>

    {/* Delete action link confirmation */}
    <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this link?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => pendingDeleteId && executeDeleteButton(pendingDeleteId)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete social link confirmation */}
    <AlertDialog open={!!pendingDeleteSocialId} onOpenChange={(o) => { if (!o) setPendingDeleteSocialId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove social link?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => pendingDeleteSocialId && executeDeleteSocialIcon(pendingDeleteSocialId)}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default KaizenLink;
