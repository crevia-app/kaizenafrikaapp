/**
 * Shown on a NEW DEVICE when the user's Supabase backup is v2 (password-protected).
 * Non-dismissible — the user cannot access any encrypted content until they recover
 * their private key. Calls provideRecoveryPassword() from useInitializeE2EE.
 */
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

interface RecoveryPasswordModalProps {
  open: boolean;
  error: Error | null;
  onSubmit: (password: string) => Promise<void>;
}

export function RecoveryPasswordModal({ open, error, onSubmit }: RecoveryPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(password);
      setPassword("");
    } finally {
      setIsSubmitting(false);
      // Keep focus in input if password was wrong — error will render above it
      inputRef.current?.focus();
    }
  };

  return (
    <Dialog
      open={open}
      // onOpenChange intentionally omitted — this dialog is non-dismissible.
      // The user must recover their key before accessing encrypted content.
    >
      <DialogContent
        className="sm:max-w-md"
        // Prevent closing via Escape or backdrop click
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Enter your Recovery Password</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Your encrypted messages are protected by a recovery password. Enter it to unlock
            this device. This password never leaves your device.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="recovery-password">Recovery Password</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="recovery-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your recovery password"
                autoComplete="current-password"
                autoFocus
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
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error.message}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!password || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Decrypting...
              </>
            ) : (
              "Unlock This Device"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-2">
          This is the password you set when you first activated Kaizen Afrika&apos;s encrypted messaging.
          If you&apos;ve forgotten it, contact{" "}
          <a href="mailto:support@kaizenafrika.app" className="underline underline-offset-2">
            support@kaizenafrika.app
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
