import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Trash2, ImageIcon, Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdvancedColorSelector } from "@/components/ui/AdvancedColorSelector";

// Accent colours derived from Kaizen Link themes — all free
export const INVOICE_ACCENT_COLORS = [
  { name: "Bronze",   hex: "#B07D3A" }, // Kaizen Afrika / Matte Bronze
  { name: "Onyx",     hex: "#18181B" }, // Obsidian
  { name: "Slate",    hex: "#1A1C24" }, // Exec Slate
  { name: "Navy",     hex: "#07092A" }, // Studio Navy
  { name: "Bordeaux", hex: "#3D0C16" }, // Bordeaux Reserve
  { name: "Amethyst", hex: "#5B21B6" }, // Imperial Amethyst
  { name: "Emerald",  hex: "#065F46" }, // Midnight Emerald
  { name: "Oatmeal",  hex: "#2B241E" }, // Oatmeal
  { name: "Copper",   hex: "#C9855A" }, // Matte Bronze accent
  { name: "Ocean",    hex: "#3A9EE0" }, // Abyss Glass
  { name: "Tuscan",   hex: "#9A3412" }, // Tuscan Leather
  { name: "Ink",      hex: "#000000" }, // Mono Brutalism
] as const;

const PAYMENT_FIELDS: Record<string, Record<string, string>> = {
  "Bank Transfer": {
    accountName:   "Account Holder Name",
    bankName:      "Bank Name",
    accountNumber: "Account Number",
    branchCode:    "Branch / SWIFT / Sort Code",
    reference:     "Payment Reference",
  },
  "M-Pesa": {
    accountName:   "Business / Person Name",
    accountNumber: "Till No. · Paybill · Phone",
    reference:     "Account No. / Reference",
  },
};

interface PaymentDetails {
  method: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  reference: string;
  instructions: string;
}

const emptyPayment: PaymentDetails = {
  method: "", accountName: "", bankName: "",
  accountNumber: "", branchCode: "", reference: "", instructions: "",
};

type Tab = "logo" | "theme" | "payment";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const InvoiceSettingsDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [tab, setTab] = useState<Tab>("logo");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [accentColor, setAccentColor] = useState("#B07D3A");
  const [savingColor, setSavingColor] = useState(false);
  const [payment, setPayment] = useState<PaymentDetails>(emptyPayment);
  const [savingPayment, setSavingPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await (supabase as any)
        .from("business_settings")
        .select("id, logo_url, invoice_accent_color, invoice_payment_details")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) {
        setSettingsId(data.id);
        setLogoUrl(data.logo_url || "");
        setAccentColor(data.invoice_accent_color || "#B07D3A");
        setPayment(data.invoice_payment_details
          ? { ...emptyPayment, ...data.invoice_payment_details }
          : emptyPayment);
      } else {
        // Row doesn't exist yet — create it so saves don't silently fail
        const { data: inserted } = await (supabase as any)
          .from("business_settings")
          .insert({ user_id: session.user.id })
          .select("id")
          .single();
        if (inserted) setSettingsId(inserted.id);
      }
    })();
  }, [open]);

  // ── Logo ──────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 30 * 1024 * 1024) { toast.error("Max 30 MB — please compress or resize your logo"); return; }
    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploading(false); return; }
    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/business-logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await (supabase as any).from("business_settings").update({ logo_url: publicUrl }).eq("id", settingsId);
    setLogoUrl(publicUrl);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Logo saved");
    onSaved?.();
  };

  const handleRemoveLogo = async () => {
    await (supabase as any).from("business_settings").update({ logo_url: null }).eq("id", settingsId);
    setLogoUrl("");
    toast.success("Logo removed");
    onSaved?.();
  };

  // ── Theme ─────────────────────────────────────────────────────
  const handleColorSelect = async (hex: string) => {
    if (hex === accentColor) return;
    setAccentColor(hex);
    setSavingColor(true);
    await (supabase as any).from("business_settings").update({ invoice_accent_color: hex }).eq("id", settingsId);
    setSavingColor(false);
    onSaved?.();
  };

  const handleSaveTheme = async () => {
    if (!settingsId) return;
    setSavingColor(true);
    await (supabase as any).from("business_settings").update({ invoice_accent_color: accentColor }).eq("id", settingsId);
    setSavingColor(false);
    toast.success("Theme saved");
    onSaved?.();
  };

  // ── Payment ───────────────────────────────────────────────────
  const handleSavePayment = async () => {
    setSavingPayment(true);
    const val = payment.method ? payment : null;
    await (supabase as any).from("business_settings").update({ invoice_payment_details: val }).eq("id", settingsId);
    setSavingPayment(false);
    toast.success(val ? "Payment details saved" : "Payment details cleared");
    onSaved?.();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "logo",    label: "Logo"    },
    { key: "theme",   label: "Theme"   },
    { key: "payment", label: "Payment" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-16px)] sm:max-w-md max-h-[90dvh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-bronze flex-shrink-0" />
            <DialogTitle className="font-vollkorn text-lg">Invoice Settings</DialogTitle>
          </div>
          <DialogDescription className="mt-1 mb-4">
            Set your logo, accent colour, and saved payment details.
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border px-5 flex-shrink-0">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-4 py-2.5 text-sm font-poppins font-medium transition-colors border-b-2 -mb-px",
                tab === key
                  ? "border-bronze text-bronze"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── LOGO ── */}
          {tab === "logo" && (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Company Logo</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Appears in the top-right corner of your invoices. PNG, JPG or SVG — High resolution, max 30 MB.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Camera className="w-3.5 h-3.5" />}
                      {logoUrl ? "Replace" : "Upload"}
                    </Button>
                    {logoUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 text-xs gap-1.5 text-destructive hover:text-destructive"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── THEME ── */}
          {tab === "theme" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pick an accent colour — applied to headers, borders, and totals on your invoices.
              </p>
              <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-4">
                <AdvancedColorSelector
                  variant="invoice"
                  value={accentColor}
                  onChange={(hex) => !savingColor && setAccentColor(hex)}
                />
              </div>
              <Button
                onClick={handleSaveTheme}
                disabled={savingColor}
                className="w-full bg-bronze hover:bg-bronze/90 text-background font-semibold font-poppins h-11"
              >
                {savingColor
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                  : "Save Theme"}
              </Button>
            </div>
          )}

          {/* ── PAYMENT ── */}
          {tab === "payment" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Save your payment details once — they'll auto-fill into every new invoice you create.
              </p>

              <div>
                <Label>Payment Method</Label>
                <Select
                  value={payment.method}
                  onValueChange={(v) => setPayment({ ...emptyPayment, method: v })}
                >
                  <SelectTrigger className="mt-1 h-11 text-base">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PAYMENT_FIELDS).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {payment.method && (() => {
                const fields = PAYMENT_FIELDS[payment.method] || {};
                const keys = Object.keys(fields).filter(k => k !== "instructions");
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {keys.map((key) => (
                        <div key={key}>
                          <Label className="text-xs">{fields[key]}</Label>
                          <Input
                            value={(payment as any)[key] || ""}
                            onChange={(e) => setPayment(p => ({ ...p, [key]: e.target.value }))}
                            placeholder={fields[key]}
                            className="mt-1 h-11 text-base"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label className="text-xs">
                        Additional Instructions{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        value={payment.instructions}
                        onChange={(e) => setPayment(p => ({ ...p, instructions: e.target.value }))}
                        placeholder="e.g. Include invoice number as reference"
                        className="mt-1 text-base resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })()}

              {!payment.method && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Select a payment method above to add details.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSavePayment}
                  disabled={savingPayment}
                  className="bg-bronze hover:bg-bronze/90 text-white h-11 flex-1 font-poppins font-semibold"
                >
                  {savingPayment && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Payment Details
                </Button>
                {payment.method && (
                  <Button
                    variant="ghost"
                    onClick={() => setPayment(emptyPayment)}
                    className="h-11 text-destructive hover:text-destructive px-3"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceSettingsDialog;
