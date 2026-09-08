import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MFASetup from "@/components/auth/MFASetup";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useLanguage } from "@/i18n/LanguageContext";
import { biometricsAvailable, registerBiometric } from "@/hooks/use-biometrics";
import {
  Shield,
  KeyRound,
  Smartphone,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Lock,
  Mail,
  Loader2,
  Fingerprint,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


const SecurityTab = () => {
  const { toast } = useToast();
  const { t } = useLanguage();

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFaView, setTwoFaView] = useState<"idle" | "setup" | "disabling" | "disabling-sent">("idle");
  const [twoFaEmail, setTwoFaEmail] = useState("");
  const [twoFaDisableCode, setTwoFaDisableCode] = useState("");
  const [twoFaDisabling, setTwoFaDisabling] = useState(false);
  const [twoFaSending, setTwoFaSending] = useState(false);

  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [savingLoginAlerts, setSavingLoginAlerts] = useState(false);

  // Sign out all devices dialog
  const [showSignOutAll, setShowSignOutAll] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Biometrics state
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);
  const [bioDisabling, setBioDisabling] = useState(false);

  // Load 2FA, login alerts and biometrics status on mount
  useEffect(() => {
    biometricsAvailable().then(setBioAvailable);

    supabase.auth.getUser().then(({ data: { user } }) => {
      setTwoFactorEnabled(!!user?.user_metadata?.two_fa_enabled);
      if (user?.email) setTwoFaEmail(user.email);
      const saved = user?.user_metadata?.login_alerts_enabled;
      setLoginAlertsEnabled(saved === undefined ? true : !!saved);
      setBioEnabled(!!user?.user_metadata?.biometric_enabled);
    });
  }, []);

  const startDisable2FA = async () => {
    setTwoFaSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: twoFaEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setTwoFaView("disabling-sent");
      toast({ title: "Code sent", description: `Check ${twoFaEmail} for your verification code.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTwoFaSending(false);
    }
  };

  const confirmDisable2FA = async () => {
    if (twoFaDisableCode.length !== 6) return;
    setTwoFaDisabling(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: twoFaEmail,
        token: twoFaDisableCode,
        type: "email",
      });
      if (error) throw error;

      await supabase.auth.updateUser({ data: { two_fa_enabled: false, two_fa_method: null } });
      setTwoFactorEnabled(false);
      setTwoFaView("idle");
      setTwoFaDisableCode("");
      toast({ title: "2FA disabled", description: "Two-factor authentication has been turned off." });
    } catch (err: any) {
      toast({ title: "Invalid code", description: "The code you entered is incorrect.", variant: "destructive" });
      setTwoFaDisableCode("");
    } finally {
      setTwoFaDisabling(false);
    }
  };

  // Password strength checker
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return { label: "Weak", color: "text-destructive", bg: "bg-destructive" };
    if (score <= 3) return { label: "Fair", color: "text-yellow-500", bg: "bg-yellow-500" };
    if (score <= 4) return { label: "Strong", color: "text-emerald-500", bg: "bg-emerald-500" };
    return { label: "Very Strong", color: "text-emerald-600", bg: "bg-emerald-600" };
  };

  const passwordChecks = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "Lowercase letter", met: /[a-z]/.test(newPassword) },
    { label: "Number", met: /[0-9]/.test(newPassword) },
    { label: "Special character (!@#$...)", met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    if (!passwordChecks.every((c) => c.met)) {
      toast({ title: "Weak password", description: "Please meet all password requirements.", variant: "destructive" });
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Failed to update password", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast({ title: "Signed out everywhere", description: "All sessions have been terminated." });
      window.location.href = "/auth";
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSigningOut(false);
      setShowSignOutAll(false);
    }
  };

  const handleEnableBiometrics = async () => {
    setBioRegistering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const displayName = user.user_metadata?.display_name || user.email || user.id;
      const credentialId = await registerBiometric(user.id, displayName);
      const { error } = await supabase.auth.updateUser({
        data: { biometric_enabled: true, biometric_credential_id: credentialId },
      });
      if (error) throw error;
      setBioEnabled(true);
      toast({ title: "Biometrics enabled", description: "Your device biometric will lock the app when you return." });
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast({ title: "Cancelled", description: "Biometric registration was cancelled.", variant: "destructive" });
      } else {
        toast({ title: "Registration failed", description: err.message || "Could not register biometric.", variant: "destructive" });
      }
    } finally {
      setBioRegistering(false);
    }
  };

  const handleDisableBiometrics = async () => {
    setBioDisabling(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { biometric_enabled: false, biometric_credential_id: null },
      });
      if (error) throw error;
      setBioEnabled(false);
      toast({ title: "Biometrics disabled", description: "App lock has been turned off." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBioDisabling(false);
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <KeyRound className="w-5 h-5 text-bronze" />
          <h2 className="font-vollkorn text-xl md:text-2xl font-bold">Password</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Keep your account secure with a strong, unique password.
        </p>

        {!showChangePassword ? (
          <Button
            variant="outline"
            onClick={() => setShowChangePassword(true)}
            className="gap-2"
          >
            <Lock className="w-4 h-4" /> Change Password
          </Button>
        ) : (
          <div className="space-y-4 max-w-md">
            {/* New Password */}
            <div>
              <Label htmlFor="newPassword" className="text-sm">New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {newPassword && (
                <div className="mt-3 space-y-2">
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.bg}`}
                        style={{
                          width: `${(passwordChecks.filter((c) => c.met).length / passwordChecks.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
                  </div>

                  {/* Checklist */}
                  <ul className="space-y-1">
                    {passwordChecks.map((check) => (
                      <li key={check.label} className="flex items-center gap-2 text-xs">
                        {check.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className={check.met ? "text-foreground" : "text-muted-foreground"}>
                          {check.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordChecks.every((c) => c.met) || newPassword !== confirmPassword}
                className="bg-bronze hover:bg-bronze-dark"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowChangePassword(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Two-Factor Authentication
      <Card className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <Smartphone className="w-5 h-5 text-bronze" />
          <h2 className="font-vollkorn text-xl md:text-2xl font-bold">Two-Factor Authentication</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Add an extra layer of protection. Even if your password is compromised, your account stays safe.
        </p>

        <div className="space-y-5">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Label className="text-sm md:text-base">Authenticator App</Label>
                {twoFactorEnabled ? (
                  <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px]">Not set up</Badge>
                )}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Use Google Authenticator, Authy, or any TOTP app to generate verification codes.
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={(checked) => {
                setTwoFactorEnabled(checked);
                toast({
                  title: checked ? "2FA enabled (demo)" : "2FA disabled (demo)",
                  description: "Full authenticator setup coming soon.",
                });
              }}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </Card> */}


      {/* Two-Factor Authentication */}
      <Card className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <Smartphone className="w-5 h-5 text-bronze" />
          <h2 className="font-vollkorn text-xl md:text-2xl font-bold">Two-Factor Authentication</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          2FA adds a second step after your password. Even if someone steals your password, they still can't get into your account without a code from your email.
        </p>

        {twoFaView === "idle" && (
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Label className="text-sm md:text-base">Email Verification Code</Label>
                {twoFactorEnabled ? (
                  <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px]">Not set up</Badge>
                )}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                {twoFactorEnabled
                  ? "On every sign-in, a one-time code is sent to your email before access is granted."
                  : "After your password, you'll confirm your identity with a one-time code sent to your email. No app needed."}
              </p>
            </div>
            {twoFactorEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTwoFaView("disabling")}
                className="flex-shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                Disable
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setTwoFaView("setup")}
                className="flex-shrink-0 bg-bronze hover:bg-bronze/90 text-background"
              >
                Enable
              </Button>
            )}
          </div>
        )}

        {twoFaView === "setup" && (
          <div className="mt-2">
            <MFASetup
              onComplete={() => {
                setTwoFactorEnabled(true);
                setTwoFaView("idle");
                toast({ title: "2FA Enabled!", description: "Your account is now secured with two-factor authentication." });
              }}
              onSkip={() => setTwoFaView("idle")}
            />
          </div>
        )}

        {twoFaView === "disabling" && (
          <div className="mt-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-destructive font-medium">
              <AlertTriangle className="w-4 h-4" />
              Disable Two-Factor Authentication
            </div>
            <p className="text-xs text-muted-foreground">
              We'll send a verification code to <span className="font-medium text-foreground">{twoFaEmail}</span> to confirm this action.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={startDisable2FA}
                disabled={twoFaSending}
                className="bg-destructive hover:bg-destructive/90 text-background"
              >
                {twoFaSending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />}
                Send Code
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTwoFaView("idle")}>Cancel</Button>
            </div>
          </div>
        )}

        {twoFaView === "disabling-sent" && (
          <div className="mt-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <span className="font-medium text-foreground">{twoFaEmail}</span>
            </p>
            <div className="flex justify-start">
              <InputOTP
                maxLength={6}
                value={twoFaDisableCode}
                onChange={setTwoFaDisableCode}
                onComplete={confirmDisable2FA}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={confirmDisable2FA}
                disabled={twoFaDisabling || twoFaDisableCode.length !== 6}
                className="bg-destructive hover:bg-destructive/90 text-background"
              >
                {twoFaDisabling && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Confirm Disable
              </Button>
              <button
                onClick={startDisable2FA}
                disabled={twoFaSending}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
              >
                {twoFaSending ? "Sending..." : "Resend code"}
              </button>
              <Button size="sm" variant="ghost" onClick={() => { setTwoFaView("idle"); setTwoFaDisableCode(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Biometrics & App Lock */}
      <Card className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <Fingerprint className="w-5 h-5 text-bronze" />
          <h2 className="font-vollkorn text-xl md:text-2xl font-bold">Biometrics & App Lock</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Lock the app when you step away. Unlock instantly with your fingerprint, Face ID, or Windows Hello.
        </p>

        {!bioAvailable ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            Biometrics are not available on this device or browser.
          </div>
        ) : (
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Label className="text-sm md:text-base">Platform Biometric</Label>
                {bioEnabled ? (
                  <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px]">Not set up</Badge>
                )}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                {bioEnabled
                  ? "Kaizen Afrika will prompt for your biometric each time you open the app."
                  : "Register your fingerprint or face. Kaizen Afrika will lock itself after 5 minutes in the background."}
              </p>
            </div>
            {bioEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableBiometrics}
                disabled={bioDisabling}
                className="flex-shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                {bioDisabling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleEnableBiometrics}
                disabled={bioRegistering}
                className="flex-shrink-0 bg-bronze hover:bg-bronze/90 text-background"
              >
                {bioRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Fingerprint className="w-4 h-4 mr-1" />}
                {bioRegistering ? "Registering…" : "Enable"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Session Security */}
      <Card className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-5 h-5 text-bronze" />
          <h2 className="font-vollkorn text-xl md:text-2xl font-bold">Session & Login Security</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Monitor and control your active sessions across all devices.
        </p>

        <div className="space-y-5">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-sm md:text-base">Login Alerts</Label>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Get notified when someone signs into your account from a new device or location.
              </p>
            </div>
            <Switch
              checked={loginAlertsEnabled}
              disabled={savingLoginAlerts}
              onCheckedChange={async (checked) => {
                setSavingLoginAlerts(true);
                try {
                  const { error } = await supabase.auth.updateUser({
                    data: { login_alerts_enabled: checked },
                  });
                  if (error) throw error;
                  setLoginAlertsEnabled(checked);
                  toast({
                    title: checked ? "Login alerts enabled" : "Login alerts disabled",
                    description: checked
                      ? "You'll be notified of new sign-ins."
                      : "You won't be notified of new sign-ins.",
                  });
                } catch (err: any) {
                  toast({ title: "Failed to save", description: err.message, variant: "destructive" });
                } finally {
                  setSavingLoginAlerts(false);
                }
              }}
              className="flex-shrink-0"
            />
          </div>

          <Separator />

          <div>
            <Label className="text-sm md:text-base text-destructive">Sign Out All Devices</Label>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 mb-3">
              End all active sessions everywhere. You'll need to sign in again on every device.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowSignOutAll(true)}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out Everywhere
            </Button>
          </div>
        </div>
      </Card>

      {/* Sign out confirmation dialog */}
      <Dialog open={showSignOutAll} onOpenChange={setShowSignOutAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Sign Out All Devices?
            </DialogTitle>
            <DialogDescription>
              This will terminate all your active sessions across every device and browser. You'll be signed out immediately and will need to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowSignOutAll(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOutAllDevices}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Yes, sign out everywhere"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityTab;
