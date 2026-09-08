import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [status, setStatus] = useState<"loading" | "auth" | "mfa" | "unauth">("loading");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("unauth"); return; }
      if (sessionStorage.getItem("mfa_pending") === "1") { setStatus("mfa"); return; }

      // If localStorage flag is missing, check the database.
      // This is the source of truth — device-independent.
      if (!localStorage.getItem("kaizen_terms_v1")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("terms_accepted_at")
          .eq("id", session.user.id)
          .single();

        // Cache in localStorage regardless — DB has it or we set it now
        localStorage.setItem("kaizen_terms_v1", "1");

        if (!profile?.terms_accepted_at) {
          // Existing user whose record pre-dates this column — backfill silently
          await supabase.from("profiles")
            .update({ terms_accepted_at: new Date().toISOString() })
            .eq("id", session.user.id);
        }
      }

      setStatus("auth");
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (sessionStorage.getItem("mfa_pending") === "1") {
          setStatus("mfa");
        } else {
          setStatus("auth");
        }
      } else if (event === "SIGNED_OUT") {
        setStatus("unauth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <div className="text-white/60 font-poppins">Loading...</div>
      </div>
    );
  }

  if (status === "unauth") return <Navigate to="/auth" replace />;
  if (status === "mfa")   return <Navigate to="/mfa-verify" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
