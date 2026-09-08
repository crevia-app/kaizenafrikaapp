import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Share, PlusSquare, MoreHorizontal } from "lucide-react";

interface IOSInstallGuideProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Share,
    label: "Tap the Share button",
    sub: "Bottom centre of Safari (the box with an arrow pointing up)",
  },
  {
    icon: PlusSquare,
    label: 'Tap "Add to Home Screen"',
    sub: "Scroll down in the share sheet until you see this option",
  },
  {
    icon: MoreHorizontal,
    label: 'Tap "Add"',
    sub: "Kaizen Afrika will appear on your home screen like a native app",
  },
];

export function IOSInstallGuide({ open, onClose }: IOSInstallGuideProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="bg-background border-border rounded-t-2xl pb-[env(safe-area-inset-bottom,20px)]"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div>
              <SheetTitle className="font-vollkorn text-lg text-foreground text-left">
                Install Kaizen Afrika
              </SheetTitle>
              <p className="text-xs text-muted-foreground font-poppins">
                Add to your iOS Home Screen
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-3 pb-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-4 p-3 rounded-xl bg-muted/40 border border-border/50"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-bronze/15 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-bronze" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="font-poppins text-sm font-semibold text-foreground">
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {step.sub}
                  </p>
                </div>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-bronze/20 flex items-center justify-center text-[11px] font-bold text-bronze font-poppins mt-0.5">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-muted-foreground pt-2 font-poppins">
          Make sure you're using Safari — other browsers can't install PWAs on iOS
        </p>
      </SheetContent>
    </Sheet>
  );
}
