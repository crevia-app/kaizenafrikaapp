import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Chrome, MoreVertical, Share, PlusSquare } from "lucide-react";

interface ManualInstallGuideProps {
  open: boolean;
  onClose: () => void;
}

const isEdge = () => /Edg\//i.test(navigator.userAgent);
const isChromeMobile = () => /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);

function getSteps() {
  if (isChromeMobile()) {
    return [
      { icon: MoreVertical, label: "Tap the 3-dot menu", sub: "Top right corner of Chrome" },
      { icon: PlusSquare,   label: 'Tap "Add to Home Screen"', sub: "Scroll down if you don't see it immediately" },
      { icon: Share,        label: 'Tap "Add"', sub: "Kaizen Afrika will appear on your home screen like a native app" },
    ];
  }
  if (isEdge()) {
    return [
      { icon: MoreVertical, label: "Click the 3-dot menu", sub: "Top right corner of Edge" },
      { icon: PlusSquare,   label: 'Click "Apps" → "Install this site as an app"', sub: "Or look for the install icon (⊕) in the address bar" },
      { icon: Share,        label: 'Click "Install"', sub: "Kaizen Afrika will open as a standalone app" },
    ];
  }
  // Default — Chrome desktop
  return [
    { icon: Chrome,      label: "Look for the install icon", sub: "Click the ⊕ icon on the right side of the address bar" },
    { icon: PlusSquare,  label: 'Click "Install Kaizen Afrika"', sub: "A prompt will appear asking you to confirm" },
    { icon: Share,       label: 'Click "Install"', sub: "Kaizen Afrika will open as a standalone app on your desktop" },
  ];
}

export function ManualInstallGuide({ open, onClose }: ManualInstallGuideProps) {
  const steps = getSteps();

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
                Add to your device
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
                  <p className="font-poppins text-sm font-semibold text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.sub}</p>
                </div>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-bronze/20 flex items-center justify-center text-[11px] font-bold text-bronze font-poppins mt-0.5">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-muted-foreground pt-2 font-poppins">
          For best results use Chrome or Edge — other browsers have limited PWA support
        </p>
      </SheetContent>
    </Sheet>
  );
}
