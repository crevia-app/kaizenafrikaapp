import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LINK_THEMES } from "@/lib/linkThemes";

interface ThemeSelectorProps {
  value: string;
  onChange: (themeId: string, fontKey: string) => void;
  isProUser: boolean;
  onUpgrade: () => void;
}

const ThemeSelector = ({ value, onChange, isProUser, onUpgrade }: ThemeSelectorProps) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {LINK_THEMES.map((theme) => {
        const isSelected = value === theme.value;
        const isLocked = theme.tier === "pro" && !isProUser;

        return (
          <button
            key={theme.value}
            type="button"
            onClick={() => isLocked ? onUpgrade() : onChange(theme.value, theme.fontKey)}
            className={cn(
              "group relative rounded-2xl overflow-hidden transition-all duration-200 focus:outline-none",
              isSelected
                ? "ring-2 ring-bronze ring-offset-2 ring-offset-background scale-[1.02]"
                : "hover:scale-[1.02] hover:ring-2 hover:ring-border hover:ring-offset-1 hover:ring-offset-background"
            )}
            aria-label={theme.label}
            title={theme.label}
          >
            {/* Swatch — tall enough to feel like a real preview */}
            <div
              className="w-full h-24 relative flex flex-col items-center justify-center gap-1.5 px-2"
              style={{ background: theme.previewBg }}
            >
              {/* Simulated avatar */}
              <div
                className="w-6 h-6 rounded-full opacity-80 mb-0.5"
                style={{ background: theme.accentColor, opacity: 0.75 }}
              />

              {/* Simulated button strips */}
              <div
                className="w-[72%] h-[7px] rounded-full opacity-70"
                style={{ background: theme.accentColor }}
              />
              <div
                className="w-[55%] h-[5px] rounded-full opacity-40"
                style={{ background: theme.accentColor }}
              />
              <div
                className="w-[55%] h-[5px] rounded-full opacity-40"
                style={{ background: theme.accentColor }}
              />

              {/* Selected checkmark */}
              {isSelected && !isLocked && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-bronze flex items-center justify-center shadow-lg">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}

              {/* Pro lock overlay */}
              {isLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[1px] gap-1">
                  <Lock className="w-3.5 h-3.5 text-bronze" />
                  <span className="text-[9px] font-semibold text-bronze uppercase tracking-wider">Pro</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSelector;
