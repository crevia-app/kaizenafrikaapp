import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download, CheckCircle2, Share2, ArrowLeft, X } from "lucide-react";
import { format } from "date-fns";
import { useDownloadPDF } from "@/hooks/use-download-pdf";

const DEFAULT_COLOR = "#B07D3A";

interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

const ReceiptPreviewDialog = ({ open, onOpenChange, invoice }: ReceiptPreviewDialogProps) => {
  const [items, setItems]                       = useState<ReceiptItem[]>([]);
  const [profile, setProfile]                   = useState<any>(null);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [accentColor, setAccentColor]           = useState(DEFAULT_COLOR);

  const { ref: docRef, download, downloading, shareSync, sharing, preGenerate, pregenerating } = useDownloadPDF(
    invoice ? `Receipt-${invoice.invoice_number?.replace("INV", "RCT") ?? ""}` : "Receipt"
  );

  useEffect(() => {
    if (invoice) {
      setAccentColor(invoice.accent_color || DEFAULT_COLOR);
      fetchItems();
      fetchProfile();
      fetchBusinessSettings();
    }
  }, [invoice]);

  // Pre-generate PDF blob for instant iOS Share — fires after data loads
  useEffect(() => {
    if (!invoice || items.length === 0) return;
    const t = setTimeout(() => preGenerate(), 400);
    return () => clearTimeout(t);
  }, [invoice?.id, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const scaleWrapRef = useRef<HTMLDivElement>(null);

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
  }, [items, open]);

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: invoice?.currency || "KES" }).format(amount);

  const handlePrint = () => window.print();

  /** Convert hex accent to rgba for subtle tints */
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  if (!invoice) return null;

  const receiptNumber = invoice.invoice_number?.replace("INV", "RCT") ?? invoice.invoice_number;
  const businessName  = businessSettings?.business_name || profile?.display_name || profile?.handle || "Your Business";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-16px)] sm:max-w-2xl lg:max-w-[900px] h-[92dvh] sm:h-[88vh] overflow-hidden p-0 transition-opacity duration-200 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 [&>button:last-child]:hidden flex flex-col">

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 z-10 bg-background/95 backdrop-blur-sm border-b px-3 pb-2 flex items-center gap-2 [padding-top:max(12px,env(safe-area-inset-top))]">
          <DialogTitle className="font-vollkorn text-sm sm:text-base truncate min-w-0 flex-1">Payment Receipt</DialogTitle>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={shareSync} disabled={sharing} className="h-8 w-8 p-0" title="Share PDF">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={download} disabled={downloading} className="h-8 w-8 p-0" title="Download PDF">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 w-8 p-0" title="Print">
              <Printer className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0" title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Receipt Document ─────────────────────────────────────────────── */}
        <div className="w-full h-[80vh] overflow-auto flex justify-center bg-zinc-900/50 p-4">
          <div ref={scaleWrapRef} className="transform origin-top scale-[0.45] sm:scale-[0.6] md:scale-90 lg:scale-100 transition-none h-fit">
          <div ref={docRef} id="receipt-print-area" className="invoice-print-area bg-white text-black overflow-hidden shadow-sm box-border print:shadow-none" style={{ width: "794px", minWidth: "794px", maxWidth: "794px", minHeight: "1123px", boxSizing: "border-box" }}>

            {/* Accent bar */}
            <div className="h-1.5" style={{ background: accentColor }} />

            <div className="px-10 py-12 print:px-10 print:py-12">

              {/* ── Header ── */}
              <table className="w-full border-collapse mb-8" style={{ width: "100%", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td className="align-top" style={{ width: "50%" }}>
                      <h1 className="text-4xl font-bold text-gray-900 tracking-tight">RECEIPT</h1>
                      <p className="text-gray-400 mt-1 text-base font-mono">{receiptNumber}</p>
                    </td>
                    <td className="align-top text-right" style={{ width: "50%" }}>
                      {businessSettings?.logo_url && (
                        <img
                          src={businessSettings.logo_url}
                          alt="Business Logo"
                          style={{ width: "64px", height: "64px", objectFit: "contain", marginLeft: "auto", marginBottom: "8px", borderRadius: "8px", display: "block" }}
                        />
                      )}
                      <h2 className="text-lg font-bold text-gray-900">{businessName}</h2>
                      {businessSettings?.business_phone && (
                        <p className="text-gray-500 text-sm">{businessSettings.business_phone}</p>
                      )}
                      {businessSettings?.business_address && (
                        <p className="text-gray-500 text-sm whitespace-pre-line mt-1">{businessSettings.business_address}</p>
                      )}
                      {businessSettings?.tax_id && (
                        <p className="text-gray-400 text-xs mt-1">Tax ID: {businessSettings.tax_id}</p>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ── PAID Stamp — uses accent color ── */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div
                  className="inline-flex items-center gap-2.5 px-8 py-3 rounded-full"
                  style={{
                    background: hexToRgba(accentColor, 0.08),
                    border: `2px solid ${hexToRgba(accentColor, 0.3)}`,
                  }}
                >
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: accentColor }} />
                  <span className="font-bold text-base sm:text-lg tracking-widest" style={{ color: accentColor }}>PAID</span>
                </div>
              </div>

              {/* ── Receipt meta ── */}
              <table className="w-full border-collapse mb-10" style={{ width: "100%", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td className="align-top" style={{ width: "40%", paddingRight: "16px" }}>
                      <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Received From</p>
                      <p className="font-bold text-gray-900 text-lg">{invoice.client_name}</p>
                      {invoice.client_email && <p className="text-gray-500 text-sm mt-0.5 break-all">{invoice.client_email}</p>}
                    </td>
                    <td className="align-top text-center" style={{ width: "30%", paddingRight: "16px" }}>
                      <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Invoice Date</p>
                      <p className="font-semibold text-gray-900">{format(new Date(invoice.issue_date), "MMMM d, yyyy")}</p>
                    </td>
                    <td className="align-top text-right" style={{ width: "30%" }}>
                      <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Payment Date</p>
                      <p className="font-semibold text-gray-900">{format(new Date(), "MMMM d, yyyy")}</p>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ── Items Table ── */}
              <div className="mb-6 sm:mb-8 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${accentColor}` }}>
                      <th className="text-left py-3 text-xs uppercase tracking-wider font-bold" style={{ color: accentColor, width: "50%" }}>Description</th>
                      <th className="text-center py-3 text-xs uppercase tracking-wider font-bold" style={{ color: accentColor, width: "10%" }}>Qty</th>
                      <th className="text-right py-3 text-xs uppercase tracking-wider font-bold" style={{ color: accentColor, width: "20%" }}>Rate</th>
                      <th className="text-right py-3 text-xs uppercase tracking-wider font-bold" style={{ color: accentColor, width: "20%" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className={`border-b ${idx === items.length - 1 ? "border-gray-200" : "border-gray-100"}`}>
                        <td className="py-3 sm:py-4 text-gray-900 font-medium text-sm">{item.description}</td>
                        <td className="py-3 sm:py-4 text-center text-gray-600 text-sm">{item.quantity}</td>
                        <td className="py-3 sm:py-4 text-right text-gray-600 text-sm">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 sm:py-4 text-right text-gray-900 font-semibold text-sm">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Totals ── */}
              <table className="w-full border-collapse mb-8" style={{ width: "100%", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "45%" }} />
                    <td className="align-top" style={{ width: "55%" }}>
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
                              <td className="text-sm pb-2" style={{ color: accentColor }}>Discount</td>
                              <td className="text-sm font-medium pb-2 text-right" style={{ color: accentColor }}>-{formatCurrency(Number(invoice.discount_amount))}</td>
                            </tr>
                          )}
                          <tr style={{ borderTop: `2px solid ${accentColor}` }}>
                            <td className="text-lg font-bold text-gray-900 pt-3">Total Paid</td>
                            <td className="text-lg font-bold pt-3 text-right" style={{ color: accentColor }}>{formatCurrency(Number(invoice.total))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ── Payment Confirmation box — uses accent color ── */}
              <div
                className="rounded-xl p-5 sm:p-6 mb-6 sm:mb-8"
                style={{ background: hexToRgba(accentColor, 0.06), border: `1px solid ${hexToRgba(accentColor, 0.2)}` }}
              >
                <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: accentColor }}>
                  Payment Confirmation
                </p>
                <table className="w-full border-collapse text-sm" style={{ width: "100%" }}>
                  <tbody>
                    <tr>
                      <td className="align-top pb-3" style={{ width: "50%", paddingRight: "16px" }}>
                        <p className="text-gray-500">Reference Invoice</p>
                        <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                      </td>
                      <td className="align-top pb-3" style={{ width: "50%" }}>
                        <p className="text-gray-500">Amount Received</p>
                        <p className="font-semibold" style={{ color: accentColor }}>{formatCurrency(Number(invoice.total))}</p>
                      </td>
                    </tr>
                    <tr>
                      <td className="align-top" style={{ paddingRight: "16px" }}>
                        <p className="text-gray-500">Currency</p>
                        <p className="font-semibold text-gray-900">{invoice.currency || "KES"}</p>
                      </td>
                      <td className="align-top">
                        <p className="text-gray-500">Status</p>
                        <p className="font-semibold" style={{ color: accentColor }}>Payment Complete</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Notes ── */}
              {invoice.notes && (
                <div className="pt-4 sm:pt-6 border-t border-gray-100 mb-4 sm:mb-6">
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Notes</p>
                  <p className="text-gray-600 text-sm whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}

              {/* ── Footer ── */}
              <div className="mt-8 sm:mt-10 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm font-medium" style={{ color: accentColor }}>Thank you for your payment!</p>
                <p className="text-gray-300 text-xs mt-1">Generated with Kaizen Studio · {format(new Date(), "yyyy")}</p>
              </div>

            </div>
          </div>
        </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPreviewDialog;
