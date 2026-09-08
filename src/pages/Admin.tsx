import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell, Legend,
} from "recharts";
import {
  LayoutDashboard, Users, CreditCard, FileText, MessageSquare,
  Settings, Shield, CheckCircle, XCircle, Search, Menu,
  LogOut, Loader2, X, Receipt, ChevronRight,
  TrendingUp, TrendingDown, Minus, ArrowUpRight, Palette,
  RotateCcw, Trash2, Copy, Mail, Database, Key, Bug, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KES = (n: number) =>
  n >= 1_000_000
    ? `KES ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `KES ${(n / 1_000).toFixed(1)}K`
    : `KES ${Math.round(n).toLocaleString()}`;

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

type Section = "overview" | "users" | "billing" | "documents" | "customization" | "support" | "settings" | "security" | "errors";

const planChip = (plan: string | null) => cn(
  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
  plan === "pro" || plan === "creative_pro" ? "bg-emerald-500/20 text-emerald-400"
  : plan === "business" || plan === "brand_workspace" ? "bg-amber-500/20 text-amber-400"
  : "bg-white/[0.07] text-white/30"
);

const statusChip = (s: string) => cn(
  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
  s === "paid" || s === "signed" || s === "completed" || s === "success"
    ? "bg-emerald-500/20 text-emerald-400"
  : s === "overdue" || s === "cancelled" || s === "failed"
    ? "bg-red-500/20 text-red-400"
  : s === "sent"
    ? "bg-blue-500/20 text-blue-400"
  : "bg-amber-500/20 text-amber-400"
);

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Av = ({ url, name, size = "9" }: { url?: string | null; name?: string | null; size?: string }) => (
  <div className={`w-${size} h-${size} rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60 flex-shrink-0 overflow-hidden ring-1 ring-white/5`}>
    {url
      ? <img src={url} alt="" className="w-full h-full object-cover" />
      : <span className="font-semibold">{(name?.[0] || "?").toUpperCase()}</span>}
  </div>
);

const Spin = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-5 h-5 text-bronze animate-spin" />
  </div>
);

const Trend = ({ pct }: { pct: number | null }) => {
  if (pct === null) return <span className="text-[10px] text-white/20 font-medium">—</span>;
  if (pct === 0)    return (
    <span className="flex items-center gap-0.5 text-[10px] text-white/30 font-semibold">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
  const up = pct > 0;
  return (
    <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold",
      up ? "text-emerald-400" : "text-red-400")}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
};

// Custom tooltip shared across charts
const ChartTooltip = ({ active, payload, label, prefix = "" }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{prefix}{payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, trend, icon: Icon, accent, onClick,
}: {
  label: string; value: string; sub?: string; trend?: number | null;
  icon: React.ElementType; accent: string; onClick?: () => void;
}) => (
  <div onClick={onClick} className={cn("group relative bg-[#111111] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] hover:bg-[#161616] transition-all duration-200 overflow-hidden", onClick && "cursor-pointer")}>
    {/* Subtle accent glow top-right */}
    <div className={cn("absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20", accent)} />
    <div className="relative flex items-start justify-between mb-3">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", accent, "bg-opacity-15")}>
        <Icon className="w-4 h-4 text-white/70" />
      </div>
      {trend !== undefined && <Trend pct={trend ?? null} />}
    </div>
    <p className="text-2xl md:text-3xl font-bold text-white tabular-nums tracking-tight leading-none mb-1">{value}</p>
    <p className="text-xs text-white/40 font-medium">{label}</p>
    {sub && <p className="text-[11px] text-white/20 mt-1 truncate">{sub}</p>}
  </div>
);

// ─── Overview ─────────────────────────────────────────────────────────────────
const OverviewSection = ({ onNavigate }: { onNavigate: (s: Section) => void }) => {
  const [data, setData] = useState<{
    total: number; free: number; pro: number; business: number;
    invoices: number;
    mrr: number; arr: number;
    userTrend: number | null; mrrTrend: number | null;
    mrrChart: { month: string; mrr: number }[];
    userChart: { month: string; users: number }[];
    planChart: { plan: string; count: number; pct: number }[];
    recent: any[];
  } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: profiles }, { count: inv }] = await Promise.all([
      supabase.from("profiles")
        .select("id, display_name, handle, subscription_plan, subscription_expires_at, created_at, avatar_url")
        .order("created_at", { ascending: false }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
    ]);

    const p = profiles ?? [];
    const pro = p.filter(u => u.subscription_plan === "pro" || u.subscription_plan === "creative_pro").length;
    const bus = p.filter(u => u.subscription_plan === "business" || u.subscription_plan === "brand_workspace").length;
    const free = p.length - pro - bus;
    const mrr = pro * 1499 + bus * 7900;
    const arr = mrr * 12;

    // Trends — compare vs last month
    const now = new Date();
    const thisMonthStart = startOfMonth(now).toISOString();
    const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
    const lastMonthEnd   = endOfMonth(subMonths(now, 1)).toISOString();

    const thisMonthUsers = p.filter(u => u.created_at && u.created_at >= thisMonthStart).length;
    const lastMonthUsers = p.filter(u => u.created_at && u.created_at >= lastMonthStart && u.created_at <= lastMonthEnd).length;
    const userTrend = lastMonthUsers > 0 ? Math.round(((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100) : null;

    // Was a user on a paid plan during a given period?
    // Uses subscription_expires_at to catch churn: if it expired before the period, exclude them.
    // Note: without a subscription_started_at field we can't detect mid-month upgrades,
    // so users who upgraded this month may still appear in last month's count.
    const wasActiveInPeriod = (u: any, plan: string, periodStart: string, periodEnd: string) =>
      u.subscription_plan === plan &&
      u.created_at &&
      u.created_at <= periodEnd &&
      (!u.subscription_expires_at || u.subscription_expires_at >= periodStart);

    const prevPro = p.filter(u => wasActiveInPeriod(u, "pro", lastMonthStart, lastMonthEnd) || wasActiveInPeriod(u, "creative_pro", lastMonthStart, lastMonthEnd)).length;
    const prevBus = p.filter(u => wasActiveInPeriod(u, "business", lastMonthStart, lastMonthEnd) || wasActiveInPeriod(u, "brand_workspace", lastMonthStart, lastMonthEnd)).length;
    const prevMrr = prevPro * 1499 + prevBus * 7900;
    const mrrTrend = prevMrr > 0 ? Math.round(((mrr - prevMrr) / prevMrr) * 100) : null;

    // MRR chart — active paid users per month (accounts for churn via subscription_expires_at)
    const mrrChart = Array.from({ length: 6 }, (_, i) => {
      const d     = subMonths(now, 5 - i);
      const start = startOfMonth(d).toISOString();
      const end   = endOfMonth(d).toISOString();
      const mPro  = p.filter(u => wasActiveInPeriod(u, "pro", start, end) || wasActiveInPeriod(u, "creative_pro", start, end)).length;
      const mBus  = p.filter(u => wasActiveInPeriod(u, "business", start, end) || wasActiveInPeriod(u, "brand_workspace", start, end)).length;
      return { month: format(d, "MMM"), mrr: mPro * 1499 + mBus * 7900 };
    });

    // User growth chart — new signups per month
    const userChart = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const s = startOfMonth(d).toISOString();
      const e = endOfMonth(d).toISOString();
      return { month: format(d, "MMM"), users: p.filter(u => u.created_at && u.created_at >= s && u.created_at <= e).length };
    });

    // Plan breakdown
    const planChart = [
      { plan: "Free",       count: free, pct: p.length ? Math.round((free / p.length) * 100) : 0 },
      { plan: "Pro",        count: pro,  pct: p.length ? Math.round((pro  / p.length) * 100) : 0 },
      { plan: "Business",   count: bus,  pct: p.length ? Math.round((bus  / p.length) * 100) : 0 },
    ];

    setData({ total: p.length, free, pro, business: bus, invoices: inv ?? 0, mrr, arr, userTrend, mrrTrend, mrrChart, userChart, planChart, recent: p.slice(0, 6) });
  };

  if (!data) return <Spin />;

  const { total, pro, business, free, invoices, mrr, arr, userTrend, mrrTrend, mrrChart, userChart, planChart, recent } = data;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">

      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Users" value={fmt(total)} sub={`${free} free · ${pro} pro · ${business} biz`}
          trend={userTrend} icon={Users} accent="bg-blue-500" onClick={() => onNavigate("users")}
        />
        <StatCard
          label="MRR" value={KES(mrr)} sub="Monthly recurring revenue"
          trend={mrrTrend} icon={CreditCard} accent="bg-bronze" onClick={() => onNavigate("billing")}
        />
        <StatCard
          label="ARR" value={KES(arr)} sub="Projected annual revenue"
          icon={TrendingUp} accent="bg-emerald-500" onClick={() => onNavigate("billing")}
        />
        <StatCard
          label="Invoices" value={fmt(invoices)} sub={`${invoices} total invoices`}
          icon={FileText} accent="bg-violet-500" onClick={() => onNavigate("documents")}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* MRR Growth */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">MRR Growth</p>
              <p className="text-2xl font-bold text-white tabular-nums">{KES(mrr)}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-white/30 bg-white/5 px-2 py-1 rounded-lg">
              <span>6 months</span>
            </div>
          </div>
          <p className="text-xs text-white/25 mb-5">Cumulative monthly recurring revenue</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={mrrChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#c47d2a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#c47d2a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={v => v >= 1000 ? `${v/1000}K` : String(v)} />
              <Tooltip content={<ChartTooltip prefix="KES " />} />
              <Area type="monotone" dataKey="mrr" stroke="#c47d2a" strokeWidth={2} fill="url(#mrrGrad)" dot={false} activeDot={{ r: 4, fill: "#c47d2a", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">User Growth</p>
              <p className="text-2xl font-bold text-white tabular-nums">{fmt(total)} users</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-white/30 bg-white/5 px-2 py-1 rounded-lg">
              <span>6 months</span>
            </div>
          </div>
          <p className="text-xs text-white/25 mb-5">New signups per month</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={userChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fill="url(#userGrad)" dot={false} activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Plan Breakdown + Recent ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Plan breakdown */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-5">Plan Breakdown</p>
          <div className="space-y-4">
            {[
              { label: "Free",       count: free,       pct: total ? Math.round((free     / total) * 100) : 0, color: "bg-white/20",    text: "text-white/50" },
              { label: "Pro",        count: pro,        pct: total ? Math.round((pro      / total) * 100) : 0, color: "bg-emerald-500", text: "text-emerald-400" },
              { label: "Business",   count: business,   pct: total ? Math.round((business / total) * 100) : 0, color: "bg-amber-500",   text: "text-amber-400" },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", row.color)} />
                    <span className={cn("text-sm font-medium", row.text)}>{row.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white tabular-nums">{row.count}</span>
                    <span className="text-xs text-white/30 w-8 text-right tabular-nums">{row.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", row.color)}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* MRR breakdown by plan */}
          <div className="mt-6 pt-5 border-t border-white/5 space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">MRR by Plan</p>
            {[
              { label: "Pro",        value: pro * 1499,        color: "text-emerald-400" },
              { label: "Business",   value: business * 7900,   color: "text-amber-400" },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-sm text-white/40">{r.label}</span>
                <span className={cn("text-sm font-bold tabular-nums", r.color)}>{KES(r.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-sm text-white/60 font-medium">Total MRR</span>
              <span className="text-sm font-bold text-bronze tabular-nums">{KES(mrr)}</span>
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Recent Signups</p>
            <span className="text-xs text-white/20">{format(new Date(), "dd MMM yyyy")}</span>
          </div>
          <div className="space-y-1">
            {recent.length === 0 && <p className="text-sm text-white/20 text-center py-8">No signups yet</p>}
            {recent.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
                <Av url={u.avatar_url} name={u.display_name || u.handle} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate leading-tight">{u.display_name || u.handle}</p>
                  <p className="text-xs text-white/30 truncate">@{u.handle}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={planChip(u.subscription_plan)}>{u.subscription_plan || "free"}</span>
                  {u.created_at && (
                    <span className="text-[10px] text-white/20 hidden sm:block tabular-nums">{format(new Date(u.created_at), "dd MMM")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ARR Callout ── */}
      <button
        onClick={() => onNavigate("billing")}
        className="w-full text-left bg-gradient-to-r from-bronze/10 via-bronze/5 to-transparent border border-bronze/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-bronze/40 hover:from-bronze/15 transition-all duration-200 group"
      >
        <div>
          <p className="text-xs text-bronze/70 uppercase tracking-wider font-semibold mb-1">Projected ARR</p>
          <p className="text-3xl md:text-4xl font-bold text-white tabular-nums">{KES(arr)}</p>
          <p className="text-xs text-white/30 mt-1">Based on current MRR of {KES(mrr)} × 12 months</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="inline-flex items-center gap-2 bg-bronze/10 border border-bronze/20 px-4 py-2 rounded-xl group-hover:bg-bronze/20 group-hover:border-bronze/40 transition-all">
            <ArrowUpRight className="w-4 h-4 text-bronze" />
            <span className="text-sm font-semibold text-bronze">Annual projection</span>
          </div>
        </div>
      </button>

    </div>
  );
};

// ─── Users ────────────────────────────────────────────────────────────────────
const UsersSection = () => {
  const [users, setUsers]           = useState<any[]>([]);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<"all" | "free" | "pro" | "business">("all");
  const [selected, setSelected]     = useState<any>(null);
  const [selStats, setSelStats]     = useState<{ invoices: number; invoiceTotal: number } | null>(null);
  const [selTxns, setSelTxns]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [detailLoad, setDetailLoad] = useState(false);
  const [actionLoad, setActionLoad] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, handle, email, avatar_url, subscription_plan, subscription_status, subscription_expires_at, created_at, is_verified, is_admin, user_type, dira_actions_used, dira_actions_limit, invoices_used_this_month")
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  const openDetail = async (u: any) => {
    setSelected(u);
    setSelStats(null);
    setSelTxns([]);
    setDetailLoad(true);
    const [{ count: inv }, { data: invData }] = await Promise.all([
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", u.id),
      supabase.from("invoices").select("total").eq("user_id", u.id),
    ]);
    const total = (invData ?? []).reduce((s: number, r: any) => s + (r.total ?? 0), 0);
    setSelStats({ invoices: inv ?? 0, invoiceTotal: total });
    setDetailLoad(false);
  };

  const applyUpdate = async (userId: string, patch: Record<string, unknown>, successMsg: string) => {
    setActionLoad(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) { toast.error(error.message); setActionLoad(false); return; }
    toast.success(successMsg);
    setSelected((prev: any) => ({ ...prev, ...patch }));
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...patch } : u));
    setActionLoad(false);
  };

  const changePlan = async (plan: string) => {
    const isFreeDowngrade = !plan || plan === "free";
    const isPaid = ["pro", "creative_pro", "business", "brand_workspace"].includes(plan);
    const diraLimit =
      plan === "business" || plan === "brand_workspace" ? null
      : plan === "pro" || plan === "creative_pro"       ? 500
      : 15;
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 10); // 10-year manual grant
    await applyUpdate(selected.id, {
      subscription_plan:       plan || null,
      subscription_status:     isFreeDowngrade ? "inactive" : "active",
      subscription_expires_at: isFreeDowngrade ? null : expires.toISOString(),
      dira_actions_limit:      isFreeDowngrade ? 15 : diraLimit,
    }, `Plan changed to ${plan || "free"}`);
    // Sync branding visibility on link_profiles — paid users hide "powered by Kaizen Afrika"
    await supabase
      .from("link_profiles")
      .update({ show_crevia_branding: !isPaid })
      .eq("user_id", selected.id);
  };

  const toggleVerified = () =>
    applyUpdate(selected.id, { is_verified: !selected.is_verified }, selected.is_verified ? "Verification removed" : "User verified");

  const toggleAdmin = () => {
    if (!confirm(`${selected.is_admin ? "Remove" : "Grant"} admin access for ${selected.display_name || selected.handle}?`)) return;
    applyUpdate(selected.id, { is_admin: !selected.is_admin }, selected.is_admin ? "Admin access removed" : "Admin access granted");
  };

  const sendProNotification = async () => {
    setActionLoad(true);
    const { error } = await supabase.from("notifications").insert({
      user_id: selected.id,
      title: "Welcome to Kaizen Afrika Pro 🎉",
      body: "Welcome to Kaizen Afrika Pro. Unrestricted access to your operational tools is now live.",
      type: "system",
    });
    if (error) { toast.error(error.message); } else { toast.success("Notification sent"); }
    setActionLoad(false);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const ok = !q || u.display_name?.toLowerCase().includes(q) || u.handle?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const plan = u.subscription_plan || "free";
    return ok && (filter === "all" || plan === filter);
  });

  if (loading) return <Spin />;

  return (
    <div className="flex h-full min-h-0">
      {/* ── List ── */}
      <div className={cn("flex-1 min-w-0 overflow-y-auto", selected && "hidden md:block")}>
        <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-4xl">
          {/* Header */}
          <div>
            <h2 className="text-lg font-bold text-white">Users</h2>
            <p className="text-sm text-white/30">{users.length} total accounts</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <Input
                placeholder="Search by name, handle or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-[#111] border-white/[0.06] text-white placeholder:text-white/25 rounded-xl h-10 focus-visible:ring-bronze/30"
              />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="bg-[#111] border border-white/[0.06] text-white/60 text-sm rounded-xl px-3 h-10 outline-none cursor-pointer hover:border-white/10 transition-colors"
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>

          <p className="text-xs text-white/25">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>

          {/* List */}
          <div className="space-y-1.5">
            {filtered.map(u => (
              <button
                key={u.id}
                onClick={() => openDetail(u)}
                className={cn(
                  "w-full bg-[#111] border rounded-2xl p-4 flex items-center gap-3 transition-all text-left group",
                  selected?.id === u.id
                    ? "border-bronze/40 bg-bronze/5"
                    : "border-white/[0.06] hover:border-white/[0.12] hover:bg-[#161616]"
                )}
              >
                <Av url={u.avatar_url} name={u.display_name || u.handle} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate">{u.display_name || u.handle}</p>
                  <p className="text-xs text-white/30 truncate">{u.email || `@${u.handle}`}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.is_verified && <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold hidden sm:block">Verified</span>}
                  <span className={planChip(u.subscription_plan)}>{u.subscription_plan || "free"}</span>
                  <ChevronRight className={cn("w-3.5 h-3.5 transition-colors", selected?.id === u.id ? "text-bronze" : "text-white/15 group-hover:text-white/30")} />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-20 text-white/20 text-sm">No users match your search</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Panel ── */}
      {selected && (
        <div className="w-full md:w-80 lg:w-96 border-l border-white/[0.06] bg-[#0d0d0d] flex flex-col flex-shrink-0">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d0d0d] z-10">
            <p className="text-sm font-semibold text-white/60">User Detail</p>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => setSelected(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Profile hero */}
            <div className="flex items-center gap-3">
              <Av url={selected.avatar_url} name={selected.display_name || selected.handle} size="12" />
              <div className="min-w-0">
                <p className="text-base font-bold text-white truncate">{selected.display_name || selected.handle}</p>
                <p className="text-xs text-white/30 truncate">@{selected.handle}</p>
                {selected.email && <p className="text-xs text-white/25 truncate mt-0.5">{selected.email}</p>}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className={planChip(selected.subscription_plan)}>{selected.subscription_plan || "free"}</span>
              {selected.is_verified && <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">Verified</span>}
              <span className="text-[10px] bg-white/[0.05] text-white/30 border border-white/[0.06] px-2 py-0.5 rounded-full font-semibold capitalize">{selected.user_type}</span>
            </div>

            {/* Info rows */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
              {[
                { label: "Joined",      value: selected.created_at ? format(new Date(selected.created_at), "dd MMM yyyy") : "—" },
                { label: "Sub status",  value: selected.subscription_status || "—" },
                { label: "Expires",     value: selected.subscription_expires_at ? format(new Date(selected.subscription_expires_at), "dd MMM yyyy") : "—" },
              ].map((r, i) => (
                <div key={r.label} className={cn("flex items-center justify-between px-4 py-3", i !== 0 && "border-t border-white/[0.04]")}>
                  <span className="text-xs text-white/35">{r.label}</span>
                  <span className="text-xs text-white/70 font-medium">{r.value}</span>
                </div>
              ))}
            </div>

            {/* Usage this month */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
              <p className="text-[11px] text-white/35 px-4 py-2.5 border-b border-white/[0.04] font-semibold uppercase tracking-wider">
                Usage this month
              </p>
              {[
                {
                  label: "Dira prompts",
                  used: selected.dira_actions_used ?? 0,
                  limit: selected.dira_actions_limit == null ? "∞" : String(selected.dira_actions_limit),
                  pct: selected.dira_actions_limit == null ? 0
                    : Math.min(100, Math.round(((selected.dira_actions_used ?? 0) / selected.dira_actions_limit) * 100)),
                },
                {
                  label: "Invoices",
                  used: selected.invoices_used_this_month ?? 0,
                  limit: ["pro","business","creative_pro","brand_workspace"].includes(selected.subscription_plan) ? "∞" : "3",
                  pct: ["pro","business","creative_pro","brand_workspace"].includes(selected.subscription_plan) ? 0
                    : Math.min(100, Math.round(((selected.invoices_used_this_month ?? 0) / 3) * 100)),
                },
              ].map(({ label, used, limit, pct }) => (
                <div key={label} className="px-4 py-2.5 border-t border-white/[0.04] first:border-t-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-white/40">{label}</span>
                    <span className="text-[11px] text-white/60 font-semibold tabular-nums">
                      {used} / {limit}
                    </span>
                  </div>
                  {limit !== "∞" && limit !== "0" && (
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-bronze")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Activity stats */}
            <div>
              <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">Activity</p>
              {detailLoad ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 text-bronze animate-spin" /></div>
              ) : selStats && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Receipt,    label: "Invoices",  value: String(selStats.invoices), color: "text-blue-400" },
                    { icon: CreditCard, label: "Billed",    value: KES(selStats.invoiceTotal), color: "text-bronze" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-[#111] border border-white/[0.06] rounded-xl p-3 text-center">
                      <Icon className={cn("w-3.5 h-3.5 mx-auto mb-1.5", color)} />
                      <p className={cn("text-sm font-bold leading-tight tabular-nums", color)}>{value}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin actions */}
            <div>
              <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">Actions</p>
              <div className="space-y-2.5">

                {/* Change plan */}
                <div className="bg-[#111] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[11px] text-white/35 mb-2">Subscription plan</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { key: "free",       label: "Free" },
                      { key: "pro",        label: "Pro" },
                      { key: "business",   label: "Business" },
                    ].map(({ key, label }) => {
                      const current = selected.subscription_plan || "free";
                      const isActive = current === key;
                      const activeStyle =
                        key === "pro"      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : key === "business" ? "bg-amber-500/20  text-amber-400  border-amber-500/30"
                        : "bg-white/10 text-white/50 border-white/10";
                      return (
                        <button
                          key={key}
                          disabled={actionLoad || isActive}
                          onClick={() => changePlan(key === "free" ? "" : key)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                            isActive
                              ? activeStyle
                              : "bg-white/[0.04] text-white/30 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60"
                          )}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle verified */}
                <button
                  disabled={actionLoad}
                  onClick={toggleVerified}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    selected.is_verified
                      ? "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                  )}
                >
                  <span>{selected.is_verified ? "Verified" : "Not verified"}</span>
                  <span className="text-[11px] opacity-60">{selected.is_verified ? "Remove badge" : "Grant badge"}</span>
                </button>

                {/* Toggle admin */}
                <button
                  disabled={actionLoad}
                  onClick={toggleAdmin}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    selected.is_admin
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                  )}
                >
                  <span>{selected.is_admin ? "Admin" : "Not admin"}</span>
                  <span className="text-[11px] opacity-60">{selected.is_admin ? "Revoke access" : "Grant access"}</span>
                </button>

                {/* Send Pro notification */}
                <button
                  disabled={actionLoad}
                  onClick={sendProNotification}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all bg-[#F0782F]/10 border-[#F0782F]/25 text-[#F0782F] hover:bg-[#F0782F]/20"
                >
                  <span>Send Pro notification</span>
                  <span className="text-[11px] opacity-60">Notify user</span>
                </button>

              </div>
            </div>

            {/* Payment history */}
            <div>
              <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">Payment History</p>
              {detailLoad ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 text-bronze animate-spin" /></div>
              ) : selTxns.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-4">No transactions found</p>
              ) : (
                <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="divide-y divide-white/[0.04]">
                    {selTxns.map(t => (
                      <div key={t.id} className="px-3 py-2.5 flex items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/60 font-mono truncate">{t.transaction_reference || t.id.slice(0, 16)}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">{t.payment_method || t.transaction_type} · {format(new Date(t.created_at), "dd MMM yy")}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={statusChip(t.status || "pending")}>{t.status || "pending"}</span>
                          <p className="text-xs font-bold text-white/70 tabular-nums">KES {(t.amount ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Billing ──────────────────────────────────────────────────────────────────
const BillingSection = () => {
  const [txns, setTxns]               = useState<any[]>([]);
  const [profiles, setProfiles]       = useState<any[]>([]);
  const [tab, setTab]                 = useState<"transactions" | "refunds" | "analytics" | "plans">("transactions");
  const [loading, setLoading]         = useState(true);
  const [planPrices, setPlanPrices]   = useState({ pro: "14.99", business: "79" });
  const [planSaving, setPlanSaving]   = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: txnData }, { data: profData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("profiles")
        .select("id, subscription_plan, subscription_expires_at, created_at"),
      supabase
        .from("app_settings" as any)
        .select("key, value")
        .in("key", ["plan_price_pro", "plan_price_business"]),
    ]);
    setTxns(txnData ?? []);
    setProfiles(profData ?? []);
    if (settingsData) {
      const prices = { pro: "14.99", business: "79" };
      (settingsData as any[]).forEach(s => {
        if (s.key === "plan_price_pro")      prices.pro      = s.value;
        if (s.key === "plan_price_business") prices.business = s.value;
      });
      setPlanPrices(prices);
    }
    setLoading(false);
  };

  const savePlanPrices = async () => {
    setPlanSaving(true);
    const rows = [
      { key: "plan_price_pro",        value: planPrices.pro },
      { key: "plan_price_business",   value: planPrices.business },
    ];
    const { error } = await (supabase.from("app_settings" as any) as any).upsert(rows, { onConflict: "key" });
    if (error) { toast.error(error.message); }
    else { toast.success("Plan prices saved"); }
    setPlanSaving(false);
  };

  const markRefunded = async (id: string) => {
    if (!confirm("Mark this transaction as refunded? This updates the status in your records.")) return;
    const { error } = await supabase.from("payment_transactions").update({ status: "refunded" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as refunded");
    load();
  };

  const total        = txns.reduce((s, t) => s + (t.amount ?? 0), 0);
  const completed    = txns.filter(t => t.status === "completed" || t.status === "success").length;
  const failed       = txns.filter(t => t.status === "failed").length;
  const refunded     = txns.filter(t => t.status === "refunded").length;
  const refundable   = txns.filter(t => ["failed", "cancelled"].includes(t.status));
  const refundedList = txns.filter(t => t.status === "refunded");

  // ── Analytics ──
  const now              = new Date();
  const nowIso           = now.toISOString();
  const successTxns      = txns.filter(t => t.status === "completed" || t.status === "success");
  const successRevenue   = successTxns.reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalUsers       = profiles.length;
  const paidUsers        = profiles.filter(p => ["pro", "creative_pro", "business", "brand_workspace"].includes(p.subscription_plan)).length;
  const conversionRate   = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : "0";
  const arpu             = totalUsers > 0 ? Math.round(successRevenue / totalUsers) : 0;
  const avgTxn           = completed > 0  ? Math.round(successRevenue / completed)  : 0;
  // Churned: was paying (has an expiry) but now free/null and expiry is in the past
  const churned = profiles.filter(p =>
    (!p.subscription_plan || p.subscription_plan === "free") &&
    p.subscription_expires_at && p.subscription_expires_at < nowIso
  ).length;
  // At risk: still paid but expiry within 7 days
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const atRisk = profiles.filter(p =>
    ["pro", "creative_pro", "business", "brand_workspace"].includes(p.subscription_plan) &&
    p.subscription_expires_at && p.subscription_expires_at <= sevenDaysOut
  ).length;
  // Revenue by month (last 6)
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const d     = subMonths(now, 5 - i);
    const start = startOfMonth(d).toISOString();
    const end   = endOfMonth(d).toISOString();
    const rev   = successTxns
      .filter(t => t.created_at >= start && t.created_at <= end)
      .reduce((s, t) => s + (t.amount ?? 0), 0);
    return { month: format(d, "MMM"), revenue: rev };
  });

  if (loading) return <Spin />;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white">Billing</h2>
        <p className="text-sm text-white/30">All payment transactions</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Volume", value: KES(total),        color: "text-bronze",      accent: "bg-bronze" },
          { label: "Completed",    value: String(completed), color: "text-emerald-400", accent: "bg-emerald-500" },
          { label: "Failed",       value: String(failed),    color: "text-red-400",     accent: "bg-red-500" },
          { label: "Refunded",     value: String(refunded),  color: "text-amber-400",   accent: "bg-amber-500" },
        ].map(c => (
          <div key={c.label} className="relative bg-[#111] border border-white/[0.06] rounded-2xl p-4 overflow-hidden">
            <div className={cn("absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl opacity-20", c.accent)} />
            <p className="text-[10px] text-white/35 font-medium mb-2 truncate">{c.label}</p>
            <p className={cn("text-lg md:text-2xl font-bold tabular-nums leading-tight", c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#111] rounded-xl border border-white/[0.06] w-fit flex-wrap">
        {(["transactions", "refunds", "analytics", "plans"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-1.5",
              tab === t ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}
          >
            {t}
            {t === "refunds" && refundable.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">{refundable.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "transactions" && (
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-sm font-semibold text-white/70">Transactions</p>
            <span className="text-xs text-white/25">{txns.length} total</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {txns.length === 0 && <p className="text-center py-16 text-white/20 text-sm">No transactions yet</p>}
            {txns.map(t => {
              return (
                <div key={t.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 font-mono truncate">{t.transaction_reference || t.id.slice(0, 20)}</p>
                    <p className="text-[11px] text-white/25 mt-0.5">{t.payment_method || t.transaction_type} · {format(new Date(t.created_at), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={statusChip(t.status || "pending")}>{t.status || "pending"}</span>
                    <p className="text-sm font-bold text-white/80 tabular-nums">KES {(t.amount ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "refunds" && (
        <div className="space-y-4">
          {refundable.length === 0 && refundedList.length === 0 && (
            <div className="text-center py-20 text-white/20 text-sm">No refund requests</div>
          )}
          {refundable.length > 0 && (
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <p className="text-sm font-semibold text-white/70">Needs Attention</p>
                <span className="text-xs text-red-400">{refundable.length} failed / cancelled</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {refundable.map(t => {
                  return (
                    <div key={t.id} className="px-4 md:px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 font-mono truncate">{t.transaction_reference || t.id.slice(0, 16)}</p>
                        <p className="text-[11px] text-white/25 mt-0.5 truncate">{format(new Date(t.created_at), "dd MMM yyyy, HH:mm")}</p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className={statusChip(t.status)}>{t.status}</span>
                        <p className="text-sm font-bold text-white/80 tabular-nums">KES {(t.amount ?? 0).toLocaleString()}</p>
                        <Button size="sm" variant="outline" onClick={() => markRefunded(t.id)}
                          className="h-7 text-[11px] border-amber-500/25 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40 rounded-lg px-2.5 flex-shrink-0">
                          Refund
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {refundedList.length > 0 && (
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white/70">Processed Refunds</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {refundedList.map(t => {
                  return (
                    <div key={t.id} className="px-4 md:px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 font-mono truncate">{t.transaction_reference || t.id.slice(0, 16)}</p>
                        <p className="text-[11px] text-white/25 mt-0.5 truncate">{format(new Date(t.created_at), "dd MMM yy")}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">refunded</span>
                        <p className="text-sm font-bold text-white/80 tabular-nums">KES {(t.amount ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-5">

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Conversion Rate", value: `${conversionRate}%`,   sub: `${paidUsers} of ${totalUsers} users paid`,       color: "text-emerald-400", accent: "bg-emerald-500" },
              { label: "ARPU",            value: KES(arpu),              sub: "Avg revenue per user",                            color: "text-bronze",      accent: "bg-bronze" },
              { label: "Avg Transaction", value: KES(avgTxn),            sub: `${completed} completed payments`,                 color: "text-blue-400",    accent: "bg-blue-500" },
              { label: "Churned",         value: String(churned),        sub: atRisk > 0 ? `${atRisk} expiring soon` : "0 at risk", color: "text-red-400",  accent: "bg-red-500" },
            ].map(c => (
              <div key={c.label} className="relative bg-[#111] border border-white/[0.06] rounded-2xl p-4 overflow-hidden">
                <div className={cn("absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl opacity-20", c.accent)} />
                <p className="text-[10px] text-white/35 font-medium mb-2 truncate">{c.label}</p>
                <p className={cn("text-lg md:text-2xl font-bold tabular-nums leading-tight", c.color)}>{c.value}</p>
                <p className="text-[10px] text-white/20 mt-1 truncate">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Revenue by month chart */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Revenue by Month</p>
            <p className="text-xs text-white/25 mb-5">Completed / successful transactions only</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={v => v >= 1000 ? `${v / 1000}K` : String(v)} />
                <Tooltip content={<ChartTooltip prefix="KES " />} />
                <Bar dataKey="revenue" fill="#c47d2a" radius={[4, 4, 0, 0]}>
                  {revenueByMonth.map((_, i) => (
                    <Cell key={i} fill={i === revenueByMonth.length - 1 ? "#c47d2a" : "rgba(196,125,42,0.45)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion + churn breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Plan distribution */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-5">User Plan Distribution</p>
              <div className="space-y-3">
                {[
                  { label: "Free",       count: totalUsers - paidUsers,                                                                                                                     color: "bg-white/20",    text: "text-white/50" },
                  { label: "Pro",        count: profiles.filter(p => p.subscription_plan === "pro" || p.subscription_plan === "creative_pro").length,                       color: "bg-emerald-500", text: "text-emerald-400" },
                  { label: "Business",   count: profiles.filter(p => p.subscription_plan === "business" || p.subscription_plan === "brand_workspace").length,               color: "bg-amber-500",   text: "text-amber-400" },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", row.color)} />
                        <span className={cn("text-sm font-medium", row.text)}>{row.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tabular-nums">{row.count}</span>
                        <span className="text-xs text-white/25 w-8 text-right tabular-nums">
                          {totalUsers > 0 ? Math.round((row.count / totalUsers) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", row.color)}
                        style={{ width: `${totalUsers > 0 ? Math.round((row.count / totalUsers) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Churn & retention */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-5">Retention Signals</p>
              <div className="space-y-3">
                {[
                  { label: "Active paid",      value: paidUsers,                    color: "text-emerald-400", bg: "bg-emerald-500/10", note: "currently on paid plan" },
                  { label: "Churned",          value: churned,                      color: "text-red-400",     bg: "bg-red-500/10",     note: "expired, now on free" },
                  { label: "Expiring ≤7 days", value: atRisk,                       color: "text-amber-400",   bg: "bg-amber-500/10",   note: "at risk of churn" },
                  { label: "Never paid",       value: totalUsers - paidUsers - churned, color: "text-white/30", bg: "bg-white/[0.04]",  note: "always been free" },
                ].map(row => (
                  <div key={row.label} className={cn("flex items-center justify-between px-3 py-2 rounded-xl", row.bg)}>
                    <div>
                      <p className={cn("text-xs font-semibold", row.color)}>{row.label}</p>
                      <p className="text-[10px] text-white/20 mt-0.5">{row.note}</p>
                    </div>
                    <p className={cn("text-lg font-bold tabular-nums", row.color)}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "plans" && (
        <div className="space-y-5 max-w-3xl">
          <p className="text-xs text-white/30">Set monthly subscription prices (USD). Values are stored and shown to users on the pricing page.</p>

          {/* Free plan — always free, no price input */}
          <div className="border border-white/[0.08] rounded-2xl p-5 space-y-4 bg-white/[0.02]">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-base font-bold text-white/50">Free</p>
                <p className="text-xs text-white/25 mt-0.5">Always free · no credit card required</p>
              </div>
              <span className="text-sm font-bold text-white/30 tabular-nums">KES 0 / mo</span>
            </div>
            <div className="rounded-xl p-3 bg-white/[0.03]">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Included features</p>
              <ul className="space-y-1.5">
                {["5 invoices / month", "Basic Kaizen Link profile", "Standard messaging"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/35">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white/20" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {([
            {
              key: "pro" as const,
              label: "Pro",
              color: "text-emerald-400",
              border: "border-emerald-500/20",
              bg: "bg-emerald-500/5",
              accent: "bg-emerald-500/10",
              features: ["Unlimited invoices", "Kaizen Link profile", "Kaizen Studio access", "E2E encrypted messaging", "Escrow payments"],
            },
            {
              key: "business" as const,
              label: "Business",
              color: "text-amber-400",
              border: "border-amber-500/20",
              bg: "bg-amber-500/5",
              accent: "bg-amber-500/10",
              features: ["Everything in Pro", "3 seats included", "RBAC permissions", "Clause library", "200 Dira msgs/day"],
            },
          ]).map(plan => (
            <div key={plan.key} className={cn("border rounded-2xl p-5 space-y-4", plan.border, plan.bg)}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className={cn("text-base font-bold", plan.color)}>{plan.label}</p>
                  <p className="text-xs text-white/30 mt-0.5">Monthly · billed per user</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/25">USD $</span>
                  <Input
                    type="number"
                    min="0"
                    value={planPrices[plan.key]}
                    onChange={e => setPlanPrices(prev => ({ ...prev, [plan.key]: e.target.value }))}
                    className="w-28 bg-[#111] border-white/[0.08] text-white text-right rounded-xl h-9 focus-visible:ring-bronze/30 tabular-nums"
                  />
                  <span className="text-xs text-white/25">/ mo</span>
                </div>
              </div>
              <div className={cn("rounded-xl p-3", plan.accent)}>
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Included features</p>
                <ul className="space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/50">
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", plan.key === "pro" ? "bg-emerald-500" : "bg-amber-500")} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          <Button
            onClick={savePlanPrices}
            disabled={planSaving}
            className="bg-bronze hover:bg-bronze/90 text-white h-9 px-6 rounded-xl"
          >
            {planSaving ? "Saving…" : "Save Prices"}
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Documents ────────────────────────────────────────────────────────────────
const DocumentsSection = () => {
  const [view, setView]             = useState<"invoices" | "analytics" | "trash">("invoices");
  const [invoices, setInvoices]     = useState<any[]>([]);
  const [trashInv, setTrashInv]     = useState<any[]>([]);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);

  useEffect(() => { load(); }, []);

  const SEL_INV = "id, invoice_number, client_name, total, status, currency, created_at, deleted_at";

  const load = async () => {
    const { data: allInv } = await (supabase.from("invoices") as any).select(SEL_INV).order("created_at", { ascending: false }).limit(300);
    const inv = (allInv ?? []);
    setInvoices(inv.filter((d: any) => !d.deleted_at));
    setTrashInv(inv.filter((d: any) => d.deleted_at));
    setLoading(false);
  };

  const softDelete = async (id: string) => {
    if (!confirm(`Move to trash? You can restore it later.`)) return;
    const { error } = await (supabase.from("invoices") as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Moved to trash");
    load();
  };

  const restore = async (id: string) => {
    const { error } = await (supabase.from("invoices") as any).update({ deleted_at: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Restored");
    load();
  };

  const permanentDelete = async (id: string) => {
    if (!confirm("Permanently delete? This cannot be undone.")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Permanently deleted");
    load();
  };

  // ── Derived stats ──
  const paid    = invoices.filter(i => i.status === "paid").length;
  const pending = invoices.filter(i => i.status === "draft" || i.status === "sent").length;
  const trashCount = trashInv.length;

  // ── Analytics ──
  const now = new Date();
  const paidRevenue  = invoices.filter(i => i.status === "paid").reduce((s: number, i: any) => s + (i.total ?? 0), 0);
  const outstanding  = invoices.filter(i => ["sent", "draft"].includes(i.status)).reduce((s: number, i: any) => s + (i.total ?? 0), 0);
  const totalInvVal  = invoices.reduce((s: number, i: any) => s + (i.total ?? 0), 0);
  const docsPerMonth = Array.from({ length: 6 }, (_, i) => {
    const d     = subMonths(now, 5 - i);
    const start = startOfMonth(d).toISOString();
    const end   = endOfMonth(d).toISOString();
    return {
      month:    format(d, "MMM"),
      invoices: invoices.filter((r: any) => r.created_at >= start && r.created_at <= end).length,
    };
  });
  const clientMap: Record<string, number> = {};
  invoices.forEach((d: any) => {
    if (d.client_name) clientMap[d.client_name] = (clientMap[d.client_name] || 0) + 1;
  });
  const topClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxClient  = Math.max(1, ...topClients.map(([, c]) => c));

  const filtered = invoices.filter((d: any) => {
    const q = search.toLowerCase();
    return !q || d.client_name?.toLowerCase().includes(q) || d.invoice_number?.toLowerCase().includes(q);
  });

  if (loading) return <Spin />;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white">Documents</h2>
        <p className="text-sm text-white/30">{invoices.length} invoices</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Paid invoices",    value: String(paid),    color: "text-emerald-400", accent: "bg-emerald-500" },
          { label: "Pending invoices", value: String(pending), color: "text-amber-400",   accent: "bg-amber-500" },
        ].map(c => (
          <div key={c.label} className="relative bg-[#111] border border-white/[0.06] rounded-2xl p-4 overflow-hidden">
            <div className={cn("absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl opacity-20", c.accent)} />
            <p className="text-[11px] text-white/35 font-medium mb-2 leading-tight">{c.label}</p>
            <p className={cn("text-xl md:text-2xl font-bold tabular-nums", c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#111] rounded-xl border border-white/[0.06] w-fit flex-wrap">
        {([
          { id: "invoices"   as const, label: "Invoices" },
          { id: "analytics"  as const, label: "Analytics" },
          { id: "trash"      as const, label: "Trash", badge: trashCount },
        ]).map(t => (
          <button key={t.id} onClick={() => { setView(t.id); setSearch(""); }}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              view === t.id ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}>
            {t.label}
            {"badge" in t && t.badge > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Invoices list ── */}
      {view === "invoices" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-[#111] border-white/[0.06] text-white placeholder:text-white/25 rounded-xl h-9 focus-visible:ring-bronze/30" />
          </div>
          <p className="text-xs text-white/25">{filtered.length} invoices</p>
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {filtered.length === 0 && <div className="text-center py-16 text-white/20 text-sm">No invoices found</div>}
              {filtered.map((d: any) => (
                <div key={d.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/75 font-medium truncate">#{d.invoice_number} · {d.client_name}</p>
                    <p className="text-xs text-white/25 truncate mt-0.5">{format(new Date(d.created_at), "dd MMM yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={statusChip(d.status)}>{d.status}</span>
                    <p className="text-sm font-bold text-white/70 tabular-nums">
                      {d.currency || "KES"} {(d.total || 0).toLocaleString()}
                    </p>
                    <button onClick={() => softDelete(d.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10" title="Move to trash">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Analytics ── */}
      {view === "analytics" && (
        <div className="space-y-5">

          {/* Invoice value summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total invoice value", value: KES(totalInvVal), color: "text-white/70",    accent: "bg-white/20" },
              { label: "Collected (paid)",     value: KES(paidRevenue), color: "text-emerald-400", accent: "bg-emerald-500" },
              { label: "Outstanding",          value: KES(outstanding), color: "text-amber-400",   accent: "bg-amber-500" },
            ].map(c => (
              <div key={c.label} className="relative bg-[#111] border border-white/[0.06] rounded-2xl p-4 overflow-hidden">
                <div className={cn("absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl opacity-15", c.accent)} />
                <p className="text-[10px] text-white/30 font-medium mb-2 leading-tight">{c.label}</p>
                <p className={cn("text-lg md:text-xl font-bold tabular-nums", c.color)}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Docs per month chart */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Invoices Created</p>
            <p className="text-xs text-white/25 mb-4">Per month (last 6 months)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={docsPerMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} labelStyle={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }} itemStyle={{ color: "#fff", fontSize: 12 }} />
                <Bar dataKey="invoices" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top clients */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-5">Top Clients by Document Count</p>
            {topClients.length === 0
              ? <p className="text-sm text-white/20 text-center py-6">No documents yet</p>
              : <div className="space-y-3">
                  {topClients.map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <p className="text-sm text-white/60 w-36 flex-shrink-0 truncate">{name}</p>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex-1">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((count / maxClient) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-white/30 tabular-nums w-6 text-right flex-shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ── Trash ── */}
      {view === "trash" && (
        <div className="space-y-4">
          {trashCount === 0 && (
            <div className="text-center py-20 text-white/20 text-sm">Trash is empty</div>
          )}
          {trashInv.length > 0 && (
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                <p className="text-sm font-semibold text-white/50">Invoices</p>
                <span className="text-xs text-amber-400">{trashInv.length} in trash</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {trashInv.map((d: any) => (
                  <div key={d.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/50 font-medium truncate">#{d.invoice_number} · {d.client_name}</p>
                      <p className="text-xs text-white/20 mt-0.5 truncate">
                        Deleted {format(new Date(d.deleted_at), "dd MMM yyyy")} · originally created {format(new Date(d.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={statusChip(d.status)}>{d.status}</span>
                      <button onClick={() => restore(d.id)}
                        className="flex items-center gap-1 text-[11px] text-emerald-400/70 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20">
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                      <button onClick={() => permanentDelete(d.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10" title="Delete permanently">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Support ──────────────────────────────────────────────────────────────────
const SupportSection = ({ onTicketClosed, onVerificationResolved }: { onTicketClosed?: () => void; onVerificationResolved?: () => void }) => {
  const [tab, setTab]           = useState<"verifications" | "feedback" | "tickets" | "bugs">("verifications");
  const [requests, setRequests] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [tickets, setTickets]   = useState<any[]>([]);
  const [notes, setNotes]         = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: reqs }, { data: fb }, { data: tix }] = await Promise.all([
      supabase.from("verification_requests" as any)
        .select("*, profiles:user_id(display_name, handle, avatar_url, email)")
        .order("created_at", { ascending: false }),
      supabase.from("feedback" as any)
        .select("*, profiles:user_id(display_name, handle)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("support_tickets" as any)
        .select("*, profiles:user_id(display_name, handle, email)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setRequests(reqs ?? []);
    setFeedback(fb ?? []);
    setTickets(tix ?? []);
    setLoading(false);
  };

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_verification" as any, { p_request_id: id, p_notes: notes[id] || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Verification approved");
    onVerificationResolved?.();
    load();
  };

  const reject = async (id: string) => {
    const { error } = await supabase.rpc("reject_verification" as any, { p_request_id: id, p_notes: notes[id] || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Request rejected");
    onVerificationResolved?.();
    load();
  };

  const closeTicket = async (id: string) => {
    const { error } = await supabase.from("support_tickets" as any).update({ status: "closed" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket closed");
    onTicketClosed?.();
    load();
  };

  const sendReply = async (id: string) => {
    const reply = replyText[id]?.trim();
    if (!reply) return;
    setReplying(id);
    const { error } = await supabase.from("support_tickets" as any).update({
      admin_reply: reply,
      replied_at: new Date().toISOString(),
      status: "closed",
    }).eq("id", id);
    if (error) { toast.error(error.message); setReplying(null); return; }
    toast.success("Reply sent and ticket closed");
    setReplyText(p => ({ ...p, [id]: "" }));
    onTicketClosed?.();
    setReplying(null);
    load();
  };

  const pending        = requests.filter(r => r.status === "pending").length;
  const generalTickets = tickets.filter(t => !t.type || t.type === "general");
  const bugTickets     = tickets.filter(t => t.type === "bug");
  const openTickets    = generalTickets.filter(t => t.status === "open").length;
  const openBugs       = bugTickets.filter(t => t.status === "open").length;

  if (loading) return <Spin />;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white">Support</h2>
        <p className="text-sm text-white/30">
          {pending > 0 ? `${pending} pending verification${pending !== 1 ? "s" : ""}` : "All verifications reviewed"}
          {openTickets > 0 ? ` · ${openTickets} open ticket${openTickets !== 1 ? "s" : ""}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-[#111] rounded-xl border border-white/[0.06] w-fit">
        {([
          { id: "verifications" as const, label: "Verifications", badge: pending },
          { id: "feedback" as const,      label: "Feedback",      badge: 0 },
          { id: "tickets" as const,       label: "Tickets",       badge: openTickets },
          { id: "bugs" as const,          label: "Bugs",          badge: openBugs },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn(
            "px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
            tab === t.id ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white/70"
          )}>
            {t.label}
            {t.badge > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "verifications" && (
        <div className="space-y-3">
          {requests.length === 0 && <div className="text-center py-20 text-white/20 text-sm">No verification requests</div>}
          {requests.map(r => (
            <div key={r.id} className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Av url={r.profiles?.avatar_url} name={r.profiles?.display_name || r.profiles?.handle} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/85 truncate">{r.profiles?.display_name || r.profiles?.handle}</p>
                    <p className="text-xs text-white/30 truncate">{r.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    r.status === "approved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    : r.status === "rejected" ? "bg-red-500/20 text-red-400 border border-red-500/20"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                  )}>{r.status}</span>
                  <span className="text-xs text-white/20">{format(new Date(r.created_at), "dd MMM")}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {r.instagram_handle && <span className="text-[11px] bg-white/[0.04] border border-white/[0.06] text-white/40 px-2.5 py-1 rounded-lg">IG: {r.instagram_handle}</span>}
                {r.tiktok_handle    && <span className="text-[11px] bg-white/[0.04] border border-white/[0.06] text-white/40 px-2.5 py-1 rounded-lg">TT: {r.tiktok_handle}</span>}
                {r.youtube_handle   && <span className="text-[11px] bg-white/[0.04] border border-white/[0.06] text-white/40 px-2.5 py-1 rounded-lg">YT: {r.youtube_handle}</span>}
                {r.twitter_handle   && <span className="text-[11px] bg-white/[0.04] border border-white/[0.06] text-white/40 px-2.5 py-1 rounded-lg">X: {r.twitter_handle}</span>}
                {r.follower_count   && <span className="text-[11px] bg-white/[0.04] border border-white/[0.06] text-white/40 px-2.5 py-1 rounded-lg">{Number(r.follower_count).toLocaleString()} followers</span>}
              </div>

              {r.reason && (
                <p className="text-sm text-white/45 bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 whitespace-pre-wrap leading-relaxed">{r.reason}</p>
              )}

              {r.status === "pending" && (
                <div className="space-y-2.5">
                  <Textarea
                    rows={2}
                    placeholder="Reviewer notes (optional — shown to user if rejected)"
                    value={notes[r.id] ?? ""}
                    onChange={e => setNotes(p => ({ ...p, [r.id]: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 resize-none rounded-xl text-sm focus-visible:ring-bronze/30"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(r.id)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r.id)} className="gap-1.5 border-red-500/25 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl h-9">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              )}
              {r.status !== "pending" && r.reviewer_notes && (
                <p className="text-xs text-white/25 italic border-t border-white/[0.04] pt-3">Notes: {r.reviewer_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "feedback" && (
        <div className="space-y-3">
          {feedback.length === 0 && <div className="text-center py-20 text-white/20 text-sm">No feedback yet</div>}
          {feedback.map(fb => (
            <div key={fb.id} className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                <p className="text-sm font-semibold text-white/70">{fb.profiles?.display_name || fb.profiles?.handle || "Anonymous"}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    fb.type === "feature"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                      : "bg-violet-500/15 text-violet-400 border-violet-500/20"
                  )}>{fb.type === "feature" ? "Feature" : "Thought"}</span>
                  <span className="text-xs text-white/20">{format(new Date(fb.created_at), "dd MMM")}</span>
                </div>
              </div>
              {fb.title && <p className="text-xs text-white/40 mb-2 font-semibold">{fb.title}</p>}
              <p className="text-sm text-white/45 whitespace-pre-wrap leading-relaxed">{fb.message}</p>
            </div>
          ))}
        </div>
      )}

      {(tab === "tickets" || tab === "bugs") && (
        <div className="space-y-3">
          {(tab === "tickets" ? generalTickets : bugTickets).length === 0 && (
            <div className="text-center py-20 text-white/20 text-sm">
              {tab === "bugs" ? "No bug reports yet" : "No support tickets yet"}
            </div>
          )}
          {(tab === "tickets" ? generalTickets : bugTickets).map(tk => (
            <div key={tk.id} className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Av url={null} name={tk.profiles?.display_name || tk.profiles?.handle} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/85 truncate">{tk.profiles?.display_name || tk.profiles?.handle || "Anonymous"}</p>
                    <p className="text-xs text-white/30 truncate">{tk.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tk.type === "bug" && tab === "tickets" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 flex items-center gap-1">
                      <Bug className="w-2.5 h-2.5" /> Bug
                    </span>
                  )}
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    tk.status === "closed"
                      ? "bg-white/[0.05] text-white/30 border-white/[0.06]"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/20"
                  )}>{tk.status}</span>
                  <span className="text-xs text-white/20">{format(new Date(tk.created_at), "dd MMM")}</span>
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs text-white/50 font-semibold mb-1.5 truncate">{tk.subject}</p>
                <p className="text-sm text-white/45 whitespace-pre-wrap leading-relaxed">{tk.message}</p>
              </div>

              {/* Existing reply */}
              {tk.admin_reply && (
                <div className="bg-bronze/[0.06] border border-bronze/20 rounded-xl p-3.5">
                  <p className="text-[10px] text-bronze/70 font-semibold uppercase tracking-wider mb-1.5">
                    Kaizen Afrika reply · {tk.replied_at ? format(new Date(tk.replied_at), "dd MMM yyyy") : ""}
                  </p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">{tk.admin_reply}</p>
                </div>
              )}

              {/* Reply composer (open tickets only) */}
              {tk.status === "open" && (
                <div className="pt-1 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Write a reply… (sends reply and closes ticket)"
                    value={replyText[tk.id] ?? ""}
                    onChange={e => setReplyText(p => ({ ...p, [tk.id]: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 resize-none rounded-xl text-sm focus-visible:ring-bronze/30"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      disabled={!replyText[tk.id]?.trim() || replying === tk.id}
                      onClick={() => sendReply(tk.id)}
                      className="bg-bronze hover:bg-bronze/90 text-white rounded-xl h-8 px-4 text-xs gap-1.5"
                    >
                      {replying === tk.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Send reply
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => closeTicket(tk.id)}
                      className="h-8 text-[11px] border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 rounded-xl px-3">
                      Close without reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Templates & Customization ───────────────────────────────────────────────
const FONTS: Record<string, string> = {
  poppins:  "Poppins",
  vollkorn: "Vollkorn",
  inter:    "Inter",
  playfair: "Playfair Display",
};

const PLAN_FEATURES = [
  { label: "Seats",                  free: "1",    pro: "1",         biz: "3+"        },
  { label: "Dira AI actions / day",  free: "10",   pro: "40",        biz: "200"       },
  { label: "Invoices / month",       free: "2",    pro: "Unlimited", biz: "Unlimited" },
  { label: "No invoice watermark",   free: false,  pro: true,        biz: true        },
  { label: "E-Signature",            free: false,  pro: true,        biz: true        },
  { label: "Verified Badge",         free: false,  pro: true,        biz: true        },
  { label: "Premium Themes",         free: false,  pro: true,        biz: true        },
  { label: "Client Portal",          free: false,  pro: true,        biz: true        },
  { label: "Team RBAC",              free: false,  pro: false,       biz: true        },
  { label: "Priority Support",       free: false,  pro: true,        biz: true        },
];

const UsageBar = ({ pct, color = "bg-bronze" }: { pct: number; color?: string }) => (
  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex-1">
    <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
  </div>
);

const TemplatesSection = () => {
  const [tab, setTab] = useState<"templates" | "themes" | "features">("templates");
  const [loading, setLoading] = useState(true);
  const [invoiceColors, setInvoiceColors] = useState<{ color: string; count: number }[]>([]);
  const [themes, setThemes]               = useState<{ theme: string; count: number }[]>([]);
  const [fonts, setFonts]                 = useState<{ font: string; count: number }[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: invData }, { data: lpData }] = await Promise.all([
      supabase.from("invoices").select("accent_color"),
      supabase.from("link_profiles").select("theme, background"),
    ]);

    // Invoice accent colors
    const colorMap: Record<string, number> = {};
    (invData ?? []).forEach((r: any) => {
      const c = r.accent_color || "#B07D3A";
      colorMap[c] = (colorMap[c] || 0) + 1;
    });
    setInvoiceColors(Object.entries(colorMap).sort((a, b) => b[1] - a[1]).map(([color, count]) => ({ color, count })));

    // Kaizen Link themes
    const themeMap: Record<string, number> = {};
    const fontMap: Record<string, number> = {};
    (lpData ?? []).forEach((r: any) => {
      const th = r.theme || "dark";
      themeMap[th] = (themeMap[th] || 0) + 1;
      const fn = (r.background as any)?.font_family || "poppins";
      fontMap[fn] = (fontMap[fn] || 0) + 1;
    });
    setThemes(Object.entries(themeMap).sort((a, b) => b[1] - a[1]).map(([theme, count]) => ({ theme, count })));
    setFonts(Object.entries(fontMap).sort((a, b) => b[1] - a[1]).map(([font, count]) => ({ font, count })));

    setLoading(false);
  };

  if (loading) return <Spin />;

  const maxColor = Math.max(1, ...invoiceColors.map(r => r.count));
  const maxTheme = Math.max(1, ...themes.map(r => r.count));
  const maxFont  = Math.max(1, ...fonts.map(r => r.count));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white">Templates & Customization</h2>
        <p className="text-sm text-white/30">Usage analytics and feature access overview</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#111] rounded-xl border border-white/[0.06] w-fit flex-wrap">
        {([
          { id: "templates" as const, label: "Templates" },
          { id: "themes"    as const, label: "Themes & Fonts" },
          { id: "features"  as const, label: "Feature Access" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t.id ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}>{t.label}</button>
        ))}
      </div>

      {/* ── Templates ── */}
      {tab === "templates" && (
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-5">Invoice Accent Colors</p>
          {invoiceColors.length === 0
            ? <p className="text-sm text-white/20 text-center py-8">No invoices yet</p>
            : <div className="space-y-3">
                {invoiceColors.slice(0, 8).map(({ color, count }) => (
                  <div key={color} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md flex-shrink-0 ring-1 ring-white/10" style={{ backgroundColor: color }} />
                    <span className="text-xs text-white/40 font-mono w-20 flex-shrink-0">{color}</span>
                    <UsageBar pct={Math.round((count / maxColor) * 100)} color="bg-bronze" />
                    <span className="text-xs text-white/30 tabular-nums w-6 text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Themes & Fonts ── */}
      {tab === "themes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Theme distribution */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-5">
              Kaizen Link Themes <span className="normal-case font-normal text-white/20 ml-1">({themes.length} used)</span>
            </p>
            {themes.length === 0
              ? <p className="text-sm text-white/20 text-center py-8">No profiles yet</p>
              : <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {themes.map(({ theme, count }) => (
                    <div key={theme} className="flex items-center gap-3">
                      <span className="text-sm text-white/60 w-24 flex-shrink-0 capitalize truncate">{theme}</span>
                      <UsageBar pct={Math.round((count / maxTheme) * 100)} color="bg-blue-500" />
                      <span className="text-xs text-white/30 tabular-nums w-6 text-right flex-shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Font distribution */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-5">Font Preferences</p>
            {fonts.length === 0
              ? <p className="text-sm text-white/20 text-center py-8">No profiles yet</p>
              : <div className="space-y-3">
                  {fonts.map(({ font, count }) => (
                    <div key={font} className="flex items-center gap-3">
                      <span className="text-sm text-white/60 w-32 flex-shrink-0 truncate">{FONTS[font] || font}</span>
                      <UsageBar pct={Math.round((count / maxFont) * 100)} color="bg-emerald-500" />
                      <span className="text-xs text-white/30 tabular-nums w-6 text-right flex-shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ── Feature Access ── */}
      {tab === "features" && (
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Feature</span>
            {(["Free", "Creative Pro", "Brand Workspace"] as const).map(p => (
              <span key={p} className="text-xs font-semibold text-center"
                style={{ color: p === "Free" ? "rgba(255,255,255,0.3)" : p === "Creative Pro" ? "#10b981" : "#f59e0b" }}>
                {p}
              </span>
            ))}
          </div>
          <div className="divide-y divide-white/[0.04]">
            {PLAN_FEATURES.map((row, i) => (
              <div key={i} className="grid grid-cols-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <span className="text-sm text-white/55">{row.label}</span>
                {[row.free, row.pro, row.biz].map((val, j) => (
                  <div key={j} className="flex justify-center items-center">
                    {typeof val === "boolean" ? (
                      val
                        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                        : <XCircle    className="w-4 h-4 text-white/15" />
                    ) : (
                      <span className={cn("text-xs font-semibold tabular-nums",
                        val === "Unlimited" ? "text-emerald-400" : "text-white/40"
                      )}>{val}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Settings ─────────────────────────────────────────────────────────────────
const SettingsSection = () => {
  const [settingsTab, setSettingsTab]   = useState<"general" | "email" | "storage" | "apikeys">("general");
  const [counts, setCounts]             = useState({ users: 0, invoices: 0 });
  const [maintenance, setMaintenance]   = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [emailFromName, setEmailFromName] = useState("Kaizen Afrika");
  const [emailReplyTo, setEmailReplyTo]   = useState("");
  const [emailSaving, setEmailSaving]     = useState(false);
  const [copied, setCopied]               = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
      (supabase.from("app_settings") as any).select("key, value").in("key", ["maintenance_mode", "email_from_name", "email_reply_to"]),
    ]).then(([{ count: u }, { count: i }, { data: settings }]) => {
      setCounts({ users: u ?? 0, invoices: i ?? 0 });
      const s: any[] = settings ?? [];
      setMaintenance(s.find(r => r.key === "maintenance_mode")?.value === "true");
      setEmailFromName(s.find(r => r.key === "email_from_name")?.value || "Kaizen Afrika");
      setEmailReplyTo(s.find(r => r.key === "email_reply_to")?.value  || "");
    });
  }, []);

  const toggleMaintenance = async () => {
    setMaintenanceSaving(true);
    const next = !maintenance;
    const { error } = await (supabase.from("app_settings") as any)
      .update({ value: String(next), updated_at: new Date().toISOString() })
      .eq("key", "maintenance_mode");
    if (error) { toast.error("Failed: " + error.message); setMaintenanceSaving(false); return; }
    setMaintenance(next);
    setMaintenanceSaving(false);
    toast(next ? "⚠️ Maintenance mode ON" : "✅ Maintenance mode OFF", {
      description: next ? "Users will see a maintenance message" : "App is live for all users",
    });
  };

  const saveEmail = async () => {
    setEmailSaving(true);
    const { error } = await (supabase.from("app_settings") as any)
      .upsert([
        { key: "email_from_name", value: emailFromName, updated_at: new Date().toISOString() },
        { key: "email_reply_to",  value: emailReplyTo,  updated_at: new Date().toISOString() },
      ], { onConflict: "key" });
    if (error) { toast.error(error.message); setEmailSaving(false); return; }
    toast.success("Email settings saved");
    setEmailSaving(false);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || "";
  const anonKey     = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string || "";
  const maskKey     = (k: string) => k ? `${k.slice(0, 10)}••••••••••••••••${k.slice(-4)}` : "—";

  const STORAGE_BUCKETS = [
    { name: "avatars",     desc: "User profile & Kaizen Link images", public: true },
    { name: "deliverables",desc: "Campaign deliverable uploads",     public: false },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-white">Settings</h2>
        <p className="text-sm text-white/30">App configuration and info</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#111] rounded-xl border border-white/[0.06] w-fit flex-wrap">
        {([
          { id: "general"  as const, label: "General",   icon: Settings },
          { id: "email"    as const, label: "Email",      icon: Mail },
          { id: "storage"  as const, label: "Storage",    icon: Database },
          { id: "apikeys"  as const, label: "API Keys",   icon: Key },
        ]).map(t => (
          <button key={t.id} onClick={() => setSettingsTab(t.id)}
            className={cn("px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              settingsTab === t.id ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {settingsTab === "general" && (
        <div className="space-y-5">
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white/60">App Info</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: "App",             value: "Kaizen Afrika MVP" },
                { label: "Stack",           value: "React · Supabase · Tailwind" },
                { label: "Auth",            value: "Supabase Auth + MFA" },
                { label: "Total Users",     value: String(counts.users) },
                { label: "Total Invoices",  value: String(counts.invoices) },
                { label: "Admin gating",    value: "is_admin = true on profiles" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <span className="text-sm text-white/35">{r.label}</span>
                  <span className="text-sm text-white/65 font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white/60">External Dashboards</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: "Supabase Studio", hint: "DB · Auth · Storage · Edge Functions", href: "https://supabase.com/dashboard" },
                { label: "Resend",          hint: "Transactional email / SMTP",            href: "https://resend.com/emails" },
                { label: "Paystack",        hint: "Payments & subscriptions",              href: "https://dashboard.paystack.com" },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <p className="text-sm text-white/65 group-hover:text-white/85 transition-colors">{l.label}</p>
                    <p className="text-xs text-white/25 mt-0.5">{l.hint}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-white/30 group-hover:text-bronze bg-white/[0.04] border border-white/[0.06] group-hover:border-bronze/30 px-2 py-1 rounded-lg transition-colors">
                    <ArrowUpRight className="w-3 h-3" /> Open
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Maintenance mode */}
          <div className={cn("border rounded-2xl p-5 transition-all", maintenance ? "bg-amber-500/10 border-amber-500/30" : "bg-[#111] border-white/[0.06]")}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={cn("text-sm font-semibold mb-1", maintenance ? "text-amber-400" : "text-white/70")}>Maintenance Mode</p>
                <p className="text-xs text-white/35 leading-relaxed">
                  {maintenance ? "App is in maintenance — users see a maintenance message." : "App is live. Toggle to put it in maintenance."}
                </p>
              </div>
              <button onClick={toggleMaintenance} disabled={maintenanceSaving}
                className={cn("relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200", maintenance ? "bg-amber-500" : "bg-white/10")}>
                <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200", maintenance && "translate-x-5")} />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500/8 to-transparent border border-red-500/15 rounded-2xl p-5">
            <p className="text-sm font-semibold text-red-400 mb-1.5">Admin Access</p>
            <p className="text-xs text-white/35 leading-relaxed">
              Only accounts with <code className="bg-white/[0.07] px-1.5 py-0.5 rounded-md text-white/55 font-mono text-[11px]">is_admin = true</code> in the{" "}
              <code className="bg-white/[0.07] px-1.5 py-0.5 rounded-md text-white/55 font-mono text-[11px]">profiles</code> table can access this dashboard.
            </p>
          </div>
        </div>
      )}

      {/* ── Email ── */}
      {settingsTab === "email" && (
        <div className="space-y-5">
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Sender Configuration</p>
            <div className="space-y-1">
              <label className="text-xs text-white/40">From name</label>
              <Input value={emailFromName} onChange={e => setEmailFromName(e.target.value)}
                placeholder="Kaizen Afrika"
                className="bg-[#0d0d0d] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus-visible:ring-bronze/30" />
              <p className="text-[11px] text-white/20">Displayed as the sender name in all outgoing emails</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/40">Reply-to email</label>
              <Input value={emailReplyTo} onChange={e => setEmailReplyTo(e.target.value)}
                placeholder="support@kaizenafrika.app"
                className="bg-[#0d0d0d] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus-visible:ring-bronze/30" />
              <p className="text-[11px] text-white/20">Users replying to emails will reach this address</p>
            </div>
            <Button onClick={saveEmail} disabled={emailSaving}
              className="bg-bronze hover:bg-bronze/90 text-white rounded-xl h-9 px-5 text-sm">
              {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>

          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white/60">SMTP Provider</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: "Provider",  value: "Resend" },
                { label: "Host",      value: "smtp.resend.com" },
                { label: "Port",      value: "465 (SSL)" },
                { label: "Username",  value: "resend" },
                { label: "Configured via", value: "Supabase Auth → SMTP settings" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs text-white/35">{r.label}</span>
                  <span className="text-xs text-white/60 font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Storage ── */}
      {settingsTab === "storage" && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-sm font-semibold text-white/60">Storage Buckets</p>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-bronze bg-white/[0.04] border border-white/[0.06] hover:border-bronze/30 px-2 py-1 rounded-lg transition-colors">
                <ArrowUpRight className="w-3 h-3" /> Manage in Supabase
              </a>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {STORAGE_BUCKETS.map(b => (
                <div key={b.name} className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-sm text-white/70 font-mono font-medium">{b.name}</p>
                    <p className="text-xs text-white/30 mt-0.5">{b.desc}</p>
                  </div>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    b.public
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : "bg-white/[0.05] text-white/30 border-white/[0.06]"
                  )}>{b.public ? "Public" : "Private"}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/20 px-1">Bucket policies and file management are handled in Supabase Storage dashboard.</p>
        </div>
      )}

      {/* ── API Keys ── */}
      {settingsTab === "apikeys" && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white/60">Supabase</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: "Project URL", value: supabaseUrl,  key: "url" },
                { label: "Anon Key",    value: anonKey,      key: "anon" },
              ].map(r => (
                <div key={r.label} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-white/35 mb-0.5">{r.label}</p>
                    <p className="text-xs text-white/55 font-mono truncate">{maskKey(r.value)}</p>
                  </div>
                  <button onClick={() => copyText(r.value, r.key)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0"
                    style={{ color: copied === r.key ? "#10b981" : "rgba(255,255,255,0.3)", borderColor: copied === r.key ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)" }}>
                    {copied === r.key ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === r.key ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white/60">External Services</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: "Resend API Key",    hint: "Manage in Resend dashboard",    href: "https://resend.com/api-keys" },
                { label: "Paystack Secret",   hint: "Manage in Paystack dashboard",  href: "https://dashboard.paystack.com/#/settings/developer" },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{l.label}</p>
                    <p className="text-xs text-white/25 mt-0.5">{l.hint}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-white/25 group-hover:text-bronze bg-white/[0.03] border border-white/[0.06] group-hover:border-bronze/30 px-2 py-1 rounded-lg transition-colors">
                    <ArrowUpRight className="w-3 h-3" /> Open
                  </span>
                </a>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-white/15 px-1">Secret keys are never stored in the browser. They live in Supabase Edge Function secrets and your CI/CD environment.</p>
        </div>
      )}
    </div>
  );
};

// ─── Errors Section ───────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  window_error:      { label: "JS Error",        color: "text-red-400"    },
  unhandled_promise: { label: "Promise",         color: "text-orange-400" },
  react_boundary:    { label: "React Crash",     color: "text-pink-400"   },
  manual:            { label: "Manual",          color: "text-blue-400"   },
  unknown:           { label: "Unknown",         color: "text-white/40"   },
};

const ErrorsSection = () => {
  const [errors, setErrors]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<any>(null);
  const [filter, setFilter]           = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch]           = useState("");
  const [resolving, setResolving]     = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [stats, setStats]             = useState({ total: 0, unresolved: 0, today: 0, users: 0 });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("error_logs" as any) as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = data ?? [];
    setErrors(rows);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount    = rows.filter((e: any) => new Date(e.created_at) >= today).length;
    const unresolvedCnt = rows.filter((e: any) => !e.resolved).length;
    const uniqueUsers   = new Set(rows.filter((e: any) => e.user_id).map((e: any) => e.user_id)).size;
    setStats({ total: rows.length, unresolved: unresolvedCnt, today: todayCount, users: uniqueUsers });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id: string, resolved: boolean) => {
    setResolving(id);
    await (supabase.from("error_logs" as any) as any)
      .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null })
      .eq("id", id);
    setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved, resolved_at: resolved ? new Date().toISOString() : null } : e));
    if (selected?.id === id) setSelected((s: any) => ({ ...s, resolved }));
    setStats(s => ({ ...s, unresolved: s.unresolved + (resolved ? -1 : 1) }));
    setResolving(null);
  };

  const deleteError = async (id: string) => {
    setDeleting(id);
    await (supabase.from("error_logs" as any) as any).delete().eq("id", id);
    setErrors(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeleting(null);
  };

  const resolveAll = async () => {
    const ids = filtered.filter(e => !e.resolved).map(e => e.id);
    if (!ids.length) return;
    await (supabase.from("error_logs" as any) as any)
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .in("id", ids);
    setErrors(prev => prev.map(e => ids.includes(e.id) ? { ...e, resolved: true } : e));
    setStats(s => ({ ...s, unresolved: 0 }));
  };

  const filtered = errors.filter(e => {
    if (filter === "unresolved" && e.resolved) return false;
    if (filter === "resolved" && !e.resolved) return false;
    if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.message?.toLowerCase().includes(q) ||
             e.user_email?.toLowerCase().includes(q) ||
             e.url?.toLowerCase().includes(q);
    }
    return true;
  });

  const STAT_CARDS = [
    { label: "Total Errors",   value: stats.total,      color: "text-white"        },
    { label: "Unresolved",     value: stats.unresolved, color: "text-red-400"      },
    { label: "Today",          value: stats.today,      color: "text-orange-400"   },
    { label: "Affected Users", value: stats.users,      color: "text-blue-400"     },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-full">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">{c.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search message, email, URL…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-bronze/50"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all","unresolved","resolved"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-bronze text-white" : "bg-white/5 text-white/50 hover:text-white"
              }`}>
              {f}
            </button>
          ))}
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-bronze/50"
          >
            <option value="all">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {stats.unresolved > 0 && (
            <button onClick={resolveAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
              Resolve all
            </button>
          )}
          <button onClick={load}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/50 hover:text-white transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-bronze" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Bug className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No errors found</p>
        </div>
      ) : (
        <div className="flex gap-4 min-h-0" style={{ height: "calc(100dvh - 300px)" }}>
          {/* Error list */}
          <div className={cn("flex-1 overflow-y-auto space-y-2 min-w-0", selected && "hidden md:flex md:flex-col")}>
            {filtered.map(e => {
              const src = SOURCE_LABELS[e.source] ?? SOURCE_LABELS.unknown;
              const isSelected = selected?.id === e.id;
              return (
                <div
                  key={e.id}
                  onClick={() => setSelected(isSelected ? null : e)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-bronze/60 bg-bronze/5"
                      : e.resolved
                        ? "border-white/5 bg-white/3 opacity-50 hover:opacity-70"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${src.color}`}>
                          {src.label}
                        </span>
                        {e.resolved && (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-semibold">
                            Resolved
                          </span>
                        )}
                        <span className="text-[10px] text-white/25 ml-auto">
                          {format(new Date(e.created_at), "dd MMM HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-white/85 font-medium leading-snug truncate">{e.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {e.user_email && (
                          <span className="text-[10px] text-white/35 truncate">{e.user_email}</span>
                        )}
                        {e.url && (
                          <span className="text-[10px] text-white/25 truncate">{
                            e.url.replace(/^https?:\/\/[^/]+/, "")
                          }</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0" onClick={ev => ev.stopPropagation()}>
                      <button
                        onClick={() => resolve(e.id, !e.resolved)}
                        disabled={resolving === e.id}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-[10px] font-bold ${
                          e.resolved
                            ? "bg-white/5 text-white/30 hover:bg-white/10"
                            : "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                        }`}
                        title={e.resolved ? "Unresolve" : "Resolve"}
                      >
                        {resolving === e.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteError(e.id)}
                        disabled={deleting === e.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        {deleting === e.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full md:w-[380px] flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-4 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-white/30 hover:text-white md:hidden">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="text-xs">Back</span>
                </button>
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Error Detail</p>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white hidden md:block">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Meta */}
              <div className="space-y-2">
                {[
                  { label: "Time",    value: format(new Date(selected.created_at), "dd MMM yyyy HH:mm:ss") },
                  { label: "Source",  value: SOURCE_LABELS[selected.source]?.label ?? selected.source },
                  { label: "Version", value: selected.app_version ?? "—" },
                  { label: "User",    value: selected.user_email ?? "Anonymous" },
                  { label: "URL",     value: selected.url ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider w-16 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-xs text-white/70 break-all">{value}</span>
                  </div>
                ))}
              </div>

              {/* Message */}
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Message</p>
                <p className="text-sm text-red-300 font-medium break-words">{selected.message}</p>
              </div>

              {/* Stack trace */}
              {selected.stack && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Stack Trace</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(selected.stack)}
                      className="text-[10px] text-white/30 hover:text-bronze flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <pre className="text-[10px] text-white/50 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-48">
                    {selected.stack}
                  </pre>
                </div>
              )}

              {/* Component stack */}
              {selected.context?.componentStack && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Component Stack</p>
                  <pre className="text-[10px] text-white/40 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-32">
                    {String(selected.context.componentStack)}
                  </pre>
                </div>
              )}

              {/* User Agent */}
              {selected.user_agent && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">User Agent</p>
                  <p className="text-[10px] text-white/35 break-all">{selected.user_agent}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => resolve(selected.id, !selected.resolved)}
                  disabled={resolving === selected.id}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    selected.resolved
                      ? "bg-white/5 text-white/40 hover:bg-white/10"
                      : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  }`}
                >
                  {resolving === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {selected.resolved ? "Unresolve" : "Mark Resolved"}
                </button>
                <button
                  onClick={() => deleteError(selected.id)}
                  disabled={deleting === selected.id}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {deleting === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Security Section ─────────────────────────────────────────────────────────
type SecurityFilter = "all" | "signups" | "logins" | "failed";

const SecuritySection = () => {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<SecurityFilter | null>(null);

  useEffect(() => {
    (async () => {
      const { data: res } = await supabase.rpc("admin_security_overview" as any);
      setData(res);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spin />;

  const events: any[] = data?.recent_auth_events || [];
  const admins: any[] = data?.admin_users || [];

  const failed  = events.filter(e => e.action?.includes("failed") || e.action?.includes("invalid"));
  const signups = events.filter(e => e.action === "user_signedup");
  const logins  = events.filter(e => e.action === "login");

  const filteredEvents = filter === "signups" ? signups
    : filter === "logins"  ? logins
    : filter === "failed"  ? failed
    : events;

  const stats = [
    { key: "all" as SecurityFilter,     label: "Total Users",      value: data?.total_users ?? 0,       color: "text-white",        border: "border-white/20"       },
    { key: "signups" as SecurityFilter, label: "New Signups (7d)", value: data?.recent_signups_7d ?? 0, color: "text-emerald-400",  border: "border-emerald-400/40" },
    { key: "logins" as SecurityFilter,  label: "Logins (7d)",      value: logins.length,                color: "text-blue-400",     border: "border-blue-400/40"    },
    { key: "failed" as SecurityFilter,  label: "Failed Attempts",  value: failed.length,                color: failed.length > 0 ? "text-red-400" : "text-white/30", border: "border-red-400/40" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="font-poppins font-semibold text-white text-lg">Security Overview</h2>
        <p className="text-xs text-white/30 mt-0.5">Last 7 days · Live from auth logs</p>
      </div>

      {/* Stats row — clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ key, label, value, color, border }) => (
          <button
            key={key}
            onClick={() => setFilter(f => f === key ? null : key)}
            className={cn(
              "bg-white/[0.03] border rounded-xl p-4 text-left transition-all hover:bg-white/[0.06]",
              filter === key ? border : "border-white/[0.06]"
            )}
          >
            <p className="text-[11px] text-white/30 font-medium mb-1">{label}</p>
            <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
            {filter === key && <p className="text-[10px] text-white/30 mt-1">Filtering below ↓</p>}
          </button>
        ))}
      </div>

      {/* Admin users */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Admin Accounts ({admins.length})</p>
        </div>
        {admins.length === 0 ? (
          <p className="px-4 py-4 text-sm text-white/30">No admin accounts found.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {admins.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-bronze/20 flex items-center justify-center text-[11px] font-bold text-bronze flex-shrink-0">
                  {(a.display_name?.[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{a.display_name || "—"}</p>
                  <p className="text-[11px] text-white/30 truncate">{a.email || a.id}</p>
                </div>
                <span className="text-[10px] bg-bronze/10 text-bronze px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Admin</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auth events — filtered */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            {filter === "signups" ? "New Signups"
              : filter === "logins" ? "Logins"
              : filter === "failed" ? "Failed Attempts"
              : "Auth Events"} ({filteredEvents.length})
          </p>
          {filter && filter !== "all" && (
            <button onClick={() => setFilter(null)} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
              Clear filter ✕
            </button>
          )}
        </div>
        {filteredEvents.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/30 text-center">No events found.</p>
        ) : (
          <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
            {filteredEvents.slice(0, 30).map((e: any) => {
              const isFail = e.action?.includes("failed") || e.action?.includes("invalid");
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isFail ? "bg-red-400" : "bg-emerald-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/70 font-medium">{e.action || "unknown"}</p>
                    <p className="text-[11px] text-white/25 truncate">{e.email || "anonymous"} · {e.ip_address || "—"}</p>
                  </div>
                  <p className="text-[10px] text-white/20 flex-shrink-0">
                    {e.created_at ? new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Security Checklist</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {[
            { label: "RLS enabled on all tables",              done: true  },
            { label: "Privilege escalation blocked (profiles)", done: true  },
            { label: "Dira memory RPC secured",                done: true  },
            { label: "Prompt injection sanitization",          done: true  },
            { label: "Storage bucket ownership enforced",      done: true  },
            { label: "Secret leak CI check",                   done: true  },
            { label: "Email verification enforced",            done: true  },
            { label: "2FA available (enforce in Dashboard)",   done: false },
            { label: "Password strength policy (Dashboard)",   done: false },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3">
              {done
                ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                : <XCircle    className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              <p className={cn("text-sm", done ? "text-white/70" : "text-amber-300")}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview",       label: "Overview",     icon: LayoutDashboard },
  { id: "users",          label: "Users",        icon: Users },
  { id: "billing",        label: "Billing",      icon: CreditCard },
  { id: "documents",      label: "Documents",    icon: FileText },
  { id: "customization",  label: "Templates",    icon: Palette },
  { id: "support",        label: "Support",      icon: MessageSquare },
  { id: "settings",       label: "Settings",     icon: Settings },
  { id: "security",       label: "Security",     icon: Shield },
  { id: "errors",         label: "Errors",       icon: Bug },
];

const Admin = () => {
  const navigate = useNavigate();
  const [authed, setAuthed]           = useState(false);
  const [booting, setBooting]         = useState(true);
  const [section, setSection]         = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount]         = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [upgradeCount, setUpgradeCount]         = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }

      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", session.user.id).single();

      if (!(prof as any)?.is_admin) { navigate("/"); return; }

      const [{ count: vCount }, { count: tCount }, { count: uCount }] = await Promise.all([
        supabase.from("verification_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets" as any).select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("admin_notifications" as any).select("id", { count: "exact", head: true }).eq("read", false).eq("type", "upgrade"),
      ]);
      setPendingCount(vCount ?? 0);
      setOpenTicketsCount(tCount ?? 0);
      setUpgradeCount(uCount ?? 0);

      setAuthed(true);
      setBooting(false);
    })();
  }, []);

  // ── Realtime: toast + badge when new feedback or verification arrives ──
  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feedback" }, (payload) => {
        const type = (payload.new as any)?.type === "feature" ? "Feature request" : "New feedback";
        toast(`📬 ${type} received`, {
          description: "Check Support → Feedback",
          action: { label: "View", onClick: () => setSection("support") },
          duration: 8000,
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "verification_requests" }, () => {
        setPendingCount(c => c + 1);
        toast("🔖 New verification request", {
          description: "Pending your review",
          action: { label: "Review", onClick: () => setSection("support") },
          duration: 8000,
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, (payload) => {
        setOpenTicketsCount(c => c + 1);
        toast("🎫 New support ticket", {
          description: (payload.new as any)?.subject || "A user needs help",
          action: { label: "View", onClick: () => setSection("support") },
          duration: 8000,
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, (payload) => {
        const n = payload.new as any;
        if (n?.type !== "upgrade") return;
        setUpgradeCount(c => c + 1);
        const planLabel = (n.plan ?? "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        toast(`💳 New ${planLabel} upgrade`, {
          description: n.user_name || n.user_email || "A user just upgraded",
          action: { label: "View", onClick: () => setSection("billing") },
          duration: 10000,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authed]);

  if (booting) return (
    <div className="min-h-dvh bg-[#080808] flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-bronze animate-spin" />
    </div>
  );
  if (!authed) return null;

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex font-sans overflow-x-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-[220px] bg-[#0d0d0d] border-r border-white/[0.05] z-30 flex flex-col transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Brand */}
        <button
          onClick={() => { setSection("overview"); setSidebarOpen(false); }}
          className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.05] w-full text-left hover:bg-white/[0.03] transition-colors group"
        >
          <div>
            <p className="font-vollkorn text-white font-bold text-sm leading-none">Kaizen Afrika</p>
            <p className="text-[9px] text-white/25 font-poppins uppercase tracking-[0.12em] mt-0.5">Admin</p>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setSidebarOpen(false);
                if (id === "billing" && upgradeCount > 0) {
                  setUpgradeCount(0);
                  supabase.from("admin_notifications" as any)
                    .update({ read: true })
                    .eq("type", "upgrade")
                    .eq("read", false)
                    .then(() => {});
                }
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                section === id
                  ? "bg-white/[0.07] text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", section === id ? "text-bronze" : "")} />
                {label}
              </div>
              {id === "support" && (pendingCount + openTicketsCount) > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                  {(pendingCount + openTicketsCount) > 9 ? "9+" : (pendingCount + openTicketsCount)}
                </span>
              )}
              {id === "billing" && upgradeCount > 0 && (
                <span className="bg-bronze text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                  {upgradeCount > 9 ? "9+" : upgradeCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-5 pt-3 border-t border-white/[0.05]">
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-[220px] min-h-dvh flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 h-14 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.05] px-4 md:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="icon"
              className="lg:hidden h-9 w-9 text-white/40 hover:text-white hover:bg-white/8 rounded-xl"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            {/* Logo — mobile only (desktop sidebar always shows it) */}
            <button
              onClick={() => setSection("overview")}
              className="flex items-center gap-2 group lg:hidden"
            >
              <span className="font-vollkorn text-sm font-bold text-white/70 group-hover:text-white transition-colors">Kaizen Afrika</span>
            </button>
            <div className="w-px h-4 bg-white/10 hidden sm:block lg:hidden" />
            <div>
              <h1 className="text-sm font-semibold text-white leading-none">{NAV.find(n => n.id === section)?.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Shield className="w-3 h-3 text-bronze" />
              <span className="text-[10px] text-white/30 font-medium">Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={cn(
          "flex-1 overflow-y-auto",
          section === "users" && "flex flex-col overflow-hidden"
        )}>
          {section === "overview"       && <OverviewSection onNavigate={setSection} />}
          {section === "users"          && <UsersSection />}
          {section === "billing"        && <BillingSection />}
          {section === "documents"      && <DocumentsSection />}
          {section === "customization"  && <TemplatesSection />}
          {section === "support"        && <SupportSection onTicketClosed={() => setOpenTicketsCount(c => Math.max(0, c - 1))} onVerificationResolved={() => setPendingCount(c => Math.max(0, c - 1))} />}
          {section === "settings"       && <SettingsSection />}
          {section === "security"       && <SecuritySection />}
          {section === "errors"         && <ErrorsSection />}
        </main>
      </div>
    </div>
  );
};

export default Admin;
