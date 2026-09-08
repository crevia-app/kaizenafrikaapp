import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSetTheme = (value: string) => {
    setTheme(value);
  };

  if (!mounted) {
    return null;
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Theme Preference</Label>
        <p className="text-sm text-muted-foreground mt-1">Choose how Kaizen Afrika looks to you</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {themes.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={theme === value ? "default" : "outline"}
            className={`h-24 flex-col gap-3 transition-all ${
              theme === value 
                ? "bg-bronze hover:bg-bronze-dark text-white border-bronze" 
                : "hover:border-bronze hover:bg-bronze/5"
            }`}
            onClick={() => handleSetTheme(value)}
          >
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{label}</span>
          </Button>
        ))}
      </div>
      <div className="pt-2">
        <p className="text-sm text-muted-foreground">
          Current theme: <span className="font-medium text-foreground capitalize">{theme}</span>
        </p>
      </div>
    </div>
  );
}
