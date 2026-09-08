import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  BadgeCheck,
  Instagram,
  Youtube,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RequestStatus = "pending" | "approved" | "rejected" | null;

const Verification = () => {
  const [profile, setProfile] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [twitter, setTwitter] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const [{ data: prof }, { data: req }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        supabase
          .from("verification_requests" as any)
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setProfile(prof);
      setRequest(req);
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please explain why you should be verified");
      return;
    }
    if (!instagram.trim() && !tiktok.trim() && !youtube.trim() && !twitter.trim()) {
      toast.error("Please provide at least one social handle");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const { data: created, error } = await supabase.from("verification_requests" as any).insert({
        user_id:          session.user.id,
        instagram_handle: instagram.trim() || null,
        tiktok_handle:    tiktok.trim()    || null,
        youtube_handle:   youtube.trim()   || null,
        twitter_handle:   twitter.trim()   || null,
        follower_count:   followerCount ? parseInt(followerCount) : null,
        reason:           reason.trim(),
      }).select("id").single();
      if (error) throw error;

      // Notify admin via email (fire-and-forget)
      if ((created as any)?.id) {
        supabase.functions.invoke("verification-notify", { body: { request_id: (created as any).id } }).catch(() => {});
      }

      toast.success("Verification request submitted!", {
        description: "We'll review your request within 3–5 business days.",
      });

      // Reload request
      const { data: req } = await supabase
        .from("verification_requests" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRequest(req);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const status: RequestStatus = request?.status ?? null;

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-bronze border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border/30">
        <div className="container mx-auto px-4 sm:px-6 py-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-bronze/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-bronze" />
            </div>
            <h1 className="font-vollkorn text-3xl font-bold">Verification</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Get the verified badge on your public profile and Kaizen Link.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-2xl space-y-6">

        {/* Already verified */}
        {profile?.is_verified && (
          <Card className="p-6 bg-gradient-to-br from-bronze/5 to-bronze/10 border-bronze/20">
            <div className="flex items-center gap-3">
              <BadgeCheck className="w-10 h-10 text-bronze flex-shrink-0" />
              <div>
                <h2 className="font-vollkorn text-xl font-bold">You're Verified</h2>
                <p className="text-sm text-muted-foreground">
                  Your verified badge is active on your public profile and Kaizen Link.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Pending request */}
        {!profile?.is_verified && status === "pending" && (
          <Card className="p-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800/30">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-500 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-amber-800 dark:text-amber-300">Request Under Review</h2>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                  Submitted {new Date(request.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.
                  We'll notify you once reviewed (3–5 business days).
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Rejected request */}
        {!profile?.is_verified && status === "rejected" && (
          <Card className="p-6 border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-800/30">
            <div className="flex items-center gap-3 mb-3">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-red-800 dark:text-red-300">Request Not Approved</h2>
                {request.reviewer_notes && (
                  <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-0.5">{request.reviewer_notes}</p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You may submit a new request below with updated information.
            </p>
          </Card>
        )}

        {/* Submit form — shown when not verified and no pending request */}
        {!profile?.is_verified && status !== "pending" && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="font-vollkorn text-lg font-bold mb-1">Apply for Verification</h2>
              <p className="text-xs text-muted-foreground">
                Provide your social accounts so we can confirm your identity and reach.
              </p>
            </div>

            {/* Social handles */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Social Handles
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </Label>
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@handle"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
                    TikTok
                  </Label>
                  <Input
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="@handle"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Youtube className="h-3.5 w-3.5" /> YouTube
                  </Label>
                  <Input
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="Channel name or @handle"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Twitter className="h-3.5 w-3.5" /> X / Twitter
                  </Label>
                  <Input
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@handle"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Follower count */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Total Followers / Subscribers (approx.)
              </Label>
              <Input
                type="number"
                min={0}
                value={followerCount}
                onChange={(e) => setFollowerCount(e.target.value)}
                placeholder="e.g. 15000"
                className="h-10 rounded-xl"
              />
            </div>

            {/* Reason */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Why should you be verified? *
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us about yourself, your niche, and why verification matters to you..."
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-11 bg-bronze hover:bg-bronze/90 text-white rounded-xl"
            >
              {submitting ? "Submitting…" : "Submit Verification Request"}
            </Button>
          </Card>
        )}

        {/* Benefits */}
        {!profile?.is_verified && (
          <Card className="p-6">
            <h2 className="font-vollkorn text-lg font-bold mb-4">Benefits of Verification</h2>
            <ul className="space-y-3">
              {[
                "Bronze verified badge on your public profile and Kaizen Link",
                "Higher visibility in Kaizen Afrika Connect brand discovery",
                "Priority support from the Kaizen Afrika team",
                "Access to exclusive creator programs and brand deals",
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 text-bronze flex-shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-5">
              Review takes 3–5 business days. We require a minimum combined following of 5,000 across platforms.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Verification;
