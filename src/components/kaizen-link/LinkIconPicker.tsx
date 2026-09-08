import React, { useState, useMemo } from "react";
import {
  Link2, Globe, Mail, Phone, MapPin, Calendar, QrCode, Download,
  ExternalLink, Share2, Briefcase, Building2, TrendingUp, Target,
  Award, Megaphone, Rocket, Wallet, CreditCard, DollarSign, Store,
  ShoppingBag, Gift, Coffee, Ticket, Clock, Bookmark, Star, Bell,
  UserPlus, Users, Flag, Heart, Trophy, GraduationCap, BookOpen,
  Lightbulb, Newspaper, FileText, BadgeCheck, Crown, Flame, Zap,
  Sparkles, Palette, Pen, Camera, Video, Film, Tv, Play, Radio,
  Mic, Headphones, Music, Disc3, Layers, Monitor, Smartphone,
  Gamepad2, Rss, Map, Receipt, Package, Banknote,
  Linkedin, Youtube, Github, Twitch,
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
import { iconMap } from "./iconOptions";

// ─────────────────────────────────────────────────────────────────────────────
// Icon Library — single source of truth for the picker & renderLinkIcon
// ─────────────────────────────────────────────────────────────────────────────

interface LibraryEntry {
  id: string;
  label: string;
  lucideIcon?: LucideIcon;
  siIcon?: IconType;
  tags: string[];
}

export const ICON_LIBRARY: LibraryEntry[] = [
  // ── Social & Professional Platforms ───────────────────────────────────────
  { id: "instagram",   label: "Instagram",    siIcon: SiInstagram,   tags: ["instagram","social","photo","photography","creator","reel","story","ig","content"] },
  { id: "twitter",     label: "X / Twitter",  siIcon: SiX,           tags: ["twitter","x","tweet","social","news","trending","thread","post","microblog"] },
  { id: "linkedin",    label: "LinkedIn",     lucideIcon: Linkedin,  tags: ["linkedin","professional","career","job","network","b2b","business","work","hiring","cv","resume"] },
  { id: "facebook",    label: "Facebook",     siIcon: SiFacebook,    tags: ["facebook","social","fb","community","group","page","meta","friends"] },
  { id: "youtube",     label: "YouTube",      siIcon: SiYoutube,     tags: ["youtube","video","channel","content","streaming","subscribe","yt","watch","tutorial"] },
  { id: "tiktok",      label: "TikTok",       siIcon: SiTiktok,      tags: ["tiktok","short video","viral","creator","dance","reels","trend","for you"] },
  { id: "github",      label: "GitHub",       siIcon: SiGithub,      tags: ["github","code","developer","git","repo","open source","programming","dev","engineer"] },
  { id: "twitch",      label: "Twitch",       siIcon: SiTwitch,      tags: ["twitch","stream","gaming","live","esports","gamer","broadcast"] },
  { id: "discord",     label: "Discord",      siIcon: SiDiscord,     tags: ["discord","community","server","gaming","chat","voice","guild","members"] },
  { id: "reddit",      label: "Reddit",       siIcon: SiReddit,      tags: ["reddit","community","forum","subreddit","discussion","upvote","ask"] },
  { id: "pinterest",   label: "Pinterest",    siIcon: SiPinterest,   tags: ["pinterest","pin","inspiration","design","mood board","visual","board"] },
  { id: "snapchat",    label: "Snapchat",     siIcon: SiSnapchat,    tags: ["snapchat","snap","story","ephemeral","filter","social","ar"] },
  { id: "threads",     label: "Threads",      siIcon: SiThreads,     tags: ["threads","meta","social","text","conversation","community","instagram"] },
  { id: "behance",     label: "Behance",      siIcon: SiBehance,     tags: ["behance","portfolio","design","creative","showcase","adobe","case study"] },
  { id: "dribbble",    label: "Dribbble",     siIcon: SiDribbble,    tags: ["dribbble","design","ui","ux","portfolio","creative","shot","motion"] },
  { id: "vimeo",       label: "Vimeo",        siIcon: SiVimeo,       tags: ["vimeo","video","filmmaker","creative","portfolio","film","cinematic"] },
  { id: "bluesky",     label: "Bluesky",      siIcon: SiBluesky,     tags: ["bluesky","social","decentralized","atproto","twitter alternative","bsky"] },
  { id: "mastodon",    label: "Mastodon",     siIcon: SiMastodon,    tags: ["mastodon","fediverse","social","decentralized","open source","federated"] },
  { id: "medium",      label: "Medium",       siIcon: SiMedium,      tags: ["medium","blog","writing","article","newsletter","publication","stories"] },
  { id: "substack",    label: "Substack",     siIcon: SiSubstack,    tags: ["substack","newsletter","writing","email","publication","subscribe","digest"] },
  { id: "producthunt", label: "Product Hunt", siIcon: SiProducthunt, tags: ["product hunt","launch","startup","product","ph","maker","indie","ship"] },

  // ── Messaging ─────────────────────────────────────────────────────────────
  { id: "whatsapp",    label: "WhatsApp",     siIcon: SiWhatsapp,    tags: ["whatsapp","chat","message","messaging","contact","phone","wa","dms"] },
  { id: "telegram",    label: "Telegram",     siIcon: SiTelegram,    tags: ["telegram","chat","channel","bot","messaging","community","group"] },
  { id: "signal",      label: "Signal",       siIcon: SiSignal,      tags: ["signal","secure","private","encrypted","messaging","chat","privacy"] },
  { id: "slack",       label: "Slack",        tags: ["slack","work","team","collaboration","chat","workspace","business","async"] },
  { id: "zoom",        label: "Zoom",         siIcon: SiZoom,        tags: ["zoom","video call","meeting","virtual","conference","webinar","call","online"] },
  { id: "calendly",    label: "Calendly",     siIcon: SiCalendly,    tags: ["calendly","book","meeting","schedule","appointment","calendar","session"] },

  // ── Music & Audio ─────────────────────────────────────────────────────────
  { id: "spotify",     label: "Spotify",      siIcon: SiSpotify,     tags: ["spotify","music","podcast","audio","streaming","playlist","listen","songs"] },
  { id: "apple-music", label: "Apple Music",  siIcon: SiApplemusic,  tags: ["apple music","music","streaming","apple","playlist","itunes","listen"] },
  { id: "soundcloud",  label: "SoundCloud",   siIcon: SiSoundcloud,  tags: ["soundcloud","music","audio","beats","producer","upload","stream","track"] },
  { id: "podcast",     label: "Podcast",      lucideIcon: Mic,       tags: ["podcast","audio","show","episode","listen","rss","microphone","talk","interview"] },
  { id: "headphones",  label: "Headphones",   lucideIcon: Headphones,tags: ["headphones","music","audio","listen","dj","sound","studio","ears"] },
  { id: "radio",       label: "Radio",        lucideIcon: Radio,     tags: ["radio","broadcast","stream","channel","live","fm","am","station"] },
  { id: "disc",        label: "Album / EP",   lucideIcon: Disc3,     tags: ["disc","album","ep","record","music","vinyl","release","project","drop"] },
  { id: "music",       label: "Music",        lucideIcon: Music,     tags: ["music","song","track","beats","artist","producer","melody","sound","band"] },

  // ── Video & Content ───────────────────────────────────────────────────────
  { id: "loom",        label: "Loom",         siIcon: SiLoom,        tags: ["loom","video","screen record","demo","async","tutorial","walkthrough"] },
  { id: "patreon",     label: "Patreon",      siIcon: SiPatreon,     tags: ["patreon","creator","support","membership","donate","fan","exclusive","subscription"] },
  { id: "video",       label: "Video",        lucideIcon: Video,     tags: ["video","film","record","camera","content","media","youtube","reel","clip"] },
  { id: "film",        label: "Film",         lucideIcon: Film,      tags: ["film","movie","cinema","director","production","video","reel","documentary"] },
  { id: "tv",          label: "TV / Stream",  lucideIcon: Tv,        tags: ["tv","television","stream","show","broadcast","channel","watch","live"] },
  { id: "play",        label: "Play",         lucideIcon: Play,      tags: ["play","video","media","start","content","watch","stream","button"] },
  { id: "rss",         label: "RSS Feed",     lucideIcon: Rss,       tags: ["rss","feed","blog","subscribe","content","syndication","newsletter","updates"] },
  { id: "newspaper",   label: "Blog / News",  lucideIcon: Newspaper, tags: ["newspaper","blog","article","news","post","media","publish","write","editorial"] },

  // ── Business Platforms & Payments ─────────────────────────────────────────
  { id: "paypal",      label: "PayPal",       siIcon: SiPaypal,      tags: ["paypal","payment","money","donate","tip","checkout","pay","transfer"] },
  { id: "stripe",      label: "Stripe",       siIcon: SiStripe,      tags: ["stripe","payment","checkout","billing","subscription","card","api"] },
  { id: "shopify",     label: "Shopify",      siIcon: SiShopify,     tags: ["shopify","shop","ecommerce","store","sell","product","online store"] },
  { id: "etsy",        label: "Etsy",         siIcon: SiEtsy,        tags: ["etsy","handmade","craft","shop","vintage","art","store","marketplace"] },
  { id: "gumroad",     label: "Gumroad",      siIcon: SiGumroad,     tags: ["gumroad","digital product","ebook","download","creator","sell","storefront"] },
  { id: "fiverr",      label: "Fiverr",       siIcon: SiFiverr,      tags: ["fiverr","freelance","gig","service","hire","freelancer","marketplace"] },
  { id: "upwork",      label: "Upwork",       siIcon: SiUpwork,      tags: ["upwork","freelance","hire","job","contract","remote","work","agency"] },
  { id: "kofi",        label: "Ko-fi",        siIcon: SiKofi,        tags: ["kofi","ko-fi","donate","tip","support","coffee","creator","appreciation"] },
  { id: "mpesa",       label: "M-Pesa",       lucideIcon: Banknote,  tags: ["mpesa","m-pesa","mobile money","kenya","payment","send money","safaricom","africa","lipa"] },
  { id: "amazon",      label: "Amazon",       lucideIcon: Package,   tags: ["amazon","shop","buy","ecommerce","store","product","wish list","merch"] },

  // ── Professional Utilities ─────────────────────────────────────────────────
  { id: "link",        label: "Link",         lucideIcon: Link2,     tags: ["link","url","website","connect","general","external","hyperlink"] },
  { id: "website",     label: "Website",      lucideIcon: Globe,     tags: ["website","web","url","internet","online","global","globe","domain","portfolio","home"] },
  { id: "email",       label: "Email",        lucideIcon: Mail,      tags: ["email","mail","contact","inbox","message","newsletter","reach","dm"] },
  { id: "phone",       label: "Phone",        lucideIcon: Phone,     tags: ["phone","call","contact","number","mobile","reach","tel","hotline"] },
  { id: "location",    label: "Location",     lucideIcon: MapPin,    tags: ["location","map","pin","address","place","find","directions","gps","venue","where"] },
  { id: "calendar",    label: "Calendar",     lucideIcon: Calendar,  tags: ["calendar","event","date","schedule","book","appointment","meeting","session","date"] },
  { id: "ticket",      label: "Ticket / Event", lucideIcon: Ticket,  tags: ["ticket","event","concert","seminar","summit","conference","workshop","rsvp","registration","attend","pass"] },
  { id: "qrcode",      label: "QR Code",      lucideIcon: QrCode,   tags: ["qr","qrcode","scan","code","link","payment","checkin","verify"] },
  { id: "download",    label: "Download",     lucideIcon: Download,  tags: ["download","file","get","asset","resource","free","pdf","guide","ebook","template"] },
  { id: "share",       label: "Share",        lucideIcon: Share2,    tags: ["share","distribute","spread","social","send","refer","referral"] },
  { id: "external",    label: "External Link",lucideIcon: ExternalLink, tags: ["external","link","open","redirect","visit","website","outbound"] },
  { id: "briefcase",   label: "Work / Portfolio", lucideIcon: Briefcase, tags: ["briefcase","work","job","professional","business","career","portfolio","hire","services"] },
  { id: "building",    label: "Company",      lucideIcon: Building2, tags: ["building","company","office","corporate","business","agency","organization","firm","hq","brand"] },
  { id: "trending",    label: "Analytics",    lucideIcon: TrendingUp,tags: ["trending","analytics","chart","growth","data","statistics","performance","metrics","insights","kpi"] },
  { id: "target",      label: "Goals",        lucideIcon: Target,    tags: ["target","goal","aim","focus","objective","kpi","marketing","niche","audience"] },
  { id: "award",       label: "Award",        lucideIcon: Award,     tags: ["award","badge","achievement","verified","certified","recognition","winner","credential","featured","accolade"] },
  { id: "megaphone",   label: "Promo / Announce", lucideIcon: Megaphone, tags: ["megaphone","announce","promo","marketing","campaign","promote","ad","shout","launch","cta"] },
  { id: "rocket",      label: "Launch",       lucideIcon: Rocket,    tags: ["rocket","launch","startup","new","product","go live","release","ship","build"] },
  { id: "wallet",      label: "Wallet",       lucideIcon: Wallet,    tags: ["wallet","payment","money","finance","pay","crypto","funds","balance","billing"] },
  { id: "creditcard",  label: "Payment",      lucideIcon: CreditCard,tags: ["credit card","payment","card","pay","billing","checkout","subscription","finance"] },
  { id: "dollar",      label: "Revenue",      lucideIcon: DollarSign,tags: ["dollar","money","revenue","income","earnings","finance","pay","pricing","fee","rates","salary"] },
  { id: "store",       label: "Store",        lucideIcon: Store,     tags: ["store","shop","retail","sell","ecommerce","marketplace","buy","brand"] },
  { id: "shop",        label: "Shop",         lucideIcon: ShoppingBag, tags: ["shop","shopping","buy","cart","bag","retail","merch","merchandise","apparel"] },
  { id: "gift",        label: "Gift / Merch", lucideIcon: Gift,      tags: ["gift","merch","merchandise","free","giveaway","present","swag","prize"] },
  { id: "coffee",      label: "Tip",          lucideIcon: Coffee,    tags: ["coffee","tip","ko-fi","support","buy me a coffee","donate","creator","appreciation"] },
  { id: "receipt",     label: "Invoice",      lucideIcon: Receipt,   tags: ["receipt","invoice","billing","payment proof","transaction","finance","statement"] },
  { id: "filetext",    label: "Document",     lucideIcon: FileText,  tags: ["file","document","contract","pdf","terms","agreement","paper","proposal","report"] },

  // ── Creative & Production ──────────────────────────────────────────────────
  { id: "camera",      label: "Photography",  lucideIcon: Camera,    tags: ["camera","photography","photo","shoot","portrait","lens","image","visual","content"] },
  { id: "palette",     label: "Design / Art", lucideIcon: Palette,   tags: ["palette","design","art","creative","color","illustration","graphic","artist","brand"] },
  { id: "pen",         label: "Writing",      lucideIcon: Pen,       tags: ["pen","write","writing","copywriting","content","author","script","blog","caption"] },
  { id: "layers",      label: "Layers / UI",  lucideIcon: Layers,    tags: ["layers","design","stack","ui","ux","interface","figma","prototype","wireframe"] },
  { id: "sparkles",    label: "AI / Featured",lucideIcon: Sparkles,  tags: ["sparkles","feature","highlight","premium","exclusive","special","magic","ai","new"] },
  { id: "monitor",     label: "Desktop App",  lucideIcon: Monitor,   tags: ["monitor","desktop","app","software","product","saas","tool","platform","web app"] },
  { id: "smartphone",  label: "Mobile App",   lucideIcon: Smartphone,tags: ["smartphone","mobile","app","ios","android","phone","product","download","install"] },
  { id: "gaming",      label: "Gaming",       lucideIcon: Gamepad2,  tags: ["gaming","game","esports","gamer","play","console","twitch","steam","stream"] },
  { id: "mic",         label: "Microphone",   lucideIcon: Mic,       tags: ["mic","microphone","podcast","voice","audio","recording","speak","singer","narrator"] },
  { id: "headset",     label: "Audio Studio", lucideIcon: Headphones,tags: ["headphones","audio","studio","listen","music","sound","dj","producer","mixing"] },
  { id: "film-roll",   label: "Film",         lucideIcon: Film,      tags: ["film","movie","cinema","director","production","reel","documentary","shoot"] },

  // ── Events & Community ─────────────────────────────────────────────────────
  { id: "users",       label: "Community",    lucideIcon: Users,     tags: ["users","community","team","group","people","members","audience","followers","tribe"] },
  { id: "follow",      label: "Follow",       lucideIcon: UserPlus,  tags: ["follow","subscribe","join","connect","members","community","network","add"] },
  { id: "bell",        label: "Notifications",lucideIcon: Bell,      tags: ["bell","notify","alert","subscribe","updates","news","follow","reminder"] },
  { id: "bookmark",    label: "Save",         lucideIcon: Bookmark,  tags: ["bookmark","save","favorite","collection","resource","reading list","wishlist"] },
  { id: "map",         label: "Map",          lucideIcon: Map,       tags: ["map","location","directions","place","navigation","venue","find us","address"] },
  { id: "clock",       label: "Hours",        lucideIcon: Clock,     tags: ["clock","hours","time","schedule","availability","open","office hours","response time"] },
  { id: "heart",       label: "Support / Love", lucideIcon: Heart,   tags: ["heart","love","support","like","favorite","donate","fan","appreciation"] },
  { id: "star",        label: "Favorite",     lucideIcon: Star,      tags: ["star","featured","favorite","rating","review","top","best","recommended"] },
  { id: "trophy",      label: "Achievement",  lucideIcon: Trophy,    tags: ["trophy","achievement","win","award","competition","champion","prize","milestone"] },
  { id: "flag",        label: "Flag",         lucideIcon: Flag,      tags: ["flag","country","milestone","goal","mission","mark","objective","target"] },

  // ── Learning & Education ───────────────────────────────────────────────────
  { id: "course",      label: "Course",       lucideIcon: GraduationCap, tags: ["course","learn","education","training","class","teach","tutorial","certification","bootcamp","cohort"] },
  { id: "ebook",       label: "eBook / Guide",lucideIcon: BookOpen,  tags: ["ebook","guide","book","read","download","resource","pdf","knowledge","template","playbook"] },
  { id: "lightbulb",   label: "Ideas / Tips", lucideIcon: Lightbulb, tags: ["lightbulb","idea","tip","insight","knowledge","hack","learn","strategy","advice"] },

  // ── Status & Badges ────────────────────────────────────────────────────────
  { id: "verified",    label: "Verified",     lucideIcon: BadgeCheck,tags: ["verified","badge","check","official","trusted","certified","authentic","pro","approved"] },
  { id: "crown",       label: "Premium",      lucideIcon: Crown,     tags: ["crown","premium","vip","exclusive","luxury","top","elite","pro","member"] },
  { id: "fire",        label: "Trending",     lucideIcon: Flame,     tags: ["fire","trending","hot","viral","popular","hype","streak","featured","top"] },
  { id: "zap",         label: "Flash / New",  lucideIcon: Zap,       tags: ["zap","flash","new","fast","quick","launch","instant","power","update"] },
];

// Fast O(1) lookup map for renderLinkIcon
const LIBRARY_MAP: Record<string, LibraryEntry> = {};
ICON_LIBRARY.forEach((entry) => { LIBRARY_MAP[entry.id] = entry; });

// ─────────────────────────────────────────────────────────────────────────────
// renderLinkIcon — resolves any stored icon value to a React element
// Priority: URL → LIBRARY_MAP (with SI brand icon) → iconMap fallback → Link2
// ─────────────────────────────────────────────────────────────────────────────

export function renderLinkIcon(
  icon: string | null | undefined,
  sizePx = 20,
): React.ReactElement {
  const style = { width: sizePx, height: sizePx, flexShrink: 0 } as React.CSSProperties;

  if (icon && icon.startsWith("http")) {
    return (
      <img
        src={icon}
        alt=""
        style={{ ...style, objectFit: "cover", borderRadius: 4 }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  const lib = LIBRARY_MAP[icon ?? ""];
  if (lib?.siIcon) {
    const SI = lib.siIcon;
    return <SI style={style} />;
  }
  if (lib?.lucideIcon) {
    const LI = lib.lucideIcon;
    return <LI style={style} />;
  }

  // Fallback: legacy values stored before the new library (keeps old DB rows working)
  const opt = iconMap[icon ?? ""];
  if (opt?.siIcon) {
    const SI = opt.siIcon;
    return <SI style={style} />;
  }
  if (opt?.icon) {
    const LI = opt.icon;
    return <LI style={style} />;
  }

  return <Link2 style={style} />;
}

// Kept for any external code that still imports LINK_ICONS
export const LINK_ICONS = [
  { value: "link",      Icon: Link2,    label: "Link" },
  { value: "instagram", Icon: Link2,    label: "Instagram" },
  { value: "website",   Icon: Globe,    label: "Website" },
  { value: "email",     Icon: Mail,     label: "Email" },
  { value: "youtube",   Icon: Youtube,  label: "YouTube" },
  { value: "linkedin",  Icon: Linkedin, label: "LinkedIn" },
  { value: "github",    Icon: Github,   label: "GitHub" },
  { value: "twitch",    Icon: Twitch,   label: "Twitch" },
  { value: "phone",     Icon: Phone,    label: "Phone" },
];

// ─────────────────────────────────────────────────────────────────────────────
// LinkIconPicker Component
// ─────────────────────────────────────────────────────────────────────────────

interface LinkIconPickerProps {
  onSelect: (value: string) => void;
  currentIcon?: string;
}

const LinkIconPicker = ({ onSelect, currentIcon }: LinkIconPickerProps) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ICON_LIBRARY;
    return ICON_LIBRARY.filter(
      (entry) =>
        entry.id.includes(q) ||
        entry.label.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.includes(q)),
    );
  }, [query]);

  return (
    <div className="w-[288px] p-3 space-y-2.5">
      {/* Search bar */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search icons…"
        autoFocus
        className="w-full bg-muted/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-bronze/60 focus:ring-1 focus:ring-bronze/30 transition-all"
      />

      {/* Icon grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]">
          {filtered.map((entry) => {
            const isSelected = currentIcon === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry.id)}
                title={entry.label}
                className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg transition-all group ${
                  isSelected
                    ? "bg-bronze/15 ring-1 ring-bronze/60 text-bronze"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                  {renderLinkIcon(entry.id, 18)}
                </span>
                <span className="text-[8.5px] leading-tight text-center w-full truncate px-0.5 text-muted-foreground group-hover:text-foreground">
                  {entry.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="text-2xl mb-2 opacity-30">🔍</span>
          <p className="text-xs text-muted-foreground">
            No icons match&nbsp;
            <span className="font-medium text-foreground/70">"{query}"</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default LinkIconPicker;
