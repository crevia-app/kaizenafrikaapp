import {
  Link2, Instagram, Twitter, Linkedin, Youtube, Mail, Globe, Github,
  Facebook, Music, Twitch, MapPin, Phone, Calendar, ShoppingBag,
  Camera, Headphones, Podcast, Rss, MessageCircle, Send,
  CreditCard, DollarSign, Heart, Star, Play, Video,
  FileText, BookOpen, GraduationCap, Briefcase, Store,
  Smartphone, Wifi, Coffee, Gift, Palette, Pen,
  Mic, Radio, Tv, Monitor, Gamepad2, Trophy,
  Newspaper, Hash, AtSign, QrCode, Download, ExternalLink,
  Crown, Flame, Zap, Sparkles, Music2, Disc3,
  Share2, Users, UserPlus, Bell, Bookmark, Flag,
  Clock, Map, Navigation, Ticket, BadgeCheck, Megaphone,
  Film, Layers, Target, MailOpen, HeartHandshake,
  Package, ShoppingCart, CalendarCheck, ScreenShare,
  MessageSquare, Rocket, Cloud, Wallet, PenLine, Banknote,
  Laptop, PlayCircle, CircleDot,
  type LucideIcon,
} from "lucide-react";

import type { IconType } from "react-icons";
import {
  SiInstagram, SiX, SiFacebook, SiYoutube, SiGithub, SiTwitch,
  SiTiktok, SiSnapchat, SiDiscord, SiReddit, SiPinterest,
  SiWhatsapp, SiTelegram, SiSignal, SiThreads, SiMastodon, SiBluesky,
  SiSpotify, SiApplemusic, SiSoundcloud, SiVimeo,
  SiBehance, SiDribbble, SiMedium, SiSubstack, SiPatreon, SiLoom, SiProducthunt,
  SiPaypal, SiStripe, SiGumroad, SiEtsy, SiShopify,
  SiFiverr, SiUpwork, SiZoom, SiCalendly, SiKofi,
} from "react-icons/si";

export interface IconOption {
  value: string;
  label: string;
  icon: LucideIcon;     // Lucide fallback for generic icons
  siIcon?: IconType;    // Real brand SVG from Simple Icons
  category: string;
}

export const iconOptions: IconOption[] = [
  // General
  { value: "link",     label: "Link",          icon: Link2,        category: "General" },
  { value: "website",  label: "Website",        icon: Globe,        category: "General" },
  { value: "email",    label: "Email",          icon: Mail,         category: "General" },
  { value: "phone",    label: "Phone",          icon: Phone,        category: "General" },
  { value: "location", label: "Location",       icon: MapPin,       category: "General" },
  { value: "qrcode",   label: "QR Code",        icon: QrCode,       category: "General" },
  { value: "download", label: "Download",       icon: Download,     category: "General" },
  { value: "external", label: "External Link",  icon: ExternalLink, category: "General" },
  { value: "share",    label: "Share",          icon: Share2,       category: "General" },

  // Social Media — real brand icons via Simple Icons
  { value: "instagram", label: "Instagram",  icon: Instagram, siIcon: SiInstagram, category: "Social" },
  { value: "twitter",   label: "Twitter/X",  icon: Twitter,   siIcon: SiX,         category: "Social" },
  { value: "linkedin",  label: "LinkedIn",   icon: Linkedin,                        category: "Social" },
  { value: "facebook",  label: "Facebook",   icon: Facebook,  siIcon: SiFacebook,  category: "Social" },
  { value: "youtube",   label: "YouTube",    icon: Youtube,   siIcon: SiYoutube,   category: "Social" },
  { value: "tiktok",    label: "TikTok",     icon: Music,     siIcon: SiTiktok,    category: "Social" },
  { value: "twitch",    label: "Twitch",     icon: Twitch,    siIcon: SiTwitch,    category: "Social" },
  { value: "github",    label: "GitHub",     icon: Github,    siIcon: SiGithub,    category: "Social" },
  { value: "threads",   label: "Threads",    icon: AtSign,    siIcon: SiThreads,   category: "Social" },
  { value: "discord",   label: "Discord",    icon: Gamepad2,  siIcon: SiDiscord,   category: "Social" },
  { value: "reddit",    label: "Reddit",     icon: Hash,      siIcon: SiReddit,    category: "Social" },
  { value: "pinterest", label: "Pinterest",  icon: Heart,     siIcon: SiPinterest, category: "Social" },
  { value: "snapchat",  label: "Snapchat",   icon: Camera,    siIcon: SiSnapchat,  category: "Social" },
  { value: "vimeo",     label: "Vimeo",      icon: Film,      siIcon: SiVimeo,     category: "Social" },
  { value: "bluesky",   label: "Bluesky",    icon: Cloud,     siIcon: SiBluesky,   category: "Social" },
  { value: "behance",   label: "Behance",    icon: Layers,    siIcon: SiBehance,   category: "Social" },
  { value: "dribbble",  label: "Dribbble",   icon: Target,    siIcon: SiDribbble,  category: "Social" },
  { value: "mastodon",  label: "Mastodon",   icon: CircleDot, siIcon: SiMastodon,  category: "Social" },

  // Messaging
  { value: "whatsapp",    label: "WhatsApp",  icon: MessageCircle, siIcon: SiWhatsapp, category: "Messaging" },
  { value: "telegram",    label: "Telegram",  icon: Send,          siIcon: SiTelegram, category: "Messaging" },
  { value: "signal",      label: "Signal",    icon: Wifi,          siIcon: SiSignal,   category: "Messaging" },
  { value: "slack",       label: "Slack",     icon: MessageSquare, category: "Messaging" },
  { value: "discord-msg", label: "Discord",   icon: MessageSquare, siIcon: SiDiscord,  category: "Messaging" },

  // Content & Media
  { value: "podcast",     label: "Podcast",       icon: Podcast,       category: "Content" },
  { value: "spotify",     label: "Spotify",        icon: Music2,        siIcon: SiSpotify,     category: "Content" },
  { value: "apple-music", label: "Apple Music",    icon: Disc3,         siIcon: SiApplemusic,  category: "Content" },
  { value: "soundcloud",  label: "SoundCloud",     icon: Headphones,    siIcon: SiSoundcloud,  category: "Content" },
  { value: "video",       label: "Video",          icon: Video,         category: "Content" },
  { value: "play",        label: "Play",           icon: Play,          category: "Content" },
  { value: "rss",         label: "RSS Feed",       icon: Rss,           category: "Content" },
  { value: "blog",        label: "Blog",           icon: FileText,      category: "Content" },
  { value: "newsletter",  label: "Newsletter",     icon: Newspaper,     category: "Content" },
  { value: "radio",       label: "Radio",          icon: Radio,         category: "Content" },
  { value: "tv",          label: "TV / Stream",    icon: Tv,            category: "Content" },
  { value: "mic",         label: "Microphone",     icon: Mic,           category: "Content" },
  { value: "medium",      label: "Medium",         icon: PenLine,       siIcon: SiMedium,      category: "Content" },
  { value: "substack",    label: "Substack",       icon: MailOpen,      siIcon: SiSubstack,    category: "Content" },
  { value: "patreon",     label: "Patreon",        icon: HeartHandshake,siIcon: SiPatreon,     category: "Content" },
  { value: "loom",        label: "Loom",           icon: ScreenShare,   siIcon: SiLoom,        category: "Content" },
  { value: "producthunt", label: "Product Hunt",   icon: Rocket,        siIcon: SiProducthunt, category: "Content" },

  // Business & Commerce
  { value: "shop",      label: "Shop",            icon: ShoppingBag, category: "Business" },
  { value: "store",     label: "Store",           icon: Store,       category: "Business" },
  { value: "payment",   label: "Payment",         icon: CreditCard,  category: "Business" },
  { value: "donate",    label: "Donate",          icon: DollarSign,  category: "Business" },
  { value: "tip",       label: "Tip Jar",         icon: Coffee,      category: "Business" },
  { value: "gift",      label: "Gift / Merch",    icon: Gift,        category: "Business" },
  { value: "calendar",  label: "Book / Calendar", icon: Calendar,    category: "Business" },
  { value: "ticket",    label: "Tickets / Events",icon: Ticket,      category: "Business" },
  { value: "briefcase", label: "Portfolio",       icon: Briefcase,   category: "Business" },
  { value: "megaphone", label: "Promo",           icon: Megaphone,   category: "Business" },
  { value: "paypal",    label: "PayPal",          icon: Wallet,      siIcon: SiPaypal,   category: "Business" },
  { value: "mpesa",     label: "M-Pesa",          icon: Banknote,                         category: "Business" },
  { value: "stripe",    label: "Stripe",          icon: CreditCard,  siIcon: SiStripe,   category: "Business" },
  { value: "gumroad",   label: "Gumroad",         icon: Package,     siIcon: SiGumroad,  category: "Business" },
  { value: "etsy",      label: "Etsy",            icon: ShoppingCart,siIcon: SiEtsy,     category: "Business" },
  { value: "shopify",   label: "Shopify",         icon: ShoppingCart,siIcon: SiShopify,  category: "Business" },
  { value: "amazon",    label: "Amazon",          icon: Package,                          category: "Business" },
  { value: "fiverr",    label: "Fiverr",          icon: Laptop,      siIcon: SiFiverr,   category: "Business" },
  { value: "upwork",    label: "Upwork",          icon: Briefcase,   siIcon: SiUpwork,   category: "Business" },
  { value: "zoom",      label: "Zoom",            icon: PlayCircle,  siIcon: SiZoom,     category: "Business" },
  { value: "calendly",  label: "Calendly",        icon: CalendarCheck,siIcon: SiCalendly,category: "Business" },
  { value: "kofi",      label: "Ko-fi",           icon: Coffee,      siIcon: SiKofi,     category: "Business" },

  // Creative
  { value: "palette",    label: "Art / Design",  icon: Palette,    category: "Creative" },
  { value: "pen",        label: "Writing",        icon: Pen,        category: "Creative" },
  { value: "camera",     label: "Photography",    icon: Camera,     category: "Creative" },
  { value: "monitor",    label: "Desktop / App",  icon: Monitor,    category: "Creative" },
  { value: "smartphone", label: "Mobile App",     icon: Smartphone, category: "Creative" },
  { value: "gaming",     label: "Gaming",         icon: Gamepad2,   category: "Creative" },

  // Learning
  { value: "course", label: "Course", icon: GraduationCap, category: "Learning" },
  { value: "ebook",  label: "eBook",  icon: BookOpen,      category: "Learning" },

  // Status & Badges
  { value: "verified", label: "Verified",    icon: BadgeCheck, category: "Badges" },
  { value: "crown",    label: "Premium",     icon: Crown,      category: "Badges" },
  { value: "fire",     label: "Trending",    icon: Flame,      category: "Badges" },
  { value: "zap",      label: "Flash / New", icon: Zap,        category: "Badges" },
  { value: "sparkles", label: "Featured",    icon: Sparkles,   category: "Badges" },
  { value: "star",     label: "Favorite",    icon: Star,       category: "Badges" },
  { value: "trophy",   label: "Achievement", icon: Trophy,     category: "Badges" },
  { value: "flag",     label: "Flag",        icon: Flag,       category: "Badges" },

  // Community
  { value: "community", label: "Community",   icon: Users,      category: "Community" },
  { value: "follow",    label: "Follow",       icon: UserPlus,   category: "Community" },
  { value: "notify",    label: "Subscribe",    icon: Bell,       category: "Community" },
  { value: "bookmark",  label: "Save",         icon: Bookmark,   category: "Community" },
  { value: "map",       label: "Map",          icon: Map,        category: "Community" },
  { value: "navigate",  label: "Directions",   icon: Navigation, category: "Community" },
  { value: "clock",     label: "Hours / Time", icon: Clock,      category: "Community" },

  // Legacy aliases — values stored by the old mini-picker, kept for backward compat
  { value: "globe", label: "Website", icon: Globe,        category: "General" },
  { value: "mail",  label: "Email",   icon: Mail,         category: "General" },
  { value: "music", label: "Music",   icon: Music,        category: "Content" },
];

// Lookup map keyed by value — used by renderLinkIcon
export const iconMap: Record<string, IconOption> = {};
iconOptions.forEach((opt) => { iconMap[opt.value] = opt; });

// Unique categories in definition order
export const iconCategories = [...new Set(iconOptions.map((o) => o.category))];
