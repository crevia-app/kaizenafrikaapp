/**
 * Shown when needsMigration: true — the user's backup is on the v1 (userId-wrapped)
 * scheme, or they are a brand-new user who has never set a recovery password.
 * Dismissible, but re-appears on next login until migration is complete.
 * Calls migrateToPasswordScheme() from key-migration.ts, then clearMigrationFlag().
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { migrateToPasswordScheme, assessRecoveryPassword } from "@/lib/key-migration";
import { cn } from "@/lib/utils";

interface SetRecoveryPasswordDialogProps {
  open: boolean;
  userId: string;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void; // calls clearMigrationFlag()
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];
const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

export function SetRecoveryPasswordDialog({
  open,
  userId,
  onOpenChange,
  onComplete,
}: SetRecoveryPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = password ? assessRecoveryPassword(password) : null;
  const passwordsMatch = password && confirm && password === confirm;
  const canSubmit =
    !isSubmitting &&
    password.length >= 12 &&
    passwordsMatch &&
    (strength?.score ?? 0) >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await migrateToPasswordScheme(userId, password);
      toast.success("Recovery password set", {
        description: "Your encryption key is now protected. Keep this password safe.",
      });
      setPassword("");
      setConfirm("");
      onComplete();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Set a Recovery Password</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            This password encrypts your private key in the cloud so you can restore access
            on any device. It is never sent to Kaizen Afrika — only you know it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Password field */}
          <div className="space-y-1.5">
            <Label htmlFor="new-recovery-password">Recovery Password</Label>
            <div className="relative">
              <Input
                id="new-recovery-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 12 characters"
                autoComplete="new-password"
                disabled={isSubmitting}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {password && strength && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        i < strength.score
                          ? STRENGTH_COLORS[strength.score]
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <p className={cn(
                  "text-xs",
                  strength.score <= 1 ? "text-destructive" :
                  strength.score === 2 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-emerald-600 dark:text-emerald-400"
                )}>
                  {STRENGTH_LABELS[strength.score]} — {strength.feedback}
                </p>
              </div>
            )}
          </div>

          {/* Confirm field */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-recovery-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-recovery-password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={isSubmitting}
                className={cn(
                  "pr-10",
                  confirm && !passwordsMatch && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {confirm && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {passwordsMatch
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <AlertTriangle className="h-4 w-4 text-destructive" />}
                </span>
              )}
            </div>
            {confirm && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Remind me later
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set Password"
              )}
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Write this password down and store it safely. If lost, your encrypted message
          history cannot be recovered.
        </p>
      </DialogContent>
    </Dialog>
  );
}
