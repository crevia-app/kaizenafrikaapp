import { useState, useEffect, lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useInitializeE2EE } from "@/hooks/use-initialize-e2ee";
import { RecoveryPasswordModal } from "@/components/auth/RecoveryPasswordModal";
import { SetRecoveryPasswordDialog } from "@/components/auth/SetRecoveryPasswordDialog";
import ScrollToTop from "./components/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initGlobalErrorHandlers } from "./lib/error-logger";
import { AutoUpdate } from "./components/pwa/AutoUpdate";
import { CookieConsent } from "./components/CookieConsent";
import { BiometricLockScreen } from "./components/auth/BiometricLockScreen";
import PublicPageWrapper from "./components/PublicPageWrapper";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";

// Eagerly loaded — the landing page only; everything else deferred
import Home from "./pages/Home";

// Lazy-loaded — split into separate chunks to reduce initial bundle
const AppLayout        = lazy(() => import("./components/navigation/AppLayout"));
const Auth             = lazy(() => import("./pages/Auth"));
const AuthCallback     = lazy(() => import("./pages/AuthCallback"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const MFAVerify        = lazy(() => import("./components/auth/MFAVerify"));
const ResetPassword    = lazy(() => import("./pages/ResetPassword"));
const Dira             = lazy(() => import("./pages/Dira"));
const KaizenLink       = lazy(() => import("./pages/KaizenLink"));
const KaizenStudio     = lazy(() => import("./pages/KaizenStudio"));
const KaizenInvoice    = lazy(() => import("./pages/KaizenInvoice"));
const PublicProfile    = lazy(() => import("./pages/PublicProfile"));
const ReceivedDocuments = lazy(() => import("./pages/ReceivedDocuments"));
const PaymentsBilling  = lazy(() => import("./pages/profile/PaymentsBilling"));
const Notifications    = lazy(() => import("./pages/profile/Notifications"));
const Verification     = lazy(() => import("./pages/profile/Verification"));
const Settings         = lazy(() => import("./pages/profile/Settings"));
const Help             = lazy(() => import("./pages/profile/Help"));
const Feedback         = lazy(() => import("./pages/profile/Feedback"));
const Admin            = lazy(() => import("./pages/Admin"));
const Pricing          = lazy(() => import("./pages/Pricing"));
const About            = lazy(() => import("./pages/About"));
const PrivacyPolicy    = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService   = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy     = lazy(() => import("./pages/CookiePolicy"));

const PageLoader = () => (
  <div className="min-h-dvh flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-bronze border-t-transparent animate-spin" />
  </div>
);

const MaintenancePage = () => (
  <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 text-center">
    <span className="font-vollkorn text-2xl font-bold mb-8">Kaizen Afrika</span>
    <h1 className="font-vollkorn text-3xl md:text-4xl font-bold mb-3">Down for maintenance</h1>
    <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
      We're making some improvements to Kaizen Afrika. We'll be back shortly — thank you for your patience.
    </p>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // cache fresh for 5 min — reduces redundant fetches
      gcTime:    1000 * 60 * 15,  // keep inactive cache alive for 15 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// AppContent lives inside BrowserRouter so routing hooks are available.
// useInitializeE2EE is called HERE — at the very top of this component,
// before any conditional returns — so React's rules of hooks are never violated.
function AppContent() {
  const [userId, setUserId] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const location = useLocation();

  // Biometric app lock
  const [bioLocked, setBioLocked] = useState(false);
  const [bioCredentialId, setBioCredentialId] = useState<string | null>(null);

  // MUST be called before any early returns.
  // Receives "" until the auth state resolves, then fires the full init flow.
  const {
    error: e2eeError,
    needsRecoveryPassword,
    needsMigration,
    provideRecoveryPassword,
    clearMigrationFlag,
  } = useInitializeE2EE(userId);

  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);

  // Open the migration dialog as soon as the flag is raised, but only once per session.
  useEffect(() => {
    if (needsMigration) setMigrationDialogOpen(true);
  }, [needsMigration]);

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session
    // (INITIAL_SESSION event) AND fires again on every sign-in / sign-out.
    // This is more reliable than getSession() which can return null on the
    // first tick in OAuth / server-redirect flows.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? "";
      setUserId(uid);
      try {
        if (uid) sessionStorage.setItem("kaizen_uid", uid);
        else sessionStorage.removeItem("kaizen_uid");
      } catch { /* IAB (Instagram/LinkedIn) blocks sessionStorage — silently ignore */ }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Prefetch the most-visited pages as soon as auth resolves — chunks land in
  // the SW precache so subsequent navigations are instant (no network waterfall).
  useEffect(() => {
    if (!userId) return;
    import("./pages/Dira");
    import("./pages/KaizenStudio");
  }, [userId]);

  // Background maintenance check — never blocks render
  useEffect(() => {
    supabase.from("app_settings" as any)
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.value === "true") setMaintenance(true);
      });
  }, []);

  // Biometric app lock — arm after session resolves
  useEffect(() => {
    if (!userId) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      const enabled = !!user?.user_metadata?.biometric_enabled;
      const credId = user?.user_metadata?.biometric_credential_id as string | undefined;
      if (!enabled || !credId) return;
      setBioCredentialId(credId);
      // Skip if user just logged in (fresh auth) or already verified biometrics this tab session.
      try {
        if (
          sessionStorage.getItem("biometric_unlocked") === "1" ||
          sessionStorage.getItem("biometric_verified") === "1"
        ) {
          sessionStorage.removeItem("biometric_unlocked");
          return;
        }
      } catch { /* IAB blocks sessionStorage — proceed to bio lock */ }
      setBioLocked(true);
    });
  }, [userId]);


  // Admin path always bypasses maintenance so the toggle can be turned off
  if (maintenance && !location.pathname.startsWith("/admin2005")) return <MaintenancePage />;

  return (
    <>
      {bioLocked && bioCredentialId && (
        <BiometricLockScreen
          credentialId={bioCredentialId}
          onUnlock={() => {
            try { sessionStorage.setItem("biometric_verified", "1"); } catch { /* IAB */ }
            setBioLocked(false);
          }}
        />
      )}

      <ScrollToTop />
      <CookieConsent />

      {/* Non-dismissible: shown on a new device when a v2 backup exists */}
      <RecoveryPasswordModal
        open={needsRecoveryPassword}
        error={e2eeError}
        onSubmit={provideRecoveryPassword}
      />

      {/* Recovery password nudge — disabled (dialog hidden) */}
      <SetRecoveryPasswordDialog
        open={false}
        userId={userId}
        onOpenChange={setMigrationDialogOpen}
        onComplete={clearMigrationFlag}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicPageWrapper><Home /></PublicPageWrapper>} />
          <Route path="/auth" element={<PublicPageWrapper><Auth /></PublicPageWrapper>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<PublicPageWrapper><ResetPassword /></PublicPageWrapper>} />
          <Route path="/pricing" element={<PublicPageWrapper><Pricing /></PublicPageWrapper>} />
          <Route path="/about" element={<PublicPageWrapper><About /></PublicPageWrapper>} />
          <Route path="/app/about" element={<AppLayout><About isEmbedded /></AppLayout>} />
          <Route path="/privacy-policy" element={<AppLayout><PrivacyPolicy /></AppLayout>} />
          <Route path="/terms-of-service" element={<AppLayout><TermsOfService /></AppLayout>} />
          <Route path="/cookie-policy" element={<AppLayout><CookiePolicy /></AppLayout>} />

          <Route path="/:username" element={<PublicPageWrapper><PublicProfile /></PublicPageWrapper>} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<Navigate to="/dira" replace />} />
          <Route path="/dira" element={<ProtectedRoute><AppLayout><Dira /></AppLayout></ProtectedRoute>} />
          <Route path="/kaizen-link" element={<ProtectedRoute><AppLayout><KaizenLink /></AppLayout></ProtectedRoute>} />
          <Route path="/kaizen-studio" element={<ProtectedRoute><AppLayout><KaizenStudio /></AppLayout></ProtectedRoute>} />
          <Route path="/kaizen-invoice" element={<ProtectedRoute><AppLayout><KaizenInvoice /></AppLayout></ProtectedRoute>} />
          <Route path="/mfa-verify" element={<MFAVerify />} />
          <Route path="/received" element={<ProtectedRoute><AppLayout><ReceivedDocuments /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/payments-billing" element={<ProtectedRoute><AppLayout><PaymentsBilling /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/verification" element={<ProtectedRoute><AppLayout><Verification /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/help" element={<ProtectedRoute><AppLayout><Help /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/feedback" element={<ProtectedRoute><AppLayout><Feedback /></AppLayout></ProtectedRoute>} />
          <Route path="/admin2005" element={<AdminRoute><Admin /></AdminRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!location.pathname.startsWith("/admin2005") && <AutoUpdate />}
    </>
  );
}

// Init once at module load — catches window errors and unhandled promise rejections
initGlobalErrorHandlers();

const App = () => (
  <HelmetProvider>
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} storageKey="theme">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  </HelmetProvider>
);

export default App;
