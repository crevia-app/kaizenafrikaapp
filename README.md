# Kaizen Afrika — Developer Documentation

> Kaizen Afrika is solving the chaotic fragmentation businesses and creatives experience by building a unified, AI-powered infrastructure where both businesses and creatives can scale their business operations.

**Production URL:** [kaizenafrika.app](https://kaizenafrika.app)  
**Stack:** React 18 · Vite 5 · TypeScript 5 · Supabase · Vercel  
**Status:** Beta — deployed to production

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Local Setup & Installation](#4-local-setup--installation)
5. [Environment Variables](#5-environment-variables)
6. [Routing Architecture](#6-routing-architecture)
7. [Authentication & Security](#7-authentication--security)
8. [Core Module Breakdown](#8-core-module-breakdown)
9. [Supabase Architecture](#9-supabase-architecture)
10. [Feature Flags & Subscription Gating](#10-feature-flags--subscription-gating)
11. [Payments — Paystack](#11-payments--paystack)
12. [PWA & Performance](#12-pwa--performance)
13. [Internationalisation](#13-internationalisation)
14. [Admin Panel](#14-admin-panel)
15. [Deployment](#15-deployment)
16. [Contribution Guide](#16-contribution-guide)

---

## 1. Platform Overview

Kaizen Afrika is a unified portal serving two user types — **Independent Creatives** (photographers, designers, copywriters, developers) and **B2B Brands** — within a single multi-tenant architecture backed by Supabase Row Level Security.

### Core Modules

| Module | Route | Purpose |
|---|---|---|
| **Dira AI** | `/dira` | Conversational AI hub for deal structuring, project management, and proactive suggestions |
| **Kaizen Link** | `/kaizen-link` | Customisable link-in-bio with live preview, themed public profiles, and analytics |
| **Kaizen Invoice** | `/kaizen-invoice` | Tiered PDF invoice generation with manual eTIMS compliance fields |

### Architecture at a Glance

```
Browser (React SPA + PWA)
│
├── Vite build → Vercel (static hosting + SPA rewrites)
│
├── Supabase (Postgres + Auth + Realtime + Storage)
│   ├── RLS enforces all data isolation
│   ├── 12 Deno Edge Functions
│   └── Realtime channels → useRealtimeSync hook
│
├── OpenAI API (GPT — via Edge Functions only, never from browser)
├── Paystack (payments SDK + webhook Edge Function)
└── Resend (transactional email via Edge Functions)
```

---

## 2. Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Static typing |
| Vite | 5.4 | Build tool (SWC compiler) |
| React Router DOM | 6.30 | Client-side routing |
| TanStack Query | 5.83 | Server state, caching (5 min stale / 15 min GC) |
| Tailwind CSS | 3.4 | Utility-first styling |
| Radix UI | various | Accessible primitive components |
| Framer Motion | 12.23 | Animations |
| Recharts | 2.15 | Analytics charts |
| Zod | 3.25 | Schema validation |
| React Hook Form | 7.61 | Form state management |
| jsPDF + html2canvas | 4.2 / 1.4 | Client-side PDF generation |
| FFmpeg WASM | 0.12 | In-browser video conversion |
| next-themes | 0.3 | Light/Dark mode |
| Sonner | 1.7 | Toast notifications |
| vite-plugin-pwa | 1.1 | Progressive Web App |

### Backend

| Technology | Version | Role |
|---|---|---|
| Supabase JS | 2.84 | Postgres, Auth, Realtime, Storage |
| Supabase CLI | 2.92 | Migrations, local dev, Edge Functions |
| Deno | — | Edge Function runtime |
| OpenAI | — | GPT (Dira AI), text-embedding-3-small (semantic search) |
| Resend | — | Transactional email |
| Paystack | — | Subscription payments |
| hCaptcha | — | Bot protection on auth flows |

---

## 3. Repository Structure

```
creviamvp/
├── public/
│   ├── kaizen-logo.png
│   ├── ffmpeg/               # FFmpeg WASM served from same origin
│   └── robots.txt
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── auth/             # Auth flows, MFA, BiometricLockScreen, RecoveryModal
│   │   ├── chat/             # ChatBubble, AttachmentBubble
│   │   ├── kaizen-connect/
│   │   │   └── shared/       # KaizenChat (shared messaging component)
│   │   ├── kaizen-link/      # LivePreview, LinkSidebarDesktop, ThemeSelector,
│   │   │                     # AddButtonDialog, EditButtonDialog, SocialBrandIcons
│   │   ├── dira/             # ProjectsView, ProjectDetailSheet, DiraSettingsPanel,
│   │   │                     # CreateProjectDialog, ApproveActionDialog, DiraEmptyState
│   │   ├── navigation/       # AppLayout, MainSidebar, TopBar, MobileBottomNav,
│   │   │                     # ProfileDrawer
│   │   ├── notifications/
│   │   ├── onboarding/       # DiraMessage, step components
│   │   ├── pwa/              # AutoUpdate, IOSInstallGuide
│   │   ├── settings/         # SecurityTab
│   │   ├── studio/
│   │   │   ├── SmartInvoicesTab.tsx
│   │   │   ├── InvoicePreviewDialog.tsx
│   │   │   └── CreateInvoiceDialog.tsx
│   │   ├── subscription/     # UpgradeModal, UpgradePrompt, UsageLimitBanner
│   │   └── ui/               # shadcn/ui base components (Button, Dialog, etc.)
│   ├── data/                 # Static data / seed constants
│   ├── hooks/
│   │   ├── use-biometrics.ts
│   │   ├── use-download-pdf.ts
│   │   ├── use-e2e-encryption.ts       # E2EE operations (encrypt/decrypt)
│   │   ├── use-initialize-e2ee.ts      # App-level E2EE bootstrap
│   │   ├── use-mobile.tsx
│   │   ├── use-notifications.ts
│   │   ├── use-pwa-install.ts
│   │   ├── use-realtime-sync.ts        # Generic Supabase Realtime hook
│   │   ├── use-subscription.ts         # Plan gating — use this everywhere
│   │   ├── use-version-check.ts
│   │   ├── use-voice-chat.ts
│   │   └── ...
│   ├── i18n/
│   │   ├── LanguageContext.tsx
│   │   └── translations/     # en, es, fr, pt, ar, de, it, sw
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts     # Singleton Supabase client
│   │       └── types.ts      # Auto-generated DB types
│   ├── lib/
│   │   ├── e2e-crypto.ts     # WebCrypto primitives (RSA-OAEP + AES-GCM)
│   │   ├── indexeddb-crypto.ts  # IDB key persistence
│   │   ├── key-migration.ts  # V1 → V2 key migration
│   │   ├── linkThemes.ts     # Kaizen Link theme definitions
│   │   ├── utils.ts          # cn(), shared helpers
│   │   └── videoConverter.ts # FFmpeg WASM wrapper
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── onboarding/
│   │   ├── profile/          # PaymentsBilling, Notifications, Verification,
│   │   │                     # Settings, Help, Feedback
│   │   ├── Home.tsx          # Landing page (eagerly loaded)
│   │   ├── Dira.tsx
│   │   ├── KaizenLink.tsx
│   │   ├── KaizenStudio.tsx
│   │   ├── KaizenInvoice.tsx
│   │   ├── PublicProfile.tsx # Public Kaizen Link (/:username)
│   │   ├── Admin.tsx
│   │   └── ...
│   └── App.tsx               # Root: providers, routing, E2EE init
├── supabase/
│   ├── config.toml
│   ├── functions/            # 14 Deno Edge Functions
│   └── migrations/           # 91 SQL migration files
├── vercel.json               # SPA rewrite + security headers
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Path Alias

All source imports use `@/` which resolves to `./src/`:

```ts
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
```

---

## 4. Local Setup & Installation

### Prerequisites

- Node.js ≥ 20
- **Bun ≥ 1.0** — the sole supported package manager ([install](https://bun.sh))
- Supabase CLI (`bun add -g supabase`)
- A Supabase project (free tier works for local dev)

### Steps

```bash
# 1. Clone
git clone https://github.com/your-org/creviamvp.git
cd creviamvp

# 2. Install dependencies (use Bun — npm/yarn/pnpm will be rejected by the preinstall guard)
bun install

# 3. Configure environment (see Section 5)
cp .env.example .env.local
# Fill in the five variables

# 4. Start the dev server
bun run dev
# Runs at http://localhost:8080
```

### Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Vite dev server on port 8080 |
| `bun run build` | TypeScript check + Vite production build |
| `bun run build:dev` | Vite build in development mode |
| `bun run preview` | Preview production build locally |
| `bun run lint` | ESLint |

---

## 5. Environment Variables

Create `.env.local` in the project root. **Never commit this file.**

```bash
# Supabase — get from your Supabase project dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key

# Paystack — get from dashboard.paystack.com → Settings → API Keys
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...

# hCaptcha — get from dashboard.hcaptcha.com
VITE_HCAPTCHA_SITE_KEY=your_site_key

# App version (displayed in UI/version checks)
VITE_APP_VERSION=1.0.0
```

### Edge Function Secrets (set in Supabase Dashboard → Edge Functions → Secrets)

These are server-side only and are never exposed to the browser:

| Secret | Used by |
|---|---|
| `OPENAI_API_KEY` | `dira-gpt`, `dira-suggestions`, `ai-match-score` |
| `RESEND_API_KEY` | `feedback-notify`, `invoice-reminders`, `invoice-send`, `login-alert`, `verification-notify` |
| `PAYSTACK_SECRET_KEY` | `paystack-webhook`, `cancel-subscription` |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions (admin DB access) |
| `SUPABASE_URL` | All edge functions |

---

## 6. Routing Architecture

All routing is handled client-side by React Router v6. The Vercel config rewrites all paths to `index.html` to support SPA navigation.

### Public Routes

| Path | Component | Description |
|---|---|---|
| `/` | `Home` | Landing page (eagerly loaded, not lazy) |
| `/auth` | `Auth` | Login / Registration |
| `/auth/callback` | `AuthCallback` | OAuth / magic link callback |
| `/reset-password` | `ResetPassword` | Password reset flow |
| `/pricing` | `Pricing` | Pricing page |
| `/about` | `About` | About page |
| `/privacy-policy` | `PrivacyPolicy` | Legal |
| `/terms-of-service` | `TermsOfService` | Legal |
| `/cookie-policy` | `CookiePolicy` | Legal |
| `/:username` | `PublicProfile` | Public Kaizen Link profile |

### Protected Routes (require auth)

Wrapped in `<ProtectedRoute>` — unauthenticated users are redirected to `/auth`.

| Path | Component | Description |
|---|---|---|
| `/dira` | `Dira` | Dira AI dashboard (default post-login) |
| `/kaizen-link` | `KaizenLink` | Kaizen Link editor |
| `/kaizen-studio` | `KaizenStudio` | Studio hub (Link, Invoice) |
| `/kaizen-invoice` | `KaizenInvoice` | Invoice manager |
| `/received` | `ReceivedDocuments` | Documents received from others |
| `/profile/payments-billing` | `PaymentsBilling` | Subscription management |
| `/profile/notifications` | `Notifications` | Notification preferences |
| `/profile/verification` | `Verification` | Account verification |
| `/profile/settings` | `Settings` | Account settings |
| `/profile/help` | `Help` | Help centre |
| `/profile/feedback` | `Feedback` | In-app feedback |
| `/app/about` | `About` | About (embedded in app layout) |

> `/dashboard` permanently redirects to `/dira`.

### Admin Route

| Path | Guard | Description |
|---|---|---|
| `/admin2005` | `AdminRoute` | Internal admin panel — `is_admin` flag required on `profiles` |

### Code Splitting

All pages except `Home` are lazy-loaded via `React.lazy()`. A spinner (`PageLoader`) is shown during chunk fetch via `<Suspense>`. Rollup manual chunks group vendor code into stable, long-cached bundles:

```
vendor-react     — react, react-dom, react-router
vendor-ui        — @radix-ui/*
vendor-query     — @tanstack/react-query
vendor-supabase  — @supabase/*
vendor-charts    — recharts, d3-*
vendor-pdf       — jspdf, html2canvas
vendor-motion    — framer-motion
vendor-icons     — lucide-react
```

---

## 7. Authentication & Security

### Auth Flow

1. User submits email/password with an hCaptcha token attached.
2. Supabase Auth validates credentials and issues a JWT session.
3. On new-device login, the `login-alert` Edge Function sends an email notification via Resend.
4. If MFA is enabled, the user is redirected to `/mfa-verify` before gaining access.
5. On app mount, `useInitializeE2EE` bootstraps the user's encryption keys (see E2EE below).

### Biometric Lock Screen

After a period of inactivity, the app presents a biometric lock screen (device fingerprint/Face ID via the Web Authentication API). The session remains valid — the lock is purely a local UI gate, not a new auth round-trip.

### Row-Level Security

All 40 Supabase tables have RLS enabled. The foundational pattern:

```sql
-- Users can only read/write their own rows
CREATE POLICY "owner_access" ON table_name
  USING (auth.uid() = user_id);
```

### Content Security Policy

Enforced at the Vercel edge (see `vercel.json`). Notable directives:

- `script-src`: only `self`, `unsafe-inline`, Paystack, hCaptcha
- `connect-src`: Supabase REST + WebSocket, OpenAI, Paystack, Resend, hCaptcha
- `frame-src`: Paystack checkout, hCaptcha
- `object-src none` — no plugins
- HSTS: `max-age=63072000; includeSubDomains; preload`

---

## 8. Core Module Breakdown

### 8.1 Dira AI

**Entry:** `src/pages/Dira.tsx`  
**Components:** `src/components/dira/`

Dira is the primary conversational interface and project management hub.

**Features:**
- Chat-based deal structuring and business strategy guidance
- Project creation and milestone tracking (`dira_projects`, `dira_conversations`, `dira_messages` tables)
- Proactive AI suggestions (`dira-suggestions` Edge Function)
- Action approval flow — Dira proposes actions (`ApproveActionDialog`), user approves, `approve-action` Edge Function executes
- Per-session credit tracking with real-time Supabase subscription updates

**AI model:** OpenAI `gpt-5.4-mini` (chat completions) + `text-embedding-3-small` (semantic search / `ai-match-score`)

**Credit model — enforced server-side in `dira-gpt`:**

| Plan | Limit | Reset cadence |
|---|---|---|
| Free | 5 actions | Daily (cron via `reset-dira-tokens`) |
| Pro | 500 actions | Monthly |
| Business | Unlimited | — |

---

### 8.2 Kaizen Link

**Entry:** `src/pages/KaizenLink.tsx`  
**Public view:** `src/pages/PublicProfile.tsx` (route `/:username`)  
**Components:** `src/components/kaizen-link/`

A fully customisable link-in-bio with a live phone-frame preview that updates in real time as the user edits.

**Features:**
- Theme system: multiple named themes defined in `src/lib/linkThemes.ts`; free tier locked to 4 base themes
- Button management: add/edit/reorder custom link buttons (`link_buttons` table)
- Social icon row (`link_social_icons` table)
- Custom background: solid colour, gradient, pattern, blur overlay, or user-uploaded image
- Font selector: 9 font families; free tier locked to 2
- Layout toggle: sharp (free) vs. curved (Pro+)
- Verified badge: gated on Pro+ and `profiles.is_verified`
- Featured work gallery (`link_featured_work` table)
- Analytics: click tracking for Pro+ users

**Data tables:** `link_profiles`, `link_buttons`, `link_social_icons`, `link_featured_work`

---

### 8.3 Kaizen Invoice

**Entry:** `src/pages/KaizenInvoice.tsx` → `SmartInvoicesTab`  
**Components:** `src/components/studio/SmartInvoicesTab.tsx`, `InvoicePreviewDialog.tsx`

PDF invoice generation with tiered output quality.

**Features:**
- Line items, tax, discounts, payment terms
- Customisable accent colour, logo, payment details (Pro+)
- Manual eTIMS compliance: Control Unit number and QR data fields appended to footer
- PDF export via jsPDF + html2canvas
- Invoice reminders: `invoice-reminders` Edge Function (Resend, scheduled)
- Send invoice: `invoice-send` Edge Function delivers PDF to client email

**Watermark logic:**
- Free users: "Powered by Kaizen Afrika" appended to invoice footer
- Pro / Business: no watermark (gated on `!isProUser` in `InvoicePreviewDialog`)

**Credit limits:**

| Plan | Invoices/month |
|---|---|
| Free | 2 |
| Pro / Business | Unlimited |

**Data tables:** `invoices`, `invoice_items`

---

## 9. Supabase Architecture

### 9.1 Database Schema

Tables are grouped by domain below. All use UUID primary keys and `created_at`/`updated_at` timestamps unless noted.

#### Identity & Profiles

| Table | Description |
|---|---|
| `profiles` | Core user record — extends `auth.users`. Holds `subscription_plan`, `subscription_status`, Dira credit counters, `is_admin`, `is_verified` |
| `profiles_public` | Read-only view of non-sensitive profile fields, safe for public queries |
| `creator_profiles` | Extended data for creative users (portfolio, skills, rates) |
| `brand_profiles` | Extended data for brand users (company description, goals, logo) |
| `business_settings` | Configuration for Business-tier workspace settings |

#### Kaizen Link

| Table | Description |
|---|---|
| `link_profiles` | Link page settings — theme, bio, layout, background config |
| `link_buttons` | Individual CTA buttons with title, URL, subtitle, style, order |
| `link_social_icons` | Social platform icons with URL and display order |
| `link_featured_work` | Featured project/media cards |

#### Kaizen Invoice

| Table | Description |
|---|---|
| `invoices` | Invoice header — client info, status, totals, eTIMS fields |
| `invoice_items` | Line items belonging to an invoice |

#### Dira AI

| Table | Description |
|---|---|
| `dira_projects` | Project records created through Dira |
| `dira_conversations` | Conversation threads tied to a project |
| `dira_messages` | Individual messages within a Dira conversation |

#### Campaigns & Payments

| Table | Description |
|---|---|
| `campaigns` | Brand campaign briefs |
| `campaign_applications` | Creator applications to campaigns |
| `campaign_milestones` | Deliverable milestones per campaign |
| `campaign_payments` | Payment records per milestone |
| `deliverable_submissions` | Creator-submitted deliverables |
| `escrow_payments` | Escrow-held payment records |
| `payment_transactions` | Full Paystack transaction log |
| `creator_payout_methods` | Creator-configured payout destination |

#### Social / Discovery

| Table | Description |
|---|---|
| `brand_favorites` | Brands that have favourited a creator |
| `wishlist` | Creator-saved brand/campaign wishlist |
| `rate_cards` | Creator rate card headers |
| `rate_card_services` | Line items on a rate card |

#### System

| Table | Description |
|---|---|
| `user_encryption_keys` | RSA public keys (JWK) per user for E2EE |
| `notifications` | In-app notification records |
| `is_room_member` | Postgres function used in RLS policies |

---

### 9.2 Edge Functions

All functions are written in Deno and deployed via Supabase. Each enforces an origin allowlist (`kaizenafrika.app`, `localhost:8080`, `localhost:5173`).

| Function | Trigger | Description |
|---|---|---|
| `dira-gpt` | HTTP (authenticated) | Core Dira AI — chat completions via OpenAI GPT. Enforces per-user rate limits, logs security events to Postgres |
| `dira-suggestions` | HTTP (authenticated) | Generates proactive AI suggestions for the current user context |
| `ai-match-score` | HTTP (authenticated) | Semantic similarity scoring between creator and brand profiles using `text-embedding-3-small` embeddings |
| `approve-action` | HTTP (authenticated) | Executes a Dira-proposed action after user approval (RBAC-validated) |
| `invoices-create` | HTTP (authenticated) | Creates an invoice record with tier limit validation |
| `invoice-send` | HTTP (authenticated) | Emails an invoice PDF to the client via Resend |
| `invoice-reminders` | Scheduled (cron) | Sends overdue invoice reminder emails via Resend |
| `paystack-webhook` | HTTP (Paystack HMAC) | Processes Paystack payment events, updates `subscription_plan` and `subscription_status` on `profiles` |
| `cancel-subscription` | HTTP (authenticated) | Cancels active Paystack subscription and downgrades profile |
| `login-alert` | HTTP (authenticated) | Sends new-device login email alert via Resend |
| `verification-notify` | HTTP (authenticated) | Emails users on verification status change |
| `feedback-notify` | HTTP (authenticated) | Sends internal notification on user feedback submission |
| `reset-dira-tokens` | Scheduled (cron) | Resets `dira_daily_used` for all free-tier users (daily) |

---

### 9.3 Real-Time Subscriptions

The `useRealtimeSync` hook (`src/hooks/use-realtime-sync.ts`) is the standard pattern for any component that needs live data. It wraps Supabase's `postgres_changes` channel with:

- Initial full fetch on mount
- INSERT / UPDATE / DELETE merge strategies (customisable)
- Optimistic update helpers (`optimisticUpdate`, `optimisticInsert`, `optimisticDelete`)
- Manual `refresh()` for force-refetch
- `enabled` flag for auth-gated subscriptions

**Usage:**

```ts
const { data: messages, optimisticInsert } = useRealtimeSync<Message>({
  table: "chat_messages",
  channelId: `messages:${roomId}`,
  filter: `room_id=eq.${roomId}`,
  query: async () => { /* initial fetch */ },
  onInsert: (prev, row) => [...prev, row],   // append chronologically
});
```

**Subscription channel names must be stable** — do not include dynamic values that change on re-render.

The `useSubscription` hook additionally opens a `postgres_changes` channel on the authenticated user's `profiles` row, so plan changes propagate instantly to all feature gates without a page reload.

---

### 9.4 Migrations

91 SQL migration files live in `supabase/migrations/`. They are the canonical schema source. To apply to a local Supabase instance:

```bash
supabase start          # starts local Supabase stack
supabase db push        # applies all pending migrations
```

---

## 10. Feature Flags & Subscription Gating

### Plans

| Plan key | Alias | Audience |
|---|---|---|
| `free` | — | Default for new signups |
| `pro` | — | Individual creatives |
| `creative_pro` | Treated as `pro` | Legacy alias |
| `business` | — | Small teams / agencies |
| `brand_workspace` | Treated as `business` | Brand accounts |

A plan is only active if `subscription_status` is `"active"` or `"trialing"`. Any other status (including expired) falls back to Free limits.

### The `useSubscription` Hook

**Import:** `import { useSubscription } from "@/hooks/use-subscription";`

This is the single source of truth for all feature gating. Never check `subscription_plan` directly from the DB in components.

```ts
const {
  isFree,
  isPro,
  isBusiness,
  limits,                      // full SubscriptionLimits object
  invoicesUsedThisMonth,
  diraDailyUsed,
  showDiraCounter,
} = useSubscription();
```

### SubscriptionLimits Reference

| Field | Free | Pro | Business |
|---|---|---|---|
| `diraActionsPerDay` | 5 | ∞ | ∞ |
| `diraActionsPerMonth` | ∞ (daily cap applies) | 500 | ∞ |
| `isDailyCredit` | `true` | `false` | `false` |
| `invoicesPerMonth` | 2 | ∞ | ∞ |
| `hasInvoiceCustomization` | `false` | `true` | `true` |
| `hasInvoiceWatermark` | `true` | `false` | `false` |
| `hasPremiumThemes` | `false` | `true` | `true` |
| `freeThemesOnly` | `true` | `false` | `false` |
| `freeFontsOnly` | `true` | `false` | `false` |
| `hasColorOverride` | `false` | `true` | `true` |
| `layoutLocked` | `"sharp"` | `null` | `null` |
| `hasFullAnalytics` | `false` | `true` | `true` |
| `maxWorkspaces` | 0 | 10 | ∞ |
| `canCreateWorkspace` | `false` | `true` | `true` |
| `canJoinWorkspace` | `false` | `true` | `true` |
| `hasRBAC` | `false` | `false` | `true` |
| `hasVerifiedBadge` | `false` | `true` | `true` |
| `hasMultiSeat` | `false` | `false` | `true` |
| `baseSeats` | 1 | 1 | 3 |
| `showDiraCounter` | `true` | `false` | `false` |

### Gating Pattern in Components

```tsx
const { isFree, limits } = useSubscription();

// Hard gate — block the feature entirely
if (!limits.hasInvoiceCustomization) return <UpgradePrompt feature="invoice customization" />;

// Soft gate — show degraded version
{!isFree && <AnalyticsDashboard />}

// Usage counter
{isFree && <p>{limits.invoicesPerMonth - invoicesUsedThisMonth} invoices remaining</p>}
```

For limits enforcement on write operations, the `invoices-create` and other Edge Functions re-validate limits server-side. Client-side gates are UX only — never trust them for security.

---

## 11. Payments — Paystack

Kaizen Afrika uses [Paystack](https://paystack.com) for all subscription billing (Kenya-first, supports M-Pesa, cards, bank transfer).

### Frontend Integration

The Paystack JS SDK (`@paystack/inline-js`) is loaded via the CSP-allowlisted `js.paystack.co` script. The public key is exposed via `VITE_PAYSTACK_PUBLIC_KEY`.

Payment initialisation happens in `PaymentsBilling.tsx` — the Paystack popup is triggered client-side with the plan amount and user email.

### Backend — `paystack-webhook` Edge Function

Paystack POSTs signed events to the webhook endpoint. The function:

1. Verifies the `x-paystack-signature` HMAC-SHA512 header against `PAYSTACK_SECRET_KEY`
2. Handles `charge.success`, `subscription.create`, `subscription.disable` events
3. Updates `profiles.subscription_plan` and `profiles.subscription_status` via the service role client
4. The real-time channel on `profiles` propagates the plan change instantly to the active browser session

### Cancellation — `cancel-subscription` Edge Function

Called from the billing UI. Hits the Paystack API to disable the subscription, then updates the profile record.

---

## 12. PWA & Performance

### Service Worker (Workbox)

Configured in `vite.config.ts` via `vite-plugin-pwa`. The SW uses `skipWaiting: true` + `clientsClaim: true` so new deploys take over all open tabs the moment the new SW activates.

**Caching strategy by resource type:**

| Resource | Strategy | Cache TTL |
|---|---|---|
| HTML navigation (SPA shell) | NetworkFirst (3s timeout) | — |
| Supabase Auth endpoints | NetworkFirst (4s timeout) | 1 hour |
| Supabase REST data | StaleWhileRevalidate | 24 hours |
| FFmpeg WASM (`/ffmpeg/*`) | CacheFirst | 1 year |
| JS / CSS chunks | CacheFirst | 30 days |
| Fonts, images, icons | CacheFirst | 90 days |

Supabase Storage is explicitly excluded from SW interception — large file uploads exhaust SW memory on mobile and cause fetch failures.

### Auto-Update Flow

`AutoUpdate.tsx` listens for the `controllerchange` event (fired when the new SW calls `clientsClaim`). On detection it silently reloads the page, ensuring users always run the latest version without a manual refresh prompt.

### FFmpeg WASM

FFmpeg core files (`ffmpeg-core.js`, `ffmpeg-core.wasm`) are copied from `node_modules` to `public/ffmpeg/` at build time by a custom Vite plugin. This serves them from the same origin rather than an external CDN, ensuring CORS compliance and SW cacheability. The `@ffmpeg/ffmpeg` and `@ffmpeg/util` packages are excluded from Vite pre-bundling (they use top-level `await`).

### Bundle Splitting

Manual `manualChunks` in Rollup splits vendor code into 8 stable chunks. Content-hashed filenames mean these chunks are cached indefinitely and only invalidated when the library version changes.

---

## 13. Internationalisation

**Context provider:** `src/i18n/LanguageContext.tsx` — wraps the app in `App.tsx`.

**Supported languages (8):**

| Code | Language |
|---|---|
| `en` | English (default) |
| `es` | Spanish |
| `fr` | French |
| `pt` | Portuguese |
| `ar` | Arabic (RTL) |
| `de` | German |
| `it` | Italian |
| `sw` | Swahili |

RTL layout is handled via `isRTL` from the language context — applied to the document direction.

**Usage in components:**

```tsx
const { t } = useLanguage();
return <p>{t("dashboard.welcome")}</p>;
```

Translation files are flat key/value TypeScript objects in `src/i18n/translations/`. The `en.ts` file is the source of truth; all other files should mirror its keys.

---

## 14. Admin Panel

**Route:** `/admin2005`  
**Guard:** `AdminRoute` — checks `profiles.is_admin = true` for the authenticated user. Any user without this flag is redirected away.

The admin panel provides internal visibility into:

- User management and subscription overrides
- Feature comparison matrix across all plans
- Platform-wide analytics
- Verification request management

The route path is intentionally non-obvious. Do not publicise it.

---

## 15. Deployment

### Vercel

The project deploys as a static SPA to Vercel.

**`vercel.json` does two things:**

1. **SPA rewrite:** All paths are rewritten to `index.html` so React Router handles navigation.
2. **Security headers:** Applied globally —
   - `Content-Security-Policy` (strict allowlist — see Section 7)
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy`: camera and microphone scoped to `self`, geolocation empty
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

**Deploy:**

```bash
# Vercel CLI
vercel --prod

# Or push to main — Vercel auto-deploys on merge if connected to GitHub
```

**Build command:** `bun run build` (`tsc --noEmit && vite build`)  
**Output directory:** `dist/`

### Supabase

Migrations are applied to production via the Supabase CLI:

```bash
supabase db push --db-url "postgresql://..."
```

Edge Functions are deployed with:

```bash
supabase functions deploy <function-name>
```

---

## 16. Contribution Guide

### Branch Strategy

```
main          — production; deploys automatically to Vercel
feature/*     — new features; PR into main
fix/*         — bug fixes; PR into main
```

Do not push directly to `main`.

### Commit Conventions

Follow the Conventional Commits format:

```
type(scope): short description

feat(invoice): add eTIMS QR field to footer
fix(ui): remove beta badge from landing header
fix(auth): handle expired MFA token gracefully
chore(deps): bump supabase-js to 2.84
```

### Adding a New Feature Gate

1. Add the field to `SubscriptionLimits` in `use-subscription.ts`.
2. Set values for `PLAN_LIMITS.free`, `PRO_LIMITS`, and `BUSINESS_LIMITS`.
3. Use `const { limits } = useSubscription()` in the component.
4. If the gate applies to a write operation, enforce the limit in the relevant Edge Function as well.

### Adding a New Edge Function

```bash
supabase functions new my-function
# Write Deno TypeScript in supabase/functions/my-function/index.ts
# Follow the CORS + origin allowlist pattern from existing functions
supabase functions deploy my-function
```

### TypeScript

Strict mode is enabled. Run `tsc --noEmit` before opening a PR — the build command does this automatically. No `any` types except where the Supabase `postgres_changes` payload requires it.

### Code Style

- ESLint config: `eslint.config.js` (flat config, eslint 9)
- No default exports for hooks; named exports only
- Component files: PascalCase. Hook files: `use-kebab-case.ts`
- Tailwind classes only — no inline style unless driven by dynamic values (theme colours, user-set fonts)
- No comments unless the *why* is non-obvious from the code

---

*Kaizen Afrika — Progress, Every Day.*
