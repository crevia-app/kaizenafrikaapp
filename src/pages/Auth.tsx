import { useState, useEffect, useRef, useCallback } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, BadgeCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getOrCreateDeviceId, getDeviceName } from "@/lib/device-session";

const hasOAuthCallback = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("token_hash") || window.location.hash.includes("access_token");
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectTo = searchParams.get("redirect") || "/dira";

  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(() => !!localStorage.getItem("kaizen_terms_v1"));
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [isResendingConfirm, setIsResendingConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const inPasswordResetFlow = useRef(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(hasOAuthCallback);
  const hcaptchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  // Clear credentials on mount — safety net against browser autofill injecting
  // values into controlled inputs before React's synthetic events can intercept.
  useEffect(() => {
    setEmail("");
    setPassword("");
  }, []);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("One lowercase letter");
    if (!/[0-9]/.test(pwd)) errors.push("One number");
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push("One special character");
    return errors;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (isSignup) setPasswordErrors(validatePassword(value));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(redirectTo, { replace: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session && !inPasswordResetFlow.current) {
        // Register device for session tracking (Security tab) — fire-and-forget
        supabase.rpc("register_device_session", {
          p_device_id: getOrCreateDeviceId(),
          p_device_name: getDeviceName(),
        }).then(null, () => {});

        // Ensure terms flag is set in localStorage and the database
        localStorage.setItem("kaizen_terms_v1", "1");

        const { data: { user } } = await supabase.auth.getUser();

        // Write terms_accepted_at to profiles if not already recorded
        if (user) {
          (async () => {
            try {
              const { data } = await supabase.from("profiles")
                .select("terms_accepted_at")
                .eq("id", user.id)
                .single();
              if (!data?.terms_accepted_at) {
                await supabase.from("profiles")
                  .update({ terms_accepted_at: new Date().toISOString() })
                  .eq("id", user.id);
              }
            } catch {}
          })();
        }
        if (user?.user_metadata?.two_fa_enabled) {
          sessionStorage.setItem("mfa_pending", "1");
          navigate("/mfa-verify", { replace: true });
        } else {
          sessionStorage.setItem("biometric_unlocked", "1");
          supabase.functions.invoke("login-alert").catch(() => {});
          navigate(redirectTo, { replace: true });
        }
      } else if (event !== "INITIAL_SESSION" && isProcessingOAuth) {
        setIsProcessingOAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return;
    setIsResendingConfirm(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setIsResendingConfirm(false);
    if (error) {
      toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
    } else {
      setResendCooldown(60);
      toast({ title: "Email resent", description: "A new confirmation link has been sent to your inbox." });
    }
  };

  const handleGoogleSignIn = async () => {
    // Only enforce terms for new signups — returning users logging in
    // should never be blocked by a missing localStorage flag
    if (isSignup && !termsAccepted) {
      toast({
        title: "Please agree first",
        description: "Tick the Terms of Use and Privacy Policy checkbox before continuing.",
        variant: "destructive",
      });
      return;
    }
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      if (error) {
        toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google auth error:", err);
      toast({ title: "Connection error", description: "Unable to connect to Google. Please check your internet and try again.", variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignup) {
        const errors = validatePassword(password);
        if (errors.length > 0) {
          setPasswordErrors(errors);
          setIsLoading(false);
          return;
        }
        // Require CAPTCHA token before signup when hCaptcha is configured
        if (hcaptchaSiteKey && !captchaToken) {
          hcaptchaRef.current?.execute();
          setIsLoading(false);
          return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { user_type: "creator" },
            ...(captchaToken ? { captchaToken } : {}),
          },
        });

        // Reset captcha after use
        hcaptchaRef.current?.resetCaptcha();
        setCaptchaToken(null);

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already registered") || msg.includes("already exists")) {
            toast({
              title: "Account already exists",
              description: "An account with this email already exists. Please sign in instead.",
              variant: "destructive",
            });
            setIsSignup(false);
          } else if (msg.includes("rate limit") || msg.includes("email rate")) {
            toast({ title: "Too many attempts", description: "Please wait a few minutes before trying again.", variant: "destructive" });
          } else {
            toast({ title: "Sign up failed", description: "Something went wrong on our end. Please try again in a moment.", variant: "destructive" });
            console.error("Signup error:", error.message);
          }
        } else if (signUpData.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
          // Supabase silently returns a fake success for existing emails (enumeration protection)
          toast({
            title: "Account already exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
          setIsSignup(false);
        } else if (signUpData.session) {
          // Immediate sign-in (email confirmation disabled) — show premium welcome screen
          // Write terms acceptance to the database now that we have a user ID
          if (signUpData.user?.id) {
            supabase.from("profiles")
              .update({ terms_accepted_at: new Date().toISOString() })
              .eq("id", signUpData.user.id)
              .then(null, () => {});
          }
          setShowWelcomeScreen(true);
        } else {
          // Email confirmation required — terms_accepted_at will be set on
          // first SIGNED_IN event after the user confirms their email
          setPendingEmail(email);
          setEmailConfirmPending(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password")) {
            // Distinguish "no account" from "wrong password" via a silent profile lookup.
            // Profiles are publicly readable (Kaizen Link), so this works pre-auth.
            const { data: profileCheck } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", email.trim())
              .maybeSingle();
            if (!profileCheck) {
              toast({
                title: "No account found",
                description: "We couldn't find an account with this email. Please create a new account to get started.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Incorrect password",
                description: "That password doesn't match. Please try again or reset your password below.",
                variant: "destructive",
              });
            }
          } else if (msg.includes("email not confirmed")) {
            toast({ title: "Email not confirmed", description: "Please check your inbox and click the confirmation link we sent you.", variant: "destructive" });
          } else {
            toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
          }
        } else if (data.user) {
          // Navigation handled by onAuthStateChange SIGNED_IN listener
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast({
        title: "Sign in failed",
        description: "Something went wrong. Please refresh the page and try again — this is usually caused by a cached version of the app.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResetState = () => {
    setResetStep(1);
    setResetEmail("");
    setResetOtpCode("");
    setResetNewPassword("");
    inPasswordResetFlow.current = false;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: resetEmail,
      options: { shouldCreateUser: false },
    });
    setIsResetting(false);
    if (error) {
      toast({ title: "Couldn't send code", description: error.message, variant: "destructive" });
    } else {
      setResetStep(2);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    inPasswordResetFlow.current = true;
    const { error } = await supabase.auth.verifyOtp({
      email: resetEmail,
      token: resetOtpCode,
      type: "email",
    });
    setIsVerifyingOtp(false);
    if (error) {
      inPasswordResetFlow.current = false;
      toast({ title: "Invalid code", description: "The code is wrong or expired. Try resending.", variant: "destructive" });
    } else {
      setResetStep(3);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePassword(resetNewPassword);
    if (errors.length > 0) {
      toast({ title: "Weak password", description: "Please meet all the password requirements.", variant: "destructive" });
      return;
    }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: resetNewPassword });
    setIsUpdatingPassword(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "You're now logged in." });
      setShowForgotPassword(false);
      clearResetState();
      navigate("/dira", { replace: true });
    }
  };

  // ── Shared background elements ─────────────────────────────────
  const PageBg = () => (
    <>
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #B07D3A 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-bronze/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-bronze/5 rounded-full blur-3xl pointer-events-none" />
    </>
  );

  // ── OAuth loading ──────────────────────────────────────────────
  if (isProcessingOAuth) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <PageBg />
        <div className="relative z-10 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-bronze" />
        </div>
      </div>
    );
  }

  // ── Welcome screen (immediate signup — no email confirmation) ──
  if (showWelcomeScreen) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <PageBg />
        <div className="relative z-10 w-full max-w-sm animate-fade-in">
          <div className="flex items-center justify-center gap-2.5 mb-10">
            <span className="font-vollkorn text-2xl font-bold text-foreground">Kaizen Afrika</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 text-center backdrop-blur-sm shadow-xl">
            <div className="w-20 h-20 rounded-2xl bg-bronze/15 border border-bronze/25 flex items-center justify-center mx-auto mb-6">
              <BadgeCheck className="w-10 h-10 text-bronze" />
            </div>
            <h1 className="font-vollkorn text-2xl font-bold text-foreground mb-2">Welcome to Kaizen Afrika!</h1>
            <p className="text-muted-foreground text-sm font-poppins mb-8 leading-relaxed">
              Your account has been created. You're all set to start building.
            </p>
            <button
              onClick={() => navigate(redirectTo, { replace: true })}
              className="w-full h-12 rounded-xl bg-bronze hover:bg-bronze/90 active:bg-bronze/80 text-white font-poppins font-semibold text-sm shadow-lg shadow-bronze/20 transition-all"
              style={{ touchAction: "manipulation" }}
            >
              Get Started
            </button>
          </div>

          <p className="text-center text-muted-foreground/50 text-xs font-poppins mt-8">
            © {new Date().getFullYear()} Kaizen Afrika. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // ── Email confirmation pending ─────────────────────────────────
  if (emailConfirmPending) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <PageBg />
        <div className="relative z-10 w-full max-w-sm animate-fade-in">
          <div className="flex items-center justify-center gap-2.5 mb-10">
            <span className="font-vollkorn text-2xl font-bold text-foreground">Kaizen Afrika</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 text-center backdrop-blur-sm shadow-xl">
            {/* Account created badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bronze/15 border border-bronze/30 mb-5">
              <BadgeCheck className="w-3.5 h-3.5 text-bronze" />
              <span className="text-xs font-poppins font-semibold text-bronze tracking-wide">Account Created</span>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-bronze/15 border border-bronze/25 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>

            <h1 className="font-vollkorn text-2xl font-bold text-foreground mb-2">Check your inbox</h1>
            <p className="text-muted-foreground text-sm font-poppins mb-1">We sent a confirmation link to</p>
            <p className="text-bronze font-semibold font-poppins text-sm mb-6 truncate">{pendingEmail}</p>

            <div className="space-y-3 mb-8 text-left">
              {[
                { n: "1", label: "Open the email from Kaizen Afrika" },
                { n: "2", label: "Click the confirmation link" },
                { n: "3", label: "You're in — the app opens automatically" },
              ].map(({ n, label }) => (
                <div key={n} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-bronze/20 border border-bronze/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-bronze font-poppins">
                    {n}
                  </span>
                  <span className="text-sm text-foreground/70 font-poppins">{label}</span>
                </div>
              ))}
            </div>

            <p className="text-muted-foreground/60 text-xs font-poppins mb-4">Didn't get it? Check your spam folder.</p>

            <button
              onClick={handleResendConfirmation}
              disabled={isResendingConfirm || resendCooldown > 0}
              className="text-bronze/70 hover:text-bronze text-xs font-poppins underline underline-offset-2 transition-colors disabled:opacity-40 disabled:no-underline"
            >
              {isResendingConfirm
                ? "Sending..."
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend confirmation link"}
            </button>
          </div>

          <p className="text-center text-muted-foreground/40 text-xs font-poppins mt-8">
            © {new Date().getFullYear()} Kaizen Afrika. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // ── Main auth form ─────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 md:p-6 relative overflow-hidden safe-area-pt safe-area-pb">
      <PageBg />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 hover:opacity-80 transition-opacity">
          <span className="font-vollkorn text-2xl font-bold text-foreground">Kaizen Afrika</span>
        </Link>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 backdrop-blur-sm shadow-xl">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="font-vollkorn text-2xl md:text-[28px] font-bold text-foreground mb-1.5 leading-tight">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground font-poppins">
              {isSignup
                ? "Built for those who are ready for progress, every day."
                : "Your progress continues here."}
            </p>
          </div>

          {/* Google */}
          <Button
            variant="outline"
            className="w-full h-12 mb-5 bg-secondary/50 border-border hover:bg-secondary text-foreground font-poppins font-medium transition-all rounded-xl"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 mr-2.5 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-border/50" />
            <span className="text-xs text-muted-foreground/60 font-poppins">
              {isSignup ? "or sign up with email" : "or sign in with email"}
            </span>
            <div className="flex-1 border-t border-border/50" />
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-muted-foreground text-[11px] font-poppins font-semibold uppercase tracking-widest">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="nope"
                name="contact_identifier"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/40 focus:border-bronze/50 focus-visible:ring-bronze/20 rounded-xl"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-muted-foreground text-[11px] font-poppins font-semibold uppercase tracking-widest">
                  Password
                </Label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-bronze/70 hover:text-bronze transition-colors font-poppins"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  name="user_secret"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  className="h-12 pr-12 bg-background border-border text-foreground placeholder:text-muted-foreground/40 focus:border-bronze/50 focus-visible:ring-bronze/20 rounded-xl"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password strength */}
            {isSignup && password.length > 0 && (
              <div className="space-y-1.5 rounded-xl bg-secondary/30 border border-border/50 p-3">
                {["At least 8 characters", "One uppercase letter", "One lowercase letter", "One number", "One special character"].map((rule) => (
                  <div key={rule} className="flex items-center gap-2 text-xs">
                    <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", passwordErrors.includes(rule) ? "bg-muted-foreground/30" : "bg-emerald-400")} />
                    <span className={cn("font-poppins transition-colors", passwordErrors.includes(rule) ? "text-muted-foreground/50" : "text-emerald-500")}>{rule}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Terms */}
            {isSignup && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => {
                    const accepted = checked === true;
                    setTermsAccepted(accepted);
                    if (accepted) localStorage.setItem("kaizen_terms_v1", "1");
                    else localStorage.removeItem("kaizen_terms_v1");
                  }}
                  className="mt-0.5 shrink-0 h-5 w-5 rounded-md border-2 border-gray-400 dark:border-white/60 bg-transparent dark:bg-white/10 data-[state=checked]:bg-[#F0782F] data-[state=checked]:border-[#F0782F]"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none font-poppins">
                  By signing up, you agree to the{" "}
                  <Link to="/terms-of-service" className="text-bronze/80 hover:text-bronze underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
                    Terms of Use
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy-policy" className="text-bronze/80 hover:text-bronze underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (isSignup && !termsAccepted)}
              className="w-full h-12 bg-bronze hover:bg-bronze/90 active:bg-bronze/80 text-white font-poppins font-semibold rounded-xl shadow-lg shadow-bronze/20 transition-all mt-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isSignup ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                isSignup ? "Create Account" : "Sign In"
              )}
            </Button>

            {/* hCaptcha — only rendered when VITE_HCAPTCHA_SITE_KEY is set */}
            {hcaptchaSiteKey && isSignup && (
              <HCaptcha
                ref={hcaptchaRef}
                sitekey={hcaptchaSiteKey}
                size="invisible"
                onVerify={(token) => {
                  setCaptchaToken(token);
                  // Auto-submit once token is received
                  document.querySelector<HTMLFormElement>("form")?.requestSubmit();
                }}
                onExpire={() => setCaptchaToken(null)}
              />
            )}
          </form>

          <p className="text-center mt-5 text-sm text-muted-foreground font-poppins">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsSignup((v) => !v); setTermsAccepted(false); setPassword(""); setPasswordErrors([]); }}
              className="text-bronze font-semibold hover:text-bronze/80 transition-colors"
            >
              {isSignup ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>

        <p className="text-center text-muted-foreground/40 text-xs font-poppins mt-6">
          © {new Date().getFullYear()} Kaizen Afrika. All rights reserved.
        </p>
      </div>

      {/* Forgot Password Dialog — 3-step: email → OTP → new password */}
      <Dialog open={showForgotPassword} onOpenChange={(open) => { setShowForgotPassword(open); if (!open) clearResetState(); }}>
        <DialogContent className="sm:max-w-md bg-card border-border">

          {resetStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="font-vollkorn text-2xl text-foreground">Reset your password</DialogTitle>
                <DialogDescription className="text-muted-foreground">Enter your email and we'll send a verification code.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-muted-foreground text-[11px] font-poppins font-semibold uppercase tracking-widest">Email</Label>
                  <Input id="reset-email" type="email" placeholder="you@example.com" autoComplete="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required
                    className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/40 focus:border-bronze/50 rounded-xl" />
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)}
                    className="h-12 bg-secondary/30 border-border text-foreground hover:bg-secondary">Cancel</Button>
                  <Button type="submit" disabled={isResetting} className="h-12 bg-bronze hover:bg-bronze/90 text-white font-semibold">
                    {isResetting ? "Sending..." : "Send Code"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {resetStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="font-vollkorn text-2xl text-foreground">Enter the code</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  We sent a 6-digit code to <span className="font-semibold text-foreground/70">{resetEmail}</span>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="otp-code" className="text-muted-foreground text-[11px] font-poppins font-semibold uppercase tracking-widest">Verification code</Label>
                  <Input id="otp-code" type="text" inputMode="numeric" placeholder="123456" maxLength={6} value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ""))} required autoFocus
                    className="h-12 text-center text-xl tracking-widest font-mono bg-background border-border text-foreground placeholder:text-muted-foreground/40 focus:border-bronze/50 rounded-xl" />
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setResetStep(1)}
                    className="h-12 bg-secondary/30 border-border text-foreground hover:bg-secondary">Back</Button>
                  <Button type="submit" disabled={isVerifyingOtp || resetOtpCode.length < 6} className="h-12 bg-bronze hover:bg-bronze/90 text-white font-semibold">
                    {isVerifyingOtp ? "Verifying..." : "Verify Code"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {resetStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="font-vollkorn text-2xl text-foreground">Set new password</DialogTitle>
                <DialogDescription className="text-muted-foreground">Choose a strong password for your account.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="text-muted-foreground text-[11px] font-poppins font-semibold uppercase tracking-widest">New Password</Label>
                  <div className="relative">
                    <Input id="new-pw" type={showResetPassword ? "text" : "password"} placeholder="••••••••" value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)} required autoFocus
                      className="h-12 pr-12 bg-background border-border text-foreground placeholder:text-muted-foreground/40 focus:border-bronze/50 rounded-xl" />
                    <button type="button" onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showResetPassword ? "Hide password" : "Show password"}>
                      {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {resetNewPassword.length > 0 && (
                  <div className="space-y-1.5 rounded-xl bg-secondary/30 border border-border/50 p-3">
                    {["At least 8 characters", "One uppercase letter", "One lowercase letter", "One number", "One special character"].map((rule) => {
                      const passing = !validatePassword(resetNewPassword).includes(rule);
                      return (
                        <div key={rule} className="flex items-center gap-2 text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full ${passing ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                          <span className={`font-poppins ${passing ? "text-emerald-500" : "text-muted-foreground/50"}`}>{rule}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={isUpdatingPassword} className="w-full h-12 bg-bronze hover:bg-bronze/90 text-white font-semibold">
                    {isUpdatingPassword ? "Saving..." : "Set Password"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
