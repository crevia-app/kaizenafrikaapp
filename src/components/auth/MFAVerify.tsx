import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const MFAVerify = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const sendOTP = useCallback(async (userEmail: string, isResend = false) => {
    setIsSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      if (isResend) setResendCooldown(60);
    } catch (err: any) {
      toast({
        title: "Failed to send code",
        description: err.message || "Please sign out and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [toast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) {
        navigate("/auth", { replace: true });
        return;
      }
      setEmail(user.email);
      sendOTP(user.email);
    });
  }, [navigate, sendOTP]);

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;

      sessionStorage.removeItem("mfa_pending");
      sessionStorage.setItem("biometric_unlocked", "1");
      supabase.functions.invoke("login-alert").catch(() => {});
      toast({ title: "Verified!", description: "Welcome back to Kaizen Afrika." });
      navigate("/kira", { replace: true });
    } catch (err: any) {
      toast({
        title: "Invalid code",
        description: "The code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-bronze/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-bronze/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-bronze" />
          </div>
          <h1 className="font-vollkorn text-2xl font-bold mb-2">Check your email</h1>
          {isSending ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending code...
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={verifyCode}
              disabled={isSending}
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

          <Button
            onClick={verifyCode}
            disabled={isLoading || isSending || code.length !== 6}
            className="w-full bg-bronze hover:bg-bronze/90 text-background h-12"
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Shield className="w-4 h-4 mr-2" />}
            Verify & Continue
          </Button>

          <button
            onClick={() => sendOTP(email, true)}
            disabled={isSending || !email || resendCooldown > 0}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1 disabled:opacity-40"
          >
            {isSending
              ? "Sending..."
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Didn't get it? Resend code"}
          </button>

          <Button
            variant="ghost"
            onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}
            className="w-full text-muted-foreground"
          >
            Sign out and try again
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MFAVerify;
