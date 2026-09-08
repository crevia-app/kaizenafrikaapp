import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  FileText,
  Send,
  Share2,
  Eye,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Receipt,
  Copy,
  Filter,
  ArrowUpDown,
  TrendingUp,
  DollarSign,
  Sparkles,
  SlidersHorizontal,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, isAfter } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateInvoiceDialog from "./CreateInvoiceDialog";
import InvoiceSettingsDialog from "./InvoiceSettingsDialog";
import { useSubscription } from "@/hooks/use-subscription";
import InvoicePreviewDialog from "./InvoicePreviewDialog";
import ReceiptPreviewDialog from "./ReceiptPreviewDialog";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  created_at: string;
  accent_color: string | null;
  folder_id?: string | null;
}

interface InvoiceFolder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  invoiceCount?: number;
}

const SmartInvoicesTab = ({ initialInvoiceId }: { initialInvoiceId?: string } = {}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount">("newest");
  const { limits, isFree, invoicesUsedThisMonth } = useSubscription();
  const invoiceLimitReached = isFree && invoicesUsedThisMonth >= limits.invoicesPerMonth;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [pendingDeleteInvoiceId, setPendingDeleteInvoiceId] = useState<string | null>(null);
  const [pendingDeleteFolder, setPendingDeleteFolder]       = useState<InvoiceFolder | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const [autoShareInvoice, setAutoShareInvoice] = useState<Invoice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Folder navigation state
  const [folders, setFolders] = useState<InvoiceFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<InvoiceFolder | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");

  const [businessSettings, setBusinessSettings] = useState<{
    business_name: string;
    business_email: string;
    business_phone: string;
    business_address: string;
    logo_url: string;
    tax_id: string;
    default_currency: string;
    default_tax_rate: number;
    default_payment_terms: string;
  } | null>(null);

  const fetchInvoices = async (folderId: string | null = null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load invoices");
      return;
    }

    // Auto-mark overdue invoices
    const now = new Date();
    const all = ((data || []) as any[]).map(inv =>
      inv.status === "sent" && isAfter(now, new Date(inv.due_date))
        ? { ...inv, status: "overdue" }
        : inv
    );

    // Filter to current folder — client-side so backward-compat if column not yet migrated
    const filtered = folderId
      ? all.filter(inv => inv.folder_id === folderId)
      : all.filter(inv => !inv.folder_id);

    setInvoices(filtered);
    setLoading(false);
  };

  const fetchFolders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const [{ data, error }, { data: invRows }] = await Promise.all([
      (supabase as any)
        .from("invoice_folders")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name"),
      supabase
        .from("invoices")
        .select("folder_id")
        .eq("user_id", session.user.id)
        .not("folder_id", "is", null),
    ]);
    if (error) { console.error("fetchFolders:", error); setFolders([]); return; }
    if (!data) { setFolders([]); return; }
    const countMap: Record<string, number> = {};
    (invRows || []).forEach((inv: any) => {
      countMap[inv.folder_id] = (countMap[inv.folder_id] || 0) + 1;
    });
    setFolders((data as InvoiceFolder[]).map(f => ({ ...f, invoiceCount: countMap[f.id] ?? 0 })));
  };

  const createFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCreatingFolder(false); return; }
    const { data: newFolder, error } = await (supabase as any)
      .from("invoice_folders")
      .insert({ name, user_id: session.user.id })
      .select()
      .single();
    setCreatingFolder(false);
    if (error) { toast.error("Failed to create folder"); return; }
    setFolders(prev => [...prev, { ...newFolder, invoiceCount: 0 }].sort((a: InvoiceFolder, b: InvoiceFolder) => a.name.localeCompare(b.name)));
    toast.success("Folder created");
    setCreateFolderOpen(false);
    setFolderName("");
  };

  const deleteFolder = async (folder: InvoiceFolder) => {
    const { error } = await (supabase as any)
      .from("invoice_folders")
      .delete()
      .eq("id", folder.id);
    if (error) { toast.error("Failed to delete folder"); return; }
    toast.success("Folder deleted — invoices moved to root");
    fetchFolders();
    fetchInvoices(null);
  };

  const renameFolder = async (folder: InvoiceFolder) => {
    const name = renameFolderValue.trim();
    if (!name) return;
    const { error } = await (supabase as any)
      .from("invoice_folders")
      .update({ name })
      .eq("id", folder.id);
    if (error) { toast.error("Failed to rename folder"); return; }
    toast.success("Folder renamed");
    setRenamingFolderId(null);
    fetchFolders();
    if (currentFolder?.id === folder.id) setCurrentFolder({ ...currentFolder, name });
  };

  const navigateToFolder = (folder: InvoiceFolder) => {
    setCurrentFolderId(folder.id);
    setCurrentFolder(folder);
    fetchInvoices(folder.id);
  };

  const navigateToRoot = () => {
    setCurrentFolderId(null);
    setCurrentFolder(null);
    fetchInvoices(null);
    fetchFolders();
  };

  useEffect(() => {
    Promise.all([fetchInvoices(currentFolderId), fetchFolders()]);
    fetchBusinessSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  // Auto-open a specific invoice when navigating from a notification
  useEffect(() => {
    if (!initialInvoiceId || invoices.length === 0) return;
    const target = invoices.find((inv) => inv.id === initialInvoiceId);
    if (target) setPreviewInvoice(target);
  }, [initialInvoiceId, invoices]);

  const fetchBusinessSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("business_settings")
      .select("business_name, business_email, business_phone, business_address, logo_url, tax_id, default_currency, default_tax_rate, default_payment_terms")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (data) setBusinessSettings(data as any);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete invoice");
      return;
    }
    toast.success("Invoice deleted");
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDuplicate = async (invoice: Invoice) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get items for the invoice
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id);

    const date = new Date();
    const invNum = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

    const { data: newInvoice, error } = await supabase
      .from("invoices")
      .insert({
        user_id: session.user.id,
        invoice_number: invNum,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: invoice.due_date,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        total: invoice.total,
        status: "draft",
      })
      .select()
      .single();

    if (error || !newInvoice) {
      if (error?.message?.includes("invoice_limit_reached")) {
        toast.error("Monthly limit reached", {
          description: `Free plan allows ${limits.invoicesPerMonth} invoices per month. Upgrade to Pro or Business for unlimited.`,
        });
      } else {
        toast.error("Failed to duplicate invoice");
      }
      return;
    }

    if (items && items.length > 0) {
      await supabase.from("invoice_items").insert(
        items.map((item) => ({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }))
      );
    }

    toast.success("Invoice duplicated as draft");
    fetchInvoices(currentFolderId);
  };

  const handleShare = async (invoice: Invoice) => {
    const publicUrl = `${window.location.origin}/invoice/public/${invoice.id}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Invoice ${invoice.invoice_number}`, text: "View your invoice from Kaizen Afrika securely online:", url: publicUrl });
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          await navigator.clipboard.writeText(publicUrl);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`Invoice marked as ${status}`);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      draft: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", icon: <FileText className="h-3 w-3" /> },
      sent: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: <Send className="h-3 w-3" /> },
      paid: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
      overdue: { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: <AlertCircle className="h-3 w-3" /> },
      cancelled: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500 dark:text-gray-400", icon: <XCircle className="h-3 w-3" /> },
    };

    const style = styles[status] || styles.draft;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency || "KES",
    }).format(amount);
  };

  const filteredInvoices = invoices
    .filter((invoice) => {
      const matchesSearch = invoice.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "amount") return Number(b.total) - Number(a.total);
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    pending: invoices.filter((i) => i.status === "sent").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    totalValue: invoices.reduce((acc, i) => acc + Number(i.total), 0),
    paidValue: invoices.filter((i) => i.status === "paid").reduce((acc, i) => acc + Number(i.total), 0),
    outstandingValue: invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((acc, i) => acc + Number(i.total), 0),
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded-xl w-2/5" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-2xl" />
            ))}
          </div>
          <div className="h-24 bg-muted rounded-2xl" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-1">
            <button
              onClick={navigateToRoot}
              className="font-vollkorn text-2xl md:text-3xl font-bold tracking-tight text-foreground hover:text-bronze transition-colors"
            >
              Invoices
            </button>
            {currentFolder && (
              <>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                <span className="font-vollkorn text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate max-w-[200px] md:max-w-xs">
                  {currentFolder.name}
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {currentFolder
              ? `Inside ${currentFolder.name} · ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`
              : "Create, send, and track professional invoices"}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="h-10 w-10 flex-shrink-0"
            title="Invoice settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 h-10 rounded-xl bg-bronze hover:bg-bronze/90 shadow-lg shadow-bronze/20 hover:shadow-xl hover:shadow-bronze/30 transition-all flex-1 md:flex-none">
                <Plus className="h-4 w-4" />
                New
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              {!currentFolderId && (
                <DropdownMenuItem
                  onClick={() => { setFolderName(""); setCreateFolderOpen(true); }}
                  className="rounded-lg gap-2"
                >
                  <FolderPlus className="h-4 w-4 text-bronze" />
                  New Folder
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  if (invoiceLimitReached) {
                    toast.error("Monthly limit reached", {
                      description: `Free plan allows ${limits.invoicesPerMonth} invoices per month. Upgrade to Pro or Business for unlimited.`,
                    });
                    return;
                  }
                  setCreateDialogOpen(true);
                }}
                className="rounded-lg gap-2"
              >
                <FileText className="h-4 w-4 text-bronze" />
                New Invoice
                {isFree && (
                  <span className={`ml-auto text-[10px] ${invoiceLimitReached ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {invoiceLimitReached ? "Limit reached" : `${limits.invoicesPerMonth - invoicesUsedThisMonth} left`}
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Card className="p-4 md:p-5 border-0 bg-gradient-to-br from-bronze/10 via-bronze/5 to-transparent shadow-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="p-2 rounded-xl bg-bronze/15 flex-shrink-0">
              <Receipt className="h-4 w-4 text-bronze" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none text-foreground md:text-2xl">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 border-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none text-foreground md:text-2xl">{stats.paid}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Paid</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent shadow-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 flex-shrink-0">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none text-foreground md:text-2xl">{stats.pending}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 border-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent shadow-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/15 flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none text-foreground md:text-2xl">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Summary */}
      <Card className="border-0 bg-gradient-to-r from-bronze/8 via-background to-emerald-500/8 shadow-sm overflow-hidden">
        {/* Mobile: each metric is a full-width row (label left, amount right) */}
        <div className="sm:hidden divide-y divide-border/40">
          {[
            { icon: <DollarSign className="h-4 w-4 text-muted-foreground" />, label: "Total Revenue", value: formatCurrency(stats.totalValue, "KES"), color: "text-foreground" },
            { icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, label: "Collected", value: formatCurrency(stats.paidValue, "KES"), color: "text-emerald-500" },
            { icon: <Clock className="h-4 w-4 text-amber-500" />, label: "Outstanding", value: formatCurrency(stats.outstandingValue, "KES"), color: "text-amber-500" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                {item.icon}
                <p className="text-sm text-muted-foreground font-medium truncate">{item.label}</p>
              </div>
              <p className={`text-sm font-bold tabular-nums flex-shrink-0 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
        {/* Desktop: 3-column grid */}
        <div className="hidden sm:grid grid-cols-3 divide-x divide-border/40">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold leading-tight text-foreground md:text-3xl truncate">
              {formatCurrency(stats.totalValue, "KES")}
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-muted-foreground font-medium">Collected</p>
            </div>
            <p className="text-2xl font-bold leading-tight text-emerald-500 md:text-3xl truncate">
              {formatCurrency(stats.paidValue, "KES")}
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-sm text-muted-foreground font-medium">Outstanding</p>
            </div>
            <p className="text-2xl font-bold leading-tight text-amber-500 md:text-3xl truncate">
              {formatCurrency(stats.outstandingValue, "KES")}
            </p>
          </div>
        </div>
      </Card>

      {/* Search, Filter & Sort */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-base"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 h-11">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground flex-shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="flex-1 h-11">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="amount">Highest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Folders Grid — shown at root only */}
      {!currentFolderId && folders.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5">
            Folders
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                <button
                  onClick={() => navigateToFolder(folder)}
                  className="w-full flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-border/50 bg-card hover:border-bronze/40 hover:bg-bronze/5 hover:shadow-md hover:shadow-bronze/5 transition-all duration-200 text-left"
                >
                  <FolderOpen className="h-8 w-8 text-bronze/60 group-hover:text-bronze transition-colors" />
                  {renamingFolderId === folder.id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); renameFolder(folder); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full"
                    >
                      <input
                        autoFocus
                        value={renameFolderValue}
                        onChange={(e) => setRenameFolderValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setRenamingFolderId(null)}
                        className="w-full h-6 text-xs rounded-md border border-bronze/40 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-bronze/40"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </form>
                  ) : (
                    <div className="w-full min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">{folder.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {folder.invoiceCount ?? 0} invoice{(folder.invoiceCount ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </button>

                {/* Folder context menu */}
                <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-background/80 border border-border/60 shadow-sm text-foreground hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => { setRenamingFolderId(folder.id); setRenameFolderValue(folder.name); }}
                        className="rounded-lg gap-2 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setPendingDeleteFolder(folder)}
                        className="rounded-lg gap-2 text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices section label */}
      {!currentFolderId && (invoices.length > 0 || folders.length > 0) && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5 -mb-4">
          Invoices
        </p>
      )}

      {/* Invoices List */}
      {filteredInvoices.length > 0 && (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const isOverdue = invoice.status === "overdue";
            
            return (
              <Card
                key={invoice.id}
                className={`group p-4 md:p-5 [@media(hover:hover)]:hover:shadow-lg transition-all duration-300 border cursor-pointer active:opacity-80 ${
                  isOverdue ? "border-red-200 dark:border-red-900/50 [@media(hover:hover)]:hover:border-red-300" : "[@media(hover:hover)]:hover:border-bronze/30"
                }`}
                onClick={() => setPreviewInvoice(invoice)}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-3 rounded-2xl flex-shrink-0 transition-colors ${
                      isOverdue ? "bg-red-100 dark:bg-red-900/20" : "bg-bronze/10 [@media(hover:hover)]:group-hover:bg-bronze/15"
                    }`}>
                      {isOverdue ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-bronze" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {invoice.invoice_number}
                        </h4>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.client_name}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Issued {format(new Date(invoice.issue_date), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                          Due {format(new Date(invoice.due_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end" onClick={(e) => e.stopPropagation()}>
                    <div className="text-left md:text-right">
                      <p className="text-base font-bold text-foreground">
                        {formatCurrency(Number(invoice.total), invoice.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-11 w-11 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setPreviewInvoice(invoice)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingInvoice(invoice)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(invoice)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!["paid", "cancelled"].includes(invoice.status) && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, "paid")}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {invoice.status === "paid" && (
                          <DropdownMenuItem onClick={() => setReceiptInvoice(invoice)}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Generate Receipt
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setPendingDeleteInvoiceId(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateInvoiceDialog
        open={createDialogOpen || !!editingInvoice}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingInvoice(null);
        }}
        editingInvoice={editingInvoice}
        folderId={currentFolderId}
        onSuccess={() => {
          fetchInvoices(currentFolderId);
        }}
        businessSettings={businessSettings}
      />

      <InvoicePreviewDialog
        open={!!previewInvoice}
        onOpenChange={(open) => !open && setPreviewInvoice(null)}
        invoice={previewInvoice}
      />

      <ReceiptPreviewDialog
        open={!!receiptInvoice}
        onOpenChange={(open) => !open && setReceiptInvoice(null)}
        invoice={receiptInvoice}
      />
      <InvoicePreviewDialog
        open={!!autoShareInvoice}
        onOpenChange={(open) => { if (!open) setAutoShareInvoice(null); }}
        invoice={autoShareInvoice}
        autoShare={true}
      />
      <InvoiceSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={fetchBusinessSettings}
      />


      {/* Delete Invoice Confirmation */}
      <Dialog open={pendingDeleteInvoiceId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteInvoiceId(null); }}>
        <DialogContent className="max-w-sm w-[92vw] rounded-2xl border border-border/60 bg-card p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Delete Invoice</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Are you sure you want to delete this invoice? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="ghost" size="sm" onClick={() => setPendingDeleteInvoiceId(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (pendingDeleteInvoiceId) handleDelete(pendingDeleteInvoiceId);
                  setPendingDeleteInvoiceId(null);
                }}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              >
                Delete Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <Dialog open={pendingDeleteFolder !== null} onOpenChange={(open) => { if (!open) setPendingDeleteFolder(null); }}>
        <DialogContent className="max-w-sm w-[92vw] rounded-2xl border border-border/60 bg-card p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Delete Folder</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Delete <span className="font-medium">"{pendingDeleteFolder?.name}"</span>? All invoices inside will be moved to the root. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="ghost" size="sm" onClick={() => setPendingDeleteFolder(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (pendingDeleteFolder) deleteFolder(pendingDeleteFolder);
                  setPendingDeleteFolder(null);
                }}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              >
                Delete Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder dialog */}
      <Dialog open={createFolderOpen} onOpenChange={(o) => { if (!o) setCreateFolderOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FolderPlus className="h-4 w-4 text-bronze" />
              New Folder
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Organise your invoices into folders, just like Google Drive.
          </p>
          <input
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !creatingFolder && createFolder()}
            placeholder="e.g. Q1 Billing, Retainer Clients"
            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-bronze/30"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" className="h-11" onClick={() => setCreateFolderOpen(false)} disabled={creatingFolder}>
              Cancel
            </Button>
            <Button
              className="h-11 bg-bronze hover:bg-bronze/90 text-background gap-1.5"
              onClick={createFolder}
              disabled={!folderName.trim() || creatingFolder}
            >
              {creatingFolder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartInvoicesTab;
