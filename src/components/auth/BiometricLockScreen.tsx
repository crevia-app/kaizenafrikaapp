import { useState } from "react";
import { Fingerprint, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticateWithBiometric } from "@/hooks/use-biometrics";
import { signOutWithCleanup } from "@/lib/device-session";

interface Props {
  credentialId: string;
  onUnlock: () => void;
}

export function BiometricLockScreen({ credentialId, onUnlock }: Props) {
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState("");

  const handleBiometric = async () => {
    setAuthenticating(true);
    setError("");
    const ok = await authenticateWithBiometric(credentialId);
    if (ok) {
      onUnlock();
    } else {
      setError("Biometric check failed. Try again or sign out.");
    }
    setAuthenticating(false);
  };

  const handleSignOut = async () => {
    await signOutWithCleanup();
    window.location.href = "/auth";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 select-none">
      <span className="font-vollkorn text-2xl font-bold text-white mb-8">Kaizen Afrika</span>
      <h1 className="font-vollkorn text-2xl font-bold text-white mb-2">Welcome back</h1>
      <p className="text-white/50 text-sm mb-10 text-center max-w-xs">
        Verify your identity to continue to Kaizen Afrika
      </p>

      <Button
        onClick={handleBiometric}
        disabled={authenticating}
        className="bg-bronze hover:bg-bronze/90 text-black font-semibold h-14 px-10 rounded-2xl gap-3 text-base"
      >
        {authenticating
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : <Fingerprint className="w-5 h-5" />}
        {authenticating ? "Verifying…" : "Use Biometrics"}
      </Button>

      {error && (
        <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
      )}

      <button
        onClick={handleSignOut}
        className="mt-10 flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out instead
      </button>
    </div>
  );
}
