import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Printer, Send, CheckCircle2, Clock, AlertCircle,
  Maximize2, Minimize2, Download, X, ArrowLeft, Eye, Trash2,
  AlignLeft, AlignCenter, AlignRight, Share2,
} from "lucide-react";
import { useDownloadPDF } from "@/hooks/use-download-pdf";
import { useSubscription } from "@/hooks/use-subscription";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#B07D3A";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  autoShare?: boolean;
}

/**
 * InvoicePreviewDialog — two view modes:
 *
 *  "main"  → single-flow preview (no page breaks) — default when opening
 *  "print" → paged print-layout (PAGE 1 / PAGE 2) — reached via the print icon
 *
 * In print mode the toolbar swaps to a Back button + Print-to-PDF action.
 */
const InvoicePreviewDialog = ({ open, onOpenChange, invoice, autoShare = false }: InvoicePreviewDialogProps) => {
  const [items, setItems]                       = useState<InvoiceItem[]>([]);
  const [profile, setProfile]                   = useState<any>(null);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [isFullscreen, setIsFullscreen]         = useState(false);
  const [accentColor, setAccentColor]           = useState(DEFAULT_COLOR);
  // "main" = new single-flow preview  |  "print" = paged print-layout
  const [viewMode, setViewMode]                 = useState<"main" | "print">("main");
  const [logoSize, setLogoSize]                 = useState<"sm" | "md" | "lg">("md");
  const [hideLogo, setHideLogo]                 = useState(false);
  const [logoAlign, setLogoAlign]               = useState<"left" | "center" | "right">("right");

  const { isPro, isBrandWorkspace, isBusiness } = useSubscription();
  const isProUser = isPro || isBrandWorkspace || isBusiness;

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);

  // Collapse the excess layout footprint left by CSS transform:scale so no
  // dark void appears below the visually-shrunk invoice on mobile.
  useEffect(() => {
    const el = scaleWrapRef.current;
    if (!el) return;
    const collapse = () => {
      const w = window.innerWidth;
      const s = w >= 1024 ? 1 : w >= 768 ? 0.75 : w >= 640 ? 0.6 : 0.45;
      el.style.marginBottom = s < 1 ? `${Math.round(el.scrollHeight * (s - 1))}px` : "";
    };
    collapse();
    const ro = new ResizeObserver(collapse);
    ro.observe(el);
    window.addEventListener("resize", collapse);
    return () => { ro.disconnect(); window.removeEventListener("resize", collapse); };
  }, [items, viewMode, open]);
  const hasPage2 = !!(invoice?.notes || invoice?.terms || invoice?.payment_details?.method);

  const { ref: docRef, download, downloading, share, shareSync, sharing, preGenerate, pregenerating } = useDownloadPDF(
    invoice ? `Invoice-${invoice.invoice_number}` : "Invoice",
    { ignoreElements: (el: Element) => el.classList.contains("print-page-break") }
  );

  // ── Auto-share: wait for data to load, then capture + share off-screen ──────
  // items/profile/businessSettings are fetched async; we watch all three before
  // triggering so html2canvas sees a fully rendered invoice, not an empty shell.
  useEffect(() => {
    if (!autoShare || !open || !invoice) return;
    // Data is loaded when items have been populated (or invoice has no line-items)
    const dataReady = items.length > 0 || (invoice?.subtotal !== undefined);
    if (!dataReady) return;
    const t = setTimeout(async () => {
      await share();
      onOpenChange(false);
    }, 150); // short delay — just one paint after data arrives
    return () => clearTimeout(t);
  }, [autoShare, open, invoice, items]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Print to PDF (used in print-mode toolbar) ──────────────────────────────
  // Trigger a PDF download via <a download> — window.open() after an await is
  // outside the user-gesture chain and is blocked by iOS Safari's popup blocker.
  const triggerPdfDownload = (blob: Blob, name: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  };

  const handlePrintPDF = async () => {
    try {
      // windowWidth: 794 = A4 width in px at 96 dpi (210 mm).
      // Forces html2canvas to render the desktop layout regardless of the
      // actual mobile viewport, preventing narrow paginated captures on phones.
      const opts = { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: 794 } as const;
      const M = 12;
      const invoiceNum = invoice?.invoice_number ?? "invoice";

      if (hasPage2 && page1Ref.current && page2Ref.current) {
        const [c1, c2] = await Promise.all([
          html2canvas(page1Ref.current, opts),
          html2canvas(page2Ref.current, opts),
        ]);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const PW  = pdf.internal.pageSize.getWidth();
        const CW  = PW - M * 2;
        pdf.addImage(c1.toDataURL("image/png"), "PNG", M, M, CW, (c1.height / c1.width) * CW);
        pdf.addPage();
        const [r, g, b] = [
          parseInt(accentColor.slice(1, 3), 16),
          parseInt(accentColor.slice(3, 5), 16),
          parseInt(accentColor.slice(5, 7), 16),
        ];
        pdf.setFillColor(r, g, b);
        pdf.rect(0, 0, PW, 3, "F");
        pdf.setFontSize(7);
        pdf.setTextColor(180, 180, 180);
        pdf.text(`Invoice ${invoiceNum} · continued`, PW - M, 10, { align: "right" });
        pdf.addImage(c2.toDataURL("image/png"), "PNG", M, 3 + M, CW, (c2.height / c2.width) * CW);
        triggerPdfDownload(pdf.output("blob"), `Invoice-${invoiceNum}.pdf`);
      } else if (page1Ref.current) {
        const c   = await html2canvas(page1Ref.current, opts);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const PW  = pdf.internal.pageSize.getWidth();
        const CW  = PW - M * 2;
        pdf.addImage(c.toDataURL("image/png"), "PNG", M, M, CW, (c.height / c.width) * CW);
        triggerPdfDownload(pdf.output("blob"), `Invoice-${invoiceNum}.pdf`);
      }
    } catch {
      toast.error("Could not prepare PDF — please try again.");
    }
  };

  useEffect(() => {
    if (!invoice) return;
    setAccentColor(invoice.accent_color || DEFAULT_COLOR);
    setViewMode("main"); // always open in main preview
    fetchItems();
    fetchProfile();
    fetchBusinessSettings();
  }, [invoice]);

  // Pre-generate PDF blob for instant share — fires after items load
  useEffect(() => {
    if (!invoice || items.length === 0) return;
    const t = setTimeout(() => preGenerate(), 400);
    return () => clearTimeout(t);
  }, [invoice?.id, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchItems = async () => {
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
    if (data) {
      setItems(data.map((item) => ({
        id: item.id, description: item.description,
        quantity: Number(item.quantity), unit_price: Number(item.unit_price), total: Number(item.total),
      })));
    }
  };

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(data);
    }
  };

  const fetchBusinessSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from("business_settings").select("*").eq("user_id", session.user.id).maybeSingle();
      setBusinessSettings(data);
    }
  };

  const handleDeleteLogo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("business_settings").update({ logo_url: null }).eq("user_id", session.user.id);
    setBusinessSettings((prev: any) => ({ ...prev, logo_url: null }));
    setHideLogo(false);
    toast.success("Logo removed");
  };

  const logoSizeClass = { sm: "w-10 h-10", md: "w-16 h-16", lg: "w-24 h-24" }[logoSize];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: invoice?.currency || "KES" }).format(amount);

  if (!invoice) return null;

  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    draft:     { bg: "bg-gray-100",    text: "text-gray-600",    label: "DRAFT",     icon: <Clock className="h-4 w-4" /> },
    sent:      { bg: "bg-blue-100",    text: "text-blue-700",    label: "SENT",      icon: <Send className="h-4 w-4" /> },
    paid:      { bg: "bg-emerald-100", text: "text-emerald-700", label: "PAID",      icon: <CheckCircle2 className="h-4 w-4" /> },
    overdue:   { bg: "bg-red-100",     text: "text-red-700",     label: "OVERDUE",   icon: <AlertCircle className="h-4 w-4" /> },
    cancelled: { bg: "bg-gray-100",    text: "text-gray-500",    label: "CANCELLED", icon: <Clock className="h-4 w-4" /> },
  };
  const status = statusConfig[invoice.status] || statusConfig.draft;

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const businessName = businessSettings?.business_name || profile?.display_name || profile?.handle || "Your Name";

  // ── Shared sub-components ──────────────────────────────────────────────────

  /** Top accent bar */
  const AccentBar = () => <div className="h-1.5" style={{ background: accentColor }} />;

  /** Header: logo row (aligned) + INVOICE label below */
  const alignClass = logoAlign === "left" ? "justify-start" : logoAlign === "center" ? "justify-center" : "justify-end";

  const InvoiceHeader = () => (
    <div className="mb-2">
      {businessSettings?.logo_url && !hideLogo && (
        <div className={`flex mb-3 ${alignClass}`}>
          <div className={`relative flex-shrink-0 ${viewMode === "main" ? "group" : ""}`}>
            <img
              src={businessSettings.logo_url}
              alt="Business Logo"
              width={logoSize === "sm" ? 40 : logoSize === "md" ? 64 : 96}
              height={logoSize === "sm" ? 40 : logoSize === "md" ? 64 : 96}
              className={`${logoSizeClass} object-contain rounded-lg transition-all duration-200`}
            />
            {viewMode === "main" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/60 rounded-lg p-1">
                {/* Alignment row */}
                <div className="flex gap-0.5">
                  {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([pos, Icon]) => (
                    <button
                      key={pos}
                      onClick={(e) => { e.stopPropagation(); setLogoAlign(pos); }}
                      className={`w-5 h-5 rounded flex items-center justify-center transition-all ${logoAlign === pos ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/40"}`}
                      title={`Align ${pos}`}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  ))}
                </div>
                {/* Size + delete row */}
                <div className="flex gap-0.5">
                  {(["sm", "md", "lg"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); setLogoSize(s); }}
                      className={`w-5 h-5 rounded text-[9px] font-bold transition-all ${logoSize === s ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/40"}`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteLogo(); }}
                    className="w-5 h-5 rounded bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all"
                    title="Remove logo"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
    </div>
  );

  /** Invoice number + sender business block */
  const BusinessBlock = () => (
    <table className="w-full border-collapse mb-6" style={{ width: "100%", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td className="align-top" style={{ width: "50%" }}>
            <p className="text-gray-400 text-xs font-mono">{invoice.invoice_number}</p>
          </td>
          <td className="align-top text-right" style={{ width: "50%" }}>
            <h2 className="text-base font-bold text-gray-900">{businessName}</h2>
            {businessSettings?.business_phone && <p className="text-gray-500 text-xs">{businessSettings.business_phone}</p>}
            {businessSettings?.business_address && (
              <p className="text-gray-500 text-xs whitespace-pre-line mt-0.5">{businessSettings.business_address}</p>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );

  /** Bill To + Issue/Due dates — engine-safe 3-column table */
  const BillToSection = () => (
    <table className="w-full border-collapse mt-12 mb-8" style={{ width: "100%", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td className="align-top" style={{ width: "34%", paddingRight: "16px" }}>
            <p className="text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: accentColor }}>Bill To</p>
            <p className="font-bold text-gray-900 text-sm">{invoice.client_name}</p>
            {invoice.client_email && <p className="text-gray-500 text-xs mt-0.5 break-all">{invoice.client_email}</p>}
            {invoice.client_address && <p className="text-gray-500 text-xs whitespace-pre-line mt-0.5">{invoice.client_address}</p>}
          </td>
          <td className="align-top" style={{ width: "33%", paddingRight: "16px" }}>
            <p className="text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: accentColor }}>Issue Date</p>
            <p className="font-semibold text-gray-900 text-sm">{format(new Date(invoice.issue_date), "MMM d, yyyy")}</p>
          </td>
          <td className="align-top" style={{ width: "33%" }}>
            <p className="text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: accentColor }}>Due Date</p>
            <p className="font-semibold text-gray-900 text-sm">{format(new Date(invoice.due_date), "MMM d, yyyy")}</p>
          </td>
        </tr>
      </tbody>
    </table>
  );

  /** Line items — unified premium table, PDF-accurate */
  const ItemsSection = () => (
    <table className="w-full text-left border-collapse mt-8">
      <thead>
        <tr style={{ borderBottom: `2px solid ${accentColor}` }}>
          <th className="py-4 px-2 text-[10px] uppercase tracking-widest font-bold w-[50%]" style={{ color: accentColor }}>Description</th>
          <th className="py-4 px-2 text-[10px] uppercase tracking-widest font-bold w-[15%] text-center" style={{ color: accentColor }}>Qty</th>
          <th className="py-4 px-2 text-[10px] uppercase tracking-widest font-bold w-[15%] text-right" style={{ color: accentColor }}>Price</th>
          <th className="py-4 px-2 text-[10px] uppercase tracking-widest font-bold w-[20%] text-right" style={{ color: accentColor }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-zinc-100 print:break-inside-avoid">
            <td className="py-4 px-2 text-gray-900 font-medium text-sm">{item.description}</td>
            <td className="py-4 px-2 text-center text-gray-600 text-sm">{item.quantity}</td>
            <td className="py-4 px-2 text-right text-gray-600 text-sm">{formatCurrency(item.unit_price)}</td>
            <td className="py-4 px-2 text-right text-gray-900 font-semibold text-sm">{formatCurrency(item.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  /** Subtotal / tax / discount / total — spacer-td anchors right side */
  const TotalsSection = () => (
    <table className="w-full border-collapse mt-6" style={{ width: "100%", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td style={{ width: "50%" }} />
          <td className="align-top" style={{ width: "50%" }}>
            <table className="w-full border-collapse" style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td className="text-gray-500 text-sm pb-2">Subtotal</td>
                  <td className="text-gray-500 text-sm font-medium pb-2 text-right">{formatCurrency(Number(invoice.subtotal))}</td>
                </tr>
                {Number(invoice.tax_rate) > 0 && (
                  <tr>
                    <td className="text-gray-500 text-sm pb-2">Tax ({invoice.tax_rate}%)</td>
                    <td className="text-gray-500 text-sm font-medium pb-2 text-right">{formatCurrency(Number(invoice.tax_amount))}</td>
                  </tr>
                )}
                {Number(invoice.discount_amount) > 0 && (
                  <tr>
                    <td className="text-emerald-600 text-sm pb-2">Discount</td>
                    <td className="text-emerald-600 text-sm font-medium pb-2 text-right">-{formatCurrency(Number(invoice.discount_amount))}</td>
                  </tr>
                )}
                <tr style={{ borderTop: `2px solid ${accentColor}` }}>
                  <td className="text-base font-bold text-gray-900 pt-2.5">Total Due</td>
                  <td className="text-base font-bold pt-2.5 text-right" style={{ color: accentColor }}>{formatCurrency(Number(invoice.total))}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );

  /** Status badge (PAID / SENT / etc.) */
  const StatusStamp = () => (
    <div className="flex justify-center mb-6">
      <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full ${status.bg} ${status.text} font-bold text-xs tracking-widest`}>
        {status.icon}{status.label}
      </div>
    </div>
  );

  /** Notes + Terms block */
  const NotesTermsSection = ({ className = "" }: { className?: string }) => {
    if (!invoice.notes && !invoice.terms) return null;
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4", className)}
           style={{ borderTop: `1px solid ${hexToRgba(accentColor, 0.2)}` }}>
        {invoice.notes && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1.5 font-bold" style={{ color: accentColor }}>Notes</p>
            <p className="text-gray-600 text-xs whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
        {invoice.terms && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1.5 font-bold" style={{ color: accentColor }}>Payment Terms</p>
            <p className="text-gray-600 text-xs whitespace-pre-line">{invoice.terms}</p>
          </div>
        )}
      </div>
    );
  };

  /** Payment details card */
  const PaymentDetailsSection = ({ className = "" }: { className?: string }) => {
    if (!invoice.payment_details?.method) return null;
    const pd = invoice.payment_details as {
      method?: string; accountName?: string; bankName?: string;
      accountNumber?: string; branchCode?: string; reference?: string; instructions?: string;
    };
    const fieldLabels: Record<string, string> = {
      "Bank Transfer": JSON.stringify({ accountName: "Account Name", bankName: "Bank Name", accountNumber: "Account Number", branchCode: "Branch / SWIFT", reference: "Reference" }),
      "M-Pesa":        JSON.stringify({ accountName: "Business Name", accountNumber: "Till / Paybill / Phone", reference: "Reference" }),
    };
    const labels: Record<string, string> = JSON.parse(fieldLabels[pd.method ?? ""] || "{}");
    const rows = (Object.keys(labels) as Array<keyof typeof pd>).filter(k => pd[k]).map(k => ({ label: labels[k as string], value: pd[k] as string }));
    return (
      <div className={cn("mt-6 rounded-xl overflow-hidden", className)} style={{ border: `1px solid ${hexToRgba(accentColor, 0.25)}` }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: hexToRgba(accentColor, 0.08), borderBottom: `1px solid ${hexToRgba(accentColor, 0.2)}` }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: accentColor }}>
            <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
          </svg>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accentColor }}>Payment Details</p>
          <span className="text-[10px] text-gray-500 ml-auto font-medium">Pay via {pd.method}</span>
        </div>
        <div className="px-4 py-3">
          {rows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-2">
              {rows.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">{label}</p>
                  <p className="text-gray-900 text-xs font-semibold break-all">{value}</p>
                </div>
              ))}
            </div>
          )}
          {pd.instructions && (
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${hexToRgba(accentColor, 0.15)}` }}>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Instructions</p>
              <p className="text-gray-600 text-xs whitespace-pre-line">{pd.instructions}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /** Footer */
  const Footer = () => (
    <div className="mt-8 pt-3 text-center" style={{ borderTop: `1px solid ${hexToRgba(accentColor, 0.2)}` }}>
      <p className="text-xs font-medium" style={{ color: accentColor }}>Thank you for your business!</p>
      {!isProUser && (
        <p className="mt-1 text-[10px] text-gray-400">
          Powered by <span className="font-semibold">Kaizen Afrika</span>
        </p>
      )}
    </div>
  );

  // ── MAIN PREVIEW — single flowing document, no page breaks ─────────────────
  const MainPreview = () => (
    <div ref={docRef} id="invoice-print-area" className="invoice-print-area bg-white text-black overflow-hidden shadow-sm box-border print:shadow-none" style={{ width: "794px", minWidth: "794px", maxWidth: "794px", minHeight: "1123px", boxSizing: "border-box" }}>
      <AccentBar />
      <div className="px-10 py-12 print:px-10 print:py-12">
        <InvoiceHeader />
        <BusinessBlock />
        <BillToSection />
        <ItemsSection />
        <TotalsSection />
        {/* Notes, terms, payment details all flow inline — no page break */}
        {hasPage2 && (
          <div className="mt-2">
            <NotesTermsSection />
            <PaymentDetailsSection />
          </div>
        )}
        <Footer />
      </div>
    </div>
  );

  // ── PRINT PREVIEW — paged layout (PAGE 1 + divider + PAGE 2) ──────────────
  const PrintPreview = () => (
    <div className="invoice-print-area bg-white text-black overflow-hidden shadow-sm box-border print:shadow-none" style={{ width: "794px", minWidth: "794px", maxWidth: "794px", minHeight: "1123px", boxSizing: "border-box" }}>
      {/* PAGE 1 */}
      <div ref={page1Ref} className="bg-white">
        <AccentBar />
        <div className="px-10 py-12 print:px-10 print:py-12">
          <InvoiceHeader />
          <BusinessBlock />
          <BillToSection />
          <ItemsSection />
          <TotalsSection />
          {!hasPage2 && <Footer />}
        </div>
      </div>

      {/* Page break indicator */}
      {hasPage2 && (
        <div className="print-page-break flex items-center gap-2 px-6 py-2.5 bg-gray-50 border-y border-gray-100">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.18em] select-none px-2">Page 2</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {/* PAGE 2 */}
      {hasPage2 && (
        <div ref={page2Ref} className="bg-white">
          <div className="px-10 py-12 print:px-10 print:py-12">
            <NotesTermsSection />
            <PaymentDetailsSection />
            <Footer />
          </div>
        </div>
      )}
    </div>
  );

  // ── Off-screen capture path (autoShare) ───────────────────────────────────
  // Renders the invoice content into a hidden fixed div so html2canvas can
  // capture it, then fires the native share sheet — user never sees a dialog.
  if (autoShare) {
    if (!open || !invoice) return null;
    return (
      <div
        aria-hidden="true"
        style={{ position: "fixed", left: "-9999px", top: 0, width: 794, pointerEvents: "none", opacity: 0 }}
      >
        <MainPreview />
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setIsFullscreen(false); setViewMode("main"); } onOpenChange(v); }}>
        <DialogContent className={cn(
          "overflow-hidden p-0 transition-opacity duration-200 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 [&>button:last-child]:hidden flex flex-col",
          isFullscreen
            ? "max-w-[100vw] w-screen h-dvh max-h-dvh rounded-none"
            : "w-[calc(100vw-16px)] sm:max-w-2xl lg:max-w-[900px] h-[92dvh] sm:h-[88vh]"
        )}>

          {/* ── Toolbar ─────────────────────────────────────────────────────── */}
          <div className={cn("flex-shrink-0 z-10 bg-background/95 backdrop-blur-sm border-b px-3 pb-2 flex items-center gap-2 [padding-top:max(12px,env(safe-area-inset-top))]", isFullscreen && "sticky top-0")}>

            {viewMode === "main" ? (
              /* ── Main mode toolbar ── */
              <>
                <DialogTitle className="font-vollkorn text-sm sm:text-base truncate min-w-0 flex-1">
                  Invoice Preview
                </DialogTitle>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Share PDF"
                    disabled={sharing}
                    onClick={shareSync}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={download} disabled={downloading} className="h-8 w-8 p-0" title="Download PDF">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {/* Print icon → switches to paged print-layout */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode("print")}
                    className="h-8 w-8 p-0"
                    title="Print preview (paged layout)"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="h-8 w-8 p-0 hidden sm:flex" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0" title="Close">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              /* ── Print-preview mode toolbar ── */
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("main")}
                  className="h-8 px-2 gap-1.5 text-xs font-medium flex-shrink-0"
                  title="Back to preview"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
                <DialogTitle className="font-vollkorn text-sm sm:text-base truncate min-w-0 flex-1 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  Print Layout
                </DialogTitle>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePrintPDF}
                    className="h-8 gap-1.5 px-3 text-xs font-semibold"
                    title="Open print-ready PDF"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print / Save PDF</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0" title="Close">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* ── Document area ───────────────────────────────────────────────── */}
          <div className="w-full h-[80vh] overflow-auto flex justify-center bg-zinc-900/50 p-4">
            <div ref={scaleWrapRef} className="transform origin-top scale-[0.45] sm:scale-[0.6] md:scale-90 lg:scale-100 transition-none h-fit">
              {viewMode === "main" ? <MainPreview /> : <PrintPreview />}
            </div>
          </div>

        </DialogContent>
      </Dialog>

    </>
  );
};

export default InvoicePreviewDialog;
