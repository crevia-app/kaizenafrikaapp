import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { LINK_THEMES } from "@/lib/linkThemes";
import { SocialBadgeRow } from "@/components/kaizen-link/SocialBrandIcons";
import { renderLinkIcon } from "@/components/kaizen-link/LinkIconPicker";

interface LivePreviewProps {
  linkProfile: any;
  buttons: any[];
  isPro?: boolean;
  socialIcons?: any[];
}

const LivePreview = ({ linkProfile, buttons, isPro = false, socialIcons }: LivePreviewProps) => {
  const themeId = linkProfile?.theme || "elite_obsidian";
  const bgStyle = linkProfile?.background?.style || "solid";
  const customBgUrl = linkProfile?.background?.custom_bg_url;
  const customColor = linkProfile?.background?.custom_color as string | undefined;
  const buttonStyle = linkProfile?.background?.button_style || "rounded";
  const buttonSpacing = linkProfile?.background?.button_spacing || 12;
  const fontFamily = linkProfile?.background?.font_family || "plus-jakarta";
  const hoverEffects = linkProfile?.background?.hover_effects !== false;
  const fadeAnimation = linkProfile?.background?.fade_animation !== false;
  const showVerified = linkProfile?.show_verified_badge && isPro;
  const isCustomImage = themeId === "custom_image" && customBgUrl;
  const hasCustomColor = !!customColor && !isCustomImage;

  // Resolve theme from LINK_THEMES; fall back to obsidian
  const themeData = LINK_THEMES.find(t => t.value === themeId);

  // Derive text color from a custom hex (luminance) or gradient (always white)
  const textColorFromCustom = (bg: string): string => {
    if (!bg || bg.includes("gradient")) return "#FFFFFF";
    const hex = bg.replace(/^#/, "");
    if (hex.length !== 6) return "#FFFFFF";
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  };

  const bgValue    = hasCustomColor ? customColor! : (themeData?.previewBg || "#080808");
  // For custom image: force white text + bronze accent over the dark overlay
  const textColor  = isCustomImage ? "#FFFFFF" : hasCustomColor ? textColorFromCustom(customColor!) : (themeData?.previewText || "#FFFFFF");
  const accentColor = isCustomImage ? "#B07D3A" : (themeData?.accentColor || textColor);
  // Determine if text is light based on luminance heuristic
  const lightText = !(textColor === "#0A0A0A" || textColor === "#1A1A1A" || textColor === "#2B241E" || textColor === "#000000");

  // CSS font-family values (not Tailwind classes) — immune to Tailwind purging.
  const fontMap: Record<string, string> = {
    cormorant:      "'Cormorant Garamond', serif",
    playfair:       "'Playfair Display', serif",
    "dm-serif":     "'DM Serif Display', serif",
    "plus-jakarta": "'Plus Jakarta Sans', sans-serif",
    outfit:         "'Outfit', sans-serif",
    syne:           "'Syne', sans-serif",
    poppins:        "'Poppins', sans-serif",
    vollkorn:       "'Vollkorn', serif",
    inter:          "'Inter', sans-serif",
  };
  const fontFamilyCSS = fontMap[fontFamily] || "'Plus Jakarta Sans', sans-serif";

  // Button border radius
  const btnRadiusMap: Record<string, string> = {
    rounded: "rounded-full",
    sharp: "rounded-none",
    soft: "rounded-lg",
  };
  const btnRadius = btnRadiusMap[buttonStyle] || "rounded-full";

  // Button variant styles — use accentColor for filled buttons
  const getButtonStyle = (style?: string): React.CSSProperties => {
    switch (style) {
      case "outline":
        return { border: `1.5px solid ${accentColor}`, color: accentColor, background: "transparent" };
      case "minimal":
        return { background: `${accentColor}18`, color: accentColor };
      case "filled":
      default:
        return { background: accentColor, color: lightText ? "#0A0A0A" : "#FFFFFF" };
    }
  };
  const getButtonClasses = (style?: string) =>
    `w-full py-2.5 px-4 text-center text-xs font-medium transition-all shadow-sm ${btnRadius}`;

  const visibleButtons = buttons.filter(b => b.visible !== false);

  return (
    <div className="relative mx-auto w-[280px]">
      {/* Phone Frame */}
      <div className="relative rounded-[3rem] border-[12px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-2xl z-20" />

        {/* Screen */}
        <div className="h-[520px] flex flex-col relative">
          <div
            className="flex-1 overflow-y-auto relative scrollbar-none"
            style={{
              fontFamily: fontFamilyCSS,
              ...(isCustomImage
                ? { backgroundImage: `url(${customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: bgValue }),
            }}
          >
            {/* Custom image overlay */}
            {isCustomImage && <div className="absolute inset-0 bg-black/50 z-0" />}

            {/* Pattern overlay */}
            {bgStyle === "pattern" && !isCustomImage && (
              <div className="absolute inset-0 opacity-10 z-0" style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }} />
            )}

            {/* Blur overlay */}
            {bgStyle === "blur" && !isCustomImage && (
              <div className="absolute inset-0 backdrop-blur-sm bg-white/5 z-0" />
            )}

            <div className={cn("pt-10 pb-4 px-5 relative z-10", fadeAnimation && "animate-fade-in")}>
              {/* Profile Section */}
              <div className="text-center mb-5">
                {linkProfile?.profile_picture ? (
                  <Avatar className="w-20 h-20 mx-auto mb-3 ring-2 ring-white/20">
                    <AvatarImage src={linkProfile.profile_picture} />
                    <AvatarFallback className="bg-gradient-to-br from-bronze/30 to-bronze-dark/30 text-2xl font-bold">
                      {linkProfile?.display_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-bronze/30 to-bronze-dark/30 flex items-center justify-center ring-2 ring-white/20">
                    <span className="text-2xl font-bold" style={{ color: textColor }}>
                      {linkProfile?.display_name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1 mb-1">
                  <h2 className="font-semibold text-lg" style={{ color: textColor, textShadow: lightText ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(255,255,255,0.5)' }}>
                    {linkProfile?.display_name || "Your Name"}
                  </h2>
                  {showVerified && <VerifiedBadge size="sm" />}
                </div>

                {linkProfile?.bio && (
                  <p className="text-[10px] opacity-80 max-w-[200px] mx-auto leading-relaxed" style={{ color: textColor, textShadow: lightText ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.5)' }}>
                    {linkProfile.bio}
                  </p>
                )}
              </div>

              <SocialBadgeRow icons={socialIcons ?? []} size="sm" />

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(4, buttonSpacing * 0.6)}px` }}>
                {visibleButtons.length > 0 ? (
                  visibleButtons.map((button, index) => (
                    <div
                      key={button.id}
                      className={cn(
                        getButtonClasses(button.style),
                        hoverEffects && "hover:scale-[1.02] hover:shadow-md",
                        fadeAnimation && "animate-fade-in"
                      )}
                      style={{
                        ...getButtonStyle(button.style),
                        ...(fadeAnimation ? { animationDelay: `${index * 80}ms` } : {}),
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {button.icon && button.icon !== "link" && (
                          <span className="flex-shrink-0 opacity-90">
                            {renderLinkIcon(button.icon, 14)}
                          </span>
                        )}
                        <span className="font-medium truncate flex-1 text-center">{button.title}</span>
                        {button.icon && button.icon !== "link" && <span className="w-[14px] flex-shrink-0" />}
                      </div>
                      {button.subtitle && (
                        <div className="text-[9px] opacity-70 truncate mt-0.5 text-center">{button.subtitle}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div className={getButtonClasses("filled")} style={getButtonStyle("filled")}>Instagram</div>
                    <div className={getButtonClasses("filled")} style={getButtonStyle("filled")}>TikTok</div>
                    <div className={getButtonClasses("filled")} style={getButtonStyle("filled")}>Website</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePreview;
